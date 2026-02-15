const { pool: dbPool } = require("../src/config/database");
const bcrypt = require("bcryptjs");

async function seedTestData() {
  const client = await dbPool.connect();
  try {
    await client.query("BEGIN");

    // Hash password "password123"
    // We can't use bcrypt directly easily if headers are weird, but let's try.
    // Standard bcrypt hash for "password123" is roughly:
    // $2a$10$w....
    const passwordHash = await bcrypt.hash("password123", 10);

    console.log("Using password hash for 'password123'");

    // 1. School
    let schoolResult = await client.query("SELECT id FROM schools WHERE email = 'school@test.com'");
    let schoolId;
    if (schoolResult.rows.length === 0) {
       const res = await client.query(`
         INSERT INTO schools (name, username, email, password_hash, plan_type, plan_status, is_active)
         VALUES ('Test School', 'testschool', 'school@test.com', $1, 'enterprise', 'active', true) RETURNING id
       `, [passwordHash]);
       schoolId = res.rows[0].id;
       console.log("Created School:", schoolId);
    } else {
       schoolId = schoolResult.rows[0].id;
    }

    // 2. Tutor
    let tutorResult = await client.query("SELECT id FROM tutors WHERE email = 'tutor@test.com'");
    let tutorId;
    if (tutorResult.rows.length === 0) {
       const res = await client.query(`
         INSERT INTO tutors (school_id, username, email, password_hash, full_name, is_active)
         VALUES ($1, 'tutor', 'tutor@test.com', $2, 'Test Tutor', true) RETURNING id
       `, [schoolId, passwordHash]);
       tutorId = res.rows[0].id;
       console.log("Created Tutor:", tutorId);
    } else {
       tutorId = tutorResult.rows[0].id;
    }

    // 3. Exam
    let examResult = await client.query("SELECT id FROM exams WHERE title = 'Test Exam 1'");
    let examId;
    if (examResult.rows.length === 0) {
       const res = await client.query(`
         INSERT INTO exams (school_id, tutor_id, title, duration_minutes, total_questions, category, description, is_published, is_deleted)
         VALUES ($1, $2, 'Test Exam 1', 10, 5, 'General', 'Answer all questions', true, false) RETURNING id
       `, [schoolId, tutorId]);
       examId = res.rows[0].id;
       console.log("Created Exam:", examId);

       // Questions
       for (let i=1; i<=10; i++) {
         await client.query(`
           INSERT INTO questions (exam_id, question_text, options, correct_answer, question_type)
           VALUES ($1, 'Question ${i}', '[{"text":"A","isCorrect":true},{"text":"B","isCorrect":false}]', 'A', 'multiple_choice')
         `, [examId]);
       }
    } else {
       examId = examResult.rows[0].id;
    }

    // 4. Student
    let studentResult = await client.query("SELECT id FROM students WHERE email = 'student@test.com'");
    let studentId;
    if (studentResult.rows.length === 0) {
       const res = await client.query(`
         INSERT INTO students (school_id, full_name, email, password_hash, registration_number, is_active)
         VALUES ($1, 'Test Student', 'student@test.com', $2, 'STU001', true) RETURNING id
       `, [schoolId, passwordHash]);
       studentId = res.rows[0].id;
       console.log("Created Student:", studentId);
    } else {
       studentId = studentResult.rows[0].id;
    }

    // 5. Schedule Exam for Student (Optional, but good for quick test)
    // We want to test verify-access, so we need a scheduled exam.
    // Let's schedule it for TODAY.
    let scheduleResult = await client.query("SELECT id FROM exam_schedules WHERE exam_id = $1 AND student_id = $2", [examId, studentId]);
    if (scheduleResult.rows.length === 0) {
       const today = new Date().toISOString().split('T')[0];
       const startTime = "00:00"; // All day
       const endTime = "23:59";
       const accessCode = "TEST12";

       await client.query(`
         INSERT INTO exam_schedules (exam_id, student_id, scheduled_date, start_time, end_time, access_code, status, exam_username, exam_password)
         VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', 'exam_user', 'exam_pass')
       `, [examId, studentId, today, startTime, endTime, accessCode]);
       console.log("Scheduled Exam for Student. Access Code: TEST12");
    }

    await client.query("COMMIT");
    console.log("Test data seeded successfully");
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
  } finally {
    client.release();
    dbPool.end();
  }
}

seedTestData();
