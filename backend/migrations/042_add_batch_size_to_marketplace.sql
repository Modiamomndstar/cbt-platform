-- Migration: Add batch_size to marketplace_items
-- This aligns the table with the requirements of billing.ts

ALTER TABLE marketplace_items ADD COLUMN IF NOT EXISTS batch_size INTEGER DEFAULT 1;

-- Update existing items with their correct batch sizes
UPDATE marketplace_items SET batch_size = 100 WHERE feature_key = 'extra_student_pack';
UPDATE marketplace_items SET batch_size = 10 WHERE feature_key = 'ai_credits_10';
UPDATE marketplace_items SET batch_size = 50 WHERE feature_key = 'ai_credits_50';

-- Standardize names to match what billing.ts might expect if we want to be safe,
-- but better to fix the code to match the database seeds.
