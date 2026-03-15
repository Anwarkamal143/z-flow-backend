import { stringToNumber } from "@/utils";
import { buildPaginationMetaCursor } from "@/utils/api";
import { BadRequestException } from "@/utils/catch-errors";
import { and, asc, desc, gt, InferSelectModel, lt } from "drizzle-orm";
import { AnyPgTable, PgColumn } from "drizzle-orm/pg-core";
import { BasePagination } from "./base";
import { CursorPaginationConfig, CursorPaginationResult } from "./types";

export class CursorPagination<T extends AnyPgTable> extends BasePagination<T> {
  async paginate<Result = InferSelectModel<T>>(
    config: CursorPaginationConfig<T>,
  ): Promise<CursorPaginationResult<Result>> {
    const result = this.prepareCursorQueryMeta(config);

    if (result.error) {
      return result;
    }
    const { cursorColumn, whereClause, orderByClause, limitNum } = result;
    const query = this.prePareCursorQuery(
      cursorColumn,
      whereClause,
      orderByClause,
      config.cursor as string | undefined,
      config.cursorDirection,
      limitNum,
    );

    // Execute query
    const cursorItems = (await query) as Result[];

    return await this.getCursorResultWithTotalCountIfNeeded(
      config,
      whereClause,
      cursorItems,
      limitNum,
    );
  }

  /**
   * Prepare Filters and orders by before execute query, this is common for both cursor and offset pagination
   */

  public prepareCursorQueryMeta(config: CursorPaginationConfig<T>) {
    // Validate cursor column
    const validationError = this.validateCursorColumn(
      config.cursorColumn as string,
    );
    if (validationError?.error) {
      return validationError;
    }

    const cursorColumn = this.table[config.cursorColumn as string] as PgColumn;
    const whereClause = this.builder.buildWhereClause(
      config.filters,
      config.search,
    );
    const orderByClause = this.builder.buildOrderByClause(config.sorts);

    // Build base query

    const limitNum = this.parseLimit(config.limit);
    return { cursorColumn, whereClause, orderByClause, limitNum, error: null };
  }

  /**
   * After qurey execution, get total count if requested, otherwise return undefined or items length
   * @param includeTotal
   * @param whereClause
   * @param items
   * @param limitNum
   */

  public async getCursorResultWithTotalCountIfNeeded(
    config: CursorPaginationConfig<T>,

    whereClause: any,
    cursorItems: any[],
    limitNum: number | undefined,
  ) {
    // Check if we have extra item
    const { items, hasExtra } = this.processResults(cursorItems, limitNum);

    // Determine next/previous cursors
    const { nextCursor, previousCursor } = this.generateCursors(
      items,
      config.cursor as string | undefined,
      config.cursorDirection,
      config.cursorColumn as string,
      hasExtra,
    );

    // Get total count if requested
    // let totalPages: number = 0;

    // Get total count
    // Get total count if needed
    const totalItems = await this.getTotalCountIfNeeded(
      config.includeTotal,
      whereClause,
      items,
      limitNum,
    );

    const totalPages = this.calculateTotalPages(totalItems, limitNum, items);

    // return {
    //   items,
    //   meta: {
    //     next: nextCursor,
    //     previousCursor,
    //     hasNextPage: !!nextCursor,
    //     hasPreviousPage: !!previousCursor,
    //     totalItems,
    //     totalPages,

    //   },
    // };
    return this.buildResponse(
      items,
      { nextCursor, previousCursor },
      limitNum,
      totalItems,
      totalPages,
      config.cursor as string | undefined,
      config.cursorDirection,
    );
  }

  /**
   * Validates that the cursor column exists in the table
   */
  public validateCursorColumn<Result>(
    cursorColumn: string,
  ): CursorPaginationResult<Result> | null {
    if (!this.builder.validateColumns([cursorColumn])) {
      return {
        error: new BadRequestException(
          `Invalid cursor column: ${cursorColumn}`,
        ),
        data: null,
      };
    }
    return null;
  }

  /**
   * Parses and validates the limit parameter
   */
  public parseLimit(
    limit: number | string | undefined | null,
  ): number | undefined {
    if (limit === undefined) return undefined;

    const numLimit = stringToNumber(limit);
    return numLimit && numLimit > 0 ? numLimit : undefined;
  }

  /**
   * Builds the cursor condition for the query
   */
  public buildCursorCondition(
    cursorColumn: PgColumn,
    cursor: string | undefined,
    cursorDirection: "forward" | "backward" | undefined,
    sorts?: any[],
  ) {
    if (!cursor) return null;

    const cursorValue = this.decodeCursor(cursor);
    const cursorOperator = this.getCursorOperator(cursorDirection, sorts);

    return cursorOperator(cursorColumn, cursorValue);
  }

