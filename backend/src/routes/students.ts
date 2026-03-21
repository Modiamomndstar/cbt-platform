import { Router } from "express";
import { body, param, query, validationResult } from "express-validator";
import { db } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";
import { requireStudentSlot } from "../middleware/planGuard";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { sendStudentPortalCredentialsEmail } from "../services/email";
import { ApiResponseHandler } from "../utils/apiResponse";
import { validate } from "../middleware/validation";
import { getPaginationOptions, formatPaginationResponse } from "../utils/pagination";
import { logUserActivity } from "../utils/auditLogger";
import { generateUniqueUsername, splitFullName, generateStudentID } from "../utils/userUtils";
import { transformResult } from "../utils/responseTransformer";

const router = Router();




router.use(authenticate);

// Get all students
router.get("/", async (req, res, next) => {
  try {
    const { role, schoolId, tutorId } = req.user!;
    const { categoryId, search } = req.query;
    const pagination = getPaginationOptions(req);

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
                      sc.id as category_id, sc.name as category_name, sc.color as category_color,
                      (SELECT COALESCE(json_agg(json_build_object('id', t.id, 'name', t.full_name, 'subjects', t.subjects)), '[]'::json)
                       FROM student_tutors st
                       JOIN tutors t ON st.tutor_id = t.id
                       WHERE st.student_id = s.id) as assigned_tutors
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
    sql += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(pagination.limit, pagination.offset);

    const result = await db.query(sql, params);

    // Get total count
    const countResult = await db.query(
      "SELECT COUNT(*) FROM students WHERE school_id = $1 AND is_active = true",
      [querySchoolId],
    );

    ApiResponseHandler.success(
      res,
      transformResult(result),
      "Students retrieved",
      formatPaginationResponse(parseInt(countResult.rows[0].count), pagination)
    );
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

    ApiResponseHandler.success(res, transformResult(result), "Students retrieved");
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
      return ApiResponseHandler.notFound(res, "Student not found");
    }

    // Get exam history
    const examsResult = await db.query(
      `SELECT se.id, se.score, se.total_marks, se.percentage, se.status, se.started_at, se.completed_at,
              e.title as exam_title, ec.name as exam_category
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       LEFT JOIN exam_categories ec ON e.category_id = ec.id
       WHERE se.student_id = $1
       ORDER BY se.created_at DESC`,
      [id],
    );

    ApiResponseHandler.success(res, {
      ...transformResult(result.rows[0]),
      examHistory: transformResult(examsResult),
    });
  } catch (error) {
    next(error);
  }
});

