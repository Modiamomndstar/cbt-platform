import { pool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function initSchema() {
  const client = await pool.connect();

  try {
    logger.info('Creating initial database schema...');

    await client.query('BEGIN');

    // Enable UUID extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // 1. Schools table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schools (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(255) NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(50),
        address TEXT,
        description TEXT,
        logo_url TEXT,
        country VARCHAR(100) DEFAULT 'Nigeria',
        timezone VARCHAR(50) DEFAULT 'Africa/Lagos',
        plan_type VARCHAR(50) DEFAULT 'free',
        plan_status VARCHAR(50) DEFAULT 'active',
        plan_expires_at TIMESTAMP,
        subscription_status VARCHAR(50) DEFAULT 'inactive',
        subscription_plan VARCHAR(100),
        subscription_start TIMESTAMP,
        subscription_end TIMESTAMP,
        max_tutors INTEGER DEFAULT 2,
        max_students INTEGER DEFAULT 50,
        total_paid DECIMAL(10,2) DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Plan Definitions table
    await client.query(`
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
        updated_at         TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 3. Student categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_categories (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        color VARCHAR(20) DEFAULT '#4F46E5',
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 4. Tutors table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tutors (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        phone VARCHAR(50),
        subjects TEXT[],
        bio TEXT,
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(school_id, username)
      )
    `);

    // 5. Students table
    await client.query(`
      CREATE TABLE IF NOT EXISTS students (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        category_id UUID REFERENCES student_categories(id) ON DELETE SET NULL,
        student_id VARCHAR(100),
        registration_number VARCHAR(100),
        full_name VARCHAR(255),
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        email VARCHAR(255),
        password_hash VARCHAR(255),
        phone VARCHAR(50),
        date_of_birth DATE,
        gender VARCHAR(20),
        address TEXT,
        parent_name VARCHAR(255),
        parent_phone VARCHAR(50),
        parent_email VARCHAR(255),
        level VARCHAR(50),
        avatar_url TEXT,
        is_active BOOLEAN DEFAULT true,
        deleted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 6. External Students table
    await client.query(`
      CREATE TABLE IF NOT EXISTS external_students (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
        school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        category_id UUID REFERENCES student_categories(id) ON DELETE SET NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(tutor_id, username)
      )
    `);

    // 7. Exams table
    await client.query(`
      CREATE TABLE IF NOT EXISTS exams (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        duration INTEGER DEFAULT 60,
        duration_minutes INTEGER DEFAULT 60,
        total_questions INTEGER DEFAULT 0,
        total_marks NUMERIC DEFAULT 0,
        passing_score NUMERIC DEFAULT 40,
        pass_mark_percentage INTEGER DEFAULT 50,
        shuffle_questions BOOLEAN DEFAULT true,
        shuffle_options BOOLEAN DEFAULT true,
        show_result_immediately BOOLEAN DEFAULT true,
        is_published BOOLEAN DEFAULT false,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Questions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) DEFAULT 'multiple_choice',
        options JSONB DEFAULT '[]',
        correct_answer TEXT,
        marks NUMERIC DEFAULT 5,
        difficulty VARCHAR(20) DEFAULT 'medium',
        sort_order INTEGER DEFAULT 0,
        image_url TEXT,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Exam schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_schedules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        external_student_id UUID REFERENCES external_students(id) ON DELETE CASCADE,
        scheduled_date DATE NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        login_username VARCHAR(50),
        login_password VARCHAR(255),
        status VARCHAR(50) DEFAULT 'scheduled',
        max_attempts INTEGER DEFAULT 1,
        attempt_count INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        auto_submitted BOOLEAN DEFAULT false,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_student_or_external CHECK (
          (student_id IS NOT NULL AND external_student_id IS NULL) OR
          (student_id IS NULL AND external_student_id IS NOT NULL)
        )
      )
    `);

    // 10. Student exams (results) table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_exams (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID REFERENCES students(id) ON DELETE CASCADE,
        external_student_id UUID REFERENCES external_students(id) ON DELETE CASCADE,
        exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        exam_schedule_id UUID REFERENCES exam_schedules(id) ON DELETE SET NULL,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        score DECIMAL(10,2) DEFAULT 0,
        total_marks DECIMAL(10,2) DEFAULT 0,
        percentage DECIMAL(5,2) DEFAULT 0,
        pass_mark_percentage INTEGER DEFAULT 50,
        status VARCHAR(50) DEFAULT 'in_progress',
        time_spent_minutes INTEGER DEFAULT 0,
        answers JSONB DEFAULT '[]',
        assigned_questions JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT check_student_exam_student CHECK (
            (student_id IS NOT NULL AND external_student_id IS NULL) OR
            (student_id IS NULL AND external_student_id IS NOT NULL)
        )
      )
    `);

    // --- NORMALIZATION BLOCK (For existing tables with old schemas) ---
    await client.query(`
      DO $$
      BEGIN
        -- Normalizing student_exams
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_exams') THEN
          -- Rename schedule_id to exam_schedule_id if it exists
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_exams' AND column_name = 'schedule_id')
             AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_exams' AND column_name = 'exam_schedule_id') THEN
            ALTER TABLE student_exams RENAME COLUMN schedule_id TO exam_schedule_id;
          END IF;

          -- Add exam_schedule_id if missing entirely
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_exams' AND column_name = 'exam_schedule_id') THEN
            ALTER TABLE student_exams ADD COLUMN exam_schedule_id UUID REFERENCES exam_schedules(id) ON DELETE SET NULL;
          END IF;

          -- Add external_student_id if missing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_exams' AND column_name = 'external_student_id') THEN
            ALTER TABLE student_exams ADD COLUMN external_student_id UUID REFERENCES external_students(id) ON DELETE CASCADE;
          END IF;

          -- Make student_id nullable for external students support
          ALTER TABLE student_exams ALTER COLUMN student_id DROP NOT NULL;
        END IF;

        -- Normalizing exam_schedules
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exam_schedules') THEN
          -- Add external_student_id if missing
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_schedules' AND column_name = 'external_student_id') THEN
            ALTER TABLE exam_schedules ADD COLUMN external_student_id UUID REFERENCES external_students(id) ON DELETE CASCADE;
          END IF;

          -- Make student_id nullable
          ALTER TABLE exam_schedules ALTER COLUMN student_id DROP NOT NULL;
        END IF;
      END $$;
    `);

    await client.query(`CREATE INDEX IF NOT EXISTS idx_student_exams_schedule ON student_exams(exam_schedule_id)`);


    // 11. Payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        plan_type VARCHAR(50) REFERENCES plan_definitions(plan_type),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        payment_method VARCHAR(50),
        transaction_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        subscription_start TIMESTAMP,
        subscription_end TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 12. Subscriptions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS school_subscriptions (
        id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id            UUID UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
        plan_type            VARCHAR(50) NOT NULL DEFAULT 'freemium' REFERENCES plan_definitions(plan_type),
        status               VARCHAR(50) DEFAULT 'active',
        billing_cycle        VARCHAR(20) DEFAULT 'monthly',
        currency             VARCHAR(10) DEFAULT 'NGN',
        amount               DECIMAL(10,2) DEFAULT 0,
        trial_start          TIMESTAMPTZ,
        trial_end            TIMESTAMPTZ,
        current_period_start TIMESTAMPTZ,
        current_period_end   TIMESTAMPTZ,
        created_at           TIMESTAMPTZ DEFAULT NOW(),
        updated_at           TIMESTAMPTZ DEFAULT NOW(),
        purchased_tutor_slots INTEGER DEFAULT 0,
        purchased_student_slots INTEGER DEFAULT 0,
        purchased_ai_queries INTEGER DEFAULT 0,
        is_capacity_frozen BOOLEAN DEFAULT false
      )
    `);

    // 13. Wallets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payg_wallets (
        school_id            UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
        balance_credits      INTEGER DEFAULT 0,
        currency             VARCHAR(10) DEFAULT 'NGN',
        updated_at           TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // 14. Activity logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID,
        user_type VARCHAR(50),
        school_id UUID,
        action VARCHAR(100),
        details JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 13. Migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
      CREATE INDEX IF NOT EXISTS idx_students_category_id ON students(category_id);
      CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
      CREATE INDEX IF NOT EXISTS idx_tutors_school_id ON tutors(school_id);
      CREATE INDEX IF NOT EXISTS idx_exams_tutor_id ON exams(tutor_id);
      CREATE INDEX IF NOT EXISTS idx_exams_school_id ON exams(school_id);
      CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_exam_id ON exam_schedules(exam_id);
      CREATE INDEX IF NOT EXISTS idx_schedules_student_id ON exam_schedules(student_id);
      CREATE INDEX IF NOT EXISTS idx_payments_school_id ON payments(school_id);
      CREATE INDEX IF NOT EXISTS idx_student_exams_student_id ON student_exams(student_id);
      CREATE INDEX IF NOT EXISTS idx_student_exams_exam_id ON student_exams(exam_id);
      CREATE INDEX IF NOT EXISTS idx_student_exams_schedule_id ON student_exams(exam_schedule_id);
      CREATE INDEX IF NOT EXISTS idx_student_exams_external_student_id ON student_exams(external_student_id);
      CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_student_categories_school_id ON student_categories(school_id);
    `);

    await client.query('COMMIT');

    logger.info('Initial database schema created successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Schema creation failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

initSchema().catch(console.error);
