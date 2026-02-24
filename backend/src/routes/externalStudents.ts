import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';

const router = Router();
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

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
// GET /api/tutor/external-students — list tutor's own private students
// -----------------------------------------------------------
router.get('/', async (req: any, res: any, next: any) => {
  try {
    const tutorId = req.user.tutorId;
    const schoolId = req.user.schoolId;

    const allowed = await checkExternalEnabled(schoolId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'External students are disabled by your school admin.' });
    }

    const result = await db.query(
      `SELECT id, full_name, email, phone, username, is_active, created_at
       FROM external_students
       WHERE tutor_id = $1
       ORDER BY created_at DESC`,
      [tutorId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// POST /api/tutor/external-students — add a private student
// -----------------------------------------------------------
router.post('/', [
  body('fullName').trim().notEmpty().withMessage('Full name is required'),
  body('username').trim().isLength({ min: 4 }).withMessage('Username must be 4+ chars'),
  body('password').isLength({ min: 6 }).withMessage('Password must be 6+ chars'),
  body('email').optional({ checkFalsy: true }).isEmail(),
  body('phone').optional().trim(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const tutorId = req.user.tutorId;
    const schoolId = req.user.schoolId;
    const { fullName, username, password, email, phone } = req.body;

    const allowed = await checkExternalEnabled(schoolId);
    if (!allowed) {
      return res.status(403).json({ success: false, message: 'External students are disabled.' });
    }

    // Check plan limits for external students
    const limitQuery = await db.query(
      `SELECT p.max_external_per_tutor, ss.extra_external_students
       FROM school_subscriptions ss
       JOIN plan_definitions p ON ss.plan_type = p.plan_type
       WHERE ss.school_id = $1 AND ss.status IN ('active', 'trialing')`,
      [schoolId]
    );

    const limits = limitQuery.rows[0];
    if (limits && limits.max_external_per_tutor !== null) {
      const currentQuery = await db.query('SELECT COUNT(*) FROM external_students WHERE tutor_id = $1', [tutorId]);
      const currentCount = parseInt(currentQuery.rows[0].count);
      const totalAllowed = limits.max_external_per_tutor + (limits.extra_external_students || 0);

      if (currentCount >= totalAllowed) {
        return res.status(402).json({
          success: false,
          code: 'PLAN_LIMIT_EXCEEDED',
          message: `You have reached your limit of ${totalAllowed} private students. Contact your school admin to upgrade.`
        });
      }
    }

    // Check unique username global across external students to avoid login collision
    const exists = await db.query('SELECT id FROM external_students WHERE username = $1', [username]);
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Username is already taken by another external student.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db.query(
      `INSERT INTO external_students (tutor_id, school_id, full_name, username, password_hash, email, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, full_name, email, phone, username, is_active, created_at`,
      [tutorId, schoolId, fullName, username, passwordHash, email, phone]
    );

    res.status(201).json({ success: true, data: result.rows[0] });
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
  body('password').optional().isLength({ min: 6 }),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const tutorId = req.user.tutorId;

    // Ensure tutor owns this student
    const ownership = await db.query('SELECT id FROM external_students WHERE id = $1 AND tutor_id = $2', [id, tutorId]);
    if (ownership.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

    const updates: string[] = [];
    const values: any[] = [];
    let p = 1;

    for (const key of ['fullName', 'email', 'phone', 'isActive']) {
      if (req.body[key] !== undefined) {
        // Map camelCase to snake_case
        const dbKey = key === 'fullName' ? 'full_name' : key === 'isActive' ? 'is_active' : key;
        updates.push(`${dbKey} = $${p++}`);
        values.push(req.body[key]);
      }
    }

    if (req.body.password) {
      const hash = await bcrypt.hash(req.body.password, 10);
      updates.push(`password_hash = $${p++}`);
      values.push(hash);
    }

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });

    values.push(id);
    const result = await db.query(
      `UPDATE external_students SET ${updates.join(', ')} WHERE id = $${p} RETURNING id, full_name, email, phone, username, is_active`,
      values
    );

    res.json({ success: true, data: result.rows[0] });
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
    if (ownership.rows.length === 0) return res.status(404).json({ success: false, message: 'Student not found' });

    await db.query('DELETE FROM external_students WHERE id = $1', [id]);
    res.json({ success: true, message: 'External student removed permanently' });
  } catch (error) {
    next(error);
  }
});

export default router;
