import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authenticate, requireRole } from "../middleware/auth";
import { ApiResponseHandler } from "../utils/apiResponse";
import { aiService, AICohortAnalysisRequest, AIStudentFeedbackRequest } from "../services/aiService";
import { logUserActivity } from "../utils/auditLogger";
import { getSchoolPlan, getSchoolUsage } from "../services/planService";
import { paygService } from "../services/paygService";

const router = Router();

// 1. Generate or fetch AI Cohort Analysis for an exam
router.post(
  "/exam/:examId/cohort",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { examId } = req.params;
      const user = req.user!;

      // 1. Check if exam exists and belongs to user's school
      const examCheck = await client.query(
        `SELECT e.* FROM exams e
         JOIN tutors t ON e.tutor_id = t.id
         WHERE e.id = $1 AND t.school_id = $2`,
        [examId, user.schoolId]
      );

      if (examCheck.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Exam not found");
      }

      const exam = examCheck.rows[0];

      // If we already generated analysis, just return it (unless ?forceRefresh=1 is passed)
      if (exam.ai_analysis && req.query.forceRefresh !== "1") {
        return ApiResponseHandler.success(res, exam.ai_analysis, "Retrieved cached AI Analysis");
      }

      // 2. Check AI Quota/Monetization
      const [plan, usage] = await Promise.all([
        getSchoolPlan(user.schoolId!),
        getSchoolUsage(user.schoolId!)
      ]);

      if (usage.aiQueriesThisMonth >= plan.aiQueriesPerMonth) {
        const consumption = await paygService.consumeCredits(user.schoolId!, 'ai_query_consumption');
        if (!consumption.success) {
          return ApiResponseHandler.error(
            res,
            "School AI Limit Reached. Top up your PAYG wallet to generate analysis.",
            403,
            "LIMIT_REACHED"
          );
        }
      }

      // 3. Aggregate Data for Prompt
      const resultsCheck = await client.query(
        `SELECT COUNT(*) as total_students,
                COALESCE(AVG(se.percentage), 0) as average_score_percentage,
                COALESCE(MAX(se.percentage), 0) as highest_score_percentage,
                COALESCE(MIN(se.percentage), 0) as lowest_score_percentage
         FROM student_exams se
         JOIN exam_schedules es ON se.exam_schedule_id = es.id
         WHERE es.exam_id = $1 AND se.status = 'completed'`,
        [examId]
      );

      const stats = resultsCheck.rows[0];
      const totalStudents = parseInt(stats.total_students);

      if (totalStudents === 0) {
        return ApiResponseHandler.error(res, "No students have completed this exam yet.", 400);
      }

      // Aggregate topic performance
      // For this, we need to join student_exams answers JSON array with questions
      const topicPerf = await client.query(
        `SELECT q.topic,
                COUNT(a.value->>'questionId') as total_answers,
                SUM(CASE WHEN (a.value->>'isCorrect')::boolean THEN 1 ELSE 0 END) as correct_answers
         FROM student_exams se
         JOIN exam_schedules es ON se.exam_schedule_id = es.id
         CROSS JOIN jsonb_array_elements(se.answers::jsonb) a
         JOIN questions q ON (a.value->>'questionId')::uuid = q.id
         WHERE es.exam_id = $1 AND q.topic IS NOT NULL AND q.topic != '' AND se.status = 'completed'
         GROUP BY q.topic`,
        [examId]
      );

      const topicPerformance = topicPerf.rows.map(row => ({
        topic: row.topic,
        averageScorePercentage: (parseInt(row.correct_answers) / parseInt(row.total_answers)) * 100
      }));

      // Top 5 Most Missed Questions
      const missedQs = await client.query(
        `SELECT q.question_text, q.topic,
                COUNT(a.value->>'questionId') as total_answers,
                SUM(CASE WHEN NOT (a.value->>'isCorrect')::boolean THEN 1 ELSE 0 END) as wrong_answers
         FROM student_exams se
         JOIN exam_schedules es ON se.exam_schedule_id = es.id
         CROSS JOIN jsonb_array_elements(se.answers::jsonb) a
         JOIN questions q ON (a.value->>'questionId')::uuid = q.id
         WHERE es.exam_id = $1 AND se.status = 'completed'
         GROUP BY q.id, q.question_text, q.topic
         HAVING COUNT(a.value->>'questionId') > 0
         ORDER BY (SUM(CASE WHEN NOT (a.value->>'isCorrect')::boolean THEN 1 ELSE 0 END)::float / COUNT(a.value->>'questionId')) DESC
         LIMIT 5`,
        [examId]
      );

      const mostMissedQuestions = missedQs.rows.map(row => ({
        questionText: row.question_text,
        topic: row.topic || 'General',
        missRate: parseInt(row.wrong_answers) / parseInt(row.total_answers)
      }));

      // 4. Request AI Analysis
      const aiRequest: AICohortAnalysisRequest = {
        examTitle: exam.title,
        totalStudents,
        averageScorePercentage: parseFloat(stats.average_score_percentage),
        highestScorePercentage: parseFloat(stats.highest_score_percentage),
        lowestScorePercentage: parseFloat(stats.lowest_score_percentage),
        topicPerformance,
        mostMissedQuestions
      };

      const aiResponse = await aiService.analyzeCohortPerformance(aiRequest);

      // 5. Cache the Result
      const cachedData = {
        generatedAt: new Date().toISOString(),
        analysisMarkdown: aiResponse,
        basis: { totalStudents, averageScorePercentage: aiRequest.averageScorePercentage }
      };

      await client.query(
        "UPDATE exams SET ai_analysis = $1 WHERE id = $2",
        [cachedData, examId]
      );

      // 6. Log usage
      await logUserActivity(req, 'ai_exam_analysis_generated', {
        targetType: 'exam',
        targetId: examId,
        details: { examTitle: exam.title }
      });

      ApiResponseHandler.success(res, cachedData, "AI Cohort Analysis generated successfully");

    } catch (error) {
      console.error("Generate cohort AI analysis error:", error);
      ApiResponseHandler.serverError(res, "Failed to generate AI analysis");
    } finally {
      client.release();
    }
  }
);

