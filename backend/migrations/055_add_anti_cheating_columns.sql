-- Migration 055: Add Anti-Cheating (Secure Mode) columns to exams and student_exams
-- This synchronizes the database with the schema.sql in the repository

-- 1. Add Secure Mode configuration to exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_secure_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS max_violations INTEGER DEFAULT 3;

-- 2. Add violation tracking columns to student_exams table
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS tab_switch_count INTEGER DEFAULT 0;
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS fullscreen_exits INTEGER DEFAULT 0;

-- 3. Ensure snapshot_metadata exists (used for logging violation details)
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS snapshot_metadata JSONB DEFAULT '{}'::JSONB;
