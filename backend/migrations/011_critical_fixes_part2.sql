-- 011_critical_fixes_part2.sql

-- 1. Update exam_schedules to support external students
ALTER TABLE exam_schedules ALTER COLUMN student_id DROP NOT NULL;
ALTER TABLE exam_schedules ADD COLUMN IF NOT EXISTS external_student_id UUID REFERENCES external_students(id) ON DELETE CASCADE;

-- Add check constraint to ensure either student_id or external_student_id is present
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_exam_schedule_student') THEN
        ALTER TABLE exam_schedules ADD CONSTRAINT check_exam_schedule_student
        CHECK (
            (student_id IS NOT NULL AND external_student_id IS NULL) OR
            (student_id IS NULL AND external_student_id IS NOT NULL)
        );
    END IF;
END $$;

-- 2. Update student_exams to support external students and early creation
ALTER TABLE student_exams ALTER COLUMN student_id DROP NOT NULL;
-- Only drop NOT NULL on 'questions' column if it actually exists (it won't on fresh DBs)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'questions') THEN
        ALTER TABLE student_exams ALTER COLUMN questions DROP NOT NULL;
    END IF;
END $$;
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS external_student_id UUID REFERENCES external_students(id) ON DELETE CASCADE;

-- Add check constraint for student_exams
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_student_exam_student') THEN
        ALTER TABLE student_exams ADD CONSTRAINT check_student_exam_student
        CHECK (
            (student_id IS NOT NULL AND external_student_id IS NULL) OR
            (student_id IS NULL AND external_student_id IS NOT NULL)
        );
    END IF;
END $$;

-- 3. Ensure assigned_questions exists (migration 009 should have done this, but let's be safe)
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS assigned_questions JSONB;
