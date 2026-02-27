import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticate, authorize } from '../middleware/auth';
import { db } from '../config/database';
import { ApiResponseHandler } from '../utils/apiResponse';

const router = Router();
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return ApiResponseHandler.badRequest(res, 'Validation failed', { errors: errors.array() });
  next();
};

router.use(authenticate, authorize('school'));

// GET /api/school-settings
router.get('/', async (req, res, next) => {
  try {
    const schoolId = req.user!.id;
    const result = await db.query(
      'SELECT * FROM school_settings WHERE school_id = $1',
      [schoolId]
    );

    if (result.rows.length === 0) {
      // Auto-create with defaults
      const created = await db.query(
        'INSERT INTO school_settings (school_id) VALUES ($1) RETURNING *',
        [schoolId]
      );
      return ApiResponseHandler.success(res, created.rows[0], 'School settings created');
    }

    ApiResponseHandler.success(res, result.rows[0], 'School settings retrieved');
  } catch (error) {
    next(error);
  }
});

// PUT /api/school-settings
router.put('/', [
  body('allowExternalStudents').optional().isBoolean(),
  body('maxExternalPerTutor').optional().isInt({ min: 0, max: 1000 }),
  body('allowTutorCreateStudents').optional().isBoolean(),
  body('allowTutorEditCategories').optional().isBoolean(),
  body('studentPortalEnabled').optional().isBoolean(),
  body('resultReleaseMode').optional().isIn(['immediate', 'manual']),
  body('allowStudentPdfDownload').optional().isBoolean(),
  body('defaultExamAttempts').optional().isInt({ min: 1, max: 10 }),
  body('emailOnExamComplete').optional().isBoolean(),
  body('emailOnNewStudent').optional().isBoolean(),
  body('emailOnResultsRelease').optional().isBoolean(),
  body('primaryColor').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid hex color'),
  validate
], async (req, res, next) => {
  try {
    const schoolId = req.user!.id;
    let {
      allowExternalStudents, maxExternalPerTutor, allowTutorCreateStudents,
      allowTutorEditCategories, studentPortalEnabled, resultReleaseMode, allowStudentPdfDownload,
      defaultExamAttempts, emailOnExamComplete, emailOnNewStudent,
      emailOnResultsRelease, primaryColor
    } = req.body;

    // Clamp maxExternalPerTutor to plan ceiling
    if (maxExternalPerTutor !== undefined) {
      const planRow = await db.query(
        `SELECT COALESCE(p.max_external_per_tutor, 999999) AS plan_max,
                COALESCE(ss.extra_external_students, 0) AS extra
         FROM school_subscriptions ss
         JOIN plan_definitions p ON ss.plan_type = p.plan_type
         WHERE ss.school_id = $1 AND ss.status IN ('active', 'trialing')
         LIMIT 1`,
        [schoolId]
      );
      const planCap = planRow.rows[0] ? (planRow.rows[0].plan_max + planRow.rows[0].extra) : 5;
      maxExternalPerTutor = Math.min(maxExternalPerTutor, planCap);
    }

    const updates: string[] = [];
    const values: any[] = [];
    let p = 1;

    const fields: Record<string, any> = {
      allow_external_students: allowExternalStudents,
      max_external_per_tutor: maxExternalPerTutor,
      allow_tutor_create_students: allowTutorCreateStudents,
      allow_tutor_edit_categories: allowTutorEditCategories,
      student_portal_enabled: studentPortalEnabled,
      result_release_mode: resultReleaseMode,
      allow_student_pdf_download: allowStudentPdfDownload,
      default_exam_attempts: defaultExamAttempts,
      email_on_exam_complete: emailOnExamComplete,
      email_on_new_student: emailOnNewStudent,
      email_on_results_release: emailOnResultsRelease,
      primary_color: primaryColor,
    };

    for (const [col, val] of Object.entries(fields)) {
      if (val !== undefined) {
        updates.push(`${col} = $${p++}`);
        values.push(val);
      }
    }

    if (updates.length === 0) return ApiResponseHandler.badRequest(res, 'Nothing to update');

    updates.push('updated_at = NOW()');
    values.push(schoolId);

    await db.query(`
      UPDATE school_settings SET ${updates.join(', ')} WHERE school_id = $${p}
    `, values);

    const result = await db.query('SELECT * FROM school_settings WHERE school_id = $1', [schoolId]);
    ApiResponseHandler.success(res, result.rows[0], 'School settings updated');
  } catch (error) {
    next(error);
  }
});

export default router;
