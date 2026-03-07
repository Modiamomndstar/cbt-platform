import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { superAdminAPI } from '@/services/api';
import { toast } from 'sonner';
import {
  DollarSign, Zap, Tag,
  RefreshCw, Save, Plus, ToggleLeft, ToggleRight,
  Pencil, Check, X, ShoppingBag, Settings as SettingsIcon
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────
interface Plan {
  plan_type: string; display_name: string; price_usd: number;
  price_ngn: number; max_tutors: number | null;
  max_internal_students: number | null; max_active_exams: number | null;
  ai_queries_per_month: number;
  allow_student_portal: boolean; allow_external_students: boolean;
  allow_bulk_import: boolean; allow_email_notifications: boolean;
  allow_advanced_analytics: boolean; allow_custom_branding: boolean;
  allow_result_pdf: boolean; allow_api_access: boolean; allow_sms_notifications: boolean;
}

interface FeatureFlag {
  feature_key: string; feature_name: string; description: string;
  min_plan: string; is_enabled: boolean;
}

interface Coupon {
  id: string; code: string; name: string; description: string;
  discount_type: string; discount_value: number;
  max_uses: number | null; uses_count: number;
  expires_at: string | null; is_active: boolean;
  type?: string;
  value?: number;
  redemption_count?: number;
  valid_until?: string | null;
}

interface MarketplaceItem {
  feature_key: string;
  display_name: string;
  description: string;
  item_type: string;
  credit_cost: number;
  is_active: boolean;
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
        priceNgn: draft.price_ngn,
        priceUsd: draft.price_usd,
        maxTutors: draft.max_tutors,
        maxInternalStudents: draft.max_internal_students,
        maxActiveExams: draft.max_active_exams,
        aiQueriesPerMonth: draft.ai_queries_per_month,
        allow_student_portal: draft.allow_student_portal,
        allow_external_students: draft.allow_external_students,
        allow_bulk_import: draft.allow_bulk_import,
        allow_email_notifications: draft.allow_email_notifications,
        allow_advanced_analytics: draft.allow_advanced_analytics,
        allow_custom_branding: draft.allow_custom_branding,
        allow_result_pdf: draft.allow_result_pdf,
        allow_api_access: draft.allow_api_access,
        allow_sms_notifications: draft.allow_sms_notifications,
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
              value={draft.price_ngn}
              onChange={(e) => setDraft(p => ({ ...p, price_ngn: parseFloat(e.target.value) || 0 }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50 focus:ring-2 focus:ring-indigo-300 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Price ($/mo)</label>
            <input
              type="number"
              disabled={!editing}
              value={draft.price_usd}
              onChange={(e) => setDraft(p => ({ ...p, price_usd: parseFloat(e.target.value) || 0 }))}
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
                <p className="text-sm font-medium text-gray-800">{f.feature_name || f.display_name}</p>
                <p className="text-xs text-gray-500">{f.description}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium mt-1 inline-block ${PLAN_COLORS[f.min_plan] ?? 'bg-gray-100 text-gray-500'}`}>
                  {!f.min_plan || f.min_plan === 'freemium' ? 'All plans' : `${f.min_plan}+`}
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
            <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border ${c.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{c.code}</code>
                  <span className="text-sm text-gray-700">{c.name}</span>
                  {!c.is_active && <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {c.discount_type === 'percent_off' || c.type === 'percent_off' ? `${c.discount_value || c.value}% off` :
                   c.discount_type === 'amount_off' || c.type === 'amount_off' ? `₦${c.discount_value || c.value} off` :
                   c.discount_type === 'free_months' || c.type === 'free_months' ? `${c.discount_value || c.value} free month(s)` :
                   `${c.discount_value || c.value} bonus credits`}
                  {' · '}{c.uses_count || c.redemption_count || 0}/{c.max_uses ?? '∞'} used
                  {(c.expires_at || c.valid_until) && ` · Expires ${new Date(c.expires_at || c.valid_until!).toLocaleDateString()}`}
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

// ─── Marketplace Pricing Panel ──────────────────────────────────
function MarketplacePricingPanel({ items, onUpdate }: { items: MarketplaceItem[]; onUpdate: () => void }) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<MarketplaceItem>>({});

  const startEdit = (item: MarketplaceItem) => {
    setEditingKey(item.feature_key);
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
      await superAdminAPI.updateMarketplace(item.feature_key, { is_active: !item.is_active });
      toast.success(`${item.display_name} ${!item.is_active ? 'activated' : 'deactivated'}`);
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
            <div key={item.feature_key} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 px-2 rounded-lg transition-colors">
              <div className="flex-1 pr-4">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">{item.display_name}</p>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{item.item_type}</span>
                </div>
                <p className="text-xs text-gray-500">{item.description}</p>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-indigo-500" />
                    <span className="text-sm font-bold text-indigo-700">{item.credit_cost} credits</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {editingKey === item.feature_key ? (
                  <div className="flex items-center gap-2 bg-white shadow-sm border border-gray-100 p-1 rounded-lg">
                    <Input
                      type="number"
                      className="w-20 h-8 text-sm"
                      value={draft.credit_cost || ''}
                      onChange={(e) => setDraft({ ...draft, credit_cost: parseInt(e.target.value) || 0 })}
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
                        item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      {item.is_active ? 'ACTIVE' : 'INACTIVE'}
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

// ─── Subscription Settings Panel ────────────────────────────────
function SubscriptionSettings() {
  const [settings, setSettings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      const res = await superAdminAPI.getSettings({ category: 'billing' });
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

  if (loading) return <div className="h-32 flex items-center justify-center"><RefreshCw className="animate-spin text-gray-400" /></div>;

  const discountPercent = settings.find(s => s.key === 'yearly_discount_percentage');
  const discountActive = settings.find(s => s.key === 'yearly_discount_active');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-gray-500" />
          Subscription Settings
        </CardTitle>
        <p className="text-xs text-gray-500">Configure global subscription rules and discounts.</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Yearly Discount Active</p>
            <p className="text-xs text-gray-500">Enable or disable discounts for annual billing across all plans.</p>
          </div>
          <button
            onClick={() => handleUpdate('yearly_discount_active', discountActive?.value === 'true' ? 'false' : 'true')}
            disabled={saving === 'yearly_discount_active'}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
              discountActive?.value === 'true' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {saving === 'yearly_discount_active' ? <RefreshCw className="h-4 w-4 animate-spin" /> :
             discountActive?.value === 'true' ? <><ToggleRight className="h-5 w-5" /> ACTIVE</> : <><ToggleLeft className="h-5 w-5" /> INACTIVE</>}
          </button>
        </div>

        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div>
            <p className="text-sm font-semibold text-gray-800">Yearly Discount Percentage (%)</p>
            <p className="text-xs text-gray-500">The percentage value to subtract from the total annual price.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              className="w-24 text-center font-bold"
              value={discountPercent?.value || ''}
              min="0"
              max="100"
              onChange={(e) => setSettings(prev => prev.map(s => s.key === 'yearly_discount_percentage' ? { ...s, value: e.target.value } : s))}
            />
            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => handleUpdate('yearly_discount_percentage', discountPercent?.value)}
              disabled={saving === 'yearly_discount_percentage'}
            >
              {saving === 'yearly_discount_percentage' ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : 'Apply'}
            </Button>
          </div>
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
  const [marketplace, setMarketplace] = useState<MarketplaceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'plans' | 'features' | 'coupons' | 'marketplace' | 'settings'>('plans');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [plansRes, flagsRes, couponsRes, marketplaceRes] = await Promise.all([
        superAdminAPI.getPlans(),
        superAdminAPI.getFeatureFlags(),
        superAdminAPI.getCoupons(),
        superAdminAPI.getMarketplace(),
      ]);
      if (plansRes.data.success) {
        setPlans(PLAN_ORDER.map(pt => plansRes.data.data.find((p: Plan) => p.plan_type === pt)).filter(Boolean));
      }
      if (flagsRes.data.success) setFlags(flagsRes.data.data);
      if (couponsRes.data.success) setCoupons(couponsRes.data.data);
      if (marketplaceRes.data.success) setMarketplace(marketplaceRes.data.data);
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
            <PlanEditor key={plan.plan_type} plan={plan} onSave={(updated) => {
              setPlans(ps => ps.map(p => p.plan_type === updated.plan_type ? updated : p));
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
    </div>
  );
}
