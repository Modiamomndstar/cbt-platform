-- Add configuration columns for anti-cheating and scoring
ALTER TABLE competitions
ADD COLUMN IF NOT EXISTS max_violations INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS negative_marking_rate DECIMAL(5,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS competition_rules TEXT;

-- Update existing records with default rules if empty
UPDATE competitions
SET competition_rules = '1. Automated proctoring is enabled.
2. Switching tabs or browsers will result in a warning.
3. Exceeding the violation threshold will result in automatic submission.
4. Ensure a stable internet connection.'
WHERE competition_rules IS NULL OR competition_rules = '';
