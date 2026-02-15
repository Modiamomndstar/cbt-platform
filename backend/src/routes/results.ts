import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// Submit exam answers
router.post(
  "/submit",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { scheduleId, answers, timeSpentMinutes, autoSubmitted } = req.body;
      const user = req.user!;

      await client.query("BEGIN");

      // Get exam details
      const scheduleResult = await client.query(
        `SELECT es.*, e.duration_minutes, e.total_marks, e.pass_mark_percentage
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       WHERE es.id = $1 AND es.student_id = $2`,
        [scheduleId, user.id],
      );

      if (scheduleResult.rows.length === 0) {
        await client.query("ROLLBACK");
        return res
          .status(404)
          .json({ success: false, message: "Exam schedule not found" });
      }

      const schedule = scheduleResult.rows[0];

      // Get student_exams record to retrieve assigned questions
      const studentExamRows = await client.query(
        `SELECT id, assigned_questions FROM student_exams WHERE schedule_id = $1`,
        [scheduleId]
      );

      let assignedQuestions: any[] = [];
      if (studentExamRows.rows.length > 0) {
         assignedQuestions = studentExamRows.rows[0].assigned_questions || [];
      }

      // If no assigned questions found (legacy or error), fallback to all exam questions IF assigned_questions is empty
      // But ideally we should rely on assigned_questions for the dynamic scoring fix.

      let questions: any[] = [];

      if (assignedQuestions.length > 0) {
         // Use assigned questions
         questions = assignedQuestions;
      } else {
         // Fallback: Get all questions from bank (Legacy behavior, but we want to avoid this if possible)
         const questionsResult = await client.query(
           `SELECT id, correct_answer, marks, question_type FROM questions
            WHERE exam_id = $1 AND is_deleted = false`,
           [schedule.exam_id],
         );
         questions = questionsResult.rows;
      }

      let totalScore = 0;
      let correctAnswers = 0;
      let totalQuestions = questions.length;
      let totalPossibleMarks = 0;

      // Process answers
      const answerRecords: any[] = [];
      for (const question of questions) {
        const studentAnswer = answers[question.id] || "";
        let isCorrect = false;
        let marksObtained = 0;
        const qMarks = parseFloat(question.marks) || 0;

        totalPossibleMarks += qMarks;

        if (
          question.question_type === "multiple_choice" ||
          question.question_type === "true_false"
        ) {
          isCorrect =
            studentAnswer.toLowerCase() ===
            question.correct_answer.toLowerCase();
          marksObtained = isCorrect ? qMarks : 0;
        } else if (question.question_type === "theory") {
          // Theory questions need manual grading
          marksObtained = 0;
          isCorrect = false;
        } else if (question.question_type === "fill_blank") {
             isCorrect =
            studentAnswer.toLowerCase().trim() ===
            question.correct_answer.toLowerCase().trim();
          marksObtained = isCorrect ? qMarks : 0;
        }

        if (isCorrect) correctAnswers++;
        totalScore += marksObtained;

        answerRecords.push({
          questionId: question.id,
          studentAnswer,
          correctAnswer: question.correct_answer,
          isCorrect,
          marksObtained,
          maxMarks: qMarks,
        });
      }

      // Calculate percentage
      // Use totalPossibleMarks from the assigned questions, NOT schedule.total_marks (which might be exam-level aggregate)
      const percentage =
        totalPossibleMarks > 0
          ? (totalScore / totalPossibleMarks) * 100
          : 0;
      const passed = percentage >= schedule.pass_mark_percentage;



      // Update student_exams record
      const studentExamResult = await client.query(
        `UPDATE student_exams
       SET end_time = NOW(),
           score = $1,
           total_marks = $2,
           percentage = $3,
           status = $4,
           time_spent_minutes = $5,
           answers = $6,
           auto_submitted = $7
       WHERE schedule_id = $8
       RETURNING *`,
        [
          totalScore,
          totalPossibleMarks, // Save the specific total marks for this student attempt
          percentage,
          passed ? "completed" : "failed",
          timeSpentMinutes,
          JSON.stringify(answerRecords),
          autoSubmitted || false,
          scheduleId,
        ],
      );

      // Update schedule status with completed_at and auto_submitted
      await client.query(
        `UPDATE exam_schedules SET status = 'completed', completed_at = NOW(), auto_submitted = $2, updated_at = NOW() WHERE id = $1`,
        [scheduleId, autoSubmitted || false],
      );

      await client.query("COMMIT");

      // Check if we should show result immediately
      const showResult = await client.query(`SELECT show_result_immediately FROM exams WHERE id = $1`, [schedule.exam_id]);
      const shouldShow = showResult.rows[0]?.show_result_immediately;

      res.json({
        success: true,
        message: "Exam submitted successfully",
        data: shouldShow ? {
          score: totalScore,
          totalMarks: totalPossibleMarks,
          percentage: percentage.toFixed(2),
          passed,
          correctAnswers,
          totalQuestions,
          timeSpentMinutes,
          answers: answerRecords,
        } : {}, // Empty data if not showing result
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Submit exam error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to submit exam" });
    } finally {
      client.release();
    }
  },
);

