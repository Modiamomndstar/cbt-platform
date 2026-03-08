-- Migration 053: Fix external_students schema
-- Add missing columns that were expected by the code but missing in some environments

ALTER TABLE external_students
  ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES student_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS level_class VARCHAR(100);

-- Populate first_name/last_name from full_name if they are null
UPDATE external_students
SET
  first_name = split_part(full_name, ' ', 1),
  last_name = CASE
    WHEN position(' ' in full_name) > 0 THEN substring(full_name from position(' ' in full_name) + 1)
    ELSE ''
  END
WHERE (first_name IS NULL OR first_name = '') AND (full_name IS NOT NULL AND full_name != '');
