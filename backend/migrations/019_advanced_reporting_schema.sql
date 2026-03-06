-- 019_advanced_reporting_schema.sql

-- Add columns for historical category snapshots in student_exams
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS historical_category_id UUID REFERENCES student_categories(id) ON DELETE SET NULL;
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS historical_level_name VARCHAR(255);
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS snapshot_metadata JSONB DEFAULT '{}';

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_student_exams_completed_at ON student_exams(completed_at);
CREATE INDEX IF NOT EXISTS idx_student_exams_historical_category ON student_exams(historical_category_id);

-- Ensure feature_flags table exists before inserting (it's officially created in migration 020,
-- but migration 019 runs first so we create a minimal version here)
CREATE TABLE IF NOT EXISTS feature_flags (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key  VARCHAR(100) UNIQUE NOT NULL,
  feature_name VARCHAR(255) NOT NULL,
  description  TEXT,
  min_plan     VARCHAR(50) NOT NULL DEFAULT 'freemium',
  is_enabled   BOOLEAN DEFAULT true,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure feature flag for advanced analytics is present
INSERT INTO feature_flags (feature_key, feature_name, description, min_plan, is_enabled)
VALUES ('advanced_analytics', 'Advanced Analytics', 'Cohort analysis, tutor performance, trends, and consolidated reports', 'advanced', true)
ON CONFLICT (feature_key) DO UPDATE
SET feature_name = EXCLUDED.feature_name,
    description = EXCLUDED.description;
