CREATE TABLE IF NOT EXISTS "smps_db"."smps_user_campuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"campus_id" integer NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_user_campuses" ADD CONSTRAINT "smps_user_campuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "smps_db"."smps_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_user_campuses" ADD CONSTRAINT "smps_user_campuses_campus_id_fkey" FOREIGN KEY ("campus_id") REFERENCES "smps_db"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "smps_db"."smps_roles" ("name")
VALUES 
  ('STUDENT'),
  ('KITCHEN_STAFF'),
  ('INCHARGE'),
  ('ADMIN'),
  ('SUPER_ADMIN')
ON CONFLICT ("name") DO NOTHING;
