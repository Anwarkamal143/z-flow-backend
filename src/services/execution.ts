import { HTTPSTATUS } from "@/config/http.config";
import { and, db, desc, eq, sql } from "@/db";
import { executions, workflows } from "@/db/tables";
import {
  InsertExecution,
  InsertExecutionSchema,
  UpdateExecution,
} from "@/schema/executions";
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
} from "@/utils/catch-errors";
import { BaseService } from "./base.service";
import { parseLimit, validateLimit } from "./base.service.helpers";
import { QueryBuilder } from "./pagination/builder";
import { CursorPagination } from "./pagination/cursor";
import { OffsetPagination } from "./pagination/offset";

export type ExecutionsPaginationConfig =
  typeof executionService._types.PaginationsConfig;

export class ExecutionService extends BaseService<typeof executions> {
  protected builder: QueryBuilder<typeof executions>;
  protected cursorPagination: CursorPagination<typeof executions>;
  protected offsetPagination: OffsetPagination<typeof executions>;
  constructor() {
    super(executions);
    this.builder = new QueryBuilder(executions);
    this.cursorPagination = new CursorPagination(db, executions);
    this.offsetPagination = new OffsetPagination(db, executions);
  }

  async listAllPaginatedExecutions(
    params: typeof this._types.PaginatedParams = {},
  ) {
    const { mode, sort = "desc", ...rest } = params;
    if (mode == "cursor") {
      const resp = await this.paginateCursor({
        ...rest,
        sort,
        cursorColumn: (table) => table.id,
      });

      return resp;
    }

    const res = await this.paginateOffset({
      ...rest,
      sort,
    });

    return res;
  }
  async listAllPaginatedExecutionsV2(params: ExecutionsPaginationConfig) {
    const { mode } = params;
    if (mode == "cursor") {
      const resp = await this.paginationCursorRecords({
        ...params,
      });

      return resp;
    }

    const res = await this.paginationOffsetRecords({
      ...params,
    });

    return res;
  }

