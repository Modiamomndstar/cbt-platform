# CBT Platform - Production Fixes Implementation Guide

## Overview
This document provides exact code fixes for all critical and high-priority issues identified in the audit report.

---

# PHASE 1: CRITICAL FIXES

## Fix #1: Add Missing external_students Table to Schema

**File:** `database/schema.sql`
**Status:** ❌ MISSING
**Action:** ADD this table definition after students table

```sql
-- ============================================
-- EXTERNAL STUDENTS TABLE (Tutor-created students)
-- ============================================
CREATE TABLE external_students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_id UUID NOT NULL REFERENCES tutors(id) ON DELETE CASCADE,
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    category_id UUID REFERENCES student_categories(id) ON DELETE SET NULL,

    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    bio TEXT,
    avatar_url TEXT,

    -- Credentials for exam access
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,

    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tutor_id, username)
);

CREATE INDEX idx_external_students_tutor ON external_students(tutor_id);
CREATE INDEX idx_external_students_school ON external_students(school_id);
CREATE INDEX idx_external_students_username ON external_students(username);
```

---

## Fix #2: Add assigned_questions Field to student_exams Table

**File:** `database/schema.sql`
**Issue:** Missing column for tracking which questions were assigned to each student
**Action:** UPDATE student_exams table definition

**Current (from schema.sql around line 180):**
```sql
CREATE TABLE student_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_schedule_id UUID NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,

    -- Questions and answers
    questions JSONB NOT NULL,
    answers JSONB DEFAULT '{}',
    -- ... rest of table
);
```

**Updated (ADD this line):**
```sql
CREATE TABLE student_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_schedule_id UUID NOT NULL REFERENCES exam_schedules(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    exam_id UUID NOT NULL REFERENCES exams(id) ON DELETE CASCADE,

    -- Questions and answers
    questions JSONB NOT NULL,
    assigned_questions JSONB,  -- ← ADD THIS LINE
    answers JSONB DEFAULT '{}',

    -- Results
    score INTEGER DEFAULT 0,
    total_marks INTEGER NOT NULL,
    percentage INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress',

    -- Timing
    started_at TIMESTAMP,
    submitted_at TIMESTAMP,
    time_spent INTEGER DEFAULT 0,

    -- Proctoring data
    tab_switch_count INTEGER DEFAULT 0,
    fullscreen_exits INTEGER DEFAULT 0,
    ip_address INET,
    user_agent TEXT,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Create a migration file for this:**

**File:** `backend/migrations/009_add_assigned_questions.sql`
```sql
ALTER TABLE student_exams ADD COLUMN IF NOT EXISTS assigned_questions JSONB;
```

---

## Fix #3: Support External Students in Activity Logs

**File:** `backend/src/routes/auth.ts` (Update line ~440 OAuth/student login)

**Issue:** Activity logs don't track external student logins

**Add this table to schema.sql if missing:**
```sql
-- Update activity_logs to support external students
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS external_student_id UUID;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
```

---

## Fix #4: Hash Exam Schedule Login Credentials

**File:** `backend/src/routes/schedules.ts`

**Current Code (INSECURE - line ~200):**
```typescript
let loginPassword = generateRandomPassword();
// ... later
`INSERT INTO exam_schedules (..., login_password, ...)
VALUES ($..., '${loginPassword}', ...)`  // ← PLAIN TEXT!
```

**Updated Code (SECURE):**
```typescript
import bcrypt from 'bcryptjs';

// Generate random password
const generateSecurePassword = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// In schedule creation:
const loginUsername = generateScheduleUsername(student.full_name);
const plainPassword = generateSecurePassword();
const hashedPassword = await bcrypt.hash(plainPassword, 10);

// Insert with HASHED password
await client.query(
  `INSERT INTO exam_schedules (
    exam_id, student_id, scheduled_date, start_time, end_time,
    timezone, login_username, login_password, status
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled')
  RETURNING *`,
  [examId, studentId, date, startTime, endTime, tz,
   loginUsername, hashedPassword]  // ← HASHED
);

// Return plain password to send via email (one-time)
return {
  username: loginUsername,
  password: plainPassword,  // ← Send only once to email
  scheduleId: schedule.id
};
```

**Update student login verification:**

**File:** `backend/src/routes/auth.ts` - Student login endpoint

```typescript
// Before (INSECURE):
const storedPassword = row.login_password;
if (password !== storedPassword) {  // Plain text comparison
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
}

