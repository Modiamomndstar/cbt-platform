import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';
import { ApiResponseHandler } from '../utils/apiResponse';

/**
 * Middleware to handle express-validator errors
 */
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Transform errors to a cleaner format
    const formattedErrors = errors.array().map((err: any) => ({
      field: err.path || err.param,
      message: err.msg
    }));

    return ApiResponseHandler.badRequest(res, 'Validation failed', {
      errors: formattedErrors
    });
  }
  next();
};
