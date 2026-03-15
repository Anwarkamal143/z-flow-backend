import { HTTPSTATUS } from "@/config/http.config";
import {
  BadRequestException,
  InternalServerException,
  NotFoundException,
  ValidationException,
} from "@/utils/catch-errors";
import {
  coerceIncludeTotal,
  parseLimit,
  parseIfExistAndString as parseQueryValue,
  validateLimit,
} from "./base.service.helpers";
import {
  CursorPaginationConfig,
  cursorPaginationConfigSchema,
  FilterCondition,
  IPaginationType,
  OffsetPaginationConfig,
  offsetPaginationConfigSchema,
  PaginationsConfig,
  SearchConfig,
  SortConfig,
  SortDirection,
} from "./pagination/types";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { formatZodError, getSingularPlural, stringToNumber } from "@/utils";
import {
  buildPaginationMetaForOffset,
  buildSimplePaginationMetaCursor,
} from "@/utils/api";
import {
  AnyColumn,
  asc,
  desc,
  ExtractTablesWithRelations,
  getTableColumns,
  InferInsertModel,
  InferSelectModel,
  SQL,
  sql,
} from "drizzle-orm";
import {
  AnyPgTable,
  getTableConfig,
  IndexColumn,
  PgTable,
  PgTransaction,
} from "drizzle-orm/pg-core";
import { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";
import { paginateCursor, paginateOffset } from "./pagination";
import { CursorPagination } from "./pagination/cursor";
import { OffsetPagination } from "./pagination/offset";
export type DB = typeof db;
export type DBQuery = keyof (typeof db)["query"];
export type ITransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

export type Table = AnyPgTable;
export type IPaginatedParams =
  | {
      cursor?: number | string | null;
      limit?: number | string | null;
      mode?: "cursor";
      sort?: SortDirection;
    }
  | {
      page?: number | string | null;
      limit?: number | string | null;
      mode?: "offset";
      sort?: SortDirection;
    };

type PaginationOffsetOptions<TTable extends AnyPgTable> = {
  limit?: number | string | null;
  page?: number | string | null;
  where?: (t: TTable) => SQL<unknown> | undefined;
  sort?: SortDirection;
  cursorColumn?: (tableCols: TTable) => AnyColumn;
  search?: string;
  includeTotal?: boolean;
};
type PaginationCursorOptions<TCursorValue, TTable extends AnyPgTable> = {
  limit?: number | null | string;
  cursor?: TCursorValue;
  cursorColumn: (tableCols: TTable) => AnyColumn;
  direction?: "next" | "prev";
  sort?: SortDirection;
  where?: (t: TTable) => SQL<unknown> | undefined;
  search?: string;
  includeTotal?: boolean;
};

type ColumnKey<T> = Extract<keyof T, string>;
/**
 * Build a proxy object where each property access returns its **key name as a string literal**
 */
type KeyProxy<T> = {
  [K in ColumnKey<T>]: K;
};
type ColumnSelector<T> = (fields: KeyProxy<T>) => ColumnKey<T>;
export class BaseService<
  TTable extends AnyPgTable,
  TInsert extends InferInsertModel<TTable> = InferInsertModel<TTable>,
  // TInsert ,
  TSelect extends InferSelectModel<TTable> = InferSelectModel<TTable>,
  TUpdate extends Partial<TInsert> = Partial<TInsert>,
> {
  public readonly columns = getTableColumns(this.table);
  public readonly _types!: {
    PaginatedParams: IPaginatedParams & {
      cursorColumn?: (t: TTable) => AnyColumn;
      where?: (t: TTable) => SQL<unknown> | undefined;
    };
    OffsetPaginationConfig: OffsetPaginationConfig<TSelect>;
    CursorPaginationConfig: CursorPaginationConfig<TSelect>;
    PaginationsConfig: PaginationsConfig<TSelect>;
    column: ColumnKey<TSelect> | ColumnSelector<TSelect>;
  };

  public transaction = db.transaction;
  public _singular!: string;
  public _plural!: string;

  constructor(public table: TTable) {
    if (!table) {
      throw new Error(`Provide a table`);
    }
    const config = getTableConfig(table);
    const names = getSingularPlural(config.name);
    this.singular = names.singular;
    this.plural = names.plural;
    this.queryName = config.name as DBQuery;
  }
  public set singular(name: string) {
    this._singular = name;
  }
  public get singular() {
    return this._singular;
  }
  public set plural(name: string) {
    this._plural = name;
  }
  public get plural() {
    return this._plural;
  }
  queryName: DBQuery;
  queryTable<K extends DBQuery>(
    dbb: DB,
    key: K,
  ): {
    findFirst: (params: {
      where: SQL<unknown> | undefined;
    }) => Promise<TSelect>;
    findMany: (params?: {
      where?: SQL<unknown> | undefined;
    }) => Promise<TSelect[]>;
  } {
    return dbb.query[key] as any; // We need to cast here because of Drizzle's complex types
  }

  getColumnObject() {
    const keys = Object.keys(this.columns) as Array<ColumnKey<TTable>>;
    const obj = {} as Record<ColumnKey<TTable>, ColumnKey<TTable>>;
    keys.forEach((key) => {
      obj[key] = key;
    });
    return obj as KeyProxy<TSelect>;
  }
  getTableColumn(field: ColumnKey<TSelect> | ColumnSelector<TSelect>) {
    const col =
      typeof field == "string" ? field : field(this.getColumnObject());
    return this.columns[col];
  }

  async withTransaction<T>(fn: (tx: ITransaction) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => {
      return fn(tx);
    });
  }
  async create(value: TInsert, tsx?: ITransaction) {
    try {
      const [record] = await (tsx ? tsx : db)
        .insert(this.table)
        .values(value)
        .returning();

      if (!record) {
        return {
          error: new BadRequestException(`${this.singular} not created`),
          data: null,
          status: HTTPSTATUS.BAD_REQUEST,
        };
      }
      return {
        data: record as TSelect,
        status: HTTPSTATUS.CREATED,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  async createMany(values: TInsert[], tsx?: ITransaction) {
    try {
      const records = await (tsx ? tsx : db)
        .insert(this.table)
        .values(values)
        .returning();
      if (records.length == 0) {
        return {
          error: new BadRequestException(`${this.plural} not created`),
          data: null,
          status: HTTPSTATUS.BAD_REQUEST,
        };
      }
      return {
        data: records,
        status: HTTPSTATUS.CREATED,
      };
    } catch (error) {
      console.log(error, "createMany error");
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  async findOne(where: (table: TTable) => SQL<unknown> | undefined) {
    try {
      const record = await this.queryTable(db, this.queryName).findFirst({
        where: where(this.table),
      });

      return {
        data: record,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }
  findOneQuery(where: (table: TTable) => SQL<unknown> | undefined) {
    return db
      .select()
      .from(this.table as PgTable)
      .where(where(this.table));
  }
  findOneSelectQuery() {
    return db.select().from(this.table as PgTable);
  }

  async findMany(where?: (table: TTable) => SQL<unknown> | undefined) {
    try {
      const records = await this.queryTable(db, this.queryName).findMany({
        where: where?.(this.table),
      });
      return {
        data: records,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  async update<T = TUpdate>(
    where: (table: TTable) => SQL<unknown> | undefined,
    values: T,
    tsx?: ITransaction,
  ) {
    try {
      const result = await (tsx ? tsx : db)
        .update(this.table)
        .set(values)
        .where(where(this.table))
        .returning();
      if (result.length == 0) {
        return {
          error: new BadRequestException(`${this.singular} not updated`),
          data: null,
          status: HTTPSTATUS.BAD_REQUEST,
        };
      }
      return {
        data: result,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  async delete(
    where: (table: TTable) => SQL<unknown> | undefined,
    tsx?: ITransaction,
  ) {
    try {
      const result = await (tsx ? tsx : db)
        .delete(this.table)
        .where(where(this.table))
        .returning();
      return {
        data: result,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }
  async exists(
    where: (table: TTable) => SQL<unknown> | undefined,
    tsx?: ITransaction,
  ) {
    try {
      const result = await (tsx ? tsx : db)
        .select()
        .from(this.table as PgTable)
        .where(where(this.table));
      if (!result.length) {
        return { data: null, error: new NotFoundException("No data found") };
      }
      return {
        data: result as TSelect[],
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  /**
   * Upsert: insert or update if conflict
   * Example: pass conflictTarget = ['user_id'], updateValues = { updated_at: new Date() }
   */
  async upsert(
    values: TInsert[],
    conflictTarget: IndexColumn | IndexColumn[],
    updateValues: Partial<TInsert>,
    tsx?: ITransaction,
  ) {
    try {
      const records = await (tsx ? tsx : db)
        .insert(this.table)
        .values(values)
        .onConflictDoUpdate({
          target: conflictTarget,
          set: updateValues,
        })
        .returning();
      if (records.length == 0) {
        return {
          error: new BadRequestException("Operation failed"),
          data: null,
          status: HTTPSTATUS.BAD_REQUEST,
        };
      }
      return {
        data: records,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  /**
   * Soft delete by setting deleted_at timestamp
   * Requires `deleted_at` column in your schema
   */
  async softDelete(
    where: (tableCols: TTable) => SQL<unknown>,
    set: Partial<TTable["$inferInsert"]>,
    tsx?: ITransaction,
  ) {
    try {
      const records = await (tsx ? tsx : db)
        .update(this.table)
        .set(set)
        .where(where(this.table))
        .returning();
      if (records.length == 0) {
        return {
          error: new BadRequestException(`${this.singular} not deleted`),
          data: null,
          status: HTTPSTATUS.BAD_REQUEST,
        };
      }
      return {
        data: records,
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  /**
   * Handles offset-based pagination.
   */
  async paginateOffset(options: PaginationOffsetOptions<TTable>) {
    const {
      limit,
      where,
      page,
      cursorColumn = (table: any) => table.id as AnyColumn,
      sort = "asc",
      includeTotal,
    } = options;
    // Page starts from 1
    // Convert values
    const limitNum = limit != null ? stringToNumber(limit) : undefined;
    const pageNum = page != null ? stringToNumber(page) : undefined;
    const offset =
      limitNum != undefined && pageNum != undefined
        ? pageNum === 0
          ? 0
          : (pageNum - 1) * limitNum
        : undefined;
    const limitError = limitNum != null ? validateLimit(limitNum) : null;
    if (limitError) {
      return { data: null, error: new BadRequestException(limitError) };
    }

    const cursorCol = cursorColumn(this.table);
    try {
      const limitPlusOne = limitNum != undefined ? limitNum + 1 : undefined;
      const query = db
        .select()
        .from(this.table as AnyPgTable)
        .where(where?.(this.table) ?? sql`true`)
        .orderBy(sort === "asc" ? asc(cursorCol) : desc(cursorCol));
      if (limitPlusOne) {
        query.limit(limitPlusOne);
      }
      if (offset) {
        query.offset(offset);
      }
      const result = await query;

      let total = result.length;
      if (includeTotal) {
        total = await db.$count(this.table, where?.(this.table) || sql`true`);
      }
      const items = limitNum
        ? (result.slice(0, limitNum) as TSelect[])
        : result;
      const hasMore = limitNum ? result.length > limitNum : false;

      return {
        data: items as TSelect[],
        pagination_meta: buildPaginationMetaForOffset({
          limit: limitNum,
          total,
          page: pageNum,
          hasMore,
        }),
        status: HTTPSTATUS.OK,
      };
    } catch (err) {
      console.error("Offset pagination error:", err);
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  /**
   * Handles cursor-based pagination.
   */
  async paginateCursor<TCursorValue = unknown>(
    options: PaginationCursorOptions<TCursorValue, TTable>,
  ) {
    const {
      limit,
      cursor,
      cursorColumn = (table: any) => table.id as AnyColumn,
      direction = "next",
      sort = "asc",
      where,
      includeTotal,
    } = options;
    const limitNum = limit != null ? stringToNumber(limit) : undefined;
    const limitError = limitNum != null ? validateLimit(limitNum) : null;
    if (limitError) {
      return { data: null, error: new BadRequestException(limitError) };
    }
    const cursorCol = cursorColumn(this.table);
    const isAsc = sort === "asc";
    const limitPlusOne = limitNum != null ? limitNum + 1 : undefined;
    try {
      const comparator = cursor
        ? direction === "next"
          ? isAsc
            ? sql`${cursorCol} > ${sql.param(cursor)}`
            : sql`${cursorCol} < ${sql.param(cursor)}`
          : isAsc
            ? sql`${cursorCol} < ${sql.param(cursor)}`
            : sql`${cursorCol} > ${sql.param(cursor)}`
        : undefined;

      const whereCondition =
        where && comparator
          ? sql`${comparator} AND ${where(this.table)}`
          : comparator || where?.(this.table);

      const query = db
        .select()
        .from(this.table as AnyPgTable)
        .where(whereCondition ?? sql`true`)
        .orderBy(sort === "asc" ? asc(cursorCol) : desc(cursorCol));

      if (limitPlusOne != null) {
        query.limit(limitPlusOne);
      }
      const result = await query;
      let total = result.length;
      if (includeTotal) {
        total = await db.$count(this.table, where?.(this.table) || sql`true`);
      }
      const items = limitNum
        ? (result.slice(0, limitNum) as TSelect[])
        : result;
      const hasMore = limitNum ? result.length > limitNum : false;
      return {
        data: items as TSelect[],
        pagination_meta: {
          ...buildSimplePaginationMetaCursor({
            items,
            limit: limitNum,
            total,
            cursor: cursor as string,
            hasMore,
            columnName: cursorCol?.name,
          }),
          direction,
        },
        status: HTTPSTATUS.OK,
      };
    } catch (error) {
      return {
        data: null,
        error: new InternalServerException(),
      };
    }
  }

  async paginationOffsetRecords(props: OffsetPaginationConfig<TSelect>) {
    const parseResult = this.validateOffsetPagination(props);
    if (parseResult.error) {
      return parseResult;
    }
    const result = await paginateOffset(db, this.table, parseResult.data);
    return result;
  }
  async paginationCursorRecords(props: CursorPaginationConfig<TSelect>) {
    const parseResult = this.validateCursorPagination(props);
    if (parseResult.error) {
      return parseResult;
    }
    const result = await paginateCursor(db, this.table, parseResult.data);

    return result;
  }

  validateQuery(
    p: typeof this._types.PaginationsConfig,
    defaults: {
      search?: keyof TSelect;
      sort?: {
        column: keyof TSelect;
        direction?: "asc" | "desc";
      };
      filters?: (table: TTable) => FilterCondition<TSelect>[];
    } = { sort: { column: "updated_at", direction: "desc" } },
  ) {
    const { search, limit, filters, sorts, includeTotal, mode } = p;
    const totalInclude = coerceIncludeTotal(includeTotal);
    const defaultSort = defaults.sort || {
      column: "updated_at",
      direction: "desc",
    };
    const limitNum = parseLimit(limit);
    if (mode == "offset") {
      const { page } = p;

      return {
        page: stringToNumber(page) || 1,
        limit: limitNum,
        filters: this.preValidateFilterColumns(
          filters,
          defaults?.filters?.(this.table),
        ),
        search: this.preValidateSearchColumns(search, defaults.search),
        sorts: this.preValidateSortColumns(sorts, defaultSort),
        includeTotal: totalInclude,
        mode: "offset" as IPaginationType,
      } as typeof this._types.PaginationsConfig;
    }

    const { cursorColumn, cursor } = p;

    return {
      cursor: (cursor as string) || null,
      limit: limitNum,
      cursorColumn: (cursorColumn || "id") as keyof TSelect,
      filters: this.preValidateFilterColumns(
        filters,
        defaults.filters?.(this.table),
      ),
      search: this.preValidateSearchColumns(search, defaults.search),
      sorts: this.preValidateSortColumns(sorts, defaults.sort),
      includeTotal: totalInclude,
      mode: "cursor" as IPaginationType,
    } as typeof this._types.PaginationsConfig;
  }
  prePareQueryMeta(
    p: typeof this._types.PaginationsConfig,
    defaults: {
      search?: keyof TSelect;
      sort?: {
        column: keyof TSelect;
        direction?: "asc" | "desc";
      };
      filters?: (table: TTable) => FilterCondition<TSelect>[];
    } = { sort: { column: "updated_at", direction: "desc" } },
  ) {
    const query = this.validateQuery(p, defaults);
    const mode = query.mode;

    if (mode == "offset") {
      const offsetPagination = new OffsetPagination(db, this.table);
      const parseResult = this.validateOffsetPagination(query);
      if (parseResult.error) {
        return parseResult;
      }
      return offsetPagination.prepareOffsetQueryMeta(parseResult.data);
    }

    const paginationCursorMeta = new CursorPagination(db, this.table);
    const parseResult = this.validateCursorPagination(query);
    if (parseResult.error) {
      return parseResult;
    }
    return paginationCursorMeta.prepareCursorQueryMeta(parseResult.data);
  }

  validateCursorPagination(props: CursorPaginationConfig<TSelect>) {
    const includeTotal = coerceIncludeTotal(props.includeTotal);
    const limit = parseLimit(props.limit);
    const config = cursorPaginationConfigSchema.safeParse({
      cursor: (props.cursor as string) || null,
      limit,
      cursorColumn: (props.cursorColumn || "id") as keyof TSelect,
      cursorDirection: (props.cursorDirection as string) || "forward",
      filters: this.validateFilterColumns(props.filters),
      search: this.validateSearchColumns(props.search),
      sorts: this.validateSortColumns(props.sorts),
      includeTotal,
    });
    if (!config.success) {
      return {
        error: new ValidationException(
          "Pagination Invalid params",
          formatZodError(config.error),
        ),
        data: null,
      };
    }
    return {
      data: { ...config.data, mode: "cursor" as IPaginationType },
      error: null,
    };
  }
  validateOffsetPagination(params: OffsetPaginationConfig<TSelect>) {
    const includeTotal = coerceIncludeTotal(params.includeTotal);
    const limit = parseLimit(params.limit);
    const config = offsetPaginationConfigSchema.safeParse({
      page: stringToNumber(params.page) || 1,
      limit,
      filters: this.validateFilterColumns(params.filters),
      search: this.validateSearchColumns(params.search),
      sorts: this.validateSortColumns(params.sorts),
      includeTotal,
    });
    if (!config.success) {
      return {
        error: new ValidationException(
          "Pagination Invalid params",
          formatZodError(config.error),
        ),
        data: null,
      };
    }
    return {
      data: { ...config.data, mode: "offset" as IPaginationType },
      error: null,
    };
  }
  validateFilterColumns(
    filters: FilterCondition<TSelect>[] | string | undefined,
  ) {
    const parsedResult = parseQueryValue(filters) as
      | FilterCondition<TSelect>[]
      | undefined;
    if (parsedResult == null) {
      return undefined;
    }
    if (typeof parsedResult == "string") {
      return undefined;
    }
    if (!parsedResult.length) {
      return undefined;
    }
    const tableColumns = Object.keys(this.columns);

    return parsedResult?.filter((col) =>
      tableColumns.includes(col.column as string),
    );
  }
  validateSortColumns(sort: SortConfig<TSelect>[] | string | undefined) {
    const parsedResult = parseQueryValue(sort) as
      | SortConfig<TSelect>[]
      | undefined;
    if (parsedResult == null) {
      return undefined;
    }
    if (typeof parsedResult == "string") {
      return undefined;
    }
    if (!parsedResult.length) {
      return undefined;
    }
    const tableColumns = Object.keys(this.columns);

    return parsedResult?.filter((col) =>
      tableColumns.includes(col.column as string),
    );
  }
  validateSearchColumns(search: SearchConfig<TSelect> | string | undefined) {
    const parsed = parseQueryValue(search) as
      | Partial<SearchConfig<TSelect>>
      | undefined
      | string;
    if (parsed == null || typeof parsed === "string") {
      return undefined;
    }
    if ((parsed.term ?? "").trim() === "") {
      return undefined;
    }
    if (!parsed.columns?.length) {
      return undefined;
    }
    const tableColumns = Object.keys(this.columns);
    return {
      ...parsed,
      columns: parsed.columns.filter((col) =>
        tableColumns.includes(String(col)),
      ),
    } as SearchConfig<TSelect>;
  }
  preValidateFilterColumns(
    filters: FilterCondition<TSelect>[] | string | undefined,
    defaultfilters: FilterCondition<TSelect>[] | undefined = [],
  ) {
    const parsedResult = parseQueryValue(filters) as
      | FilterCondition<TSelect>[]
      | undefined;
    if (parsedResult == null) {
      if (defaultfilters.length > 0) {
        return defaultfilters;
      }
      return undefined;
    }
    if (typeof parsedResult == "string") {
      if (defaultfilters.length > 0) {
        return defaultfilters;
      }
      return undefined;
    }
    if (!parsedResult.length) {
      if (defaultfilters.length > 0) {
        return defaultfilters;
      }
      return undefined;
    }
    const tableColumns = Object.keys(getTableColumns(this.table));
    const newResultedArray =
      defaultfilters.length > 0
        ? [...defaultfilters, ...parsedResult]
        : parsedResult;
    return newResultedArray?.filter((col) =>
      tableColumns.includes(col.column as string),
    );
  }
  preValidateSortColumns(
    sort: SortConfig<TSelect>[] | string | undefined,
    defaultColumn?: {
      column: keyof TSelect;
      direction?: "asc" | "desc";
    },
  ) {
    const parsedResult = parseQueryValue(sort) as
      | SortConfig<TSelect>[]
      | undefined;
    if (parsedResult == null) {
      if (defaultColumn?.column) {
        return [
          {
            column: defaultColumn.column ? defaultColumn.column : undefined,
            direction: defaultColumn.direction || "desc",
          },
        ] as SortConfig<TSelect>[];
      }
      return undefined;
    }
    if (typeof parsedResult == "string") {
      if (["asc", "desc"].includes(parsedResult)) {
        return [
          {
            column: defaultColumn?.column ? defaultColumn.column : undefined,
            direction: parsedResult,
          },
        ] as SortConfig<TSelect>[];
      }

      return undefined;
    }
    if (!parsedResult.length) {
      return undefined;
    }
    const tableColumns = Object.keys(this.columns);

    return parsedResult?.filter((col) =>
      tableColumns.includes(col.column as string),
    );
  }
  preValidateSearchColumns(
    search: SearchConfig<TSelect> | string | undefined,
    defaultColumn?: keyof TSelect,
  ) {
    const parsed = parseQueryValue(search) as
      | Partial<SearchConfig<TSelect>>
      | undefined
      | string;
    if (parsed == null) {
      return undefined;
    }
    if (typeof parsed === "string") {
      return defaultColumn
        ? ({ columns: [defaultColumn], term: parsed } as SearchConfig<TSelect>)
        : undefined;
    }
    if ((parsed.term ?? "").trim() === "") {
      return undefined;
    }
    if (!parsed.columns?.length && defaultColumn) {
      parsed.columns = [defaultColumn];
    }
    const tableColumns = Object.keys(this.columns);
    return {
      ...parsed,
      columns: (parsed.columns ?? []).filter((col) =>
        tableColumns.includes(String(col)),
      ),
    } as SearchConfig<TSelect>;
  }
  /** Parse query value (object, JSON string, or primitive). Delegates to shared helper. */
  parseIfExistAndString(value: unknown): unknown {
    return parseQueryValue(value);
  }
}
