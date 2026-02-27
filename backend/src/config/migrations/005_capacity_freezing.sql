-- Migration 005: Capacity Freezing
-- Adds a flag to track if purchased marketplace capacity is currently frozen
-- due to a lapsed or inactive subscription.

ALTER TABLE school_subscriptions ADD COLUMN IF NOT EXISTS is_capacity_frozen BOOLEAN DEFAULT FALSE;

-- Index for the sync job performance
CREATE INDEX IF NOT EXISTS idx_subscription_sync ON school_subscriptions (status, is_capacity_frozen);
