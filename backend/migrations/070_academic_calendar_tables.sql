-- Migration 070: Academic Calendar Engine
-- Provides the "Clock" for the school, supporting Years, Terms, Semesters, and Weeks.

-- 1. Academic Years (e.g., 2024/2025)
CREATE TABLE IF NOT EXISTS academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "2024/2025 Academic Session"
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(school_id, name)
);

-- 2. Academic Periods (Terms or Semesters)
CREATE TYPE academic_period_type AS ENUM ('term', 'semester', 'summer_break', 'mid_term_break');

CREATE TABLE IF NOT EXISTS academic_periods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_year_id UUID NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "First Term", "Harmattan Semester"
    period_type academic_period_type NOT NULL DEFAULT 'term',
    order_index INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(academic_year_id, name)
);

-- 3. Academic Weeks (Instructional Weeks)
CREATE TABLE IF NOT EXISTS academic_weeks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    academic_period_id UUID NOT NULL REFERENCES academic_periods(id) ON DELETE CASCADE,
    week_number INTEGER NOT NULL, -- e.g., 1, 2, 3...
    label VARCHAR(255), -- e.g., "Week 1: Introduction to Algebra"
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(academic_period_id, week_number)
);

-- 4. Update Course Modules to Link to Weeks (for scheduling)
ALTER TABLE course_modules ADD COLUMN IF NOT EXISTS academic_week_id UUID REFERENCES academic_weeks(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_academic_years_school ON academic_years(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_periods_year ON academic_periods(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_academic_weeks_period ON academic_weeks(academic_period_id);
CREATE INDEX IF NOT EXISTS idx_course_modules_week ON course_modules(academic_week_id);

COMMENT ON TABLE academic_years IS 'High-level session tracking (e.g., 2024/2025).';
COMMENT ON TABLE academic_periods IS 'Sub-divisions like Terms (NG/UK) or Semesters (Tertiary).';
COMMENT ON TABLE academic_weeks IS 'Granular instructional weeks for mapping curriculum to dates.';
