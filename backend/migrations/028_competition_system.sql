-- Migration 028: Global Exam Competition System

-- 1. Competitions Table
CREATE TABLE IF NOT EXISTS competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    scope VARCHAR(50) NOT NULL CHECK (scope IN ('local', 'national', 'global')),
    visibility VARCHAR(50) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'registration_open', 'exam_in_progress', 'completed', 'cancelled')),
    target_countries TEXT[] DEFAULT '{}',
    target_regions TEXT[] DEFAULT '{}',
    eligibility_config JSONB DEFAULT '{}',
    rewards_config JSONB DEFAULT '{}',
    certificate_template JSONB DEFAULT '{}',
    created_by UUID REFERENCES staff_accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Competition Categories (Age/Grade brackets)
CREATE TABLE IF NOT EXISTS competition_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    min_age INT,
    max_age INT,
    min_grade VARCHAR(50),
    max_grade VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Competition Stages (Rounds)
CREATE TABLE IF NOT EXISTS competition_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_category_id UUID NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
    stage_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INT DEFAULT 60,
    total_questions INT DEFAULT 50,
    qualification_threshold JSONB DEFAULT '{"type": "score_percent", "value": 70}',
    questions_config JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Competition Registrations (Student-School-Competition mapping)
CREATE TABLE IF NOT EXISTS competition_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    competition_category_id UUID NOT NULL REFERENCES competition_categories(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'disqualified', 'active')),
    registration_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(competition_id, student_id)
);

-- 5. Competition Results (Per stage results)
CREATE TABLE IF NOT EXISTS competition_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES competition_registrations(id) ON DELETE CASCADE,
    stage_id UUID NOT NULL REFERENCES competition_stages(id) ON DELETE CASCADE,
    score NUMERIC(5,2) DEFAULT 0,
    completion_time_seconds INT,
    difficulty_metrics JSONB DEFAULT '{}',
    is_qualified BOOLEAN DEFAULT FALSE,
    is_winner BOOLEAN DEFAULT FALSE,
    award_type VARCHAR(100), -- 'winner', 'runner_up_1', 'runner_up_2', 'participant'
    certificate_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(registration_id, stage_id)
);

-- Indices for performance
CREATE INDEX idx_comp_registrations_school ON competition_registrations(school_id);
CREATE INDEX idx_comp_registrations_student ON competition_registrations(student_id);
CREATE INDEX idx_comp_results_stage ON competition_results(stage_id);

-- Trigger for updated_at in competitions
CREATE TRIGGER update_competitions_updated_at
BEFORE UPDATE ON competitions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
