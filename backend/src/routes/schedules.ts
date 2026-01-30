import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authenticate, requireRole } from "../middleware/auth";

const router = Router();

// Get available students for scheduling (CRITICAL FIX)
router.get(
  "/available-students",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId, categoryId } = req.query;
      const user = req.user!;

      // Build the query to get students NOT already scheduled for this exam
      let query = `
      SELECT s.id, s.first_name, s.last_name, s.email, s.registration_number, s.category_id,
             sc.name as category_name
      FROM students s
      LEFT JOIN student_categories sc ON s.category_id = sc.id
      WHERE s.school_id = $1
        AND s.is_active = true
        AND s.id NOT IN (
          SELECT student_id FROM exam_schedules
          WHERE exam_id = $2 AND status != 'cancelled'
        )
    `;

      const params: any[] = [user.schoolId, examId];

      // Filter by category if provided
      if (categoryId && categoryId !== "all") {
        query += ` AND s.category_id = $3`;
        params.push(categoryId);
      }

      query += ` ORDER BY s.last_name, s.first_name`;

      const result = await client.query(query, params);

      res.json({
        success: true,
        data: result.rows.map((s) => ({
          id: s.id,
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
      res
        .status(500)
        .json({
          success: false,
          message: "Failed to fetch available students",
        });
    } finally {
      client.release();
    }
  },
);

// Get scheduled students for an exam
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

      const result = await client.query(
        `SELECT es.*,
              s.first_name, s.last_name, s.email, s.registration_number,
              sc.name as category_name
       FROM exam_schedules es
       JOIN students s ON es.student_id = s.id
       LEFT JOIN student_categories sc ON s.category_id = sc.id
       WHERE es.exam_id = $1 AND es.status != 'cancelled'
       ORDER BY es.scheduled_date DESC, es.start_time`,
        [examId],
      );

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
          scheduledDate: row.scheduled_date,
          startTime: row.start_time,
          endTime: row.end_time,
          status: row.status,
          accessCode: row.access_code,
          createdAt: row.created_at,
        })),
      });
    } catch (error) {
      console.error("Get schedules error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch schedules" });
    } finally {
      client.release();
    }
  },
);

// Schedule students for exam
router.post(
  "/",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId, studentIds, scheduledDate, startTime, endTime } =
        req.body;
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

      // Check if tutor owns the exam
      if (user.role === "tutor" && examCheck.rows[0].tutor_id !== user.id) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }

      await client.query("BEGIN");

      const scheduledStudents: any[] = [];
      const failedStudents: any[] = [];

      for (const studentId of studentIds) {
        try {
          // Check if already scheduled
          const existingCheck = await client.query(
            `SELECT id FROM exam_schedules
           WHERE exam_id = $1 AND student_id = $2 AND status != 'cancelled'`,
            [examId, studentId],
          );

          if (existingCheck.rows.length > 0) {
            failedStudents.push({ studentId, reason: "Already scheduled" });
            continue;
          }

          // Generate access code
          const accessCode = Math.random()
            .toString(36)
            .substring(2, 8)
            .toUpperCase();

          const result = await client.query(
            `INSERT INTO exam_schedules (exam_id, student_id, scheduled_date, start_time, end_time, access_code, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, 'scheduled', $7)
           RETURNING *`,
            [
              examId,
              studentId,
              scheduledDate,
              startTime,
              endTime,
              accessCode,
              user.id,
            ],
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
        data: {
          scheduled: scheduledStudents,
          failed: failedStudents,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Schedule students error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to schedule students" });
    } finally {
      client.release();
    }
  },
);

// Update schedule
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
        `SELECT es.* FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE es.id = $1 AND t.school_id = $2`,
        [id, user.schoolId],
      );

      if (scheduleCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Schedule not found" });
      }

      const result = await client.query(
        `UPDATE exam_schedules
       SET scheduled_date = COALESCE($1, scheduled_date),
           start_time = COALESCE($2, start_time),
           end_time = COALESCE($3, end_time),
           status = COALESCE($4, status)
       WHERE id = $5
       RETURNING *`,
        [scheduledDate, startTime, endTime, status, id],
      );

      res.json({
        success: true,
        message: "Schedule updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Update schedule error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update schedule" });
    } finally {
      client.release();
    }
  },
);

