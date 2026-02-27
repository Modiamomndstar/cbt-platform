# CBT Platform - Implementation Guide Part 2

## Fix #14: Fix Answer Validation for Different Question Types

**File:** `backend/src/routes/results.ts`

**Current Code (INCORRECT - line ~110-140):**
```typescript
let isCorrect = false;
let marksObtained = 0;
const qMarks = parseFloat(question.marks) || 0;

if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
  isCorrect = studentAnswer.toLowerCase() === question.correct_answer.toLowerCase();
  marksObtained = isCorrect ? qMarks : 0;
} else if (question.question_type === "theory") {
  marksObtained = 0;
  isCorrect = false;
} else if (question.question_type === "fill_blank") {
  isCorrect = studentAnswer.toLowerCase().trim() === question.correct_answer.toLowerCase().trim();
  marksObtained = isCorrect ? qMarks : 0;
}
```

**Updated Code (CORRECT):**
```typescript
import { validateAnswer } from '../utils/answerValidator';

// In the answer processing loop:
let isCorrect = false;
let marksObtained = 0;
const qMarks = parseFloat(question.marks) || 0;

try {
  const validationResult = validateAnswer(
    studentAnswer,
    question.correct_answer,
    question.question_type,
    question.options
  );

  isCorrect = validationResult.isCorrect;
  marksObtained = isCorrect ? qMarks : 0;
} catch (error) {
  console.error(`Error validating answer for question ${question.id}:`, error);
  isCorrect = false;
  marksObtained = 0;
}
```

**File:** `backend/src/utils/answerValidator.ts` (CREATE NEW)

```typescript
export interface AnswerValidationResult {
  isCorrect: boolean;
  reason?: string;
}

export interface QuestionOption {
  label?: string;
  text: string;
  isCorrect?: boolean;
}

/**
 * Validate a student's answer based on question type
 */
export const validateAnswer = (
  studentAnswer: string | number | any,
  correctAnswer: string | number | any,
  questionType: string,
  options?: QuestionOption[] | any[]
): AnswerValidationResult => {
  // Normalize inputs
  const normalizeText = (text: any): string => {
    if (text === null || text === undefined) return '';
    return String(text).toLowerCase().trim();
  };

  try {
    switch (questionType) {
      case 'multiple_choice':
        return validateMultipleChoice(studentAnswer, correctAnswer, options);

      case 'true_false':
        return validateTrueFalse(studentAnswer, correctAnswer);

      case 'fill_blank':
        return validateFillBlank(studentAnswer, correctAnswer);

      case 'theory':
        // Theory needs manual grading
        return { isCorrect: false, reason: 'Theory questions require manual grading' };

      default:
        return { isCorrect: false, reason: `Unknown question type: ${questionType}` };
    }
  } catch (error) {
    console.error('Error in validateAnswer:', error);
    return { isCorrect: false, reason: 'Validation error' };
  }
};

function validateMultipleChoice(
  studentAnswer: any,
  correctAnswer: any,
  options?: any[]
): AnswerValidationResult {
  // Normalize both answers
  const student = String(studentAnswer).toLowerCase().trim();
  const correct = String(correctAnswer).toLowerCase().trim();

  // Check if it's an index-based answer (0, 1, 2, etc.)
  if (/^\d+$/.test(correct)) {
    const correctIndex = parseInt(correct);
    const studentIndex = parseInt(student);

    if (!options || !Array.isArray(options)) {
      return {
        isCorrect: false,
        reason: 'Options not provided for index validation'
      };
    }

    if (studentIndex < 0 || studentIndex >= options.length) {
      return {
        isCorrect: false,
        reason: `Invalid option index: ${studentIndex}`
      };
    }

    return { isCorrect: studentIndex === correctIndex };
  }

  // Text-based comparison
  return { isCorrect: student === correct };
}

function validateTrueFalse(
  studentAnswer: any,
  correctAnswer: any
): AnswerValidationResult {
  const student = String(studentAnswer).toLowerCase().trim();
  const correct = String(correctAnswer).toLowerCase().trim();

  // Normalize common true/false representations
  const trueValues = ['true', 'yes', '1', 't', 'y'];
  const falseValues = ['false', 'no', '0', 'f', 'n'];

  const isStudentTrue = trueValues.includes(student);
  const isStudentFalse = falseValues.includes(student);
  const isCorrectTrue = trueValues.includes(correct);
  const isCorrectFalse = falseValues.includes(correct);

  if (!(isStudentTrue || isStudentFalse)) {
    return {
      isCorrect: false,
      reason: 'Invalid true/false answer format'
    };
  }

  if (isStudentTrue && isCorrectTrue) return { isCorrect: true };
  if (isStudentFalse && isCorrectFalse) return { isCorrect: true };

  return { isCorrect: false };
}

function validateFillBlank(
  studentAnswer: any,
  correctAnswer: any
): AnswerValidationResult {
  const student = String(studentAnswer).toLowerCase().trim();
  const correct = String(correctAnswer).toLowerCase().trim();

  // Check for exact match first
  if (student === correct) return { isCorrect: true };

  // Allow slight variations (whitespace, punctuation)
  const normalizeText = (text: string) => {
    return text.replace(/\s+/g, ' ').replace(/[.,!?;:'-]/g, '').toLowerCase();
  };

  if (normalizeText(student) === normalizeText(correct)) {
    return { isCorrect: true };
  }

  return { isCorrect: false };
}
```

