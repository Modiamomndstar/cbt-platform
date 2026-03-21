import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { billingAPI } from '@/services/api';
import { toast } from 'sonner';
import {
  Users, GraduationCap, BookOpen,
  TrendingUp, CheckCircle2, XCircle, ArrowUpRight,
  RefreshCw, Wallet, ShoppingCart, Info, AlertTriangle,
  History, Zap, ShoppingBag, AlertCircle, ShieldCheck, Sparkles
} from 'lucide-react';

interface PlanStatus {
  plan: {
    planType: string;
    displayName: string;
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
    allowResultExport: boolean;
    allowApiAccess: boolean;
    allowSmsNotifications: boolean;
  };
  subscription: {
    status: string;
    trialEnd: string | null;
    billingCycle: string;
    overrideExpires: string | null;
    isPaid: boolean;
    isFreemium: boolean;
  };
  limits: {
    tutorsUsed: number;
    tutorsMax: number | null;
    studentsUsed: number;
    studentsMax: number | null;
    examsUsed: number;
    examsMax: number | null;
    aiUsed: number;
    aiMax: number;
    purchasedTutors: number;
    purchasedStudents: number;
    purchasedAiQueries: number;
  };
  paygBalance: number;
  referralRewardCredits: number;
  features: Record<string, boolean>;
  referralCode?: string;
}

interface MarketplaceItem {
  featureKey: string;
  displayName: string;
  creditCost: number;
  batchSize: number;
  itemType: 'capacity' | 'consumption';
}

