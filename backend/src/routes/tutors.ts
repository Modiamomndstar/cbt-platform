import { Router, Request, Response, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import { db } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";
import { ApiResponseHandler } from "../utils/apiResponse";
import { requireTutorSlot } from "../middleware/planGuard";
import { validate } from "../middleware/validation";
import {
  getPaginationOptions,
  formatPaginationResponse,
} from "../utils/pagination";
import { logUserActivity } from "../utils/auditLogger";
import { splitFullName } from "../utils/userUtils";
import { transformResult } from "../utils/responseTransformer";

const router = Router();


router.use(authenticate);

// Get all tutors for school
router.get(
  "/",
  authorize("school"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const pagination = getPaginationOptions(req);

      const result = await db.query(
        `SELECT id, username, full_name, email, phone, subjects, bio, avatar_url, is_active, last_login_at, created_at
       FROM tutors WHERE school_id = $1 ORDER BY full_name LIMIT $2 OFFSET $3`,
        [req.user!.schoolId, pagination.limit, pagination.offset],
      );

      const countResult = await db.query(
        "SELECT COUNT(*) FROM tutors WHERE school_id = $1",
        [req.user!.schoolId],
      );

      ApiResponseHandler.success(
        res,
        transformResult(result),
        "Tutors retrieved",
        formatPaginationResponse(
          parseInt(countResult.rows[0].count),
          pagination,
        ),
      );
    } catch (error) {
      next(error);
    }
  },
);

// Get tutor by ID
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { role, schoolId, tutorId } = req.user!;

      let query =
        "SELECT id, username, full_name, email, phone, subjects, bio, avatar_url, is_active, created_at FROM tutors WHERE id = $1";
      let params: any[] = [id];

      if (role === "school") {
        query += " AND school_id = $2";
        params.push(schoolId);
      } else if (role === "tutor") {
        query += " AND id = $2";
        params.push(tutorId);
      }

      const result = await db.query(query, params);

      if (result.rows.length === 0) {
        ApiResponseHandler.notFound(res, "Tutor not found");
        return;
      }

      ApiResponseHandler.success(
        res,
        transformResult(result.rows[0]),
        "Tutor profile retrieved",
      );
    } catch (error) {
      next(error);
    }
  },
);

// Toggle tutor active status (Pause/Unpause)
router.put(
  "/:id/toggle-status",
  authorize("school"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { is_active } = req.body;
      const { schoolId } = req.user!;

      if (typeof is_active !== "boolean") {
        ApiResponseHandler.badRequest(res, "is_active must be a boolean");
        return;
      }

      const result = await db.query(
        "UPDATE tutors SET is_active = $1 WHERE id = $2 AND school_id = $3 RETURNING id, is_active",
        [is_active, id, schoolId],
      );

      const tutorNameResult = await db.query('SELECT full_name FROM tutors WHERE id = $1', [id]);
      const tutorName = tutorNameResult.rows[0]?.full_name;

      // Log status toggle
      await logUserActivity(req, 'tutor_status_toggle', {
        targetType: 'tutor',
        targetId: id,
        targetName: tutorName,
        details: { is_active }
      });

      ApiResponseHandler.success(
        res,
        transformResult(result.rows[0]),
        `Tutor ${is_active ? "unpaused" : "paused"} successfully`,
      );
    } catch (error) {
      next(error);
    }
  },
);

// Get students assigned to tutor
router.get(
  "/:id/students",
  authorize("school", "tutor"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { categoryId, search } = req.query;
      const { role, schoolId, tutorId } = req.user!;

      // Permission check
      if (role === "tutor" && tutorId !== id) {
        ApiResponseHandler.forbidden(res, "Access denied");
        return;
      }

      let query = `
        SELECT s.id, s.student_id, s.full_name, s.email, s.phone, s.category_id,
               sc.name as category_name, sc.color as category_color,
               st.assigned_at
        FROM students s
        JOIN student_tutors st ON s.id = st.student_id
        LEFT JOIN student_categories sc ON s.category_id = sc.id
        WHERE st.tutor_id = $1 AND s.is_active = true
      `;
      const params: any[] = [id];
      let paramIndex = 2;

      if (categoryId) {
        if (categoryId === "uncategorized") {
          query += ` AND s.category_id IS NULL`;
        } else {
          query += ` AND s.category_id = $${paramIndex++}`;
          params.push(categoryId);
        }
      }

      if (search) {
        query += ` AND (s.full_name ILIKE $${paramIndex} OR s.student_id ILIKE $${paramIndex})`;
        params.push(`%${search}%`);
      }

      query += ` ORDER BY s.full_name`;

      const result = await db.query(query, params);

      ApiResponseHandler.success(res, transformResult(result), "Students retrieved");
    } catch (error) {
      next(error);
    }
  },
);

