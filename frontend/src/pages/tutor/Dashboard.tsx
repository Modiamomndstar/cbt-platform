import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { tutorAPI, examAPI } from '@/services/api';
import {
  BookOpen,
  Users,
  FileQuestion,
  CheckCircle,
  TrendingUp,
  Calendar,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function TutorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsRes, examsRes] = await Promise.all([
          tutorAPI.getDashboardStats().catch(() => null),
          examAPI.getAll().catch(() => null),
        ]);

        if (statsRes?.data?.success) {
          setStats(statsRes.data.data);
        }
        if (examsRes?.data?.success) {
          setExams((examsRes.data.data || []).slice(0, 5));
        }
      } catch (err) {
        console.error('Failed to load dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  const statCards = [
    {
      title: 'My Exams',
      value: stats?.exam_count || stats?.totalExams || 0,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'My Students',
      value: stats?.student_count || stats?.totalStudents || 0,
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Questions',
      value: stats?.question_count || stats?.totalQuestions || 0,
      icon: FileQuestion,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      title: 'Completed',
      value: stats?.completed_exams || stats?.completedExams || 0,
      icon: CheckCircle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50'
    },
    {
      title: 'Upcoming',
      value: stats?.upcoming_exams || stats?.upcomingExams || 0,
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Avg Score',
      value: `${Math.round(stats?.average_score || stats?.averageScore || 0)}%`,
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50'
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutor Dashboard</h1>
          <p className="text-gray-600">Welcome back! Manage your exams and students</p>
        </div>
        <Button onClick={() => navigate('/tutor/exams/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Exam
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className={`${stat.bgColor} p-3 rounded-lg`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-2xl font-bold mt-3">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* My Exams */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">My Exams</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/tutor/exams')}
            >
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardHeader>
          <CardContent>
            {exams.length > 0 ? (
              <div className="space-y-3">
                {exams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100"
                    onClick={() => navigate(`/tutor/exams/${exam.id}/questions`)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{exam.title}</p>
                        <p className="text-sm text-gray-500">{exam.category || exam.category_name || ''}</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {exam.total_questions || exam.question_count || 0} Qs
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No exams created yet</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => navigate('/tutor/exams/create')}
                >
                  Create Your First Exam
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming - simplified */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Upcoming Exams</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.upcomingExams?.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingExams.map((exam: any) => (
                  <div key={exam.id} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{exam.examTitle}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(exam.scheduledDate).toLocaleDateString()} at {exam.startTime}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-white">
                      {exam.studentCount} Students
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming exams scheduled</p>
                <Button
                  variant="link"
                  onClick={() => navigate('/tutor/exams')}
                  className="mt-1 h-auto p-0"
                >
                  Schedule an Exam
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/tutor/exams/create')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Exam
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/tutor/students')}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Students
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => navigate('/tutor/results')}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                View Results
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
