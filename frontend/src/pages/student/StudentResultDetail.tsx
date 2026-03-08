import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { resultAPI, aiAPI } from '@/services/api';
import { usePlan } from '@/hooks/usePlan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, AlertCircle, Sparkles,
  Brain, Loader2, Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { FeatureLockedModal } from '@/components/common/FeatureLock';

export default function StudentResultDetail() {
  const { resultId } = useParams();
  const navigate = useNavigate();
  const { isFeatureAllowed } = usePlan();

  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showLockModal, setShowLockModal] = useState(false);
  const [explainingResult, setExplainingResult] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [explainingQuestion, setExplainingQuestion] = useState<string | null>(null);
  const [questionExplanations, setQuestionExplanations] = useState<Record<string, string>>({});

  useEffect(() => {
    if (resultId) {
      fetchResultDetail();
    }
  }, [resultId]);

  const fetchResultDetail = async () => {
    try {
      const res = await resultAPI.getResultDetail(resultId!);
      if (res.data.success) {
        setResult(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load result details');
    } finally {
      setLoading(false);
    }
  };

  const handleExplainResult = async () => {
    if (!isFeatureAllowed('ai_result_analysis')) {
      setShowLockModal(true);
      return;
    }

    setExplainingResult(true);
    try {
      const res = await aiAPI.explainResult(resultId!);
      if (res.data.success) {
        setAiAnalysis(res.data.data.explanation);
        toast.success('AI Analysis complete!');
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 403) {
        setShowLockModal(true);
      } else {
        toast.error('Failed to generate AI analysis');
      }
    } finally {
      setExplainingResult(false);
    }
  };

  const handleExplainQuestion = async (q: any) => {
    if (!isFeatureAllowed('ai_coach')) {
      setShowLockModal(true);
      return;
    }

    setExplainingQuestion(q.id);
    try {
      const res = await aiAPI.explainQuestion({
        questionId: q.id,
        studentAnswer: q.studentAnswer || '(No Answer)',
        correctAnswer: q.correctAnswer
      });
      if (res.data.success) {
        setQuestionExplanations(prev => ({
          ...prev,
          [q.id]: res.data.data.explanation
        }));
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 403) {
        setShowLockModal(true);
      } else {
        toast.error('Failed to explain question');
      }
    } finally {
      setExplainingQuestion(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 gap-4 h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-muted-foreground animate-pulse">Loading detailed results...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold">Result Not Found</h2>
        <Button variant="ghost" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)} className="text-gray-500">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to History
        </Button>
        <div className="flex gap-2">
           <Button
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg hover:shadow-indigo-200"
            onClick={handleExplainResult}
            disabled={explainingResult}
          >
            {explainingResult ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            AI Performance Analysis
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-50 to-white overflow-hidden">
        <div className="h-2 bg-indigo-600" />
        <CardHeader className="pb-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl font-bold text-indigo-950 uppercase tracking-tight">
                {result.examTitle}
              </CardTitle>
              <p className="text-sm text-indigo-600/70 font-medium">Detailed Graded Report</p>
            </div>
            <div className={`px-5 py-3 rounded-2xl ${result.passed ? 'bg-emerald-100' : 'bg-red-100'} text-center`}>
              <p className={`text-4xl font-black ${result.passed ? 'text-emerald-700' : 'text-red-700'}`}>
                {result.percentage}%
              </p>
              <p className={`text-[10px] font-bold uppercase tracking-widest ${result.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                {result.passed ? 'PASSED' : 'FAILED'}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-white/50 rounded-2xl border border-indigo-100/50">
            <StatItem label="Subject" value={result.examCategory || 'General'} />
            <StatItem label="Type" value={result.examType || 'Official'} />
            <StatItem label="Session" value={result.academicSession || 'N/A'} />
            <StatItem label="Score" value={`${result.score} / ${result.totalMarks}`} />
            <StatItem label="Time Spent" value={`${result.timeSpentMinutes} Minutes`} />
            <StatItem label="Date" value={new Date(result.submittedAt).toLocaleDateString()} />
            <StatItem label="Rank" value={result.rank ? `Rank #${result.rank}` : 'N/A'} />
          </div>

          {aiAnalysis && (
            <div className="mt-6 p-6 bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-2xl border border-indigo-500 shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 transform translate-x-4 -translate-y-4 group-hover:scale-110 transition-transform">
                <Brain className="h-24 w-24" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <Zap className="h-5 w-5 text-amber-400 fill-amber-400" />
                  </div>
                  <h3 className="text-lg font-bold tracking-tight">AI Academic Insight</h3>
                </div>
                <div className="text-indigo-100 leading-relaxed text-sm whitespace-pre-wrap font-medium">
                  {aiAnalysis}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-indigo-600" />
          Question Breakdown
        </h3>

        {result.questions.map((q: any, i: number) => (
          <Card key={q.id} className={`border-l-4 shadow-sm transition-all hover:shadow-md ${q.isCorrect ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
            <CardContent className="p-5">
              <div className="flex justify-between items-start gap-4 mb-4">
                <div className="flex gap-3">
                  <div className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${q.isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {i + 1}
                  </div>
                  <div className="font-semibold text-gray-900 leading-relaxed" dangerouslySetInnerHTML={{ __html: q.text }} />
                </div>
                <Badge variant={q.isCorrect ? 'secondary' : 'destructive'} className={q.isCorrect ? 'bg-emerald-50 text-emerald-700 border-none' : 'border-none'}>
                  {q.marksObtained}/{q.marks} Pts
                </Badge>
              </div>

              <div className="grid md:grid-cols-2 gap-4 ml-9">
                <div className={`p-3 rounded-xl border ${q.isCorrect ? 'bg-emerald-50/30 border-emerald-100' : 'bg-red-50/30 border-red-100'}`}>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Your Answer</p>
                  <p className={`font-bold ${q.isCorrect ? 'text-emerald-700' : 'text-red-700'}`}>{q.studentAnswer || '(No Answer)'}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Correct Answer</p>
                  <p className="font-bold text-slate-800">{q.correctAnswer}</p>
                </div>
              </div>

              {questionExplanations[q.id] ? (
                <div className="mt-4 ml-9 p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="font-bold text-xs uppercase tracking-wider">AI Explanation</span>
                  </div>
                  <p className="text-sm font-medium leading-relaxed">{questionExplanations[q.id]}</p>
                </div>
              ) : (
                <div className="mt-4 ml-9 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs group hover:bg-indigo-50 hover:text-indigo-600 border-dashed"
                    onClick={() => handleExplainQuestion(q)}
                    disabled={explainingQuestion === q.id}
                  >
                    {explainingQuestion === q.id ? (
                      <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3 mr-2 group-hover:scale-125 transition-transform" />
                    )}
                    Use AI Coach to explain this
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <FeatureLockedModal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        featureName="AI Student Coaching & Insights"
      />
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-lg font-black text-indigo-950">{value}</p>
    </div>
  );
}

function BookOpen(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
