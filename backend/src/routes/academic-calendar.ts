import express from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { academicCalendarService } from '../services/academicCalendarService';
import { ApiResponseHandler } from '../utils/apiResponse';
import { transformResult } from '../utils/responseTransformer';

const router = express.Router();

// 1. Academic Year Management
router.get('/years', authenticate, async (req: any, res) => {
    try {
        const years = await academicCalendarService.getSchoolYears(req.user.schoolId);
        // Attach periods to each year for cascading dropdowns
        const yearsWithPeriods = await Promise.all(years.map(async (year: any) => {
            const periods = await academicCalendarService.getYearPeriods(year.id);
            return { ...year, periods };
        }));
        ApiResponseHandler.success(res, transformResult(yearsWithPeriods));
    } catch (error: any) {
        ApiResponseHandler.serverError(res, error.message);
    }
});

router.get('/active', authenticate, async (req: any, res) => {
    try {
        const year = await academicCalendarService.getActiveYear(req.user.schoolId);
        if (!year) return ApiResponseHandler.success(res, null);
        
        ApiResponseHandler.success(res, transformResult(year));
    } catch (error: any) {
        ApiResponseHandler.serverError(res, error.message);
    }
});

router.post('/years', authenticate, authorize('school'), async (req: any, res) => {
    try {
        const year = await academicCalendarService.createYear({
            ...req.body,
            school_id: req.user.schoolId
        });
        ApiResponseHandler.created(res, transformResult(year), "Academic Year created");
    } catch (error: any) {
        ApiResponseHandler.badRequest(res, error.message);
    }
});

// 2. Automated Setup (Presets)
router.post('/setup-preset', authenticate, authorize('school'), async (req: any, res) => {
    try {
        const { name, startDate, weeksPerTerm } = req.body;
        const year = await academicCalendarService.setupStandardThreeTermYear(
            req.user.schoolId, 
            name, 
            startDate, 
            weeksPerTerm || 13
        );
        ApiResponseHandler.created(res, transformResult(year), "Standard 3-Term Academic Year setup complete");
    } catch (error: any) {
        ApiResponseHandler.serverError(res, error.message);
    }
});

router.post('/setup-flexible', authenticate, authorize('school'), async (req: any, res) => {
    try {
        const { name, startDate, periodCount, weeksPerPeriod } = req.body;
        const year = await academicCalendarService.setupFlexibleProgram(
            req.user.schoolId,
            name,
            startDate,
            periodCount,
            weeksPerPeriod
        );
        ApiResponseHandler.created(res, transformResult(year), "Flexible Academic Program setup complete");
    } catch (error: any) {
        ApiResponseHandler.serverError(res, error.message);
    }
});

// 3. Period & Week Retrieval
router.get('/periods/:periodId/weeks', authenticate, async (req: any, res) => {
    try {
        const weeks = await academicCalendarService.getPeriodWeeks(req.params.periodId);
        ApiResponseHandler.success(res, transformResult(weeks));
    } catch (error: any) {
        ApiResponseHandler.serverError(res, error.message);
    }
});

export default router;
