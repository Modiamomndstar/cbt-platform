import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authenticate, requireRole } from "../middleware/auth";
import OpenAI from "openai";

const router = Router();

// OpenAI is initialized lazily inside the AI route to avoid crashing on startup

// Get questions for an exam
router.get(
  "/exam/:examId",
  authenticate,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId } = req.params;
      const user = req.user!;

      // Check exam access
      const examCheck = await client.query(
        `SELECT e.* FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE e.id = $1 AND t.school_id = $2`,
        [examId, user.schoolId],
      );

      if (examCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Exam not found" });
      }

      const result = await client.query(
        `SELECT * FROM questions
       WHERE exam_id = $1 AND is_deleted = false
       ORDER BY question_order, created_at`,
        [examId],
      );

      res.json({
        success: true,
        data: result.rows.map((q) => ({
          ...q,
          options: q.options,
          correctAnswer: user.role === "student" ? undefined : q.correct_answer,
        })),
      });
    } catch (error) {
      console.error("Get questions error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to fetch questions" });
    } finally {
      client.release();
    }
  },
);

// Create question
router.post(
  "/",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const {
        examId,
        questionText,
        questionType,
        options,
        correctAnswer,
        marks,
        questionOrder,
        imageUrl,
      } = req.body;
      const user = req.user!;

      // Verify exam belongs to user's school
      const examCheck = await client.query(
        `SELECT e.* FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE e.id = $1 AND t.school_id = $2`,
        [examId, user.schoolId],
      );

      if (examCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Exam not found" });
      }

      // Check if tutor owns the exam
      if (user.role === "tutor" && examCheck.rows[0].tutor_id !== user.id) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }

      const result = await client.query(
        `INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, marks, question_order, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
        [
          examId,
          questionText,
          questionType,
          JSON.stringify(options),
          correctAnswer,
          marks,
          questionOrder,
          imageUrl,
        ],
      );

      // Update exam total marks
      await client.query(
        `UPDATE exams SET total_marks = (
        SELECT COALESCE(SUM(marks), 0) FROM questions WHERE exam_id = $1 AND is_deleted = false
      ) WHERE id = $1`,
        [examId],
      );

      res.status(201).json({
        success: true,
        message: "Question created successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Create question error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to create question" });
    } finally {
      client.release();
    }
  },
);

// Bulk create questions
router.post(
  "/bulk",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId, questions } = req.body;
      const user = req.user!;

      // Verify exam belongs to user's school
      const examCheck = await client.query(
        `SELECT e.* FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE e.id = $1 AND t.school_id = $2`,
        [examId, user.schoolId],
      );

      if (examCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Exam not found" });
      }

      await client.query("BEGIN");

      const createdQuestions: any[] = [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        const result = await client.query(
          `INSERT INTO questions (exam_id, question_text, question_type, options, correct_answer, marks, question_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
          [
            examId,
            q.questionText,
            q.questionType,
            JSON.stringify(q.options),
            q.correctAnswer,
            q.marks,
            q.questionOrder || i + 1,
          ],
        );
        createdQuestions.push(result.rows[0]);
      }

      // Update exam total marks
      await client.query(
        `UPDATE exams SET total_marks = (
        SELECT COALESCE(SUM(marks), 0) FROM questions WHERE exam_id = $1 AND is_deleted = false
      ) WHERE id = $1`,
        [examId],
      );

      await client.query("COMMIT");

      res.status(201).json({
        success: true,
        message: `${createdQuestions.length} questions created successfully`,
        data: createdQuestions,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Bulk create questions error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to create questions" });
    } finally {
      client.release();
    }
  },
);

// Update question
router.put(
  "/:id",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const {
        questionText,
        questionType,
        options,
        correctAnswer,
        marks,
        questionOrder,
        imageUrl,
      } = req.body;
      const user = req.user!;

      // Verify question belongs to user's school
      const questionCheck = await client.query(
        `SELECT q.*, e.tutor_id FROM questions q
       JOIN exams e ON q.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE q.id = $1 AND t.school_id = $2`,
        [id, user.schoolId],
      );

      if (questionCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Question not found" });
      }

      // Check if tutor owns the exam
      if (user.role === "tutor" && questionCheck.rows[0].tutor_id !== user.id) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }

      const result = await client.query(
        `UPDATE questions
       SET question_text = COALESCE($1, question_text),
           question_type = COALESCE($2, question_type),
           options = COALESCE($3, options),
           correct_answer = COALESCE($4, correct_answer),
           marks = COALESCE($5, marks),
           question_order = COALESCE($6, question_order),
           image_url = COALESCE($7, image_url)
       WHERE id = $8
       RETURNING *`,
        [
          questionText,
          questionType,
          options ? JSON.stringify(options) : null,
          correctAnswer,
          marks,
          questionOrder,
          imageUrl,
          id,
        ],
      );

      // Update exam total marks
      await client.query(
        `UPDATE exams SET total_marks = (
        SELECT COALESCE(SUM(marks), 0) FROM questions WHERE exam_id = $1 AND is_deleted = false
      ) WHERE id = $1`,
        [questionCheck.rows[0].exam_id],
      );

      res.json({
        success: true,
        message: "Question updated successfully",
        data: result.rows[0],
      });
    } catch (error) {
      console.error("Update question error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to update question" });
    } finally {
      client.release();
    }
  },
);

