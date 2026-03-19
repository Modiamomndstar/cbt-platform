-- Migration: Add Identity Snapshot to Student Exams
-- Description: Stores the URL of the selfie taken at the start of a secure exam.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'identity_snapshot_url') THEN
        ALTER TABLE student_exams ADD COLUMN identity_snapshot_url TEXT;
    END IF;
END $$;
