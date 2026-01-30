import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getSchoolDashboardStats, 
  getExamsBySchool, 
  getStudentExams,
  getStudentsBySchool 
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
import { TrendingUp, Users, BookOpen, Award } from 'lucide-react';
import type { DashboardStats } from '@/types';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function SchoolAnalytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [examPerformance, setExamPerformance] = useState<any[]>([]);
  const [studentDistribution, setStudentDistribution] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    if (user?.schoolId) {
      const dashboardStats = getSchoolDashboardStats(user.schoolId);
      setStats(dashboardStats);

      // Get exam performance data
      const exams = getExamsBySchool(user.schoolId);
      const studentExams = getStudentExams();
      
      const performanceData = exams.map(exam => {
        const examResults = studentExams.filter(se => se.examId === exam.id && se.status === 'completed');
        const avgScore = examResults.length > 0 
          ? Math.round(examResults.reduce((sum, se) => sum + se.percentage, 0) / examResults.length)
          : 0;
        return {
          name: exam.title.substring(0, 20) + (exam.title.length > 20 ? '...' : ''),
          score: avgScore,
          students: examResults.length,
        };
      }).slice(0, 5);
      setExamPerformance(performanceData);

      // Get student distribution by level
      const students = getStudentsBySchool(user.schoolId);
      const levelCounts: Record<string, number> = {};
      students.forEach(student => {
        levelCounts[student.level] = (levelCounts[student.level] || 0) + 1;
      });
      const distributionData = Object.entries(levelCounts).map(([level, count]) => ({
        name: level,
        value: count,
      }));
      setStudentDistribution(distributionData);

      // Get recent activity (completed exams)
      const recentExams = studentExams
        .filter(se => se.status === 'completed')
        .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())
        .slice(0, 7)
        .map((se, index) => ({
          day: `Day ${index + 1}`,
          score: se.percentage,
        }));
      setRecentActivity(recentExams);
    }
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">School Analytics</h1>
        <p className="text-gray-600">Performance insights and examination statistics</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-indigo-50 p-3 rounded-lg">
                <BookOpen className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats?.totalExams || 0}</p>
            <p className="text-sm text-gray-600">Total Exams</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-emerald-50 p-3 rounded-lg">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats?.totalStudents || 0}</p>
            <p className="text-sm text-gray-600">Total Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-amber-50 p-3 rounded-lg">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats?.completedExams || 0}</p>
            <p className="text-sm text-gray-600">Exams Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-purple-50 p-3 rounded-lg">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats?.averageScore || 0}%</p>
            <p className="text-sm text-gray-600">Average Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Exam Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Exam Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {examPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={examPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#4F46E5" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No exam data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Student Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Student Distribution by Level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              {studentDistribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={studentDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {studentDistribution.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  No student data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Exam Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {recentActivity.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recentActivity}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981' }}
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
  );
}
