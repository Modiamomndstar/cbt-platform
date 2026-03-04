import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate, authorize, requireFinanceAccess } from '../middleware/auth';
import { db } from '../config/database';
import { logger } from '../utils/logger';
import { ApiResponseHandler } from '../utils/apiResponse';
import { sendWelcomeEmail, sendTrialStartEmail } from '../services/email';
import { financeService } from '../services/financeService';
import { paygService } from '../services/paygService';

const router = Router();
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return ApiResponseHandler.badRequest(res, 'Validation failed', { errors: errors.array() });
  next();
};

router.use(authenticate, authorize('super_admin'));

// GET /api/super-admin/schools
router.get('/schools', async (req, res, next) => {
  try {
    const result = await db.query(`
      SELECT s.id, s.name, s.email, s.country, s.created_at, s.is_active, s.plan_type, s.plan_status,
             sub.override_plan, sub.override_expires_at
      FROM schools s
      LEFT JOIN school_subscriptions sub ON s.id = sub.school_id
      ORDER BY s.name ASC
    `);
    ApiResponseHandler.success(res, result.rows, 'Schools retrieved');
  } catch (error) { next(error); }
});

// GET /api/super-admin/schools/:id/details
router.get('/schools/:id/details', [
  param('id').isUUID(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;

    const schoolResult = await db.query(`
      SELECT s.*, sub.plan_type, sub.status as sub_status, sub.billing_cycle,
             sub.override_plan, sub.override_expires_at, sub.override_features,
             w.balance_credits as payg_balance
      FROM schools s
      LEFT JOIN school_subscriptions sub ON s.id = sub.school_id
      LEFT JOIN payg_wallets w ON s.id = w.school_id
      WHERE s.id = $1
    `, [id]);

    if (!schoolResult.rows[0]) return ApiResponseHandler.notFound(res, 'School not found');

    const tutorCount = await db.query('SELECT COUNT(*) FROM tutors WHERE school_id = $1', [id]);
    const studentCount = await db.query('SELECT COUNT(*) FROM students WHERE school_id = $1', [id]);
    const externalStudentCount = await db.query('SELECT COUNT(*) FROM external_students WHERE school_id = $1', [id]);

    const tutorsWithExternal = await db.query(`
      SELECT t.id, t.username, t.first_name, t.last_name,
             (SELECT COUNT(*) FROM external_students WHERE tutor_id = t.id) as external_count
      FROM tutors t
      WHERE t.school_id = $1
      ORDER BY external_count DESC
    `, [id]);

    // Unified Audit Logs (Last 50)
    const auditLogs = await db.query(`
      (SELECT id, action, details, created_at, 'school' as log_type, user_type as actor_type, user_id as actor_id, '' as actor_name
       FROM activity_logs
       WHERE school_id = $1)
      UNION ALL
      (SELECT id, action, details, created_at, 'staff' as log_type, actor_type, actor_id, actor_name
       FROM staff_audit_log
       WHERE target_type = 'school' AND target_id = $1)
      ORDER BY created_at DESC
      LIMIT 50
    `, [id]);

    ApiResponseHandler.success(res, {
      school: schoolResult.rows[0],
      stats: {
        tutors: parseInt(tutorCount.rows[0].count),
        internal_students: parseInt(studentCount.rows[0].count),
        external_students: parseInt(externalStudentCount.rows[0].count)
      },
      tutorBreakdown: tutorsWithExternal.rows,
      logs: auditLogs.rows
    });
  } catch (error) { next(error); }
});

