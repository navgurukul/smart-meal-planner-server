import { pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const campuses = pgTable("smps_campuses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }),
  status: varchar("status", { length: 50 }).default("active"),
});
