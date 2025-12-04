INSERT INTO "smps_db"."smps_meal_slots" ("name")
VALUES ('BREAKFAST'), ('LUNCH'), ('DINNER'), ('SNACKS')
ON CONFLICT ("name") DO NOTHING;