// After (SECURE):
const isValidPassword = await bcrypt.compare(password, row.login_password);
if (!isValidPassword) {
  return res.status(401).json({ success: false, message: 'Invalid credentials' });
}
```

---

## Fix #5: Standardize API Response Format

**File:** `backend/src/utils/apiResponse.ts` (CREATE NEW FILE)

```typescript
import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
  errorCode?: string;
  timestamp: string;
}

export class ApiResponseHandler {
  static success<T>(
    res: Response,
    data: T,
    message: string = 'Success',
    statusCode: number = 200
  ) {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  static created<T>(
    res: Response,
    data: T,
    message: string = 'Resource created'
  ) {
    this.success(res, data, message, 201);
  }

  static noContent(res: Response) {
    res.status(204).send();
  }

  static error(
    res: Response,
    message: string,
    statusCode: number = 500,
    errorCode?: string,
    errors?: Array<{ field: string; message: string }>
  ) {
    res.status(statusCode).json({
      success: false,
      message,
      errorCode: errorCode || `ERR_${statusCode}`,
      errors: errors || undefined,
      timestamp: new Date().toISOString(),
    });
  }

  static badRequest(
    res: Response,
    message: string,
    errors?: Array<{ field: string; message: string }>
  ) {
    this.error(res, message, 400, 'VALIDATION_ERROR', errors);
  }

  static unauthorized(res: Response, message: string = 'Unauthorized') {
    this.error(res, message, 401, 'UNAUTHORIZED');
  }

  static forbidden(res: Response, message: string = 'Forbidden') {
    this.error(res, message, 403, 'FORBIDDEN');
  }

  static notFound(res: Response, message: string = 'Not found') {
    this.error(res, message, 404, 'NOT_FOUND');
  }

  static conflict(res: Response, message: string) {
    this.error(res, message, 409, 'CONFLICT');
  }

  static serverError(res: Response, message: string = 'Internal server error') {
    this.error(res, message, 500, 'INTERNAL_SERVER_ERROR');
  }
}
```

**Usage in routes:**

```typescript
// OLD
res.json({ success: true, data: result.rows });

// NEW
ApiResponseHandler.success(res, result.rows);

// OLD
res.status(404).json({ success: false, message: 'Not found' });

// NEW
ApiResponseHandler.notFound(res, 'Exam not found');

// OLD
res.status(201).json({ success: true, message: 'Exam created', data: result.rows[0] });

// NEW
ApiResponseHandler.created(res, result.rows[0], 'Exam created successfully');

// OLD
res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });

// NEW
ApiResponseHandler.badRequest(
  res,
  'Validation failed',
  errors.array().map(e => ({ field: e.param, message: e.msg }))
);

// OLD (for DELETE)
res.json({ success: true, message: 'Deleted' });

// NEW
ApiResponseHandler.noContent(res);  // 204 No Content
```

---

## Fix #6: Standardize Response Field Names (camelCase)

**File:** `backend/src/utils/responseTransformer.ts` (CREATE NEW FILE)

```typescript
/**
 * Transform snake_case database fields to camelCase for API responses
 */

export const toCamelCase = (str: string): string => {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
};

export const transformRecord = (record: any): any => {
  if (!record) return record;
  if (Array.isArray(record)) {
    return record.map(transformRecord);
  }
  if (typeof record !== 'object') return record;

  const transformed = {};
  for (const key in record) {
    const camelKey = toCamelCase(key);
    const value = record[key];

    // Recursively transform nested objects
    if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      transformed[camelKey] = transformRecord(value);
    } else if (Array.isArray(value)) {
      transformed[camelKey] = value.map(item =>
        typeof item === 'object' ? transformRecord(item) : item
      );
    } else {
      transformed[camelKey] = value;
    }
  }
  return transformed;
};
```

**Update all route responses to use this:**

```typescript
// In exams.ts - GET listing
const result = await db.query('SELECT * FROM exams WHERE tutor_id = $1', [tutorId]);
const transformed = transformRecord(result.rows);
ApiResponseHandler.success(res, transformed, 'Exams retrieved');

