import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { db } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';
import { startTrial } from '../services/planService';
import { ApiResponseHandler } from '../utils/apiResponse';
import { sendWelcomeEmail } from '../services/email';
import { validate } from '../middleware/validation';
import { getPaginationOptions, formatPaginationResponse } from '../utils/pagination';
import { logActivity, logUserActivity } from '../utils/auditLogger';

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
  validate
], async (req, res, next) => {
  try {
    const { name, username, password, email, phone, address, description, country } = req.body;

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

    // Create school
    const result = await db.query(
      `INSERT INTO schools (name, username, password_hash, email, phone, address, description, country, plan_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'freemium')
       RETURNING id, name, username, email, phone, plan_type, created_at`,
      [name, username, passwordHash, email, phone, address, description, country || 'Nigeria']
    );

    const school = result.rows[0];

    // Auto-start 14-day trial (Basic Premium features)
    await startTrial(school.id);

    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, name).catch(() => {});

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
      details: { email, plan_type: school.plan_type }
    });

    ApiResponseHandler.created(res, school, 'School registered successfully. Your 14-day trial has started!');
  } catch (error) {
    next(error);
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
