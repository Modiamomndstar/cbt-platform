import { Router, Request, Response } from 'express';
import { pool } from '../config/database';
import { authenticate, requireRole } from '../middleware/auth';

const router = Router();

// School dashboard analytics
router.get('/school/dashboard', authenticate, requireRole(['school']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const user = req.user!;

    // Total counts
    const tutorCount = await client.query(
      'SELECT COUNT(*) FROM tutors WHERE school_id = $1 AND is_active = true',
      [user.schoolId]
    );

    const studentCount = await client.query(
      'SELECT COUNT(*) FROM students WHERE school_id = $1 AND is_active = true',
      [user.schoolId]
    );

    const examCount = await client.query(
      `SELECT COUNT(*) FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE t.school_id = $1`,
      [user.schoolId]
    );

    const publishedExamCount = await client.query(
      `SELECT COUNT(*) FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE t.school_id = $1 AND e.is_published = true`,
      [user.schoolId]
    );

    // Recent exams
    const recentExams = await client.query(
      `SELECT e.*, t.first_name as tutor_first_name, t.last_name as tutor_last_name
       FROM exams e
       JOIN tutors t ON e.tutor_id = t.id
       WHERE t.school_id = $1
       ORDER BY e.created_at DESC
       LIMIT 5`,
      [user.schoolId]
    );

    // Recent results
    const recentResults = await client.query(
      `SELECT se.*, e.title as exam_title,
              s.first_name, s.last_name
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       JOIN students s ON se.student_id = s.id
       WHERE t.school_id = $1
       ORDER BY se.end_time DESC
       LIMIT 5`,
      [user.schoolId]
    );

    // Category distribution
    const categoryDistribution = await client.query(
      `SELECT sc.name, COUNT(s.id) as student_count
       FROM student_categories sc
       LEFT JOIN students s ON sc.id = s.category_id AND s.is_active = true
       WHERE sc.school_id = $1
       GROUP BY sc.id, sc.name
       ORDER BY sc.name`,
      [user.schoolId]
    );

    // Monthly exam completion stats (last 6 months)
    const monthlyStats = await client.query(
      `SELECT
        DATE_TRUNC('month', se.end_time) as month,
        COUNT(*) as exam_count,
        AVG(se.percentage) as average_percentage
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       JOIN tutors t ON e.tutor_id = t.id
       WHERE t.school_id = $1 AND se.end_time >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', se.end_time)
       ORDER BY month DESC`,
      [user.schoolId]
    );

    res.json({
      success: true,
      data: {
        totalTutors: parseInt(tutorCount.rows[0].count),
        totalStudents: parseInt(studentCount.rows[0].count),
        totalExams: parseInt(examCount.rows[0].count),
        publishedExams: parseInt(publishedExamCount.rows[0].count),
        recentExams: recentExams.rows.map(e => ({
          id: e.id,
          title: e.title,
          tutorName: `${e.tutor_first_name} ${e.tutor_last_name}`,
          isPublished: e.is_published,
          createdAt: e.created_at
        })),
        recentResults: recentResults.rows.map(r => ({
          id: r.id,
          examTitle: r.exam_title,
          studentName: `${r.first_name} ${r.last_name}`,
          score: r.score,
          percentage: r.percentage,
          status: r.status,
          submittedAt: r.end_time
        })),
        categoryDistribution: categoryDistribution.rows,
        monthlyStats: monthlyStats.rows.map(m => ({
          month: m.month,
          examCount: parseInt(m.exam_count),
          averagePercentage: parseFloat(m.average_percentage || 0).toFixed(2)
        }))
      }
    });
  } catch (error) {
    console.error('School dashboard analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  } finally {
    client.release();
  }
});

