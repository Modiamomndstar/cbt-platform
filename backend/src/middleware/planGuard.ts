import { Request, Response, NextFunction } from 'express';
import { isFeatureAllowed, canAddTutor, canAddStudent, getSchoolPlan } from '../services/planService';

/**
 * Middleware: Block access if school's plan doesn't include a specific feature.
 * Responds with HTTP 402 Payment Required with upgrade info.
 *
 * Usage:
 *   router.post('/questions/ai-generate', authenticate, requireFeature('ai_question_gen'), handler)
 */
export const requireFeature = (featureKey: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const schoolId = (req.user as any)?.schoolId || (req.user as any)?.id;

      // Non-school roles (super_admin, staff) bypass plan checks
      const userRole = (req.user as any)?.role;
      if (userRole === 'super_admin' || userRole?.startsWith('staff_')) {
        return next();
      }

      if (!schoolId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }

      const allowed = await isFeatureAllowed(schoolId, featureKey);
      if (!allowed) {
        const plan = await getSchoolPlan(schoolId);
        return res.status(402).json({
          success: false,
          code: 'FEATURE_LOCKED',
          message: `This feature requires a higher plan. You are currently on the ${plan.displayName} plan.`,
          feature: featureKey,
          currentPlan: plan.planType,
          upgradeUrl: '/billing'
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Block if school has reached their tutor limit.
 * Used on POST /api/tutors
 */
export const requireTutorSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = (req.user as any)?.id;
    if (!schoolId) return next();

    const { allowed, reason } = await canAddTutor(schoolId);
    if (!allowed) {
      return res.status(402).json({
        success: false,
        code: 'TUTOR_LIMIT_REACHED',
        message: reason,
        upgradeUrl: '/billing'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Block if school has reached their student limit.
 * Used on POST /api/students
 */
export const requireStudentSlot = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schoolId = (req.user as any)?.id;
    if (!schoolId) return next();

    const { allowed, reason } = await canAddStudent(schoolId);
    if (!allowed) {
      return res.status(402).json({
        success: false,
        code: 'STUDENT_LIMIT_REACHED',
        message: reason,
        upgradeUrl: '/billing'
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Check for suspended school accounts.
 * Applied globally on authenticated school routes.
 */
export const checkNotSuspended = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userRole = (req.user as any)?.role;
    // Only check for school accounts
    if (userRole !== 'school') return next();

    const schoolId = (req.user as any)?.id;
    if (!schoolId) return next();

    const plan = await getSchoolPlan(schoolId);
    if (plan.status === 'suspended') {
      return res.status(403).json({
        success: false,
        code: 'ACCOUNT_SUSPENDED',
        message: 'Your account has been suspended. Please contact support.',
      });
    }
    next();
  } catch (error) {
    next(error);
  }
};
