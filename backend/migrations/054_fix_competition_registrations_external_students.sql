-- Migration 054: Fix competition_registrations table to support external students
-- This is critical for the competition submission logic in results.ts

ALTER TABLE competition_registrations ADD COLUMN IF NOT EXISTS external_student_id UUID REFERENCES external_students(id) ON DELETE CASCADE;

-- Update unique constraint if it exists to include external_student_id
-- We want a student to only register once per competition category
-- Drop old constraint if exists (need to know name, usually it's competition_registrations_pkey or a custom one)
-- Let's add a partial unique index for external students
CREATE UNIQUE INDEX IF NOT EXISTS idx_comp_reg_external_student ON competition_registrations (competition_id, competition_category_id, external_student_id) WHERE external_student_id IS NOT NULL;
