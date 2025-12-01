import { integer, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { campuses } from "./smps_campuses";
import { menuItem } from "./smps_menu_item";
import { mealTypes } from "./smps_meal_types";

export const campusMeal = pgTable("smps_campus_meal", {
  id: serial("id").primaryKey(),
  menuItemId: integer("menu_item_id")
    .references(() => menuItem.id)
    .notNull(),
  typeId: integer("type_id")
    .references(() => mealTypes.id)
    .notNull(),
  campusId: integer("campus_id")
    .references(() => campuses.id)
    .notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
