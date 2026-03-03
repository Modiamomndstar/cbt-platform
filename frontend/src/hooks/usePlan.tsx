import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './useAuth';
import { billingAPI } from '@/services/api';

interface PlanStatus {
  plan: {
    planType: string;
    displayName: string;
    status: string;
    [key: string]: any; // flattened boolean flags like allowAdvancedAnalytics
  };
  limits: Record<string, number | null>;
  usage: Record<string, number>;
  subscription: Record<string, any>;
  paygBalance: number;
  features: Record<string, boolean>;
}

interface PlanContextType {
  plan: PlanStatus | null;
  isLoading: boolean;
  isFeatureAllowed: (featureKey: string) => boolean;
  getLimit: (limitKey: string) => number;
  getUsage: (usageKey: string) => number;
  refreshPlan: () => Promise<void>;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshPlan = async () => {
    if (!user || user.role === 'super_admin') {
      setIsLoading(false);
      return;
    }

    try {
      const response = await billingAPI.getStatus();
      if (response.data.success) {
        setPlan(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch plan status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshPlan();
  }, [user]);

  const isFeatureAllowed = (featureKey: string): boolean => {
    if (user?.role === 'super_admin') return true;
    if (!plan || !plan.plan) return false;

    // Use the optimized features object from backend first
    if (plan.features && plan.features[featureKey]) return true;

    // Mapping of feature keys to backend boolean flags (fallback)
    const featureMap: Record<string, string> = {
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

    const planKey = featureMap[featureKey];
    if (planKey && (plan.plan as any)[planKey]) return true;

    // Check features object again if explicitly false in fallback
    if (plan.features && plan.features[featureKey] === false) return false;

    if (!planKey) return true; // unknown feature usually means platform default

    return false;
  };

  const getLimit = (limitKey: string): number => {
    if (!plan || !plan.limits) return 0;
    return (plan.limits[limitKey] as number) || 0;
  };

  const getUsage = (usageKey: string): number => {
    if (!plan || !plan.usage) return 0;
    return (plan.usage[usageKey] as number) || 0;
  };

  return (
    <PlanContext.Provider value={{ plan, isLoading, isFeatureAllowed, getLimit, getUsage, refreshPlan }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}
