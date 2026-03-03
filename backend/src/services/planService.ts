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
  // Marketplace purchased extras
  purchasedTutors: number;
  purchasedStudents: number;
  purchasedAiQueries: number;
  isCapacityFrozen: boolean;
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
 * Incorporates Marketplace capacity only if subscription is ACTIVE.
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
    return mapPlanDefinition(pd, 'active', 0, 0, 0, false);
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
    return mapPlanDefinition(freemiumResult.rows[0], 'active', row.purchased_tutor_slots, row.purchased_student_slots, row.purchased_ai_queries, true);
  }

  // Check if suspended
  if (row.status === 'suspended') {
    const freemiumResult = await db.query(
      'SELECT * FROM plan_definitions WHERE plan_type = $1',
      ['freemium']
    );
    return { ...mapPlanDefinition(freemiumResult.rows[0], 'suspended', 0, 0, 0, true) };
  }

  return mapPlanDefinition(row, row.status, row.purchased_tutor_slots, row.purchased_student_slots, row.purchased_ai_queries, row.is_capacity_frozen);
};

function mapPlanDefinition(pd: any, status: string, pTutor: number = 0, pStudent: number = 0, pAi: number = 0, isFrozen: boolean = false): PlanLimits {
  // RULE: Marketplace capacity is only active if the school is on a PAID plan or GIFTED/TRIALING.
  // If isFrozen is true, we zero out the purchased capacities.

  return {
    planType: pd.plan_type,
    displayName: pd.display_name,
    status,
    maxTutors: pd.max_tutors,
    maxInternalStudents: pd.max_internal_students,
    maxExternalPerTutor: pd.max_external_per_tutor,
    maxActiveExams: pd.max_active_exams,
    aiQueriesPerMonth: (pd.ai_queries_per_month ?? 0) + (isFrozen ? 0 : pAi),
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
    // Marketplace purchased extras
    purchasedTutors: !isFrozen ? (pTutor || 0) : 0,
    purchasedStudents: !isFrozen ? (pStudent || 0) : 0,
    purchasedAiQueries: !isFrozen ? (pAi || 0) : 0,
    isCapacityFrozen: isFrozen,
  };
}

const PLAN_HIERARCHY: Record<string, number> = {
  'freemium': 0,
  'basic': 1,
  'advanced': 2,
  'premium': 3, // For future use if added
  'enterprise': 4
};

/**
 * Check if a school's plan allows a specific feature.
 * Also checks feature_flags table for platform-wide overrides by super admin.
 */
