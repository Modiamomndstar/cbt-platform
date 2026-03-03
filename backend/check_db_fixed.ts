import dotenv from 'dotenv';
dotenv.config();
import { pool } from './src/config/database';

async function check() {
  const client = await pool.connect();
  try {
    console.log('\nChecking all tables in public schema...');
    const tables = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log('Existing tables:', tables.rows.map(r => r.table_name).sort());

    const checkTables = ['inbox_messages', 'inbox_broadcasts', 'migrations', 'tutors', 'staff_accounts', 'schools', 'settings'];
    for (const tableName of checkTables) {
      console.log(`\nChecking columns of ${tableName}...`);
      try {
        const columns = await client.query(`
          SELECT column_name, data_type
          FROM information_schema.columns
          WHERE table_name = $1
        `, [tableName]);
        if (columns.rows.length > 0) {
          console.log(`${tableName} columns:`, columns.rows.map(c => `${c.column_name} (${c.data_type})`));
        } else {
          console.log(`${tableName} does not exist (no columns found).`);
        }
      } catch (e: any) {
        console.log(`Error checking ${tableName}:`, e.message);
      }
    }

  } catch (err: any) {
    console.error('Error:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

check().catch(console.error);
