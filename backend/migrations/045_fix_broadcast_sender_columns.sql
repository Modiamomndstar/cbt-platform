-- Migration 045: Fix Broadcast Table Columns
-- Ensures sender_id and sender_role exist in inbox_broadcasts if they were missed in 033

DO $$
BEGIN
    -- Add sender_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inbox_broadcasts' AND column_name = 'sender_id') THEN
        ALTER TABLE inbox_broadcasts ADD COLUMN sender_id UUID;
    END IF;

    -- Add sender_role if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inbox_broadcasts' AND column_name = 'sender_role') THEN
        ALTER TABLE inbox_broadcasts ADD COLUMN sender_role VARCHAR(20);
    END IF;
END $$;

-- Update existing rows with a default system ID if they have NULL values
UPDATE inbox_broadcasts
SET sender_id = '00000000-0000-0000-0000-000000000000',
    sender_role = 'super_admin'
WHERE sender_id IS NULL;

-- Ensure columns are NOT NULL for future inserts
ALTER TABLE inbox_broadcasts ALTER COLUMN sender_id SET NOT NULL;
ALTER TABLE inbox_broadcasts ALTER COLUMN sender_role SET NOT NULL;
