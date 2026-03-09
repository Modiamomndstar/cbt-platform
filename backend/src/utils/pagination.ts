import { Request } from 'express';

export interface PaginationOptions {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMetadata {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}

/**
 * Extract pagination options from request query
 * @param req Express Request
 * @param defaultLimit Default items per page (default: 50)
 * @returns PaginationOptions
 */
export const getPaginationOptions = (req: Request, defaultLimit = 50, maxLimit = 200): PaginationOptions => {
  const pageValue = parseInt(req.query.page as string);
  const limitValue = parseInt(req.query.limit as string);

  const page = !isNaN(pageValue) && pageValue > 0 ? pageValue : 1;
  const limit = !isNaN(limitValue) && limitValue > 0 ? Math.min(limitValue, maxLimit) : defaultLimit;
  const offset = (page - 1) * limit;

  return { page, limit, offset };
};

/**
 * Format total count and options into standardized metadata
 * @param totalCount Total number of items
 * @param options PaginationOptions used for the query
 * @returns PaginationMetadata
 */
export const formatPaginationResponse = (totalCount: number, options: PaginationOptions): PaginationMetadata => {
  return {
    pagination: {
      page: options.page,
      limit: options.limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / options.limit)
    }
  };
};
