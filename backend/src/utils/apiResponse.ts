import { Response } from 'express';
import { transformObject } from './responseTransformer';

/**
 * Standardized API Response Handler
 */
export const ApiResponseHandler = {
  /**
   * Success Response (200 OK)
   */
  success: (res: Response, data: any = null, message: string = 'Success', meta: any = null) => {
    return res.status(200).json({
      success: true,
      message,
      data: data,
      ...(meta || {}),
    });
  },

  /**
   * Created Response (201 Created)
   */
  created: (res: Response, data: any = null, message: string = 'Created', meta: any = null) => {
    return res.status(201).json({
      success: true,
      message,
      data: data,
      ...(meta || {}),
    });
  },

  /**
   * Error Response (Custom status)
   */
  error: (res: Response, message: string = 'Error', statusCode: number = 500, errorCode: string = 'INTERNAL_ERROR', extra: any = null) => {
    return res.status(statusCode).json({
      success: false,
      message,
      errorCode,
      ...(extra || {}),
    });
  },

  /**
   * Bad Request (400)
   */
  badRequest: (res: Response, message: string = 'Bad Request', extra: any = null) => {
    return ApiResponseHandler.error(res, message, 400, 'BAD_REQUEST', extra);
  },

  /**
   * Unauthorized (401)
   */
  unauthorized: (res: Response, message: string = 'Unauthorized access', extra: any = null) => {
    return ApiResponseHandler.error(res, message, 401, 'UNAUTHORIZED', extra);
  },

  /**
   * Forbidden (403)
   */
  forbidden: (res: Response, message: string = 'Forbidden access', extra: any = null) => {
    return ApiResponseHandler.error(res, message, 403, 'FORBIDDEN', extra);
  },

  /**
   * Not Found (404)
   */
  notFound: (res: Response, message: string = 'Resource not found', extra: any = null) => {
    return ApiResponseHandler.error(res, message, 404, 'NOT_FOUND', extra);
  },

  /**
   * Conflict (409)
   */
  conflict: (res: Response, message: string = 'Resource conflict', extra: any = null) => {
    return ApiResponseHandler.error(res, message, 409, 'CONFLICT', extra);
  },

  /**
   * Server Error (500)
   */
  serverError: (res: Response, message: string = 'Internal server error', extra: any = null) => {
    return ApiResponseHandler.error(res, message, 500, 'INTERNAL_ERROR', extra);
  }
};
