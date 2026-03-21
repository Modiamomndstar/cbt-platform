import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { courseService } from '../services/courseService';
import { aiService } from '../services/aiService';
import { logger } from '../utils/logger';
import { requireFeature } from '../middleware/planGuard';
import { ApiResponseHandler } from '../utils/apiResponse';

const router = express.Router();

// 1. Course Management
router.post('/', authenticate, authorize('school', 'tutor'), requireFeature('lms_access'), async (req: any, res) => {
    try {
        const course = await courseService.createCourse({
            ...req.body,
            school_id: (req.user as any).schoolId || (req.user as any).id,
            tutor_id: req.user.role === 'tutor' ? req.user.id : req.body.tutor_id
        });
        return ApiResponseHandler.created(res, course);
    } catch (error: any) {
        return ApiResponseHandler.badRequest(res, error.message);
    }
});

router.put('/:id', authenticate, authorize('school', 'tutor'), requireFeature('lms_access'), async (req: any, res) => {
    try {
        const course = await courseService.updateCourse(req.params.id, req.body);
        return ApiResponseHandler.success(res, course);
    } catch (error: any) {
        return ApiResponseHandler.badRequest(res, error.message);
    }
});

router.get('/', authenticate, requireFeature('lms_access'), async (req: any, res) => {
    try {
        const includeArchived = req.query.includeArchived === 'true';
        const { yearId } = req.query;
        const schoolId = req.user.schoolId || req.user.id;
        const courses = await courseService.getSchoolCourses(schoolId, includeArchived, yearId as string);
        return ApiResponseHandler.success(res, courses);
    } catch (error: any) {
        return ApiResponseHandler.serverError(res, error.message);
    }
});

router.get('/:id', authenticate, requireFeature('lms_access'), async (req: any, res) => {
    try {
        const course = await courseService.getCourseById(req.params.id);
        if (!course) return ApiResponseHandler.notFound(res, 'Course not found');
        
        const structure = await courseService.getCourseFullStructure(req.params.id);
        return ApiResponseHandler.success(res, { ...course, structure });
    } catch (error: any) {
        return ApiResponseHandler.serverError(res, error.message);
    }
});

// Clone a course for a new academic session
router.post('/:id/clone', authenticate, authorize('school', 'tutor'), requireFeature('lms_access'), async (req: any, res) => {
    try {
        const { targetYearId } = req.body;
        const cloned = await courseService.cloneCourse(
            req.params.id,
            targetYearId || null,
            req.user.id,
            (req.user as any).schoolId || (req.user as any).id
        );
        return ApiResponseHandler.created(res, cloned, 'Course cloned successfully');
    } catch (error: any) {
        logger.error('Clone course failed', error);
        return ApiResponseHandler.badRequest(res, error.message);
    }
});

// Archive / un-archive a course
router.patch('/:id/archive', authenticate, authorize('school', 'tutor'), requireFeature('lms_access'), async (req: any, res) => {
    try {
        const { archive = true } = req.body;
        const course = await courseService.archiveCourse(req.params.id, archive);
        return ApiResponseHandler.success(res, course, archive ? 'Course archived' : 'Course restored');
    } catch (error: any) {
        return ApiResponseHandler.badRequest(res, error.message);
    }
});

// 2. Module & Content
router.post('/:id/modules', authenticate, authorize('school', 'tutor'), requireFeature('lms_access'), async (req, res) => {
    try {
        const module = await courseService.addModule({
            ...req.body,
            course_id: req.params.id
        });
        return ApiResponseHandler.created(res, module);
    } catch (error: any) {
        return ApiResponseHandler.badRequest(res, error.message);
    }
});

router.put('/modules/:moduleId', authenticate, authorize('school', 'tutor'), requireFeature('lms_access'), async (req, res) => {
    try {
        const module = await courseService.updateModule(req.params.moduleId, req.body);
        return ApiResponseHandler.success(res, module);
    } catch (error: any) {
        return ApiResponseHandler.badRequest(res, error.message);
    }
});

