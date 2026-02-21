import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';
import { sendWelcomeEmail, sendTrialStartEmail } from '../services/email';

const router = Router();
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

router.use(authenticate, authorize('super_admin'));

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
    res.json({ success: true, data: result.rows });
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

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No valid fields provided' });

    updates.push('updated_at = NOW()');
    values.push(planType);

    const result = await db.query(
      `UPDATE plan_definitions SET ${updates.join(', ')} WHERE plan_type = $${p} RETURNING *`,
      values
    );

    await logAudit(req, 'plan_updated', 'plan_definition', undefined, planType, req.body);
    res.json({ success: true, data: result.rows[0] });
  } catch (error) { next(error); }
});

// ================================================================
//  FEATURE FLAGS
// ================================================================

// GET /api/super-admin/feature-flags
router.get('/feature-flags', async (req, res, next) => {
  try {
    const result = await db.query('SELECT * FROM feature_flags ORDER BY feature_name ASC');
    res.json({ success: true, data: result.rows });
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
    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });

    updates.push('updated_at = NOW()');
    values.push(featureKey);

    const result = await db.query(
      `UPDATE feature_flags SET ${updates.join(', ')} WHERE feature_key = $${p} RETURNING *`,
      values
    );

    await logAudit(req, 'feature_flag_updated', 'feature_flag', undefined, featureKey, req.body);
    res.json({ success: true, data: result.rows[0] });
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

    res.json({ success: true, message: `${planType} plan gifted for ${days} days`, expiresAt });
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

    res.json({ success: true, message: 'Plan revoked — school downgraded to Freemium' });
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

    await db.query(
      `UPDATE school_subscriptions SET status = $1, updated_at = NOW() WHERE school_id = $2`,
      [suspended ? 'suspended' : 'active', id]
    );

    await db.query(
      `UPDATE schools SET is_active = $1 WHERE id = $2`,
      [!suspended, id]
    );

    const school = await db.query('SELECT name FROM schools WHERE id = $1', [id]);
    await logAudit(req, suspended ? 'school_suspended' : 'school_unsuspended', 'school', id, school.rows[0]?.name, { reason });

    res.json({ success: true, message: `School ${suspended ? 'suspended' : 'unsuspended'}` });
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

    res.json({ success: true, message: `${credits} credits added`, newBalance });
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

    res.json({ success: true, message: `Trial extended by ${days} days`, newTrialEnd: result.rows[0]?.trial_end });
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
    res.json({ success: true, data: result.rows });
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
    if (exists.rows.length > 0) return res.status(409).json({ success: false, message: 'Coupon code already exists' });

    const result = await db.query(
      `INSERT INTO coupons (code, name, description, type, value, applicable_plans, max_uses, uses_per_school, valid_until, requires_annual, created_by_staff_id)
       VALUES (UPPER($1), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [code, name, description, type, value, applicablePlans || ['basic', 'advanced', 'enterprise'], maxUses, usesPerSchool || 1, validUntil, requiresAnnual || false, req.user.id]
    );

    await logAudit(req, 'coupon_created', 'coupon', result.rows[0].id, code);
    res.status(201).json({ success: true, data: result.rows[0] });
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

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'Nothing to update' });
    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await db.query(
      `UPDATE coupons SET ${updates.join(', ')} WHERE id = $${p} RETURNING *`,
      values
    );

    await logAudit(req, 'coupon_updated', 'coupon', id, result.rows[0]?.code, req.body);
    res.json({ success: true, data: result.rows[0] });
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

    res.json({ success: true, data: stats.rows[0] });
  } catch (error) { next(error); }
});

export default router;
