-- Migration 048: Add Crypto settings and Payment Proof columns
-- Adds support for USDT (TRC20) payments and manual verification.

-- 1. Add new global settings
INSERT INTO settings (key, value, description, category) VALUES
('crypto_usdt_trc20_address', 'Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'USDT (TRC20) wallet address for manual payments', 'payment'),
('crypto_usdt_network', 'TRC20', 'Network for the USDT wallet', 'payment'),
('credit_price_usd', '0.1', 'Price of 1 PAYG credit in USD (e.g. $0.1 means 100 credits = $10)', 'monetization'),
('credit_price_ngn', '100', 'Price of 1 PAYG credit in NGN (e.g. 100 NGN means 100 credits = 10,000 NGN)', 'monetization')
ON CONFLICT (key) DO NOTHING;

-- 2. Update payments table to support proof of transfer and pending status
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'proof_attachment_url') THEN
        ALTER TABLE payments ADD COLUMN proof_attachment_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'transaction_hash') THEN
        ALTER TABLE payments ADD COLUMN transaction_hash VARCHAR(255);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'admin_notes') THEN
        ALTER TABLE payments ADD COLUMN admin_notes TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'verified_by_staff_id') THEN
        ALTER TABLE payments ADD COLUMN verified_by_staff_id UUID REFERENCES staff_accounts(id);
    END IF;
END $$;

-- 3. Add index for transaction hash to prevent duplicates/speed up search
CREATE INDEX IF NOT EXISTS idx_payments_transaction_hash ON payments(transaction_hash);
