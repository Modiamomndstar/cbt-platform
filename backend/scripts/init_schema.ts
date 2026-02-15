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

    // 2. Payment plans table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_plans (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL DEFAULT 0,
        currency VARCHAR(10) DEFAULT 'USD',
        duration_months INTEGER DEFAULT 1,
        max_tutors INTEGER DEFAULT 2,
        max_students INTEGER DEFAULT 50,
        features JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    // 6. Exams table
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
        total_marks DECIMAL(10,2) DEFAULT 0,
        passing_score INTEGER DEFAULT 50,
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

    // 7. Questions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        question_text TEXT NOT NULL,
        question_type VARCHAR(50) DEFAULT 'multiple_choice',
        options JSONB DEFAULT '[]',
        correct_answer TEXT,
        marks INTEGER DEFAULT 5,
        difficulty VARCHAR(20) DEFAULT 'medium',
        question_order INTEGER DEFAULT 0,
        image_url TEXT,
        is_deleted BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 8. Exam schedules table
    await client.query(`
      CREATE TABLE IF NOT EXISTS exam_schedules (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        scheduled_date DATE NOT NULL,
        start_time VARCHAR(10) NOT NULL,
        end_time VARCHAR(10) NOT NULL,
        access_code VARCHAR(20),
        exam_username VARCHAR(50),
        exam_password VARCHAR(50),
        status VARCHAR(50) DEFAULT 'scheduled',
        max_attempts INTEGER DEFAULT 1,
        attempt_count INTEGER DEFAULT 0,
        started_at TIMESTAMP,
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 9. Student exams (results) table
    await client.query(`
      CREATE TABLE IF NOT EXISTS student_exams (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
        schedule_id UUID REFERENCES exam_schedules(id) ON DELETE SET NULL,
        start_time TIMESTAMP,
        end_time TIMESTAMP,
        score DECIMAL(10,2) DEFAULT 0,
        total_marks DECIMAL(10,2) DEFAULT 0,
        percentage DECIMAL(5,2) DEFAULT 0,
        pass_mark_percentage INTEGER DEFAULT 50,
        status VARCHAR(50) DEFAULT 'in_progress',
        time_spent_minutes INTEGER DEFAULT 0,
        answers JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 10. Payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
        plan_id UUID REFERENCES payment_plans(id),
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

    // 11. Activity logs table
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

    // 12. Migrations tracking table
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
      CREATE INDEX IF NOT EXISTS idx_student_exams_schedule_id ON student_exams(schedule_id);
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
