/**
 * Subscription Capacity Sync Job
 * Runs daily to:
 *   1. Freeze purchased capacity (tutor/student slots) for lapsed subscriptions
 *   2. Unfreeze capacity if a subscription has been reactivated
 *
 * Schedule: 0 4 * * * (4am UTC daily)
 */

import { db } from '../config/database';

async function main() {
  console.log(`[${new Date().toISOString()}] Subscription sync job started`);

  try {
    // 1. Unfreeze capacity for ACTIVE or TRIALING schools that are currently frozen
    const unfreezeResult = await db.query(`
      UPDATE school_subscriptions
      SET is_capacity_frozen = FALSE, updated_at = NOW()
      WHERE status IN ('active', 'trialing')
        AND is_capacity_frozen = TRUE
      RETURNING school_id
    `);
    console.log(`  ✓ Unfrozen capacity for ${unfreezeResult.rowCount} schools`);

    // 2. Freeze capacity for schools that do NOT have active/trialing status and are NOT frozen
    // We only freeze if they have actual purchased slots to freeze
    const freezeResult = await db.query(`
      UPDATE school_subscriptions
      SET is_capacity_frozen = TRUE, updated_at = NOW()
      WHERE status NOT IN ('active', 'trialing')
        AND is_capacity_frozen = FALSE
        AND (purchased_tutor_slots > 0 OR purchased_student_slots > 0 OR purchased_ai_queries > 0)
      RETURNING school_id
    `);
    console.log(`  ✓ Frozen capacity for ${freezeResult.rowCount} schools`);

    // 3. Log discrepancies (optional, for monitoring)
    const discrepancyCheck = await db.query(`
      SELECT s.name, ss.status, ss.is_capacity_frozen
      FROM school_subscriptions ss
      JOIN schools s ON s.id = ss.school_id
      WHERE (ss.status IN ('active', 'trialing') AND ss.is_capacity_frozen = TRUE)
         OR (ss.status NOT IN ('active', 'trialing') AND ss.is_capacity_frozen = FALSE AND (purchased_tutor_slots > 0 OR purchased_student_slots > 0))
    `);
    
    if (discrepancyCheck.rowCount! > 0) {
      console.warn(`  ! Found ${discrepancyCheck.rowCount} discrepancies after sync`);
    }

  } catch (error) {
    console.error('  ✗ Error during subscription sync:', error);
    throw error;
  }

  console.log(`[${new Date().toISOString()}] Subscription sync job complete`);
}

main().catch((err) => {
  console.error('Job failed:', err);
  process.exit(1);
});
