CREATE TABLE IF NOT EXISTS "smps_db"."smps_campus_meal_slots" (
  "id" serial PRIMARY KEY NOT NULL,
  "campus_id" integer NOT NULL,
  "meal_slot_id" integer NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "selection_deadline_offset_hours" integer NOT NULL,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "smps_campus_meal_slots_unique" ON "smps_db"."smps_campus_meal_slots" ("campus_id","meal_slot_id");
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_campus_meal_slots" ADD CONSTRAINT "smps_campus_meal_slots_campus_id_fk" FOREIGN KEY ("campus_id") REFERENCES "smps_db"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_campus_meal_slots" ADD CONSTRAINT "smps_campus_meal_slots_meal_slot_id_fk" FOREIGN KEY ("meal_slot_id") REFERENCES "smps_db"."smps_meal_slots"("id") ON DELETE no action ON UPDATE no action;