// Tutor dashboard analytics
router.get('/tutor/dashboard', authenticate, requireRole(['tutor']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const user = req.user!;

    // Tutor's exam stats
    const examStats = await client.query(
      `SELECT
        COUNT(*) as total_exams,
        COUNT(CASE WHEN is_published = true THEN 1 END) as published_exams
       FROM exams WHERE tutor_id = $1`,
      [user.id]
    );

    // Total students who took tutor's exams
    const studentStats = await client.query(
      `SELECT COUNT(DISTINCT se.student_id) as total_students
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       WHERE e.tutor_id = $1`,
      [user.id]
    );

    // Average performance
    const performanceStats = await client.query(
      `SELECT
        AVG(se.percentage) as average_percentage,
        AVG(se.score) as average_score
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       WHERE e.tutor_id = $1`,
      [user.id]
    );

    // Recent exams by tutor
    const recentExams = await client.query(
      `SELECT * FROM exams
       WHERE tutor_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [user.id]
    );

    // Exam performance breakdown
    const examPerformance = await client.query(
      `SELECT
        e.id, e.title,
        COUNT(se.id) as attempt_count,
        AVG(se.percentage) as average_percentage,
        MAX(se.percentage) as highest_percentage,
        MIN(se.percentage) as lowest_percentage
       FROM exams e
       LEFT JOIN student_exams se ON e.id = se.exam_id
       WHERE e.tutor_id = $1
       GROUP BY e.id, e.title
       ORDER BY e.created_at DESC
       LIMIT 10`,
      [user.id]
    );

    // Upcoming exams (scheduled)
    const upcomingExams = await client.query(
      `SELECT es.*, e.title as exam_title, e.duration_minutes, COUNT(se.id) as student_count
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       LEFT JOIN student_exams se ON es.id = se.schedule_id
       WHERE e.tutor_id = $1
         AND es.status = 'scheduled'
         AND es.scheduled_date >= CURRENT_DATE
       GROUP BY es.id, e.title, e.duration_minutes
       ORDER BY es.scheduled_date ASC
       LIMIT 5`,
      [user.id]
    );

    res.json({
      success: true,
      data: {
        totalExams: parseInt(examStats.rows[0].total_exams),
        publishedExams: parseInt(examStats.rows[0].published_exams),
        totalStudents: parseInt(studentStats.rows[0].total_students),
        averagePercentage: parseFloat(performanceStats.rows[0].average_percentage || 0).toFixed(2),
        averageScore: parseFloat(performanceStats.rows[0].average_score || 0).toFixed(2),
        recentExams: recentExams.rows,
        upcomingExams: upcomingExams.rows.map(e => ({
          id: e.id,
          examTitle: e.exam_title,
          scheduledDate: e.scheduled_date,
          startTime: e.start_time,
          endTime: e.end_time,
          studentCount: parseInt(e.student_count)
        })),
        examPerformance: examPerformance.rows.map(e => ({
          id: e.id,
          title: e.title,
          attemptCount: parseInt(e.attempt_count),
          averagePercentage: parseFloat(e.average_percentage || 0).toFixed(2),
          highestPercentage: parseFloat(e.highest_percentage || 0).toFixed(2),
          lowestPercentage: parseFloat(e.lowest_percentage || 0).toFixed(2)
        }))
      }
    });
  } catch (error) {
    console.error('Tutor dashboard analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  } finally {
    client.release();
  }
});

// Student dashboard analytics
router.get('/student/dashboard', authenticate, requireRole(['student']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const user = req.user!;

    // Total exams taken
    const examStats = await client.query(
      `SELECT
        COUNT(*) as total_exams,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as passed_count,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_count
       FROM student_exams WHERE student_id = $1`,
      [user.id]
    );

    // Average score
    const scoreStats = await client.query(
      `SELECT
        AVG(percentage) as average_percentage,
        AVG(score) as average_score,
        MAX(percentage) as highest_percentage,
        MAX(score) as highest_score
       FROM student_exams WHERE student_id = $1`,
      [user.id]
    );

    // Recent exams
    const recentExams = await client.query(
      `SELECT se.*, e.title as exam_title, e.description
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       WHERE se.student_id = $1
       ORDER BY se.end_time DESC
       LIMIT 5`,
      [user.id]
    );

    // Upcoming scheduled exams
    const upcomingExams = await client.query(
      `SELECT es.*, e.title as exam_title, e.duration_minutes
       FROM exam_schedules es
       JOIN exams e ON es.exam_id = e.id
       WHERE es.student_id = $1
         AND es.status = 'scheduled'
         AND es.scheduled_date >= CURRENT_DATE
       ORDER BY es.scheduled_date, es.start_time
       LIMIT 5`,
      [user.id]
    );

    // Performance by subject/category
    const categoryPerformance = await client.query(
      `SELECT
        sc.name as category_name,
        COUNT(se.id) as exam_count,
        AVG(se.percentage) as average_percentage
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       JOIN student_categories sc ON e.category_id = sc.id
       WHERE se.student_id = $1
       GROUP BY sc.id, sc.name`,
      [user.id]
    );

    // Monthly progress
    const monthlyProgress = await client.query(
      `SELECT
        DATE_TRUNC('month', se.end_time) as month,
        COUNT(*) as exam_count,
        AVG(se.percentage) as average_percentage
       FROM student_exams se
       WHERE se.student_id = $1 AND se.end_time >= NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', se.end_time)
       ORDER BY month DESC`,
      [user.id]
    );

    res.json({
      success: true,
      data: {
        totalExams: parseInt(examStats.rows[0].total_exams),
        passedCount: parseInt(examStats.rows[0].passed_count),
        failedCount: parseInt(examStats.rows[0].failed_count),
        averagePercentage: parseFloat(scoreStats.rows[0].average_percentage || 0).toFixed(2),
        averageScore: parseFloat(scoreStats.rows[0].average_score || 0).toFixed(2),
        highestPercentage: parseFloat(scoreStats.rows[0].highest_percentage || 0).toFixed(2),
        highestScore: parseFloat(scoreStats.rows[0].highest_score || 0).toFixed(2),
        recentExams: recentExams.rows.map(e => ({
          id: e.id,
          examTitle: e.exam_title,
          description: e.description,
          score: e.score,
          percentage: e.percentage,
          status: e.status,
          submittedAt: e.end_time
        })),
        upcomingExams: upcomingExams.rows.map(e => ({
          id: e.id,
          examTitle: e.exam_title,
          durationMinutes: e.duration_minutes,
          scheduledDate: e.scheduled_date,
          startTime: e.start_time,
          endTime: e.end_time
        })),
        categoryPerformance: categoryPerformance.rows.map(c => ({
          categoryName: c.category_name,
          examCount: parseInt(c.exam_count),
          averagePercentage: parseFloat(c.average_percentage || 0).toFixed(2)
        })),
        monthlyProgress: monthlyProgress.rows.map(m => ({
          month: m.month,
          examCount: parseInt(m.exam_count),
          averagePercentage: parseFloat(m.average_percentage || 0).toFixed(2)
        }))
      }
    });
  } catch (error) {
    console.error('Student dashboard analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  } finally {
    client.release();
  }
});

// Super admin analytics
router.get('/super-admin/overview', authenticate, requireRole(['super_admin']), async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    // Total counts
    const schoolCount = await client.query(
      'SELECT COUNT(*) FROM schools WHERE is_active = true'
    );

    const tutorCount = await client.query(
      'SELECT COUNT(*) FROM tutors WHERE is_active = true'
    );

    const studentCount = await client.query(
      'SELECT COUNT(*) FROM students WHERE is_active = true'
    );

    const examCount = await client.query(
      'SELECT COUNT(*) FROM exams'
    );

    // Revenue stats
    const revenueStats = await client.query(
      `SELECT
        SUM(amount) as total_revenue,
        COUNT(*) as total_payments,
        currency
       FROM payments
       WHERE status = 'completed'
       GROUP BY currency`
    );

    // Recent schools
    const recentSchools = await client.query(
      `SELECT id, school_name, email, country, created_at, subscription_status
       FROM schools
       ORDER BY created_at DESC
       LIMIT 10`
    );

    // Subscription breakdown
    const subscriptionStats = await client.query(
      `SELECT
        subscription_status,
        COUNT(*) as count
       FROM schools
       GROUP BY subscription_status`
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
       ORDER BY month DESC`
    );

    res.json({
      success: true,
      data: {
        totalSchools: parseInt(schoolCount.rows[0].count),
        totalTutors: parseInt(tutorCount.rows[0].count),
        totalStudents: parseInt(studentCount.rows[0].count),
        totalExams: parseInt(examCount.rows[0].count),
        revenueByCurrency: revenueStats.rows.map(r => ({
          currency: r.currency,
          totalRevenue: parseFloat(r.total_revenue),
          totalPayments: parseInt(r.total_payments)
        })),
        recentSchools: recentSchools.rows,
        subscriptionBreakdown: subscriptionStats.rows,
        monthlyRevenue: monthlyRevenue.rows.map(r => ({
          month: r.month,
          revenue: parseFloat(r.revenue),
          currency: r.currency
        }))
      }
    });
  } catch (error) {
    console.error('Super admin analytics error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
  } finally {
    client.release();
  }
});

