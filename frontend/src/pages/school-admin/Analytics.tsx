import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

      {/* Advanced Reports Discovery */}
      <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none shadow-lg overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Award className="h-24 w-24" />
        </div>
        <CardContent className="p-6 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <TrendingUp className="h-6 w-6" />
                Advanced Student Report Cards
              </h2>
              <p className="text-indigo-100 max-w-xl text-sm leading-relaxed">
                Generate professional, branded academic transcripts for your students.
                Our new advanced reports include level progression tracking, signature customization, and high-quality PDF exports.
                <span className="block mt-2 font-bold text-white border-l-2 border-indigo-300 pl-3">
                  How to generate: Go to Student Management, find your student, and select "Generate Advanced Report" from the actions menu.
                </span>
              </p>
            </div>
            <Button
              onClick={() => { window.location.href = '/school-admin/students'; }}
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
