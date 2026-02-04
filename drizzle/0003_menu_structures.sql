CREATE TYPE "smps_db"."smps_meal_slot_name" AS ENUM ('BREAKFAST', 'LUNCH', 'SNACKS', 'DINNER');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "smps_db"."smps_meal_slots" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" "smps_db"."smps_meal_slot_name" NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "selection_deadline_offset_hours" integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "smps_meal_slots_name_unique" ON "smps_db"."smps_meal_slots" ("name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "smps_db"."smps_meal_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "description" text,
  "is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "smps_meal_items_name_unique" ON "smps_db"."smps_meal_items" ("name");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "smps_db"."smps_daily_menus" (
  "id" serial PRIMARY KEY NOT NULL,
  "campus_id" integer NOT NULL,
  "date" date NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "smps_daily_menus_campus_date_unique" ON "smps_db"."smps_daily_menus" ("campus_id","date");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "smps_db"."smps_daily_menu_items" (
  "id" serial PRIMARY KEY NOT NULL,
  "daily_menu_id" integer NOT NULL,
  "meal_slot_id" integer NOT NULL,
  "meal_item_id" integer NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "smps_daily_menu_items_menu_slot_unique" ON "smps_db"."smps_daily_menu_items" ("daily_menu_id","meal_slot_id");
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_daily_menus" ADD CONSTRAINT "smps_daily_menus_campus_id_fk" FOREIGN KEY ("campus_id") REFERENCES "smps_db"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_daily_menu_items" ADD CONSTRAINT "smps_daily_menu_items_daily_menu_id_fk" FOREIGN KEY ("daily_menu_id") REFERENCES "smps_db"."smps_daily_menus"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_daily_menu_items" ADD CONSTRAINT "smps_daily_menu_items_meal_slot_id_fk" FOREIGN KEY ("meal_slot_id") REFERENCES "smps_db"."smps_meal_slots"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_daily_menu_items" ADD CONSTRAINT "smps_daily_menu_items_meal_item_id_fk" FOREIGN KEY ("meal_item_id") REFERENCES "smps_db"."smps_meal_items"("id") ON DELETE no action ON UPDATE no action;
