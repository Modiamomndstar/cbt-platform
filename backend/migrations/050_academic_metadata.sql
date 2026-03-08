-- Migration 050: Add Academic Metadata (Type and Session) to Exams
-- Adds flexibility for different exam styles (Practice, Midterm, etc.) and Course structures.

ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_type VARCHAR(50);
ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_session VARCHAR(100);

-- Update existing exams with a default type if category name suggests it
UPDATE exams e
SET exam_type = LOWER(ec.name)
FROM exam_categories ec
WHERE e.category_id = ec.id
AND ec.name ILIKE ANY (ARRAY['%practice%', '%midterm%', '%test%', '%assignment%', '%termly%', '%semester%']);

COMMENT ON COLUMN exams.exam_type IS 'Type of exam: midterm, final, practice, assignment, test, etc.';
COMMENT ON COLUMN exams.academic_session IS 'The academic year, term, or semester this exam belongs to.';
