import { db } from "./src/config/database";
import * as dotenv from "dotenv";
import * as path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function check() {
  const result = await db.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'exams'`);
  console.log("Exams columns:", result.rows);
  process.exit(0);
}
check();
