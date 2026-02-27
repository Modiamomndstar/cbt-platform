import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';
import { ApiResponseHandler } from '../utils/apiResponse';
import { validate } from '../middleware/validation';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { canAddExternalStudent } from '../services/planService';
import { paygService } from '../services/paygService';
import { sendStudentPortalCredentialsEmail } from '../services/email';

const router = Router();


// All routes require tutor authentication
router.use(authenticate, authorize('tutor'));

// Helper to check if external students are allowed by school
async function checkExternalEnabled(schoolId: string): Promise<boolean> {
  const result = await db.query(
    'SELECT allow_external_students FROM school_settings WHERE school_id = $1',
    [schoolId]
  );
  return result.rows[0]?.allow_external_students ?? false;
}

// -----------------------------------------------------------
// GET /api/tutor/external-students/categories
// -----------------------------------------------------------
router.get('/categories', async (req: any, res: any, next: any) => {
  try {
    const tutorId = req.user.tutorId;
    const result = await db.query(
      `SELECT id, name, description, color, created_at
       FROM student_categories
       WHERE tutor_id = $1 ORDER BY name ASC`,
      [tutorId]
    );
    ApiResponseHandler.success(res, result.rows, 'External student categories retrieved');
  } catch (error) { next(error); }
});

// -----------------------------------------------------------
// POST /api/tutor/external-students/categories
// -----------------------------------------------------------
router.post('/categories', [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('color').optional().trim(),
  body('description').optional().trim(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const tutorId = req.user.tutorId;
    const schoolId = req.user.schoolId;
    const { name, color, description } = req.body;

    const exists = await db.query('SELECT id FROM student_categories WHERE tutor_id = $1 AND name = $2', [tutorId, name]);
    if (exists.rows.length > 0) return ApiResponseHandler.badRequest(res, 'Category already exists');

    const result = await db.query(
      `INSERT INTO student_categories (school_id, tutor_id, name, color, description)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, color, created_at`,
      [schoolId, tutorId, name, color || '#4F46E5', description]
    );
    ApiResponseHandler.created(res, result.rows[0], 'Category created');
  } catch (error) { next(error); }
});

// -----------------------------------------------------------
// PUT /api/tutor/external-students/categories/:id
// -----------------------------------------------------------
router.put('/categories/:id', [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('color').optional().trim(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const tutorId = req.user.tutorId;
    const { id } = req.params;
    const { name, color, description } = req.body;

    const result = await db.query(
      `UPDATE student_categories SET name = $1, color = $2, description = $3, updated_at = NOW()
       WHERE id = $4 AND tutor_id = $5 RETURNING id, name, description, color`,
      [name, color || '#4F46E5', description, id, tutorId]
    );
    if (result.rows.length === 0) return ApiResponseHandler.notFound(res, 'Category not found');
    ApiResponseHandler.success(res, result.rows[0], 'Category updated');
  } catch (error) { next(error); }
});

// -----------------------------------------------------------
// DELETE /api/tutor/external-students/categories/:id
// -----------------------------------------------------------
router.delete('/categories/:id', async (req: any, res: any, next: any) => {
  try {
    const tutorId = req.user.tutorId;
    const { id } = req.params;

    // Set category_id = null for matching students before deleting
    await db.query(`UPDATE external_students SET category_id = NULL WHERE category_id = $1 AND tutor_id = $2`, [id, tutorId]);

    const result = await db.query('DELETE FROM student_categories WHERE id = $1 AND tutor_id = $2 RETURNING id', [id, tutorId]);
    if (result.rows.length === 0) return ApiResponseHandler.notFound(res, 'Category not found');

    ApiResponseHandler.success(res, null, 'Category deleted');
  } catch (error) { next(error); }
});

