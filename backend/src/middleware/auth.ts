import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "../config/database";

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
        tutorId?: string;
        studentId?: string;
      };
    }
  }
}

export interface JWTPayload {
  id: string;
  role: "super_admin" | "school" | "tutor" | "student";
  schoolId?: string;
  tutorId?: string;
  studentId?: string;
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
      res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
      return;
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Verify user exists in database based on role
    let userExists = false;

    switch (decoded.role) {
      case "super_admin":
        // Super admin is always valid (hardcoded check)
        userExists = decoded.id === "super_admin";
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
      res.status(401).json({
        success: false,
        message: "User not found or inactive.",
      });
      return;
    }

    req.user = decoded;
    next();
  } catch (error) {
    // Check for token expired first (it's a subclass of JsonWebTokenError)
    if (error instanceof (jwt as any).TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Token expired.",
      });
      return;
    }

    if (error instanceof (jwt as any).JsonWebTokenError) {
      res.status(401).json({
        success: false,
        message: "Invalid token.",
      });
      return;
    }

    next(error);
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Access denied. Not authenticated.",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions.",
      });
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
    res.status(403).json({
      success: false,
      message: "Access denied. Super admin required.",
    });
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
