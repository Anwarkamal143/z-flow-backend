// import { channel, topic } from "@inngest/realtime";

import { NodeExecutorParams } from "@/flow-executions/types";
import { REDIS_SOCKET_PUBLISH_EMITTER } from "../constants";

export async function publishEvent({
  publish,
  event,
}: {
  publish: NodeExecutorParams["publish"];
  event: {
    nodeId: string;
    jobId: string;
    step: string;
    status: string;
    error?: string;
    channel: string | undefined;
    stepId?: string;
    data?: Record<string, any>;
  };
}) {
  const publishObj = {
    channel: REDIS_SOCKET_PUBLISH_EMITTER,
    message: {
      ...(event || {}),
      event: "status",
    },
  };

  return await publish({ ...publishObj });
}
