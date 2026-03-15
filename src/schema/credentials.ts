import { credentials } from "@/db/tables";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { createSelectSchema, createUpdateSchema } from "drizzle-zod";
import z from "zod";
import { ULIDSchema } from "./helper";
export const UpdateCredentialsSchema = createUpdateSchema(credentials);

// export const InsertCredentialsSchema = createInsertSchema(credentials);
export const SelectCredentialsschema = createSelectSchema(credentials);
export const SelectCredentialsOutputschema = createSelectSchema(
  credentials,
).extend({
  value: z.string(),
});
export const InsertCredentialsSchema = SelectCredentialsschema.pick({
  type: true,
  name: true,
  userId: true,
}).extend({
  value: z.string(),
  metadata: z.record(z.any(), z.unknown()).optional(),
});
export const InsertManycredentialssSchema = z
  .array(InsertCredentialsSchema)
  .min(1, { error: "Provide credentials data" });
export const UpdateCredentialSchema = InsertCredentialsSchema.extend({
  value: z.string().optional(),
  type: InsertCredentialsSchema.shape.type.optional(),
  name: InsertCredentialsSchema.shape.name.optional(),
  userId: InsertCredentialsSchema.shape.userId.optional(),
  metadata: z.record(z.any(), z.unknown()).optional(),
  id: ULIDSchema("Provide a valid Id"),
});
export type ICreateCredential = z.infer<typeof InsertCredentialsSchema>;
export type IUpdateCredential = z.infer<typeof UpdateCredentialSchema>;
export type InsertCredentials = InferInsertModel<typeof credentials>;
export type IUpdateCredentials = z.infer<typeof UpdateCredentialsSchema>;
export type ICredentials = InferSelectModel<typeof credentials>;
export type UpdateCredentials = z.infer<typeof UpdateCredentialsSchema>;
export type ISelectSchema = z.infer<typeof SelectCredentialsschema>;
export type ICredentialsOutPut = z.infer<typeof SelectCredentialsOutputschema>;