// PATCH /api/super-admin/schools/:id/subscription
router.patch('/schools/:id/subscription', [
  param('id').isUUID(),
  body('plan_type').optional().isIn(['freemium', 'basic', 'advanced', 'enterprise']),
  body('billing_cycle').optional().isIn(['monthly', 'annual', 'payg', 'free']),
  body('status').optional().isIn(['trialing', 'active', 'past_due', 'cancelled', 'expired', 'gifted', 'suspended']),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { plan_type, billing_cycle, status } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (plan_type) { updates.push(`plan_type = $${p++}`); values.push(plan_type); }
    if (billing_cycle) { updates.push(`billing_cycle = $${p++}`); values.push(billing_cycle); }
    if (status) { updates.push(`status = $${p++}`); values.push(status); }

    if (updates.length > 0) {
      values.push(id);
      await db.query(`
        UPDATE school_subscriptions
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE school_id = $${p}
      `, values);
    }

    const school = await db.query('SELECT name FROM schools WHERE id = $1', [id]);
    await logAudit(req, 'subscription_updated', 'school', id, school.rows[0]?.name, req.body);

    ApiResponseHandler.success(res, null, 'Subscription updated successfully');
  } catch (error) { next(error); }
});

// POST /api/super-admin/schools/:id/feature-overrides
router.post('/schools/:id/feature-overrides', [
  param('id').isUUID(),
  body('overrides').isObject(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { overrides } = req.body;

    await db.query(`
      UPDATE school_subscriptions
      SET override_features = $1, updated_at = NOW()
      WHERE school_id = $2
    `, [JSON.stringify(overrides), id]);

    const school = await db.query('SELECT name FROM schools WHERE id = $1', [id]);
    await logAudit(req, 'feature_overrides_updated', 'school', id, school.rows[0]?.name, overrides);

    ApiResponseHandler.success(res, null, 'Feature overrides updated');
  } catch (error) { next(error); }
});

// Helper: write to audit log
async function logAudit(req: any, action: string, targetType: string, targetId?: string, targetName?: string, details?: any) {
  try {
    await db.query(
      `INSERT INTO staff_audit_log (actor_type, actor_id, actor_name, action, target_type, target_id, target_name, details, ip_address)
       VALUES ('super_admin', $1, $2, $3, $4, $5, $6, $7, $8)`,
      [req.user?.id, req.user?.username, action, targetType, targetId, targetName, details ? JSON.stringify(details) : null, req.ip]
    );
  } catch (_) { /* non-critical */ }
}

// ================================================================
//  PLAN DEFINITIONS (pricing control)
// ================================================================

// GET /api/super-admin/plans
router.get('/plans', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM plan_definitions ORDER BY price_usd ASC');
    ApiResponseHandler.success(res, result.rows, 'Plan definitions retrieved');
  } catch (error) { next(error); }
});

