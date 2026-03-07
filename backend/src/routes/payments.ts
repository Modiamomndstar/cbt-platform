import { Router, Request, Response } from "express";
import { db } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";
import { ApiResponseHandler } from "../utils/apiResponse";
import Stripe from "stripe";
import axios from "axios";
import { getPaginationOptions, formatPaginationResponse } from "../utils/pagination";


const router = Router();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia" as any,
    })
  : null;

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Get payment plans
router.get("/plans", async (req: Request, res: Response) => {
  try {
    const result = await db.query(
      `SELECT plan_type as id, display_name as name, price_usd as price, 'USD' as currency, is_active
       FROM plan_definitions
       WHERE is_active = true
       ORDER BY price_usd ASC`,
    );

    ApiResponseHandler.success(res, result.rows, "Payment plans retrieved");
  } catch (error) {
    console.error("Get plans error:", error);
    ApiResponseHandler.serverError(res, "Failed to fetch plans");
  }
});

// Create Stripe payment intent
router.post(
  "/stripe/create-intent",
  authenticate,
  authorize("school"),
  async (req: Request, res: Response) => {
    try {
      if (!stripe) {
        return ApiResponseHandler.serverError(res, "Stripe not configured");
      }

      const { planType, billingCycle = 'monthly' } = req.body;
      const user = req.user!;

      // Get plan details
      const planResult = await db.query(
        "SELECT * FROM plan_definitions WHERE plan_type = $1",
        [planType],
      );

      if (planResult.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Plan not found");
      }

      const plan = planResult.rows[0];
      let amount = parseFloat(plan.price_usd);

      // Apply yearly discount if applicable
      if (billingCycle === 'yearly') {
        const settingsRes = await db.query(
          "SELECT key, value FROM settings WHERE key IN ('yearly_discount_percentage', 'yearly_discount_active')"
        );
        const settings: Record<string, string> = {};
        settingsRes.rows.forEach(r => settings[r.key] = r.value);

        const discountActive = settings.yearly_discount_active === 'true';
        const discountPercent = parseInt(settings.yearly_discount_percentage || '0');

        amount = amount * 12; // Annual base
        if (discountActive) {
          amount = amount * (1 - discountPercent / 100);
        }
      }

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          schoolId: String(user.schoolId || user.id),
          planType: plan.plan_type,
          planName: plan.display_name,
          billingCycle: billingCycle,
        },
      });

      ApiResponseHandler.success(res, {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
      }, "Payment intent created");
    } catch (error) {
      console.error("Stripe create intent error:", error);
      ApiResponseHandler.serverError(res, "Failed to create payment intent");
    }
  },
);

// Stripe webhook handler
router.post("/stripe/webhook", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];

  if (!stripe || !sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return ApiResponseHandler.badRequest(res, "Webhook not configured");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET,
    );
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { schoolId, planType } = paymentIntent.metadata;

      // Get plan details
      const planResult = await db.query(
        "SELECT * FROM plan_definitions WHERE plan_type = $1",
        [planType],
      );

      if (planResult.rows.length > 0) {
        const plan = planResult.rows[0];
        const billingCycle = paymentIntent.metadata.billingCycle || 'monthly';
        const durationMonths = billingCycle === 'yearly' ? 12 : 1;

        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + durationMonths);

        // Create payment record
        await db.query(
          `INSERT INTO payments (school_id, amount, currency, provider, provider_payment_id, status, plan_type, plan_duration_months, paid_at)
           VALUES ($1, $2, $3, 'stripe', $4, 'completed', $5, $6, NOW())`,
          [
            schoolId,
            paymentIntent.amount / 100,
            'USD',
            paymentIntent.id,
            planType,
            durationMonths
          ],
        );

        // Update school subscription (upsert)
        await db.query(
          `INSERT INTO school_subscriptions (school_id, plan_type, status, billing_cycle, current_period_start, current_period_end)
           VALUES ($1, $2, 'active', $3, $4, $5)
           ON CONFLICT (school_id) DO UPDATE
           SET plan_type = $2, status = 'active', billing_cycle = $3,
               current_period_start = $4, current_period_end = $5, updated_at = NOW()`,
          [schoolId, planType, billingCycle, startDate, endDate],
        );

        // --- REFERRAL REWARD LOGIC ---
        // Check if this school was referred and hasn't received a reward yet
        const schoolRes = await db.query(
          "SELECT referred_by_id FROM schools WHERE id = $1 AND referral_reward_granted = false",
          [schoolId]
        );

        if (schoolRes.rows.length > 0 && schoolRes.rows[0].referred_by_id) {
          const referrerId = schoolRes.rows[0].referred_by_id;

          // Get reward amount from settings
          const rewardRes = await db.query("SELECT value FROM settings WHERE key = 'referral_reward_credits'");
          const rewardAmount = parseInt(rewardRes.rows[0]?.value || '100');

          if (rewardAmount > 0) {
            // 1. Award credits to referrer
            await db.query(
              "UPDATE payg_wallets SET balance_credits = balance_credits + $1 WHERE school_id = $2",
              [rewardAmount, referrerId]
            );

            // 2. Log transaction
            await db.query(
              `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description)
               VALUES ($1, 'referral_reward', $2, (SELECT balance_credits FROM payg_wallets WHERE school_id = $1), $3)`,
              [referrerId, rewardAmount, `Reward for referring a school that upgraded to ${planType}`]
            );

            // 3. Mark referral as rewarded
            await db.query("UPDATE schools SET referral_reward_granted = true WHERE id = $1", [schoolId]);
          }
        }
      }
    }

    ApiResponseHandler.success(res, { received: true }, "Webhook received");
  } catch (error) {
    console.error("Stripe webhook error:", error);
    ApiResponseHandler.serverError(res, "Failed to process webhook");
  }
});

