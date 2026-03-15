import { logger } from "@/config/logger";
import {
  InferSelectModel,
  SQL,
  and,
  asc,
  between,
  desc,
  eq,
  getTableColumns,
  gt,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  like,
  lt,
  lte,
  notBetween,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { PgColumn, PgTable } from "drizzle-orm/pg-core";
import { FilterCondition, SearchConfig, SortConfig } from "./types";
export class QueryBuilder<T extends PgTable> {
  constructor(private table: T) {}

  buildWhereClause(
    filters?: FilterCondition<InferSelectModel<T>>[],
    search?: SearchConfig<InferSelectModel<T>>,
  ): SQL | undefined {
    const conditions: SQL[] = [];
    try {
      // Add filter conditions
      if (filters?.length) {
        filters.forEach((filter) => {
          const column = this.table[filter.column as string] as PgColumn;
          if (!column) return;

          const condition = this.buildFilterCondition(column, filter);
          if (condition) {
            conditions.push(condition);
          }
        });
      }

      // Add search conditions
      if (search?.term && search.columns.length) {
        const searchConditions = search.columns
          .map((col) => {
            const column = this.table[col as string] as PgColumn;
            if (!column) return null;

            const searchTerm =
              search.mode == "phrase"
                ? `%${search.term}%`
                : search.term.split(" ").map((term) => `%${term}%`);

            if (search.mode == "phrase") {
              return ilike(column, searchTerm as string);
            } else {
              const termConditions = Array.isArray(searchTerm)
                ? searchTerm.map((term) => ilike(column, term))
                : [ilike(column, searchTerm)];
              const result =
                search.mode == "all"
                  ? and(...termConditions)
                  : or(...termConditions);
              return result != null ? result : null;
            }
          })
          .filter((x): x is SQL => x != null) as SQL[];
        // .filter(Boolean) as SQL[];

        if (searchConditions && searchConditions.length) {
          conditions.push(or(...searchConditions) as unknown as SQL);
        }
      }

      return conditions.length ? and(...conditions) : undefined;
    } catch (error) {
      console.log(error, "error in building Where clause");
      return undefined;
    }
  }

  private buildFilterCondition(
    column: PgColumn,
    filter: FilterCondition<InferSelectModel<T>>,
  ): SQL | undefined {
    const { operator, value } = filter;

    switch (operator) {
      case "eq":
        return eq(column, value);
      case "neq":
        return sql`${column} != ${value}`;
      case "gt":
        return gt(column, value);
      case "gte":
        return gte(column, value);
      case "lt":
        return lt(column, value);
      case "lte":
        return lte(column, value);
      case "like":
        return like(column, `%${value}%`);
      case "ilike":
        return ilike(column, `%${value}%`);
      case "in":
        return inArray(column, Array.isArray(value) ? value : [value]);
      case "notIn":
        return notInArray(column, Array.isArray(value) ? value : [value]);
      case "isNull":
        return isNull(column);
      case "isNotNull":
        return isNotNull(column);
      case "between":
        return Array.isArray(value) && value.length === 2
          ? between(column, value[0], value[1])
          : undefined;
      case "notBetween":
        return Array.isArray(value) && value.length === 2
          ? notBetween(column, value[0], value[1])
          : undefined;
      default:
        return undefined;
    }
  }

  buildOrderByClause(
    sorts?: SortConfig<InferSelectModel<T>>[],
  ): SQL | undefined {
    if (!sorts?.length) return undefined;
    try {
      return sql.join(
        sorts.map((sort) => {
          const column = this.table[sort.column as string] as PgColumn;
          if (!column) return sql``;

          const direction =
            sort.direction === "desc" ? desc(column) : asc(column);

          if (sort.nulls) {
            return sql`${column} ${sql.raw(
              sort.nulls === "first" ? "NULLS FIRST" : "NULLS LAST",
            )}`;
          }

          return direction;
        }),
        sql`, `,
      );
    } catch (error: any) {
      logger.error(`Error in building Order clause: ` + error.message);
      return undefined;
    }
  }

  validateColumns(columns: string[]): boolean {
    const tableColumns = Object.keys(getTableColumns(this.table));
    return columns.every((col) => tableColumns.includes(col));
  }
}
