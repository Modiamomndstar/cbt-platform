-- 079_standardize_ngn_setting.sql

-- 1. Rename existing credit_price_ngn to payg_credit_price_ngn
UPDATE settings SET key = 'payg_credit_price_ngn' WHERE key = 'credit_price_ngn';

-- 2. Ensure it exists with a default value if missing
INSERT INTO settings (key, value, description, category)
VALUES ('payg_credit_price_ngn', '100', 'Price per PAYG credit in NGN', 'billing')
ON CONFLICT (key) DO NOTHING;
