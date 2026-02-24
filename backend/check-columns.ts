import dotenv from 'dotenv';
dotenv.config();

import { pool } from './src/config/database';

async function run() {
  try {
    const r = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'exam_schedules'
      ORDER BY ordinal_position
    `);
    console.table(r.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
