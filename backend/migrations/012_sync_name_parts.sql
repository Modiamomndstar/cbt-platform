-- 012_sync_name_parts.sql

-- 1. Function to split full name and update parts
CREATE OR REPLACE FUNCTION split_name_parts(full_name_text TEXT)
RETURNS TABLE(first_name TEXT, last_name TEXT) AS $$
DECLARE
    parts TEXT[];
BEGIN
    parts := string_to_array(trim(full_name_text), ' ');
    first_name := parts[1];
    IF array_length(parts, 1) > 1 THEN
        last_name := array_to_string(parts[2:array_length(parts, 1)], ' ');
    ELSE
        last_name := '.';
    END IF;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- 2. Update existing students
UPDATE students
SET
    first_name = (SELECT first_name FROM split_name_parts(full_name)),
    last_name = (SELECT last_name FROM split_name_parts(full_name))
WHERE first_name IS NULL OR last_name IS NULL OR last_name = '';

-- 3. Update existing tutors
UPDATE tutors
SET
    first_name = (SELECT first_name FROM split_name_parts(full_name)),
    last_name = (SELECT last_name FROM split_name_parts(full_name))
WHERE first_name IS NULL OR last_name IS NULL OR last_name = '';

-- 4. Update existing external_students
UPDATE external_students
SET
    first_name = (SELECT first_name FROM split_name_parts(full_name)),
    last_name = (SELECT last_name FROM split_name_parts(full_name))
WHERE first_name IS NULL OR last_name IS NULL OR last_name = '';

-- Clean up
DROP FUNCTION split_name_parts(TEXT);
