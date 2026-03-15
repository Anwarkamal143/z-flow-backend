import { publishEvent } from "@/app_inngest/channels/http-request";
import { credentialService } from "@/services/credentails.service";
import { createGoogleGenerativeAI } from "@ai-sdk/google"; // Correct import
import { generateText } from "ai"; // From Vercel AI SDK
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { runStepWithCatch } from "../run-with-catch";
import { NodeExecutor } from "../types";

Handlebars.registerHelper("json", (context) => {
  return new Handlebars.SafeString(JSON.stringify(context, null, 2));
});

type GeminiExecutor = {
  model?: string;
  systemPrompt?: string;
  userPrompt?: string;
  variableName: string;
  credentialId?: string;
};

export const geminiExecutor: NodeExecutor<GeminiExecutor> = async (params) => {
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
      event: {
        ...baseEvent,
        step: "executor",
        status: "error",
        error: error.message,
      },
    });
  };

  try {
    const {
      userPrompt,
      systemPrompt,
      model: modelName = "gemini-flash-latest",
      variableName,
      credentialId,
    } = data;

    await runStepWithCatch(
      step,
      `gemini-validate-${nodeId}`,
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
          throw new NonRetriableError("Gemini node: UserId is missing");
        if (!variableName?.trim())
          throw new NonRetriableError("Gemini node: Variable name is missing");
        if (!credentialId?.trim())
          throw new NonRetriableError("Gemini node: Credentials are missing");
        if (!userPrompt?.trim())
          throw new NonRetriableError("Gemini node: User prompt is missing");
      },
    );

    const credential = await runStepWithCatch(
      step,
      `gemini-get-credentials-${nodeId}`,
      async (error) => {
        await publishEvent({
          publish,
          event: {
            ...baseEvent,
            step: "credentials",
            status: "error",
            error: error.message,
          },
        });
      },
      async () => {
        const credsResp = await credentialService.resolveByIdUserId(
          credentialId!,
          userId!,
        );
        if (!credsResp.data?.value) {
          throw new NonRetriableError("Gemini node: Invalid credentials");
        }
        return credsResp.data?.value;
      },
    );

    if (!credential) {
      throw new NonRetriableError("Gemini node: Invalid credentials");
    }

    /* ---------------- Template Resolution ---------------- */
    const { resolvedUserPrompt, resolvedSystemPrompt } = await step.run(
      `gemini-template-${nodeId}`,
      async () => {
        try {
          const resolvedUserPrompt = Handlebars.compile(userPrompt)(context);

          if (!resolvedUserPrompt)
            throw new Error("Gemini node: userPrompt resolved to empty string");

          const resolvedSystemPrompt = systemPrompt
            ? Handlebars.compile(systemPrompt)(context)
            : "You are a helpful assistant.";

          if (!resolvedSystemPrompt)
            throw new Error(
              "Gemini node: systemPrompt resolved to empty string",
            );

          return { resolvedUserPrompt, resolvedSystemPrompt };
        } catch {
          await publishEvent({
            publish,
            event: {
              ...baseEvent,
              step: "templating",
              status: "error",
              error: "Gemini node: Failed to resolve prompt templates",
            },
          });

          throw new NonRetriableError(
            "Gemini node: Failed to resolve prompt templates",
          );
        }
      },
    );

    /* ---------------- AI Execution ---------------- */
    const google = createGoogleGenerativeAI({ apiKey: credential });
    const { steps } = await step.ai
      .wrap(`gemini-generate-${nodeId}`, generateText, {
        model: google(modelName),
        system: resolvedSystemPrompt,
        prompt: resolvedUserPrompt,
        experimental_telemetry: {
          isEnabled: true,
          recordInputs: true,
          recordOutputs: true,
        },
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

    await publishEvent({
      publish,
      event: { ...baseEvent, step: "processing", status: "success" },
    });

    const text =
      steps[0]?.content[0]?.type == "text" ? steps[0].content[0].text : "";
    context[variableName] = { text, model: modelName };

    /* ---------------- Output ---------------- */
    return {
      ...context,
      [variableName]: context[variableName] || { aiResponse: "" },
    };
  } catch (error) {
    await publishError(
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};
