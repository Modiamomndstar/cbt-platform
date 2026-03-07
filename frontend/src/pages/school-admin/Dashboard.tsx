import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { schoolAPI, tutorAPI, examAPI } from '@/services/api';
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
  ArrowRight,
  Trophy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import OnboardingWizard from '@/components/common/OnboardingWizard';

export default function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFeatureAllowed } = usePlan();
  const [stats, setStats] = useState<any>(null);
  const [tutors, setTutors] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [dashRes, tutorRes, examRes] = await Promise.all([
          schoolAPI.getDashboard().catch(() => null),
          tutorAPI.getAll().catch(() => null),
          examAPI.getAll().catch(() => null),
        ]);

        if (dashRes?.data?.success) {
          const data = dashRes.data.data;
          setStats(data);
          if ((data.tutorCount) === 0) {
            setShowOnboarding(true);
          }
        }
        if (tutorRes?.data?.success) {
          setTutors((tutorRes.data.data || []).slice(0, 5));
        }
        if (examRes?.data?.success) {
          setExams((examRes.data.data || []).slice(0, 5));
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
        {/* Recent Tutors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Tutors</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/school-admin/tutors')}
            >
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardHeader>
          <CardContent>
            {tutors.length > 0 ? (
              <div className="space-y-3">
                {tutors.map((tutor: any) => (
                  <div
                    key={tutor.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-700 font-semibold">
                          {(tutor.fullName || '?').charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{tutor.fullName}</p>
                        <p className="text-sm text-gray-500">{(tutor.subjects || []).join(', ') || 'No subjects'}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      (tutor.isActive) !== false
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {(tutor.isActive) !== false ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No tutors added yet</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => navigate('/school-admin/tutors')}
                >
                  Add Tutors
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Exams */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Recent Exams</CardTitle>
          </CardHeader>
          <CardContent>
            {exams.length > 0 ? (
              <div className="space-y-3">
                {exams.map((exam: any) => (
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
                        <p className="text-sm text-gray-500">{exam.categoryName || exam.category || ''} • {exam.duration} mins</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {exam.questionCount || 0} Qs
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No exams created yet</p>
                <p className="text-sm">Exams will appear here once tutors create them</p>
              </div>
            )}
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
