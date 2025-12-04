CREATE TABLE IF NOT EXISTS "smps_db"."smps_meal_receipts" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "campus_id" integer NOT NULL,
  "date" date NOT NULL,
  "meal_slot_id" integer NOT NULL,
  "qr_token_id" integer NOT NULL,
  "timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "smps_meal_receipts_user_date_slot_unique" ON "smps_db"."smps_meal_receipts" ("user_id","date","meal_slot_id");
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_meal_receipts" ADD CONSTRAINT "smps_meal_receipts_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "smps_db"."smps_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_meal_receipts" ADD CONSTRAINT "smps_meal_receipts_campus_id_fk" FOREIGN KEY ("campus_id") REFERENCES "smps_db"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_meal_receipts" ADD CONSTRAINT "smps_meal_receipts_meal_slot_id_fk" FOREIGN KEY ("meal_slot_id") REFERENCES "smps_db"."smps_meal_slots"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_meal_receipts" ADD CONSTRAINT "smps_meal_receipts_qr_token_id_fk" FOREIGN KEY ("qr_token_id") REFERENCES "smps_db"."smps_qr_tokens"("id") ON DELETE no action ON UPDATE no action;
