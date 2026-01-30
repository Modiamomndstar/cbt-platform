import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  getStudentExamsByStudent,
  getExamById 
} from '@/lib/dataStore';
import { Award, CheckCircle, Clock, TrendingUp } from 'lucide-react';
import type { StudentExam } from '@/types';

interface ResultWithExam extends StudentExam {
  examTitle: string;
  examCategory: string;
}

export default function StudentResults() {
  const { user } = useAuth();
  const [results, setResults] = useState<ResultWithExam[]>([]);
  const [stats, setStats] = useState({
    totalExams: 0,
    averageScore: 0,
    highestScore: 0,
    totalTimeSpent: 0,
  });

  useEffect(() => {
    if (user?.studentId) {
      loadResults();
    }
  }, [user]);

  const loadResults = () => {
    if (!user?.studentId) return;

    const studentExams = getStudentExamsByStudent(user.studentId)
      .filter(se => se.status === 'completed')
      .map(se => ({
        ...se,
        examTitle: getExamById(se.examId)?.title || 'Unknown Exam',
        examCategory: getExamById(se.examId)?.category || 'Unknown',
      }))
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());

    setResults(studentExams);

    // Calculate stats
    if (studentExams.length > 0) {
      const totalScore = studentExams.reduce((sum, r) => sum + r.percentage, 0);
      const highest = Math.max(...studentExams.map(r => r.percentage));
      const totalTime = studentExams.reduce((sum, r) => sum + r.timeSpent, 0);

      setStats({
        totalExams: studentExams.length,
        averageScore: Math.round(totalScore / studentExams.length),
        highestScore: highest,
        totalTimeSpent: totalTime,
      });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Results</h1>
        <p className="text-gray-600">View your exam performance history</p>
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
              {results.map((result) => (
                <div 
                  key={result.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">{result.examTitle}</h3>
                      <p className="text-sm text-gray-500">{result.examCategory}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-lg ${getScoreBg(result.percentage)}`}>
                      <span className={`text-2xl font-bold ${getScoreColor(result.percentage)}`}>
                        {result.percentage}%
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Score</p>
                      <p className="font-medium">{result.score} / {result.totalMarks}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Time Spent</p>
                      <p className="font-medium">{Math.round(result.timeSpent / 60)} minutes</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Submitted</p>
                      <p className="font-medium">
                        {result.submittedAt 
                          ? new Date(result.submittedAt).toLocaleDateString() 
                          : '-'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          result.percentage >= 70 ? 'bg-emerald-500' :
                          result.percentage >= 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${result.percentage}%` }}
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
