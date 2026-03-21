import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authenticate, requireRole, requireCoordinatingAdmin } from "../middleware/auth";
import { requireFeature } from "../middleware/planGuard";
import { ApiResponseHandler } from "../utils/apiResponse";
import { transformResult } from "../utils/responseTransformer";
import crypto from "crypto";
import { resultService } from "../services/resultService";

const router = Router();

// School Admin dashboard analytics
router.get(
  "/school/dashboard",
  authenticate,
  requireRole(["school"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = req.user!;

      // Total counts
      const [tutorCount, studentCount, examCount, publishedExamCount] = await Promise.all([
        client.query("SELECT COUNT(*) FROM tutors WHERE school_id = $1 AND is_active = true", [user.schoolId]),
        client.query("SELECT COUNT(*) FROM students WHERE school_id = $1 AND is_active = true", [user.schoolId]),
        client.query(
          `SELECT COUNT(*) FROM exams e JOIN tutors t ON e.tutor_id = t.id WHERE t.school_id = $1`,
          [user.schoolId]
        ),
        client.query(
          `SELECT COUNT(*) FROM exams e JOIN tutors t ON e.tutor_id = t.id WHERE t.school_id = $1 AND e.is_published = true`,
          [user.schoolId]
        ),
      ]);

      // LMS Stats
      const lmsStats = await client.query(
        `SELECT 
          COUNT(DISTINCT c.id) as total_courses,
          COUNT(DISTINCT scp.student_id) as total_enrollments,
          COALESCE(AVG(CASE WHEN scp.is_completed = true THEN 100 ELSE 0 END), 0) as avg_completion
        FROM courses c
        LEFT JOIN student_course_progress scp ON c.id = scp.course_id
        WHERE c.school_id = $1`,
        [user.schoolId]
      );

      // Recent Activity
      const [recentExams, recentResults, categoryDistribution, monthlyStats] = await Promise.all([
        client.query(
          `SELECT e.*, COALESCE(t.full_name, t.username) as tutor_name,
           (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) as total_questions
           FROM exams e
           JOIN tutors t ON e.tutor_id = t.id
           WHERE t.school_id = $1
           ORDER BY e.created_at DESC LIMIT 5`,
          [user.schoolId]
        ),
        client.query(
          `SELECT se.*, e.title as exam_title, s.full_name as student_name
           FROM student_exams se
           JOIN exams e ON se.exam_id = e.id
           JOIN tutors t ON e.tutor_id = t.id
           JOIN students s ON se.student_id = s.id
           WHERE t.school_id = $1
           ORDER BY se.completed_at DESC LIMIT 5`,
          [user.schoolId]
        ),
        client.query(
          `SELECT sc.name, COUNT(s.id) as student_count
           FROM student_categories sc
           LEFT JOIN students s ON sc.id = s.category_id AND s.is_active = true
           WHERE sc.school_id = $1
           GROUP BY sc.id, sc.name ORDER BY sc.name`,
          [user.schoolId]
        ),
        client.query(
          `SELECT
            DATE_TRUNC('month', se.completed_at) as month,
            COUNT(*) as exam_count,
            AVG(se.percentage) as average_percentage
           FROM student_exams se
           JOIN exams e ON se.exam_id = e.id
           JOIN tutors t ON e.tutor_id = t.id
           WHERE t.school_id = $1 AND se.completed_at >= NOW() - INTERVAL '6 months'
           GROUP BY month ORDER BY month DESC`,
          [user.schoolId]
        ),
      ]);

      ApiResponseHandler.success(
        res,
        transformResult({
          totalTutors: Number(tutorCount.rows[0].count),
          totalStudents: Number(studentCount.rows[0].count),
          totalExams: Number(examCount.rows[0].count),
          publishedExams: Number(publishedExamCount.rows[0].count),
          lmsStats: {
            totalCourses: Number(lmsStats.rows[0].total_courses),
            totalEnrollments: Number(lmsStats.rows[0].total_enrollments),
            avgCompletionRate: parseFloat(lmsStats.rows[0].avg_completion || 0).toFixed(1)
          },
          recentExams: recentExams.rows.map((e) => ({
            id: e.id,
            title: e.title,
            tutorName: e.tutor_name,
            isPublished: e.is_published,
            createdAt: e.created_at,
            totalQuestions: Number(e.total_questions)
          })),
          recentResults: recentResults.rows.map((r) => ({
            id: r.id,
            examTitle: r.exam_title,
            fullName: r.student_name,
            score: r.score,
            percentage: r.percentage,
            status: r.status,
            submittedAt: r.completed_at,
          })),
          categoryDistribution: categoryDistribution.rows.map(cd => ({
            name: cd.name,
            studentCount: Number(cd.student_count)
          })),
          monthlyStats: monthlyStats.rows.map((m) => ({
            month: m.month,
            examCount: Number(m.exam_count),
            averagePercentage: parseFloat(m.average_percentage || 0).toFixed(1),
          })),
        }),
        "School dashboard analytics retrieved",
      );
    } catch (error) {
      console.error("School dashboard analytics error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch analytics");
    } finally {
      client.release();
    }
  },
);

