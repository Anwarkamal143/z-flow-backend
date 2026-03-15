import { HTTPSTATUS } from "@/config/http.config";
import { InsertNode, InsertNodeSchema, IUpdateUserNode } from "@/schema/node";
import { nodeService } from "@/services/node.service";
import { workflowService } from "@/services/workflow.service";
import { formatZodError } from "@/utils";
import { ForbiddenException, ValidationException } from "@/utils/catch-errors";
import { SuccessResponse } from "@/utils/requestResponse";
import { and, eq } from "drizzle-orm";
import { FastifyReply, FastifyRequest } from "fastify";

class NodeController {
  public async create(
    req: FastifyRequest<{ Body: InsertNode }>,
    rep: FastifyReply,
  ) {
    const userId = req.user!.id;
    const node = req.body;

    node.userId = userId;

    const parseResult = InsertNodeSchema.safeParse(node);
    if (parseResult.error) {
      throw new ValidationException(
        "Invalid or missing data",
        formatZodError(parseResult.error),
      );
    }

    const result = await nodeService.createItem(parseResult.data);

    if (result.error) {
      throw result.error;
    }

    return SuccessResponse(rep, {
      data: result.data,
      statusCode: HTTPSTATUS.CREATED,
      message: "Node created",
    });
  }
  public updateNode = async (
    request: FastifyRequest<{
      Body: Omit<IUpdateUserNode, "userId" | "id">;
      Params: { id: string };
    }>,
    reply: FastifyReply,
  ) => {
    const user = request.user?.id as string;
    const nodeId = request.params.id;
    const { data, error } = await nodeService.updateItem({
      ...request.body,
      userId: user,
      id: nodeId,
    });
    if (error) {
      throw error;
    }
    return SuccessResponse(reply, {
      data: null,
      message: data ? "Node Updated" : "Node not found",
    });
  };
  public async deleteByNodeIdsWorkflowId(
    req: FastifyRequest<{
      Params: { workflowId: string };
      Querystring: { nodeIds: string[] };
    }>,
    _rep: FastifyReply,
  ) {
    const workflowId = req.params.workflowId;
    const userId = req.user!.id;
    if (!workflowId) {
      throw new ValidationException("Invalid input", [
        { path: "workflowId", message: "WorkflowId is required" },
      ]);
    }

    const workflow = await workflowService.exists((t) =>
      and(eq(t.userId, userId), eq(t.id, workflowId)),
    );
    const nodeIds = req.query?.nodeIds || [];
    if (!workflow.data) {
      throw workflow.error;
    }
    const deletedWorkflow = await nodeService.deleteByNodeIdsWorkflowId(
      workflowId,
      nodeIds,
    );
    if (deletedWorkflow.error) {
      throw deletedWorkflow.error;
    }

    return SuccessResponse(_rep, {
      message: `${nodeIds.length > 0 ? "Nodes are" : "Node is"} deleted`,
      data: deletedWorkflow.data,
    });
  }
  public async deleteById(
    req: FastifyRequest<{
      Params: { id: string };
    }>,
    _rep: FastifyReply,
  ) {
    const nodeId = req.params.id;
    const userId = req.user!.id;
    if (!nodeId) {
      throw new ValidationException("Invalid input", [
        { path: "nodeId", message: "NodeId is required" },
      ]);
    }

    const node = await nodeService.exists((t) =>
      and(eq(t.userId, userId), eq(t.id, nodeId)),
    );
    if (!node.data) {
      throw node.error;
    }
    const nodeData = node.data[0];
    if (nodeData?.userId != userId) {
      throw new ForbiddenException(
        "You're not allowed to perform this request",
      );
    }
    const deletedNode = await nodeService.deleteById(nodeId, userId);
    if (deletedNode.error) {
      throw deletedNode.error;
    }

    return SuccessResponse(_rep, {
      message: `Node is deleted`,
      data: deletedNode.data,
    });
  }
  public async getById(
    req: FastifyRequest<{
      Params: { id: string };
    }>,
    _rep: FastifyReply,
  ) {
    const nodeId = req.params.id;
    const userId = req.user!.id;
    if (!nodeId) {
      throw new ValidationException("Invalid input", [
        { path: "nodeId", message: "NodeId is required" },
      ]);
    }

    const node = await nodeService.getById(nodeId, userId);
    if (node.error) {
      throw node.error;
    }

    return SuccessResponse(_rep, {
      message: `Node data`,
      data: node.data,
    });
  }
}

export default new NodeController();