// Delete question (soft delete)
router.delete(
  "/:id",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { id } = req.params;
      const user = req.user!;

      // Verify question belongs to user's school
      const questionCheck = await client.query(
        `SELECT q.*, e.tutor_id FROM questions q
       JOIN exams e ON q.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE q.id = $1 AND t.school_id = $2`,
        [id, user.schoolId],
      );

      if (questionCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Question not found" });
      }

      // Check if tutor owns the exam
      if (user.role === "tutor" && questionCheck.rows[0].tutor_id !== user.id) {
        return res
          .status(403)
          .json({ success: false, message: "Access denied" });
      }

      await client.query(
        "UPDATE questions SET is_deleted = true WHERE id = $1",
        [id],
      );

      // Update exam total marks
      await client.query(
        `UPDATE exams SET total_marks = (
        SELECT COALESCE(SUM(marks), 0) FROM questions WHERE exam_id = $1 AND is_deleted = false
      ) WHERE id = $1`,
        [questionCheck.rows[0].exam_id],
      );

      res.json({
        success: true,
        message: "Question deleted successfully",
      });
    } catch (error) {
      console.error("Delete question error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to delete question" });
    } finally {
      client.release();
    }
  },
);

// AI Generate questions
router.post(
  "/ai-generate",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    try {
      const { topic, subject, numQuestions, difficulty, questionType } =
        req.body;

      if (!process.env.OPENAI_API_KEY) {
        return res
          .status(503)
          .json({ success: false, message: "AI generation not configured. Please set OPENAI_API_KEY." });
      }

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const prompt = `Generate ${numQuestions} ${difficulty} difficulty ${questionType} questions for ${subject} on the topic "${topic}".

    Return ONLY a valid JSON array in this exact format:
    [
      {
        "questionText": "The question text",
        "options": ["Option A", "Option B", "Option C", "Option D"],
        "correctAnswer": "Option A",
        "marks": 5
      }
    ]

    For true_false questions, use options: ["True", "False"]
    For theory questions, options should be an empty array [].`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful educational assistant that generates exam questions.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      });

      const responseText = completion.choices[0].message.content || "[]";
      let generatedQuestions;

      try {
        generatedQuestions = JSON.parse(responseText);
      } catch (e) {
        // Try to extract JSON from markdown code block
        const jsonMatch =
          responseText.match(/```json\n([\s\S]*?)\n```/) ||
          responseText.match(/```\n([\s\S]*?)\n```/) ||
          responseText.match(/\[([\s\S]*)\]/);

        if (jsonMatch) {
          generatedQuestions = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        } else {
          throw new Error("Could not parse AI response");
        }
      }

      // Validate and format questions
      const formattedQuestions = generatedQuestions.map(
        (q: any, index: number) => ({
          questionText: q.questionText,
          questionType: questionType,
          options:
            q.options ||
            (questionType === "true_false" ? ["True", "False"] : []),
          correctAnswer: q.correctAnswer,
          marks: q.marks || 5,
          questionOrder: index + 1,
        }),
      );

      res.json({
        success: true,
        data: formattedQuestions,
      });
    } catch (error) {
      console.error("AI generate questions error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to generate questions" });
    }
  },
);

// Reorder questions
router.post(
  "/reorder",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId, questionOrders } = req.body;
      const user = req.user!;

      // Verify exam belongs to user's school
      const examCheck = await client.query(
        `SELECT e.* FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE e.id = $1 AND t.school_id = $2`,
        [examId, user.schoolId],
      );

      if (examCheck.rows.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Exam not found" });
      }

      await client.query("BEGIN");

      for (const { questionId, newOrder } of questionOrders) {
        await client.query(
          "UPDATE questions SET question_order = $1 WHERE id = $2 AND exam_id = $3",
          [newOrder, questionId, examId],
        );
      }

      await client.query("COMMIT");

      res.json({
        success: true,
        message: "Questions reordered successfully",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Reorder questions error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to reorder questions" });
    } finally {
      client.release();
    }
  },
);

export default router;
