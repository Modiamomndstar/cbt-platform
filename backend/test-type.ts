import { db } from "./src/config/database";

async function run() {
  const result = await db.query(`
    SELECT s.id, s.full_name,
           (SELECT COALESCE(json_agg(json_build_object('id', t.id, 'name', t.full_name, 'subjects', t.subjects)), '[]'::json)
            FROM student_tutors st
            JOIN tutors t ON st.tutor_id = t.id
            WHERE st.student_id = s.id) as assigned_tutors
    FROM students s
  `);

  const students = result.rows;
  console.log("Is First Student Array?", Array.isArray(students[1].assigned_tutors));
  console.log("Typeof:", typeof students[1].assigned_tutors);
  console.log("Raw object:", students[1].assigned_tutors);
  process.exit(0);
}
run();
