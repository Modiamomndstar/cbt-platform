import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { scheduleAPI } from '@/services/api';
import {
  Calendar,
  Clock,
  User,
  BookOpen,
  Search,
  Filter,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { formatDate, formatTimeRange } from '@/lib/dateUtils';

export default function Schedules() {
  const navigate = useNavigate();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    try {
      const response = await scheduleAPI.getSchoolSchedules();
      if (response.data.success) {
        setSchedules(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load schedules:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResendLogin = async (id: string) => {
    try {
      await scheduleAPI.emailCredentials(id);
      toast.success('Credentials emailed to student');
    } catch (err) {
      toast.error('Failed to email credentials');
    }
  };

  const filteredSchedules = schedules.filter(s =>
    s.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.examTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.tutorName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Completed</Badge>;
      case 'in_progress': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">In Progress</Badge>;
      case 'scheduled': return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">Scheduled</Badge>;
      case 'expired': return <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-none">Expired</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none">Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Exam Schedules</h1>
          <p className="text-gray-600">Monitor all scheduled exam sessions across the school</p>
        </div>
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

      {filteredSchedules.length > 0 ? (
        <div className="grid gap-4">
          {filteredSchedules.map((schedule: any) => (
            <Card key={schedule.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{schedule.studentName}</p>
                        <p className="text-xs text-gray-500 flex items-center">
                          <BookOpen className="h-3 w-3 mr-1" />
                          {schedule.examTitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatDate(schedule.scheduledDate)}
                        </p>
                        <p className="text-xs text-gray-500 flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatTimeRange(schedule.startTimeIso, schedule.endTimeIso)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                        <MoreVertical className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Tutor: {schedule.tutorName}</p>
                        <div className="mt-1">{getStatusBadge(schedule.status)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/school-admin/schedules-by-exam/${schedule.examId}`)}
                      title="View Exam Schedule"
                    >
                      <Calendar className="h-4 w-4 text-indigo-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendLogin(schedule.id)}
                      title="Resend Login"
                      disabled={schedule.status === 'completed' || schedule.status === 'cancelled'}
                    >
                      <RefreshCw className="h-4 w-4" />
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
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No schedules found</h3>
            <p className="text-gray-500">Scheduled exam appearances will show up here</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
