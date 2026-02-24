import axios from 'axios';

async function testStudents() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      role: 'school',
      username: 'admin1',
      password: 'password123',
    });

    const token = loginRes.data.data.token;

    const studentsRes = await axios.get('http://localhost:5000/api/students', {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 10 }
    });

    console.log("Returned Students Array Length:", studentsRes.data.data.length);
    if (studentsRes.data.data.length > 0) {
      console.log("Sample Student Payload:", JSON.stringify({
        id: studentsRes.data.data[0].id,
        name: studentsRes.data.data[0].full_name,
        assigned_tutors: studentsRes.data.data[0].assigned_tutors
      }, null, 2));
    }
  } catch(e: any) {
    console.log("Error Fetching:", e.response?.data || e.message);
  }
}

testStudents();
