import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { resultAPI, examAPI, aiAnalyticsAPI } from '@/services/api';
import {
  Award,
  BookOpen,
  User,
  Search,
  Filter,
  FileText,
  Download,
  Calendar,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/dateUtils';
import { ResultDetailModal } from '@/components/tutor/ResultDetailModal';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

export default function Results() {
  const [results, setResults] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedExamId, setSelectedExamId] = useState<string>('all');

  // AI State
  const [aiCohortAnalysis, setAiCohortAnalysis] = useState<any>(null);
  const [generatingCohortAI, setGeneratingCohortAI] = useState(false);
  const [showCohortAI, setShowCohortAI] = useState(false);

  // Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<any>(null);

  useEffect(() => {
    loadResults();
    loadExams();
  }, []);

  useEffect(() => {
    setAiCohortAnalysis(null);
    setShowCohortAI(false);
  }, [selectedExamId]);

  const loadExams = async () => {
    try {
      const response = await examAPI.getAll();
      if (response.data.success) {
        setExams(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load exams', err);
    }
  };

  useEffect(() => {
    if (selectedResultId) {
      const fetchDetail = async () => {
        try {
          const res = await resultAPI.getResultDetail(selectedResultId);
          setDetailData(res.data.data);
        } catch (err) {
          console.error(err);
          toast.error('Failed to load details');
        }
      };
      fetchDetail();
    }
  }, [selectedResultId]);

  const handleViewDetails = (id: string) => {
    setSelectedResultId(id);
    setIsDetailOpen(true);
  };

  const handleGenerateCohortAI = async () => {
    if (selectedExamId === 'all') return;
    setGeneratingCohortAI(true);
    try {
      const response = await aiAnalyticsAPI.getExamCohortAnalysis(selectedExamId);
      if (response.data.success) {
        setAiCohortAnalysis(response.data.data);
        setShowCohortAI(true);
        toast.success("Cohort AI Analysis generated successfully!");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to generate AI analysis');
    } finally {
      setGeneratingCohortAI(false);
    }
  };

  const loadResults = async () => {
    try {
      const response = await resultAPI.getAll();
      if (response.data.success) {
        setResults(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = results.filter(r => {
    const matchesSearch = (r.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.examTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (r.tutorName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesExam = selectedExamId === 'all' || r.examId === selectedExamId;
    return matchesSearch && matchesExam;
  });

  const getScoreColor = (score: number, passing: number) => {
    if (score >= passing) return 'text-green-600 font-bold';
    return 'text-red-600 font-bold';
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
          <h1 className="text-2xl font-bold text-gray-900">Exam Results</h1>
          <p className="text-gray-600">Review performance across all exams in your school</p>
        </div>
        <div className="flex gap-2 items-center">
          {selectedExamId === 'all' ? (
            <div className="hidden md:flex items-center text-xs font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
              Pick an exam for AI Insights
            </div>
          ) : (
            <Button
              onClick={handleGenerateCohortAI}
              disabled={generatingCohortAI || loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {generatingCohortAI ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              AI Insights
            </Button>
          )}
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
        <div className="relative flex-1 max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search students, exams, or tutors..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64">
           <Select value={selectedExamId} onValueChange={setSelectedExamId}>
             <SelectTrigger>
               <SelectValue placeholder="All Exams" />
             </SelectTrigger>
             <SelectContent>
               <SelectItem value="all">All Exams</SelectItem>
               {exams.map((exam: any) => (
                 <SelectItem key={exam.id} value={exam.id}>{exam.title}</SelectItem>
               ))}
             </SelectContent>
           </Select>
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

      {showCohortAI && aiCohortAnalysis && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 shadow-sm relative overflow-hidden mb-6">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl -ml-16 -mb-16"></div>
          <CardHeader className="pb-2 border-b border-indigo-100/50">
            <CardTitle className="flex items-center text-indigo-900">
              <Sparkles className="h-5 w-5 mr-2 text-indigo-600" />
              AI Cohort Performance Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 relative z-10">
            <div className="prose prose-sm md:prose-base prose-indigo max-w-none text-slate-700">
               <ReactMarkdown>{aiCohortAnalysis.analysisMarkdown}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {filteredResults.length > 0 ? (
        <div className="grid gap-4">
          {filteredResults.map((result: any) => (
            <Card key={result.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        <User className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">{result.studentName}</p>
                          {result.isExternal ? (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-indigo-600 bg-indigo-50 border-indigo-200">
                              External
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] h-4 px-1 text-emerald-600 bg-emerald-50 border-emerald-200">
                              Internal
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">ID: {result.studentIdNum || 'N/A'}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <BookOpen className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{result.examTitle}</p>
                        <p className="text-xs text-gray-500">Tutor: {result.tutorName}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <Award className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          Score: <span className={getScoreColor((result.score / result.totalMarks) * 100, result.passingScore)}>
                            {Math.round((result.score / result.totalMarks) * 100)}%
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {result.score}/{result.totalMarks} marks
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-900">
                          {formatDate(result.completedAt || result.createdAt)}
                        </p>
                        <Badge
                          variant={
                            result.status === 'completed' || result.status === 'graded'
                              ? 'default'
                              : result.status === 'pending_grading'
                                ? 'outline'
                                : 'secondary'
                          }
                          className={`mt-1 text-[10px] h-4 ${
                            result.status === 'pending_grading' ? 'border-amber-200 text-amber-700 bg-amber-50' : ''
                          }`}
                        >
                          {result.status?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetails(result.id)}
                      title="View Details"
                    >
                      <FileText className="h-4 w-4" />
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
            <Award className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No results yet</h3>
            <p className="text-gray-500">Student performance data will appear here</p>
          </CardContent>
        </Card>
      )}

      <ResultDetailModal
        isOpen={isDetailOpen}
        onClose={() => {
           setIsDetailOpen(false);
           setSelectedResultId(null);
        }}
        result={detailData || null}
      />
    </div>
  );
}
