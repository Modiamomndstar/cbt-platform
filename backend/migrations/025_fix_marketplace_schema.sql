-- Migration 025: Fix Marketplace Schema
-- Adds the missing 'category' column to payg_feature_pricing and aligns seed data.

ALTER TABLE payg_feature_pricing 
ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'other';

-- Update existing items with proper categories
UPDATE payg_feature_pricing SET category = 'capacity' WHERE feature_key IN ('extra_tutor_slot', 'extra_student_slot');
UPDATE payg_feature_pricing SET category = 'ai' WHERE feature_key = 'ai_query_pack';
UPDATE payg_feature_pricing SET category = 'email' WHERE feature_key = 'bulk_email_batch';
UPDATE payg_feature_pricing SET category = 'other' WHERE feature_key = 'report_export_pdf';

-- Ensure item_type is also correct
UPDATE payg_feature_pricing SET item_type = 'capacity' WHERE feature_key IN ('extra_tutor_slot', 'extra_student_slot');
UPDATE payg_feature_pricing SET item_type = 'consumption' WHERE feature_key IN ('bulk_email_batch', 'ai_query_pack', 'report_export_pdf');
