import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyticsAPI } from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Users, BookOpen, Award, Calendar, CheckCircle, Sparkles } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

export default function TutorAnalytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await analyticsAPI.getTutorDashboard();
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (err) {
        console.error('Failed to load tutor analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
          <p className="text-gray-600">Performance insights for your students and exams</p>
        </div>
        <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium border border-indigo-100 italic">
          Premium Feature Enabled
        </div>
      </div>

      {/* High Level Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-indigo-50 p-3 rounded-lg">
                <BookOpen className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats?.totalExams || 0}</p>
            <p className="text-sm text-gray-600">Your Exams</p>
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
            <p className="text-sm text-gray-600">Active Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-amber-50 p-3 rounded-lg">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats?.averagePercentage}%</p>
            <p className="text-sm text-gray-600">Average Performance</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-purple-50 p-3 rounded-lg">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats?.publishedExams || 0}</p>
            <p className="text-sm text-gray-600">Published Exams</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Performance by Exam */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-indigo-600" />
              Exam Performance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.examPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="title"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="averagePercentage" name="Avg Score %" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-amber-600" />
              Upcoming Schedules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.upcomingExams?.length > 0 ? (
                stats.upcomingExams.map((exam: any) => (
                  <div key={exam.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <p className="font-semibold text-gray-900 truncate">{exam.examTitle}</p>
                    <div className="flex justify-between mt-2 text-xs text-gray-500">
                      <span>{formatDate(exam.scheduledDate)}</span>
                      <span>{exam.studentCount} candidates</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500 italic">
                  No upcoming exams scheduled
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Performance Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-sm text-gray-500 border-b">
                  <th className="pb-3 pr-4">Exam Title</th>
                  <th className="pb-3 pr-4">Attempts</th>
                  <th className="pb-3 pr-4">Avg. Score</th>
                  <th className="pb-3 pr-4">Highest</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats?.examPerformance?.map((row: any) => (
                  <tr key={row.id} className="text-sm">
                    <td className="py-4 pr-4 font-medium">{row.title}</td>
                    <td className="py-4 pr-4">{row.attemptCount}</td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center">
                        <span className={`w-2 h-2 rounded-full mr-2 ${parseFloat(row.averagePercentage) >= 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {row.averagePercentage}%
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-emerald-600 font-semibold">{row.highestPercentage}%</td>
                    <td className="py-4 text-right">
                       <button
                         onClick={() => navigate(`/tutor/results?examId=${row.id}`)}
                         className="text-indigo-600 hover:text-indigo-900 font-medium"
                       >
                         View Results
                       </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Reports Discovery */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Award className="h-24 w-24" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-6 w-6" />
                Advanced Student Report Cards
              </h2>
              <p className="text-indigo-100 max-w-xl text-sm leading-relaxed">
                Generate professional, branded academic transcripts for your students.
                Our new advanced reports include level progression tracking, signature customization, and high-quality PDF exports.
                <span className="block mt-2 font-bold text-white border-l-2 border-indigo-300 pl-3">
                  How to generate: Go to "School Students" or "External Students" and look for the sparkle icon or "Adv. Report" button.
                </span>
              </p>
            </div>
            <Button
              onClick={() => navigate('/tutor/students')}
              className="bg-white text-indigo-600 hover:bg-indigo-50 font-bold px-8 py-6 h-auto shadow-md"
            >
              Generate Reports Now
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
