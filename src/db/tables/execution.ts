import { generateJti, generateUlid } from "@/utils";
import { relations } from "drizzle-orm";
import { jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { ExecutionStatusType, IExecutionStatusType } from "../enumTypes";
import { baseTimestamps, executionsStatusEnum } from "../helpers";
import { users } from "./user";
import { workflows } from "./workflow";

export const executions = pgTable(
  "executions",
  {
    id: text("id").primaryKey().$defaultFn(generateUlid), // Unique asset ID
    name: text("name"), // Original file name
    userId: text("userId")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    secret: text("secret").$defaultFn(generateJti), // Original file name
    started_at: timestamp("started_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    completed_at: timestamp("completed_at", { withTimezone: true }),
    inngest_event_id: text("inngest_event_id").unique().notNull(),
    output: jsonb(),
    workflowId: text("workflowId").references(() => workflows.id, {
      onDelete: "cascade",
    }),
    status: executionsStatusEnum()
      .notNull()
      .$type<IExecutionStatusType>()
      .default(ExecutionStatusType.RUNNING),
    error: text("error"),
    error_stack: text("error_stack"),
    ...baseTimestamps,
  },
  (table) => [
    unique("execution_workflowId_startedAt_unique").on(
      table.workflowId,
      table.started_at,
    ),
  ],
);

export const executionsRelations = relations(executions, ({ one }) => ({
  workflow: one(workflows, {
    fields: [executions.workflowId],
    references: [workflows.id],
  }),
}));
