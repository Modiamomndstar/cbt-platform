-- Sprint 3 Migrations: External Students Categorization & Exam Categories

-- 1. Ensure school_settings exists before altering (it's officially created in migration 020,
--    but this migration runs first so we create a minimal version here)
CREATE TABLE IF NOT EXISTS school_settings (
  school_id UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  allow_external_students       BOOLEAN DEFAULT true,
  max_external_per_tutor        INTEGER DEFAULT 30,
  allow_tutor_create_students   BOOLEAN DEFAULT true,
  student_portal_enabled        BOOLEAN DEFAULT true,
  result_release_mode           VARCHAR(20) DEFAULT 'immediate',
  allow_student_pdf_download    BOOLEAN DEFAULT false,
  default_exam_attempts         INTEGER DEFAULT 1,
  email_on_exam_complete        BOOLEAN DEFAULT true,
  email_on_new_student          BOOLEAN DEFAULT true,
  email_on_results_release      BOOLEAN DEFAULT true,
  primary_color                 VARCHAR(20) DEFAULT '#6366f1',
  updated_at                    TIMESTAMPTZ DEFAULT NOW()
);

-- Add toggle for Tutors editing School-wide student categories
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
ALTER TABLE exams
DROP COLUMN IF EXISTS category;

ALTER TABLE exams
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES exam_categories(id) ON DELETE SET NULL;