// Tutor dashboard analytics
router.get(
  "/tutor/dashboard",
  authenticate,
  requireRole(["tutor"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = req.user!;

      // Get all stats in parallel
      const [examStats, studentStats, performanceStats, recentExams, examPerformance, upcomingExams, courseStats] = await Promise.all([
        client.query(
          "SELECT COUNT(*) as total_exams, COUNT(CASE WHEN is_published = true THEN 1 END) as published_exams FROM exams WHERE tutor_id = $1",
          [user.id]
        ),
        client.query(
          "SELECT COUNT(DISTINCT se.student_id) as total_students FROM student_exams se JOIN exams e ON se.exam_id = e.id WHERE e.tutor_id = $1",
          [user.id]
        ),
        client.query(
          "SELECT AVG(se.percentage) as average_percentage, AVG(se.score) as average_score FROM student_exams se JOIN exams e ON se.exam_id = e.id WHERE e.tutor_id = $1",
          [user.id]
        ),
        client.query(
          `SELECT e.*, (SELECT COUNT(*) FROM questions q WHERE q.exam_id = e.id) as total_questions
           FROM exams e WHERE e.tutor_id = $1 ORDER BY e.created_at DESC LIMIT 5`,
          [user.id]
        ),
        client.query(
          `SELECT e.id, e.title, COUNT(se.id) as attempt_count, AVG(se.percentage) as average_percentage, MAX(se.percentage) as highest_percentage, MIN(se.percentage) as lowest_percentage
           FROM exams e LEFT JOIN student_exams se ON e.id = se.exam_id
           WHERE e.tutor_id = $1 GROUP BY e.id, e.title ORDER BY e.created_at DESC LIMIT 10`,
          [user.id]
        ),
        client.query(
          `SELECT es.*, e.title as exam_title, e.duration, COUNT(se.id) as student_count
           FROM exam_schedules es JOIN exams e ON es.exam_id = e.id
           LEFT JOIN student_exams se ON es.id = se.exam_schedule_id
           WHERE e.tutor_id = $1 AND es.status = 'scheduled' AND es.scheduled_date >= CURRENT_DATE
           GROUP BY es.id, e.title, e.duration ORDER BY es.scheduled_date ASC LIMIT 5`,
          [user.id]
        ),
        client.query(
          `SELECT c.id, c.title, COUNT(scp.id) as student_count,
           COALESCE(AVG(CASE 
             WHEN (SELECT COUNT(*) FROM course_contents WHERE module_id IN (SELECT id FROM course_modules WHERE course_id = c.id)) = 0 THEN 0
             ELSE (array_length(scp.completed_contents, 1)::float / (SELECT COUNT(*) FROM course_contents WHERE module_id IN (SELECT id FROM course_modules WHERE course_id = c.id)) * 100)
           END), 0) as avg_progress
           FROM courses c
           LEFT JOIN student_course_progress scp ON c.id = scp.course_id
           WHERE c.tutor_id = $1
           GROUP BY c.id, c.title ORDER BY student_count DESC LIMIT 5`,
          [user.id]
        )
      ]);

      ApiResponseHandler.success(
        res,
        transformResult({
          totalExams: Number(examStats.rows[0].total_exams),
          publishedExams: Number(examStats.rows[0].published_exams),
          totalStudents: Number(studentStats.rows[0].total_students),
          averagePercentage: parseFloat(performanceStats.rows[0].average_percentage || 0).toFixed(1),
          averageScore: parseFloat(performanceStats.rows[0].average_score || 0).toFixed(1),
          recentExams: recentExams.rows.map(e => ({
            ...e,
            totalQuestions: Number(e.total_questions)
          })),
          upcomingExams: upcomingExams.rows.map((e) => ({
            id: e.id,
            examTitle: e.exam_title,
            scheduledDate: e.scheduled_date,
            startTime: e.start_time,
            endTime: e.end_time,
            studentCount: Number(e.student_count),
          })),
          examPerformance: examPerformance.rows.map((e) => ({
            id: e.id,
            title: e.title,
            attemptCount: Number(e.attempt_count),
            averagePercentage: parseFloat(e.average_percentage || 0).toFixed(1),
            highestPercentage: parseFloat(e.highest_percentage || 0).toFixed(1),
            lowestPercentage: parseFloat(e.lowest_percentage || 0).toFixed(1),
          })),
          courseProgress: courseStats.rows.map(c => ({
            id: c.id,
            title: c.title,
            studentCount: Number(c.student_count),
            avgProgress: parseFloat(c.avg_progress || 0).toFixed(1)
          })),
        }),
        "Tutor dashboard analytics retrieved",
      );
    } catch (error) {
      console.error("Tutor dashboard analytics error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch analytics");
    } finally {
      client.release();
    }
  },
);

