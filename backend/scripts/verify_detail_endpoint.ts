import { Pool } from 'pg';
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
  host: 'localhost', // Force localhost for running script from host machine
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'cbt_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const API_URL = 'http://localhost:5000/api';

async function verify() {
  const client = await pool.connect();
  try {
    // 1. Get a tutor and their school
    const tutorRes = await client.query(`SELECT id, school_id, username FROM tutors LIMIT 1`);
    if (tutorRes.rows.length === 0) throw new Error('No tutors found');
    const tutor = tutorRes.rows[0];

    // 2. Login to get token
    console.log(`Logging in as ${tutor.username}...`);
    const loginRes = await axios.post(`${API_URL}/auth/tutor/login`, {
      schoolId: tutor.school_id,
      username: tutor.username,
      password: 'password123' // Assuming default password from seed
    });
    const token = loginRes.data.token;
    console.log('Login successful.');

    // 3. Find a student_exam result
    const resultRes = await client.query(`SELECT id FROM student_exams WHERE status IN ('completed', 'failed', 'expired') LIMIT 1`);
    if (resultRes.rows.length === 0) {
        console.log('No completed exams found. Creating a dummy result? No, skipping.');
        return;
    }
    const resultId = resultRes.rows[0].id;
    console.log(`Found Result ID: ${resultId}`);

    // 4. Call Detailed Endpoint
    console.log(`Fetching details for ${resultId}...`);
    try {
        const detailRes = await axios.get(`${API_URL}/results/${resultId}/detail`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        const data = detailRes.data.data;
        console.log('Detail Fetch Successful!');
        console.log(`Student: ${data.studentName}`);
        console.log(`Score: ${data.score}/${data.totalMarks}`);
        console.log(`Questions Returned: ${data.questions.length}`);

        if (data.questions.length > 0) {
            console.log('Sample Question:');
            console.log(JSON.stringify(data.questions[0], null, 2));
        } else {
            console.warn('No questions found in this result (maybe older data?)');
        }

    } catch (apiErr: any) {
        console.error('API Error:', apiErr.response ? apiErr.response.data : apiErr.message);
    }

  } catch (err) {
    console.error('Verification Failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

verify();
