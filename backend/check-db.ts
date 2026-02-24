import dotenv from 'dotenv';
dotenv.config();
import { pool } from './src/config/database';

async function verifyTables() {
  try {
    let res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'school_settings'");
    console.log("school_settings columns:", res.rows.map(r => r.column_name));

    res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'external_students'");
    console.log("external_students columns:", res.rows.map(r => r.column_name));

    res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'student_categories'");
    console.log("student_categories columns:", res.rows.map(r => r.column_name));

  } catch(e) { console.error(e); }
  finally { process.exit(); }
}
verifyTables();
