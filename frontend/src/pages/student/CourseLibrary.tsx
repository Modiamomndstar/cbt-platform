import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { courseAPI, academicCalendarAPI } from '@/services/api';
import { toast } from 'sonner';
import { GraduationCap, PlayCircle, BookOpen, Search, Sparkles, ArrowRight, Clock, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CourseLibrary() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [years, setYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('active');

  useEffect(() => {
    const loadYears = async () => {
      try {
        const res = await academicCalendarAPI.getYears();
        setYears(res.data.data || []);
        
        // Find active year for initial selection
        const active = res.data.data?.find((y: any) => y.is_active);
        if (selectedYear === 'active' && active) {
          setSelectedYear(active.id);
        } else if (selectedYear === 'active') {
          setSelectedYear('all');
        }
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    };
    loadYears();
  }, []);

  useEffect(() => {
    if (selectedYear !== 'active') {
      loadCourses();
    }
  }, [selectedYear]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedYear !== 'all') {
        params.yearId = selectedYear;
      }
      const res = await courseAPI.getAll(params);
      if (res.data.success) {
        setCourses(res.data.data.filter((c: any) => c.is_published));
      }
    } catch (error: any) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.category_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Search & Filter Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-7 w-7 text-emerald-600" />
            Learning Library
          </h1>
          <p className="text-gray-500 text-sm font-medium">Explore interactive courses created by your tutors</p>
        </div>
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text"
              placeholder="Search courses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-transparent rounded-xl text-sm focus:bg-white focus:border-emerald-500 outline-none transition-all"
            />
          </div>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full md:w-[200px] h-11 bg-gray-50 border-none rounded-xl">
              <Calendar className="h-4 w-4 mr-2 text-emerald-600" />
              <SelectValue placeholder="Select Session" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sessions (History)</SelectItem>
              {years.map(y => (
                <SelectItem key={y.id} value={y.id}>{y.name} {y.is_active ? '(Active)' : ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredCourses.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-2xl border border-gray-100 italic text-gray-400">
           {searchTerm ? 'No courses match your search.' : 'No courses are available in the library yet.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCourses.map((course) => (
            <Card key={course.id} className="relative overflow-hidden group border-gray-100 hover:border-emerald-200 hover:shadow-xl hover:shadow-emerald-50/50 transition-all duration-300">
               {/* Premium Banner */}
               <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-emerald-400 to-teal-500" />
               
               <CardHeader className="pt-6 relative">
                 <div className="flex justify-between items-start mb-3">
                   <Badge className="bg-emerald-50 text-emerald-700 border-none px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                     {course.category_name || 'General'}
                   </Badge>
                   <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-full">
                     <Sparkles className="h-3 w-3" />
                     AI Assisted
                   </div>
                 </div>
                 <CardTitle className="text-xl font-black text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2 leading-tight h-14">
                   {course.title}
                 </CardTitle>
                 <p className="text-xs text-gray-500 font-medium">By {course.tutor_name}</p>
               </CardHeader>

               <CardContent className="space-y-6">
                 <p className="text-sm text-gray-500 line-clamp-3 min-h-[60px]">
                   {course.description || 'No detailed description available for this course.'}
                 </p>

                 {/* Stats */}
                 <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Duration</span>
                      <div className="flex items-center gap-1.5 text-gray-700 font-black text-xs">
                        <Clock className="h-3.5 w-3.5 text-emerald-500" />
                        Self-Paced
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Modules</span>
                      <div className="flex items-center gap-1.5 text-gray-700 font-black text-xs">
                        <BookOpen className="h-3.5 w-3.5 text-emerald-500" />
                        Interactive
                      </div>
                    </div>
                 </div>

                 <Button 
                   onClick={() => navigate(`/student/courses/${course.id}`)}
                   className="w-full h-12 bg-gray-900 hover:bg-emerald-600 text-white font-black rounded-xl group/btn transition-all duration-300"
                 >
                   <PlayCircle className="h-5 w-5 mr-2 group-hover/btn:scale-110 transition-transform" />
                   Start Learning
                   <ArrowRight className="h-4 w-4 ml-auto opacity-0 group-hover/btn:opacity-100 group-hover/btn:translate-x-1 transition-all" />
                 </Button>
               </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