// Get exam result for student
router.get(
  "/my-result/:scheduleId",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { scheduleId } = req.params;
      const user = req.user!;

      const result = await client.query(
        `SELECT se.*,
              e.title as exam_title, e.description, e.duration_minutes, e.total_marks as exam_total_marks, e.pass_mark_percentage,
              es.scheduled_date, es.start_time, es.end_time as schedule_end_time
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       JOIN exam_schedules es ON se.schedule_id = es.id
       WHERE se.schedule_id = $1 AND se.student_id = $2`,
        [scheduleId, user.id],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Result not found" });
      }

      const row = result.rows[0];

      res.json({
        success: true,
        data: {
          id: row.id,
          examTitle: row.exam_title,
          description: row.description,
          score: row.score,
          totalMarks: row.total_marks,
          percentage: row.percentage,
          status: row.status,
          timeSpentMinutes: row.time_spent_minutes,
          startTime: row.start_time,
          endTime: row.end_time,
          scheduledDate: row.scheduled_date,
          answers: row.answers,
          passed: row.percentage >= row.pass_mark_percentage,
        },
      });
    } catch (error) {
      console.error("Get result error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch result" });
    } finally {
      client.release();
    }
  },
);

// Get detailed exam result (with questions/answers) for Tutor/School
router.get(
  "/:id/detail",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const user = req.user!;

      // Verify exam belongs to user's school
      const result = await client.query(
        `SELECT se.*,
              e.title as exam_title, e.duration_minutes, e.total_marks as exam_total_marks, e.pass_mark_percentage,
              s.full_name, s.first_name, s.last_name, s.registration_number, s.email
         FROM student_exams se
         JOIN exams e ON se.exam_id = e.id
         JOIN students s ON se.student_id = s.id
         JOIN tutors t ON e.tutor_id = t.id
         WHERE se.id = $1 AND t.school_id = $2`,
        [id, user.schoolId],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Result not found" });
      }

      const row = result.rows[0];
      const assignedQuestions = row.assigned_questions || [];
      const answers = row.answers || []; // JSON array: { questionId, studentAnswer, marksObtained, ... }

      // Map answers to questions for a complete view
      const detailedQuestions = assignedQuestions.map((q: any) => {
        const answerRecord = answers.find((a: any) => a.questionId === q.id);
        const studentAnswer = answerRecord ? answerRecord.studentAnswer : null;
        const marksObtained = answerRecord ? answerRecord.marksObtained : 0;
        const isCorrect = answerRecord ? answerRecord.isCorrect : false;

        return {
          id: q.id,
          text: q.question_text,
          type: q.question_type,
          options: q.options,
          correctAnswer: q.correct_answer,
          marks: parseFloat(q.marks),
          studentAnswer,
          marksObtained,
          isCorrect,
          explanation: q.explanation || null // In case we add explanations later
        };
      });

      res.json({
        success: true,
        data: {
          id: row.id,
          studentName: row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
          registrationNumber: row.registration_number,
          examTitle: row.exam_title,
          score: parseFloat(row.score),
          totalMarks: parseFloat(row.total_marks),
          percentage: parseFloat(row.percentage),
          passed: parseFloat(row.percentage) >= row.pass_mark_percentage,
          status: row.status,
          timeSpentMinutes: row.time_spent_minutes,
          submittedAt: row.end_time || row.completed_at,
          questions: detailedQuestions
        },
      });
    } catch (error) {
      console.error("Get detailed result error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch detailed result" });
    } finally {
      client.release();
    }
  },
);

