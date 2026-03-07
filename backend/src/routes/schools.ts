import { Router } from 'express';
import crypto from 'crypto';
import { body, param, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { startTrial } from '../services/planService';
import { ApiResponseHandler } from '../utils/apiResponse';
import { sendWelcomeEmail, sendVerificationEmail } from '../services/email';
import { validate } from '../middleware/validation';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { logActivity, logUserActivity } from '../utils/auditLogger';
import { logger } from '../utils/logger';

const router = Router();


// Public registration route
router.post('/register', [
  body('name').trim().notEmpty().withMessage('School name is required'),
  body('username').trim().isLength({ min: 4 }).withMessage('Username must be at least 4 characters'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').optional().trim(),
  body('address').optional().trim(),
  body('description').optional().trim(),
  body('country').optional().trim(),
  body('logo').optional().trim(),
  body('referralCode').optional().trim(),
  validate
], async (req, res, next) => {
  try {
    const { name, username, password, email, phone, address, description, country, logo, referralCode } = req.body;

    // Check if username exists
    const usernameCheck = await db.query('SELECT id FROM schools WHERE username = $1', [username]);
    if (usernameCheck.rows.length > 0) {
      return ApiResponseHandler.conflict(res, 'Username already taken');
    }

    // Check if email exists
    const emailCheck = await db.query('SELECT id FROM schools WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return ApiResponseHandler.conflict(res, 'Email already registered');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate verification token and referral code for the new school
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const newSchoolReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Handle referral (find referrer)
    let referredById = null;
    if (referralCode) {
      const referrer = await db.query('SELECT id FROM schools WHERE referral_code = $1', [referralCode.toUpperCase()]);
      if (referrer.rows.length > 0) {
        referredById = referrer.rows[0].id;
      }
    }

    // Execute registration in a transaction to ensure atomicity
    const school = await db.transaction(async (client) => {
      // 1. Create school (is_active = false until email verified)
      const schoolResult = await client.query(
        `INSERT INTO schools (
          name, username, password_hash, email, phone, address,
          description, logo_url, country, plan_type, is_active,
          is_email_verified, email_verification_token, referral_code, referred_by_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'freemium', false, false, $10, $11, $12)
        RETURNING id, name, username, email, phone, plan_type, created_at`,
        [
          name, username, passwordHash, email, phone, address,
          description, logo, country || 'Nigeria', verificationToken,
          newSchoolReferralCode, referredById
        ]
      );

      const newSchool = schoolResult.rows[0];

      // 2. Auto-start 14-day trial (Basic Premium features)
      await client.query(
        `INSERT INTO school_subscriptions (school_id, plan_type, status, billing_cycle, trial_start, trial_end)
         VALUES ($1, 'basic', 'trialing', 'free', NOW(), NOW() + INTERVAL '14 days')
         ON CONFLICT (school_id) DO UPDATE
         SET plan_type = 'basic', status = 'trialing', trial_start = EXCLUDED.trial_start, trial_end = EXCLUDED.trial_end, updated_at = NOW()`,
        [newSchool.id]
      );

      // 3. Initialize school settings
      await client.query(
        `INSERT INTO school_settings (school_id) VALUES ($1) ON CONFLICT (school_id) DO NOTHING`,
        [newSchool.id]
      );

      // 4. Initialize PAYG wallet
      await client.query(
        `INSERT INTO payg_wallets (school_id) VALUES ($1) ON CONFLICT (school_id) DO NOTHING`,
        [newSchool.id]
      );

      return newSchool;
    });

    // Send verification email (non-blocking)
    sendVerificationEmail(email, name, verificationToken).catch((err) => {
      logger.error('Failed to send verification email:', err);
    });

    // Log the registration
    await logActivity({
      schoolId: school.id,
      userId: school.id,
      userType: 'school',
      actorName: name,
      action: 'school_registration',
      targetType: 'school',
      targetId: school.id,
      targetName: name,
      request: req,
      details: { email, plan_type: school.plan_type, referred_by: referredById }
    });

    ApiResponseHandler.created(res, {
      ...school,
      requiresVerification: true
    }, 'Registration successful! Please check your email to verify your account and activate your 14-day trial.');
  } catch (error) {
    // Standardize error handling to prevent DB exposure
    logger.error('Registration error:', error);
    ApiResponseHandler.serverError(res, 'An error occurred during registration. Please try again later.');
  }
});

// Protected routes
router.use(authenticate);

// Get current school profile
router.get('/profile', authorize('school'), async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, username, email, phone, address, description, logo_url, country, timezone,
              plan_type, plan_status, plan_expires_at, is_active, created_at
       FROM schools WHERE id = $1`,
      [req.user!.id]
    );

    if (result.rows.length === 0) {
      return ApiResponseHandler.notFound(res, 'School not found');
    }

    ApiResponseHandler.success(res, result.rows[0], 'Profile retrieved');
  } catch (error) {
    next(error);
  }
});

// Update school profile
router.put('/profile', authorize('school'), async (req, res, next) => {
  try {
    const { name, email, phone, address, description, logoUrl, country, timezone } = req.body;
    const schoolId = req.user!.id;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name) { updates.push(`name = $${paramIndex++}`); values.push(name); }
    if (email) { updates.push(`email = $${paramIndex++}`); values.push(email); }
    if (phone !== undefined) { updates.push(`phone = $${paramIndex++}`); values.push(phone); }
    if (address !== undefined) { updates.push(`address = $${paramIndex++}`); values.push(address); }
    if (description !== undefined) { updates.push(`description = $${paramIndex++}`); values.push(description); }
    if (logoUrl !== undefined) { updates.push(`logo_url = $${paramIndex++}`); values.push(logoUrl); }
    if (country) { updates.push(`country = $${paramIndex++}`); values.push(country); }
    if (timezone) { updates.push(`timezone = $${paramIndex++}`); values.push(timezone); }

    if (updates.length === 0) {
      return ApiResponseHandler.badRequest(res, 'No fields to update');
    }

    updates.push('updated_at = NOW()');
    values.push(schoolId);

    const result = await db.query(
      `UPDATE schools SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    ApiResponseHandler.success(res, result.rows[0], 'Profile updated');
  } catch (error) {
    next(error);
  }
});

// Get school dashboard stats
router.get('/dashboard', authorize('school'), async (req, res, next) => {
  try {
    const schoolId = req.user!.id;

    const stats = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM tutors WHERE school_id = $1) as tutor_count,
        (SELECT COUNT(*) FROM students WHERE school_id = $1) as student_count,
        (SELECT COUNT(*) FROM exams WHERE school_id = $1) as exam_count,
        (SELECT COUNT(*) FROM questions WHERE exam_id IN (SELECT id FROM exams WHERE school_id = $1)) as question_count,
        (SELECT COUNT(*) FROM exam_schedules WHERE exam_id IN (SELECT id FROM exams WHERE school_id = $1) AND status = 'scheduled') as upcoming_exams,
        (SELECT COUNT(*) FROM student_exams WHERE exam_id IN (SELECT id FROM exams WHERE school_id = $1) AND status = 'completed') as completed_exams,
        (SELECT COALESCE(AVG(percentage), 0) FROM student_exams WHERE exam_id IN (SELECT id FROM exams WHERE school_id = $1) AND status = 'completed') as average_score`,
      [schoolId]
    );

    ApiResponseHandler.success(res, stats.rows[0], 'Dashboard stats retrieved');
  } catch (error) {
    next(error);
  }
});

// Super admin routes
router.get('/', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const pagination = getPaginationOptions(req);
    const result = await db.query(
      `SELECT s.id, s.name, s.username, s.email, s.phone, s.logo_url, s.country, s.is_active,
              s.plan_type, s.plan_status, s.created_at,
              (SELECT COUNT(*) FROM tutors WHERE school_id = s.id) as tutor_count,
              (SELECT COUNT(*) FROM students WHERE school_id = s.id) as student_count,
              (SELECT COUNT(*) FROM exams WHERE school_id = s.id) as exam_count
       FROM schools s
       ORDER BY s.created_at DESC
       LIMIT $1 OFFSET $2`,
      [pagination.limit, pagination.offset]
    );

    const countResult = await db.query("SELECT COUNT(*) FROM schools");
    const totalCount = parseInt(countResult.rows[0].count);

    ApiResponseHandler.success(
      res,
      result.rows,
      'Schools retrieved',
      formatPaginationResponse(totalCount, pagination)
    );
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', authenticate, authorize('super_admin'), [
  param('id').isUUID(),
  body('isActive').isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    const schoolResult = await db.query('SELECT name FROM schools WHERE id = $1', [id]);
    const schoolName = schoolResult.rows[0]?.name;

    await db.query('UPDATE schools SET is_active = $1, updated_at = NOW() WHERE id = $2', [isActive, id]);

    // Log status change
    await logUserActivity(req, 'school_status_change', {
      targetType: 'school',
      targetId: id,
      targetName: schoolName,
      details: { is_active: isActive }
    });

    ApiResponseHandler.success(res, null, `School ${isActive ? 'activated' : 'deactivated'}`);
  } catch (error) {
    next(error);
  }
});

export default router;
