import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

import { APP_CONFIG } from "@/config/app.config";
// import { logger } from '@/utils/logger';
import { seedDatabase } from "./seed";
import * as schema from "./tables";

const migrationClient = postgres(APP_CONFIG.DB_URL, { max: 1 });
const migrationDb = drizzle(migrationClient, { schema });
export const runMigrations = async () => {
  try {
    console.info("🚀 Starting database migrations...");
    // console.log(process.cwd());
    await migrate(migrationDb, { migrationsFolder: "migrations" });
    console.info("✅ Database migrations completed");

    console.info("🌱 Starting database seeding...");
    await seedDatabase(migrationDb);
    // await migrationClient.end();
    console.info("🔌 Migration client disconnected");
    console.info("🎉 Database seeding completed");
  } catch (error: any) {
    // logger.error('❌ Migration/seed failed', error);
    process.exit(1);
  } finally {
    migrationClient.end().catch(() => {});
    // process.exit(0);
  }
};

runMigrations();
