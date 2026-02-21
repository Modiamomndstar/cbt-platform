import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { superAdminAPI } from '@/services/api';
import { toast } from 'sonner';
import {
  DollarSign, Zap, Gift, ShieldOff, PauseCircle, Coins, Tag,
  ChevronDown, ChevronUp, RefreshCw, Save, Plus, ToggleLeft, ToggleRight,
  Clock, Pencil, Check, X
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
interface Plan {
  plan_type: string; display_name: string; price_monthly_ngn: number;
  price_monthly_usd: number; max_tutors: number | null;
  max_internal_students: number | null; max_active_exams: number | null;
  ai_queries_per_month: number;
  allow_student_portal: boolean; allow_external_students: boolean;
  allow_bulk_import: boolean; allow_email_notifications: boolean;
  allow_advanced_analytics: boolean; allow_custom_branding: boolean;
  allow_result_pdf: boolean; allow_api_access: boolean; allow_sms_notifications: boolean;
}

interface FeatureFlag {
  feature_key: string; display_name: string; description: string;
  min_plan: string; is_enabled: boolean;
}

interface Coupon {
  id: string; code: string; name: string; description: string;
  discount_type: string; discount_value: number;
  max_uses: number | null; uses_count: number;
  expires_at: string | null; is_active: boolean;
}

const PLAN_ORDER = ['freemium', 'basic', 'advanced', 'enterprise'];
const PLAN_COLORS: Record<string, string> = {
  freemium: 'bg-gray-100 text-gray-700',
  basic: 'bg-blue-100 text-blue-700',
  advanced: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
};

// ─── Plan Pricing Editor ─────────────────────────────────────
function PlanEditor({ plan, onSave }: { plan: Plan; onSave: (updated: Plan) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(plan);

  const handleSave = async () => {
    try {
      await superAdminAPI.updatePlan(draft.plan_type, {
        priceMonthlyNgn: draft.price_monthly_ngn,
        priceMonthlyUsd: draft.price_monthly_usd,
        maxTutors: draft.max_tutors,
        maxInternalStudents: draft.max_internal_students,
        maxActiveExams: draft.max_active_exams,
        aiQueriesPerMonth: draft.ai_queries_per_month,
        allowStudentPortal: draft.allow_student_portal,
        allowExternalStudents: draft.allow_external_students,
        allowBulkImport: draft.allow_bulk_import,
        allowEmailNotifications: draft.allow_email_notifications,
        allowAdvancedAnalytics: draft.allow_advanced_analytics,
        allowCustomBranding: draft.allow_custom_branding,
        allowResultPdf: draft.allow_result_pdf,
        allowApiAccess: draft.allow_api_access,
        allowSmsNotifications: draft.allow_sms_notifications,
      });
      onSave(draft);
      setEditing(false);
      toast.success(`${draft.display_name} plan updated`);
    } catch {
      toast.error('Failed to update plan');
    }
  };

  const boolField = (label: string, key: keyof Plan) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <button
        disabled={!editing}
        onClick={() => setDraft(p => ({ ...p, [key]: !p[key] }))}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
          draft[key] ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
        } ${!editing ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        {draft[key] ? <><Check className="h-3 w-3" />Yes</> : <><X className="h-3 w-3" />No</>}
      </button>
    </div>
  );

  const numField = (label: string, key: keyof Plan, placeholder?: string) => (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type="number"
        disabled={!editing}
        value={(draft[key] as number) ?? ''}
        placeholder={placeholder ?? ''}
        onChange={(e) => setDraft(p => ({ ...p, [key]: parseInt(e.target.value) || 0 }))}
        className="w-24 text-right border border-gray-200 rounded-lg px-2 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-500 focus:ring-2 focus:ring-indigo-300 outline-none"
      />
    </div>
  );

  return (
    <Card className="border border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${PLAN_COLORS[plan.plan_type] ?? 'bg-gray-100'}`}>
              {plan.display_name}
            </span>
          </div>
          <div className="flex gap-2">
            {editing ? (
              <>
                <Button size="sm" variant="outline" onClick={() => { setDraft(plan); setEditing(false); }}>Cancel</Button>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSave}>
                  <Save className="h-3.5 w-3.5 mr-1" /> Save
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        <div className="grid grid-cols-2 gap-3 pb-3 border-b border-gray-100">
          <div>
            <label className="text-xs text-gray-500 block mb-1">Price (₦/mo)</label>
            <input
              type="number"
              disabled={!editing}
              value={draft.price_monthly_ngn}
              onChange={(e) => setDraft(p => ({ ...p, price_monthly_ngn: parseFloat(e.target.value) || 0 }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 focus:ring-2 focus:ring-indigo-300 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Price ($/mo)</label>
            <input
              type="number"
              disabled={!editing}
              value={draft.price_monthly_usd}
              onChange={(e) => setDraft(p => ({ ...p, price_monthly_usd: parseFloat(e.target.value) || 0 }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 focus:ring-2 focus:ring-indigo-300 outline-none"
            />
          </div>
        </div>
        <div className="space-y-0.5 pb-3 border-b border-gray-100">
          {numField('Max tutors', 'max_tutors')}
          {numField('Max students', 'max_internal_students')}
          {numField('Max active exams', 'max_active_exams')}
          {numField('AI queries/month', 'ai_queries_per_month')}
        </div>
        <div className="space-y-0.5">
          {boolField('Student portal', 'allow_student_portal')}
          {boolField('External students', 'allow_external_students')}
          {boolField('Bulk import', 'allow_bulk_import')}
          {boolField('Email notifications', 'allow_email_notifications')}
          {boolField('SMS notifications', 'allow_sms_notifications')}
          {boolField('Advanced analytics', 'allow_advanced_analytics')}
          {boolField('Custom branding', 'allow_custom_branding')}
          {boolField('Result PDF', 'allow_result_pdf')}
          {boolField('API access', 'allow_api_access')}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Feature Flags Panel ─────────────────────────────────────
function FeatureFlagsPanel({ flags, onUpdate }: { flags: FeatureFlag[]; onUpdate: () => void }) {
  const toggle = async (f: FeatureFlag) => {
    try {
      await superAdminAPI.updateFeatureFlag(f.feature_key, { isEnabled: !f.is_enabled });
      toast.success(`Feature "${f.display_name}" ${!f.is_enabled ? 'enabled' : 'disabled'}`);
      onUpdate();
    } catch {
      toast.error('Failed to update feature flag');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-yellow-500" />
          Feature Flags
        </CardTitle>
        <p className="text-xs text-gray-500">Toggle features globally or restrict them to specific plan tiers.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {flags.map((f) => (
            <div key={f.feature_key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-gray-800">{f.display_name}</p>
                <p className="text-xs text-gray-500">{f.description}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${PLAN_COLORS[f.min_plan] ?? 'bg-gray-100 text-gray-500'}`}>
                  {f.min_plan === 'freemium' ? 'All plans' : `${f.min_plan}+`}
                </span>
              </div>
              <button
                onClick={() => toggle(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  f.is_enabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {f.is_enabled ? <><ToggleRight className="h-4 w-4" />ON</> : <><ToggleLeft className="h-4 w-4" />OFF</>}
              </button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Coupon Manager ───────────────────────────────────────────
function CouponManager({ coupons, onRefresh }: { coupons: Coupon[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    code: '', name: '', description: '', discountType: 'percent',
    discountValue: '', maxUses: '', expiresAt: '',
  });
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!form.code || !form.name || !form.discountValue) {
      toast.error('Code, name, and discount value are required');
      return;
    }
    setSaving(true);
    try {
      await superAdminAPI.createCoupon({
        code: form.code.toUpperCase(),
        name: form.name,
        description: form.description,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        expiresAt: form.expiresAt || null,
      });
      toast.success(`Coupon ${form.code.toUpperCase()} created`);
      setForm({ code: '', name: '', description: '', discountType: 'percent', discountValue: '', maxUses: '', expiresAt: '' });
      setShowForm(false);
      onRefresh();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create coupon');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: string, code: string) => {
    try {
      await superAdminAPI.updateCoupon(id, { isActive: false });
      toast.success(`Coupon ${code} deactivated`);
      onRefresh();
    } catch {
      toast.error('Failed to deactivate coupon');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Tag className="h-4 w-4 text-blue-500" />
            Coupon Codes
          </CardTitle>
          <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
            <Plus className="h-3.5 w-3.5 mr-1" /> New Coupon
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create Form */}
        {showForm && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-gray-700">Create New Coupon</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Code *</label>
                <Input
                  placeholder="LAUNCH20"
                  value={form.code}
                  onChange={(e) => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Name *</label>
                <Input placeholder="Launch Offer 20% Off" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Discount Type</label>
                <select
                  value={form.discountType}
                  onChange={(e) => setForm(p => ({ ...p, discountType: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed_ngn">Fixed (₦)</option>
                  <option value="free_months">Free Months</option>
                  <option value="bonus_credits">Bonus Credits</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Value * {form.discountType === 'percent' ? '(%)' : form.discountType === 'fixed_ngn' ? '(₦)' : ''}
                </label>
                <Input type="number" placeholder="20" value={form.discountValue} onChange={(e) => setForm(p => ({ ...p, discountValue: e.target.value }))} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Max Uses (blank = unlimited)</label>
                <Input type="number" placeholder="100" value={form.maxUses} onChange={(e) => setForm(p => ({ ...p, maxUses: e.target.value }))} className="text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Expires At (optional)</label>
                <Input type="date" value={form.expiresAt} onChange={(e) => setForm(p => ({ ...p, expiresAt: e.target.value }))} className="text-sm" />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Description</label>
              <Input placeholder="New school launch promotion" value={form.description} onChange={(e) => setForm(p => ({ ...p, description: e.target.value }))} className="text-sm" />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleCreate} disabled={saving}>
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </div>
        )}

        {/* Coupon List */}
        <div className="space-y-2">
          {coupons.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No coupons yet.</p>}
          {coupons.map((c) => (
            <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border ${c.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{c.code}</code>
                  <span className="text-sm text-gray-700">{c.name}</span>
                  {!c.is_active && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.discount_type === 'percent' ? `${c.discount_value}% off` :
                   c.discount_type === 'fixed_ngn' ? `₦${c.discount_value} off` :
                   c.discount_type === 'free_months' ? `${c.discount_value} free month(s)` :
                   `${c.discount_value} bonus credits`}
                  {' · '}{c.uses_count}/{c.max_uses ?? '∞'} used
                  {c.expires_at && ` · Expires ${new Date(c.expires_at).toLocaleDateString()}`}
                </p>
              </div>
              {c.is_active && (
                <button
                  onClick={() => deactivate(c.id, c.code)}
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                >
                  Deactivate
                </button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function MonetizationPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'features' | 'coupons'>('plans');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [plansRes, flagsRes, couponsRes] = await Promise.all([
        superAdminAPI.getPlans(),
        superAdminAPI.getFeatureFlags(),
        superAdminAPI.getCoupons(),
      ]);
      if (plansRes.data.success) {
        setPlans(PLAN_ORDER.map(pt => plansRes.data.data.find((p: Plan) => p.plan_type === pt)).filter(Boolean));
      }
      if (flagsRes.data.success) setFlags(flagsRes.data.data);
      if (couponsRes.data.success) setCoupons(couponsRes.data.data);
    } catch {
      toast.error('Failed to load monetization data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  const TABS = [
    { key: 'plans', label: 'Plan Pricing', icon: DollarSign },
    { key: 'features', label: 'Feature Flags', icon: Zap },
    { key: 'coupons', label: 'Coupons', icon: Tag },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monetization</h1>
          <p className="text-sm text-gray-500 mt-1">Manage plans, features, and discount codes</p>
        </div>
        <button onClick={loadAll} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === key ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <PlanEditor key={plan.plan_type} plan={plan} onSave={(updated) => {
              setPlans(ps => ps.map(p => p.plan_type === updated.plan_type ? updated : p));
            }} />
          ))}
        </div>
      )}

      {activeTab === 'features' && (
        <FeatureFlagsPanel flags={flags} onUpdate={loadAll} />
      )}

      {activeTab === 'coupons' && (
        <CouponManager coupons={coupons} onRefresh={loadAll} />
      )}
    </div>
  );
}
