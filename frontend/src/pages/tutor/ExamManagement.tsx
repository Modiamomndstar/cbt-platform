import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  getExamsByTutor, 
  deleteExam, 
  getQuestionsByExam,
  getExamSchedulesByExam 
} from '@/lib/dataStore';
import { Plus, Search, Trash2, Calendar, FileQuestion, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { Exam } from '@/types';

export default function ExamManagement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [filteredExams, setFilteredExams] = useState<Exam[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (user?.tutorId) {
      loadExams();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = exams.filter(exam => 
        exam.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exam.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredExams(filtered);
    } else {
      setFilteredExams(exams);
    }
  }, [searchQuery, exams]);

  const loadExams = () => {
    if (user?.tutorId) {
      const tutorExams = getExamsByTutor(user.tutorId);
      setExams(tutorExams);
      setFilteredExams(tutorExams);
    }
  };

  const handleDeleteExam = (examId: string, examTitle: string) => {
    if (confirm(`Are you sure you want to delete exam "${examTitle}"? This will also delete all questions and schedules.`)) {
      deleteExam(examId);
      toast.success('Exam deleted successfully');
      loadExams();
    }
  };

  const getExamStats = (examId: string) => {
    const questions = getQuestionsByExam(examId);
    const schedules = getExamSchedulesByExam(examId);
    return {
      questionCount: questions.length,
      scheduleCount: schedules.length,
    };
  };

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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search exams by title or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Exams Grid */}
      {filteredExams.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExams.map((exam) => {
            const stats = getExamStats(exam.id);
            return (
              <Card key={exam.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{exam.title}</CardTitle>
                      <Badge variant="secondary" className="mt-1">
                        {exam.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {exam.description || 'No description'}
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2 mb-4 text-center">
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-lg font-semibold">{exam.duration}</p>
                      <p className="text-xs text-gray-500">Minutes</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-lg font-semibold">{stats.questionCount}</p>
                      <p className="text-xs text-gray-500">Questions</p>
                    </div>
                    <div className="bg-gray-50 rounded p-2">
                      <p className="text-lg font-semibold">{stats.scheduleCount}</p>
                      <p className="text-xs text-gray-500">Scheduled</p>
                    </div>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/tutor/exams/${exam.id}/questions`)}
                    >
                      <FileQuestion className="h-4 w-4 mr-1" />
                      Questions
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => navigate(`/tutor/exams/${exam.id}/schedule`)}
                    >
                      <Calendar className="h-4 w-4 mr-1" />
                      Schedule
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteExam(exam.id, exam.title)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery ? 'No exams found' : 'No exams yet'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery 
                ? 'Try adjusting your search query' 
                : 'Create your first exam to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => navigate('/tutor/exams/create')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Exam
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
