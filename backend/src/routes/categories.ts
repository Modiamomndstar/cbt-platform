import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../config/database';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

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

// All routes require authentication
router.use(authenticate);

// @route   GET /api/categories
// @desc    Get all student categories for a school
// @access  Private (School, Tutor)
router.get('/', async (req, res, next) => {
  try {
    const { schoolId, role } = req.user!;

    let querySchoolId = schoolId;

    // If tutor, use their school
    if (role === 'tutor' && req.user!.tutorId) {
      const tutorResult = await db.query(
        'SELECT school_id FROM tutors WHERE id = $1',
        [req.user!.tutorId]
      );
      if (tutorResult.rows.length > 0) {
        querySchoolId = tutorResult.rows[0].school_id;
      }
    }

    if (!querySchoolId) {
      return res.status(400).json({
        success: false,
        message: 'School ID is required'
      });
    }

    const result = await db.query(
      `SELECT id, name, description, color, sort_order, is_active,
              (SELECT COUNT(*) FROM students WHERE category_id = sc.id) as student_count
       FROM student_categories sc
       WHERE school_id = $1 AND is_active = true
       ORDER BY sort_order, name`,
      [querySchoolId]
    );

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// @route   GET /api/categories/:id
// @desc    Get category by ID with students
// @access  Private (School, Tutor)
router.get('/:id', [
  param('id').isUUID().withMessage('Invalid category ID'),
  validate
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { schoolId, role } = req.user!;

    let querySchoolId = schoolId;

    if (role === 'tutor' && req.user!.tutorId) {
      const tutorResult = await db.query(
        'SELECT school_id FROM tutors WHERE id = $1',
        [req.user!.tutorId]
      );
      if (tutorResult.rows.length > 0) {
        querySchoolId = tutorResult.rows[0].school_id;
      }
    }

    // Get category
    const categoryResult = await db.query(
      `SELECT id, name, description, color, sort_order, is_active, created_at
       FROM student_categories
       WHERE id = $1 AND school_id = $2`,
      [id, querySchoolId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Get students in this category
    const studentsResult = await db.query(
      `SELECT id, student_id, full_name, email, phone, is_active, created_at
       FROM students
       WHERE category_id = $1 AND is_active = true
       ORDER BY full_name`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...categoryResult.rows[0],
        students: studentsResult.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/categories
// @desc    Create new student category
// @access  Private (School only)
router.post('/', authorize('school', 'tutor'), [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Color must be a valid hex code'),
  body('sortOrder').optional().isInt({ min: 0 }),
  validate
], async (req, res, next) => {
  try {
    const { name, description, color, sortOrder } = req.body;
    const { schoolId, role } = req.user!;

    let querySchoolId = schoolId;
    if (role === 'tutor' && req.user!.tutorId) {
      const tutorResult = await db.query(
        'SELECT school_id FROM tutors WHERE id = $1',
        [req.user!.tutorId]
      );
      if (tutorResult.rows.length > 0) {
        querySchoolId = tutorResult.rows[0].school_id;
      }
    }

    if (!querySchoolId) {
      return res.status(400).json({ success: false, message: 'School ID is required' });
    }

    // Check if category name already exists for this school
    const existingResult = await db.query(
      'SELECT id FROM student_categories WHERE school_id = $1 AND name = $2',
      [querySchoolId, name]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists'
      });
    }

    const result = await db.query(
      `INSERT INTO student_categories (school_id, name, description, color, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, description, color, sort_order, is_active, created_at`,
      [querySchoolId, name, description, color || '#4F46E5', sortOrder || 0]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/categories/find-or-create
// @desc    Find existing category by name or create a new one
// @access  Private (School, Tutor)
router.post('/find-or-create', authorize('school', 'tutor'), [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  validate
], async (req, res, next) => {
  try {
    const { name } = req.body;
    const { schoolId, role } = req.user!;

    let querySchoolId = schoolId;
    if (role === 'tutor' && req.user!.tutorId) {
      const tutorResult = await db.query(
        'SELECT school_id FROM tutors WHERE id = $1',
        [req.user!.tutorId]
      );
      if (tutorResult.rows.length > 0) {
        querySchoolId = tutorResult.rows[0].school_id;
      }
    }

    if (!querySchoolId) {
      return res.status(400).json({ success: false, message: 'School ID is required' });
    }

    // Check if category already exists
    const existing = await db.query(
      'SELECT id, name, color, sort_order, is_active FROM student_categories WHERE school_id = $1 AND LOWER(name) = LOWER($2) AND is_active = true',
      [querySchoolId, name]
    );

    if (existing.rows.length > 0) {
      return res.json({
        success: true,
        data: existing.rows[0],
        created: false
      });
    }

    // Create new category
    const result = await db.query(
      `INSERT INTO student_categories (school_id, name, color, sort_order)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, color, sort_order, is_active, created_at`,
      [querySchoolId, name, '#4F46E5', 0]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      created: true
    });
  } catch (error) {
    next(error);
  }
});


// @route   PUT /api/categories/:id
// @desc    Update student category
// @access  Private (School, Tutor)
router.put('/:id', authorize('school', 'tutor'), [
  param('id').isUUID().withMessage('Invalid category ID'),
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
  body('sortOrder').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean(),
  validate
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, color, sortOrder, isActive } = req.body;
    const { schoolId, role, tutorId } = req.user!;

    let querySchoolId = schoolId;
    if (role === 'tutor' && tutorId) {
       const tutorResult = await db.query(
         'SELECT school_id FROM tutors WHERE id = $1',
         [tutorId]
       );
       if (tutorResult.rows.length > 0) {
         querySchoolId = tutorResult.rows[0].school_id;
       }
    }

    // Check if category exists and belongs to this school
    const checkResult = await db.query(
      'SELECT id FROM student_categories WHERE id = $1 AND school_id = $2',
      [id, querySchoolId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check name uniqueness if name is being updated
    if (name) {
      const nameCheck = await db.query(
        'SELECT id FROM student_categories WHERE school_id = $1 AND name = $2 AND id != $3',
        [querySchoolId, name, id]
      );
      if (nameCheck.rows.length > 0) {
        return res.status(409).json({
          success: false,
          message: 'A category with this name already exists'
        });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }
    if (color !== undefined) {
      updates.push(`color = $${paramIndex++}`);
      values.push(color);
    }
    if (sortOrder !== undefined) {
      updates.push(`sort_order = $${paramIndex++}`);
      values.push(sortOrder);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);
    values.push(querySchoolId);

    const result = await db.query(
      `UPDATE student_categories
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex} AND school_id = $${paramIndex + 1}
       RETURNING id, name, description, color, sort_order, is_active, updated_at`,
      values
    );

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete student category (soft delete)
// @access  Private (School, Tutor)
router.delete('/:id', authorize('school', 'tutor'), [
  param('id').isUUID().withMessage('Invalid category ID'),
  validate
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { schoolId, role, tutorId } = req.user!;

    let querySchoolId = schoolId;
    if (role === 'tutor' && tutorId) {
       const tutorResult = await db.query(
         'SELECT school_id FROM tutors WHERE id = $1',
         [tutorId]
       );
       if (tutorResult.rows.length > 0) {
         querySchoolId = tutorResult.rows[0].school_id;
       }
    }

    // Check if category exists and belongs to this school
    const checkResult = await db.query(
      'SELECT id FROM student_categories WHERE id = $1 AND school_id = $2',
      [id, querySchoolId]
    );

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category has students
    const studentsResult = await db.query(
      'SELECT COUNT(*) as count FROM students WHERE category_id = $1',
      [id]
    );

    if (parseInt(studentsResult.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with students. Please reassign students first.'
      });
    }

    // Soft delete
    await db.query(
      'UPDATE student_categories SET is_active = false, updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

// @route   POST /api/categories/:id/students
// @desc    Add students to category (bulk)
// @access  Private (School, Tutor)
router.post('/:id/students', [
  param('id').isUUID().withMessage('Invalid category ID'),
  body('studentIds').isArray({ min: 1 }).withMessage('At least one student ID is required'),
  body('studentIds.*').isUUID().withMessage('Invalid student ID'),
  validate
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { studentIds } = req.body;
    const { schoolId, role } = req.user!;

    let querySchoolId = schoolId;

    if (role === 'tutor' && req.user!.tutorId) {
      const tutorResult = await db.query(
        'SELECT school_id FROM tutors WHERE id = $1',
        [req.user!.tutorId]
      );
      if (tutorResult.rows.length > 0) {
        querySchoolId = tutorResult.rows[0].school_id;
      }
    }

    // Verify category belongs to school
    const categoryResult = await db.query(
      'SELECT id FROM student_categories WHERE id = $1 AND school_id = $2',
      [id, querySchoolId]
    );

    if (categoryResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Update students
    const result = await db.query(
      `UPDATE students
       SET category_id = $1, updated_at = NOW()
       WHERE id = ANY($2) AND school_id = $3
       RETURNING id, full_name, student_id`,
      [id, studentIds, querySchoolId]
    );

    res.json({
      success: true,
      message: `${result.rowCount} students added to category`,
      data: result.rows
    });
  } catch (error) {
    next(error);
  }
});

// @route   DELETE /api/categories/:id/students/:studentId
// @desc    Remove student from category
// @access  Private (School, Tutor)
router.delete('/:id/students/:studentId', [
  param('id').isUUID().withMessage('Invalid category ID'),
  param('studentId').isUUID().withMessage('Invalid student ID'),
  validate
], async (req, res, next) => {
  try {
    const { id, studentId } = req.params;
    const { schoolId, role } = req.user!;

    let querySchoolId = schoolId;

    if (role === 'tutor' && req.user!.tutorId) {
      const tutorResult = await db.query(
        'SELECT school_id FROM tutors WHERE id = $1',
        [req.user!.tutorId]
      );
      if (tutorResult.rows.length > 0) {
        querySchoolId = tutorResult.rows[0].school_id;
      }
    }

    await db.query(
      `UPDATE students
       SET category_id = NULL, updated_at = NOW()
       WHERE id = $1 AND category_id = $2 AND school_id = $3`,
      [studentId, id, querySchoolId]
    );

    res.json({
      success: true,
      message: 'Student removed from category'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
