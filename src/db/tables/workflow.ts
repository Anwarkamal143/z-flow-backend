import { generateJti, generateUlid } from "@/utils";
import { relations } from "drizzle-orm";
import { pgTable, text } from "drizzle-orm/pg-core";
import { baseTimestamps } from "../helpers";
import { connections } from "./connection";
import { credentials } from "./credentials";
import { executions } from "./execution";
import { nodes } from "./node";
import { users } from "./user";

export const workflows = pgTable("workflows", {
  id: text("id").primaryKey().$defaultFn(generateUlid), // Unique asset ID
  name: text("name").notNull(), // Original file name
  userId: text("userId")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  secret: text("secret").$defaultFn(generateJti), // Original file name

  ...baseTimestamps,
});

export const workflowRelations = relations(workflows, ({ one, many }) => ({
  user: one(users, {
    fields: [workflows.userId],
    references: [users.id],
  }),
  nodes: many(nodes, {
    relationName: "workflow_nodes",
  }),
  connections: many(connections, {
    relationName: "workflow_connections",
  }),
  credentials: many(credentials, {
    relationName: "workflow_credentials",
  }),
  executions: many(executions, {
    relationName: "workflow_executions",
  }),
}));
