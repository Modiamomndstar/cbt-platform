import { Router } from "express";
import bcrypt from "bcryptjs";
import { body, validationResult } from "express-validator";
import { db } from "../config/database";
import { generateToken, authenticate } from "../middleware/auth";
import { logger } from "../utils/logger";
import { ApiResponseHandler } from "../utils/apiResponse";
import { validate } from "../middleware/validation";
import crypto from "crypto";
import { sendVerificationEmail } from "../services/email";

const router = Router();



// @route   POST /api/auth/school/login
// @desc    School admin login
// @access  Public
router.post(
  "/school/login",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { username, password } = req.body;

      // Find school by username, join with subscription to check status
      const result = await db.query(
        `SELECT s.id, s.name, s.username, s.password_hash, s.email,
                s.is_active, s.is_email_verified, s.plan_type,
                ss.status as sub_status
         FROM schools s
         LEFT JOIN school_subscriptions ss ON s.id = ss.school_id
         WHERE s.username = $1`,
        [username],
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.unauthorized(res, "Invalid credentials");
      }

      const school = result.rows[0];

      // Check email verification
      if (!school.is_email_verified) {
        return ApiResponseHandler.unauthorized(res, "Please verify your email address to log in.");
      }

      // Check if account is active (General master switch)
      if (!school.is_active) {
        return ApiResponseHandler.unauthorized(res, "Your account is currently inactive. Please contact support.");
      }

      // Check subscription status (Administrative suspension)
      if (school.sub_status === 'suspended') {
        return ApiResponseHandler.unauthorized(res, "Your school portal has been suspended by an administrator. Please contact support.");
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, school.password_hash);
      if (!isMatch) {
        return ApiResponseHandler.unauthorized(res, "Invalid credentials");
      }

      // Generate token
      const token = generateToken({
        id: school.id,
        role: "school",
        schoolId: school.id,
      });

      // Log activity
      await db.query(
        "INSERT INTO activity_logs (user_id, user_type, school_id, action, details) VALUES ($1, $2, $3, $4, $5)",
        [school.id, "school", school.id, "login", { ip: req.ip }],
      );

      ApiResponseHandler.success(res, {
        token,
        user: {
          id: school.id,
          name: school.name,
          username: school.username,
          email: school.email,
          planType: school.plan_type,
          role: "school_admin",
        },
      }, "Login successful");
    } catch (error) {
      next(error);
    }
  },
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify school email token
 * @access  Public
 */
