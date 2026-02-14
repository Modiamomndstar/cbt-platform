import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { examAPI, scheduleAPI, categoryAPI, studentAPI, uploadAPI } from '@/services/api';
import {
  Calendar,
  ArrowLeft,
  Plus,
  Trash2,
  Printer,
  Mail,
  Download,
  Copy,
  RefreshCw,
  Filter
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ScheduleExam() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [exam, setExam] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Schedule form
  const [scheduleForm, setScheduleForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    maxAttempts: 1,
  });

  const [rescheduleData, setRescheduleData] = useState<any>(null);
  const [rescheduleForm, setRescheduleForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });

  // Ad-hoc student state
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudentForm, setNewStudentForm] = useState({
    studentId: '',
    fullName: '',
    email: '',
    categoryId: '',
    isBulk: false,
    file: null as File | null
  });

  const [scheduleToCancel, setScheduleToCancel] = useState<string | null>(null);

  useEffect(() => {
    if (examId) {
      loadData();
    }
  }, [examId]);

  useEffect(() => {
    if (examId && isScheduleDialogOpen) {
      loadAvailableStudents();
    }
  }, [examId, isScheduleDialogOpen, selectedCategory]);

  const loadData = async () => {
    if (!examId) return;
    try {
      const [examRes, schedulesRes, categoriesRes] = await Promise.all([
        examAPI.getById(examId),
        scheduleAPI.getByExam(examId),
        categoryAPI.getAll().catch(() => ({ data: { success: false, data: [] } })),
      ]);

      if (examRes.data.success) {
        setExam(examRes.data.data);
      } else {
        navigate('/tutor/exams');
        return;
      }

      if (schedulesRes.data.success) {
        setSchedules(schedulesRes.data.data || []);
      }

      if (categoriesRes.data?.success) {
        setCategories(categoriesRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load schedule data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableStudents = async () => {
    if (!examId) return;
    try {
      const res = await scheduleAPI.getAvailableStudents(examId, selectedCategory);
      if (res.data.success) {
        setStudents(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load available students:', err);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map((s: any) => s.id));
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleScheduleStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }
    if (!scheduleForm.date || !scheduleForm.startTime) {
      toast.error('Please set date and start time');
      return;
    }

    try {
      const { data } = await scheduleAPI.schedule({
        examId,
        studentIds: selectedStudents,
        scheduledDate: scheduleForm.date,
        startTime: scheduleForm.startTime,
        endTime: scheduleForm.endTime,
        maxAttempts: scheduleForm.maxAttempts,
      });

      if (data.success) {
        toast.success(data.message || `${selectedStudents.length} student(s) scheduled successfully`);
        setIsScheduleDialogOpen(false);
        setSelectedStudents([]);
        loadData();
      } else {
        toast.error(data.message || 'Failed to schedule students');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to schedule students';
      toast.error(msg);
    }

  };

  const confirmCancelSchedule = async () => {
    if (!scheduleToCancel) return;

    try {
      await scheduleAPI.cancel(scheduleToCancel);
      toast.success('Schedule cancelled');
      loadData();
    } catch (err: any) {
      toast.error('Failed to cancel schedule');
    } finally {
      setScheduleToCancel(null);
    }
  };


  const handleReschedule = (schedule: any) => {
    setRescheduleData(schedule);
    setRescheduleForm({
      date: schedule.scheduled_date ? new Date(schedule.scheduled_date).toISOString().split('T')[0] : (schedule.scheduledDate ? new Date(schedule.scheduledDate).toISOString().split('T')[0] : ''),
      startTime: schedule.start_time || schedule.startTime || '',
      endTime: schedule.end_time || schedule.endTime || '',
    });
  };

  const submitReschedule = async () => {
    if (!rescheduleData || !rescheduleForm.date || !rescheduleForm.startTime || !rescheduleForm.endTime) {
      toast.error('Please fill in date, start time, and end time');
      return;
    }

    try {
      await scheduleAPI.update(rescheduleData.id, {
        scheduledDate: rescheduleForm.date,
        startTime: rescheduleForm.startTime,
        endTime: rescheduleForm.endTime,
      });
      toast.success('Schedule rescheduled successfully');
      setRescheduleData(null);
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to reschedule';
      toast.error(msg);
    }
  };

  const handleEmailCredentials = async (scheduleId: string) => {
    try {
      toast.loading('Sending email...');
      await scheduleAPI.emailCredentials(scheduleId);
      toast.dismiss();
      toast.success('Credentials sent to student');
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to send email');
    }
  };



  const handleEmailAll = async () => {
    try {
      toast.loading('Sending bulk emails...');
      const res = await scheduleAPI.emailAllCredentials(examId!);
      toast.dismiss();
      toast.success(res.data.message);
    } catch (err) {
      toast.dismiss();
      toast.error('Failed to send emails');
    }
  };

  const handleAddStudent = async () => {
    if (newStudentForm.isBulk) {
       if (!newStudentForm.file) {
          toast.error('Please select a CSV file');
          return;
       }
       try {
          toast.loading('Uploading students...');
          await uploadAPI.uploadStudents(
              newStudentForm.file,
              newStudentForm.categoryId === 'none' ? undefined : newStudentForm.categoryId
          );
          // Backend now handles auto-assign for tutors
          toast.dismiss();
          toast.success('Students uploaded successfully');
          setIsAddStudentOpen(false);
          setNewStudentForm({ studentId: '', fullName: '', email: '', categoryId: '', isBulk: false, file: null });
          await loadAvailableStudents();
       } catch (err: any) {
          toast.dismiss();
          const msg = err.response?.data?.message || 'Failed to upload students';
          toast.error(msg);
       }
       return;
    }

    if (!newStudentForm.fullName) {
        toast.error('Full Name is required');
        return;
    }

    try {
        const studentId = newStudentForm.studentId || `EXT${Date.now().toString().slice(-6)}`;

        const createRes = await studentAPI.create({
            studentId,
            fullName: newStudentForm.fullName,
            email: newStudentForm.email,
            categoryId: newStudentForm.categoryId === 'none' ? undefined : newStudentForm.categoryId,
        });

        if (createRes.data.success && user?.id) {
           const newStudent = createRes.data.data;
           await studentAPI.assignTutor(newStudent.id, user.id);
        }

        toast.success('Student created successfully');
        setIsAddStudentOpen(false);
        setNewStudentForm({ studentId: '', fullName: '', email: '', categoryId: '', isBulk: false, file: null });

        await loadAvailableStudents();
    } catch (err: any) {
        const msg = err.response?.data?.message || 'Failed to create student';
        toast.error(msg);
    }
  };

  const handlePrint = (schedule: any) => {
    const printContent = `
      <html>
        <head>
          <title>Exam Credentials - ${schedule.studentName || schedule.firstName}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .card { border: 1px solid #ccc; padding: 20px; border-radius: 8px; max-width: 500px; margin: 0 auto; }
            .header { text-align: center; margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
            .detail { margin: 10px 0; display: flex; justify-content: space-between; }
            .credentials { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px; }
            .code { font-family: monospace; font-size: 1.2em; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h2>${exam.title}</h2>
              <p>Exam Schedule & Credentials</p>
            </div>
            <div class="detail"><strong>Student:</strong> <span>${schedule.studentName || schedule.firstName + ' ' + schedule.lastName}</span></div>
            <div class="detail"><strong>Date:</strong> <span>${new Date(schedule.scheduledDate).toLocaleDateString()}</span></div>
            <div class="detail"><strong>Time:</strong> <span>${schedule.startTime} - ${schedule.endTime}</span></div>

            <div class="credentials">
              <div class="detail"><strong>Username:</strong> <span class="code">${schedule.examUsername}</span></div>
              <div class="detail"><strong>Password:</strong> <span class="code">${schedule.examPassword}</span></div>
              <div class="detail"><strong>Access Code:</strong> <span class="code">${schedule.accessCode}</span></div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(printContent);
      win.document.close();
    }
  };

  const handleExportCSV = () => {
    if (schedules.length === 0) return;

    // Create CSV content
    const headers = ['Student Name', 'Registration Number', 'Date', 'Time', 'Username', 'Password', 'Access Code', 'Status'];
    const rows = schedules.map(s => [
      s.studentName || `${s.firstName} ${s.lastName}`,
      s.registrationNumber || s.regNum || '',
      new Date(s.scheduledDate).toLocaleDateString(),
      `${s.startTime} - ${s.endTime}`,
      s.examUsername,
      s.examPassword,
      s.accessCode,
      s.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `exam-schedules-${exam.title.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCopyCredentials = (schedule: any) => {
    const text = `Exam: ${exam.title}\nUser: ${schedule.examUsername}\nPass: ${schedule.examPassword}\nCode: ${schedule.accessCode}`;
    navigator.clipboard.writeText(text);
    toast.success('Credentials copied to clipboard');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-500">Scheduled</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500">Completed</Badge>;
      case 'expired':
        return <Badge variant="destructive">Expired</Badge>;
      case 'missed':
        return <Badge variant="destructive">Missed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Exam not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/tutor/exams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Schedule Exam</h1>
            <p className="text-gray-600">{exam.title} • {exam.duration} mins • {schedules.length} scheduled</p>
          </div>
        </div>

        <div className="flex space-x-2">
          {schedules.length > 0 && (
            <>
              <Button variant="outline" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={handleEmailAll}>
                <Mail className="h-4 w-4 mr-2" />
                Email All
              </Button>
            </>
          )}

        <Dialog open={isScheduleDialogOpen} onOpenChange={setIsScheduleDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule Students
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Schedule Students for Exam</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
               {/* Quick Add Student Action */}
               <div className="flex justify-between items-center bg-blue-50 p-3 rounded-md border border-blue-100">
                  <div className="text-sm text-blue-800">
                    <span className="font-semibold">Need to add a student?</span>
                    <p className="text-xs opacity-80">Create a temporary student account for this exam.</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setIsAddStudentOpen(true)}>
                    <Plus className="h-3 w-3 mr-1" /> Add External Student
                  </Button>
               </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={scheduleForm.date}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Attempts</Label>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    value={scheduleForm.maxAttempts}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, maxAttempts: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={scheduleForm.startTime}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time (optional)</Label>
                  <Input
                    type="time"
                    value={scheduleForm.endTime}
                    onChange={(e) => setScheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <Label className="text-gray-700">Filter by Category:</Label>
                  </div>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-between items-center mb-2">
                  <Label>Select Students ({selectedStudents.length} selected)</Label>
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>
                    {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto border rounded-lg">
                  {students.length > 0 ? (
                    students.map((student: any) => (
                      <label
                        key={student.id}
                        className="flex items-center p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.id)}
                          onChange={() => handleToggleStudent(student.id)}
                          className="mr-3"
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {student.studentName || student.full_name || student.fullName}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>{student.registrationNumber || student.student_id || student.studentId}</span>
                            {student.categoryName && (
                              <Badge variant="secondary" className="text-xs h-5 px-1.5 font-normal">
                                {student.categoryName}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </label>
                    ))
                  ) : (
                    <p className="p-4 text-gray-500 text-center">No students available</p>
                  )}
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleScheduleStudents}
                disabled={selectedStudents.length === 0}
              >
                Schedule {selectedStudents.length} Student(s)
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {/* Scheduled Students */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Scheduled Students ({schedules.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {schedules.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date/Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Results</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Details</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {schedules.map((schedule: any) => (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {schedule.studentName || schedule.firstName + ' ' + schedule.lastName || 'Unknown Student'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {schedule.registrationNumber || ''} {schedule.email ? `• ${schedule.email}` : ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {schedule.scheduledDate ? new Date(schedule.scheduledDate).toLocaleDateString() : '-'}
                        <br />
                        <span className="text-sm">{schedule.startTime} - {schedule.endTime}</span>
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(schedule.status)}
                        {schedule.statusLabel && schedule.status !== 'scheduled' && (
                          <p className="text-xs text-gray-500 mt-1">{schedule.statusLabel}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(schedule.status === 'completed' || schedule.status === 'expired') ? (
                          <div className="space-y-1">
                            <p className="font-semibold text-sm">
                              {schedule.score ?? 0}/{schedule.totalMarks ?? 0}
                            </p>
                            <p className="text-sm">
                              {schedule.percentage !== null ? `${Number(schedule.percentage).toFixed(1)}%` : '0%'}
                            </p>
                            {schedule.passed !== null && (
                              <Badge className={schedule.passed ? 'bg-emerald-500' : 'bg-red-500'}>
                                {schedule.passed ? 'Passed' : 'Failed'}
                              </Badge>
                            )}
                          </div>
                        ) : schedule.status === 'in_progress' ? (
                          <span className="text-sm text-amber-600 italic">In progress...</span>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {schedule.status === 'completed' || schedule.status === 'expired' ? (
                          <div className="text-xs space-y-1 text-gray-600">
                            {schedule.startedAt && (
                              <p>Started: {new Date(schedule.startedAt).toLocaleString()}</p>
                            )}
                            {schedule.completedAt && (
                              <p>Submitted: {new Date(schedule.completedAt).toLocaleString()}</p>
                            )}
                            {schedule.timeSpentMinutes != null && schedule.timeSpentMinutes > 0 && (
                              <p>Time: {schedule.timeSpentMinutes} min</p>
                            )}
                            {schedule.autoSubmitted && (
                              <Badge variant="outline" className="text-xs">Auto-submitted</Badge>
                            )}
                          </div>
                        ) : schedule.status === 'in_progress' ? (
                          <div className="text-xs space-y-1 text-gray-600">
                            {schedule.startedAt && (
                              <p>Started: {new Date(schedule.startedAt).toLocaleString()}</p>
                            )}
                          </div>
                        ) : schedule.status === 'scheduled' ? (
                          <div className="text-xs space-y-1 text-gray-500">
                            <p>User: <code className="font-mono font-bold text-orange-600">{schedule.examUsername}</code></p>
                            <p>Pass: <code className="font-mono font-bold text-purple-600">{schedule.examPassword}</code></p>
                            <p>Code: <code className="font-mono font-bold text-blue-600">{schedule.accessCode}</code></p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-1">
                          {schedule.status === 'scheduled' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handlePrint(schedule)} title="Print Credentials">
                                <Printer className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => handleEmailCredentials(schedule.id)} title="Email Credentials">
                                <Mail className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          {(schedule.status === 'scheduled' || schedule.status === 'expired') && (
                            <Button variant="ghost" size="sm" onClick={() => handleReschedule(schedule)} title="Reschedule">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                          {schedule.status === 'scheduled' && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => handleCopyCredentials(schedule)}>
                                  Copy Credentials
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => setScheduleToCancel(schedule.id)}>
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Cancel Schedule
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No students scheduled yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Click "Schedule Students" to assign this exam
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleData} onOpenChange={(open) => !open && setRescheduleData(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Exam</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Date</Label>
              <Input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={rescheduleForm.date}
                onChange={(e) => setRescheduleForm(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>New Start Time</Label>
              <Input
                type="time"
                value={rescheduleForm.startTime}
                onChange={(e) => setRescheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>New End Time</Label>
              <Input
                type="time"
                value={rescheduleForm.endTime}
                onChange={(e) => setRescheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setRescheduleData(null)}>Cancel</Button>
              <Button onClick={submitReschedule}>Confirm Reschedule</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={!!scheduleToCancel} onOpenChange={(open) => !open && setScheduleToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Schedule?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the student's exam schedule. They will not be able to take the exam unless rescheduled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmCancelSchedule} className="bg-red-600 hover:bg-red-700">
              Yes, Cancel Schedule
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Ad-hoc Student Creation Dialog */}
      <Dialog open={isAddStudentOpen} onOpenChange={setIsAddStudentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add External Student</DialogTitle>
            <DialogDescription>
              Create a student account for this exam only. Valid for temporary access.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
             {/* Toggle Mode */}
             <div className="flex space-x-2 border-b mb-4">
                <button
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${!newStudentForm.isBulk ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                   onClick={() => setNewStudentForm(prev => ({ ...prev, isBulk: false }))}
                >
                   Single Student
                </button>
                <button
                   className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${newStudentForm.isBulk ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}
                   onClick={() => setNewStudentForm(prev => ({ ...prev, isBulk: true }))}
                >
                   Bulk Upload
                </button>
             </div>

             {!newStudentForm.isBulk ? (
                <>
                <div className="space-y-2">
                  <Label>Student ID (Optional)</Label>
                  <Input
                    placeholder="Auto-generated if empty"
                    value={newStudentForm.studentId}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, studentId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    placeholder="Enter student name"
                    value={newStudentForm.fullName}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email (Optional)</Label>
                  <Input
                    type="email"
                    placeholder="For sending credentials"
                    value={newStudentForm.email}
                    onChange={(e) => setNewStudentForm({ ...newStudentForm, email: e.target.value })}
                  />
                </div>
                 <div className="space-y-2">
                  <Label>Category (Optional)</Label>
                  <Select
                    value={newStudentForm.categoryId}
                    onValueChange={(val) => setNewStudentForm({...newStudentForm, categoryId: val})}
                  >
                     <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="none">None</SelectItem>
                       {categories.map((cat: any) => (
                         <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                       ))}
                     </SelectContent>
                  </Select>
                </div>
                </>
             ) : (
                <div className="space-y-4 py-4">
                   <div className="bg-blue-50 border border-blue-100 p-4 rounded-md text-sm text-blue-800">
                      <p className="font-semibold mb-1">CSV Format Required:</p>
                      <p>firstName, lastName, email, phone, dateOfBirth (YYYY-MM-DD), registrationNumber</p>
                      <a href="/api/uploads/template/students" download className="underline mt-2 inline-block">Download Template</a>
                   </div>
                   <div className="space-y-2">
                      <Label>Upload CSV File</Label>
                      <Input
                        type="file"
                        accept=".csv"
                        onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) setNewStudentForm(prev => ({ ...prev, file }));
                        }}
                      />
                   </div>
                </div>
             )}
            <Button className="w-full mt-4" onClick={handleAddStudent}>
              {newStudentForm.isBulk ? 'Upload Students' : 'Create Student'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
