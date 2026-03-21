-- Migration to add the missing 'advanced_plus' plan to the production database
-- This ensures the plan is available in the super-admin monetization dashboard.

INSERT INTO plan_definitions (
    plan_type, display_name, price_usd, price_ngn, trial_days,
    max_tutors, max_internal_students, max_external_per_tutor,
    max_active_exams, ai_queries_per_month,
    allow_student_portal, allow_external_students, allow_bulk_import,
    allow_email_notifications, allow_sms_notifications,
    allow_advanced_analytics, allow_custom_branding,
    allow_api_access, allow_result_pdf, allow_result_export,
    max_ai_queries_per_student, max_ai_queries_per_tutor, allow_lms,
    is_active, updated_at
) VALUES (
    'advanced_plus', 'Advanced Plus', 30.00, 30000.00, 0,
    20, 500, 0,
    NULL, 400,
    true, false, false,
    false, false,
    true, true,
    false, false, false,
    20, 200, true,
    true, NOW()
)
ON CONFLICT (plan_type) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    price_usd = EXCLUDED.price_usd,
    price_ngn = EXCLUDED.price_ngn,
    max_tutors = EXCLUDED.max_tutors,
    max_internal_students = EXCLUDED.max_internal_students,
    ai_queries_per_month = EXCLUDED.ai_queries_per_month,
    allow_advanced_analytics = EXCLUDED.allow_advanced_analytics,
    allow_custom_branding = EXCLUDED.allow_custom_branding,
    max_ai_queries_per_student = EXCLUDED.max_ai_queries_per_student,
    max_ai_queries_per_tutor = EXCLUDED.max_ai_queries_per_tutor,
    allow_lms = EXCLUDED.allow_lms,
    updated_at = NOW();