// PUT /api/super-admin/plans/:planType
router.put('/plans/:planType', [
  param('planType').notEmpty(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { planType } = req.params;
    const allowed = [
      'price_usd', 'price_ngn', 'max_tutors', 'max_internal_students', 'max_external_per_tutor',
      'max_active_exams', 'ai_queries_per_month', 'allow_student_portal', 'allow_external_students',
      'allow_bulk_import', 'allow_email_notifications', 'allow_sms_notifications',
      'allow_advanced_analytics', 'allow_custom_branding', 'allow_api_access',
      'allow_result_pdf', 'allow_result_export', 'extra_internal_student_price_usd',
      'extra_external_student_price_usd', 'is_active'
    ];
    const updates: string[] = [];
    const values: any[] = [];
    let p = 1;

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = $${p++}`);
        values.push(req.body[key]);
      }
    }

    if (updates.length === 0) return ApiResponseHandler.badRequest(res, 'No valid fields provided');

    updates.push('updated_at = NOW()');
    values.push(planType);

    const result = await db.query(
      `UPDATE plan_definitions SET ${updates.join(', ')} WHERE plan_type = $${p} RETURNING *`,
      values
    );

    await logAudit(req, 'plan_updated', 'plan_definition', undefined, planType, req.body);
    ApiResponseHandler.success(res, result.rows[0], 'Plan updated');
  } catch (error) { next(error); }
});

// ================================================================
//  FEATURE FLAGS
// ================================================================

// GET /api/super-admin/feature-flags
router.get('/feature-flags', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM feature_flags ORDER BY feature_name ASC');
    ApiResponseHandler.success(res, result.rows, 'Feature flags retrieved');
  } catch (error) { next(error); }
});

// PUT /api/super-admin/feature-flags/:featureKey
router.put('/feature-flags/:featureKey', [
  param('featureKey').notEmpty(),
  body('minPlan').optional().isIn(['freemium', 'basic', 'advanced', 'enterprise']),
  body('isEnabled').optional().isBoolean(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { featureKey } = req.params;
    const { minPlan, isEnabled } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (minPlan !== undefined) { updates.push(`min_plan = $${p++}`); values.push(minPlan); }
    if (isEnabled !== undefined) { updates.push(`is_enabled = $${p++}`); values.push(isEnabled); }
    if (updates.length === 0) return ApiResponseHandler.badRequest(res, 'Nothing to update');

    updates.push('updated_at = NOW()');
    values.push(featureKey);

    const result = await db.query(
      `UPDATE feature_flags SET ${updates.join(', ')} WHERE feature_key = $${p} RETURNING *`,
      values
    );

    await logAudit(req, 'feature_flag_updated', 'feature_flag', undefined, featureKey, req.body);
    ApiResponseHandler.success(res, result.rows[0], 'Feature flag updated');
  } catch (error) { next(error); }
});

// ================================================================
//  SCHOOL OVERRIDE — gift, revoke, suspend, add credits
// ================================================================

// POST /api/super-admin/schools/:id/gift-plan
router.post('/schools/:id/gift-plan', [
  param('id').isUUID(),
  body('planType').isIn(['basic', 'advanced', 'enterprise']).withMessage('Invalid plan type'),
  body('days').isInt({ min: 1, max: 3650 }).withMessage('Days must be 1–3650'),
  body('reason').optional().trim(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { planType, days, reason } = req.body;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    await db.query(
      `INSERT INTO school_subscriptions (school_id, plan_type, status, override_plan, override_expires_at, override_reason, override_by_staff_id)
       VALUES ($1, 'freemium', 'active', $2, $3, $4, $5)
       ON CONFLICT (school_id) DO UPDATE
       SET override_plan = $2, override_expires_at = $3, override_reason = $4, override_by_staff_id = $5, updated_at = NOW()`,
      [id, planType, expiresAt, reason || `Gifted ${planType} for ${days} days`, req.user.id]
    );

    // Get school name for audit
    const school = await db.query('SELECT name, email FROM schools WHERE id = $1', [id]);
    await logAudit(req, 'plan_gifted', 'school', id, school.rows[0]?.name, { planType, days, expiresAt });

    ApiResponseHandler.success(res, { expiresAt }, `${planType} plan gifted for ${days} days`);
  } catch (error) { next(error); }
});

// POST /api/super-admin/schools/:id/revoke-plan
router.post('/schools/:id/revoke-plan', [
  param('id').isUUID(),
  body('reason').optional().trim(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await db.query(
      `UPDATE school_subscriptions
       SET plan_type = 'freemium', status = 'active', billing_cycle = 'free',
           override_plan = NULL, override_expires_at = NULL,
           override_reason = $2, override_by_staff_id = $3, updated_at = NOW()
       WHERE school_id = $1`,
      [id, reason || 'Plan revoked by admin', req.user.id]
    );

    const school = await db.query('SELECT name FROM schools WHERE id = $1', [id]);
    await logAudit(req, 'plan_revoked', 'school', id, school.rows[0]?.name, { reason });

    ApiResponseHandler.success(res, null, 'Plan revoked — school downgraded to Freemium');
  } catch (error) { next(error); }
});

// POST /api/super-admin/schools/:id/suspend
router.post('/schools/:id/suspend', [
  param('id').isUUID(),
  body('suspended').isBoolean(),
  body('reason').optional().trim(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { suspended, reason } = req.body;

    await db.transaction(async (client) => {
        // 1. Update subscription status
        // If unsuspending, we try to see if they were trialing or just set to active
        // A better way would be to check the trial_end date
        const subCheck = await client.query('SELECT trial_end FROM school_subscriptions WHERE school_id = $1', [id]);
        let newSubStatus = suspended ? 'suspended' : 'active';

        if (!suspended && subCheck.rows.length > 0) {
            const trialEnd = subCheck.rows[0].trial_end;
            if (trialEnd && new Date(trialEnd) > new Date()) {
                newSubStatus = 'trialing';
            }
        }

        const updateSubRes = await client.query(
            `UPDATE school_subscriptions SET status = $1, updated_at = NOW() WHERE school_id = $2`,
            [newSubStatus, id]
        );

        // 2. Update master active switch
        const updateSchoolRes = await client.query(
            `UPDATE schools SET is_active = $1, updated_at = NOW() WHERE id = $2`,
            [!suspended, id]
        );

        logger.info(`Suspension update for ${id}: suspended=${suspended}, sub_rows=${updateSubRes.rowCount}, school_rows=${updateSchoolRes.rowCount}`);
    });

    const school = await db.query('SELECT name FROM schools WHERE id = $1', [id]);
    await logAudit(req, suspended ? 'school_suspended' : 'school_unsuspended', 'school', id, school.rows[0]?.name, { reason });

    ApiResponseHandler.success(res, null, `School ${suspended ? 'suspended' : 'activated'}`);
  } catch (error) { next(error); }
});

// POST /api/super-admin/schools/:id/add-credits
router.post('/schools/:id/add-credits', [
  param('id').isUUID(),
  body('credits').isInt({ min: 1 }).withMessage('Credits must be a positive number'),
  body('reason').trim().notEmpty().withMessage('Reason required'),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { credits, reason } = req.body;

    // Upsert wallet and add credits
    await db.query(
      `INSERT INTO payg_wallets (school_id, balance_credits)
       VALUES ($1, $2)
       ON CONFLICT (school_id) DO UPDATE
       SET balance_credits = payg_wallets.balance_credits + $2, updated_at = NOW()`,
      [id, credits]
    );

    const wallet = await db.query('SELECT balance_credits FROM payg_wallets WHERE school_id = $1', [id]);
    const newBalance = wallet.rows[0].balance_credits;

    await db.query(
      `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description, created_by_staff_id)
       VALUES ($1, 'gift', $2, $3, $4, $5)`,
      [id, credits, newBalance, reason, req.user.id]
    );

    const school = await db.query('SELECT name FROM schools WHERE id = $1', [id]);
    await logAudit(req, 'credits_added', 'school', id, school.rows[0]?.name, { credits, reason, newBalance });

    ApiResponseHandler.success(res, { newBalance }, `${credits} credits added`);
  } catch (error) { next(error); }
});

// POST /api/super-admin/schools/:id/deduct-credits
router.post('/schools/:id/deduct-credits', [
  param('id').isUUID(),
  body('credits').isInt({ min: 1 }).withMessage('Credits must be a positive number'),
  body('reason').trim().notEmpty().withMessage('Reason required'),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { credits, reason } = req.body;

    const wallet = await db.query('SELECT balance_credits FROM payg_wallets WHERE school_id = $1', [id]);
    if (!wallet.rows[0] || wallet.rows[0].balance_credits < credits) {
      return ApiResponseHandler.badRequest(res, 'Insufficient credit balance');
    }

    const newBalance = wallet.rows[0].balance_credits - credits;

    await db.query(
      `UPDATE payg_wallets SET balance_credits = $1, updated_at = NOW() WHERE school_id = $2`,
      [newBalance, id]
    );

    await db.query(
      `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description, created_by_staff_id)
       VALUES ($1, 'deduction', $2, $3, $4, $5)`,
      [id, -credits, newBalance, reason, req.user.id]
    );

    const school = await db.query('SELECT name FROM schools WHERE id = $1', [id]);
    await logAudit(req, 'credits_deducted', 'school', id, school.rows[0]?.name, { credits, reason, newBalance });

    ApiResponseHandler.success(res, { newBalance }, `${credits} credits deducted`);
  } catch (error) { next(error); }
});

// POST /api/super-admin/schools/:id/extend-trial
router.post('/schools/:id/extend-trial', [
  param('id').isUUID(),
  body('days').isInt({ min: 1, max: 365 }),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { days } = req.body;

    const result = await db.query(
      `UPDATE school_subscriptions
       SET trial_end = COALESCE(trial_end, NOW()) + INTERVAL '1 day' * $1,
           status = 'trialing', updated_at = NOW()
       WHERE school_id = $2
       RETURNING trial_end`,
      [days, id]
    );

    ApiResponseHandler.success(res, { newTrialEnd: result.rows[0]?.trial_end }, `Trial extended by ${days} days`);
  } catch (error) { next(error); }
});

// ================================================================
//  COUPONS
// ================================================================

// GET /api/super-admin/coupons
router.get('/coupons', async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT c.*, (SELECT COUNT(*) FROM coupon_redemptions WHERE coupon_id = c.id) as redemption_count
       FROM coupons c ORDER BY c.created_at DESC`
    );
    ApiResponseHandler.success(res, result.rows, 'Coupons retrieved');
  } catch (error) { next(error); }
});

