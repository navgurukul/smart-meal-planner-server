import { pgEnum, pgSchema, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";

export const smps_db = pgSchema("smps_db");

export const roles = pgTable("smps_roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g. super_admin, admin, user
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

