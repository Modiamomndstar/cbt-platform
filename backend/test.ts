import dotenv from 'dotenv';
dotenv.config();
import { pool } from './src/config/database';

async function test() {
  try {
    const res = await pool.query(`
      SELECT s.id, s.student_id, s.full_name, s.email, s.phone, s.date_of_birth, s.gender,
             s.parent_name, s.parent_phone, s.is_active, s.created_at,
             sc.id as category_id, sc.name as category_name, sc.color as category_color
      FROM students s
      LEFT JOIN student_categories sc ON s.category_id = sc.id
      LEFT JOIN LATERAL (
       SELECT array_agg(json_build_object('id', t.id, 'name', t.full_name)) as tutors
       FROM student_tutors st
       JOIN tutors t ON st.tutor_id = t.id
       WHERE st.student_id = s.id
      ) as assigned_tutors ON true
      LIMIT 1
    `);
    console.log('SUCCESS:', res.rows);
  } catch (err: any) {
    console.error('SQL ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}

test();