// Student dashboard analytics
router.get(
  "/student/dashboard",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = req.user!;
      const { yearId } = req.query;

      // Fetch student's email/phone to merge historical external data
      const studentInfo = await client.query(
        'SELECT email, phone, school_id FROM students WHERE id = $1 UNION SELECT email, phone, school_id FROM external_students WHERE id = $1',
        [user.id]
      );
      const student = studentInfo.rows[0];
      if (!student) {
        return ApiResponseHandler.notFound(res, "Student record not found");
      }
      const email = student.email || null;
      const phone = student.phone || null;
      const schoolId = student.school_id;

      // Fetch school branding info
      const schoolResult = await client.query(
        'SELECT name, logo_url FROM schools WHERE id = $1',
        [schoolId]
      );
      const schoolInfo = schoolResult.rows[0] || { name: 'Portal', logo_url: null };

      // Total exams taken (Filtered by year if provided)
      const examStats = await client.query(
        `SELECT
        COUNT(se.id) as total_exams,
        COUNT(CASE WHEN se.status = 'completed' THEN 1 END) as passed_count,
        COUNT(CASE WHEN se.status = 'failed' THEN 1 END) as failed_count
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       WHERE (se.student_id = $1 OR se.external_student_id = $1)
       AND ($2::uuid IS NULL OR e.academic_year_id = $2)`,
        [user.id, yearId || null],
      );

      // Average score (Filtered by year if provided)
      const scoreStats = await client.query(
        `SELECT
        AVG(se.percentage) as average_percentage,
        AVG(se.score) as average_score,
        MAX(se.percentage) as highest_percentage,
        MAX(se.score) as highest_score
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       WHERE (se.student_id = $1 OR se.external_student_id = $1)
       AND ($2::uuid IS NULL OR e.academic_year_id = $2)`,
        [user.id, yearId || null],
      );

      // Recent exams
      const recentExams = await client.query(
        `SELECT se.*, e.title as exam_title, e.description
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       WHERE (se.student_id = $1 OR se.external_student_id = $1)
       AND ($2::uuid IS NULL OR e.academic_year_id = $2)
       ORDER BY se.completed_at DESC LIMIT 10`,
        [user.id, yearId || null],
      );

      // Upcoming scheduled exams
      const upcomingExams = await client.query(
        `SELECT es.*, e.title as exam_title, e.duration
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       WHERE (es.student_id = $1 OR es.external_student_id = $1)
         AND es.status = 'scheduled'
         AND es.scheduled_date >= CURRENT_DATE
         AND ($2::uuid IS NULL OR e.academic_year_id = $2)
       ORDER BY es.scheduled_date, es.start_time
       LIMIT 5`,
        [user.id, yearId || null],
      );

      // Performance by subject/category
      const categoryPerformance = await client.query(
        `SELECT
        ec.name as category_name,
        COUNT(se.id) as exam_count,
        AVG(se.percentage) as average_percentage
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       JOIN exam_categories ec ON e.category_id = ec.id
       WHERE (se.student_id = $1 OR se.external_student_id = $1)
       AND ($2::uuid IS NULL OR e.academic_year_id = $2)
       GROUP BY ec.id, ec.name`,
        [user.id, yearId || null],
      );

      // Monthly progress
      const monthlyProgress = await client.query(
        `SELECT
        DATE_TRUNC('month', se.completed_at) as month,
        COUNT(*) as exam_count,
        AVG(se.percentage) as average_percentage
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       WHERE (se.student_id = $1 OR se.external_student_id = $1)
         AND se.completed_at >= NOW() - INTERVAL '6 months'
         AND ($2::uuid IS NULL OR e.academic_year_id = $2)
       GROUP BY DATE_TRUNC('month', se.completed_at)
       ORDER BY month DESC`,
        [user.id, yearId || null],
      );

      // Awards Count (Percentage >= 70)
      const awardsCount = await client.query(
        `SELECT COUNT(se.id) FROM student_exams se
         JOIN exams e ON se.exam_id = e.id
         WHERE (se.student_id = $1 OR se.external_student_id = $1)
           AND se.percentage >= 70 AND se.status = 'completed'
           AND ($2::uuid IS NULL OR e.academic_year_id = $2)`,
        [user.id, yearId || null]
      );

      // Percentile Calculation (Filtered by year if provided)
      let percentile = 50; // Default
      const avgQuery = await client.query(
        `SELECT AVG(se.percentage) as avg_p FROM student_exams se
         JOIN exams e ON se.exam_id = e.id
         WHERE (se.student_id = $1 OR se.external_student_id = $1)
         AND ($2::uuid IS NULL OR e.academic_year_id = $2)`,
        [user.id, yearId || null]
      );

      if (avgQuery.rows[0].avg_p !== null) {
        const studentAvg = parseFloat(avgQuery.rows[0].avg_p);

        const schoolRankQuery = await client.query(
          `SELECT
             (SELECT COUNT(*) FROM (
               SELECT AVG(se.percentage) as p
               FROM student_exams se
               JOIN exams e ON se.exam_id = e.id
               LEFT JOIN students s ON se.student_id = s.id
               LEFT JOIN external_students ext ON se.external_student_id = ext.id
               WHERE COALESCE(s.school_id, ext.school_id) = $1
               AND ($3::uuid IS NULL OR e.academic_year_id = $3)
               GROUP BY COALESCE(s.id, ext.id)
             ) as school_avgs WHERE p < $2) as below,
             (SELECT COUNT(*) FROM (
               SELECT AVG(se.percentage) as p
               FROM student_exams se
               JOIN exams e ON se.exam_id = e.id
               LEFT JOIN students s ON se.student_id = s.id
               LEFT JOIN external_students ext ON se.external_student_id = ext.id
               WHERE COALESCE(s.school_id, ext.school_id) = $1
               AND ($3::uuid IS NULL OR e.academic_year_id = $3)
               GROUP BY COALESCE(s.id, ext.id)
             ) as school_avgs) as total`,
          [user.schoolId, studentAvg, yearId || null]
        );

        const { below, total } = schoolRankQuery.rows[0];
        if (parseInt(total) > 0) {
          percentile = Math.round((parseInt(below) / parseInt(total)) * 100);
        }
      }

      ApiResponseHandler.success(
        res,
        transformResult({
          school: schoolInfo,
          totalExams: parseInt(examStats.rows[0].total_exams),
          passedCount: parseInt(examStats.rows[0].passed_count),
          failedCount: parseInt(examStats.rows[0].failed_count),
          averagePercentage: parseFloat(
            scoreStats.rows[0].average_percentage || 0,
          ).toFixed(1),
          averageScore: parseFloat(
            scoreStats.rows[0].average_score || 0,
          ).toFixed(1),
          highestPercentage: parseFloat(
            scoreStats.rows[0].highest_percentage || 0,
          ).toFixed(1),
          highestScore: parseFloat(
            scoreStats.rows[0].highest_score || 0,
          ).toFixed(1),
          awardsEarned: parseInt(awardsCount.rows[0].count),
          percentile: percentile,
          recentExams: recentExams.rows.map((e) => ({
            id: e.id,
            examTitle: e.exam_title,
            description: e.description,
            score: e.score,
            percentage: e.percentage,
            status: e.status,
            submittedAt: e.completed_at,
          })),
          upcomingExams: upcomingExams.rows.map((e) => ({
            id: e.id,
            examTitle: e.exam_title,
            duration: e.duration, // Added for mobile backwards compatibility
            durationMinutes: e.duration,
            scheduledDate: e.scheduled_date,
            startTime: e.start_time,
            endTime: e.end_time,
          })),
          categoryPerformance: categoryPerformance.rows.map((c) => ({
            subject: c.category_name, // Map for radar chart
            A: parseFloat(c.average_percentage || 0).toFixed(1), // Map for radar chart
            percentage: parseFloat(c.average_percentage || 0).toFixed(1),
            examCount: parseInt(c.exam_count),
          })),
          monthlyProgress: monthlyProgress.rows.map((m) => ({
            name: new Date(m.month).toLocaleDateString('en-US', { month: 'short' }), // Map for line chart
            score: parseFloat(m.average_percentage || 0).toFixed(1), // Map for line chart
          })),
        }),
        "Student dashboard analytics retrieved",
      );
    } catch (error) {
      console.error("Student dashboard analytics error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch analytics");
    } finally {
      client.release();
    }
  },
);

