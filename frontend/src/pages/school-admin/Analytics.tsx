import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { schoolAPI } from '@/services/api';

import { TrendingUp, Users, BookOpen, Award } from 'lucide-react';



export default function SchoolAnalytics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const response = await schoolAPI.getDashboard();
        if (response.data.success) {
          setStats(response.data.data);
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    loadAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

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
            <p className="text-2xl font-bold mt-3">{stats?.exam_count || 0}</p>
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
            <p className="text-2xl font-bold mt-3">{stats?.student_count || 0}</p>
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
            <p className="text-2xl font-bold mt-3">{stats?.completed_exams || stats?.upcoming_exams || 0}</p>
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
            <p className="text-2xl font-bold mt-3">{Math.round(stats?.average_score || 0)}%</p>
            <p className="text-sm text-gray-600">Average Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Info Cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Total Tutors</span>
                <span className="font-bold text-lg">{stats?.tutor_count || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Total Students</span>
                <span className="font-bold text-lg">{stats?.student_count || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Total Exams</span>
                <span className="font-bold text-lg">{stats?.exam_count || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Total Questions</span>
                <span className="font-bold text-lg">{stats?.question_count || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Performance Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Scheduled Exams</span>
                <span className="font-bold text-lg">{stats?.upcoming_exams || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Completed Exams</span>
                <span className="font-bold text-lg">{stats?.completed_exams || 0}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Average Score</span>
                <span className="font-bold text-lg">{Math.round(stats?.average_score || 0)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
