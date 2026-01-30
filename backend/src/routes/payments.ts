import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';
import Stripe from 'stripe';
import axios from 'axios';

const router = Router();

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })
  : null;

// Paystack configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Get payment plans
router.get('/plans', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM payment_plans 
       WHERE is_active = true
       ORDER BY price ASC`
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get plans error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch plans' });
  } finally {
    client.release();
  }
});

// Create Stripe payment intent
router.post('/stripe/create-intent', authenticate, requireRole(['school']), async (req: Request, res: Response) => {
  try {
    if (!stripe) {
      return res.status(500).json({ success: false, message: 'Stripe not configured' });
    }

    const { planId } = req.body;
    const user = req.user!;

    const client = await pool.connect();
    
    // Get plan details
    const planResult = await client.query(
      'SELECT * FROM payment_plans WHERE id = $1',
      [planId]
    );

    if (planResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const plan = planResult.rows[0];
    client.release();

    // Get school details
    const schoolClient = await pool.connect();
    const schoolResult = await schoolClient.query(
      'SELECT * FROM schools WHERE id = $1',
      [user.schoolId]
    );
    const school = schoolResult.rows[0];
    schoolClient.release();

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(plan.price * 100), // Convert to cents
      currency: plan.currency.toLowerCase(),
      automatic_payment_methods: { enabled: true },
      metadata: {
        schoolId: user.schoolId,
        planId: planId,
        planName: plan.name
      }
    });

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Stripe create intent error:', error);
    res.status(500).json({ success: false, message: 'Failed to create payment intent' });
  }
});

// Stripe webhook handler
router.post('/stripe/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  
  if (!stripe || !sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(400).json({ success: false, message: 'Webhook not configured' });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const client = await pool.connect();
  try {
    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const { schoolId, planId } = paymentIntent.metadata;

      // Get plan details
      const planResult = await client.query(
        'SELECT * FROM payment_plans WHERE id = $1',
        [planId]
      );

      if (planResult.rows.length > 0) {
        const plan = planResult.rows[0];
        
        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + plan.duration_months);

        // Create payment record
        await client.query(
          `INSERT INTO payments (school_id, plan_id, amount, currency, payment_method, 
           transaction_id, status, subscription_start, subscription_end)
           VALUES ($1, $2, $3, $4, 'stripe', $5, 'completed', $6, $7)`,
          [schoolId, planId, plan.price, plan.currency, paymentIntent.id, startDate, endDate]
        );

        // Update school subscription
        await client.query(
          `UPDATE schools 
           SET subscription_status = 'active',
               subscription_plan = $1,
               subscription_start = $2,
               subscription_end = $3,
               max_tutors = $4,
               max_students = $5
           WHERE id = $6`,
          [plan.name, startDate, endDate, plan.max_tutors, plan.max_students, schoolId]
        );
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ success: false });
  } finally {
    client.release();
  }
});

// Initialize Paystack transaction
router.post('/paystack/initialize', authenticate, requireRole(['school']), async (req: Request, res: Response) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'Paystack not configured' });
    }

    const { planId } = req.body;
    const user = req.user!;

    const client = await pool.connect();
    
    // Get plan details
    const planResult = await client.query(
      'SELECT * FROM payment_plans WHERE id = $1',
      [planId]
    );

    if (planResult.rows.length === 0) {
      client.release();
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    const plan = planResult.rows[0];

    // Get school details
    const schoolResult = await client.query(
      'SELECT * FROM schools WHERE id = $1',
      [user.schoolId]
    );
    const school = schoolResult.rows[0];
    client.release();

    // Initialize Paystack transaction
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email: school.email,
        amount: Math.round(plan.price * 100), // Paystack uses kobo (100 kobo = 1 NGN)
        currency: plan.currency,
        metadata: {
          schoolId: user.schoolId,
          planId: planId,
          planName: plan.name
        },
        callback_url: `${process.env.FRONTEND_URL}/payment/verify`
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.status) {
      res.json({
        success: true,
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to initialize payment' });
    }
  } catch (error: any) {
    console.error('Paystack initialize error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to initialize payment' });
  }
});

// Verify Paystack payment
router.post('/paystack/verify', authenticate, requireRole(['school']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(500).json({ success: false, message: 'Paystack not configured' });
    }

    const { reference } = req.body;
    const user = req.user!;

    // Verify transaction with Paystack
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`
        }
      }
    );

    if (response.data.status && response.data.data.status === 'success') {
      const { metadata, amount, currency } = response.data.data;
      const { planId } = metadata;

      // Get plan details
      const planResult = await client.query(
        'SELECT * FROM payment_plans WHERE id = $1',
        [planId]
      );

      if (planResult.rows.length > 0) {
        const plan = planResult.rows[0];
        
        // Calculate subscription dates
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + plan.duration_months);

        // Create payment record
        await client.query(
          `INSERT INTO payments (school_id, plan_id, amount, currency, payment_method, 
           transaction_id, status, subscription_start, subscription_end)
           VALUES ($1, $2, $3, $4, 'paystack', $5, 'completed', $6, $7)`,
          [user.schoolId, planId, amount / 100, currency, reference, startDate, endDate]
        );

        // Update school subscription
        await client.query(
          `UPDATE schools 
           SET subscription_status = 'active',
               subscription_plan = $1,
               subscription_start = $2,
               subscription_end = $3,
               max_tutors = $4,
               max_students = $5
           WHERE id = $6`,
          [plan.name, startDate, endDate, plan.max_tutors, plan.max_students, user.schoolId]
        );

        res.json({
          success: true,
          message: 'Payment verified successfully',
          data: {
            status: 'completed',
            subscriptionStart: startDate,
            subscriptionEnd: endDate
          }
        });
      } else {
        res.status(404).json({ success: false, message: 'Plan not found' });
      }
    } else {
      res.status(400).json({ success: false, message: 'Payment verification failed' });
    }
  } catch (error: any) {
    console.error('Paystack verify error:', error.response?.data || error.message);
    res.status(500).json({ success: false, message: 'Failed to verify payment' });
  } finally {
    client.release();
  }
});

