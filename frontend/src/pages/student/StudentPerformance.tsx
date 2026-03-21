import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { analyticsAPI, academicCalendarAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { TrendingUp, Target, Award, Brain, Loader2, Download, Calendar, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export default function StudentPerformance() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');

  useEffect(() => {
    const loadYears = async () => {
      try {
        const res = await academicCalendarAPI.getYears();
        setYears(res.data.data || []);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    };
    loadYears();
  }, []);

  useEffect(() => {
    const fetchPerformance = async () => {
      setLoading(true);
      try {
        const params = selectedYear !== 'all' ? { yearId: selectedYear } : {};
        const response = await analyticsAPI.getStudentDashboard(params);
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error('Failed to load performance analytics:', error);
        toast.error('Failed to load performance analytics.');
      } finally {
        setLoading(false);
      }
    };
    fetchPerformance();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        <p className="text-sm text-muted-foreground animate-pulse">Analyzing your academic progress...</p>
      </div>
    );
  }

  const chartData = data?.monthlyProgress || [];
  const radarData = data?.categoryPerformance || [];
  const summary = {
    totalExams: data?.totalExams || 0,
    avgScore: data?.averagePercentage || 0,
    awardsEarned: data?.awardsEarned || 0,
    percentile: data?.percentile || 50
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Academic Performance</h1>
          <p className="text-muted-foreground text-sm">In-depth analysis of your learning journey</p>
        </div>
        <div className="flex flex-wrap gap-3">
           <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[180px] bg-white">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select Session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Global (All Time)</SelectItem>
                {years.map(y => (
                  <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
                ))}
              </SelectContent>
           </Select>
           <Button variant="outline" size="sm" onClick={() => window.open(`/report-card/${user?.id}${selectedYear !== 'all' ? `?yearId=${selectedYear}` : ''}`, '_blank')}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF Report
          </Button>
        </div>
      </div>

      {/* High Level Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Average Score"
          value={`${summary.avgScore}%`}
          icon={TrendingUp}
          color="text-indigo-600"
          bg="bg-indigo-50"
        />
        <StatCard
          title="Rank Percentile"
          value={`Top ${100 - summary.percentile}%`}
          icon={Target}
          color="text-emerald-600"
          bg="bg-emerald-50"
        />
        <StatCard
          title="Awards Won"
          value={summary.awardsEarned}
          icon={Award}
          color="text-amber-600"
          bg="bg-amber-50"
        />
        <StatCard
          title="Exams Taken"
          value={summary.totalExams}
          icon={Brain}
          color="text-purple-600"
          bg="bg-purple-50"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Trend Chart */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Progress Timeline</CardTitle>
            <CardDescription>Visualizing your score trends over the last few months</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={{ r: 6, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Subject Proficiency</CardTitle>
            <CardDescription>Strength and weakness audit across all categories</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="Proficiency"
                  dataKey="A"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.5}
                />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white border-none overflow-hidden relative">
        <div className="absolute right-0 top-0 p-8 opacity-10">
           <TrendingUp className="h-32 w-32" />
        </div>
        <CardContent className="p-8 relative z-10">
          <div className="max-w-2xl">
            <Badge className="bg-indigo-500 text-white border-none mb-4">Plan Insight</Badge>
            <h3 className="text-2xl font-bold mb-2">Unlock Your Full Academic Potential</h3>
            <p className="text-slate-300 mb-6 leading-relaxed text-sm">
              Your performance in <strong className="text-white">Mathematics</strong> is exceptional, placing you in the top 5% platform-wide.
              Focusing on <strong className="text-white">History</strong> techniques could improve your overall percentile rank.
            </p>
            <Button className="bg-white text-slate-950 hover:bg-slate-100 border-none font-bold">
              View Detailed Insight Log <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, bg }: any) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className={`${bg} p-2 rounded-lg`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
        <div>
          <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-1 font-medium">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
