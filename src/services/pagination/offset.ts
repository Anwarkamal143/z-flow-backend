import { stringToNumber } from "@/utils";
import { buildPaginationMetaForOffset } from "@/utils/api";
import { desc, InferSelectModel } from "drizzle-orm";
import { AnyPgTable } from "drizzle-orm/pg-core";
import { BasePagination } from "./base";
import { OffsetPaginationConfig, OffsetPaginationResult } from "./types";

export class OffsetPagination<T extends AnyPgTable> extends BasePagination<T> {
  async paginate<Result = InferSelectModel<T>>(
    config: OffsetPaginationConfig<T>,
  ): Promise<OffsetPaginationResult<Result>> {
    const result = this.prepareOffsetQueryMeta(config);

    const { whereClause, orderByClause, limitNum, offset } = result;
    const query = this.prepareOffsetQuery(
      whereClause,
      orderByClause,
      limitNum,
      offset,
    );

    // Execute query
    const items = (await query) as Result[];

    return await this.getOffsetResultWithTotalCountIfNeeded(
      config,
      whereClause,
      items,
      limitNum,
      offset,
    );
  }

  /**
   * Prepare filters, order by, and pagination metadata before executing query
   */
  public prepareOffsetQueryMeta(config: OffsetPaginationConfig<T>) {
    const whereClause = this.builder.buildWhereClause(
      config.filters,
      config.search,
    );
    const orderByClause = this.builder.buildOrderByClause(config.sorts);

    const limitNum = this.parseLimit(config.limit);
    const offset = this.calculateOffset(config.page, limitNum);

    return { whereClause, orderByClause, limitNum, offset };
  }

  /**
   * After query execution, get total count if requested and build response
   */
  public async getOffsetResultWithTotalCountIfNeeded(
    config: OffsetPaginationConfig<T>,
    whereClause: any,
    items: any[],
    limitNum: number | undefined | null,
    offset: number | undefined,
  ) {
    // Check if we have more items
    const { paginatedItems, hasMore } = this.processResults(items, limitNum);

    // Get total count if needed
    const totalItems = await this.getTotalCountIfNeeded(
      config.includeTotal,
      whereClause,
      paginatedItems,
      limitNum,
    );

    // Calculate current page
    const currentPage = this.calculateCurrentPage(offset, limitNum);

    // Calculate total pages
    const totalPages = this.calculateTotalPages(totalItems, limitNum);

    return this.buildResponse(
      paginatedItems,
      limitNum,
      totalItems,
      totalPages,
      currentPage,
      hasMore,
    );
  }

  /**
   * Parses and validates the limit parameter
   */
  private parseLimit(
    limit: number | string | undefined | null,
  ): number | undefined | null {
    if (limit == null) return null;

    const numLimit = stringToNumber(limit);
    return numLimit && numLimit > 0 ? numLimit : undefined;
  }

  /**
   * Calculates offset based on page number and limit
   */
  private calculateOffset(
    page: number | string | undefined | null,
    limitNum: number | undefined | null,
  ): number | undefined {
    if (limitNum == null) return undefined;

    const pageNum = this.parsePage(page);
    return (pageNum - 1) * limitNum;
  }

  /**
   * Parses and validates the page parameter
   */
  private parsePage(page: number | string | undefined | null): number {
    if (page == null) return 1;

    const pageNum = stringToNumber(page);
    return pageNum && pageNum > 0 ? pageNum : 1;
  }

  /**
   * Executes the paginated query
   */
  private async prepareOffsetQuery(
    whereClause: any,
    orderByClause: any,
    limitNum: number | undefined | null,
    offset: number | undefined,
  ) {
    const query = this.db.select().from(this.table as AnyPgTable);

    // Apply where clause
    if (whereClause) {
      query.where(whereClause);
    }

    // Apply order by
    if (orderByClause) {
      query.orderBy(orderByClause);
    } else {
      // Default ordering by id or created_at if available
      const defaultOrderColumn = this.getDefaultOrderColumn();
      query.orderBy(desc(defaultOrderColumn));
    }

    // Apply offset
    if (offset != null) {
      query.offset(offset);
    }

    // Apply limit with extra item for hasMore check
    if (limitNum != null) {
      query.limit(limitNum + 1);
    }

    return query;
  }

