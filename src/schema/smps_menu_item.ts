import { integer, pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const menuItem = pgTable("smps_menu_item", {
  id: serial("id").primaryKey(),
  item: varchar("item", { length: 255 }).notNull(),
  calorieCount: integer("calorie_count"),
});
