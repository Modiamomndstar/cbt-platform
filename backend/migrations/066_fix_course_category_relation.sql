-- Migration: Fix course category relationship
-- Description: Adds exam_category_id to courses to link with the "Subjects / Courses" categories used in exams.

-- 1. Add exam_category_id to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS exam_category_id UUID REFERENCES exam_categories(id) ON DELETE SET NULL;

-- 2. Create index for performance
CREATE INDEX IF NOT EXISTS idx_courses_exam_category_id ON courses(exam_category_id);

-- Optional: If we want to move data from old category_id (student_cat) to exam_category_id, 
-- we would need a mapping, but since student_cat (e.g. JSS1) and exam_cat (e.g. Math) 
-- are different types of entities, a direct migration is not logical.
-- We will just let users select the correct Subject Category moving forward.
