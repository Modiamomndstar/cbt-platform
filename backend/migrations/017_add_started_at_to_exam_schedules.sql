-- 017_add_started_at_to_exam_schedules.sql

-- Add started_at column if it does not exist
ALTER TABLE exam_schedules ADD COLUMN IF NOT EXISTS started_at TIMESTAMP;

-- While we're at it, ensuring login_username and login_password columns are present
-- As we've seen they're used in the codebase instead of access_code/exam_username/exam_password
ALTER TABLE exam_schedules ADD COLUMN IF NOT EXISTS login_username VARCHAR(50);
ALTER TABLE exam_schedules ADD COLUMN IF NOT EXISTS login_password VARCHAR(255);