---

## Fix #15: Add Proper Pagination to All List Endpoints

**File:** `backend/src/middleware/paginate.ts` (CREATE NEW)

```typescript
import { Request, Response, NextFunction } from 'express';

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const parsePagination = (req: Request): PaginationParams => {
  let page = parseInt(req.query.page as string) || 1;
  let limit = parseInt(req.query.limit as string) || DEFAULT_LIMIT;

  // Validate
  if (page < 1) page = 1;
  if (limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

export const buildPaginatedResponse = <T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): PaginatedResponse<T> => {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
};
```

**Usage in routes - Example (students.ts):**

```typescript
import { parsePagination, buildPaginatedResponse } from '../middleware/paginate';

// GET /students
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const { categoryId, search } = req.query;
    const { schoolId, tutorId, role } = req.user!;

    // Build query
    let sql = `SELECT s.id, s.student_id, s.full_name, s.email, s.category_id, ...
               FROM students s
               WHERE s.school_id = $1 AND s.is_active = true`;
    let countSql = `SELECT COUNT(*) as total FROM students s WHERE s.school_id = $1 AND s.is_active = true`;
    const params: any[] = [schoolId];
    let paramCount = 2;

    // Apply filters
    if (categoryId) {
      sql += ` AND s.category_id = $${paramCount}`;
      countSql += ` AND s.category_id = $${paramCount}`;
      params.push(categoryId);
      paramCount++;
    }

    if (search) {
      sql += ` AND (s.full_name ILIKE $${paramCount} OR s.email ILIKE $${paramCount})`;
      countSql += ` AND (s.full_name ILIKE $${paramCount} OR s.email ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    // Get total count
    const countResult = await db.query(countSql, params);
    const total = parseInt(countResult.rows[0].total);

    // Get paginated data
    sql += ` ORDER BY s.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    const result = await db.query(sql, [...params, limit, offset]);

    const paginated = buildPaginatedResponse(result.rows, total, page, limit);
    ApiResponseHandler.success(res, paginated, 'Students retrieved');
  } catch (error) {
    next(error);
  }
});
```

---

## Fix #16: Add Audit Logging for Admin Actions

**File:** `backend/src/utils/auditLog.ts` (CREATE NEW)

```typescript
import { db } from '../config/database';

export interface AuditLogEntry {
  userId: string;
  userType: 'school' | 'tutor' | 'student' | 'super_admin';
  schoolId?: string;
  action: string;
  resourceType: string;
  resourceId: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  changes?: string;
}

export const logAuditEntry = async (entry: AuditLogEntry): Promise<void> => {
  try {
    await db.query(
      `INSERT INTO audit_logs (
        user_id, user_type, school_id, action, resource_type, resource_id,
        old_values, new_values, ip_address, user_agent, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        entry.userId,
        entry.userType,
        entry.schoolId || null,
        entry.action,
        entry.resourceType,
        entry.resourceId,
        entry.oldValues ? JSON.stringify(entry.oldValues) : null,
        entry.newValues ? JSON.stringify(entry.newValues) : null,
        entry.ipAddress || null,
        entry.userAgent || null,
      ]
    );
  } catch (error) {
    console.error('Failed to log audit entry:', error);
    // Don't throw - audit logging shouldn't break business logic
  }
};

