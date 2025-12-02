import { boolean, integer, jsonb, pgSchema, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
export const smps_db = pgSchema("smps_db");

//campus_admin table to link users and campuses with admin role
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

//campus_meal table to link menu items, meal types and campuses
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

//menu_campus table to link campus meals with time frames
export const menuCampus = pgTable("smps_menu_campus", {
  id: serial("id").primaryKey(),
  campusMealId: integer("campus_meal_id")
    .references(() => campusMeal.id)
    .notNull(),
  from: timestamp("from").notNull(),
  to: timestamp("to"),
});

//campuses table to store campus details
export const campuses = pgTable("smps_campuses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }),
  status: varchar("status", { length: 50 }).default("active"),
});


//meal_types table to store different meal types
export const mealTypes = pgTable("smps_meal_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
});

//menu_item table to store menu items
export const menuItem = pgTable("smps_menu_item", {
  id: serial("id").primaryKey(),
  item: varchar("item", { length: 255 }).notNull(),
  calorieCount: integer("calorie_count"),
});



//roles table to define different user roles
export const roles = pgTable("smps_roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g. super_admin, admin, user
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

//users table to store user details
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


//user_role table to link users with roles
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

//users table to store user details
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