import { Router } from 'express';
import { body, param } from 'express-validator';
import bcrypt from 'bcryptjs';
import { authenticate, authorize, requireFinanceAccess, requireCoordinatingAdmin } from '../middleware/auth';
import { db } from '../config/database';
import { ApiResponseHandler } from '../utils/apiResponse';
import { transformResult } from '../utils/responseTransformer';
import { validate } from '../middleware/validation';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { logStaffActivity } from '../utils/auditLogger';
import crypto from 'crypto';

const router = Router();

// All staff routes require at least authentication and the super_admin base role (which all staff have)
router.use(authenticate, authorize('super_admin'));

/**
 * GET /api/staff - List staff accounts
 * Accessible by: Super Admin, Coordinating Admin, Finance Admin
 */
router.get('/', async (req: any, res, next) => {
  try {
    const actor = req.user;
    const pagination = getPaginationOptions(req);
    
    let queryStr = `
      SELECT id, name, email, username, role, is_active, created_at, last_login_at, country, referral_code
      FROM staff_accounts
      WHERE 1=1
    `;
    const params: any[] = [];

    // Coordinating Admins only see non-super/non-coordinating staff unless they are primary super admin
    if (actor.staffRole === 'coordinating_admin' && actor.id !== '00000000-0000-0000-0000-000000000000') {
        queryStr += " AND role NOT IN ('super_admin', 'coordinating_admin')";
    }
    // Finance Admins only see sales staff
    else if (actor.staffRole === 'finance' && actor.id !== '00000000-0000-0000-0000-000000000000') {
        queryStr += " AND role = 'sales_admin'";
    }

    queryStr += " ORDER BY created_at DESC LIMIT $1 OFFSET $2";
    params.push(pagination.limit, pagination.offset);

    const result = await db.query(queryStr, params);

    const countResult = await db.query("SELECT COUNT(*) FROM staff_accounts");
    const totalCount = parseInt(countResult.rows[0].count);

    ApiResponseHandler.success(
      res,
      transformResult(result.rows),
      'Staff accounts retrieved',
      formatPaginationResponse(totalCount, pagination)
    );
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/staff - Create a staff account
 * Accessible by: Super Admin, Coordinating Admin
 */
router.post('/', requireCoordinatingAdmin, [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('username').trim().isLength({ min: 4 }).withMessage('Username must be 4+ characters'),
  body('password').isLength({ min: 8 }).withMessage('Password must be 8+ characters'),
  body('role').isIn(['customer_success', 'support_agent', 'finance', 'sales_manager', 'content_reviewer', 'competition_admin', 'coordinating_admin', 'sales_admin'])
    .withMessage('Invalid role'),
  body('country').optional().trim(),
  body('referralCode').optional().trim(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { name, email, username, password, role, country, referralCode } = req.body;
    const actor = req.user;

    // Hierarchy Check
    if (actor.staffRole === 'coordinating_admin' && (role === 'coordinating_admin' || role === 'super_admin')) {
      return ApiResponseHandler.forbidden(res, 'Coordinating Administrators cannot create accounts with equal or higher roles.');
    }

    const exists = await db.query(
      'SELECT id FROM staff_accounts WHERE email = $1 OR username = $2',
      [email, username]
    );
    if (exists.rows.length > 0) {
      return ApiResponseHandler.conflict(res, 'Email or username already taken');
    }

    let finalReferralCode = referralCode;
    if (role === 'sales_admin' && !finalReferralCode) {
      finalReferralCode = 'SALES-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.query(
      `INSERT INTO staff_accounts (name, email, username, password_hash, role, country, referral_code, managed_by_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, name, email, username, role, is_active, country, referral_code, created_at`,
      [name, email, username, passwordHash, role, country || null, finalReferralCode || null, actor.id]
    );

    await logStaffActivity(req, 'staff_created', { 
      targetType: 'staff', 
      targetId: result.rows[0].id, 
      targetName: name,
      details: { role, country, referralCode: finalReferralCode }
    });

    ApiResponseHandler.created(res, transformResult(result.rows[0]), 'Staff account created');
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/staff/:id - Update staff
 * Accessible by: Super Admin, Coordinating Admin, Finance Admin (sales only)
 */
router.patch('/:id', [
  param('id').isUUID(),
  body('role').optional().isIn(['customer_success', 'support_agent', 'finance', 'sales_manager', 'content_reviewer', 'competition_admin', 'coordinating_admin', 'sales_admin']),
  body('isActive').optional().isBoolean(),
  body('country').optional().trim(),
  body('referralCode').optional().trim(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { role, isActive, country, referralCode } = req.body;
    const actor = req.user;

    const staffResult = await db.query('SELECT role, name FROM staff_accounts WHERE id = $1', [id]);
    if (staffResult.rows.length === 0) {
      return ApiResponseHandler.notFound(res, 'Staff account not found');
    }
    const currentStaff = staffResult.rows[0];

    // Finance Admin can ONLY pause/unpause Sales Admins
    if (actor.staffRole === 'finance' && actor.id !== '00000000-0000-0000-0000-000000000000') {
      if (currentStaff.role !== 'sales_admin') {
        return ApiResponseHandler.forbidden(res, 'Finance Administrators can only manage Sales Administrators.');
      }
      if (role !== undefined || country !== undefined || referralCode !== undefined) {
        return ApiResponseHandler.forbidden(res, 'Finance Administrators can only change active status.');
      }
    }

    // Coordinating Admin hierarchy checks
    if (actor.staffRole === 'coordinating_admin') {
      if (currentStaff.role === 'coordinating_admin' || currentStaff.role === 'super_admin') {
        return ApiResponseHandler.forbidden(res, 'Coordinating Administrators cannot modify equal or higher tier accounts.');
      }
      if (role === 'coordinating_admin') {
        return ApiResponseHandler.forbidden(res, 'Only Super Administrators can assign the Coordinating Administrator role.');
      }
    }

    const updates: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (role !== undefined) { updates.push(`role = $${p++}`); values.push(role); }
    if (isActive !== undefined) { updates.push(`is_active = $${p++}`); values.push(isActive); }
    if (country !== undefined) { updates.push(`country = $${p++}`); values.push(country); }
    if (referralCode !== undefined) { updates.push(`referral_code = $${p++}`); values.push(referralCode); }

    if (updates.length === 0) {
      return ApiResponseHandler.badRequest(res, 'Nothing to update');
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await db.query(
      `UPDATE staff_accounts SET ${updates.join(', ')} WHERE id = $${p} RETURNING id, name, role, is_active, country, referral_code`,
      values
    );

    await logStaffActivity(req, 'staff_updated', { 
      targetType: 'staff', 
      targetId: id, 
      targetName: result.rows[0]?.name,
      details: { role, isActive, country, referralCode }
    });
    ApiResponseHandler.success(res, transformResult(result.rows[0]), 'Staff account updated');
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/staff/audit-log - Staff audit trail
 * Accessible by: Super Admin, Coordinating Admin
 */
router.get('/audit-log', requireCoordinatingAdmin, async (req, res, next) => {
  try {
    const pagination = getPaginationOptions(req);
    const result = await db.query(
      `SELECT * FROM staff_audit_log ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [pagination.limit, pagination.offset]
    );

    const countResult = await db.query("SELECT COUNT(*) FROM staff_audit_log");
    const totalCount = parseInt(countResult.rows[0].count);

    ApiResponseHandler.success(
      res,
      transformResult(result.rows),
      'Staff audit log retrieved',
      formatPaginationResponse(totalCount, pagination)
    );
  } catch (error) {
    next(error);
  }
});

export default router;
