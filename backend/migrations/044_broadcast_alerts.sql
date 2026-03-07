-- Migration 044: Broadcast View Tracking
CREATE TABLE IF NOT EXISTS broadcast_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    broadcast_id UUID NOT NULL REFERENCES inbox_broadcasts(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, broadcast_id)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_views_user_id ON broadcast_views(user_id);
