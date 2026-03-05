--
-- PostgreSQL database dump
--

\restrict C7AcUE4tTVJjXgIDXFJRvVcrznvMDA9NK5SarpODHORrLIGIjzum0eej7pgUmSJ

-- Dumped from database version 15.15 (Debian 15.15-1.pgdg13+1)
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$

BEGIN

    NEW.updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;

END;

$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    user_type character varying(50) NOT NULL,
    school_id uuid,
    action character varying(100) NOT NULL,
    resource_type character varying(50),
    resource_id uuid,
    details jsonb,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    external_student_id uuid,
    actor_name character varying(255),
    target_type character varying(50),
    target_id uuid,
    target_name character varying(255),
    severity character varying(20) DEFAULT 'info'::character varying,
    status character varying(20) DEFAULT 'success'::character varying
);


--
-- Name: competition_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competition_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    min_age integer,
    max_age integer,
    min_grade character varying(50),
    max_grade character varying(50),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: competition_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competition_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_id uuid NOT NULL,
    school_id uuid NOT NULL,
    student_id uuid NOT NULL,
    competition_category_id uuid NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    registration_date timestamp with time zone DEFAULT now(),
    CONSTRAINT competition_registrations_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'disqualified'::character varying, 'active'::character varying])::text[])))
);


--
-- Name: competition_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competition_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    registration_id uuid NOT NULL,
    stage_id uuid NOT NULL,
    score numeric(5,2) DEFAULT 0,
    completion_time_seconds integer,
    difficulty_metrics jsonb DEFAULT '{}'::jsonb,
    is_qualified boolean DEFAULT false,
    is_winner boolean DEFAULT false,
    award_type character varying(100),
    certificate_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: competition_rewards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competition_rewards (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    competition_id uuid NOT NULL,
    rank_from integer NOT NULL,
    rank_to integer NOT NULL,
    reward_title text NOT NULL,
    reward_description text,
    reward_value numeric(10,2),
    reward_type character varying(50) DEFAULT 'cash'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: competition_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competition_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    competition_category_id uuid NOT NULL,
    stage_number integer NOT NULL,
    title character varying(255) NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    duration_minutes integer DEFAULT 60,
    total_questions integer DEFAULT 50,
    qualification_threshold jsonb DEFAULT '{"type": "score_percent", "value": 70}'::jsonb,
    questions_config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: competitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.competitions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    scope character varying(50) NOT NULL,
    visibility character varying(50) DEFAULT 'public'::character varying NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    target_countries text[] DEFAULT '{}'::text[],
    target_regions text[] DEFAULT '{}'::text[],
    eligibility_config jsonb DEFAULT '{}'::jsonb,
    rewards_config jsonb DEFAULT '{}'::jsonb,
    certificate_template jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    max_violations integer DEFAULT 3,
    negative_marking_rate numeric(5,2) DEFAULT 0.00,
    competition_rules text,
    auto_promote boolean DEFAULT true,
    banner_url text,
    is_featured boolean DEFAULT false,
    CONSTRAINT competitions_scope_check CHECK (((scope)::text = ANY ((ARRAY['local'::character varying, 'national'::character varying, 'global'::character varying])::text[]))),
    CONSTRAINT competitions_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'registration_open'::character varying, 'exam_in_progress'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT competitions_visibility_check CHECK (((visibility)::text = ANY ((ARRAY['public'::character varying, 'private'::character varying])::text[])))
);


--
-- Name: coupon_redemptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupon_redemptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coupon_id uuid NOT NULL,
    school_id uuid NOT NULL,
    redeemed_at timestamp with time zone DEFAULT now(),
    plan_type character varying(50),
    discount_applied numeric(10,2)
);


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    type character varying(30) NOT NULL,
    value numeric(10,2) NOT NULL,
    applicable_plans text[] DEFAULT ARRAY['basic'::text, 'advanced'::text, 'enterprise'::text],
    billing_cycles text[] DEFAULT ARRAY['monthly'::text, 'annual'::text],
    max_uses integer,
    uses_per_school integer DEFAULT 1,
    current_uses integer DEFAULT 0,
    valid_from timestamp with time zone DEFAULT now(),
    valid_until timestamp with time zone,
    requires_annual boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by_staff_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT coupons_type_check CHECK (((type)::text = ANY ((ARRAY['percent_off'::character varying, 'amount_off'::character varying, 'free_months'::character varying, 'bonus_credits'::character varying])::text[])))
);


