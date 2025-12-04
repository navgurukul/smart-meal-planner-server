import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgSchema,
  date,
  serial,
  text,
  time,
  timestamp,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const smps_db = pgSchema("smps_db");

//campus_admin table to link users and campuses with admin role
export const userCampusAdmin = smps_db.table("smps_user_campus_admin", {
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
export const campusMeal = smps_db.table("smps_campus_meal", {
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
export const menuCampus = smps_db.table("smps_menu_campus", {
  id: serial("id").primaryKey(),
  campusMealId: integer("campus_meal_id")
    .references(() => campusMeal.id)
    .notNull(),
  from: timestamp("from").notNull(),
  to: timestamp("to"),
});

//campuses table to store campus details
export const campuses = smps_db.table("smps_campuses", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: varchar("address", { length: 500 }),
  status: varchar("status", { length: 50 }).default("active"),
});


//meal_types table to store different meal types
export const mealTypes = smps_db.table("smps_meal_types", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
});

//menu_item table to store menu items
export const menuItem = smps_db.table("smps_menu_item", {
  id: serial("id").primaryKey(),
  item: varchar("item", { length: 255 }).notNull(),
  calorieCount: integer("calorie_count"),
});



//roles table to define different user roles
export const roles = smps_db.table("smps_roles", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g. super_admin, admin, user
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

//users table to store user details
export const userMealRecord = smps_db.table("smps_user_meal_record", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  campusId: integer("campus_id")
    .references(() => campuses.id)
    .notNull(),
  mealDate: date("meal_date").notNull(),
  mealSlotId: integer("meal_slot_id")
    .references(() => mealSlots.id)
    .notNull(),
  menuCampusJson: jsonb("menu_campus_json").notNull(),
  ordered: boolean("ordered").default(false),
  received: boolean("received").default(false),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  userDateSlotUnique: uniqueIndex("smps_user_meal_record_user_date_slot_unique").on(
    table.userId,
    table.mealDate,
    table.mealSlotId,
  ),
}));


//user_role table to link users with roles
export const userRole = smps_db.table("smps_user_role", {
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
export const users = smps_db.table("smps_users", {
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

//user_campuses table to map users to campuses with a primary flag
export const userCampuses = smps_db.table("smps_user_campuses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id)
    .notNull(),
  campusId: integer("campus_id")
    .references(() => campuses.id)
    .notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const campusChangeStatusEnum = pgEnum("smps_campus_change_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);

export const campusChangeRequests = smps_db.table(
  "smps_campus_change_requests",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    currentCampusId: integer("current_campus_id")
      .references(() => campuses.id)
      .notNull(),
    requestedCampusId: integer("requested_campus_id")
      .references(() => campuses.id)
      .notNull(),
    reason: text("reason"),
    rejectionReason: text("rejection_reason"),
    status: campusChangeStatusEnum("status").default("PENDING").notNull(),
    reviewedBy: integer("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
);

export const mealSlotEnum = pgEnum("smps_meal_slot_name", [
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SNACKS",
]);

export const mealSlots = smps_db.table(
  "smps_meal_slots",
  {
    id: serial("id").primaryKey(),
    name: mealSlotEnum("name").notNull(),
  },
  (table) => ({
    nameUnique: uniqueIndex("smps_meal_slots_name_unique").on(table.name),
  }),
);

export const mealItems = smps_db.table(
  "smps_meal_items",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").default(true).notNull(),
  },
  (table) => ({
    nameUnique: uniqueIndex("smps_meal_items_name_unique").on(table.name),
  }),
);

export const dailyMenus = smps_db.table(
  "smps_daily_menus",
  {
    id: serial("id").primaryKey(),
    campusId: integer("campus_id")
      .references(() => campuses.id)
      .notNull(),
    date: date("date").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    campusDateUnique: uniqueIndex("smps_daily_menus_campus_date_unique").on(
      table.campusId,
      table.date,
    ),
  }),
);

export const dailyMenuItems = smps_db.table(
  "smps_daily_menu_items",
  {
    id: serial("id").primaryKey(),
    dailyMenuId: integer("daily_menu_id")
      .references(() => dailyMenus.id)
      .notNull(),
    mealSlotId: integer("meal_slot_id")
      .references(() => mealSlots.id)
      .notNull(),
    mealItemId: integer("meal_item_id")
      .references(() => mealItems.id)
      .notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    uniqueSlotPerMenu: uniqueIndex(
      "smps_daily_menu_items_menu_slot_unique",
    ).on(table.dailyMenuId, table.mealSlotId),
  }),
);

export const mealSelectionStatusEnum = pgEnum("smps_meal_selection_status", [
  "SELECTED",
  "SKIPPED",
]);

export const mealSelections = smps_db.table(
  "smps_meal_selections",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    campusId: integer("campus_id")
      .references(() => campuses.id)
      .notNull(),
    date: date("date").notNull(),
    mealSlotId: integer("meal_slot_id")
      .references(() => mealSlots.id)
      .notNull(),
    status: mealSelectionStatusEnum("status").default("SELECTED").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    userDateSlotUnique: uniqueIndex(
      "smps_meal_selections_user_date_slot_unique",
    ).on(table.userId, table.date, table.mealSlotId),
  }),
);

export const qrTokens = smps_db.table(
  "smps_qr_tokens",
  {
    id: serial("id").primaryKey(),
    campusId: integer("campus_id")
      .references(() => campuses.id)
      .notNull(),
    date: date("date").notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (table) => ({
    campusDateUnique: uniqueIndex("smps_qr_tokens_campus_date_unique").on(
      table.campusId,
      table.date,
    ),
  }),
);

export const mealReceipts = smps_db.table(
  "smps_meal_receipts",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .references(() => users.id)
      .notNull(),
    campusId: integer("campus_id")
      .references(() => campuses.id)
      .notNull(),
    date: date("date").notNull(),
    mealSlotId: integer("meal_slot_id")
      .references(() => mealSlots.id)
      .notNull(),
    qrTokenId: integer("qr_token_id")
      .references(() => qrTokens.id)
      .notNull(),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  (table) => ({
    userDateSlotUnique: uniqueIndex(
      "smps_meal_receipts_user_date_slot_unique",
    ).on(table.userId, table.date, table.mealSlotId),
  }),
);

export const campusMealSlots = smps_db.table(
  "smps_campus_meal_slots",
  {
    id: serial("id").primaryKey(),
    campusId: integer("campus_id")
      .references(() => campuses.id)
      .notNull(),
    mealSlotId: integer("meal_slot_id")
      .references(() => mealSlots.id)
      .notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    selectionDeadlineOffsetHours: integer(
      "selection_deadline_offset_hours",
    ).notNull(),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    campusSlotUnique: uniqueIndex("smps_campus_meal_slots_unique").on(
      table.campusId,
      table.mealSlotId,
    ),
  }),
);
