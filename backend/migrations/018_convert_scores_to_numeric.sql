-- 018_convert_scores_to_numeric.sql

-- student_exams table
ALTER TABLE student_exams ALTER COLUMN score TYPE NUMERIC;
ALTER TABLE student_exams ALTER COLUMN total_marks TYPE NUMERIC;
ALTER TABLE student_exams ALTER COLUMN percentage TYPE NUMERIC;

-- questions table
ALTER TABLE questions ALTER COLUMN marks TYPE NUMERIC;

-- exams table
-- total_marks is already numeric in this table based on previous check, but ensuring consistency
ALTER TABLE exams ALTER COLUMN total_marks TYPE NUMERIC;
ALTER TABLE exams ALTER COLUMN passing_score TYPE NUMERIC;
