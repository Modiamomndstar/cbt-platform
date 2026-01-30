import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  getSchoolDashboardStats, 
  getTutorsBySchool, 
  getExamsBySchool 
} from '@/lib/dataStore';
import { 
  Users, 
  BookOpen, 
  FileQuestion, 
  CheckCircle, 
  TrendingUp,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { DashboardStats, Tutor, Exam } from '@/types';

export default function SchoolAdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);

  useEffect(() => {
    if (user?.schoolId) {
      const dashboardStats = getSchoolDashboardStats(user.schoolId);
      setStats(dashboardStats);
      setTutors(getTutorsBySchool(user.schoolId).slice(0, 5));
      setExams(getExamsBySchool(user.schoolId).slice(0, 5));
    }
  }, [user]);

  const statCards = [
    { 
      title: 'Total Tutors', 
      value: tutors.length, 
      icon: Users, 
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    { 
      title: 'Total Students', 
      value: stats?.totalStudents || 0, 
      icon: Users, 
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    { 
      title: 'Total Exams', 
      value: stats?.totalExams || 0, 
      icon: BookOpen, 
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    { 
      title: 'Total Questions', 
      value: stats?.totalQuestions || 0, 
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
      value: `${stats?.averageScore || 0}%`, 
      icon: TrendingUp, 
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50'
    },
  ];

  return (
    <div className="space-y-6">
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
                {tutors.map((tutor) => (
                  <div 
                    key={tutor.id} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <span className="text-indigo-700 font-semibold">
                          {tutor.fullName.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{tutor.fullName}</p>
                        <p className="text-sm text-gray-500">{tutor.subjects.join(', ')}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      tutor.isActive 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {tutor.isActive ? 'Active' : 'Inactive'}
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
                {exams.map((exam) => (
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
                        <p className="text-sm text-gray-500">{exam.category} • {exam.duration} mins</p>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">
                      {exam.totalQuestions} Qs
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
              className="h-auto py-4 flex flex-col items-center text-center"
              onClick={() => navigate('/school-admin/analytics')}
            >
              <TrendingUp className="h-6 w-6 mb-2" />
              <span className="font-medium">View Analytics</span>
              <span className="text-xs text-gray-500 mt-1">Performance reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
