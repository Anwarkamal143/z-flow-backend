import { publishEvent } from "@/app_inngest/channels/http-request";
import { parseAndNormalizeUrl } from "@/utils";
import axios, { AxiosRequestConfig } from "axios";
import Handlebars from "handlebars";
import { NonRetriableError } from "inngest";
import { NodeExecutor } from "../types";
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
Handlebars.registerHelper("json", (context) => {
  const stringified = JSON.stringify(context, null, 2);

  const safeSting = new Handlebars.SafeString(stringified);

  return safeSting;
});
type HttpRequestExecutor = {
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: string;
  variableName: string;
};

export const httpRequestExecutor: NodeExecutor<HttpRequestExecutor> = async (
  params,
) => {
  const { data, nodeId, workflowId, context, step, publish } = params;
  const event = {
    nodeId,
    jobId: nodeId,
    step: "initial",
    status: "loading",
    event: "status",
    channel: workflowId,
  };

  const publishError = async (error: Error) => {
    await publishEvent({
      publish,
      event: {
        ...event,
        step: "executor",
        status: "error",
        error: error.message,
      },
    });
  };

  try {
    const result = await step
      .run(`http-request-${nodeId}`, async () => {
        await publishEvent({ publish, event });
        try {
          if (!data.endpoint) {
            throw new Error("HTTP Request node: No endpoint configured");
          }
          if (data.variableName == null || data.variableName.trim() == "") {
            throw new Error("HTTP Request node: Variable name not configured");
          }
          if (data.method == null || !METHODS.includes(data.method)) {
            throw new Error("HTTP Request node: Method  not configured");
          }
        } catch (error: any) {
          await publishEvent({
            publish,
            event: {
              ...event,
              step: "validating",
              status: "error",
              error: error.message,
            },
          });

          throw new NonRetriableError(error.message);
        }
        const method = data.method;
        let endpoint;
        try {
          endpoint = Handlebars.compile(data.endpoint)(context);
          if (!endpoint || typeof endpoint != "string") {
            throw new Error(
              "Endpoint template must resolve to a non-empty string",
            );
          }
          const url = parseAndNormalizeUrl(endpoint);
          if (url == null) {
            throw new Error("Endpoint is not a vaild URL");
          }
          endpoint = url;
        } catch (error) {
          await publishEvent({
            publish,
            event: {
              ...event,
              step: "validating",
              status: "error",
              error: `HTTP Request node: Failed to resolve endpoint template: ${endpoint}`,
            },
          });

          throw new NonRetriableError(
            `HTTP Request node: Failed to resolve endpoint template: ${endpoint}`,
          );
        }

        const options: AxiosRequestConfig = {
          method,
          url: endpoint,
          timeout: 6000,
          // headers: {
          //   "Content-Type": "application/json"
          // }
        };
        if (["POST", "PUT", "PATCH"].includes(method)) {
          try {
            const resolved = Handlebars.compile(data.body || "{}")(context);
            const resolvedData = JSON.parse(resolved);
            options.data = resolvedData;
          } catch (error) {
            await publishEvent({
              publish,
              event: {
                ...event,
                step: "validating",
                status: "error",
                error: `HTTP Request node: Failed to resolve body template: ${data.body}`,
              },
            });

            throw new NonRetriableError(
              `HTTP Request node: Failed to resolve body template: ${data.body}`,
            );
          }
        }
        const variableName = data.variableName;
        let responsePayload = {};
        const response = await axios(options);
        responsePayload = {
          httpResponse: {
            status: response.status,
            statusText: response.statusText,
            data: response.data,
          },
        };

        await publishEvent({
          publish,
          event: {
            ...event,
            step: "processing",
            status: "success",
          },
        });

        return {
          ...context,
          [variableName]: responsePayload,
        };
      })
      .catch(async (e) => {
        await publishEvent({
          publish,
          event: {
            ...event,
            step: "processing",
            status: "error",
            stepId: e.stepId,
            error: e.message,
          },
        });

        throw e;
      });

    return result;
  } catch (error) {
    await publishError(
      error instanceof Error ? error : new Error(String(error)),
    );
    throw error;
  }
};
