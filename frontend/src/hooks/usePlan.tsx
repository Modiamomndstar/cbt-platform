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
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    const isLoginPage = path === '/login' || path === '/admin/login' || path === '/student/login';

    if (!user || user.role === 'super_admin' || !token || isLoginPage) {
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
    // We check both snake_case (frontend) and camelCase (backend transformed)
    const camelKey = featureKey.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    if (plan.features && (plan.features[featureKey] === true || plan.features[camelKey] === true)) return true;

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
      lms_access:          'allowLms',
      lms_tutor_access:    'allowLms',
    };

    const planKey = featureMap[featureKey];
    if (planKey && (plan.plan as any)[planKey]) return true;

    // Check features object again if explicitly false in fallback
    if (plan.features && (plan.features[featureKey] === false || plan.features[camelKey] === false)) return false;

    // Unknown features (not in map) should be denied by default for security if not found in features object
    if (!planKey) return false; 

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
