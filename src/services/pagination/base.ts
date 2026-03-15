import { db as database } from "@/db";
import { InternalServerException } from "@/utils/catch-errors";
import { SQL, sql } from "drizzle-orm";
import { AnyPgTable } from "drizzle-orm/pg-core";
import { QueryBuilder } from "./builder";

export abstract class BasePagination<T extends AnyPgTable> {
  protected builder: QueryBuilder<T>;

  constructor(
    protected db: typeof database,
    protected table: T,
  ) {
    if (!table) {
      throw new InternalServerException(`Provide a table`);
    }
    this.builder = new QueryBuilder(table);
  }

  protected async getTotalCount(whereClause?: SQL): Promise<number> {
    // let query = this.db.select({ count: count() }).from(this.table);
    const total = await this.db.$count(this.table, whereClause || sql`true`);
    return total;
  }
}
