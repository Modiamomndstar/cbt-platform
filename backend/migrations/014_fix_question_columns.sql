-- 014_fix_question_columns.sql

-- 1. Ensure image_url exists in questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Ensure sort_order exists (handling the sort_order vs question_order discrepancy)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'questions' AND COLUMN_NAME = 'sort_order') THEN
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'questions' AND COLUMN_NAME = 'question_order') THEN
            ALTER TABLE questions RENAME COLUMN question_order TO sort_order;
        ELSE
            ALTER TABLE questions ADD COLUMN sort_order INTEGER DEFAULT 0;
        END IF;
    END IF;
END $$;