// In schedules.ts - GET available students
const result = await client.query('SELECT ... FROM students');
const transformed = transformRecord(result.rows);
ApiResponseHandler.success(res, transformed, 'Available students');
```

---

## Fix #7: Populate first_name and last_name on Student Creation

**File:** `backend/src/routes/students.ts`

**Helper function (add at top of file):**
```typescript
const parseFullName = (fullName: string): { firstName: string; lastName: string } => {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };

  // Last part is always last name
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');

  return { firstName, lastName };
};
```

**Update student creation:**

```typescript
// In POST /students
router.post('/', authenticate, requireStudentSlot, async (req, res, next) => {
  try {
    const { fullName, email, phone, categoryId, ... } = req.body;

    // Parse full name
    const { firstName, lastName } = parseFullName(fullName);

    const result = await db.query(
      `INSERT INTO students (
        school_id, category_id, full_name, first_name, last_name,
        email, phone, username, password_hash, ...
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, ...)
      RETURNING *`,
      [schoolId, categoryId, fullName, firstName, lastName,
       email, phone, username, hashedPassword, ...]
    );

    ApiResponseHandler.created(res, transformRecord(result.rows[0]));
  } catch (error) {
    next(error);
  }
});
```

**Also for bulk import in uploads.ts:**
```typescript
// In CSV upload processing
for (const record of records) {
  const fullName = record.full_name || record.fullName;
  const { firstName, lastName } = parseFullName(fullName);

  await client.query(
    `INSERT INTO students (..., first_name, last_name, ...)
     VALUES (..., $x, $y, ...)`,
    [..., firstName, lastName, ...]
  );
}
```

---

## Fix #8: Fix Exam Category Field Type

**File:** `backend/src/routes/exams.ts`

**Issue:** After migration 008, `category` becomes `category_id` (UUID), but validation might still expect string

```typescript
// OLD validation (if it exists):
body('category').trim().notEmpty().optional(),

// NEW validation (for UUID):
body('categoryId').isUUID().optional().withMessage('Invalid category ID format'),
```

**Create migration to fix existing data:**

**File:** `backend/migrations/009_fix_exam_categories.sql`

```sql
-- Ensure exam_categories table exists with proper structure
CREATE TABLE IF NOT EXISTS exam_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    color VARCHAR(7) DEFAULT '#4F46E5',
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(school_id, name)
);

