import { Router, Request, Response } from "express";
import { db } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";
import { ApiResponseHandler } from "../utils/apiResponse";
import { transformResult } from "../utils/responseTransformer";
import Stripe from "stripe";
import axios from "axios";
import crypto from "crypto";
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

    ApiResponseHandler.success(res, transformResult(result.rows), "Payment plans retrieved");
  } catch (error) {
    console.error("Get plans error:", error);
    ApiResponseHandler.serverError(res, "Failed to fetch plans");
  }
});

// Unified Payment Config for Frontend
router.get("/config", async (req: Request, res: Response) => {
  try {
    const settingsRes = await db.query(
      "SELECT key, value FROM settings WHERE key IN ('crypto_usdt_trc20_address', 'crypto_usdt_network', 'credit_price_usd', 'credit_price_ngn')"
    );
    const settings: Record<string, string> = {};
    settingsRes.rows.forEach(r => settings[r.key] = r.value);

    ApiResponseHandler.success(res, transformResult({
      crypto: {
        address: settings.crypto_usdt_trc20_address,
        network: settings.crypto_usdt_network || 'TRC20'
      },
      credits: {
        priceUsd: parseFloat(settings.credit_price_usd || '0.1'),
        priceNgn: parseFloat(settings.credit_price_ngn || '100')
      }
    }), "Payment configuration retrieved");
  } catch (error) {
    console.error("Get payment config error:", error);
    ApiResponseHandler.serverError(res, "Failed to fetch config");
  }
});

