import { assets } from "@/db/tables";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import z from "zod";
export const UpdateAssetSchema = createUpdateSchema(assets);

export const InsertAssetSchema = createInsertSchema(assets);
export const SelectAssetschema = createSelectSchema(assets);
export type InsertAsset = InferInsertModel<typeof assets>;
export type IAsset = InferSelectModel<typeof assets>;
export type UpdateAsset = z.infer<typeof UpdateAssetSchema>;
