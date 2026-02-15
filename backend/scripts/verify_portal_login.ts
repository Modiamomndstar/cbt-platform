import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Helper to login as school admin
async function loginAsSchool() {
  try {
    const res = await axios.post(`${API_URL}/auth/school/login`, {
      username: 'testschool',
      password: 'password123'
    });
    return res.data.data.token;
  } catch (err: any) {
    console.error('School login failed:', err.message);
    process.exit(1);
  }
}

async function verifyPortalLogin() {
  try {
    console.log('--- Verifying Phase 2: Permanent Student Identity ---');

    // 1. Login as School Admin
    const schoolToken = await loginAsSchool();
    console.log('[PASS] School Admin logged in');

    // 2. Create a new student (testing auto-username generation)
    // We use a random name to ensure unique base
    const randomSuffix = Math.floor(Math.random() * 10000);
    const firstName = `TestStudent`;
    const lastName = `PhaseTwo${randomSuffix}`;
    const fullName = `${firstName} ${lastName}`;

    console.log(`Creating student with name: ${fullName}`);

    const createRes = await axios.post(`${API_URL}/students`, {
      fullName,
      studentId: `STU${randomSuffix}`,
      email: `teststudent${randomSuffix}@example.com`,
      // Phone is optional
      // categoryId: undefined, // Optional
      level: 'SS2',
    }, {
      headers: { Authorization: `Bearer ${schoolToken}` }
    });

    if (!createRes.data.success) {
      throw new Error(`Failed to create student: ${createRes.data.message}`);
    }

    const student = createRes.data.data;
    console.log('[PASS] Student created successfully');
    console.log('       Student Object:', JSON.stringify(student, null, 2));
    console.log(`       ID: ${student.id}`);
    console.log(`       Username: ${student.username}`);
    // Check if username was generated correctly (should be teststudentphasetwo...)
    if (student.username && !student.username.includes('teststudent')) {
        console.warn(`[WARN] Username ${student.username} might not match expectation based on name`);
    } else if (!student.username) {
        throw new Error('Username is missing in response');
    }

    // 3. Attempt Portal Login (using default password 'password123' set in create logic)
    // Note: The create logic in students.ts sets password_hash for 'password123'
    console.log('Attempting Portal Login with generated username and default password...');

    try {
        const loginRes = await axios.post(`${API_URL}/auth/student/portal-login`, {
            username: student.username,
            password: 'password123'
        });

        if (loginRes.data.success) {
            console.log('[PASS] Student Portal Login successful');
            console.log(`       Token received: ${!!loginRes.data.data.token}`);
            console.log(`       Role: ${loginRes.data.data.user.role}`);
        } else {
             throw new Error('Login response was not success');
        }

    } catch (err: any) {
        throw new Error(`Portal Login Failed: ${err.response?.data?.message || err.message}`);
    }

    // 4. Attempt Invalid Login
    console.log('Attempting Portal Login with wrong password...');
    try {
        await axios.post(`${API_URL}/auth/student/portal-login`, {
            username: student.username,
            password: 'wrongpassword'
        });
        console.error('[FAIL] Login should have failed but succeeded');
    } catch (err: any) {
        if (err.response && err.response.status === 401) {
            console.log('[PASS] Login failed as expected with 401');
        } else {
            console.error(`[FAIL] Expected 401 but got ${err.response?.status || err.message}`);
        }
    }

    console.log('--- Verification Complete: SUCCESS ---');

  } catch (error: any) {
    console.error('--- Verification Failed ---');
    console.error(error.response?.data || error.message);
    process.exit(1);
  }
}

verifyPortalLogin();
