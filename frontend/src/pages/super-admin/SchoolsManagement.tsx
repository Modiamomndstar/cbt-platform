import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { analyticsAPI } from '@/services/api';
import { Search, School, Mail } from 'lucide-react';

export default function SchoolsManagement() {
  const [schools, setSchools] = useState<any[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = schools.filter((school: any) =>
        (school.school_name || school.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (school.email || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSchools(filtered);
    } else {
      setFilteredSchools(schools);
    }
  }, [searchQuery, schools]);

  const loadSchools = async () => {
    try {
      const response = await analyticsAPI.getSuperAdminOverview();
      if (response.data.success) {
        const data = response.data.data;
        setSchools(data.recentSchools || []);
        setFilteredSchools(data.recentSchools || []);
      }
    } catch (err) {
      console.error('Failed to load schools:', err);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schools Management</h1>
          <p className="text-gray-600">View and manage all registered schools</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search schools by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Schools Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSchools.map((school: any) => (
          <Card key={school.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <School className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {school.school_name || school.name || 'Unknown School'}
                    </CardTitle>
                    <Badge
                      variant={school.subscription_status === 'active' ? 'default' : 'secondary'}
                      className={school.subscription_status === 'active' ? 'bg-emerald-500' : ''}
                    >
                      {school.subscription_status || 'Free'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {school.email || '-'}
                </div>
                {school.country && (
                  <div className="text-sm text-gray-600">
                    📍 {school.country}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>
                  Registered: {school.created_at
                    ? new Date(school.created_at).toLocaleDateString()
                    : '-'}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSchools.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <School className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No schools found' : 'No schools registered yet'}
            </h3>
            <p className="text-gray-500">
              {searchQuery ? 'Try adjusting your search query' : 'Schools will appear here once they register'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
