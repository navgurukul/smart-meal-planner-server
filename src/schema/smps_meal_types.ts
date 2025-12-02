
import { pgTable, serial, varchar } from "drizzle-orm/pg-core";

export const mealTypes = pgTable("smps_meal_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
});