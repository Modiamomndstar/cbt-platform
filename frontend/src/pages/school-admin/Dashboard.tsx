import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { schoolAPI } from '@/services/api';
import { CompetitionBanner } from '@/components/competitions/CompetitionBanner';
import { usePlan } from '@/hooks/usePlan';
import { FeatureLockedModal, FeatureLockBadge } from '@/components/common/FeatureLock';
import {
  Users,
  BookOpen,
  FileQuestion,
  CheckCircle,
  TrendingUp,
  Calendar,
  Trophy
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import OnboardingWizard from '@/components/common/OnboardingWizard';

export default function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFeatureAllowed } = usePlan();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const dashRes = await schoolAPI.getDashboard();

        if (dashRes?.data?.success) {
          const data = dashRes.data.data;
          setStats(data);
          if (Number(data.tutorCount) === 0) {
            setShowOnboarding(true);
          }
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
      title: 'Total Tutors',
      value: stats?.tutorCount || 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Students',
      value: stats?.studentCount || 0,
      icon: Users,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Total Exams',
      value: stats?.examCount || 0,
      icon: BookOpen,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Questions',
      value: stats?.questionCount || 0,
      icon: FileQuestion,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
    },
    {
      title: 'Completed Exams',
      value: stats?.completedExams || 0,
      icon: CheckCircle,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50'
    },
    {
      title: 'Average Score',
      value: `${Math.round(stats?.averageScore || 0)}%`,
      icon: TrendingUp,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50'
    },
    {
      title: 'LMS Courses',
      value: stats?.lmsStats?.totalCourses || 0,
      icon: BookOpen,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
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
      <CompetitionBanner />

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Dashboard</h1>
          <p className="text-gray-600">Overview of your school&apos;s examination activities</p>
        </div>
        <Button onClick={() => navigate('/school-admin/tutors')}>
          Manage Tutors
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
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Exams */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Exams</CardTitle>
          </CardHeader>
          <CardContent>
            {stats?.recentExams?.length > 0 ? (
              <div className="space-y-3">
                {stats.recentExams.map((exam: any) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{exam.title}</p>
                        <p className="text-sm text-gray-500">{exam.categoryName || ''} • {exam.duration} mins</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {Number(exam.totalQuestions || 0)} Qs
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <BookOpen className="h-10 w-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">No exams found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LMS Engagement */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">LMS Engagement</CardTitle>
            <Badge variant="secondary" className="bg-orange-100 text-orange-700 font-normal">
              New Insight
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg text-center hover:bg-white transition-colors">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Enrollments</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.lmsStats?.totalEnrollments || 0}</p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-100 rounded-lg text-center hover:bg-white transition-colors">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Completion</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.lmsStats?.avgCompletionRate || 0}%</p>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Institutional Progress</span>
                <span className="font-semibold text-orange-600">{stats?.lmsStats?.avgCompletionRate || 0}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 shadow-inner">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-1000 ease-out shadow-[0_0_8px_rgba(249,115,22,0.4)]" 
                  style={{ width: `${stats?.lmsStats?.avgCompletionRate || 0}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center text-center"
              onClick={() => navigate('/school-admin/tutors')}
            >
              <Users className="h-6 w-6 mb-2" />
              <span className="font-medium">Add Tutors</span>
              <span className="text-xs text-gray-500 mt-1">Individual or bulk upload</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center text-center"
              onClick={() => navigate('/school-admin/profile')}
            >
              <Calendar className="h-6 w-6 mb-2" />
              <span className="font-medium">Update Profile</span>
              <span className="text-xs text-gray-500 mt-1">School details and logo</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center text-center relative"
              onClick={() => {
                if (isFeatureAllowed('advanced_analytics')) {
                  navigate('/school-admin/analytics');
                } else {
                  setShowLockModal(true);
                }
              }}
            >
              <TrendingUp className="h-6 w-6 mb-2" />
              <span className="font-medium inline-flex items-center">
                View Analytics
                {!isFeatureAllowed('advanced_analytics') && <FeatureLockBadge />}
              </span>
              <span className="text-xs text-gray-600 mt-1">Performance reports</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center text-center border-indigo-200 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-700"
              onClick={() => navigate('/school-admin/competitions')}
            >
              <Trophy className="h-6 w-6 mb-2" />
              <span className="font-medium">Register for Competition</span>
              <span className="text-xs text-indigo-600 mt-1">Global & Regional events</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <FeatureLockedModal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        featureName="Advanced Analytics"
      />

      <OnboardingWizard
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
    </div>
  );
}
