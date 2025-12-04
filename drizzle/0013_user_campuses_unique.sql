CREATE UNIQUE INDEX IF NOT EXISTS "smps_user_campuses_user_campus_unique"
ON "smps_db"."smps_user_campuses" ("user_id","campus_id");