// Get all results for an exam (tutor/school view)
router.get(
  "/exam/:examId",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId } = req.params;
      const { search, status, categoryId } = req.query;
      const user = req.user!;

      // Verify exam belongs to user's school
      const examCheck = await client.query(
        `SELECT e.* FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE e.id = $1 AND t.school_id = $2`,
        [examId, user.schoolId],
      );

      if (examCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Exam not found" });
      }

      let query = `
      SELECT se.*,
             s.full_name, s.first_name, s.last_name, s.email, s.registration_number,
             sc.name as category_name,
             es.scheduled_date, es.started_at as schedule_started_at, es.completed_at, es.auto_submitted as schedule_auto_submitted,
             e.pass_mark_percentage
      FROM student_exams se
      JOIN students s ON se.student_id = s.id
      LEFT JOIN student_categories sc ON s.category_id = sc.id
      JOIN exam_schedules es ON se.schedule_id = es.id
      JOIN exams e ON se.exam_id = e.id
      WHERE se.exam_id = $1
    `;

      const params: any[] = [examId];
      let paramIndex = 2;

      if (search) {
        query += ` AND (s.full_name ILIKE $${paramIndex} OR s.first_name ILIKE $${paramIndex} OR s.last_name ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex} OR s.registration_number ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        query += ` AND se.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (categoryId) {
        query += ` AND s.category_id = $${paramIndex}`;
        params.push(categoryId);
        paramIndex++;
      }

      query += ` ORDER BY se.score DESC, s.last_name`;

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows.map((row) => {
          const passed = row.percentage !== null ? parseFloat(row.percentage) >= (row.pass_mark_percentage || 50) : null;
          return {
            id: row.id,
            studentId: row.student_id,
            studentName: row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown',
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            registrationNumber: row.registration_number,
            categoryName: row.category_name,
            score: row.score !== null ? parseFloat(row.score) : null,
            totalMarks: row.total_marks !== null ? parseFloat(row.total_marks) : null,
            percentage: row.percentage !== null ? parseFloat(row.percentage) : null,
            passed,
            status: row.status,
            timeSpentMinutes: row.time_spent_minutes,
            startedAt: row.schedule_started_at || row.start_time,
            completedAt: row.completed_at || row.end_time,
            autoSubmitted: row.schedule_auto_submitted || row.auto_submitted || false,
            scheduledDate: row.scheduled_date,
            submittedAt: row.end_time,
          };
        }),
      });
    } catch (error) {
      console.error("Get exam results error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch results" });
    } finally {
      client.release();
    }
  },
);

