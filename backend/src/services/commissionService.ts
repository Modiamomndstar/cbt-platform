import { db } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Service to handle sales commissions for schools referred by sales admins.
 */
export class CommissionService {
  /**
   * Process potential commission for a payment.
   * Only triggers on first real-money payment of a school.
   */
  static async processCommission(paymentId: string) {
    try {
      // 1. Get payment details and check if it's eligible
      const paymentResult = await db.query(
        `SELECT p.id, p.school_id, p.amount, p.currency, p.plan_type, p.plan_duration_months,
                s.sales_admin_id, s.created_at as school_created_at
         FROM payments p
         JOIN schools s ON p.school_id = s.id
         WHERE p.id = $1 AND p.status = 'completed' AND s.sales_admin_id IS NOT NULL`,
        [paymentId]
      );

      if (paymentResult.rows.length === 0) return;

      const payment = paymentResult.rows[0];
      const { school_id, sales_admin_id, currency, plan_type, plan_duration_months, school_created_at } = payment;

      // 2. Check if this is the school's FIRST real payment (excluding current payment)
      const previousPayments = await db.query(
        "SELECT id FROM payments WHERE school_id = $1 AND status = 'completed' AND id != $2",
        [school_id, paymentId]
      );

      if (previousPayments.rows.length > 0) {
        logger.info(`Commission skip: School ${school_id} already has previous payments.`);
        return;
      }

      // 3. Check if school's FIRST payment is already processed for commission (extra safety)
      const commissionExists = await db.query(
        "SELECT id FROM sales_commissions WHERE school_id = $1",
        [school_id]
      );
      if (commissionExists.rows.length > 0) return;

      // 4. Determine billing cycle based on plan_duration_months
      const billingCycle = plan_duration_months >= 12 ? 'yearly' : 'monthly';

      // 5. Get commission settings for this plan, currency, AND billing cycle
      const settingsResult = await db.query(
        "SELECT * FROM commission_settings WHERE plan_type = $1 AND currency = $2 AND billing_cycle = $3",
        [plan_type, currency, billingCycle]
      );

      if (settingsResult.rows.length === 0) {
        logger.warn(`Commission skip: No settings found for plan ${plan_type} in ${currency} (${billingCycle})`);
        return;
      }

      const settings = settingsResult.rows[0];

      // 5. Calculate points based on 30-day window
      const schoolJoinedAt = new Date(school_created_at);
      const paidAt = new Date(); // Payment just succeeded
      const diffDays = Math.floor((paidAt.getTime() - schoolJoinedAt.getTime()) / (1000 * 3600 * 24));
      
      const points = diffDays <= 30 ? settings.points_within_30_days : settings.points_after_30_days;
      const monetaryValue = points * settings.monetary_value_per_point;

      if (points <= 0) return;

      // 6. Record the commission
      await db.query(
        `INSERT INTO sales_commissions (staff_id, school_id, payment_id, points_earned, monetary_value, currency, status, details)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)`,
        [
          sales_admin_id, 
          school_id, 
          paymentId, 
          points, 
          monetaryValue, 
          currency, 
          JSON.stringify({ 
            joined_at: school_created_at, 
            paid_at: paidAt, 
            days_to_convert: diffDays,
            monetary_value_per_point: settings.monetary_value_per_point
          })
        ]
      );

      logger.info(`Commission recorded: Sales Admin ${sales_admin_id} earned ${points} points for school ${school_id}`);

    } catch (error) {
      logger.error('Failed to process commission:', error);
    }
  }
}
