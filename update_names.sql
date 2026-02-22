DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'first_name') THEN
    ALTER TABLE students ADD COLUMN first_name VARCHAR(100);
    ALTER TABLE students ADD COLUMN last_name VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tutors' AND column_name = 'first_name') THEN
    ALTER TABLE tutors ADD COLUMN first_name VARCHAR(100);
    ALTER TABLE tutors ADD COLUMN last_name VARCHAR(100);
  END IF;
END $$;
