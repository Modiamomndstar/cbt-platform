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
