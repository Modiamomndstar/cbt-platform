-- Migration 046: Standardize School Verification Columns
-- Ensures both email_verified and is_email_verified work correctly by unifying them

DO $$
BEGIN
    -- 1. Ensure is_email_verified exists (used in newer code)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'schools' AND COLUMN_NAME = 'is_email_verified') THEN
        ALTER TABLE schools ADD COLUMN is_email_verified BOOLEAN DEFAULT FALSE;

        -- If email_verified exists, copy its data
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'schools' AND COLUMN_NAME = 'email_verified') THEN
            UPDATE schools SET is_email_verified = email_verified;
        END IF;
    END IF;

    -- 2. Ensure email_verified exists (used in older/production dump code)
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'schools' AND COLUMN_NAME = 'email_verified') THEN
        ALTER TABLE schools ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;

        -- Copy data from is_email_verified
        UPDATE schools SET email_verified = is_email_verified;
    END IF;

    -- 3. Ensure verification_resent_at exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'schools' AND COLUMN_NAME = 'verification_resent_at') THEN
        ALTER TABLE schools ADD COLUMN verification_resent_at TIMESTAMP;
    END IF;

    -- 4. Ensure email_verification_token exists
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'schools' AND COLUMN_NAME = 'email_verification_token') THEN
        ALTER TABLE schools ADD COLUMN email_verification_token VARCHAR(255);
    END IF;
END $$;
