import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { campusMeal } from "./smps_campus_meal";

export const menuCampus = pgTable("smps_menu_campus", {
  id: serial("id").primaryKey(),
  campusMealId: integer("campus_meal_id")
    .references(() => campusMeal.id)
    .notNull(),
  from: timestamp("from").notNull(),
  to: timestamp("to"),
});
