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
  Coins,
  ArrowRight
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
  points_within_30_days: number;
  points_after_30_days: number;
  monetary_value_per_point: number;
  max_commissions_per_school: number;
}

export default function CommissionsManagement() {
  const { user } = useAuth();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [settings, setSettings] = useState<CommissionSetting[]>([]);
  const [activeTab, setActiveTab] = useState<'payouts' | 'settings'>('payouts');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

  const handleUpdateSetting = async (planType: string, currency: string, field: string, value: any) => {
    const existing = settings.find(s => s.plan_type === planType && s.currency === currency);
    const updated = existing ? { ...existing, [field]: value } : { plan_type: planType, currency, [field]: value };
    
    try {
      await commissionsAPI.updateSettings(updated);
      toast.success('Settings updated');
      fetchData();
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Commission Management</h1>
          <p className="text-gray-500 text-sm">Oversee sales performance and manage financial rewards.</p>
        </div>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {['NGN', 'USD'].map((curr) => (
            <Card key={curr}>
              <CardHeader className="bg-slate-900 text-white rounded-t-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                       <Wallet className="h-5 w-5" /> {curr} Config
                    </CardTitle>
                    <CardDescription className="text-slate-400">Commission rates for {curr} payments</CardDescription>
                  </div>
                  <Coins className="h-8 w-8 text-amber-400 opacity-50" />
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {['basic', 'advanced', 'enterprise'].map((plan) => {
                  const s = settings.find(st => st.plan_type === plan && st.currency === curr) || {
                    plan_type: plan,
                    currency: curr,
                    points_within_30_days: 0,
                    points_after_30_days: 0,
                    monetary_value_per_point: 0,
                    max_commissions_per_school: 1
                  } as CommissionSetting;

                  return (
                    <div key={plan} className="p-4 border rounded-lg bg-gray-50/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold capitalize text-indigo-700 flex items-center gap-2">
                          <ArrowRight className="h-4 w-4" /> {plan} Plan
                        </h4>
                        <Badge variant="outline" className="bg-white">Rate Setup</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-gray-400">Early Pts (30d)</Label>
                          <Input 
                            type="number" 
                            className="h-8 bg-white" 
                            value={s.points_within_30_days}
                            onChange={(e) => handleUpdateSetting(plan, curr, 'points_within_30_days', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-gray-400">Standard Pts</Label>
                          <Input 
                            type="number" 
                            className="h-8 bg-white" 
                            value={s.points_after_30_days}
                            onChange={(e) => handleUpdateSetting(plan, curr, 'points_after_30_days', parseInt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-gray-400">Cash per Pt ({curr})</Label>
                          <Input 
                            type="number" 
                            className="h-8 bg-white font-mono" 
                            value={s.monetary_value_per_point}
                            onChange={(e) => handleUpdateSetting(plan, curr, 'monetary_value_per_point', parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] uppercase font-bold text-gray-400">Limit (Payments)</Label>
                          <Input 
                            type="number" 
                            className="h-8 bg-white" 
                            value={s.max_commissions_per_school}
                            onChange={(e) => handleUpdateSetting(plan, curr, 'max_commissions_per_school', parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