router.post(
  "/verify-email",
  [
    body("token").notEmpty().withMessage("Verification token is required"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { token } = req.body;

      // Find school by token
      const result = await db.query(
        "SELECT id, name, is_email_verified FROM schools WHERE email_verification_token = $1",
        [token]
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.badRequest(res, "Invalid or expired verification token.");
      }

      const school = result.rows[0];

      if (school.is_email_verified) {
        return ApiResponseHandler.success(res, null, "Email already verified. You can log in.");
      }

      // Verify email and activate school
      await db.query(
        "UPDATE schools SET is_email_verified = true, is_active = true, email_verification_token = null, updated_at = NOW() WHERE id = $1",
        [school.id]
      );

      // Log activity
      await db.query(
        "INSERT INTO activity_logs (user_id, user_type, school_id, action, details) VALUES ($1, $2, $3, $4, $5)",
        [school.id, "school", school.id, "email_verified", { ip: req.ip }],
      );

      ApiResponseHandler.success(res, null, "Email verified successfully! Your account is now active. You can log in.");
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend verification email with rate limiting
 * @access  Public
 */
router.post(
  "/resend-verification",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { username } = req.body;

      // Find school by username
      const result = await db.query(
        "SELECT id, name, email, is_email_verified, verification_resent_at FROM schools WHERE username = $1",
        [username]
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Account not found.");
      }

      const school = result.rows[0];

      if (school.is_email_verified) {
        return ApiResponseHandler.badRequest(res, "Email is already verified. Please log in.");
      }

      // Rate limiting: 5 minute cooldown
      const COOLDOWN_MINUTES = 5;
      const lastSent = school.verification_resent_at;

      if (lastSent) {
        const lastSentDate = new Date(lastSent);
        const now = new Date();
        const diffMs = now.getTime() - lastSentDate.getTime();
        const diffMins = diffMs / (1000 * 60);

        if (diffMins < COOLDOWN_MINUTES) {
          const waitMins = Math.ceil(COOLDOWN_MINUTES - diffMins);
          return ApiResponseHandler.error(res, `Please wait ${waitMins} minute(s) before requesting another email.`, 429, 'RATE_LIMIT_EXCEEDED');
        }
      }

      // Generate new token and update timestamp
      const token = crypto.randomBytes(32).toString("hex");
      await db.query(
        "UPDATE schools SET email_verification_token = $1, verification_resent_at = NOW(), updated_at = NOW() WHERE id = $2",
        [token, school.id]
      );

      // Send email
      await sendVerificationEmail(school.email, school.name, token);

      ApiResponseHandler.success(res, null, "Verification email resent successfully. Please check your inbox.");
    } catch (error) {
      next(error);
    }
  }
);

// @route   POST /api/auth/tutor/login
// @desc    Tutor login
// @access  Public
router.post(
  "/tutor/login",
  [
    body("schoolId").trim().notEmpty().withMessage("School ID is required"),
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { schoolId, username, password } = req.body;

      // Find tutor
      const result = await db.query(
        `SELECT t.id, t.username, t.password_hash, t.full_name, t.email, t.subjects, t.is_active,
              s.id as school_id, s.name as school_name
       FROM tutors t
       JOIN schools s ON t.school_id = s.id
       WHERE t.school_id = $1 AND t.username = $2`,
        [schoolId, username],
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.unauthorized(res, "Invalid credentials");
      }

      const tutor = result.rows[0];

      if (!tutor.is_active) {
        return ApiResponseHandler.unauthorized(res, "Account is inactive. Please contact your school administrator.");
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, tutor.password_hash);
      if (!isMatch) {
        return ApiResponseHandler.unauthorized(res, "Invalid credentials");
      }

      // Update last login
      await db.query("UPDATE tutors SET last_login_at = NOW() WHERE id = $1", [
        tutor.id,
      ]);

      // Generate token
      const token = generateToken({
        id: tutor.id,
        role: "tutor",
        schoolId: tutor.school_id,
        tutorId: tutor.id,
      });

      // Log activity
      await db.query(
        "INSERT INTO activity_logs (user_id, user_type, school_id, action, details) VALUES ($1, $2, $3, $4, $5)",
        [tutor.id, "tutor", tutor.school_id, "login", { ip: req.ip }],
      );

      ApiResponseHandler.success(res, {
        token,
        user: {
          id: tutor.id,
          fullName: tutor.full_name,
          username: tutor.username,
          email: tutor.email,
          subjects: tutor.subjects,
          schoolId: tutor.school_id,
          schoolName: tutor.school_name,
          role: "tutor",
        },
      }, "Login successful");
    } catch (error) {
      next(error);
    }
  },
);

