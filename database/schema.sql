-- CBT Platform Database Schema
-- PostgreSQL 14+

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- SCHOOLS TABLE
-- ============================================
CREATE TABLE schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    address TEXT,
    description TEXT,
    logo_url TEXT,
    country VARCHAR(100) DEFAULT 'Nigeria',
    timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,

    -- Subscription/Payment fields
    plan_type VARCHAR(50) DEFAULT 'free', -- free, basic, premium, enterprise
    plan_status VARCHAR(50) DEFAULT 'active', -- active, suspended, cancelled
    plan_expires_at TIMESTAMP,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    paystack_customer_code VARCHAR(255),
    paystack_subscription_code VARCHAR(255),

    -- Payment history
    last_payment_at TIMESTAMP,
    next_payment_at TIMESTAMP,
    total_paid DECIMAL(10, 2) DEFAULT 0,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- STUDENT CATEGORIES TABLE (NEW FEATURE)
-- ============================================
CREATE TABLE student_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL, -- e.g., "SS1", "JSS2", "Grade 10"
    description TEXT,
    color VARCHAR(7) DEFAULT '#4F46E5', -- Hex color for UI
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(school_id, name)
);

-- ============================================
-- TUTORS TABLE
-- ============================================
CREATE TABLE tutors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    full_name VARCHAR(255) NOT NULL,
    subjects TEXT[], -- Array of subjects
    bio TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(school_id, username)
);

-- ============================================
-- STUDENTS TABLE
-- ============================================
CREATE TABLE students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    category_id UUID REFERENCES student_categories(id) ON DELETE SET NULL,
    student_id VARCHAR(100) NOT NULL, -- School's student ID (e.g., "STU001")
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    date_of_birth DATE,
    gender VARCHAR(10),
    address TEXT,
    parent_name VARCHAR(255),
    parent_phone VARCHAR(50),
    parent_email VARCHAR(255),
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(school_id, student_id)
);

-- ============================================
-- EXAMS TABLE
-- ============================================
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    instructions TEXT,
    category VARCHAR(100), -- e.g., "Mathematics", "Science"

    -- Exam settings
    duration INTEGER NOT NULL DEFAULT 60, -- in minutes
    total_questions INTEGER NOT NULL DEFAULT 50,
    passing_score INTEGER DEFAULT 50, -- percentage
    shuffle_questions BOOLEAN DEFAULT true,
    shuffle_options BOOLEAN DEFAULT true,
    show_result_immediately BOOLEAN DEFAULT true,
    allow_review BOOLEAN DEFAULT false, -- Allow students to review answers after exam

    -- Access control
    is_published BOOLEAN DEFAULT false,
    publish_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- QUESTIONS TABLE
-- ============================================
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL, -- multiple_choice, true_false, fill_blank
    options JSONB, -- Array of options for MCQ
    correct_answer TEXT NOT NULL, -- Can be index (0,1,2) or text answer
    explanation TEXT, -- Explanation for the correct answer
    marks INTEGER NOT NULL DEFAULT 5,
    difficulty VARCHAR(20) DEFAULT 'medium', -- easy, medium, hard
    sort_order INTEGER DEFAULT 0,

    -- AI Generated question fields
    is_ai_generated BOOLEAN DEFAULT false,
    ai_source_material TEXT,
    ai_topics TEXT[],

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EXAM SCHEDULES TABLE
-- ============================================
CREATE TABLE exam_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,

    -- Schedule timing
    scheduled_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    timezone VARCHAR(50) DEFAULT 'Africa/Lagos',

    -- Status
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, in_progress, completed, missed, rescheduled, cancelled

    -- Login credentials (temporary)
    login_username VARCHAR(100) NOT NULL,
    login_password VARCHAR(100) NOT NULL,

    -- Attempt tracking
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 1,

    -- Email notification
    email_sent BOOLEAN DEFAULT false,
    email_sent_at TIMESTAMP,

    -- Reschedule tracking
    rescheduled_by UUID REFERENCES tutors(id),
    rescheduled_at TIMESTAMP,
    reschedule_reason TEXT,
    original_schedule_id UUID, -- Reference to original schedule if rescheduled

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(exam_id, student_id, scheduled_date, start_time)
);

