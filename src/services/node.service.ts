import { and, eq, inArray } from "@/db";

import { HTTPSTATUS } from "@/config/http.config";
import { nodes } from "@/db/tables";
import {
  INode,
  InsertManyNodesSchema,
  InsertNode,
  InsertNodeSchema,
  IUpdateUserNode,
  UpdateUserNodeSchema,
} from "@/schema/node";
import { formatZodError } from "@/utils";
import { NotFoundException, ValidationException } from "@/utils/catch-errors";
import { UUID } from "ulid";
import { BaseService, ITransaction } from "./base.service";

export class NodeService extends BaseService<typeof nodes, InsertNode, INode> {
  constructor() {
    super(nodes);
  }

  async listPaginatedItems(params: typeof this._types.PaginatedParams) {
    const { mode, sort = "desc", ...rest } = params;
    if (mode === "offset") {
      return await this.paginateOffset({
        ...rest,
        sort,
      });
    }

    return await this.paginateCursor({
      ...rest,
      sort,
      cursorColumn: (table) => table.id,
    });
  }

  async softDeleteAccountById(accountId: string) {
    return this.softDelete((table) => eq(table.id, accountId), {
      deleted_at: new Date(),
    });
  }
  public async deleteByWorkflowId(WorkflowId: string, tsx?: ITransaction) {
    if (!WorkflowId) {
      return {
        data: null,
        error: new ValidationException("Invalid input", [
          { path: "workflowId", message: "WorkflowId is required" },
        ]),
      };
    }
    return await this.delete(
      (fields) => eq(fields.workflowId, WorkflowId),
      tsx,
    );
  }
  public async deleteByNodeIdsWorkflowId(
    WorkflowId: string,
    nodeIds: string[],
    tsx?: ITransaction,
  ) {
    if (!WorkflowId) {
      return {
        data: null,
        error: new ValidationException("Invalid input", [
          { path: "workflowId", message: "WorkflowId is required" },
        ]),
      };
    }
    if (!nodeIds || !nodeIds.length) {
      return {
        data: null,
        error: new ValidationException("Invalid input", [
          { path: "Node Ids", message: "Node Ids are required" },
        ]),
      };
    }
    return await this.delete(
      (fields) =>
        and(eq(fields.workflowId, WorkflowId), inArray(fields.id, nodeIds)),
      tsx,
    );
  }
  async createItem(data: InsertNode, tsx?: ITransaction) {
    const result = InsertNodeSchema.safeParse(data);
    if (result.error) {
      const errors = formatZodError(result.error);

      return {
        error: new ValidationException("Validatoin error", errors),
        data: null,
        status: HTTPSTATUS.BAD_REQUEST,
      };
    }
    return await this.create(result.data, tsx);
  }
  async updateItem(data: IUpdateUserNode, tsx?: ITransaction) {
    const result = UpdateUserNodeSchema.safeParse(data);
    if (!result.success) {
      const errors = formatZodError(result.error);

      return {
        error: new ValidationException("Validatoin error", errors),
        data: null,
        status: HTTPSTATUS.BAD_REQUEST,
      };
    }
    const parseData = result.data;
    const node = await nodeService.getById(parseData.id, parseData.userId);
    if (node.error) {
      return node;
    }
    if (!node.data) {
      return { data: null, error: new NotFoundException("Node not found") };
    }

    const { userId, ...updateData } = result.data;
    const item = await this.update(
      (t) => eq(t.id, updateData.id),
      updateData,
      tsx,
    );
    if (item.error) {
      return item;
    }
    return { data: item.data[0], error: null };
  }
  async createItems(data: InsertNode[], tsx?: ITransaction) {
    const result = InsertManyNodesSchema.safeParse(data);
    if (!result.success) {
      const errors = formatZodError(result.error);

      return {
        error: new ValidationException("Validatoin error", errors),
        data: null,
        status: HTTPSTATUS.BAD_REQUEST,
      };
    }
    const resp = await this.createMany(result.data, tsx);
    if (resp.error) {
      return resp;
    }

    return resp;
  }
  async getById(id: string, userId: string) {
    if (!id) {
      return {
        error: new ValidationException("id is required", [
          { path: "id", message: "id is required" },
        ]),
        data: null,
      };
    }
    if (!userId) {
      return {
        error: new ValidationException("userId is required", [
          { path: "userId", message: "userId is required" },
        ]),
        data: null,
      };
    }
    const res = await this.findOne((t) => eq(t.id, id));

    if (!res.data)
      return {
        error: new NotFoundException("Node not found"),
        data: null,
      };

    return {
      data: res.data,
      error: null,
    };
  }
  async deleteById(id: string, userId: string) {
    if (!id) {
      return {
        error: new ValidationException("id is required", [
          { path: "id", message: "id is required" },
        ]),
        data: null,
      };
    }
    if (!userId) {
      return {
        error: new ValidationException("userId is required", [
          { path: "userId", message: "userId is required" },
        ]),
        data: null,
      };
    }
    const res = await this.delete((t) =>
      and(eq(t.id, id), eq(t.userId, userId)),
    );

    if (!res.data || !res.data?.length)
      return {
        error: new NotFoundException("Node deleted"),
        data: null,
      };

    return {
      data: res.data,
      error: null,
    };
  }
  async populateNodes(workflowIds: UUID[]) {
    const nodesResp = await nodeService.findMany((table) =>
      inArray(table.workflowId, workflowIds),
    );
    if (!nodesResp.data) {
      return {};
    }
    return nodesResp.data?.reduce(
      (acc, node) => {
        if (!node || !node.workflowId) return acc;
        if (acc[node.workflowId]) {
          acc[node.workflowId]!.push(node);
        } else {
          acc[node.workflowId] = [node];
        }
        return acc;
      },
      {} as Record<string, INode[]>,
    );
  }
  async populateNodesWithSecrets(workflowIds: UUID[]) {
    const nodesResp = await nodeService.findMany((table) =>
      inArray(table.workflowId, workflowIds),
    );
    if (!nodesResp.data) {
      return {};
    }

    return nodesResp.data?.reduce(
      (acc, node) => {
        if (!node || !node.workflowId) return acc;
        if (acc[node.workflowId]) {
          acc[node.workflowId]!.push(node);
        } else {
          acc[node.workflowId] = [node];
        }
        return acc;
      },
      {} as Record<string, INode[]>,
    );
  }
}
export const nodeService = new NodeService();
