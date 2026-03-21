import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { courseAPI } from '@/services/api';
import { toast } from 'sonner';
import { Users, ArrowLeft, Mail, Clock, CheckCircle2, Circle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/dateUtils';

export default function CourseProgress() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadData(id);
  }, [id]);

  const loadData = async (courseId: string) => {
    try {
      setLoading(true);
      const [courseRes, progressRes] = await Promise.all([
        courseAPI.getById(courseId),
        courseAPI.getStudentProgress(courseId)
      ]);

      if (courseRes.data.success) setCourse(courseRes.data.data);
      if (progressRes.data.success) setStudents(progressRes.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load progress data');
    } finally {
      setLoading(false);
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
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Progress</h1>
          <p className="text-gray-500 text-sm">Monitoring completion for "{course?.title}"</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              Enrolled Students ({students.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {students.length === 0 ? (
                <div className="text-center py-12 text-gray-500 italic">
                  No students have started this course yet.
                </div>
              ) : (
                students.map((student) => (
                  <div key={student.studentId} className="flex flex-col gap-2 p-4 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                          {student.fullName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{student.fullName}</h4>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Mail className="h-3 w-3" /> {student.email}
                            {student.categoryName && <span>• {student.categoryName}</span>}
                          </div>
                        </div>
                      </div>
                      <Badge variant={student.progressPercentage === 100 ? "default" : "secondary"}>
                        {student.progressPercentage === 100 ? 'Completed' : 'In Progress'}
                      </Badge>
                    </div>

                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-gray-600">Overall Progress</span>
                        <span className="text-indigo-600">{student.progressPercentage}%</span>
                      </div>
                      <Progress value={student.progressPercentage} className="h-2" />
                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>{student.completedCount} of {student.totalCount} lessons completed</span>
                        {student.lastActivity ? (
                          <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" /> 
                            Last active: {formatDate(student.lastActivity)}
                          </span>
                        ) : (
                          <span>No activity yet</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Course Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <p className="text-sm text-emerald-800 font-medium">Average Completion</p>
              <p className="text-3xl font-bold text-emerald-900 mt-1">
                {students.length > 0 
                  ? Math.round(students.reduce((acc, s) => acc + s.progressPercentage, 0) / students.length)
                  : 0}%
              </p>
            </div>
            
            <div className="space-y-3 pt-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500"/> Completed</span>
                <span className="font-bold">{students.filter(s => s.progressPercentage === 100).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2"><Circle className="h-4 w-4 text-amber-500"/> In Progress</span>
                <span className="font-bold">{students.filter(s => s.progressPercentage > 0 && s.progressPercentage < 100).length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 flex items-center gap-2"><Circle className="h-4 w-4 text-gray-300"/> Not Started</span>
                <span className="font-bold">{students.filter(s => s.progressPercentage === 0).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
