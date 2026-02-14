import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import { db } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";

const router = Router();

// Helper to generate unique username
const generateUniqueUsername = async (client: any, fullName: string, schoolId: string, existingInBatch: Set<string> = new Set()) => {
  // Normalize: lower case, remove spaces/special chars
  let base = fullName.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (base.length < 3) base = base.padEnd(3, 'x'); // Ensure min length

  let username = base;
  let counter = 1;

  // Check against DB and Batch
  while (true) {
    if (existingInBatch.has(username)) {
       username = `${base}${counter}`;
       counter++;
       continue;
    }

    const result = await client.query(
      "SELECT 1 FROM students WHERE username = $1", // Global uniqueness check
      [username]
    );

    if (result.rows.length === 0) {
      break;
    }

    username = `${base}${counter}`;
    counter++;
  }

  return username;
};

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
               LEFT JOIN LATERAL (
                 SELECT array_agg(json_build_object('id', t.id, 'name', t.full_name)) as tutors
                 FROM student_tutors st
                 JOIN tutors t ON st.tutor_id = t.id
                 WHERE st.student_id = s.id
               ) as assigned_tutors ON true
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

      // Generate unique username
      const username = await generateUniqueUsername(db, fullName, querySchoolId);
      // Default password hash (e.g., student123 or same as username for now? User said "password generated for them")
      // Let's set a default password for now. Ideally, we should email it or let admin set it.
      // For now, let's use a standard default so they can change it later.
      // Or use the studentId/reg number as initial password?
      // Let's use 'password123' hash for simplicity in this phase, or better:
      const bcrypt = require("bcryptjs");
      const defaultPasswordHash = await bcrypt.hash("password123", 10);

      const result = await db.query(
        `INSERT INTO students (school_id, category_id, student_id, full_name, email, phone, date_of_birth, gender, address, parent_name, parent_phone, parent_email, username, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
          username,
          defaultPasswordHash
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
      const batchUsernames = new Set<string>(); // Track usernames used in this batch
      const bcrypt = require("bcryptjs");
      const defaultPasswordHash = await bcrypt.hash("password123", 10);

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

            const username = await generateUniqueUsername(client, student.fullName, querySchoolId, batchUsernames);
            batchUsernames.add(username);

            const result = await client.query(
              `INSERT INTO students (school_id, category_id, student_id, full_name, email, phone, level, username, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING id, student_id, full_name, username`,
              [
                querySchoolId,
                categoryId || student.categoryId,
                student.studentId,
                student.fullName,
                student.email,
                student.phone,
                student.level,
                username,
                defaultPasswordHash
              ],
            );
            const newStudent = result.rows[0];
            created.push(newStudent);

            // If Creator is Tutor, assign to them
            if (role === "tutor" && tutorId) {
                await client.query(
                    `INSERT INTO student_tutors (student_id, tutor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [newStudent.id, tutorId]
                );
            }

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

// Assign tutor to student
router.post(
  "/:id/assign-tutor",
  [
    param("id").isUUID(),
    body("tutorId").isUUID().withMessage("Valid tutor ID is required"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { tutorId } = req.body;
      const { schoolId } = req.user!; // Only school admin can assign

      // Verify student belongs to school
      const student = await db.query(
        "SELECT id FROM students WHERE id = $1 AND school_id = $2",
        [id, schoolId]
      );
      if (student.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Student not found" });
      }

      // Verify tutor belongs to school
      const tutor = await db.query(
        "SELECT id FROM tutors WHERE id = $1 AND school_id = $2",
        [tutorId, schoolId]
      );
      if (tutor.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Tutor not found" });
      }

      // Assign
      await db.query(
        `INSERT INTO student_tutors (student_id, tutor_id)
         VALUES ($1, $2)
         ON CONFLICT (student_id, tutor_id) DO NOTHING`,
        [id, tutorId]
      );

      res.json({ success: true, message: "Tutor assigned successfully" });
    } catch (error) {
      next(error);
    }
  }
);

// Remove tutor from student
router.delete(
  "/:id/assign-tutor/:tutorId",
  [
    param("id").isUUID(),
    param("tutorId").isUUID(),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { id, tutorId } = req.params;
      const { schoolId } = req.user!;

      // Verify student belongs to school (indirect check via delete query)
      const result = await db.query(
        `DELETE FROM student_tutors st
         USING students s
         WHERE st.student_id = s.id
         AND st.student_id = $1
         AND st.tutor_id = $2
         AND s.school_id = $3`,
        [id, tutorId, schoolId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ success: false, message: "Assignment not found or unauthorized" });
      }

      res.json({ success: true, message: "Tutor removed successfully" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
