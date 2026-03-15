import { and, eq, NodeType } from "@/db";
import { workflows } from "@/db/tables";
import { ErrorCode } from "@/enums/error-code.enum";
import { WORKFLOW_EVENT_NAMES } from "@/flow-executions/events/workflow";
import { ULIDSchema } from "@/schema/helper";
import { INode } from "@/schema/node";
import { IUpdateUser } from "@/schema/user";
import {
  InsertWorkflows,
  InsertWorkflowsSchema,
  SelectWorkflows,
  UpdateWorkFlowNameSchema,
  UpdateWorkflowWithNodesEdges,
  UpdateWorkflowWithNodesEdgesSchema,
  WorkflowByIdUserIdSchema,
} from "@/schema/workflow";
import { formatZodError } from "@/utils";
import {
  BadRequestException,
  NotFoundException,
  ValidationException,
} from "@/utils/catch-errors";
import { toUTC } from "@/utils/date-time";
import { cacheManager } from "@/utils/redis-cache/cache-manager";
import drizzleCache from "@/utils/redis-cache/drizzle-cache";
import { BaseService } from "./base.service";
import { edgeService } from "./edge.service";
import { inngestService } from "./inngest.service";
import { nodeService } from "./node.service";
export type WorkflowPaginationConfig =
  typeof workflowService._types.PaginationsConfig;
export type WorkflowSimplePaginationConfig =
  typeof workflowService._types.PaginatedParams;

export class WorkflowService extends BaseService<
  typeof workflows,
  InsertWorkflows,
  SelectWorkflows
