const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
// Try demo tutor first, then fallback to test tutor
const CREDENTIALS = [
    { schoolId: 'school-123', username: 'demotutor', password: 'password123' },
    { schoolId: 'school-uuid', username: 'tutor', password: 'password123' }, // from seed
    { email: 'tutor@test.com', password: 'password123', schoolId: 'school-123' } // assuming email login works? Usually auth is strictly username/schoolId for tutors in this app
];

async function verify() {
  let token = '';

  // 1. Login
  console.log('Attempting login...');
  for (const cred of CREDENTIALS) {
      try {
          console.log(`Trying ${cred.username || cred.email}...`);
          const res = await axios.post(`${API_URL}/auth/tutor/login`, cred);
          token = res.data.token;
          console.log('Login successful!');
          break;
      } catch (err) {
          // console.log('Login failed:', err.response?.data?.message || err.message);
      }
  }

  if (!token) {
      console.error('Could not login with any known credentials. Exiting.');
      return;
  }

  // 2. Get Results List to find an ID
  console.log('Fetching results list...');
  let resultId = '';
  try {
      const listRes = await axios.get(`${API_URL}/results/school-results?page=1&limit=1`, {
          headers: { Authorization: `Bearer ${token}` }
      });

      const results = listRes.data.data;
      if (results.length > 0) {
          resultId = results[0].id;
          console.log(`Found result ID: ${resultId}`);
      } else {
          console.log('No results found for this tutor. Cannot verify detail endpoint.');
          return;
      }
  } catch (err) {
      console.error('Failed to fetch results list:', err.response?.data || err.message);
      return;
  }

  // 3. Get Detail
  console.log(`Fetching detail for ${resultId}...`);
  try {
      const detailRes = await axios.get(`${API_URL}/results/${resultId}/detail`, {
          headers: { Authorization: `Bearer ${token}` }
      });

      const data = detailRes.data.data;
      console.log('--- Detail API Response ---');
      console.log(`Student: ${data.studentName}`);
      console.log(`Exam: ${data.examTitle}`);
      console.log(`Score: ${data.score} / ${data.totalMarks} (${data.percentage}%)`);
      console.log(`Questions: ${data.questions.length}`);

      if (data.questions.length > 0) {
          const q = data.questions[0];
          console.log('\nSample Question 1:');
          console.log(`Text: ${q.text}`);
          console.log(`Type: ${q.type}`);
          console.log(`Student Answer: ${JSON.stringify(q.studentAnswer)}`);
          console.log(`Correct Answer: ${q.correctAnswer}`);
          console.log(`Marks: ${q.marksObtained} / ${q.marks}`);
          console.log(`Is Correct: ${q.isCorrect}`);
      }
      console.log('\n✅ Verification Passed!');

  } catch (err) {
      console.error('Failed to fetch detail:', err.response?.data || err.message);
  }
}

verify();
