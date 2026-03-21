-- Migration: AI-Powered Learning Management System (LMS)
-- Description: Creates tables for courses, modules, content, and progress tracking.

-- 1. Add allow_tutor_lms to school_settings
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'school_settings' AND COLUMN_NAME = 'allow_tutor_lms') THEN
        ALTER TABLE school_settings ADD COLUMN allow_tutor_lms BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 2. Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category_id UUID REFERENCES student_categories(id) ON DELETE SET NULL,
    is_published BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create course_modules table
CREATE TABLE IF NOT EXISTS course_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create course_contents table
CREATE TABLE IF NOT EXISTS course_contents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    module_id UUID NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'text', 'video', 'file', 'exam'
    content_data TEXT, -- Markdown or metadata
    video_url TEXT,
    file_url TEXT,
    linked_exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create student_course_progress table
CREATE TABLE IF NOT EXISTS student_course_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    last_content_id UUID REFERENCES course_contents(id) ON DELETE SET NULL,
    completed_contents UUID[] DEFAULT '{}', -- Array of completed content IDs
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP,
    exam_result_id UUID, -- If an exam was taken as part of the course
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_courses_school_id ON courses(school_id);
CREATE INDEX IF NOT EXISTS idx_courses_tutor_id ON courses(tutor_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_course_id ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_contents_module_id ON course_contents(module_id);
CREATE INDEX IF NOT EXISTS idx_student_course_progress_student_id ON student_course_progress(student_id);
CREATE INDEX IF NOT EXISTS idx_student_course_progress_course_id ON student_course_progress(course_id);
