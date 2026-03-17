import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, UserPlus, FileSignature, CheckCircle, XCircle } from 'lucide-react';
import { superAdminAPI } from '@/services/api';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
import { useAuth } from '@/hooks/useAuth';

interface StaffAccount {
  id: string;
  name: string;
  email: string;
  username: string;
  role: string;
  country?: string;
  referralCode?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface AuditLog {
  id: string;
  actorName: string;
  action: string;
  targetType: string;
  targetName: string;
  createdAt: string;
  ipAddress: string;
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  coordinating_admin: 'Coordinating Admin',
  finance: 'Finance / Billing',
  sales_admin: 'Sales / Marketer',
  customer_success: 'Customer Success',
  support_agent: 'Support Agent',
  sales_manager: 'Sales Manager',
  content_reviewer: 'Content Reviewer'
};

const HIERARCHY: Record<string, number> = {
  super_admin: 100,
  coordinating_admin: 50,
  finance: 40,
  sales_admin: 10,
  customer_success: 10,
  support_agent: 10,
  sales_manager: 10,
  content_reviewer: 10
};

export default function StaffManagement() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffAccount[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'staff' | 'audit'>('staff');

  // New staff form
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'customer_success',
    country: 'Nigeria',
    referralCode: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [staffRes, logsRes] = await Promise.all([
        superAdminAPI.getStaff(),
        superAdminAPI.getAuditLog()
      ]);
      setStaff(staffRes.data.data);
      setLogs(logsRes.data.data);
    } catch (error) {
      toast.error('Failed to load staff management data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await superAdminAPI.createStaff(formData);
      toast.success('Staff account created successfully');
      setStaff([res.data.data, ...staff]);
      setIsCreating(false);
      setFormData({ name: '', email: '', username: '', password: '', role: 'customer_success', country: 'Nigeria', referralCode: '' });
      fetchData(); // Refresh to get new logs
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create staff account');
    }
  };

  const toggleStaffStatus = async (id: string, currentStatus: boolean) => {
    if (currentStatus) {
      if (!confirm('Are you sure you want to completely deactivate this staff account?')) return;
      try {
        await superAdminAPI.updateStaff(id, { isActive: false });
        toast.success('Staff account deactivated');
        fetchData();
      } catch (error) {
        toast.error('Failed to deactivate account');
      }
    } else {
      try {
        await superAdminAPI.updateStaff(id, { isActive: true });
        toast.success('Staff account reactivated');
        fetchData();
      } catch (error) {
        toast.error('Failed to reactivate account');
      }
    }
  };

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Loading staff management...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Staff Management</h1>
          <p className="text-gray-500">Manage internal company accounts and roles</p>
        </div>
        <Button
          onClick={() => setIsCreating(!isCreating)}
          className={isCreating ? "bg-gray-200 text-gray-800 hover:bg-gray-300" : "bg-indigo-600 hover:bg-indigo-700"}
        >
          {isCreating ? 'Cancel' : <><Plus className="w-4 h-4 mr-2" /> New Staff</>}
        </Button>
      </div>

      {isCreating && (
        <Card className="border-indigo-100 shadow-md">
          <CardHeader className="bg-indigo-50/50">
            <CardTitle>Create Staff Account</CardTitle>
            <CardDescription>Issue credentials for a new employee</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleCreateStaff} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Email Address</Label>
                <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Username (internal)</Label>
                <Input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Temporary Password</Label>
                <Input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Access Role</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer_success">Customer Success (Onboarding, Emails, Viewing)</SelectItem>
                    <SelectItem value="support_agent">Support Agent (Passwords, Accounts, Diagnostics)</SelectItem>
                    <SelectItem value="finance">Finance / Billing (Invoices, Subscriptions, Commissions)</SelectItem>
                    <SelectItem value="coordinating_admin">Coordinating Admin (Staff Management, Hub Controller)</SelectItem>
                    <SelectItem value="sales_admin">Sales / Marketer (School Acquisition, Earns Points)</SelectItem>
                    <SelectItem value="sales_manager">Sales Manager (Pipeline, Manual Trials, Upgrades)</SelectItem>
                    <SelectItem value="content_reviewer">Content Reviewer (Question Banks, Flagging)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Country (for Sales/Reporting)</Label>
                <Input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} placeholder="e.g. Nigeria" />
              </div>
              <div className="space-y-2">
                <Label>Unique Sales/Referral Code</Label>
                <Input value={formData.referralCode} onChange={e => setFormData({...formData, referralCode: e.target.value})} placeholder="Leave blank to use username" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit">Create Account</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          className={`py-3 px-6 font-medium text-sm flex items-center ${activeTab === 'staff' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('staff')}
        >
          <UserPlus className="w-4 h-4 mr-2" /> Active Staff ({staff.length})
        </button>
        <button
          className={`py-3 px-6 font-medium text-sm flex items-center ${activeTab === 'audit' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('audit')}
        >
          <FileSignature className="w-4 h-4 mr-2" /> Internal Audit Log
        </button>
      </div>

      {activeTab === 'staff' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-4">Name / Username</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Last Login</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.id} className={`border-b ${!s.isActive ? 'bg-gray-50 opacity-60' : 'bg-white'}`}>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {s.name}
                      <div className="text-xs text-gray-500 font-normal">@{s.username} - {s.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                        {ROLE_LABELS[s.role] || s.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {s.isActive ?
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-none"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge> :
                        <Badge variant="secondary" className="bg-red-100 text-red-700 border-none"><XCircle className="w-3 h-3 mr-1" /> Deactivated</Badge>
                      }
                    </td>
                    <td className="px-6 py-4">
                      {s.lastLoginAt ? formatDate(s.lastLoginAt) : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {(user?.id === "00000000-0000-0000-0000-000000000000" || (HIERARCHY[user?.staffRole || ''] > HIERARCHY[s.role])) ? (
                        <Button
                          variant={s.isActive ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => toggleStaffStatus(s.id, s.isActive)}
                        >
                          {s.isActive ? 'Deactivate' : 'Reactivate'}
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 border-gray-200">Protected</Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No staff accounts created yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {activeTab === 'audit' && (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-6 py-4">Timestamp</th>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target Resource</th>
                  <th className="px-6 py-4">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b bg-white hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 font-medium">
                      {log.actorName}
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs capitalize text-gray-400 mr-2">{log.targetType}</span>
                      <span className="font-medium text-gray-700">{log.targetName || '(unknown)'}</span>
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-gray-400">
                      {log.ipAddress}
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      No audit logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

    </div>
  );
}
