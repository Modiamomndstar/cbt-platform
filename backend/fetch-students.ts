import axios from "axios";

async function testStudents() {
  try {
    const loginRes = await axios.post("http://localhost:5000/api/auth/login", {
      role: "school",
      username: "admin1",
      password: "password123",
    });

    const token = loginRes.data.data.token;

    const studentsRes = await axios.get("http://localhost:5000/api/students?limit=10", {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(JSON.stringify(studentsRes.data.data.map((s: any) => ({
      name: s.full_name,
      tutors: s.assigned_tutors
    })), null, 2));

  } catch(e: any) {
    console.log(e.response?.data || e.message);
  }
}

testStudents();
