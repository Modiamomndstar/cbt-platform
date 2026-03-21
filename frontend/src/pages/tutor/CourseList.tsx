import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { courseAPI, academicCalendarAPI } from '@/services/api';
import { toast } from 'sonner';
import { GraduationCap, Plus, Sparkles, BookOpen, Clock, Users, ArrowRight, MoreVertical, Copy, Archive, ArchiveRestore } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CourseList() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [academicYears, setAcademicYears] = useState<any[]>([]);
  const [cloneDialogCourse, setCloneDialogCourse] = useState<any>(null);
  const [cloneTargetYear, setCloneTargetYear] = useState('none');
  const [cloning, setCloning] = useState(false);

  useEffect(() => {
    loadCourses();
    academicCalendarAPI.getYears().then(res => {
      setAcademicYears(res.data.data || []);
    }).catch(() => {});
  }, [showArchived]);

  const loadCourses = async () => {
    try {
      setLoading(true);
      const res = await courseAPI.getAll({ includeArchived: showArchived });
      if (res.data.success) {
        setCourses(res.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async () => {
    if (!cloneDialogCourse) return;
    setCloning(true);
    try {
      const targetYearId = cloneTargetYear !== 'none' ? cloneTargetYear : undefined;
      const res = await courseAPI.clone(cloneDialogCourse.id, targetYearId);
      if (res.data.success) {
        toast.success(`"${cloneDialogCourse.title}" cloned! Redirecting to builder...`);
        setCloneDialogCourse(null);
        loadCourses();
        setTimeout(() => navigate(`/tutor/courses/${res.data.data.id}/builder`), 1200);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to clone course');
    } finally {
      setCloning(false);
    }
  };

  const handleArchive = async (course: any) => {
    try {
      const newState = !course.is_archived;
      await courseAPI.archive(course.id, newState);
      toast.success(newState ? `"${course.title}" archived` : `"${course.title}" restored`);
      loadCourses();
    } catch {
      toast.error('Failed to update course');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-indigo-600" />
            Learning Management System
          </h1>
          <p className="text-gray-500 text-sm mt-1">Create and manage interactive courses for your students</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setShowArchived(v => !v)}
            className={showArchived ? 'border-amber-300 text-amber-700 bg-amber-50' : 'border-gray-200'}
          >
            <Archive className="h-4 w-4 mr-2" />
            {showArchived ? 'Showing Archived' : 'Show Archived'}
          </Button>
          <Button
            onClick={() => navigate('/tutor/courses/create?ai=true')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            AI Course Wizard
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/tutor/courses/create')}
            className="border-gray-200"
          >
            <Plus className="h-4 w-4 mr-2" />
            Manual Create
          </Button>
        </div>
      </div>

      {courses.length === 0 ? (
        <Card className="border-dashed border-2 bg-gray-50/50">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">No courses yet</h3>
            <p className="text-gray-500 max-w-sm mt-2">
              Start by creating your first course manually or use the AI Wizard to generate a syllabus in seconds.
            </p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => navigate('/tutor/courses/create?ai=true')} className="bg-indigo-600">
                Try AI Wizard
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <Card key={course.id} className="hover:shadow-md transition-shadow group border-gray-100 overflow-hidden">
              <div className="h-2 bg-indigo-500" />
              <CardHeader className="pb-2 flex flex-row items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Badge variant={course.is_published ? "default" : "secondary"}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </Badge>
                    {course.is_archived && (
                      <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">Archived</Badge>
                    )}
                    {course.academic_year_name && (
                      <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-[10px]">
                        {course.academic_year_name}
                      </Badge>
                    )}
                    <span className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">
                      {course.category_name || 'General'}
                    </span>
                  </div>
                  <CardTitle className="text-lg font-bold group-hover:text-indigo-600 transition-colors">
                    {course.title}
                  </CardTitle>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => navigate(`/tutor/courses/${course.id}`)}>
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/tutor/courses/${course.id}/builder`)}>
                      Build Curriculum
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate(`/tutor/courses/${course.id}/progress`)}>
                      View Student Progress
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setCloneDialogCourse(course); setCloneTargetYear('none'); }}>
                      <Copy className="h-3.5 w-3.5 mr-2 text-indigo-500" /> Clone for New Session
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleArchive(course)}>
                      {course.is_archived
                        ? <><ArchiveRestore className="h-3.5 w-3.5 mr-2 text-green-500" /> Restore Course</>
                        : <><Archive className="h-3.5 w-3.5 mr-2 text-amber-500" /> Archive Course</>}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4 h-10">
                  {course.description || 'No description provided.'}
                </p>
                <div className="flex items-center justify-between py-3 border-t border-gray-50 text-gray-500">
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {course.enrollment_count || 0} Students
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {new Date(course.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button 
                    onClick={() => navigate(`/tutor/courses/${course.id}/builder`)}
                    className="flex-1 bg-gray-50 hover:bg-gray-100 text-gray-700 border-none shadow-none group/btn"
                  >
                    Manage
                    <ArrowRight className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => navigate(`/tutor/courses/${course.id}/progress`)}
                    className="border-gray-100 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                  >
                    Progress
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Clone Dialog */}
      <Dialog open={!!cloneDialogCourse} onOpenChange={() => setCloneDialogCourse(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5 text-indigo-600" />
              Clone Course for New Session
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-gray-600">
              A full copy of <strong>{cloneDialogCourse?.title}</strong> will be created — all modules and content preserved. You can then modify it independently.
            </p>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Target Academic Year</label>
              <Select value={cloneTargetYear} onValueChange={setCloneTargetYear}>
                <SelectTrigger><SelectValue placeholder="Select Year (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unlinked (General)</SelectItem>
                  {academicYears.map((y: any) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.is_active ? `✓ ${y.name} (Active)` : y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-[10px] text-gray-400 italic">Academic week pins are not copied — you'll need to re-schedule lessons on the new calendar.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloneDialogCourse(null)}>Cancel</Button>
            <Button onClick={handleClone} disabled={cloning} className="bg-indigo-600 hover:bg-indigo-700">
              {cloning ? 'Cloning...' : 'Clone Course'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