-- ============================================
-- STUDENT EXAMS (RESULTS) TABLE
-- ============================================
CREATE TABLE student_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_schedule_id UUID NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,

    -- Questions and answers
    questions JSONB NOT NULL, -- Array of question IDs in order shown
    answers JSONB DEFAULT '{}', -- Object: {questionId: answer}

    -- Results
    score INTEGER DEFAULT 0,
    total_marks INTEGER NOT NULL,
    percentage INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress', -- in_progress, completed, timeout, abandoned

    -- Timing
    started_at TIMESTAMP,
    submitted_at TIMESTAMP,
    time_spent INTEGER DEFAULT 0, -- in seconds

    -- Proctoring data
    tab_switch_count INTEGER DEFAULT 0,
    fullscreen_exits INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LEARNING MATERIALS TABLE
-- ============================================
CREATE TABLE learning_materials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
    exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT, -- Text content
    file_url TEXT, -- URL to uploaded file
    file_type VARCHAR(50), -- pdf, doc, txt
    file_size INTEGER, -- in bytes
    topics TEXT[],

    -- AI processing
    ai_processed BOOLEAN DEFAULT false,
    ai_extracted_questions JSONB,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- PAYMENTS TABLE
-- ============================================
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,

    -- Payment details
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD', -- USD, NGN, etc.
    payment_method VARCHAR(50), -- stripe, paystack, bank_transfer

    -- Provider specific
    provider VARCHAR(50) NOT NULL, -- stripe, paystack
    provider_payment_id VARCHAR(255),
    provider_reference VARCHAR(255),

    -- Status
    status VARCHAR(50) DEFAULT 'pending', -- pending, completed, failed, refunded

    -- Plan info
    plan_type VARCHAR(50),
    plan_duration_months INTEGER DEFAULT 1,

    -- Metadata
    metadata JSONB,

    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- ACTIVITY LOGS TABLE (for audit)
-- ============================================
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Can be school, tutor, or student
    user_type VARCHAR(50) NOT NULL, -- school, tutor, student
    school_id UUID REFERENCES schools(id),
    action VARCHAR(100) NOT NULL, -- login, logout, create_exam, etc.
    resource_type VARCHAR(50), -- exam, student, etc.
    resource_id UUID,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- EMAIL QUEUE TABLE
-- ============================================
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email VARCHAR(255) NOT NULL,
    to_name VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    body_html TEXT,
    body_text TEXT,
    template_name VARCHAR(100), -- exam_schedule, result_notification, etc.
    template_data JSONB,

    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, failed
    attempts INTEGER DEFAULT 0,
    last_error TEXT,
    sent_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (key, value, description) VALUES
('platform_name', 'CBT Platform', 'Name of the platform'),
('platform_email', 'support@cbtplatform.com', 'Support email address'),
('free_plan_students', '50', 'Max students for free plan'),
('free_plan_tutors', '1', 'Max tutors for free plan'),
('free_plan_exams', '5', 'Max exams per month for free plan'),
('basic_plan_price_usd', '29', 'Basic plan price in USD'),
('basic_plan_price_ngn', '15000', 'Basic plan price in NGN'),
('premium_plan_price_usd', '99', 'Premium plan price in USD'),
('premium_plan_price_ngn', '50000', 'Premium plan price in NGN');

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX idx_schools_username ON schools(username);
CREATE INDEX idx_schools_email ON schools(email);
CREATE INDEX idx_schools_plan ON schools(plan_type, plan_status);

CREATE INDEX idx_tutors_school ON tutors(school_id);
CREATE INDEX idx_tutors_username ON tutors(school_id, username);

CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_students_category ON students(category_id);
CREATE INDEX idx_students_student_id ON students(school_id, student_id);

CREATE INDEX idx_student_categories_school ON student_categories(school_id);

CREATE INDEX idx_exams_school ON exams(school_id);
CREATE INDEX idx_exams_tutor ON exams(tutor_id);
CREATE INDEX idx_exams_published ON exams(is_published);

CREATE INDEX idx_questions_exam ON questions(exam_id);

CREATE INDEX idx_exam_schedules_exam ON exam_schedules(exam_id);
CREATE INDEX idx_exam_schedules_student ON exam_schedules(student_id);
CREATE INDEX idx_exam_schedules_status ON exam_schedules(status);
CREATE INDEX idx_exam_schedules_date ON exam_schedules(scheduled_date);

