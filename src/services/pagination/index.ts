import { db as Db } from "@/db";
import { InferSelectModel } from "drizzle-orm";
import { AnyPgTable, PgTable } from "drizzle-orm/pg-core";
import { CursorPagination } from "./cursor";
import { OffsetPagination } from "./offset";
import {
  CursorPaginationConfig,
  CursorPaginationResult,
  FilterCondition,
  FilterOperator,
  OffsetPaginationConfig,
  OffsetPaginationResult,
  SearchConfig,
  SortConfig,
  SortDirection,
} from "./types";
type DBType = typeof Db;
export class PaginationFactory {
  static createOffsetPagination<T extends AnyPgTable>(db: DBType, table: T) {
    return new OffsetPagination(db, table);
  }

  static createCursorPagination<T extends PgTable>(db: DBType, table: T) {
    return new CursorPagination(db, table);
  }
}

// Helper functions for common pagination patterns
export async function paginateOffset<
  T extends PgTable,
  Result = InferSelectModel<T>,
>(
  db: DBType,
  table: T,
  config: OffsetPaginationConfig<InferSelectModel<T>>,
): Promise<OffsetPaginationResult<Result>> {
  const pagination = PaginationFactory.createOffsetPagination(db, table);
  return pagination.paginate<Result>(config);
}

export async function paginateCursor<
  T extends PgTable,
  Result = InferSelectModel<T>,
>(
  db: DBType,
  table: T,
  config: CursorPaginationConfig<InferSelectModel<T>>,
): Promise<CursorPaginationResult<Result>> {
  const pagination = PaginationFactory.createCursorPagination(db, table);
  return pagination.paginate<Result>(config);
}

// Type exports
export type {
  CursorPaginationConfig,
  CursorPaginationResult,
  FilterCondition,
  FilterOperator,
  OffsetPaginationConfig,
  OffsetPaginationResult,
  SearchConfig,
  SortConfig,
  SortDirection,
};
