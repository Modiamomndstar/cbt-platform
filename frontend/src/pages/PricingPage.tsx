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
import { cn } from '@/lib/utils';

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
    description: 'Perfect for individual tutors and testing.',
    cta: 'Start for Free',
    color: 'border-gray-100',
    buttonVariant: 'outline' as const
  },
  basic: {
    description: 'Designed for growing schools and standard CBT.',
    cta: 'Upgrade to Basic',
    popular: true,
    color: 'border-indigo-600 ring-4 ring-indigo-50 shadow-indigo-100',
    buttonVariant: 'default' as const
  },
  advanced: {
    description: 'Full CBT automation for large institutions.',
    cta: 'Go Advanced',
    color: 'border-purple-600',
    buttonVariant: 'default' as const
  },
  enterprise: {
    description: 'Custom solutions for exam bodies.',
    cta: 'Contact Sales',
    color: 'border-slate-800',
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
      <div className="min-h-screen pt-40 flex items-center justify-center">
        <RefreshCw className="h-10 w-10 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Background Decor */}
      <div className="absolute top-0 inset-x-0 h-[500px] bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-32 relative z-10">
        <div className="text-center mb-16 px-4">
          <h1 className="text-4xl sm:text-6xl font-black text-gray-900 tracking-tight leading-none mb-6">
            Simple, Transparent <span className="text-indigo-600">Pricing.</span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-500 font-medium max-w-2xl mx-auto">
            Choose the plan that fits your institution's scale. 
            All plans include core features to get you up and running immediately.
          </p>

          <div className="mt-12 flex flex-col items-center gap-8">
            {/* Currency Toggle */}
            <div className="flex items-center gap-1.5 bg-gray-100/80 backdrop-blur-sm p-1.5 rounded-2xl border border-gray-200/50">
              <button
                onClick={() => setCurrency('NGN')}
                className={cn(
                  "px-8 py-2.5 rounded-xl text-sm font-black transition-all",
                  currency === 'NGN'
                    ? 'bg-white text-indigo-600 shadow-md'
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                NGN (₦)
              </button>
              <button
                onClick={() => setCurrency('USD')}
                className={cn(
                  "px-8 py-2.5 rounded-xl text-sm font-black transition-all",
                  currency === 'USD'
                    ? 'bg-white text-indigo-600 shadow-md'
                    : 'text-gray-500 hover:text-gray-900'
                )}
              >
                USD ($)
              </button>
            </div>

            {/* Billing Cycle Toggle */}
            <div className="flex items-center gap-4">
              <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", billingCycle === 'monthly' ? 'text-indigo-600' : 'text-gray-400')}>Monthly</span>
              <button
                onClick={() => setBillingCycle(prev => prev === 'monthly' ? 'yearly' : 'monthly')}
                className="relative inline-flex h-7 w-14 items-center rounded-full bg-indigo-100 transition-colors focus:outline-none"
              >
                <div
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-indigo-600 transition-transform shadow-lg shadow-indigo-200",
                    billingCycle === 'yearly' ? 'translate-x-8' : 'translate-x-1'
                  )}
                />
              </button>
              <div className="flex items-center gap-3">
                <span className={cn("text-xs font-black uppercase tracking-widest transition-colors", billingCycle === 'yearly' ? 'text-indigo-600' : 'text-gray-400')}>Yearly</span>
                {yearlyDiscount.isActive && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase rounded-full shadow-sm ring-4 ring-emerald-50">
                    Save {yearlyDiscount.percentage}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {plans.map((plan) => {
            const assets = DEFAULT_PLAN_ASSETS[plan.planType] || DEFAULT_PLAN_ASSETS.enterprise;
            const monthlyPrice = currency === 'NGN' ? Number(plan.priceNgn) : Number(plan.priceUsd);
            const displayPrice = calculatePrice(monthlyPrice);

            return (
              <div
                key={plan.planType}
                className={cn(
                  "relative bg-white rounded-[32px] border border-gray-100 flex flex-col transition-all duration-300 group",
                  assets.popular && "scale-105 sm:scale-110 md:scale-105 lg:scale-110 z-20 shadow-2xl shadow-indigo-100",
                  assets.color
                )}
              >
                {assets.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] px-6 py-2 rounded-full shadow-xl shadow-indigo-200">
                    Most Popular
                  </div>
                )}

                <div className="p-8 pb-4 flex-1">
                  <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest mb-1">
                    {plan.displayName}
                  </h3>
                  <p className="text-sm text-gray-400 font-medium mb-8">
                    {assets.description}
                  </p>
                  
                  <div className="flex items-baseline space-x-1 mb-2">
                    <span className="text-4xl sm:text-5xl font-black tracking-tight text-gray-900 leading-none">
                      {currency === 'NGN' ? '₦' : '$'}
                      {displayPrice.toLocaleString()}
                    </span>
                    <span className="text-gray-400 font-bold text-sm">
                      /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>

                  {billingCycle === 'yearly' && yearlyDiscount.isActive && monthlyPrice > 0 && (
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wider mb-6">
                      Regularly: {currency === 'NGN' ? '₦' : '$'}{(monthlyPrice * 12).toLocaleString()}
                    </p>
                  )} else {
                    <div className="mb-6 h-4" />
                  }

                  <ul className="space-y-4">
                    <PricingFeature icon={Check} label={plan.maxTutors ? `${plan.maxTutors} Tutors` : 'Unlimited Tutors'} active />
                    <PricingFeature icon={Check} label={plan.maxInternalStudents ? `${plan.maxInternalStudents} Students` : 'Unlimited Students'} active />
                    <PricingFeature icon={Check} label={plan.maxActiveExams ? `${plan.maxActiveExams} Active Exams` : 'Unlimited Exams'} active />
                    <PricingFeature icon={Check} label="Advanced Analytics" active={plan.allowAdvancedAnalytics} />
                    <PricingFeature icon={Check} label="Custom Branding" active={plan.allowCustomBranding} />
                    <PricingFeature icon={Check} label={`${plan.aiQueriesPerMonth} AI Queries/mo`} active />
                  </ul>
                </div>

                <div className="p-8">
                  <Button
                    onClick={() => {
                      if (user?.role === 'school_admin') {
                        navigate(`/school-admin/checkout?type=upgrade&planType=${plan.planType}&cycle=${billingCycle}`);
                      } else {
                        navigate('/register-school');
                      }
                    }}
                    variant={assets.buttonVariant}
                    className={cn(
                      "w-full h-14 text-sm font-black uppercase tracking-widest rounded-2xl shadow-lg transition-transform active:scale-95",
                      assets.popular ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200" : "border-2 border-gray-100 hover:bg-gray-50"
                    )}
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
      <div className="max-w-5xl mx-auto px-4 mb-32">
        <div className="bg-slate-900 rounded-[40px] p-8 sm:p-12 relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-12 opacity-10 blur-2xl group-hover:scale-125 transition-transform duration-1000">
              <Zap className="h-64 w-64 text-amber-400" />
           </div>
           
           <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 text-center lg:text-left">
                 <div className="inline-flex items-center gap-2 mb-6 px-4 py-1.5 bg-amber-400/10 rounded-full border border-amber-400/20">
                    <Zap className="h-3 w-3 text-amber-400" />
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Marketplace Bundles</span>
                 </div>
                 <h2 className="text-3xl sm:text-4xl font-black text-white mb-6 tracking-tight">Need for more power?</h2>
                 <p className="text-slate-400 font-medium text-lg leading-relaxed max-w-xl">
                    Our Pay-As-You-Go marketplace allows you to purchase extra student capacity, 
                    tutor accounts, or AI credits instantly without committing to a higher tier plan.
                 </p>
                 <div className="mt-10 flex flex-wrap justify-center lg:justify-start gap-3">
                    <FeatureTag icon={Users} label="Extra Tutor Slots" />
                    <FeatureTag icon={GraduationCap} label="Student Capacity" />
                    <FeatureTag icon={Brain} label="AI Query Bundles" />
                 </div>
              </div>
              
              <div className="bg-white p-8 rounded-[32px] text-center w-full lg:w-72 shadow-2xl">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Starting From</p>
                 <p className="text-5xl font-black text-indigo-600 mb-2">{currency === 'NGN' ? '₦2,500' : '$5'}</p>
                 <p className="text-xs text-gray-400 font-bold mb-8">Per Credit Bundle</p>
                 <Button 
                   onClick={() => navigate('/login')} 
                   className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black py-7 rounded-2xl shadow-xl shadow-slate-200"
                 >
                    Explore Now
                 </Button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function PricingFeature({ icon: Icon, label, active }: { icon: any; label: string; active?: boolean }) {
  return (
    <li className={cn("flex items-center gap-3 transition-opacity", !active && "opacity-30")}>
      <div className={cn("p-1 rounded-full", active ? "bg-emerald-100/50" : "bg-gray-100")}>
        <Icon className={cn("h-3.5 w-3.5", active ? "text-emerald-500" : "text-gray-300")} />
      </div>
      <span className={cn("text-xs font-bold", active ? "text-gray-600" : "text-gray-400")}>
        {label}
      </span>
    </li>
  );
}

function FeatureTag({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 text-[10px] font-black text-slate-300 uppercase tracking-tight hover:bg-white/10 transition-colors">
      <Icon className="h-3 w-3 text-indigo-400" />
      {label}
    </div>
  );
}
