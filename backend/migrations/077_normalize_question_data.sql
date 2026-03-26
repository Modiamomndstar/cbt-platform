-- Migration: Normalize question data for consistency
-- This ensures that older questions with cased types or spaces are correctly formatted
-- and that difficulty tags match the new system standards.

-- 1. Normalize question types
UPDATE questions SET question_type = 'multiple_choice' WHERE question_type = 'Multiple Choice';
UPDATE questions SET question_type = 'true_false' WHERE question_type = 'True_False';

-- 2. Standardize difficulty tags for existing questions
UPDATE questions SET difficulty = 'easy' WHERE question_type = 'true_false' AND (difficulty = 'medium' OR difficulty IS NULL);
UPDATE questions SET difficulty = 'hard' WHERE question_type = 'fill_blank' AND (difficulty = 'medium' OR difficulty IS NULL);
UPDATE questions SET difficulty = 'medium' WHERE question_type = 'multiple_choice' AND difficulty IS NULL;
