import { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { analyticsAPI, schoolSettingsAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Loader2,
  Printer,
  ArrowLeft,
  Settings2,
  Users,
  Layers,
  Download,
  ShieldCheck,
  PenLine,
  Mail,
  Phone,
  Calendar,
  Lock,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { IssueReportDialog } from '@/components/analytics/IssueReportDialog';
import { formatDate } from '@/lib/dateUtils';

interface ExamResult {
  id: string;
  title: string;
  category: string;
  categoryId: string;
  tutor: string;
  tutorId: string;
  score: string;
  totalMarks: string;
  percentage: string;
  examType?: string;
  academicSession?: string;
}

interface LevelProgression {
  levelName: string;
  exams: ExamResult[];
}

interface AdvancedReportData {
  student: {
    id: string;
    name: string;
    regNumber: string;
    currentLevel: string;
    school: string;
    schoolDetails: {
      address: string;
      email: string;
      phone: string;
      logoUrl?: string;
    };
  };
  timeframe: string;
  progression: LevelProgression[];
  summary: {
    totalExams: number;
    overallAverage: string;
    totalMarksObtained: string;
    totalPossibleMarks: string;
  };
}

export default function AdvancedReportCard() {
  const { studentId: paramId, reportId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = paramId || user?.id;
  const [data, setData] = useState<AdvancedReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTutors, setSelectedTutors] = useState<Set<string>>(new Set());
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [timeframe, setTimeframe] = useState<string>('all');
  const [signatureTitle, setSignatureTitle] = useState('Principal');
  const [signatureName, setSignatureName] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const isStaff = user?.role === 'tutor' || user?.role === 'school_admin' || user?.role === 'super_admin';
  const reportRef = useRef<HTMLDivElement>(null);

  // Derived unique tutors and categories from the raw data
  const metadata = useMemo(() => {
    if (!data) return { tutors: [], categories: [] };
    const tutors = new Map();
    const categories = new Map();

    data.progression.forEach(level => {
      level.exams.forEach(exam => {
        tutors.set(exam.tutorId, exam.tutor);
        categories.set(exam.category, exam.category); // Using category name as key since categoryId might be missing
      });
    });

    return {
      tutors: Array.from(tutors.entries()).map(([id, name]) => ({ id, name })),
      categories: Array.from(categories.keys()).map(name => ({ id: name, name }))
    };
  }, [data]);

  useEffect(() => {
    if (reportId) {
      fetchIssuedReport();
    } else {
      fetchData();
    }
  }, [studentId, timeframe, reportId]);

  const fetchIssuedReport = async () => {
    try {
      setLoading(true);
      const res = await analyticsAPI.getIssuedReport(reportId!);
      if (res.data.success) {
        const report = res.data.data;
        // First fetch the actual data for that student
        const reportRes = await analyticsAPI.getAdvancedReportCard(report.studentId || report.student_id, report.config.timeframe);
        if (reportRes.data.success) {
          setData(reportRes.data.data);
          // Apply saved config
          setTimeframe(report.config.timeframe || 'all');
          setSelectedCategories(new Set(report.config.categories || []));
          setSelectedTutors(new Set(report.config.tutors || []));
          setSignatureTitle(report.config.signatureTitle || 'Principal');
          setSignatureName(report.config.signatureName || '');
        }
      }
    } catch (error: any) {
       console.error('Failed to load issued report:', error);
       if (error.response?.status) {
         setError({
           status: error.response.status,
           message: error.response.data?.message || 'Failed to load report'
         });
       } else {
         toast.error('Failed to load issued report');
       }
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!studentId) return;

      // Fetch both report data and school settings for defaults
      // For students, we skip schoolSettingsAPI to avoid 403s on unauthorized metadata
      const [reportRes, settingsRes] = await Promise.all([
        analyticsAPI.getAdvancedReportCard(studentId, timeframe),
        user?.role !== 'student'
          ? schoolSettingsAPI.get().catch(() => ({ data: { success: false, data: null } }))
          : Promise.resolve({ data: { success: false, data: null } })
      ]);

      if (reportRes.data.success) {
        const result = reportRes.data.data;
        setData(result);

        // Initialize filters on first load
        const uniqueTutors = new Set<string>();
        const uniqueCats = new Set<string>();
        result.progression.forEach((level: any) => {
          level.exams.forEach((exam: any) => {
            uniqueTutors.add(exam.tutorId);
            uniqueCats.add(exam.category);
          });
        });
        setSelectedTutors(uniqueTutors);
        setSelectedCategories(uniqueCats);
      }

      if (settingsRes.data.success) {
        const settings = settingsRes.data.data;
        if (settings.reportSignatureTitle) {
          setSignatureTitle(settings.reportSignatureTitle);
        } else {
          setSignatureTitle('Principal'); // fallback
        }
        if (settings.reportSignatureName) {
          setSignatureName(settings.reportSignatureName);
        }
      }
    } catch (error: any) {
      console.error('Failed to load advanced report:', error);
      if (error.response?.status) {
        setError({
          status: error.response.status,
          message: error.response.data?.message || 'Failed to load advanced report'
        });
      } else {
        toast.error('Failed to load advanced report');
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredProgression = useMemo(() => {
    if (!data) return [];
    return data.progression.map(level => ({
      ...level,
      exams: level.exams.filter(exam =>
        selectedTutors.has(exam.tutorId) &&
        selectedCategories.has(exam.category)
      )
    })).filter(level => level.exams.length > 0);
  }, [data, selectedTutors, selectedCategories]);

  const calculatedSummary = useMemo(() => {
    let totalScore = 0;
    let totalPossible = 0;
    let count = 0;

    filteredProgression.forEach(level => {
      level.exams.forEach(exam => {
        totalScore += parseFloat(exam.score);
        totalPossible += parseFloat(exam.totalMarks);
        count++;
      });
    });

    return {
      totalExams: count,
      overallAverage: totalPossible > 0 ? ((totalScore / totalPossible) * 100).toFixed(1) : '0',
      totalMarksObtained: totalScore.toFixed(1),
      totalPossibleMarks: totalPossible.toFixed(1)
    };
  }, [filteredProgression]);

  const toggleTutor = (id: string) => {
    const next = new Set(selectedTutors);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTutors(next);
  };

  const toggleCategory = (id: string) => {
    const next = new Set(selectedCategories);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedCategories(next);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleIssueReport = async (title: string) => {
    try {
      setIsExporting(true);
      const config = {
        timeframe,
        categories: Array.from(selectedCategories),
        tutors: Array.from(selectedTutors),
        signatureTitle: signatureTitle,
        signatureName: signatureName
      };

      const res = await analyticsAPI.issueReport({
        studentId: studentId!,
        title,
        config
      });

      if (res.data.success) {
        toast.success('Report successfully issued to student portal!');
      } else {
        throw new Error(res.data.message || 'Server returned failure');
      }
    } catch (error: any) {
      console.error('Issue report error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to issue report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (!reportRef.current) return;

    try {
      setIsExporting(true);
      const toastId = toast.loading('Generating high-quality PDF report...');

      // Wait a tiny bit for any layout adjustments
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // Retained high quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1200 // Ensure consistent width for capture
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // If content is longer than one A4 page, we might need multi-page logic,
      // but for many reports, a single long page or scaled fit is a good start.
      // Scaling to fit width on A4:
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

      pdf.save(`${data?.student.name.replace(/\s+/g, '_')}_Advanced_Report.pdf`);

      toast.dismiss(toastId);
      toast.success('Report exported successfully!');
    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error('Failed to export PDF. Please try Print View instead.');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
        <p className="text-gray-500 font-medium animate-pulse">Compiling scholarly achievements...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full space-y-6">
          <div className="mx-auto w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center">
            {error.status === 402 ? (
              <CreditCard className="h-10 w-10 text-rose-500" />
            ) : error.status === 403 ? (
              <Lock className="h-10 w-10 text-rose-500" />
            ) : (
              <AlertCircle className="h-10 w-10 text-rose-500" />
            )}
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-black text-slate-900">
              {error.status === 402 ? 'Subscription Upgrade' :
               error.status === 403 ? 'Access Restricted' :
               'Report Unavailable'}
            </h2>
            <p className="text-slate-500 font-medium">
              {error.message || 'We encountered an issue retrieving this high-performance academic record.'}
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            {error.status === 402 && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 w-full font-bold"
                onClick={() => navigate('/billing')}
              >
                Upgrade Plan
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Safety
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 text-center">
       <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full space-y-4">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">No Data Available</h2>
          <p className="text-slate-500">We couldn't find any assessment data for this scholar.</p>
          <Button variant="outline" onClick={() => navigate(-1)}>Go Back</Button>
       </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Customization Sidebar - Hidden when printing */}
      {!reportId && (
        <div className="w-80 bg-white border-r p-6 flex flex-col gap-8 print:hidden sticky top-0 h-screen overflow-y-auto shadow-sm">
        <div className="flex items-center gap-2 mb-2">
           <div className="p-2 bg-indigo-50 rounded-lg">
             <Settings2 className="h-5 w-5 text-indigo-600" />
           </div>
           <h2 className="text-lg font-bold text-gray-900 leading-none">Customization</h2>
        </div>

        {/* Timeframe */}
        <div className="space-y-3">
          <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            Timeframe
          </Label>
          <div className="grid grid-cols-2 gap-2">
            {['all', 'weekly', 'monthly', 'yearly'].map(t => (
              <Button
                key={t}
                variant={timeframe === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeframe(t)}
                className="capitalize text-xs h-8"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Layers className="h-3 w-3" />
              Subjects / Exam Categories
            </Label>
            <button
              onClick={() => setSelectedCategories(new Set(metadata.categories.map(c => c.id)))}
              className="text-[10px] text-indigo-600 hover:underline"
            >
              Select All
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {metadata.categories.map(cat => (
              <div key={cat.id} className="flex items-center gap-3 group">
                <Checkbox
                  id={`cat-${cat.id}`}
                  checked={selectedCategories.has(cat.id)}
                  onCheckedChange={() => toggleCategory(cat.id)}
                />
                <label
                  htmlFor={`cat-${cat.id}`}
                  className="text-sm text-gray-600 group-hover:text-gray-900 cursor-pointer transition-colors"
                >
                  {cat.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Tutors */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
              <Users className="h-3 w-3" />
              Assigned Tutors
            </Label>
             <button
              onClick={() => setSelectedTutors(new Set(metadata.tutors.map(t => t.id)))}
              className="text-[10px] text-indigo-600 hover:underline"
            >
              Select All
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
            {metadata.tutors.map(tutor => (
              <div key={tutor.id} className="flex items-center gap-3 group">
                <Checkbox
                  id={`tutor-${tutor.id}`}
                  checked={selectedTutors.has(tutor.id)}
                  onCheckedChange={() => toggleTutor(tutor.id)}
                />
                <label
                  htmlFor={`tutor-${tutor.id}`}
                  className="text-sm text-gray-600 group-hover:text-gray-900 cursor-pointer transition-colors"
                >
                  {tutor.name}
                </label>
              </div>
            ))}
          </div>
        </div>

        {/* Signature Settings */}
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <PenLine className="h-3 w-3" />
          </Label>
          {isStaff ? (
            <div className="space-y-3">
               <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-medium">Designation / Title</span>
                  <Input
                    value={signatureTitle}
                    onChange={(e) => setSignatureTitle(e.target.value)}
                    placeholder="e.g. Principal"
                    className="h-8 text-xs"
                  />
               </div>
               <div className="space-y-1">
                  <span className="text-[10px] text-gray-400 font-medium">Authorized Name</span>
                  <Input
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="e.g. Dr. Jane Smith"
                    className="h-8 text-xs"
                  />
               </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
               <p className="text-[10px] text-slate-500 italic">Signature settings are restricted to authorized personnel.</p>
            </div>
          )}
        </div>

        <div className="mt-auto pt-6 border-t font-medium text-xs text-gray-400 italic">
          Advanced customization enabled by SuperAdmin priority permissions.
        </div>
      </div>
      )}

      <IssueReportDialog
        isOpen={isIssueDialogOpen}
        onClose={() => setIsIssueDialogOpen(false)}
        onConfirm={handleIssueReport}
        isSubmitting={isExporting}
      />

      {/* Main Content / Preview */}
      <main className="flex-1 p-8 print:p-0 overflow-y-auto bg-slate-50/50">
        <div className="max-w-4xl mx-auto mb-8 flex justify-between items-center print:hidden">
           <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-500">
             <ArrowLeft className="mr-2 h-4 w-4" />
             Back to Portal
           </Button>
           <div className="flex gap-4">
             <Button variant="outline" onClick={handlePrint}>
               <Printer className="mr-2 h-4 w-4" />
               Print View
             </Button>
             {isStaff && !reportId && (
               <Button
                 variant="outline"
                 className="border-amber-200 text-amber-700 hover:bg-amber-50"
                 onClick={() => setIsIssueDialogOpen(true)}
               >
                 <ShieldCheck className="mr-2 h-4 w-4" />
                 Issue to Portal
               </Button>
             )}
              <Button
                className="bg-indigo-600 hover:bg-indigo-700"
                onClick={handleExportPDF}
                disabled={isExporting}
              >
                {isExporting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {isExporting ? 'Generating...' : 'Export PDF'}
              </Button>
           </div>
        </div>

        {/* Visual Report Card */}
        <motion.div
           ref={reportRef}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="relative bg-white shadow-2xl rounded-xl overflow-hidden border border-slate-200 print:shadow-none print:border-none print:rounded-none"
        >
          {/* Visual Header Banner */}
          <div className="h-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 w-full" />

          <div className="p-12 print:p-8">
            {/* School Logo & Title */}
            <div className="flex flex-col items-center text-center gap-6 mb-12">
               <div className="relative group">
                 <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                 <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center border-4 border-white shadow-xl overflow-hidden print:shadow-none">
                   {data.student.schoolDetails.logoUrl ? (
                     <img
                       src={data.student.schoolDetails.logoUrl}
                       alt={data.student.school}
                       className="w-full h-full object-cover"
                     />
                   ) : (
                     <div className="w-full h-full bg-slate-50 flex items-center justify-center">
                       <ShieldCheck className="h-12 w-12 text-indigo-600" />
                     </div>
                   )}
                 </div>
               </div>

               <div className="space-y-2">
                  <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tight leading-tight">
                    {data.student.school}
                  </h1>
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-slate-600 font-semibold text-lg">{data.student.schoolDetails.address}</p>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-2 text-sm text-slate-500 font-medium">
                      <span className="flex items-center gap-2">
                         <Mail className="h-4 w-4 text-indigo-400" />
                         {data.student.schoolDetails.email}
                      </span>
                      <span className="flex items-center gap-2">
                         <Phone className="h-4 w-4 text-indigo-400" />
                         {data.student.schoolDetails.phone}
                      </span>
                    </div>
                  </div>
               </div>

               <div className="mt-8 flex flex-col items-center">
                 <div className="bg-slate-900 transform -skew-x-12 px-8 py-2 mb-2">
                   <span className="block skew-x-12 text-white text-sm font-black tracking-[0.2em] uppercase">
                     Consolidated Academic Transcript
                   </span>
                 </div>
                 <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest opacity-80 mt-1">
                   Institutional Multi-Category Performance Record
                 </p>
               </div>
            </div>

            {/* Student Metadata Card */}
            <div className="grid md:grid-cols-2 gap-8 mb-12 bg-slate-50/50 rounded-2xl p-8 border border-slate-100 print:bg-white print:border">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Scholar Name</span>
                  <span className="font-bold text-slate-800">{data.student.name}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registration ID</span>
                  <span className="font-bold text-slate-800">{data.student.regNumber}</span>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Student Group</span>
                  <span className="font-bold text-slate-800">{data.student.currentLevel}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transcript Date</span>
                  <span className="font-bold text-slate-800">{formatDate(new Date(), { dateStyle: 'long' })}</span>
                </div>
              </div>
            </div>

            {/* Results Section */}
            <div className="space-y-10">
              <AnimatePresence mode="popLayout">
                {filteredProgression.length > 0 ? (
                  filteredProgression.map((level) => (
                    <motion.div
                      key={level.levelName}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-4">
                        <h3 className="text-lg font-black text-indigo-900 uppercase tracking-wider underline underline-offset-8 decoration-indigo-200">{level.levelName} Assessments</h3>
                        <div className="h-px flex-1 bg-slate-100" />
                      </div>

                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-900 text-white font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="px-6 py-4 text-left">Subject / Category</th>
                              <th className="px-6 py-4 text-left">Tutor Assessor</th>
                              <th className="px-6 py-4 text-center">Outcome</th>
                              <th className="px-6 py-4 text-center">Score</th>
                              <th className="px-6 py-4 text-right">Performance Rank</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {level.exams.map((exam) => (
                              <motion.tr layout key={exam.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-slate-800">{exam.category}</div>
                                  <div className="flex gap-2 mt-1">
                                    {exam.examType && (
                                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold uppercase tracking-wider">{exam.examType}</span>
                                    )}
                                    {exam.academicSession && (
                                      <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-tighter">{exam.academicSession}</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4 text-slate-500">{exam.tutor}</td>
                                <td className="px-6 py-4 text-center font-bold">
                                  <span className={parseFloat(exam.percentage) >= 50 ? 'text-emerald-600' : 'text-rose-600'}>
                                    {exam.percentage}%
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-center text-slate-400 font-medium">{exam.score} / {exam.totalMarks}</td>
                                <td className="px-6 py-4 text-right">
                                  <Badge className={
                                    parseFloat(exam.percentage) >= 70 ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100' :
                                    parseFloat(exam.percentage) >= 50 ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-100' :
                                    'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-100'
                                  }>
                                    {parseFloat(exam.percentage) >= 70 ? 'Distinction' : parseFloat(exam.percentage) >= 50 ? 'Proficient' : 'Support Required'}
                                  </Badge>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                     <p className="text-slate-400 font-medium">No assessments match the current filters.</p>
                     <Button variant="link" onClick={() => {
                        setSelectedCategories(new Set(metadata.categories.map(c => c.id)));
                        setSelectedTutors(new Set(metadata.tutors.map(t => t.id)));
                     }}>Reset Filters</Button>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer Summary */}
            <div className="mt-20 pt-12 border-t-2 border-slate-100 grid md:grid-cols-[1.5fr_1fr] gap-12">
               <div>
                  <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight">Consolidated Summary</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
                      <p className="text-[10px] font-black text-indigo-400 uppercase mb-1">Total Assessments</p>
                      <p className="text-2xl font-black text-indigo-900">{calculatedSummary.totalExams}</p>
                    </div>
                    <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100">
                      <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">Overall Percentage</p>
                      <p className="text-2xl font-black text-emerald-900">{calculatedSummary.overallAverage}%</p>
                    </div>
                    <div className="p-4 bg-slate-50/50 rounded-xl border border-slate-100 col-span-2">
                       <div className="flex justify-between items-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase">Points Accumulated</p>
                          <p className="text-lg font-bold text-slate-700">{calculatedSummary.totalMarksObtained} / {calculatedSummary.totalPossibleMarks}</p>
                       </div>
                    </div>
                  </div>
               </div>
               <div className="flex flex-col justify-end items-center gap-2">
                  {signatureName && (
                    <p className="text-sm font-bold text-slate-800">
                      {signatureName}
                    </p>
                  )}
                  <div className="w-full h-px bg-slate-900 mb-1" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-400">{signatureTitle} Authorization</span>
                  <div className="p-2 border border-slate-100 rounded-lg bg-slate-50/30 flex items-center gap-2 mt-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Electronically Verified Result</span>
                  </div>
               </div>
            </div>
          </div>
        </motion.div>
      </main>

      <style>{`
        @media print {
          @page { margin: 0; }
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border-none { border: none !important; }
          .print\\:rounded-none { border-radius: 0 !important; }
          .print\\:bg-white { background: white !important; }
          main { overflow: visible !important; height: auto !important; padding: 0 !important; }
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
