import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { db } from "../config/database";
import { authenticate, authorize } from "../middleware/auth";
import { ApiResponseHandler } from "../utils/apiResponse";

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

// @route   GET /api/exam-categories
// @desc    Get all exam categories for the school
// @access  Private (School/Tutor)
router.get("/", authorize("school", "tutor"), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { schoolId } = req.user!;
    const result = await db.query(
      `SELECT id, name, description, created_at FROM exam_categories WHERE school_id = $1 ORDER BY name ASC`,
      [schoolId]
    );
    ApiResponseHandler.success(res, result.rows, "Exam categories retrieved");
  } catch (error) { next(error); }
});

// @route   POST /api/exam-categories
// @desc    Create a new exam category
// @access  Private (School/Tutor)
router.post(
  "/",
  authorize("school", "tutor"),
  [
    body("name").trim().notEmpty().withMessage("Category name is required"),
    body("description").optional().trim(),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, description } = req.body;
      const { schoolId } = req.user!;

      // Check if exists
      const exists = await db.query("SELECT id FROM exam_categories WHERE school_id = $1 AND name = $2", [schoolId, name]);
      if (exists.rows.length > 0) {
        ApiResponseHandler.badRequest(res, "Exam category already exists");
        return;
      }

      const result = await db.query(
        `INSERT INTO exam_categories (school_id, name, description)
         VALUES ($1, $2, $3) RETURNING id, name, description, created_at`,
        [schoolId, name, description]
      );

      ApiResponseHandler.created(res, result.rows[0], "Exam category created");
    } catch (error) { next(error); }
  }
);

// @route   PUT /api/exam-categories/:id
router.put(
  "/:id",
  authorize("school", "tutor"),
  [
    body("name").trim().notEmpty().withMessage("Category name is required"),
    body("description").optional().trim(),
    validate
  ],
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;
      const { schoolId } = req.user!;

      const exists = await db.query("SELECT id FROM exam_categories WHERE school_id = $1 AND name = $2 AND id != $3", [schoolId, name, id]);
      if (exists.rows.length > 0) {
        ApiResponseHandler.badRequest(res, "Exam category with this name already exists");
        return;
      }

      const result = await db.query(
        `UPDATE exam_categories SET name = $1, description = $2, updated_at = NOW()
         WHERE id = $3 AND school_id = $4 RETURNING id, name, description, updated_at`,
        [name, description, id, schoolId]
      );

      if (result.rows.length === 0) {
        ApiResponseHandler.notFound(res, "Category not found");
        return;
      }

      ApiResponseHandler.success(res, result.rows[0], "Exam category updated");
    } catch (error) { next(error); }
  }
);

// @route   DELETE /api/exam-categories/:id
router.delete("/:id", authorize("school", "tutor"), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { id } = req.params;
    const { schoolId } = req.user!;

    // Ensure it's not being used by exams
    const inUse = await db.query("SELECT id FROM exams WHERE category_id = $1 LIMIT 1", [id]);
    if (inUse.rows.length > 0) {
      ApiResponseHandler.badRequest(res, "Cannot delete category because it is assigned to one or more exams.");
      return;
    }

    const result = await db.query("DELETE FROM exam_categories WHERE id = $1 AND school_id = $2 RETURNING id", [id, schoolId]);
    if (result.rows.length === 0) {
      ApiResponseHandler.notFound(res, "Category not found");
      return;
    }

    ApiResponseHandler.success(res, null, "Exam category deleted");
  } catch (error) { next(error); }
});

export default router;
