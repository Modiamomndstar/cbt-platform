import { db } from "./src/config/database";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function check() {
  try {
    const res1 = await db.query(`ALTER TABLE exam_schedules ALTER COLUMN student_id DROP NOT NULL;`);
    console.log("Migration Success");

  } catch (e: any) {
    console.error("Migration Error:", e.message);
  }
  process.exit(0);
}
check();