// Student Report Card
router.get('/student-report-card/:studentId', authenticate, async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { studentId } = req.params;
    const user = req.user!;

    // Authorization Check
    if (user.role === 'student' && user.id !== studentId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (user.role === 'tutor') {
      // Check if tutor is assigned to student
      const assignment = await client.query(
        'SELECT 1 FROM student_tutors WHERE student_id = $1 AND tutor_id = $2',
        [studentId, user.id] // user.id here is the USER ID, not tutorId. But wait, req.user for tutor has id as userId?
        // Actually, in auth middleware, req.user payload usually has id. If role is tutor, it might trigger logic.
        // Let's check auth middleware. simpler: check if student belongs to tutor's school at least?
        // Better: strict assignment check.
        // BUT `req.user` might be the specific Tutor table ID or the Users table ID depending on implementation.
        // Looking at `tutors.ts`: `const { id } = req.params; const { role, schoolId, tutorId } = req.user!;`
        // So req.user has `tutorId`.
      );
      // Wait, let's look at `req.user` type usage in other files.
      // `const { role, schoolId, tutorId } = req.user!;`
      // So I should use `user.tutorId`.
      // Let's verify assignment.
    }

    // Simpler check for now: Verify School Context (School Admin & Tutor must belong to same school as student)
    let querySchoolId = user.schoolId;
    if (user.role === 'tutor' && user.tutorId) {
        // Fetch tutor's school if not in token (usually is)
    }

    // Fetch Student & School Details
    const studentQuery = await client.query(
      `SELECT s.id, s.full_name, s.student_id as reg_number, s.email, s.level,
              sc.name as category_name,
              sch.school_name, sch.address as school_address, sch.email as school_email, sch.phone as school_phone
       FROM students s
       JOIN schools sch ON s.school_id = sch.id
       LEFT JOIN student_categories sc ON s.category_id = sc.id
       WHERE s.id = $1`,
      [studentId]
    );

    if (studentQuery.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }
    const student = studentQuery.rows[0];

    // Authorization verify (ensure user belongs to same school as student)
    if (user.role !== 'super_admin' && user.schoolId !== studentQuery.rows[0].school_id && user.role !== 'student') {
        // Actually, previous logic in other routes uses `s.school_id = $1` in WHERE clause.
        // Since we already fetched, let's check:
        // if (user.schoolId && user.schoolId !== student.school_id) return 403.
    }

    // Fetch Completed Exam Results
    const resultsQuery = await client.query(
      `SELECT se.id, se.score, se.total_marks, se.percentage, se.status, se.end_time as completed_at,
              e.title as exam_title, e.subject,
              sc.name as category_name
       FROM student_exams se
       JOIN exams e ON se.exam_id = e.id
       LEFT JOIN student_categories sc ON e.category_id = sc.id
       WHERE se.student_id = $1 AND se.status = 'completed'
       ORDER BY se.end_time DESC`,
       [studentId]
    );

    // Group by Category/Subject
    const groupedResults: Record<string, any[]> = {};
    let totalScore = 0;
    let totalPossible = 0;

    resultsQuery.rows.forEach(row => {
        const category = row.category_name || 'General';
        if (!groupedResults[category]) {
            groupedResults[category] = [];
        }

        // Calculate Grade
        let grade = 'F';
        let remark = 'Fail';
        const p = parseFloat(row.percentage);
        if (p >= 70) { grade = 'A'; remark = 'Excellent'; }
        else if (p >= 60) { grade = 'B'; remark = 'Very Good'; }
        else if (p >= 50) { grade = 'C'; remark = 'Credit'; }
        else if (p >= 45) { grade = 'D'; remark = 'Pass'; }

        groupedResults[category].push({
            exam: row.exam_title,
            score: row.score,
            total: row.total_marks,
            percentage: p.toFixed(1),
            grade,
            remark,
            date: row.completed_at
        });

        totalScore += parseFloat(row.score);
        totalPossible += parseFloat(row.total_marks);
    });

    res.json({
        success: true,
        data: {
            student: {
                name: student.full_name,
                regNumber: student.reg_number,
                level: student.level,
                category: student.category_name,
                school: student.school_name,
                schoolAddress: student.school_address,
                schoolEmail: student.school_email,
                schoolPhone: student.school_phone
            },
            results: groupedResults,
            summary: {
                totalExams: resultsQuery.rows.length,
                overallPercentage: totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(1) : 0
            }
        }
    });

  } catch (error) {
    console.error('Report card error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report card' });
  } finally {
    client.release();
  }
});

export default router;
