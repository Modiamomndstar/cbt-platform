import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authenticate } from "../middleware/auth";
import { ApiResponseHandler } from "../utils/apiResponse";
import { aiService } from "../services/aiService";
import { logUserActivity } from "../utils/auditLogger";
import { getSchoolPlan, getSchoolUsage } from "../services/planService";

const router = Router();

// Analyze exam result
router.post(
  "/explain-result/:resultId",
  authenticate,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { resultId } = req.params;
      const user = req.user!;

      // 1. Check AI Limits
      const [plan, usage] = await Promise.all([
        getSchoolPlan(user.schoolId!),
        getSchoolUsage(user.schoolId!)
      ]);

      if (usage.aiQueriesThisMonth >= plan.aiQueriesPerMonth) {
        return ApiResponseHandler.error(
          res,
          "AI Limit Reached. Please upgrade your subscription.",
          403,
          "LIMIT_REACHED"
        );
      }

      // 2. Get result details
      const resultQuery = await client.query(
        `SELECT se.*, e.title as exam_title, u.full_name as student_name
         FROM student_exams se
         JOIN exams e ON se.exam_id = e.id
         JOIN users u ON se.student_id = u.id
         WHERE se.id = $1 AND (se.student_id = $2 OR EXISTS (
           SELECT 1 FROM tutors t WHERE t.id = $2 AND t.school_id = (SELECT school_id FROM exams WHERE id = se.exam_id)
         ))`,
        [resultId, user.id],
      );

      if (resultQuery.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Result not found");
      }

      const result = resultQuery.rows[0];
      const answers = result.answers || [];
      const missedQuestions = answers
        .filter((a: any) => !a.isCorrect)
        .slice(0, 5); // Limit to 5 for efficiency and token limits

      // 3. Fetch question texts for missed questions
      const missedDetails: any[] = [];
      for (const ans of missedQuestions) {
        const q = await client.query("SELECT question_text FROM questions WHERE id = $1", [ans.questionId]);
        if (q.rows.length > 0) {
          missedDetails.push({
            text: q.rows[0].question_text,
            studentAnswer: ans.studentAnswer,
            correctAnswer: ans.correctAnswer
          });
        }
      }

      // 4. Generate AI explanation
      const explanation = await aiService.explainResult({
        studentName: result.student_name,
        examTitle: result.exam_title,
        score: result.score,
        totalMarks: result.total_marks,
        missedQuestions: missedDetails
      });

      // 5. Log activity to increment usage
      await logUserActivity(req, 'ai_result_explained', {
        targetType: 'result',
        targetId: resultId,
        details: { examTitle: result.exam_title }
      });

      ApiResponseHandler.success(res, { explanation }, "AI analysis completed");
    } catch (error) {
      console.error("AI explain result error:", error);
      ApiResponseHandler.serverError(res, "Failed to analyze result");
    } finally {
      client.release();
    }
  },
);

// Explain specific question
router.post(
  "/explain-question",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { questionId, studentAnswer, correctAnswer } = req.body;
      const user = req.user!;

      // Add limit check here as well
      const [plan, usage] = await Promise.all([
        getSchoolPlan(user.schoolId!),
        getSchoolUsage(user.schoolId!)
      ]);

      if (usage.aiQueriesThisMonth >= plan.aiQueriesPerMonth) {
        return ApiResponseHandler.error(res, "AI Limit Reached.", 403, "LIMIT_REACHED");
      }

      const client = await pool.connect();
      const q = await client.query("SELECT question_text FROM questions WHERE id = $1", [questionId]);
      client.release();

      if (q.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Question not found");
      }

      const explanation = await aiService.explainQuestion(
        q.rows[0].question_text,
        studentAnswer,
        correctAnswer
      );

      await logUserActivity(req, 'ai_question_explained', {
        targetType: 'question',
        targetId: questionId
      });

      ApiResponseHandler.success(res, { explanation }, "Question explanation generated");
    } catch (error) {
      console.error("AI explain question error:", error);
      ApiResponseHandler.serverError(res, "Failed to explain question");
    }
  }
);

export default router;
