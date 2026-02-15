import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { analyticsAPI } from '../../services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2, Printer, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

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
  }>>;
  summary: {
    totalExams: number;
    overallPercentage: string;
  };
}

export default function StudentReportCard() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!studentId) return;
        const response = await analyticsAPI.getStudentReportCard(studentId);
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        console.error('Failed to load report card:', error);
        toast.error('Failed to load report card');
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
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-lg text-muted-foreground">Report card not found</p>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
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
        <Button onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
      </div>

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
            <div className="grid grid-cols-[120px_1fr]">
              <span className="font-semibold text-muted-foreground">Level/Class:</span>
              <span className="font-medium">{data.student.level}</span>
            </div>
            <div className="grid grid-cols-[120px_1fr]">
              <span className="font-semibold text-muted-foreground">Category:</span>
              <span className="font-medium">{data.student.category || 'N/A'}</span>
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
                <h3 className="text-lg font-semibold mb-3 text-slate-800 bg-slate-100 p-2 rounded print:bg-gray-100">{category}</h3>
                <div className="overflow-hidden border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b print:bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Exam Title</th>
                        <th className="px-4 py-3 text-center font-semibold">Score</th>
                        <th className="px-4 py-3 text-center font-semibold">Total</th>
                        <th className="px-4 py-3 text-center font-semibold">%</th>
                        <th className="px-4 py-3 text-center font-semibold">Grade</th>
                        <th className="px-4 py-3 text-center font-semibold">Remark</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {exams.map((result, index) => (
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
