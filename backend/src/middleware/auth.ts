import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../config/database";
import { ApiResponseHandler } from "../utils/apiResponse";
import { logger } from "../utils/logger";

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("FATAL: JWT_SECRET environment variable is not set. Server will not start.");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: "super_admin" | "school" | "tutor" | "student";
        schoolId?: string;
        schoolName?: string;
        schoolLogo?: string;
        tutorId?: string;
        studentId?: string;
        isExternal?: boolean;
        staffRole?: string;
      };
    }
  }
}

export interface JWTPayload {
  id: string;
  role: "super_admin" | "school" | "tutor" | "student";
  schoolId?: string;
  schoolName?: string;
  schoolLogo?: string;
  tutorId?: string;
  studentId?: string;
  isExternal?: boolean;
  staffRole?: string;
  iat?: number;
  exp?: number;
}

// Generate JWT token
export const generateToken = (
  payload: Omit<JWTPayload, "iat" | "exp">,
): string => {
  // Cast to jwt types for compatibility with library typings
  return jwt.sign(
    payload as any,
    JWT_SECRET as any,
    { expiresIn: JWT_EXPIRES_IN } as any,
  );
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET as any) as JWTPayload;
};

// Authentication middleware
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      ApiResponseHandler.unauthorized(res, "Access denied. No token provided.");
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Verify user exists in database based on role
    let userExists = false;

    switch (decoded.role) {
      case "super_admin":
        // 1. Primary Super Admin (Nil UUID or legacy "super_admin" string)
        if (decoded.id === "super_admin" || decoded.id === "00000000-0000-0000-0000-000000000000") {
          userExists = true;
        } else {
          // 2. Individual Staff Account
          const staffResult = await db.query(
            "SELECT id, role, is_active FROM staff_accounts WHERE id = $1",
            [decoded.id]
          );
          userExists = staffResult.rows.length > 0 && staffResult.rows[0].is_active;
        }
        break;
      case "school":
        const schoolResult = await db.query(
          "SELECT id, is_active FROM schools WHERE id = $1",
          [decoded.id],
        );
        userExists =
          schoolResult.rows.length > 0 && schoolResult.rows[0].is_active;
        break;
      case "tutor":
        const tutorResult = await db.query(
          "SELECT id, is_active FROM tutors WHERE id = $1",
          [decoded.id],
        );
        userExists =
          tutorResult.rows.length > 0 && tutorResult.rows[0].is_active;
        break;
      case "student":
        // Students use schedule-based authentication
        userExists = true;
        break;
    }

    if (!userExists) {
      ApiResponseHandler.unauthorized(res, "User not found or inactive.");
      return;
    }

    req.user = {
      ...decoded,
      id: decoded.id === "super_admin" ? "00000000-0000-0000-0000-000000000000" : decoded.id,
    };
    next();
  } catch (error) {
    // Check for token expired first (it's a subclass of JsonWebTokenError)
    if (error instanceof (jwt as any).TokenExpiredError) {
      ApiResponseHandler.unauthorized(res, "Token expired.");
      return;
    }

    if (error instanceof (jwt as any).JsonWebTokenError) {
      ApiResponseHandler.unauthorized(res, "Invalid token.");
      return;
    }

    next(error);
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      ApiResponseHandler.unauthorized(res, "Access denied. Not authenticated.");
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`Auth Forbidden: Role mismatch. User ${req.user.id} has role [${req.user.role}], but required one of [${roles.join(', ')}] for ${req.originalUrl}`);
      ApiResponseHandler.forbidden(res, "Access denied. Insufficient permissions.");
      return;
    }

    next();
  };
};

// Optional authentication (doesn't require token but attaches user if present)
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = decoded;
    }

    next();
  } catch {
    // Continue without user
    next();
  }
};

// Super admin check
export const requireSuperAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user || req.user.role !== "super_admin") {
    ApiResponseHandler.forbidden(res, "Access denied. Super admin required.");
    return;
  }
  next();
};

// requireFinanceAccess middleware
// Accessible by primary Super Admin OR staff with 'finance' role
export const requireFinanceAccess = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user || req.user.role !== "super_admin") {
    ApiResponseHandler.forbidden(res, "Access denied. Admin required.");
    return;
  }

  const isPrimaryAdmin = req.user.id === "00000000-0000-0000-0000-000000000000";
  const isFinanceStaff = req.user.staffRole === "finance";

  if (!isPrimaryAdmin && !isFinanceStaff) {
    ApiResponseHandler.forbidden(res, "Access denied. Finance level clearance required.");
    return;
  }

  next();
};

// requireCoordinatingAdmin middleware
// Accessible by primary Super Admin OR staff with 'coordinating_admin' role
export const requireCoordinatingAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user || req.user.role !== "super_admin") {
    ApiResponseHandler.forbidden(res, "Access denied. Admin required.");
    return;
  }

  const isPrimaryAdmin = req.user.id === "00000000-0000-0000-0000-000000000000";
  const isCoordinatingStaff = req.user.staffRole === "coordinating_admin";

  if (!isPrimaryAdmin && !isCoordinatingStaff) {
    ApiResponseHandler.forbidden(res, "Access denied. Coordinating level clearance required.");
    return;
  }

  next();
};

// requireSalesAdmin middleware
// Accessible by primary Super Admin OR Coordinating Admin OR staff with 'sales_admin' role
export const requireSalesAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user || req.user.role !== "super_admin") {
    ApiResponseHandler.forbidden(res, "Access denied. Admin required.");
    return;
  }

  const isPrimaryAdmin = req.user.id === "00000000-0000-0000-0000-000000000000";
  const isCoordinatingStaff = req.user.staffRole === "coordinating_admin";
  const isSalesStaff = req.user.staffRole === "sales_admin";

  if (!isPrimaryAdmin && !isCoordinatingStaff && !isSalesStaff) {
    ApiResponseHandler.forbidden(res, "Access denied. Sales management clearance required.");
    return;
  }

  next();
};

// requireCompetitionAccess middleware
// Accessible by primary Super Admin OR staff with 'competition_admin' role
export const requireCompetitionAccess = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!req.user || req.user.role !== "super_admin") {
    ApiResponseHandler.forbidden(res, "Access denied. Admin required.");
    return;
  }

  const isPrimaryAdmin = req.user.id === "00000000-0000-0000-0000-000000000000";
  const isCompetitionStaff = req.user.staffRole === "competition_admin";

  if (!isPrimaryAdmin && !isCompetitionStaff) {
    ApiResponseHandler.forbidden(res, "Access denied. Competition management clearance required.");
    return;
  }

  next();
};

// Backwards compatibility: routes in the codebase import `requireRole`.
// `authorize` implements role-based authorization, so expose `requireRole` that accepts either an array or varargs.
export const requireRole = (roles: string[] | string, ...rest: string[]) => {
  const normalized = Array.isArray(roles) ? roles : [roles, ...rest];
  return authorize(...normalized);
};
