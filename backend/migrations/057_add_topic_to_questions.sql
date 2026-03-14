-- Migration 057: Add topic column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic TEXT;

-- Backfill topic from ai_topics if it exists and topic is null
UPDATE questions 
SET topic = ai_topics[1] 
WHERE topic IS NULL AND ai_topics IS NOT NULL AND array_length(ai_topics, 1) > 0;

-- Optionally, add an index for better grouping performance in AI analytics
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
