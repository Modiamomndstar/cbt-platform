-- ============================================================
-- Production DB Nuclear Reset Script
-- Run this ONCE on the production server to clean the slate.
-- After running, restart the backend container to re-run
-- init_schema.ts + all migrations from scratch.
--
-- Usage on VM:
--   docker compose -f docker-compose.prod.yml exec db \
--     psql -U postgres -d cbt_platform -f /tmp/reset_prod_db.sql
-- ============================================================

-- Drop all tables in correct dependency order
DROP TABLE IF EXISTS issued_reports CASCADE;
DROP TABLE IF EXISTS competition_participants CASCADE;
DROP TABLE IF EXISTS competition_results CASCADE;
DROP TABLE IF EXISTS competitions CASCADE;
DROP TABLE IF EXISTS finance_ledger CASCADE;
DROP TABLE IF EXISTS payg_ledger CASCADE;
DROP TABLE IF EXISTS payg_wallets CASCADE;
DROP TABLE IF EXISTS coupon_redemptions CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS staff_audit_log CASCADE;
DROP TABLE IF EXISTS staff_accounts CASCADE;
DROP TABLE IF EXISTS school_settings CASCADE;
DROP TABLE IF EXISTS school_subscriptions CASCADE;
DROP TABLE IF EXISTS feature_flags CASCADE;
DROP TABLE IF EXISTS plan_definitions CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS student_tutors CASCADE;
DROP TABLE IF EXISTS student_exams CASCADE;
DROP TABLE IF EXISTS exam_schedules CASCADE;
DROP TABLE IF EXISTS questions CASCADE;
DROP TABLE IF EXISTS exams CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS external_students CASCADE;
DROP TABLE IF EXISTS students CASCADE;
DROP TABLE IF EXISTS tutors CASCADE;
DROP TABLE IF EXISTS student_categories CASCADE;
DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS schools CASCADE;
DROP TABLE IF EXISTS migrations CASCADE;

-- Confirm it's clean
SELECT 'Database cleaned. Now restart the backend container to re-initialise.' as status;
