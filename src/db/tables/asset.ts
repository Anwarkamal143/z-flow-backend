import { generateUlid } from "@/utils";
import { relations } from "drizzle-orm";
import { index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { assetTypeEnum, baseTimestamps } from "../helpers";
import { users } from "./user";

export const assets = pgTable(
  "assets",
  {
    id: text("id").primaryKey().$defaultFn(generateUlid), // Unique asset ID
    name: text("name").notNull(), // Original file name
    type: text("type").notNull(), // MIME type (image/png, video/mp4, etc.)
    resource_type: assetTypeEnum().notNull(), // MIME type (image, video, etc.)
    url: text("url").notNull().unique(), // File storage URL
    thumbnail: text("thumbnail").notNull().unique(), // File storage URL
    size: integer("size").notNull(), // File size in bytes
    width: integer("width"), // File size in bytes
    height: integer("height"), // File size in bytes
    uploadedBy: text("uploadedBy").references(() => users.id, {
      onDelete: "set null",
    }), // Uploader reference

    public_id: text("public_id").notNull(),
    surrogate_key: uuid("surrogate_key").defaultRandom().notNull(),

    ...baseTimestamps, // Includes createdAt & updatedAt
  },
  (table) => [
    // Added indexes for better query performance
    index("assets_uploaded_by_idx").on(table.uploadedBy),
    index("assets_public_id_idx").on(table.public_id),
    index("assets_type_idx").on(table.type),
  ]
);
export const assetsRelations = relations(assets, ({ one }) => ({
  uploadedBy: one(users, {
    fields: [assets.uploadedBy],
    references: [users.id],
  }),
}));
