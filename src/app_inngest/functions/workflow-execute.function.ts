import { ExecutionStatusType, NodeType } from "@/db";
import { getExecutor } from "@/flow-executions";
import { workflowService } from "@/services/workflow.service";
import { NonRetriableError } from "inngest";
import { inngest } from "../client";

import { ENVIRONMENTS } from "@/config/app.config";
import redisClient from "@/config/redis";
import { WORKFLOW_EVENT_NAMES } from "@/flow-executions/events/workflow";
import { executionService } from "@/services/execution";
import { topologicalSort } from "../utils";

export default inngest.createFunction(
  {
    id: "execute-workflow",
    retries: ENVIRONMENTS.isProduction ? 3 : 0,

    onFailure: async ({ event, error }) => {
      const inngestEventId = event.data.event.id;
      console.log("Workflow execution failed", {
        error: error.message,
        stack: error.stack,
        eventId: inngestEventId,
      });
      if (!inngestEventId) {
        console.error("Inngest Event Id is missing in onFailure handler");
        return;
      }
      try {
        await executionService.updateByExecutionInngestEventId(inngestEventId, {
          status: ExecutionStatusType.FAILED,
          error: error.message,
          error_stack: error.stack,
          // completed_at: new Date(),
        });
      } catch (updateError) {
        console.error(
          "Failed to update execution status to FAILED in onFailure handler",
          updateError,
        );
      }
    },
  },
  {
    event: WORKFLOW_EVENT_NAMES.WORKFLOW_EXECUTE,
  },
  async ({ event, step }) => {
    try {
      const workflowId = event.data.workflowId;
      const inngestEventId = event.id;
      if (!workflowId || !inngestEventId) {
        throw new NonRetriableError(
          "Workflow Id or Inngest Event Id is missing",
        );
      }
      await step.run("create-execution", async () => {
        const workflow = await workflowService.getById(workflowId);
        if (!workflow.data) {
          throw new NonRetriableError("Workflow doesn't exist");
        }
        return await executionService.create({
          workflowId,
          inngest_event_id: inngestEventId,
          userId: workflow.data.userId,
        });
      });
      const { sortedNodes, workflow } = await step.run(
        "prepare-workflow",
        async () => {
          const workflow =
            await workflowService.getByFieldWithNodesAndConnections(
              workflowId,
              (fields) => fields.id,
            );
          if (!workflow.data) {
            throw new NonRetriableError("Workflow doesn't exist");
          }
          if (!workflow.data?.userId) {
            throw new NonRetriableError("User not found for workflow");
          }
          return {
            sortedNodes: topologicalSort(
              workflow.data.nodes,
              workflow.data.edges,
            ),
            workflow: workflow.data,
          };
        },
      );

      let context = event.data.initialData || {};
      for (const node of sortedNodes) {
        const executor = getExecutor(node.type as NodeType);
        context = await executor({
          data: node.data as Record<string, unknown>,
          nodeId: node.id,
          credentialId: node.credentialId,
          context,
          step,
          workflowId,
          userId: workflow.userId,
          publish: redisClient.publish,
        });
      }
      await step.run("update-execution", async () => {
        await executionService.updateByExecutionInngestEventId(inngestEventId, {
          status: ExecutionStatusType.SUCCESS,
          output: context,
          completed_at: new Date(),
        });
      });

      return { workflowId, context };
    } catch (error) {
      // Workflow-level handling runs first (e.g. logging, metrics).
      // Then rethrow so Inngest onFailure runs and updates execution status.
      console.error("Workflow execute handler error (before onFailure)", {
        workflowId: event.data.workflowId,
        inngestEventId: event.id,
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
);
