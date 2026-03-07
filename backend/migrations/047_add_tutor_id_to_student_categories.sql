-- Migration 047: Add tutor_id to student_categories
-- Fixes "column tutor_id does not exist" error in production

DO $$
BEGIN
    -- 1. Add tutor_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_categories' AND COLUMN_NAME = 'tutor_id') THEN
        ALTER TABLE student_categories ADD COLUMN tutor_id UUID;
    END IF;

    -- 2. Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'student_categories_tutor_id_fkey'
        AND table_name = 'student_categories'
    ) THEN
        ALTER TABLE ONLY student_categories
            ADD CONSTRAINT student_categories_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES tutors(id) ON DELETE CASCADE;
    END IF;
END $$;
