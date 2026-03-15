import { nodes } from "@/db/tables";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import z from "zod";
import { ULIDSchema } from "./helper";
export const UpdateNodeSchema = createUpdateSchema(nodes);
export const UpdateUserNodeSchema = createUpdateSchema(nodes)
  .omit({ created_at: true, updated_at: true })
  .extend({
    id: ULIDSchema("Provide a valid Id"),
    userId: ULIDSchema("Provide a valid UserId"),
  });

export const InsertNodeSchema = createInsertSchema(nodes);
export const InsertManyNodesSchema = z
  .array(InsertNodeSchema)
  .min(1, { error: "Provide node data" });
export const SelectNodeschema = createSelectSchema(nodes);
export type InsertNode = InferInsertModel<typeof nodes>;
export type INode = InferSelectModel<typeof nodes>;
export type UpdateNode = z.infer<typeof UpdateNodeSchema>;
export type IUpdateUserNode = z.infer<typeof UpdateUserNodeSchema>;
