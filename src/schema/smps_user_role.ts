import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { users } from "./smps_users";
import { roles } from "./smps_roles";

export const userRole = pgTable("smps_user_role", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  roleId: integer("role_id")
    .references(() => roles.id)
    .notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

