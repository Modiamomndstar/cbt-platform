import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { examAPI } from '@/services/api';
import {
  BookOpen,
  Plus,
  Trash2,
  FileQuestion,
  Calendar,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ExamManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [examToDelete, setExamToDelete] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    loadExams();
  }, [user]);

  const loadExams = async () => {
    try {
      const response = await examAPI.getAll();
      if (response.data.success) {
        setExams(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;

    try {
      await examAPI.delete(examToDelete.id);
      toast.success('Exam deleted successfully');
      loadExams();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete exam';
      toast.error(msg);
    } finally {
      setExamToDelete(null);
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
          <h1 className="text-2xl font-bold text-gray-900">Exam Management</h1>
          <p className="text-gray-600">Create and manage your exams</p>
        </div>
        <Button onClick={() => navigate('/tutor/exams/create')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Exam
        </Button>
      </div>

      {exams.length > 0 ? (
        <div className="grid gap-4">
          {exams.map((exam: any) => (
            <Card key={exam.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                      <BookOpen className="h-6 w-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{exam.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {exam.category && (
                          <Badge variant="outline">{exam.category || exam.category_name}</Badge>
                        )}
                        <span className="text-sm text-gray-500">{exam.duration} mins</span>
                        <span className="text-sm text-gray-500">
                          • {exam.total_questions || exam.question_count || 0} questions
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/tutor/exams/${exam.id}/questions`)}
                    >
                      <FileQuestion className="h-4 w-4 mr-2" />
                      Questions
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/tutor/exams/${exam.id}/schedule`)}
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Schedule
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExamToDelete({ id: exam.id, title: exam.title })}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No exams yet</h3>
            <p className="text-gray-500 mb-4">Create your first exam to get started</p>
            <Button onClick={() => navigate('/tutor/exams/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Exam
            </Button>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!examToDelete} onOpenChange={(open) => !open && setExamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{examToDelete?.title}"? This action cannot be undone and will delete all associated questions and schedules.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteExam} className="bg-red-600 hover:bg-red-700">
              Delete Exam
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
