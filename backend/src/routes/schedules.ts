import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authenticate, requireRole } from "../middleware/auth";
import { sendExamCredentials } from "../services/email";
import { ApiResponseHandler } from "../utils/apiResponse";
import { ScheduleService } from "../services/scheduleService";
import { transformResult } from "../utils/responseTransformer";

function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

const router = Router();

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

      // ─── Query Logic ───
      // If "external" selected, we only show external_students
      if (categoryId === "external") {
        const extParams: any[] = [user.schoolId, examId];
        let extQuery = `
          SELECT s.id, s.full_name, s.first_name, s.last_name, s.email, s.username as student_id, s.category_id,
                 sc.name as category_name
          FROM external_students s
          LEFT JOIN student_categories sc ON s.category_id = sc.id
          WHERE s.school_id = $1
            AND s.is_active = true
            AND s.id NOT IN (
              SELECT external_student_id FROM exam_schedules
              WHERE exam_id = $2 AND status NOT IN ('cancelled', 'expired') AND external_student_id IS NOT NULL
            )
        `;

        if (user.role === "tutor") {
          extQuery += ` AND s.tutor_id = $${extParams.length + 1}`;
          extParams.push(user.id);
        }

        extQuery += ` ORDER BY s.full_name, s.last_name, s.first_name`;
        const extResult = await client.query(extQuery, extParams);

        return ApiResponseHandler.success(
          res,
          transformResult(extResult.rows.map((s) => ({
            id: s.id,
            studentName: s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unknown",
            firstName: s.first_name,
            lastName: s.last_name,
            email: s.email,
            registrationNumber: s.student_id,
            categoryId: s.category_id,
            categoryName: s.category_name,
            isExternal: true
          }))),
          "Available external students retrieved"
        );
      }

      // If categoryId is specific (UUID), we should ideally check BOTH tables for students in that category
      // However, the standard "all" (Default) only shows internal students.
      // We'll maintain that "all" = internal, "external" = all external, but custom category = both if they exist.

      const allResults: any[] = [];

      // 1. Check Internal Students
      let intQuery = `
        SELECT s.id, s.full_name, s.first_name, s.last_name, s.email, s.student_id, s.category_id,
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
      const intParams: any[] = [user.schoolId, examId];

      if (user.role === "tutor") {
        intQuery += ` AND s.id IN (SELECT student_id FROM student_tutors WHERE tutor_id = $3)`;
        intParams.push(user.id);
      }

      if (categoryId && categoryId !== "all") {
        intQuery += ` AND s.category_id = $${intParams.length + 1}`;
        intParams.push(categoryId);
      }

      const intResult = await client.query(intQuery, intParams);
      allResults.push(...intResult.rows.map(s => ({
        id: s.id,
        studentName: s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unknown",
        firstName: s.first_name,
        lastName: s.last_name,
        email: s.email,
        registrationNumber: s.student_id,
        categoryId: s.category_id,
        categoryName: s.category_name,
        isExternal: false
      })));

      // 2. ONLY if a specific categoryId is provided, we ALSO check external students for that category
      if (categoryId && categoryId !== "all" && categoryId !== "external") {
        const extParams: any[] = [user.schoolId, examId];
        let extQuery = `
          SELECT s.id, s.full_name, s.first_name, s.last_name, s.email, s.username as student_id, s.category_id,
                 sc.name as category_name
          FROM external_students s
          LEFT JOIN student_categories sc ON s.category_id = sc.id
          WHERE s.school_id = $1
            AND s.is_active = true
            AND s.category_id = $3
            AND s.id NOT IN (
              SELECT external_student_id FROM exam_schedules
              WHERE exam_id = $2 AND status NOT IN ('cancelled', 'expired') AND external_student_id IS NOT NULL
            )
        `;
        extParams.push(categoryId);

        if (user.role === "tutor") {
          extQuery += ` AND s.tutor_id = $4`;
          extParams.push(user.id);
        }

        const extResult = await client.query(extQuery, extParams);
        allResults.push(...extResult.rows.map(s => ({
            id: s.id,
            studentName: s.full_name || `${s.first_name || ""} ${s.last_name || ""}`.trim() || "Unknown",
            firstName: s.first_name,
            lastName: s.last_name,
            email: s.email,
            registrationNumber: s.student_id,
            categoryId: s.category_id,
            categoryName: s.category_name,
            isExternal: true
        })));
      }

      ApiResponseHandler.success(
        res,
        transformResult(allResults.sort((a, b) => a.studentName.localeCompare(b.studentName))),
        "Available students retrieved"
      );
    } catch (error) {
      console.error("Get available students error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch available students");
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
        `SELECT e.*, e.passing_score FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE e.id = $1 AND t.school_id = $2`,
        [examId, user.schoolId],
      );

      if (examCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Exam not found" });
      }

      const examPassMark = examCheck.rows[0].passing_score || 50;

      // Auto-expire overdue schedules using the central service
      console.log(`[Routes] Triggering expiration check for exam: ${examId}`);
      await ScheduleService.processExpiredSchedules(examId);

      // Validating Dynamic Scoring Logic:
      // We need to calculate total marks based on ACTUAL assigned questions, not the exam "total_marks" from the exams table (which might be the sum of ALL questions in bank).
      // However, we must check if 'assigned_questions' is available in student_exams.
      const result = await client.query(
        `SELECT es.*,
              s.full_name, s.first_name, s.last_name, s.email, s.student_id,
              sc.name as category_name,
              ext.full_name as ext_full_name, ext.email as ext_email,
              se.score,
              -- CALCULATE DYNAMIC TOTAL MARKS
              (SELECT COALESCE(SUM((q->>'marks')::int), 0) FROM jsonb_array_elements(se.assigned_questions) q) as se_total_marks,
              se.percentage,
              se.time_spent_minutes, se.started_at as se_start_time, se.completed_at as se_end_time,
              se.auto_submitted as se_auto_submitted, se.status as se_status,
              sch.timezone as school_timezone
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       JOIN schools sch ON t.school_id = sch.id
       LEFT JOIN students s ON es.student_id = s.id
       LEFT JOIN external_students ext ON es.external_student_id = ext.id
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

      ApiResponseHandler.success(
        res,
        transformResult(result.rows.map((row) => {
          const passed =
            row.percentage !== null
              ? parseFloat(row.percentage) >= examPassMark
              : null;
          const actualTotalMarks =
            row.se_total_marks !== null ? parseFloat(row.se_total_marks) : 0;

          let statusLabel = row.status;
          if (row.status === "completed") {
            statusLabel = passed ? "Passed" : "Failed";
          } else if (row.status === "expired") {
            statusLabel = "Expired — Not Taken";
          } else if (row.status === "in_progress") {
            statusLabel = "In Progress";
          } else if (row.status === "scheduled") {
            statusLabel = "Scheduled";
          }

          return {
            id: row.id,
            studentId: row.student_id || row.external_student_id,
            studentName:
              row.full_name ||
              row.ext_full_name ||
              `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
              "Unknown",
            firstName: row.first_name,
            lastName: row.last_name,
            email: row.email || row.ext_email,
            registrationNumber: row.student_id,
            categoryName: row.category_name,
            scheduledDate: row.scheduled_date,
            startTime: row.start_time,
            endTime: row.end_time,
            // Construct ISO strings for consistent frontend display
            startTimeIso: `${row.scheduled_date.toISOString().split('T')[0]}T${row.start_time}`,
            endTimeIso: row.end_time ? `${row.scheduled_date.toISOString().split('T')[0]}T${row.end_time}` : null,
            schoolTimezone: row.school_timezone || 'Africa/Lagos',
            status: row.status,
            statusLabel,
            accessCode: row.login_username,
            examUsername: row.login_username,
            examPassword: row.login_password, // Return plain text password so tutor can copy/print
            score: row.score !== null ? parseFloat(row.score) : null,
            totalMarks: actualTotalMarks,
            percentage:
              row.percentage !== null ? parseFloat(row.percentage) : null,
            passed,
            timeSpentMinutes: row.time_spent_minutes,
            startedAt: row.started_at || row.se_start_time,
            completedAt: row.completed_at || row.se_end_time,
            autoSubmitted: row.auto_submitted || row.se_auto_submitted || false,
            createdAt: row.created_at,
            isExternal: !!row.external_student_id
          };
        })),
        "Exam schedules retrieved",
      );
    } catch (error) {
      console.error("Get schedules error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch schedules");
    } finally {
      client.release();
    }
  },
);

// ─── GET /school-schedules ───────────────────────────────────────────────────
router.get(
  "/school-schedules",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { search, status, examId } = req.query;
      const user = req.user!;

      let query = `
        SELECT es.*,
               e.title as exam_title,
               s.full_name, s.first_name, s.last_name, s.student_id,
               ext.full_name as ext_full_name,
               t.full_name as tutor_name,
               sch.timezone as school_timezone
        FROM exam_schedules es
        JOIN exams e ON es.exam_id = e.id
        JOIN tutors t ON e.tutor_id = t.id
        JOIN schools sch ON t.school_id = sch.id
        LEFT JOIN students s ON es.student_id = s.id
        LEFT JOIN external_students ext ON es.external_student_id = ext.id
        WHERE t.school_id = $1 AND es.status != 'cancelled'
      `;

      const params: any[] = [user.schoolId];
      let paramIndex = 2;

      if (examId && examId !== 'all') {
        query += ` AND es.exam_id = $${paramIndex}`;
        params.push(examId);
        paramIndex++;
      }

      if (status && status !== 'all') {
        query += ` AND es.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (search) {
        query += ` AND (
          s.full_name ILIKE $${paramIndex} OR
          ext.full_name ILIKE $${paramIndex} OR
          e.title ILIKE $${paramIndex}
        )`;
        params.push(`%${search}%`);
        paramIndex++;
      }

      query += ` ORDER BY es.scheduled_date DESC, es.start_time DESC`;

      const result = await client.query(query, params);

      ApiResponseHandler.success(
        res,
        transformResult(result.rows.map((row) => ({
          id: row.id,
          examId: row.exam_id,
          examTitle: row.exam_title,
          studentName: row.full_name || row.ext_full_name || `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Unknown",
          tutorName: row.tutor_name,
          scheduledDate: row.scheduled_date,
          startTime: row.start_time,
          endTime: row.end_time,
          startTimeIso: `${row.scheduled_date.toISOString().split('T')[0]}T${row.start_time}`,
          endTimeIso: row.end_time ? `${row.scheduled_date.toISOString().split('T')[0]}T${row.end_time}` : null,
          schoolTimezone: row.school_timezone || 'Africa/Lagos',
          status: row.status,
          username: row.login_username,
          isExternal: !!row.external_student_id
        }))),
        "School schedules retrieved"
      );
    } catch (error) {
      console.error("Get school schedules error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch school schedules");
    } finally {
      client.release();
    }
  }
);

// ─── POST / — Schedule students for exam ──────────────────────────────────────
router.post(
  "/",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const {
        examId,
        studentIds,
        externalStudentIds,
        scheduledDate,
        startTime,
        endTime,
        maxAttempts,
      } = req.body;
      const user = req.user!;

      // Guardrail: Prevent scheduling in the past
      if (scheduledDate && startTime) {
          const now = new Date();
          // Use Lagos timezone for comparison if available, otherwise just use server time
          // Africa/Lagos is UTC+1. The server might be UTC.
          // For absolute safety, we compare the combined ISO string
          const scheduleDateTime = new Date(`${scheduledDate}T${startTime}`);

          if (isNaN(scheduleDateTime.getTime())) {
              return ApiResponseHandler.badRequest(res, "Invalid date or time format");
          }

          if (scheduleDateTime < now) {
              return ApiResponseHandler.badRequest(res, "Cannot schedule an exam in the past");
          }

          if (endTime) {
              const endDateTime = new Date(`${scheduledDate}T${endTime}`);
              if (!isNaN(endDateTime.getTime()) && endDateTime <= scheduleDateTime) {
                  return ApiResponseHandler.badRequest(res, "End time must be after start time");
              }
          }
      }

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

      if (user.role === "tutor" && examCheck.rows[0].tutor_id !== user.id) {
        return ApiResponseHandler.forbidden(res, "Access denied");
      }

      // Security check: Verify all students belong to the school/tutor
      if (studentIds && studentIds.length > 0) {
        const uniqueStudentIds = [...new Set(studentIds)];
        let studentCheckQuery = "SELECT id FROM students WHERE id = ANY($1) AND school_id = $2";
        const studentCheckParams = [uniqueStudentIds, user.schoolId];
        if (user.role === 'tutor') {
            studentCheckQuery += " AND id IN (SELECT student_id FROM student_tutors WHERE tutor_id = $3)";
            studentCheckParams.push(user.id);
        }
        const studentCheck = await client.query(studentCheckQuery, studentCheckParams);
        if (studentCheck.rows.length !== uniqueStudentIds.length) {
            console.error("Internal Student Auth Failure:", {
                requested: uniqueStudentIds,
                found: studentCheck.rows.map(r => r.id),
                schoolId: user.schoolId,
                role: user.role
            });
            return ApiResponseHandler.badRequest(res, "One or more internal students are invalid or not authorized");
        }
      }

      if (externalStudentIds && externalStudentIds.length > 0) {
        const uniqueExtIds = [...new Set(externalStudentIds)];
        let extCheckQuery = "SELECT id FROM external_students WHERE id = ANY($1) AND school_id = $2";
        const extCheckParams = [uniqueExtIds, user.schoolId];
        if (user.role === 'tutor') {
            extCheckQuery += " AND tutor_id = $3";
            extCheckParams.push(user.id);
        }
        const extCheck = await client.query(extCheckQuery, extCheckParams);
        if (extCheck.rows.length !== uniqueExtIds.length) {
            console.error("External Student Auth Failure:", {
                requested: uniqueExtIds,
                found: extCheck.rows.map(r => r.id),
                schoolId: user.schoolId,
                role: user.role
            });
            return ApiResponseHandler.badRequest(res, "One or more external students are invalid or not authorized");
        }
      }

      await client.query("BEGIN");

      const scheduledStudents: any[] = [];
      const failedStudents: any[] = [];

      for (const studentId of studentIds || []) {
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
            "SELECT student_id FROM students WHERE id = $1",
            [studentId],
          );
          const regNum = studentRes.rows[0]?.student_id || `STU${studentId.substring(0, 4)}`;

          // Ensure username is distinct from access code and registration number
          let username = "";
          let isUnique = false;
          while (!isUnique) {
            const randomSuffix = Math.random().toString(36).substring(2, 6).toLowerCase();
            username = `exam_${regNum}_${randomSuffix}`.replace(/[^a-zA-Z0-9_]/g, "");

            // Check if this username already exists in this exam's schedules (unlikely but safe)
            const dupCheck = await client.query(
              "SELECT id FROM exam_schedules WHERE login_username = $1",
              [username]
            );
            if (dupCheck.rows.length === 0) isUnique = true;
          }

          const password = Math.random().toString(36).substring(2, 8).toUpperCase();
          const hashedPassword = password; // Store as plain text per user requirement for tutor visibility

          const result = await client.query(
            `INSERT INTO exam_schedules (
              exam_id, student_id, scheduled_date, start_time, end_time,
              login_username, login_password, status, max_attempts
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8)
            RETURNING *`,
            [
              examId,
              studentId,
              scheduledDate,
              startTime,
              endTime || null,
              username,
              hashedPassword,
              maxAttempts || 1,
            ],
          );

          const createdSchedule = result.rows[0];

          // NEW: Generate assigned questions and create student_exams record early
          const exam = examCheck.rows[0];
          const assignedQs = await assignQuestions(
            client,
            examId,
            exam.total_questions,
            exam.shuffle_questions,
            exam.shuffle_options,
          );

          const studentTotalMarks = assignedQs.reduce(
            (sum: number, q: any) => sum + (parseFloat(q.marks) || 0),
            0,
          );

          await client.query(
            `INSERT INTO student_exams (
              exam_schedule_id, student_id, exam_id,
              assigned_questions, total_marks, status
            ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
            [
              createdSchedule.id,
              studentId,
              examId,
              JSON.stringify(assignedQs),
              studentTotalMarks || exam.total_marks || 0,
            ],
          );

          createdSchedule.login_password = password; // Ensure response has unhashed password
          scheduledStudents.push(createdSchedule);
        } catch (err: any) {
          console.error("Internal Student Schedule Insert Error:", err.message);
          failedStudents.push({
            studentId,
            reason: "Database error",
            detail: err.message,
          });
        }
      }

      // Handle External Students
      for (const externalId of externalStudentIds || []) {
        try {
          const existingCheck = await client.query(
            `SELECT id FROM exam_schedules
           WHERE exam_id = $1 AND external_student_id = $2 AND status NOT IN ('cancelled', 'expired')`,
            [examId, externalId],
          );

          if (existingCheck.rows.length > 0) {
            failedStudents.push({
              studentId: externalId,
              reason: "Already scheduled",
            });
            continue;
          }

          const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
          const extRes = await client.query(
            "SELECT username FROM external_students WHERE id = $1",
            [externalId],
          );
          const baseUser = extRes.rows[0]?.username || "ext";

          let username = "";
          let isUnique = false;
          while (!isUnique) {
            const randomSuffix = Math.random().toString(36).substring(2, 6).toLowerCase();
            username = `${baseUser}_${randomSuffix}`.replace(/[^a-zA-Z0-9_]/g, "");

            const dupCheck = await client.query(
              "SELECT id FROM exam_schedules WHERE login_username = $1",
              [username]
            );
            if (dupCheck.rows.length === 0) isUnique = true;
          }

          const password = Math.random().toString(36).substring(2, 8).toUpperCase();
          const hashedPassword = password; // Store as plain text

          const result = await client.query(
            `INSERT INTO exam_schedules (
              exam_id, external_student_id, scheduled_date, start_time, end_time,
              login_username, login_password, status, max_attempts
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'scheduled', $8)
            RETURNING *`,
            [
              examId,
              externalId,
              scheduledDate,
              startTime,
              endTime || null,
              username,
              hashedPassword,
              maxAttempts || 1,
            ],
          );

          const createdSchedule = result.rows[0];

          // NEW: Generate assigned questions and create student_exams record early for external student
          const exam = examCheck.rows[0];
          const assignedQs = await assignQuestions(
            client,
            examId,
            exam.total_questions,
            exam.shuffle_questions,
            exam.shuffle_options,
          );

          const studentTotalMarks = assignedQs.reduce(
            (sum: number, q: any) => sum + (parseFloat(q.marks) || 0),
            0,
          );

          await client.query(
            `INSERT INTO student_exams (
              exam_schedule_id, external_student_id, exam_id,
              assigned_questions, total_marks, status
            ) VALUES ($1, $2, $3, $4, $5, 'pending')`,
            [
              createdSchedule.id,
              externalId,
              examId,
              JSON.stringify(assignedQs),
              studentTotalMarks || exam.total_marks || 0,
            ],
          );

          createdSchedule.login_password = password; // Ensure response has unhashed password
          scheduledStudents.push(createdSchedule);
        } catch (err: any) {
          console.error("External Student Schedule Insert Error:", err.message);
          failedStudents.push({
            studentId: externalId,
            reason: "Database error",
            detail: err.message,
          });
        }
      }

      await client.query("COMMIT");

      ApiResponseHandler.created(
        res,
        { scheduled: scheduledStudents, failed: failedStudents },
        `${scheduledStudents.length} students scheduled successfully`,
      );
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Schedule students error:", error);
      ApiResponseHandler.serverError(res, "Failed to schedule students");
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

      // Guardrail: Prevent rescheduling in the past
      if (scheduledDate && startTime) {
          const now = new Date();
          const scheduleDateTime = new Date(`${scheduledDate}T${startTime}`);

          if (isNaN(scheduleDateTime.getTime())) {
              return ApiResponseHandler.badRequest(res, "Invalid date or time format");
          }

          if (scheduleDateTime < now) {
              return ApiResponseHandler.badRequest(res, "Cannot reschedule an exam in the past");
          }

          if (endTime) {
              const endDateTime = new Date(`${scheduledDate}T${endTime}`);
              if (!isNaN(endDateTime.getTime()) && endDateTime <= scheduleDateTime) {
                  return ApiResponseHandler.badRequest(res, "End time must be after start time");
              }
          }
      }

      // Verify schedule belongs to user's school
      const scheduleCheck = await client.query(
        `SELECT es.*, e.total_questions, e.total_marks as exam_total_marks, e.shuffle_questions, e.shuffle_options
       FROM exam_schedules es
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

      const currentStatus = scheduleCheck.rows[0].status;

      await client.query("BEGIN");

      // Determine new status: if rescheduling an expired/completed exam, reset to 'scheduled'
      let newStatus = status || null;
      let shouldIncrementAttempt = false;

      if (
        (currentStatus === "expired" || currentStatus === "completed" || currentStatus === "failed" || currentStatus === "disqualified" || currentStatus === "in_progress") &&
        (scheduledDate || startTime)
      ) {
        newStatus = "scheduled";
        shouldIncrementAttempt = true;
        // History: We no longer delete old student_exams records here.
      }

      let generatedPassword: string | null = null;
      let hashedPassword: string | null = null;

      if (newStatus === "scheduled") {
        generatedPassword = Math.random()
          .toString(36)
          .substring(2, 8)
          .toUpperCase();
        hashedPassword = generatedPassword; // Store as plain text
      }

      const result = await client.query(
        `UPDATE exam_schedules
       SET scheduled_date = COALESCE($1, scheduled_date),
           start_time = COALESCE($2, start_time),
           end_time = COALESCE($3, end_time),
           status = COALESCE($4, status),
           login_password = COALESCE($5, login_password),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
        [
          scheduledDate,
          startTime,
          endTime,
          newStatus,
          hashedPassword,
          id,
        ],
      );

      const updatedSchedule = result.rows[0];
      if (generatedPassword) {
        updatedSchedule.login_password = generatedPassword; // Return unhashed for UI
      }

      // NEW: If we reset to 'scheduled', generate fresh assigned_questions
      if (newStatus === "scheduled") {
        const exam = scheduleCheck.rows[0];
        const assignedQs = await assignQuestions(
          client,
          exam.exam_id,
          exam.total_questions,
          exam.shuffle_questions,
          exam.shuffle_options,
        );

        const totalMarks = assignedQs.reduce(
          (sum: number, q: any) => sum + (q.marks || 0),
          0,
        );
        const finalTotalMarks = totalMarks || exam.exam_total_marks || 0;

        await client.query(
          `INSERT INTO student_exams (
            exam_schedule_id, student_id, external_student_id, exam_id,
            answers, assigned_questions, total_marks, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
          [
            id,
            exam.student_id,
            exam.external_student_id,
            exam.exam_id,
            JSON.stringify([]),
            JSON.stringify(assignedQs),
            finalTotalMarks,
          ],
        );
      }

      await client.query("COMMIT");

      ApiResponseHandler.success(
        res,
        updatedSchedule,
        currentStatus === "expired"
          ? "Exam rescheduled — student can now take the exam"
          : "Schedule updated successfully",
      );
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Update schedule error:", error);
      ApiResponseHandler.serverError(res, "Failed to update schedule");
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
        return res
          .status(404)
          .json({ success: false, message: "Schedule not found" });
      }

      await client.query(
        `UPDATE exam_schedules SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
        [id],
      );

      ApiResponseHandler.success(res, null, "Schedule cancelled successfully");
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

// ─── GET /student/my-exams — student's scheduled exams ────────────────────────
router.get(
  "/student/my-exams",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = req.user!;

      // Auto-expire this student's overdue schedules using the central service
      await ScheduleService.processExpiredSchedules(undefined, user.id);

      const result = await client.query(
        `SELECT es.*,
                e.title as exam_title, e.description, e.duration, e.total_questions, e.is_secure_mode, e.max_violations,
                ec.name as category_name,
                t.first_name as tutor_first_name, t.last_name as tutor_last_name, t.full_name as tutor_full_name,
                sch.timezone as school_timezone,
                comp.id as db_competition_id, comp.competition_rules
         FROM exam_schedules es
         JOIN exams e ON es.exam_id = e.id
         JOIN tutors t ON e.tutor_id = t.id
         JOIN schools sch ON t.school_id = sch.id
         LEFT JOIN exam_categories ec ON e.category_id = ec.id
         LEFT JOIN competition_stages cs ON es.competition_stage_id = cs.id
         LEFT JOIN competition_categories ccat ON cs.competition_category_id = ccat.id
         LEFT JOIN competitions comp ON ccat.competition_id = comp.id
       WHERE (es.student_id = $1 OR es.external_student_id = $1)
         AND es.status IN ('scheduled', 'in_progress', 'expired')
         AND es.scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
       ORDER BY
         CASE es.status WHEN 'in_progress' THEN 1 WHEN 'scheduled' THEN 2 WHEN 'expired' THEN 3 END,
         es.scheduled_date, es.start_time`,
        [user.id],
      );

      ApiResponseHandler.success(
        res,
        result.rows.map((row) => ({
          id: row.id,
          examId: row.exam_id,
          examTitle: row.exam_title,
          description: row.description,
          durationMinutes: row.duration,
          totalQuestions: row.total_questions,
          questionCount: row.total_questions, // Added for mobile backwards compatibility
          totalMarks: row.total_marks,
          examCategory: row.category_name,
          categoryName: row.category_name, // Map for mobile ExamsScreen.tsx
          tutorName:
            row.tutor_full_name ||
            `${row.tutor_first_name || ""} ${row.tutor_last_name || ""}`.trim(),
          scheduledDate: row.scheduled_date,
          startTime: row.start_time,
          endTime: row.end_time,
          startTimeIso: `${row.scheduled_date.toISOString().split('T')[0]}T${row.start_time}`,
          endTimeIso: row.end_time ? `${row.scheduled_date.toISOString().split('T')[0]}T${row.end_time}` : null,
          schoolTimezone: row.school_timezone || 'Africa/Lagos',
          status: row.status,
          accessCode: row.login_username,
          isSecureMode: !!row.is_secure_mode,
          maxViolations: row.max_violations ?? 3,
          competitionId: row.db_competition_id,
          isCompetition: !!row.db_competition_id, // Map for mobile ExamsScreen.tsx
          competitionRules: row.competition_rules
        })),
        "Student schedules retrieved",
      );
    } catch (error) {
      console.error("Get student exams error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch exams");
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
        `SELECT es.*, e.duration, e.title, e.id as eid, e.total_questions, e.shuffle_questions, e.shuffle_options, e.is_secure_mode, e.max_violations,
                ec.name as category_name,
                comp.id as db_competition_id, comp.competition_rules
          FROM exam_schedules es
          JOIN exams e ON es.exam_id = e.id
          LEFT JOIN exam_categories ec ON e.category_id = ec.id
          LEFT JOIN competition_stages cs ON es.competition_stage_id = cs.id
          LEFT JOIN competition_categories ccat ON cs.competition_category_id = ccat.id
          LEFT JOIN competitions comp ON ccat.competition_id = comp.id
          WHERE es.id = $1 AND (es.student_id = $2 OR es.external_student_id = $2) AND es.status IN ('scheduled', 'in_progress')`,
        [scheduleId, user.id],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Exam not found or not scheduled" });
      }

      const schedule = result.rows[0];

      // Seamless access for internal students: Bypass access code if already correctly logged in as that student
      const isInternalStudentMatch = !user.isExternal && schedule.student_id === user.id;

      if (!isInternalStudentMatch && schedule.login_username.toUpperCase() !== (accessCode || "").toUpperCase()) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid access code" });
      }

      // Timezone Logic
      // Compare "Student Local Time" vs "Schedule Local Time"
      const timeZone = timezone || "UTC";

      // Current time in student TZ as string
      // en-SE: YYYY-MM-DD HH:mm:ss
      // We use string comparison for simplicity and robustness against TZ offsets
      const studentNowStr = new Date().toLocaleString("en-SE", {
        timeZone,
        hour12: false,
      });

      // Schedule time string: YYYY-MM-DD HH:mm:00
      const scheduleDateStr =
        typeof schedule.scheduled_date === "string"
          ? schedule.scheduled_date
          : schedule.scheduled_date.toISOString().split("T")[0];
      const scheduledStartStr = `${scheduleDateStr} ${schedule.start_time}:00`;
      const scheduledEndStr = `${scheduleDateStr} ${schedule.end_time || "23:59"}:00`;

      // 5 min grace calculation
      // Parse strings to compare with grace
      // Since string comparison works for exact time, for 5 min grace we need numeric.
      // We'll create "Fake UTC" dates from these strings to do math.
      const parseFakeUtc = (str: string) =>
        new Date(str.replace(" ", "T") + "Z");

      const studentNowDate = parseFakeUtc(studentNowStr);
      const scheduleStartDate = parseFakeUtc(scheduledStartStr);
      const scheduleEndDate = parseFakeUtc(scheduledEndStr);

      const fiveMinBefore = new Date(
        scheduleStartDate.getTime() - 5 * 60 * 1000,
      );

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
          [scheduleId],
        );
        return res.status(400).json({
          success: false,
          message: "Exam time has expired. Contact your tutor to reschedule.",
        });
      }

      // Check for assigned questions record
      const studentExamCheck = await client.query(
        `SELECT id, assigned_questions, status FROM student_exams WHERE exam_schedule_id = $1`,
        [scheduleId],
      );

      let finalQuestions: any[] = [];

      if (studentExamCheck.rows.length > 0) {
        const record = studentExamCheck.rows[0];

        if (record.status === "pending") {
          // First start - use pre-assigned questions
          finalQuestions = record.assigned_questions || [];

          // If for some reason legacy data has no assigned questions, generate them now
          if (finalQuestions.length === 0) {
            finalQuestions = await assignQuestions(
              client,
              schedule.exam_id,
              schedule.total_questions,
              schedule.shuffle_questions,
              schedule.shuffle_options,
            );
          }

          await client.query(
            `UPDATE student_exams SET status = 'in_progress', started_at = NOW(), assigned_questions = $1 WHERE id = $2`,
            [JSON.stringify(finalQuestions), record.id],
          );
        } else {
          // Resume - use existing assigned questions
          finalQuestions = record.assigned_questions || [];

          // Fallback for extreme edge cases
          if (finalQuestions.length === 0) {
            finalQuestions = await assignQuestions(
              client,
              schedule.exam_id,
              schedule.total_questions,
              schedule.shuffle_questions,
              schedule.shuffle_options,
            );
            await client.query(
              `UPDATE student_exams SET assigned_questions = $1 WHERE id = $2`,
              [JSON.stringify(finalQuestions), record.id],
            );
          }
        }
      } else {
        // Fallback for legacy schedules that don't have a student_exams record yet
        finalQuestions = await assignQuestions(
          client,
          schedule.exam_id,
          schedule.total_questions,
          schedule.shuffle_questions,
          schedule.shuffle_options,
        );

        const studentTotalMarks = finalQuestions.reduce(
          (sum: number, q: any) => sum + (q.marks || 0),
          0,
        );

        await client.query(
          `INSERT INTO student_exams (student_id, external_student_id, exam_id, exam_schedule_id, started_at, status, assigned_questions, total_marks)
           VALUES ($1, $2, $3, $4, NOW(), 'in_progress', $5, $6)`,
          [
            user.isExternal ? null : user.id,
            user.isExternal ? user.id : null,
            schedule.exam_id,
            scheduleId,
            JSON.stringify(finalQuestions),
            studentTotalMarks || schedule.total_questions || 0,
          ],
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
          ? q.options.map((o: any) => (typeof o === "string" ? o : o.text))
          : q.options,
      }));

      res.json({
        success: true,
        message: "Access granted",
        data: {
          scheduleId: schedule.id,
          examId: schedule.exam_id,
          examTitle: schedule.title,
          examCategory: schedule.category_name || "General",
          durationMinutes: schedule.duration,
          isSecureMode: !!schedule.is_secure_mode,
          maxViolations: schedule.max_violations ?? 3,
          competitionId: schedule.db_competition_id,
          competitionRules: schedule.competition_rules,
          startedAt: schedule.started_at || new Date(),
          questions: sanitizedQuestions.map((q: any) => ({
            ...q,
            questionText: q.question_text || q.questionText,
            questionType: q.question_type || q.questionType,
          })),
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
        `SELECT es.*, e.title as exam_title,
                COALESCE(s.email, ext.email) as email,
                COALESCE(s.full_name, ext.full_name, CONCAT(s.first_name, ' ', s.last_name)) as student_display_name
         FROM exam_schedules es
         JOIN exams e ON es.exam_id = e.id
         LEFT JOIN students s ON es.student_id = s.id
         LEFT JOIN external_students ext ON es.external_student_id = ext.id
         JOIN tutors t ON e.tutor_id = t.id
         WHERE es.id = $1 AND t.school_id = $2`,
        [id, user.schoolId],
      );

      if (result.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Schedule not found" });
      }

      const schedule = result.rows[0];
      const studentName = schedule.student_display_name || "Student";

      if (!schedule.email) {
        return res
          .status(400)
          .json({ success: false, message: "Student has no email address" });
      }

      const success = await sendExamCredentials(
        user.schoolId!,
        schedule.email!,
        studentName!,
        schedule.exam_title,
        {
          date: new Date(schedule.scheduled_date).toLocaleDateString(),
          time: `${schedule.start_time} - ${schedule.end_time}`,
          username: schedule.login_username,
          password: schedule.login_password,
          accessCode: schedule.login_username,
        },
      );

      if (success) {
        ApiResponseHandler.success(res, null, "Email sent successfully");
      } else {
        res
          .status(402)
          .json({ success: false, message: "Failed to send email. Ensure you have enough PAYG credits." });
      }
    } catch (error) {
      console.error("Send email error:", error);
      ApiResponseHandler.serverError(res, "Failed to process request");
    } finally {
      client.release();
    }
  },
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
        `SELECT es.*, e.title as exam_title,
                COALESCE(s.email, ext.email) as email,
                COALESCE(s.full_name, ext.full_name, CONCAT(s.first_name, ' ', s.last_name)) as student_display_name
         FROM exam_schedules es
         JOIN exams e ON es.exam_id = e.id
         LEFT JOIN students s ON es.student_id = s.id
         LEFT JOIN external_students ext ON es.external_student_id = ext.id
         JOIN tutors t ON e.tutor_id = t.id
         WHERE es.exam_id = $1 AND t.school_id = $2 AND es.status != 'cancelled'`,
        [examId, user.schoolId],
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.success(
          res,
          { count: 0 },
          "No students to email",
        );
      }

      let sentCount = 0;
      let failCount = 0;

      for (const schedule of result.rows) {
        if (!schedule.email) continue;
        const studentName = schedule.student_display_name || "Student";

        const success = await sendExamCredentials(
          user.schoolId!,
          schedule.email!,
          studentName!,
          schedule.exam_title,
          {
            date: new Date(schedule.scheduled_date).toLocaleDateString(),
            time: `${schedule.start_time} - ${schedule.end_time}`,
            username: schedule.login_username,
            password: schedule.login_password,
            accessCode: schedule.login_username,
          },
        );

        if (success) sentCount++;
        else failCount++;
      }

      ApiResponseHandler.success(
        res,
        { count: sentCount, failCount },
        `Emails sent to ${sentCount} students. Failed: ${failCount}`,
      );
    } catch (error) {
      console.error("Bulk email error:", error);
      ApiResponseHandler.serverError(res, "Failed to process request");
    } finally {
      client.release();
    }
  },
);

// Helper to assign questions
// Helper to assign questions with stratified sampling
async function assignQuestions(
  client: any,
  examId: string,
  limit: number,
  shuffleQs: boolean,
  shuffleOpts: boolean,
) {
  // 1. Fetch ALL active questions for this exam
  const result = await client.query(
    `SELECT id, question_text, question_type, options, marks, correct_answer, image_url, created_at, sort_order
       FROM questions WHERE exam_id = $1`,
    [examId],
  );

  let allQuestions = result.rows;

  // 1a. Deduplicate by question_text to ensure unique questions
  const seenTexts = new Set();
  allQuestions = allQuestions.filter((q: any) => {
    const normalizedText = (q.question_text || "").trim().toLowerCase();
    if (seenTexts.has(normalizedText)) return false;
    seenTexts.add(normalizedText);
    return true;
  });

  // 1b. Filter for supported question types
  const supportedTypes = ['multiple_choice', 'true_false', 'fill_blank', 'theory'];
  allQuestions = allQuestions.filter((q: any) => supportedTypes.includes(q.question_type));

  // If no limit set, return all (shuffled if needed)
  if (!limit || limit <= 0 || limit >= allQuestions.length) {
    if (shuffleQs) {
      allQuestions = shuffleArray([...allQuestions]);
    } else {
      // Sort by order or created_at if not shuffling
      allQuestions.sort(
        (a: any, b: any) =>
          (a.sort_order || 0) - (b.sort_order || 0) ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }
    return processOptions(allQuestions, shuffleOpts);
  }

  // 2. Stratified Sampling Logic
  // Categories: Hard (fill_blank), Medium (multiple_choice), Easy (true_false)
  const hardQs = allQuestions.filter(
    (q: any) => q.question_type === "fill_blank",
  );
  const mediumQs = allQuestions.filter(
    (q: any) => q.question_type === "multiple_choice",
  );
  const easyQs = allQuestions.filter(
    (q: any) => q.question_type === "true_false",
  );

  // Calculate targets
  let hardTarget = 0,
    mediumTarget = 0,
    easyTarget = 0;

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
      selected.sort(
        (a: any, b: any) =>
          (a.sort_order || 0) - (b.sort_order || 0) ||
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
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
    const remainingPool = allQuestions.filter(
      (q: any) => !selectedIds.has(q.id),
    );
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
    finalSelection.sort(
      (a: any, b: any) =>
        (a.sort_order || 0) - (b.sort_order || 0) ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  return processOptions(finalSelection, shuffleOpts);
}

function processOptions(questions: any[], shuffleOpts: boolean) {
  return questions.map((q: any) => {
    // 1. For multiple choice and true/false, always try to resolve correct_answer to TEXT if it's currently an index.
    // This makes the snapshot "self-contained" and immune to shuffling or future DB changes.
    if ((q.question_type === "multiple_choice" || q.question_type === "true_false") && Array.isArray(q.options)) {
      const currentCorrect = String(q.correct_answer || "").trim();
      
      // If it's an index, resolve it to the actual text string or label
      if (/^\d+$/.test(currentCorrect)) {
        const idx = parseInt(currentCorrect);
        if (idx >= 0 && idx < q.options.length) {
          const opt = q.options[idx];
          // Update the q object in the snapshot with the TEXT of the correct answer
          q.correct_answer = typeof opt === "string" ? opt : (opt.text || opt.label || currentCorrect);
        }
      }

      // 2. Perform shuffle ONLY for multiple choice if requested
      if (q.question_type === "multiple_choice" && shuffleOpts) {
        const opts = [...q.options];
        for (let i = opts.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [opts[i], opts[j]] = [opts[j], opts[i]];
        }
        return { ...q, options: opts };
      }
    }
    
    return q;
  });
}

export default router;