--
-- Name: payg_ledger; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payg_ledger (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    type character varying(20) NOT NULL,
    credits integer NOT NULL,
    balance_after integer NOT NULL,
    description text,
    feature_key character varying(100),
    stripe_payment_id character varying(255),
    paystack_reference character varying(255),
    created_by_staff_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    currency character varying(10) DEFAULT 'NGN'::character varying,
    amount_paid numeric(10,2) DEFAULT 0,
    metadata jsonb,
    CONSTRAINT payg_ledger_type_check CHECK (((type)::text = ANY ((ARRAY['topup'::character varying, 'deduction'::character varying, 'gift'::character varying, 'adjustment'::character varying])::text[])))
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    school_id uuid NOT NULL,
    amount numeric(10,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    payment_method character varying(50),
    provider character varying(50) NOT NULL,
    provider_payment_id character varying(255),
    provider_reference character varying(255),
    status character varying(50) DEFAULT 'pending'::character varying,
    plan_type character varying(50),
    plan_duration_months integer DEFAULT 1,
    metadata jsonb,
    paid_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: earned_revenue_summary; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.earned_revenue_summary AS
 SELECT 'subscription'::text AS source,
    payments.currency,
    sum(payments.amount) AS total_earned,
    date_trunc('day'::text, payments.created_at) AS log_date
   FROM public.payments
  WHERE ((payments.status)::text = 'completed'::text)
  GROUP BY payments.currency, (date_trunc('day'::text, payments.created_at))
UNION ALL
 SELECT 'payg_utilization'::text AS source,
    payg_ledger.currency,
    sum(payg_ledger.amount_paid) AS total_earned,
    date_trunc('day'::text, payg_ledger.created_at) AS log_date
   FROM public.payg_ledger
  WHERE ((payg_ledger.type)::text = 'deduction'::text)
  GROUP BY payg_ledger.currency, (date_trunc('day'::text, payg_ledger.created_at));


--
-- Name: email_queue; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_queue (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    to_email character varying(255) NOT NULL,
    to_name character varying(255),
    subject character varying(255) NOT NULL,
    body_html text,
    body_text text,
    template_name character varying(100),
    template_data jsonb,
    status character varying(50) DEFAULT 'pending'::character varying,
    attempts integer DEFAULT 0,
    last_error text,
    sent_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: exam_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: exam_schedules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exam_schedules (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    exam_id uuid NOT NULL,
    student_id uuid,
    scheduled_date date NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    timezone character varying(50) DEFAULT 'Africa/Lagos'::character varying,
    status character varying(50) DEFAULT 'scheduled'::character varying,
    login_username character varying(100) NOT NULL,
    login_password character varying(100) NOT NULL,
    attempt_count integer DEFAULT 0,
    max_attempts integer DEFAULT 1,
    email_sent boolean DEFAULT false,
    email_sent_at timestamp without time zone,
    rescheduled_by uuid,
    rescheduled_at timestamp without time zone,
    reschedule_reason text,
    original_schedule_id uuid,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp without time zone,
    auto_submitted boolean DEFAULT false,
    external_student_id uuid,
    started_at timestamp without time zone,
    competition_stage_id uuid,
    CONSTRAINT check_exam_schedule_student CHECK ((((student_id IS NOT NULL) AND (external_student_id IS NULL)) OR ((student_id IS NULL) AND (external_student_id IS NOT NULL)))),
    CONSTRAINT check_student_or_external CHECK ((((student_id IS NOT NULL) AND (external_student_id IS NULL)) OR ((student_id IS NULL) AND (external_student_id IS NOT NULL))))
);


--
-- Name: exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    school_id uuid NOT NULL,
    tutor_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    description text,
    instructions text,
    duration integer DEFAULT 60 NOT NULL,
    total_questions integer DEFAULT 50 NOT NULL,
    passing_score numeric DEFAULT 50,
    shuffle_questions boolean DEFAULT true,
    shuffle_options boolean DEFAULT true,
    show_result_immediately boolean DEFAULT true,
    allow_review boolean DEFAULT false,
    is_published boolean DEFAULT false,
    publish_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category_id uuid,
    total_marks numeric DEFAULT 0,
    is_secure_mode boolean DEFAULT false,
    max_violations integer DEFAULT 3
);


--
-- Name: external_students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.external_students (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tutor_id uuid NOT NULL,
    school_id uuid NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(20),
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    category_id uuid,
    bio text,
    avatar_url text,
    last_login_at timestamp without time zone,
    first_name character varying(100),
    last_name character varying(100),
    level_class character varying(255)
);


--
-- Name: feature_flags; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_flags (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    feature_key character varying(100) NOT NULL,
    feature_name character varying(255) NOT NULL,
    description text,
    min_plan character varying(50) DEFAULT 'freemium'::character varying NOT NULL,
    is_enabled boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: inbox_broadcasts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbox_broadcasts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    sender_role character varying(20) NOT NULL,
    target_role character varying(20),
    target_school_id uuid,
    title character varying(255) NOT NULL,
    content text NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: inbox_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inbox_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id uuid NOT NULL,
    sender_role character varying(20) NOT NULL,
    receiver_id uuid NOT NULL,
    receiver_role character varying(20) NOT NULL,
    content text NOT NULL,
    is_read boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: issued_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issued_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    student_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    title character varying(255) NOT NULL,
    config jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: learning_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.learning_materials (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    tutor_id uuid NOT NULL,
    exam_id uuid,
    title character varying(255) NOT NULL,
    content text,
    file_url text,
    file_type character varying(50),
    file_size integer,
    topics text[],
    ai_processed boolean DEFAULT false,
    ai_extracted_questions jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: payg_feature_pricing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payg_feature_pricing (
    feature_key character varying(100) NOT NULL,
    display_name character varying(255) NOT NULL,
    credit_cost integer NOT NULL,
    is_active boolean DEFAULT true,
    batch_size integer DEFAULT 1,
    item_type character varying(50) DEFAULT 'consumption'::character varying NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    category character varying(100) DEFAULT 'other'::character varying
);


--
-- Name: payg_wallets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payg_wallets (
    school_id uuid NOT NULL,
    balance_credits integer DEFAULT 0,
    currency character varying(10) DEFAULT 'NGN'::character varying,
    auto_topup_enabled boolean DEFAULT false,
    auto_topup_threshold integer DEFAULT 20,
    auto_topup_amount integer DEFAULT 100,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: plan_definitions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_definitions (
    plan_type character varying(50) NOT NULL,
    display_name character varying(100) NOT NULL,
    price_usd numeric(10,2) DEFAULT 0,
    price_ngn numeric(10,2) DEFAULT 0,
    trial_days integer DEFAULT 0,
    max_tutors integer,
    max_internal_students integer,
    max_external_per_tutor integer DEFAULT 0,
    max_active_exams integer,
    ai_queries_per_month integer DEFAULT 0,
    allow_student_portal boolean DEFAULT false,
    allow_external_students boolean DEFAULT false,
    allow_bulk_import boolean DEFAULT false,
    allow_email_notifications boolean DEFAULT false,
    allow_sms_notifications boolean DEFAULT false,
    allow_advanced_analytics boolean DEFAULT false,
    allow_custom_branding boolean DEFAULT false,
    allow_api_access boolean DEFAULT false,
    allow_result_pdf boolean DEFAULT false,
    allow_result_export boolean DEFAULT false,
    extra_internal_student_price_usd numeric(10,4) DEFAULT 0,
    extra_external_student_price_usd numeric(10,4) DEFAULT 0,
    is_active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: questions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.questions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    exam_id uuid NOT NULL,
    question_text text NOT NULL,
    question_type character varying(50) NOT NULL,
    options jsonb,
    correct_answer text NOT NULL,
    explanation text,
    marks numeric DEFAULT 5 NOT NULL,
    difficulty character varying(20) DEFAULT 'medium'::character varying,
    sort_order integer DEFAULT 0,
    is_ai_generated boolean DEFAULT false,
    ai_source_material text,
    ai_topics text[],
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    image_url text
);


--
-- Name: school_settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_settings (
    school_id uuid NOT NULL,
    allow_external_students boolean DEFAULT true,
    max_external_per_tutor integer DEFAULT 30,
    allow_tutor_create_students boolean DEFAULT true,
    student_portal_enabled boolean DEFAULT true,
    result_release_mode character varying(20) DEFAULT 'immediate'::character varying,
    allow_student_pdf_download boolean DEFAULT false,
    default_exam_attempts integer DEFAULT 1,
    email_on_exam_complete boolean DEFAULT true,
    email_on_new_student boolean DEFAULT true,
    email_on_results_release boolean DEFAULT true,
    primary_color character varying(20) DEFAULT '#6366f1'::character varying,
    updated_at timestamp with time zone DEFAULT now(),
    allow_tutor_edit_categories boolean DEFAULT true,
    report_signature_title character varying(255),
    report_signature_name character varying(255),
    CONSTRAINT school_settings_result_release_mode_check CHECK (((result_release_mode)::text = ANY ((ARRAY['immediate'::character varying, 'manual'::character varying])::text[])))
);


--
-- Name: school_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.school_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    school_id uuid,
    plan_type character varying(50) DEFAULT 'freemium'::character varying NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying,
    billing_cycle character varying(20) DEFAULT 'monthly'::character varying,
    currency character varying(10) DEFAULT 'NGN'::character varying,
    amount numeric(10,2) DEFAULT 0,
    trial_start timestamp with time zone,
    trial_end timestamp with time zone,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    stripe_subscription_id character varying(255),
    paystack_subscription_code character varying(255),
    extra_internal_students integer DEFAULT 0,
    extra_external_students integer DEFAULT 0,
    override_plan character varying(50),
    override_expires_at timestamp with time zone,
    override_reason text,
    override_by_staff_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    cancelled_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    trial_warning_sent boolean DEFAULT false,
    override_features jsonb DEFAULT '{}'::jsonb,
    purchased_tutor_slots integer DEFAULT 0,
    purchased_student_slots integer DEFAULT 0,
    purchased_ai_queries integer DEFAULT 0,
    is_capacity_frozen boolean DEFAULT false,
    CONSTRAINT school_subscriptions_billing_cycle_check CHECK (((billing_cycle)::text = ANY ((ARRAY['monthly'::character varying, 'annual'::character varying, 'payg'::character varying, 'free'::character varying])::text[]))),
    CONSTRAINT school_subscriptions_status_check CHECK (((status)::text = ANY ((ARRAY['trialing'::character varying, 'active'::character varying, 'past_due'::character varying, 'cancelled'::character varying, 'expired'::character varying, 'gifted'::character varying, 'suspended'::character varying])::text[])))
);


--
-- Name: schools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schools (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(255) NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(50),
    address text,
    description text,
    logo_url text,
    country character varying(100) DEFAULT 'Nigeria'::character varying,
    timezone character varying(50) DEFAULT 'Africa/Lagos'::character varying,
    is_active boolean DEFAULT true,
    email_verified boolean DEFAULT false,
    plan_type character varying(50) DEFAULT 'free'::character varying,
    plan_status character varying(50) DEFAULT 'active'::character varying,
    plan_expires_at timestamp without time zone,
    stripe_customer_id character varying(255),
    stripe_subscription_id character varying(255),
    paystack_customer_code character varying(255),
    paystack_subscription_code character varying(255),
    last_payment_at timestamp without time zone,
    next_payment_at timestamp without time zone,
    total_paid numeric(10,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    state character varying(100),
    referral_code character varying(20),
    referred_by_id uuid
);


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    key character varying(100) NOT NULL,
    value text,
    description text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    category character varying(50)
);


--
-- Name: staff_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    last_login_at timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT staff_accounts_role_check CHECK (((role)::text = ANY ((ARRAY['customer_success'::character varying, 'support_agent'::character varying, 'finance'::character varying, 'sales_manager'::character varying, 'content_reviewer'::character varying])::text[])))
);


--
-- Name: staff_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_audit_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_type character varying(20) NOT NULL,
    actor_id uuid,
    actor_name character varying(255),
    action character varying(100) NOT NULL,
    target_type character varying(50),
    target_id uuid,
    target_name character varying(255),
    details jsonb,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT staff_audit_log_actor_type_check CHECK (((actor_type)::text = ANY ((ARRAY['super_admin'::character varying, 'staff'::character varying])::text[])))
);


--
-- Name: student_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_categories (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    school_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    color character varying(7) DEFAULT '#4F46E5'::character varying,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    tutor_id uuid
);


--
-- Name: student_exams; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_exams (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    exam_schedule_id uuid NOT NULL,
    student_id uuid,
    exam_id uuid NOT NULL,
    answers jsonb DEFAULT '{}'::jsonb,
    score numeric DEFAULT 0,
    total_marks numeric NOT NULL,
    percentage numeric DEFAULT 0,
    status character varying(50) DEFAULT 'in_progress'::character varying,
    started_at timestamp without time zone,
    completed_at timestamp without time zone,
    time_spent_minutes integer DEFAULT 0,
    tab_switch_count integer DEFAULT 0,
    fullscreen_exits integer DEFAULT 0,
    ip_address inet,
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    auto_submitted boolean DEFAULT false,
    assigned_questions jsonb,
    external_student_id uuid,
    historical_category_id uuid,
    historical_level_name character varying(255),
    snapshot_metadata jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT check_exam_student_or_external CHECK ((((student_id IS NOT NULL) AND (external_student_id IS NULL)) OR ((student_id IS NULL) AND (external_student_id IS NOT NULL)))),
    CONSTRAINT check_student_exam_student CHECK ((((student_id IS NOT NULL) AND (external_student_id IS NULL)) OR ((student_id IS NULL) AND (external_student_id IS NOT NULL))))
);


--
-- Name: student_tutors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_tutors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    student_id uuid NOT NULL,
    tutor_id uuid NOT NULL,
    assigned_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    school_id uuid NOT NULL,
    category_id uuid,
    student_id character varying(100) NOT NULL,
    full_name character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    date_of_birth date,
    gender character varying(10),
    address text,
    parent_name character varying(255),
    parent_phone character varying(50),
    parent_email character varying(255),
    avatar_url text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    username character varying(100),
    first_name character varying(100),
    last_name character varying(100),
    password_hash character varying(255)
);


--
-- Name: tutors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutors (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    school_id uuid NOT NULL,
    username character varying(100) NOT NULL,
    password_hash character varying(255) NOT NULL,
    email character varying(255),
    phone character varying(50),
    full_name character varying(255) NOT NULL,
    subjects text[],
    bio text,
    avatar_url text,
    is_active boolean DEFAULT true,
    last_login_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    deleted_at timestamp without time zone,
    first_name character varying(100),
    last_name character varying(100)
);


--
-- Name: unearned_revenue_report; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.unearned_revenue_report AS
 SELECT payg_wallets.currency,
    sum(payg_wallets.balance_credits) AS total_credits_held,
    count(*) AS school_count
   FROM public.payg_wallets
  GROUP BY payg_wallets.currency;


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: competition_categories competition_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_categories
    ADD CONSTRAINT competition_categories_pkey PRIMARY KEY (id);


--
-- Name: competition_registrations competition_registrations_competition_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_registrations
    ADD CONSTRAINT competition_registrations_competition_id_student_id_key UNIQUE (competition_id, student_id);


--
-- Name: competition_registrations competition_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_registrations
    ADD CONSTRAINT competition_registrations_pkey PRIMARY KEY (id);


--
-- Name: competition_results competition_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_results
    ADD CONSTRAINT competition_results_pkey PRIMARY KEY (id);


--
-- Name: competition_results competition_results_registration_id_stage_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_results
    ADD CONSTRAINT competition_results_registration_id_stage_id_key UNIQUE (registration_id, stage_id);


--
-- Name: competition_rewards competition_rewards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_rewards
    ADD CONSTRAINT competition_rewards_pkey PRIMARY KEY (id);


--
-- Name: competition_stages competition_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_stages
    ADD CONSTRAINT competition_stages_pkey PRIMARY KEY (id);


--
-- Name: competitions competitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_pkey PRIMARY KEY (id);


--
-- Name: coupon_redemptions coupon_redemptions_coupon_id_school_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_coupon_id_school_id_key UNIQUE (coupon_id, school_id);


--
-- Name: coupon_redemptions coupon_redemptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_pkey PRIMARY KEY (id);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: email_queue email_queue_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_queue
    ADD CONSTRAINT email_queue_pkey PRIMARY KEY (id);


--
-- Name: exam_categories exam_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_categories
    ADD CONSTRAINT exam_categories_pkey PRIMARY KEY (id);


--
-- Name: exam_categories exam_categories_school_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_categories
    ADD CONSTRAINT exam_categories_school_id_name_key UNIQUE (school_id, name);


--
-- Name: exam_schedules exam_schedules_exam_id_student_id_scheduled_date_start_time_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_exam_id_student_id_scheduled_date_start_time_key UNIQUE (exam_id, student_id, scheduled_date, start_time);


--
-- Name: exam_schedules exam_schedules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_pkey PRIMARY KEY (id);


--
-- Name: exams exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_pkey PRIMARY KEY (id);


--
-- Name: external_students external_students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_students
    ADD CONSTRAINT external_students_pkey PRIMARY KEY (id);


--
-- Name: external_students external_students_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_students
    ADD CONSTRAINT external_students_username_key UNIQUE (username);


--
-- Name: feature_flags feature_flags_feature_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_feature_key_key UNIQUE (feature_key);


--
-- Name: feature_flags feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_pkey PRIMARY KEY (id);


--
-- Name: inbox_broadcasts inbox_broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbox_broadcasts
    ADD CONSTRAINT inbox_broadcasts_pkey PRIMARY KEY (id);


--
-- Name: inbox_messages inbox_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inbox_messages
    ADD CONSTRAINT inbox_messages_pkey PRIMARY KEY (id);


--
-- Name: issued_reports issued_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issued_reports
    ADD CONSTRAINT issued_reports_pkey PRIMARY KEY (id);


--
-- Name: learning_materials learning_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_materials
    ADD CONSTRAINT learning_materials_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: payg_feature_pricing payg_feature_pricing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payg_feature_pricing
    ADD CONSTRAINT payg_feature_pricing_pkey PRIMARY KEY (feature_key);


--
-- Name: payg_ledger payg_ledger_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payg_ledger
    ADD CONSTRAINT payg_ledger_pkey PRIMARY KEY (id);


--
-- Name: payg_wallets payg_wallets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payg_wallets
    ADD CONSTRAINT payg_wallets_pkey PRIMARY KEY (school_id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: plan_definitions plan_definitions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_definitions
    ADD CONSTRAINT plan_definitions_pkey PRIMARY KEY (plan_type);


--
-- Name: questions questions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_pkey PRIMARY KEY (id);


--
-- Name: school_settings school_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_pkey PRIMARY KEY (school_id);


--
-- Name: school_subscriptions school_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_subscriptions
    ADD CONSTRAINT school_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: school_subscriptions school_subscriptions_school_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_subscriptions
    ADD CONSTRAINT school_subscriptions_school_id_key UNIQUE (school_id);


--
-- Name: schools schools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_pkey PRIMARY KEY (id);


--
-- Name: schools schools_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_referral_code_key UNIQUE (referral_code);


--
-- Name: schools schools_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_username_key UNIQUE (username);


--
-- Name: settings settings_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_key_key UNIQUE (key);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (id);


--
-- Name: staff_accounts staff_accounts_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_accounts
    ADD CONSTRAINT staff_accounts_email_key UNIQUE (email);


--
-- Name: staff_accounts staff_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_accounts
    ADD CONSTRAINT staff_accounts_pkey PRIMARY KEY (id);


--
-- Name: staff_accounts staff_accounts_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_accounts
    ADD CONSTRAINT staff_accounts_username_key UNIQUE (username);


--
-- Name: staff_audit_log staff_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_audit_log
    ADD CONSTRAINT staff_audit_log_pkey PRIMARY KEY (id);


--
-- Name: student_categories student_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_categories
    ADD CONSTRAINT student_categories_pkey PRIMARY KEY (id);


--
-- Name: student_categories student_categories_school_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_categories
    ADD CONSTRAINT student_categories_school_id_name_key UNIQUE (school_id, name);


--
-- Name: student_exams student_exams_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_pkey PRIMARY KEY (id);


--
-- Name: student_tutors student_tutors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_tutors
    ADD CONSTRAINT student_tutors_pkey PRIMARY KEY (id);


--
-- Name: student_tutors student_tutors_student_id_tutor_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_tutors
    ADD CONSTRAINT student_tutors_student_id_tutor_id_key UNIQUE (student_id, tutor_id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: students students_school_id_student_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_school_id_student_id_key UNIQUE (school_id, student_id);


--
-- Name: students students_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_username_key UNIQUE (username);


--
-- Name: tutors tutors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutors
    ADD CONSTRAINT tutors_pkey PRIMARY KEY (id);


--
-- Name: tutors tutors_school_id_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutors
    ADD CONSTRAINT tutors_school_id_username_key UNIQUE (school_id, username);


--
-- Name: idx_activity_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_action ON public.activity_logs USING btree (action);


--
-- Name: idx_activity_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created ON public.activity_logs USING btree (created_at);


--
-- Name: idx_activity_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created_at ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_activity_logs_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_school ON public.activity_logs USING btree (school_id);


--
-- Name: idx_activity_logs_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_target ON public.activity_logs USING btree (target_type, target_id);


--
-- Name: idx_activity_logs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_user ON public.activity_logs USING btree (user_id, user_type);


--
-- Name: idx_comp_registrations_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comp_registrations_school ON public.competition_registrations USING btree (school_id);


--
-- Name: idx_comp_registrations_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comp_registrations_student ON public.competition_registrations USING btree (student_id);


--
-- Name: idx_comp_results_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comp_results_stage ON public.competition_results USING btree (stage_id);


--
-- Name: idx_comp_rewards_comp_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_comp_rewards_comp_id ON public.competition_rewards USING btree (competition_id);


--
-- Name: idx_coupon_redemptions_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupon_redemptions_school ON public.coupon_redemptions USING btree (school_id);


--
-- Name: idx_email_queue_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_queue_status ON public.email_queue USING btree (status);


--
-- Name: idx_exam_schedules_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_schedules_date ON public.exam_schedules USING btree (scheduled_date);


--
-- Name: idx_exam_schedules_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_schedules_exam ON public.exam_schedules USING btree (exam_id);


--
-- Name: idx_exam_schedules_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_schedules_status ON public.exam_schedules USING btree (status);


--
-- Name: idx_exam_schedules_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exam_schedules_student ON public.exam_schedules USING btree (student_id);


--
-- Name: idx_exams_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_category ON public.exams USING btree (category_id);


--
-- Name: idx_exams_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_published ON public.exams USING btree (is_published);


--
-- Name: idx_exams_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_school ON public.exams USING btree (school_id);


--
-- Name: idx_exams_tutor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_tutor ON public.exams USING btree (tutor_id);


--
-- Name: idx_exams_tutor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exams_tutor_id ON public.exams USING btree (tutor_id);


--
-- Name: idx_external_students_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_students_school ON public.external_students USING btree (school_id);


--
-- Name: idx_external_students_tutor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_external_students_tutor ON public.external_students USING btree (tutor_id);


--
-- Name: idx_issued_reports_staff; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issued_reports_staff ON public.issued_reports USING btree (staff_id);


--
-- Name: idx_issued_reports_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issued_reports_student ON public.issued_reports USING btree (student_id);


--
-- Name: idx_payg_ledger_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payg_ledger_date ON public.payg_ledger USING btree (created_at DESC);


--
-- Name: idx_payg_ledger_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payg_ledger_school ON public.payg_ledger USING btree (school_id);


--
-- Name: idx_payg_ledger_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payg_ledger_type ON public.payg_ledger USING btree (type);


--
-- Name: idx_payments_created_at_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_created_at_date ON public.payments USING btree (created_at DESC);


--
-- Name: idx_payments_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_provider ON public.payments USING btree (provider, provider_payment_id);


--
-- Name: idx_payments_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_school ON public.payments USING btree (school_id);


--
-- Name: idx_payments_school_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_school_id ON public.payments USING btree (school_id);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_questions_exam; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_exam ON public.questions USING btree (exam_id);


--
-- Name: idx_questions_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_questions_exam_id ON public.questions USING btree (exam_id);


--
-- Name: idx_schedules_exam_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedules_exam_id ON public.exam_schedules USING btree (exam_id);


--
-- Name: idx_schedules_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedules_student_id ON public.exam_schedules USING btree (student_id);


--
-- Name: idx_school_subscriptions_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_school_subscriptions_school ON public.school_subscriptions USING btree (school_id);


--
-- Name: idx_school_subscriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_school_subscriptions_status ON public.school_subscriptions USING btree (status);


--
-- Name: idx_schools_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schools_email ON public.schools USING btree (email);


--
-- Name: idx_schools_plan; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schools_plan ON public.schools USING btree (plan_type, plan_status);


--
-- Name: idx_schools_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schools_username ON public.schools USING btree (username);


--
-- Name: idx_staff_audit_log_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_audit_log_actor ON public.staff_audit_log USING btree (actor_id);


--
-- Name: idx_staff_audit_log_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_audit_log_created ON public.staff_audit_log USING btree (created_at DESC);


--
-- Name: idx_student_categories_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_categories_school ON public.student_categories USING btree (school_id);


--
-- Name: idx_student_exams_completed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_exams_completed_at ON public.student_exams USING btree (completed_at);


--
-- Name: idx_student_exams_historical_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_exams_historical_category ON public.student_exams USING btree (historical_category_id);


--
-- Name: idx_student_exams_schedule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_exams_schedule ON public.student_exams USING btree (exam_schedule_id);


--
-- Name: idx_student_exams_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_exams_status ON public.student_exams USING btree (status);


--
-- Name: idx_student_exams_student; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_exams_student ON public.student_exams USING btree (student_id);


--
-- Name: idx_student_tutors_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_tutors_student_id ON public.student_tutors USING btree (student_id);


--
-- Name: idx_student_tutors_tutor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_tutors_tutor_id ON public.student_tutors USING btree (tutor_id);


--
-- Name: idx_students_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_category ON public.students USING btree (category_id);


--
-- Name: idx_students_category_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_category_id ON public.students USING btree (category_id);


--
-- Name: idx_students_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_email ON public.students USING btree (email);


--
-- Name: idx_students_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_school ON public.students USING btree (school_id);


--
-- Name: idx_students_school_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_school_id ON public.students USING btree (school_id);


--
-- Name: idx_students_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_students_student_id ON public.students USING btree (school_id, student_id);


--
-- Name: idx_subscription_sync; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_subscription_sync ON public.school_subscriptions USING btree (status, is_capacity_frozen);


--
-- Name: idx_tutors_school; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tutors_school ON public.tutors USING btree (school_id);


--
-- Name: idx_tutors_school_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tutors_school_id ON public.tutors USING btree (school_id);


--
-- Name: idx_tutors_username; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tutors_username ON public.tutors USING btree (school_id, username);


--
-- Name: competitions update_competitions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_competitions_updated_at BEFORE UPDATE ON public.competitions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exam_schedules update_exam_schedules_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exam_schedules_updated_at BEFORE UPDATE ON public.exam_schedules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exams update_exams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: payments update_payments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: questions update_questions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON public.questions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: schools update_schools_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_categories update_student_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_student_categories_updated_at BEFORE UPDATE ON public.student_categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: student_exams update_student_exams_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_student_exams_updated_at BEFORE UPDATE ON public.student_exams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: students update_students_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tutors update_tutors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tutors_updated_at BEFORE UPDATE ON public.tutors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_logs activity_logs_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id);


--
-- Name: competition_categories competition_categories_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_categories
    ADD CONSTRAINT competition_categories_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE CASCADE;


--
-- Name: competition_registrations competition_registrations_competition_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_registrations
    ADD CONSTRAINT competition_registrations_competition_category_id_fkey FOREIGN KEY (competition_category_id) REFERENCES public.competition_categories(id) ON DELETE CASCADE;


--
-- Name: competition_registrations competition_registrations_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_registrations
    ADD CONSTRAINT competition_registrations_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE CASCADE;


--
-- Name: competition_registrations competition_registrations_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_registrations
    ADD CONSTRAINT competition_registrations_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: competition_registrations competition_registrations_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_registrations
    ADD CONSTRAINT competition_registrations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: competition_results competition_results_registration_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_results
    ADD CONSTRAINT competition_results_registration_id_fkey FOREIGN KEY (registration_id) REFERENCES public.competition_registrations(id) ON DELETE CASCADE;


--
-- Name: competition_results competition_results_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_results
    ADD CONSTRAINT competition_results_stage_id_fkey FOREIGN KEY (stage_id) REFERENCES public.competition_stages(id) ON DELETE CASCADE;


--
-- Name: competition_rewards competition_rewards_competition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_rewards
    ADD CONSTRAINT competition_rewards_competition_id_fkey FOREIGN KEY (competition_id) REFERENCES public.competitions(id) ON DELETE CASCADE;


--
-- Name: competition_stages competition_stages_competition_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competition_stages
    ADD CONSTRAINT competition_stages_competition_category_id_fkey FOREIGN KEY (competition_category_id) REFERENCES public.competition_categories(id) ON DELETE CASCADE;


--
-- Name: competitions competitions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.competitions
    ADD CONSTRAINT competitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.staff_accounts(id);


--
-- Name: coupon_redemptions coupon_redemptions_coupon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id);


--
-- Name: coupon_redemptions coupon_redemptions_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupon_redemptions
    ADD CONSTRAINT coupon_redemptions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: exam_categories exam_categories_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_categories
    ADD CONSTRAINT exam_categories_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: exam_schedules exam_schedules_competition_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_competition_stage_id_fkey FOREIGN KEY (competition_stage_id) REFERENCES public.competition_stages(id) ON DELETE SET NULL;


--
-- Name: exam_schedules exam_schedules_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: exam_schedules exam_schedules_external_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_external_student_id_fkey FOREIGN KEY (external_student_id) REFERENCES public.external_students(id) ON DELETE CASCADE;


--
-- Name: exam_schedules exam_schedules_rescheduled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_rescheduled_by_fkey FOREIGN KEY (rescheduled_by) REFERENCES public.tutors(id);


--
-- Name: exam_schedules exam_schedules_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exam_schedules
    ADD CONSTRAINT exam_schedules_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: exams exams_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.exam_categories(id) ON DELETE SET NULL;


--
-- Name: exams exams_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: exams exams_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exams
    ADD CONSTRAINT exams_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.tutors(id) ON DELETE CASCADE;


--
-- Name: external_students external_students_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_students
    ADD CONSTRAINT external_students_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.student_categories(id) ON DELETE SET NULL;


--
-- Name: external_students external_students_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_students
    ADD CONSTRAINT external_students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: external_students external_students_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.external_students
    ADD CONSTRAINT external_students_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.tutors(id) ON DELETE CASCADE;


--
-- Name: feature_flags feature_flags_min_plan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_flags
    ADD CONSTRAINT feature_flags_min_plan_fkey FOREIGN KEY (min_plan) REFERENCES public.plan_definitions(plan_type);


--
-- Name: issued_reports issued_reports_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issued_reports
    ADD CONSTRAINT issued_reports_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: learning_materials learning_materials_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_materials
    ADD CONSTRAINT learning_materials_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE SET NULL;


--
-- Name: learning_materials learning_materials_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.learning_materials
    ADD CONSTRAINT learning_materials_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.tutors(id) ON DELETE CASCADE;


--
-- Name: payg_ledger payg_ledger_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payg_ledger
    ADD CONSTRAINT payg_ledger_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: payg_wallets payg_wallets_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payg_wallets
    ADD CONSTRAINT payg_wallets_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: payments payments_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: questions questions_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT questions_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: school_settings school_settings_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_settings
    ADD CONSTRAINT school_settings_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: school_subscriptions school_subscriptions_override_plan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_subscriptions
    ADD CONSTRAINT school_subscriptions_override_plan_fkey FOREIGN KEY (override_plan) REFERENCES public.plan_definitions(plan_type);


--
-- Name: school_subscriptions school_subscriptions_plan_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_subscriptions
    ADD CONSTRAINT school_subscriptions_plan_type_fkey FOREIGN KEY (plan_type) REFERENCES public.plan_definitions(plan_type);


--
-- Name: school_subscriptions school_subscriptions_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.school_subscriptions
    ADD CONSTRAINT school_subscriptions_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: schools schools_referred_by_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schools
    ADD CONSTRAINT schools_referred_by_id_fkey FOREIGN KEY (referred_by_id) REFERENCES public.schools(id);


--
-- Name: student_categories student_categories_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_categories
    ADD CONSTRAINT student_categories_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: student_categories student_categories_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_categories
    ADD CONSTRAINT student_categories_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.tutors(id) ON DELETE CASCADE;


--
-- Name: student_exams student_exams_exam_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_exam_id_fkey FOREIGN KEY (exam_id) REFERENCES public.exams(id) ON DELETE CASCADE;


--
-- Name: student_exams student_exams_exam_schedule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_exam_schedule_id_fkey FOREIGN KEY (exam_schedule_id) REFERENCES public.exam_schedules(id) ON DELETE CASCADE;


--
-- Name: student_exams student_exams_external_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_external_student_id_fkey FOREIGN KEY (external_student_id) REFERENCES public.external_students(id) ON DELETE CASCADE;


--
-- Name: student_exams student_exams_historical_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_historical_category_id_fkey FOREIGN KEY (historical_category_id) REFERENCES public.student_categories(id) ON DELETE SET NULL;


--
-- Name: student_exams student_exams_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_exams
    ADD CONSTRAINT student_exams_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_tutors student_tutors_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_tutors
    ADD CONSTRAINT student_tutors_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: student_tutors student_tutors_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_tutors
    ADD CONSTRAINT student_tutors_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.tutors(id) ON DELETE CASCADE;


--
-- Name: students students_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.student_categories(id) ON DELETE SET NULL;


--
-- Name: students students_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- Name: tutors tutors_school_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutors
    ADD CONSTRAINT tutors_school_id_fkey FOREIGN KEY (school_id) REFERENCES public.schools(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict C7AcUE4tTVJjXgIDXFJRvVcrznvMDA9NK5SarpODHORrLIGIjzum0eej7pgUmSJ

