import dotenv from 'dotenv';
dotenv.config();
import { pool } from '../src/config/database';
import { logger } from '../src/utils/logger';

async function migrate() {
  const client = await pool.connect();

  try {
    logger.info('Starting database migration...');

    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Get executed migrations
    const executedResult = await client.query('SELECT name FROM migrations');
    const executedMigrations = executedResult.rows.map(r => r.name);

    // Define migrations
    const migrations = [
      {
        name: '001_add_indexes',
        sql: `
          CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
          CREATE INDEX IF NOT EXISTS idx_students_category_id ON students(category_id);
          CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
          CREATE INDEX IF NOT EXISTS idx_tutors_school_id ON tutors(school_id);
          CREATE INDEX IF NOT EXISTS idx_exams_tutor_id ON exams(tutor_id);
          CREATE INDEX IF NOT EXISTS idx_questions_exam_id ON questions(exam_id);
          CREATE INDEX IF NOT EXISTS idx_schedules_exam_id ON exam_schedules(exam_id);
          CREATE INDEX IF NOT EXISTS idx_schedules_student_id ON exam_schedules(student_id);
          CREATE INDEX IF NOT EXISTS idx_payments_school_id ON payments(school_id);
        `
      },
      {
        name: '002_add_soft_delete_triggers',
        sql: `
          -- Add soft delete support if not exists
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name = 'students' AND column_name = 'deleted_at') THEN
              ALTER TABLE students ADD COLUMN deleted_at TIMESTAMP;
            END IF;

            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name = 'tutors' AND column_name = 'deleted_at') THEN
              ALTER TABLE tutors ADD COLUMN deleted_at TIMESTAMP;
            END IF;
          END $$;
        `
      },
      {
        name: '003_add_exam_tracking_columns',
        sql: `
          DO $$
          BEGIN
            -- exam_schedules additions
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name = 'exam_schedules' AND column_name = 'completed_at') THEN
              ALTER TABLE exam_schedules ADD COLUMN completed_at TIMESTAMP;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name = 'exam_schedules' AND column_name = 'auto_submitted') THEN
              ALTER TABLE exam_schedules ADD COLUMN auto_submitted BOOLEAN DEFAULT false;
            END IF;
            -- student_exams additions
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name = 'student_exams' AND column_name = 'auto_submitted') THEN
              ALTER TABLE student_exams ADD COLUMN auto_submitted BOOLEAN DEFAULT false;
            END IF;
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name = 'student_exams' AND column_name = 'started_at') THEN
              ALTER TABLE student_exams ADD COLUMN started_at TIMESTAMP;
            END IF;
          END $$;
        `
      },
      {
        name: '004_add_assigned_questions',
        sql: `
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name = 'student_exams' AND column_name = 'assigned_questions') THEN
              ALTER TABLE student_exams ADD COLUMN assigned_questions JSONB;
            END IF;
          END $$;
        `
      },
      {
        name: '005_add_student_username',
        sql: `
          DO $$
          BEGIN
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                          WHERE table_name = 'students' AND column_name = 'username') THEN
              ALTER TABLE students ADD COLUMN username VARCHAR(100);
              ALTER TABLE students ADD CONSTRAINT students_username_key UNIQUE (username);
            END IF;
          END $$;
        `
      },
      {
        name: '006_create_student_tutors',
        sql: `
          CREATE TABLE IF NOT EXISTS student_tutors (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
            tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(student_id, tutor_id)
          );
          CREATE INDEX IF NOT EXISTS idx_student_tutors_student_id ON student_tutors(student_id);
          CREATE INDEX IF NOT EXISTS idx_student_tutors_tutor_id ON student_tutors(tutor_id);
        `
      }
    ];

    // Execute pending migrations
    for (const migration of migrations) {
      if (!executedMigrations.includes(migration.name)) {
        logger.info(`Executing migration: ${migration.name}`);

        await client.query('BEGIN');

        try {
          await client.query(migration.sql);
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [migration.name]
          );

          await client.query('COMMIT');
          logger.info(`Migration ${migration.name} completed`);
        } catch (error) {
          await client.query('ROLLBACK');
          throw error;
        }
      } else {
        logger.info(`Migration ${migration.name} already executed, skipping`);
      }
    }

    logger.info('Database migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(console.error);