// POST /api/super-admin/coupons
router.post('/coupons', [
  body('code').trim().toUpperCase().isLength({ min: 3, max: 30 }).withMessage('Code must be 3–30 chars'),
  body('name').trim().notEmpty(),
  body('type').isIn(['percent_off', 'amount_off', 'free_months', 'bonus_credits']),
  body('value').isFloat({ min: 0.01 }),
  body('applicablePlans').optional().isArray(),
  body('maxUses').optional().isInt({ min: 1 }),
  body('usesPerSchool').optional().isInt({ min: 1 }),
  body('validUntil').optional().isISO8601(),
  body('requiresAnnual').optional().isBoolean(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { code, name, description, type, value, applicablePlans, maxUses, usesPerSchool, validUntil, requiresAnnual } = req.body;

    // Check code unique
    const exists = await db.query('SELECT id FROM coupons WHERE UPPER(code) = UPPER($1)', [code]);
    if (exists.rows.length > 0) return ApiResponseHandler.conflict(res, 'Coupon code already exists');

    const result = await db.query(
      `INSERT INTO coupons (code, name, description, type, value, applicable_plans, max_uses, uses_per_school, valid_until, requires_annual, created_by_staff_id)
       VALUES (UPPER($1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [code, name, description, type, value, applicablePlans || ['basic', 'advanced', 'enterprise'], maxUses, usesPerSchool || 1, validUntil, requiresAnnual || false, req.user.id]
    );

    await logAudit(req, 'coupon_created', 'coupon', result.rows[0].id, code);
    ApiResponseHandler.created(res, result.rows[0], 'Coupon created');
  } catch (error) { next(error); }
});

// PATCH /api/super-admin/coupons/:id
router.patch('/coupons/:id', [
  param('id').isUUID(),
  body('isActive').optional().isBoolean(),
  body('validUntil').optional().isISO8601(),
  body('maxUses').optional().isInt({ min: 1 }),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { id } = req.params;
    const { isActive, validUntil, maxUses } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (isActive !== undefined) { updates.push(`is_active = $${p++}`); values.push(isActive); }
    if (validUntil !== undefined) { updates.push(`valid_until = $${p++}`); values.push(validUntil); }
    if (maxUses !== undefined) { updates.push(`max_uses = $${p++}`); values.push(maxUses); }

    if (updates.length === 0) return ApiResponseHandler.badRequest(res, 'Nothing to update');
    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await db.query(
      `UPDATE coupons SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      values
    );

    await logAudit(req, 'coupon_updated', 'coupon', id, result.rows[0]?.code, req.body);
    ApiResponseHandler.success(res, result.rows[0], 'Coupon updated');
  } catch (error) { next(error); }
});