  /**
   * Determines the appropriate cursor operator based on direction and sorting
   */
  public getCursorOperator(
    cursorDirection: "forward" | "backward" | undefined,
    sorts?: any[],
  ) {
    const isBackward = cursorDirection === "backward";
    const isDescSort = sorts?.[0]?.direction === "desc";

    if (isBackward) {
      return isDescSort ? gt : lt;
    }
    return isDescSort ? lt : gt;
  }

  /**
   * Executes the paginated query
   */
  public async prePareCursorQuery(
    cursorColumn: PgColumn,
    whereClause: any,
    orderByClause: any,
    cursor: string | undefined,
    cursorDirection: "forward" | "backward" | undefined,
    limitNum: number | undefined,
  ) {
    const query = this.db.select().from(this.table as AnyPgTable);

    // Combine both conditions
    let finalWhereClause = whereClause;

    // Apply cursor condition
    const cursorCondition = this.buildCursorCondition(
      cursorColumn,
      cursor,
      cursorDirection,
      [], // Pass sorts if available
    );

    if (cursorCondition) {
      if (finalWhereClause) {
        finalWhereClause = and(finalWhereClause, cursorCondition);
      } else {
        finalWhereClause = cursorCondition;
      }
    }

    // Apply the combined where clause once
    if (finalWhereClause) {
      query.where(finalWhereClause);
    }

    // Apply order by
    if (orderByClause) {
      query.orderBy(orderByClause);
    } else {
      query.orderBy(
        cursorDirection === "backward" ? desc(cursorColumn) : asc(cursorColumn),
      );
    }

    // Apply limit with extra item for hasMore check
    if (limitNum != null) {
      query.limit(limitNum + 1);
    }

    return query;
  }

  /**
   * Processes query results to separate items and determine if there are more
   */
  public processResults<Result>(
    cursorItems: Result[],
    limitNum: number | undefined,
  ): { items: Result[]; hasExtra: boolean } {
    const hasExtra = limitNum != null ? cursorItems?.length > limitNum : false;
    const items = hasExtra ? cursorItems?.slice(0, -1) : cursorItems;

    return { items, hasExtra };
  }

  /**
   * Generates next and previous cursors
   */
  public generateCursors<Result>(
    items: Result[],
    currentCursor: string | undefined,
    cursorDirection: "forward" | "backward" | undefined,
    cursorColumn: string,
    hasExtra: boolean,
  ): { nextCursor: string | null; previousCursor: string | null } {
    let nextCursor: string | null = null;
    let previousCursor: string | null = null;

    if (items.length > 0) {
      const lastItem = items[items.length - 1];
      const firstItem = items[0];

      if (cursorDirection === "forward") {
        nextCursor = hasExtra
          ? this.encodeCursor((lastItem as any)[cursorColumn])
          : null;
        previousCursor = currentCursor
          ? this.encodeCursor((firstItem as any)[cursorColumn])
          : null;
      } else {
        previousCursor = hasExtra
          ? this.encodeCursor((lastItem as any)[cursorColumn])
          : null;
        nextCursor = currentCursor
          ? this.encodeCursor((firstItem as any)[cursorColumn])
          : null;
      }
    }

    return { nextCursor, previousCursor };
  }

  /**
   * Gets total count if requested, otherwise returns undefined or items length
   */
  public async getTotalCountIfNeeded(
    includeTotal: boolean | undefined,
    whereClause: any,
    items: any[],
    limitNum: number | undefined,
  ): Promise<number | undefined> {
    if (includeTotal) {
      return await this.getTotalCount(whereClause);
    }

    if (limitNum == null) {
      return items.length;
    }

    return undefined;
  }

  /**
   * Calculates total number of pages
   */
  public calculateTotalPages(
    totalItems: number | undefined,
    limitNum: number | undefined,
    items: any[],
  ): number {
    let totalPages = items.length > 0 ? 1 : 0;

    if (limitNum != null && totalItems) {
      totalPages = Math.ceil(totalItems / limitNum);
    }

    return totalPages;
  }
  public buildResponse<Result>(
    items: Result[],
    cursors: { nextCursor: string | null; previousCursor: string | null },
    limitNum: number | undefined,
    totalItems: number | undefined,
    totalPages: number,
    currentCursor: string | undefined | null,
    cursorDirection: "forward" | "backward" | undefined,
  ): CursorPaginationResult<Result> {
    return {
      data: {
        items,
        pagination_meta: {
          ...buildPaginationMetaCursor({
            limit: limitNum as number,
            total: totalItems,
            next: cursors.nextCursor as string,
            cursor: currentCursor as string,
            hasMore: !!cursors.nextCursor,
            previous: cursors.previousCursor,
          }),
          direction: cursorDirection || "forward",
          totalPages,
        },
      },
      error: null,
    };
  }

  private encodeCursor(value: any): string {
    return Buffer.from(JSON.stringify(value)).toString("base64");
  }

  private decodeCursor(cursor: string): any {
    return JSON.parse(Buffer.from(cursor, "base64").toString());
  }
}
