import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { resultAPI, academicCalendarAPI } from '@/services/api';
import { Award, CheckCircle, Clock, TrendingUp, Calendar } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StudentResults() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [stats, setStats] = useState({
    totalExams: 0,
    averageScore: 0,
    highestScore: 0,
    totalTimeSpent: 0,
  });

  useEffect(() => {
    const loadYears = async () => {
      try {
        const res = await academicCalendarAPI.getYears();
        setYears(res.data.data || []);
      } catch (err) {
        console.error('Failed to load sessions:', err);
      }
    };
    loadYears();
  }, []);

  useEffect(() => {
    loadResults();
  }, [user, selectedYear]);

  const loadResults = async () => {
    setLoading(true);
    try {
      const params = selectedYear !== 'all' ? { yearId: selectedYear } : {};
      const response = await resultAPI.getMyHistory(params);
      if (response.data.success) {
        const allResults = (response.data.data || [])
          .filter((r: any) => ['completed', 'failed', 'pending_grading', 'disqualified'].includes(r.status))
          .sort((a: any, b: any) => {
            const dateA = new Date(a.submittedAt || a.createdAt || 0).getTime();
            const dateB = new Date(b.submittedAt || b.createdAt || 0).getTime();
            return dateB - dateA;
          });

        setResults(allResults);

        // Calculate stats
        if (allResults.length > 0) {
          const totalScore = allResults.reduce((sum: number, r: any) => sum + (r.percentage || 0), 0);
          const highest = Math.max(...allResults.map((r: any) => r.percentage || 0));
          const totalTime = allResults.reduce((sum: number, r: any) => sum + (r.timeSpent || 0), 0);

          setStats({
            totalExams: allResults.length,
            averageScore: Math.round(totalScore / allResults.length),
            highestScore: Math.round(highest),
            totalTimeSpent: totalTime,
          });
        }
      }
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 70) return 'text-emerald-600';
    if (percentage >= 50) return 'text-amber-600';
    return 'text-red-600';
  };

  const getScoreBg = (percentage: number) => {
    if (percentage >= 70) return 'bg-emerald-50';
    if (percentage >= 50) return 'bg-amber-50';
    return 'bg-red-50';
  };

  const renderAssessmentType = (type: string) => {
    switch (type) {
      case 'weekly_classwork': return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50 text-[10px] h-4">Weekly Classwork</Badge>;
      case 'assignment': return <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50 text-[10px] h-4">Assignment</Badge>;
      case 'midterm': return <Badge variant="outline" className="border-orange-200 text-orange-700 bg-orange-50 text-[10px] h-4">Mid-Term</Badge>;
      case 'final_exam': return <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-[10px] h-4">Final Exam</Badge>;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
          <p className="text-gray-600">View your exam performance history</p>
        </div>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[200px] bg-white">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="Filter by Session" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sessions (Global)</SelectItem>
            {years.map(y => (
              <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-blue-50 p-3 rounded-lg">
                <CheckCircle className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats.totalExams}</p>
            <p className="text-sm text-gray-600">Exams Completed</p>
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
            <p className="text-sm text-gray-600">Average Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-amber-50 p-3 rounded-lg">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats.highestScore}%</p>
            <p className="text-sm text-gray-600">Highest Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-emerald-50 p-3 rounded-lg">
                <Clock className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">
              {Math.round(stats.totalTimeSpent / 60)}
            </p>
            <p className="text-sm text-gray-600">Total Minutes</p>
          </CardContent>
        </Card>
      </div>

      {/* Results List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Exam History</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length > 0 ? (
            <div className="space-y-4">
              {results.map((result: any) => (
                <div
                  key={result.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/student/results/${result.id}`)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 leading-none">
                          {result.examTitle || 'Exam'}
                        </h3>
                        {renderAssessmentType(result.assessmentType)}
                      </div>
                      <p className="text-sm text-gray-500">
                        {result.examCategory || ''}
                      </p>
                    </div>
                     <div className={`px-4 py-2 rounded-lg flex flex-col items-center justify-center min-w-[80px] ${
                      result.status === 'pending_grading' ? 'bg-blue-50' :
                      result.status === 'disqualified' ? 'bg-gray-100' :
                      getScoreBg(result.percentage || 0)
                    }`}>
                      <span className={`text-2xl font-bold ${
                        result.status === 'pending_grading' ? 'text-blue-600' :
                        result.status === 'disqualified' ? 'text-gray-600' :
                        getScoreColor(result.percentage || 0)
                      }`}>
                        {result.status === 'pending_grading' ? '...' :
                         result.status === 'disqualified' ? '!' : `${Math.round(result.percentage || 0)}%`}
                      </span>
                      {result.status === 'pending_grading' && (
                        <span className="text-[8px] font-bold text-blue-500 uppercase">Pending</span>
                      )}
                      {result.status === 'disqualified' && (
                        <span className="text-[8px] font-bold text-red-500 uppercase">DQ</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Score</p>
                      <p className="font-medium">
                        {result.score || 0} / {result.totalMarks || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Time Spent</p>
                      <p className="font-medium">
                        {Math.round((result.timeSpent || 0) / 60)} minutes
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500">Submitted</p>
                      <p className="font-medium">
                        {formatDate(result.submittedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          (result.percentage || 0) >= 70 ? 'bg-emerald-500' :
                          (result.percentage || 0) >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.min(result.percentage || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Award className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No completed exams yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Your exam results will appear here after you complete exams
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
