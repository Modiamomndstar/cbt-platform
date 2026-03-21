import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { courseAPI, academicCalendarAPI } from '@/services/api';
import { toast } from 'sonner';
import { GraduationCap, BookOpen, Users, Search, Eye, BarChart2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function LMSCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [coursesRes, yearsRes] = await Promise.all([
        courseAPI.getAll(),
        academicCalendarAPI.getYears()
      ]);

      if (coursesRes.data.success) setCourses(coursesRes.data.data);
      if (yearsRes.data.success) setAcademicYears(yearsRes.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         course.tutor_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesYear = selectedYear === 'all' || course.academic_year_id === selectedYear;
    return matchesSearch && matchesYear;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-indigo-600" />
            LMS Content Oversight
          </h1>
          <p className="text-gray-500 text-sm mt-1">Review tutor-created courses and monitor student progression school-wide</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search by course title or tutor name..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger>
              <SelectValue placeholder="All Academic Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Academic Years</SelectItem>
              {academicYears.map(year => (
                <SelectItem key={year.id} value={year.id}>{year.name} {year.is_active && '(Active)'}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <Card className="border-dashed border-2 bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <BookOpen className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">No courses found</h3>
            <p className="text-gray-500 max-w-sm mt-2">
              Tutors haven't created any courses matching these filters yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow group border-gray-100 overflow-hidden">
              <div className="h-1.5 bg-indigo-500" />
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={course.is_published ? "default" : "secondary"}>
                        {course.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        {course.category_name || 'General'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {course.title}
                    </h3>
                    <p className="text-sm text-indigo-600 font-medium flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      Tutor: {course.tutor_name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50 my-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-gray-400 text-xs font-medium uppercase">Enrollment</p>
                    <p className="font-bold text-gray-900">{course.enrollment_count || 0} Students</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 text-xs font-medium uppercase">Last Updated</p>
                    <p className="font-bold text-gray-900">{new Date(course.updated_at || course.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={() => navigate(`/school-admin/courses/${course.id}/review`)}
                    className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border-gray-200"
                    variant="outline"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Review Content
                  </Button>
                  <Button 
                    onClick={() => navigate(`/school-admin/courses/${course.id}/progress`)}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                  >
                    <BarChart2 className="h-4 w-4 mr-2" />
                    View Progress
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