// ================================================================
//  OVERVIEW STATS
// ================================================================

// GET /api/super-admin/overview
router.get('/overview', async (req, res, next) => {
  try {
    const stats = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM schools) as total_schools,
        (SELECT COUNT(*) FROM schools WHERE is_active = true) as active_schools,
        (SELECT COUNT(*) FROM school_subscriptions WHERE status = 'trialing') as trialing,
        (SELECT COUNT(*) FROM school_subscriptions WHERE plan_type = 'basic' AND status = 'active') as basic_subscribers,
        (SELECT COUNT(*) FROM school_subscriptions WHERE plan_type = 'advanced' AND status = 'active') as advanced_subscribers,
        (SELECT COUNT(*) FROM school_subscriptions WHERE plan_type = 'enterprise' AND status = 'active') as enterprise_subscribers,
        (SELECT COUNT(*) FROM school_subscriptions WHERE status = 'suspended') as suspended,
        (SELECT COUNT(*) FROM staff_accounts WHERE is_active = true) as active_staff,
        (SELECT COUNT(*) FROM coupons WHERE is_active = true) as active_coupons,
        (SELECT COALESCE(SUM(credits), 0) FROM payg_ledger WHERE type = 'topup') as total_payg_credits_sold
    `);

    ApiResponseHandler.success(res, stats.rows[0], 'Super admin overview retrieved');
  } catch (error) { next(error); }
});

// GET /api/super-admin/export/:type
router.get('/export/:type', [
  param('type').isIn(['tutors', 'students', 'external_students'])
], async (req: any, res: any, next: any) => {
  try {
    const { type } = req.params;
    const { school_id } = req.query;

    let query = '';
    let params: any[] = [];

    if (type === 'tutors') {
      query = `SELECT t.first_name, t.last_name, t.email, t.username, s.name as school_name, t.created_at
               FROM tutors t JOIN schools s ON t.school_id = s.id`;
    } else if (type === 'students') {
      query = `SELECT s.first_name, s.last_name, s.email, s.username, sch.name as school_name, s.reg_number, s.level_class, s.created_at
               FROM students s JOIN schools sch ON s.school_id = sch.id`;
    } else if (type === 'external_students') {
      query = `SELECT e.first_name, e.last_name, e.email, e.username, sch.name as school_name, t.username as tutor_username, e.level_class, e.created_at
               FROM external_students e
               JOIN schools sch ON e.school_id = sch.id
               JOIN tutors t ON e.tutor_id = t.id`;
    }

    if (school_id) {
      query += ` WHERE ${type === 'tutors' ? 't' : type === 'students' ? 's' : 'e'}.school_id = $1`;
      params.push(school_id);
    }

    const result = await db.query(query, params);
    const rows = result.rows;

    if (rows.length === 0) return ApiResponseHandler.badRequest(res, 'No data to export');

    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(','),
      ...rows.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=export_${type}_${new Date().toISOString().split('T')[0]}.csv`);
    res.status(200).send(csv);

    await logAudit(req, 'platform_export', 'data', undefined, type, { school_id });
  } catch (error) { next(error); }
});

