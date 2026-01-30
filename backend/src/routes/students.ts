import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import { db } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({
        success: false,
        message: "Validation failed",
        errors: errors.array(),
      });
  }
  next();
};

router.use(authenticate);

// Get all students
router.get("/", async (req, res, next) => {
  try {
    const { role, schoolId, tutorId } = req.user!;
    const { categoryId, search, page = 1, limit = 50 } = req.query;

    let querySchoolId = schoolId;

    if (role === "tutor" && tutorId) {
      const tutorResult = await db.query(
        "SELECT school_id FROM tutors WHERE id = $1",
        [tutorId],
      );
      if (tutorResult.rows.length > 0) {
        querySchoolId = tutorResult.rows[0].school_id;
      }
    }

    let sql = `SELECT s.id, s.student_id, s.full_name, s.email, s.phone, s.date_of_birth, s.gender,
                      s.parent_name, s.parent_phone, s.is_active, s.created_at,
                      sc.id as category_id, sc.name as category_name, sc.color as category_color
               FROM students s
               LEFT JOIN student_categories sc ON s.category_id = sc.id
               WHERE s.school_id = $1 AND s.is_active = true`;
    const params: any[] = [querySchoolId];
    let paramIndex = 2;

    if (categoryId) {
      sql += ` AND s.category_id = $${paramIndex++}`;
      params.push(categoryId);
    }

    if (search) {
      sql += ` AND (s.full_name ILIKE $${paramIndex} OR s.student_id ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    sql += ` ORDER BY sc.sort_order, sc.name, s.full_name`;

    // Add pagination
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await db.query(sql, params);

    // Get total count
    const countResult = await db.query(
      "SELECT COUNT(*) FROM students WHERE school_id = $1 AND is_active = true",
      [querySchoolId],
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(
          parseInt(countResult.rows[0].count) / parseInt(limit as string),
        ),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get students by category
router.get("/by-category", async (req, res, next) => {
  try {
    const { role, schoolId, tutorId } = req.user!;
    const { categoryId } = req.query;

    let querySchoolId = schoolId;

    if (role === "tutor" && tutorId) {
      const tutorResult = await db.query(
        "SELECT school_id FROM tutors WHERE id = $1",
        [tutorId],
      );
      if (tutorResult.rows.length > 0) {
        querySchoolId = tutorResult.rows[0].school_id;
      }
    }

    let sql = `SELECT s.id, s.student_id, s.full_name, s.email, s.phone, s.is_active
               FROM students s
               WHERE s.school_id = $1 AND s.is_active = true`;
    const params: any[] = [querySchoolId];

    if (categoryId) {
      sql += ` AND s.category_id = $2`;
      params.push(categoryId);
    } else {
      sql += ` AND s.category_id IS NULL`;
    }

    sql += ` ORDER BY s.full_name`;

    const result = await db.query(sql, params);

    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get student by ID
router.get("/:id", [param("id").isUUID(), validate], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, schoolId, tutorId } = req.user!;

    let querySchoolId = schoolId;

    if (role === "tutor" && tutorId) {
      const tutorResult = await db.query(
        "SELECT school_id FROM tutors WHERE id = $1",
        [tutorId],
      );
      if (tutorResult.rows.length > 0) {
        querySchoolId = tutorResult.rows[0].school_id;
      }
    }

    const result = await db.query(
      `SELECT s.*, sc.name as category_name, sc.color as category_color
       FROM students s
       LEFT JOIN student_categories sc ON s.category_id = sc.id
       WHERE s.id = $1 AND s.school_id = $2`,
      [id, querySchoolId],
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    // Get exam history
    const examsResult = await db.query(
      `SELECT se.id, se.score, se.total_marks, se.percentage, se.status, se.started_at, se.submitted_at,
              e.title as exam_title, e.category as exam_category
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       WHERE se.student_id = $1
       ORDER BY se.created_at DESC`,
      [id],
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        examHistory: examsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create student
router.post(
  "/",
  [
    body("studentId").trim().notEmpty(),
    body("fullName").trim().notEmpty(),
    body("email").optional().isEmail(),
    body("phone").optional(),
    body("categoryId").optional().isUUID(),
    validate,
  ],
  async (req, res, next) => {
    try {
      const {
        studentId,
        fullName,
        email,
        phone,
        dateOfBirth,
        gender,
        address,
        parentName,
        parentPhone,
        parentEmail,
        categoryId,
      } = req.body;
      const { role, schoolId, tutorId } = req.user!;

      let querySchoolId = schoolId;

      if (role === "tutor" && tutorId) {
        const tutorResult = await db.query(
          "SELECT school_id FROM tutors WHERE id = $1",
          [tutorId],
        );
        if (tutorResult.rows.length > 0) {
          querySchoolId = tutorResult.rows[0].school_id;
        }
      }

      // Check student ID uniqueness
      const check = await db.query(
        "SELECT id FROM students WHERE school_id = $1 AND student_id = $2",
        [querySchoolId, studentId],
      );
      if (check.rows.length > 0) {
        return res
          .status(409)
          .json({ success: false, message: "Student ID already exists" });
      }

      const result = await db.query(
        `INSERT INTO students (school_id, category_id, student_id, full_name, email, phone, date_of_birth, gender, address, parent_name, parent_phone, parent_email)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
        [
          querySchoolId,
          categoryId,
          studentId,
          fullName,
          email,
          phone,
          dateOfBirth,
          gender,
          address,
          parentName,
          parentPhone,
          parentEmail,
        ],
      );

      res
        .status(201)
        .json({
          success: true,
          message: "Student created",
          data: result.rows[0],
        });
    } catch (error) {
      next(error);
    }
  },
);