// -----------------------------------------------------------
// GET /api/tutor/external-students — list tutor's own private students
// -----------------------------------------------------------
router.get('/', async (req: any, res: any, next: any) => {
  try {
    const tutorId = req.user.tutorId;
    const schoolId = req.user.schoolId;
    const { categoryId } = req.query as any;
    const pagination = getPaginationOptions(req);

     let query = `
        SELECT s.id, s.full_name, s.email, s.phone, s.username, s.is_active, s.created_at, s.category_id, s.level_class,
               c.name as category_name, c.color as category_color
        FROM external_students s
        LEFT JOIN student_categories c ON s.category_id = c.id
        WHERE s.tutor_id = $1
     `;
    const params: any[] = [tutorId];

    if (categoryId && categoryId !== "all") {
       if (categoryId === 'uncategorized') {
         query += ` AND s.category_id IS NULL`;
       } else {
         params.push(categoryId);
         query += ` AND s.category_id = $2`;
       }
    }

    query += ` ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pagination.limit, pagination.offset);

    const result = await db.query(query, params);

    // Get total count for pagination
    const countParams = [tutorId];
    let countQuery = `SELECT COUNT(*) FROM external_students WHERE tutor_id = $1`;
    if (categoryId && categoryId !== "all") {
      if (categoryId === 'uncategorized') {
        countQuery += ` AND category_id IS NULL`;
      } else {
        countParams.push(categoryId);
        countQuery += ` AND category_id = $2`;
      }
    }
    const countResult = await db.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    ApiResponseHandler.success(
      res,
      result.rows,
      'External students retrieved',
      formatPaginationResponse(totalCount, pagination)
    );
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// POST /api/tutor/external-students — add a private student
// -----------------------------------------------------------
router.post('/', [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('email').optional({ checkFalsy: true }).isEmail(),
   body('phone').optional().trim(),
  body('categoryId').optional().isUUID(),
  body('levelClass').optional().trim(),
  validate
], async (req: any, res: any, next: any) => {
  try {
     const tutorId = req.user.tutorId || req.user.id;
    const schoolId = req.user.schoolId;
    const { fullName, email, phone, categoryId, levelClass } = req.body;

    const allowed = await checkExternalEnabled(schoolId);
    if (!allowed) {
      return ApiResponseHandler.forbidden(res, 'External students are disabled.');
    }

    const canAdd = await canAddExternalStudent(schoolId, tutorId);
    if (!canAdd.allowed) {
      return ApiResponseHandler.badRequest(res, canAdd.reason || 'Student limit reached', { code: 'PLAN_LIMIT_EXCEEDED' });
    }

    // Generate unique username
    let base = fullName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 8);
    if (!base) base = 'extuser';
    let username = `${base}${Math.floor(Math.random() * 10000)}`;

    const usernameCheck = await db.query('SELECT username FROM external_students WHERE username = $1', [username]);
    if (usernameCheck.rows.length > 0) {
       username = `${base}${Date.now().toString().slice(-4)}`;
    }

    const password = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(password, 10);

    // Parse name parts
    const nameParts = fullName.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '.';

     const result = await db.query(
      `INSERT INTO external_students (tutor_id, school_id, first_name, last_name, full_name, username, password_hash, email, phone, category_id, level_class)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, first_name, last_name, full_name, email, phone, username, is_active, created_at, category_id, level_class`,
      [tutorId, schoolId, firstName, lastName, fullName, username, passwordHash, email, phone, categoryId || null, levelClass || null]
    );

    const student = result.rows[0];

    // ── Handle Optional Welcome Email (PAYG) ──
    if (req.body.sendEmail && email) {
      const allowed = await paygService.shouldSendEmail(schoolId);
      if (allowed) {
        const schoolRes = await db.query("SELECT name FROM schools WHERE id = $1", [schoolId]);
        const schoolName = schoolRes.rows[0]?.name || "CBT Platform";
        
        sendStudentPortalCredentialsEmail(schoolId, email, fullName, schoolName, {
          username: student.username,
          password
        }).catch(err => console.error("Failed to send external student welcome email:", err));
      }
    }

    ApiResponseHandler.created(res, student, 'External student added successfully');
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// PATCH /api/tutor/external-students/:id
// -----------------------------------------------------------
router.patch('/:id', [
  param('id').isUUID(),
  body('fullName').optional().trim().notEmpty(),
  body('email').optional({ checkFalsy: true }).isEmail(),
  body('phone').optional().trim(),
   body('isActive').optional().isBoolean(),
  body('categoryId').optional({ nullable: true }),
  body('levelClass').optional().trim(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const tutorId = req.user.tutorId || req.user.id;

    // Ensure tutor owns this student
    const ownership = await db.query('SELECT id FROM external_students WHERE id = $1 AND tutor_id = $2', [id, tutorId]);
    if (ownership.rows.length === 0) return ApiResponseHandler.notFound(res, 'Student not found');

    const updates: string[] = [];
    const values: any[] = [];
    let p = 1;

     for (const key of ['fullName', 'email', 'phone', 'isActive', 'categoryId', 'levelClass']) {
      if (req.body[key] !== undefined) {
        const val = req.body[key];

        if (key === 'fullName' && typeof val === 'string') {
          const nameParts = val.trim().split(' ');
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ') || '.';

          updates.push(`first_name = $${p++}`);
          values.push(firstName);
          updates.push(`last_name = $${p++}`);
          values.push(lastName);
        }

         // Map camelCase to snake_case
        const dbKey = key === 'fullName' ? 'full_name' : key === 'isActive' ? 'is_active' : key === 'categoryId' ? 'category_id' : key === 'levelClass' ? 'level_class' : key;
        updates.push(`${dbKey} = $${p++}`);
        values.push(val);
      }
    }

    if (req.body.password) {
      const hash = await bcrypt.hash(req.body.password, 10);
      updates.push(`password_hash = $${p++}`);
      values.push(hash);
    }

    if (updates.length === 0) return ApiResponseHandler.badRequest(res, 'Nothing to update');

    values.push(id);
     const result = await db.query(
      `UPDATE external_students SET ${updates.join(', ')} WHERE id = $${p} RETURNING id, full_name, email, phone, username, is_active, level_class, category_id`,
      values
    );

    ApiResponseHandler.success(res, result.rows[0], 'Student updated successfully');
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// DELETE /api/tutor/external-students/:id
// -----------------------------------------------------------
router.delete('/:id', param('id').isUUID(), validate, async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const tutorId = req.user.tutorId;

    const ownership = await db.query('SELECT id FROM external_students WHERE id = $1 AND tutor_id = $2', [id, tutorId]);
    if (ownership.rows.length === 0) return ApiResponseHandler.notFound(res, 'Student not found');

    await db.query('DELETE FROM external_students WHERE id = $1', [id]);
    ApiResponseHandler.success(res, null, 'External student removed permanently');
  } catch (error) {
    next(error);
  }
});

export default router;
