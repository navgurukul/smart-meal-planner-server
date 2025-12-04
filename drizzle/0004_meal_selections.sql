CREATE TYPE "smps_db"."smps_meal_selection_status" AS ENUM ('SELECTED', 'SKIPPED');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "smps_db"."smps_meal_selections" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "campus_id" integer NOT NULL,
  "date" date NOT NULL,
  "meal_slot_id" integer NOT NULL,
  "status" "smps_db"."smps_meal_selection_status" DEFAULT 'SELECTED' NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "smps_meal_selections_user_date_slot_unique" ON "smps_db"."smps_meal_selections" ("user_id","date","meal_slot_id");
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_meal_selections" ADD CONSTRAINT "smps_meal_selections_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "smps_db"."smps_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_meal_selections" ADD CONSTRAINT "smps_meal_selections_campus_id_fk" FOREIGN KEY ("campus_id") REFERENCES "smps_db"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_meal_selections" ADD CONSTRAINT "smps_meal_selections_meal_slot_id_fk" FOREIGN KEY ("meal_slot_id") REFERENCES "smps_db"."smps_meal_slots"("id") ON DELETE no action ON UPDATE no action;