-- Ensure exams table has category_id
ALTER TABLE exams DROP COLUMN IF EXISTS category;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES exam_categories(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_exams_category ON exams(category_id);
```

---

## Fix #9: Populate assigned_questions on Schedule Creation

**File:** `backend/src/routes/schedules.ts`

**Location:** Find the section that creates exam_schedules and student_exams records

**Current (INCOMPLETE):**
```typescript
// Create schedule
const scheduleResult = await client.query(
  `INSERT INTO exam_schedules (...) VALUES (...) RETURNING *`,
  [...]
);

// Create student exam record
await client.query(
  `INSERT INTO student_exams (exam_schedule_id, student_id, exam_id, ...)
   VALUES ($1, $2, $3, ...)`,
  [scheduleId, studentId, examId, ...]
);
```

**Updated (CORRECT):**
```typescript
import { pool } from "../config/database";

// Step 1: Get all questions for exam
const questionsResult = await client.query(
  `SELECT id, marks, correct_answer, question_type
   FROM questions
   WHERE exam_id = $1
   ORDER BY sort_order ASC`,
  [examId]
);

const allQuestions = questionsResult.rows;

// Step 2: If shuffling, randomize
let assignedQuestions = allQuestions;
if (exam.shuffle_questions) {
  assignedQuestions = allQuestions.sort(() => Math.random() - 0.5);
}

// Step 3: Extract question IDs and metadata
const assignedQuestionsData = assignedQuestions.map(q => ({
  id: q.id,
  marks: q.marks,
  correct_answer: q.correct_answer,
  question_type: q.question_type
}));

// Step 4: Create schedule
const scheduleResult = await client.query(
  `INSERT INTO exam_schedules (
    exam_id, student_id, scheduled_date, start_time, end_time,
    timezone, login_username, login_password, status
  ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'scheduled')
  RETURNING *`,
  [examId, studentId, date, startTime, endTime, tz, username, hashedPassword]
);

const schedule = scheduleResult.rows[0];

// Step 5: Create student exam record WITH assigned_questions
await client.query(
  `INSERT INTO student_exams (
    exam_schedule_id, student_id, exam_id,
    questions, assigned_questions,
    total_marks, status
  ) VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
  [
    schedule.id,
    studentId,
    examId,
    JSON.stringify([]),  // Will be filled when student starts exam
    JSON.stringify(assignedQuestionsData)  // ← NOW POPULATED!
  ]
);
```

---

# PHASE 2: HIGH PRIORITY FIXES

## Fix #10: Add Missing Database Indexes

**File:** `database/schema.sql` or `backend/migrations/010_add_missing_indexes.sql`

```sql
-- Performance indexes for frequently queried fields
CREATE INDEX IF NOT EXISTS idx_exams_school ON exams(school_id);
CREATE INDEX IF NOT EXISTS idx_exams_tutor ON exams(tutor_id);
CREATE INDEX IF NOT EXISTS idx_exams_category ON exams(category_id);

CREATE INDEX IF NOT EXISTS idx_exam_schedules_exam ON exam_schedules(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_student ON exam_schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_status ON exam_schedules(status);
CREATE INDEX IF NOT EXISTS idx_exam_schedules_composite ON exam_schedules(exam_id, student_id, status);

CREATE INDEX IF NOT EXISTS idx_student_exams_exam ON student_exams(exam_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_student ON student_exams(student_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_schedule ON student_exams(exam_schedule_id);
CREATE INDEX IF NOT EXISTS idx_student_exams_status ON student_exams(status);

CREATE INDEX IF NOT EXISTS idx_questions_exam ON questions(exam_id);

CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_students_category ON students(category_id);
CREATE INDEX IF NOT EXISTS idx_students_school_category ON students(school_id, category_id);

CREATE INDEX IF NOT EXISTS idx_external_students_tutor_school ON external_students(tutor_id, school_id);
```

---

## Fix #11: Add Input Validation Middleware

**File:** `backend/src/middleware/validation.ts` (CREATE NEW)

```typescript
import { body, query, param, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { ApiResponseHandler } from '../utils/apiResponse';

// Validation check middleware
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return ApiResponseHandler.badRequest(
      res,
      'Validation failed',
      errors.array().map(({ param, msg }) => ({
        field: param,
        message: msg,
      }))
    );
  }
  next();
};

// Common validations
export const commonValidations = {
  uuid: () => param('id').isUUID().withMessage('Invalid ID format'),

  email: () => body('email').isEmail().withMessage('Invalid email format'),

  password: () => body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),

  examTitle: () => body('title')
    .trim()
    .notEmpty()
    .withMessage('Exam title is required')
    .isLength({ max: 255 })
    .withMessage('Exam title cannot exceed 255 characters'),

  duration: () => body('duration')
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1 and 480 minutes'),

  passingScore: () => body('passingScore')
    .isInt({ min: 0, max: 100 })
    .withMessage('Passing score must be between 0 and 100'),

  categoryId: () => body('categoryId')
    .isUUID()
    .optional()
    .withMessage('Invalid category ID format'),
};
```

**Usage in routes:**

```typescript
// In exams.ts
router.post(
  '/',
  authenticate,
  authorize('tutor'),
  [
    body('title').trim().notEmpty().isLength({ max: 255 }),
    body('duration').isInt({ min: 1, max: 480 }),
    body('totalQuestions').isInt({ min: 1 }),
    body('passingScore').isInt({ min: 0, max: 100 }),
    body('categoryId').isUUID().optional(),
    handleValidationErrors,
  ],
  async (req, res, next) => {
    // handler
  }
);
```

---

## Fix #12: Validate Environment Variables on Startup

**File:** `backend/src/config/env.ts` (CREATE NEW)

```typescript
export interface EnvConfig {
  // Server
  PORT: number;
  NODE_ENV: 'development' | 'production' | 'test';

  // Database
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;

  // Auth
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;

  // Frontend
  FRONTEND_URL: string;

  // Email
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_FROM_EMAIL?: string;

  // Stripe
  STRIPE_SECRET_KEY?: string;
  STRIPE_PUBLISHABLE_KEY?: string;

  // Paystack
  PAYSTACK_SECRET_KEY?: string;

  // OpenAI
  OPENAI_API_KEY?: string;

  // Resend
  RESEND_API_KEY?: string;
}

const requiredEnvVars = [
  'JWT_SECRET',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
];

const optionalEnvVars = [
  'STRIPE_SECRET_KEY',
  'PAYSTACK_SECRET_KEY',
  'OPENAI_API_KEY',
  'SMTP_HOST',
  'RESEND_API_KEY',
];

function validateEnvVars(): EnvConfig {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    console.error(
      '❌ FATAL: Missing required environment variables:',
      missing.join(', ')
    );
    console.error('Server will not start.');
    process.exit(1);
  }

  console.log('✅ All required environment variables are set');

  const warnings: string[] = [];
  for (const envVar of optionalEnvVars) {
    if (!process.env[envVar]) {
      warnings.push(envVar);
    }
  }

  if (warnings.length > 0) {
    console.warn(
      '⚠️  WARNING: Optional environment variables not set:',
      warnings.join(', ')
    );
  }

  return {
    PORT: parseInt(process.env.PORT || '5000'),
    NODE_ENV: (process.env.NODE_ENV || 'development') as any,
    DB_HOST: process.env.DB_HOST!,
    DB_PORT: parseInt(process.env.DB_PORT || '5432'),
    DB_NAME: process.env.DB_NAME!,
    DB_USER: process.env.DB_USER!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_SSL: process.env.DB_SSL === 'true',
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : undefined,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASSWORD: process.env.SMTP_PASSWORD,
    SMTP_FROM_EMAIL: process.env.SMTP_FROM_EMAIL,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_PUBLISHABLE_KEY: process.env.STRIPE_PUBLISHABLE_KEY,
    PAYSTACK_SECRET_KEY: process.env.PAYSTACK_SECRET_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  };
}

export const config = validateEnvVars();
```

**Update server.ts:**

```typescript
// At the very top of server.ts, before anything else
import { config } from './config/env';

// Validate env vars first
console.log('🔍 Validating environment configuration...');
// config is already validated by the import

const PORT = config.PORT;
```

---

## Fix #13: Schedule Auto-Expiry with Timezone Support

**File:** `backend/src/utils/dateUtils.ts` (CREATE NEW)

```typescript
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezone);

export const isScheduleExpired = (
  scheduledDate: string,
  endTime: string,
  tz: string = 'Africa/Lagos'
): boolean => {
  try {
    // Create end time in the specified timezone
    const [h, m] = (endTime || '23:59').split(':');
    const endDateTime = dayjs.tz(
      `${scheduledDate} ${h}:${m}`,
      'YYYY-MM-DD HH:mm',
      tz
    );

    // Compare with current time in that timezone
    const now = dayjs.tz(tz);
    return now.isAfter(endDateTime);
  } catch (error) {
    console.error('Error in isScheduleExpired:', error);
    return false;  // Default to not expired on error
  }
};

export const getScheduleEndDateTime = (
  scheduledDate: string,
  endTime: string,
  tz: string = 'Africa/Lagos'
): dayjs.Dayjs => {
  const [h, m] = (endTime || '23:59').split(':');
  return dayjs.tz(
    `${scheduledDate} ${h}:${m}`,
    'YYYY-MM-DD HH:mm',
    tz
  );
};

export const getTimeUntilExpiry = (
  scheduledDate: string,
  endTime: string,
  tz: string = 'Africa/Lagos'
):number => {
  const endDateTime = getScheduleEndDateTime(scheduledDate, endTime, tz);
  const now = dayjs.tz(tz);
  return endDateTime.diff(now, 'milliseconds');
};
```

**Update schedules.ts auto-expiry function:**

```typescript
import { isScheduleExpired } from '../utils/dateUtils';

// Replace the old isScheduleExpired function with import from utils
// Remove the old manual implementation

async function autoExpireSchedules(
  client: any,
  examId?: string,
  studentId?: string
) {
  let query = `
    SELECT es.id, es.exam_id, es.student_id, es.scheduled_date, es.end_time, es.timezone,
           e.total_questions as total_marks, e.passing_score
    FROM exam_schedules es
    JOIN exams e ON es.exam_id = e.id
    WHERE es.status = 'scheduled'
  `;
  const params: any[] = [];

  if (examId) {
    params.push(examId);
    query += ` AND es.exam_id = $${params.length}`;
  }
  if (studentId) {
    params.push(studentId);
    query += ` AND es.student_id = $${params.length}`;
  }

  const result = await client.query(query, params);

  for (const row of result.rows) {
    // Use proper timezone-aware expiry check
    if (isScheduleExpired(row.scheduled_date, row.end_time, row.timezone)) {
      await client.query(
        `UPDATE exam_schedules SET status = 'expired', updated_at = NOW() WHERE id = $1`,
        [row.id]
      );

      // Create result record if doesn't exist
      const existing = await client.query(
        `SELECT id FROM student_exams WHERE exam_schedule_id = $1`,
        [row.id]
      );

      if (existing.rows.length === 0) {
        await client.query(
          `INSERT INTO student_exams (
            student_id, exam_id, exam_schedule_id,
            score, total_marks, percentage, status, time_spent, answers
          ) VALUES ($1, $2, $3, 0, $4, 0, 'expired', 0, '[]')`,
          [row.student_id, row.exam_id, row.id, row.total_marks || 0]
        );
      }
    }
  }
}
```

---

Continue to PHASE 3 in next document...