router.post('/modules/:moduleId/contents', authenticate, authorize('school', 'tutor'), requireFeature('lms_access'), async (req, res) => {
    try {
        const content = await courseService.addContent({
            ...req.body,
            module_id: req.params.moduleId
        });
        return ApiResponseHandler.created(res, content);
    } catch (error: any) {
        return ApiResponseHandler.badRequest(res, error.message);
    }
});

// 3. AI Generation
router.post('/generate-syllabus', authenticate, authorize('school', 'tutor'), requireFeature('lms_access'), async (req, res) => {
    try {
        const { topic, subject } = req.body;
        const syllabus = await aiService.generateCourseSyllabus(topic, subject);
        return ApiResponseHandler.success(res, syllabus);
    } catch (error: any) {
        return ApiResponseHandler.serverError(res, error.message);
    }
});

router.post('/generate-content', authenticate, authorize('school', 'tutor'), requireFeature('lms_access'), async (req, res) => {
    try {
        const { moduleTitle, lessonTitle, topic } = req.body;
        const content = await aiService.generateLessonContent(moduleTitle, lessonTitle, topic);
        return ApiResponseHandler.success(res, content);
    } catch (error: any) {
        return ApiResponseHandler.serverError(res, error.message);
    }
});

router.post('/:id/generate-integrated-exam', authenticate, authorize('school', 'tutor'), requireFeature('lms_access'), async (req: any, res) => {
    try {
        const { moduleIds, numQuestions, topic } = req.body;
        const aggregatedContent = await courseService.getMultipleModulesContent(moduleIds);
        const questions = await aiService.generateIntegratedExam(topic || 'Course Assessment', aggregatedContent, numQuestions || 10);
        return ApiResponseHandler.success(res, questions);
    } catch (error: any) {
        return ApiResponseHandler.serverError(res, error.message);
    }
});

// 4. Learning Assistant
router.post('/ai-assistant', authenticate, requireFeature('lms_access'), async (req: any, res) => {
    try {
        const { lessonContent, userMessage, history } = req.body;
        const reply = await aiService.learningAssistantChat(lessonContent, userMessage, history || []);
        return ApiResponseHandler.success(res, reply);
    } catch (error: any) {
        return ApiResponseHandler.serverError(res, error.message);
    }
});

// 5. Progress Tracking
router.post('/:id/progress/:contentId', authenticate, authorize('student'), requireFeature('lms_access'), async (req: any, res) => {
    try {
        const progress = await courseService.updateProgress(req.user.id, req.params.id, req.params.contentId);
        return ApiResponseHandler.success(res, progress);
    } catch (error: any) {
        return ApiResponseHandler.badRequest(res, error.message);
    }
});

router.get('/:id/my-progress', authenticate, authorize('student'), requireFeature('lms_access'), async (req: any, res) => {
    try {
        const progress = await courseService.getStudentProgress(req.user.id, req.params.id);
        return ApiResponseHandler.success(res, progress);
    } catch (error: any) {
        return ApiResponseHandler.serverError(res, error.message);
    }
});

router.get('/:id/student-progress', authenticate, authorize('school', 'tutor'), requireFeature('lms_access'), async (req: any, res) => {
    try {
        const course = await courseService.getCourseById(req.params.id);
        if (!course) return res.status(404).json({ success: false, message: 'Course not found' });

        // Authorization: Tutor can only see their own courses' progress
        if (req.user.role === 'tutor' && course.tutor_id !== req.user.id) {
            return ApiResponseHandler.forbidden(res, 'Forbidden: You can only view progress for your own courses');
        }

        // School Admin can see all school courses' progress
        if (req.user.role === 'school' && course.school_id !== (req.user as any).schoolId) {
            return ApiResponseHandler.forbidden(res, 'Forbidden: Course belongs to another school');
        }

        const progress = await courseService.getCourseStudentProgress(req.params.id);
        return ApiResponseHandler.success(res, progress);
    } catch (error: any) {
        return ApiResponseHandler.serverError(res, error.message);
    }
});

export default router;
