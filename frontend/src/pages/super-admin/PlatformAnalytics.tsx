import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getSchools, 
  getExams, 
  getStudentExams
} from '@/lib/dataStore';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';
import { TrendingUp, School, Users, BookOpen, Award } from 'lucide-react';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function PlatformAnalytics() {
  const [schoolsGrowth, setSchoolsGrowth] = useState<any[]>([]);
  const [examStats, setExamStats] = useState<any[]>([]);
  const [scoreDistribution, setScoreDistribution] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [topSchools, setTopSchools] = useState<any[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = () => {
    const schools = getSchools();
    const exams = getExams();
    const studentExams = getStudentExams();

    // Schools growth (by month)
    const schoolsByMonth: Record<string, number> = {};
    schools.forEach(school => {
      const month = new Date(school.createdAt).toLocaleString('default', { month: 'short' });
      schoolsByMonth[month] = (schoolsByMonth[month] || 0) + 1;
    });
    setSchoolsGrowth(Object.entries(schoolsByMonth).map(([month, count]) => ({ month, count })));

    // Exam stats by status
    const completed = studentExams.filter(se => se.status === 'completed').length;
    const inProgress = studentExams.filter(se => se.status === 'in_progress').length;
    const timeout = studentExams.filter(se => se.status === 'timeout').length;
    setExamStats([
      { name: 'Completed', value: completed },
      { name: 'In Progress', value: inProgress },
      { name: 'Timeout', value: timeout },
    ]);

    // Score distribution
    const ranges = [
      { range: '0-39%', min: 0, max: 39, count: 0 },
      { range: '40-49%', min: 40, max: 49, count: 0 },
      { range: '50-59%', min: 50, max: 59, count: 0 },
      { range: '60-69%', min: 60, max: 69, count: 0 },
      { range: '70-79%', min: 70, max: 79, count: 0 },
      { range: '80-100%', min: 80, max: 100, count: 0 },
    ];
    
    studentExams
      .filter(se => se.status === 'completed')
      .forEach(se => {
        const range = ranges.find(r => se.percentage >= r.min && se.percentage <= r.max);
        if (range) range.count++;
      });
    
    setScoreDistribution(ranges.map(r => ({ range: r.range, count: r.count })));

    // Recent activity (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const activityData = last7Days.map(date => {
      const count = studentExams.filter(se => 
        se.submittedAt && se.submittedAt.startsWith(date)
      ).length;
      return { date: date.slice(5), count };
    });
    setRecentActivity(activityData);

    // Top schools by exam completions
    const schoolStats: Record<string, { name: string; completions: number }> = {};
    schools.forEach(school => {
      const schoolExams = exams.filter(e => e.schoolId === school.id).map(e => e.id);
      const completions = studentExams.filter(se => 
        schoolExams.includes(se.examId) && se.status === 'completed'
      ).length;
      schoolStats[school.id] = { name: school.name, completions };
    });

    const topSchoolsList = Object.values(schoolStats)
      .sort((a, b) => b.completions - a.completions)
      .slice(0, 5);
    setTopSchools(topSchoolsList);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-gray-600">Comprehensive insights across all schools</p>
      </div>

      {/* Charts Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Schools Growth */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <School className="h-5 w-5 mr-2" />
              Schools Registration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {schoolsGrowth.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={schoolsGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#4F46E5" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exam Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Exam Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {examStats.some(s => s.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={examStats}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {examStats.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Score Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Award className="h-5 w-5 mr-2" />
              Score Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {scoreDistribution.some(s => s.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10B981" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Recent Exam Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {recentActivity.some(a => a.count > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={recentActivity}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      dot={{ fill: '#8B5CF6' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Schools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Top Performing Schools
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topSchools.length > 0 ? (
            <div className="space-y-3">
              {topSchools.map((school, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      index === 0 ? 'bg-amber-100 text-amber-700' :
                      index === 1 ? 'bg-gray-200 text-gray-700' :
                      index === 2 ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <span className="font-semibold">{index + 1}</span>
                    </div>
                    <span className="font-medium text-gray-900">{school.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-gray-900">{school.completions}</span>
                    <span className="text-sm text-gray-500 ml-1">exams completed</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No data available yet
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
