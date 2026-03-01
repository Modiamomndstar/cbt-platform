-- Add banner and featured status to competitions
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS banner_url TEXT,
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;

-- Create competition_rewards table
CREATE TABLE IF NOT EXISTS competition_rewards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    rank_from INTEGER NOT NULL,
    rank_to INTEGER NOT NULL,
    reward_title TEXT NOT NULL,
    reward_description TEXT,
    reward_value DECIMAL(10, 2),
    reward_type VARCHAR(50) DEFAULT 'cash', -- 'cash', 'scholarship', 'gift', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_comp_rewards_comp_id ON competition_rewards(competition_id);
