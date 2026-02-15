const { pool } = require("../dist/src/config/database");
async function run() {
  const client = await pool.connect();
  try {
    console.log("Syncing duration columns...");
    await client.query("UPDATE exams SET duration = duration_minutes WHERE duration_minutes IS NOT NULL");
    console.log("Updated.");

    const res = await client.query("SELECT title, duration, duration_minutes FROM exams WHERE title='Test Exam 1'");
    console.table(res.rows);
  } catch(e) { console.error(e); }
  finally { client.release(); pool.end(); }
}
run();
