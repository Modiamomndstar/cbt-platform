import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { scheduleAPI, resultAPI } from '@/services/api';
import { Calendar, Clock, CheckCircle, AlertCircle, ArrowRight, FileText } from 'lucide-react';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [completedExams, setCompletedExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [schedulesRes, historyRes] = await Promise.all([
        scheduleAPI.getMyExams().catch(() => ({ data: { success: true, data: [] } })),
        resultAPI.getMyHistory().catch(() => ({ data: { success: true, data: [] } })),
      ]);

      if (schedulesRes.data.success) {
        const schedules = schedulesRes.data.data || [];
        const upcoming = schedules.filter((s: any) =>
          s.status === 'scheduled' || s.status === 'rescheduled'
        );
        setUpcomingExams(upcoming);
      }

      if (historyRes.data.success) {
        const history = (historyRes.data.data || [])
          .filter((r: any) => r.status === 'completed')
          .slice(0, 5);
        setCompletedExams(history);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600">View your upcoming and completed exams</p>
        </div>
        <Button onClick={() => window.open(`/report-card/${user?.id}`, '_blank')}>
          <FileText className="h-4 w-4 mr-2" />
          My Report Card
        </Button>
      </div>

      {/* Upcoming Exams */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Upcoming Exams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingExams.length > 0 ? (
            <div className="space-y-4">
              {upcomingExams.map((schedule: any) => (
                <div
                  key={schedule.id}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {schedule.exam_title || schedule.examTitle || schedule.exam?.title || 'Exam'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {schedule.durationMinutes || schedule.duration || schedule.exam?.duration ? `${schedule.durationMinutes || schedule.duration || schedule.exam?.duration} minutes` : ''}
                      </p>
                    </div>
                    {schedule.status === 'expired' ? (
                      <Badge variant="destructive">Expired</Badge>
                    ) : schedule.status === 'in_progress' ? (
                      <Badge className="bg-amber-500">In Progress</Badge>
                    ) : (
                      <Badge variant="secondary">Scheduled</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {schedule.scheduledDate || schedule.scheduled_date
                        ? new Date(schedule.scheduledDate || schedule.scheduled_date).toLocaleDateString()
                        : '-'}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {(schedule.startTime || schedule.start_time)
                        ? `${(schedule.startTime || schedule.start_time).slice(0, 5)} - ${(schedule.endTime || schedule.end_time || '').slice(0, 5)}`
                        : '-'}
                    </div>
                  </div>

                  {schedule.status === 'expired' ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                      Schedule expired — contact your tutor to reschedule this exam.
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500">
                        Access code: <code className="bg-gray-100 px-2 py-1 rounded">{schedule.access_code || schedule.accessCode || '-'}</code>
                      </p>
                      <Button
                        onClick={() => navigate(`/student/exam/${schedule.id}`)}
                        size="sm"
                      >
                        {schedule.status === 'in_progress' ? 'Resume Exam' : 'Start Exam'}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No upcoming exams scheduled</p>
              <p className="text-sm text-gray-400 mt-1">
                Check back later for your exam schedule
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed Exams */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            Completed Exams
          </CardTitle>
        </CardHeader>
        <CardContent>
          {completedExams.length > 0 ? (
            <div className="space-y-3">
              {completedExams.map((result: any) => (
                <div
                  key={result.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      (result.percentage || 0) >= 70 ? 'bg-emerald-100' :
                      (result.percentage || 0) >= 50 ? 'bg-amber-100' : 'bg-red-100'
                    }`}>
                      <span className={`text-sm font-semibold ${
                        (result.percentage || 0) >= 70 ? 'text-emerald-700' :
                        (result.percentage || 0) >= 50 ? 'text-amber-700' : 'text-red-700'
                      }`}>
                        {result.percentage || 0}%
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {result.exam_title || result.examTitle || 'Exam'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {result.submitted_at || result.submittedAt
                          ? `Submitted on ${new Date(result.submitted_at || result.submittedAt).toLocaleDateString()}`
                          : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {result.score || 0} / {result.total_marks || result.totalMarks || 0}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No completed exams yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center text-blue-900">
            <AlertCircle className="h-5 w-5 mr-2" />
            Exam Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              You can only start the exam during the scheduled time window
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Ensure you have a stable internet connection before starting
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Do not refresh or close the browser during the exam
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              The timer will continue even if you leave the page
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Click &quot;Submit&quot; when you are finished with the exam
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              Contact your tutor immediately if you encounter any issues
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
