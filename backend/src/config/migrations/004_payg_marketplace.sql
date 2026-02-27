-- =============================================
-- Migration 004: PAYG Marketplace & Strategic Defaults
-- Refines limits for African market and adds Marketplace slots
-- =============================================

-- 1. Adjust Strategic Defaults for African Market
UPDATE plan_definitions SET max_tutors = 5, max_internal_students = 150, ai_queries_per_month = 30 WHERE plan_type = 'basic';
UPDATE plan_definitions SET max_tutors = 15, max_internal_students = 500, ai_queries_per_month = 100 WHERE plan_type = 'advanced';
UPDATE plan_definitions SET max_tutors = 2, max_internal_students = 20, ai_queries_per_month = 0 WHERE plan_type = 'freemium';

-- 2. Add Marketplace Capacity Columns to School Subscriptions
ALTER TABLE school_subscriptions ADD COLUMN IF NOT EXISTS purchased_tutor_slots INTEGER DEFAULT 0;
ALTER TABLE school_subscriptions ADD COLUMN IF NOT EXISTS purchased_student_slots INTEGER DEFAULT 0;
ALTER TABLE school_subscriptions ADD COLUMN IF NOT EXISTS purchased_ai_queries INTEGER DEFAULT 0;

-- 3. Create Feature Pricing Table (Marketplace Items)
-- Clean drop for precise schema matching
DROP TABLE IF EXISTS payg_feature_pricing;

CREATE TABLE payg_feature_pricing (
  feature_key         VARCHAR(100) PRIMARY KEY,
  display_name       VARCHAR(255) NOT NULL,
  credit_cost        INTEGER NOT NULL,
  is_active          BOOLEAN DEFAULT true,
  batch_size         INTEGER DEFAULT 1,  -- e.g. 10 emails for 1 credit
  item_type          VARCHAR(50) NOT NULL DEFAULT 'consumption', -- 'consumption' (one-time) or 'capacity' (slots)
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Seed Marketplace Items
INSERT INTO payg_feature_pricing (feature_key, display_name, credit_cost, is_active, batch_size, item_type) VALUES
('extra_tutor_slot', 'Extra Tutor Slot', 100, true, 1, 'capacity'),
('extra_student_slot', 'Extra Student Slot (Pack of 50)', 150, true, 50, 'capacity'),
('bulk_email_batch', 'Bulk Email (Pack of 10)', 1, true, 10, 'consumption'),
('ai_query_pack', '50 AI Question Queries', 50, true, 50, 'consumption'),
('report_export_pdf', 'Advanced PDF Report Export', 5, true, 1, 'consumption')
ON CONFLICT (feature_key) DO UPDATE SET
  credit_cost = EXCLUDED.credit_cost,
  display_name = EXCLUDED.display_name,
  item_type = EXCLUDED.item_type,
  batch_size = EXCLUDED.batch_size,
  updated_at = NOW();
