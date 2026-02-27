# CBT Platform - Production Readiness Action Plan

## Executive Summary

Your CBT platform has **20 critical to important issues** preventing production deployment. This document provides a prioritized action plan to fix them all in 6-9 days.

**Current Status:** ❌ NOT PRODUCTION READY
**Severity:** 🔴 CRITICAL (9 issues), 🟠 HIGH (8 issues), 🟡 MEDIUM (3 issues)

---

## Quick Reference: All Issues at a Glance

| # | Issue | Severity | Category | Est. Fix |
|---|-------|----------|----------|----------|
| 1 | activity_logs table inconsistency | 🔴 CRITICAL | DB Schema | 0.5h |
| 2 | API naming (camelCase vs snake_case) | 🔴 CRITICAL | Data Format | 3h |
| 3 | assigned_questions field missing | 🔴 CRITICAL | Business Logic | 2h |
| 4 | first_name/last_name inconsistency | 🔴 CRITICAL | Data Model | 2h |
| 5 | Exam category confusion | 🔴 CRITICAL | DB Schema | 1h |
| 6 | external_students table missing | 🔴 CRITICAL | DB Schema | 1h |
| 7 | Inconsistent error responses | 🔴 CRITICAL | API Contract | 2h |
| 8 | Insecure password storage | 🔴 CRITICAL | Security | 1.5h |
| 9 | Missing input validation | 🔴 CRITICAL | Security | 2h |
| 10 | Missing database indexes | 🟠 HIGH | Performance | 1h |
| 11 | No audit trail | 🟠 HIGH | Logging | 1.5h |
| 12 | Pagination inconsistencies | 🟠 HIGH | API | 2h |
| 13 | Improper HTTP status codes | 🟠 HIGH | API | 1.5h |
| 14 | Env vars not validated | 🟠 HIGH | Config | 1h |
| 15 | Schedule expiry timezone issues | 🟠 HIGH | Business Logic | 1.5h |
| 16 | Answer validation logic broken | 🟠 HIGH | Business Logic | 2h |
| 17 | No request logging | 🟠 HIGH | Monitoring | 1h |
| 18 | Race condition in schedules | 🟠 HIGH | Data Integrity | 1h |
| 19 | Query param naming inconsistent | 🟡 MEDIUM | API | 1h |
| 20 | No input sanitization | 🟡 MEDIUM | Security | 1.5h |
| **TOTAL** | | | | **~32 hours** |

---

## Phase 1: Critical Issues (Days 1-3)

### Day 1: Database Schema & Security

**Morning:**
- [ ] Fix #1: Verify activity_logs table (`backend/src/config/database.ts` check)
- [ ] Fix #6: Add external_students table to `database/schema.sql`
- [ ] Fix #5: Fix exam_categories relationship
- [ ] Create `backend/migrations/009_critical_fixes.sql`

**Afternoon:**
- [ ] Fix #8: Hash passwords in exam schedules (update `schedules.ts`)
- [ ] Fix #3: Add `assigned_questions` column
- [ ] Test all migrations run without errors

**Verification:**
```bash
npm run db:migrate
# Verify all tables exist using:
psql -d cbt_platform -c "\dt"
```

---

### Day 2: Data Model & API Contract

**Morning:**
- [ ] Fix #4: Parse and populate first_name/last_name (add helper in `students.ts`)
- [ ] Create `backend/src/utils/responseTransformer.ts`
- [ ] Fix #2: Standardize API responses to camelCase

**Afternoon:**
- [ ] Fix #7: Create standardized error response handler (`apiResponse.ts`)
- [ ] Fix #9: Add validation middleware (`validation.ts`)
- [ ] Update existing route handlers to use new response format

**Testing:**
```bash
# Test API responses have correct format
npm run test:integration
```

---

### Day 3: Business Logic & Validation

**Morning:**
- [ ] Fix #3: Populate assigned_questions on schedule creation
- [ ] Create answer validator (`answerValidator.ts`)
- [ ] Fix #16: Update results.ts to use new validator

