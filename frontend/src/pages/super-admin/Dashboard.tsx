import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { analyticsAPI } from '@/services/api';
import {
  School,
  Users,
  BookOpen,
  GraduationCap,
} from 'lucide-react';

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalTutors: 0,
    totalStudents: 0,
    totalExams: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await analyticsAPI.getSuperAdminOverview();
      if (response.data.success) {
        const data = response.data.data;
        setStats({
          totalSchools: data.totalSchools || 0,
          totalTutors: data.totalTutors || 0,
          totalStudents: data.totalStudents || 0,
          totalExams: data.totalExams || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Schools',
      value: stats.totalSchools,
      icon: School,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Tutors',
      value: stats.totalTutors,
      icon: GraduationCap,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      title: 'Total Exams',
      value: stats.totalExams,
      icon: BookOpen,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50'
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
        <p className="text-gray-600">Overview of the entire CBT platform</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* Welcome Card */}
      <Card className="bg-gradient-to-r from-slate-800 to-slate-900 text-white">
        <CardContent className="p-8">
          <h2 className="text-2xl font-bold mb-2">Welcome to Super Admin Panel</h2>
          <p className="text-slate-300 mb-4">
            As the platform administrator, you have full visibility and control over all schools,
            tutors, students, and exams on the CBT Platform.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-sm text-slate-400">Quick Links</p>
              <ul className="mt-2 space-y-1 text-sm">
                <li>• View all registered schools</li>
                <li>• Monitor platform analytics</li>
                <li>• Manage system settings</li>
              </ul>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-sm text-slate-400">Platform Health</p>
              <div className="mt-2 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Schools</span>
                  <span className="text-emerald-400">Active</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>System</span>
                  <span className="text-emerald-400">Operational</span>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <p className="text-sm text-slate-400">Recent Activity</p>
              <p className="mt-2 text-sm text-slate-300">
                {stats.totalSchools} schools registered<br />
                {stats.totalExams} total exams
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
