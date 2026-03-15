import { UserAddressType } from "@/db/enumTypes";
import { addressTypeEnum, baseTimestamps } from "@/db/helpers";
import { generateUlid } from "@/utils";
import { CountryAlpha2Input } from "@polar-sh/sdk/models/components/addressinput.js";
import { relations } from "drizzle-orm";
import { boolean, index, pgTable, text, varchar } from "drizzle-orm/pg-core";
import { users } from "./user";

export const userAddresses = pgTable(
  "user_addresses",
  {
    id: text("id").primaryKey().$defaultFn(generateUlid),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: addressTypeEnum("type").notNull().default(UserAddressType.BILLING),
    address1: varchar("address1", { length: 255 }).notNull(),
    address2: varchar("address2", { length: 255 }),
    first_name: varchar("first_name", { length: 100 }).notNull(),
    last_name: varchar("last_name", { length: 100 }).notNull(),
    company: varchar("company", { length: 255 }),
    street: varchar("street", { length: 255 }).notNull(),
    street2: varchar("street2", { length: 255 }),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 100 }).notNull(),
    postal_code: varchar("postal_code", { length: 20 }).notNull(),
    country: varchar("country", { length: 5 })
      .$type<CountryAlpha2Input>()
      .notNull(),
    phone: varchar("phone", { length: 20 }),
    is_default: boolean("is_default").default(false),
    ...baseTimestamps,
  },
  (table) => [
    index("user_addresses_user_id_idx").on(table.userId),
    index("user_addresses_type_idx").on(table.type),
  ]
);

export const userAddressesRelations = relations(userAddresses, ({ one }) => ({
  user: one(users, {
    fields: [userAddresses.userId],
    references: [users.id],
  }),
}));