// Get categories of students assigned to tutor
router.get(
  "/:id/categories",
  authorize("school", "tutor"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { role, tutorId } = req.user!;

      if (role === "tutor" && tutorId !== id) {
        ApiResponseHandler.forbidden(res, "Access denied");
        return;
      }

      const result = await db.query(
        `SELECT DISTINCT sc.id, sc.name, sc.color
         FROM student_categories sc
         JOIN students s ON sc.id = s.category_id
         JOIN student_tutors st ON s.id = st.student_id
         WHERE st.tutor_id = $1 AND sc.is_active = true
         ORDER BY sc.name`,
        [id],
      );

      ApiResponseHandler.success(res, transformResult(result), "Categories retrieved");
    } catch (error) {
      next(error);
    }
  },
);

// Create tutor (school only)
router.post(
  "/",
  authorize("school"),
  [
    body("username").trim().isLength({ min: 4 }),
    body("password").isLength({ min: 6 }),
    body("fullName").trim().notEmpty(),
    body("email").optional().isEmail(),
    body("phone").optional(),
    body("subjects").optional().isArray(),
    validate,
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { username, password, fullName, email, phone, subjects, bio } =
        req.body;
      const schoolId = req.user!.schoolId;

      // Check username uniqueness
      const check = await db.query(
        "SELECT id FROM tutors WHERE school_id = $1 AND username = $2",
        [schoolId, username],
      );
      if (check.rows.length > 0) {
        ApiResponseHandler.conflict(res, "Username already exists");
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Parse name parts
      const nameParts = fullName.trim().split(" ");
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(" ") || ".";

      const result = await db.query(
        `INSERT INTO tutors (school_id, username, password_hash, first_name, last_name, full_name, email, phone, subjects, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, username, first_name, last_name, full_name, email, phone, subjects, is_active, created_at`,
        [
          schoolId,
          username,
          passwordHash,
          firstName,
          lastName,
          fullName,
          email,
          phone,
          subjects || [],
          bio,
        ],
      );

      const tutor = result.rows[0];

      // Log tutor creation
      await logUserActivity(req, "tutor_creation", {
        targetType: "tutor",
        targetId: tutor.id,
        targetName: tutor.full_name,
        details: { email: tutor.email, username: tutor.username },
      });

      ApiResponseHandler.created(res, tutor, "Tutor created");
    } catch (error) {
      next(error);
    }
  },
);

// Bulk create tutors
router.post(
  "/bulk",
  authorize("school"),
  [body("tutors").isArray({ min: 1 }), validate],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { tutors } = req.body;
      const schoolId = req.user!.schoolId;

      const created: any[] = [];
      const errors: any[] = [];

      for (const tutor of tutors) {
        try {
          // Check username
          const check = await db.query(
            "SELECT id FROM tutors WHERE school_id = $1 AND username = $2",
            [schoolId, tutor.username],
          );
          if (check.rows.length > 0) {
            errors.push({ username: tutor.username, error: "Username exists" });
            continue;
          }

          const passwordHash = await bcrypt.hash(tutor.password, 10);

          // Parse name parts
          const nameParts = tutor.fullName.trim().split(" ");
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(" ") || ".";

          const result = await db.query(
            `INSERT INTO tutors (school_id, username, password_hash, first_name, last_name, full_name, email, phone, subjects)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           RETURNING id, username, first_name, last_name, full_name, email`,
            [
              schoolId,
              tutor.username,
              passwordHash,
              firstName,
              lastName,
              tutor.fullName,
              tutor.email,
              tutor.phone,
              tutor.subjects || [],
            ],
          );
          created.push(result.rows[0]);
        } catch (err) {
          errors.push({ username: tutor.username, error: "Failed to create" });
        }
      }

      ApiResponseHandler.success(
        res,
        { created, errors, count: created.length },
        "Bulk creation processed",
      );
    } catch (error) {
      next(error);
    }
  },
);

