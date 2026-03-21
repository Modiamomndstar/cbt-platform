import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  TrendingUp, 
  Award,
  BookOpen,
  Calendar,
  ChevronLeft
} from 'lucide-react';
import { analyticsAPI, academicCalendarAPI } from '@/services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface SubjectReport {
  subject_id: string;
  subject_name: string;
  classwork_score: number;
  midterm_score: number;
  final_exam_score: number;
  total_score: number;
  grade: string;
  status: 'passed' | 'failed' | 'in_progress';
}

const TermReport: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [periods, setPeriods] = useState<any[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [report, setReport] = useState<SubjectReport[]>([]);

  useEffect(() => {
    fetchPeriods();
  }, []);

  useEffect(() => {
    if (selectedPeriod) {
      fetchReport(selectedPeriod);
    }
  }, [selectedPeriod]);

  const fetchPeriods = async () => {
    try {
      const res = await academicCalendarAPI.getActiveYear();
      if (res.data.success && res.data.data) {
        setPeriods(res.data.data.periods || []);
        // Find current active period if any
        const now = new Date();
        const active = res.data.data.periods.find((p: any) => 
          new Date(p.start_date) <= now && new Date(p.end_date) >= now
        );
        if (active) {
          setSelectedPeriod(active.id);
        } else if (res.data.data.periods.length > 0) {
          setSelectedPeriod(res.data.data.periods[0].id);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch academic periods');
    }
  };

  const fetchReport = async (periodId: string) => {
    setLoading(true);
    try {
      const res = await analyticsAPI.getCumulativeReport(periodId);
      if (res.data.success) {
          setReport(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load cumulative report');
    } finally {
      setLoading(false);
    }
  };

  const currentPeriod = periods.find(p => p.id === selectedPeriod);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-6xl animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-2 -ml-2 text-muted-foreground">
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Academic Report Card
          </h1>
          <p className="text-muted-foreground">
            Holistic view of your performance for the term.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-[200px]">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <Calendar className="w-4 h-4 mr-2 opacity-50" />
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => window.print()}>
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-6">
          <Skeleton className="h-[200px] w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : report.length === 0 ? (
        <Card className="border-dashed border-2 py-20 flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-6 mb-4">
            <BookOpen className="w-12 h-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-xl mb-2">No Data Available</CardTitle>
          <CardDescription className="max-w-xs">
            We couldn't find any completed assessments for the selected period. 
            Once you complete exams and assignments, they will appear here.
          </CardDescription>
        </Card>
      ) : (
        <div className="grid gap-8">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="overflow-hidden border-l-4 border-l-primary hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Overall Average</p>
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold">
                    {(report.reduce((acc, curr) => acc + curr.total_score, 0) / report.length).toFixed(1)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-l-4 border-l-amber-500 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Subjects Passed</p>
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-4xl font-bold">
                    {report.filter(r => r.total_score >= 50).length} / {report.length}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-l-4 border-l-indigo-500 hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Current Period</p>
                  <FileText className="w-4 h-4 text-indigo-500" />
                </div>
                <div className="flex items-end gap-2">
                  <span className="text-xl font-bold truncate">
                    {currentPeriod?.name || 'Academic Term'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Table */}
          <Card className="shadow-sm border-none ring-1 ring-border">
            <CardHeader className="pb-0">
              <CardTitle>Subject Breakdown</CardTitle>
              <CardDescription>Continuous Assessment (CA) and Final Exam weights applied.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b-2">
                    <TableHead className="w-[300px] font-bold text-foreground">Subject</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Classwork (10%)</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Midterm (30%)</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Final Exam (50%)</TableHead>
                    <TableHead className="text-center font-bold text-foreground">Total (100%)</TableHead>
                    <TableHead className="text-right font-bold text-foreground">Grade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.map((row) => (
                    <TableRow key={row.subject_id} className="hover:bg-muted/50 transition-colors h-16">
                      <TableCell className="font-semibold text-base">
                        {row.subject_name}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-muted-foreground">{row.classwork_score}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-muted-foreground">{row.midterm_score}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-muted-foreground">{row.final_exam_score}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center">
                           <span className="text-lg font-bold text-primary">{row.total_score}%</span>
                           <div className="w-20 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${row.total_score >= 50 ? 'bg-primary' : 'bg-destructive'}`}
                                style={{ width: `${row.total_score}%` }}
                              />
                           </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant={row.total_score >= 50 ? "default" : "destructive"} className="text-sm px-3 py-1">
                          {row.grade}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          
          {/* Grading Legend */}
          <div className="flex flex-wrap gap-6 text-sm text-muted-foreground justify-center py-4 opacity-70">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>A: 80% - 100%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary/80" />
              <span>B: 70% - 79%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary/60" />
              <span>C: 60% - 69%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary/40" />
              <span>D: 50% - 59%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span>F: Below 50%</span>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @media print {
          .container { max-width: 100%; padding: 0; }
          button, .Select-trigger, .Select-content, nav { display: none !important; }
          .shadow-sm, .hover\\:shadow-md { box-shadow: none !important; }
          .border-none { border: 1px solid #eee !important; }
        }
      `}</style>
    </div>
  );
};

export default TermReport;
