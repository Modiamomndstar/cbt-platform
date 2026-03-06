-- Migration 033: Messaging System
CREATE TABLE IF NOT EXISTS inbox_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    receiver_id UUID NOT NULL, -- Can be school_id, tutor_id, student_id, or staff_id
    receiver_role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inbox_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL,
    sender_role VARCHAR(20) NOT NULL,
    target_role VARCHAR(20), -- NULL for everyone, or specific role
    target_school_id UUID, -- NULL for all schools, or specific school
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migration 034: Universal Exam Security
ALTER TABLE exams ADD COLUMN IF NOT EXISTS is_secure_mode BOOLEAN DEFAULT false;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS max_violations INTEGER DEFAULT 3;

-- Migration 035: Referral System
ALTER TABLE schools ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS referred_by_id UUID REFERENCES schools(id);

-- Add referral reward settings (create settings table if it doesn't exist)
CREATE TABLE IF NOT EXISTS settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key         VARCHAR(100) UNIQUE NOT NULL,
  value       TEXT,
  description TEXT,
  category    VARCHAR(50),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE settings ADD COLUMN IF NOT EXISTS category VARCHAR(50);

INSERT INTO settings (key, value, description, category)
VALUES ('referral_reward_credits', '100', 'PAYG credits awarded for a successful school referral upgrade', 'referral')
ON CONFLICT (key) DO NOTHING;
