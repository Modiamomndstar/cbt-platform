import axios from 'axios';

async function testApi() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/tutor/login', {
      schoolId: '550e8400-e29b-41d4-a716-446655440000',
      username: 'john',
      password: 'password123',
    });
    const token = loginRes.data.data.token;
    console.log("Logged in:", !!token);

    const examId = '63614692-48fc-4917-a1c7-2b0d3087a851';

    console.log("Fetching exam API...");
    try {
      const examRes = await axios.get(`http://localhost:5000/api/exams/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Exam Res:", examRes.data.success);
    } catch(e: any) {
      console.log("Exam Error:", e.response?.data || e.message);
    }

    console.log("Fetching schedule API...");
    try {
      const schRes = await axios.get(`http://localhost:5000/api/schedules/exam/${examId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Schedule Res:", schRes.data.success);
    } catch(e: any) {
      console.log("Schedule Error:", e.response?.data || e.message);
    }

  } catch(e: any) {
    console.log("Error Fetching:", e.response?.data || e.message);
  }
}

testApi();
