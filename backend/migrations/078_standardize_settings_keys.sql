-- 078_standardize_settings_keys.sql

-- 1. Rename existing keys to match frontend expectations or standardization
UPDATE settings SET key = 'payg_credit_price_usd' WHERE key = 'credit_price_usd';
UPDATE settings SET key = 'usdt_trc20_address' WHERE key = 'crypto_usdt_trc20_address';

-- 2. Ensure all required settings exist with default values (UPSERT)
INSERT INTO settings (key, value, description, category)
VALUES 
    ('payg_credit_price_usd', '0.05', 'Price per PAYG credit in USD', 'billing'),
    ('usdt_trc20_address', '', 'Platform USDT (TRC20) Wallet Address', 'security'),
    ('yearly_discount_percentage', '20', 'Discount percentage for annual billing', 'billing'),
    ('yearly_discount_active', 'true', 'Enable/disable annual billing discounts', 'billing'),
    ('referral_reward_credits', '50', 'Credits rewarded for successful referrals', 'growth')
ON CONFLICT (key) DO NOTHING;
