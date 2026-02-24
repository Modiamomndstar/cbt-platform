import dotenv from 'dotenv';
dotenv.config();

import { pool } from './src/config/database';

async function run() {
  try {
    // Set freemium plan to allow max 5 external students per tutor
    await pool.query(
      `UPDATE plan_definitions SET max_external_per_tutor = 5 WHERE plan_type = 'freemium'`
    );
    console.log('✅ Freemium plan: max_external_per_tutor set to 5');

    const r = await pool.query('SELECT plan_type, display_name, max_external_per_tutor FROM plan_definitions ORDER BY plan_type');
    console.table(r.rows);

    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
