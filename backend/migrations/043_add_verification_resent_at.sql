-- Add verification_resent_at to schools for rate limiting email resends
ALTER TABLE schools ADD COLUMN IF NOT EXISTS verification_resent_at TIMESTAMP WITH TIME ZONE;
