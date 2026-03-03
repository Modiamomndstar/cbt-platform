import { pool } from './src/config/database';

async function test() {
  const client = await pool.connect();
  try {
    console.log('Testing INSERT into settings...');
    const result = await client.query(`
      INSERT INTO settings (key, value, description, category)
      VALUES ('referral_reward_credits_test', '100', 'Test', 'referral')
      ON CONFLICT (key) DO NOTHING
      RETURNING *
    `);
    console.log('Result:', result.rows);
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

test().catch(console.error);
