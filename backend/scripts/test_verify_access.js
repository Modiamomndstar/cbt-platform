const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

async function test() {
  try {
    // 1. Login with Exam Credentials
    // 1. Login with Exam Credentials
    console.log("Logging in...");
    const loginRes = await axios.post(`${API_URL}/auth/student/login`, {
      username: 'exam_user',
      password: 'exam_pass'
    });

    const token = loginRes.data.data.accessToken || loginRes.data.data.token;
    console.log("Logged in.");

    // 2. Get Schedule ID
    console.log("Fetching my-exams...");
    const examsRes = await axios.get(`${API_URL}/schedules/student/my-exams`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const schedule = examsRes.data.data.find(s => s.examTitle === 'Test Exam 1');
    if(!schedule) {
      console.log("Schedule 'Test Exam 1' not found in my-exams");
      console.log("Available:", examsRes.data.data.map(s => s.examTitle));
      return;
    }
    console.log("Found Schedule:", schedule.id);
    console.log("My-Exams Duration:", schedule.durationMinutes);

    // 3. Verify Access
    console.log("Verifying Verify-Access...");
    const verifyRes = await axios.post(`${API_URL}/schedules/verify-access`, {
      scheduleId: schedule.id,
      accessCode: 'TEST12',
      timezone: 'UTC'
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log("Verify Response Duration:", verifyRes.data.data.durationMinutes);
    // console.log("Full Data:", JSON.stringify(verifyRes.data.data, null, 2));

  } catch (e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}

test();
