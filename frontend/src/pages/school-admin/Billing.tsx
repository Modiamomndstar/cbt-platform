import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { billingAPI } from '@/services/api';
import { toast } from 'sonner';
import {
  CreditCard, Zap, Users, GraduationCap, BookOpen, Brain,
  TrendingUp, CheckCircle2, XCircle, Clock, Coins, ArrowUpRight,
  Tag, RefreshCw, Wallet
} from 'lucide-react';

interface PlanStatus {
  plan: {
    planType: string; displayName: string; status: string;
    maxTutors: number | null; maxInternalStudents: number | null;
    maxActiveExams: number | null; aiQueriesPerMonth: number;
    allowStudentPortal: boolean; allowExternalStudents: boolean;
    allowBulkImport: boolean; allowEmailNotifications: boolean;
    allowAdvancedAnalytics: boolean; allowCustomBranding: boolean;
    allowResultPdf: boolean;
  };
  subscription: { status: string; trialEnd: string | null; billingCycle: string; overrideExpires: string | null };
  limits: {
    tutorsUsed: number; tutorsMax: number | null;
    studentsUsed: number; studentsMax: number | null;
    examsUsed: number; examsMax: number | null;
    aiUsed: number; aiMax: number;
  };
  paygBalance: number;
}

const PLAN_COLORS: Record<string, string> = {
  freemium: 'bg-gray-100 text-gray-700',
  basic: 'bg-blue-100 text-blue-700',
  advanced: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  trialing: { label: '14-Day Trial', class: 'bg-amber-100 text-amber-700' },
  active: { label: 'Active', class: 'bg-green-100 text-green-700' },
  gifted: { label: 'Gifted', class: 'bg-purple-100 text-purple-700' },
  suspended: { label: 'Suspended', class: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', class: 'bg-gray-100 text-gray-500' },
  cancelled: { label: 'Cancelled', class: 'bg-red-100 text-red-500' },
};

function UsageBar({ label, used, max, icon: Icon }: { label: string; used: number; max: number | null; icon: any }) {
  const pct = max ? Math.min(100, (used / max) * 100) : 0;
  const isAtLimit = max !== null && used >= max;
  const isWarning = max !== null && pct >= 80;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Icon className="h-4 w-4 text-gray-400" />
          {label}
        </div>
        <span className={`text-sm font-semibold ${isAtLimit ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-600'}`}>
          {used} / {max === null ? '∞' : max}
        </span>
      </div>
      {max !== null && (
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${isAtLimit ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-indigo-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function FeaturePill({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${enabled ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-400 line-through'}`}>
      {enabled ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
      {label}
    </div>
  );
}

export default function BillingPage() {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [couponResult, setCouponResult] = useState<any>(null);

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await billingAPI.getStatus();
      if (res.data.success) setStatus(res.data.data);
    } catch {
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateCoupon = async () => {
    if (!couponCode.trim() || !status) return;
    setValidatingCoupon(true);
    setCouponResult(null);
    try {
      const res = await billingAPI.validateCoupon(couponCode.trim(), status.plan.planType);
      if (res.data.success) {
        setCouponResult({ success: true, data: res.data.data });
        toast.success(`Coupon valid! ${res.data.data.name}`);
      }
    } catch (err: any) {
      setCouponResult({ success: false, message: err.response?.data?.message || 'Invalid coupon' });
      toast.error(err.response?.data?.message || 'Invalid coupon code');
    } finally {
      setValidatingCoupon(false);
    }
  };

  const getDaysLeft = (dateStr: string | null): number | null => {
    if (!dateStr) return null;
    return Math.max(0, Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!status) return null;

  const { plan, subscription, limits, paygBalance } = status;
  const trialDaysLeft = getDaysLeft(subscription.trialEnd);
  const statusBadge = STATUS_BADGES[subscription.status] ?? { label: subscription.status, class: 'bg-gray-100 text-gray-600' };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Plan</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your subscription and usage</p>
        </div>
        <button onClick={loadStatus} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Trial Warning Banner */}
      {subscription.status === 'trialing' && trialDaysLeft !== null && trialDaysLeft <= 4 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              Trial ends in {trialDaysLeft} day{trialDaysLeft === 1 ? '' : 's'}!
            </p>
            <p className="text-xs text-red-500 mt-0.5">
              After your trial, your account will revert to the Free plan. Upgrade now to keep all features.
            </p>
          </div>
          <button
            onClick={() => window.open('mailto:support@mycbtplatform.duckdns.org', '_blank')}
            className="ml-auto bg-red-600 text-white text-xs font-semibold px-4 py-2 rounded-lg hover:bg-red-700 transition-colors whitespace-nowrap"
          >
            Upgrade Now
          </button>
        </div>
      )}

      {subscription.status === 'trialing' && trialDaysLeft !== null && trialDaysLeft > 4 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-700">
            <span className="font-semibold">Free trial active</span> — {trialDaysLeft} days remaining.
            After your trial, you'll be on the free plan unless you upgrade.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan Card */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-indigo-500" />
                  Current Plan
                </CardTitle>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${PLAN_COLORS[plan.planType] ?? 'bg-gray-100 text-gray-600'}`}>
                    {plan.displayName}
                  </span>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${statusBadge.class}`}>
                    {statusBadge.label}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Usage Meters */}
              <div className="space-y-4 p-4 bg-gray-50 rounded-xl">
                <UsageBar label="Tutors" used={limits.tutorsUsed} max={limits.tutorsMax} icon={Users} />
                <UsageBar label="Students" used={limits.studentsUsed} max={limits.studentsMax} icon={GraduationCap} />
                <UsageBar label="Exams" used={limits.examsUsed} max={limits.examsMax} icon={BookOpen} />
                {limits.aiMax > 0 && (
                  <UsageBar label="AI Queries (this month)" used={limits.aiUsed} max={limits.aiMax} icon={Brain} />
                )}
              </div>

              {/* Feature Summary */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Features</p>
                <div className="flex flex-wrap gap-2">
                  <FeaturePill label="Student Portal" enabled={plan.allowStudentPortal} />
                  <FeaturePill label="External Students" enabled={plan.allowExternalStudents} />
                  <FeaturePill label="Bulk Import" enabled={plan.allowBulkImport} />
                  <FeaturePill label="Email Notifications" enabled={plan.allowEmailNotifications} />
                  <FeaturePill label="Advanced Analytics" enabled={plan.allowAdvancedAnalytics} />
                  <FeaturePill label="Custom Branding" enabled={plan.allowCustomBranding} />
                  <FeaturePill label="Result PDF" enabled={plan.allowResultPdf} />
                  {limits.aiMax > 0 && <FeaturePill label={`AI: ${limits.aiMax} queries/mo`} enabled={true} />}
                </div>
              </div>

              {/* Upgrade CTA */}
              {(plan.planType === 'freemium' || plan.planType === 'basic') && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">
                        {plan.planType === 'freemium' ? 'Upgrade to Basic Premium' : 'Upgrade to Advanced'}
                      </p>
                      <p className="text-indigo-200 text-xs mt-0.5">
                        {plan.planType === 'freemium'
                          ? '₦8,000/mo · 10 tutors · 300 students · Full portal'
                          : '₦24,000/mo · 50 tutors · 2,000 students · AI + Analytics'}
                      </p>
                    </div>
                    <button
                      onClick={() => toast.info('Payment integration coming soon. Contact support to upgrade.')}
                      className="bg-white text-indigo-700 text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-50 transition-colors flex items-center gap-1 whitespace-nowrap"
                    >
                      Upgrade <ArrowUpRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* PAYG Wallet Card */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-500" />
                PAYG Credits
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-gray-900">{paygBalance}</div>
                <div className="text-sm text-gray-500 mt-1">credits available</div>
                <div className="text-xs text-gray-400 mt-0.5">≈ ₦{(paygBalance * 50).toLocaleString()}</div>
              </div>
              <button
                onClick={() => toast.info('PAYG top-up via Paystack coming soon!')}
                className="w-full bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
              >
                <Coins className="h-4 w-4" />
                Top Up Credits
              </button>
              <div className="mt-3 text-center">
                <p className="text-xs text-gray-400">Min. 50 credits (₦2,500)</p>
              </div>
            </CardContent>
          </Card>

          {/* Coupon Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Tag className="h-4 w-4 text-blue-500" />
                Coupon Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter code..."
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                  className="text-sm font-mono"
                  onKeyDown={(e) => e.key === 'Enter' && handleValidateCoupon()}
                />
                <Button
                  size="sm"
                  onClick={handleValidateCoupon}
                  disabled={validatingCoupon || !couponCode.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  {validatingCoupon ? <RefreshCw className="h-3 w-3 animate-spin" /> : 'Apply'}
                </Button>
              </div>
              {couponResult && (
                <div className={`text-xs p-2.5 rounded-lg ${couponResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {couponResult.success ? (
                    <div>
                      <p className="font-semibold">✓ {couponResult.data.name}</p>
                      <p className="mt-0.5">{couponResult.data.description}</p>
                    </div>
                  ) : (
                    <p>✗ {couponResult.message}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Pricing Reference */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-purple-500" />
                Plan Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: 'Free', price: '₦0', color: 'text-gray-600', active: plan.planType === 'freemium' },
                { name: 'Basic', price: '₦8,000/mo', color: 'text-blue-600', active: plan.planType === 'basic' },
                { name: 'Advanced', price: '₦24,000/mo', color: 'text-purple-600', active: plan.planType === 'advanced' },
                { name: 'Enterprise', price: 'Custom', color: 'text-amber-600', active: plan.planType === 'enterprise' },
              ].map((p) => (
                <div
                  key={p.name}
                  className={`flex justify-between items-center py-2 px-3 rounded-lg text-sm ${p.active ? 'bg-indigo-50 font-semibold' : 'hover:bg-gray-50'}`}
                >
                  <span className={p.active ? 'text-indigo-700' : 'text-gray-700'}>{p.name}</span>
                  <span className={p.active ? 'text-indigo-700' : p.color}>{p.price}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
