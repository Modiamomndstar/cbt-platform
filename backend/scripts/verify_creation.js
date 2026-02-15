const axios = require('axios');
const API_URL = 'http://localhost:5000/api';

async function test() {
  try {
    // 1. Login as Tutor
    console.log("Logging in as Tutor...");
    // Tutor login in seed: tutor@test.com / password123
    // Need School ID. Seed script created 'Test School'.
    // We can try to login. But we need schoolId for tutor/login.
    // Let's use seed script knowledge or fetch schools first? No public school list.
    // Maybe we login as Admin first?
    // Or simpler: Inspect DB to get Tutor ID and generate token?
    // Let's use the 'exam_creation' logic.

    // Easier: Login as SCHOOL ADMIN (if we have creds) -> Get Tutors -> Login?
    // Seed script created: name='Test School', username='testschool', email='school@test.com', password='password123'.

    const schoolLogin = await axios.post(`${API_URL}/auth/school/login`, {
      username: 'testschool',
      password: 'password123'
    });
    const schoolToken = schoolLogin.data.data.token;
    const schoolId = schoolLogin.data.data.user.id;
    console.log("School Logged in. ID:", schoolId);

    // Login as Tutor
    // We created tutor 'tutor' / 'password123' in seed.
    const tutorLogin = await axios.post(`${API_URL}/auth/tutor/login`, {
      schoolId: schoolId,
      username: 'tutor',
      password: 'password123'
    });
    const tutorToken = tutorLogin.data.data.token;
    console.log("Tutor Logged in.");

    // 2. Create Exam
    console.log("Creating Exam with Duration 15...");
    const createRes = await axios.post(`${API_URL}/exams`, {
      title: 'API Verification Exam',
      description: 'Testing duration sync',
      category: 'General',
      duration: 15,
      totalQuestions: 5,
      passingScore: 50,
      shuffleQuestions: true,
      shuffleOptions: true,
      showResultImmediately: true
    }, {
      headers: { Authorization: `Bearer ${tutorToken}` }
    });

    const exam = createRes.data.data;
    console.log("Created Exam ID:", exam.id);
    console.log("Returned Duration:", exam.duration);
    console.log("Returned DurationMinutes:", exam.duration_minutes);

    // 3. Verify via GET
    const getRes = await axios.get(`${API_URL}/exams/${exam.id}`, {
      headers: { Authorization: `Bearer ${tutorToken}` }
    });
    console.log("GET Title:", getRes.data.data.title);
    console.log("GET Duration:", getRes.data.data.duration);
    console.log("GET DurationMinutes:", getRes.data.data.duration_minutes);

    if (getRes.data.data.duration == 15 && getRes.data.data.duration_minutes == 15) {
      console.log("SUCCESS: Both columns synced.");
    } else {
      console.log("FAILURE: Columns mismatch.");
    }

  } catch (e) {
    console.error("Error:", e.response ? e.response.data : e.message);
  }
}

test();