> {
  constructor() {
    super(workflows);
  }
  async listAllPaginatedWorkflows(params: WorkflowSimplePaginationConfig = {}) {
    const { mode, sort = "desc", ...rest } = params;
    if (mode === "offset") {
      const listresp = await this.paginateOffset({
        ...rest,
        sort,
        where: rest.where,
      });
      return listresp;
    }

    return await this.paginateCursor({
      ...rest,
      where: rest.where,
      sort,
      cursorColumn: params.cursorColumn
        ? params.cursorColumn
        : (table) => table.id,
    });
  }

  async listAllPaginatedWorkflowsV2(params: WorkflowPaginationConfig) {
    const { mode } = params;
    if (mode == "offset") {
      const listresp = await this.paginationOffsetRecords({
        ...params,
      });
      // if (listresp.data?.items?.length) {
      //   const nodesMap = await this.populateNodes(
      //     listresp.data.items.map((w) => w.id)
      //   );
      //   listresp.data.items = listresp.data.items.map((workflow) => ({
      //     ...workflow,
      //     nodes: nodesMap[workflow.id] || [],
      //   }));
      // }
      return listresp;
    }
    const listresp = await this.paginationCursorRecords(params);
    // if (listresp.data?.items?.length) {
    //   const nodesMap = await this.populateNodes(
    //     listresp.data.items.map((w) => w.id)
    //   );
    //   listresp.data.items = listresp.data.items.map((workflow) => ({
    //     ...workflow,
    //     nodes: nodesMap[workflow.id] || [],
    //   }));
    // }
    return listresp;
  }

  public async getByName(name: string) {
    if (!name) {
      return {
        data: null,
        error: new BadRequestException("name is required", {
          errorCode: ErrorCode.VALIDATION_ERROR,
        }),
      };
    }
    return await this.findOne((fields) => eq(fields.name, name));
  }

  public async getById(id?: string, usecahce = false) {
    if (!id) {
      return {
        data: null,

        error: new BadRequestException("Workflow Id is required", {
          errorCode: ErrorCode.VALIDATION_ERROR,
        }),
      };
    }
    return await drizzleCache.query(
      async () => {
        return await this.findOne((fields) => eq(fields.id, id));
      },
      {
        options: {
          ttl: 600,
          useCache: usecahce,
          cacheKey: `workflows:${id}`,
        },
      },
    );
  }
  public async getByFieldWithNodesAndConnections(
    fieldValue: string | undefined,
    field: typeof this._types.column,
  ) {
    if (!fieldValue || !field) {
      return {
        data: null,

        error: new BadRequestException(`${field} is not provided`, {
          errorCode: ErrorCode.VALIDATION_ERROR,
        }),
      };
    }

    const fd = this.getTableColumn(field);

    const workflow = await this.findOne(() => eq(fd, fieldValue));

    if (workflow.data) {
      const nodesMap = await nodeService.populateNodes([workflow.data.id]);
      const edges = await edgeService.populateConnections(
        [workflow.data.id],
        false,
      );
      return {
        data: {
          ...workflow.data,
          nodes: nodesMap[workflow.data.id] || [],
          edges: edges[workflow.data.id] || [],
        },
        error: null,
      };
    }
    return workflow;
  }
  public async getByUserId(userId?: string) {
    if (!userId) {
      return {
        data: null,

        error: new BadRequestException("User Id is required", {
          errorCode: ErrorCode.VALIDATION_ERROR,
        }),
      };
    }

    const workflows = await this.findMany((fields) =>
      eq(fields.userId, userId),
    );
    if (workflows.data?.length) {
      const nodesMap = await nodeService.populateNodes(
        workflows.data.map((w) => w.id),
      );
      return {
        data: workflows.data.map((workflow) => ({
          ...workflow,
          nodes: nodesMap[workflow.id] || [],
        })),
        error: null,
      };
    }
    return workflows;
  }
  public async getByIdAndUserId(workflowId?: string, userId?: string) {
    const parseResult = WorkflowByIdUserIdSchema.safeParse({
      id: workflowId,
      userId,
    });
    if (!parseResult.success) {
      return {
        data: null,
        error: new ValidationException(
          "Invalid input",
          formatZodError(parseResult.error),
        ),
      };
    }
    const parseData = parseResult.data;
    const workflowClient = await this.findOne((fields) =>
      and(eq(fields.id, parseData.id), eq(fields.userId, parseData.userId)),
    );
    if (workflowClient.data) {
      const nodes = await nodeService.populateNodes([workflowClient.data.id]);
      const connections = await edgeService.populateConnections([
        workflowClient.data.id,
      ]);
      return {
        data: {
          ...workflowClient.data,
          nodes: nodes[workflowClient.data.id] || [],
          edges: connections[workflowClient.data.id] || [],
        },
        error: null,
      };
    }
    return workflowClient;
  }
  public async getWorkflowByIdAndUserId(workflowId?: string, userId?: string) {
    const parseResult = WorkflowByIdUserIdSchema.safeParse({
      id: workflowId,
      userId,
    });
    if (!parseResult.success) {
      return {
        data: null,
        error: new ValidationException(
          "Invalid input",
          formatZodError(parseResult.error),
        ),
      };
    }
    const parseData = parseResult.data;
    return await this.findOne((fields) =>
      and(eq(fields.id, parseData.id), eq(fields.userId, parseData.userId)),
    );
  }
  async softDeleteById(accountId: string) {
    return this.softDelete((table) => eq(table.id, accountId), {
      deleted_at: new Date(),
    });
  }

  public async deleteByIdUserId(id?: string, userId?: string) {
    const parseResult = WorkflowByIdUserIdSchema.safeParse({
      id,
      userId,
    });
    if (!parseResult.success) {
      return {
        data: null,

        error: new ValidationException(
          "Invalid input",
          formatZodError(parseResult.error),
        ),
      };
    }
    const data = parseResult.data;
    return await this.delete((fields) =>
      and(eq(fields.id, data.id), eq(fields.userId, data.userId)),
    );
  }
  public async deleteUserWorkFlows(userId?: string) {
    if (!userId) {
      return {
        data: null,

        error: new BadRequestException("User Id is required", {
          errorCode: ErrorCode.VALIDATION_ERROR,
        }),
      };
    }
    return await this.delete((fields) => eq(fields.userId, userId));
  }

  public async createWorkflow(workflow: InsertWorkflows) {
    const parseResult = InsertWorkflowsSchema.safeParse(workflow);
    if (!parseResult.success) {
      return {
        data: null,
        error: new ValidationException(
          "Invalid input",
          formatZodError(parseResult.error),
        ),
      };
    }
    try {
      return await this.withTransaction(async (tx) => {
        const res = await this.create(parseResult.data, tx);

        if (res.error) {
          throw new BadRequestException("Failed to create workflow", {
            errorCode: ErrorCode.DATABASE_ERROR,
          });
        }
        const workflow = res.data;
        // const node = await nodeService.createItem(
        //   {
        //     workflowId: workflow.id,
        //     userId: workflow.userId,
        //     name: NodeType.INITIAL,
        //     type: NodeType.INITIAL,
        //     position: { x: 0, y: 0 },
        //   },
        //   tx,
        // );
        // if (node.error) {
        //   throw new BadRequestException("Failed to create initial node", {
        //     errorCode: ErrorCode.DATABASE_ERROR,
        //   });
        // }
        // return { data: { ...workflow, initialNode: node.data }, error: null };
        return { data: { ...workflow }, error: null };
      });
    } catch (error) {
      return {
        data: null,
        error: error as Error,
      };
    }
  }

  async updateWorkflowNameByIdAndUserId(
    name: string = "",
    id: string = "",
    userId?: string,
  ) {
    const parseResult = UpdateWorkFlowNameSchema.safeParse({
      name,
      id,
      userId,
    });

    if (!parseResult.success) {
      return {
        data: null,

        error: new ValidationException(
          "Invalid input",
          formatZodError(parseResult.error),
        ),
      };
    }
    const {
      userId: uId,
      id: workflowId,
      name: workflowName,
    } = parseResult.data;
    const { data, ...rest } = await this.update(
      (fields) => and(eq(fields.id, workflowId), eq(fields.userId, uId)),
      { name: workflowName },
    );
    await cacheManager.remove(`workflows`);
    return { ...rest, data: data?.[0] };
  }
  async updateWorkflowByIdAndUserId(
    workflow: UpdateWorkflowWithNodesEdges,
    userId?: string,
  ) {
    if (!userId) {
      return {
        data: null,

        error: new BadRequestException("Invalid input", {
          errorCode: ErrorCode.VALIDATION_ERROR,
        }),
      };
    }
    const parseResult = UpdateWorkflowWithNodesEdgesSchema.safeParse({
      ...workflow,
      userId,
    });

    if (!parseResult.success) {
      return {
        data: null,

        error: new ValidationException(
          "Invalid input",
          formatZodError(parseResult.error),
        ),
      };
    }
    const workflowData = parseResult.data;
    const workflowtoUpdate = await this.getWorkflowByIdAndUserId(
      workflowData.id,
      userId,
    );
    if (!workflowtoUpdate.data) {
      return {
        data: null,
        error: new NotFoundException("Workflow not found", {
          errorCode: ErrorCode.RESOURCE_NOT_FOUND,
        }),
      };
    }
    try {
      return await this.withTransaction(async (tx) => {
        const nodesResp = await nodeService.deleteByWorkflowId(
          workflowData.id,
          tx,
        );
        if (nodesResp.error) {
          throw nodesResp.error;
        }
        const nodesData = workflowData.nodes.filter(
          (f) => f.type != NodeType.INITIAL,
        );
        const nodesArray = nodesData.length
          ? nodesData
          : [
              // {
              //   workflowId: workflow.id,
              //   userId: userId,
              //   name: NodeType.INITIAL,
              //   type: NodeType.INITIAL,
              //   position: { x: 0, y: 0 },
              // },
            ];
        let edgesResp;
        let createNodesResp;
        if (nodesArray.length) {
          createNodesResp = await nodeService.createItems(
            nodesArray.map(
              (node) =>
                ({
                  credentialId: node.data?.credentialId || null,
                  ...node,
                  name: node.type || "unknown",
                  workflowId: workflowData.id,
                  userId,
                  type: node.type as NodeType,
                  position: node.position || { x: 0, y: 0 },
                  data: node.data || {},
                }) as INode,
            ),
            tx,
          );
          if (createNodesResp.error) {
            throw createNodesResp.error;
          }
        }

        if (workflow.edges?.length) {
          edgesResp = await edgeService.createItems(
            workflowData.edges.map((edge) => ({
              ...edge,
              userId: userId,
              fromNodeId: edge.source,
              toNodeId: edge.target,
              fromOutput: edge.sourceHandle || "main",
              toInput: edge.targetHandle || "main",
              workflowId: workflowData.id,
            })),
            tx,
          );
          if (edgesResp.error) {
            throw edgesResp.error;
          }
        }
        const updatedWorkflow = await this.update<IUpdateUser>(
          (fields) => eq(fields.id, workflowData.id),

          {
            updated_at: toUTC(new Date(), false),
          },
          tx,
        );
        if (updatedWorkflow.error) {
          throw updatedWorkflow.error;
        }
        return {
          data: {
            ...updatedWorkflow.data?.[0],
            nodes: createNodesResp?.data || [],
            edges: edgesResp?.data || [],
          },
          error: null,
        };
      });
    } catch (error) {
      return {
        data: null,
        error,
      };
    }
  }
  async executeWorkflow(workflowId: string, userId) {
    try {
      const resultData = ULIDSchema("Id is not valid").safeParse(workflowId);
      if (!resultData.success) {
        throw new ValidationException(
          "Invalid Id",
          formatZodError(resultData.error),
        );
      }
      const workflowdata = await this.getWorkflowByIdAndUserId(
        workflowId,
        userId,
      );
      if (!workflowdata.data) {
        throw new BadRequestException("Workflow not found to execute");
      }
      const workflow = workflowdata.data;
      await inngestService.send({
        name: WORKFLOW_EVENT_NAMES.WORKFLOW_EXECUTE,
        data: {
          workflowId: workflow.id,
        },
      });
      return { data: workflowdata.data, error: null };
    } catch (error) {
      return {
        error,
        data: null,
      };
    }
  }
  async executeWebhookWorkflow(
    workflowId: string,
    secret: string,
    initialData: Record<string, any>,
  ) {
    try {
      const resultData = ULIDSchema("Id is not valid").safeParse(workflowId);
      if (!resultData.success) {
        throw new ValidationException(
          "Invalid Id",
          formatZodError(resultData.error),
        );
      }
      const workflowdata = await this.getById(workflowId);
      if (!workflowdata.data) {
        throw new BadRequestException("Workflow not found to execute");
      }
      if (workflowdata.data?.secret != secret) {
        throw new BadRequestException("Secret is incorrect");
      }
      const workflow = workflowdata.data;
      await inngestService.send({
        name: WORKFLOW_EVENT_NAMES.WORKFLOW_EXECUTE,
        data: {
          workflowId: workflow.id,
          initialData,
        },
      });
      return { data: workflowdata.data, error: null };
    } catch (error) {
      return {
        error,
        data: null,
      };
    }
  }
}
export const workflowService = new WorkflowService();
