import { pgTable, serial, varchar, integer } from "drizzle-orm/pg-core";
import { campuses } from "./smps_campuses";
import { users } from "./smps_users";


export const userCampusAdmin = pgTable("smps_user_campus_admin", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  campusId: integer("campus_id")
    .references(() => campuses.id)
    .notNull(),
  status: varchar("status", { length: 50 }).default("active"),
});