// ================================================================
//  MARKETPLACE & PAYG PRICING
// ================================================================

// GET /api/super-admin/marketplace
router.get('/marketplace', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM payg_feature_pricing ORDER BY item_type DESC, display_name ASC');
    ApiResponseHandler.success(res, result.rows, 'Marketplace items retrieved');
  } catch (error) { next(error); }
});

// PUT /api/super-admin/marketplace/:featureKey
router.put('/marketplace/:featureKey', [
  requireFinanceAccess,
  param('featureKey').notEmpty(),
  body('credit_cost').optional().isInt({ min: 0 }),
  body('is_active').optional().isBoolean(),
  body('display_name').optional().trim().notEmpty(),
  body('category').optional().trim().notEmpty(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { featureKey } = req.params;
    const { credit_cost, is_active, display_name, category } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let p = 1;

    if (credit_cost !== undefined) { updates.push(`credit_cost = $${p++}`); values.push(credit_cost); }
    if (is_active !== undefined) { updates.push(`is_active = $${p++}`); values.push(is_active); }
    if (display_name !== undefined) { updates.push(`display_name = $${p++}`); values.push(display_name); }
    if (category !== undefined) { updates.push(`category = $${p++}`); values.push(category); }

    if (updates.length === 0) return ApiResponseHandler.badRequest(res, 'Nothing to update');

    updates.push('updated_at = NOW()');
    values.push(featureKey);

    const result = await db.query(
      `UPDATE payg_feature_pricing SET ${updates.join(', ')} WHERE feature_key = $${p} RETURNING *`,
      values
    );

    await logAudit(req, 'marketplace_updated', 'marketplace_item', undefined, featureKey, req.body);
    ApiResponseHandler.success(res, result.rows[0], 'Marketplace item updated');
  } catch (error) { next(error); }
});

