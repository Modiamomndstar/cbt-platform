-- Migration 069: Link Course Modules to Exam Types (Assessment Styles)
-- This enables the "Sync" between LMS and official school assessment policy.

ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS exam_type_id UUID REFERENCES exam_types(id) ON DELETE SET NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_course_modules_exam_type_id ON course_modules(exam_type_id);

COMMENT ON COLUMN course_modules.exam_type_id IS 'Reference to the official school assessment style (e.g., CA1, Mock, Exam).';