// @route   POST /api/auth/student/login
// @desc    Student login (exam access)
// @access  Public
router.post(
  "/student/login",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const usernameInput = req.body.username || "";
      const username = usernameInput.trim().toLowerCase();
      const { password } = req.body;

      // Find exam schedule by credentials — support both internal and external students
      const result = await db.query(
        `SELECT es.id, es.exam_id, es.student_id, es.external_student_id,
                es.scheduled_date, es.start_time, es.end_time,
                es.status, es.attempt_count, es.max_attempts, es.login_password,
                COALESCE(s.full_name, ext.full_name) as student_name,
                COALESCE(s.school_id, ext.school_id) as school_id,
                e.title as exam_title, e.duration,
                sch.timezone as school_timezone
         FROM exam_schedules es
         LEFT JOIN students s ON es.student_id = s.id
         LEFT JOIN external_students ext ON es.external_student_id = ext.id
         JOIN exams e ON es.exam_id = e.id
         JOIN schools sch ON COALESCE(s.school_id, ext.school_id) = sch.id
         WHERE es.login_username = $1`,
        [username],
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.unauthorized(res, "Invalid credentials or exam not scheduled");
      }

      const schedule = result.rows[0];

      // Support fallback for plain text passwords (backwards compatibility for old reschedules)
      let validPassword = false;
      if (schedule.login_password.startsWith("$2")) {
        // Looks like a hash
        validPassword = await bcrypt.compare(password, schedule.login_password);
      } else {
        // Plain text fallback
        validPassword = password === schedule.login_password;
      }

      if (!validPassword) {
        return ApiResponseHandler.unauthorized(res, "Invalid credentials or exam not scheduled");
      }

      // Check if within access window (Timezone aware)
      const tz = schedule.school_timezone || "Africa/Lagos";
      const studentNowStr = new Date().toLocaleString("en-SE", { timeZone: tz, hour12: false });

      const scheduleDateStr = typeof schedule.scheduled_date === 'string'
        ? schedule.scheduled_date
        : schedule.scheduled_date.toISOString().split('T')[0];

      const scheduledStartStr = `${scheduleDateStr} ${schedule.start_time}:00`;
      const scheduledEndStr = `${scheduleDateStr} ${schedule.end_time || '23:59'}:00`;

      const parseFakeUtc = (str: string) => new Date(str.replace(' ', 'T') + 'Z');
      const studentNowDate = parseFakeUtc(studentNowStr);
      const scheduleStartDate = parseFakeUtc(scheduledStartStr);
      const scheduleEndDate = parseFakeUtc(scheduledEndStr);

      // 5 min grace before start
      const fiveMinBefore = new Date(scheduleStartDate.getTime() - 5 * 60 * 1000);

      if (studentNowDate < fiveMinBefore) {
        return ApiResponseHandler.forbidden(res, `Exam not yet available. Please check back at ${schedule.start_time}.`);
      }

      if (studentNowDate > scheduleEndDate) {
        return ApiResponseHandler.forbidden(res, "Exam schedule has expired.");
      }

      // Check status
      if (schedule.status === "completed") {
        return ApiResponseHandler.forbidden(res, "You have already completed this exam");
      }

      if (schedule.attempt_count >= schedule.max_attempts) {
        return ApiResponseHandler.forbidden(res, "Maximum attempts reached");
      }

      // Use student_id or external_student_id as the identity
      const effectiveStudentId = schedule.student_id || schedule.external_student_id;

      // Generate token
      const token = generateToken({
        id: effectiveStudentId,
        role: "student",
        schoolId: schedule.school_id,
        studentId: effectiveStudentId,
        isExternal: !!schedule.external_student_id
      });

      ApiResponseHandler.success(res, {
        token,
        user: {
          id: effectiveStudentId,
          fullName: schedule.student_name,
          schoolId: schedule.school_id,
          role: "student",
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
          isAvailable: studentNowDate >= scheduleStartDate && studentNowDate <= scheduleEndDate,
        },
      }, "Login successful");
    } catch (error) {
      next(error);
    }
  },
);

