import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  getExamSchedulesByStudent,
  getExamById,
  getStudentExamsByStudent 
} from '@/lib/dataStore';
import { Calendar, Clock, BookOpen, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import type { ExamSchedule, Exam } from '@/types';

interface ScheduleWithExam extends ExamSchedule {
  exam: Exam | undefined;
}

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [upcomingExams, setUpcomingExams] = useState<ScheduleWithExam[]>([]);
  const [completedExams, setCompletedExams] = useState<any[]>([]);

  useEffect(() => {
    if (user?.studentId) {
      loadData();
    }
  }, [user]);

  const loadData = () => {
    if (!user?.studentId) return;

    // Get upcoming scheduled exams
    const schedules = getExamSchedulesByStudent(user.studentId);
    const upcoming = schedules
      .filter(s => s.status === 'scheduled' || s.status === 'rescheduled')
      .map(s => ({
        ...s,
        exam: getExamById(s.examId),
      }))
      .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
    setUpcomingExams(upcoming);

    // Get completed exams
    const studentExams = getStudentExamsByStudent(user.studentId);
    const completed = studentExams
      .filter(se => se.status === 'completed')
      .map(se => ({
        ...se,
        exam: getExamById(se.examId),
      }))
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime())
      .slice(0, 5);
    setCompletedExams(completed);
  };

  const isExamAvailable = (schedule: ScheduleWithExam) => {
    const now = new Date();
    const examDate = new Date(schedule.scheduledDate);
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = schedule.endTime.split(':').map(Number);
    
    const startTime = new Date(examDate);
    startTime.setHours(startHour, startMinute, 0);
    
    const endTime = new Date(examDate);
    endTime.setHours(endHour, endMinute, 0);
    
    return now >= startTime && now <= endTime;
  };

  const canStartExam = (schedule: ScheduleWithExam) => {
    return isExamAvailable(schedule) && schedule.attemptCount < schedule.maxAttempts;
  };

  const getTimeUntilExam = (schedule: ScheduleWithExam) => {
    const now = new Date();
    const examDate = new Date(schedule.scheduledDate);
    const [startHour, startMinute] = schedule.startTime.split(':').map(Number);
    examDate.setHours(startHour, startMinute, 0);
    
    const diff = examDate.getTime() - now.getTime();
    
    if (diff < 0) return 'Exam in progress';
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `Starts in ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Starts in ${hours} hour${hours > 1 ? 's' : ''}`;
    return `Starts in ${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600">View your upcoming and completed exams</p>
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
              {upcomingExams.map((schedule) => (
                <div 
                  key={schedule.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {schedule.exam?.title || 'Unknown Exam'}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {schedule.exam?.category} • {schedule.exam?.duration} minutes
                      </p>
                    </div>
                    <Badge 
                      variant={canStartExam(schedule) ? 'default' : 'secondary'}
                      className={canStartExam(schedule) ? 'bg-emerald-500' : ''}
                    >
                      {canStartExam(schedule) ? 'Ready' : 'Scheduled'}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      {new Date(schedule.scheduledDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Clock className="h-4 w-4 mr-2" />
                      {schedule.startTime} - {schedule.endTime}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <BookOpen className="h-4 w-4 mr-2" />
                      {schedule.exam?.totalQuestions} questions
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <p className={`text-sm ${canStartExam(schedule) ? 'text-emerald-600 font-medium' : 'text-gray-500'}`}>
                      {getTimeUntilExam(schedule)}
                    </p>
                    {canStartExam(schedule) ? (
                      <Button 
                        onClick={() => navigate(`/student/exam/${schedule.id}`)}
                      >
                        Start Exam
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button disabled variant="outline">
                        Not Available
                      </Button>
                    )}
                  </div>
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
              {completedExams.map((result) => (
                <div 
                  key={result.id} 
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      result.percentage >= 70 ? 'bg-emerald-100' :
                      result.percentage >= 50 ? 'bg-amber-100' : 'bg-red-100'
                    }`}>
                      <span className={`text-sm font-semibold ${
                        result.percentage >= 70 ? 'text-emerald-700' :
                        result.percentage >= 50 ? 'text-amber-700' : 'text-red-700'
                      }`}>
                        {result.percentage}%
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{result.exam?.title}</p>
                      <p className="text-sm text-gray-500">
                        Submitted on {new Date(result.submittedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {result.score} / {result.totalMarks}
                    </p>
                    <p className="text-sm text-gray-500">
                      {Math.round(result.timeSpent / 60)} min
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
