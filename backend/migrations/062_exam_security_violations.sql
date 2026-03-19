-- Migration: Add Security Violation Tracking to Student Exams
-- Description: Tracks tab/app switches and disqualification status for secure exams.

DO $$ 
BEGIN
    -- Add violation_count if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'violation_count') THEN
        ALTER TABLE student_exams ADD COLUMN violation_count INTEGER DEFAULT 0;
    END IF;

    -- Add is_disqualified if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'is_disqualified') THEN
        ALTER TABLE student_exams ADD COLUMN is_disqualified BOOLEAN DEFAULT false;
    END IF;

    -- Add disqualified_at if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'disqualified_at') THEN
        ALTER TABLE student_exams ADD COLUMN disqualified_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Add proctoring_logs if it doesn't exist (JSONB for generic event logging)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'proctoring_logs') THEN
        ALTER TABLE student_exams ADD COLUMN proctoring_logs JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- Add browser_metadata if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'browser_metadata') THEN
        ALTER TABLE student_exams ADD COLUMN browser_metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
