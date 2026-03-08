import { Router } from 'express';
import { competitionService } from '../services/competitionService';
import { authenticate, requireCompetitionAccess } from '../middleware/auth';
import { ApiResponseHandler } from '../utils/apiResponse';
import { transformResult } from '../utils/responseTransformer';

const router = Router();

// All competition routes require authentication
router.use(authenticate);

// Publicly visible routes within the platform (all roles)
router.get('/featured', async (req, res) => {
  try {
    const competitions = await competitionService.getFeaturedCompetitions();
    ApiResponseHandler.success(res, transformResult(competitions));
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

router.get('/hub-stats', requireCompetitionAccess, async (req, res) => {
  try {
    const stats = await competitionService.getHubStats();
    ApiResponseHandler.success(res, transformResult(stats));
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

router.get('/:id/rewards', async (req, res) => {
  try {
    const rewards = await competitionService.getRewards(req.params.id);
    ApiResponseHandler.success(res, transformResult(rewards));
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

// Management routes require competition admin access
router.post('/', requireCompetitionAccess, async (req, res) => {
  try {
    const staffId = req.user!.id;
    const competition = await competitionService.createCompetition(req.body, staffId);
    ApiResponseHandler.success(res, transformResult(competition), 'Competition created successfully', 201);
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

router.post('/:id/rewards', requireCompetitionAccess, async (req, res) => {
  try {
    const { rewards } = req.body;
    await competitionService.setRewards(req.params.id, rewards);
    ApiResponseHandler.success(res, null, 'Rewards updated successfully');
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

router.patch('/:id/promotion', requireCompetitionAccess, async (req, res) => {
  try {
    await competitionService.updatePromotion(req.params.id, req.body);
    ApiResponseHandler.success(res, null, 'Promotion updated successfully');
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

router.get('/', requireCompetitionAccess, async (req, res) => {
  try {
    const competitions = await competitionService.getAllCompetitions();
    ApiResponseHandler.success(res, transformResult(competitions));
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

/**
 * @route   GET /api/competitions/:id
 * @desc    Get competition details with categories and stages
 */
router.get('/:id', async (req, res) => {
  try {
    const competition = await competitionService.getCompetitionById(req.params.id);
    if (!competition) return ApiResponseHandler.notFound(res, 'Competition not found');

    const categories = await competitionService.getCategories(req.params.id);

    // Enrich categories with their stages
    const enrichedCategories = await Promise.all(categories.map(async (cat) => {
      const stages = await competitionService.getStages(cat.id);
      return { ...cat, stages };
    }));

    ApiResponseHandler.success(res, transformResult({ ...competition, categories: enrichedCategories }));
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

/**
 * @route   POST /api/competitions/:id/categories
 * @desc    Add a category to a competition
 */
router.post('/:id/categories', async (req, res) => {
  try {
    const category = await competitionService.addCategory(req.params.id, req.body);
    ApiResponseHandler.success(res, transformResult(category), 'Category added successfully', 201);
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

/**
 * @route   POST /api/categories/:catId/stages
 * @desc    Add a stage to a category
 */
router.post('/categories/:catId/stages', async (req, res) => {
  try {
    const stage = await competitionService.addStage(req.params.catId, req.body);
    ApiResponseHandler.success(res, transformResult(stage), 'Stage added successfully', 201);
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

/**
 * @route   PATCH /api/competitions/:id/status
 * @desc    Update competition status
 */
router.patch('/:id/status', async (req, res) => {
  try {
    await competitionService.updateCompetitionStatus(req.params.id, req.body.status);
    ApiResponseHandler.success(res, null, 'Status updated successfully');
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

/**
 * @route   GET /api/competitions/available
 * @desc    Get competitions available for registration for the current school
 * @access  School Admin
 */
router.get('/available/school', async (req, res) => {
  try {
    const schoolId = req.user!.schoolId || req.user!.id;
    const competitions = await competitionService.getAvailableCompetitionsForSchool(schoolId);
    ApiResponseHandler.success(res, transformResult(competitions));
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

/**
 * @route   GET /api/competitions/student/my-competitions
 * @desc    Get competitions registered by the current student
 * @access  Student
 */
router.get('/student/my-competitions', async (req, res) => {
  try {
    const studentId = req.user!.id;
    const competitions = await competitionService.getStudentCompetitions(studentId);
    ApiResponseHandler.success(res, competitions);
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

/**
 * @route   POST /api/competitions/:id/register
 * @desc    Register students for a competition category
 * @access  School Admin
 */
router.post('/:id/register', async (req, res) => {
  try {
    const { categoryId, studentIds } = req.body;
    const schoolId = req.user!.schoolId || req.user!.id;

    if (!categoryId || !studentIds || !Array.isArray(studentIds)) {
      return ApiResponseHandler.badRequest(res, 'Category ID and Array of Student IDs required');
    }

    await Promise.all(studentIds.map(studentId =>
      competitionService.registerStudentToCompetition(req.params.id, schoolId, categoryId, studentId)
    ));

    ApiResponseHandler.success(res, null, `Registered ${studentIds.length} students successfully`);
  } catch (err: any) {
    ApiResponseHandler.serverError(res, err.message);
  }
});

export default router;
