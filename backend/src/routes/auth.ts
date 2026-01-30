import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { db } from '../config/database';
import { generateToken, authenticate } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Validation middleware helper
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

// @route   POST /api/auth/school/login
// @desc    School admin login
// @access  Public
router.post('/school/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find school by username
    const result = await db.query(
      'SELECT id, name, username, password_hash, email, is_active, plan_type FROM schools WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const school = result.rows[0];

    if (!school.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact support.'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, school.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = generateToken({
      id: school.id,
      role: 'school',
      schoolId: school.id
    });

    // Log activity
    await db.query(
      'INSERT INTO activity_logs (user_id, user_type, school_id, action, details) VALUES ($1, $2, $3, $4, $5)',
      [school.id, 'school', school.id, 'login', { ip: req.ip }]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: school.id,
          name: school.name,
          username: school.username,
          email: school.email,
          planType: school.plan_type
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/tutor/login
// @desc    Tutor login
// @access  Public
router.post('/tutor/login', [
  body('schoolId').trim().notEmpty().withMessage('School ID is required'),
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], async (req, res, next) => {
  try {
    const { schoolId, username, password } = req.body;

    // Find tutor
    const result = await db.query(
      `SELECT t.id, t.username, t.password_hash, t.full_name, t.email, t.subjects, t.is_active,
              s.id as school_id, s.name as school_name
       FROM tutors t
       JOIN schools s ON t.school_id = s.id
       WHERE t.school_id = $1 AND t.username = $2`,
      [schoolId, username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const tutor = result.rows[0];

    if (!tutor.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is inactive. Please contact your school administrator.'
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, tutor.password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await db.query('UPDATE tutors SET last_login_at = NOW() WHERE id = $1', [tutor.id]);

    // Generate token
    const token = generateToken({
      id: tutor.id,
      role: 'tutor',
      schoolId: tutor.school_id,
      tutorId: tutor.id
    });

    // Log activity
    await db.query(
      'INSERT INTO activity_logs (user_id, user_type, school_id, action, details) VALUES ($1, $2, $3, $4, $5)',
      [tutor.id, 'tutor', tutor.school_id, 'login', { ip: req.ip }]
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: tutor.id,
          fullName: tutor.full_name,
          username: tutor.username,
          email: tutor.email,
          subjects: tutor.subjects,
          schoolId: tutor.school_id,
          schoolName: tutor.school_name
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/student/login
// @desc    Student login (exam access)
// @access  Public
router.post('/student/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // Find exam schedule by credentials
    const result = await db.query(
      `SELECT es.id, es.exam_id, es.student_id, es.scheduled_date, es.start_time, es.end_time,
              es.status, es.attempt_count, es.max_attempts,
              s.full_name as student_name, s.school_id,
              e.title as exam_title, e.duration
       FROM exam_schedules es
       JOIN students s ON es.student_id = s.id
       JOIN exams e ON es.exam_id = e.id
       WHERE es.login_username = $1 AND es.login_password = $2`,
      [username, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or exam not scheduled'
      });
    }

    const schedule = result.rows[0];

    // Check if exam is available
    const now = new Date();
    const examDate = new Date(schedule.scheduled_date);
    const [startHour, startMinute] = schedule.start_time.split(':').map(Number);
    const [endHour, endMinute] = schedule.end_time.split(':').map(Number);
    
    const startTime = new Date(examDate);
    startTime.setHours(startHour, startMinute, 0);
    
    const endTime = new Date(examDate);
    endTime.setHours(endHour, endMinute, 0);

    // Check status
    if (schedule.status === 'completed') {
      return res.status(403).json({
        success: false,
        message: 'You have already completed this exam'
      });
    }

    if (schedule.attempt_count >= schedule.max_attempts) {
      return res.status(403).json({
        success: false,
        message: 'Maximum attempts reached'
      });
    }

    // Generate token
    const token = generateToken({
      id: schedule.student_id,
      role: 'student',
      schoolId: schedule.school_id,
      studentId: schedule.student_id
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: schedule.student_id,
          fullName: schedule.student_name,
          schoolId: schedule.school_id
        },
        exam: {
          id: schedule.exam_id,
          title: schedule.exam_title,
          duration: schedule.duration,
          scheduleId: schedule.id,
          scheduledDate: schedule.scheduled_date,
          startTime: schedule.start_time,
          endTime: schedule.end_time,
          status: schedule.status,
          isAvailable: now >= startTime && now <= endTime
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/super-admin/login
// @desc    Super admin login
// @access  Public
router.post('/super-admin/login', [
  body('username').trim().notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required'),
  validate
], async (req, res) => {
  const { username, password } = req.body;

  // Hardcoded super admin (in production, use database)
  if (username === process.env.SUPER_ADMIN_USERNAME && 
      password === process.env.SUPER_ADMIN_PASSWORD) {
    
    const token = generateToken({
      id: 'super_admin',
      role: 'super_admin'
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: 'super_admin',
          name: 'Super Administrator',
          role: 'super_admin'
        }
      }
    });
  } else {
    res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { id, role } = req.user!;
    let userData: any = null;

    switch (role) {
      case 'school':
        const schoolResult = await db.query(
          'SELECT id, name, username, email, phone, logo_url, plan_type, is_active FROM schools WHERE id = $1',
          [id]
        );
        userData = schoolResult.rows[0];
        break;
      case 'tutor':
        const tutorResult = await db.query(
          `SELECT t.id, t.username, t.full_name, t.email, t.phone, t.subjects, t.avatar_url,
                  s.id as school_id, s.name as school_name
           FROM tutors t
           JOIN schools s ON t.school_id = s.id
           WHERE t.id = $1`,
          [id]
        );
        userData = tutorResult.rows[0];
        break;
      case 'student':
        const studentResult = await db.query(
          `SELECT s.id, s.student_id, s.full_name, s.email, s.phone,
                  sc.name as category_name, sch.name as school_name
           FROM students s
           LEFT JOIN student_categories sc ON s.category_id = sc.id
           JOIN schools sch ON s.school_id = sch.id
           WHERE s.id = $1`,
          [id]
        );
        userData = studentResult.rows[0];
        break;
    }

    res.json({
      success: true,
      data: {
        user: userData,
        role
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/change-password
// @desc    Change password
// @access  Private
router.post('/change-password', authenticate, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  validate
], async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const { id, role } = req.user!;

    let tableName = '';
    switch (role) {
      case 'school': tableName = 'schools'; break;
      case 'tutor': tableName = 'tutors'; break;
      case 'student': tableName = 'students'; break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Cannot change password for this user type'
        });
    }

    // Get current password hash
    const result = await db.query(
      `SELECT password_hash FROM ${tableName} WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query(
      `UPDATE ${tableName} SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newHash, id]
    );

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
