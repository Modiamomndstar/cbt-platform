import { pool } from './src/config/database';

async function check() {
  const client = await pool.connect();
  try {
    console.log('\nChecking columns of settings...');
    const columns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'settings'
    `);
    console.log('settings columns:', columns.rows.map(c => `${c.column_name} (${c.data_type})`));
  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