// Unified Checkout Initialization
router.post(
  "/checkout/initialize",
  authenticate,
  authorize("school"),
  async (req: Request, res: Response) => {
    try {
      const {
        type, // 'upgrade' | 'credits'
        planType,
        creditAmount,
        provider, // 'stripe' | 'paystack' | 'crypto'
        billingCycle = 'monthly'
      } = req.body;
      const user = req.user!;

      let amount = 0;
      let currency = provider === 'paystack' ? 'NGN' : 'USD';
      let description = '';
      let metadata: any = {
        schoolId: String(user.schoolId || user.id),
        type,
        billingCycle
      };

      // 1. Calculate Amount
      if (type === 'upgrade') {
        const planResult = await db.query("SELECT * FROM plan_definitions WHERE plan_type = $1", [planType]);
        if (planResult.rows.length === 0) return ApiResponseHandler.notFound(res, "Plan not found");
        const plan = planResult.rows[0];
        amount = provider === 'paystack' ? parseFloat(plan.price_ngn || plan.price_usd) : parseFloat(plan.price_usd);

        if (billingCycle === 'yearly') {
          const settingsRes = await db.query("SELECT key, value FROM settings WHERE key IN ('yearly_discount_percentage', 'yearly_discount_active')");
          const settings: Record<string, string> = {};
          settingsRes.rows.forEach(r => settings[r.key] = r.value);
          amount = amount * 12;
          if (settings.yearly_discount_active === 'true') {
            amount = amount * (1 - parseInt(settings.yearly_discount_percentage || '0') / 100);
          }
        }
        description = `Upgrade to ${plan.display_name}`;
        metadata.planType = planType;
      } else if (type === 'credits') {
        const settingsRes = await db.query("SELECT key, value FROM settings WHERE key IN ('credit_price_usd', 'credit_price_ngn')");
        const settings: Record<string, string> = {};
        settingsRes.rows.forEach(r => settings[r.key] = r.value);
        const price = provider === 'paystack' ? parseFloat(settings.credit_price_ngn || '100') : parseFloat(settings.credit_price_usd || '0.1');
        amount = creditAmount * price;
        description = `Purchase ${creditAmount} PAYG Credits`;
        metadata.credits = String(creditAmount);
        currency = provider === 'paystack' ? 'NGN' : 'USD';
      }

      // 2. Provider Logic
      if (provider === 'crypto') {
        const configRes = await db.query("SELECT key, value FROM settings WHERE key IN ('crypto_usdt_trc20_address', 'crypto_usdt_network')");
        const config: Record<string, string> = {};
        configRes.rows.forEach(r => config[r.key] = r.value);

        return ApiResponseHandler.success(res, {
            amount,
            currency: 'USDT',
            walletAddress: config.crypto_usdt_trc20_address,
            network: config.crypto_usdt_network,
            description,
            metadata
        });
      }

      if (provider === 'stripe') {
        if (!stripe) return ApiResponseHandler.serverError(res, "Stripe not configured");
        const paymentIntent = await stripe.paymentIntents.create({
          amount: Math.round(amount * 100),
          currency: "usd",
          automatic_payment_methods: { enabled: true },
          metadata: metadata,
          description: description
        });
        return ApiResponseHandler.success(res, {
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
          amount
        });
      }

      if (provider === 'paystack') {
        if (!PAYSTACK_SECRET_KEY) return ApiResponseHandler.serverError(res, "Paystack not configured");
        const schoolResult = await db.query("SELECT email FROM schools WHERE id = $1", [user.schoolId]);
        const response = await axios.post(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
          email: schoolResult.rows[0].email,
          amount: Math.round(amount * 100),
          currency: "NGN",
          metadata: metadata,
          callback_url: `${process.env.FRONTEND_URL}/payment/verify`,
        }, {
          headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` }
        });
        return ApiResponseHandler.success(res, {
          authorizationUrl: response.data.data.authorization_url,
          reference: response.data.data.reference,
          amount
        });
      }

      return ApiResponseHandler.badRequest(res, "Invalid provider");
    } catch (error) {
      console.error("Checkout initialize error:", error);
      ApiResponseHandler.serverError(res, "Failed to initialize checkout");
    }
  }
);

// Crypto Proof Submission
router.post(
  "/crypto/submit",
  authenticate,
  authorize("school"),
  async (req: Request, res: Response) => {
    try {
      const { amount, transactionHash, type, planType, credits, billingCycle } = req.body;
      const user = req.user!;

      // 1. Create a pending payment record
      const result = await db.query(
        `INSERT INTO payments (school_id, amount, currency, provider, transaction_hash, status, plan_type, metadata)
         VALUES ($1, $2, 'USDT', 'crypto', $3, 'pending', $4, $5)
         RETURNING id`,
        [
            user.schoolId,
            amount,
            transactionHash,
            type === 'upgrade' ? planType : null,
            JSON.stringify({ type, credits, billingCycle })
        ]
      );

      ApiResponseHandler.success(res, { paymentId: result.rows[0].id }, "Payment proof submitted. Awaiting verification.");
    } catch (error) {
      console.error("Crypto submit error:", error);
      ApiResponseHandler.serverError(res, "Failed to submit proof");
    }
  }
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
      const { schoolId, planType, type, credits } = paymentIntent.metadata;

      if (type === 'credits') {
          const creditAmount = parseInt(credits);

          // 1. Update Wallet
          await db.query(
            "UPDATE payg_wallets SET balance_credits = balance_credits + $1, updated_at = NOW() WHERE school_id = $2",
            [creditAmount, schoolId]
          );

          // 2. Create Payment Record
          await db.query(
            `INSERT INTO payments (school_id, amount, currency, provider, provider_payment_id, status, metadata, paid_at)
             VALUES ($1, $2, $3, 'stripe', $4, 'completed', $5, NOW())`,
            [schoolId, paymentIntent.amount / 100, 'USD', paymentIntent.id, JSON.stringify(paymentIntent.metadata)]
          );

          // 3. Log to Ledger
          await db.query(
            `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description)
             VALUES ($1, 'topup', $2, (SELECT balance_credits FROM payg_wallets WHERE school_id = $1), $3)`,
            [schoolId, creditAmount, `Wallet top-up via Stripe (${creditAmount} credits)`]
          );

      } else {
        // Handle plan upgrade
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
          const schoolRes = await db.query(
            "SELECT referred_by_id FROM schools WHERE id = $1 AND referral_reward_granted = false",
            [schoolId]
          );

          if (schoolRes.rows.length > 0 && schoolRes.rows[0].referred_by_id) {
            const referrerId = schoolRes.rows[0].referred_by_id;
            const rewardRes = await db.query("SELECT value FROM settings WHERE key = 'referral_reward_credits'");
            const rewardAmount = parseInt(rewardRes.rows[0]?.value || '100');

            if (rewardAmount > 0) {
              await db.query("UPDATE payg_wallets SET balance_credits = balance_credits + $1 WHERE school_id = $2", [rewardAmount, referrerId]);
              await db.query(
                `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description)
                 VALUES ($1, 'referral_reward', $2, (SELECT balance_credits FROM payg_wallets WHERE school_id = $1), $3)`,
                [referrerId, rewardAmount, `Reward for referring a school that upgraded to ${planType}`]
              );
              await db.query("UPDATE schools SET referral_reward_granted = true WHERE id = $1", [schoolId]);
            }
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
        const { planType, type, credits, schoolId } = metadata;

        if (type === 'credits') {
            const creditAmount = parseInt(credits);

            await db.query(
              "UPDATE payg_wallets SET balance_credits = balance_credits + $1, updated_at = NOW() WHERE school_id = $2",
              [creditAmount, schoolId]
            );

            await db.query(
              `INSERT INTO payments (school_id, amount, currency, provider, provider_payment_id, status, metadata, paid_at)
               VALUES ($1, $2, $3, 'paystack', $4, 'completed', $5, NOW())`,
              [schoolId, amount / 100, currency, reference, JSON.stringify(metadata)]
            );

            await db.query(
              `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description)
               VALUES ($1, 'topup', $2, (SELECT balance_credits FROM payg_wallets WHERE school_id = $1), $3)`,
              [schoolId, creditAmount, `Wallet top-up via Paystack (${creditAmount} credits)`]
            );

            return ApiResponseHandler.success(res, { status: "completed" }, "Credits added successfully");
        }

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

// Paystack Webhook Handler
router.post("/paystack/webhook", async (req: Request, res: Response) => {
  try {
    const hash = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY!).update(JSON.stringify(req.body)).digest('hex');
    if (hash !== req.headers['x-paystack-signature']) {
      return res.status(400).send('Invalid signature');
    }

    const event = req.body;
    if (event.event === 'charge.success') {
      const { metadata, amount, currency, reference } = event.data;
      const { schoolId, planType, type, credits, billingCycle } = metadata;

      // Check if already processed (idempotency)
      const existingPayment = await db.query("SELECT id FROM payments WHERE provider_payment_id = $1", [reference]);
      if (existingPayment.rows.length > 0) {
        return res.status(200).send('Event already processed');
      }

      if (type === 'credits') {
        const creditAmount = parseInt(credits);
        await db.query("UPDATE payg_wallets SET balance_credits = balance_credits + $1, updated_at = NOW() WHERE school_id = $2", [creditAmount, schoolId]);
        await db.query(
          `INSERT INTO payments (school_id, amount, currency, provider, provider_payment_id, status, metadata, paid_at)
           VALUES ($1, $2, $3, 'paystack', $4, 'completed', $5, NOW())`,
          [schoolId, amount / 100, currency, reference, JSON.stringify(metadata)]
        );
        await db.query(
          `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description)
           VALUES ($1, 'topup', $2, (SELECT balance_credits FROM payg_wallets WHERE school_id = $1), $3)`,
          [schoolId, creditAmount, `Wallet top-up via Paystack Webhook (${creditAmount} credits)`]
        );
      } else {
        // Plan Upgrade
        const planResult = await db.query("SELECT * FROM plan_definitions WHERE plan_type = $1", [planType]);
        if (planResult.rows.length > 0) {
          const durationMonths = billingCycle === 'yearly' ? 12 : 1;
          const startDate = new Date();
          const endDate = new Date();
          endDate.setMonth(endDate.getMonth() + durationMonths);

          await db.query(
            `INSERT INTO payments (school_id, amount, currency, provider, provider_payment_id, status, plan_type, plan_duration_months, paid_at)
             VALUES ($1, $2, $3, 'paystack', $4, 'completed', $5, $6, NOW())`,
            [schoolId, amount / 100, currency, reference, planType, durationMonths]
          );

          await db.query(
            `INSERT INTO school_subscriptions (school_id, plan_type, status, billing_cycle, current_period_start, current_period_end)
             VALUES ($1, $2, 'active', $3, $4, $5)
             ON CONFLICT (school_id) DO UPDATE
             SET plan_type = $2, status = 'active', billing_cycle = $3,
                 current_period_start = $4, current_period_end = $5, updated_at = NOW()`,
            [schoolId, planType, billingCycle, startDate, endDate]
          );

          // Referral reward
          const schoolRefRes = await db.query("SELECT referred_by_id FROM schools WHERE id = $1 AND referral_reward_granted = false", [schoolId]);
          if (schoolRefRes.rows.length > 0 && schoolRefRes.rows[0].referred_by_id) {
            const referrerId = schoolRefRes.rows[0].referred_by_id;
            const rewardRes = await db.query("SELECT value FROM settings WHERE key = 'referral_reward_credits'");
            const rewardAmount = parseInt(rewardRes.rows[0]?.value || '100');
            if (rewardAmount > 0) {
              await db.query("UPDATE payg_wallets SET balance_credits = balance_credits + $1 WHERE school_id = $2", [rewardAmount, referrerId]);
              await db.query(
                `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description)
                 VALUES ($1, 'referral_reward', $2, (SELECT balance_credits FROM payg_wallets WHERE school_id = $1), $3)`,
                [referrerId, rewardAmount, `Reward for referring a school that upgraded via Paystack Webhook`]
              );
              await db.query("UPDATE schools SET referral_reward_granted = true WHERE id = $1", [schoolId]);
            }
          }
        }
      }
    }
    res.status(200).send('Webhook processed');
  } catch (error) {
    console.error("Paystack webhook error:", error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