// Create student
router.post(
  "/",
  [
    body("studentId").optional({ checkFalsy: true }).trim(),
    body("fullName").trim().notEmpty(),
    body("email").optional({ checkFalsy: true }).isEmail(),
    body("phone").optional(),
    body("categoryId").optional({ checkFalsy: true }).isUUID(),
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
        sendEmail: shouldSendEmail,
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

      // Use studentId if provided, otherwise generate one
      let finalStudentId = studentId;
      if (!finalStudentId) {
        finalStudentId = await generateStudentID(db, querySchoolId);
      } else {
        // Check student ID uniqueness if provided
        const check = await db.query(
          "SELECT id FROM students WHERE school_id = $1 AND student_id = $2",
          [querySchoolId, finalStudentId],
        );
        if (check.rows.length > 0) {
          return ApiResponseHandler.conflict(res, "Student ID already exists");
        }
      }

      // Generate unique username
      const username = await generateUniqueUsername(db, fullName, 'students');

      // Parse name parts
      const nameParts = fullName.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '.';

      const plainTextPassword = crypto.randomBytes(4).toString("hex"); // 8 chars
      const passwordHash = await bcrypt.hash(plainTextPassword, 10);

      const result = await db.query(
        `INSERT INTO students (school_id, category_id, student_id, first_name, last_name, full_name, email, phone, date_of_birth, gender, address, parent_name, parent_phone, parent_email, username, password_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
        [
          querySchoolId,
          categoryId || null,
          finalStudentId,
          firstName,
          lastName,
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
          passwordHash
        ],
      );

      const studentData = result.rows[0];
      studentData.plainTextPassword = plainTextPassword; // Attach for frontend display

      if (email && shouldSendEmail !== false) { // Default to true if not specified, or we can default to false. Let's strictly check if shouldSendEmail is true, but since UI might not send it yet, let's treat truthy as true. Actually, explicitly check `shouldSendEmail`.
        // Find school name for the email
        const schoolRes = await db.query("SELECT name FROM schools WHERE id = $1", [querySchoolId]);
        const schoolName = schoolRes.rows[0]?.name || "CBT Platform";
        sendStudentPortalCredentialsEmail(querySchoolId, email, fullName, schoolName, {
          username,
          password: plainTextPassword
        }).catch(err => console.error("Failed to send student creation email:", err));
      }

      // Log student creation
      await logUserActivity(req, 'student_creation', {
        targetType: 'student',
        targetId: studentData.id,
        targetName: fullName,
        details: { email, student_id: finalStudentId }
      });

      ApiResponseHandler.created(res, studentData, "Student created");
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
    body("sendEmail").optional().isBoolean(),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { students, categoryId, sendEmail: shouldSendEmail } = req.body;
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

      // Fetch school name once for all emails
      const schoolRes = await db.query("SELECT name FROM schools WHERE id = $1", [querySchoolId]);
      const schoolName = schoolRes.rows[0]?.name || "CBT Platform";

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

            // Parse name parts
            const nameParts = student.fullName.trim().split(' ');
            const firstName = nameParts[0];
            const lastName = nameParts.slice(1).join(' ') || '.';

            const plainTextPassword = crypto.randomBytes(4).toString("hex");
            const passwordHash = await bcrypt.hash(plainTextPassword, 10);

            const result = await client.query(
              `INSERT INTO students (school_id, category_id, student_id, first_name, last_name, full_name, email, phone, level, username, password_hash)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, student_id, first_name, last_name, full_name, username, email`,
              [
                querySchoolId,
                (categoryId && categoryId !== "") ? categoryId : (student.categoryId && student.categoryId !== "") ? student.categoryId : null,
                student.studentId,
                firstName,
                lastName,
                student.fullName,
                student.email,
                student.phone,
                student.level,
                username,
                passwordHash
              ],
            );
            const newStudent = result.rows[0];
            newStudent.plainTextPassword = plainTextPassword; // Pass to frontend logic
            created.push(newStudent);

            // If Creator is Tutor, assign to them
            if (role === "tutor" && tutorId) {
                await client.query(
                    `INSERT INTO student_tutors (student_id, tutor_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [newStudent.id, tutorId]
                );
            }

            // Send email if applicable
            if (student.email && shouldSendEmail !== false) {
              sendStudentPortalCredentialsEmail(querySchoolId, student.email, student.fullName, schoolName, {
                username,
                password: plainTextPassword
              }).catch(err => console.error("Failed to send bulk student creation email:", err));
            }

          } catch (err) {
            errors.push({
              studentId: student.studentId,
              error: "Failed to create",
            });
          }
        }
      });

      // Log bulk creation
      if (created.length > 0) {
        await logUserActivity(req, "student_bulk_creation", {
          details: { count: created.length, error_count: errors.length },
        });
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
        let val = value;
        if (key === "categoryId" && val === "") val = null;
        if (typeof val === "string" && val.trim() === "") val = null; // General cleanup for empty strings

        if (key === "fullName" && val && typeof val === "string") {
          const nameParts = val.trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || '.';

          setClauses.push(`first_name = $${paramIndex++}`);
          values.push(firstName);
          setClauses.push(`last_name = $${paramIndex++}`);
          values.push(lastName);
        }

        setClauses.push(
          `${key === "categoryId" ? "category_id" : key.replace(/[A-Z]/g, (l) => `_${l.toLowerCase()}`)} = $${paramIndex++}`,
        );
        values.push(val);
      }
    }

    if (setClauses.length === 0) {
      return ApiResponseHandler.badRequest(res, "No fields to update");
    }

    values.push(id, querySchoolId);

    const result = await db.query(
      `UPDATE students SET ${setClauses.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex++} AND school_id = $${paramIndex} RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      return ApiResponseHandler.notFound(res, "Student not found");
    }

    const updatedStudent = result.rows[0];

    // Log student update
    await logUserActivity(req, 'student_update', {
      targetType: 'student',
      targetId: id,
      targetName: updatedStudent.full_name,
      details: { updates: Object.keys(updates) }
    });

    ApiResponseHandler.success(res, updatedStudent, "Student updated");
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

    const result = await db.query(
      "UPDATE students SET is_active = false, updated_at = NOW() WHERE id = $1 AND school_id = $2 RETURNING full_name",
      [id, querySchoolId],
    );

    if (result.rows.length > 0) {
      // Log student deletion
      await logUserActivity(req, 'student_deletion', {
        targetType: 'student',
        targetId: id,
        targetName: result.rows[0].full_name
      });
    }

    ApiResponseHandler.success(res, null, "Student deleted");
  } catch (error) {
    next(error);
  }
});

// Reset student password
router.put(
  "/:id/reset-password",
  [param("id").isUUID(), validate],
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const { sendEmail: shouldSendEmail } = req.body;
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

      // Check student exists
      const studentResult = await db.query(
        "SELECT id, full_name, email, username FROM students WHERE id = $1 AND school_id = $2",
        [id, querySchoolId],
      );

      if (studentResult.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Student not found");
      }

      const student = studentResult.rows[0];
      const plainTextPassword = crypto.randomBytes(4).toString("hex");
      const passwordHash = await bcrypt.hash(plainTextPassword, 10);

      await db.query(`UPDATE students SET password_hash = $1, updated_at = NOW() WHERE id = $2`, [
        passwordHash,
        id,
      ]);

      if (student.email && shouldSendEmail) {
        const schoolRes = await db.query("SELECT name FROM schools WHERE id = $1", [querySchoolId]);
        const schoolName = schoolRes.rows[0]?.name || "CBT Platform";
        sendStudentPortalCredentialsEmail(querySchoolId, student.email, student.full_name, schoolName, {
          username: student.username,
          password: plainTextPassword
        }).catch(err => console.error("Failed to send student password reset email:", err));
      }

      // Log password reset
      await logUserActivity(req, 'student_password_reset', {
        targetType: 'student',
        targetId: id,
        targetName: student.full_name,
        details: { email_sent: !!(student.email && shouldSendEmail) }
      });

      ApiResponseHandler.success(res, student, "Password reset successfully", { newPassword: plainTextPassword });
    } catch (error) {
      next(error);
    }
  }
);

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
        return ApiResponseHandler.notFound(res, "Student not found");
      }

      // Verify tutor belongs to school
      const tutor = await db.query(
        "SELECT id FROM tutors WHERE id = $1 AND school_id = $2",
        [tutorId, schoolId]
      );
      if (tutor.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Tutor not found");
      }

      // Assign
      await db.query(
        `INSERT INTO student_tutors (student_id, tutor_id)
         VALUES ($1, $2)
         ON CONFLICT (student_id, tutor_id) DO NOTHING`,
        [id, tutorId]
      );

      // Log tutor assignment
      await logUserActivity(req, 'student_tutor_assigned', {
        targetType: 'student',
        targetId: id,
        details: { tutor_id: tutorId }
      });

      ApiResponseHandler.success(res, null, "Tutor assigned successfully");
    } catch (error) {
      next(error);
    }
  }
);

// Bulk assign tutor to students
router.post(
  "/bulk-assign-tutor",
  [
    body("tutorId").isUUID().withMessage("Valid tutor ID is required"),
    body("studentIds").isArray({ min: 1 }).withMessage("At least one student ID is required"),
    body("studentIds.*").isUUID().withMessage("Invalid student ID format"),
    validate,
  ],
  async (req: any, res: any, next: any) => {
    try {
      const { tutorId, studentIds } = req.body;
      const { schoolId } = req.user!;

      const tutor = await db.query(
        "SELECT id FROM tutors WHERE id = $1 AND school_id = $2",
        [tutorId, schoolId]
      );
      if (tutor.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Tutor not found");
      }

      const validStudentsQuery = await db.query(
        "SELECT id FROM students WHERE id = ANY($1) AND school_id = $2",
        [studentIds, schoolId]
      );
      const validStudentIds = validStudentsQuery.rows.map(r => r.id);

      if (validStudentIds.length === 0) {
        return ApiResponseHandler.badRequest(res, "No valid students found for this school");
      }

      const values = validStudentIds.map((_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`).join(', ');
      const queryParams = validStudentIds.flatMap(id => [id, tutorId]);

      await db.query(
        `INSERT INTO student_tutors (student_id, tutor_id)
         VALUES ${values}
         ON CONFLICT (student_id, tutor_id) DO NOTHING`,
        queryParams
      );

      // Log bulk assignment
      await logUserActivity(req, 'student_tutor_bulk_assigned', {
        targetType: 'tutor',
        targetId: tutorId,
        details: { count: validStudentIds.length }
      });

      ApiResponseHandler.success(res, null, `Tutor assigned to ${validStudentIds.length} students`);
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
        return ApiResponseHandler.notFound(res, "Assignment not found or unauthorized");
      }

      // Log tutor removal
      await logUserActivity(req, 'student_tutor_removed', {
        targetType: 'student',
        targetId: id,
        details: { tutor_id: tutorId }
      });

      ApiResponseHandler.success(res, null, "Tutor removed successfully");
    } catch (error) {
      next(error);
    }
  }
);

export default router;
