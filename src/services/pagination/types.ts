import AppError from "@/utils/app-error";
import { InferSelectModel } from "drizzle-orm";
import { AnyPgTable, PgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";

export type Table = AnyPgTable;
export type IPaginationType = "cursor" | "offset";
// Base types
export type Column = PgColumn;
export type SortDirection = "asc" | "desc";
type ITableSelectType = InferSelectModel<Table>;
// Filter operators
export type FilterOperator =
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "like"
  | "ilike"
  | "in"
  | "notIn"
  | "isNull"
  | "isNotNull"
  | "between"
  | "notBetween";

export interface FilterCondition<T extends ITableSelectType> {
  column: keyof T;
  operator: FilterOperator;
  value: any;
}

export interface SortConfig<T extends ITableSelectType> {
  column: keyof T;
  direction: SortDirection;
  nulls?: "first" | "last";
}

export interface SearchConfig<T extends ITableSelectType> {
  columns: Array<keyof T>;
  term: string;
  mode?: "any" | "all" | "phrase";
}

// Pagination base config
export interface BasePaginationConfig<T extends ITableSelectType> {
  filters?: FilterCondition<T>[];
  search?: SearchConfig<T>;
  sorts?: SortConfig<T>[];
  includeTotal?: boolean;
}

// Offset pagination config
export interface OffsetPaginationConfig<
  T extends ITableSelectType,
> extends BasePaginationConfig<T> {
  page: number;
  limit?: number | null;
}

// Cursor pagination config
export interface CursorPaginationConfig<
  T extends ITableSelectType,
> extends BasePaginationConfig<T> {
  cursor?: string | null;
  limit?: number | null;
  cursorColumn: keyof T;
  cursorDirection?: "forward" | "backward";
}
export type PaginationsConfig<T extends ITableSelectType> =
  BasePaginationConfig<T> &
    (
      | (CursorPaginationConfig<T> & { mode: "cursor" })
      | (OffsetPaginationConfig<T> & { mode: "offset" })
    );
export type IPaginationMeta = {
  isFirst?: boolean;
  isLast?: boolean;
  current?: number | string;
  next?: number | string;
  previous?: number | string | null;
  totalRecords?: number;
  totalPages?: number;
  limit?: number;
  direction?: "forward" | "backward";
  hasMore?: boolean;
};

// Pagination results
export type PaginationResultDataType<T> = {
  items: T[];
  pagination_meta: IPaginationMeta;
};
export type OffsetPaginationResult<T> =
  | { data: PaginationResultDataType<T>; error: null }
  | { data: null; error: AppError };
export type CursorPaginationResult<T> =
  | { data: PaginationResultDataType<T>; error: null }
  | { data: null; error: AppError };

// Zod schemas for validation
export const sortConfigSchema = z.object({
  column: z.string(),
  direction: z.enum(["asc", "desc"]),
  nulls: z.enum(["first", "last"]).optional(),
});

export const filterConditionSchema = z.object({
  column: z.string(),
  operator: z.enum([
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "like",
    "ilike",
    "in",
    "notIn",
    "isNull",
    "isNotNull",
    "between",
    "notBetween",
  ]),
  value: z.any(),
});

export const searchConfigSchema = z.object({
  columns: z.array(z.string()),
  term: z.string(),
  mode: z.enum(["any", "all", "phrase"]).optional(),
});

export const offsetPaginationConfigSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).nullable().optional().default(20),
  filters: z.array(filterConditionSchema).optional(),
  search: searchConfigSchema.optional(),
  sorts: z.array(sortConfigSchema).optional(),
  includeTotal: z.boolean().optional(),
});

export const cursorPaginationConfigSchema = z.object({
  cursor: z.string().nullable().optional(),
  limit: z.number().int().positive().max(100).nullable().optional().default(20),
  cursorColumn: z.string(),
  cursorDirection: z.enum(["forward", "backward"]).default("forward"),
  filters: z.array(filterConditionSchema).optional(),
  search: searchConfigSchema.optional(),
  sorts: z.array(sortConfigSchema).optional(),
  includeTotal: z.boolean().optional(),
});
