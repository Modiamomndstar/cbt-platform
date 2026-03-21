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
  FolderOpen,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import api from '@/services/api';

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

  const [categories, setCategories] = useState<any[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#8B5CF6');
  const [categoryDesc, setCategoryDesc] = useState('');

  useEffect(() => {
    loadExams();
    loadCategories();
  }, [user]);

  const loadCategories = async () => {
    try {
      const res = await api.get('/exam-categories');
      setCategories(res.data.data || []);
    } catch (_err) { /* no-op */ }
  };

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

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;
    try {
      const res = await api.post('/exam-categories', { name: categoryName, color: categoryColor, description: categoryDesc });
      setCategories([...categories, res.data.data]);
      setCategoryName(''); setCategoryDesc(''); setCategoryColor('#8B5CF6');
      toast.success('Exam Category created');
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to create category'); }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Exams in this category will become uncategorized.`)) return;
    try {
      await api.delete(`/exam-categories/${id}`);
      setCategories(categories.filter(c => c.id !== id));
      toast.success('Category deleted');
      loadExams();
    } catch (e) { toast.error('Failed to delete category'); }
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
          <h1 className="text-2xl font-bold text-gray-900">Exam & Course Management</h1>
          <p className="text-gray-600">Create and manage your exams and courses</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
            <FolderOpen className="w-4 h-4 mr-2" />
            Manage Subjects / Courses
          </Button>
          <Button onClick={() => navigate('/tutor/exams/create')}>
            <Plus className="h-4 w-4 mr-2" />
            Create Exam
          </Button>
        </div>
      </div>

      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subjects / Courses</DialogTitle>
            <DialogDescription>Define your academic subjects or courses (e.g., Mathematics, ENG101). These represent the knowledge area being assessed.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-md">
              <form onSubmit={handleCreateCategory} className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Subject/Course Name (e.g. Mathematics)" value={categoryName} onChange={e => setCategoryName(e.target.value)} required/>
                  <Input type="color" value={categoryColor} onChange={e => setCategoryColor(e.target.value)} className="w-14 px-1" title="Badge Color"/>
                </div>
                <Input placeholder="Description (optional)" value={categoryDesc} onChange={e => setCategoryDesc(e.target.value)} />
                <Button type="submit" className="w-full" size="sm">Create Subject/Course</Button>
              </form>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center border p-3 rounded-md">
                   <div>
                     <Badge style={{ backgroundColor: cat.color }}>{cat.name}</Badge>
                     <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                   </div>
                   <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(cat.id, cat.name)}>
                     <Trash2 className="w-4 h-4 text-red-500"/>
                   </Button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-center text-muted-foreground">No custom categories yet.</p>}
            </div>
          </div>
          <DialogFooter><Button onClick={() => setIsCategoryModalOpen(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

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
                        {exam.categoryName && (
                           <Badge style={{ backgroundColor: exam.categoryColor || '#8B5CF6', color: 'white' }} className="text-[10px] h-4 px-2 pb-0 shadow-sm border-none leading-none items-center">{exam.categoryName}</Badge>
                        )}
                        {exam.examTypeName && (
                           <Badge style={{ backgroundColor: exam.examTypeColor || '#4F46E5', color: 'white' }} className="text-[10px] h-4 px-2 pb-0 shadow-sm border-none leading-none items-center">{exam.examTypeName}</Badge>
                        )}
                        {!exam.examTypeName && exam.examType && (
                           <Badge variant="outline" className="text-[10px] h-4 px-2 pb-0 border-indigo-200 text-indigo-700 leading-none items-center capitalize">{exam.examType.replace('_', ' ')}</Badge>
                        )}
                        {exam.academicSession && (
                           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{exam.academicSession}</span>
                        )}
                        <span className="text-sm text-gray-500">• {exam.duration} mins</span>
                        <span className="text-sm text-gray-500">
                          • {exam.totalQuestions || 0} questions
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
                      variant="outline"
                      size="sm"
                      className="text-indigo-600 border-indigo-100 hover:bg-indigo-50"
                      onClick={() => navigate(`/tutor/results?examId=${exam.id}`)}
                    >
                      <Sparkles className="h-4 w-4 mr-2 text-indigo-500" />
                      Analyze
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
