import { integer, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { campuses } from "./smps_campuses";


export const users = pgTable("smps_users", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  campusId: integer("campus_id")
    .references(() => campuses.id)
    .notNull(),
  address: varchar("address", { length: 500 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  googleId: varchar("google_id", { length: 255 }),
  status: varchar("status", { length: 50 }).default("active"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
