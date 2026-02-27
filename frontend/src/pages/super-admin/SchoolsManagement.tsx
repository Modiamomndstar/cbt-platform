import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { superAdminAPI } from '@/services/api';
import { Search, School, Mail, ShieldCheck, Filter, Globe } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function SchoolsManagement() {
  const navigate = useNavigate();
  const [schools, setSchools] = useState<any[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    let filtered = schools;

    if (searchQuery) {
      filtered = filtered.filter((school: any) =>
        (school.school_name || school.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (school.email || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (selectedCountry !== 'all') {
      filtered = filtered.filter((school: any) => school.country === selectedCountry);
    }

    setFilteredSchools(filtered);
  }, [searchQuery, selectedCountry, schools]);

  const loadSchools = async () => {
    try {
      const response = await superAdminAPI.getSchools();
      if (response.data.success) {
        setSchools(response.data.data || []);
        setFilteredSchools(response.data.data || []);
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

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search schools by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
            <SelectTrigger className="w-full bg-white">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-gray-400" />
                <SelectValue placeholder="Filter by Country" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {Array.from(new Set(schools.map(s => s.country).filter(Boolean))).sort().map(country => (
                <SelectItem key={country as string} value={country as string}>{country as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Schools Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSchools.map((school: any) => (
          <Card 
            key={school.id} 
            className="hover:shadow-lg transition-all cursor-pointer hover:-translate-y-1"
            onClick={() => navigate(`/super-admin/schools/${school.id}`)}
          >
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
                      variant={school.plan_status === 'active' ? 'default' : 'secondary'}
                      className={school.plan_status === 'active' ? 'bg-emerald-500' : ''}
                    >
                      {school.plan_status || 'Free'}
                    </Badge>
                    {school.override_plan && (
                      <Badge variant="outline" className="ml-2 border-indigo-200 text-indigo-700 bg-indigo-50 flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" /> {school.override_plan}
                      </Badge>
                    )}
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
