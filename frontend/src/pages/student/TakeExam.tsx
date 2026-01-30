import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  getExamScheduleById, 
  updateExamSchedule,
  getExamById,
  getQuestionsByExam,
  createStudentExam,
  updateStudentExam,
  getStudentExamByScheduleId
} from '@/lib/dataStore';
import { shuffleArray } from '@/lib/aiQuestionGenerator';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { toast } from 'sonner';
import type { Question, ExamSchedule, Exam } from '@/types';

interface QuestionWithShuffledOptions extends Question {
  shuffledOptions: string[];
  originalIndexMap: number[];
}

export default function TakeExam() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [schedule, setSchedule] = useState<ExamSchedule | null>(null);
  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<QuestionWithShuffledOptions[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isStarted, setIsStarted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentExamId, setStudentExamId] = useState<string | null>(null);
  const [flaggedQuestions, setFlaggedQuestions] = useState<string[]>([]);

  // Load exam data
  useEffect(() => {
    if (scheduleId && user?.studentId) {
      const scheduleData = getExamScheduleById(scheduleId);
      if (!scheduleData) {
        toast.error('Exam schedule not found');
        navigate('/student/dashboard');
        return;
      }

      // Verify student owns this schedule
      if (scheduleData.studentId !== user.studentId) {
        toast.error('Unauthorized access');
        navigate('/student/dashboard');
        return;
      }

      // Check if exam is available
      const now = new Date();
      const examDate = new Date(scheduleData.scheduledDate);
      const [startHour, startMinute] = scheduleData.startTime.split(':').map(Number);
      const [endHour, endMinute] = scheduleData.endTime.split(':').map(Number);
      
      const startTime = new Date(examDate);
      startTime.setHours(startHour, startMinute, 0);
      
      const endTime = new Date(examDate);
      endTime.setHours(endHour, endMinute, 0);

      if (now < startTime) {
        toast.error('Exam has not started yet');
        navigate('/student/dashboard');
        return;
      }

      if (now > endTime && scheduleData.status !== 'in_progress') {
        toast.error('Exam time has expired');
        navigate('/student/dashboard');
        return;
      }

      // Check if already completed
      if (scheduleData.status === 'completed') {
        toast.error('You have already completed this exam');
        navigate('/student/dashboard');
        return;
      }

      // Check attempts
      if (scheduleData.attemptCount >= scheduleData.maxAttempts) {
        toast.error('Maximum attempts reached');
        navigate('/student/dashboard');
        return;
      }

      setSchedule(scheduleData);

      const examData = getExamById(scheduleData.examId);
      if (examData) {
        setExam(examData);
        
        // Get and shuffle questions
        let examQuestions = getQuestionsByExam(examData.id);
        
        // Shuffle questions if enabled
        if (examData.shuffleQuestions) {
          examQuestions = shuffleArray(examQuestions);
        }
        
        // Limit to totalQuestions
        examQuestions = examQuestions.slice(0, examData.totalQuestions);

        // Shuffle options if enabled and prepare questions
        const processedQuestions: QuestionWithShuffledOptions[] = examQuestions.map(q => {
          let shuffledOptions = [...q.options];
          let originalIndexMap = q.options.map((_, i) => i);
          
          if (examData.shuffleOptions && q.questionType === 'multiple_choice') {
            const indices = q.options.map((_, i) => i);
            const shuffledIndices = shuffleArray(indices);
            shuffledOptions = shuffledIndices.map(i => q.options[i]);
            originalIndexMap = shuffledIndices;
          }
          
          return {
            ...q,
            shuffledOptions,
            originalIndexMap,
          };
        });

        setQuestions(processedQuestions);
        setTimeRemaining(examData.duration * 60); // Convert to seconds

        // Check for existing in-progress exam
        const existingStudentExam = getStudentExamByScheduleId(scheduleId);
        if (existingStudentExam && existingStudentExam.status === 'in_progress') {
          setStudentExamId(existingStudentExam.id);
          setAnswers(existingStudentExam.answers);
          // Calculate remaining time
          const elapsed = Math.floor((Date.now() - new Date(existingStudentExam.startedAt || Date.now()).getTime()) / 1000);
          setTimeRemaining(Math.max(0, examData.duration * 60 - elapsed));
          setIsStarted(true);
        }
      }
    }
  }, [scheduleId, user, navigate]);

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
    if (!schedule || !exam || !user?.studentId) return;

    // Update schedule status
    updateExamSchedule(schedule.id, {
      status: 'in_progress',
      attemptCount: schedule.attemptCount + 1,
    });

    // Create student exam record
    const studentExam = createStudentExam({
      examScheduleId: schedule.id,
      studentId: user.studentId,
      examId: exam.id,
      questions: questions.map(q => q.id),
      answers: {},
      score: 0,
      totalMarks: questions.reduce((sum, q) => sum + q.marks, 0),
      percentage: 0,
      status: 'in_progress',
      startedAt: new Date().toISOString(),
      timeSpent: 0,
    });

    setStudentExamId(studentExam.id);
    setIsStarted(true);
  };

  const handleAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));

    // Auto-save
    if (studentExamId) {
      updateStudentExam(studentExamId, {
        answers: {
          ...answers,
          [questionId]: answer,
        },
      });
    }
  };

  const toggleFlagQuestion = (questionId: string) => {
    setFlaggedQuestions(prev => 
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  const calculateScore = () => {
    let score = 0;
    questions.forEach(q => {
      const answer = answers[q.id];
      if (!answer) return;

      if (q.questionType === 'multiple_choice' || q.questionType === 'true_false') {
        const selectedIndex = parseInt(answer);
        const originalIndex = q.originalIndexMap[selectedIndex];
        if (originalIndex === q.correctAnswer) {
          score += q.marks;
        }
      } else if (q.questionType === 'fill_blank') {
        if (answer.toLowerCase().trim() === (q.correctAnswer as string).toLowerCase().trim()) {
          score += q.marks;
        }
      }
    });
    return score;
  };

  const handleSubmit = async (isTimeout: boolean = false) => {
    if (!studentExamId || !exam) return;

    setIsSubmitting(true);

    const score = calculateScore();
    const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
    const percentage = Math.round((score / totalMarks) * 100);
    const timeSpent = exam.duration * 60 - timeRemaining;

    updateStudentExam(studentExamId, {
      answers,
      score,
      totalMarks,
      percentage,
      status: isTimeout ? 'timeout' : 'completed',
      submittedAt: new Date().toISOString(),
      timeSpent,
    });

    if (schedule) {
      updateExamSchedule(schedule.id, {
        status: 'completed',
      });
    }

    toast.success(isTimeout ? 'Exam submitted (Time expired)' : 'Exam submitted successfully');
    navigate('/student/dashboard');
  };

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0;

  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {exam?.title}
            </h1>
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="text-lg font-semibold">{exam?.duration} minutes</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-500">Questions</p>
                  <p className="text-lg font-semibold">{questions.length}</p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold text-amber-800 mb-2">Important Instructions:</h3>
                <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                  <li>You have {exam?.duration} minutes to complete this exam</li>
                  <li>The timer starts when you click &quot;Start Exam&quot;</li>
                  <li>Do not refresh or close the browser</li>
                  <li>All questions must be answered before submission</li>
                  <li>Click the flag icon to mark questions for review</li>
                  <li>Your answers are auto-saved as you progress</li>
                </ul>
              </div>
            </div>
            <Button 
              className="w-full" 
              size="lg"
              onClick={handleStartExam}
            >
              Start Exam
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
        {questions.map((q, index) => (
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
                <h2 className="text-lg font-medium">{currentQuestion.questionText}</h2>
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
              {currentQuestion.questionType === 'multiple_choice' && (
                currentQuestion.shuffledOptions.map((option, index) => (
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

              {currentQuestion.questionType === 'true_false' && (
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

              {currentQuestion.questionType === 'fill_blank' && (
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
            onClick={() => {
              if (confirm('Are you sure you want to submit? You cannot change your answers after submission.')) {
                handleSubmit();
              }
            }}
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
    </div>
  );
}
