import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { scheduleAPI, resultAPI } from '@/services/api';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { toast } from 'sonner';

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

export default function TakeExam() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();


  const [, setSchedule] = useState<any>(null);
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessCode, setAccessCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [examStartTime, setExamStartTime] = useState<Date | null>(null);

  // Load exam data
  useEffect(() => {
    if (scheduleId) {
      loadSchedule();
    }
  }, [scheduleId]);

  const loadSchedule = async () => {
    try {
      // Try to get schedule info from scheduled exams
      const response = await scheduleAPI.getMyExams();
      if (response.data.success) {
        const schedules = response.data.data || [];
        const mySchedule = schedules.find((s: any) => s.id === scheduleId);
        if (mySchedule) {
          setSchedule(mySchedule);
          const dur = mySchedule.durationMinutes || mySchedule.duration || mySchedule.exam_duration || 60;
          setExam({
            title: mySchedule.examTitle || mySchedule.exam_title || 'Exam',
            duration: dur,
            category: mySchedule.examCategory || mySchedule.exam_category || '',
          });
          setTimeRemaining(dur * 60);
          // Pre-fill access code if available
          if (mySchedule.accessCode || mySchedule.access_code) {
            setAccessCode(mySchedule.accessCode || mySchedule.access_code);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load schedule:', err);
      toast.error('Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  // Timer
  useEffect(() => {
    if (!isStarted || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isStarted, timeRemaining]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartExam = async () => {
    if (!scheduleId) return;

    setVerifying(true);
    try {
      // Verify access — send timezone for time-window check
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await scheduleAPI.verifyAccess(scheduleId, accessCode, timezone);
      if (response.data.success) {
        const data = response.data.data;
        const examQuestions = data.questions || [];

        // Process questions
        const processedQuestions = examQuestions.map((q: any) => ({
          ...q,
          id: q.id,
          questionText: q.question_text || q.questionText,
          questionType: q.question_type || q.questionType,
          options: q.options || [],
          marks: q.marks || 5,
        }));

        setQuestions(processedQuestions);

        if (data.durationMinutes) {
          setTimeRemaining(data.durationMinutes * 60);
        } else if (data.duration) {
          setTimeRemaining(data.duration * 60);
        }

        setExamStartTime(new Date());
        setIsStarted(true);
        toast.success('Exam started!');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to start exam. Check your access code.';
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const toggleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const [resultData, setResultData] = useState<any>(null);

  // ... (existing code)

  const handleSubmit = async (isTimeout: boolean = false) => {
    if (!scheduleId) return;

    setIsSubmitting(true);

    // Calculate time spent
    const timeSpentMinutes = examStartTime
      ? Math.round((new Date().getTime() - examStartTime.getTime()) / 60000)
      : 0;

    try {
      const response = await resultAPI.submit({
        scheduleId,
        answers,
        autoSubmitted: isTimeout,
        timeSpentMinutes,
      });

      toast.success(isTimeout ? 'Exam auto-submitted (Time expired)' : 'Exam submitted successfully');

      // If result is returned, show it
      if (response.data.data && response.data.data.percentage !== undefined) {
          setResultData(response.data.data);
      } else {
          navigate('/student/dashboard');
      }

    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit exam';
      toast.error(msg);
      setIsSubmitting(false);
    }
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {exam?.title || 'Exam'}
            </h1>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="text-lg font-semibold">{exam?.duration || 60} minutes</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Category</p>
                  <p className="text-lg font-semibold">{exam?.category || 'General'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Access Code</label>
                <input
                  type="text"
                  placeholder="Enter your exam access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-800 mb-2">Important Instructions:</h3>
                <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                  <li>You have {exam?.duration || 60} minutes to complete this exam</li>
                  <li>The timer starts when you click &quot;Start Exam&quot;</li>
                  <li>Do not refresh or close the browser</li>
                  <li>Click the flag icon to mark questions for review</li>
                  <li>Your progress is submitted when you click Submit</li>
                </ul>
              </div>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={handleStartExam}
              disabled={verifying || !accessCode.trim()}
            >
              {verifying ? 'Verifying...' : 'Start Exam'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b pb-4 mb-4">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-lg font-semibold">{exam?.title}</h1>
          <div className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
            timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-gray-100'
          }`}>
            <Clock className="h-5 w-5" />
            <span className="text-xl font-mono font-bold">
              {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-sm text-gray-500 mt-1">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{answeredCount} answered</span>
        </div>
      </div>

      {/* Question Navigation */}
      <div className="flex flex-wrap gap-2 mb-4">
        {questions.map((q: any, index: number) => (
          <button
            key={q.id}
            onClick={() => setCurrentQuestionIndex(index)}
            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
              index === currentQuestionIndex
                ? 'bg-indigo-600 text-white'
                : answers[q.id]
                ? 'bg-emerald-100 text-emerald-700'
                : flaggedQuestions.includes(q.id)
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>

      {/* Question Card */}
      {currentQuestion && (
        <Card className="mb-4">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <p className="text-sm text-gray-500 mb-1">
                  Question {currentQuestionIndex + 1} • {currentQuestion.marks} marks
                </p>
                <h2 className="text-lg font-medium">
                  {currentQuestion.questionText || currentQuestion.question_text}
                </h2>
              </div>
              <button
                onClick={() => toggleFlagQuestion(currentQuestion.id)}
                className={`p-2 rounded-lg transition-colors ${
                  flaggedQuestions.includes(currentQuestion.id)
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-gray-100 text-gray-400 hover:text-gray-600'
                }`}
              >
                <Flag className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {(currentQuestion.questionType || currentQuestion.question_type) === 'multiple_choice' && (
                (currentQuestion.options || []).map((option: string, index: number) => (
                  <label
                    key={index}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      answers[currentQuestion.id] === index.toString()
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={index}
                      checked={answers[currentQuestion.id] === index.toString()}
                      onChange={() => handleAnswer(currentQuestion.id, index.toString())}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-3">{String.fromCharCode(65 + index)}. {option}</span>
                  </label>
                ))
              )}

              {(currentQuestion.questionType || currentQuestion.question_type) === 'true_false' && (
                ['True', 'False'].map((option, index) => (
                  <label
                    key={index}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-colors ${
                      answers[currentQuestion.id] === index.toString()
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={index}
                      checked={answers[currentQuestion.id] === index.toString()}
                      onChange={() => handleAnswer(currentQuestion.id, index.toString())}
                      className="h-4 w-4 text-indigo-600"
                    />
                    <span className="ml-3">{option}</span>
                  </label>
                ))
              )}

              {(currentQuestion.questionType || currentQuestion.question_type) === 'fill_blank' && (
                <input
                  type="text"
                  placeholder="Enter your answer"
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                  className="w-full p-4 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        {currentQuestionIndex < questions.length - 1 ? (
          <Button
            onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        ) : (
          <Button
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={() => setShowSubmitConfirm(true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Exam'}
          </Button>
        )}
      </div>

      {/* Flagged Questions Alert */}
      {flaggedQuestions.length > 0 && (
        <Alert className="mt-4 bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            You have flagged {flaggedQuestions.length} question(s) for review.
          </AlertDescription>
        </Alert>
      )}

      <AlertDialog open={showSubmitConfirm} onOpenChange={setShowSubmitConfirm}>
        <AlertDialogContent>
                   <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit? You cannot change your answers after submission.
              {flaggedQuestions.length > 0 && (
                <span className="block mt-2 text-amber-600 font-medium">
                  You still have {flaggedQuestions.length} flagged question(s).
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go Back</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowSubmitConfirm(false); handleSubmit(); }} className="bg-emerald-600 hover:bg-emerald-700">
              Confirm Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result Modal */}
      <AlertDialog open={!!resultData} onOpenChange={() => navigate('/student/dashboard')}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-center">Exam Result</AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-xl">
                <span className="text-gray-500 mb-1">Your Score</span>
                <span className={`text-4xl font-bold ${resultData?.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                  {resultData?.percentage}%
                </span>
                <span className="text-sm text-gray-500 mt-2">
                  {resultData?.score} / {resultData?.totalMarks} marks
                </span>
              </div>
              <p className="text-gray-700">
                {resultData?.passed
                  ? "Congratulations! You have passed the exam."
                  : "Unfortunately, you did not pass. Keep studying!"}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => navigate('/student/dashboard')} className="w-full">
              Return to Dashboard
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
