INSERT INTO "smps_db"."smps_meal_slots" ("name")
VALUES ('BREAKFAST'), ('LUNCH'), ('SNACKS'), ('DINNER')
ON CONFLICT ("name") DO NOTHING;
