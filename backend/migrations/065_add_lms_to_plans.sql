-- Add allow_lms column to plan_definitions
ALTER TABLE plan_definitions ADD COLUMN IF NOT EXISTS allow_lms BOOLEAN DEFAULT false;

-- Update existing plans
UPDATE plan_definitions SET allow_lms = true WHERE plan_type IN ('advanced', 'enterprise');