export const getAuditLogs = async (
  schoolId: string,
  filters?: {
    userId?: string;
    resourceType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<any[]> => {
  let sql = `SELECT * FROM audit_logs WHERE school_id = $1`;
  const params: any[] = [schoolId];
  let paramCount = 2;

  if (filters?.userId) {
    sql += ` AND user_id = $${paramCount++}`;
    params.push(filters.userId);
  }

  if (filters?.resourceType) {
    sql += ` AND resource_type = $${paramCount++}`;
    params.push(filters.resourceType);
  }

  if (filters?.startDate) {
    sql += ` AND created_at >= $${paramCount++}`;
    params.push(filters.startDate);
  }

  if (filters?.endDate) {
    sql += ` AND created_at <= $${paramCount++}`;
    params.push(filters.endDate);
  }

  sql += ` ORDER BY created_at DESC`;

  if (filters?.limit) {
    sql += ` LIMIT $${paramCount++}`;
    params.push(filters.limit);
  }

  if (filters?.offset) {
    sql += ` OFFSET $${paramCount}`;
    params.push(filters.offset);
  }

  const result = await db.query(sql, params);
  return result.rows;
};
```

**Add audit_logs table to schema:**

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    resource_type VARCHAR(255) NOT NULL,
    resource_id VARCHAR(255) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_audit_school (school_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_resource (resource_type, resource_id),
    INDEX idx_audit_created (created_at)
);
```

**Usage in routes - Example (updating student):**

```typescript
import { logAuditEntry } from '../utils/auditLog';
import { ApiResponseHandler } from '../utils/apiResponse';

router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { user } = req;

    // Get old values
    const oldResult = await db.query('SELECT * FROM students WHERE id = $1', [id]);
    const oldValues = oldResult.rows[0];

    // Update student
    // ... update logic ...

    const newResult = await db.query('SELECT * FROM students WHERE id = $1', [id]);
    const newValues = newResult.rows[0];

    // Log audit entry
    await logAuditEntry({
      userId: user!.id,
      userType: user!.role,
      schoolId: user!.schoolId,
      action: 'UPDATE',
      resourceType: 'STUDENT',
      resourceId: id,
      oldValues,
      newValues,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    ApiResponseHandler.success(res, newValues, 'Student updated');
  } catch (error) {
    next(error);
  }
});
```

---

## Fix #17: Implement Proper Error Handling Middleware

**File:** `backend/src/middleware/errorHandler.ts` (CREATE NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { ApiResponseHandler } from '../utils/apiResponse';

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public errorCode: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  if (error instanceof AppError) {
    logger.warn(`${error.statusCode} - ${error.errorCode}: ${error.message}`);
  } else {
    logger.error('Unhandled error:', error);
  }

  // Handle AppError
  if (error instanceof AppError) {
    return ApiResponseHandler.error(
      res,
      error.message,
      error.statusCode,
      error.errorCode
    );
  }

  // Handle specific error types
  if (error.name === 'ValidationError') {
    return ApiResponseHandler.badRequest(res, error.message);
  }

  if (error.name === 'UnauthorizedError') {
    return ApiResponseHandler.unauthorized(res);
  }

  if (error.name === 'NotFoundError') {
    return ApiResponseHandler.notFound(res, error.message);
  }

  // Database errors
  if (error.message.includes('duplicate key')) {
    return ApiResponseHandler.conflict(
      res,
      'This resource already exists'
    );
  }

  // Default to 500
  ApiResponseHandler.serverError(
    res,
    process.env.NODE_ENV === 'production'
      ? 'An error occurred'
      : error.message
  );
};

export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  ApiResponseHandler.notFound(res, `Route ${req.method} ${req.path} not found`);
};
```

**Update server.ts to use error handler:**

```typescript
// At the end of server.ts, after all route handlers:

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`✅ Server running on http://localhost:${PORT}`);
});
```

---

## Fix #18: Add Request ID Tracking and Response Logging

**File:** `backend/src/middleware/requestTracking.ts` (CREATE NEW)

```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

