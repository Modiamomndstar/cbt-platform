import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
  }
  next();
};

router.use(authenticate);

// Get all exams for tutor
router.get('/', authorize('tutor'), async (req, res, next) => {
  try {
    const tutorId = req.user!.tutorId;

    const result = await db.query(
      `SELECT e.id, e.title, e.description, e.category, e.duration, e.total_questions,
              e.passing_score, e.shuffle_questions, e.shuffle_options, e.show_result_immediately,
              e.is_published, e.created_at,
              (SELECT COUNT(*) FROM questions WHERE exam_id = e.id) as question_count,
              (SELECT COUNT(*) FROM exam_schedules WHERE exam_id = e.id) as schedule_count
       FROM exams e
       WHERE e.tutor_id = $1
       ORDER BY e.created_at DESC`,
      [tutorId]
    );

    res.json({ success: true, data: result.rows });
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

    let query = `SELECT e.*, s.name as school_name, t.full_name as tutor_name
                 FROM exams e
                 JOIN schools s ON e.school_id = s.id
                 JOIN tutors t ON e.tutor_id = t.id
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
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, data: result.rows[0] });
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
      title, description, category, duration, totalQuestions,
      passingScore, shuffleQuestions, shuffleOptions, showResultImmediately
    } = req.body;

    const tutorId = req.user!.tutorId;
    const schoolId = req.user!.schoolId;

    const result = await db.query(
      `INSERT INTO exams (school_id, tutor_id, title, description, category, duration, duration_minutes, total_questions,
                          passing_score, shuffle_questions, shuffle_options, show_result_immediately)
       VALUES ($1, $2, $3, $4, $5, $6, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [schoolId, tutorId, title, description, category, duration, totalQuestions,
       passingScore || 50, shuffleQuestions ?? true, shuffleOptions ?? true, showResultImmediately ?? true]
    );

    res.status(201).json({ success: true, message: 'Exam created', data: result.rows[0] });
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
    const { role, tutorId } = req.user!;

    const allowedFields = ['title', 'description', 'category', 'duration', 'totalQuestions', 'passingScore', 'shuffleQuestions', 'shuffleOptions', 'showResultImmediately', 'isPublished'];
    const setClauses: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        const dbField = key.replace(/[A-Z]/g, l => `_${l.toLowerCase()}`);
        setClauses.push(`${dbField} = $${paramIndex++}`);
        values.push(value);

        // Sync duration_minutes with duration
        if (key === 'duration') {
          setClauses.push(`duration_minutes = $${paramIndex++}`);
          values.push(value);
        }
      }
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
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
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, message: 'Exam updated', data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// Delete exam
router.delete('/:id', authorize('tutor'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const tutorId = req.user!.tutorId;

    await db.query('DELETE FROM exams WHERE id = $1 AND tutor_id = $2', [id, tutorId]);

    res.json({ success: true, message: 'Exam deleted' });
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
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    res.json({ success: true, message: `Exam ${isPublished ? 'published' : 'unpublished'}`, data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

export default router;
