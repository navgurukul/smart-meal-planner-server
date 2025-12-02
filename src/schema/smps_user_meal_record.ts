import { boolean, integer, jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "./smps_users";

export const userMealRecord = pgTable("smps_user_meal_record", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  menuCampusJson: jsonb("menu_campus_json").notNull(),
  ordered: boolean("ordered").default(false),
  received: boolean("received").default(false),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});
