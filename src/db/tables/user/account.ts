import { accountTypeEnum, baseTimestamps, isActive } from "@/db/helpers";
import { generateUlid } from "@/utils";
import { relations } from "drizzle-orm";
import { integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./user";

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(generateUlid),
  surrogate_key: uuid("surrogate_key").defaultRandom().notNull(),
  userId: text("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  type: accountTypeEnum().notNull(),
  // type: text("type").$type<AccountType[number]>().notNull(),

  // salt: text("salt"),
  // type: text("type").notNull(),
  provider: text("provider").notNull(),
  provider_account_id: text("provider_account_id"),
  // refresh_token: text('refresh_token'),
  // access_token: text('access_token'),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  is_active: isActive,
  ...baseTimestamps,
});

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));
