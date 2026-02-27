import { Request } from 'express';
import { db } from '../config/database';
import { logger } from './logger';

export type AuditActorType = 'school' | 'tutor' | 'student' | 'external_student' | 'super_admin' | 'staff' | 'system';
export type AuditSeverity = 'info' | 'warning' | 'critical';
export type AuditStatus = 'success' | 'failure';

interface AuditOptions {
  schoolId?: string;
  userId?: string;
  userType?: AuditActorType;
  actorName?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: any;
  severity?: AuditSeverity;
  status?: AuditStatus;
  request?: Request;
  externalStudentId?: string;
}

/**
 * Logs an activity to the activity_logs table and the system logger.
 */
export async function logActivity(options: AuditOptions) {
  try {
    const {
      schoolId,
      userId,
      userType,
      actorName,
      action,
      targetType,
      targetId,
      targetName,
      details,
      severity = 'info',
      status = 'success',
      request,
      externalStudentId,
    } = options;

    // Extract metadata from request if provided
    let ipAddress: any = null;
    let userAgent: any = null;

    if (request) {
      ipAddress = request.ip || request.headers['x-forwarded-for'] || request.socket.remoteAddress;
      userAgent = request.headers['user-agent'];
    }

    // Prepare values for DB
    const query = `
      INSERT INTO activity_logs (
        school_id, user_id, user_type, actor_name, action,
        target_type, target_id, target_name, details,
        severity, status, external_student_id, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const values = [
      schoolId || null,
      userId || null,
      userType || null,
      actorName || null,
      action,
      targetType || null,
      targetId || null,
      targetName || null,
      details ? JSON.stringify(details) : null,
      severity,
      status,
      externalStudentId || null,
      ipAddress,
      userAgent
    ];

    await db.query(query, values);

    // Also log to winston for observability
    const logMsg = `Audit: [${userType || 'unknown'}:${userId || 'system'}] ${action} on ${targetType || 'none'}:${targetId || 'none'} - ${status}`;
    if (severity === 'critical' || status === 'failure') {
      logger.error(logMsg, { ...options, request: undefined });
    } else {
      logger.info(logMsg, { ...options, request: undefined });
    }

  } catch (error) {
    // We don't want audit logging failures to crash the main request
    logger.error('Failed to write audit log:', error);
  }
}

/**
 * Helper to log from an express request with an authenticated user
 */
export async function logUserActivity(req: any, action: string, options: Partial<AuditOptions> = {}) {
  const user = req.user;

  return logActivity({
    schoolId: user?.schoolId,
    userId: user?.id,
    userType: user?.role as AuditActorType,
    actorName: user?.name || user?.username || user?.fullName,
    action,
    request: req,
    ...options
  });
}
