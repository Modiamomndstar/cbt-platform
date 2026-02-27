-- 009_critical_fixes.sql

-- 1. Ensure assigned_questions exists for proper exam grading
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS assigned_questions JSONB;

-- 2. Update activity_logs to support external students better (just in case they aren't there yet in some envs)
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS external_student_id UUID;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- 3. Fix exam_categories relationship
CREATE TABLE IF NOT EXISTS exam_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#4F46E5',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, name)
);

-- Ensure exams table uses category_id
ALTER TABLE exams DROP COLUMN IF EXISTS category;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES exam_categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_exams_category ON exams(category_id);

-- 4. Ensure external_students has all required fields (it's created in 001_monetisation.sql, but missing bio, avatar_url if we want parity with schema)
ALTER TABLE external_students ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE external_students ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE external_students ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
