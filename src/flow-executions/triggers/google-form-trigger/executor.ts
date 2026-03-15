import { publishEvent } from "@/app_inngest/channels/manual-trigger";
import { NodeExecutor } from "@/flow-executions/types";
type GoogleFormTriggerData = Record<string, unknown>;
export const googleFormTriggerExecutor: NodeExecutor<
  GoogleFormTriggerData
> = async (params) => {
  const { nodeId, context, step, workflowId, publish } = params;
  const event = {
    nodeId,
    jobId: nodeId,
    step: "initial",
    status: "loading",
    event: "status",
    channel: workflowId,
  };

  try {
    const result = await step.run("google-form-trigger", async () => {
      await publishEvent({ publish, event });
      await publishEvent({
        publish,
        event: { ...event, step: "processing", status: "success" },
      });
      return context;
    });
    return result;
  } catch (error) {
    await publishEvent({
      publish,
      event: {
        ...event,
        step: "executor",
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      },
    });
    throw error;
  }
};
