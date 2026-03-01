import { db } from '../config/database';

interface PromotionResult {
  promotedCount: number;
  nextStageId?: string;
}

export const promotionService = {
  /**
   * Promotes top performers from a completed stage to the next stage
   */
  promoteStudents: async (stageId: string): Promise<PromotionResult> => {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Get current stage and competition info
      const stageRes = await client.query(
        `SELECT cs.*, comp.auto_promote, comp.id as competition_id
         FROM competition_stages cs
         JOIN competition_categories cc ON cs.competition_category_id = cc.id
         JOIN competitions comp ON cc.competition_id = comp.id
         WHERE cs.id = $1`,
        [stageId]
      );

      if (stageRes.rows.length === 0) throw new Error('Stage not found');
      const currentStage = stageRes.rows[0];

      // 2. Find the next stage in the same category
      const nextStageRes = await client.query(
        `SELECT id, stage_number FROM competition_stages
         WHERE competition_category_id = $1 AND stage_number > $2
         ORDER BY stage_number ASC LIMIT 1`,
        [currentStage.competition_category_id, currentStage.stage_number]
      );

      if (nextStageRes.rows.length === 0) {
        // No next stage, competition ends here for this category
        await client.query('COMMIT');
        return { promotedCount: 0 };
      }

      const nextStage = nextStageRes.rows[0];

      // 3. Get all students who completed current stage, ranked by score
      // Tie-breaker: time_spent_minutes (lower is better)
      const participantsRes = await client.query(
        `SELECT se.id as student_exam_id, se.score, se.percentage, es.student_id, es.external_student_id
         FROM student_exams se
         JOIN exam_schedules es ON se.exam_schedule_id = es.id
         WHERE es.competition_stage_id = $1 AND se.status = 'completed'
         ORDER BY se.score DESC, se.time_spent_minutes ASC`,
        [stageId]
      );

      const participants: any[] = participantsRes.rows;
      const threshold = currentStage.qualification_threshold; // { type: 'count' | 'percent' | 'score_percent', value: number }

      let qualifiedStudents: any[] = [];

      if (threshold.type === 'count') {
        qualifiedStudents = participants.slice(0, threshold.value);
      } else if (threshold.type === 'percent') {
        const count = Math.ceil(participants.length * (threshold.value / 100));
        qualifiedStudents = participants.slice(0, count);
      } else if (threshold.type === 'score_percent') {
        qualifiedStudents = participants.filter((p: any) => p.percentage >= threshold.value);
      }

      // 4. Create exam_schedules for the qualified students for the next stage
      let promotedCount = 0;
      for (const student of qualifiedStudents) {
        // Check if already scheduled for next stage (prevent duplicates)
        const checkRes = await client.query(
          `SELECT id FROM exam_schedules
           WHERE competition_stage_id = $1 AND (student_id = $2 OR external_student_id = $3)`,
          [nextStage.id, student.student_id, student.external_student_id]
        );

        if (checkRes.rows.length === 0) {
          // Generate unique access code for the next stage
          const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

          await client.query(
            `INSERT INTO exam_schedules (
              exam_id, student_id, external_student_id,
              scheduled_date, is_active, access_code, competition_stage_id
            ) VALUES (
              (SELECT exam_id FROM competition_stages WHERE id = $1),
              $2, $3, NOW(), TRUE, $4, $5
            )`,
            [nextStage.id, student.student_id, student.external_student_id, accessCode, nextStage.id]
          );
          promotedCount++;
        }
      }

      await client.query('COMMIT');
      return { promotedCount, nextStageId: nextStage.id };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Promotion failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
};
