import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';
import { ApiResponseHandler } from '../utils/apiResponse';
import { validate } from '../middleware/validation';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { logActivity, logUserActivity } from '../utils/auditLogger';

const router = Router();


// All routes require super_admin
router.use(authenticate, authorize('super_admin'));

// -----------------------------------------------------------
// GET /api/staff — list all staff accounts
// -----------------------------------------------------------
router.get('/', async (req, res, next) => {
  try {
    const pagination = getPaginationOptions(req);
    const result = await db.query(
      `SELECT id, name, email, username, role, is_active, created_at, last_login_at
       FROM staff_accounts ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [pagination.limit, pagination.offset]
    );

    const countResult = await db.query("SELECT COUNT(*) FROM staff_accounts");
    const totalCount = parseInt(countResult.rows[0].count);

    ApiResponseHandler.success(
      res,
      result.rows,
      'Staff accounts retrieved',
      formatPaginationResponse(totalCount, pagination)
    );
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
  body('role').isIn(['customer_success', 'support_agent', 'finance', 'sales_manager', 'content_reviewer', 'competition_admin'])
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
      return ApiResponseHandler.conflict(res, 'Email or username already taken');
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

    ApiResponseHandler.created(res, result.rows[0], 'Staff account created');
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// PATCH /api/staff/:id — update staff (role, active status)
// -----------------------------------------------------------
router.patch('/:id', [
  param('id').isUUID(),
  body('role').optional().isIn(['customer_success', 'support_agent', 'finance', 'sales_manager', 'content_reviewer', 'competition_admin']),
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
      return ApiResponseHandler.badRequest(res, 'Nothing to update');
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await db.query(
      `UPDATE staff_accounts SET ${updates.join(', ')} WHERE id = $${p} RETURNING id, name, role, is_active`,
      values
    );

    await logAudit(req, 'staff_updated', 'staff', id, result.rows[0]?.name);
    ApiResponseHandler.success(res, result.rows[0], 'Staff account updated');
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
    ApiResponseHandler.success(res, null, 'Staff account deactivated');
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// GET /api/staff/audit-log — recent audit log
// -----------------------------------------------------------
router.get('/audit-log', async (req, res, next) => {
  try {
    const pagination = getPaginationOptions(req);
    const result = await db.query(
      `SELECT id, created_at, action, user_type, ip_address,
              COALESCE(actor_name, 'System') as actor_name,
              COALESCE(target_type, resource_type, 'unknown') as target_type,
              COALESCE(target_name, 'unknown') as target_name
       FROM activity_logs
       WHERE user_type IN ('super_admin', 'staff')
       ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [pagination.limit, pagination.offset]
    );

    const countResult = await db.query("SELECT COUNT(*) FROM activity_logs WHERE user_type IN ('super_admin', 'staff')");
    const totalCount = parseInt(countResult.rows[0].count);

    ApiResponseHandler.success(
      res,
      result.rows,
      'Audit log retrieved',
      formatPaginationResponse(totalCount, pagination)
    );
  } catch (error) {
    next(error);
  }
});

// Helper: write to audit log
async function logAudit(req: any, action: string, targetType: string, targetId?: string, targetName?: string) {
  return logUserActivity(req, action, {
    targetType,
    targetId,
    targetName
  });
}

export default router;