// Cancel schedule
router.delete(
  "/:id",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const user = req.user!;

      // Verify schedule belongs to user's school
      const scheduleCheck = await client.query(
        `SELECT es.* FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE es.id = $1 AND t.school_id = $2`,
        [id, user.schoolId],
      );

      if (scheduleCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Schedule not found" });
      }

      await client.query(
        `UPDATE exam_schedules SET status = 'cancelled' WHERE id = $1`,
        [id],
      );

      res.json({
        success: true,
        message: "Schedule cancelled successfully",
      });
    } catch (error) {
      console.error("Cancel schedule error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to cancel schedule" });
    } finally {
      client.release();
    }
  },
);

// Get student's scheduled exams
router.get(
  "/student/my-exams",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = req.user!;

      const result = await client.query(
        `SELECT es.*,
              e.title as exam_title, e.description, e.duration_minutes, e.total_marks,
              t.first_name as tutor_first_name, t.last_name as tutor_last_name
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE es.student_id = $1
         AND es.status IN ('scheduled', 'in_progress')
         AND es.scheduled_date >= CURRENT_DATE - INTERVAL '1 day'
       ORDER BY es.scheduled_date, es.start_time`,
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
          totalMarks: row.total_marks,
          tutorName: `${row.tutor_first_name} ${row.tutor_last_name}`,
          scheduledDate: row.scheduled_date,
          startTime: row.start_time,
          endTime: row.end_time,
          status: row.status,
          accessCode: row.access_code,
        })),
      });
    } catch (error) {
      console.error("Get student exams error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch exams" });
    } finally {
      client.release();
    }
  },
);

// Verify access code and start exam
router.post(
  "/verify-access",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { scheduleId, accessCode } = req.body;
      const user = req.user!;

      const result = await client.query(
        `SELECT es.*, e.duration_minutes, e.title
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       WHERE es.id = $1 AND es.student_id = $2 AND es.status IN ('scheduled', 'in_progress')`,
        [scheduleId, user.id],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Exam not found or not scheduled" });
      }

      const schedule = result.rows[0];

      if (schedule.access_code !== accessCode.toUpperCase()) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid access code" });
      }

      // Check time window
      const now = new Date();
      const scheduledDate = new Date(schedule.scheduled_date);
      const [startHours, startMinutes] = schedule.start_time.split(":");
      const [endHours, endMinutes] = schedule.end_time.split(":");

      const startTime = new Date(scheduledDate);
      startTime.setHours(parseInt(startHours), parseInt(startMinutes), 0);

      const endTime = new Date(scheduledDate);
      endTime.setHours(parseInt(endHours), parseInt(endMinutes), 0);

      if (now < startTime) {
        return res
          .status(400)
          .json({ success: false, message: "Exam has not started yet" });
      }

      if (now > endTime) {
        return res
          .status(400)
          .json({ success: false, message: "Exam time has expired" });
      }

      // Update status to in_progress
      await client.query(
        `UPDATE exam_schedules SET status = 'in_progress', started_at = NOW() WHERE id = $1`,
        [scheduleId],
      );

      // Create student_exams record if not exists
      const studentExamCheck = await client.query(
        `SELECT id FROM student_exams WHERE schedule_id = $1`,
        [scheduleId],
      );

      if (studentExamCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO student_exams (student_id, exam_id, schedule_id, start_time, status)
         VALUES ($1, $2, $3, NOW(), 'in_progress')`,
          [user.id, schedule.exam_id, scheduleId],
        );
      }

      res.json({
        success: true,
        message: "Access granted",
        data: {
          scheduleId: schedule.id,
          examId: schedule.exam_id,
          examTitle: schedule.title,
          durationMinutes: schedule.duration_minutes,
          startedAt: new Date(),
        },
      });
    } catch (error) {
      console.error("Verify access error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to verify access" });
    } finally {
      client.release();
    }
  },
);

export default router;
