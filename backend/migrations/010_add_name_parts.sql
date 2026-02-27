-- 010_add_name_parts.sql

-- Add name parts to external_students
ALTER TABLE external_students ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE external_students ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
