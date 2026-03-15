import { publishEvent } from "@/app_inngest/channels/http-request";
import axios from "axios";
import Handlebars from "handlebars";
import { decode } from "html-entities";
import { NonRetriableError } from "inngest";
import { NodeExecutor, NodeExecutorParams } from "../types";
import { runStepWithCatch } from "../run-with-catch";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type DiscordExecutor = {
  variableName: string;
  webhookUrl?: string;
  content?: string;
  username?: string;
};
const MAX_CONTENT_LENGTH = 2000;
export const discordExecutor: NodeExecutor<DiscordExecutor> = async (
  params,
) => {
  const { data, nodeId, workflowId, context, step, userId, publish } = params;
  const baseEvent = {
    nodeId,
    jobId: nodeId,
    event: "status",
    channel: workflowId,
  };

  const publishError = async (error: Error) => {
    await publishEvent({
      publish,
      event: { ...baseEvent, step: "executor", status: "error", error: error.message },
    });
  };

  try {
    const { webhookUrl, variableName, username, content } = data;

    await runStepWithCatch(
      step,
      `discord-validate-${nodeId}`,
      async (error) => {
        await publishEvent({
          publish,
          event: {
            ...baseEvent,
            step: "validating",
            status: "error",
            error: error.message,
          },
        });
      },
      async () => {
        await publishEvent({
          publish,
          event: { ...baseEvent, step: "validating", status: "loading" },
        });
        if (!userId?.trim())
          throw new NonRetriableError("Discord node: UserId is missing");
        if (!variableName?.trim())
          throw new NonRetriableError("Discord node: Variable name is missing");
        if (!content?.trim())
          throw new NonRetriableError("Discord node: Message is missing");
        if (!webhookUrl?.trim())
          throw new NonRetriableError("Discord node: Webhook Url is missing");
      },
    );

    /* ---------------- Template Resolution ---------------- */
    const { resolvedContent, resolvedWebhookUrl, resolvedUserName } =
      await step.run(`discord-template-${nodeId}`, async () => {
      try {
        const rawContent = Handlebars.compile(content)(context);

        const resolvedContent = decode(rawContent);

        if (!resolvedContent)
          throw new Error("Discord node: content resolved to empty string");

        const resolvedWebhookUrl = webhookUrl;
        Handlebars.compile(webhookUrl)(context);

        if (!resolvedWebhookUrl)
          throw new Error("Discord node: Webhook Url resolved to empty string");

        const resolvedUserName = username
          ? Handlebars.compile(username)(context)
          : undefined;

        if (username && !resolvedUserName)
          throw new Error("Discord node: usename resolved to empty string");

        return { resolvedContent, resolvedWebhookUrl, resolvedUserName };
      } catch {
        await publishEvent({
          publish,
          event: {
            ...baseEvent,
            step: "templating",
            status: "error",
            error: "Discord node: Failed to resolve prompt templates",
          },
        });

        throw new NonRetriableError(
          "Discord node: Failed to resolve prompt templates",
        );
      }
      });

    const result = await step
      .run(`discord-webhook-${nodeId}`, async () => {
      const variableName = data.variableName;
      const content =
        resolvedContent.length > MAX_CONTENT_LENGTH
          ? resolvedContent.slice(0, MAX_CONTENT_LENGTH - 3) + "..."
          : resolvedContent;
      const resp = await axios(resolvedWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          content,
          username: resolvedUserName,
        },
      });

      await publishEvent({
        publish,
        event: {
          ...baseEvent,
          step: "processing",
          status: "success",
          data: resp.data,
        },
      });

      return {
        ...context,
        [variableName]: {
          messageContent: content,
        },
      };
    })
      .catch(async (e) => {
        await publishEvent({
          publish,
          event: {
            ...baseEvent,
            step: "processing",
            status: "error",
            stepId: e.stepId,
            error: e.message,
          },
        });
        throw e;
      });

    /* ---------------- Output ---------------- */
    return result;
  } catch (error) {
    await publishError(
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};
