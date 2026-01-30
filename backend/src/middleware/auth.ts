import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/database';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: 'super_admin' | 'school' | 'tutor' | 'student';
        schoolId?: string;
        tutorId?: string;
        studentId?: string;
      };
    }
  }
}

export interface JWTPayload {
  id: string;
  role: 'super_admin' | 'school' | 'tutor' | 'student';
  schoolId?: string;
  tutorId?: string;
  studentId?: string;
  iat?: number;
  exp?: number;
}

// Generate JWT token
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verify JWT token
export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

// Authentication middleware
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    // Verify user exists in database based on role
    let userExists = false;
    
    switch (decoded.role) {
      case 'super_admin':
        // Super admin is always valid (hardcoded check)
        userExists = decoded.id === 'super_admin';
        break;
      case 'school':
        const schoolResult = await db.query(
          'SELECT id, is_active FROM schools WHERE id = $1',
          [decoded.id]
        );
        userExists = schoolResult.rows.length > 0 && schoolResult.rows[0].is_active;
        break;
      case 'tutor':
        const tutorResult = await db.query(
          'SELECT id, is_active FROM tutors WHERE id = $1',
          [decoded.id]
        );
        userExists = tutorResult.rows.length > 0 && tutorResult.rows[0].is_active;
        break;
      case 'student':
        // Students use schedule-based authentication
        userExists = true;
        break;
    }

    if (!userExists) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive.'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    next(error);
  }
};

// Role-based authorization middleware
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Not authenticated.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.'
      });
    }

    next();
  };
};

// Optional authentication (doesn't require token but attaches user if present)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
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
export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'super_admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin required.'
    });
  }
  next();
};
