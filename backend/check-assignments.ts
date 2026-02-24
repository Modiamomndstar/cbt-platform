import { db } from './src/config/database';
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkAssignments() {
  const result = await db.query(`SELECT student_id, tutor_id FROM student_tutors`);
  console.log('All assignments:', result.rows);

  const studentResult = await db.query(`
    SELECT s.id, s.full_name,
           (SELECT COALESCE(json_agg(json_build_object('id', t.id, 'name', t.full_name, 'subjects', t.subjects)), '[]'::json)
            FROM student_tutors st
            JOIN tutors t ON st.tutor_id = t.id
            WHERE st.student_id = s.id) as assigned_tutors
    FROM students s
  `);
  console.log('Students with assignments test:', JSON.stringify(studentResult.rows, null, 2));

  process.exit(0);
}

checkAssignments();
