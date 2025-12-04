CREATE TABLE IF NOT EXISTS "smps_db"."smps_qr_tokens" (
  "id" serial PRIMARY KEY NOT NULL,
  "campus_id" integer NOT NULL,
  "date" date NOT NULL,
  "token" varchar(255) NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "smps_qr_tokens_campus_date_unique" ON "smps_db"."smps_qr_tokens" ("campus_id","date");
--> statement-breakpoint
ALTER TABLE "smps_db"."smps_qr_tokens" ADD CONSTRAINT "smps_qr_tokens_campus_id_fk" FOREIGN KEY ("campus_id") REFERENCES "smps_db"."smps_campuses"("id") ON DELETE no action ON UPDATE no action;
