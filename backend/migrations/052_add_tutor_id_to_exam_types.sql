-- Migration 052: Add tutor_id to exam_types
-- Allows tutors to create their own custom assessment styles.
-- School-wide assessment styles will have tutor_id = NULL.

ALTER TABLE exam_types ADD COLUMN tutor_id UUID REFERENCES tutors(id) ON DELETE CASCADE;

-- Drop the old unique constraint (school_id, name)
ALTER TABLE exam_types DROP CONSTRAINT IF EXISTS exam_types_school_id_name_key;

-- Create partial unique indexes to manage uniqueness correctly
-- School-wide types must be unique within the school
CREATE UNIQUE INDEX idx_exam_types_school_name_unique ON exam_types (school_id, name) WHERE tutor_id IS NULL;
-- Tutor-specific types must be unique for that tutor
CREATE UNIQUE INDEX idx_exam_types_school_tutor_name_unique ON exam_types (school_id, tutor_id, name) WHERE tutor_id IS NOT NULL;

COMMENT ON COLUMN exam_types.tutor_id IS 'Reference to the tutor who created this custom assessment style. If NULL, it is a school-wide style.';
