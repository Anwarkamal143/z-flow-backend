// import { Realtime } from "@inngest/realtime";
import { RedisClient } from "@/config/redis";
import { GetStepTools, Inngest } from "inngest";
import { UUID } from "ulid";

// Workflow execute
export type WorkflowContext = Record<string, unknown>;
export type StepTools = GetStepTools<Inngest.Any>;

export type NodeExecutorParams<TData = Record<string, unknown>> = {
  data: TData;
  nodeId: UUID;
  workflowId?: UUID;
  credentialId?: UUID | null;
  userId?: UUID;
  context: WorkflowContext;
  step: StepTools;
  // publish: Realtime.PublishFn;
  publish: RedisClient["publish"];
};

export type NodeExecutor<TData = Record<string, unknown>> = (
  params: NodeExecutorParams<TData>,
) => Promise<WorkflowContext>;
