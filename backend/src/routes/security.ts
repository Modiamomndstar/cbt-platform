import { Router, Request, Response } from "express";
import { pool } from "../config/database";
import { authenticate, requireRole } from "../middleware/auth";
import { ApiResponseHandler } from "../utils/apiResponse";
import { logger } from "../utils/logger";
import { transformResult } from "../utils/responseTransformer";
import { ociService } from "../services/ociService";
import path from "path";
import fs from "fs";

const router = Router();

/**
 * @route POST /api/exams/security/violation
 * @desc Record a security violation (tab switch, app minimization, etc.)
 */
router.post(
  "/violation",
  authenticate,
  requireRole(["student"]),
  async (req: any, res: Response) => {
    const client = await pool.connect();
    try {
      const { scheduleId, violationType, metadata } = req.body;
      const user = req.user!;

      if (!scheduleId) {
        return ApiResponseHandler.badRequest(res, "Schedule ID is required");
      }

      await client.query("BEGIN");

      // 1. Fetch current status and limits
      const statusRes = await client.query(
        `SELECT se.id, se.violation_count, se.is_disqualified, 
                e.max_violations, e.is_secure_mode
         FROM student_exams se
         JOIN exams e ON se.exam_id = e.id
         JOIN exam_schedules es ON se.exam_schedule_id = es.id
         WHERE es.id = $1 AND (es.student_id = $2 OR es.external_student_id = $2)`,
        [scheduleId, user.id]
      );

      if (statusRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return ApiResponseHandler.notFound(res, "Exam session not found");
      }

      const session = statusRes.rows[0];

      if (session.is_disqualified) {
        await client.query("ROLLBACK");
        return ApiResponseHandler.success(res, { isDisqualified: true }, "Student already disqualified");
      }

      // 2. Increment violation count
      const newCount = (session.violation_count || 0) + 1;
      const maxAllowed = session.max_violations || 3;
      const shouldDisqualify = newCount >= maxAllowed;

      // 3. Update record
      const logEntry = {
        type: violationType || "tab_switch",
        timestamp: new Date().toISOString(),
        metadata: metadata || {}
      };

      await client.query(
        `UPDATE student_exams 
         SET violation_count = $1, 
             is_disqualified = $2,
             disqualified_at = $3,
             proctoring_logs = proctoring_logs || $4::jsonb,
             status = CASE WHEN $2 THEN 'failed' ELSE status END
         WHERE id = $5`,
        [
          newCount,
          shouldDisqualify,
          shouldDisqualify ? new Date() : null,
          JSON.stringify([logEntry]),
          session.id
        ]
      );

      await client.query("COMMIT");

      logger.info(`Security violation recorded for student ${user.id} on schedule ${scheduleId}. New count: ${newCount}`);

      ApiResponseHandler.success(res, {
        violationCount: newCount,
        maxAllowed,
        isDisqualified: shouldDisqualify,
        message: shouldDisqualify ? "Maximum violations reached. Disqualified." : "Violation recorded."
      });

    } catch (error: any) {
      await client.query("ROLLBACK");
      logger.error("Error recording security violation:", error);
      ApiResponseHandler.serverError(res, "Failed to record violation");
    } finally {
      client.release();
    }
  }
);

/**
 * @route POST /api/exams/security/identity-snapshot
 * @desc Upload a selfie taken at the start of a secure exam
 */
router.post(
  "/identity-snapshot",
  authenticate,
  requireRole(["student"]),
  async (req: any, res: Response) => {
    const client = await pool.connect();
    try {
      const { scheduleId } = req.body;
      const user = req.user!;
      
      if (!req.files || !req.files.image) {
        return ApiResponseHandler.badRequest(res, "No image provided");
      }

      const imageFile = req.files.image;
      const extension = path.extname(imageFile.name) || ".jpg";
      const fileName = `proctoring/identity_${user.id}_${scheduleId}_${Date.now()}${extension}`;

      await client.query("BEGIN");

      // 1. Fetch current session
      const sessionRes = await client.query(
        `SELECT se.id FROM student_exams se
         JOIN exam_schedules es ON se.exam_schedule_id = es.id
         WHERE es.id = $1 AND (es.student_id = $2 OR es.external_student_id = $2)`,
        [scheduleId, user.id]
      );

      if (sessionRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return ApiResponseHandler.notFound(res, "Exam session not found");
      }

      const sessionId = sessionRes.rows[0].id;

      // 2. Upload to OCI (or fallback to local)
      let imageUrl = "";
      if (ociService.isEnabled()) {
        try {
          imageUrl = await ociService.uploadFile(imageFile.data, fileName, imageFile.mimetype);
        } catch (ociError) {
          logger.error("OCI Upload failed, falling back to local:", ociError);
          // Fallback logic below
        }
      } 
      
      if (!imageUrl) {
        // Fallback: Store locally
        const relativePath = `uploads/${fileName}`;
        const localPath = path.join(process.cwd(), relativePath);
        const dir = path.dirname(localPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        
        fs.writeFileSync(localPath, imageFile.data);
        imageUrl = `/${relativePath}`;
      }

      // 3. Update database
      await client.query(
        `UPDATE student_exams SET identity_snapshot_url = $1 WHERE id = $2`,
        [imageUrl, sessionId]
      );

      await client.query("COMMIT");

      logger.info(`Identity snapshot uploaded for student ${user.id} on schedule ${scheduleId}`);

      ApiResponseHandler.success(res, { imageUrl }, "Identity verified and snapshot saved");

    } catch (error: any) {
      if (client) await client.query("ROLLBACK");
      logger.error("Error uploading identity snapshot:", error);
      ApiResponseHandler.serverError(res, "Failed to upload identity snapshot");
    } finally {
      client.release();
    }
  }
);

/**
 * @route GET /api/exams/security/session-status/:scheduleId
 * @desc Get the current security status of an exam session
 */
router.get(
  "/session-status/:scheduleId",
  authenticate,
  requireRole(["student"]),
  async (req: Request, res: Response) => {
    try {
      const { scheduleId } = req.params;
      const user = (req as any).user!;

      const result = await pool.query(
        `SELECT se.violation_count, se.is_disqualified, se.identity_snapshot_url
         FROM student_exams se
         JOIN exam_schedules es ON se.exam_schedule_id = es.id
         WHERE es.id = $1 AND (es.student_id = $2 OR es.external_student_id = $2)`,
        [scheduleId, user.id]
      );

      if (result.rows.length === 0) {
        return ApiResponseHandler.notFound(res, "Session not found");
      }

      ApiResponseHandler.success(res, transformResult(result.rows[0]));
    } catch (error) {
      ApiResponseHandler.serverError(res, "Failed to fetch session status");
    }
  }
);

export default router;