// Bulk create students
router.post(
  "/bulk",
  [
    body("students").isArray({ min: 1 }),
    body("categoryId").optional().isUUID(),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { students, categoryId } = req.body;
      const { role, schoolId, tutorId } = req.user!;

      let querySchoolId = schoolId;

      if (role === "tutor" && tutorId) {
        const tutorResult = await db.query(
          "SELECT school_id FROM tutors WHERE id = $1",
          [tutorId],
        );
        if (tutorResult.rows.length > 0) {
          querySchoolId = tutorResult.rows[0].school_id;
        }
      }

      const created: any[] = [];
      const errors: any[] = [];

      await db.transaction(async (client) => {
        for (const student of students) {
          try {
            // Check student ID
            const check = await client.query(
              "SELECT id FROM students WHERE school_id = $1 AND student_id = $2",
              [querySchoolId, student.studentId],
            );
            if (check.rows.length > 0) {
              errors.push({
                studentId: student.studentId,
                error: "Student ID exists",
              });
              continue;
            }

            const result = await client.query(
              `INSERT INTO students (school_id, category_id, student_id, full_name, email, phone, level)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, student_id, full_name`,
              [
                querySchoolId,
                categoryId || student.categoryId,
                student.studentId,
                student.fullName,
                student.email,
                student.phone,
                student.level,
              ],
            );
            created.push(result.rows[0]);
          } catch (err) {
            errors.push({
              studentId: student.studentId,
              error: "Failed to create",
            });
          }
        }
      });

      res.json({
        success: true,
        data: { created, errors, count: created.length },
      });
    } catch (error) {
      next(error);
    }
  },
);

// Update student
router.put("/:id", [param("id").isUUID(), validate], async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { role, schoolId, tutorId } = req.user!;

    let querySchoolId = schoolId;

    if (role === "tutor" && tutorId) {
      const tutorResult = await db.query(
        "SELECT school_id FROM tutors WHERE id = $1",
        [tutorId],
      );
      if (tutorResult.rows.length > 0) {
        querySchoolId = tutorResult.rows[0].school_id;
      }
    }

    const allowedFields = [
      "studentId",
      "fullName",
      "email",
      "phone",
      "dateOfBirth",
      "gender",
      "address",
      "parentName",
      "parentPhone",
      "parentEmail",
      "categoryId",
      "isActive",
    ];
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        setClauses.push(
          `${key === "categoryId" ? "category_id" : key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)} = $${paramIndex++}`,
        );
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No fields to update" });
    }

    values.push(id, querySchoolId);

    const result = await db.query(
      `UPDATE students SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex++} AND school_id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Student not found" });
    }

    res.json({
      success: true,
      message: "Student updated",
      data: result.rows[0],
    });
  } catch (error) {
    next(error);
  }
});

// Delete student
router.delete("/:id", async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, schoolId, tutorId } = req.user!;

    let querySchoolId = schoolId;

    if (role === "tutor" && tutorId) {
      const tutorResult = await db.query(
        "SELECT school_id FROM tutors WHERE id = $1",
        [tutorId],
      );
      if (tutorResult.rows.length > 0) {
        querySchoolId = tutorResult.rows[0].school_id;
      }
    }

    await db.query(
      "UPDATE students SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2",
      [id, querySchoolId],
    );

    res.json({ success: true, message: "Student deleted" });
  } catch (error) {
    next(error);
  }
});

export default router;
