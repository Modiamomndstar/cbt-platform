import { Router, Request, Response, NextFunction } from "express";
import { body, param, validationResult } from "express-validator";
import bcrypt from "bcryptjs";
import { db } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res
      .status(400)
      .json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
    return;
  }
  next();
};

router.use(authenticate);

// Get all tutors for school
router.get(
  "/",
  authorize("school"),
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await db.query(
        `SELECT id, username, full_name, email, phone, subjects, bio, avatar_url, is_active, last_login_at, created_at
       FROM tutors WHERE school_id = $1 ORDER BY full_name`,
        [req.user!.schoolId],
      );
      res.json({ success: true, data: result.rows });
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
        res.status(404).json({ success: false, message: "Tutor not found" });
        return;
      }

      res.json({ success: true, data: result.rows[0] });
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
        res.status(403).json({ success: false, message: "Access denied" });
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
        if (categoryId === 'uncategorized') {
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

      res.json({ success: true, data: result.rows });
    } catch (error) {
      next(error);
    }
  }
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
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      const result = await db.query(
        `SELECT DISTINCT sc.id, sc.name, sc.color
         FROM student_categories sc
         JOIN students s ON sc.id = s.category_id
         JOIN student_tutors st ON s.id = st.student_id
         WHERE st.tutor_id = $1 AND sc.is_active = true
         ORDER BY sc.name`,
        [id]
      );

      res.json({ success: true, data: result.rows });
    } catch (error) {
      next(error);
    }
  }
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
        res
          .status(409)
          .json({ success: false, message: "Username already exists" });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const result = await db.query(
        `INSERT INTO tutors (school_id, username, password_hash, full_name, email, phone, subjects, bio)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, username, full_name, email, phone, subjects, is_active, created_at`,
        [
          schoolId,
          username,
          passwordHash,
          fullName,
          email,
          phone,
          subjects || [],
          bio,
        ],
      );

      res
        .status(201)
        .json({
          success: true,
          message: "Tutor created",
          data: result.rows[0],
        });
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

          const result = await db.query(
            `INSERT INTO tutors (school_id, username, password_hash, full_name, email, phone, subjects)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING id, username, full_name, email`,
            [
              schoolId,
              tutor.username,
              passwordHash,
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

      res.json({
        success: true,
        data: { created, errors, count: created.length },
      });
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
        res.status(403).json({ success: false, message: "Access denied" });
        return;
      }

      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (fullName) {
        updates.push(`full_name = $${paramIndex++}`);
        values.push(fullName);
      }
      if (email !== undefined) {
        updates.push(`email = $${paramIndex++}`);
        values.push(email);
      }
      if (phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(phone);
      }
      if (subjects) {
        updates.push(`subjects = $${paramIndex++}`);
        values.push(subjects);
      }
      if (bio !== undefined) {
        updates.push(`bio = $${paramIndex++}`);
        values.push(bio);
      }
      if (avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(avatarUrl);
      }
      if (isActive !== undefined && role === "school") {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(isActive);
      }

      if (updates.length === 0) {
        res
          .status(400)
          .json({ success: false, message: "No fields to update" });
        return;
      }

      updates.push("updated_at = NOW()");
      values.push(id);

      let query = `UPDATE tutors SET ${updates.join(", ")} WHERE id = $${paramIndex}`;
      if (role === "school") {
        query += ` AND school_id = $${paramIndex + 1}`;
        values.push(schoolId);
      }
      query += " RETURNING *";

      const result = await db.query(query, values);

      if (result.rows.length === 0) {
        res.status(404).json({ success: false, message: "Tutor not found" });
        return;
      }

      res.json({
        success: true,
        message: "Tutor updated",
        data: result.rows[0],
      });
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

      await db.query("DELETE FROM tutors WHERE id = $1 AND school_id = $2", [
        id,
        schoolId,
      ]);

      res.json({ success: true, message: "Tutor deleted" });
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

      const stats = await db.query(
        `SELECT
        (SELECT COUNT(*) FROM exams WHERE tutor_id = $1) as total_exams,
        (SELECT COUNT(*) FROM students WHERE school_id = (SELECT school_id FROM tutors WHERE id = $1)) as total_students,
        (SELECT COUNT(*) FROM questions WHERE exam_id IN (SELECT id FROM exams WHERE tutor_id = $1)) as total_questions,
        (SELECT COUNT(*) FROM student_exams WHERE exam_id IN (SELECT id FROM exams WHERE tutor_id = $1) AND status = 'completed') as completed_exams,
        (SELECT COUNT(*) FROM exam_schedules WHERE exam_id IN (SELECT id FROM exams WHERE tutor_id = $1) AND status = 'scheduled') as upcoming_exams,
        (SELECT COALESCE(AVG(percentage), 0) FROM student_exams WHERE exam_id IN (SELECT id FROM exams WHERE tutor_id = $1) AND status = 'completed') as average_score`,
        [tutorId],
      );

      res.json({ success: true, data: stats.rows[0] });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
