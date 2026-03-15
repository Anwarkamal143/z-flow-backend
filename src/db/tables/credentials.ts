import { baseTimestamps, credentialsTypeEnum } from "@/db/helpers";
import { generateUlid } from "@/utils";
import { relations } from "drizzle-orm";
import { integer, jsonb, pgTable, text } from "drizzle-orm/pg-core";
import { nodes, users } from ".";
import { ICredentialType } from "../enumTypes";

export const credentials = pgTable("credentials", {
  id: text("id").primaryKey().$defaultFn(generateUlid),

  userId: text("userId").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: credentialsTypeEnum().notNull().$type<ICredentialType>(),
  /**
   * Optional metadata (provider, label, masked value, etc.)
   * ❌ NEVER store secrets here
   */
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),

  /* ---------- Encrypted User Secret (with DEK) ---------- */

  secretCiphertext: text("secret_ciphertext").notNull(),
  secretIv: text("secret_iv").notNull(),
  secretAuthTag: text("secret_auth_tag").notNull(),

  /* ---------- Encrypted DEK (with KEK) ---------- */

  dekCiphertext: text("dek_ciphertext").notNull(),
  dekIv: text("dek_iv").notNull(),
  dekAuthTag: text("dek_auth_tag").notNull(),
  dekSalt: text("dek_salt").notNull(),

  /**
   * Allows future master-key rotation
   */
  keyVersion: integer("key_version").notNull().default(1),

  ...baseTimestamps,
});

export const credentialsRelations = relations(credentials, ({ one, many }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id],
  }),

  nodes: many(nodes, {
    relationName: "credentail_nodes",
  }),
}));
