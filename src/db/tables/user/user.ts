import { Role, UserStatus } from "@/db/enumTypes";
import {
  baseTimestamps,
  isActive,
  roleEnum,
  userStatusEnum,
} from "@/db/helpers";
import { generateUlid } from "@/utils";
import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

import { connections } from "../connection";
import { credentials } from "../credentials";
import { nodes } from "../node";
import { workflows } from "../workflow";
import { accounts } from "./account";
import { userAddresses } from "./user-addresses";

/* =========================
   USERS & ADDRESSES
   ========================= */
export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().$defaultFn(generateUlid),
    email: varchar("email", { length: 255 }).notNull().unique(),
    password: varchar("password", { length: 255 }),
    name: varchar("name", { length: 100 }),
    phone: varchar("phone", { length: 20 }),
    image: varchar("image", { length: 500 }),
    email_verified: timestamp("email_verified"),
    polar_customer_id: varchar("polar_customer_id"),
    is_active: isActive,
    role: roleEnum().default(Role.USER),
    status: userStatusEnum().default(UserStatus.ACTIVE),

    last_login: timestamp("last_login"),
    ...baseTimestamps,
  },
  (table) => [
    index("users_email_idx").on(table.email),
    index("users_created_at_idx").on(table.created_at),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  addresses: many(userAddresses, { relationName: "user_addresses" }),
  workflows: many(workflows, { relationName: "user_workflows" }),
  nodes: many(nodes, { relationName: "user_nodes" }),
  connections: many(connections, { relationName: "user_connections" }),
  accounts: many(accounts, { relationName: "user_accounts" }),
  credentials: many(credentials, { relationName: "user_credentials" }),
}));
