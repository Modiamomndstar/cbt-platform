import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  CreditCard, 
  Settings, 
  CheckCircle, 
  Wallet,
  Coins
} from 'lucide-react';
import { commissionsAPI } from '@/services/api';
import { formatDate } from '@/lib/dateUtils';
import { useAuth } from '@/hooks/useAuth';

interface Commission {
  id: string;
  staffId: string;
  staffName: string;
  schoolName: string;
  pointsEarned: number;
  monetaryValue: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  createdAt: string;
}

interface CommissionSetting {
  id?: string;
  plan_type: string;
  currency: string;
  billing_cycle: 'monthly' | 'yearly';
  points_within_30_days: number;
  points_after_30_days: number;
  monetary_value_per_point: number;
  max_commissions_per_school: number;
}

export default function CommissionsManagement() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [settings, setSettings] = useState<CommissionSetting[]>([]);
  const [pendingSettings, setPendingSettings] = useState<CommissionSetting[]>([]);
  const [activeTab, setActiveTab] = useState<'payouts' | 'settings'>('payouts');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);

  // Permission check
  const canManageSettings = user?.id === "00000000-0000-0000-0000-000000000000" || user?.staffRole === 'finance';

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    try {
      if (activeTab === 'payouts') {
        const res = await commissionsAPI.getAllCommissions({ status: filterStatus === 'all' ? undefined : filterStatus });
        setCommissions(res.data.data);
      } else {
        const res = await commissionsAPI.getSettings();
        setSettings(res.data.data);
        setPendingSettings(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to load commission data');
    }
  };

  const handleProcessPayout = async (id: string) => {
    if (!confirm('Mark this commission as PAID? Ensure payment has been sent to the staff member.')) return;
    try {
      await commissionsAPI.processPayout(id);
      toast.success('Payout marked as processed');
      fetchData();
    } catch (error) {
      toast.error('Failed to process payout');
    }
  };

  const handleEditSetting = (planType: string, currency: string, billingCycle: 'monthly' | 'yearly', field: string, value: any) => {
    setPendingSettings(prev => {
      const existingIdx = prev.findIndex(s => s.plan_type === planType && s.currency === currency && s.billing_cycle === billingCycle);
      
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], [field]: value };
        return updated;
      } else {
        // Create default if not found
        const newSetting: CommissionSetting = {
          plan_type: planType,
          currency,
          billing_cycle: billingCycle,
          points_within_30_days: 0,
          points_after_30_days: 0,
          monetary_value_per_point: 0,
          max_commissions_per_school: 1,
          [field]: value
        };
        return [...prev, newSetting];
      }
    });
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    try {
      // Find what actually changed compared to original 'settings'
      const changed = pendingSettings.filter(ps => {
        const original = settings.find(s => s.plan_type === ps.plan_type && s.currency === ps.currency && s.billing_cycle === ps.billing_cycle);
        if (!original) return true; // New record
        return JSON.stringify(ps) !== JSON.stringify(original);
      });

      if (changed.length === 0) {
        toast.info("No changes to save");
        setIsSaving(false);
        return;
      }

      // Save sequentially
      for (const item of changed) {
        await commissionsAPI.updateSettings(item);
      }

      toast.success(`${changed.length} settings updated successfully`);
      fetchData();
    } catch (error) {
      console.error("Save error:", error);
      toast.error('Failed to save some settings');
    } finally {
      setIsSaving(false);
    }
  };

  const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(pendingSettings);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commission Management</h1>
          <p className="text-gray-500 text-sm">Oversee sales performance and manage financial rewards.</p>
        </div>
        {activeTab === 'settings' && canManageSettings && (
           <Button 
            onClick={handleSaveChanges} 
            disabled={!hasUnsavedChanges || isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 shadow-sm"
           >
             {isSaving ? "Saving..." : "Save All Changes"}
           </Button>
        )}
      </div>

      <div className="flex border-b">
        <button
          className={`py-3 px-6 font-medium text-sm flex items-center gap-2 ${activeTab === 'payouts' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('payouts')}
        >
          <CreditCard className="w-4 h-4" /> Payout Queue
        </button>
        {canManageSettings && (
          <button
            className={`py-3 px-6 font-medium text-sm flex items-center gap-2 ${activeTab === 'settings' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings className="w-4 h-4" /> Global Settings
          </button>
        )}
      </div>

      {activeTab === 'payouts' && (
        <Card>
          <div className="p-4 border-b bg-gray-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2">
              <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); fetchData(); }}>
                <SelectTrigger className="w-40 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Records</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">Found {commissions.length} records</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-xs font-semibold text-gray-700 uppercase">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Staff Member</th>
                  <th className="px-6 py-4">School</th>
                  <th className="px-6 py-4">Points</th>
                  <th className="px-6 py-4">Value</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {commissions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-gray-500">{formatDate(c.createdAt)}</td>
                    <td className="px-6 py-4 font-medium">{c.staffName}</td>
                    <td className="px-6 py-4">{c.schoolName}</td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                        {c.pointsEarned} pts
                      </Badge>
                    </td>
                    <td className="px-6 py-4 font-mono font-medium">
                      {c.currency === 'USD' ? '$' : '₦'}{c.monetaryValue.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {c.status !== 'paid' ? (
                        <Button 
                          size="sm" 
                          variant="secondary" 
                          className="bg-green-600 text-white hover:bg-green-700 h-8"
                          onClick={() => handleProcessPayout(c.id)}
                        >
                          Mark Paid
                        </Button>
                      ) : (
                        <Badge className="bg-green-100 text-green-700 border-none">
                          <CheckCircle className="w-3 h-3 mr-1" /> Paid
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {commissions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 italic">
                      No records found for the current selection.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {['NGN', 'USD'].map((curr) => (
            <Card key={curr} className="overflow-hidden">
              <CardHeader className="bg-slate-900 text-white border-none py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center">
                       <Wallet className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                         {curr} Configuration
                      </CardTitle>
                      <CardDescription className="text-slate-400">Manage earnings for {curr} subscription conversions</CardDescription>
                    </div>
                  </div>
                  <Coins className="h-8 w-8 text-amber-500 opacity-20" />
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {['basic', 'advanced', 'enterprise'].map((plan) => (
                    <div key={plan} className="space-y-4">
                      <div className="flex items-center gap-2 mb-2">
                         <div className="h-2 w-2 rounded-full bg-indigo-600" />
                         <h4 className="font-bold uppercase tracking-wider text-xs text-gray-500">{plan} Plan</h4>
                      </div>

                      {['monthly', 'yearly'].map((cycle) => {
                         const s = pendingSettings.find(st => st.plan_type === plan && st.currency === curr && st.billing_cycle === cycle) || {
                            plan_type: plan,
                            currency: curr,
                            billing_cycle: cycle as any,
                            points_within_30_days: 0,
                            points_after_30_days: 0,
                            monetary_value_per_point: 0,
                            max_commissions_per_school: 1
                          } as CommissionSetting;

                         return (
                          <div key={cycle} className="p-4 border rounded-xl bg-gray-50/50 hover:bg-white transition-colors border-gray-200">
                            <div className="flex items-center justify-between mb-3">
                              <Badge className={cycle === 'yearly' ? "bg-amber-100 text-amber-700 hover:bg-amber-100 border-none" : "bg-blue-100 text-blue-700 hover:bg-blue-100 border-none"}>
                                {cycle.toUpperCase()}
                              </Badge>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-gray-400 tracking-tighter">Early (30d)</Label>
                                <Input 
                                  type="number" 
                                  className="h-9 bg-white text-sm" 
                                  value={s.points_within_30_days}
                                  onChange={(e) => handleEditSetting(plan, curr, cycle as any, 'points_within_30_days', parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-gray-400 tracking-tighter">Standard</Label>
                                <Input 
                                  type="number" 
                                  className="h-9 bg-white text-sm" 
                                  value={s.points_after_30_days}
                                  onChange={(e) => handleEditSetting(plan, curr, cycle as any, 'points_after_30_days', parseInt(e.target.value) || 0)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-gray-400 tracking-tighter">Value/Pt ({curr})</Label>
                                <Input 
                                  type="number" 
                                  className="h-9 bg-white font-mono text-sm" 
                                  value={s.monetary_value_per_point}
                                  onChange={(e) => handleEditSetting(plan, curr, cycle as any, 'monetary_value_per_point', parseFloat(e.target.value) || 0)}
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[9px] uppercase font-bold text-gray-400 tracking-tighter">Max Payouts</Label>
                                <Input 
                                  type="number" 
                                  className="h-9 bg-white text-sm" 
                                  value={s.max_commissions_per_school}
                                  onChange={(e) => handleEditSetting(plan, curr, cycle as any, 'max_commissions_per_school', parseInt(e.target.value) || 1)}
                                />
                              </div>
                            </div>
                          </div>
                         );
                      })}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {canManageSettings && hasUnsavedChanges && (
            <div className="fixed bottom-8 right-8 animate-in fade-in slide-in-from-bottom-4">
              <Card className="shadow-2xl border-indigo-200">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="text-sm">
                    <p className="font-bold text-indigo-900">Unsaved Changes</p>
                    <p className="text-gray-500">You have modified commission rates.</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setPendingSettings(settings)}>Discard</Button>
                    <Button size="sm" className="bg-indigo-600" onClick={handleSaveChanges} disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save Now"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
