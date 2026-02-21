import { db } from '../config/database';

export interface PlanLimits {
  planType: string;
  displayName: string;
  status: string;
  maxTutors: number | null;
  maxInternalStudents: number | null;
  maxExternalPerTutor: number | null;
  maxActiveExams: number | null;
  aiQueriesPerMonth: number;
  allowStudentPortal: boolean;
  allowExternalStudents: boolean;
  allowBulkImport: boolean;
  allowEmailNotifications: boolean;
  allowSmsNotifications: boolean;
  allowAdvancedAnalytics: boolean;
  allowCustomBranding: boolean;
  allowApiAccess: boolean;
  allowResultPdf: boolean;
  allowResultExport: boolean;
}

export interface PlanUsage {
  tutorCount: number;
  studentCount: number;
  examCount: number;
  aiQueriesThisMonth: number;
}

/**
 * Get the effective plan for a school.
 * Respects manual overrides (gifted plans) set by super admin.
 */
export const getSchoolPlan = async (schoolId: string): Promise<PlanLimits> => {
  // Get subscription + check for active override
  const subResult = await db.query(
    `SELECT ss.*, pd.*,
            CASE
              WHEN ss.override_plan IS NOT NULL AND (ss.override_expires_at IS NULL OR ss.override_expires_at > NOW())
              THEN ss.override_plan
              ELSE ss.plan_type
            END as effective_plan
     FROM school_subscriptions ss
     JOIN plan_definitions pd ON pd.plan_type = (
       CASE
         WHEN ss.override_plan IS NOT NULL AND (ss.override_expires_at IS NULL OR ss.override_expires_at > NOW())
         THEN ss.override_plan
         ELSE ss.plan_type
       END
     )
     WHERE ss.school_id = $1`,
    [schoolId]
  );

  if (subResult.rows.length === 0) {
    // School has no subscription record yet — treat as freemium
    const freemiumResult = await db.query(
      'SELECT * FROM plan_definitions WHERE plan_type = $1',
      ['freemium']
    );
    const pd = freemiumResult.rows[0];
    return mapPlanDefinition(pd, 'active');
  }

  const row = subResult.rows[0];

  // Check if trial has expired — auto-downgrade to freemium
  if (row.status === 'trialing' && row.trial_end && new Date(row.trial_end) < new Date()) {
    await db.query(
      `UPDATE school_subscriptions
       SET plan_type = 'freemium', status = 'active', billing_cycle = 'free', updated_at = NOW()
       WHERE school_id = $1`,
      [schoolId]
    );
    const freemiumResult = await db.query(
      'SELECT * FROM plan_definitions WHERE plan_type = $1',
      ['freemium']
    );
    return mapPlanDefinition(freemiumResult.rows[0], 'active');
  }

  // Check if suspended
  if (row.status === 'suspended') {
    const freemiumResult = await db.query(
      'SELECT * FROM plan_definitions WHERE plan_type = $1',
      ['freemium']
    );
    return { ...mapPlanDefinition(freemiumResult.rows[0], 'suspended') };
  }

  return mapPlanDefinition(row, row.status);
};

function mapPlanDefinition(pd: any, status: string): PlanLimits {
  return {
    planType: pd.plan_type,
    displayName: pd.display_name,
    status,
    maxTutors: pd.max_tutors,
    maxInternalStudents: pd.max_internal_students,
    maxExternalPerTutor: pd.max_external_per_tutor,
    maxActiveExams: pd.max_active_exams,
    aiQueriesPerMonth: pd.ai_queries_per_month ?? 0,
    allowStudentPortal: pd.allow_student_portal,
    allowExternalStudents: pd.allow_external_students,
    allowBulkImport: pd.allow_bulk_import,
    allowEmailNotifications: pd.allow_email_notifications,
    allowSmsNotifications: pd.allow_sms_notifications,
    allowAdvancedAnalytics: pd.allow_advanced_analytics,
    allowCustomBranding: pd.allow_custom_branding,
    allowApiAccess: pd.allow_api_access,
    allowResultPdf: pd.allow_result_pdf,
    allowResultExport: pd.allow_result_export,
  };
}

/**
 * Check if a school's plan allows a specific feature.
 * Also checks feature_flags table for platform-wide overrides by super admin.
 */
export const isFeatureAllowed = async (schoolId: string, featureKey: string): Promise<boolean> => {
  const [plan, flagResult] = await Promise.all([
    getSchoolPlan(schoolId),
    db.query('SELECT min_plan, is_enabled FROM feature_flags WHERE feature_key = $1', [featureKey])
  ]);

  // If feature is globally disabled, deny everyone
  if (flagResult.rows.length > 0 && !flagResult.rows[0].is_enabled) return false;

  // Map feature keys to plan limit fields
  const featureMap: Record<string, keyof PlanLimits> = {
    student_portal:      'allowStudentPortal',
    ai_question_gen:     'allowStudentPortal', // handled separately below
    bulk_import:         'allowBulkImport',
    email_notifications: 'allowEmailNotifications',
    sms_notifications:   'allowSmsNotifications',
    advanced_analytics:  'allowAdvancedAnalytics',
    custom_branding:     'allowCustomBranding',
    api_access:          'allowApiAccess',
    result_pdf:          'allowResultPdf',
    result_export:       'allowResultExport',
    external_students:   'allowExternalStudents',
  };

  // Special case for AI — check queries per month
  if (featureKey === 'ai_question_gen') return plan.aiQueriesPerMonth > 0;

  const planKey = featureMap[featureKey];
  if (!planKey) return true; // Unknown feature — allow by default

  return !!plan[planKey];
};

