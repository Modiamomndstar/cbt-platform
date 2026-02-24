import { db } from "./src/config/database";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function check() {
  try {
    const res1 = await db.query(`ALTER TABLE exams ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0;`);
    console.log("Migration Success");

    // Recalculate existing exam total marks based on their current questions
    const res2 = await db.query(`
      UPDATE exams SET total_marks = (
        SELECT COALESCE(SUM(marks), 0) FROM questions WHERE exam_id = exams.id
      )
    `);
    console.log("Recalculation Success");

  } catch (e: any) {
    console.error("Migration Error:", e.message);
  }
  process.exit(0);
}
check();
