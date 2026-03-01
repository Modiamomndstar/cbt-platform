-- Migration 027: Refactor Financial Reporting to use existing payments table
-- This removes redundancy from Migration 026 and aligns with the Stripe/Paystack implementation.

-- 1. Drop the views that depend on the old ledger
DROP VIEW IF EXISTS earned_revenue_summary;

-- 2. Clean up redundant table (we will use 'payments' instead)
-- Note: We check if it exists before dropping in case migration failed partially before.
DROP TABLE IF EXISTS subscription_ledger;

-- 3. Re-create Earned Revenue View using 'payments' and 'payg_ledger'
CREATE OR REPLACE VIEW earned_revenue_summary AS
SELECT
    'subscription' as source,
    currency,
    SUM(amount) as total_earned,
    date_trunc('day', created_at) as log_date
FROM payments
WHERE status = 'completed'
GROUP BY currency, date_trunc('day', created_at)
UNION ALL
SELECT
    'payg_utilization' as source,
    currency,
    SUM(amount_paid) as total_earned,
    date_trunc('day', created_at) as log_date
FROM payg_ledger
WHERE type = 'deduction'
GROUP BY currency, date_trunc('day', created_at);

-- 4. Create index on payments(created_at) if not exist for performance
CREATE INDEX IF NOT EXISTS idx_payments_created_at_date ON payments(created_at DESC);
