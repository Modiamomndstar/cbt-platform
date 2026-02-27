import { db } from '../config/database';

export interface RevenueMetric {
  currency: string;
  total_earned: number;
  unearned_liability: number;
  log_date?: string;
}

export const financeService = {
  /**
   * Get aggregated financial overview (Liability vs Earned)
   */
  getGlobalOverview: async () => {
    const earnedRes = await db.query(`
      SELECT currency, SUM(total_earned) as total_earned
      FROM earned_revenue_summary
      GROUP BY currency
    `);

    const liabilityRes = await db.query(`
      SELECT currency, SUM(total_credits_held * 50) as total_liability
      FROM unearned_revenue_report
      GROUP BY currency
    `);

    return {
      earned: earnedRes.rows,
      liability: liabilityRes.rows
    };
  },

  /**
   * Get revenue history with time filtering
   */
  getRevenueHistory: async (period: 'day' | 'week' | 'month' | 'year' = 'month') => {
    const result = await db.query(`
      SELECT
        source,
        currency,
        SUM(total_earned) as amount,
        date_trunc($1, log_date) as period_start
      FROM earned_revenue_summary
      GROUP BY source, currency, date_trunc($1, log_date)
      ORDER BY period_start DESC
    `, [period]);

    return result.rows;
  },

  /**
   * Get detailed logs for auditing
   */
  getAuditLogs: async (options: {
    schoolId?: string;
    currency?: string;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number
  }) => {
    const { schoolId, currency, startDate, endDate, limit = 50, offset = 0 } = options;

    let query = `
      SELECT 'payg' as type, school_id, type as action, credits, amount_paid, currency, description, created_at
      FROM payg_ledger
      WHERE 1=1
    `;
    const params: any[] = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND school_id = $${params.length}`;
    }
    if (currency) {
      params.push(currency);
      query += ` AND currency = $${params.length}`;
    }
    // ... add date filtering logic ...

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }
};
