
-- Add username column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS username VARCHAR(100);

-- Create a unique constraint for username per school (or globally? User said unique to afford students with same name. Usually unique per school is enough, but unique globally is safer for login if school_id isn't asked)
-- Let's make it unique per school for now, but if they login with JUST username, it must be globally unique or they need to provide school code.
-- User said "students login details can be their full name... unique...".
-- If I use a single login page for ALL students, username must be globally unique.
-- If I use a school-specific login page (or ask for school ID), it can be scoped.
-- given the previous "Exam Access" uses a specific link or code, "Portal Login" probably expects a simple Username/Password.
-- Let's make it UNIQUE GLOBALLY to simplify the login experience (Student doesn't need to know their School ID).

ALTER TABLE students ADD CONSTRAINT students_username_key UNIQUE (username);

-- Populate existing students with a temporary username based on their ID or Name to avoid null constraint violation if we enforce NOT NULL later.
-- For now, nullable is fine, but we should fill it.
UPDATE students SET username = LOWER(REPLACE(full_name, ' ', '')) || '_' || SUBSTRING(id::text, 1, 4) WHERE username IS NULL;
