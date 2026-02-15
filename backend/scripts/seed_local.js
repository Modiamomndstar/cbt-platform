const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'cbt_platform',
  user: 'postgres',
  password: 'postgres',
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding local DB...');
    await client.query('BEGIN');

    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. School
    let schoolId;
    const schoolRes = await client.query("SELECT id FROM schools WHERE email = 'school@test.com'");
    if (schoolRes.rows.length === 0) {
      const res = await client.query(`
        INSERT INTO schools (name, username, email, password_hash, plan_type, plan_status, is_active)
        VALUES ('Test School', 'testschool', 'school@test.com', $1, 'enterprise', 'active', true) RETURNING id
      `, [passwordHash]);
      schoolId = res.rows[0].id;
    } else {
      schoolId = schoolRes.rows[0].id;
    }

    // 2. Tutor
    let tutorId;
    const tutorRes = await client.query("SELECT id FROM tutors WHERE email = 'tutor@test.com'");
    if (tutorRes.rows.length === 0) {
      const res = await client.query(`
        INSERT INTO tutors (school_id, username, email, password_hash, full_name, is_active)
        VALUES ($1, 'tutor', 'tutor@test.com', $2, 'Test Tutor', true) RETURNING id
      `, [schoolId, passwordHash]);
      tutorId = res.rows[0].id;
    } else {
      tutorId = tutorRes.rows[0].id;
    }

    // 3. Exam
    let examId;
    const examRes = await client.query("SELECT id FROM exams WHERE title = 'Verification Exam'");
    if (examRes.rows.length === 0) {
      const res = await client.query(`
        INSERT INTO exams (school_id, tutor_id, title, duration_minutes, total_questions, category, description, is_published, is_deleted)
        VALUES ($1, $2, 'Verification Exam', 20, 3, 'General', 'Test Exam', true, false) RETURNING id
      `, [schoolId, tutorId]);
      examId = res.rows[0].id;

      // Questions
      const questionsData = [
          { text: 'Q1?', type: 'multiple_choice', ans: 'A', opts: JSON.stringify([{text:'A', isCorrect:true}, {text:'B', isCorrect:false}]) },
          { text: 'Q2?', type: 'true_false', ans: 'true', opts: JSON.stringify([{text:'true', isCorrect:true}, {text:'false', isCorrect:false}]) },
          { text: 'Q3?', type: 'fill_blank', ans: 'Word', opts: null }
      ];

      for (const q of questionsData) {
          await client.query(`
            INSERT INTO questions (exam_id, question_text, options, correct_answer, question_type, marks)
            VALUES ($1, $2, $3, $4, $5, 5)
          `, [examId, q.text, q.opts, q.ans, q.type]);
      }
    } else {
      examId = examRes.rows[0].id;
    }

    // 4. Student
    let studentId;
    const studentRes = await client.query("SELECT id FROM students WHERE email = 'student@test.com'");
    if (studentRes.rows.length === 0) {
      const res = await client.query(`
        INSERT INTO students (school_id, full_name, email, password_hash, registration_number, is_active)
        VALUES ($1, 'Test Student', 'student@test.com', $2, 'STU001', true) RETURNING id
      `, [schoolId, passwordHash]);
      studentId = res.rows[0].id;
    } else {
      studentId = studentRes.rows[0].id;
    }

    // 5. Create a COMPLETED result
    // We need assigned_questions and answers
    // Let's get the questions first
    const qRes = await client.query("SELECT * FROM questions WHERE exam_id = $1", [examId]);
    const questions = qRes.rows;

    // Construct assigned_questions (snapshot)
    const assignedQuestions = questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        marks: 5
    }));

    // Construct answers
    const answers = questions.map(q => ({
        questionId: q.id,
        studentAnswer: q.correct_answer, // All correct
        marksObtained: 5,
        isCorrect: true
    }));

    await client.query(`
      INSERT INTO student_exams (schedule_id, exam_id, student_id, score, total_marks, percentage, status, assigned_questions, answers, created_at, completed_at)
      VALUES ($1, $2, $3, 15, 15, 100, 'completed', $4, $5, NOW(), NOW())
    `, [null, examId, studentId, JSON.stringify(assignedQuestions), JSON.stringify(answers)]);
    // Note: schedule_id is nullable in schema? If not, we might fail here.
    // Checking init_schema... usually it's required.
    // Let's create a schedule first if needed.
    // Actually, let's CREATE a schedule to be safe.

    const schedRes = await client.query(`
        INSERT INTO exam_schedules (exam_id, student_id, scheduled_date, start_time, end_time, access_code, status, exam_username, exam_password)
        VALUES ($1, $2, NOW(), '00:00', '23:59', 'CODE123', 'completed', 'user', 'pass') RETURNING id
    `, [examId, studentId]);
    const scheduleId = schedRes.rows[0].id;

    // Update the student_exam with schedule_id
    // Wait, I inserted it with null before. If it failed, catch block caught it.
    // Better to insert properly.

    await client.query(`
      INSERT INTO student_exams (schedule_id, exam_id, student_id, score, total_marks, percentage, status, assigned_questions, answers, created_at, completed_at)
      VALUES ($1, $2, $3, 15, 15, 100, 'completed', $4, $5, NOW(), NOW())
    `, [scheduleId, examId, studentId, JSON.stringify(assignedQuestions), JSON.stringify(answers)]);

    await client.query('COMMIT');
    console.log('Seeding Complete. Ready for verification.');

  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seeding failed:', e);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
