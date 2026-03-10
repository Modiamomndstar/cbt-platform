import { db } from "../config/database";
import { logger } from "../utils/logger";

/**
 * Service to handle complex exam schedule logic
 */
export const ScheduleService = {
  /**
   * Identifies and expires overdue exam schedules based on the school's timezone.
   * If examId is provided, it filters for that specific exam.
   * If studentId is provided, it filters for that specific student.
   */
  async processExpiredSchedules(examId?: string, studentId?: string) {
    try {
      // Query for schedules that are 'scheduled' but past their end time in the school's timezone
      // We join with schools to get the timezone. Default to 'Africa/Lagos' if missing.
      let sql = `
        SELECT es.id, es.exam_id, es.student_id, es.external_student_id,
               es.scheduled_date, es.end_time,
               e.total_questions, e.title as exam_title,
               s.timezone as school_timezone
        FROM exam_schedules es
        JOIN exams e ON es.exam_id = e.id
        JOIN schools s ON e.school_id = s.id
        WHERE es.status = 'scheduled'
      `;

      const params: any[] = [];

      if (examId) {
        params.push(examId);
        sql += ` AND es.exam_id = $${params.length}`;
      }

      if (studentId) {
        params.push(studentId);
        sql += ` AND (es.student_id = $${params.length} OR es.external_student_id = $${params.length})`;
      }

      const result = await db.query(sql, params);

      if (result.rows.length > 0) {
        logger.info(`[ScheduleService] Checking ${result.rows.length} potentially expired schedules...`);
      }

      const overdueSchedules = result.rows.filter(row => {
        const tz = row.school_timezone || 'Africa/Lagos';

        // Get current time parts in school's timezone for robust comparison
        const formatter = new Intl.DateTimeFormat('en-CA', {
          year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
          timeZone: tz, hour12: false
        });

        const nowParts = formatter.formatToParts(new Date());
        const p: any = {};
        nowParts.forEach(part => p[part.type] = part.value);

        // en-CA gives YYYY-MM-DD
        const schoolNowStr = `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;

        // Get schedule date in YYYY-MM-DD format consistently
        const scheduleDateStr = typeof row.scheduled_date === 'string'
          ? row.scheduled_date.split('T')[0].split(' ')[0]
          : new Date(row.scheduled_date).toLocaleDateString('en-CA');

        const endTimeStr = row.end_time || '23:59';
        const finalEndTime = endTimeStr.split(':').length === 2 ? `${endTimeStr}:00` : endTimeStr;
        const scheduledEndStr = `${scheduleDateStr} ${finalEndTime}`;

        const parseFakeUtc = (str: string) => {
          try {
            // str format: YYYY-MM-DD HH:mm:ss
            return new Date(str.replace(' ', 'T') + 'Z');
          } catch (e) {
            return new Date(NaN);
          }
        };

        const schoolNowDate = parseFakeUtc(schoolNowStr);
        const scheduleEndDate = parseFakeUtc(scheduledEndStr);

        const isExpired = schoolNowDate.getTime() > scheduleEndDate.getTime();

        logger.debug(`[ScheduleService] Check ID=${row.id}: SchoolNow=${schoolNowStr}, End=${scheduledEndStr}, Expired=${isExpired}`);

        if (isExpired) {
           logger.info(`[ScheduleService] Expiration DETECTED: ID=${row.id}, SchoolTime(${tz})=${schoolNowStr}, ScheduleEnd=${scheduledEndStr}`);
        }

        return isExpired;
      });

      if (overdueSchedules.length === 0) return 0;

      logger.info(`[ScheduleService] Processing ${overdueSchedules.length} expired schedules`);

      for (const schedule of overdueSchedules) {
        await db.transaction(async (client) => {
          // Mark schedule as expired
          await client.query(
            `UPDATE exam_schedules SET status = 'expired', updated_at = NOW() WHERE id = $1`,
            [schedule.id]
          );

          // Create a student_exams record with 0 score if none exists (pending or non-existent)
          const existing = await client.query(
            `SELECT id FROM student_exams WHERE exam_schedule_id = $1`,
            [schedule.id]
          );

          if (existing.rows.length === 0) {
            await client.query(
              `INSERT INTO student_exams (
                student_id, external_student_id, exam_id, exam_schedule_id,
                score, total_marks, percentage, status, time_spent_minutes, answers
              ) VALUES ($1, $2, $3, $4, 0, $5, 0, 'expired', 0, '[]')`,
              [
                schedule.student_id,
                schedule.external_student_id,
                schedule.exam_id,
                schedule.id,
                schedule.total_questions || 0
              ]
            );
          } else {
            // If it exists but status is 'pending', mark as expired
            await client.query(
              `UPDATE student_exams SET status = 'expired', updated_at = NOW() WHERE exam_schedule_id = $1 AND status = 'pending'`,
              [schedule.id]
            );
          }
        });
      }

      return overdueSchedules.length;
    } catch (error) {
      logger.error('[ScheduleService] Error processing expired schedules:', error);
      throw error;
    }
  }
};
