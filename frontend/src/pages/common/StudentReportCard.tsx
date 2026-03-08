import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { analyticsAPI } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, Printer, ArrowLeft, Lock, Sparkles, AlertCircle, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { usePlan } from '@/hooks/usePlan';
import { FeatureLockedModal } from '@/components/common/FeatureLock';

interface ReportData {
  student: {
    name: string;
    regNumber: string;
    level: string;
    category: string;
    school: string;
    schoolAddress: string;
    schoolEmail: string;
    schoolPhone: string;
  };
  results: Record<string, Array<{
    exam: string;
    score: string;
    total: string;
    percentage: string;
    grade: string;
    remark: string;
    date: string;
    examType?: string;
    academicSession?: string;
  }>>;
  summary: {
    totalExams: number;
    overallPercentage: string;
  };
}

export default function StudentReportCard() {
  const { studentId: paramId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const studentId = paramId || user?.id;
  const { isFeatureAllowed } = usePlan();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLockModal, setShowLockModal] = useState(false);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!studentId) return;
        const response = await analyticsAPI.getStudentReportCard(studentId);
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error: any) {
        console.error('Failed to load report card:', error);
        if (error.response?.status) {
          setError({
            status: error.response.status,
            message: error.response.data?.message || 'Failed to load report card'
          });
        } else {
          toast.error('Failed to load report card');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [studentId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
              {error.message || 'We encountered an issue retrieving this student record.'}
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

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-6 bg-slate-50 p-8">
        <div className="bg-white p-12 rounded-3xl shadow-xl border border-slate-200 max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Report Not Found</h2>
          <p className="text-slate-500 font-medium">We couldn't find any results for this student.</p>
          <Button variant="outline" onClick={() => navigate(-1)} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 print:p-0 print:bg-white">
      {/* Navigation & Actions - Hidden when printing */}
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          {isFeatureAllowed('advanced_analytics') ? (
            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              onClick={() => navigate(`/advanced-report/${studentId}`)}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Advanced Report
            </Button>
          ) : (
            <Button
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
              onClick={() => setShowLockModal(true)}
            >
              <Lock className="mr-2 h-4 w-4" />
              Unlock Advanced Report
            </Button>
          )}
          <Button variant="secondary" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print Basic
          </Button>
        </div>
      </div>

      <FeatureLockedModal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        featureName="Advanced Comprehensive Reports"
      />

      {/* Report Card Content */}
      <Card className="max-w-4xl mx-auto print:border-none print:shadow-none">
        <CardHeader className="text-center border-b pb-6">
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-3xl font-bold uppercase tracking-wider">{data.student.school}</h1>
            <p className="text-muted-foreground">{data.student.schoolAddress}</p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{data.student.schoolEmail}</span>
              <span>•</span>
              <span>{data.student.schoolPhone}</span>
            </div>
            <h2 className="text-xl font-semibold mt-4 border-b-2 border-black inline-block px-4 pb-1">STUDENT REPORT CARD</h2>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          {/* Student Details */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 bg-slate-50 p-4 rounded-lg print:bg-white print:border">
            <div className="grid grid-cols-[120px_1fr]">
              <span className="font-semibold text-muted-foreground">Student Name:</span>
              <span className="font-medium">{data.student.name}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr]">
              <span className="font-semibold text-muted-foreground">Reg. Number:</span>
              <span className="font-medium">{data.student.regNumber}</span>
            </div>
            <div className="grid grid-cols-[140px_1fr]">
              <span className="font-semibold text-muted-foreground">Student Group / Grade:</span>
              <span className="font-medium">{data.student.level}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr]">
              <span className="font-semibold text-muted-foreground">Date:</span>
              <span className="font-medium">{new Date().toLocaleDateString()}</span>
            </div>
          </div>

          {/* Results Table */}
          <div className="space-y-6">
            {Object.entries(data.results).map(([category, exams]) => (
              <div key={category}>
                <div className="flex justify-between items-end mb-3 bg-slate-100 p-2 rounded print:bg-gray-100">
                  <h3 className="text-lg font-semibold text-slate-800">Subject / Course: {category}</h3>
                  {exams[0] && (
                    <div className="flex gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                      {exams[0].examType && <span>Type: {exams[0].examType}</span>}
                      {exams[0].academicSession && <span>Session: {exams[0].academicSession}</span>}
                    </div>
                  )}
                </div>
                <div className="overflow-hidden border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b print:bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Title / Description</th>
                        <th className="px-4 py-3 text-center font-semibold">Score</th>
                        <th className="px-4 py-3 text-center font-semibold">Total</th>
                        <th className="px-4 py-3 text-center font-semibold">%</th>
                        <th className="px-4 py-3 text-center font-semibold">Grade</th>
                        <th className="px-4 py-3 text-center font-semibold">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {(exams as any[]).map((result, index) => (
                        <tr key={index} className="hover:bg-slate-50">
                          <td className="px-4 py-3">{result.exam}</td>
                          <td className="px-4 py-3 text-center">{result.score}</td>
                          <td className="px-4 py-3 text-center">{result.total}</td>
                          <td className="px-4 py-3 text-center font-medium">{result.percentage}%</td>
                          <td className="px-4 py-3 text-center font-bold" style={{
                            color: result.grade === 'F' ? 'red' : result.grade === 'A' ? 'green' : 'inherit'
                          }}>{result.grade}</td>
                          <td className="px-4 py-3 text-center text-muted-foreground">{result.remark}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-8 grid grid-cols-2 gap-8 border-t pt-8">
            <div>
              <h3 className="font-semibold mb-4">Academic Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b pb-2">
                  <span>Total Exams Taken:</span>
                  <span className="font-medium">{data.summary.totalExams}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span>Overall Performance:</span>
                  <span className="font-medium">{data.summary.overallPercentage}%</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-end items-center mt-12 print:mt-4">
              <div className="w-48 border-b-2 border-black mb-2"></div>
              <span className="text-sm font-semibold uppercase">Principal's Signature</span>
            </div>
          </div>

          {/* Grading System Key */}
          <div className="mt-12 text-xs text-muted-foreground border p-4 rounded">
            <p className="font-semibold mb-2">GRADING SYSTEM:</p>
            <div className="grid grid-cols-5 gap-4">
              <span>A: 70-100% (Excellent)</span>
              <span>B: 60-69% (Very Good)</span>
              <span>C: 50-59% (Credit)</span>
              <span>D: 45-49% (Pass)</span>
              <span>F: 0-44% (Fail)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <style>{`
        @media print {
          @page { margin: 0.5cm; }
          body { background: white; }
          .print:hidden { display: none !important; }
          .print:border-none { border: none !important; }
          .print:shadow-none { box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
}