CREATE INDEX idx_student_exams_schedule ON student_exams(exam_schedule_id);
CREATE INDEX idx_student_exams_student ON student_exams(student_id);
CREATE INDEX idx_student_exams_status ON student_exams(status);

CREATE INDEX idx_payments_school ON payments(school_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_provider ON payments(provider, provider_payment_id);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id, user_type);
CREATE INDEX idx_activity_logs_school ON activity_logs(school_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

CREATE INDEX idx_email_queue_status ON email_queue(status);

-- ============================================
-- TRIGGERS FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tutors_updated_at BEFORE UPDATE ON tutors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_categories_updated_at BEFORE UPDATE ON student_categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exam_schedules_updated_at BEFORE UPDATE ON exam_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_exams_updated_at BEFORE UPDATE ON student_exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DEMO DATA
-- ============================================

-- Insert demo school
INSERT INTO schools (id, name, username, password_hash, email, phone, address, description, plan_type, is_active)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'Demo High School',
    'demoschool',
    '$2a$10$sZIUQ.tSsbcSzMS8k9p/zuL7UGqASOyfWzt7oDb2f8JbcrswZ6HK2', -- Will be updated with proper hash
    'admin@demoschool.edu',
    '+2348012345678',
    '123 Education Street, Lagos, Nigeria',
    'A premier institution for academic excellence',
    'premium',
    true
);

-- Insert demo student categories
INSERT INTO student_categories (school_id, name, description, color, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'JSS1', 'Junior Secondary School 1', '#4F46E5', 1),
('550e8400-e29b-41d4-a716-446655440000', 'JSS2', 'Junior Secondary School 2', '#10B981', 2),
('550e8400-e29b-41d4-a716-446655440000', 'JSS3', 'Junior Secondary School 3', '#F59E0B', 3),
('550e8400-e29b-41d4-a716-446655440000', 'SS1', 'Senior Secondary School 1', '#EF4444', 4),
('550e8400-e29b-41d4-a716-446655440000', 'SS2', 'Senior Secondary School 2', '#8B5CF6', 5),
('550e8400-e29b-41d4-a716-446655440000', 'SS3', 'Senior Secondary School 3', '#06B6D4', 6);

-- Insert demo tutor
INSERT INTO tutors (id, school_id, username, password_hash, email, phone, full_name, subjects, is_active)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    'demotutor',
    '$2a$10$sZIUQ.tSsbcSzMS8k9p/zuL7UGqASOyfWzt7oDb2f8JbcrswZ6HK2',
    'tutor@demoschool.edu',
    '+2348087654321',
    'John Smith',
    ARRAY['Mathematics', 'Physics'],
    true
);

-- Insert demo students
INSERT INTO students (school_id, category_id, student_id, full_name, email, phone, is_active)
SELECT
    '550e8400-e29b-41d4-a716-446655440000',
    id,
    'STU' || LPAD(seq::text, 3, '0'),
    'Student ' || seq,
    'student' || seq || '@demoschool.edu',
    '+23480' || LPAD((seq + 10000000)::text, 8, '0'),
    true
FROM student_categories, generate_series(1, 5) AS seq
WHERE school_id = '550e8400-e29b-41d4-a716-446655440000';

-- Insert demo exam
INSERT INTO exams (id, school_id, tutor_id, title, description, category, duration, total_questions, is_published)
VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440001',
    'Mathematics Mid-Term Exam',
    'Comprehensive test covering algebra and geometry',
    'SS2',
    60,
    5,
    true
);

-- Insert demo questions
INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, marks, difficulty) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'What is the value of x in the equation 2x + 5 = 15?', 'multiple_choice', '["5", "10", "7.5", "20"]', '0', 10, 'easy'),
('550e8400-e29b-41d4-a716-446655440002', 'The area of a circle is calculated using the formula πr².', 'true_false', '["True", "False"]', '0', 5, 'easy'),
('550e8400-e29b-41d4-a716-446655440002', 'Solve for y: 3y - 9 = 0', 'fill_blank', '[]', '3', 10, 'medium'),
('550e8400-e29b-41d4-a716-446655440002', 'What is the sum of angles in a triangle?', 'multiple_choice', '["90°", "180°", "270°", "360°"]', '1', 5, 'easy'),
('550e8400-e29b-41d4-a716-446655440002', 'If a = 3 and b = 4, what is the value of a² + b²?', 'multiple_choice', '["7", "12", "25", "49"]', '2', 10, 'medium');