**Afternoon:**
- [ ] Fix #9: Add input validation to all POST/PUT routes
- [ ] Create validation middleware with common patterns
- [ ] Test with invalid inputs

---

## Phase 2: High Priority Issues (Days 4-5)

### Day 4: Performance & Pagination

**Morning:**
- [ ] Fix #10: Add database indexes
- [ ] Fix #12: Implement pagination middleware
- [ ] Update all GET endpoints to support pagination

**Afternoon:**
- [ ] Fix #13: Use proper HTTP status codes
- [ ] Fix #14: Validate environment variables on startup
- [ ] Create `.env.example` with all required variables

---

### Day 5: Monitoring & Data Integrity

**Morning:**
- [ ] Fix #11: Implement audit logging
- [ ] Create audit_logs table
- [ ] Add logging to critical operations

**Afternoon:**
- [ ] Fix #17: Add request tracking middleware
- [ ] Fix #15: Fix timezone handling in schedule expiry
- [ ] Fix #18: Add transaction protection to schedules

---

## Phase 3: Important Issues (Day 6)

- [ ] Fix #19: Standardize query parameter naming (document it)
- [ ] Fix #20: Add input sanitization
- [ ] Update API documentation

---

## Day 7: Testing & Validation

**Full Test Suite:**

```bash
# 1. Run all unit tests
npm test

# 2. Run integration tests
npm run test:integration

# 3. Manual smoke tests
- Login as school admin
- Create exam
- Create schedule
- Submit exam
- Check results

# 4. Load testing (optional for production prep)
npm run test:load

# 5. Security scan
npm audit fix
```

---

## File Summary: What Gets Created/Modified

### New Files Created:
```
backend/src/utils/apiResponse.ts          (API response handler)
backend/src/utils/responseTransformer.ts  (snake_case → camelCase)
backend/src/utils/answerValidator.ts      (Answer validation logic)
backend/src/utils/auditLog.ts            (Audit trail)
backend/src/utils/dateUtils.ts           (Timezone-aware dates)
backend/src/utils/sanitizer.ts           (Input sanitization)
backend/src/middleware/validation.ts     (Input validation)
backend/src/middleware/errorHandler.ts   (Centralized error handling)
backend/src/middleware/requestTracking.ts (Request ID & logging)
backend/src/middleware/paginate.ts       (Pagination)
backend/src/config/env.ts                (Environment validation)
```

### Modified Files:
```
database/schema.sql                       (Add tables, indexes)
backend/migrations/                       (New migration files)
backend/src/server.ts                     (Use new middleware)
backend/src/routes/exams.ts               (Use new response format)
backend/src/routes/schedules.ts           (Populate assigned_questions)
backend/src/routes/students.ts            (Parse first_name/last_name)
backend/src/routes/results.ts             (Use answer validator)
backend/src/routes/auth.ts                (Hash passwords)
backend/src/middleware/auth.ts            (Validate env vars)
frontend/src/services/api.ts              (Handle camelCase responses)
```

---

## Migration Execution Checklist

Before applying any migrations:

```sql
-- 1. Backup existing database
pg_dump cbt_platform > backup_$(date +%Y%m%d_%H%M%S).sql

-- 2. Apply migrations in order
-- 009_critical_fixes.sql (external_students, assigned_questions, category_id)
-- 010_add_missing_indexes.sql (all indexes)
-- 011_audit_logs.sql (audit table)

-- 3. Verify schema
\d students
\d exams
\d exam_schedules
\d student_exams
\d external_students
\d exam_categories
\d audit_logs
```

---

## Environment Variables to Add

Create or update `backend/.env`:

```bash
# Server
PORT=5000
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cbt_platform
DB_USER=postgres
DB_PASSWORD=your_secure_password
DB_SSL=true

# Auth
JWT_SECRET=your_128_char_random_secret_key_here
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=https://yourdomain.com

# Email (required for production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
SMTP_FROM_EMAIL=noreply@yourdomain.com

# Payments (required)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
PAYSTACK_SECRET_KEY=sk_live_...

# AI (optional but recommended)
OPENAI_API_KEY=sk-...

# Email service (alternative to SMTP)
RESEND_API_KEY=re_...
```

