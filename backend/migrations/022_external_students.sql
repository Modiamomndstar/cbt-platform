-- Support for External Students in Schedules and Exams
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_schedules' AND column_name = 'external_student_id') THEN
        ALTER TABLE exam_schedules ADD COLUMN external_student_id UUID REFERENCES external_students(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_student_or_external') THEN
        ALTER TABLE exam_schedules ADD CONSTRAINT check_student_or_external
        CHECK (
            (student_id IS NOT NULL AND external_student_id IS NULL) OR
            (student_id IS NULL AND external_student_id IS NOT NULL)
        );
    END IF;
END $$;

ALTER TABLE exam_schedules ALTER COLUMN student_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_exams' AND column_name = 'external_student_id') THEN
        ALTER TABLE student_exams ADD COLUMN external_student_id UUID REFERENCES external_students(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_exam_student_or_external') THEN
        ALTER TABLE student_exams ADD CONSTRAINT check_exam_student_or_external
        CHECK (
            (student_id IS NOT NULL AND external_student_id IS NULL) OR
            (student_id IS NULL AND external_student_id IS NOT NULL)
        );
    END IF;
END $$;

ALTER TABLE student_exams ALTER COLUMN student_id DROP NOT NULL;
