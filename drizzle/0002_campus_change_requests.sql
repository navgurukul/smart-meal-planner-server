CREATE TYPE "smps_db"."smps_campus_change_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "smps_db"."smps_campus_change_requests" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL,
  "current_campus_id" integer NOT NULL,
  "requested_campus_id" integer NOT NULL,
  "reason" text,
  "rejection_reason" text,
  "status" "smps_db"."smps_campus_change_status" DEFAULT 'PENDING' NOT NULL,
  "reviewed_by" integer,
  "reviewed_at" timestamp,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_campus_change_requests" ADD CONSTRAINT "smps_campus_change_requests_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "smps_db"."smps_users"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_campus_change_requests" ADD CONSTRAINT "smps_campus_change_requests_current_campus_id_fk" FOREIGN KEY ("current_campus_id") REFERENCES "smps_db"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_campus_change_requests" ADD CONSTRAINT "smps_campus_change_requests_requested_campus_id_fk" FOREIGN KEY ("requested_campus_id") REFERENCES "smps_db"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_campus_change_requests" ADD CONSTRAINT "smps_campus_change_requests_reviewed_by_fk" FOREIGN KEY ("reviewed_by") REFERENCES "smps_db"."smps_users"("id") ON DELETE no action ON UPDATE no action;
