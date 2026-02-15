const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function migrateCredentials() {
  const client = await pool.connect();
  try {
    console.log('Starting credentials migration...');

    // 1. Add columns if not exist
    await client.query(`
      ALTER TABLE exam_schedules
      ADD COLUMN IF NOT EXISTS exam_username VARCHAR(50),
      ADD COLUMN IF NOT EXISTS exam_password VARCHAR(50)
    `);
    console.log('Added columns to exam_schedules');

    // 2. Fetch schedules without credentials
    const { rows } = await client.query(`
      SELECT es.id, s.registration_number, s.id as student_id
      FROM exam_schedules es
      JOIN students s ON es.student_id = s.id
      WHERE es.exam_username IS NULL OR es.exam_password IS NULL
    `);

    console.log(`Found ${rows.length} schedules to backfill`);

    // 3. Generate and update credentials
    for (const row of rows) {
      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
      const password = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 chars

      // Username format: exam_STU123_ABCD
      // If registration number is null, use slice of id or fallback
      const regPart = row.registration_number ? row.registration_number : 'STU' + row.student_id.substring(0, 4);
      const username = `exam_${regPart}_${randomSuffix}`.replace(/[^a-zA-Z0-9_]/g, '');

      await client.query(`
        UPDATE exam_schedules
        SET exam_username = $1, exam_password = $2
        WHERE id = $3
      `, [username, password, row.id]);
    }

    console.log('Migration completed successfully');

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    pool.end();
  }
}

migrateCredentials();
