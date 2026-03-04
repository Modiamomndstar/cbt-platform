import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { superAdminAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, Users, GraduationCap, BookOpen, Coins, ShieldAlert, ShieldCheck,
  Mail, Download, ExternalLink,
  History, Settings, Activity, Info
} from 'lucide-react';
import { toast } from 'sonner';

export default function SchoolDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [featureFlags, setFeatureFlags] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // States for forms
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [subForm, setSubForm] = useState({ plan_type: '', billing_cycle: '', status: '' });
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDetails();
  }, [id]);

  const loadDetails = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [res, featuresRes] = await Promise.all([
        superAdminAPI.getSchoolDetails(id),
        superAdminAPI.getFeatureFlags()
      ]);

      if (res.data.success) {
        const d = res.data.data;
        setData(d);
        setSubForm({
          plan_type: d.school.plan_type,
          billing_cycle: d.school.billing_cycle || 'free',
          status: d.school.sub_status
        });
        setOverrides(d.school.override_features || {});
      }
      if (featuresRes.data.success) {
        setFeatureFlags(featuresRes.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load school details');
      navigate('/super-admin/schools');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCredits = async (type: 'add' | 'deduct') => {
    if (!id || !creditAmount || !creditReason) return toast.error('Please fill all credit fields');
    setIsProcessing(true);
    try {
      const amount = parseInt(creditAmount);
      const res = type === 'add'
        ? await superAdminAPI.addCredits(id, amount, creditReason)
        : await superAdminAPI.deductCredits(id, amount, creditReason);

      if (res.data.success) {
        toast.success(`Successfully ${type === 'add' ? 'added' : 'deducted'} ${amount} credits`);
        setCreditAmount('');
        setCreditReason('');
        loadDetails();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateSubscription = async () => {
    if (!id) return;
    setIsProcessing(true);
    try {
      const res = await superAdminAPI.updateSchoolSubscription(id, subForm);
      if (res.data.success) {
        toast.success('Subscription updated');
        loadDetails();
      }
    } catch {
      toast.error('Failed to update subscription');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToggleFeature = async (key: string, val: boolean) => {
    if (!id) return;
    const newOverrides = { ...overrides, [key]: val };
    setOverrides(newOverrides);
    try {
      await superAdminAPI.updateFeatureOverrides(id, newOverrides);
      toast.success('Feature override updated');
    } catch {
      toast.error('Failed to save override');
      setOverrides(overrides); // Revert
    }
  };

  const handleStatusToggle = async () => {
    if (!id || !data) return;
    const newStatus = !data.school.is_active;
    try {
      await superAdminAPI.suspendSchool(id, !newStatus, 'Updated via management portal');
      toast.success(`School ${newStatus ? 'activated' : 'suspended'}`);
      loadDetails();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleExport = async (type: 'tutors' | 'students' | 'external_students') => {
    try {
      toast.info(`Generating ${type} export...`);
      await superAdminAPI.exportData(type, id);
      toast.success('Backup downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  const formatLogDetails = (action: string, details: any) => {
    if (!details) return '-';
    // If it's a string, just return it
    if (typeof details === 'string') return details;

    try {
      switch (action) {
        case 'credits_added':
          return `Added ${details.credits} credits. New balance: ${details.newBalance}. Reason: ${details.reason}`;
        case 'credits_deducted':
          return `Deducted ${details.credits} credits. New balance: ${details.newBalance}. Reason: ${details.reason}`;
        case 'login':
          return `Logged in (Session initialized)`;
        case 'school_suspended':
          return `Account suspended. Reason: ${details.reason || 'Not specified'}`;
        case 'school_unsuspended':
          return `Account activated.`;
        case 'subscription_updated':
          return `Updated plan to ${details.plan_type || 'N/A'}, billing: ${details.billing_cycle || 'N/A'}`;
        case 'feature_overrides_updated':
          return `Updated feature access flags`;
        case 'school_registered':
          return `Initial registration on ${details.plan_type} plan`;
        case 'tutor_created':
          return `Created staff account: ${details.username} (${details.email || 'no email'})`;
        default:
          return JSON.stringify(details);
      }
    } catch {
      return JSON.stringify(details);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
    </div>
  );

  const school = data?.school || {}; const stats = data?.stats || { tutors: 0, internal_students: 0, external_students: 0 }; const tutorBreakdown = data?.tutorBreakdown || []; const logs = data?.logs || [];

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/super-admin/schools')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              {school?.name || 'Loading...'}
              {school && school.is_active === false && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase font-bold tracking-wider">Suspended</span>}
              <Badge variant="outline" className="text-xs font-medium ml-2">{school?.plan_type?.toUpperCase() || 'FREE'}</Badge>
            </h1>
            <p className="text-sm text-gray-500">{school?.email || 'N/A'} • {school?.country || 'Unknown'}</p>
          </div>

        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.open(`mailto:${school.email}`)} className="h-9">
            <Mail className="h-4 w-4 mr-2" /> Contact Admin
          </Button>
          <Button variant={school.is_active ? "destructive" : "default"} size="sm" onClick={handleStatusToggle} className="h-9">
            {school.is_active ? <ShieldAlert className="h-4 w-4 mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
            {school.is_active ? 'Suspend' : 'Activate'}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-slate-100/50 p-1 mb-6">
          <TabsTrigger value="overview" className="gap-2"><Info className="h-4 w-4" /> Overview</TabsTrigger>
          <TabsTrigger value="management" className="gap-2"><Settings className="h-4 w-4" /> Management</TabsTrigger>
          <TabsTrigger value="audit" className="gap-2"><History className="h-4 w-4" /> Audit Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 focus-visible:ring-0">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Tutors', value: stats.tutors, icon: GraduationCap, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Internal Students', value: stats.internal_students, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'External Students', value: stats.external_students, icon: BookOpen, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'PAYG Balance', value: school.payg_balance || 0, icon: Coins, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((item, idx) => (
              <Card key={idx} className="border-none shadow-sm bg-white/60 backdrop-blur-md">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{item.label}</p>
                    <h3 className="text-2xl font-bold text-gray-900 mt-1">{(item.value || 0).toLocaleString()}</h3>
                  </div>
                  <div className={`${item.bg} p-3 rounded-2xl`}>
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg">Tutor Performance</CardTitle>
                  <p className="text-xs text-gray-500">Breakdown of external student registrations</p>
                </div>
              </CardHeader>
              <CardContent className="pt-4 px-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-50 text-gray-400 font-medium text-left">
                        <th className="pb-3 px-6">Staff Member</th>
                        <th className="pb-3 px-2 text-center">External</th>
                        <th className="pb-3 px-6 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {tutorBreakdown.length > 0 ? tutorBreakdown.map((t: any) => (
                        <tr key={t.id} className="hover:bg-gray-50/50 transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                {t.first_name?.[0]}{t.last_name?.[0]}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-900 leading-tight">{t.first_name} {t.last_name}</p>
                                <p className="text-[11px] text-gray-500 leading-none mt-1">@{t.username}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-2 text-center">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-bold">{t.external_count}</Badge>
                          </td>
                          <td className="py-4 px-6 text-right">
                             <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50">
                               Activity <ExternalLink className="h-3 w-3 ml-1" />
                             </Button>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={3} className="py-12 text-center text-gray-400">No tutors found.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2 font-bold"><Download className="h-5 w-5 text-indigo-500" /> Backups</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 pt-2">
                  <Button variant="ghost" onClick={() => handleExport('tutors')} className="w-full justify-start text-xs font-semibold py-6 hover:bg-indigo-50 hover:text-indigo-600">
                    <Download className="h-4 w-4 mr-3" /> Export Tutors List
                  </Button>
                  <Button variant="ghost" onClick={() => handleExport('students')} className="w-full justify-start text-xs font-semibold py-6 hover:bg-indigo-50 hover:text-indigo-600">
                    <Download className="h-4 w-4 mr-3" /> Export Internal Students
                  </Button>
                  <Button variant="ghost" onClick={() => handleExport('external_students')} className="w-full justify-start text-xs font-semibold py-6 hover:bg-indigo-50 hover:text-indigo-600">
                    <Download className="h-4 w-4 mr-3" /> Export External Database
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm bg-amber-50/50 border border-amber-100">
                <CardHeader className="pb-2">
                   <CardTitle className="text-lg flex items-center gap-2 text-amber-900"><Coins className="h-5 w-5" /> Quick Fund</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                   <Input type="number" placeholder="Credits" value={creditAmount} onChange={e => setCreditAmount(e.target.value)} className="bg-white" />
                   <Input placeholder="Reason" value={creditReason} onChange={e => setCreditReason(e.target.value)} className="bg-white" />
                   <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => handleUpdateCredits('add')} disabled={isProcessing} className="bg-amber-600 hover:bg-amber-700">Add Credits</Button>
                      <Button variant="destructive" onClick={() => handleUpdateCredits('deduct')} disabled={isProcessing}>Deduct</Button>
                   </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="management" className="space-y-6 focus-visible:ring-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Plan Management */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Settings className="h-5 w-5 text-indigo-600" /> Plan & Billing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label>Subscription Plan</Label>
                      <Select value={subForm.plan_type} onValueChange={v => setSubForm({...subForm, plan_type: v})}>
                        <SelectTrigger><SelectValue placeholder="Select Plan" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="freemium">Freemium</SelectItem>
                          <SelectItem value="basic">Basic Plan</SelectItem>
                          <SelectItem value="advanced">Advanced Plan</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                   <div className="space-y-2">
                      <Label>Billing Cycle</Label>
                      <Select value={subForm.billing_cycle} onValueChange={v => setSubForm({...subForm, billing_cycle: v})}>
                        <SelectTrigger><SelectValue placeholder="Cycle" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="annual">Annual</SelectItem>
                          <SelectItem value="payg">Pay As You Go</SelectItem>
                        </SelectContent>
                      </Select>
                   </div>
                </div>
                <div className="space-y-2">
                   <Label>Account Status</Label>
                   <Select value={subForm.status} onValueChange={v => setSubForm({...subForm, status: v})}>
                     <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                     <SelectContent>
                       <SelectItem value="active">Active</SelectItem>
                       <SelectItem value="trialing">Trialing</SelectItem>
                       <SelectItem value="past_due">Past Due</SelectItem>
                       <SelectItem value="suspended">Suspended</SelectItem>
                       <SelectItem value="cancelled">Cancelled</SelectItem>
                     </SelectContent>
                   </Select>
                </div>
                <Button onClick={handleUpdateSubscription} disabled={isProcessing} className="w-full bg-indigo-600">Save Subscription Changes</Button>
              </CardContent>
            </Card>

            {/* Feature Overrides */}
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-emerald-600" /> Feature Overrides</CardTitle>
                <p className="text-xs text-gray-500">Enable specific features for this school regardless of their plan.</p>
              </CardHeader>
              <CardContent className="pt-2">
                 <div className="space-y-4">
                    {featureFlags.map((f: any) => (
                      <div key={f.feature_key} className="flex items-center justify-between p-3 rounded-lg border border-gray-50 bg-gray-50/30">
                        <div>
                           <p className="text-sm font-semibold text-gray-900">{f.feature_name}</p>
                           <p className="text-[10px] text-gray-500">Normal: {f.min_plan?.toUpperCase() || 'N/A'}+</p>
                        </div>
                        <Switch
                          checked={overrides[f.feature_key] || false}
                          onCheckedChange={(checked) => handleToggleFeature(f.feature_key, checked)}
                        />
                      </div>
                    ))}
                    {featureFlags.length === 0 && <p className="text-center py-8 text-gray-400 text-sm">No platform features defined.</p>}
                 </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="focus-visible:ring-0">
          <Card className="border-none shadow-sm overflow-hidden">
            <CardHeader className="bg-slate-50 border-b border-slate-100">
               <CardTitle className="text-lg flex items-center gap-2"><Activity className="h-5 w-5 text-indigo-500" /> Unified Audit Trail</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                 <table className="w-full text-sm">
                   <thead>
                     <tr className="bg-slate-50/50 text-gray-500 font-medium text-left">
                       <th className="py-3 px-6">Timestamp</th>
                       <th className="py-3 px-6">Actor</th>
                       <th className="py-3 px-6">Action</th>
                       <th className="py-3 px-6">Source</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-100">
                     {logs.map((log: any) => (
                       <tr key={log.id} className="hover:bg-gray-50/50">
                         <td className="py-4 px-6 text-gray-500 whitespace-nowrap">
                            {log.created_at ? new Date(log.created_at).toLocaleString() : 'N/A'}
                         </td>
                         <td className="py-4 px-6">
                            <div className="flex flex-col">
                               <span className="font-semibold text-gray-900">
                                  {log.actor_id === '00000000-0000-0000-0000-000000000000' ? 'Super Admin' : (log.actor_name || 'System User')}
                               </span>
                               <span className="text-[10px] text-gray-400">ID: {log.actor_id?.substring(0,8)}... ({log.actor_type || 'system'})</span>
                            </div>
                         </td>
                         <td className="py-4 px-6">
                            <div className="flex flex-col">
                               <Badge variant="outline" className="w-fit mb-1 bg-white uppercase text-[10px] tracking-wide">{log.action.replace(/_/g, ' ')}</Badge>
                               <span className="text-xs text-gray-600 truncate max-w-xs" title={JSON.stringify(log.details)}>
                                  {formatLogDetails(log.action, log.details)}
                               </span>
                            </div>
                         </td>
                         <td className="py-4 px-6">
                            <Badge variant={log.log_type === 'staff' ? 'default' : 'secondary'} className={log.log_type === 'staff' ? 'bg-indigo-600' : ''}>
                               {log.log_type === 'staff' ? 'SuperAdmin' : 'School'}
                            </Badge>
                         </td>
                       </tr>
                     ))}
                     {logs.length === 0 && (
                       <tr><td colSpan={4} className="py-12 text-center text-gray-400">No activity logs found.</td></tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
