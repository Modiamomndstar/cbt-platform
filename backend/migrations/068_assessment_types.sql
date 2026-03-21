-- Migration: Assessment Types for Course Modules
-- Description: Adds assessment_type to categorize exams linked to modules.

-- 1. Create Assessment Type enum or just a varchar for flexibility
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'course_modules' AND COLUMN_NAME = 'assessment_type') THEN
        ALTER TABLE course_modules ADD COLUMN assessment_type VARCHAR(50); -- 'weekly_classwork', 'assignment', 'midterm', 'final_exam'
    END IF;
END $$;

-- 2. Add description for the module if missing (some tutors want topic descriptions)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'course_modules' AND COLUMN_NAME = 'description') THEN
        ALTER TABLE course_modules ADD COLUMN description TEXT;
    END IF;
END $$;
