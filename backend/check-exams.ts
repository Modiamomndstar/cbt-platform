import dotenv from 'dotenv';
dotenv.config();
import { pool } from './src/config/database';

async function verifyTables() {
  try {
    let res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'exams'");
    console.log("exams columns:", res.rows.map(r => r.column_name));

    res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'schedules'");
    console.log("schedules columns:", res.rows.map(r => r.column_name));

    res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'student_exams'");
    console.log("student_exams columns:", res.rows.map(r => r.column_name));

    res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'exam_schedules'");
    console.log("exam_schedules columns:", res.rows.map(r => r.column_name));

  } catch(e) { console.error(e); }
  finally { process.exit(); }
}
verifyTables();
