import { useState, useEffect } from 'react';
// import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { examAPI, resultAPI } from '@/services/api';
import { Search, TrendingUp, Award, Users, BookOpen, Download, RefreshCw, FileText } from 'lucide-react';
import { ResultDetailModal } from '@/components/tutor/ResultDetailModal';
import { toast } from 'sonner';

export default function ExamResults() {
  // const { user } = useAuth(); // user unused

  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    examId: 'all',
    search: '',
    startDate: '',
    endDate: '',
    status: 'all'
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
    const completed = data.filter((r: any) => r.status === 'completed');
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
        <div className="flex gap-2">
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
          </div>
        </CardContent>
      </Card>

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
                        <div>
                          <p className="font-medium text-gray-900">
                            {result.studentName || 'Unknown Student'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {result.registrationNumber || ''}
                            {result.email && result.registrationNumber ? ' • ' : ''}
                            {result.email || ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{result.examTitle || ''}</p>
                          <Badge variant="secondary" className="text-xs font-normal mt-0.5">
                            {result.examCategory || 'General'}
                          </Badge>
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
                        {getStatusBadge(result.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {result.submittedAt ? (
                           <div>
                             <p>{new Date(result.submittedAt).toLocaleDateString()}</p>
                             <p className="text-xs text-gray-400">{new Date(result.submittedAt).toLocaleTimeString()}</p>
                           </div>
                        ) : (
                           <div>
                             <p>{new Date(result.scheduledDate).toLocaleDateString()}</p>
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
              <Button variant="link" onClick={() => setFilters({ examId: 'all', search: '', startDate: '', endDate: '', status: 'all' })}>
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
