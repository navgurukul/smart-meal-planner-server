ALTER TABLE "smps_db"."smps_meal_slots"
  DROP COLUMN IF EXISTS "start_time",
  DROP COLUMN IF EXISTS "end_time",
  DROP COLUMN IF EXISTS "selection_deadline_offset_hours";
