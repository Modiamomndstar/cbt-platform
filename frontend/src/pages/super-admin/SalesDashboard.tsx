import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  School, 
  DollarSign, 
  Link as LinkIcon, 
  Copy, 
  ExternalLink,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import { commissionsAPI } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { formatDate } from '@/lib/dateUtils';

interface EarningStats {
  totalPoints: number;
  unpaidPoints: number;
  paidAmount: {
    NGN: number;
    USD: number;
  };
  linkedSchools: number;
}

interface CommissionRecord {
  id: string;
  schoolName: string;
  pointsEarned: number;
  monetaryValue: number;
  currency: string;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  createdAt: string;
}

export default function SalesDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<EarningStats>({
    totalPoints: 0,
    unpaidPoints: 0,
    paidAmount: { NGN: 0, USD: 0 },
    linkedSchools: 0
  });
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const referralCode = user?.username?.toUpperCase() || 'SALES-ADMIN';
  const referralLink = `${window.location.origin}/register-school?ref=${referralCode}`;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await commissionsAPI.getMyEarnings();
      if (response.data.success) {
        const { summary, commissions: list, schoolsCount } = response.data.data;
        setStats({
          totalPoints: summary.totalPoints,
          unpaidPoints: summary.unpaidPoints,
          paidAmount: summary.paidAmount,
          linkedSchools: schoolsCount
        });
        setCommissions(list);
      }
    } catch (error) {
      toast.error('Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales & Marketing Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.name}. Track your referrals and earnings.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-indigo-50 text-indigo-700 border-indigo-200">
            Sales Admin
          </Badge>
          <Badge variant="outline" className="px-3 py-1 bg-green-50 text-green-700 border-green-200">
            {user?.staffRole === 'sales_admin' ? 'Authorized' : 'Super Admin Mode'}
          </Badge>
        </div>
      </div>

      {/* Referral Link Card */}
      <Card className="border-indigo-100 shadow-sm overflow-hidden bg-gradient-to-br from-indigo-50/50 to-white">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <LinkIcon className="h-5 w-5" />
                <h3 className="font-semibold">Your Referral Link</h3>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-white border border-indigo-200 rounded-md px-3 py-2 text-sm font-mono truncate">
                  {referralLink}
                </div>
                <Button variant="secondary" size="sm" onClick={() => copyToClipboard(referralLink, 'Link')}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
              </div>
              <p className="text-xs text-indigo-600/70 italic">
                Schools registering with this link will be automatically linked to your account for commissions.
              </p>
            </div>
            
            <div className="lg:w-px lg:h-20 bg-indigo-100" />
            
            <div className="lg:w-64 space-y-4">
              <div className="flex items-center gap-2 text-indigo-700">
                <TrendingUp className="h-5 w-5" />
                <h3 className="font-semibold">Referral Code</h3>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 bg-white border border-indigo-200 rounded-md px-4 py-2 text-lg font-bold text-center tracking-widest uppercase">
                  {referralCode}
                </div>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(referralCode, 'Code')}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Total Points</p>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.totalPoints}</div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime earned points</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Linked Schools</p>
              <School className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.linkedSchools}</div>
            <p className="text-xs text-muted-foreground mt-1 text-green-600">Active referrals</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2">
              <p className="text-sm font-medium">Pending Payouts</p>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold">{stats.unpaidPoints} pts</div>
            <p className="text-xs text-muted-foreground mt-1">Points awaiting payment</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between space-y-0 pb-2 text-slate-400">
              <p className="text-sm font-medium">Paid Earnings</p>
              <DollarSign className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <div className="text-lg font-bold">₦{stats.paidAmount.NGN.toLocaleString()}</div>
              <div className="text-lg font-bold">${stats.paidAmount.USD.toLocaleString()}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Commissions */}
      <Card>
        <CardHeader>
          <CardTitle>Commission History</CardTitle>
          <CardDescription>Detailed list of points earned from school payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">School Name</th>
                  <th className="px-4 py-3">Points</th>
                  <th className="px-4 py-3">Cash Value</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {commissions.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-4 font-medium">{item.schoolName}</td>
                    <td className="px-4 py-4">
                      <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-none">
                        +{item.pointsEarned} pts
                      </Badge>
                    </td>
                    <td className="px-4 py-4 font-mono font-medium">
                      {item.currency === 'USD' ? '$' : '₦'}{item.monetaryValue.toLocaleString()}
                    </td>
                    <td className="px-4 py-4">
                      {item.status === 'paid' && (
                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                          <CheckCircle className="h-3 w-3 mr-1" /> Paid
                        </Badge>
                      )}
                      {item.status === 'approved' && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
                          <Clock className="h-3 w-3 mr-1" /> Processed
                        </Badge>
                      )}
                      {(item.status === 'pending' || !item.status) && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                          <Clock className="h-3 w-3 mr-1" /> Pending
                        </Badge>
                      )}
                      {item.status === 'cancelled' && (
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none">
                          Cancelled
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
                {commissions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No commission records found. Start referring schools to earn!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex flex-col sm:flex-row justify-center gap-4">
        <Button 
          variant="default" 
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 h-12 rounded-xl shadow-lg shadow-indigo-100"
          onClick={() => navigate(`/register-school?ref=${referralCode}`)}
        >
          <School className="h-5 w-5 mr-2" /> Register Direct School
        </Button>
        <Button variant="outline" className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 px-8 h-12 rounded-xl">
          <ExternalLink className="h-4 w-4 mr-2" /> Marketing Resources
        </Button>
      </div>
    </div>
  );
}