// Initialize Paystack transaction
router.post(
  "/paystack/initialize",
  authenticate,
  authorize("school"),
  async (req: Request, res: Response) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        return ApiResponseHandler.serverError(res, "Paystack not configured");
      }

      const { planType, billingCycle = 'monthly' } = req.body;
      const user = req.user!;

      // Get plan details
      const planResult = await db.query(
        "SELECT * FROM plan_definitions WHERE plan_type = $1",
        [planType],
      );

      if (planResult.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Plan not found");
      }

      const plan = planResult.rows[0];
      let amount = parseFloat(plan.price_ngn || plan.price_usd); // Use NGN if available

      // Apply yearly discount if applicable
      if (billingCycle === 'yearly') {
        const settingsRes = await db.query(
          "SELECT key, value FROM settings WHERE key IN ('yearly_discount_percentage', 'yearly_discount_active')"
        );
        const settings: Record<string, string> = {};
        settingsRes.rows.forEach(r => settings[r.key] = r.value);

        const discountActive = settings.yearly_discount_active === 'true';
        const discountPercent = parseInt(settings.yearly_discount_percentage || '0');

        amount = amount * 12; // Annual base
        if (discountActive) {
          amount = amount * (1 - discountPercent / 100);
        }
      }

      // Get school details
      const schoolResult = await db.query(
        "SELECT email FROM schools WHERE id = $1",
        [user.schoolId || user.id],
      );
      const school = schoolResult.rows[0];

      // Initialize Paystack transaction
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transaction/initialize`,
        {
          email: school.email,
          amount: Math.round(amount * 100), // Paystack amount is in kobo (base unit)
          currency: "NGN",
          metadata: {
            schoolId: String(user.schoolId || user.id),
            planType: planType,
            planName: plan.display_name,
            billingCycle: billingCycle,
          },
          callback_url: `${process.env.FRONTEND_URL}/payment/verify`,
        },
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.data.status) {
        ApiResponseHandler.success(res, {
          authorizationUrl: response.data.data.authorization_url,
          reference: response.data.data.reference,
        }, "Payment initialized");
      } else {
        ApiResponseHandler.serverError(res, "Failed to initialize payment");
      }
    } catch (error: any) {
      console.error(
        "Paystack initialize error:",
        error.response?.data || error.message,
      );
      ApiResponseHandler.serverError(res, "Failed to initialize payment");
    }
  },
);

// Verify Paystack payment
router.post(
  "/paystack/verify",
  authenticate,
  authorize("school"),
  async (req: Request, res: Response) => {
    try {
      if (!PAYSTACK_SECRET_KEY) {
        return ApiResponseHandler.serverError(res, "Paystack not configured");
      }

      const { reference } = req.body;
      const user = req.user!;

      // Verify transaction with Paystack
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      if (response.data.status && response.data.data.status === "success") {
        const { metadata, amount, currency } = response.data.data;
        const { planType } = metadata;

        // Get plan details
        const planResult = await db.query(
          "SELECT * FROM plan_definitions WHERE plan_type = $1",
          [planType],
        );

        if (planResult.rows.length > 0) {
          const plan = planResult.rows[0];
          const billingCycle = metadata.billingCycle || 'monthly';
          const durationMonths = billingCycle === 'yearly' ? 12 : 1;

          // Calculate subscription dates
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + durationMonths);

          // Create payment record
          await db.query(
            `INSERT INTO payments (school_id, amount, currency, provider, provider_payment_id, status, plan_type, plan_duration_months, paid_at)
             VALUES ($1, $2, $3, 'paystack', $4, 'completed', $5, $6, NOW())`,
            [
              user.schoolId,
              amount / 100,
              currency,
              reference,
              planType,
              durationMonths
            ],
          );

          // Update school subscription (upsert)
          await db.query(
            `INSERT INTO school_subscriptions (school_id, plan_type, status, billing_cycle, current_period_start, current_period_end)
             VALUES ($1, $2, 'active', $3, $4, $5)
             ON CONFLICT (school_id) DO UPDATE
             SET plan_type = $2, status = 'active', billing_cycle = $3,
                 current_period_start = $4, current_period_end = $5, updated_at = NOW()`,
            [user.schoolId, planType, billingCycle, startDate, endDate],
          );

          // --- REFERRAL REWARD LOGIC ---
          const schoolRefRes = await db.query(
            "SELECT referred_by_id FROM schools WHERE id = $1 AND referral_reward_granted = false",
            [user.schoolId]
          );

          if (schoolRefRes.rows.length > 0 && schoolRefRes.rows[0].referred_by_id) {
            const referrerId = schoolRefRes.rows[0].referred_by_id;
            const rewardRes = await db.query("SELECT value FROM settings WHERE key = 'referral_reward_credits'");
            const rewardAmount = parseInt(rewardRes.rows[0]?.value || '100');

            if (rewardAmount > 0) {
              await db.query("UPDATE payg_wallets SET balance_credits = balance_credits + $1 WHERE school_id = $2", [rewardAmount, referrerId]);
              await db.query(
                `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description)
                 VALUES ($1, 'referral_reward', $2, (SELECT balance_credits FROM payg_wallets WHERE school_id = $1), $3)`,
                [referrerId, rewardAmount, `Reward for referring a school that upgraded via Paystack`]
              );
              await db.query("UPDATE schools SET referral_reward_granted = true WHERE id = $1", [user.schoolId]);
            }
          }

          ApiResponseHandler.success(res, {
            status: "completed",
            subscriptionStart: startDate,
            subscriptionEnd: endDate,
          }, "Payment verified successfully");
        } else {
          ApiResponseHandler.notFound(res, "Plan not found");
        }
      } else {
          ApiResponseHandler.badRequest(res, "Payment verification failed");
      }
    } catch (error: any) {
      console.error(
        "Paystack verify error:",
        error.response?.data || error.message,
      );
      ApiResponseHandler.serverError(res, "Failed to verify payment");
    }
  },
);

// Get payment history
router.get(
  "/history",
  authenticate,
  authorize("school"),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const pagination = getPaginationOptions(req, 10);

      const result = await db.query(
        `SELECT p.*, pd.display_name as plan_name
       FROM payments p
       LEFT JOIN plan_definitions pd ON p.plan_type = pd.plan_type
       WHERE p.school_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
        [user.schoolId || user.id, pagination.limit, pagination.offset],
      );

      const countResult = await db.query(
        `SELECT COUNT(*) FROM payments WHERE school_id = $1`,
        [user.schoolId || user.id],
      );

      const totalCount = parseInt(countResult.rows[0].count);

      ApiResponseHandler.success(
        res,
        result.rows.map((row) => ({
          id: row.id,
          planName: row.plan_name || row.plan_type,
          amount: row.amount,
          currency: row.currency,
          provider: row.provider,
          transactionId: row.provider_payment_id || row.provider_reference,
          status: row.status,
          paidAt: row.paid_at,
          createdAt: row.created_at,
        })),
        "Payment history retrieved",
        formatPaginationResponse(totalCount, pagination)
      );
    } catch (error) {
      console.error("Get payment history error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch payment history");
    }
  },
);