/**
 * Get current usage counts for a school.
 */
export const getSchoolUsage = async (schoolId: string): Promise<PlanUsage> => {
  const [tutors, students, exams, aiQueries] = await Promise.all([
    db.query('SELECT COUNT(*) as count FROM tutors WHERE school_id = $1', [schoolId]),
    db.query('SELECT COUNT(*) as count FROM students WHERE school_id = $1', [schoolId]),
    db.query('SELECT COUNT(*) as count FROM exams WHERE school_id = $1', [schoolId]),
    // Count AI queries this month (tracked in audit log)
    db.query(
      `SELECT COUNT(*) as count FROM staff_audit_log
       WHERE target_id = $1::uuid AND action = 'ai_question_generated'
       AND created_at >= date_trunc('month', NOW())`,
      [schoolId]
    ).catch(() => ({ rows: [{ count: 0 }] }))
  ]);

  return {
    tutorCount: parseInt(tutors.rows[0].count),
    studentCount: parseInt(students.rows[0].count),
    examCount: parseInt(exams.rows[0].count),
    aiQueriesThisMonth: parseInt(aiQueries.rows[0].count),
  };
};

/**
 * Check if a school can add more tutors (within their plan limit).
 */
export const canAddTutor = async (schoolId: string): Promise<{ allowed: boolean; reason?: string }> => {
  const [plan, usage] = await Promise.all([getSchoolPlan(schoolId), getSchoolUsage(schoolId)]);
  if (plan.maxTutors === null) return { allowed: true };
  if (usage.tutorCount >= plan.maxTutors) {
    return { allowed: false, reason: `Your plan allows a maximum of ${plan.maxTutors} tutor(s). Upgrade to add more.` };
  }
  return { allowed: true };
};

/**
 * Check if a school can add more students (within their plan limit).
 */
export const canAddStudent = async (schoolId: string): Promise<{ allowed: boolean; reason?: string }> => {
  const [plan, usage, sub] = await Promise.all([
    getSchoolPlan(schoolId),
    getSchoolUsage(schoolId),
    db.query('SELECT extra_internal_students FROM school_subscriptions WHERE school_id = $1', [schoolId])
  ]);

  if (plan.maxInternalStudents === null) return { allowed: true };

  const extraStudents = sub.rows[0]?.extra_internal_students ?? 0;
  const effectiveLimit = (plan.maxInternalStudents ?? 0) + (extraStudents * 50);

  if (usage.studentCount >= effectiveLimit) {
    return {
      allowed: false,
      reason: `Your plan allows ${effectiveLimit} student(s). Purchase more student slots or upgrade your plan.`
    };
  }
  return { allowed: true };
};

/**
 * Start a 14-day trial for a new school (called on registration).
 */
export const startTrial = async (schoolId: string): Promise<void> => {
  const trialStart = new Date();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 14);

  await db.query(
    `INSERT INTO school_subscriptions (school_id, plan_type, status, billing_cycle, trial_start, trial_end)
     VALUES ($1, 'basic', 'trialing', 'free', $2, $3)
     ON CONFLICT (school_id) DO UPDATE
     SET plan_type = 'basic', status = 'trialing', trial_start = $2, trial_end = $3, updated_at = NOW()`,
    [schoolId, trialStart, trialEnd]
  );

  // Create default settings
  await db.query(
    `INSERT INTO school_settings (school_id) VALUES ($1) ON CONFLICT (school_id) DO NOTHING`,
    [schoolId]
  );

  // Create PAYG wallet
  await db.query(
    `INSERT INTO payg_wallets (school_id) VALUES ($1) ON CONFLICT (school_id) DO NOTHING`,
    [schoolId]
  );
};

/**
 * Get full billing status for a school (for billing page).
 */
export const getSchoolBillingStatus = async (schoolId: string) => {
  const [plan, usage, sub, wallet] = await Promise.all([
    getSchoolPlan(schoolId),
    getSchoolUsage(schoolId),
    db.query('SELECT * FROM school_subscriptions WHERE school_id = $1', [schoolId]),
    db.query('SELECT balance_credits FROM payg_wallets WHERE school_id = $1', [schoolId]),
  ]);

  const subscription = sub.rows[0];
  const paygBalance = wallet.rows[0]?.balance_credits ?? 0;

  return {
    plan,
    usage,
    subscription: {
      status: subscription?.status ?? 'active',
      billingCycle: subscription?.billing_cycle ?? 'free',
      trialEnd: subscription?.trial_end,
      currentPeriodEnd: subscription?.current_period_end,
      overrideExpires: subscription?.override_expires_at,
    },
    paygBalance,
    limits: {
      tutorsUsed: usage.tutorCount,
      tutorsMax: plan.maxTutors,
      studentsUsed: usage.studentCount,
      studentsMax: plan.maxInternalStudents !== null
        ? (plan.maxInternalStudents + ((subscription?.extra_internal_students ?? 0) * 50))
        : null,
      examsUsed: usage.examCount,
      examsMax: plan.maxActiveExams,
      aiUsed: usage.aiQueriesThisMonth,
      aiMax: plan.aiQueriesPerMonth,
    }
  };
};
