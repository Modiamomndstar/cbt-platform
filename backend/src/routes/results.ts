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
      const { scheduleId, answers, timeSpentMinutes } = req.body;
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

      // Get questions
      const questionsResult = await client.query(
        `SELECT id, correct_answer, marks, question_type FROM questions
       WHERE exam_id = $1 AND is_deleted = false`,
        [schedule.exam_id],
      );

      const questions = questionsResult.rows;
      let totalScore = 0;
      let correctAnswers = 0;
      let totalQuestions = questions.length;

      // Process answers
      const answerRecords: any[] = [];
      for (const question of questions) {
        const studentAnswer = answers[question.id] || "";
        let isCorrect = false;
        let marksObtained = 0;

        if (
          question.question_type === "multiple_choice" ||
          question.question_type === "true_false"
        ) {
          isCorrect =
            studentAnswer.toLowerCase() ===
            question.correct_answer.toLowerCase();
          marksObtained = isCorrect ? question.marks : 0;
        } else if (question.question_type === "theory") {
          // Theory questions need manual grading
          marksObtained = 0;
          isCorrect = false;
        }

        if (isCorrect) correctAnswers++;
        totalScore += marksObtained;

        answerRecords.push({
          questionId: question.id,
          studentAnswer,
          correctAnswer: question.correct_answer,
          isCorrect,
          marksObtained,
          maxMarks: question.marks,
        });
      }

      // Calculate percentage
      const percentage =
        schedule.total_marks > 0
          ? (totalScore / schedule.total_marks) * 100
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
           answers = $6
       WHERE schedule_id = $7
       RETURNING *`,
        [
          totalScore,
          schedule.total_marks,
          percentage,
          passed ? "completed" : "failed",
          timeSpentMinutes,
          JSON.stringify(answerRecords),
          scheduleId,
        ],
      );

      // Update schedule status
      await client.query(
        `UPDATE exam_schedules SET status = 'completed' WHERE id = $1`,
        [scheduleId],
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Exam submitted successfully",
        data: {
          score: totalScore,
          totalMarks: schedule.total_marks,
          percentage: percentage.toFixed(2),
          passed,
          correctAnswers,
          totalQuestions,
          timeSpentMinutes,
          answers: answerRecords,
        },
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
             s.first_name, s.last_name, s.email, s.registration_number,
             sc.name as category_name,
             es.scheduled_date
      FROM student_exams se
      JOIN students s ON se.student_id = s.id
      LEFT JOIN student_categories sc ON s.category_id = sc.id
      JOIN exam_schedules es ON se.schedule_id = es.id
      WHERE se.exam_id = $1
    `;

      const params: any[] = [examId];
      let paramIndex = 2;

      if (search) {
        query += ` AND (s.first_name ILIKE $${paramIndex} OR s.last_name ILIKE $${paramIndex} OR s.email ILIKE $${paramIndex} OR s.registration_number ILIKE $${paramIndex})`;
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
        data: result.rows.map((row) => ({
          id: row.id,
          studentId: row.student_id,
          firstName: row.first_name,
          lastName: row.last_name,
          email: row.email,
          registrationNumber: row.registration_number,
          categoryName: row.category_name,
          score: row.score,
          totalMarks: row.total_marks,
          percentage: row.percentage,
          status: row.status,
          timeSpentMinutes: row.time_spent_minutes,
          scheduledDate: row.scheduled_date,
          submittedAt: row.end_time,
        })),
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
              t.first_name as tutor_first_name, t.last_name as tutor_last_name
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
          tutorName: `${row.tutor_first_name} ${row.tutor_last_name}`,
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

export default router;
