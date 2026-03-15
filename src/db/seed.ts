import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { AccountType, eq, Provider, Role, UserStatus } from ".";

import { hashValue } from "@/utils/bcrypt";
import { accounts, users } from "./schema";
import * as schema from "./tables";

export async function seedDatabase(
  db: PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql<{}>;
  }
) {
  try {
    console.log("Seeding database...");
    // const hashedPassword = await createHash("T#9xLp!eW2@Zv8Rm$Q1g");
    const hashedPassword = await hashValue("Test@123");

    const email = "super_admin@e-shop.com";
    await db.transaction(async (txs) => {
      const isExist = await txs.query.users.findFirst({
        where(fields) {
          return eq(fields.email, email);
        },
      });
      if (!isExist) {
        const [resp] = await txs
          .insert(users)
          .values({
            email,
            name: "super admin",
            role: Role.SUPER_ADMIN,
            password: hashedPassword,
            email_verified: new Date(),
            status: UserStatus.ACTIVE,
          })
          .returning();
        if (resp?.id) {
          await txs
            .insert(accounts)
            .values({
              userId: resp.id,
              type: AccountType.email,
              provider: Provider.email,
            })
            .returning();
        }
      }
    });
    console.log("✅ Database seeded successfully!");

    return await Promise.resolve();
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error; // Re-throw to be caught by migration script
  }
}