// Update tutor
router.put(
  "/:id",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { fullName, email, phone, subjects, bio, avatarUrl, isActive } =
        req.body;
      const { role, schoolId, tutorId } = req.user!;

      // Check permissions
      if (role === "tutor" && tutorId !== id) {
        ApiResponseHandler.forbidden(res, "Access denied");
        return;
      }

      const allowedFields = [
        "fullName",
        "email",
        "phone",
        "subjects",
        "bio",
        "avatarUrl",
        "isActive",
      ];
      const updates = req.body;
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
          if (key === "fullName" && typeof value === "string") {
            const nameParts = value.trim().split(" ");
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(" ") || ".";

            setClauses.push(`first_name = $${paramIndex++}`);
            values.push(firstName);
            setClauses.push(`last_name = $${paramIndex++}`);
            values.push(lastName);
          }

          if (key === "isActive" && role !== "school") continue;

          // Convert camelCase to snake_case for database columns
          const dbColumnName = key.replace(
            /[A-Z]/g,
            (l) => `_${l.toLowerCase()}`,
          );
          setClauses.push(`${dbColumnName} = $${paramIndex++}`);
          values.push(value);
        }
      }

      if (setClauses.length === 0) {
        ApiResponseHandler.badRequest(res, "No fields to update");
        return;
      }

      setClauses.push(`updated_at = NOW()`);
      const idParamIndex = paramIndex++; // Get the next available index for 'id'
      values.push(id); // Push 'id' to the values array

      let query = `UPDATE tutors SET ${setClauses.join(", ")} WHERE id = $${idParamIndex}`;
      if (role === "school") {
        query += ` AND school_id = $${paramIndex++}`;
        values.push(schoolId);
      }
      query += " RETURNING *";

      const result = await db.query(query, values);

      const tutor = result.rows[0];

      // Log tutor update
      await logUserActivity(req, "tutor_update", {
        targetType: "tutor",
        targetId: id,
        targetName: tutor.full_name,
        details: { fields: Object.keys(updates) },
      });

      ApiResponseHandler.success(res, tutor, "Tutor updated");
    } catch (error) {
      next(error);
    }
  },
);

// Delete tutor
router.delete(
  "/:id",
  authorize("school"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const schoolId = req.user!.schoolId;

      const result = await db.query(
        "DELETE FROM tutors WHERE id = $1 AND school_id = $2 RETURNING full_name",
        [id, schoolId],
      );

      if (result.rows.length > 0) {
        // Log tutor deletion
        await logUserActivity(req, "tutor_deletion", {
          targetType: "tutor",
          targetId: id,
          targetName: result.rows[0].full_name,
        });
      }

      ApiResponseHandler.success(res, null, "Tutor deleted");
    } catch (error) {
      next(error);
    }
  },
);

// Get tutor dashboard stats
router.get(
  "/dashboard/stats",
  authorize("tutor"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tutorId = req.user!.tutorId;

      // Get aggregate stats
      const stats = await db.query(
        `SELECT
        (SELECT COUNT(*) FROM exams WHERE tutor_id = $1) as total_exams,
        (SELECT COUNT(*) FROM students WHERE school_id = (SELECT school_id FROM tutors WHERE id = $1)) as total_students,
        (SELECT COUNT(*) FROM questions WHERE exam_id IN (SELECT id FROM exams WHERE tutor_id = $1)) as total_questions,
        (SELECT COUNT(*) FROM student_exams WHERE exam_id IN (SELECT id FROM exams WHERE tutor_id = $1) AND status = 'completed') as completed_exams,
        (SELECT COALESCE(AVG(percentage), 0) FROM student_exams WHERE exam_id IN (SELECT id FROM exams WHERE tutor_id = $1) AND status = 'completed') as average_score`,
        [tutorId],
      );

      // Get detailed upcoming exams
      const upcomingExams = await db.query(
        `SELECT
          es.id,
          es.scheduled_date,
          es.start_time,
          es.end_time,
          e.id as exam_id,
          e.title as exam_title,
          e.duration,
          COUNT(DISTINCT se.student_id) as student_count
        FROM exam_schedules es
        JOIN exams e ON es.exam_id = e.id
        LEFT JOIN student_exams se ON es.id = se.exam_schedule_id
        WHERE e.tutor_id = $1
          AND es.status = 'scheduled'
          AND es.scheduled_date >= CURRENT_DATE
        GROUP BY es.id, e.id, e.title, e.duration, es.scheduled_date, es.start_time, es.end_time
        ORDER BY es.scheduled_date ASC
        LIMIT 5`,
        [tutorId],
      );

      const responseData = {
        ...stats.rows[0],
        upcomingExamsCount: upcomingExams.rows.length,
        upcomingExams: upcomingExams.rows.map((e) => ({
          id: e.id,
          examId: e.exam_id,
          examTitle: e.exam_title,
          scheduledDate: e.scheduled_date,
          startTime: e.start_time,
          endTime: e.end_time,
          duration: e.duration,
          studentCount: parseInt(e.student_count) || 0,
        })),
      };

      ApiResponseHandler.success(
        res,
        transformResult(responseData),
        "Dashboard stats retrieved",
      );
    } catch (error) {
      next(error);
    }
  },
);

export default router;