  /**
   * Gets the default column for ordering
   */
  private getDefaultOrderColumn(): any {
    // Try to use 'createdAt' or 'id' as default order column
    if (this.table["createdAt"]) {
      return this.table["createdAt"];
    }
    if (this.table["created_at"]) {
      return this.table["created_at"];
    }
    if (this.table["id"]) {
      return this.table["id"];
    }
    // Fallback to first column
    const columns = Object.keys(this.table);

    return this.table[columns[0] as string];
  }

  /**
   * Processes query results to separate items and determine if there are more
   */
  public processResults<Result>(
    items: Result[],
    limitNum: number | undefined | null,
  ): { paginatedItems: Result[]; hasMore: boolean } {
    const hasMore = limitNum != null ? items?.length > limitNum : false;
    const paginatedItems = hasMore ? items?.slice(0, -1) : items;

    return { paginatedItems, hasMore };
  }

  /**
   * Gets total count if requested, otherwise returns undefined
   */
  private async getTotalCountIfNeeded(
    includeTotal: boolean | undefined,
    whereClause: any,
    items: any[],
    limitNum: number | undefined | null,
  ): Promise<number | undefined> {
    if (includeTotal) {
      return await this.getTotalCount(whereClause);
    }

    // If no limit is provided and we're not including total, return items length
    if (limitNum == null) {
      return items.length;
    }

    return undefined;
  }

  /**
   * Calculates the current page number
   */
  public calculateCurrentPage(
    offset: number | undefined,
    limitNum: number | undefined | null,
  ): number {
    if (offset === undefined || limitNum == null) return 1;
    return Math.floor(offset / limitNum) + 1;
  }

  /**
   * Calculates total number of pages
   */
  public calculateTotalPages(
    totalItems: number | undefined,
    limitNum: number | undefined | null,
  ): number | undefined | null {
    if (totalItems === undefined || limitNum == null) {
      return undefined;
    }

    return Math.ceil(totalItems / limitNum);
  }

  /**
   * Builds the final response object
   */
  public buildResponse<Result>(
    items: Result[],
    limitNum: number | undefined | null,
    totalItems: number | undefined,
    totalPages: number | undefined | null,
    currentPage: number,
    hasMore: boolean,
  ): OffsetPaginationResult<Result> {
    return {
      data: {
        items,
        pagination_meta: {
          ...buildPaginationMetaForOffset({
            limit: limitNum as number,
            total: totalItems,
            page: currentPage,
            hasMore,
          }),
          totalPages: totalPages as number | undefined,
          hasMore,
        },
      },
      error: null,
    };
  }

  /**
   * Alternative simplified pagination method for basic use cases
   */
  async paginateSimple<Result = InferSelectModel<T>>(
    page: number = 1,
    limit: number = 10,
    filters?: any,
    sorts?: any,
    includeTotal: boolean = true,
  ): Promise<OffsetPaginationResult<Result>> {
    return this.paginate({
      page,
      limit,
      filters,
      sorts,
      includeTotal,
    });
  }

  /**
   * Gets all items (no pagination)
   */
  async getAll(filters?: any, sorts?: any) {
    const query = this.db.select().from(this.table as AnyPgTable);

    if (filters) {
      const whereClause = this.builder.buildWhereClause(filters);
      if (whereClause) {
        query.where(whereClause);
      }
    }

    if (sorts) {
      const orderByClause = this.builder.buildOrderByClause(sorts);
      if (orderByClause) {
        query.orderBy(orderByClause);
      }
    }

    return query;
  }
}
