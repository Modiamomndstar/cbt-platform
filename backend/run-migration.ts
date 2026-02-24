import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();
import { pool } from './src/config/database';

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, 'migrations', '008_sprint3.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("Executing Sprint 3 Queries...");
    await pool.query(sql);
    console.log("SUCCESS!");

  } catch(e) { console.error(e); }
  finally { process.exit(); }
}
runMigration();
