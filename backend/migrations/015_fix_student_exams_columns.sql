-- 015_fix_student_exams_columns.sql

-- 1. Standardize schedule_id to exam_schedule_id in student_exams
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'exam_schedule_id') THEN
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'schedule_id') THEN
            ALTER TABLE student_exams RENAME COLUMN schedule_id TO exam_schedule_id;
        ELSE
            -- This case is unlikely given the code, but for safety:
            ALTER TABLE student_exams ADD COLUMN exam_schedule_id UUID REFERENCES exam_schedules(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- 2. Standardize time_spent to time_spent_minutes in student_exams
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'time_spent_minutes') THEN
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'student_exams' AND COLUMN_NAME = 'time_spent') THEN
            ALTER TABLE student_exams RENAME COLUMN time_spent TO time_spent_minutes;
        ELSE
            ALTER TABLE student_exams ADD COLUMN time_spent_minutes INTEGER DEFAULT 0;
        END IF;
    END IF;
END $$;

-- 3. Ensure assigned_questions exists (just in case migrations 009/011 were skipped)
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS assigned_questions JSONB DEFAULT '[]';