// Get student's cumulative term report (Continuous Assessment)
router.get(
  "/student/cumulative-report",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const studentId = req.user!.id;
      const { periodId } = req.query;

      let targetPeriodId = periodId;

      if (!targetPeriodId) {
        // Fallback: Get active period for the school
        const activePeriodRes = await client.query(
          `SELECT ap.id FROM academic_periods ap
           JOIN academic_years ay ON ap.academic_year_id = ay.id
           WHERE ay.school_id = $1 AND ay.is_active = true
           AND CURRENT_DATE BETWEEN ap.start_date AND ap.end_date
           LIMIT 1`,
          [req.user!.schoolId]
        );
        
        if (activePeriodRes.rows.length === 0) {
          return ApiResponseHandler.notFound(res, "No active academic period found");
        }
        targetPeriodId = activePeriodRes.rows[0].id;
      }

      const report = await resultService.getCumulativeTermReport(studentId, targetPeriodId as string);
      ApiResponseHandler.success(res, transformResult(report), "Cumulative report retrieved");
    } catch (error: any) {
      console.error("Cumulative report error:", error);
      ApiResponseHandler.serverError(res, error.message || "Failed to fetch cumulative report");
    } finally {
      client.release();
    }
  }
);

// Super admin analytics
router.get(
  "/super-admin/overview",
  authenticate,
  requireRole(["super_admin"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      // Total counts
      const schoolCount = await client.query(
        "SELECT COUNT(*) FROM schools WHERE is_active = true",
      );

      const tutorCount = await client.query(
        "SELECT COUNT(*) FROM tutors WHERE is_active = true",
      );

      const studentCount = await client.query(
        "SELECT COUNT(*) FROM students WHERE is_active = true",
      );

      const examCount = await client.query("SELECT COUNT(*) FROM exams");

      // Revenue stats
      const revenueStats = await client.query(
        `SELECT
        SUM(amount) as total_revenue,
        COUNT(*) as total_payments,
        currency
       FROM payments
       WHERE status = 'completed'
       GROUP BY currency`,
      );

      // Recent schools
      const recentSchools = await client.query(
        `SELECT id, name, email, country, created_at, plan_status
       FROM schools
       ORDER BY created_at DESC
       LIMIT 10`,
      );

      // Subscription breakdown
      const subscriptionStats = await client.query(
        `SELECT
        plan_status as subscription_status,
        COUNT(*) as count
       FROM schools
       GROUP BY plan_status`,
      );

      // Monthly revenue trend
      const monthlyRevenue = await client.query(
        `SELECT
        DATE_TRUNC('month', created_at) as month,
        SUM(amount) as revenue,
        currency
       FROM payments
       WHERE status = 'completed' AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', created_at), currency
       ORDER BY month DESC`,
      );

      ApiResponseHandler.success(
        res,
        transformResult({
          totalSchools: parseInt(schoolCount.rows[0].count),
          totalTutors: parseInt(tutorCount.rows[0].count),
          totalStudents: parseInt(studentCount.rows[0].count),
          totalExams: parseInt(examCount.rows[0].count),
          revenueByCurrency: revenueStats.rows.map((r) => ({
            currency: r.currency,
            totalRevenue: parseFloat(r.total_revenue),
            totalPayments: parseInt(r.total_payments),
          })),
          recentSchools: recentSchools.rows,
          subscriptionBreakdown: subscriptionStats.rows,
          monthlyRevenue: monthlyRevenue.rows.map((r) => ({
            month: r.month,
            revenue: parseFloat(r.revenue),
            currency: r.currency,
          })),
        }),
        "Super admin analytics overview retrieved",
      );
    } catch (error) {
      console.error("Super admin analytics error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch analytics");
    } finally {
      client.release();
    }
  },
);

