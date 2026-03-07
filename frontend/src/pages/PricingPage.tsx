import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { billingAPI } from '@/services/api';
import {
  Check,
  Zap,
  Users,
  GraduationCap,
  Brain,
  RefreshCw
} from 'lucide-react';

interface Plan {
  planType: string;
  displayName: string;
  priceNgn: number;
  priceUsd: number;
  maxTutors: number | null;
  maxInternalStudents: number | null;
  maxActiveExams: number | null;
  aiQueriesPerMonth: number;
  allowStudentPortal: boolean;
  allowExternalStudents: boolean;
  allowBulkImport: boolean;
  allowEmailNotifications: boolean;
  allowAdvancedAnalytics: boolean;
  allowCustomBranding: boolean;
  allowResultPdf: boolean;
  allowApiAccess: boolean;
}

const DEFAULT_PLAN_ASSETS: Record<string, any> = {
  freemium: {
    description: 'Perfect for small tutors and testing the platform.',
    cta: 'Get Started for Free',
    color: 'border-gray-200',
    buttonVariant: 'outline' as const
  },
  basic: {
    description: 'Designed for growing schools and standard CBT needs.',
    cta: 'Upgrade to Basic',
    popular: true,
    color: 'border-indigo-600 ring-2 ring-indigo-600 ring-opacity-50',
    buttonVariant: 'default' as const
  },
  advanced: {
    description: 'Full-scale CBT automation for large institutions.',
    cta: 'Go Advanced',
    color: 'border-purple-600',
    buttonVariant: 'default' as const
  },
  enterprise: {
    description: 'Custom solutions for national examination bodies.',
    cta: 'Contact Sales',
    color: 'border-slate-900',
    buttonVariant: 'default' as const
  }
};

