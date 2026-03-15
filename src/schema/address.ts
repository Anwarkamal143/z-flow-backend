import { userAddresses } from "@/db/tables";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import z from "zod";
export const UpdateAddressSchema = createUpdateSchema(userAddresses);

export const InsertAddressSchema = createInsertSchema(userAddresses);
export const SelectAddressSchema = createSelectSchema(userAddresses);

export type InsertAddress = InferInsertModel<typeof userAddresses>;
export type SelectAddress = InferSelectModel<typeof userAddresses>;
export type UpdateAddress = z.infer<typeof UpdateAddressSchema>;
