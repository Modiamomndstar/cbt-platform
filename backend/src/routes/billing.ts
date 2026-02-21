import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';
import { getSchoolBillingStatus } from '../services/planService';

const router = Router();
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// -----------------------------------------------------------
// GET /api/billing/status — current plan, usage, limits
// -----------------------------------------------------------
router.get('/status', authenticate, authorize('school'), async (req, res, next) => {
  try {
    const schoolId = req.user!.id;
    const status = await getSchoolBillingStatus(schoolId);
    res.json({ success: true, data: status });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// POST /api/billing/coupon/validate — check a coupon code
// -----------------------------------------------------------
router.post('/coupon/validate', authenticate, authorize('school'), [
  body('code').trim().notEmpty().withMessage('Coupon code is required'),
  body('planType').notEmpty().withMessage('Plan type is required'),
  validate
], async (req, res, next) => {
  try {
    const { code, planType } = req.body;
    const schoolId = req.user!.id;

    const coupon = await db.query(
      `SELECT * FROM coupons WHERE UPPER(code) = UPPER($1) AND is_active = true
       AND (valid_until IS NULL OR valid_until > NOW())
       AND (max_uses IS NULL OR current_uses < max_uses)`,
      [code]
    );

    if (coupon.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon code' });
    }

    const c = coupon.rows[0];

    // Check plan applicability
    if (c.applicable_plans && !c.applicable_plans.includes(planType)) {
      return res.status(400).json({
        success: false,
        message: `This coupon is only valid for: ${c.applicable_plans.join(', ')}`
      });
    }

    // Check if school already used this coupon
    const alreadyUsed = await db.query(
      'SELECT id FROM coupon_redemptions WHERE coupon_id = $1 AND school_id = $2',
      [c.id, schoolId]
    );
    if (alreadyUsed.rows.length >= c.uses_per_school) {
      return res.status(400).json({ success: false, message: 'You have already used this coupon' });
    }

    res.json({
      success: true,
      data: {
        code: c.code,
        name: c.name,
        description: c.description,
        type: c.type,
        value: c.value,
        applicablePlans: c.applicable_plans,
        requiresAnnual: c.requires_annual,
      }
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// GET /api/billing/payg/balance — PAYG wallet balance
// -----------------------------------------------------------
router.get('/payg/balance', authenticate, authorize('school'), async (req, res, next) => {
  try {
    const schoolId = req.user!.id;
    const result = await db.query(
      'SELECT balance_credits, auto_topup_enabled, auto_topup_threshold, auto_topup_amount FROM payg_wallets WHERE school_id = $1',
      [schoolId]
    );
    res.json({ success: true, data: result.rows[0] ?? { balance_credits: 0 } });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// GET /api/billing/payg/history — PAYG transaction history
// -----------------------------------------------------------
router.get('/payg/history', authenticate, authorize('school'), async (req, res, next) => {
  try {
    const schoolId = req.user!.id;
    const result = await db.query(
      `SELECT type, credits, balance_after, description, feature_key, created_at
       FROM payg_ledger WHERE school_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [schoolId]
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// GET /api/billing/plans — all available plans (public)
// -----------------------------------------------------------
router.get('/plans', async (req, res, next) => {
  try {
    const result = await db.query(
      'SELECT * FROM plan_definitions WHERE is_active = true ORDER BY price_usd ASC'
    );
    res.json({ success: true, data: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
