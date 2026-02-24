import { db } from "./src/config/database";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function check() {
  const examId = '63614692-48fc-4917-a1c7-2b0d3087a851';
  const schoolId = '550e8400-e29b-41d4-a716-446655440000';
  const tutorId = '550e8400-e29b-41d4-a716-446655440001';

  try {
    console.log("Testing Exam Query...");
    let query = `SELECT e.*, s.name as school_name, t.full_name as tutor_name
                 FROM exams e
                 JOIN schools s ON e.school_id = s.id
                 JOIN tutors t ON e.tutor_id = t.id
                 WHERE e.id = $1 AND e.tutor_id = $2`;
    const res1 = await db.query(query, [examId, tutorId]);
    console.log("Exam Query Rows:", res1.rows.length);

    console.log("Testing Schedule ExamCheck Query...");
    const res2 = await db.query(
        `SELECT e.*, e.passing_score FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE e.id = $1 AND t.school_id = $2`,
        [examId, schoolId],
      );
    console.log("Schedule ExamCheck Rows:", res2.rows.length);

    console.log("Testing Schedule List Query...");
    const res3 = await db.query(
        `SELECT es.*,
              s.full_name, s.first_name, s.last_name, s.email, s.student_id,
              sc.name as category_name,
              ext.full_name as ext_full_name, ext.email as ext_email,
              se.score,
              (SELECT COALESCE(SUM((q->>'marks')::int), 0) FROM jsonb_array_elements(se.assigned_questions) q) as se_total_marks,
              se.percentage,
              se.time_spent, se.started_at as se_start_time, se.submitted_at as se_end_time,
              se.auto_submitted as se_auto_submitted, se.status as se_status
       FROM exam_schedules es
       LEFT JOIN students s ON es.student_id = s.id
       LEFT JOIN external_students ext ON es.external_student_id = ext.id
       LEFT JOIN student_categories sc ON s.category_id = sc.id
       LEFT JOIN student_exams se ON se.exam_schedule_id = es.id
       WHERE es.exam_id = $1 AND es.status != 'cancelled'
       ORDER BY es.scheduled_date DESC, es.start_time`,
        [examId],
      );
    console.log("Schedule List Rows:", res3.rows.length);

  } catch (e: any) {
    console.error("Error SQL:", e.message);
  }
  process.exit(0);
}
check();