export const isFeatureAllowed = async (schoolId: string, featureKey: string): Promise<boolean> => {
  const [plan, flagResult] = await Promise.all([
    getSchoolPlan(schoolId),
    db.query('SELECT min_plan, is_enabled FROM feature_flags WHERE feature_key = $1', [featureKey])
  ]);

  // If feature record exists in flags table
  if (flagResult.rows.length > 0) {
    const flag = flagResult.rows[0];

    // 1. If feature is globally disabled, deny everyone
    if (!flag.is_enabled) return false;

    // 2. If SuperAdmin has set a min_plan, compare ranks
    if (flag.min_plan) {
      const schoolRank = PLAN_HIERARCHY[plan.planType] ?? 0;
      const minRank = PLAN_HIERARCHY[flag.min_plan] ?? 0;

      if (schoolRank < minRank) return false;
    }
  }

  // Fallback to the legacy boolean flags in plan definitions if not overriding by min_plan
  const featureMap: Record<string, keyof PlanLimits> = {
    student_portal:      'allowStudentPortal',
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

  // Special case for AI — check queries per month (includes purchased packs)
  if (featureKey === 'ai_question_gen') return plan.aiQueriesPerMonth > 0;

  const planKey = featureMap[featureKey];
  if (!planKey) return true; // Unknown feature — allow by default

  return !!(plan as any)[planKey];
};

/**
 * Get current usage counts for a school.
 */
export const getSchoolUsage = async (schoolId: string): Promise<PlanUsage> => {
  const [tutors, students, exams, aiQueries] = await Promise.all([
    db.query('SELECT COUNT(*) as count FROM tutors WHERE school_id = $1', [schoolId]),
    db.query('SELECT COUNT(*) as count FROM students WHERE school_id = $1', [schoolId]),
    db.query('SELECT COUNT(*) as count FROM exams WHERE school_id = $1', [schoolId]),
    // Count AI queries this month (tracked in activity log)
    db.query(
      `SELECT COUNT(*) as count FROM activity_logs
       WHERE school_id = $1::uuid AND (action = 'ai_question_generated' OR action = 'ai_generated')
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
 * Check if a school can add more tutors.
 */
export const canAddTutor = async (schoolId: string): Promise<{ allowed: boolean; reason?: string }> => {
  const [plan, usage] = await Promise.all([getSchoolPlan(schoolId), getSchoolUsage(schoolId)]);
  if (plan.maxTutors === null) return { allowed: true };

  const effectiveLimit = (plan.maxTutors ?? 0) + plan.purchasedTutors;
  if (usage.tutorCount >= effectiveLimit) {
    const isFree = plan.planType === 'freemium';
    return {
      allowed: false,
      reason: isFree
        ? "Free plan limit reached (2). Upgrade to a paid plan to use more slots."
        : `Limit reached (${effectiveLimit}). Purchase more tutor slots in the Marketplace.`
    };
  }
  return { allowed: true };
};

/**
 * Check if a school can add more students.
 */
export const canAddStudent = async (schoolId: string): Promise<{ allowed: boolean; reason?: string }> => {
  const [plan, usage] = await Promise.all([getSchoolPlan(schoolId), getSchoolUsage(schoolId)]);
  if (plan.maxInternalStudents === null) return { allowed: true };

  const effectiveLimit = (plan.maxInternalStudents ?? 0) + plan.purchasedStudents;
  if (usage.studentCount >= effectiveLimit) {
    const isFree = plan.planType === 'freemium';
    return {
      allowed: false,
      reason: isFree
        ? "Free plan limit reached (20). Upgrade to a paid plan to use more slots."
        : `Limit reached (${effectiveLimit}). Purchase more student slots in the Marketplace.`
    };
  }
  return { allowed: true };
};

/**
 * Check if a tutor can add more external students.
 * Respects plan limits, school admin settings, and marketplace capacity.
 */
export const canAddExternalStudent = async (schoolId: string, tutorId: string): Promise<{ allowed: boolean; reason?: string }> => {
  const [subRes, settingsRes, usageRes, schoolUsageRes] = await Promise.all([
    db.query(
      `SELECT ss.plan_type, ss.status, ss.is_capacity_frozen, ss.purchased_student_slots,
              p.max_external_per_tutor
       FROM school_subscriptions ss
       JOIN plan_definitions p ON ss.plan_type = p.plan_type
       WHERE ss.school_id = $1`,
      [schoolId]
    ),
    db.query('SELECT max_external_per_tutor FROM school_settings WHERE school_id = $1', [schoolId]),
    db.query('SELECT COUNT(*) as count FROM external_students WHERE tutor_id = $1', [tutorId]),
    db.query('SELECT COUNT(*) as count FROM external_students WHERE school_id = $1', [schoolId])
  ]);

  const sub = subRes.rows[0];
  if (!sub) return { allowed: false, reason: "School subscription not found." };

  const isFrozen = sub.is_capacity_frozen;
  const tutorBaseLimit = sub.max_external_per_tutor ?? 5;
  const purchasedExtra = !isFrozen ? (sub.purchased_student_slots || 0) : 0;

  // 1. Check Tutor's Base Limit (Private Capacity)
  const currentTutorCount = parseInt(usageRes.rows[0].count);
  if (currentTutorCount < tutorBaseLimit) return { allowed: true };

  // 2. If base limit exceeded, use the School-Wide Purchased Pool
  // We check how many "excess" external students exist across the whole school
  const totalExternalCount = parseInt(schoolUsageRes.rows[0].count);
  // Total tutors * tutorBaseLimit is the "free" external capacity of the school
  const tutorCountRes = await db.query('SELECT COUNT(*) as count FROM tutors WHERE school_id = $1', [schoolId]);
  const totalTutors = parseInt(tutorCountRes.rows[0].count);

  const schoolBaseCapacity = totalTutors * tutorBaseLimit;
  const usedExtra = Math.max(0, totalExternalCount - schoolBaseCapacity);

  if (usedExtra >= purchasedExtra) {
    return {
      allowed: false,
      reason: `Tutor limit (${tutorBaseLimit}) reached and no spare school-wide purchased slots available.${isFrozen ? ' (Purchased slots are currently frozen)' : ''}`
    };
  }

  return { allowed: true };
};

/**
 * Start a 14-day trial for a new school.
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

  await db.query(`INSERT INTO school_settings (school_id) VALUES ($1) ON CONFLICT (school_id) DO NOTHING`, [schoolId]);
  await db.query(`INSERT INTO payg_wallets (school_id) VALUES ($1) ON CONFLICT (school_id) DO NOTHING`, [schoolId]);
};

/**
 * Get full billing status for a school.
 */
export const getSchoolBillingStatus = async (schoolId: string) => {
  const [plan, usage, sub, wallet] = await Promise.all([
    getSchoolPlan(schoolId),
    getSchoolUsage(schoolId),
    db.query('SELECT * FROM school_subscriptions WHERE school_id = $1', [schoolId]),
    db.query('SELECT balance_credits FROM payg_wallets WHERE school_id = $1', [schoolId]),
  ]);

  const featureKeys = [
    'student_portal', 'bulk_import', 'email_notifications', 'sms_notifications',
    'advanced_analytics', 'custom_branding', 'api_access', 'result_pdf',
    'result_export', 'external_students', 'ai_question_gen'
  ];

  const features: Record<string, boolean> = {};
  await Promise.all(featureKeys.map(async (key) => {
    features[key] = await isFeatureAllowed(schoolId, key);
  }));

  const subscription = sub.rows[0];
  const paygBalance = wallet.rows[0]?.balance_credits ?? 0;
  const isFrozen = plan.isCapacityFrozen;

  return {
    plan,
    usage,
    subscription: {
      status: subscription?.status ?? 'active',
      billingCycle: subscription?.billing_cycle ?? 'free',
      trialEnd: subscription?.trial_end,
      currentPeriodEnd: subscription?.current_period_end,
      overrideExpires: subscription?.override_expires_at,
      isPaid: subscription?.billing_cycle !== 'free' && (subscription?.status === 'active' || subscription?.status === 'gifted'),
      isFreemium: plan.planType === 'freemium',
    },
    paygBalance,
    features,
    limits: {
      tutorsUsed: usage.tutorCount,
      tutorsMax: (plan.maxTutors ?? 0) + plan.purchasedTutors,
      tutorsFrozen: isFrozen ? (subscription?.purchased_tutor_slots ?? 0) : 0,
      purchasedTutors: plan.purchasedTutors,

      studentsUsed: usage.studentCount,
      studentsMax: plan.maxInternalStudents !== null
        ? (plan.maxInternalStudents + plan.purchasedStudents)
        : null,
      studentsFrozen: isFrozen ? (subscription?.purchased_student_slots ?? 0) : 0,
      purchasedStudents: plan.purchasedStudents,

      examsUsed: usage.examCount,
      examsMax: plan.maxActiveExams,

      aiUsed: usage.aiQueriesThisMonth,
      aiMax: plan.aiQueriesPerMonth,
      purchasedAiQueries: plan.purchasedAiQueries,
    }
  };
};