// POST /api/super-admin/marketplace/gift
router.post('/marketplace/gift', [
  requireFinanceAccess,
  body('schoolId').isUUID(),
  body('featureKey').notEmpty(),
  body('quantity').optional().isInt({ min: 1 }),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { schoolId, featureKey, quantity = 1 } = req.body;
    const success = await paygService.giftItem(schoolId, featureKey, quantity, req.user.id);

    if (!success) return ApiResponseHandler.serverError(res, 'Failed to gift item');

    const school = await db.query('SELECT name FROM schools WHERE id = $1', [schoolId]);
    await logAudit(req, 'marketplace_item_gifted', 'school', schoolId, school.rows[0]?.name, { featureKey, quantity });

    ApiResponseHandler.success(res, null, 'Marketplace item gifted successfully');
  } catch (error) { next(error); }
});

// GET /api/super-admin/finance/overview
router.get('/finance/overview', requireFinanceAccess, async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const overview = await financeService.getGlobalOverview();
    const history = await financeService.getRevenueHistory(period as any);
    const bySchool = await financeService.getRevenueBySchool(5);

    ApiResponseHandler.success(res, {
      ...overview,
      revenueHistory: history,
      revenueBySchool: bySchool
    }, 'Financial overview retrieved');
  } catch (error) { next(error); }
});

// GET /api/super-admin/finance/revenue
router.get('/finance/revenue', requireFinanceAccess, async (req, res, next) => {
  try {
    const { period = 'month' } = req.query;
    const history = await financeService.getRevenueHistory(period as any);
    ApiResponseHandler.success(res, history, 'Revenue history retrieved');
  } catch (error) { next(error); }
});

// GET /api/super-admin/finance/logs
router.get('/finance/logs', requireFinanceAccess, async (req, res, next) => {
  try {
    const { schoolId, currency, startDate, endDate, limit, offset } = req.query;
    const logs = await financeService.getAuditLogs({
      schoolId: schoolId as string,
      currency: currency as string,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });
    ApiResponseHandler.success(res, logs, 'Financial audit logs retrieved');
  } catch (error) { next(error); }
});

// ================================================================
//  GLOBAL SETTINGS
// ================================================================

// GET /api/super-admin/settings
router.get('/settings', async (req, res, next) => {
  try {
    const { category } = req.query;
    let query = 'SELECT * FROM settings';
    let params: any[] = [];

    if (category) {
      query += ' WHERE category = $1';
      params.push(category);
    }

    query += ' ORDER BY key ASC';
    const result = await db.query(query, params);
    ApiResponseHandler.success(res, result.rows, 'Settings retrieved');
  } catch (error) { next(error); }
});

// PUT /api/super-admin/settings/:key
router.put('/settings/:key', [
  param('key').notEmpty(),
  body('value').notEmpty(),
  validate
], async (req: any, res: any, next: any) => {
  try {
    const { key } = req.params;
    const { value } = req.body;

    const result = await db.query(
      `UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2 RETURNING *`,
      [value, key]
    );

    if (result.rows.length === 0) return ApiResponseHandler.notFound(res, 'Setting not found');

    await logAudit(req, 'setting_updated', 'system_setting', undefined, key, { value });
    ApiResponseHandler.success(res, result.rows[0], 'Setting updated');
  } catch (error) { next(error); }
});

export default router;
