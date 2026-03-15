import { db } from "@/db";
import { UnionIfBPresent } from "@/types/api";
import { stringToNumber } from "@/utils";
import { getTableColumns } from "drizzle-orm";
import { PgTable } from "drizzle-orm/pg-core";
import { paginateCursor, paginateOffset } from ".";
import { IPaginationModes } from "../base.service";
import {
  CursorPaginationConfig,
  cursorPaginationConfigSchema,
  OffsetPaginationConfig,
  offsetPaginationConfigSchema,
  PaginationsConfig,
} from "./types";

export class PaginationQuries<TTable extends PgTable> {
  constructor(protected table: TTable) {}

  async paginationOffsetRecords(props: OffsetPaginationConfig<TTable>) {
    const parseResult = this.validateOffsetPagination(props);
    const result = await paginateOffset(db, this.table, parseResult);

    return result;
  }
  async paginationCursorRecords(props: CursorPaginationConfig<TTable>) {
    const parseResult = this.validateCursorPagination(props);

    const result = await paginateCursor(db, this.table, parseResult);

    return result;
  }

  validatePagination<T = any>(
    props: PaginationsConfig<UnionIfBPresent<TTable, T>>
  ): PaginationsConfig<UnionIfBPresent<TTable, T>> {
    if (props.mode == "cursor") {
      return this.validateCursorPagination(props) as PaginationsConfig<
        UnionIfBPresent<TTable, T>
      > & {
        mode: "cursor";
      };
    }
    return this.validateOffsetPagination(
      props as OffsetPaginationConfig<TTable>
    ) as PaginationsConfig<UnionIfBPresent<TTable, T>> & {
      mode: "offset";
    };
  }
  validateOffsetPagination(params: OffsetPaginationConfig<TTable>) {
    if (params.includeTotal) {
      params.includeTotal =
        typeof params.includeTotal == "string"
          ? params.includeTotal == "true"
          : params.includeTotal;
    }
    const config = offsetPaginationConfigSchema.parse({
      page: stringToNumber(params.page) || 1,
      limit: stringToNumber(params.limit),
      filters: this.validateFilterColumnsColumns(
        this.parseIfExistAndString(params.filters)
      ),
      search: this.validateSearchColumnsColumns(
        this.parseIfExistAndString(params.search)
      ),
      sorts: this.validateFilterColumnsColumns(
        this.parseIfExistAndString(params.sorts)
      ),
      includeTotal: params.includeTotal,
    });

    return { ...config, mode: "offset" as IPaginationModes };
  }
  validateCursorPagination(props: CursorPaginationConfig<TTable>) {
    console.log(props, "validateCursorPagination", typeof props.includeTotal);
    if (props.includeTotal) {
      props.includeTotal =
        typeof props.includeTotal == "string"
          ? props.includeTotal == "true"
          : props.includeTotal;
    }
    const config = cursorPaginationConfigSchema.parse({
      cursor: (props.cursor as string) || null,
      limit: stringToNumber(props.limit),
      cursorColumn: (props.cursorColumn ||
        "id") as keyof TTable["$inferSelect"],
      cursorDirection: (props.cursorDirection as string) || "forward",
      filters: this.validateFilterColumnsColumns(
        this.parseIfExistAndString(props.filters)
      ),
      search: this.validateSearchColumnsColumns(
        this.parseIfExistAndString(props.search)
      ),
      sorts: this.validateFilterColumnsColumns(
        this.parseIfExistAndString(props.sorts)
      ),
      includeTotal: props.includeTotal,
    });
    return { ...config, mode: "cursor" };
  }
  validateFilterColumnsColumns<T extends { column: string }>(
    columns?: T[]
  ): T[] | undefined {
    if (columns == null) {
      return undefined;
    }
    const tableColumns = Object.keys(getTableColumns(this.table));

    return columns?.filter((col) => tableColumns.includes(col.column));
  }
  validateSearchColumnsColumns<T extends { columns: string[] }>(
    search?: T
  ): T | undefined {
    if (search == null || !search?.columns?.length) {
      return undefined;
    }
    const tableColumns = Object.keys(getTableColumns(this.table));

    return {
      ...search,
      columns: search?.columns?.filter((col) => tableColumns.includes(col)),
    };
  }
  parseIfExistAndString(value: any) {
    if (value == null) {
      return undefined;
    }
    if (typeof value == "object") {
      return value;
    }
    if (typeof value == "string" && value.trim() == "") {
      return undefined;
    }

    return JSON.parse(value);
  }
}
