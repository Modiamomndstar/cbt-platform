-- Migration 056: Add AI Analysis cache columns

ALTER TABLE exams ADD COLUMN IF NOT EXISTS ai_analysis JSONB;
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS ai_feedback TEXT;

-- Add tracking for the new features in the marketplace (for PAYG if needed)
INSERT INTO marketplace_items (feature_key, display_name, description, item_type, category, credit_cost, batch_size) VALUES
  ('ai_exam_analysis', 'AI Exam Cohort Analysis', 'Generate deep AI insights for an entire exam cohort', 'feature', 'ai', 3, 1),
  ('ai_student_analysis', 'AI Student Attempt Feedback', 'Generate personalized AI feedback for a single student attempt', 'feature', 'ai', 1, 1)
ON CONFLICT (feature_key) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  credit_cost = EXCLUDED.credit_cost;
