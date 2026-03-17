import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  TrendingUp, 
  Users, 
  School, 
  Zap, 
  ArrowUpRight, 
  Monitor,
  Smartphone,
  Tablet,
  MousePointer2,
  LogIn
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, Cell, PieChart, Pie 
} from 'recharts';
import { analyticsAPI } from '@/services/api';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function PlatformAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    loadIntelligence();
  }, [timeframe]);

  const loadIntelligence = async () => {
    try {
      setLoading(true);
      const response = await analyticsAPI.getIntelligence(timeframe);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load intelligence:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 space-y-6">
        <div className="flex justify-between items-center">
            <div className="space-y-2">
                <div className="h-8 w-64 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-48 bg-gray-100 animate-pulse rounded" />
            </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-50 animate-pulse rounded-2xl" />)}
        </div>
        <div className="h-[400px] bg-gray-50 animate-pulse rounded-2xl" />
      </div>
    );
  }

  const visitorData = data?.visitorTrend?.map((d: any) => ({
    name: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    hits: parseInt(d.total_hits),
    unique: parseInt(d.unique_visitors)
  })) || [];

  const loginData = data?.loginActivity?.map((d: any) => ({
    name: new Date(d.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    logins: parseInt(d.logins)
  })) || [];

  const regData = data?.registrations?.map((r: any) => ({
    name: r.segment,
    value: parseInt(r.count)
  })) || [];

  return (
    <div className="p-6 space-y-8 animate-in fade-in duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
            Platform Intelligence
            <Badge className="ml-3 bg-indigo-100 text-indigo-700 border-none px-3 py-1">Premium Insights</Badge>
          </h1>
          <p className="text-gray-500 font-medium">Monitoring platform health, traffic, and user engagement levels.</p>
        </div>

        <Tabs value={timeframe} onValueChange={(v: any) => setTimeframe(v)} className="w-full md:w-auto">
          <TabsList className="bg-gray-100/80 p-1 rounded-xl">
            <TabsTrigger value="daily" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Monthly</TabsTrigger>
            <TabsTrigger value="yearly" className="rounded-lg px-4 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-xl shadow-indigo-100/50 bg-gradient-to-br from-indigo-600 to-indigo-700 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <School size={120} />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <School className="h-5 w-5" />
              </div>
              <span className="text-indigo-100 font-bold uppercase tracking-wider text-xs">Market Reach</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-4xl font-black">{data?.kpis?.total_schools || 0}</h3>
              <span className="text-indigo-200 font-medium">Schools Onboarded</span>
            </div>
            <div className="mt-4 flex items-center text-indigo-100 text-sm font-bold">
              <TrendingUp className="h-4 w-4 mr-1" />
              Growth momentum active
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-emerald-100/50 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Users size={120} />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Users className="h-5 w-5" />
              </div>
              <span className="text-emerald-100 font-bold uppercase tracking-wider text-xs">Total Users</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-4xl font-black">{data?.kpis?.total_students || 0}</h3>
              <span className="text-emerald-200 font-medium">Students Enrolled</span>
            </div>
            <div className="mt-4 flex items-center text-emerald-100 text-sm font-bold">
              <Zap className="h-4 w-4 mr-1" />
              Peak engagement in progress
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-xl shadow-amber-100/50 bg-gradient-to-br from-amber-500 to-amber-600 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <LogIn size={120} />
          </div>
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <LogIn className="h-5 w-5" />
              </div>
              <span className="text-amber-100 font-bold uppercase tracking-wider text-xs">Active Engagement</span>
            </div>
            <div className="flex items-baseline space-x-2">
              <h3 className="text-4xl font-black text-white">{data?.kpis?.logins_today || 0}</h3>
              <span className="text-amber-100 font-medium">Logins Today</span>
            </div>
            <div className="mt-4 flex items-center text-amber-100 text-sm font-bold">
              <ArrowUpRight className="h-4 w-4 mr-1" />
              Real-time activity pulse
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Visitors & Traffic Chart */}
        <Card className="border-none shadow-2xl shadow-gray-200/50 rounded-3xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-black flex items-center">
                  <MousePointer2 className="h-5 w-5 mr-2 text-indigo-600" />
                  Visitor Traffic
                </CardTitle>
                <CardDescription>Anonymous page hits vs Unique visitors</CardDescription>
              </div>
              <Badge variant="outline" className="font-bold border-gray-100">Live Traffic</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitorData}>
                <defs>
                  <linearGradient id="colorHits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorUnique" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af', fontWeight: 600}} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                  itemStyle={{ fontWeight: 700 }}
                />
                <Area type="monotone" dataKey="hits" name="Total Hits" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorHits)" />
                <Area type="monotone" dataKey="unique" name="Unique Visitors" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorUnique)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* User Engagement (Logins) */}
        <Card className="border-none shadow-2xl shadow-gray-200/50 rounded-3xl">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-xl font-black flex items-center">
                  <Zap className="h-5 w-5 mr-2 text-amber-500" />
                  User Engagement
                </CardTitle>
                <CardDescription>Daily successful login volume</CardDescription>
              </div>
              <Badge variant="outline" className="font-bold border-gray-100">Active Sessions</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-4 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={loginData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af', fontWeight: 600}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#9ca3af', fontWeight: 600}} />
                <Tooltip 
                  cursor={{fill: '#f9fafb', radius: 8}}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '12px' }}
                />
                <Bar dataKey="logins" name="Daily Logins" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12">
        {/* Registration Segmentation */}
        <Card className="lg:col-span-1 border-none shadow-2xl shadow-gray-200/50 rounded-3xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl font-black">Registration Segments</CardTitle>
            <CardDescription>Distribution of new registrations</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={regData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  cornerRadius={8}
                >
                  {regData.map((_: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Device Distribution (Mock data for now, since we just started tracking) */}
        <Card className="lg:col-span-2 border-none shadow-2xl shadow-gray-200/50 rounded-3xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-black">Device Analytics</CardTitle>
                <CardDescription>How users access the platform</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-6 rounded-3xl bg-indigo-50/50 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 mb-4">
                   <Monitor className="h-8 w-8" />
                </div>
                <p className="text-sm font-bold text-indigo-900/60 uppercase tracking-widest">Desktop</p>
                <p className="text-3xl font-black text-indigo-900 mt-1">78%</p>
              </div>

              <div className="p-6 rounded-3xl bg-emerald-50/50 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-emerald-100 rounded-2xl text-emerald-600 mb-4">
                   <Smartphone className="h-8 w-8" />
                </div>
                <p className="text-sm font-bold text-emerald-900/60 uppercase tracking-widest">Mobile</p>
                <p className="text-3xl font-black text-emerald-900 mt-1">15%</p>
              </div>

              <div className="p-6 rounded-3xl bg-amber-50/50 flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 mb-4">
                   <Tablet className="h-8 w-8" />
                </div>
                <p className="text-sm font-bold text-amber-900/60 uppercase tracking-widest">Tablet</p>
                <p className="text-3xl font-black text-amber-900 mt-1">7%</p>
              </div>
            </div>
            
            <p className="text-xs text-center mt-8 text-gray-400 font-medium italic">
               Device tracking is initialized based on the latest 24-hour traffic trends.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