interface PaygHistory {
  id: string;
  type: string;
  credits: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

const PLAN_COLORS: Record<string, string> = {
  freemium: 'bg-gray-100 text-gray-700',
  basic: 'bg-blue-100 text-blue-700',
  advanced: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

const STATUS_BADGES: Record<string, { label: string; class: string }> = {
  trialing: { label: 'Trial', class: 'bg-amber-100 text-amber-700' },
  active: { label: 'Active', class: 'bg-green-100 text-green-700' },
  gifted: { label: 'Gifted', class: 'bg-purple-100 text-purple-700' },
  suspended: { label: 'Suspended', class: 'bg-red-100 text-red-700' },
  expired: { label: 'Expired', class: 'bg-gray-100 text-gray-500' },
  past_due: { label: 'Past Due', class: 'bg-red-100 text-red-700' },
};

function UsageBar({ label, used, max, icon: Icon, purchased = 0, isFrozen = false }: { label: string; used: number; max: number | null; icon: any; purchased?: number; isFrozen?: boolean }) {
  const effectiveMax = max;
  const pct = effectiveMax ? Math.min(100, (used / effectiveMax) * 100) : 0;
  const isAtLimit = effectiveMax !== null && used >= effectiveMax;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <Icon className="h-4 w-4 text-gray-400" />
          {label}
          {purchased > 0 && !isFrozen && (
            <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded border border-indigo-100">
              +{purchased} Slots
            </span>
          )}
          {isFrozen && purchased > 0 && (
             <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-0.5">
               <AlertTriangle className="h-2 w-2" /> Frozen Capacity
             </span>
          )}
        </div>
        <span className={`text-sm font-bold ${isAtLimit ? 'text-red-600' : 'text-gray-700'}`}>
          {used} / {effectiveMax === null ? '∞' : effectiveMax}
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full transition-all duration-500 ${isAtLimit ? 'bg-red-500' : 'bg-gradient-to-r from-indigo-600 to-purple-600'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>([]);
  const [history, setHistory] = useState<PaygHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [yearlyDiscount, setYearlyDiscount] = useState<{ percentage: number; isActive: boolean }>({ percentage: 0, isActive: false });
  const navigate = useNavigate();

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, marketplaceRes, historyRes, plansRes] = await Promise.all([
        billingAPI.getStatus(),
        billingAPI.getMarketplace(),
        billingAPI.getPaygHistory(),
        billingAPI.getPlans()
      ]);

      if (statusRes.data.success) setStatus(statusRes.data.data);
      if (marketplaceRes.data.success) setMarketplace(marketplaceRes.data.data);
      if (historyRes.data.success) setHistory(historyRes.data.data);
      if (plansRes.data.success) {
         setAvailablePlans(plansRes.data.data.plans);
         if (plansRes.data.data.yearlyDiscount) setYearlyDiscount(plansRes.data.data.yearlyDiscount);
      }
    } catch {
      toast.error('Failed to load billing information');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (item: MarketplaceItem) => {
    if (!status) return;
    if (status.paygBalance < item.creditCost) {
      toast.error('Insufficient PAYG credits. Please top up your wallet.');
      return;
    }

    setPurchasing(item.featureKey);
    try {
      const res = await billingAPI.purchaseMarketplaceItem({ featureKey: item.featureKey });
      if (res.data.success) {
        toast.success(`Successfully purchased ${item.displayName}!`);
        await loadData();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Purchase failed');
    } finally {
      setPurchasing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        <p className="text-gray-500 text-sm animate-pulse font-medium">Loading your portal billing...</p>
      </div>
    );
  }

  if (!status) return null;

  const { plan, subscription, limits, paygBalance } = status;
  const isFrozen = subscription.isFreemium && !subscription.isPaid;
  const totalFrozenSlots = limits.purchasedTutors + limits.purchasedStudents + limits.purchasedAiQueries;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Billing & Marketplace</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage your recurring plan, capacity, and extra features</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={loadData} className="gap-2 bg-white">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-700 hover:to-purple-800 text-white border-0 gap-2 shadow-sm"
            onClick={() => setActiveTab('marketplace')}
          >
            <ShoppingBag className="h-4 w-4" /> View Marketplace
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="space-y-4">
        {isFrozen && totalFrozenSlots > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4">
            <div className="bg-red-100 p-2 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-900">Purchase Capacity is Frozen</p>
              <p className="text-sm text-red-700 mt-1 leading-relaxed">
                You have <strong>{limits.purchasedTutors}</strong> extra tutor slots and <strong>{limits.purchasedStudents}</strong> student capacity currently locked.
                Purchased marketplace capacity is only available while you have an active <strong>Basic Premium</strong> or <strong>Advanced</strong> subscription.
              </p>
              <div className="mt-4 flex gap-3">
                <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white border-0" onClick={() => setShowUpgradeModal(true)}>Upgrade to Reactivate</Button>
                <Button size="sm" variant="outline" className="bg-white border-red-200 text-red-700 hover:bg-red-50">Learn More</Button>
              </div>
            </div>
          </div>
        )}

        {!subscription.isPaid && subscription.status === 'expired' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-amber-800">
              <span className="font-bold">Subscription Expired.</span> You are currently on the Freemium plan with limited default capacity.
            </p>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-100/80 p-1 mb-6">
          <TabsTrigger value="overview" className="gap-2 py-2">
            <TrendingUp className="h-4 w-4" /> Overview & Usage
          </TabsTrigger>
          <TabsTrigger value="marketplace" className="gap-2 py-2">
            <ShoppingCart className="h-4 w-4" /> Marketplace
          </TabsTrigger>
          <TabsTrigger value="credits" className="gap-2 py-2">
            <History className="h-4 w-4" /> PAYG Ledgers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Usage Card */}
            <Card className="lg:col-span-2 border-0 shadow-sm overflow-hidden bg-white">
              <CardHeader className="border-b bg-gray-50/50 py-4 px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Standard Capacity</CardTitle>
                    <CardDescription>Your recurring plan limits</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${PLAN_COLORS[plan.planType]}`}>
                      {plan.displayName}
                    </span>
                    {plan.planType !== 'enterprise' && (
                      <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold tracking-tight shadow-sm h-8"
                        onClick={() => setShowUpgradeModal(true)}
                      >
                        <Zap className="h-3.5 w-3.5 mr-1.5" />
                        Upgrade Plan
                      </Button>
                    )}
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGES[subscription.status]?.class || 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_BADGES[subscription.status]?.label || subscription.status}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="p-6 space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <UsageBar
                        label="Tutors"
                        used={limits.tutorsUsed}
                        max={limits.tutorsMax}
                        icon={Users}
                        purchased={limits.purchasedTutors}
                        isFrozen={isFrozen}
                     />
                     <UsageBar
                        label="Students"
                        used={limits.studentsUsed}
                        max={limits.studentsMax}
                        icon={GraduationCap}
                        purchased={limits.purchasedStudents}
                        isFrozen={isFrozen}
                     />
                     <UsageBar
                        label="Active Exams"
                        used={limits.examsUsed}
                        max={limits.examsMax}
                        icon={BookOpen}
                     />
                     <UsageBar
                        label="AI Query Credit"
                        used={limits.aiUsed}
                        max={limits.aiMax}
                        icon={Zap}
                        purchased={limits.purchasedAiQueries}
                     />
                   </div>

                   <div className="pt-6 border-t mt-6">
                     <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Plan Features</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <FeatureItem label="Student Portal" active={status.features?.studentPortal} />
                        <FeatureItem label="External Students" active={status.features?.externalStudents} />
                        <FeatureItem label="Bulk Upload" active={status.features?.bulkImport} />
                        <FeatureItem label="Email Alerts" active={status.features?.emailNotifications} />
                        <FeatureItem label="SMS Alerts" active={status.features?.smsNotifications} />
                        <FeatureItem label="Analytics" active={status.features?.advancedAnalytics} />
                        <FeatureItem label="Branding" active={status.features?.customBranding} />
                        <FeatureItem label="Result PDF" active={status.features?.resultPdf} />
                        <FeatureItem label="Result Export" active={status.features?.resultExport} />
                        <FeatureItem label="API Access" active={status.features?.apiAccess} />
                        <FeatureItem label="LMS Module" active={status.features?.lmsAccess} />
                     </div>
                   </div>
                </div>
              </CardContent>
            </Card>

            {/* Wallet & Quick Info */}
            <div className="space-y-6">
              <Card className="border-0 shadow-sm bg-gradient-to-br from-indigo-600 to-purple-700 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                   <Wallet className="h-24 w-24" />
                </div>
                <CardHeader className="pb-2 relative z-10">
                   <CardTitle className="text-indigo-100 text-xs font-bold uppercase tracking-widest">PAYG Balance</CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                   <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-black">{paygBalance}</span>
                      <span className="text-indigo-100 text-sm font-medium">credits</span>
                   </div>
                   <p className="text-indigo-100 text-[10px] mt-1 italic opacity-80">Universal platform credits for micro-features</p>

                   <div className="mt-6 space-y-2">
                     <Button className="w-full bg-white text-indigo-700 hover:bg-indigo-50 border-0 font-bold shadow-md" onClick={() => navigate('/school-admin/checkout?type=credits&amount=100')}>
                       <ArrowUpRight className="h-4 w-4 mr-2" /> Fund Wallet
                     </Button>
                     <p className="text-[10px] text-center text-indigo-100 opacity-70 flex items-center justify-center gap-1">
                       <ShieldCheck className="h-3 w-3" /> Secure Global Payment Methods
                     </p>
                   </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white">
                <CardHeader className="pb-2">
                   <CardTitle className="text-sm font-bold flex items-center gap-2">
                     <Info className="h-4 w-4 text-blue-500" /> Platform Licensing
                   </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-700">Basic Premium</span>
                      <span className="text-xs font-black text-indigo-600 italic">Global Pricing</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">Essential CBT portal & result management for scaling institutions.</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-gray-700">Advanced</span>
                      <span className="text-xs font-black text-purple-600 italic">Enterprise Scale</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-tight">Full AI automation, depth analytics and unrestricted capacity.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="marketplace" className="mt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {marketplace.map((item) => (
              <Card key={item.featureKey} className="border-0 shadow-sm overflow-hidden flex flex-col hover:translate-y-[-2px] transition-all">
                <div className={`h-1.5 ${item.itemType === 'capacity' ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className={`p-2 rounded-lg ${item.itemType === 'capacity' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {item.itemType === 'capacity' ? <Users className="h-5 w-5" /> : <Zap className="h-5 w-5" />}
                    </div>
                    <div className="text-right">
                       <span className="text-lg font-black text-gray-900">{item.creditCost}</span>
                       <span className="text-[10px] text-gray-500 block uppercase font-bold tracking-tighter">Credits</span>
                    </div>
                  </div>
                  <CardTitle className="text-base mt-3 leading-tight font-bold">{item.displayName}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-xs text-gray-500 leading-relaxed min-h-[40px]">
                    {item.itemType === 'capacity'
                      ? `Add permanent capacity to your portal. Active with paid subscription.`
                      : `Consumable item. Use immediately for ${item.batchSize} actions.`}
                  </p>

                  <div className="mt-4 pt-4 border-t flex flex-col gap-3">
                     <div className="flex justify-between items-center text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
                        <span>Benefit:</span>
                        <span>+{item.batchSize} Slots</span>
                     </div>
                     <Button
                       disabled={purchasing === item.featureKey}
                       onClick={() => handlePurchase(item)}
                       className={`w-full font-bold ${item.itemType === 'capacity' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                      >
                       {purchasing === item.featureKey ? 'Processing...' : 'Buy Now'}
                     </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="credits" className="mt-0">
            {/* Referral System */}
            <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-600 to-purple-700 text-white overflow-hidden rounded-[32px] mb-6">
                <CardContent className="p-8 relative">
                    <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Zap className="h-32 w-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
                                <Sparkles className="h-6 w-6 text-yellow-300" />
                            </div>
                            <h3 className="text-xl font-black tracking-tight">Refer & Earn PAYG Credits</h3>
                        </div>
                        <p className="text-indigo-100 font-medium max-w-lg leading-relaxed mb-8">
                            Share your referral code with other schools. When they upgrade to any premium plan, you'll receive <span className="text-white font-bold">{status?.referralRewardCredits || 50} PAYG Credits</span> automatically!
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] uppercase font-black tracking-widest text-indigo-200">Your Referral Code</p>
                                    <p className="text-2xl font-black tracking-tighter mt-1">{status?.referralCode || 'REF-SCHOOL-001'}</p>
                                </div>
                                <Button
                                    variant="secondary"
                                    className="rounded-xl font-bold bg-white text-indigo-600 hover:bg-indigo-50"
                                    onClick={() => {
                                        const code = status?.referralCode || '';
                                        const link = `${window.location.origin}/register?ref=${code}`;
                                        navigator.clipboard.writeText(link);
                                        toast.success("Referral link copied!");
                                    }}
                                >
                                    Copy Link
                                </Button>
                            </div>
                            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center px-8 min-w-[120px]">
                                <p className="text-[10px] uppercase font-black tracking-widest text-indigo-200">Reward</p>
                                <p className="text-2xl font-black tracking-tighter mt-1">{status?.referralRewardCredits || 50} <span className="text-sm">Pts</span></p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-0 shadow-xl overflow-hidden rounded-[32px] bg-white">
            <CardHeader className="border-b bg-gray-50/50">
               <CardTitle className="text-base font-bold">Transaction History</CardTitle>
               <CardDescription>Records of credit purchases and micro-transaction consumptions</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="bg-gray-50/80 text-gray-500">
                        <th className="px-6 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Date</th>
                        <th className="px-6 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Type</th>
                        <th className="px-6 py-3 text-left font-bold uppercase tracking-wider text-[10px]">Description</th>
                        <th className="px-6 py-3 text-right font-bold uppercase tracking-wider text-[10px]">Credits</th>
                        <th className="px-6 py-3 text-right font-bold uppercase tracking-wider text-[10px]">Balance</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {history.length === 0 ? (
                       <tr>
                         <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No transactions recorded yet.</td>
                       </tr>
                     ) : (
                       history.map((tx) => (
                         <tr key={tx.id} className="hover:bg-gray-50/50">
                           <td className="px-6 py-4 whitespace-nowrap text-gray-500 tabular-nums">
                              {new Date(tx.createdAt).toLocaleDateString()}
                           </td>
                           <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                tx.type === 'topup' ? 'bg-green-100 text-green-700' :
                                tx.type === 'deduction' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                              }`}>
                                {tx.type}
                              </span>
                           </td>
                           <td className="px-6 py-4 text-gray-700 max-w-xs truncate font-medium">
                              {tx.description}
                           </td>
                           <td className={`px-6 py-4 text-right tabular-nums font-bold ${tx.type === 'deduction' ? 'text-red-500' : 'text-green-600'}`}>
                              {tx.type === 'deduction' ? '-' : '+'}{Math.abs(tx.credits)}
                           </td>
                           <td className="px-6 py-4 text-right tabular-nums font-bold text-gray-900">
                              {tx.balanceAfter}
                           </td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Plan Selection Modal */}
      <Dialog open={showUpgradeModal} onOpenChange={setShowUpgradeModal}>
        <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-4xl lg:max-w-5xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-gray-900">Choose Your Subscription</DialogTitle>
            <DialogDescription className="text-gray-500">
              Select the plan that best fits your institution's capacity and operational needs.
            </DialogDescription>
          </DialogHeader>

          {yearlyDiscount.isActive && (
            <div className="flex justify-center mt-2 mb-2">
              <div className="bg-gray-100 p-1 rounded-full flex items-center relative">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-all ${billingCycle === 'monthly' ? 'text-gray-900 shadow-sm bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`relative z-10 px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${billingCycle === 'yearly' ? 'text-gray-900 shadow-sm bg-white' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Yearly
                  <span className="bg-emerald-100 text-emerald-700 text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap">Save {yearlyDiscount.percentage}%</span>
                </button>
              </div>
            </div>
          )}

          {(() => {
            const basicPlan = availablePlans.find(p => p.planType === 'basic');
            const advancedPlan = availablePlans.find(p => p.planType === 'advanced');
            const advancedPlusPlan = availablePlans.find(p => p.planType === 'advanced_plus');

            return (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                {/* Basic Plan */}
                <div className="border border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <GraduationCap className="h-24 w-24" />
                  </div>
                  <div className="relative z-10 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-black text-gray-900">{basicPlan?.displayName || 'Basic Premium'}</h3>
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">Most Popular</span>
                    </div>
                    <div className="my-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                      <span className="text-3xl font-black text-gray-900">₦{basicPlan?.priceNgn ? Number(billingCycle === 'yearly' ? basicPlan.priceNgn * 12 * (1 - yearlyDiscount.percentage / 100) : basicPlan.priceNgn).toLocaleString() : '8,000'}</span>
                      {basicPlan?.priceUsd && <span className="text-lg font-bold text-gray-500">(${billingCycle === 'yearly' ? (basicPlan.priceUsd * 12 * (1 - yearlyDiscount.percentage / 100)).toFixed(2) : basicPlan.priceUsd})</span>}
                      <span className="text-sm font-medium text-gray-500 inline-block">/ {billingCycle === 'yearly' ? 'year' : 'mo'}</span>
                    </div>
                    <p className="text-sm text-gray-600 mb-6 font-medium">Core platform tools, exams, and reports tailored for standard institutions.</p>

                    <ul className="space-y-3 mb-6 flex-1">
                      <li className="flex items-start text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                        <span className="font-medium">{basicPlan?.maxInternalStudents ? `Up to ${basicPlan.maxInternalStudents} Students` : 'Unlimited Students'} <span className="text-gray-400 font-normal">/ {basicPlan?.maxTutors ? `${basicPlan.maxTutors} Tutors` : 'Unlimited Tutors'}</span></span>
                      </li>
                      <li className="flex items-start text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                        <span className="font-medium">{basicPlan?.maxActiveExams ? `${basicPlan.maxActiveExams} Active Exams` : 'Unlimited Active Exams'}</span>
                      </li>
                      <li className="flex items-start text-sm text-gray-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                        <span className="font-medium">Full Student CBT Portal</span>
                      </li>
                      {(basicPlan?.aiQueriesPerMonth ?? 30) > 0 && (
                        <li className="flex items-start text-sm text-gray-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500 mr-2 shrink-0 mt-0.5" />
                          <span className="font-medium">{basicPlan!.aiQueriesPerMonth ?? 30} AI Query Credits <span className="text-gray-400 font-normal">/ month</span></span>
                        </li>
                      )}
                    </ul>
                  </div>
                  <Button 
                    onClick={() => navigate(`/school-admin/checkout?type=upgrade&planType=basic&cycle=${billingCycle}`)} 
                    className="w-full mt-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 relative z-10"
                  >
                    Select Basic Premium
                  </Button>
                </div>

                {/* Advanced Plan */}
                <div className="border border-purple-200 bg-purple-50/30 rounded-xl p-5 hover:border-purple-400 hover:shadow-lg transition-all flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.1] transition-opacity">
                    <Sparkles className="h-24 w-24 text-purple-600" />
                  </div>
                  <div className="relative z-10 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-black text-purple-900">{advancedPlan?.displayName || 'Advanced'}</h3>
                    </div>
                    <div className="my-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                      <span className="text-3xl font-black text-purple-900">₦{advancedPlan?.priceNgn ? Number(billingCycle === 'yearly' ? advancedPlan.priceNgn * 12 * (1 - yearlyDiscount.percentage / 100) : advancedPlan.priceNgn).toLocaleString() : '20,000'}</span>
                      {advancedPlan?.priceUsd && <span className="text-lg font-bold text-purple-600/60">(${billingCycle === 'yearly' ? (advancedPlan.priceUsd * 12 * (1 - yearlyDiscount.percentage / 100)).toFixed(2) : advancedPlan.priceUsd})</span>}
                      <span className="text-sm font-medium text-purple-600/70 inline-block">/ {billingCycle === 'yearly' ? 'year' : 'mo'}</span>
                    </div>
                    <p className="text-sm text-purple-800/80 mb-6 font-medium">Unlimited limits and deep AI automation for massive enterprise scaling.</p>

                    <ul className="space-y-3 mb-6 flex-1">
                      <li className="flex items-start text-sm text-gray-800">
                        <CheckCircle2 className="h-4 w-4 text-purple-600 mr-2 shrink-0 mt-0.5" />
                        <span className="font-bold">{advancedPlan?.maxInternalStudents ? `Up to ${advancedPlan.maxInternalStudents} Students & Tutors` : 'Unlimited Students & Tutors'}</span>
                      </li>
                      {(advancedPlan?.aiQueriesPerMonth ?? 200) > 0 && (
                        <li className="flex items-start text-sm text-gray-800">
                          <CheckCircle2 className="h-4 w-4 text-purple-600 mr-2 shrink-0 mt-0.5" />
                          <span className="font-bold">{advancedPlan!.aiQueriesPerMonth ?? 200} AI Query Credits <span className="font-medium opacity-70">/ month</span></span>
                        </li>
                      )}
                      <li className="flex items-start text-sm text-gray-800">
                        <CheckCircle2 className="h-4 w-4 text-purple-600 mr-2 shrink-0 mt-0.5" />
                        <span className="font-medium">Advanced Matrix Analytics</span>
                      </li>
                      <li className="flex items-start text-sm text-gray-800">
                        <CheckCircle2 className="h-4 w-4 text-purple-600 mr-2 shrink-0 mt-0.5" />
                        <span className="font-medium">Custom Dynamic Branding</span>
                      </li>
                    </ul>
                  </div>
                  <Button 
                    onClick={() => navigate(`/school-admin/checkout?type=upgrade&planType=advanced&cycle=${billingCycle}`)} 
                    className="w-full mt-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold h-11 relative z-10 border-0 shadow-md"
                  >
                    Select Advanced Plan
                  </Button>
                </div>

                {/* Advanced Plus Plan */}
                <div className="border border-indigo-200 bg-indigo-50/30 rounded-xl p-5 hover:border-indigo-400 hover:shadow-lg transition-all flex flex-col relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.04] group-hover:opacity-[0.1] transition-opacity">
                    <Sparkles className="h-24 w-24 text-indigo-600" />
                  </div>
                  <div className="relative z-10 flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-black text-indigo-900">{advancedPlusPlan?.displayName || 'Advanced Plus'}</h3>
                    </div>
                    <div className="my-4 flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
                      <span className="text-3xl font-black text-indigo-900">₦{advancedPlusPlan?.priceNgn ? Number(billingCycle === 'yearly' ? advancedPlusPlan.priceNgn * 12 * (1 - yearlyDiscount.percentage / 100) : advancedPlusPlan.priceNgn).toLocaleString() : '30,000'}</span>
                      {advancedPlusPlan?.priceUsd && <span className="text-lg font-bold text-indigo-600/60">(${billingCycle === 'yearly' ? (advancedPlusPlan.priceUsd * 12 * (1 - yearlyDiscount.percentage / 100)).toFixed(2) : advancedPlusPlan.priceUsd})</span>}
                      <span className="text-sm font-medium text-indigo-600/70 inline-block">/ {billingCycle === 'yearly' ? 'year' : 'mo'}</span>
                    </div>
                    <p className="text-sm text-indigo-800/80 mb-6 font-medium">Unlimited scaling with deep AI intelligence.</p>

                    <ul className="space-y-3 mb-6 flex-1">
                      <li className="flex items-start text-sm text-gray-800">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 mr-2 shrink-0 mt-0.5" />
                        <span className="font-bold">{advancedPlusPlan?.maxInternalStudents ? `Up to ${advancedPlusPlan.maxInternalStudents} Students & Tutors` : 'Unlimited Students & Tutors'}</span>
                      </li>
                      <li className="flex items-start text-sm text-gray-800">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 mr-2 shrink-0 mt-0.5" />
                        <span className="font-bold text-indigo-700">Full LLM Generation Features</span>
                      </li>
                      {(advancedPlusPlan?.aiQueriesPerMonth ?? 500) > 0 && (
                        <li className="flex items-start text-sm text-gray-800">
                          <CheckCircle2 className="h-4 w-4 text-indigo-600 mr-2 shrink-0 mt-0.5" />
                          <span className="font-bold">{advancedPlusPlan!.aiQueriesPerMonth ?? 500} AI Query Credits <span className="font-medium opacity-70">/ month</span></span>
                        </li>
                      )}
                      <li className="flex items-start text-sm text-gray-800">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 mr-2 shrink-0 mt-0.5" />
                        <span className="font-medium">Advanced Matrix Analytics</span>
                      </li>
                      <li className="flex items-start text-sm text-gray-800">
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 mr-2 shrink-0 mt-0.5" />
                        <span className="font-medium">Custom Dynamic Branding</span>
                      </li>
                    </ul>
                  </div>
                  <Button 
                    onClick={() => navigate(`/school-admin/checkout?type=upgrade&planType=advanced_plus&cycle=${billingCycle}`)} 
                    className="w-full mt-auto bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold h-11 relative z-10 border-0 shadow-md"
                  >
                    Select Advanced Plus
                  </Button>
                </div>
              </div>
            );
          })()}
          
          <p className="text-center text-[11px] text-gray-400 mt-2 font-medium">Enterprise licenses require direct administrative approval. Payments processed securely via Paystack.</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeatureItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-[11px] font-bold transition-all ${active ? 'bg-white border-indigo-100 text-indigo-700 shadow-sm' : 'bg-gray-50 border-gray-100 text-gray-300 pointer-events-none'}`}>
      {active ? <CheckCircle2 className="h-3 w-3 text-indigo-500" /> : <XCircle className="h-3 w-3" />}
      {label}
    </div>
  );
}

