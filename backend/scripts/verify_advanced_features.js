const axios = require('axios');
const { Client } = require('pg');

const API_URL = 'http://localhost:5000/api';
const DB_CONFIG = {
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'db',
  database: process.env.DB_NAME || 'cbt_platform',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
};

async function run() {
  const client = new Client(DB_CONFIG);
  await client.connect();

  try {
    console.log("Starting Advanced Features Verification...");

    // 1. Create Test Data directly in DB to save time/complexity
    // Tutor
    const tutorRes = await client.query("SELECT id, school_id FROM tutors LIMIT 1");
    if (tutorRes.rows.length === 0) throw new Error("No tutor found");
    const tutor = tutorRes.rows[0];

    // Student
    const studentRes = await client.query("SELECT id FROM students WHERE school_id = $1 LIMIT 1", [tutor.school_id]);
    if (studentRes.rows.length === 0) throw new Error("No student found");
    const student = studentRes.rows[0];

    // Exam
    const examRes = await client.query(
      `INSERT INTO exams (school_id, tutor_id, title, description, category, duration, duration_minutes, total_questions, shuffle_questions, show_result_immediately)
       VALUES ($1, $2, 'Advanced Logic Test', 'Testing stratified sampling', 'General', 10, 10, 10, true, true)
       RETURNING id`,
      [tutor.school_id, tutor.id]
    );
    const examId = examRes.rows[0].id;
    console.log("Created Exam:", examId);

    // Questions (15 Total: 5 Hard, 5 Medium, 5 Easy)
    // Hard (fill_blank, 5 marks)
    for (let i = 0; i < 5; i++) {
        await client.query(
            `INSERT INTO questions (exam_id, question_text, question_type, marks, correct_answer)
             VALUES ($1, $2, 'fill_blank', 5, 'answer')`,
            [examId, `Hard Q ${i}`]
        );
    }
    // Medium (multiple_choice, 3 marks)
    for (let i = 0; i < 5; i++) {
        await client.query(
            `INSERT INTO questions (exam_id, question_text, question_type, marks, correct_answer, options)
             VALUES ($1, $2, 'multiple_choice', 3, 'A', '["A", "B", "C", "D"]')`,
            [examId, `Medium Q ${i}`]
        );
    }
    // Easy (true_false, 2 marks)
    for (let i = 0; i < 5; i++) {
        await client.query(
            `INSERT INTO questions (exam_id, question_text, question_type, marks, correct_answer)
             VALUES ($1, $2, 'true_false', 2, 'True')`,
            [examId, `Easy Q ${i}`]
        );
    }
    console.log("Inserted 15 Questions (5 Hard, 5 Medium, 5 Easy)");

    const randomSuffix = Math.floor(Math.random() * 10000);
    const username = `test_user_${randomSuffix}`;
    const scheduleRes = await client.query(
        `INSERT INTO exam_schedules (exam_id, student_id, scheduled_date, start_time, end_time, access_code, exam_username, exam_password, status, created_by)
         VALUES ($1, $2, CURRENT_DATE, '00:00', '23:59', 'TEST01', $3, 'test_pass', 'scheduled', $4)
         RETURNING id, exam_username, exam_password`,
        [examId, student.id, username, tutor.id]
    );
    const schedule = scheduleRes.rows[0];
    console.log("Scheduled Exam:", schedule.id);

    // 2. Login as Student
    const loginRes = await axios.post(`${API_URL}/auth/student/login`, {
        username: schedule.exam_username,
        password: schedule.exam_password
    });
    const token = loginRes.data.data.token;
    console.log("Student Logged In");

    // 3. Verify Access (Check Stratified Sampling)
    const accessRes = await axios.post(
        `${API_URL}/schedules/verify-access`,
        {
            scheduleId: schedule.id,
            accessCode: 'TEST01',
            timezone: 'UTC'
        },
        { headers: { Authorization: `Bearer ${token}` } }
    );

    const questions = accessRes.data.data.questions;
    console.log(`Fetched ${questions.length} questions.`);

    const hardCount = questions.filter(q => (q.questionType || q.question_type) === 'fill_blank').length;
    const mediumCount = questions.filter(q => (q.questionType || q.question_type) === 'multiple_choice').length;
    const easyCount = questions.filter(q => (q.questionType || q.question_type) === 'true_false').length;

    console.log(`Distribution: Hard=${hardCount}, Medium=${mediumCount}, Easy=${easyCount}`);

    // Expected: 10 Total.
    if (questions.length !== 10) console.error("FAILURE: Total questions mismatch");
    if (hardCount < 3 || hardCount > 3 || mediumCount < 3 || mediumCount > 3 || easyCount < 4 || easyCount > 4) console.warn("WARNING: Distribution might be off");
    else console.log("SUCCESS: Stratified Sampling seems correct.");

    // 4. Submit Exam (Check Dynamic Scoring)
    // Answer 1 Hard (5pts), 1 Medium (3pts), 1 Easy (2pts). Total Score should be 10.
    // Total Possible Marks should be sum of ALL assigned questions.
    // 3 Hard * 5 = 15
    // 3 Medium * 3 = 9
    // 4 Easy * 2 = 8
    // Total Possible = 32 (Approx, depends on exact sample)

    // Let's calculate EXPECTED total possible from actual assigned questions
    const expectedTotalPossible = questions.reduce((sum, q) => sum + (parseFloat(q.marks) || 0), 0);
    console.log("Expected Total Possible Marks:", expectedTotalPossible);

    const answers = {};
    // Answer first of each type correctly
    const firstHard = questions.find(q => (q.questionType || q.question_type) === 'fill_blank');
    if (firstHard) answers[firstHard.id] = 'answer';

    const firstMedium = questions.find(q => (q.questionType || q.question_type) === 'multiple_choice');
    if (firstMedium) answers[firstMedium.id] = 'A';
    if (firstMedium) console.log("Answering Medium Q:", firstMedium.id);

    const firstEasy = questions.find(q => (q.questionType || q.question_type) === 'true_false');
    if (firstEasy) answers[firstEasy.id] = 'True';
    if (firstEasy) console.log("Answering Easy Q:", firstEasy.id);

    const submitRes = await axios.post(
        `${API_URL}/results/submit`,
        {
            scheduleId: schedule.id,
            answers: answers,
            timeSpentMinutes: 5
        },
        { headers: { Authorization: `Bearer ${token}` } }
    );

    const result = submitRes.data.data;
    console.log("Submission Result:", result);

    console.log("Score:", result.score);
    console.log("Total Marks:", result.totalMarks);
    console.log("Percentage:", result.percentage);

    const expectedScore = (firstHard ? 5 : 0) + (firstMedium ? 3 : 0) + (firstEasy ? 2 : 0);

    if (result.score === expectedScore) {
        console.log(`SUCCESS: Score matches expected (${expectedScore}).`);
    } else {
        console.error(`FAILURE: Score mismatch. Expected ${expectedScore}, got ${result.score}`);
    }

    if (result.totalMarks === expectedTotalPossible) {
        console.log(`SUCCESS: Total Marks match assigned questions (${expectedTotalPossible}).`);
    } else {
         console.error(`FAILURE: Total Marks mismatch. Expected ${expectedTotalPossible}, got ${result.totalMarks}`);
    }

  } catch (err) {
    console.error("Verification Failed:", err.message);
    if (err.response) {
        console.error("API Error Data:", err.response.data);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
