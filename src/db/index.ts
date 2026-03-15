import { APP_CONFIG } from "@/config/app.config";

import { drizzle } from "drizzle-orm/postgres-js";

import postgres from "postgres";

// import { toUTC } from '@/utils/date-time';
// import { logger } from '@/utils/logger';
import { sql } from "drizzle-orm";
import * as schema from "./schema";
export * from "drizzle-orm";
export { PgColumn } from "drizzle-orm/pg-core";
export * from "./enumTypes";
export const client = postgres(APP_CONFIG.DB_URL);
export const db = drizzle(client, {
  schema,
});
export const connectDB = async () => {
  try {
    // Simple query to test connection
    await db.execute(sql`SELECT NOW()`);
    // logger.info(
    //   'DB connected successfully: ' + toUTC(result?.[0]?.now as Date)
    // );
  } catch (error) {
    // logger.error('DB connection failed: ' + toUTC(new Date()));
  }
};
export const closeDbConnection = async () => {
  try {
    await client.end();
    // logger.warn('Closing DB connection: ' + toUTC(new Date()));
  } catch (error) {
    // logger.warn('Error on closing DB connection: ' + toUTC(new Date()));
  }
};
