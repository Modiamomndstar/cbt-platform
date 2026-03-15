-- Migration to add AI limit columns to plan_definitions table
-- These allow Superadmin to manage AI quotas via the dashboard

DO $$
BEGIN
    -- Add max_ai_queries_per_student if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plan_definitions' AND column_name = 'max_ai_queries_per_student') THEN
        ALTER TABLE plan_definitions ADD COLUMN max_ai_queries_per_student INTEGER DEFAULT 5;
    END IF;

    -- Add max_ai_queries_per_tutor if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plan_definitions' AND column_name = 'max_ai_queries_per_tutor') THEN
        ALTER TABLE plan_definitions ADD COLUMN max_ai_queries_per_tutor INTEGER DEFAULT 50;
    END IF;

    -- Optional: Boost the 'enterprise' plan defaults if they were null
    UPDATE plan_definitions 
    SET max_ai_queries_per_student = 100, max_ai_queries_per_tutor = 500
    WHERE plan_type = 'enterprise' AND (max_ai_queries_per_student IS NULL OR max_ai_queries_per_student = 5);

END $$;