export const requestTracking = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Add request ID
  req.id = req.headers['x-request-id'] as string || uuidv4();
  req.startTime = Date.now();

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);

  // Log request
  logger.info(`[${req.id}] ${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    params: req.query,
  });

  // Intercept response to log it
  const originalJson = res.json.bind(res);
  res.json = function (data: any) {
    const duration = Date.now() - req.startTime;
    const statusCode = res.statusCode;

    // Log response
    logger.info(`[${req.id}] Response ${statusCode}`, {
      duration: `${duration}ms`,
      size: JSON.stringify(data).length,
    });

    return originalJson(data);
  };

  next();
};
```

**Add to server.ts:**

```typescript
import { requestTracking } from './middleware/requestTracking';

// Add after body parser middleware
app.use(requestTracking);
```

---

# PHASE 3: IMPORTANT FIXES

## Fix #19: Standardize Query Parameters

**File:** `backend/src/routes/students.ts`, `backend/src/routes/schedules.ts`, etc.

**Consistent Query Params:**

```typescript
// All list endpoints should support:
// - page (number, default: 1)
// - limit (number, default: 20, max: 100)
// - sortBy (string, default: 'created_at')
// - sortOrder (asc|desc, default: 'desc')
// - {field}Filters (specific to endpoint)

// Example for /students:
// GET /students?page=1&limit=20&categoryId=...&search=...&sortBy=created_at&sortOrder=desc

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const { categoryId, search, sortBy = 'created_at', sortOrder = 'desc' } = req.query;

    // Validate sortBy to prevent SQL injection
    const ALLOWED_SORTS = ['created_at', 'full_name', 'email', 'student_id'];
    const sort = ALLOWED_SORTS.includes(sortBy as string) ? sortBy : 'created_at';
    const order = sortOrder === 'asc' ? 'ASC' : 'DESC';

    let sql = `SELECT ... FROM students WHERE ... ORDER BY ${sort} ${order} LIMIT $x OFFSET $y`;

    // ...rest of implementation
  } catch (error) {
    next(error);
  }
});
```

---

## Fix #20: Input Sanitization Helper

**File:** `backend/src/utils/sanitizer.ts` (CREATE NEW)

```typescript
import DOMPurify from 'isomorphic-dompurify';

export const sanitizeString = (input: string, maxLength: number = 1000): string => {
  if (!input) return '';

  // Remove XSS attacks
  let sanitized = DOMPurify.sanitize(input);

  // Trim whitespace
  sanitized = sanitized.trim();

  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
};

export const sanitizeEmail = (email: string): string => {
  return email.toLowerCase().trim();
};

export const sanitizeObject = (obj: any, maxLength: number = 1000): any => {
  if (!obj) return obj;

  switch (typeof obj) {
    case 'string':
      return sanitizeString(obj, maxLength);
    case 'object':
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item, maxLength));
      } else {
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          sanitized[key] = sanitizeObject(value as any, maxLength);
        }
        return sanitized;
      }
    default:
      return obj;
  }
};
```

---

# TESTING CHECKLIST

Create `backend/tests/integration.test.ts`:

```typescript
import request from 'supertest';
import app from '../src/server';

describe('API Integration Tests', () => {
  describe('Error Responses', () => {
    test('Should return 400 for validation errors', async () => {
      const res = await request(app)
        .post('/api/exams')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ title: '' }); // Empty title

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errorCode).toBe('VALIDATION_ERROR');
    });

    test('Should return 401 for unauthorized access', async () => {
      const res = await request(app)
        .get('/api/students');

      expect(res.statusCode).toBe(401);
      expect(res.body.errorCode).toBe('UNAUTHORIZED');
    });

    test('Should return 404 for non-existent resources', async () => {
      const res = await request(app)
        .get('/api/students/non-existent-id')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('Pagination', () => {
    test('Should return paginated results', async () => {
      const res = await request(app)
        .get('/api/students?page=1&limit=10')
        .set('Authorization', `Bearer ${validToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(typeof res.body.pagination.total).toBe('number');
      expect(typeof res.body.pagination.hasMore).toBe('boolean');
    });
  });

  describe('Answer Validation', () => {
    test('Should correctly validate MCQ answers', async () => {
      // Test implementation
    });

    test('Should correctly validate true/false answers', async () => {
      // Test implementation
    });
  });
});
```

---

# DEPLOYMENT VERIFICATION CHECKLIST

Before deploying to production:

- [ ] All 20 critical/high issues are fixed
- [ ] All tests passing
- [ ] Database migrations run successfully
- [ ] Environment variables validated
- [ ] API responses standardized to camelCase
- [ ] All list endpoints support pagination
- [ ] Error responses consistent
- [ ] Audit logging working
- [ ] Request tracking working
- [ ] Passwords hashed (not plain text)
- [ ] Input sanitization in place
- [ ] Rate limiting active
- [ ] CORS properly configured
- [ ] Database indexes created
- [ ] Backups configured
- [ ] Monitoring setup
- [ ] Load testing completed
- [ ] Security audit done

---

# TIMELINE ESTIMATE

| Phase | Fixes | Effort | Days |
|-------|-------|--------|------|
| Phase 1 | Critical (9) | High | 2-3 |
| Phase 2 | High Priority (8) | Medium | 2-3 |
| Phase 3 | Important (3) | Low | 1 |
| Testing | All phases | High | 1-2 |
| **TOTAL** | **20** | | **6-9** |

---

