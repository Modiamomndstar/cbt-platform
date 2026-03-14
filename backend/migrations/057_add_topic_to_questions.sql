-- Migration 057: Add topic column to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS topic TEXT;

-- Backfill topic from ai_topics if it exists and topic is null
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='questions' AND column_name='ai_topics') THEN
        UPDATE questions 
        SET topic = ai_topics[1] 
        WHERE topic IS NULL AND ai_topics IS NOT NULL AND array_length(ai_topics, 1) > 0;
    END IF;
END $$;

-- Optionally, add an index for better grouping performance in AI analytics
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);
