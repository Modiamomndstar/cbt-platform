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

// All routes require super_admin
router.use(authenticate, authorize('super_admin'));

// -----------------------------------------------------------
// GET /api/staff — list all staff accounts
// -----------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, username, role, is_active, created_at, last_login_at
       FROM staff_accounts ORDER BY created_at DESC`
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// POST /api/staff — create a staff account
// -----------------------------------------------------------
router.post('/', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('username').trim().isLength({ min: 4 }).withMessage('Username must be 4+ characters'),
  body('password').isLength({ min: 8 }).withMessage('Password must be 8+ characters'),
  body('role').isIn(['customer_success', 'support_agent', 'finance', 'sales_manager', 'content_reviewer'])
    .withMessage('Invalid role'),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { name, email, username, password, role } = req.body;

    const exists = await db.query(
      'SELECT id FROM staff_accounts WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email or username already taken' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO staff_accounts (name, email, username, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, username, role, is_active, created_at`,
      [name, email, username, passwordHash, role]
    );

    // Audit log
    await logAudit(req, 'staff_created', 'staff', result.rows[0].id, name);

    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// PATCH /api/staff/:id — update staff (role, active status)
// -----------------------------------------------------------
router.patch('/:id', [
  param('id').isUUID(),
  body('role').optional().isIn(['customer_success', 'support_agent', 'finance', 'sales_manager', 'content_reviewer']),
  body('isActive').optional().isBoolean(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { role, isActive } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (role !== undefined) { updates.push(`role = $${p++}`); values.push(role); }
    if (isActive !== undefined) { updates.push(`is_active = $${p++}`); values.push(isActive); }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await db.query(
      `UPDATE staff_accounts SET ${updates.join(', ')} WHERE id = $${p} RETURNING id, name, role, is_active`,
      values
    );

    await logAudit(req, 'staff_updated', 'staff', id, result.rows[0]?.name);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// DELETE /api/staff/:id — deactivate (not hard delete)
// -----------------------------------------------------------
router.delete('/:id', param('id').isUUID(), validate, async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `UPDATE staff_accounts SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING name`,
      [id]
    );
    await logAudit(req, 'staff_deactivated', 'staff', id, result.rows[0]?.name);
    res.json({ success: true, message: 'Staff account deactivated' });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// GET /api/staff/audit-log — recent audit log
// -----------------------------------------------------------
router.get('/audit-log', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
    const result = await db.query(
      `SELECT * FROM staff_audit_log ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// Helper: write to audit log
async function logAudit(req: any, action: string, targetType: string, targetId?: string, targetName?: string) {
  try {
    await db.query(
      `INSERT INTO staff_audit_log (actor_type, actor_id, actor_name, action, target_type, target_id, target_name, ip_address)
       VALUES ('super_admin', $1, $2, $3, $4, $5, $6, $7)`,
      [req.user?.id, req.user?.username, action, targetType, targetId, targetName, req.ip]
    );
  } catch (_) { /* non-critical */ }
}

export default router;
