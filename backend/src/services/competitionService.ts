import { db } from '../config/database';

export interface Competition {
  id: string;
  title: string;
  description: string;
  scope: 'local' | 'national' | 'global';
  visibility: 'public' | 'private';
  status: 'draft' | 'registration_open' | 'exam_in_progress' | 'completed' | 'cancelled';
  target_countries: string[];
  target_regions: string[];
  eligibility_config: any;
  rewards_config: any;
  certificate_template: any;
  created_by: string;
  max_violations: number;
  negative_marking_rate: number;
  competition_rules: string;
  auto_promote: boolean;
  banner_url?: string;
  is_featured: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CompetitionCategory {
  id: string;
  competition_id: string;
  name: string;
  min_age?: number;
  max_age?: number;
  min_grade?: string;
  max_grade?: string;
}

export interface CompetitionStage {
  id: string;
  competition_category_id: string;
  stage_number: number;
  title: string;
  start_time?: Date;
  end_time?: Date;
  duration_minutes: number;
  total_questions: number;
  qualification_threshold: any;
  questions_config: any;
}

export const competitionService = {
  createCompetition: async (data: Partial<Competition>, staffId: string): Promise<Competition> => {
    const res = await db.query(
      `INSERT INTO competitions (
        title, description, scope, target_countries, target_regions,
        eligibility_config, rewards_config, certificate_template, created_by,
        max_violations, negative_marking_rate, competition_rules, auto_promote,
        banner_url, is_featured
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
      [
        data.title, data.description, data.scope || 'global',
        data.target_countries || [], data.target_regions || [],
        data.eligibility_config || {}, data.rewards_config || {},
        data.certificate_template || {}, staffId,
        data.max_violations || 3, data.negative_marking_rate || 0,
        data.competition_rules || '', data.auto_promote ?? true,
        data.banner_url || null, data.is_featured || false
      ]
    );
    return res.rows[0];
  },

  getAllCompetitions: async (): Promise<Competition[]> => {
    const res = await db.query('SELECT * FROM competitions ORDER BY created_at DESC');
    return res.rows;
  },

  getCompetitionById: async (id: string): Promise<Competition | null> => {
    const res = await db.query('SELECT * FROM competitions WHERE id = $1', [id]);
    return res.rows[0] || null;
  },

  addCategory: async (compId: string, data: Partial<CompetitionCategory>): Promise<CompetitionCategory> => {
    const res = await db.query(
      `INSERT INTO competition_categories (competition_id, name, min_age, max_age, min_grade, max_grade)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [compId, data.name, data.min_age, data.max_age, data.min_grade, data.max_grade]
    );
    return res.rows[0];
  },

  getCategories: async (compId: string): Promise<CompetitionCategory[]> => {
    const res = await db.query('SELECT * FROM competition_categories WHERE competition_id = $1', [compId]);
    return res.rows;
  },

  addStage: async (catId: string, data: Partial<CompetitionStage>): Promise<CompetitionStage> => {
    const res = await db.query(
      `INSERT INTO competition_stages (
        competition_category_id, stage_number, title, start_time, end_time,
        duration_minutes, total_questions, qualification_threshold, questions_config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [
        catId, data.stage_number, data.title, data.start_time, data.end_time,
        data.duration_minutes || 60, data.total_questions || 50,
        data.qualification_threshold || { type: 'score_percent', value: 70 },
        data.questions_config || {}
      ]
    );
    return res.rows[0];
  },

  getStages: async (catId: string): Promise<CompetitionStage[]> => {
    const res = await db.query('SELECT * FROM competition_stages WHERE competition_category_id = $1 ORDER BY stage_number', [catId]);
    return res.rows;
  },

  updateCompetitionStatus: async (id: string, status: string): Promise<void> => {
    await db.query('UPDATE competitions SET status = $1, updated_at = NOW() WHERE id = $2', [status, id]);

    // Send automated broadcast if status is meaningful
    if (status === 'registration_open' || status === 'exam_in_progress') {
      const compRes = await db.query('SELECT title FROM competitions WHERE id = $1', [id]);
      const title = compRes.rows[0]?.title || 'Competition';

      const broadcastTitle = status === 'registration_open'
        ? `Registration Open: ${title}`
        : `Competition Started: ${title}`;

      const broadcastContent = status === 'registration_open'
        ? `Registration is now open for the ${title} competition. Visit the Competition Hub to register your students.`
        : `The ${title} competition has officially started. Best of luck to all participating students!`;

      await db.query(
        `INSERT INTO inbox_broadcasts (sender_id, sender_role, target_role, title, content)
         VALUES ($1, $2, $3, $4, $5)`,
        ['00000000-0000-0000-0000-000000000000', 'super_admin', 'school', broadcastTitle, broadcastContent]
      );
    }
  },

  updatePromotion: async (id: string, data: {
    is_featured?: boolean,
    banner_url?: string,
    competition_rules?: string,
    max_violations?: number,
    negative_marking_rate?: number
  }): Promise<void> => {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.is_featured !== undefined) {
      fields.push(`is_featured = $${i++}`);
      values.push(data.is_featured);
    }
    if (data.banner_url !== undefined) {
      fields.push(`banner_url = $${i++}`);
      values.push(data.banner_url);
    }
    if (data.competition_rules !== undefined) {
      fields.push(`competition_rules = $${i++}`);
      values.push(data.competition_rules);
    }
    if (data.max_violations !== undefined) {
      fields.push(`max_violations = $${i++}`);
      values.push(data.max_violations);
    }
    if (data.negative_marking_rate !== undefined) {
      fields.push(`negative_marking_rate = $${i++}`);
      values.push(data.negative_marking_rate);
    }

    if (fields.length === 0) return;

    values.push(id);
    await db.query(
      `UPDATE competitions SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${i}`,
      values
    );
  },

  getAvailableCompetitionsForSchool: async (schoolId: string): Promise<any[]> => {
    // 1. Get school country/region
    const schoolRes = await db.query('SELECT country FROM schools WHERE id = $1', [schoolId]);
    if (schoolRes.rows.length === 0) return [];
    const country = schoolRes.rows[0].country;

    // 2. Fetch competitions that are registration_open AND match geographic scope OR are global
    const res = await db.query(
      `SELECT c.*,
       (SELECT COUNT(*) FROM competition_registrations r WHERE r.competition_id = c.id AND r.school_id = $1) as registration_count
       FROM competitions c
       WHERE c.status = 'registration_open'
       AND (
         c.scope = 'global' OR
         (c.scope = 'national' AND $2 = ANY(c.target_countries)) OR
         (c.scope = 'local' AND $2 = ANY(c.target_countries))
       )
       ORDER BY c.created_at DESC`,
      [schoolId, country]
    );
    return res.rows;
  },

  registerStudentToCompetition: async (compId: string, schoolId: string, catId: string, studentId: string): Promise<void> => {
    // Check if category exists for this competition
    const catRes = await db.query('SELECT id FROM competition_categories WHERE id = $1 AND competition_id = $2', [catId, compId]);
    if (catRes.rows.length === 0) throw new Error('Invalid category for this competition');

    // Perform registration
    await db.query(
      `INSERT INTO competition_registrations (competition_id, school_id, competition_category_id, student_id, status)
       VALUES ($1, $2, $3, $4, 'approved')
       ON CONFLICT (competition_id, student_id) DO NOTHING`,
      [compId, schoolId, catId, studentId]
    );
  },

  getFeaturedCompetitions: async (): Promise<Competition[]> => {
    const res = await db.query(
      `SELECT * FROM competitions
       WHERE is_featured = TRUE
       AND status IN ('registration_open', 'exam_in_progress')
       ORDER BY created_at DESC`
    );
    return res.rows;
  },

  setRewards: async (compId: string, rewards: any[]): Promise<void> => {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM competition_rewards WHERE competition_id = $1', [compId]);
      for (const r of rewards) {
        await client.query(
          `INSERT INTO competition_rewards (
            competition_id, rank_from, rank_to, reward_title,
            reward_description, reward_value, reward_type
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [compId, r.rank_from, r.rank_to, r.reward_title, r.reward_description, r.reward_value, r.reward_type]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  getRewards: async (compId: string): Promise<any[]> => {
    const res = await db.query('SELECT * FROM competition_rewards WHERE competition_id = $1 ORDER BY rank_from', [compId]);
    return res.rows;
  },

  getHubStats: async (): Promise<any> => {
    const statsRes = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM competitions) as total_events,
        (SELECT COUNT(DISTINCT student_id) FROM competition_registrations WHERE status IN ('approved', 'active')) as active_participants,
        (SELECT COUNT(DISTINCT country) FROM (SELECT unnest(target_countries) as country FROM competitions) sub) as regional_scope,
        (SELECT COUNT(*) FROM competition_results WHERE award_type IS NOT NULL) as awards_issued
    `);

    return {
      total_events: parseInt(statsRes.rows[0].total_events) || 0,
      active_participants: parseInt(statsRes.rows[0].active_participants) || 0,
      regional_scope: parseInt(statsRes.rows[0].regional_scope) || 0,
      awards_issued: parseInt(statsRes.rows[0].awards_issued) || 0
    };
  },

  getStudentCompetitions: async (studentId: string): Promise<any[]> => {
    const res = await db.query(
      `SELECT c.*, cr.status as registration_status, cc.name as category_name, cc.id as category_id
       FROM competition_registrations cr
       JOIN competitions c ON cr.competition_id = c.id
       JOIN competition_categories cc ON cr.competition_category_id = cc.id
       WHERE cr.student_id = $1
       ORDER BY c.created_at DESC`,
      [studentId]
    );
    return res.rows;
  },

  getStudentHubCompetitions: async (studentId: string): Promise<any[]> => {
    // 1. Get student info (country/school)
    const studentRes = await db.query(
      `SELECT s.school_id, sch.country
       FROM students s
       JOIN schools sch ON s.school_id = sch.id
       WHERE s.id = $1
       UNION
       SELECT s.school_id, sch.country
       FROM external_students s
       JOIN schools sch ON s.school_id = sch.id
       WHERE s.id = $1`,
      [studentId]
    );

    if (studentRes.rows.length === 0) return [];
    const { country } = studentRes.rows[0];

    // 2. Fetch competitions matching scope AND enrollment status
    const res = await db.query(
      `SELECT
         c.id, c.title, c.description, c.banner_url,
         (SELECT name FROM competition_categories WHERE competition_id = c.id LIMIT 1) as category_name,
         (SELECT SUM(reward_value) FROM competition_rewards WHERE competition_id = c.id) as prize_pool,
         (SELECT EXISTS(SELECT 1 FROM competition_registrations WHERE competition_id = c.id AND student_id = $1)) as is_registered,
         (SELECT start_time FROM competition_stages WHERE competition_category_id IN (SELECT id FROM competition_categories WHERE competition_id = c.id) ORDER BY stage_number ASC LIMIT 1) as start_date
       FROM competitions c
       WHERE c.status IN ('registration_open', 'exam_in_progress')
       AND (
         c.scope = 'global' OR
         (c.scope = 'national' AND $2 = ANY(c.target_countries)) OR
         (c.scope = 'local' AND $2 = ANY(c.target_countries))
       )
       ORDER BY c.created_at DESC`,
      [studentId, country]
    );

    return res.rows.map(row => ({
      ...row,
      prizePool: row.prize_pool || 0,
      startDate: row.start_date,
      categoryName: row.category_name || 'General'
    }));
  }
};
