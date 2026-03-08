import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { db } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";
import { ApiResponseHandler } from "../utils/apiResponse";
import { transformResult } from "../utils/responseTransformer";

const router = Router();
const validate = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    ApiResponseHandler.badRequest(res, "Validation failed", { errors: errors.array() });
    return;
  }
  next();
};

router.use(authenticate);

/**
 * @route   GET /api/exam-types
 * @desc    Get all exam types for the school
 * @access  Private (School/Tutor)
 */
router.get("/", authorize("school", "tutor"), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { schoolId, role, tutorId } = req.user!;

    // If tutor, they can see school-wide types (tutor_id IS NULL) or their own types (tutor_id = tutorId)
    // If school, they can see school-wide types (tutor_id IS NULL). Wait, school should probably see ALL exam types, but maybe only school-wide ones for now to avoid clutter, or all? Let's show all for school admin.
    let query = `SELECT id, name, description, color, created_at, tutor_id FROM exam_types WHERE school_id = $1 AND is_active = true`;
    const params: any[] = [schoolId];

    if (role === 'tutor') {
      query += ` AND (tutor_id IS NULL OR tutor_id = $2)`;
      params.push(tutorId);
    }

    query += ` ORDER BY name ASC`;

    const result = await db.query(query, params);
    ApiResponseHandler.success(res, transformResult(result.rows), "Exam types retrieved");
  } catch (error) { next(error); }
});

/**
 * @route   POST /api/exam-types
 * @desc    Create a new exam type
 * @access  Private (School)
 */
router.post(
  "/",
  authorize("school", "tutor"),
  [
    body("name").trim().notEmpty().withMessage("Type name is required"),
    body("description").optional().trim(),
    body("color").optional().trim().matches(/^#[0-9A-Fa-f]{6}$/).withMessage("Invalid color format"),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, description, color } = req.body;
      const { schoolId, role, tutorId } = req.user!;

      // Check if exists
      let checkQuery = "SELECT id FROM exam_types WHERE school_id = $1 AND name = $2";
      const checkParams: any[] = [schoolId, name];

      if (role === 'tutor') {
        checkQuery += " AND tutor_id = $3";
        checkParams.push(tutorId);
      } else {
        checkQuery += " AND tutor_id IS NULL";
      }

      const exists = await db.query(checkQuery, checkParams);
      if (exists.rows.length > 0) {
        ApiResponseHandler.badRequest(res, "Exam type already exists");
        return;
      }

      const result = await db.query(
        `INSERT INTO exam_types (school_id, tutor_id, name, description, color)
         VALUES ($1, $2, $3, $4, $5) RETURNING id, name, description, color, created_at, tutor_id`,
        [schoolId, role === 'tutor' ? tutorId : null, name, description, color || '#4F46E5']
      );

      ApiResponseHandler.created(res, transformResult(result.rows[0]), "Exam type created");
    } catch (error) { next(error); }
  }
);

/**
 * @route   PUT /api/exam-types/:id
 * @desc    Update an exam type
 * @access  Private (School)
 */
router.put(
  "/:id",
  authorize("school"),
  [
    body("name").trim().notEmpty().withMessage("Type name is required"),
    body("description").optional().trim(),
    body("color").optional().trim().matches(/^#[0-9A-Fa-f]{6}$/).withMessage("Invalid color format"),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, color } = req.body;
      const { schoolId, role, tutorId } = req.user!;

      // Ownership and existence check
      const current = await db.query("SELECT id, tutor_id FROM exam_types WHERE id = $1 AND school_id = $2", [id, schoolId]);
      if (current.rows.length === 0) {
        ApiResponseHandler.notFound(res, "Exam type not found");
        return;
      }

      if (role === 'tutor' && current.rows[0].tutor_id !== tutorId) {
        ApiResponseHandler.forbidden(res, "You can only edit your own assessment styles");
        return;
      }

      // Uniqueness check for the new name
      let uniqueQuery = "SELECT id FROM exam_types WHERE school_id = $1 AND name = $2 AND id != $3";
      const uniqueParams: any[] = [schoolId, name, id];

      if (role === 'tutor') {
        uniqueQuery += " AND tutor_id = $4";
        uniqueParams.push(tutorId);
      } else {
        uniqueQuery += " AND tutor_id IS NULL";
      }

      const exists = await db.query(uniqueQuery, uniqueParams);
      if (exists.rows.length > 0) {
        ApiResponseHandler.badRequest(res, "Exam type with this name already exists");
        return;
      }

      const result = await db.query(
        `UPDATE exam_types SET name = $1, description = $2, color = $3, updated_at = NOW()
         WHERE id = $4 AND school_id = $5 RETURNING id, name, description, color, updated_at, tutor_id`,
        [name, description, color, id, schoolId]
      );

      ApiResponseHandler.success(res, transformResult(result.rows[0]), "Exam type updated");
    } catch (error) { next(error); }
  }
);

/**
 * @route   DELETE /api/exam-types/:id
 * @desc    Delete an exam type
 * @access  Private (School/Tutor)
 */
router.delete("/:id", authorize("school", "tutor"), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { schoolId, role, tutorId } = req.user!;

    // Ownership check
    const current = await db.query("SELECT id, tutor_id FROM exam_types WHERE id = $1 AND school_id = $2", [id, schoolId]);
    if (current.rows.length === 0) {
      ApiResponseHandler.notFound(res, "Exam type not found");
      return;
    }

    if (role === 'tutor' && current.rows[0].tutor_id !== tutorId) {
      ApiResponseHandler.forbidden(res, "You can only delete your own assessment styles");
      return;
    }

    // Ensure it's not being used by exams
    const inUse = await db.query("SELECT id FROM exams WHERE exam_type_id = $1 LIMIT 1", [id]);
    if (inUse.rows.length > 0) {
      ApiResponseHandler.badRequest(res, "Cannot delete exam type because it is being used by one or more exams.");
      return;
    }

    const result = await db.query("DELETE FROM exam_types WHERE id = $1 AND school_id = $2 RETURNING id", [id, schoolId]);
    if (result.rows.length === 0) {
      ApiResponseHandler.notFound(res, "Exam type not found");
      return;
    }

    ApiResponseHandler.success(res, null, "Exam type deleted");
  } catch (error) { next(error); }
});

export default router;
