import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";
import { requireTutorSlot } from "../middleware/planGuard";
import { ApiResponseHandler } from "../utils/apiResponse";
import { validate } from "../middleware/validation";
import { getPaginationOptions, formatPaginationResponse } from "../utils/pagination";
import { logUserActivity } from "../utils/auditLogger";
import { transformResult } from "../utils/responseTransformer";

const router = Router();


router.use(authenticate);

// Get all exams for tutor or school
router.get('/', authorize('tutor', 'school'), async (req, res, next) => {
  try {
    const { role, tutorId, schoolId } = req.user!;
    const pagination = getPaginationOptions(req);

    let query = `
      SELECT e.id, e.title, e.description, e.category_id, e.exam_type_id, e.duration, e.total_questions,
              e.passing_score, e.shuffle_questions, e.shuffle_options, e.show_result_immediately,
              e.is_published, e.created_at, e.exam_type, e.academic_session,
              ec.name as category_name,
              et.name as exam_type_name, et.color as exam_type_color,
              (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count,
              (SELECT COUNT(*) FROM exam_schedules WHERE exam_id = e.id) as schedule_count
       FROM exams e
       LEFT JOIN exam_categories ec ON e.category_id = ec.id
       LEFT JOIN exam_types et ON e.exam_type_id = et.id
       WHERE 1=1`;

    const params: any[] = [];

    if (role === 'tutor') {
      query += ` AND e.tutor_id = $1`;
      params.push(tutorId);
    } else if (role === 'school') {
      query += ` AND e.school_id = $1`;
      params.push(schoolId);
    }

    query += ` ORDER BY e.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pagination.limit, pagination.offset);

    const result = await db.query(query, params);

    let countQuery = "SELECT COUNT(*) FROM exams WHERE 1=1";
    const countParams: any[] = [];

    if (role === 'tutor') {
      countQuery += " AND tutor_id = $1";
      countParams.push(tutorId);
    } else if (role === 'school') {
      countQuery += " AND school_id = $1";
      countParams.push(schoolId);
    }

    const countResult = await db.query(countQuery, countParams);

    ApiResponseHandler.success(
      res,
      transformResult(result),
      "Exams retrieved",
      formatPaginationResponse(parseInt(countResult.rows[0].count), pagination)
    );
  } catch (error) {
    next(error);
  }
});

// Get exam by ID
router.get('/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { role, schoolId, tutorId } = req.user!;

    let query = `SELECT e.*, s.name as school_name, t.full_name as tutor_name,
                        ec.name as category_name,
                        et.name as exam_type_name, et.color as exam_type_color
                 FROM exams e
                 JOIN schools s ON e.school_id = s.id
                 JOIN tutors t ON e.tutor_id = t.id
                 LEFT JOIN exam_categories ec ON e.category_id = ec.id
                 LEFT JOIN exam_types et ON e.exam_type_id = et.id
                 WHERE e.id = $1`;
    const params: any[] = [id];

    if (role === 'tutor') {
      query += ' AND e.tutor_id = $2';
      params.push(tutorId);
    } else if (role === 'school') {
      query += ' AND e.school_id = $2';
      params.push(schoolId);
    }

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return ApiResponseHandler.notFound(res, "Exam not found");
    }

    ApiResponseHandler.success(res, transformResult(result.rows[0]), "Exam retrieved");
  } catch (error) {
    next(error);
  }
});

// Create exam
router.post('/', authorize('tutor'), [
  body('title').trim().notEmpty(),
  body('duration').isInt({ min: 1 }),
  body('totalQuestions').isInt({ min: 1 }),
  validate
], async (req, res, next) => {
  try {
    const {
      title, description, categoryId, examTypeId, duration, totalQuestions,
      passingScore, shuffleQuestions, shuffleOptions, showResultImmediately,
      isSecureMode, maxViolations, examType, academicSession, academicYearId, academicPeriodId
    } = req.body;

    const tutorId = req.user!.tutorId;
    const schoolId = req.user!.schoolId;

    // Security check: Verify category belongs to school
    if (categoryId) {
      const categoryCheck = await db.query(
        "SELECT id FROM exam_categories WHERE id = $1 AND school_id = $2",
        [categoryId, schoolId]
      );
      if (categoryCheck.rows.length === 0) {
        return ApiResponseHandler.badRequest(res, "Invalid exam category");
      }
    }

    // Security check: Verify exam type belongs to school
    if (examTypeId) {
      const typeCheck = await db.query(
        "SELECT id FROM exam_types WHERE id = $1 AND school_id = $2",
        [examTypeId, schoolId]
      );
      if (typeCheck.rows.length === 0) {
        return ApiResponseHandler.badRequest(res, "Invalid exam type");
      }
    }

    const result = await db.query(
      `INSERT INTO exams (school_id, tutor_id, title, description, category_id, exam_type_id, duration, total_questions,
                          passing_score, shuffle_questions, shuffle_options, show_result_immediately,
                          is_secure_mode, max_violations, exam_type, academic_session, academic_year_id, academic_period_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [schoolId, tutorId, title, description, categoryId || null, examTypeId || null, duration, totalQuestions,
       passingScore || 50, shuffleQuestions ?? true, shuffleOptions ?? true, showResultImmediately ?? true,
       isSecureMode ?? false, maxViolations ?? 3, examType || 'official', academicSession || null,
       academicYearId || null, academicPeriodId || null]
    );

    const exam = result.rows[0];

    // Log exam creation
    await logUserActivity(req, 'exam_creation', {
      targetType: 'exam',
      targetId: exam.id,
      targetName: exam.title,
      details: { category_id: categoryId, duration, total_questions: totalQuestions }
    });

    ApiResponseHandler.created(res, exam, "Exam created");
  } catch (error) {
    next(error);
  }
});

