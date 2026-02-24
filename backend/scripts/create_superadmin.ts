import dotenv from 'dotenv';
dotenv.config();

import { pool } from '../src/config/database';
import bcrypt from 'bcryptjs';

async function createSuperAdmin() {
  const client = await pool.connect();
  try {
    const passwordHash = await bcrypt.hash('superadmin123', 12);

    // Check if it already exists
    const check = await client.query('SELECT * FROM staff_accounts WHERE username = $1', ['superadmin']);
    if (check.rows.length > 0) {
      console.log('Super Admin already exists. Username: superadmin, Password: superadmin123');
      return;
    }

    await client.query(
      `INSERT INTO staff_accounts (name, email, username, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['Super Admin', 'admin@cbtplatform.com', 'superadmin', passwordHash, 'super_admin', true]
    );

    console.log('Super Admin created successfully!');
    console.log('Login URL: http://localhost:5173/admin/login');
    console.log('Username: superadmin');
    console.log('Password: superadmin123');

  } catch (err) {
    console.error('Error creating super admin:', err);
  } finally {
    client.release();
    process.exit(0);
  }
}

createSuperAdmin();
