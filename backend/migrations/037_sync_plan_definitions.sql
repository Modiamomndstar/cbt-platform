-- Migration to synchronize plan definitions with the updated schema used in init_schema.ts and seed.ts
-- Resolves NaN pricing issue by ensuring all columns exist and are correctly seeded.

DO $$
BEGIN
    -- 1. Ensure plan_definitions table exists with correct schema
    CREATE TABLE IF NOT EXISTS plan_definitions (
        plan_type          VARCHAR(50) PRIMARY KEY,
        display_name       VARCHAR(100) NOT NULL,
        price_usd          DECIMAL(10,2) DEFAULT 0,
        price_ngn          DECIMAL(10,2) DEFAULT 0,
        trial_days         INTEGER DEFAULT 0,
        max_tutors         INTEGER,
        max_internal_students INTEGER,
        max_external_per_tutor INTEGER DEFAULT 0,
        max_active_exams   INTEGER,
        ai_queries_per_month INTEGER DEFAULT 0,
        allow_student_portal        BOOLEAN DEFAULT false,
        allow_external_students     BOOLEAN DEFAULT false,
        allow_bulk_import           BOOLEAN DEFAULT false,
        allow_email_notifications   BOOLEAN DEFAULT false,
        allow_sms_notifications     BOOLEAN DEFAULT false,
        allow_advanced_analytics    BOOLEAN DEFAULT false,
        allow_custom_branding       BOOLEAN DEFAULT false,
        allow_api_access            BOOLEAN DEFAULT false,
        allow_result_pdf            BOOLEAN DEFAULT false,
        allow_result_export         BOOLEAN DEFAULT false,
        extra_internal_student_price_usd DECIMAL(10,4) DEFAULT 0,
        extra_external_student_price_usd DECIMAL(10,4) DEFAULT 0,
        is_active          BOOLEAN DEFAULT true,
        max_ai_queries_per_student INTEGER DEFAULT 5,
        max_ai_queries_per_tutor INTEGER DEFAULT 50,
        updated_at         TIMESTAMPTZ DEFAULT NOW()
    );

    -- 2. Update/Insert core plan definitions (matching seed.ts)
    INSERT INTO plan_definitions (
        plan_type, display_name, price_usd, price_ngn, trial_days,
        max_tutors, max_internal_students, max_external_per_tutor, max_active_exams, ai_queries_per_month,
        allow_email_notifications,
        allow_sms_notifications, allow_advanced_analytics, allow_custom_branding, allow_api_access,
        allow_result_pdf, allow_result_export,
        max_ai_queries_per_student, max_ai_queries_per_tutor
    ) VALUES
    ('freemium', 'Free', 0, 0, 0,
      2, 20, 5, 5, 0,
      false, false, false, false,
      false, false, false, false,
      false, false,
      5, 50),
    ('basic', 'Basic Premium', 4.99, 8000, 14,
      10, 300, 30, NULL, 30,
      true, true, true, true,
      false, false, false, false,
      true, false,
      15, 60),
    ('advanced', 'Advanced Premium', 14.99, 24000, 14,
      50, 2000, 200, NULL, 200,
      true, true, true, true,
      true, true, true, true,
      true, true,
      40, 100),
    ('enterprise', 'Enterprise', 0, 0, 14,
      NULL, NULL, NULL, NULL, NULL,
      true, true, true, true,
      true, true, true, true,
      true, true,
      50, 200)
    ON CONFLICT (plan_type) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        price_usd = EXCLUDED.price_usd,
        price_ngn = EXCLUDED.price_ngn,
        trial_days = EXCLUDED.trial_days,
        max_tutors = EXCLUDED.max_tutors,
        max_internal_students = EXCLUDED.max_internal_students,
        max_external_per_tutor = EXCLUDED.max_external_per_tutor,
        max_active_exams = EXCLUDED.max_active_exams,
        ai_queries_per_month = EXCLUDED.ai_queries_per_month,
        allow_student_portal = EXCLUDED.allow_student_portal,
        allow_external_students = EXCLUDED.allow_external_students,
        allow_bulk_import = EXCLUDED.allow_bulk_import,
        allow_email_notifications = EXCLUDED.allow_email_notifications,
        allow_sms_notifications = EXCLUDED.allow_sms_notifications,
        allow_advanced_analytics = EXCLUDED.allow_advanced_analytics,
        allow_custom_branding = EXCLUDED.allow_custom_branding,
        allow_api_access = EXCLUDED.allow_api_access,
        allow_result_pdf = EXCLUDED.allow_result_pdf,
        allow_result_export = EXCLUDED.allow_result_export,
        max_ai_queries_per_student = EXCLUDED.max_ai_queries_per_student,
        max_ai_queries_per_tutor = EXCLUDED.max_ai_queries_per_tutor,
        updated_at = NOW();

    -- 3. Cleanup: Drop obsolete payment_plans if it exists
    -- Optional: If you want to keep it for history, don't drop it.
    -- But since init_schema.ts was updated to not create it, it's better to remove it if empty.
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_plans') THEN
        -- If it's a legacy table, we might want to keep it or migrate data.
        -- For now, let's just leave it but ensure foreign keys in payments are updated.
        ALTER TABLE IF EXISTS payments
        DROP CONSTRAINT IF EXISTS payments_plan_id_fkey;

        -- Add the new column if missing
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'plan_type') THEN
            ALTER TABLE payments ADD COLUMN plan_type VARCHAR(50) REFERENCES plan_definitions(plan_type);
        END IF;
    END IF;

END $$;
