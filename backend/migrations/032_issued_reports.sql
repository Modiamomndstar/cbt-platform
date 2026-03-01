-- Migration 032: Issued Reports
-- Stores customized advanced report card configurations for students

CREATE TABLE IF NOT EXISTS issued_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL, -- Polychromic reference (schools, tutors, or staff_accounts)
  title           VARCHAR(255) NOT NULL,
  config          JSONB NOT NULL, -- { timeframe, categories, tutors, signature_title, signature_name }
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_issued_reports_student ON issued_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_issued_reports_staff ON issued_reports(staff_id);
