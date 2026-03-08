-- Migration 051: Custom Exam Types (School-defined Assessment Styles)

CREATE TABLE IF NOT EXISTS exam_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#4F46E5',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, name)
);

-- Link exams to custom types
ALTER TABLE exams ADD COLUMN IF NOT EXISTS exam_type_id UUID REFERENCES exam_types(id) ON DELETE SET NULL;

-- Seed default types for all existing schools
INSERT INTO exam_types (school_id, name, description, color)
SELECT id, 'Official Exam', 'End of term or semester examinations', '#1E293B' FROM schools
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO exam_types (school_id, name, description, color)
SELECT id, 'Mid-Term', 'Mid-session assessments', '#4F46E5' FROM schools
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO exam_types (school_id, name, description, color)
SELECT id, 'Class Test', 'Quizzes and short tests', '#8B5CF6' FROM schools
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO exam_types (school_id, name, description, color)
SELECT id, 'Practice', 'Mock and practice assessments', '#10B981' FROM schools
ON CONFLICT (school_id, name) DO NOTHING;

INSERT INTO exam_types (school_id, name, description, color)
SELECT id, 'Assignment', 'Projects and homework tasks', '#F59E0B' FROM schools
ON CONFLICT (school_id, name) DO NOTHING;

-- Migrate data from exams.exam_type (VARCHAR) to exams.exam_type_id if possible
-- This is a best-effort migration based on name matching
UPDATE exams e
SET exam_type_id = et.id
FROM exam_types et
WHERE e.school_id = et.school_id
AND LOWER(e.exam_type) = LOWER(et.name);

COMMENT ON TABLE exam_types IS 'Customizable assessment styles (e.g., CA1, Mock, Final) defined per school.';
COMMENT ON COLUMN exams.exam_type_id IS 'Reference to the custom assessment style in exam_types table.';
