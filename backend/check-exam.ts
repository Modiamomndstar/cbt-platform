import { db } from "./src/config/database";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function check() {
  const result = await db.query(`SELECT id, title, school_id, tutor_id FROM exams ORDER BY created_at DESC LIMIT 1`);
  console.log("Latest Exam:", result.rows);

  const tutorId = result.rows[0].tutor_id;
  const tutorResult = await db.query(`SELECT id, full_name, school_id FROM tutors WHERE id = $1`, [tutorId]);
  console.log("Tutor who created:", tutorResult.rows);
  process.exit(0);
}
check();
