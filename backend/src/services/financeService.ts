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

    const transactionCount = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM payments WHERE status = 'completed') +
        (SELECT COUNT(*) FROM payg_ledger WHERE type = 'deduction') as total_count
    `);

    return {
      earned: earnedRes.rows,
      liability: liabilityRes.rows,
      totalTransactions: parseInt(transactionCount.rows[0].total_count)
    };
  },

  /**
   * Get revenue breakdown by school
   */
  getRevenueBySchool: async (limit: number = 5) => {
    const result = await db.query(`
      SELECT
        s.name as school_name,
        currency,
        SUM(amount_val) as total_contribution
      FROM (
        SELECT school_id, currency, amount as amount_val FROM payments WHERE status = 'completed'
        UNION ALL
        SELECT school_id, currency, amount_paid as amount_val FROM payg_ledger WHERE type = 'deduction'
      ) t
      JOIN schools s ON t.school_id = s.id
      GROUP BY s.name, currency
      ORDER BY total_contribution DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
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
      SELECT
        l.type as record_source,
        l.school_id,
        s.name as school_name,
        l.type as action,
        l.credits::text as credits,
        l.amount_paid,
        l.currency,
        l.description,
        l.created_at
      FROM payg_ledger l
      LEFT JOIN schools s ON l.school_id = s.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (schoolId) {
      params.push(schoolId);
      query += ` AND l.school_id = $${params.length}`;
    }
    if (currency) {
      params.push(currency);
      query += ` AND l.currency = $${params.length}`;
    }

    // Add Subscriptions
    query += `
      UNION ALL
      SELECT
        'subscription' as record_source,
        p.school_id,
        s.name as school_name,
        'payment' as action,
        '1' as credits,
        p.amount as amount_paid,
        p.currency,
        'Subscription: ' || p.plan_type as description,
        p.created_at
      FROM payments p
      LEFT JOIN schools s ON p.school_id = s.id
      WHERE p.status = 'completed'
    `;
    if (schoolId) {
      query += ` AND p.school_id = $${params.indexOf(schoolId) + 1}`;
    }
    if (currency) {
      query += ` AND p.currency = $${params.indexOf(currency) + 1}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  }
};