// Get student's exam history
router.get(
  "/my-history",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = req.user!;
      const { page = 1, limit = 10 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      const result = await client.query(
        `SELECT se.*,
              e.title as exam_title, e.description, e.duration_minutes, e.pass_mark_percentage,
              es.scheduled_date,
              t.full_name as tutor_full_name, t.first_name as tutor_first_name, t.last_name as tutor_last_name
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       JOIN exam_schedules es ON se.schedule_id = es.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE se.student_id = $1
       ORDER BY se.end_time DESC
       LIMIT $2 OFFSET $3`,
        [user.id, limit, offset],
      );

      const countResult = await client.query(
        `SELECT COUNT(*) FROM student_exams WHERE student_id = $1`,
        [user.id],
      );

      const totalCount = parseInt(countResult.rows[0].count);

      res.json({
        success: true,
        data: result.rows.map((row) => ({
          id: row.id,
          examTitle: row.exam_title,
          description: row.description,
          tutorName: row.tutor_full_name || `${row.tutor_first_name || ''} ${row.tutor_last_name || ''}`.trim() || 'Tutor',
          score: row.score,
          totalMarks: row.total_marks,
          percentage: row.percentage,
          status: row.status,
          passed: row.percentage >= row.pass_mark_percentage,
          timeSpentMinutes: row.time_spent_minutes,
          scheduledDate: row.scheduled_date,
          submittedAt: row.end_time,
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get exam history error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch exam history" });
    } finally {
      client.release();
    }
  },
);

// Grade theory questions (manual grading)
router.post(
  "/grade-theory",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { studentExamId, grades } = req.body;
      const user = req.user!;

      // Verify student exam belongs to user's school
      const examCheck = await client.query(
        `SELECT se.* FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE se.id = $1 AND t.school_id = $2`,
        [studentExamId, user.schoolId],
      );

      if (examCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Student exam not found" });
      }

      const studentExam = examCheck.rows[0];
      let answers = studentExam.answers || [];
      let totalScore = 0;

      // Update grades for theory questions
      for (const grade of grades) {
        const answerIndex = answers.findIndex(
          (a: any) => a.questionId === grade.questionId,
        );
        if (answerIndex !== -1) {
          answers[answerIndex].marksObtained = grade.marks;
          answers[answerIndex].isCorrect = grade.marks > 0;
          answers[answerIndex].gradedBy = user.id;
          answers[answerIndex].gradedAt = new Date();
          answers[answerIndex].feedback = grade.feedback;
        }
      }

      // Recalculate total score
      totalScore = answers.reduce(
        (sum: number, a: any) => sum + (a.marksObtained || 0),
        0,
      );
      const percentage =
        studentExam.total_marks > 0
          ? (totalScore / studentExam.total_marks) * 100
          : 0;

      await client.query(
        `UPDATE student_exams
       SET score = $1, percentage = $2, answers = $3, status = $4
       WHERE id = $5`,
        [
          totalScore,
          percentage,
          JSON.stringify(answers),
          percentage >= studentExam.pass_mark_percentage
            ? "completed"
            : "failed",
          studentExamId,
        ],
      );

      res.json({
        success: true,
        message: "Theory questions graded successfully",
        data: {
          score: totalScore,
          totalMarks: studentExam.total_marks,
          percentage: percentage.toFixed(2),
        },
      });
    } catch (error) {
      console.error("Grade theory error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to grade theory questions" });
    } finally {
      client.release();
    }
  },
);

// Get exam statistics
router.get(
  "/exam/:examId/statistics",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId } = req.params;
      const user = req.user!;

      // Verify exam belongs to user's school
      const examCheck = await client.query(
        `SELECT e.* FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE e.id = $1 AND t.school_id = $2`,
        [examId, user.schoolId],
      );

      if (examCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Exam not found" });
      }

      // Get statistics
      const statsResult = await client.query(
        `SELECT
        COUNT(*) as total_students,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_count,
        AVG(score) as average_score,
        MAX(score) as highest_score,
        MIN(score) as lowest_score,
        AVG(percentage) as average_percentage
       FROM student_exams
       WHERE exam_id = $1`,
        [examId],
      );

      const stats = statsResult.rows[0];

      // Get grade distribution
      const gradeDistribution = await client.query(
        `SELECT
        CASE
          WHEN percentage >= 70 THEN 'A'
          WHEN percentage >= 60 THEN 'B'
          WHEN percentage >= 50 THEN 'C'
          WHEN percentage >= 40 THEN 'D'
          ELSE 'F'
        END as grade,
        COUNT(*) as count
       FROM student_exams
       WHERE exam_id = $1
       GROUP BY
        CASE
          WHEN percentage >= 70 THEN 'A'
          WHEN percentage >= 60 THEN 'B'
          WHEN percentage >= 50 THEN 'C'
          WHEN percentage >= 40 THEN 'D'
          ELSE 'F'
        END
       ORDER BY grade`,
        [examId],
      );

      res.json({
        success: true,
        data: {
          totalStudents: parseInt(stats.total_students),
          completedCount: parseInt(stats.completed_count),
          failedCount: parseInt(stats.failed_count),
          inProgressCount: parseInt(stats.in_progress_count),
          averageScore: parseFloat(stats.average_score || 0).toFixed(2),
          highestScore: parseFloat(stats.highest_score || 0).toFixed(2),
          lowestScore: parseFloat(stats.lowest_score || 0).toFixed(2),
          averagePercentage: parseFloat(stats.average_percentage || 0).toFixed(
            2,
          ),
          gradeDistribution: gradeDistribution.rows,
        },
      });
    } catch (error) {
      console.error("Get exam statistics error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch statistics" });
    } finally {
      client.release();
    }
  },
);
// Get all results for school (efficient centralized query)
router.get(
  "/school-results",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = req.user!;
      const { search, status, categoryId, examId, startDate, endDate, page = 1, limit = 20 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      let query = `
      SELECT se.*,
             COALESCE(s.full_name,
               NULLIF(TRIM(CONCAT(s.first_name, ' ', s.last_name)), ''),
               s.email,
               s.registration_number,
               'Unknown Student'
             ) as student_name,
             s.email, s.registration_number,
             sc.name as category_name,
             e.title as exam_title,
             e.category as exam_category,
             es.scheduled_date, es.started_at as schedule_started_at, es.completed_at, es.auto_submitted as schedule_auto_submitted,
             e.pass_mark_percentage, e.total_marks as exam_total_marks
      FROM student_exams se
      JOIN students s ON se.student_id = s.id
      LEFT JOIN student_categories sc ON s.category_id = sc.id
      JOIN exam_schedules es ON se.schedule_id = es.id
      JOIN exams e ON se.exam_id = e.id
      JOIN tutors t ON e.tutor_id = t.id
      WHERE t.school_id = $1
    `;

      const params: any[] = [user.schoolId];
      let paramIndex = 2;

      if (examId && examId !== 'all') {
        query += ` AND se.exam_id = $${paramIndex}`;
        params.push(examId);
        paramIndex++;
      }

      if (categoryId && categoryId !== 'all') {
        query += ` AND e.category = $${paramIndex}`; // Filter by exam category (or student category? usually exam category for results)
        params.push(categoryId);
        paramIndex++;
      }

      if (status && status !== 'all') {
        query += ` AND se.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (search) {
        query += ` AND (
          s.full_name ILIKE $${paramIndex} OR
          s.first_name ILIKE $${paramIndex} OR
          s.last_name ILIKE $${paramIndex} OR
          s.email ILIKE $${paramIndex} OR
          s.registration_number ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND es.scheduled_date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
         query += ` AND es.scheduled_date <= $${paramIndex}`;
         params.push(endDate);
         paramIndex++;
      }

      // Count total for pagination
      const countQuery = `SELECT COUNT(*) FROM (${query}) as count_table`;
      const countResult = await client.query(countQuery, params);
      const totalCount = parseInt(countResult.rows[0].count);

      // Add ordering and pagination
      query += ` ORDER BY es.scheduled_date DESC, se.score DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows.map((row) => {
          const passed = row.percentage !== null ? parseFloat(row.percentage) >= (row.pass_mark_percentage || 50) : null;
          return {
            id: row.id,
            studentId: row.student_id,
            studentName: row.student_name,
            email: row.email,
            registrationNumber: row.registration_number,
            categoryName: row.category_name,
            examTitle: row.exam_title,
            examCategory: row.exam_category,
            score: row.score !== null ? parseFloat(row.score) : null,
            totalMarks: row.total_marks !== null ? parseFloat(row.total_marks) : null,
            percentage: row.percentage !== null ? parseFloat(row.percentage) : null,
            passed,
            status: row.status,
            timeSpentMinutes: row.time_spent_minutes,
            scheduledDate: row.scheduled_date,
            submittedAt: row.end_time || row.completed_at,
          };
        }),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          totalCount,
          totalPages: Math.ceil(totalCount / Number(limit)),
        },
      });
    } catch (error) {
      console.error("Get school results error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch school results" });
    } finally {
      client.release();
    }
  },
);

// Export results to CSV
router.get(
  "/export",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = req.user!;
      const { search, status, categoryId, examId, startDate, endDate } = req.query;

      // Reuse the same query logic (simplified)
      let query = `
      SELECT se.*,
             COALESCE(s.full_name, NULLIF(TRIM(CONCAT(s.first_name, ' ', s.last_name)), ''), s.email, s.registration_number, 'Unknown Student') as student_name,
             s.email, s.registration_number,
             sc.name as category_name,
             e.title as exam_title, e.category as exam_category,
             es.scheduled_date, se.started_at, se.end_time,
             se.score, se.total_marks, se.percentage, se.status, se.time_spent_minutes
      FROM student_exams se
      JOIN students s ON se.student_id = s.id
      LEFT JOIN student_categories sc ON s.category_id = sc.id
      JOIN exam_schedules es ON se.schedule_id = es.id
      JOIN exams e ON se.exam_id = e.id
      JOIN tutors t ON e.tutor_id = t.id
      WHERE t.school_id = $1
    `;

      const params: any[] = [user.schoolId];
      let paramIndex = 2;

      if (examId && examId !== 'all') {
        query += ` AND se.exam_id = $${paramIndex}`;
        params.push(examId);
        paramIndex++;
      }
      if (categoryId && categoryId !== 'all') {
        query += ` AND e.category = $${paramIndex}`;
        params.push(categoryId);
        paramIndex++;
      }
      if (status && status !== 'all') {
        query += ` AND se.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }
      if (search) {
        query += ` AND (s.full_name ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex} OR s.registration_number ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
        paramIndex++;
      }
      if (startDate) {
        query += ` AND es.scheduled_date >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }
      if (endDate) {
         query += ` AND es.scheduled_date <= $${paramIndex}`;
         params.push(endDate);
         paramIndex++;
      }

      query += ` ORDER BY es.scheduled_date DESC, se.score DESC`;

      const result = await client.query(query, params);

      // Generate CSV
      const headers = ['Student Name', 'Email', 'Reg Number', 'Category', 'Exam Title', 'Exam Category', 'Scheduled Date', 'Status', 'Score', 'Total Marks', 'Percentage', 'Time Spent (min)', 'Submitted At'];
      const rows = result.rows.map((row: any) => [
        `"${row.student_name.replace(/"/g, '""')}"`,
        `"${(row.email || '').replace(/"/g, '""')}"`,
        `"${(row.registration_number || '').replace(/"/g, '""')}"`,
        `"${(row.category_name || '').replace(/"/g, '""')}"`,
        `"${(row.exam_title || '').replace(/"/g, '""')}"`,
        `"${(row.exam_category || '').replace(/"/g, '""')}"`,
        new Date(row.scheduled_date).toLocaleDateString(),
        row.status,
        row.score,
        row.total_marks,
        `${Number(row.percentage).toFixed(2)}%`,
        row.time_spent_minutes,
        row.end_time ? new Date(row.end_time).toLocaleString() : '-'
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((r: any[]) => r.join(','))
      ].join('\n');

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="exam_results_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);

    } catch (error) {
      console.error("Export results error:", error);
      res.status(500).json({ success: false, message: "Failed to export results" });
    } finally {
      client.release();
    }
  },
);

export default router;
