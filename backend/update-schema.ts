import dotenv from 'dotenv';
dotenv.config();
import { pool } from './src/config/database';

async function updateCategories() {
  try {
    console.log("Adding tutor_id to student_categories...");
    await pool.query(`
      ALTER TABLE student_categories
      ADD COLUMN IF NOT EXISTS tutor_id UUID REFERENCES tutors(id) ON DELETE CASCADE;
    `);
    console.log("SUCCESS!");
  } catch(e) { console.error(e); }
  finally { process.exit(); }
}
updateCategories();
