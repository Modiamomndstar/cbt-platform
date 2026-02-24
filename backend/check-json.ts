import { db } from "./src/config/database";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function check() {
  try {
    const result = await db.query(`
      SELECT es.id,
        (SELECT COALESCE(SUM((q->>'marks')::int), 0) FROM jsonb_array_elements(se.assigned_questions) q) as se_total_marks
      FROM exam_schedules es
      LEFT JOIN student_exams se ON se.exam_schedule_id = es.id
      LIMIT 1
    `);
    console.log("Success:", result.rows);
  } catch (e: any) {
    console.error("Error:", e.message);
  }
  process.exit(0);
}
check();