// Get subscription status
router.get(
  "/subscription",
  authenticate,
  authorize("school"),
  async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      const result = await db.query(
        `SELECT ss.*, pd.display_name, pd.max_tutors, pd.max_internal_students as max_students
       FROM school_subscriptions ss
       JOIN plan_definitions pd ON ss.plan_type = pd.plan_type
       WHERE ss.school_id = $1`,
        [user.schoolId || user.id],
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Subscription not found");
      }

      const sub = result.rows[0];

      // Count current tutors and students
      const tutorCount = await db.query(
        "SELECT COUNT(*) FROM tutors WHERE school_id = $1 AND is_active = true",
        [user.schoolId || user.id],
      );

      const studentCount = await db.query(
        "SELECT COUNT(*) FROM students WHERE school_id = $1 AND is_active = true",
        [user.schoolId || user.id],
      );

      ApiResponseHandler.success(res, {
        status: sub.status,
        plan: sub.display_name,
        startDate: sub.current_period_start,
        endDate: sub.current_period_end,
        maxTutors: (sub.max_tutors ?? 0) + (sub.purchased_tutor_slots ?? 0),
        maxStudents: (sub.max_students ?? 0) + (sub.purchased_student_slots ?? 0),
        currentTutors: parseInt(tutorCount.rows[0].count),
        currentStudents: parseInt(studentCount.rows[0].count),
        isExpired:
          sub.current_period_end &&
          new Date(sub.current_period_end) < new Date(),
      }, "Subscription status retrieved");
    } catch (error) {
      console.error("Get subscription error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch subscription status");
    }
  },
);

export default router;