export default function PricingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState<'NGN' | 'USD'>('NGN');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [yearlyDiscount, setYearlyDiscount] = useState({ percentage: 0, isActive: false });

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await billingAPI.getPlans();
      if (response.data?.success) {
        setPlans(response.data.data.plans);
        setYearlyDiscount(response.data.data.yearlyDiscount);
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrice = (monthlyPrice: number) => {
    const baseValue = Number(monthlyPrice);
    if (billingCycle === 'monthly') return baseValue;

    const annualBase = baseValue * 12;
    if (yearlyDiscount.isActive) {
      return annualBase * (1 - yearlyDiscount.percentage / 100);
    }
    return annualBase;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-20 flex items-center justify-center">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Simple, Transparent Pricing
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Choose the plan that's right for your institution
          </p>

          <div className="mt-8 flex flex-col items-center gap-6">
            {/* Currency Toggle */}
            <div className="flex items-center gap-4 bg-white p-1.5 rounded-xl shadow-sm border border-slate-200">
              <button
                onClick={() => setCurrency('NGN')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  currency === 'NGN'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                NGN (₦)
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
                  currency === 'USD'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                USD ($)
              </button>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${billingCycle === 'monthly' ? 'text-indigo-600' : 'text-gray-500'}`}>Monthly</span>
              <button
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2"
              >
                <div
                  className={`${
                    billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </button>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${billingCycle === 'yearly' ? 'text-indigo-600' : 'text-gray-500'}`}>Yearly</span>
                {yearlyDiscount.isActive && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 animate-pulse">
                    Save {yearlyDiscount.percentage}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => {
            const assets = DEFAULT_PLAN_ASSETS[plan.planType] || DEFAULT_PLAN_ASSETS.enterprise;
            const monthlyPrice = currency === 'NGN' ? Number(plan.priceNgn) : Number(plan.priceUsd);
            const displayPrice = calculatePrice(monthlyPrice);

            return (
              <div
                key={plan.planType}
                className={`relative bg-white rounded-2xl shadow-xl border border-slate-100 flex flex-col hover:scale-105 transition-all duration-300 ${assets.color}`}
              >
                {assets.popular && (
                  <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-bl-2xl z-10">
                    Popular
                  </div>
                )}

                <div className="p-8 flex-1">
                  <h3 className="text-xl font-bold text-gray-900 uppercase tracking-wider">
                    {plan.displayName}
                  </h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-extrabold tracking-tight text-gray-900">
                      {currency === 'NGN' ? '₦' : '$'}
                      {displayPrice.toLocaleString()}
                    </span>
                    <span className="ml-1 text-xl font-semibold text-gray-500">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>

                  {billingCycle === 'yearly' && yearlyDiscount.isActive && monthlyPrice > 0 && (
                    <p className="mt-1 text-xs text-green-600 font-medium line-through opacity-60">
                      Regular: {currency === 'NGN' ? '₦' : '$'}{(monthlyPrice * 12).toLocaleString()}
                    </p>
                  )}

                  <p className="mt-6 text-gray-500 text-sm">
                    {plan.planType === 'freemium' ? 'Free forever' : '14-day free trial'}
                  </p>

                  <ul className="mt-8 space-y-4 text-sm">
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-gray-600">
                        {plan.maxTutors ? `Up to ${plan.maxTutors} Tutors` : 'Unlimited Tutors'}
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-gray-600">
                        {plan.maxInternalStudents ? `Up to ${plan.maxInternalStudents} Students` : 'Unlimited Students'}
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-gray-600">
                        {plan.maxActiveExams ? `${plan.maxActiveExams} Active Exams` : 'Unlimited Active Exams'}
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className={`h-5 w-5 shrink-0 ${plan.allowAdvancedAnalytics ? 'text-green-500' : 'text-gray-200'}`} />
                      <span className={plan.allowAdvancedAnalytics ? 'text-gray-600' : 'text-gray-400'}>
                        Advanced Analytics
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className={`h-5 w-5 shrink-0 ${plan.allowCustomBranding ? 'text-green-500' : 'text-gray-200'}`} />
                      <span className={plan.allowCustomBranding ? 'text-gray-600' : 'text-gray-400'}>
                        Custom Branding
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-gray-600">
                        {plan.aiQueriesPerMonth} AI Queries/mo
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="p-8 bg-slate-50 rounded-b-2xl border-t border-slate-100">
                  <Button
                    onClick={() => {
                      if (user?.role === 'school_admin') {
                        navigate(`/school-admin/checkout?type=upgrade&planType=${plan.planType}&cycle=${billingCycle}`);
                      } else {
                        navigate('/register-school');
                      }
                    }}
                    variant={assets.buttonVariant}
                    className="w-full h-12 text-base font-bold rounded-xl shadow-sm"
                  >
                    {assets.cta}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PAYG Section */}
      <div className="max-w-4xl mx-auto mb-24 bg-white rounded-[40px] p-10 border border-gray-100 shadow-xl overflow-hidden relative">
         <div className="absolute top-0 right-0 p-8 opacity-5">
            <Zap className="h-32 w-32" />
         </div>
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
            <div className="flex-1">
               <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Zap className="h-5 w-5 text-amber-600" />
                  </div>
                  <span className="text-sm font-black text-amber-700 uppercase tracking-widest">Platform Add-on</span>
               </div>
               <h2 className="text-3xl font-black text-gray-900 mb-4 tracking-tight">PAYG Marketplace Credits</h2>
               <p className="text-gray-600 font-medium leading-relaxed">
                  Need extra capacity without a full upgrade? Our Pay-As-You-Go marketplace allows you to purchase temporary student slots, tutor accounts, or AI credits instantly.
               </p>
               <div className="mt-8 flex flex-wrap gap-4">
                  <FeatureTag icon={Users} label="Extra Tutor Slots" />
                  <FeatureTag icon={GraduationCap} label="Student Capacity" />
                  <FeatureTag icon={Brain} label="AI Query Bundles" />
               </div>
            </div>
            <div className="bg-gray-50 p-8 rounded-3xl border border-gray-100 text-center w-full md:w-64">
               <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Starting From</p>
               <p className="text-4xl font-black text-indigo-600">{currency === 'NGN' ? '₦2,500' : '$5'}</p>
               <p className="text-[10px] text-gray-500 mt-1 font-bold">Per Credit Bundle</p>
               <Button onClick={() => navigate('/login')} variant="ghost" className="mt-4 text-indigo-600 font-bold hover:bg-indigo-50 w-full rounded-xl">
                  Explore Marketplace
               </Button>
            </div>
         </div>
      </div>
    </div>
  );
}

function FeatureTag({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100 text-[10px] font-black text-gray-600 uppercase tracking-tight">
      <Icon className="h-3 w-3 text-indigo-500" />
      {label}
    </div>
  );
}
