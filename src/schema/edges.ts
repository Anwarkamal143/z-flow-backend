import { connections } from "@/db/tables";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import z from "zod";
export const UpdateEdgeSchema = createUpdateSchema(connections);

export const InsertEdgeSchema = createInsertSchema(connections);
export const InsertManyEdgeSchema = z
  .array(InsertEdgeSchema)
  .min(1, { error: "Provide edge data" });

export const SelectEdgeSchema = createSelectSchema(connections);
export type InsertEdge = InferInsertModel<typeof connections>;
export type IEdge = InferSelectModel<typeof connections>;
export type UpdateEdge = z.infer<typeof UpdateEdgeSchema>;

export const UpdateWorkflowEdgeSchema = z.object({
  source: UpdateEdgeSchema.shape.fromNodeId.nonoptional(),
  target: UpdateEdgeSchema.shape.toNodeId.nonoptional(),
  sourceHandle: UpdateEdgeSchema.shape.fromOutput,
  targetHandle: UpdateEdgeSchema.shape.toInput,
});
export type IOutputEdge = Omit<
  InferSelectModel<typeof connections>,
  "fromNodeId" | "toNodeId" | "fromOutput" | "toInput"
> & {
  source: IEdge["fromNodeId"];
  target: IEdge["toNodeId"];
  sourceHandle: IEdge["fromOutput"];
  targetHandle: IEdge["toInput"];
};
export type IInputEdge = IOutputEdge;
