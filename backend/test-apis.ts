import axios from 'axios';
import dotenv from 'dotenv';
import { pool } from './src/config/database';

dotenv.config();

async function run() {
  try {
    const res = await pool.query("SELECT * FROM users WHERE role = 'school_admin' LIMIT 1");
    if (res.rows.length === 0) { console.log('no admin found'); process.exit(1); }
    const admin = res.rows[0];

    // we need to login or sign a jwt manually since we don't know the password
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
        { id: admin.id, role: admin.role, schoolId: admin.school_id },
        process.env.JWT_SECRET || 'fallback_secret',
        { expiresIn: '1d' }
    );

    const config = { headers: { Authorization: `Bearer ${token}` } };

    console.log('Testing GET /api/students...');
    try {
        const r1 = await axios.get('http://localhost:5000/api/students', config);
        console.log('Students:', r1.data.success);
    } catch (e: any) { console.error('Students failed:', e.response?.data || e.message); }

    console.log('Testing GET /api/categories...');
    try {
        const r2 = await axios.get('http://localhost:5000/api/categories', config);
        console.log('Categories:', r2.data.success);
    } catch (e: any) { console.error('Categories failed:', e.response?.data || e.message); }

    console.log('Testing GET /api/tutors...');
    try {
        const r3 = await axios.get('http://localhost:5000/api/tutors', config);
        console.log('Tutors:', r3.data.success);
    } catch (e: any) { console.error('Tutors failed:', e.response?.data || e.message); }

  } catch (err: any) {
    console.error('ERROR:', err.message);
  } finally {
    process.exit(0);
  }
}
run();
