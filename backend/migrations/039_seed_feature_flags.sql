-- Migration 039: Re-seed feature_flags table
-- Fixes the Feature Overrides section showing empty in production.
-- The previous migration 020 used ON CONFLICT DO NOTHING, but if an empty
-- feature_flags table was created first, the data was never inserted.

INSERT INTO feature_flags (feature_key, feature_name, description, min_plan) VALUES
  ('student_portal',      'Student Portal',           'Full student login portal with results & history', 'basic'),
  ('ai_question_gen',     'AI Question Generation',   'Generate questions using OpenAI', 'advanced'),
  ('bulk_import',         'Bulk CSV Import',           'Upload students/tutors/questions via CSV', 'basic'),
  ('email_notifications', 'Email Notifications',       'Send automated emails to students and tutors', 'basic'),
  ('sms_notifications',   'SMS Notifications',         'Send SMS alerts via Termii/Twilio', 'advanced'),
  ('advanced_analytics',  'Advanced Analytics',        'Cohort analysis, tutor performance, trends', 'advanced'),
  ('custom_branding',     'Custom Branding',           'School logo, colours, custom header', 'advanced'),
  ('api_access',          'API Access',                'REST API for third-party integrations', 'advanced'),
  ('result_pdf',          'Result PDF',                'Download exam results as PDF', 'basic'),
  ('result_export',       'Result Export (Excel/CSV)', 'Export all results as spreadsheet', 'advanced'),
  ('external_students',   'External Students',         'Tutors can add their own external students', 'basic'),
  ('competition_hub',     'Competition Hub',           'Join and create school competitions', 'advanced'),
  ('advanced_reports',    'Advanced Reports',          'Issue downloadable performance reports for students', 'advanced')
ON CONFLICT (feature_key) DO UPDATE SET
  feature_name = EXCLUDED.feature_name,
  description  = EXCLUDED.description,
  min_plan     = EXCLUDED.min_plan;
