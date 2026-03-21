-- Migration 074: Marketplace Validity & Expiry
-- Adds validity periods to marketplace items and purchases.

-- 1. Add validity_days to marketplace items (NULL = permanent)
ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS validity_days INTEGER DEFAULT 30;

-- 2. Add expires_at to marketplace purchases
ALTER TABLE marketplace_purchases ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- 3. Seed validity for existing items
UPDATE marketplace_items SET validity_days = 30 WHERE item_type IN ('slot', 'credit_pack', 'feature');

-- 4. Update existing purchases to expire in 30 days from creation (Grace period)
UPDATE marketplace_purchases SET expires_at = created_at + interval '30 days' WHERE expires_at IS NULL;

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_expiry ON marketplace_purchases (expires_at);
CREATE INDEX IF NOT EXISTS idx_marketplace_purchases_school_active ON marketplace_purchases (school_id, expires_at);
