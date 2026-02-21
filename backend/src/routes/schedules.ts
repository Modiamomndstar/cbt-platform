import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authenticate, requireRole } from "../middleware/auth";
import { sendExamCredentials } from "../services/email";

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const router = Router();

// ─── Helper: check if a schedule has expired ──────────────────────────────────
function isScheduleExpired(scheduledDate: string, endTime: string): boolean {
  const date = new Date(scheduledDate);
  const [h, m] = (endTime || "23:59").split(":");
  date.setHours(parseInt(h), parseInt(m), 0, 0);
  return new Date() > date;
}

// ─── Helper: auto-expire overdue schedules for a given exam ───────────────────
async function autoExpireSchedules(client: any, examId?: string, studentId?: string) {
  // Find schedules that are still 'scheduled' but past their end time
  let query = `
    SELECT es.id, es.exam_id, es.student_id, es.scheduled_date, es.end_time,
           e.total_marks, e.pass_mark_percentage
    FROM exam_schedules es
    JOIN exams e ON es.exam_id = e.id
    WHERE es.status = 'scheduled'
  `;
  const params: any[] = [];

  if (examId) {
    params.push(examId);
    query += ` AND es.exam_id = $${params.length}`;
  }
  if (studentId) {
    params.push(studentId);
    query += ` AND es.student_id = $${params.length}`;
  }

  const result = await client.query(query, params);

  for (const row of result.rows) {
    if (isScheduleExpired(row.scheduled_date, row.end_time)) {
      // Mark schedule as expired
      await client.query(
        `UPDATE exam_schedules SET status = 'expired', updated_at = NOW() WHERE id = $1`,
        [row.id]
      );

      // Create a student_exams record with 0 score if none exists
      const existing = await client.query(
        `SELECT id FROM student_exams WHERE exam_schedule_id = $1`,
        [row.id]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO student_exams (student_id, exam_id, exam_schedule_id, score, total_marks, percentage, status, time_spent_minutes, answers)
           VALUES ($1, $2, $3, 0, $4, 0, 'expired', 0, '[]')`,
          [row.student_id, row.exam_id, row.id, row.total_marks || 0]
        );
      }
    }
  }
}

// ─── GET /available-students ──────────────────────────────────────────────────
router.get(
  "/available-students",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId, categoryId } = req.query;
      const user = req.user!;

      let query = `
      SELECT s.id, s.full_name, s.first_name, s.last_name, s.email, s.registration_number, s.category_id,
             sc.name as category_name
      FROM students s
      LEFT JOIN student_categories sc ON s.category_id = sc.id
      WHERE s.school_id = $1
        AND s.is_active = true
        AND s.id NOT IN (
          SELECT student_id FROM exam_schedules
          WHERE exam_id = $2 AND status NOT IN ('cancelled', 'expired')
        )
    `;

      const params: any[] = [user.schoolId, examId];

      if (user.role === 'tutor') {
        query += ` AND s.id IN (SELECT student_id FROM student_tutors WHERE tutor_id = $${params.length + 1})`;
        params.push(user.id);
      }

      if (categoryId && categoryId !== "all") {
        query += ` AND s.category_id = $${params.length + 1}`;
        params.push(categoryId);
      }

      query += ` ORDER BY s.full_name, s.last_name, s.first_name`;

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows.map((s) => ({
          id: s.id,
          studentName: s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown',
          firstName: s.first_name,
          lastName: s.last_name,
          email: s.email,
          registrationNumber: s.registration_number,
          categoryId: s.category_id,
          categoryName: s.category_name,
        })),
      });
    } catch (error) {
      console.error("Get available students error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch available students" });
    } finally {
      client.release();
    }
  },
);

// ─── GET /exam/:examId — tutor/school view with enriched data ─────────────────
router.get(
  "/exam/:examId",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId } = req.params;
      const user = req.user!;

      // Verify exam belongs to user's school
      const examCheck = await client.query(
        `SELECT e.*, e.pass_mark_percentage FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE e.id = $1 AND t.school_id = $2`,
        [examId, user.schoolId],
      );

      if (examCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Exam not found" });
      }

      const examPassMark = examCheck.rows[0].pass_mark_percentage || 50;

      // Auto-expire overdue schedules
      await autoExpireSchedules(client, examId);

      // Validating Dynamic Scoring Logic:
      // We need to calculate total marks based on ACTUAL assigned questions, not the exam "total_marks" from the exams table (which might be the sum of ALL questions in bank).
      // However, we must check if 'assigned_questions' is available in student_exams.
      const result = await client.query(
        `SELECT es.*,
              s.full_name, s.first_name, s.last_name, s.email, s.registration_number,
              sc.name as category_name,
              se.score,
              -- CALCULATE DYNAMIC TOTAL MARKS
              (SELECT COALESCE(SUM((q->>'marks')::int), 0) FROM jsonb_array_elements(se.assigned_questions) q) as se_total_marks,
              se.percentage,
              se.time_spent_minutes, se.start_time as se_start_time, se.end_time as se_end_time,
              se.auto_submitted as se_auto_submitted, se.status as se_status, se.started_at as se_started_at
       FROM exam_schedules es
       JOIN students s ON es.student_id = s.id
       LEFT JOIN student_categories sc ON s.category_id = sc.id
       LEFT JOIN student_exams se ON se.exam_schedule_id = es.id
       WHERE es.exam_id = $1 AND es.status != 'cancelled'
       ORDER BY
         CASE es.status
           WHEN 'in_progress' THEN 1
           WHEN 'scheduled' THEN 2
           WHEN 'completed' THEN 3
           WHEN 'expired' THEN 4
           ELSE 5
         END,
         es.scheduled_date DESC, es.start_time`,
        [examId],
      );

      res.json({
        success: true,
        data: result.rows.map((row) => {
          const passed = row.percentage !== null ? parseFloat(row.percentage) >= examPassMark : null;

          // Use dynamic total marks if available, fallback to 0
          const actualTotalMarks = row.se_total_marks !== null ? parseFloat(row.se_total_marks) : 0;

          // If percentage is stored, use it. If not, maybe calculate it?
          // (Usually stored on submission, but for display we use stored)

          // Build a human-readable status label
          let statusLabel = row.status;
          if (row.status === 'completed') {
            statusLabel = passed ? 'Passed' : 'Failed';
          } else if (row.status === 'expired') {
            statusLabel = 'Expired — Not Taken';
          } else if (row.status === 'in_progress') {
            statusLabel = 'In Progress';
          } else if (row.status === 'scheduled') {
            statusLabel = 'Scheduled';
          }

          return {
            id: row.id,
            studentId: row.student_id,
            studentName: row.full_name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || 'Unknown',
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email,
            registrationNumber: row.registration_number,
            categoryName: row.category_name,
            scheduledDate: row.scheduled_date,
            startTime: row.start_time,
            endTime: row.end_time,
            status: row.status,
            statusLabel,
            accessCode: row.access_code,
            examUsername: row.exam_username,
            examPassword: row.exam_password,
            // Result data
            score: row.score !== null ? parseFloat(row.score) : null,
            totalMarks: actualTotalMarks,
            percentage: row.percentage !== null ? parseFloat(row.percentage) : null,
            passed,
            timeSpentMinutes: row.time_spent_minutes,
            startedAt: row.started_at || row.se_started_at || row.se_start_time,
            completedAt: row.completed_at || row.se_end_time,
            autoSubmitted: row.auto_submitted || row.se_auto_submitted || false,
            createdAt: row.created_at,
          };
        }),
      });
    } catch (error) {
      console.error("Get schedules error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch schedules" });
    } finally {
      client.release();
    }
  },
);

// ─── POST / — Schedule students for exam ──────────────────────────────────────
router.post(
  "/",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId, studentIds, scheduledDate, startTime, endTime } = req.body;
      const user = req.user!;

      // Verify exam belongs to user's school
      const examCheck = await client.query(
        `SELECT e.* FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE e.id = $1 AND t.school_id = $2`,
        [examId, user.schoolId],
      );

      if (examCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Exam not found" });
      }

      if (user.role === "tutor" && examCheck.rows[0].tutor_id !== user.id) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }

      await client.query("BEGIN");

      const scheduledStudents: any[] = [];
      const failedStudents: any[] = [];

      for (const studentId of studentIds) {
        try {
          // Check if already scheduled (not cancelled/expired)
          const existingCheck = await client.query(
            `SELECT id FROM exam_schedules
           WHERE exam_id = $1 AND student_id = $2 AND status NOT IN ('cancelled', 'expired')`,
            [examId, studentId],
          );

          if (existingCheck.rows.length > 0) {
            failedStudents.push({ studentId, reason: "Already scheduled" });
            continue;
          }

          // Generate access code and credentials
          const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const studentRes = await client.query(
            "SELECT registration_number FROM students WHERE id = $1",
            [studentId]
          );
          const regNum = studentRes.rows[0]?.registration_number || `STU${studentId.substring(0, 4)}`;
          const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
          const username = `exam_${regNum}_${randomSuffix}`.replace(/[^a-zA-Z0-9_]/g, '');
          const password = Math.random().toString(36).substring(2, 8).toUpperCase();

          const result = await client.query(
            `INSERT INTO exam_schedules (
              exam_id, student_id, scheduled_date, start_time, end_time,
              access_code, exam_username, exam_password, status, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled', $9)
            RETURNING *`,
            [examId, studentId, scheduledDate, startTime, endTime, accessCode, username, password, user.id],
          );

          scheduledStudents.push(result.rows[0]);
        } catch (err) {
          failedStudents.push({ studentId, reason: "Database error" });
        }
      }

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: `${scheduledStudents.length} students scheduled successfully`,
        data: { scheduled: scheduledStudents, failed: failedStudents },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Schedule students error:", error);
      res.status(500).json({ success: false, message: "Failed to schedule students" });
    } finally {
      client.release();
    }
  },
);

// ─── PUT /:id — Update/Reschedule ─────────────────────────────────────────────
router.put(
  "/:id",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const { scheduledDate, startTime, endTime, status } = req.body;
      const user = req.user!;

      // Verify schedule belongs to user's school
      const scheduleCheck = await client.query(
        `SELECT es.*, e.total_marks FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE es.id = $1 AND t.school_id = $2`,
        [id, user.schoolId],
      );

      if (scheduleCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Schedule not found" });
      }

      const currentStatus = scheduleCheck.rows[0].status;

      await client.query("BEGIN");

      // Determine new status: if rescheduling an expired/completed exam, reset to 'scheduled'
      let newStatus = status || null;
      if ((currentStatus === 'expired' || currentStatus === 'completed') && (scheduledDate || startTime)) {
        newStatus = 'scheduled';

        // Delete old student_exams record so student can retake
        await client.query(
          `DELETE FROM student_exams WHERE exam_schedule_id = $1`,
          [id]
        );
      }

      const result = await client.query(
        `UPDATE exam_schedules
       SET scheduled_date = COALESCE($1, scheduled_date),
           start_time = COALESCE($2, start_time),
           end_time = COALESCE($3, end_time),
           status = COALESCE($4, status),
           started_at = CASE WHEN $4 = 'scheduled' THEN NULL ELSE started_at END,
           completed_at = CASE WHEN $4 = 'scheduled' THEN NULL ELSE completed_at END,
           auto_submitted = CASE WHEN $4 = 'scheduled' THEN false ELSE auto_submitted END,
           updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
        [scheduledDate, startTime, endTime, newStatus, id],
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message: currentStatus === 'expired'
          ? "Exam rescheduled — student can now take the exam"
          : "Schedule updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Update schedule error:", error);
      res.status(500).json({ success: false, message: "Failed to update schedule" });
    } finally {
      client.release();
    }
  },
);

// ─── DELETE /:id — Cancel schedule ────────────────────────────────────────────
router.delete(
  "/:id",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const user = req.user!;

      const scheduleCheck = await client.query(
        `SELECT es.* FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE es.id = $1 AND t.school_id = $2`,
        [id, user.schoolId],
      );

      if (scheduleCheck.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Schedule not found" });
      }

      await client.query(
        `UPDATE exam_schedules SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [id],
      );

      res.json({ success: true, message: "Schedule cancelled successfully" });
    } catch (error) {
      console.error("Cancel schedule error:", error);
      res.status(500).json({ success: false, message: "Failed to cancel schedule" });
    } finally {
      client.release();
    }
  },
);

// ─── GET /student/my-exams — student's scheduled exams ────────────────────────
router.get(
  "/student/my-exams",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = req.user!;

      // Auto-expire this student's overdue schedules
      await autoExpireSchedules(client, undefined, user.id);

      const result = await client.query(
        `SELECT es.*,
              e.title as exam_title, e.description, e.duration_minutes, e.total_marks, e.category, e.total_questions,
              t.first_name as tutor_first_name, t.last_name as tutor_last_name, t.full_name as tutor_full_name
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE es.student_id = $1
         AND es.status IN ('scheduled', 'in_progress', 'expired')
         AND es.scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY
         CASE es.status WHEN 'in_progress' THEN 1 WHEN 'scheduled' THEN 2 WHEN 'expired' THEN 3 END,
         es.scheduled_date, es.start_time`,
        [user.id],
      );

      res.json({
        success: true,
        data: result.rows.map((row) => ({
          id: row.id,
          examId: row.exam_id,
          examTitle: row.exam_title,
          description: row.description,
          durationMinutes: row.duration_minutes,
          totalQuestions: row.total_questions,
          totalMarks: row.total_marks, // Note: This is exam total. For student specific, we might need a join, but for list view this is fine.
          examCategory: row.category,
          tutorName: row.tutor_full_name || `${row.tutor_first_name || ''} ${row.tutor_last_name || ''}`.trim(),
          scheduledDate: row.scheduled_date,
          startTime: row.start_time,
          endTime: row.end_time,
          status: row.status,
          accessCode: row.access_code,
        })),
      });
    } catch (error) {
      console.error("Get student exams error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch exams" });
    } finally {
      client.release();
    }
  },
);

// ─── POST /verify-access — start exam with time-window check ──────────────────
router.post(
  "/verify-access",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { scheduleId, accessCode, timezone } = req.body;
      const user = req.user!;

      const result = await client.query(
        `SELECT es.*, e.duration_minutes, e.title, e.id as eid, e.total_questions, e.shuffle_questions, e.shuffle_options
         FROM exam_schedules es
         JOIN exams e ON es.exam_id = e.id
         WHERE es.id = $1 AND es.student_id = $2 AND es.status IN ('scheduled', 'in_progress')`,
        [scheduleId, user.id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Exam not found or not scheduled" });
      }

      const schedule = result.rows[0];

      if (schedule.access_code !== accessCode.toUpperCase()) {
        return res.status(400).json({ success: false, message: "Invalid access code" });
      }

      // Timezone Logic
      // Compare "Student Local Time" vs "Schedule Local Time"
      const timeZone = timezone || "UTC";

      // Current time in student TZ as string
      // en-SE: YYYY-MM-DD HH:mm:ss
      // We use string comparison for simplicity and robustness against TZ offsets
      const studentNowStr = new Date().toLocaleString('en-SE', { timeZone, hour12: false });

      // Schedule time string: YYYY-MM-DD HH:mm:00
      const scheduleDateStr = typeof schedule.scheduled_date === 'string' ? schedule.scheduled_date : schedule.scheduled_date.toISOString().split('T')[0];
      const scheduledStartStr = `${scheduleDateStr} ${schedule.start_time}:00`;
      const scheduledEndStr = `${scheduleDateStr} ${schedule.end_time || '23:59'}:00`;

      // 5 min grace calculation
      // Parse strings to compare with grace
      // Since string comparison works for exact time, for 5 min grace we need numeric.
      // We'll create "Fake UTC" dates from these strings to do math.
      const parseFakeUtc = (str: string) => new Date(str.replace(' ', 'T') + 'Z');

      const studentNowDate = parseFakeUtc(studentNowStr);
      const scheduleStartDate = parseFakeUtc(scheduledStartStr);
      const scheduleEndDate = parseFakeUtc(scheduledEndStr);

      const fiveMinBefore = new Date(scheduleStartDate.getTime() - 5 * 60 * 1000);

      if (studentNowDate < fiveMinBefore) {
         return res.status(400).json({
          success: false,
          message: `Exam has not started yet. It starts at ${schedule.start_time} on ${scheduleDateStr}`,
        });
      }

      if (studentNowDate > scheduleEndDate) {
        // Auto-expire
        await client.query(
          `UPDATE exam_schedules SET status = 'expired', updated_at = NOW() WHERE id = $1`,
          [scheduleId]
        );
         return res.status(400).json({
          success: false,
          message: "Exam time has expired. Contact your tutor to reschedule.",
        });
      }

      // Check for assigned questions
      const studentExamCheck = await client.query(
        `SELECT id, assigned_questions FROM student_exams WHERE exam_schedule_id = $1`,
        [scheduleId]
      );

      let finalQuestions: any[] = [];

      if (studentExamCheck.rows.length > 0) {
        // Resume
        const record = studentExamCheck.rows[0];
        if (record.assigned_questions && record.assigned_questions.length > 0) {
           finalQuestions = record.assigned_questions;
        } else {
           finalQuestions = await assignQuestions(client, schedule.exam_id, schedule.total_questions, schedule.shuffle_questions, schedule.shuffle_options);
           await client.query(
             `UPDATE student_exams SET assigned_questions = $1 WHERE id = $2`,
             [JSON.stringify(finalQuestions), record.id]
           );
        }
      } else {
        // First start
        finalQuestions = await assignQuestions(client, schedule.exam_id, schedule.total_questions, schedule.shuffle_questions, schedule.shuffle_options);

        await client.query(
          `INSERT INTO student_exams (student_id, exam_id, exam_schedule_id, start_time, started_at, status, assigned_questions)
           VALUES ($1, $2, $3, NOW(), NOW(), 'in_progress', $4)`,
          [user.id, schedule.exam_id, scheduleId, JSON.stringify(finalQuestions)]
        );
      }

      // Update schedule status
      await client.query(
        `UPDATE exam_schedules SET status = 'in_progress', started_at = COALESCE(started_at, NOW()), updated_at = NOW() WHERE id = $1`,
        [scheduleId],
      );

      // Sanitize questions (remove isCorrect and ensure options are strings for frontend)
      const sanitizedQuestions = finalQuestions.map((q: any) => ({
        ...q,
        options: Array.isArray(q.options)
          ? q.options.map((o: any) => (typeof o === 'string' ? o : o.text))
          : q.options
      }));

      res.json({
        success: true,
        message: "Access granted",
        data: {
          scheduleId: schedule.id,
          examId: schedule.exam_id,
          examTitle: schedule.title,
          durationMinutes: schedule.duration_minutes,
          startedAt: schedule.started_at || new Date(),
          questions: sanitizedQuestions,
        },
      });
    } catch (error) {
      console.error("Verify access error:", error);
      res.status(500).json({ success: false, message: "Failed to verify access" });
    } finally {
      client.release();
    }
  },
);

// ─── POST /email/:id — email credentials to one student ───────────────────────
router.post(
  "/email/:id",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const user = req.user!;

      const result = await client.query(
        `SELECT es.*, e.title as exam_title, s.email, s.full_name, s.first_name, s.last_name
         FROM exam_schedules es
         JOIN exams e ON es.exam_id = e.id
         JOIN students s ON es.student_id = s.id
         JOIN tutors t ON e.tutor_id = t.id
         WHERE es.id = $1 AND t.school_id = $2`,
        [id, user.schoolId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Schedule not found" });
      }

      const schedule = result.rows[0];

      if (!schedule.email) {
        return res.status(400).json({ success: false, message: "Student has no email address" });
      }

      const studentName = schedule.full_name || `${schedule.first_name || ''} ${schedule.last_name || ''}`.trim() || 'Student';

      const success = await sendExamCredentials(
        schedule.email,
        studentName,
        schedule.exam_title,
        {
          date: new Date(schedule.scheduled_date).toLocaleDateString(),
          time: `${schedule.start_time} - ${schedule.end_time}`,
          username: schedule.exam_username,
          password: schedule.exam_password,
          accessCode: schedule.access_code
        }
      );

      if (success) {
        res.json({ success: true, message: "Email sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send email" });
      }
    } catch (error) {
      console.error("Send email error:", error);
      res.status(500).json({ success: false, message: "Failed to process request" });
    } finally {
      client.release();
    }
  }
);

// ─── POST /email-all/:examId — email credentials to all scheduled students ───
router.post(
  "/email-all/:examId",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId } = req.params;
      const user = req.user!;

      const result = await client.query(
        `SELECT es.*, e.title as exam_title, s.email, s.full_name, s.first_name, s.last_name
         FROM exam_schedules es
         JOIN exams e ON es.exam_id = e.id
         JOIN students s ON es.student_id = s.id
         JOIN tutors t ON e.tutor_id = t.id
         WHERE es.exam_id = $1 AND t.school_id = $2 AND es.status != 'cancelled'`,
        [examId, user.schoolId]
      );

      if (result.rows.length === 0) {
        return res.json({ success: true, message: "No students to email", count: 0 });
      }

      let sentCount = 0;
      let failCount = 0;

      for (const schedule of result.rows) {
        if (!schedule.email) continue;

        const studentName = schedule.full_name || `${schedule.first_name || ''} ${schedule.last_name || ''}`.trim() || 'Student';

        const success = await sendExamCredentials(
          schedule.email,
          studentName,
          schedule.exam_title,
          {
            date: new Date(schedule.scheduled_date).toLocaleDateString(),
            time: `${schedule.start_time} - ${schedule.end_time}`,
            username: schedule.exam_username,
            password: schedule.exam_password,
            accessCode: schedule.access_code
          }
        );

        if (success) sentCount++;
        else failCount++;
      }

      res.json({
        success: true,
        message: `Emails sent to ${sentCount} students. Failed: ${failCount}`,
        count: sentCount
      });
    } catch (error) {
      console.error("Bulk email error:", error);
      res.status(500).json({ success: false, message: "Failed to process request" });
    } finally {
      client.release();
    }
  }
);


// Helper to assign questions
// Helper to assign questions with stratified sampling
async function assignQuestions(client: any, examId: string, limit: number, shuffleQs: boolean, shuffleOpts: boolean) {
    // 1. Fetch ALL active questions for this exam
    const result = await client.query(
      `SELECT id, question_text, question_type, options, marks, correct_answer, image_url, created_at, question_order
       FROM questions WHERE exam_id = $1 AND is_deleted = false`,
      [examId]
    );

    let allQuestions = result.rows;

    // If no limit set, return all (shuffled if needed)
    if (!limit || limit <= 0 || limit >= allQuestions.length) {
      if (shuffleQs) {
        allQuestions = shuffleArray([...allQuestions]);
      } else {
         // Sort by order or created_at if not shuffling
         allQuestions.sort((a: any, b: any) => (a.question_order || 0) - (b.question_order || 0) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      }
      return processOptions(allQuestions, shuffleOpts);
    }

    // 2. Stratified Sampling Logic
    // Categories: Hard (fill_blank), Medium (multiple_choice), Easy (true_false)
    const hardQs = allQuestions.filter((q: any) => q.question_type === 'fill_blank');
    const mediumQs = allQuestions.filter((q: any) => q.question_type === 'multiple_choice');
    const easyQs = allQuestions.filter((q: any) => q.question_type === 'true_false');

    // Calculate targets
    let hardTarget = 0, mediumTarget = 0, easyTarget = 0;

    if (limit % 3 === 0) {
      // Equal split
      hardTarget = limit / 3;
      mediumTarget = limit / 3;
      easyTarget = limit / 3;
    } else {
      // 30% Hard, 30% Medium, 40% Easy
      hardTarget = Math.floor(limit * 0.3);
      mediumTarget = Math.floor(limit * 0.3);
      easyTarget = limit - hardTarget - mediumTarget; // Remainder to Easy
    }

    // Adjust targets if pool is insufficient
    // If not enough Hard questions, take all Hard and distribute remainder to Medium/Easy
    if (hardQs.length < hardTarget) {
       const remainder = hardTarget - hardQs.length;
       hardTarget = hardQs.length;
       mediumTarget += Math.floor(remainder / 2);
       easyTarget += Math.ceil(remainder / 2);
    }
    if (mediumQs.length < mediumTarget) {
       const remainder = mediumTarget - mediumQs.length;
       mediumTarget = mediumQs.length;
       easyTarget += remainder;
    }
    if (easyQs.length < easyTarget) {
       // If still not enough, we just take what we have. Total < Limit.
       easyTarget = easyQs.length;
    }

    // 3. Selection
    const select = (pool: any[], target: number) => {
       let selected = [...pool];
       if (shuffleQs) {
          selected = shuffleArray(selected);
       } else {
          selected.sort((a: any, b: any) => (a.question_order || 0) - (b.question_order || 0) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
       }
       return selected.slice(0, target);
    };

    const selectedHard = select(hardQs, hardTarget);
    const selectedMedium = select(mediumQs, mediumTarget);
    const selectedEasy = select(easyQs, easyTarget);

    let finalSelection = [...selectedHard, ...selectedMedium, ...selectedEasy];

    // If we are still short (due to easy pool exhaustion), try to fill from any remaining pool
    if (finalSelection.length < limit) {
       const selectedIds = new Set(finalSelection.map((q: any) => q.id));
       const remainingPool = allQuestions.filter((q: any) => !selectedIds.has(q.id));
       const needed = limit - finalSelection.length;

       if (remainingPool.length > 0) {
          const extra = select(remainingPool, needed);
          finalSelection = [...finalSelection, ...extra];
       }
    }

    // Final shuffle of the combined list if shuffling is enabled,
    // otherwise keep them somewhat ordered (e.g. Hard -> Medium -> Easy or just ID/Order based)
    // Actually, usually exams mix difficulties. So we should shuffle the FINAL list if shuffle is on.
    if (shuffleQs) {
       finalSelection = shuffleArray(finalSelection);
    } else {
       // If not shuffled, maybe keep them grouped?
       // Or sort by original order
       finalSelection.sort((a: any, b: any) => (a.question_order || 0) - (b.question_order || 0) || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }

    return processOptions(finalSelection, shuffleOpts);
}

function processOptions(questions: any[], shuffleOpts: boolean) {
    if (!shuffleOpts) return questions;

    return questions.map((q: any) => {
       if (q.question_type === 'multiple_choice' && Array.isArray(q.options)) {
          const opts = [...q.options];
          for (let i = opts.length - 1; i > 0; i--) {
             const j = Math.floor(Math.random() * (i + 1));
             [opts[i], opts[j]] = [opts[j], opts[i]];
          }
          return { ...q, options: opts };
       }
       return q;
    });
}

export default router;
