import { db } from "./src/config/database";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function check() {
  const examId = '63614692-48fc-4917-a1c7-2b0d3087a851';

  try {
    const result = await db.query(
        `INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, marks, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          examId,
          "What is the output of print(2**3)?",
          "multiple_choice",
          JSON.stringify(["6", "8", "9", "Error"]),
          "1",
          3,
          1,
        ],
      );
    console.log("Success:", result.rows);
  } catch (e: any) {
    console.error("Error SQL:", e.message);
  }
  process.exit(0);
}
check();
