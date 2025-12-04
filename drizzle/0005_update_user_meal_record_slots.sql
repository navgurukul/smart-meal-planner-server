ALTER TABLE "smps_db"."smps_user_meal_record"
  ADD COLUMN "campus_id" integer NOT NULL,
  ADD COLUMN "meal_date" date NOT NULL,
  ADD COLUMN "meal_slot_id" integer NOT NULL;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_user_meal_record"
  ADD CONSTRAINT "smps_user_meal_record_campus_id_fk"
  FOREIGN KEY ("campus_id") REFERENCES "smps_db"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_user_meal_record"
  ADD CONSTRAINT "smps_user_meal_record_meal_slot_id_fk"
  FOREIGN KEY ("meal_slot_id") REFERENCES "smps_db"."smps_meal_slots"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "smps_user_meal_record_user_date_slot_unique"
ON "smps_db"."smps_user_meal_record" ("user_id","meal_date","meal_slot_id");
