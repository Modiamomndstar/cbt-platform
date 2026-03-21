-- Migration 073: Granular Feature Overrides
-- Allows SuperAdmin to gift or restrict individual features for specific schools.

CREATE TABLE IF NOT EXISTS school_feature_overrides (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id     UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    feature_key   VARCHAR(100) NOT NULL,
    is_allowed    BOOLEAN NOT NULL DEFAULT true,
    expires_at    TIMESTAMPTZ, -- Optional expiry
    reason        TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(school_id, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_feature_overrides_school ON school_feature_overrides(school_id);
CREATE INDEX IF NOT EXISTS idx_feature_overrides_key ON school_feature_overrides(feature_key);

-- Add comment
COMMENT ON TABLE school_feature_overrides IS 'Granular overrides for school features, enabling "gifts" or custom restrictions.';
