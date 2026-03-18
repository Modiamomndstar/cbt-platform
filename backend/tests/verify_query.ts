import { pool } from "../src/config/database";

async function verifyQuery() {
  try {
    const result = await pool.query(`
      SELECT sc.*, s.name as school_name, sa.name as staff_name, sa.username as staff_username
      FROM sales_commissions sc
      JOIN schools s ON sc.school_id = s.id
      JOIN staff_accounts sa ON sc.staff_id = sa.id
      WHERE 1=1
      ORDER BY sc.created_at DESC
    `);
    console.log("SUCCESS: Query executed perfectly. Rows found:", result.rows.length);
    process.exit(0);
  } catch (error: any) {
    console.error("FAILURE: Query error:", error.message);
    process.exit(1);
  }
}

verifyQuery();
