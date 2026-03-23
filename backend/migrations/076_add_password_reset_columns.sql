-- Add password reset columns to user tables

-- 1. Schools
ALTER TABLE schools 
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;

-- 2. Tutors
ALTER TABLE tutors 
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;

-- 3. Students
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;

-- 4. Staff Accounts (Super Admin and Company Staff)
ALTER TABLE staff_accounts 
ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMPTZ;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_schools_reset_token ON schools(reset_password_token);
CREATE INDEX IF NOT EXISTS idx_tutors_reset_token ON tutors(reset_password_token);
CREATE INDEX IF NOT EXISTS idx_students_reset_token ON students(reset_password_token);
CREATE INDEX IF NOT EXISTS idx_staff_reset_token ON staff_accounts(reset_password_token);