  /**
   * Paginated list of executions including workflow for a user. Same shape as getOneExecution:
   * each item is { execution, workflow }. Auth is based on userId inside workflow (workflows.userId = userId).
   * Compatible with base service: accepts ExecutionsPaginationConfig (same as base PaginationsConfig),
   * returns { data: { items, pagination_meta }, error } and validates limit via validateLimit.
   * Supports offset (page/limit) and cursor modes.
   */
  async listPaginatedForExecutions(
    userId: string,
    query: ExecutionsPaginationConfig,
  ) {
    const config = this.validateQuery(query);

    const mode = config.mode;
    const limitNum = parseLimit(config.limit);
    const limitError = limitNum != null ? validateLimit(limitNum) : null;
    if (limitError) {
      return { data: null, error: new BadRequestException(limitError) };
    }

    const whereByUser = eq(workflows.userId, userId);
    // Base query builder function
    const createBaseQuery = () =>
      db
        .select({
          execution: executions,
          workflow: workflows,
        })
        .from(executions)
        .innerJoin(workflows, eq(executions.workflowId, workflows.id));

    const includeTotal = config.includeTotal === true;

    try {
      if (mode === "cursor") {
        const result = this.cursorPagination.prepareCursorQueryMeta(config);
        if (result.error) {
          return { data: null, error: result.error };
        }
        let where;
        const { cursorColumn, whereClause, orderByClause, limitNum } = result;
        const cursorCondition = this.cursorPagination.buildCursorCondition(
          cursorColumn,
          config.cursor as string | undefined,
          config.cursorDirection,
          config.sorts || [],
        );
        if (cursorCondition) {
          if (whereClause) {
            where = and(whereClause, cursorCondition);
          } else {
            where = cursorCondition;
          }
        }
        const limitPlusOne = limitNum ? limitNum + 1 : undefined;

        let dbQuery = createBaseQuery()
          .where(where || sql`true`)
          .orderBy(orderByClause || desc(executions.id));

        if (limitPlusOne) {
          dbQuery.limit(limitPlusOne);
        }

        // Execute query
        const cursorItems = await dbQuery;
        // Check if we have extra item
        const { items, hasExtra } = this.cursorPagination.processResults(
          cursorItems,
          limitNum,
        );

        // Determine next/previous cursors
        const { nextCursor, previousCursor } =
          this.cursorPagination.generateCursors(
            items,
            config.cursor as string | undefined,
            config.cursorDirection,
            config.cursorColumn as string,
            hasExtra,
          );
        let totalCount: number | undefined = undefined;
        if (includeTotal) {
          const result = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(executions)
            .innerJoin(workflows, eq(executions.workflowId, workflows.id))
            .where(where);
          totalCount = result[0]?.count ?? undefined;
        }
        const totalPages = this.cursorPagination.calculateTotalPages(
          totalCount,
          limitNum,
          items,
        );
        return this.cursorPagination.buildResponse(
          items.map((item) => ({
            ...item.execution,
            workflow: item.workflow,
          })),
          { nextCursor, previousCursor },
          limitNum,
          totalCount,
          totalPages,
          config.cursor,
          config.cursorDirection,
        );
      }
      const { offset, whereClause, orderByClause, limitNum } =
        this.offsetPagination.prepareOffsetQueryMeta(config);
      const where = whereClause ? and(whereByUser, whereClause) : whereByUser;
      let dbQuery = createBaseQuery()
        .where(where)
        .orderBy(orderByClause || desc(executions.id));

      if (offset != null) {
        dbQuery.offset(offset);
      }
      if (limitNum != null) {
        dbQuery.limit(limitNum + 1);
      }

      const rows = await dbQuery;

      const items = limitNum ? rows.slice(0, limitNum) : rows;
      let totalCount: number | undefined = undefined;
      if (includeTotal) {
        const result = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(executions)
          .innerJoin(workflows, eq(executions.workflowId, workflows.id))
          .where(where);
        totalCount = result[0]?.count ?? undefined;
      }
      const { hasMore, paginatedItems } = this.offsetPagination.processResults(
        items,
        limitNum,
      );
      // Calculate current page
      const currentPage = this.offsetPagination.calculateCurrentPage(
        offset,
        limitNum,
      );

      // Calculate total pages
      const totalPages = this.offsetPagination.calculateTotalPages(
        totalCount,
        limitNum,
      );

      return this.offsetPagination.buildResponse(
        paginatedItems.map((item) => ({
          ...item.execution,
          workflow: item.workflow,
        })),
        limitNum,
        totalCount,
        totalPages,
        currentPage,
        hasMore,
      );
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }
  async softDeleteUserById(accountId: string) {
    return this.softDelete((table) => eq(table.id, accountId), {
      deleted_at: new Date(),
    });
  }

  public async createExecution(executionData: InsertExecution) {
    const parseResult = InsertExecutionSchema.safeParse(executionData);
    if (!parseResult.success) {
      return {
        data: null,
        error: new BadRequestException("Invalid execution data"),
      };
    }
    const { data: execution } = await this.create(parseResult.data);
    if (!execution) {
      return {
        data: null,
        error: new BadRequestException("Execution not created"),
      };
    }
    return {
      data: execution,
      status: HTTPSTATUS.CREATED,
    };
  }

  async updateExecution(executionId: string, executionData: UpdateExecution) {
    const { data, ...rest } = await this.update(
      (fields) => eq(fields.id, executionId),
      executionData,
    );
    return { ...rest, data: data?.[0] };
  }
  async updateByExecutionInngestEventId(
    eventId: string,
    executionData: UpdateExecution,
  ) {
    const { data, ...rest } = await this.update(
      (fields) => eq(fields.inngest_event_id, eventId),
      executionData,
    );
    return { ...rest, data: data?.[0] };
  }
  /**
   * Get one execution by executionId, authorized by userId inside workflow.
   * Returns execution + workflow only if workflows.userId = userId.
   */
  async getOneExecution(executionId: string, userId: string) {
    try {
      const result = await db
        .select({
          execution: executions,
          workflow: workflows,
        })
        .from(executions)
        .innerJoin(workflows, eq(executions.workflowId, workflows.id))
        .where(
          and(eq(executions.id, executionId), eq(workflows.userId, userId)),
        )
        .limit(1);

      if (result.length === 0) {
        return {
          error: new NotFoundException("Execution not found or unauthorized"),
          data: null,
        };
      }

      const data = {
        ...result?.[0]?.execution,
        workflow: result?.[0]?.workflow,
      };
      return { data, error: null };
    } catch (error) {
      return {
        error: new InternalServerException("Internal Server exception"),
        data: null,
      };
    }
  }
}
export const executionService = new ExecutionService();
