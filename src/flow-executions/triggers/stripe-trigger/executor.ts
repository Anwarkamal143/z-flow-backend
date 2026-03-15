import { publishEvent } from "@/app_inngest/channels/manual-trigger";
import { NodeExecutor, NodeExecutorParams } from "@/flow-executions/types";
type StripeTriggerData = Record<string, unknown>;
export const stripeTriggerExecutor: NodeExecutor<StripeTriggerData> = async (
  params,
) => {
  const { nodeId, context, step, workflowId, publish, data } = params;
  const event = {
    nodeId,
    jobId: nodeId,
    step: "initial",
    status: "loading",
    event: "status",
    channel: workflowId,
  };

  try {
    const result = await step.run("stripe-trigger", async () => {
      await publishEvent({ publish, event });
      await publishEvent({
        publish,
        event: { ...event, step: "processing", status: "success", data },
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
