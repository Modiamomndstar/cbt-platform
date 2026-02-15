const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'cbt_platform',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

async function run() {
  const client = await pool.connect();
  try {
    const res = await client.query("SELECT DISTINCT question_type FROM questions");
    console.log("Distinct Question Types:");
    console.table(res.rows);

    console.log("Exams:");
    console.table(res.rows);

    // Also check schedules
    const sched = await client.query("SELECT id, exam_id, start_time, end_time FROM exam_schedules");
    console.log("Schedules:");
    console.table(sched.rows);
  } catch(e) { console.error(e); }
  finally {
    client.release();
    pool.end();
  }
}
run();
