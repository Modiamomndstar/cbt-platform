-- Migration 072: Unified Session Support for Courses and Exams

-- 1. Enhancing Courses table
ALTER TABLE courses ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;

-- 2. Enhancing Exams table
ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id) ON DELETE SET NULL;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS academic_period_id UUID REFERENCES academic_periods(id) ON DELETE SET NULL;

-- 3. Indexes for performance and filtering
CREATE INDEX IF NOT EXISTS idx_courses_session ON courses(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_exams_session ON exams(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_exams_period ON exams(academic_period_id);

-- 4. Comments
COMMENT ON COLUMN courses.academic_year_id IS 'Links a course to a specific academic year (e.g., 2024/25).';
COMMENT ON COLUMN courses.is_archived IS 'Flag to mark old courses that are no longer active in the current curriculum.';
COMMENT ON COLUMN exams.academic_year_id IS 'Links an exam to a specific academic year.';
COMMENT ON COLUMN exams.academic_period_id IS 'Links an exam to a specific academic period (Term/Semester).';
