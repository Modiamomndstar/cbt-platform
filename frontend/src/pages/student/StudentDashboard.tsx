import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, CheckCircle, AlertCircle, ArrowRight, FileText, UserCircle, Trophy, Award, TrendingUp, Smartphone, ShieldCheck } from 'lucide-react';
import { scheduleAPI, resultAPI, analyticsAPI } from '@/services/api';
import { CompetitionBanner } from '@/components/competitions/CompetitionBanner';
import { usePlan } from '@/hooks/usePlan';
import { FeatureLockedModal, FeatureLockBadge } from '@/components/common/FeatureLock';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFeatureAllowed } = usePlan();

  const [upcomingExams, setUpcomingExams] = useState<any[]>([]);
  const [completedExams, setCompletedExams] = useState<any[]>([]);
  const [awards, setAwards] = useState<any[]>([]);
  const [issuedReports, setIssuedReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [printingAward, setPrintingAward] = useState<any>(null);
  const [showLockModal, setShowLockModal] = useState(false);

  const handlePrintCertificate = (award: any) => {
    setPrintingAward(award);
    // Give state time to update before printing
    setTimeout(() => {
      window.print();
    }, 500);
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const [schedulesRes, historyRes, reportsRes] = await Promise.all([
        scheduleAPI.getMyExams().catch(() => ({ data: { success: true, data: [] } })),
        resultAPI.getMyHistory().catch(() => ({ data: { success: true, data: [] } })),
        analyticsAPI.getIssuedReports(user!.id).catch(() => ({ data: { success: true, data: [] } })),
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
          .filter((r: any) => r.status === 'completed');

        setCompletedExams(history.slice(0, 5));

        // Identify awards
        const possibleAwards = history.filter((r: any) =>
          r.percentage >= 70 || r.rank <= 3 || r.is_competition // Include all competition results for participation certs
        );
        setAwards(possibleAwards);
      }

      if (reportsRes.data.success) {
        setIssuedReports(reportsRes.data.data || []);
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
      <CompetitionBanner />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Student Dashboard</h1>
          <p className="text-muted-foreground text-sm">Welcome back, {user?.name || 'Student'}!</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <Button variant="outline" size="sm" onClick={() => {
              if (isFeatureAllowed('advanced_analytics')) {
                navigate('/student/performance');
              } else {
                setShowLockModal(true);
              }
           }}>
            <TrendingUp className="h-4 w-4 mr-2 text-indigo-600" />
            Performance Results
            {!isFeatureAllowed('advanced_analytics') && <FeatureLockBadge />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
              if (isFeatureAllowed('advanced_analytics')) {
                window.open(`/report-card/${user?.id}`, '_blank');
              } else {
                setShowLockModal(true);
              }
          }}>
            <FileText className="h-4 w-4 mr-2 text-blue-600" />
            Full Report Card
            {!isFeatureAllowed('advanced_analytics') && <FeatureLockBadge />}
          </Button>
        </div>
      </div>

      {/* Mobile App Promotion - HIGH IMPACT */}
      <Card className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white border-none overflow-hidden relative shadow-lg">
        <div className="absolute right-0 top-0 p-6 opacity-10">
           <Smartphone className="h-32 w-32" />
        </div>
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex-1 text-center md:text-left">
            <Badge className="bg-white/20 text-white border-none mb-3 px-3 py-1">Coming Soon</Badge>
            <h2 className="text-2xl font-black mb-2 tracking-tight">Take your exams on the go!</h2>
            <p className="text-indigo-100/90 text-sm max-w-md">
              We're building a dedicated mobile app for the Student Portal. Access your exams, check your performance, and join competitions directly from your phone.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
             <Button className="bg-white text-indigo-700 hover:bg-indigo-50 font-bold border-none px-6">
                <Smartphone className="h-4 w-4 mr-2 outline-indigo-700" /> Notify Me
             </Button>
             <Button variant="ghost" className="text-white hover:bg-white/10 font-medium">
                Learn More <ArrowRight className="h-4 w-4 ml-2" />
             </Button>
          </div>
        </CardContent>
      </Card>

      {/* Official Issued Reports Section */}
      {issuedReports.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-900">Official Issued Reports</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {issuedReports.map((report) => (
              <Card key={report.id} className="hover:shadow-md transition-shadow cursor-pointer border-indigo-100 bg-indigo-50/30" onClick={() => window.open(`/advanced-report/${user?.id}/${report.id}`, '_blank')}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-bold text-indigo-900 truncate">{report.title}</h3>
                    <p className="text-xs text-indigo-600 font-medium truncate">Issued by {report.issued_by_name || 'School Admin'}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(report.created_at).toLocaleDateString()}</p>
                  </div>
                  <Button size="sm" variant="ghost" className="text-indigo-600 shrink-0 hover:text-indigo-700 hover:bg-indigo-100">
                    View <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}

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

      {/* My Awards & Certificates */}
      {awards.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center text-amber-800">
              <Trophy className="h-5 w-5 mr-2 text-amber-600" />
              My Awards & Certificates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {awards.map((award: any) => (
                <div key={award.id} className="bg-white border-2 border-amber-100 rounded-xl p-5 shadow-sm hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Award className="h-6 w-6 text-amber-600" />
                    </div>
                    <Badge className={award.percentage >= 70 || award.rank <= 3 ? "bg-amber-100 text-amber-700 border-none" : "bg-blue-100 text-blue-700 border-none"}>
                      {award.percentage >= 70 || award.rank <= 3 ? 'Excellence' : 'Participation'}
                    </Badge>
                  </div>
                  <h3 className="font-bold text-slate-900 mb-1">{award.exam_title || 'Competition Award'}</h3>
                  <p className="text-xs text-slate-500 mb-4">Issued on {new Date(award.submitted_at).toLocaleDateString()}</p>
                  <Button
                    variant="outline"
                    className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                    onClick={() => handlePrintCertificate(award)}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Download Certificate
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden Certificate for Printing */}
      {printingAward && (
        <div className="hidden">
           <div id="certificate-print-area" className="w-[1123px] h-[794px] bg-white p-12 relative border-[20px] border-double border-indigo-900">
              {/* Background Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-bl-full opacity-50 -z-10"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-50 rounded-tr-full opacity-50 -z-10"></div>

              <div className="text-center h-full flex flex-col justify-between py-10">
                <div>
                  <Trophy className="h-20 w-20 text-amber-500 mx-auto mb-6" />
                  <h1 className="text-5xl font-serif font-black text-indigo-950 uppercase tracking-widest mb-4">
                    {printingAward.percentage >= 70 || printingAward.rank <= 3 ? 'Certificate of Excellence' : 'Certificate of Participation'}
                  </h1>
                  <p className="text-xl text-slate-600 italic">This prestigious award is proudly presented to</p>
                </div>

                <div className="my-8">
                  <h2 className="text-6xl font-script font-bold text-indigo-800 border-b-4 border-amber-400 inline-block px-12 py-2">
                    {user?.name || 'Valued Participant'}
                  </h2>
                </div>

                <div>
                  <p className="text-xl text-slate-600 mb-4">For outstanding performance in the competition</p>
                  <h3 className="text-3xl font-bold text-indigo-900 mb-10">{printingAward.exam_title}</h3>

                  <div className="flex justify-around items-end mt-12 px-20">
                    <div className="text-center border-t-2 border-slate-300 pt-2 w-48">
                      <p className="text-sm font-bold text-slate-800 uppercase">Competition Director</p>
                    </div>
                    <div className="text-center">
                       <Award className="h-24 w-24 text-amber-500 opacity-20" />
                    </div>
                    <div className="text-center border-t-2 border-slate-300 pt-2 w-48">
                      <p className="text-sm font-bold text-slate-800 uppercase">Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #certificate-print-area, #certificate-print-area * {
            visibility: visible;
          }
          #certificate-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            display: block !important;
            margin: 0;
            padding: 2rem;
            -webkit-print-color-adjust: exact;
          }
          @page {
            size: landscape;
            margin: 0;
          }
        }
      `}} />

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

      {/* Assigned Tutors */}
      {(user as any)?.assigned_tutors && (user as any).assigned_tutors.filter((t: any) => t && t.id).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <UserCircle className="h-5 w-5 mr-2 text-indigo-600" />
              My Instructors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(user as any).assigned_tutors.filter((t: any) => t && t.id).map((tutor: any) => (
                <div key={tutor.id} className="flex items-center p-4 border rounded-lg bg-gray-50">
                  <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold mr-4">
                    {tutor.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{tutor.name}</h4>
                    {tutor.subjects && (
                      <Badge variant="secondary" className="mt-1 font-normal opacity-90">
                        {tutor.subjects}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      <FeatureLockedModal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        featureName="Advanced Analytics"
        description="Detailed performance analytics and comprehensive report cards are available on our Advanced and Enterprise plans. Ask your school administrator to upgrade to unlock these features."
      />
    </div>
  );
}
