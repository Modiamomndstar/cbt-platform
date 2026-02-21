import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { superAdminAPI } from '@/services/api';
import { toast } from 'sonner';
import {
  Gift, ShieldOff, PauseCircle, PlayCircle, Coins, Clock,
  Search, School, RefreshCw, ChevronDown, ChevronUp
} from 'lucide-react';

interface SchoolData {
  id: string; name: string; username: string; email: string;
  is_active: boolean;
  subscription?: {
    plan_type: string; status: string; trial_end_at: string | null;
    override_plan: string | null; override_expires_at: string | null;
    is_suspended: boolean;
  };
  payg_balance?: number;
}

const STATUS_COLORS: Record<string, string> = {
  freemium: 'bg-gray-100 text-gray-600',
  basic: 'bg-blue-100 text-blue-700',
  advanced: 'bg-purple-100 text-purple-700',
  enterprise: 'bg-amber-100 text-amber-700',
  trialing: 'bg-amber-100 text-amber-700',
  gifted: 'bg-green-100 text-green-700',
  suspended: 'bg-red-100 text-red-600',
};

// ─── Action Modal ─────────────────────────────────────────────
function ActionModal({
  school, action, onClose, onDone
}: {
  school: SchoolData; action: 'gift' | 'revoke' | 'suspend' | 'unsuspend' | 'credits' | 'trial';
  onClose: () => void; onDone: () => void;
}) {
  const [planType, setPlanType] = useState('basic');
  const [days, setDays] = useState(30);
  const [credits, setCredits] = useState(100);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    setSaving(true);
    try {
      switch (action) {
        case 'gift':
          await superAdminAPI.giftPlan(school.id, planType, days, reason);
          toast.success(`${planType} plan gifted to ${school.name} for ${days} days`);
          break;
        case 'revoke':
          await superAdminAPI.revokePlan(school.id, reason);
          toast.success(`Plan revoked for ${school.name}`);
          break;
        case 'suspend':
          await superAdminAPI.suspendSchool(school.id, true, reason);
          toast.success(`${school.name} suspended`);
          break;
        case 'unsuspend':
          await superAdminAPI.suspendSchool(school.id, false, reason);
          toast.success(`${school.name} reactivated`);
          break;
        case 'credits':
          await superAdminAPI.addCredits(school.id, credits, reason);
          toast.success(`${credits} credits added to ${school.name}`);
          break;
        case 'trial':
          await superAdminAPI.extendTrial(school.id, days);
          toast.success(`Trial extended by ${days} days for ${school.name}`);
          break;
      }
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setSaving(false);
    }
  };

  const CONFIG = {
    gift: { title: 'Gift a Plan', icon: Gift, color: 'text-indigo-600' },
    revoke: { title: 'Revoke Plan', icon: ShieldOff, color: 'text-red-600' },
    suspend: { title: 'Suspend School', icon: PauseCircle, color: 'text-red-600' },
    unsuspend: { title: 'Reactivate School', icon: PlayCircle, color: 'text-green-600' },
    credits: { title: 'Add PAYG Credits', icon: Coins, color: 'text-emerald-600' },
    trial: { title: 'Extend Trial', icon: Clock, color: 'text-amber-600' },
  }[action];

  const Icon = CONFIG.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2 rounded-xl ${action === 'gift' ? 'bg-indigo-50' : action.includes('revoke') || action.includes('suspend') ? 'bg-red-50' : 'bg-emerald-50'}`}>
            <Icon className={`h-5 w-5 ${CONFIG.color}`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{CONFIG.title}</h3>
            <p className="text-sm text-gray-500">{school.name}</p>
          </div>
        </div>

        <div className="space-y-4">
          {action === 'gift' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Plan</label>
                <select
                  value={planType}
                  onChange={(e) => setPlanType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                >
                  <option value="basic">Basic Premium</option>
                  <option value="advanced">Advanced Premium</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Duration (days)</label>
                <Input type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value) || 30)} min={1} />
              </div>
            </>
          )}

          {action === 'credits' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Credits to add</label>
              <Input type="number" value={credits} onChange={(e) => setCredits(parseInt(e.target.value) || 0)} min={1} />
              <p className="text-xs text-gray-400 mt-1">≈ ₦{(credits * 50).toLocaleString()} value</p>
            </div>
          )}

          {action === 'trial' && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Extend by (days)</label>
              <Input type="number" value={days} onChange={(e) => setDays(parseInt(e.target.value) || 7)} min={1} />
            </div>
          )}

          {(action !== 'trial') && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Reason {action === 'revoke' || action === 'suspend' ? '(required)' : '(optional)'}
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                placeholder="Internal reason for this action..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none resize-none"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={handleSubmit}
            disabled={saving || ((action === 'revoke' || action === 'suspend') && !reason.trim())}
          >
            {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Confirm'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── School Row ───────────────────────────────────────────────
function SchoolRow({ school, onRefresh }: { school: SchoolData; onRefresh: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [modal, setModal] = useState<'gift' | 'revoke' | 'suspend' | 'unsuspend' | 'credits' | 'trial' | null>(null);

  const sub = school.subscription;
  const isSuspended = sub?.is_suspended;
  const planLabel = sub?.override_plan || sub?.plan_type || 'freemium';
  const statusLabel = isSuspended ? 'suspended' : sub?.status || 'freemium';

  return (
    <>
      <div className={`border border-gray-200 rounded-xl overflow-hidden ${isSuspended ? 'opacity-70' : ''}`}>
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setExpanded(e => !e)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-indigo-700 font-bold text-sm">{school.name.charAt(0)}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{school.name}</p>
              <p className="text-xs text-gray-500">{school.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[planLabel] ?? 'bg-gray-100 text-gray-600'}`}>
              {planLabel}
            </span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[statusLabel] ?? 'bg-gray-100 text-gray-600'}`}>
              {statusLabel}
            </span>
            {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
          </div>
        </div>

        {expanded && (
          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
              <div><span className="font-medium text-gray-700">Username:</span> @{school.username}</div>
              <div><span className="font-medium text-gray-700">PAYG Balance:</span> {school.payg_balance ?? 0} credits</div>
              {sub?.trial_end_at && (
                <div><span className="font-medium text-gray-700">Trial ends:</span> {new Date(sub.trial_end_at).toLocaleDateString()}</div>
              )}
              {sub?.override_expires_at && (
                <div><span className="font-medium text-gray-700">Override expires:</span> {new Date(sub.override_expires_at).toLocaleDateString()}</div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setModal('gift')} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors">
                <Gift className="h-3.5 w-3.5" /> Gift Plan
              </button>
              <button onClick={() => setModal('revoke')} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 transition-colors">
                <ShieldOff className="h-3.5 w-3.5" /> Revoke
              </button>
              <button onClick={() => setModal(isSuspended ? 'unsuspend' : 'suspend')} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${isSuspended ? 'bg-green-50 text-green-700 hover:bg-green-100' : 'bg-red-50 text-red-700 hover:bg-red-100'}`}>
                {isSuspended ? <><PlayCircle className="h-3.5 w-3.5" />Reactivate</> : <><PauseCircle className="h-3.5 w-3.5" />Suspend</>}
              </button>
              <button onClick={() => setModal('credits')} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors">
                <Coins className="h-3.5 w-3.5" /> Add Credits
              </button>
              {sub?.status === 'trialing' && (
                <button onClick={() => setModal('trial')} className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors">
                  <Clock className="h-3.5 w-3.5" /> Extend Trial
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {modal && (
        <ActionModal
          school={school}
          action={modal}
          onClose={() => setModal(null)}
          onDone={onRefresh}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────
export default function SchoolOverridesPage() {
  const [schools, setSchools] = useState<SchoolData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadSchools(); }, []);

  const loadSchools = async () => {
    setLoading(true);
    try {
      const res = await superAdminAPI.getOverview();
      if (res.data.success) setSchools(res.data.data.schools || []);
    } catch {
      toast.error('Failed to load schools');
    } finally {
      setLoading(false);
    }
  };

  const filtered = schools.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    s.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Overrides</h1>
          <p className="text-sm text-gray-500 mt-1">Gift plans, add credits, and manage school access</p>
        </div>
        <button onClick={loadSchools} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <RefreshCw className="h-4 w-4 text-gray-500" />
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search schools by name, email, or username..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">{filtered.length} school{filtered.length !== 1 ? 's' : ''}</p>
          {filtered.map(school => (
            <SchoolRow key={school.id} school={school} onRefresh={loadSchools} />
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <School className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No schools found</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
