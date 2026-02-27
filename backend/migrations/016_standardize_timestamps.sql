-- 016_standardize_timestamps.sql

-- 1. Standardize student_exams timestamps to started_at and completed_at
DO $$
BEGIN
    -- Rename submitted_at to completed_at if it exists and completed_at doesn't
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'submitted_at')
       AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'completed_at') THEN
        ALTER TABLE student_exams RENAME COLUMN submitted_at TO completed_at;
    END IF;

    -- If end_time exists (from previous bugged migration), merge/rename it
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'end_time')
       AND NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'completed_at') THEN
        ALTER TABLE student_exams RENAME COLUMN end_time TO completed_at;
    ELSIF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'end_time') THEN
        -- If both exist, just drop the bugged end_time
        ALTER TABLE student_exams DROP COLUMN end_time;
    END IF;

    -- Remove redundant questions column from student_exams
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'questions') THEN
        ALTER TABLE student_exams DROP COLUMN questions;
    END IF;
END $$;

-- 2. Ensure exam_schedules also has completed_at (it seems it already does, but for safety)
ALTER TABLE exam_schedules ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
