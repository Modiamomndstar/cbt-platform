import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  getExamById,
  getStudentsByTutor,
  getExamSchedulesByExam,
  createExamSchedulesBulk,
  updateExamSchedule,
  generatePassword
} from '@/lib/dataStore';
import { exportToCSV } from '@/lib/csvParser';
import { Calendar, Users, ArrowLeft, Plus, RefreshCw, Download, Printer, Mail, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';
import type { Student, ExamSchedule } from '@/types';

interface ScheduleWithStudent extends ExamSchedule {
  student?: Student;
}

export default function ScheduleExam() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [schedules, setSchedules] = useState<ScheduleWithStudent[]>([]);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isRescheduleDialogOpen, setIsRescheduleDialogOpen] = useState(false);
  const [rescheduleSchedule, setRescheduleSchedule] = useState<ScheduleWithStudent | null>(null);
  const [tutorId, setTutorId] = useState<string>('');

  // Individual schedule form (for different times per student)
  const [individualSchedules, setIndividualSchedules] = useState<Record<string, {
    date: string;
    startTime: string;
    endTime: string;
  }>>({});

  // Bulk schedule form
  const [bulkScheduleForm, setBulkScheduleForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
    maxAttempts: 1,
  });

  // Reschedule form
  const [rescheduleForm, setRescheduleForm] = useState({
    date: '',
    startTime: '',
    endTime: '',
  });

  // Get tutor ID from localStorage session
  useEffect(() => {
    const session = localStorage.getItem('cbt_session');
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.tutorId) {
        setTutorId(parsed.tutorId);
      }
    }
  }, []);

  useEffect(() => {
    if (examId && tutorId) {
      const examData = getExamById(examId);
      if (examData) {
        setExam(examData);
        loadData();
      } else {
        navigate('/tutor/exams');
      }
    }
  }, [examId, tutorId]);

  const loadData = () => {
    if (!examId || !tutorId) return;

    // Get all students for this tutor
    const allStudents = getStudentsByTutor(tutorId);
    setStudents(allStudents);

    // Get existing schedules for this exam
    const examSchedules = getExamSchedulesByExam(examId);

    // Enrich schedules with student data
    const enrichedSchedules = examSchedules.map(schedule => ({
      ...schedule,
      student: allStudents.find(s => s.id === schedule.studentId)
    }));

    setSchedules(enrichedSchedules);
  };

  // Handle individual schedule change
  const handleIndividualScheduleChange = (studentId: string, field: string, value: string) => {
    setIndividualSchedules(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }));
  };

  // Schedule with individual times (different time for each student)
  const handleIndividualSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId || selectedStudents.length === 0) return;

    const schedulesToCreate: Omit<ExamSchedule, 'id'>[] = [];

    for (const studentId of selectedStudents) {
      const individualTime = individualSchedules[studentId];
      const student = students.find(s => s.id === studentId);

      // Use individual time if set, otherwise use bulk time
      const date = individualTime?.date || bulkScheduleForm.date;
      const startTime = individualTime?.startTime || bulkScheduleForm.startTime;
      const endTime = individualTime?.endTime || bulkScheduleForm.endTime;

      if (!date || !startTime || !endTime) {
        toast.error(`Please set schedule time for ${student?.fullName || 'a student'}`);
        return;
      }

      schedulesToCreate.push({
        examId,
        studentId,
        scheduledDate: date,
        startTime,
        endTime,
        status: 'scheduled',
        loginUsername: `exam_${student?.studentId || studentId.slice(-6)}_${Date.now().toString(36).slice(-4)}`,
        loginPassword: generatePassword(8),
        attemptCount: 0,
        maxAttempts: bulkScheduleForm.maxAttempts,
      });
    }

    createExamSchedulesBulk(schedulesToCreate);
    toast.success(`Exam scheduled for ${schedulesToCreate.length} students`);
    setIsScheduleDialogOpen(false);
    setSelectedStudents([]);
    setIndividualSchedules({});
    setBulkScheduleForm({
      date: '',
      startTime: '',
      endTime: '',
      maxAttempts: 1,
    });
    loadData();
  };

  // Bulk schedule (same time for all students)
  const handleBulkSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId || selectedStudents.length === 0) return;

    const schedulesToCreate = selectedStudents.map(studentId => {
      const student = students.find(s => s.id === studentId);
      return {
        examId,
        studentId,
        scheduledDate: bulkScheduleForm.date,
        startTime: bulkScheduleForm.startTime,
        endTime: bulkScheduleForm.endTime,
        status: 'scheduled' as const,
        loginUsername: `exam_${student?.studentId || studentId.slice(-6)}_${Date.now().toString(36).slice(-4)}`,
        loginPassword: generatePassword(8),
        attemptCount: 0,
        maxAttempts: bulkScheduleForm.maxAttempts,
      };
    });

    createExamSchedulesBulk(schedulesToCreate);
    toast.success(`Exam scheduled for ${schedulesToCreate.length} students`);
    setIsScheduleDialogOpen(false);
    setSelectedStudents([]);
    setBulkScheduleForm({
      date: '',
      startTime: '',
      endTime: '',
      maxAttempts: 1,
    });
    loadData();
  };

  const handleReschedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleSchedule) return;

    updateExamSchedule(rescheduleSchedule.id, {
      scheduledDate: rescheduleForm.date,
      startTime: rescheduleForm.startTime,
      endTime: rescheduleForm.endTime,
      status: 'rescheduled',
      attemptCount: 0,
    });

    toast.success('Exam rescheduled successfully');
    setIsRescheduleDialogOpen(false);
    setRescheduleSchedule(null);
    loadData();
  };

  const openRescheduleDialog = (schedule: ScheduleWithStudent) => {
    setRescheduleSchedule(schedule);
    setRescheduleForm({
      date: schedule.scheduledDate,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    });
    setIsRescheduleDialogOpen(true);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  const selectAllUnscheduled = () => {
    const unscheduledStudents = students.filter(
      student => !schedules.some(s => s.studentId === student.id)
    );
    setSelectedStudents(unscheduledStudents.map(s => s.id));
    toast.success(`Selected ${unscheduledStudents.length} unscheduled students`);
  };

  const selectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.id));
    }
  };

  const getStudentSchedule = (studentId: string) => {
    return schedules.find(s => s.studentId === studentId);
  };

  // Download login credentials as CSV
  const downloadCredentialsCSV = () => {
    if (schedules.length === 0) {
      toast.error('No schedules to download');
      return;
    }

    const data = schedules.map(s => ({
      'Student ID': s.student?.studentId || 'N/A',
      'Student Name': s.student?.fullName || 'N/A',
      'Email': s.student?.email || 'N/A',
      'Exam': exam?.title || 'N/A',
      'Date': new Date(s.scheduledDate).toLocaleDateString(),
      'Start Time': s.startTime,
      'End Time': s.endTime,
      'Login Username': s.loginUsername,
      'Login Password': s.loginPassword,
      'Status': s.status,
    }));

    exportToCSV(data, `${exam?.title}_login_credentials`);
    toast.success('Credentials downloaded as CSV');
  };

  // Download login credentials as Excel
  const downloadCredentialsExcel = () => {
    if (schedules.length === 0) {
      toast.error('No schedules to download');
      return;
    }

    const data = schedules.map(s => ({
      'Student ID': s.student?.studentId || 'N/A',
      'Student Name': s.student?.fullName || 'N/A',
      'Email': s.student?.email || 'N/A',
      'Exam': exam?.title || 'N/A',
      'Date': new Date(s.scheduledDate).toLocaleDateString(),
      'Start Time': s.startTime,
      'End Time': s.endTime,
      'Login Username': s.loginUsername,
      'Login Password': s.loginPassword,
      'Status': s.status,
    }));

    exportToCSV(data, `${exam?.title}_login_credentials`);
    toast.success('Credentials downloaded as Excel');
  };

  // Print individual schedule
  const printSchedule = (schedule: ScheduleWithStudent) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const student = schedule.student;
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exam Schedule - ${student?.fullName || 'Student'}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 600px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #4F46E5; padding-bottom: 20px; margin-bottom: 30px; }
          .school-name { font-size: 24px; font-weight: bold; color: #4F46E5; }
          .exam-title { font-size: 20px; margin-top: 10px; }
          .info-box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .credentials { background: #ecfdf5; padding: 20px; border-radius: 8px; border: 2px solid #10b981; margin: 20px 0; }
          .label { font-weight: bold; color: #6b7280; }
          .value { font-size: 18px; margin: 5px 0 15px 0; }
          .warning { background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; margin-top: 30px; }
          .footer { text-align: center; margin-top: 40px; color: #9ca3af; font-size: 12px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="school-name">${exam?.schoolName || 'School'}</div>
          <div class="exam-title">${exam?.title || 'Exam'}</div>
        </div>

        <div class="info-box">
          <div class="label">Student Name</div>
          <div class="value">${student?.fullName || 'N/A'}</div>

          <div class="label">Student ID</div>
          <div class="value">${student?.studentId || 'N/A'}</div>

          <div class="label">Exam Date</div>
          <div class="value">${new Date(schedule.scheduledDate).toLocaleDateString()}</div>

          <div class="label">Time</div>
          <div class="value">${schedule.startTime} - ${schedule.endTime}</div>

          <div class="label">Duration</div>
          <div class="value">${exam?.duration || 'N/A'} minutes</div>
        </div>

        <div class="credentials">
          <h3 style="margin-top: 0; color: #10b981;">Login Credentials</h3>
          <div class="label">Username</div>
          <div class="value" style="font-family: monospace; font-size: 20px;">${schedule.loginUsername}</div>

          <div class="label">Password</div>
          <div class="value" style="font-family: monospace; font-size: 20px;">${schedule.loginPassword}</div>
        </div>

        <div class="warning">
          <strong>Important Instructions:</strong>
          <ul>
            <li>Login at the scheduled time only</li>
            <li>Do not share your credentials with anyone</li>
            <li>Ensure stable internet connection</li>
            <li>Do not refresh or close browser during exam</li>
          </ul>
        </div>

        <div class="footer">
          Generated by CBT Platform<br>
          ${new Date().toLocaleString()}
        </div>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="padding: 10px 30px; font-size: 16px; background: #4F46E5; color: white; border: none; border-radius: 5px; cursor: pointer;">
            Print Schedule
          </button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    toast.success('Schedule opened for printing');
  };

  // Send email (simulated - would need backend integration)
  const sendEmail = (schedule: ScheduleWithStudent) => {
    const student = schedule.student;
    if (!student?.email) {
      toast.error('Student does not have an email address');
      return;
    }

    // In a real implementation, this would call a backend API
    // For now, we'll open the user's email client
    const subject = encodeURIComponent(`Exam Login Credentials - ${exam?.title}`);
    const body = encodeURIComponent(
      `Dear ${student.fullName},\n\n` +
      `Your exam has been scheduled. Here are your login details:\n\n` +
      `Exam: ${exam?.title}\n` +
      `Date: ${new Date(schedule.scheduledDate).toLocaleDateString()}\n` +
      `Time: ${schedule.startTime} - ${schedule.endTime}\n` +
      `Duration: ${exam?.duration} minutes\n\n` +
      `Login Username: ${schedule.loginUsername}\n` +
      `Login Password: ${schedule.loginPassword}\n\n` +
      `Important:\n` +
      `- Login only at the scheduled time\n` +
      `- Do not share your credentials\n` +
      `- Ensure stable internet connection\n\n` +
      `Good luck!`
    );

    window.open(`mailto:${student.email}?subject=${subject}&body=${body}`);
    toast.success('Email client opened');
  };

  // Send bulk emails
  const sendBulkEmails = () => {
    const schedulesWithEmail = schedules.filter(s => s.student?.email);
    if (schedulesWithEmail.length === 0) {
      toast.error('No students with email addresses');
      return;
    }

    // For bulk, we'll create a summary email
    const subject = encodeURIComponent(`Exam Login Credentials - ${exam?.title}`);
    let body = encodeURIComponent(
      `Dear Students,\n\n` +
      `Your exam "${exam?.title}" has been scheduled.\n\n` +
      `Please find your individual login credentials below:\n\n`
    );

    schedulesWithEmail.forEach(s => {
      body += encodeURIComponent(
        `--- ${s.student?.fullName} (${s.student?.studentId}) ---\n` +
        `Date: ${new Date(s.scheduledDate).toLocaleDateString()}\n` +
        `Time: ${s.startTime} - ${s.endTime}\n` +
        `Username: ${s.loginUsername}\n` +
        `Password: ${s.loginPassword}\n\n`
      );
    });

    body += encodeURIComponent(
      `Important:\n` +
      `- Login only at your scheduled time\n` +
      `- Do not share your credentials\n` +
      `- Ensure stable internet connection\n\n` +
      `Good luck!`
    );

    window.open(`mailto:?subject=${subject}&body=${body}`);
    toast.success(`Email client opened for ${schedulesWithEmail.length} students`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge variant="secondary">Scheduled</Badge>;
      case 'in_progress':
        return <Badge className="bg-amber-500">In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500">Completed</Badge>;
      case 'missed':
        return <Badge variant="destructive">Missed</Badge>;
      case 'rescheduled':
        return <Badge className="bg-blue-500">Rescheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (!exam) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
            <p className="text-gray-600">{exam.title} • {schedules.length} scheduled</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {schedules.length > 0 && (
            <>
              <Button variant="outline" onClick={downloadCredentialsCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" onClick={downloadCredentialsExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button variant="outline" onClick={sendBulkEmails}>
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
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
              <DialogHeader>
                <DialogTitle>Schedule Exam for Students</DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="bulk" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="bulk">Same Time for All</TabsTrigger>
                  <TabsTrigger value="individual">Different Times</TabsTrigger>
                </TabsList>

                {/* Bulk Schedule Tab */}
                <TabsContent value="bulk">
                  <form onSubmit={handleBulkSchedule} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="bulk-date">Date *</Label>
                        <Input
                          id="bulk-date"
                          type="date"
                          value={bulkScheduleForm.date}
                          onChange={(e) => setBulkScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                          required
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bulk-startTime">Start Time *</Label>
                        <Input
                          id="bulk-startTime"
                          type="time"
                          value={bulkScheduleForm.startTime}
                          onChange={(e) => setBulkScheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="bulk-endTime">End Time *</Label>
                        <Input
                          id="bulk-endTime"
                          type="time"
                          value={bulkScheduleForm.endTime}
                          onChange={(e) => setBulkScheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bulk-maxAttempts">Maximum Attempts</Label>
                      <Input
                        id="bulk-maxAttempts"
                        type="number"
                        min={1}
                        max={5}
                        value={bulkScheduleForm.maxAttempts}
                        onChange={(e) => setBulkScheduleForm(prev => ({ ...prev, maxAttempts: parseInt(e.target.value) || 1 }))}
                      />
                    </div>

                    <StudentSelection
                      students={students}
                      schedules={schedules}
                      selectedStudents={selectedStudents}
                      toggleStudentSelection={toggleStudentSelection}
                      selectAllUnscheduled={selectAllUnscheduled}
                      selectAll={selectAll}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={selectedStudents.length === 0 || !bulkScheduleForm.date || !bulkScheduleForm.startTime || !bulkScheduleForm.endTime}
                    >
                      Schedule {selectedStudents.length} Students
                    </Button>
                  </form>
                </TabsContent>

                {/* Individual Schedule Tab */}
                <TabsContent value="individual">
                  <form onSubmit={handleIndividualSchedule} className="space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                      <p className="text-sm text-amber-800">
                        Set different dates and times for each student. Students without individual times will use the default time below.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="default-date">Default Date</Label>
                        <Input
                          id="default-date"
                          type="date"
                          value={bulkScheduleForm.date}
                          onChange={(e) => setBulkScheduleForm(prev => ({ ...prev, date: e.target.value }))}
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default-startTime">Default Start Time</Label>
                        <Input
                          id="default-startTime"
                          type="time"
                          value={bulkScheduleForm.startTime}
                          onChange={(e) => setBulkScheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="default-endTime">Default End Time</Label>
                        <Input
                          id="default-endTime"
                          type="time"
                          value={bulkScheduleForm.endTime}
                          onChange={(e) => setBulkScheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="individual-maxAttempts">Maximum Attempts</Label>
                      <Input
                        id="individual-maxAttempts"
                        type="number"
                        min={1}
                        max={5}
                        value={bulkScheduleForm.maxAttempts}
                        onChange={(e) => setBulkScheduleForm(prev => ({ ...prev, maxAttempts: parseInt(e.target.value) || 1 }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Select Students & Set Individual Times</Label>
                      <div className="border rounded-lg max-h-80 overflow-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-50 sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectedStudents.length === students.length && students.length > 0}
                                  onChange={selectAll}
                                  className="rounded"
                                />
                              </th>
                              <th className="px-3 py-2 text-left">Student</th>
                              <th className="px-3 py-2 text-left">Date</th>
                              <th className="px-3 py-2 text-left">Start</th>
                              <th className="px-3 py-2 text-left">End</th>
                              <th className="px-3 py-2 text-left">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {students.map((student) => {
                              const existingSchedule = getStudentSchedule(student.id);
                              const isSelected = selectedStudents.includes(student.id);
                              return (
                                <tr key={student.id} className="border-t hover:bg-gray-50">
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => toggleStudentSelection(student.id)}
                                      disabled={!!existingSchedule}
                                      className="rounded"
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <div>
                                      <p className="font-medium">{student.fullName}</p>
                                      <p className="text-xs text-gray-500">{student.studentId}</p>
                                    </div>
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="date"
                                      className="w-32 h-8 text-sm"
                                      value={individualSchedules[student.id]?.date || ''}
                                      onChange={(e) => handleIndividualScheduleChange(student.id, 'date', e.target.value)}
                                      disabled={!isSelected || !!existingSchedule}
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="time"
                                      className="w-24 h-8 text-sm"
                                      value={individualSchedules[student.id]?.startTime || ''}
                                      onChange={(e) => handleIndividualScheduleChange(student.id, 'startTime', e.target.value)}
                                      disabled={!isSelected || !!existingSchedule}
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="time"
                                      className="w-24 h-8 text-sm"
                                      value={individualSchedules[student.id]?.endTime || ''}
                                      onChange={(e) => handleIndividualScheduleChange(student.id, 'endTime', e.target.value)}
                                      disabled={!isSelected || !!existingSchedule}
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    {existingSchedule ? (
                                      <Badge variant="secondary">Scheduled</Badge>
                                    ) : (
                                      <Badge variant="outline">Available</Badge>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <p className="text-sm text-gray-500">
                        {selectedStudents.length} students selected
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={selectedStudents.length === 0}
                    >
                      Schedule {selectedStudents.length} Students
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Scheduled Students */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Users className="h-5 w-5 mr-2" />
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
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Time</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Login Credentials</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {schedules.map((schedule) => (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{schedule.student?.fullName || 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{schedule.student?.studentId}</p>
                          {schedule.student?.email && (
                            <p className="text-xs text-gray-400">{schedule.student.email}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {new Date(schedule.scheduledDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {schedule.startTime} - {schedule.endTime}
                      </td>
                      <td className="px-4 py-3">
                        {getStatusBadge(schedule.status)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p><span className="text-gray-500">User:</span> {schedule.loginUsername}</p>
                          <p><span className="text-gray-500">Pass:</span> {schedule.loginPassword}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => printSchedule(schedule)}
                            title="Print Schedule"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {schedule.student?.email && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendEmail(schedule)}
                              title="Send Email"
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                          {(schedule.status === 'scheduled' || schedule.status === 'missed') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRescheduleDialog(schedule)}
                              title="Reschedule"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
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
                Click &quot;Schedule Students&quot; to add students to this exam
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleDialogOpen} onOpenChange={setIsRescheduleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Exam</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleReschedule} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reschedule-date">Date *</Label>
                <Input
                  id="reschedule-date"
                  type="date"
                  value={rescheduleForm.date}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, date: e.target.value }))}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reschedule-startTime">Start Time *</Label>
                <Input
                  id="reschedule-startTime"
                  type="time"
                  value={rescheduleForm.startTime}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, startTime: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reschedule-endTime">End Time *</Label>
                <Input
                  id="reschedule-endTime"
                  type="time"
                  value={rescheduleForm.endTime}
                  onChange={(e) => setRescheduleForm(prev => ({ ...prev, endTime: e.target.value }))}
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Reschedule Exam
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Student Selection Component
interface StudentSelectionProps {
  students: Student[];
  schedules: ScheduleWithStudent[];
  selectedStudents: string[];
  toggleStudentSelection: (id: string) => void;
  selectAllUnscheduled: () => void;
  selectAll: () => void;
}

function StudentSelection({
  students,
  schedules,
  selectedStudents,
  toggleStudentSelection,
  selectAllUnscheduled,
  selectAll
}: StudentSelectionProps) {
  const getStudentSchedule = (studentId: string) => {
    return schedules.find(s => s.studentId === studentId);
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label>Select Students</Label>
        <div className="space-x-2">
          <Button type="button" variant="outline" size="sm" onClick={selectAllUnscheduled}>
            Select All Unscheduled
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={selectAll}>
            {selectedStudents.length === students.length ? 'Deselect All' : 'Select All'}
          </Button>
        </div>
      </div>
      <div className="border rounded-lg max-h-64 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-2 text-left">
                <input
                  type="checkbox"
                  checked={selectedStudents.length === students.length && students.length > 0}
                  onChange={selectAll}
                  className="rounded"
                />
              </th>
              <th className="px-4 py-2 text-left">Student ID</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Level</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {students.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No students found. Please add students first.
                </td>
              </tr>
            ) : (
              students.map((student) => {
                const existingSchedule = getStudentSchedule(student.id);
                return (
                  <tr key={student.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-2">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={() => toggleStudentSelection(student.id)}
                        disabled={!!existingSchedule}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-2">{student.studentId}</td>
                    <td className="px-4 py-2">{student.fullName}</td>
                    <td className="px-4 py-2">{student.level}</td>
                    <td className="px-4 py-2">
                      {existingSchedule ? (
                        <Badge variant="secondary">Already Scheduled</Badge>
                      ) : (
                        <Badge variant="outline">Available</Badge>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-gray-500">
        {selectedStudents.length} students selected
      </p>
    </div>
  );
}