// 2. Generate or fetch AI Feedback for an individual student result
router.post(
  "/result/:resultId/student",
  authenticate,
  requireRole(["school", "tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { resultId } = req.params;
      const user = req.user!;

      // 1. Fetch Result and verify ownership
      const resultCheck = await client.query(
        `SELECT se.*, e.title as exam_title, COALESCE(s.full_name, ext.full_name) as student_name
         FROM student_exams se
         JOIN exam_schedules es ON se.exam_schedule_id = es.id
         JOIN exams e ON es.exam_id = e.id
         LEFT JOIN students s ON es.student_id = s.id
         LEFT JOIN external_students ext ON es.external_student_id = ext.id
         JOIN tutors t ON e.tutor_id = t.id
         WHERE se.id = $1 AND t.school_id = $2`,
        [resultId, user.schoolId]
      );

      if (resultCheck.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Result not found");
      }

      const examResult = resultCheck.rows[0];

      // Return cached version unless forceRefresh=1
      if (examResult.ai_feedback && req.query.forceRefresh !== "1") {
        return ApiResponseHandler.success(res, {
          generatedAt: examResult.completed_at, // Approximation since we don't have generatedAt for feedback text
          analysisMarkdown: examResult.ai_feedback
        }, "Retrieved cached AI Feedback");
      }

      // 2. Check Quota
      const [plan, usage] = await Promise.all([
        getSchoolPlan(user.schoolId!),
        getSchoolUsage(user.schoolId!)
      ]);

      if (usage.aiQueriesThisMonth >= plan.aiQueriesPerMonth) {
        const consumption = await paygService.consumeCredits(user.schoolId!, 'ai_query_consumption');
        if (!consumption.success) {
          return ApiResponseHandler.error(res, "School AI Limit Reached. Top up your PAYG wallet.", 403, "LIMIT_REACHED");
        }
      }

      // 3. Aggregate student stats
      const classAvgQ = await client.query(
        `SELECT COALESCE(AVG(se.percentage), 0) as class_avg
         FROM student_exams se
         JOIN exam_schedules es ON se.exam_schedule_id = es.id
         WHERE es.exam_id = (SELECT exam_id FROM exam_schedules WHERE id = $1) AND se.status = 'completed'`,
        [examResult.exam_schedule_id]
      );
      const classAveragePercentage = parseFloat(classAvgQ.rows[0].class_avg);
      const scorePercentage = parseFloat(examResult.percentage);

      // Find strong and weak topics
      const topicQ = await client.query(
        `SELECT q.topic,
                COUNT(a.value->>'questionId') as total,
                SUM(CASE WHEN (a.value->>'isCorrect')::boolean THEN 1 ELSE 0 END) as correct
         FROM student_exams se
         CROSS JOIN jsonb_array_elements(se.answers::jsonb) a
         JOIN questions q ON (a.value->>'questionId')::uuid = q.id
         WHERE se.id = $1 AND q.topic IS NOT NULL AND q.topic != ''
         GROUP BY q.topic`,
        [resultId]
      );

      const strongTopics: string[] = [];
      const weakTopics: string[] = [];

      topicQ.rows.forEach(r => {
        const pct = (parseInt(r.correct) / parseInt(r.total)) * 100;
        if (pct >= 70) strongTopics.push(r.topic);
        else if (pct < 50) weakTopics.push(r.topic);
      });

      if (strongTopics.length === 0) strongTopics.push("General effort");
      if (weakTopics.length === 0) weakTopics.push("Advanced application");

      // 4. Ping AI
      const aiRequest: AIStudentFeedbackRequest = {
        studentName: examResult.student_name,
        examTitle: examResult.exam_title,
        scorePercentage,
        classAveragePercentage,
        strongTopics,
        weakTopics
      };

      const aiResponse = await aiService.generateStudentFeedback(aiRequest);

      // 5. Cache result
      await client.query("UPDATE student_exams SET ai_feedback = $1 WHERE id = $2", [aiResponse, resultId]);

      // 6. Log usage
      await logUserActivity(req, 'ai_student_analysis_generated', {
        targetType: 'result',
        targetId: resultId,
        details: { examTitle: examResult.exam_title, studentName: examResult.student_name }
      });

      const responseData = {
        generatedAt: new Date().toISOString(),
        analysisMarkdown: aiResponse
      };

      ApiResponseHandler.success(res, responseData, "AI Student Feedback generated successfully");

    } catch (error) {
      console.error("Generate student AI analysis error:", error);
      ApiResponseHandler.serverError(res, "Failed to generate personal AI feedback");
    } finally {
      client.release();
    }
  }
);

export default router;
