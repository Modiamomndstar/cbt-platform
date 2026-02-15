import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { analyticsAPI } from '@/services/api';
import { TrendingUp, School, Users, BookOpen, Award } from 'lucide-react';

export default function PlatformAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      const response = await analyticsAPI.getSuperAdminOverview();
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
        <p className="text-gray-600">Comprehensive insights across all schools</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="bg-blue-50 p-3 rounded-lg w-fit">
              <School className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold mt-3">{data?.totalSchools || 0}</p>
            <p className="text-sm text-gray-600">Active Schools</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="bg-emerald-50 p-3 rounded-lg w-fit">
              <Users className="h-5 w-5 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold mt-3">{data?.totalTutors || 0}</p>
            <p className="text-sm text-gray-600">Tutors</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="bg-purple-50 p-3 rounded-lg w-fit">
              <Award className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold mt-3">{data?.totalStudents || 0}</p>
            <p className="text-sm text-gray-600">Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="bg-amber-50 p-3 rounded-lg w-fit">
              <BookOpen className="h-5 w-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold mt-3">{data?.totalExams || 0}</p>
            <p className="text-sm text-gray-600">Total Exams</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscription Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Subscription Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.subscriptionBreakdown && data.subscriptionBreakdown.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {data.subscriptionBreakdown.map((sub: any, index: number) => (
                <div key={index} className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold">{sub.count || 0}</p>
                  <p className="text-sm text-gray-600 capitalize">
                    {sub.subscription_status || sub.subscriptionStatus || 'Unknown'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No subscription data available</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Schools */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <School className="h-5 w-5 mr-2" />
            Recent Registrations
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data?.recentSchools && data.recentSchools.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">School</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Country</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subscription</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.recentSchools.map((school: any) => (
                    <tr key={school.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {school.school_name || school.name || 'Unknown'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {school.email || '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {school.country || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          school.subscription_status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {school.subscription_status || 'Free'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {school.created_at
                          ? new Date(school.created_at).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No schools registered yet</p>
          )}
        </CardContent>
      </Card>

      {/* Revenue (if available) */}
      {data?.revenueByCurrency && data.revenueByCurrency.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Revenue Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {data.revenueByCurrency.map((rev: any, index: number) => (
                <div key={index} className="bg-emerald-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">{rev.currency || 'USD'}</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {new Intl.NumberFormat('en', {
                      style: 'currency',
                      currency: rev.currency || 'USD'
                    }).format(rev.totalRevenue || 0)}
                  </p>
                  <p className="text-sm text-gray-500">{rev.totalPayments || 0} payments</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
