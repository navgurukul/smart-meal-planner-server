-- Replace campus_id values with actual campus IDs per environment before running.
INSERT INTO "smps_db"."smps_campus_meal_slots"
  ("campus_id", "meal_slot_id", "start_time", "end_time", "selection_deadline_offset_hours")
VALUES
  (1, (SELECT id FROM "smps_db"."smps_meal_slots" WHERE name = 'BREAKFAST'), '07:30:00', '09:00:00', -12),
  (1, (SELECT id FROM "smps_db"."smps_meal_slots" WHERE name = 'LUNCH'), '12:30:00', '14:30:00', -12),
    (1, (SELECT id FROM "smps_db"."smps_meal_slots" WHERE name = 'SNACKS'), '17:00:00', '18:30:00', -12),
  (1, (SELECT id FROM "smps_db"."smps_meal_slots" WHERE name = 'DINNER'), '19:30:00', '21:00:00', -12)

ON CONFLICT ("campus_id","meal_slot_id") DO NOTHING;