// Student Report Card (Updated for schema alignment)
router.get(
  "/student-report-card/:studentId",
  authenticate,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { studentId } = req.params;
      const { yearId } = req.query;
      const user = req.user!;

      // Authorization Check
      if (user.role === "student" && user.id !== studentId) {
        return ApiResponseHandler.forbidden(res, "Unauthorized");
      }

      // Fetch Student & School Details
      const studentQuery = await client.query(
        `SELECT s.id, s.full_name, s.student_id as reg_number, s.email, s.school_id,
              sc.name as category_name,
              sch.name as school_name, sch.address as school_address, sch.email as school_email, sch.phone as school_phone
       FROM students s
       JOIN schools sch ON s.school_id = sch.id
       LEFT JOIN student_categories sc ON s.category_id = sc.id
       WHERE s.id = $1
       UNION ALL
       SELECT s.id, s.full_name, s.username as reg_number, s.email, s.school_id,
              sc.name as category_name,
              sch.name as school_name, sch.address as school_address, sch.email as school_email, sch.phone as school_phone
       FROM external_students s
       JOIN schools sch ON s.school_id = sch.id
       LEFT JOIN student_categories sc ON s.category_id = sc.id
       WHERE s.id = $1`,
        [studentId],
      );

      if (studentQuery.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Student not found");
      }

      const student = studentQuery.rows[0];

      // Verify school context — School Admin & Tutor must belong to same school as student
      if (
        user.role !== "super_admin" &&
        user.role !== "student" &&
        user.schoolId !== student.school_id
      ) {
        return ApiResponseHandler.forbidden(res, "Access denied. Student does not belong to your school.");
      }

      // Fetch Completed Exam Results (Filtered by year if provided)
      const resultsQuery = await client.query(
        `SELECT se.id, se.score, se.total_marks, se.percentage, se.status, se.completed_at,
              e.title as exam_title, e.exam_type, e.academic_session,
              ec.name as category_name,
              et.name as exam_type_name
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       LEFT JOIN exam_categories ec ON e.category_id = ec.id
       LEFT JOIN exam_types et ON e.exam_type_id = et.id
       WHERE (se.student_id = $1 OR se.external_student_id = $1) AND se.status = 'completed'
       AND ($2::uuid IS NULL OR e.academic_year_id = $2)
       ORDER BY se.completed_at DESC`,
        [studentId, yearId || null],
      );

      // Group by Category/Subject
      const groupedResults: Record<string, any[]> = {};
      let totalScore = 0;
      let totalPossible = 0;

      resultsQuery.rows.forEach((row) => {
        const category = row.category_name || "General";
        if (!groupedResults[category]) {
          groupedResults[category] = [];
        }

        // Calculate Grade
        let grade = "F";
        let remark = "Fail";
        const p = parseFloat(row.percentage);
        if (p >= 70) {
          grade = "A";
          remark = "Excellent";
        } else if (p >= 60) {
          grade = "B";
          remark = "Very Good";
        } else if (p >= 50) {
          grade = "C";
          remark = "Credit";
        } else if (p >= 45) {
          grade = "D";
          remark = "Pass";
        }

        groupedResults[category].push({
          exam: row.exam_title,
          score: row.score,
          total: row.total_marks,
          percentage: p.toFixed(1),
          grade,
          remark,
          date: row.completed_at,
          examType: row.exam_type_name || row.exam_type,
          academicSession: row.academic_session,
        });
        totalScore += parseFloat(row.score);
        totalPossible += parseFloat(row.total_marks);
      });

      ApiResponseHandler.success(
        res,
        transformResult({
          student: {
            name: student.full_name,
            regNumber: student.reg_number,
            level: student.category_name, // Map category_name to level for frontend compatibility
            category: student.category_name,
            school: student.school_name,
            schoolAddress: student.school_address,
            schoolEmail: student.school_email,
            schoolPhone: student.school_phone,
          },
          results: groupedResults,
          summary: {
            totalExams: resultsQuery.rows.length,
            overallPercentage:
              totalPossible > 0
                ? ((totalScore / totalPossible) * 100).toFixed(1)
                : 0,
          },
        }),
        "Report card generated successfully",
      );
    } catch (error) {
      console.error("Report card error:", error);
      ApiResponseHandler.serverError(res, "Failed to generate report card");
    } finally {
      client.release();
    }
  },
);

