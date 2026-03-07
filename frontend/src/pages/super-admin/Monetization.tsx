import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { superAdminAPI } from '@/services/api';
import { toast } from 'sonner';
import {
  DollarSign, Zap, Tag,
  RefreshCw, Save, Plus, ToggleLeft, ToggleRight,
  Pencil, Check, X, ShoppingBag, Settings as SettingsIcon,
  ShieldCheck, History, ExternalLink,
  CheckCircle2, XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ───────────────────────────────────────────────────
interface Plan {
  planType: string; displayName: string; priceUsd: number;
  priceNgn: number; maxTutors: number | null;
  maxInternalStudents: number | null; maxActiveExams: number | null;
  aiQueriesPerMonth: number;
  allowStudentPortal: boolean; allowExternalStudents: boolean;
  allowBulkImport: boolean; allowEmailNotifications: boolean;
  allowAdvancedAnalytics: boolean; allowCustomBranding: boolean;
  allowResultPdf: boolean; allowApiAccess: boolean; allowSmsNotifications: boolean;
}

interface FeatureFlag {
  featureKey: string; featureName: string; description: string;
  minPlan: string; isEnabled: boolean;
}

interface Coupon {
  id: string; code: string; name: string; description: string;
  discountType: string; discountValue: number;
  maxUses: number | null; usesCount: number;
  expiresAt: string | null; isActive: boolean;
  type?: string;
  value?: number;
  redemptionCount?: number;
  validUntil?: string | null;
}

interface MarketplaceItem {
  featureKey: string;
  displayName: string;
  description: string;
  itemType: string;
  creditCost: number;
  isActive: boolean;
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
      await superAdminAPI.updatePlan(draft.planType, {
        priceNgn: draft.priceNgn,
        priceUsd: draft.priceUsd,
        maxTutors: draft.maxTutors,
        maxInternalStudents: draft.maxInternalStudents,
        maxActiveExams: draft.maxActiveExams,
        aiQueriesPerMonth: draft.aiQueriesPerMonth,
        allow_student_portal: draft.allowStudentPortal,
        allow_external_students: draft.allowExternalStudents,
        allow_bulk_import: draft.allowBulkImport,
        allow_email_notifications: draft.allowEmailNotifications,
        allow_advanced_analytics: draft.allowAdvancedAnalytics,
        allow_custom_branding: draft.allowCustomBranding,
        allow_result_pdf: draft.allowResultPdf,
        allow_api_access: draft.allowApiAccess,
        allow_sms_notifications: draft.allowSmsNotifications,
      });
      onSave(draft);
      setEditing(false);
      toast.success(`${draft.displayName} plan updated`);
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
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${PLAN_COLORS[plan.planType] ?? 'bg-gray-100'}`}>
              {plan.displayName}
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
              value={draft.priceNgn}
              onChange={(e) => setDraft(p => ({ ...p, priceNgn: parseFloat(e.target.value) || 0 }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 focus:ring-2 focus:ring-indigo-300 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Price ($/mo)</label>
            <input
              type="number"
              disabled={!editing}
              value={draft.priceUsd}
              onChange={(e) => setDraft(p => ({ ...p, priceUsd: parseFloat(e.target.value) || 0 }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 focus:ring-2 focus:ring-indigo-300 outline-none"
            />
          </div>
        </div>
        <div className="space-y-0.5 pb-3 border-b border-gray-100">
          {numField('Max tutors', 'maxTutors')}
          {numField('Max students', 'maxInternalStudents')}
          {numField('Max active exams', 'maxActiveExams')}
          {numField('AI queries/month', 'aiQueriesPerMonth')}
        </div>
        <div className="space-y-0.5">
          {boolField('Student portal', 'allowStudentPortal')}
          {boolField('External students', 'allowExternalStudents')}
          {boolField('Bulk import', 'allowBulkImport')}
          {boolField('Email notifications', 'allowEmailNotifications')}
          {boolField('SMS notifications', 'allowSmsNotifications')}
          {boolField('Advanced analytics', 'allowAdvancedAnalytics')}
          {boolField('Custom branding', 'allowCustomBranding')}
          {boolField('Result PDF', 'allowResultPdf')}
          {boolField('API access', 'allowApiAccess')}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Feature Flags Panel ─────────────────────────────────────
function FeatureFlagsPanel({ flags, onUpdate }: { flags: FeatureFlag[]; onUpdate: () => void }) {
  const toggle = async (f: FeatureFlag) => {
    try {
      await superAdminAPI.updateFeatureFlag(f.featureKey, { isEnabled: !f.isEnabled });
      toast.success(`Feature "${f.featureName}" ${!f.isEnabled ? 'enabled' : 'disabled'}`);
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
            <div key={f.featureKey} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="flex-1 pr-4">
                <p className="text-sm font-medium text-gray-800">{f.featureName}</p>
                <p className="text-xs text-gray-500">{f.description}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${PLAN_COLORS[f.minPlan] ?? 'bg-gray-100 text-gray-500'}`}>
                  {!f.minPlan || f.minPlan === 'freemium' ? 'All plans' : `${f.minPlan}+`}
                </span>
              </div>
              <button
                onClick={() => toggle(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  f.isEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                }`}
              >
                {f.isEnabled ? <><ToggleRight className="h-4 w-4" />ON</> : <><ToggleLeft className="h-4 w-4" />OFF</>}
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
        type: form.discountType,
        value: parseFloat(form.discountValue),
        maxUses: form.maxUses ? parseInt(form.maxUses) : null,
        validUntil: form.expiresAt || null,
      });
      toast.success(`Coupon ${form.code.toUpperCase()} created`);
      setForm({ code: '', name: '', description: '', discountType: 'percent_off', discountValue: '', maxUses: '', expiresAt: '' });
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
                  <option value="percent_off">Percentage (%)</option>
                  <option value="amount_off">Fixed (₦)</option>
                  <option value="free_months">Free Months</option>
                  <option value="bonus_credits">Bonus Credits</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">
                  Value * {form.discountType === 'percent_off' ? '(%)' : form.discountType === 'amount_off' ? '(₦)' : ''}
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
            <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border ${c.isActive ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{c.code}</code>
                  <span className="text-sm text-gray-700">{c.name}</span>
                  {!c.isActive && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.discountType === 'percent_off' || c.type === 'percent_off' ? `${c.discountValue || c.value}% off` :
                   c.discountType === 'amount_off' || c.type === 'amount_off' ? `₦${c.discountValue || c.value} off` :
                   c.discountType === 'free_months' || c.type === 'free_months' ? `${c.discountValue || c.value} free month(s)` :
                   `${c.discountValue || c.value} bonus credits`}
                  {' · '}{c.usesCount || c.redemptionCount || 0}/{c.maxUses ?? '∞'} used
                  {(c.expiresAt || c.validUntil) && ` · Expires ${new Date(c.expiresAt || c.validUntil!).toLocaleDateString()}`}
                </p>
              </div>
              {c.isActive && (
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

// ─── Marketplace Pricing Panel ──────────────────────────────────
function MarketplacePricingPanel({ items, onUpdate }: { items: MarketplaceItem[]; onUpdate: () => void }) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<MarketplaceItem>>({});

  const startEdit = (item: MarketplaceItem) => {
    setEditingKey(item.featureKey);
    setDraft(item);
  };

  const handleSave = async () => {
    if (!editingKey) return;
    try {
      await superAdminAPI.updateMarketplace(editingKey, draft);
      toast.success('Marketplace item updated');
      setEditingKey(null);
      onUpdate();
    } catch {
      toast.error('Failed to update marketplace item');
    }
  };

  const toggleActive = async (item: MarketplaceItem) => {
    try {
      await superAdminAPI.updateMarketplace(item.featureKey, { isActive: !item.isActive });
      toast.success(`${item.displayName} ${!item.isActive ? 'activated' : 'deactivated'}`);
      onUpdate();
    } catch {
      toast.error('Failed to toggle item status');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-purple-500" />
          Marketplace Pricing
        </CardTitle>
        <p className="text-xs text-gray-500">Configure costs for extra tutor slots, student packs, and AI query credits.</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.featureKey} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">{item.displayName}</p>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{item.itemType}</span>
                </div>
                <p className="text-xs text-gray-500">{item.description}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-indigo-500" />
                    <span className="text-sm font-bold text-indigo-700">{item.creditCost} credits</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingKey === item.featureKey ? (
                  <div className="flex items-center gap-2 bg-white shadow-sm border border-gray-100 p-1 rounded-lg">
                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      value={draft.creditCost || ''}
                      onChange={(e) => setDraft({ ...draft, creditCost: parseInt(e.target.value) || 0 })}
                    />
                    <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700" onClick={handleSave}>
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingKey(null)}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => toggleActive(item)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors ${
                        item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {item.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => startEdit(item)}>
                      <Pencil className="h-3.5 w-3.5 text-gray-400" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Pending Payments Panel ─────────────────────────────────────
function PendingPaymentsPanel() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => { loadPayments(); }, []);

  const loadPayments = async () => {
    try {
      const res = await superAdminAPI.getPendingPayments();
      if (res.data.success) setPayments(res.data.data);
    } catch {
      toast.error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string, status: 'completed' | 'failed') => {
    const adminNotes = prompt(`Enter ${status} notes (optional):`) || '';
    setProcessing(id);
    try {
      await superAdminAPI.verifyPayment(id, { status, adminNotes });
      toast.success(`Payment marked as ${status}`);
      loadPayments();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) return <div className="h-32 flex items-center justify-center"><RefreshCw className="animate-spin text-gray-400" /></div>;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <History className="h-4 w-4 text-indigo-500" />
          Pending Verification
        </CardTitle>
        <p className="text-xs text-gray-500">Manual review of Crypto (USDT) and Bank Transfer proofs.</p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">School</th>
                <th className="px-6 py-3 text-left">Amount</th>
                <th className="px-6 py-3 text-left">Method</th>
                <th className="px-6 py-3 text-left">TX Hash / Proof</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No pending payments to verify.</td>
                </tr>
              )}
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <p className="font-bold text-gray-900">{p.school_name}</p>
                    <p className="text-[10px] text-gray-500">{p.school_email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-black text-indigo-700">{p.currency} {p.amount}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">{p.metadata?.type}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                      {p.provider === 'crypto' ? 'USDT' : p.provider}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="text-[10px] bg-gray-100 p-1 rounded font-mono truncate max-w-[120px]">{p.transaction_hash}</code>
                      {p.proof_attachment_url && (
                        <a href={p.proof_attachment_url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800">
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-red-600 hover:bg-red-50"
                        disabled={!!processing}
                        onClick={() => handleVerify(p.id, 'failed')}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        className="h-8 bg-green-600 hover:bg-green-700"
                        disabled={!!processing}
                        onClick={() => handleVerify(p.id, 'completed')}
                      >
                        {processing === p.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Subscription Settings Panel ────────────────────────────────
function SubscriptionSettings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  // Secure update dialog
  const [secureDialogOpen, setSecureDialogOpen] = useState(false);
  const [secureData, setSecureData] = useState({ key: '', value: '', password: '' });

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await superAdminAPI.getSettings();
      if (res.data.success) setSettings(res.data.data);
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (key: string, value: string) => {
    setSaving(key);
    try {
      await superAdminAPI.updateSetting(key, value);
      toast.success('Setting updated');
      setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    } catch {
      toast.error('Failed to update setting');
    } finally {
      setSaving(null);
    }
  };

  const handleSecureUpdate = async () => {
    if (!secureData.password) {
        toast.error('Please enter your password to confirm');
        return;
    }
    setSaving(secureData.key);
    try {
        await superAdminAPI.updateSettingSecure(secureData);
        toast.success(`Secure setting ${secureData.key} updated!`);
        setSecureDialogOpen(false);
        setSecureData({ key: '', value: '', password: '' });
        loadSettings();
    } catch (err: any) {
        toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
        setSaving(null);
    }
  };

  if (loading) return <div className="h-32 flex items-center justify-center"><RefreshCw className="animate-spin text-gray-400" /></div>;

  const discountPercent = settings.find(s => s.key === 'yearly_discount_percentage');
  const discountActive = settings.find(s => s.key === 'yearly_discount_active');
  const usdtAddress = settings.find(s => s.key === 'usdt_trc20_address');
  const creditPriceUsd = settings.find(s => s.key === 'payg_credit_price_usd');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <SettingsIcon className="h-4 w-4 text-gray-500" />
            General Billing
          </CardTitle>
          <p className="text-xs text-gray-500">Configure global subscription rules and discounts.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <p className="text-sm font-semibold text-gray-800">Yearly Discount Active</p>
              <p className="text-xs text-gray-500">Enable or disable discounts for annual billing.</p>
            </div>
            <button
              onClick={() => handleUpdate('yearly_discount_active', discountActive?.value === 'true' ? 'false' : 'true')}
              disabled={saving === 'yearly_discount_active'}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
                discountActive?.value === 'true' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
              }`}
            >
               {discountActive?.value === 'true' ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
               {discountActive?.value === 'true' ? 'ACTIVE' : 'INACTIVE'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <p className="text-sm font-semibold text-gray-800">Yearly Discount (%)</p>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        value={discountPercent?.value || ''}
                        onChange={(e) => setSettings(prev => prev.map(s => s.key === 'yearly_discount_percentage' ? { ...s, value: e.target.value } : s))}
                    />
                    <Button size="sm" onClick={() => handleUpdate('yearly_discount_percentage', discountPercent?.value)}>Save</Button>
                </div>
             </div>
             <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                <p className="text-sm font-semibold text-gray-800">PAYG Credit Price (USD)</p>
                <div className="flex items-center gap-2">
                    <Input
                        type="number" step="0.01"
                        value={creditPriceUsd?.value || ''}
                        onChange={(e) => setSettings(prev => prev.map(s => s.key === 'payg_credit_price_usd' ? { ...s, value: e.target.value } : s))}
                    />
                    <Button size="sm" onClick={() => handleUpdate('payg_credit_price_usd', creditPriceUsd?.value)}>Save</Button>
                </div>
             </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-100 bg-red-50/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-red-900">
            <ShieldCheck className="h-4 w-4" />
            High-Security Settings
          </CardTitle>
          <p className="text-xs text-red-700">Changing these requires re-authentication. <strong>Protect your wallet.</strong></p>
        </CardHeader>
        <CardContent>
           <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-red-100 shadow-sm">
              <div className="flex-1 pr-4">
                  <p className="text-sm font-bold text-gray-900">Platform USDT (TRC20) Wallet</p>
                  <code className="text-[10px] text-gray-500 font-mono block mt-1 truncate">{usdtAddress?.value || 'NO_ADDRESS_SET'}</code>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50"
                onClick={() => {
                    setSecureData({ key: 'usdt_trc20_address', value: usdtAddress?.value || '', password: '' });
                    setSecureDialogOpen(true);
                }}
              >
                  Update Securely
              </Button>
           </div>
        </CardContent>
      </Card>

      <Dialog open={secureDialogOpen} onOpenChange={setSecureDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Identity</DialogTitle>
            <DialogDescription>
                You are updating a sensitive platform setting: <strong>{secureData.key}</strong>.
                Please enter your administrator password to proceed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="space-y-2">
                <label className="text-sm font-bold">New {secureData.key === 'usdt_trc20_address' ? 'Wallet Address' : 'Value'}</label>
                <Input
                    value={secureData.value}
                    onChange={(e) => setSecureData(p => ({ ...p, value: e.target.value }))}
                    placeholder="Enter new value..."
                />
             </div>
             <div className="space-y-2">
                <label className="text-sm font-bold">Your Admin Password</label>
                <Input
                    type="password"
                    value={secureData.password}
                    onChange={(e) => setSecureData(p => ({ ...p, password: e.target.value }))}
                    placeholder="••••••••"
                />
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSecureDialogOpen(false)}>Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSecureUpdate}>Confirm Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function MonetizationPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>([]);
  const [activeTab, setActiveTab] = useState<'plans' | 'features' | 'coupons' | 'marketplace' | 'settings' | 'payments'>('plans');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      const [plansRes, flagsRes, couponsRes, marketplaceRes] = await Promise.allSettled([
        superAdminAPI.getPlans(),
        superAdminAPI.getFeatureFlags(),
        superAdminAPI.getCoupons(),
        superAdminAPI.getMarketplace(),
      ]);

      if (plansRes.status === 'fulfilled' && plansRes.value.data.success) {
        const planData = plansRes.value.data.data || [];
        setPlans(PLAN_ORDER.map(pt => planData.find((p: Plan) => p.planType === pt)).filter(Boolean));
      }

      if (flagsRes.status === 'fulfilled' && flagsRes.value.data.success) setFlags(flagsRes.value.data.data || []);
      if (couponsRes.status === 'fulfilled' && couponsRes.value.data.success) setCoupons(couponsRes.value.data.data || []);
      if (marketplaceRes.status === 'fulfilled' && marketplaceRes.value.data.success) setMarketplace(marketplaceRes.value.data.data || []);
    } catch (err) {
      toast.error('Failed to load monetization data');
    }
  };

  const TABS = [
    { key: 'plans', label: 'Plans', icon: DollarSign },
    { key: 'payments', label: 'Verification', icon: History },
    { key: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
    { key: 'coupons', label: 'Coupons', icon: Tag },
    { key: 'settings', label: 'Settings', icon: SettingsIcon },
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
            <PlanEditor key={plan.planType} plan={plan} onSave={(updated) => {
              setPlans(ps => ps.map(p => p.planType === updated.planType ? updated : p));
            }} />
          ))}
        </div>
      )}

      {activeTab === 'features' && (
        <FeatureFlagsPanel flags={flags} onUpdate={loadAll} />
      )}

      {activeTab === 'marketplace' && (
        <MarketplacePricingPanel items={marketplace} onUpdate={loadAll} />
      )}

      {activeTab === 'coupons' && (
        <CouponManager coupons={coupons} onRefresh={loadAll} />
      )}

      {activeTab === 'settings' && (
        <SubscriptionSettings />
      )}

      {activeTab === 'payments' && (
        <PendingPaymentsPanel />
      )}
    </div>
  );
}
