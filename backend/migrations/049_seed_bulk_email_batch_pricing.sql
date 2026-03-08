-- Migration 049: Seed missing marketplace items for PAYG consumption
-- Adding bulk_email_batch and ai_query_consumption for PAYG credit deduction

INSERT INTO marketplace_items (feature_key, display_name, description, item_type, category, credit_cost) VALUES
  ('bulk_email_batch', 'Bulk Email Batch (10 emails)', 'Deducted when sending a batch of 10 automated emails', 'feature', 'communication', 1),
  ('ai_query_consumption', 'AI Question Generation', 'Deducted for each AI-generated question (after plan limit)', 'feature', 'ai', 1)
ON CONFLICT (feature_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  credit_cost = EXCLUDED.credit_cost,
  updated_at = NOW();
