import { executions } from "@/db/tables";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import z from "zod";
export const UpdateExecutionSchema = createUpdateSchema(executions);

export const InsertExecutionSchema = createInsertSchema(executions);
export const SelectExecutionSchema = createSelectSchema(executions);

export type InsertExecution = InferInsertModel<typeof executions>;
export type SelectExecution = InferSelectModel<typeof executions>;
export type UpdateExecution = z.infer<typeof UpdateExecutionSchema>;