// Get payment history
router.get('/history', authenticate, requireRole(['school']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const user = req.user!;
    const { page = 1, limit = 10 } = req.query;

    const offset = (Number(page) - 1) * Number(limit);

    const result = await client.query(
      `SELECT p.*, pl.name as plan_name
       FROM payments p
       JOIN payment_plans pl ON p.plan_id = pl.id
       WHERE p.school_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [user.schoolId, limit, offset]
    );

    const countResult = await client.query(
      `SELECT COUNT(*) FROM payments WHERE school_id = $1`,
      [user.schoolId]
    );

    const totalCount = parseInt(countResult.rows[0].count);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        id: row.id,
        planName: row.plan_name,
        amount: row.amount,
        currency: row.currency,
        paymentMethod: row.payment_method,
        transactionId: row.transaction_id,
        status: row.status,
        subscriptionStart: row.subscription_start,
        subscriptionEnd: row.subscription_end,
        createdAt: row.created_at
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
  } finally {
    client.release();
  }
});

// Get subscription status
router.get('/subscription', authenticate, requireRole(['school']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const user = req.user!;

    const result = await client.query(
      `SELECT subscription_status, subscription_plan, subscription_start, subscription_end,
              max_tutors, max_students
       FROM schools WHERE id = $1`,
      [user.schoolId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'School not found' });
    }

    const school = result.rows[0];

    // Count current tutors and students
    const tutorCount = await client.query(
      'SELECT COUNT(*) FROM tutors WHERE school_id = $1 AND is_active = true',
      [user.schoolId]
    );

    const studentCount = await client.query(
      'SELECT COUNT(*) FROM students WHERE school_id = $1 AND is_active = true',
      [user.schoolId]
    );

    res.json({
      success: true,
      data: {
        status: school.subscription_status,
        plan: school.subscription_plan,
        startDate: school.subscription_start,
        endDate: school.subscription_end,
        maxTutors: school.max_tutors,
        maxStudents: school.max_students,
        currentTutors: parseInt(tutorCount.rows[0].count),
        currentStudents: parseInt(studentCount.rows[0].count),
        isExpired: school.subscription_end && new Date(school.subscription_end) < new Date()
      }
    });
  } catch (error) {
    console.error('Get subscription error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch subscription status' });
  } finally {
    client.release();
  }
});

export default router;
