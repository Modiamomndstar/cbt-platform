-- 013_audit_log_standardization.sql

-- Standardize activity_logs to support detailed auditing for all user types
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS actor_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS target_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS target_id UUID,
  ADD COLUMN IF NOT EXISTS target_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'success'; -- success, failure

-- Ensure external_student_id, ip_address, and user_agent exist (repeat from 009 to be safe)
ALTER TABLE activity_logs
  ADD COLUMN IF NOT EXISTS external_student_id UUID,
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_activity_logs_school ON activity_logs(school_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target ON activity_logs(target_type, target_id);
