-- Add auto_promote setting to competitions
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS auto_promote BOOLEAN DEFAULT TRUE;

-- Add state/region to schools for geographic leaderboard filtering
ALTER TABLE schools
ADD COLUMN IF NOT EXISTS state VARCHAR(100);

-- Add competition_stage_id to exam_schedules to track knockout progress
ALTER TABLE exam_schedules
ADD COLUMN IF NOT EXISTS competition_stage_id UUID REFERENCES competition_stages(id) ON DELETE SET NULL;

-- Update existing schools with a default state if applicable
UPDATE schools SET state = 'Federal Capital Territory' WHERE state IS NULL AND country = 'Nigeria';
