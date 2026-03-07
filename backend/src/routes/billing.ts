import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';
import { getSchoolBillingStatus } from '../services/planService';
import { ApiResponseHandler } from '../utils/apiResponse';
import { validate } from '../middleware/validation';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';

import { paygService } from '../services/paygService';

const router = Router();


// -----------------------------------------------------------
// GET /api/billing/status — current plan, usage, limits
// -----------------------------------------------------------
router.get('/status', authenticate, authorize('school', 'tutor', 'student'), async (req, res, next) => {
  try {
    const schoolId = req.user!.role === 'school' ? req.user!.id : req.user!.schoolId;
    if (!schoolId) {
       return ApiResponseHandler.badRequest(res, 'School ID not found in session');
    }
    const status = await getSchoolBillingStatus(schoolId);
    ApiResponseHandler.success(res, status, 'Billing status retrieved');
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// GET /api/billing/marketplace — pricing for slots/features
// -----------------------------------------------------------
router.get('/marketplace', authenticate, authorize('school'), async (req, res, next) => {
  try {
    const pricing = await paygService.getPricing();
    ApiResponseHandler.success(res, pricing, 'Marketplace pricing retrieved');
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// POST /api/billing/marketplace/purchase — buy slots/features
// -----------------------------------------------------------
router.post('/marketplace/purchase', authenticate, authorize('school'), [
  body('featureKey').notEmpty().withMessage('Feature key is required'),
  body('quantity').optional().isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  validate
], async (req, res, next) => {
  try {
    const schoolId = req.user!.id;
    const { featureKey, quantity = 1 } = req.body;

    // 1. Check if feature exists and its configuration
    const pricing = await paygService.getPricing(featureKey);
    if (pricing.length === 0) {
      return ApiResponseHandler.notFound(res, 'Feature not found in marketplace');
    }
    const p = pricing[0];

    // 2. Consume credits
    const result = await paygService.consumeCredits(schoolId, featureKey, quantity);
    if (!result.success) {
      return ApiResponseHandler.badRequest(res, result.reason || 'Failed to consume credits');
    }

    // 3. Apply capacity changes if it's a persistent slot
    if (p.item_type === 'capacity') {
      if (featureKey === 'extra_tutor_slot') {
        await db.query(
          'UPDATE school_subscriptions SET purchased_tutor_slots = purchased_tutor_slots + $1 WHERE school_id = $2',
          [quantity, schoolId]
        );
      } else if (featureKey === 'extra_student_pack') {
        await db.query(
          'UPDATE school_subscriptions SET purchased_student_slots = purchased_student_slots + ($1 * $2) WHERE school_id = $3',
          [quantity, p.batch_size, schoolId]
        );
      } else if (featureKey === 'ai_credits_10' || featureKey === 'ai_credits_50') {
        // AI packs are consumable but tracked in sub to persist across months until used?
        // User said "if you dont use it you dont get charge" but packs are usually pre-paid credits.
        // We'll add them to a monthly limit that superseeds plan limit.
        await db.query(
          'UPDATE school_subscriptions SET purchased_ai_queries = purchased_ai_queries + ($1 * $2) WHERE school_id = $3',
          [quantity, p.batch_size, schoolId]
        );
      }
    }

    ApiResponseHandler.success(res, {
      creditsDeducted: result.creditsDeducted,
      message: `Purchase successful: ${p.display_name}`
    });
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// POST /api/billing/payg/consume — generic one-time consumption
// -----------------------------------------------------------
router.post('/payg/consume', authenticate, authorize('school'), [
  body('featureKey').notEmpty().withMessage('Feature key is required'),
  body('count').optional().isInt({ min: 1 }),
  validate
], async (req, res, next) => {
  try {
    const schoolId = req.user!.id;
    const { featureKey, count = 1 } = req.body;

    const result = await paygService.consumeCredits(schoolId, featureKey, count);
    if (!result.success) {
      return ApiResponseHandler.badRequest(res, result.reason || 'Failed to consume credits');
    }

    ApiResponseHandler.success(res, { creditsDeducted: result.creditsDeducted }, 'Credits consumed');
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
      return ApiResponseHandler.notFound(res, 'Invalid or expired coupon code');
    }

    const c = coupon.rows[0];

    // Check plan applicability
    if (c.applicable_plans && !c.applicable_plans.includes(planType)) {
      return ApiResponseHandler.badRequest(res, `This coupon is only valid for: ${c.applicable_plans.join(', ')}`);
    }

    // Check if school already used this coupon
    const alreadyUsed = await db.query(
      'SELECT id FROM coupon_redemptions WHERE coupon_id = $1 AND school_id = $2',
      [c.id, schoolId]
    );
    if (alreadyUsed.rows.length >= c.uses_per_school) {
      return ApiResponseHandler.badRequest(res, 'You have already used this coupon');
    }

    ApiResponseHandler.success(res, {
      code: c.code,
      name: c.name,
      description: c.description,
      type: c.type,
      value: c.value,
      applicablePlans: c.applicable_plans,
      requiresAnnual: c.requires_annual,
    }, 'Coupon validated');
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
    ApiResponseHandler.success(res, result.rows[0] ?? { balance_credits: 0 }, 'PAYG balance retrieved');
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
    const pagination = getPaginationOptions(req);

    const result = await db.query(
      `SELECT type, credits, balance_after, description, feature_key, created_at
       FROM payg_ledger WHERE school_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [schoolId, pagination.limit, pagination.offset]
    );

    const countResult = await db.query("SELECT COUNT(*) FROM payg_ledger WHERE school_id = $1", [schoolId]);
    const totalCount = parseInt(countResult.rows[0].count);

    ApiResponseHandler.success(
      res,
      result.rows,
      'PAYG history retrieved',
      formatPaginationResponse(totalCount, pagination)
    );
  } catch (error) {
    next(error);
  }
});

// -----------------------------------------------------------
// GET /api/billing/plans — all available plans (public)
// -----------------------------------------------------------
router.get('/plans', async (req, res, next) => {
  try {
    const plansPromise = db.query(
      'SELECT * FROM plan_definitions WHERE is_active = true ORDER BY price_usd ASC'
    );
    const settingsPromise = db.query(
      "SELECT key, value FROM settings WHERE key IN ('yearly_discount_percentage', 'yearly_discount_active')"
    );

    const [plansResult, settingsResult] = await Promise.all([plansPromise, settingsPromise]);

    const settings: Record<string, any> = {};
    settingsResult.rows.forEach(row => {
      settings[row.key] = row.value;
    });

    ApiResponseHandler.success(res, {
      plans: plansResult.rows,
      yearlyDiscount: {
        percentage: parseInt(settings.yearly_discount_percentage || '0'),
        isActive: settings.yearly_discount_active === 'true'
      }
    }, 'Plans retrieved');
  } catch (error) {
    next(error);
  }
});

export default router;
