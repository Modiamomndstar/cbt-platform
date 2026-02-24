-- Support for External Students in Schedules and Exams
ALTER TABLE exam_schedules
ADD COLUMN external_student_id UUID REFERENCES external_students(id) ON DELETE CASCADE;

ALTER TABLE exam_schedules
ALTER COLUMN student_id DROP NOT NULL;

-- Ensure a schedule has either a student OR an external student, but not both or neither
ALTER TABLE exam_schedules
ADD CONSTRAINT check_student_or_external
CHECK (
    (student_id IS NOT NULL AND external_student_id IS NULL) OR
    (student_id IS NULL AND external_student_id IS NOT NULL)
);

ALTER TABLE student_exams
ADD COLUMN external_student_id UUID REFERENCES external_students(id) ON DELETE CASCADE;

ALTER TABLE student_exams
ALTER COLUMN student_id DROP NOT NULL;

-- Ensure an exam record has either a student OR an external student
ALTER TABLE student_exams
ADD CONSTRAINT check_exam_student_or_external
CHECK (
    (student_id IS NOT NULL AND external_student_id IS NULL) OR
    (student_id IS NULL AND external_student_id IS NOT NULL)
);
