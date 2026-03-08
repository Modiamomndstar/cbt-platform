import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { resultAPI } from '@/services/api';
import {
  Award,
  BookOpen,
  User,
  Search,
  Filter,
  FileBarChart,
  Download,
  Calendar
} from 'lucide-react';
import { Input } from '@/components/ui/input';

export default function Results() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadResults();
  }, []);

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

  const filteredResults = results.filter(r =>
    (r.studentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.examTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.tutorName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search students, exams, or tutors..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button variant="outline" size="icon">
          <Filter className="h-4 w-4" />
        </Button>
      </div>

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
                          {new Date(result.completedAt || result.createdAt).toLocaleDateString()}
                        </p>
                        <Badge variant={result.status === 'graded' ? 'default' : 'secondary'} className="mt-1 text-[10px] h-4">
                          {result.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                    >
                      <FileBarChart className="h-4 w-4" />
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
    </div>
  );
}
