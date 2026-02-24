import cron from 'node-cron';
import { db } from '../config/database';
import { sendTrialStartEmail, sendTrialExpiredEmail } from './email';

export const initCronJobs = () => {
  // Run daily at midnight (00:00) server time
  cron.schedule('0 0 * * *', async () => {
    console.log('[CRON] Starting daily trial expiry check...');
    await processTrialExpiries();
  });

  console.log('[CRON] Jobs initialized.');
};

const processTrialExpiries = async () => {
  try {
    const today = new Date();

    // 1. Alert schools whose trial is expiring in 3 days
    const expiringIn3Days = await db.query(`
      SELECT sa.email, s.school_name, sub.trial_end
      FROM school_subscriptions sub
      JOIN schools s ON sub.school_id = s.id
      JOIN school_admins sa ON s.id = sa.school_id
      WHERE sub.status = 'trialing'
      AND DATE(sub.trial_end) = DATE($1)
    `, [new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)]);

    for (const row of expiringIn3Days.rows) {
      console.log(`[CRON] Trial expiring in 3 days for ${row.school_name}`);
      await sendTrialStartEmail(row.email, row.school_name, row.trial_end);
    }

    // 2. Expire trials that ended yesterday
    const expiredSchools = await db.query(`
      UPDATE school_subscriptions
      SET status = 'expired', updated_at = NOW()
      WHERE status = 'trialing' AND trial_end < NOW()
      RETURNING school_id
    `);

    if (expiredSchools.rows.length > 0) {
      console.log(`[CRON] Expired ${expiredSchools.rows.length} subscriptions.`);

      const expiredSchoolIds = expiredSchools.rows.map(r => r.school_id);

      const adminEmails = await db.query(`
        SELECT email, s.school_name
        FROM school_admins sa
        JOIN schools s ON sa.school_id = s.id
        WHERE sa.school_id = ANY($1)
      `, [expiredSchoolIds]);

      for (const row of adminEmails.rows) {
        console.log(`[CRON] Trial expired for ${row.school_name}`);
        await sendTrialExpiredEmail(row.email, row.school_name);
      }
    }

    console.log('[CRON] Daily trial expiry check complete.');
  } catch (error) {
    console.error('[CRON] Error processing trial expiries:', error);
  }
};
