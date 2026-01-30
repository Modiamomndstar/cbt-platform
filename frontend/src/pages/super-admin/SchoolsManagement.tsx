import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  getSchools, 
  updateSchool,
  getTutorsBySchool,
  getStudentsBySchool,
  getExamsBySchool 
} from '@/lib/dataStore';
import { Search, School, Mail, Phone, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { School as SchoolType } from '@/types';

interface SchoolWithStats extends SchoolType {
  tutorCount: number;
  studentCount: number;
  examCount: number;
}

export default function SchoolsManagement() {
  const [schools, setSchools] = useState<SchoolWithStats[]>([]);
  const [filteredSchools, setFilteredSchools] = useState<SchoolWithStats[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = schools.filter(school => 
        school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        school.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSchools(filtered);
    } else {
      setFilteredSchools(schools);
    }
  }, [searchQuery, schools]);

  const loadSchools = () => {
    const allSchools = getSchools();
    const schoolsWithStats = allSchools.map(school => ({
      ...school,
      tutorCount: getTutorsBySchool(school.id).length,
      studentCount: getStudentsBySchool(school.id).length,
      examCount: getExamsBySchool(school.id).length,
    }));
    setSchools(schoolsWithStats);
    setFilteredSchools(schoolsWithStats);
  };

  const toggleSchoolStatus = (school: SchoolWithStats) => {
    updateSchool(school.id, { isActive: !school.isActive });
    toast.success(`School ${school.isActive ? 'deactivated' : 'activated'} successfully`);
    loadSchools();
  };

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
        {filteredSchools.map((school) => (
          <Card key={school.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3">
                  {school.logo ? (
                    <img 
                      src={school.logo} 
                      alt={school.name} 
                      className="h-12 w-12 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <School className="h-6 w-6 text-indigo-600" />
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-lg">{school.name}</CardTitle>
                    <Badge 
                      variant={school.isActive ? 'default' : 'secondary'}
                      className={school.isActive ? 'bg-emerald-500' : ''}
                    >
                      {school.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="h-4 w-4 mr-2" />
                  {school.email}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  {school.phone}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="bg-gray-50 rounded p-2 text-center">
                  <p className="text-lg font-semibold">{school.tutorCount}</p>
                  <p className="text-xs text-gray-500">Tutors</p>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <p className="text-lg font-semibold">{school.studentCount}</p>
                  <p className="text-xs text-gray-500">Students</p>
                </div>
                <div className="bg-gray-50 rounded p-2 text-center">
                  <p className="text-lg font-semibold">{school.examCount}</p>
                  <p className="text-xs text-gray-500">Exams</p>
                </div>
              </div>

              <div className="flex justify-between items-center text-sm text-gray-500">
                <span>Registered: {new Date(school.createdAt).toLocaleDateString()}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSchoolStatus(school)}
                  className={school.isActive ? 'text-red-600 hover:text-red-700' : 'text-emerald-600 hover:text-emerald-700'}
                >
                  {school.isActive ? (
                    <>
                      <XCircle className="h-4 w-4 mr-1" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Activate
                    </>
                  )}
                </Button>
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
