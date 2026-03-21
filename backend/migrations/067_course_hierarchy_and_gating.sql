-- Migration: Course Hierarchy and Module Gating
-- Description: Adds parent_module_id for subtopics and linked_exam_id for module assessments.

-- 1. Update course_modules table
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS parent_module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE;
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS linked_exam_id UUID REFERENCES exams(id) ON DELETE SET NULL;
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS min_pass_score INTEGER DEFAULT 50;

-- 2. Add indices for performance
CREATE INDEX IF NOT EXISTS idx_course_modules_parent_id ON course_modules(parent_module_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_linked_exam_id ON course_modules(linked_exam_id);

-- Note: This is a non-destructive migration. existing modules will have NULL for these fields.
