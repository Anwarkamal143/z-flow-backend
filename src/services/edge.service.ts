import { eq, inArray } from "@/db";

import { HTTPSTATUS } from "@/config/http.config";
import { connections } from "@/db/tables";
import {
  IEdge,
  InsertEdge,
  InsertEdgeSchema,
  InsertManyEdgeSchema,
  IOutputEdge,
} from "@/schema/edges";
import { formatZodError } from "@/utils";
import { ValidationException } from "@/utils/catch-errors";
import { UUID } from "ulid";
import { BaseService, ITransaction } from "./base.service";

export class EdgeService extends BaseService<
  typeof connections,
  InsertEdge,
  IEdge
> {
  constructor() {
    super(connections);
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

  async createItem(data: InsertEdge, tsx?: ITransaction) {
    const result = InsertEdgeSchema.safeParse(data);
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
  async createItems(data: InsertEdge[], tsx?: ITransaction) {
    const result = InsertManyEdgeSchema.safeParse(data);
    if (result.error) {
      const errors = formatZodError(result.error);

      return {
        error: new ValidationException("Validatoin error", errors),
        data: null,
        status: HTTPSTATUS.BAD_REQUEST,
      };
    }
    console.log(result.data, "result");

    return await this.createMany(result.data, tsx);
  }
  async populateConnections<T extends boolean = true>(
    workflowIds: UUID[],
    transform: T = true as T
  ) {
    const connectionsResp = await edgeService.findMany((table) =>
      inArray(table.workflowId, workflowIds)
    );
    if (!connectionsResp.data) {
      return {};
    }
    return connectionsResp.data?.reduce((acc, connection) => {
      if (!connection || !connection.workflowId) return acc;
      const { fromNodeId, toNodeId, fromOutput, toInput, ...rest } = connection;
      const obj = {
        ...rest,
        ...(transform
          ? {
              source: fromNodeId,
              target: toNodeId,
              sourceHandle: fromOutput,
              targetHandle: toInput,
            }
          : { fromNodeId, toNodeId, fromOutput, toInput }),
      } as T extends true ? IOutputEdge : IEdge;
      if (acc[connection.workflowId]) {
        acc[connection.workflowId]!.push(obj);
      } else {
        acc[connection.workflowId] = [obj];
      }
      return acc;
    }, {} as Record<string, (T extends true ? IOutputEdge : IEdge)[]>);
  }
}
export const edgeService = new EdgeService();
