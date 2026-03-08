import { db } from '../config/database';

export interface MarketplaceItem {
  feature_key: string;
  display_name: string;
  credit_cost: number;
  item_type: 'feature' | 'slot' | 'credit_pack' | 'consumption' | 'capacity';
  description?: string;
  category: string;
  is_active: boolean;
  batch_size: number;
}

/**
 * Service to handle Pay-As-You-Go credit consumption and marketplace operations.
 */
export const paygService = {
  /**
   * Get pricing for all or a specific marketplace feature.
   */
  getPricing: async (featureKey?: string): Promise<MarketplaceItem[]> => {
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
        'SELECT credit_cost, display_name, batch_size FROM payg_feature_pricing WHERE feature_key = $1',
        [featureKey]
      );
      if (pricingRes.rows.length === 0) {
        throw new Error(`Pricing not found for feature: ${featureKey}`);
      }
      const { credit_cost, display_name, batch_size = 1 } = pricingRes.rows[0];

      // 2. Calculate required credits
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
        `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description, feature_key, amount_paid, currency)
         VALUES ($1, 'deduction', $2, $3, $4, $5, $6, $7)`,
        [
          schoolId,
          totalRequired,
          newBalance,
          `Consumed for ${itemCount} ${display_name}(s)`,
          featureKey,
          totalRequired * 50, // Assuming 1 credit = 50 NGN for now (unearned to earned)
          'NGN'
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
   * Gift a marketplace item to a school (Free of charge).
   */
  giftItem: async (schoolId: string, featureKey: string, quantity: number = 1, adminId: string): Promise<boolean> => {
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      const pricingRes = await client.query(
        'SELECT display_name, item_type FROM payg_feature_pricing WHERE feature_key = $1',
        [featureKey]
      );
      if (pricingRes.rows.length === 0) throw new Error('Feature not found');
      const p = pricingRes.rows[0];

      // 1. Log as gift in ledger (no credit deduction)
      await client.query(
        `INSERT INTO payg_ledger (school_id, type, credits, balance_after, description, feature_key, created_by_staff_id)
         SELECT school_id, 'gift', 0, balance_credits, $2, $3, $4
         FROM payg_wallets WHERE school_id = $1`,
        [schoolId, `Gifted ${quantity} ${p.display_name}(s) by Admin`, featureKey, adminId]
      );

      // 2. Apply persistent capacity if applicable
      if (p.item_type === 'capacity' || p.item_type === 'slot') {
        if (featureKey === 'extra_tutor_slot') {
          await client.query(
            'UPDATE school_subscriptions SET purchased_tutor_slots = purchased_tutor_slots + $1 WHERE school_id = $2',
            [quantity, schoolId]
          );
        } else if (featureKey === 'extra_student_slot' || featureKey === 'extra_student_pack') {
          const packSize = featureKey === 'extra_student_pack' ? 100 : 50;
          await client.query(
            'UPDATE school_subscriptions SET purchased_student_slots = purchased_student_slots + ($1 * $2) WHERE school_id = $3',
            [quantity, packSize, schoolId]
          );
        }
      }

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('PAYG Gifting Error:', err);
      return false;
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
