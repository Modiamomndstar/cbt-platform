-- Sprint 3 Migrations: External Students Categorization & Exam Categories

-- 1. Add toggle for Tutors editing School-wide student categories
ALTER TABLE school_settings
ADD COLUMN IF NOT EXISTS allow_tutor_edit_categories BOOLEAN DEFAULT true;

-- 2. Add category_id to external_students so tutors can categorize them
ALTER TABLE external_students
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES student_categories(id) ON DELETE SET NULL;

-- 3. Create exam_categories table to classify exams strictly (CA, Practice, Termly, etc.)
CREATE TABLE IF NOT EXISTS exam_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, name)
);

-- 4. Convert exams.category to reference exam_categories
-- If the current 'category' column exists as VARCHAR, we drop it to use a strict foreign key relation.
ALTER TABLE exams
DROP COLUMN IF EXISTS category;

ALTER TABLE exams
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES exam_categories(id) ON DELETE SET NULL;
