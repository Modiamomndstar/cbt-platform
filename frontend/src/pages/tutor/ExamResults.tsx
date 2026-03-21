import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
// import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { examAPI, resultAPI, aiAnalyticsAPI } from '@/services/api';
import { Search, TrendingUp, Award, Users, BookOpen, Download, RefreshCw, FileText, Sparkles, Loader2 } from 'lucide-react';
import { ResultDetailModal } from '@/components/tutor/ResultDetailModal';
import { toast } from 'sonner';
import { formatDate, formatTime } from '@/lib/dateUtils';
import ReactMarkdown from 'react-markdown';

export default function ExamResults() {
  // const { user } = useAuth(); // user unused

  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [searchParams] = useSearchParams();
  const urlExamId = searchParams.get('examId');

  // Filters
  const [filters, setFilters] = useState({
    examId: urlExamId || 'all',
    search: '',
    startDate: '',
    endDate: '',
    status: 'all',
    studentType: 'all' as 'all' | 'internal' | 'external',
    assessmentType: 'all'
  });

  const [stats, setStats] = useState({
    totalStudents: 0,
    completedExams: 0,
    averageScore: 0,
    passRate: 0,
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 1
  });

  // Modal State
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);

  const [detailData, setDetailData] = useState<any>(null);

  // AI Status
  const [aiCohortAnalysis, setAiCohortAnalysis] = useState<any>(null);
  const [generatingCohortAI, setGeneratingCohortAI] = useState(false);
  const [showCohortAI, setShowCohortAI] = useState(false);

  useEffect(() => {
    setAiCohortAnalysis(null);
    setShowCohortAI(false);
  }, [filters.examId]);

  const handleGenerateCohortAI = async () => {
    if (filters.examId === 'all') return;
    setGeneratingCohortAI(true);
    try {
      const response = await aiAnalyticsAPI.getExamCohortAnalysis(filters.examId);
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

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    loadResults();
  }, [filters, pagination.page]);

  const loadExams = async () => {
    try {
      const response = await examAPI.getAll();
      if (response.data.success) {
        setExams(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to load exams:', error);
    }
  };

  const loadResults = async () => {
    setLoading(true);
    try {
      const response = await resultAPI.getAll({
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      });

      if (response.data.success) {
        const data = response.data.data || [];
        setResults(data);
        setPagination(response.data.pagination);

        // Calculate partial stats from current page (or separate stats endpoint would be better for accurately showing totals)
        // For now, simple stats based on loaded data helpful enough or we can add a stats endpoint later
        calculateStats(data);
      }
    } catch (err) {
      console.error('Failed to load results:', err);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: any[]) => {
    const completed = data.filter((r: any) => ['completed', 'failed', 'expired'].includes(r.status));
    const totalScore = completed.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0);
    const avgScore = completed.length > 0 ? Math.round(totalScore / completed.length) : 0;
    const passed = completed.filter((r: any) => (r.passed)).length;
    const passRate = completed.length > 0 ? Math.round((passed / completed.length) * 100) : 0;

    setStats({
      totalStudents: new Set(data.map((r: any) => r.studentId)).size,
      completedExams: completed.length,
      averageScore: avgScore,
      passRate,
    });
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await resultAPI.exportResults(filters);

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `exam_results_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Results exported successfully');
    } catch (err) {
      console.error('Failed to export:', err);
      toast.error('Failed to export results');
    } finally {
      setExporting(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page on filter change
  };

  const renderAssessmentType = (type: string) => {
    switch (type) {
      case 'weekly_classwork': return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-[10px]">Weekly Classwork</Badge>;
      case 'assignment': return <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 text-[10px]">Assignment</Badge>;
      case 'midterm': return <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 text-[10px]">Mid-Term</Badge>;
      case 'final_exam': return <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-[10px]">Final Exam</Badge>;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500">In Progress</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'missed':
        return <Badge variant="destructive">Missed</Badge>;
      case 'disqualified':
        return <Badge className="bg-gray-700 text-white">Disqualified</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Results</h1>
          <p className="text-gray-600">View and analyze student performance</p>
        </div>
        <div className="flex gap-2 items-center">
          {filters.examId === 'all' ? (
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
          <Button variant="outline" onClick={() => loadResults()} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={handleExport} disabled={exporting || loading}>
            <Download className="h-4 w-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-blue-50 p-3 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{pagination.totalCount}</p>
            <p className="text-sm text-gray-600">Total Results</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-emerald-50 p-3 rounded-lg">
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats.completedExams}</p>
            <p className="text-sm text-gray-600">Completed (Page)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-purple-50 p-3 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats.averageScore}%</p>
            <p className="text-sm text-gray-600">Avg Score (Page)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-amber-50 p-3 rounded-lg">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats.passRate}%</p>
            <p className="text-sm text-gray-600">Pass Rate (Page)</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search name, email, ID..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>

            <Select value={filters.examId} onValueChange={(val) => handleFilterChange('examId', val)}>
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

            <Select value={filters.status} onValueChange={(val) => handleFilterChange('status', val)}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
               <Input
                 type="date"
                 value={filters.startDate}
                 onChange={(e) => handleFilterChange('startDate', e.target.value)}
                 className="w-full"
                 title="Start Date"
               />
               <Input
                 type="date"
                 value={filters.endDate}
                 onChange={(e) => handleFilterChange('endDate', e.target.value)}
                 className="w-full"
                 title="End Date"
               />
            </div>

            <Select value={filters.studentType} onValueChange={(val: any) => handleFilterChange('studentType', val)}>
              <SelectTrigger>
                <SelectValue placeholder="All Student Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Student Types</SelectItem>
                <SelectItem value="internal">Internal Students</SelectItem>
                <SelectItem value="external">External Students</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filters.assessmentType} onValueChange={(val) => handleFilterChange('assessmentType', val)}>
              <SelectTrigger>
                <SelectValue placeholder="Assessment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Assessments</SelectItem>
                <SelectItem value="weekly_classwork">Weekly Classwork</SelectItem>
                <SelectItem value="assignment">Assignment</SelectItem>
                <SelectItem value="midterm">Mid-Term</SelectItem>
                <SelectItem value="final_exam">Final Exam</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* AI Cohort Insights (Conditional) */}
      {showCohortAI && aiCohortAnalysis && (
        <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 shadow-sm relative overflow-hidden">
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

      {/* Results Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Student Results</CardTitle>
          <div className="text-sm text-gray-500">
             Showing {results.length} of {pagination.totalCount} results
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex justify-center py-12">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
             </div>
          ) : results.length > 0 ? (
            <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Exam</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Performance</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Time / Date</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {results.map((result: any) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">
                              {result.studentName || 'Unknown Student'}
                            </p>
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
                          <p className="text-sm text-gray-500">
                            {result.registrationNumber || ''}
                            {result.email && result.registrationNumber ? ' • ' : ''}
                            {result.email || ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900 leading-none mb-1">{result.examTitle || ''}</p>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="secondary" className="text-[10px] font-normal">
                              {result.examCategory || 'General'}
                            </Badge>
                            {renderAssessmentType(result.assessmentType)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {['completed', 'expired', 'failed'].includes(result.status) ? (
                          <div className="font-mono text-sm">
                            <span className="font-semibold">{result.score ?? '-'}</span>
                            <span className="text-gray-400"> / {result.totalMarks ?? '-'}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {['completed', 'expired', 'failed'].includes(result.status) ? (
                          <div className="space-y-1 w-32">
                             <div className="flex justify-between text-xs mb-1">
                               <span>{result.percentage ?? 0}%</span>
                               <span className={result.passed ? "text-emerald-600 font-bold" : "text-red-500 font-bold"}>
                                 {result.passed ? 'PASS' : 'FAIL'}
                               </span>
                             </div>
                             <div className="w-full bg-gray-200 rounded-full h-1.5">
                               <div
                                 className={`h-1.5 rounded-full ${result.passed ? 'bg-emerald-500' : 'bg-red-500'}`}
                                 style={{ width: `${Math.min(result.percentage || 0, 100)}%` }}
                               />
                             </div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          {getStatusBadge(result.status)}
                          {result.status === 'disqualified' && (
                            <span className="text-[10px] text-red-600 font-semibold leading-tight">
                              Max violations reached
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {result.submittedAt ? (
                           <div>
                             <p>{formatDate(result.submittedAt)}</p>
                             <p className="text-xs text-gray-400">{formatTime(result.submittedAt)}</p>
                           </div>
                        ) : (
                           <div>
                             <p>{formatDate(result.scheduledDate)}</p>
                             <span className="text-xs text-gray-400">Scheduled</span>
                           </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(result.id)}
                          title="View Details"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page <= 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                Next
              </Button>
            </div>
            </>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No results found matching your filters</p>
              <Button variant="link" onClick={() => setFilters({ examId: 'all', search: '', startDate: '', endDate: '', status: 'all', studentType: 'all', assessmentType: 'all' })}>
                Clear all filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