// Create exam with questions in one go (for AI integration)
router.post('/integrated-import', authorize('tutor'), async (req: any, res, next) => {
    try {
        const { examData, questions, examTypeId } = req.body;
        const { tutorId, schoolId } = req.user!;

        const result = await db.transaction(async (client) => {
            // 1. Create Exam
            const examRes = await client.query(
                `INSERT INTO exams (school_id, tutor_id, title, description, category_id, duration, total_questions, passing_score, exam_type, is_published, exam_type_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING id`,
                [schoolId, tutorId, examData.title, examData.description, examData.categoryId, examData.duration || 30, questions.length, 50, 'integrated', true, examTypeId]
            );
            const examId = examRes.rows[0].id;

            // 2. Insert Questions
            for (const q of questions) {
                await client.query(
                    `INSERT INTO questions (exam_id, question_text, options, correct_answer, marks, question_type)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [examId, q.questionText, JSON.stringify(q.options), q.correctAnswer, q.marks || 5, 'multiple_choice']
                );
            }
            return examId;
        });

        ApiResponseHandler.created(res, { id: result }, "Integrated exam created and linked");
    } catch (error) {
        next(error);
    }
});

// Update exam
router.put('/:id', [
  param('id').isUUID(),
  validate
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const { role, tutorId, schoolId } = req.user!;

    // Security check: Verify category belongs to school if updating
    if (updates.categoryId) {
      const categoryCheck = await db.query(
        "SELECT id FROM exam_categories WHERE id = $1 AND school_id = $2",
        [updates.categoryId, schoolId]
      );
      if (categoryCheck.rows.length === 0) {
        return ApiResponseHandler.badRequest(res, "Invalid exam category");
      }
    }

    if (updates.examTypeId) {
      const typeCheck = await db.query(
        "SELECT id FROM exam_types WHERE id = $1 AND school_id = $2",
        [updates.examTypeId, schoolId]
      );
      if (typeCheck.rows.length === 0) {
        return ApiResponseHandler.badRequest(res, "Invalid exam type");
      }
    }

    const allowedFields = ['title', 'description', 'categoryId', 'examTypeId', 'duration', 'totalQuestions', 'passingScore', 'shuffleQuestions', 'shuffleOptions', 'showResultImmediately', 'isPublished', 'isSecureMode', 'maxViolations', 'examType', 'academicSession', 'academicYearId', 'academicPeriodId'];
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        let dbField = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        if (key === 'categoryId') dbField = 'category_id';
        if (key === 'examTypeId') dbField = 'exam_type_id';
        if (key === 'academicYearId') dbField = 'academic_year_id';
        if (key === 'academicPeriodId') dbField = 'academic_period_id';

        setClauses.push(`${dbField} = $${paramIndex++}`);
        values.push(value);

        // No need to sync duration_minutes anymore
      }
    }

    if (setClauses.length === 0) {
      return ApiResponseHandler.badRequest(res, 'No fields to update');
    }

    values.push(id);
    let query = `UPDATE exams SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex}`;

    if (role === 'tutor') {
      query += ` AND tutor_id = $${paramIndex + 1}`;
      values.push(tutorId);
    }

    query += ' RETURNING *';

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return ApiResponseHandler.notFound(res, 'Exam not found');
    }

    const exam = result.rows[0];

    // Log exam update
    await logUserActivity(req, 'exam_update', {
      targetType: 'exam',
      targetId: id,
      targetName: exam.title,
      details: { updates: Object.keys(updates) }
    });

    ApiResponseHandler.success(res, exam, "Exam updated");
  } catch (error) {
    next(error);
  }
});

// Delete exam
router.delete('/:id', authorize('tutor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tutorId = req.user!.tutorId;

    const result = await db.query('DELETE FROM exams WHERE id = $1 AND tutor_id = $2 RETURNING title', [id, tutorId]);

    if (result.rows.length > 0) {
      // Log exam deletion
      await logUserActivity(req, 'exam_deletion', {
        targetType: 'exam',
        targetId: id,
        targetName: result.rows[0].title
      });
    }

    ApiResponseHandler.success(res, null, "Exam deleted");
  } catch (error) {
    next(error);
  }
});

// Publish exam
router.patch('/:id/publish', authorize('tutor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    const tutorId = req.user!.tutorId;

    const result = await db.query(
      'UPDATE exams SET is_published = $1, updated_at = NOW() WHERE id = $2 AND tutor_id = $3 RETURNING *',
      [isPublished, id, tutorId]
    );

    if (result.rows.length === 0) {
      return ApiResponseHandler.notFound(res, 'Exam not found');
    }

    const exam = result.rows[0];

    // Log exam publish/unpublish
    await logUserActivity(req, isPublished ? 'exam_publish' : 'exam_unpublish', {
      targetType: 'exam',
      targetId: id,
      targetName: exam.title
    });

    ApiResponseHandler.success(res, exam, `Exam ${isPublished ? 'published' : 'unpublished'}`);
  } catch (error) {
    next(error);
  }
});

export default router;
