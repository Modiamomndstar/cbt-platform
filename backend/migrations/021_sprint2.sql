-- Sprint 2: Add trial_warning_sent column for cron job tracking
-- Run this after 001_monetisation.sql

ALTER TABLE school_subscriptions
  ADD COLUMN IF NOT EXISTS trial_warning_sent BOOLEAN DEFAULT FALSE;
