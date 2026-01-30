import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  getExamsByTutor,
  getStudentExams,
  getStudentsByTutor
} from '@/lib/dataStore';
import { exportToCSV } from '@/lib/csvParser';
import { Search, Download, FileSpreadsheet, TrendingUp, Award, Users, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { Exam, StudentExam } from '@/types';

interface ResultWithDetails extends StudentExam {
  studentName: string;
  studentId: string;
  examTitle: string;
  examCategory: string;
}

export default function ExamResults() {
  const { user } = useAuth();

  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ResultWithDetails[]>([]);
  const [filteredResults, setFilteredResults] = useState<ResultWithDetails[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    totalStudents: 0,
    completedExams: 0,
    averageScore: 0,
    passRate: 0,
  });

  useEffect(() => {
    if (user?.tutorId) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    let filtered = results;

    if (selectedExam !== 'all') {
      filtered = filtered.filter(r => r.examId === selectedExam);
    }

    if (searchQuery) {
      filtered = filtered.filter(r =>
        r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.studentId.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredResults(filtered);
  }, [selectedExam, searchQuery, results]);

  const loadData = () => {
    if (!user?.tutorId) return;

    const tutorExams = getExamsByTutor(user.tutorId);
    setExams(tutorExams);

    const examIds = tutorExams.map(e => e.id);
    const allStudentExams = getStudentExams().filter(se => examIds.includes(se.examId));
    const students = getStudentsByTutor(user.tutorId);

    const resultsWithDetails: ResultWithDetails[] = allStudentExams.map(se => {
      const student = students.find(s => s.id === se.studentId);
      const exam = tutorExams.find(e => e.id === se.examId);
      return {
        ...se,
        studentName: student?.fullName || 'Unknown',
        studentId: student?.studentId || 'Unknown',
        examTitle: exam?.title || 'Unknown',
        examCategory: exam?.category || 'Unknown',
      };
    });

    setResults(resultsWithDetails);
    setFilteredResults(resultsWithDetails);

    // Calculate stats
    const completed = resultsWithDetails.filter(r => r.status === 'completed');
    const totalScore = completed.reduce((sum, r) => sum + r.percentage, 0);
    const avgScore = completed.length > 0 ? Math.round(totalScore / completed.length) : 0;
    const passed = completed.filter(r => r.percentage >= 50).length;
    const passRate = completed.length > 0 ? Math.round((passed / completed.length) * 100) : 0;

    setStats({
      totalStudents: students.length,
      completedExams: completed.length,
      averageScore: avgScore,
      passRate,
    });
  };

  const handleExportCSV = () => {
    const data = filteredResults.map(r => ({
      'Student ID': r.studentId,
      'Student Name': r.studentName,
      'Exam': r.examTitle,
      'Category': r.examCategory,
      'Score': r.score,
      'Total Marks': r.totalMarks,
      'Percentage': `${r.percentage}%`,
      'Status': r.status,
      'Time Spent (min)': Math.round(r.timeSpent / 60),
      'Submitted At': r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-',
    }));
    exportToCSV(data, 'exam_results');
    toast.success('Results exported to CSV');
  };

  const handleExportExcel = () => {
    const data = filteredResults.map(r => ({
      'Student ID': r.studentId,
      'Student Name': r.studentName,
      'Exam': r.examTitle,
      'Category': r.examCategory,
      'Score': r.score,
      'Total Marks': r.totalMarks,
      'Percentage': `${r.percentage}%`,
      'Status': r.status,
      'Time Spent (min)': Math.round(r.timeSpent / 60),
      'Submitted At': r.submittedAt ? new Date(r.submittedAt).toLocaleString() : '-',
    }));
    exportToCSV(data, 'exam_results');
    toast.success('Results exported to Excel');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-500">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500">In Progress</Badge>;
      case 'timeout':
        return <Badge variant="destructive">Timeout</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Exam Results</h1>
          <p className="text-gray-600">View and export student performance data</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="bg-blue-50 p-3 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold mt-3">{stats.totalStudents}</p>
            <p className="text-sm text-gray-600">Total Students</p>
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
            <p className="text-sm text-gray-600">Completed Exams</p>
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
            <p className="text-2xl font-bold mt-3">{stats.passRate}%</p>
            <p className="text-sm text-gray-600">Pass Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="sm:w-64">
          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by exam" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Exams</SelectItem>
              {exams.map(exam => (
                <SelectItem key={exam.id} value={exam.id}>{exam.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by student name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Student Results ({filteredResults.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Exam</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Score</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Percentage</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Time Spent</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Submitted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{result.studentName}</p>
                          <p className="text-sm text-gray-500">{result.studentId}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{result.examTitle}</p>
                          <p className="text-sm text-gray-500">{result.examCategory}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {result.score} / {result.totalMarks}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                result.percentage >= 70 ? 'bg-emerald-500' :
                                result.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${result.percentage}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{result.percentage}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(result.status)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {Math.round(result.timeSpent / 60)} min
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {result.submittedAt
                          ? new Date(result.submittedAt).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No results found</p>
              <p className="text-sm text-gray-400 mt-1">
                Results will appear here once students complete their exams
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