// Consolidated Advanced Report Card (Premium Feature)
router.get(
  "/advanced-report-card/:studentId",
  authenticate,
  requireFeature("advanced_analytics"),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { studentId } = req.params;
      const { timeframe, yearId } = req.query; // weekly, monthly, yearly, all, yearId
      const user = req.user!;

      // Fetch Student Info and School Details
      const studentQuery = await client.query(
        `SELECT * FROM (
          SELECT s.id, s.full_name, s.student_id as reg_number, s.email, s.school_id,
                 sc.name as category_name, sch.name as school_name, sch.logo_url,
                 sch.address as school_address, sch.email as school_email, sch.phone as school_phone
          FROM students s
          JOIN schools sch ON s.school_id = sch.id
          LEFT JOIN student_categories sc ON s.category_id = sc.id
          UNION ALL
          SELECT s.id, s.full_name, s.username as reg_number, s.email, s.school_id,
                 sc.name as category_name, sch.name as school_name, sch.logo_url,
                 sch.address as school_address, sch.email as school_email, sch.phone as school_phone
          FROM external_students s
          JOIN schools sch ON s.school_id = sch.id
          LEFT JOIN student_categories sc ON s.category_id = sc.id
        ) sub
        WHERE id = $1 AND (school_id = $2 OR $3 = 'super_admin')`,
        [studentId, user.schoolId, user.role],
      );

      if (studentQuery.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Student not found");
      }

      const student = studentQuery.rows[0];

      // Build Timeframe, Category, and Tutor Filters
      let filters = "";
      const queryParams: any[] = [studentId];

      if (timeframe === "weekly") {
        filters += " AND se.completed_at >= NOW() - INTERVAL '1 week'";
      } else if (timeframe === "monthly") {
        filters += " AND se.completed_at >= NOW() - INTERVAL '1 month'";
      } else if (timeframe === "yearly") {
        filters += " AND se.completed_at >= NOW() - INTERVAL '1 year'";
      }

      if (yearId) {
        queryParams.push(yearId);
        filters += ` AND e.academic_year_id = $${queryParams.length}`;
      }

      // Dynamic Category Filtering
      const { categories, tutors } = req.query;
      if (categories) {
        const catArray = typeof categories === 'string' ? categories.split(',') : (categories as string[]);
        queryParams.push(catArray);
        filters += ` AND ec.id = ANY($${queryParams.length})`;
      }

      // Dynamic Tutor Filtering
      if (tutors) {
        const tutorArray = typeof tutors === 'string' ? tutors.split(',') : (tutors as string[]);
        queryParams.push(tutorArray);
        filters += ` AND t.id = ANY($${queryParams.length})`;
      }

      // Fetch Results - Consolidated across all tutors in the same school
      const resultsQuery = await client.query(
        `SELECT se.id, se.score, se.total_marks, se.percentage, se.status, se.completed_at,
               se.historical_level_name as level,
               e.title as exam_title, e.exam_type, e.academic_session,
               ec.name as exam_category, ec.id as exam_category_id,
               et.name as exam_type_name,
               t.id as tutor_id, t.first_name || ' ' || t.last_name as tutor_name
        FROM student_exams se
        JOIN exams e ON se.exam_id = e.id
        JOIN tutors t ON e.tutor_id = t.id
        LEFT JOIN exam_categories ec ON e.category_id = ec.id
        LEFT JOIN exam_types et ON e.exam_type_id = et.id
        WHERE (se.student_id = $1 OR se.external_student_id = $1) AND se.status = 'completed' ${filters}
        ORDER BY se.completed_at DESC`,
        queryParams,
      );

      // Group results by level (historical_level_name) then by exam_category
      const results = resultsQuery.rows;
      const groupedByLevel: any = {};

      results.forEach((row) => {
        const level = row.level || "Unknown Level";
        if (!groupedByLevel[level]) {
          groupedByLevel[level] = {
            levelName: level,
            exams: [],
          };
        }
        groupedByLevel[level].exams.push({
          id: row.id,
          title: row.exam_title,
          category: row.exam_category,
          tutor: row.tutor_name,
          score: row.score,
          totalMarks: row.total_marks,
          percentage: row.percentage,
          date: row.completed_at,
          examType: row.exam_type_name || row.exam_type,
          academicSession: row.academic_session,
        });
      });

      // Calculate overall statistics
      let totalScore = 0;
      let totalPossible = 0;
      results.forEach((r) => {
        totalScore += parseFloat(r.score) || 0;
        totalPossible += parseFloat(r.total_marks) || 0;
      });

      ApiResponseHandler.success(
        res,
        transformResult({
          student: {
            id: student.id,
            name: student.full_name,
            regNumber: student.reg_number,
            currentLevel: student.category_name,
            school: student.school_name,
            schoolDetails: {
              address: student.school_address,
              email: student.school_email,
              phone: student.school_phone,
              logo_url: student.logo_url,
            },
          },
          timeframe: timeframe || "all",
          progression: Object.values(groupedByLevel),
          summary: {
            totalExams: results.length,
            overallAverage:
              totalPossible > 0
                ? ((totalScore / totalPossible) * 100).toFixed(2)
                : 0,
            totalMarksObtained: totalScore.toFixed(2),
            totalPossibleMarks: totalPossible.toFixed(2),
          },
        }),
        "Advanced report card generated successfully",
      );
    } catch (error) {
      console.error("Advanced report card error:", error);
      ApiResponseHandler.serverError(
        res,
        "Failed to generate advanced report card",
      );
    } finally {
      client.release();
    }
  },
);

