-- 059_platform_analytics.sql

-- Visitor Tracking Table
CREATE TABLE IF NOT EXISTS visitor_traffic (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path VARCHAR(255) NOT NULL,
    session_id UUID, -- For tracking unique user sessions if available
    ip_hash VARCHAR(64), -- Anonymized IP address (SHA-256)
    user_agent TEXT,
    referrer TEXT,
    device_type VARCHAR(50), -- mobile, desktop, tablet
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for high-performance traffic analysis
CREATE INDEX IF NOT EXISTS idx_visitor_traffic_path ON visitor_traffic(path);
CREATE INDEX IF NOT EXISTS idx_visitor_traffic_created_at ON visitor_traffic(created_at DESC);

-- Engagement Performance Indexes
-- Optimize activity_logs for segmented engagement queries (logins, etc)
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_date ON activity_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type_date ON activity_logs(user_id, created_at DESC);

-- Optimize user creation tracking
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schools_created_at ON schools(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutors_created_at ON tutors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_students_created_at ON students(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_staff_accounts_created_at ON staff_accounts(created_at DESC);