---

## Frontend Updates Required

**File:** `frontend/src/services/api.ts`

Add response transformer:

```typescript
// Add after axios instance creation
api.interceptors.response.use(
  (response) => {
    // Transform response fields from snake_case to camelCase
    if (response.data?.data) {
      response.data.data = transformRecord(response.data.data);
    }
    if (response.data?.pagination) {
      response.data.pagination = transformRecord(response.data.pagination);
    }
    return response;
  },
  (error) => Promise.reject(error)
);
```

---

## Deployment Steps

### 1. Pre-Deployment (Day 7 EOD)

```bash
# Build backend
cd backend
npm run build

# Verify no build errors
ls dist/

# Lint check
npm run lint

# Run tests
npm test
```

### 2. Database Migration

```bash
# Connect to production database
PGPASSWORD=$PASSWORD psql -h $HOST -U $USER -d $DB -f backup.sql

# Run migrations
npm run db:migrate

# Verify schema
npm run verify-schema
```

### 3. Deploy Backend

```bash
# Docker build
docker build -t cbt-platform:latest ./backend

# Push to registry
docker push your-registry/cbt-platform:latest

# Docker compose up
docker-compose -f docker-compose.prod.yml up -d
```

### 4. Smoke Tests

```bash
# Test API endpoints
curl -X GET https://api.yourdomain.com/api/health

# Test authentication
curl -X POST https://api.yourdomain.com/api/auth/school/login \
  -d '{"username":"admin","password":"****"}'

# Test schedule creation
# ... manual test
```

### 5. Monitor

```bash
# Check logs
docker logs -f cbt-platform-backend

# Monitor database
# Set up monitoring dashboard
```

---

##  Rollback Plan

If issues occur in production:

```bash
# 1. Rollback database (if migrations failed)
psql -d cbt_platform -f backup_before_migration.sql

# 2. Rollback Docker container
docker-compose -f docker-compose.prod.yml down
docker run docker-image:previous-tag

# 3. Notify users
# Send message that you're investigating

# 4. Debug logs
docker logs cbt-platform-backend > debug.log

# 5. Post-incident review
# Document what went wrong
# Update this checklist
```

---

## Post-Deployment Monitoring

Setup monitoring for:

1. **Application Health**
   - API response times (target: <200ms p95)
   - Error rate (target: <0.1%)
   - Request volume

2. **Database**
   - Query execution time
   - Connection pool usage
   - Slow queries

3. **Business Metrics**
   - Exam submissions
   - Calculation accuracy
   - Payment processing

4. **Security**
   - Failed login attempts
   - SQL injection attempts
   - XSS attempts

---

## Success Criteria

Your platform is production-ready when:

- ✅ All 20 issues fixed and deployed
- ✅ Test coverage >80%
- ✅ Zero critical bugs found in QA
- ✅ Load test passes (1000 concurrent users)
- ✅ All environment variables set
- ✅ Database backups automated
- ✅ Monitoring active
- ✅ Incident response plan documented
- ✅ Security audit passed
- ✅ Performance benchmarks met

---

## Support & Next Steps

1. **Immediate:** Start Phase 1 (Days 1-3)
2. **Review:** Check off each item as completed
3. **Test:** Run full test suite before each phase
4. **Deploy:** Follow deployment steps exactly
5. **Monitor:** Watch dashboards for 24 hours after deploy
6. **Document:** Update this plan as you go

---

## Emergency Contact

If critical issues found in production:

1. **Immediate:** Roll back to previous version
2. **Within 1hr:** Identify root cause
3. **Within 4hrs:** Deploy fix or workaround
4. **Within 24hrs:** Post-incident review

---

**Document Updated:** February 25, 2026
**Next Review:** After Phase 1 completion
**Owner:** Development Team