// Issue a report to a student's portal
router.post(
  "/issue-report",
  authenticate,
  requireRole(["school", "tutor", "super_admin"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { studentId, title, config } = req.body;
      const user = req.user!;

      if (!studentId || !title || !config) {
        return ApiResponseHandler.badRequest(res, "Missing required fields");
      }

      const result = await client.query(
        `INSERT INTO issued_reports (student_id, staff_id, title, config)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [studentId, user.id, title, JSON.stringify(config)]
      );

      ApiResponseHandler.success(res, { id: result.rows[0].id }, "Report issued successfully");
    } catch (error: any) {
      console.error("Issue report error detailed:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        stack: error.stack
      });
      ApiResponseHandler.serverError(res, `Failed to issue report: ${error.message}`);
    } finally {
      client.release();
    }
  }
);

// Get all issued reports for a student
router.get(
  "/issued-reports/:studentId",
  authenticate,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { studentId } = req.params;
      const user = req.user!;

      // Authorization Check
      if (user.role === "student" && user.id !== studentId) {
        return ApiResponseHandler.forbidden(res, "Unauthorized");
      }

      const result = await client.query(
        `SELECT ir.*,
                COALESCE(s.name, t.full_name, NULLIF(TRIM(CONCAT(t.first_name, ' ', t.last_name)), ''), sa.name, 'Administrator') as issued_by_name
         FROM issued_reports ir
         LEFT JOIN schools s ON ir.staff_id = s.id
         LEFT JOIN tutors t ON ir.staff_id = t.id
         LEFT JOIN staff_accounts sa ON ir.staff_id = sa.id
         WHERE ir.student_id = $1
         ORDER BY ir.created_at DESC`,
        [studentId]
      );

      ApiResponseHandler.success(res, transformResult(result), "Issued reports retrieved");
    } catch (error) {
      console.error("Get issued reports error:", error);
      ApiResponseHandler.serverError(res, "Failed to retrieve issued reports");
    } finally {
      client.release();
    }
  }
);

// Get a specific issued report configuration
router.get(
  "/issued-report/:reportId",
  authenticate,
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const { reportId } = req.params;
      const user = req.user!;

      const result = await client.query(
        "SELECT * FROM issued_reports WHERE id = $1",
        [reportId]
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Report not found");
      }

      const report = result.rows[0];

      // Authorization check (student can only see their own)
      if (user.role === "student" && user.id !== report.student_id) {
        return ApiResponseHandler.forbidden(res, "Unauthorized");
      }

      ApiResponseHandler.success(res, transformResult(report), "Issued report retrieved");
    } catch (error) {
      console.error("Get issued report error:", error);
      ApiResponseHandler.serverError(res, "Failed to retrieve issued report");
    } finally {
      client.release();
    }
  }
);

// Get student performance analytics for mobile PerformanceScreen.tsx
router.get(
  "/student/performance",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    const client = await pool.connect();
    try {
      const user = req.user!;

      // Fetch student info
      const studentInfo = await client.query(
        'SELECT email, phone FROM students WHERE id = $1 UNION SELECT email, phone FROM external_students WHERE id = $1',
        [user.id]
      );
      const email = studentInfo.rows[0]?.email;
      const phone = studentInfo.rows[0]?.phone;

      // Overview Stats
      const stats = await client.query(
        `SELECT
           COUNT(*) as total_exams,
           AVG(percentage) as average_score,
           COUNT(CASE WHEN percentage >= 50 THEN 1 END) as passed_count
         FROM student_exams
         WHERE (student_id = $1 OR external_student_id = $1)
            OR (email = $2 AND $2 IS NOT NULL AND $2 != '')
            OR (phone = $3 AND $3 IS NOT NULL AND $3 != '')`,
        [user.id, email, phone]
      );

      const totalExams = parseInt(stats.rows[0].total_exams) || 0;
      const passRate = totalExams > 0
        ? Math.round((parseInt(stats.rows[0].passed_count) / totalExams) * 100)
        : 0;

      // Subject Breakdown
      const subjects = await client.query(
        `SELECT
           ec.name as name,
           AVG(se.percentage) as score
         FROM student_exams se
         JOIN exams e ON se.exam_id = e.id
         JOIN exam_categories ec ON e.category_id = ec.id
         WHERE (se.student_id = $1 OR se.external_student_id = $1)
            OR (se.email = $2 AND $2 IS NOT NULL AND $2 != '')
            OR (se.phone = $3 AND $3 IS NOT NULL AND $3 != '')
         GROUP BY ec.id, ec.name`,
        [user.id, email, phone]
      );

      ApiResponseHandler.success(res, transformResult({
        totalExams,
        averageScore: Math.round(parseFloat(stats.rows[0].average_score || 0)),
        passRate,
        subjects: subjects.rows.map(s => ({
          name: s.name,
          score: Math.round(parseFloat(s.score || 0))
        }))
      }), "Performance analytics retrieved");
    } catch (error) {
      console.error("Student performance analytics error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch performance data");
    } finally {
      client.release();
    }
  }
);


// ── Platform Intelligence & Traffic ───────────────────────

/**
 * POST /api/analytics/traffic - Record a page hit
 * Anonymously tracks visitors on landing/pricing pages
 */
router.post("/traffic", async (req: Request, res: Response) => {
  try {
    const { path, referrer, userAgent, deviceType } = req.body;
    
    // Anonymize IP
    const ip = req.ip || req.headers['x-forwarded-for'] || '0.0.0.0';
    const ipHash = crypto.createHash('sha256').update(ip.toString()).digest('hex');

    await pool.query(
      `INSERT INTO visitor_traffic (path, referrer, user_agent, device_type, ip_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [path || '/', referrer || null, userAgent || null, deviceType || 'desktop', ipHash]
    );

    ApiResponseHandler.success(res, null, "Traffic recorded");
  } catch (error) {
    console.error("Traffic recording error:", error);
    // Silent fail for traffic recording to not disrupt user experience
    ApiResponseHandler.success(res, null, "Traffic recorded (with bypass)");
  }
});

/**
 * GET /api/analytics/intelligence - Platform engagement summary
 * Accessible by Super Admin and Coordinating Admin
 */
router.get(
  "/intelligence",
  authenticate,
  requireCoordinatingAdmin,
  async (req: Request, res: Response) => {
    try {
      const { timeframe = 'monthly' } = req.query; // daily, weekly, monthly, yearly
      
      let dateInterval = "INTERVAL '1 month'";
      let groupFormat = "YYYY-MM-DD";
      
      if (timeframe === 'daily') dateInterval = "INTERVAL '24 hours'";
      else if (timeframe === 'weekly') dateInterval = "INTERVAL '7 days'";
      else if (timeframe === 'yearly') dateInterval = "INTERVAL '1 year'";

      // 1. Visitors Trend
      const visitorTrend = await pool.query(
        `SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as total_hits, COUNT(DISTINCT ip_hash) as unique_visitors
         FROM visitor_traffic
         WHERE created_at >= NOW() - ${dateInterval}
         GROUP BY 1 ORDER BY 1 ASC`
      );

      // 2. Registration Trend (Segmented)
      const registrations = await pool.query(
        `SELECT 'Schools' as segment, COUNT(*) FROM schools WHERE created_at >= NOW() - ${dateInterval}
         UNION ALL
         SELECT 'Tutors' as segment, COUNT(*) FROM tutors WHERE created_at >= NOW() - ${dateInterval}
         UNION ALL
         SELECT 'Students' as segment, COUNT(*) FROM students WHERE created_at >= NOW() - ${dateInterval}`
      );

      // 3. Login Activity (from activity_logs)
      const loginActivity = await pool.query(
        `SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as logins
         FROM activity_logs
         WHERE action = 'LOGIN' AND created_at >= NOW() - ${dateInterval}
         GROUP BY 1 ORDER BY 1 ASC`
      );

      // 4. Totals for KPI Cards
      const kpis = await pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM schools) as total_schools,
          (SELECT COUNT(*) FROM students) as total_students,
          (SELECT COUNT(*) FROM activity_logs WHERE action = 'LOGIN' AND created_at >= NOW() - INTERVAL '24 hours') as logins_today
      `);

      ApiResponseHandler.success(res, transformResult({
        visitorTrend: visitorTrend.rows,
        registrations: registrations.rows,
        loginActivity: loginActivity.rows,
        kpis: kpis.rows[0]
      }), "Platform intelligence retrieved");
    } catch (error) {
      console.error("Intelligence analytics error:", error);
      ApiResponseHandler.serverError(res, "Failed to fetch platform intelligence");
    }
  }
);

export default router;
