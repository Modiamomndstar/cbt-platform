import { db } from '../config/database';

export interface FeaturePricing {
  feature_key: string;
  display_name: string;
  credit_cost: number;
  item_type: 'consumption' | 'capacity';
  batch_size: number;
  category: string;
  is_active: boolean;
}

/**
 * Service to handle Pay-As-You-Go credit consumption and marketplace operations.
 */
export const paygService = {
  /**
   * Get pricing for all or a specific marketplace feature.
   */
  getPricing: async (featureKey?: string): Promise<FeaturePricing[]> => {
    if (featureKey) {
      const res = await db.query('SELECT * FROM payg_feature_pricing WHERE feature_key = $1', [featureKey]);
      return res.rows;
    }
    const res = await db.query('SELECT * FROM payg_feature_pricing ORDER BY category, credit_cost');
    return res.rows;
  },

  /**
   * Consumes credits for a specific action.
   * Supports batching (e.g. 1 credit covers 10 items).
   * returns { success: boolean, reason?: string, creditsDeducted: number }
   */
  consumeCredits: async (
    schoolId: string,
    featureKey: string,
    itemCount: number = 1
  ): Promise<{ success: boolean; reason?: string; creditsDeducted: number }> => {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // 1. Get pricing
      const pricingRes = await client.query(
        'SELECT credit_cost, batch_size, display_name FROM payg_feature_pricing WHERE feature_key = $1',
        [featureKey]
      );
      if (pricingRes.rows.length === 0) {
        throw new Error(`Pricing not found for feature: ${featureKey}`);
      }
      const { credit_cost, batch_size, display_name } = pricingRes.rows[0];

      // 2. Calculate required credits
      // batch_size = 10, itemCount = 45 -> ceil(45/10) * cost
      const batches = Math.ceil(itemCount / batch_size);
      const totalRequired = batches * credit_cost;

      if (totalRequired <= 0) {
        await client.query('COMMIT');
        return { success: true, creditsDeducted: 0 };
      }

      // 3. Check wallet balance
      const walletRes = await client.query(
        'SELECT balance_credits FROM payg_wallets WHERE school_id = $1 FOR UPDATE',
        [schoolId]
      );
      if (walletRes.rows.length === 0) {
        throw new Error('School wallet not found');
      }
      const currentBalance = walletRes.rows[0].balance_credits;

      if (currentBalance < totalRequired) {
        await client.query('ROLLBACK');
        return { success: false, reason: 'Insufficient credits', creditsDeducted: 0 };
      }

      // 4. Deduct credits
      const newBalance = currentBalance - totalRequired;
      await client.query(
        'UPDATE payg_wallets SET balance_credits = $1, updated_at = NOW() WHERE school_id = $2',
        [newBalance, schoolId]
      );

      // 5. Log to ledger
      await client.query(
        `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description, feature_key)
         VALUES ($1, 'deduction', $2, $3, $4, $5)`,
        [
          schoolId,
          totalRequired,
          newBalance,
          `Consumed for ${itemCount} ${display_name}(s)`,
          featureKey
        ]
      );

      await client.query('COMMIT');
      return { success: true, creditsDeducted: totalRequired };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('PAYG Consumption Error:', err);
      return { success: false, reason: 'Internal error', creditsDeducted: 0 };
    } finally {
      client.release();
    }
  },

  /**
   * Specifically for emails: Check if we should send based on credits.
   * Follows the "soft-fail" policy: returns false rather than throwing.
   */
  shouldSendEmail: async (schoolId: string, count: number = 1): Promise<boolean> => {
    const result = await paygService.consumeCredits(schoolId, 'bulk_email_batch', count);
    return result.success;
  }
};