// @route   POST /api/auth/student/portal-login
// @desc    Student portal login (permanent account)
// @access  Public
router.post(
  "/student/portal-login",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const usernameInput = req.body.username || "";
      const username = usernameInput.trim().toLowerCase();
      const { password } = req.body;

      // Find student by username
      const result = await db.query(
        `SELECT s.id, s.username, s.password_hash, s.full_name, s.email, s.school_id, s.is_active,
                sch.name as school_name
         FROM students s
         JOIN schools sch ON s.school_id = sch.id
         WHERE s.username = $1`,
        [username],
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.unauthorized(res, "Invalid credentials");
      }

      const student = result.rows[0];

      if (!student.is_active) {
        return ApiResponseHandler.unauthorized(res, "Account is inactive. Please contact your school administrator.");
      }

      // Verify password
      // Note: If student was created without password (legacy), this might fail or we need a default check.
      // But we just added migration to ensure password_hash is set (via default in create).
      // If password_hash is null, they can't login (secure default).
      if (!student.password_hash) {
          return ApiResponseHandler.unauthorized(res, "Account setup incomplete. Please contact admin.");
      }

      const isMatch = await bcrypt.compare(password, student.password_hash);
      if (!isMatch) {
        return ApiResponseHandler.unauthorized(res, "Invalid credentials");
      }

      // Generate token
      const token = generateToken({
        id: student.id,
        role: "student",
        schoolId: student.school_id,
        studentId: student.id,
        isExternal: false
      });

      // Log activity
      await db.query(
        "INSERT INTO activity_logs (user_id, user_type, school_id, action, details) VALUES ($1, $2, $3, $4, $5)",
        [student.id, "student", student.school_id, "portal_login", { ip: req.ip }],
      );

      ApiResponseHandler.success(res, {
        token,
        user: {
          id: student.id,
          fullName: student.full_name,
          username: student.username,
          email: student.email,
          schoolId: student.school_id,
          schoolName: student.school_name,
          role: "student",
        },
      }, "Login successful");
    } catch (error) {
      next(error);
    }
  },
);

