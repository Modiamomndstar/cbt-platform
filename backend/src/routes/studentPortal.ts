import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { courseService } from '../services/courseService';
import { aiService } from '../services/aiService';
import { ApiResponseHandler } from '../utils/apiResponse';
import { transformResult } from '../utils/responseTransformer';

const router = express.Router();

// POST /api/student-portal/generate-study-plan
router.post('/generate-study-plan', authenticate, authorize('student'), async (req: any, res, next) => {
    try {
        const studentId = req.user.id;
        const schoolId = req.user.schoolId;
        
        // 1. Get Context
        const context = await courseService.getStudentDashboardContext(studentId, schoolId);
        
        if (!context.activeWeek) {
            return ApiResponseHandler.error(res, "Cannot generate study plan: No active academic week found for this school.", 400);
        }

        // 2. Format for AI
        const aiReq = {
            studentName: req.user.full_name || "Student",
            academicWeekLabel: context.activeWeek.label || `Week ${context.activeWeek.week_number}`,
            courses: context.courses.map((c: any) => ({
                title: c.title,
                focusModules: context.focusModules
                    .filter((m: any) => m.course_id === c.id)
                    .map((m: any) => m.title)
            }))
        };

        // 3. Generate
        const studyPlan = await aiService.generateStudyPlan(aiReq);
        ApiResponseHandler.success(res, transformResult(studyPlan), "Personalized study plan generated successfully");
    } catch (error) {
        next(error);
    }
});

// GET /api/student-portal/dashboard
router.get('/dashboard', authenticate, authorize('student'), async (req: any, res, next) => {
    try {
        const { yearId } = req.query;
        const context = await courseService.getStudentDashboardContext(req.user.id, req.user.schoolId, yearId as string);
        ApiResponseHandler.success(res, transformResult(context), "Student dashboard context retrieved");
    } catch (error) {
        next(error);
    }
});

// GET /api/student-portal/courses
router.get('/courses', authenticate, authorize('student'), async (req: any, res, next) => {
    try {
        const { yearId } = req.query;
        const courses = await courseService.getStudentDashboardContext(req.user.id, req.user.schoolId, yearId as string);
        ApiResponseHandler.success(res, transformResult(courses.courses), "Enrolled courses retrieved");
    } catch (error) {
        next(error);
    }
});

export default router;
