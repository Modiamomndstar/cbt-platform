/**
 * Trial expiry cron job
 * Runs daily to:
 *   1. Send day-10 trial warning emails
 *   2. Expire trials that have ended (downgrade to freemium)
 *   3. Log all transitions to school_subscriptions
 *
 * Schedule in production:  0 6 * * *  (6am UTC daily)
 * Run manually:            npx ts-node src/cron/trialExpiry.ts
 */

import { db } from '../config/database';
import { sendTrialExpiredEmail, sendTrialStartEmail } from '../services/email';

async function main() {
  console.log(`[${new Date().toISOString()}] Trial expiry cron started`);

  // ── 1. Send warning to schools on day 10 (4 days left) ──────────────
  const warningResult = await db.query(`
    SELECT s.id, s.name, s.email, ss.trial_end_at
    FROM school_subscriptions ss
    JOIN schools s ON s.id = ss.school_id
    WHERE ss.status = 'trialing'
      AND ss.trial_warning_sent = FALSE
      AND ss.trial_end_at IS NOT NULL
      AND ss.trial_end_at BETWEEN NOW() AND NOW() + INTERVAL '4 days 1 hour'
  `);

  for (const row of warningResult.rows) {
    console.log(`Sending trial warning to ${row.name} (${row.email})`);
    const sent = await sendTrialStartEmail(row.email, row.name, new Date(row.trial_end_at));
    if (sent) {
      await db.query(
        `UPDATE school_subscriptions SET trial_warning_sent = TRUE WHERE school_id = $1`,
        [row.id]
      );
      console.log(`  ✓ Warning sent`);
    }
  }

  console.log(`  → Sent ${warningResult.rows.length} trial warning(s)`);

  // ── 2. Expire trials that have ended ────────────────────────────────
  const expiredResult = await db.query(`
    SELECT s.id, s.name, s.email
    FROM school_subscriptions ss
    JOIN schools s ON s.id = ss.school_id
    WHERE ss.status = 'trialing'
      AND ss.trial_end_at < NOW()
  `);

  for (const row of expiredResult.rows) {
    console.log(`Expiring trial for ${row.name} (${row.email})`);
    await db.query(`
      UPDATE school_subscriptions
      SET status = 'cancelled',
          plan_type = 'freemium',
          updated_at = NOW()
      WHERE school_id = $1
        AND status = 'trialing'
    `, [row.id]);

    // Also update the schools table plan_type
    await db.query(
      `UPDATE schools SET plan_type = 'freemium' WHERE id = $1`,
      [row.id]
    );

    await sendTrialExpiredEmail(row.email, row.name);
    console.log(`  ✓ Trial expired, downgraded to freemium`);
  }

  console.log(`  → Expired ${expiredResult.rows.length} trial(s)`);
  console.log(`[${new Date().toISOString()}] Trial expiry cron complete`);

  await db.end();
}

main().catch((err) => {
  console.error('Cron job failed:', err);
  process.exit(1);
});