// @route   POST /api/auth/super-admin/login
// @desc    Super admin login
// @access  Public
router.post(
  "/super-admin/login",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  async (req, res) => {
    const { username, password } = req.body;

    // Allow SUPER_ADMIN_EMAIL to be used as username if SUPER_ADMIN_USERNAME is not set
    const superAdminUsername =
      process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN_EMAIL;

    // Hardcoded super admin (in production, use database)
    if (
      username === superAdminUsername &&
      password === process.env.SUPER_ADMIN_PASSWORD
    ) {
      const token = generateToken({
        id: "00000000-0000-0000-0000-000000000000",
        role: "super_admin",
      });

      ApiResponseHandler.success(res, {
        token,
        user: {
          id: "00000000-0000-0000-0000-000000000000",
          name: "Super Administrator",
          role: "super_admin",
        },
      }, "Login successful");
    } else {
      ApiResponseHandler.unauthorized(res, "Invalid credentials");
    }
  },
);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const { id, role } = req.user!;
    let userData: any = null;

    switch (role) {
      case "super_admin":
        userData = {
          id: "00000000-0000-0000-0000-000000000000",
          name: "Super Administrator",
          username: process.env.SUPER_ADMIN_USERNAME || process.env.SUPER_ADMIN_EMAIL || "admin",
          email: process.env.SUPER_ADMIN_EMAIL,
        };
        break;
      case "school":
        const schoolResult = await db.query(
          "SELECT id, name, username, email, phone, logo_url, plan_type, is_active FROM schools WHERE id = $1",
          [id],
        );
        userData = schoolResult.rows[0];
        break;
      case "tutor":
        const tutorResult = await db.query(
          `SELECT t.id, t.username, t.full_name, t.email, t.phone, t.subjects, t.avatar_url,
                  s.id as school_id, s.name as school_name
           FROM tutors t
           JOIN schools s ON t.school_id = s.id
           WHERE t.id = $1`,
          [id],
        );
        userData = tutorResult.rows[0];
        break;
      case "student":
        const studentResult = await db.query(
          `SELECT s.id, s.student_id, s.full_name, s.email, s.phone,
                  sc.name as category_name, sch.name as school_name,
                  assigned_tutors.tutors as assigned_tutors
           FROM students s
           LEFT JOIN student_categories sc ON s.category_id = sc.id
           JOIN schools sch ON s.school_id = sch.id
           LEFT JOIN LATERAL (
             SELECT COALESCE(json_agg(json_build_object('id', t.id, 'name', t.full_name, 'subjects', t.subjects)), '[]'::json) as tutors
             FROM student_tutors st
             JOIN tutors t ON st.tutor_id = t.id
             WHERE st.student_id = s.id
           ) as assigned_tutors ON true
           WHERE s.id = $1`,
          [id],
        );
        userData = studentResult.rows[0];
        break;
    }

      ApiResponseHandler.success(res, {
        user: { ...userData, role },
        role,
      }, "Profile retrieved");
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/auth/staff/login
// @desc    Staff login (Super Admin and Company Staff)
// @access  Public
router.post(
  "/staff/login",
  [
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { username, password } = req.body;

      // Find staff by username
      const result = await db.query(
        "SELECT id, name, username, password_hash, email, role, is_active FROM staff_accounts WHERE username = $1",
        [username],
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.unauthorized(res, "Invalid credentials");
      }

      const staff = result.rows[0];

      if (!staff.is_active) {
        return ApiResponseHandler.unauthorized(res, "Account is inactive. Please contact your supervisor.");
      }

      // Verify password
      const isMatch = await bcrypt.compare(password, staff.password_hash);
      if (!isMatch) {
        return ApiResponseHandler.unauthorized(res, "Invalid credentials");
      }

      // Update last login
      await db.query("UPDATE staff_accounts SET last_login_at = NOW() WHERE id = $1", [
        staff.id,
      ]);

      // Generate token
      const token = generateToken({
        id: staff.id,
        role: "super_admin",
        staffRole: staff.role
      });

      // Log activity to staff_audit_log (since activity_logs is school tailored)
      // Ignore errors if this fails
      try {
        await db.query(
          "INSERT INTO staff_audit_log (actor_type, actor_id, actor_name, action, target_type, target_name, ip_address) VALUES ('super_admin', $1, $2, 'login', 'system', 'login', $3)",
          [staff.id, staff.username, req.ip],
        );
      } catch (e) {
        // Silently fail audit log on login if table missing or schema mismatch for some reason
      }

      ApiResponseHandler.success(res, {
        token,
        user: {
          id: staff.id,
          name: staff.name,
          username: staff.username,
          email: staff.email,
          role: "super_admin",
          staffRole: staff.role
        },
      }, "Login successful");
    } catch (error) {
      next(error);
    }
  },
);

// @route   POST /api/auth/change-password
// @desc    Change password
// @access  Private
router.post(
  "/change-password",
  authenticate,
  [
    body("currentPassword")
      .notEmpty()
      .withMessage("Current password is required"),
    body("newPassword")
      .isLength({ min: 6 })
      .withMessage("New password must be at least 6 characters"),
    validate,
  ],
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      const { id, role } = req.user!;

      let tableName = "";
      switch (role) {
        case "school":
          tableName = "schools";
          break;
        case "tutor":
          tableName = "tutors";
          break;
        case "student":
          tableName = "students";
          break;
        case "super_admin":
          tableName = "staff_accounts";
          break;
        default:
          return ApiResponseHandler.badRequest(res, "Cannot change password for this user type");
      }

      // Get current password hash
      const result = await db.query(
        `SELECT password_hash FROM ${tableName} WHERE id = $1`,
        [id],
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "User not found");
      }

      // Verify current password
      const isMatch = await bcrypt.compare(
        currentPassword,
        result.rows[0].password_hash,
      );
      if (!isMatch) {
        return ApiResponseHandler.unauthorized(res, "Current password is incorrect");
      }

      // Hash new password
      const newHash = await bcrypt.hash(newPassword, 10);

      // Update password
      await db.query(
        `UPDATE ${tableName} SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
        [newHash, id],
      );

      ApiResponseHandler.success(res, null, "Password changed successfully");
    } catch (error) {
      next(error);
    }
  },
);

export default router;
