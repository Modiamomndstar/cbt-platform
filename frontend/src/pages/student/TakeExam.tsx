import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { scheduleAPI, resultAPI, examAPI } from '@/services/api';
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, Flag, ShieldCheck, AlertCircle, Play, Save, WifiOff, CloudOff, CloudUpload } from 'lucide-react';
import { toast } from 'sonner';
import { secureSet, secureGet, secureRemove } from '@/lib/storage';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

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
import { Checkbox } from "@/components/ui/checkbox";
import Webcam from "react-webcam";
import imageCompression from 'browser-image-compression';

const IdentityVerification = ({ onVerified, scheduleId }: { onVerified: (url: string) => void, scheduleId: string }) => {
  const webcamRef = useRef<any>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleCapture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
       setCapturedImage(imageSrc);
    }
  }, [webcamRef]);

  const handleUpload = async () => {
    if (!capturedImage) return;
    setIsUploading(true);
    try {
      // Convert base64 to Blob
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      const initialFile = new File([blob], "identity.jpg", { type: "image/jpeg" });
      
      // Compress image
      const options = {
        maxSizeMB: 0.1, // 100KB target
        maxWidthOrHeight: 640,
        useWebWorker: true
      };
      const compressedBlob = await imageCompression(initialFile, options);
      const file = new File([compressedBlob], `identity_${scheduleId}.jpg`, { type: 'image/jpeg' });
      
      const response = await examAPI.uploadIdentitySnapshot(scheduleId, file);
      if (response.data.success) {
        onVerified(response.data.data.imageUrl);
        toast.success("Identity verified successfully!");
      }
    } catch (err) {
      console.error("Selfie upload failed:", err);
      toast.error("Failed to verify identity. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
          <ShieldCheck className="text-primary w-6 h-6" />
          Face Verification
        </h2>
        <p className="text-muted-foreground max-w-md">
          This is a secure exam. Please take a clear selfie to verify your identity before starting.
        </p>
      </div>

      <div className="relative rounded-2xl overflow-hidden border-4 border-muted shadow-2xl bg-black aspect-video w-full max-w-md">
        {!capturedImage ? (
          <Webcam
            audio={false}
            ref={webcamRef}
            screenshotFormat="image/jpeg"
            videoConstraints={{ facingMode: "user" }}
            className="w-full h-full object-cover"
          />
        ) : (
          <img src={capturedImage} className="w-full h-full object-cover" alt="Captured" />
        )}
      </div>

      <div className="flex gap-4">
        {!capturedImage ? (
          <Button onClick={handleCapture} size="lg" className="rounded-full px-8">
            Capture Photo
          </Button>
        ) : (
          <>
            <Button variant="outline" onClick={() => setCapturedImage(null)} disabled={isUploading} className="rounded-full">
              Retake
            </Button>
            <Button onClick={handleUpload} disabled={isUploading} size="lg" className="rounded-full px-8 bg-green-600 hover:bg-green-700">
              {isUploading ? "Verifying..." : "Verify & Continue"}
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
        <Clock className="w-3 h-3" />
        Verification takes less than 10 seconds.
      </div>
    </div>
  );
};

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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  
  // Offline Resilience
  const isOnline = useNetworkStatus();
  const [isSyncingOutbox, setIsSyncingOutbox] = useState(false);

  // Anti-cheating state
  const [violations, setViolations] = useState<any[]>([]);
  const [showRules, setShowRules] = useState(false);
  const [maxViolations, setMaxViolations] = useState(3);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);

  // Load exam data
  useEffect(() => {
    if (scheduleId) {
      loadSchedule();
    }
  }, [scheduleId]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const response = await scheduleAPI.getMyExams();
      if (response.data.success) {
        const schedules = response.data.data || [];
        const mySchedule = schedules.find((s: any) => s.id === scheduleId);
        if (mySchedule) {
          setSchedule(mySchedule);
          const dur = mySchedule.durationMinutes || mySchedule.duration || mySchedule.exam_duration || 60;

          setExam({
            title: mySchedule.examTitle || 'Exam',
            duration: dur,
            category: mySchedule.examCategory || '',
            isCompetition: !!mySchedule.competitionId,
            rules: mySchedule.competitionRules || '',
            isSecureMode: !!mySchedule.isSecureMode,
            maxViolations: mySchedule.maxViolations ?? 3
          });

          setMaxViolations(mySchedule.maxViolations ?? 3);
          setTimeRemaining(dur * 60);

          if (mySchedule.accessCode) {
            setAccessCode(mySchedule.accessCode);
          }

          // Load existing violations from backend
          try {
            const statusRes = await examAPI.getSecurityStatus(scheduleId as string);
            if (statusRes.data.success) {
              const { isDisqualified, identitySnapshotUrl } = statusRes.data.data;
              if (isDisqualified) {
                 toast.error("This session is disqualified.");
                 navigate('/student/exams');
                 return;
              }
              if (identitySnapshotUrl) {
                setIdentityVerified(true);
              }
            }
          } catch (e) {
            console.warn("Could not sync security status on load");
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

  // Anti-cheating listeners
  useEffect(() => {
    if (!isStarted || (!exam?.isCompetition && !exam?.isSecureMode) || maxViolations === 0) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordViolation('tab_switch', 'User switched tabs or minimized window');
      }
    };

    const handleBlur = () => {
       recordViolation('window_blur', 'Window lost focus');
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isStarted && (exam?.isCompetition || exam?.isSecureMode)) {
        setIsFullscreen(false);
        recordViolation('fullscreen_exit', 'User exited fullscreen mode');
      } else if (document.fullscreenElement) {
        setIsFullscreen(true);
      }
    };

    const recordViolation = async (type: string, description: string) => {
      // 1. Update local UI state
      setViolations((prev: any[]) => {
        const newViolation = {
          type,
          timestamp: new Date().toISOString(),
          description
        };
        const updated = [...prev, newViolation];
        
        toast.error(`SECURITY VIOLATION: ${description}`, {
          description: `Warning ${updated.length} of ${maxViolations}.`,
          duration: 10000,
          id: 'violation-toast'
        });

        return updated;
      });

      // 2. Report to Backend
      try {
        const response = await examAPI.recordViolation({
          scheduleId: scheduleId!,
          violationType: type,
          metadata: { description, url: window.location.href }
        });

        if (response.data.success) {
           const { isDisqualified } = response.data.data;
           if (isDisqualified) {
              toast.error("SECURITY DISQUALIFICATION", {
                description: "Maximum violations reached. Your exam is being submitted.",
                duration: 5000
              });
              handleSubmit(true); // Auto-submit due to disqualification
           }
        }
      } catch (err) {
        console.error('Failed to report violation:', err);
        // We still trust local state for immediate feedback
        if (violations.length + 1 >= maxViolations) {
           handleSubmit(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isStarted, exam, maxViolations]);

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

  // Restore State on Start
  const restoreExamState = (sId: string, serverMaxDuration: number) => {
    const savedState = secureGet<any>(`examState_${sId}`);
    if (savedState) {
      setAnswers(savedState.answers || {});
      setFlaggedQuestions(savedState.flaggedQuestions || []);
      setViolations(savedState.violations || []);

      // Calculate elapsed time from the saved start time
      if (savedState.startTime) {
         const trueStart = new Date(savedState.startTime);
         setExamStartTime(trueStart);

         const elapsedSeconds = Math.floor((new Date().getTime() - trueStart.getTime()) / 1000);
         const newRemaining = Math.max(0, serverMaxDuration - elapsedSeconds);
         setTimeRemaining(newRemaining);
      } else {
         setTimeRemaining(serverMaxDuration);
         setExamStartTime(new Date());
      }

      toast.success('Restored previous exam progress from browser cache!');
      return true;
    }
    return false;
  };

  // Auto-save logic
  useEffect(() => {
    if (!isStarted || !scheduleId || !exam) return;

    // Save every time one of these state variables changes
    secureSet(`examState_${scheduleId}`, {
      answers,
      flaggedQuestions,
      violations,
      startTime: examStartTime?.toISOString()
    });
    setLastSaved(new Date());
  }, [answers, flaggedQuestions, violations, isStarted, scheduleId, examStartTime]);

  const handleStartExam = async () => {
    if (!scheduleId) return;

    if ((exam?.isCompetition || exam?.isSecureMode) && !showRules) {
      setShowRules(true);
      return;
    }

    // Try to enter fullscreen
    if (exam?.isCompetition || exam?.isSecureMode) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } catch (err) {
        console.error('Failed to enter fullscreen:', err);
        toast.error('Fullscreen is required for this secure exam. Please enable it to proceed.');
        return;
      }
    }

    setVerifying(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const response = await scheduleAPI.verifyAccess(scheduleId, accessCode, timezone);
      if (response.data.success) {
        const data = response.data.data;
        const examQuestions = data.questions || [];

        const processedQuestions = examQuestions.map((q: any) => ({
          ...q,
          id: q.id,
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options || [],
          marks: q.marks || 5,
        }));

        setQuestions(processedQuestions);

        let serverMaxDuration = 60 * 60; // fallback to 1 hour
        if (data.durationMinutes) {
          serverMaxDuration = data.durationMinutes * 60;
        } else if (data.duration) {
          serverMaxDuration = data.duration * 60;
        }

        const restored = restoreExamState(scheduleId, serverMaxDuration);

        if (!restored) {
          setTimeRemaining(serverMaxDuration);
          setExamStartTime(new Date());
        }

        setIsStarted(true);
        setShowRules(false);
        toast.success(exam?.isCompetition ? 'Competition started! Monitor your security status.' : 'Exam started!');
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

  const handleSubmit = async (isTimeout: boolean = false, currentViolations?: any[]) => {
    if (!scheduleId) return;

    setIsSubmitting(true);

    const timeSpentMinutes = examStartTime
      ? Math.round((new Date().getTime() - examStartTime.getTime()) / 60000)
      : 0;

    const payload = {
      scheduleId,
      answers,
      flaggedQuestions,
      autoSubmitted: isTimeout,
      timeSpentMinutes,
      violations: currentViolations || violations
    };

    if (!isOnline) {
      // Network is offline. Queue submission to Outbox.
      const outbox = secureGet<any[]>('examOutbox') || [];
      outbox.push(payload);
      secureSet('examOutbox', outbox);
      
      // Clean active exam state
      secureRemove(`examState_${scheduleId}`);
      
      toast.error('Network disconnected. Exam saved securely offline.', {
        description: 'Please do not close this browser. We will automatically submit when your connection returns.'
      });
      setIsSubmitting(false);
      setResultData({
         isOfflineQueued: true,
         message: "Your exam was saved locally because you are offline. Keep this window open—it will automatically submit once internet is restored."
      });
      return;
    }

    try {
      const response = await resultAPI.submit(payload);

      toast.success(isTimeout ? 'Exam auto-submitted' : 'Exam submitted successfully');

      if (response.data.data && response.data.data.percentage !== undefined) {
          setResultData(response.data.data);
      } else {
          navigate('/student/dashboard');
      }

    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to submit exam';
      toast.error(msg);
      setIsSubmitting(false);
    } finally {
      // Clean up secure storage so they don't resume an already submitted exam
      secureRemove(`examState_${scheduleId}`);
    }
  };

  // Attempt Outbox Sync when internet returns
  useEffect(() => {
     if (isOnline && !isSyncingOutbox) {
        const outbox = secureGet<any[]>('examOutbox');
        if (outbox && outbox.length > 0) {
           syncOutbox(outbox);
        }
     }
  }, [isOnline]);

  const syncOutbox = async (outbox: any[]) => {
     setIsSyncingOutbox(true);
     toast.info('Internet restored. Syncing offline exams...', { icon: <CloudUpload className="h-4 w-4" /> });
     
     const remainingOutbox = [...outbox];
     let syncSuccessCount = 0;

     for (let i = outbox.length - 1; i >= 0; i--) {
        const payload = outbox[i];
        try {
           const response = await resultAPI.submit(payload);
           remainingOutbox.splice(i, 1); // remove from array if successful
           secureSet('examOutbox', remainingOutbox); // immediately save new state
           
           if (response.data.data && response.data.data.percentage !== undefined) {
              setResultData(response.data.data); // Update UI with actual score if they were staring at the offline screen
           }
           syncSuccessCount++;
        } catch (err: any) {
           console.error('Failed to sync offline item', err);
        }
     }
     
     setIsSyncingOutbox(false);
     if (syncSuccessCount > 0) {
        toast.success(`Successfully synced ${syncSuccessCount} offline exam(s).`);
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

  // Rules Disclosure Modal
  if (showRules) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="border-2 border-indigo-600 shadow-2xl overflow-hidden rounded-3xl">
          <div className="bg-indigo-600 p-6 text-white">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <ShieldCheck className="h-8 w-8" />
              {exam?.isCompetition ? 'Competition Rules' : 'CBT Assessment Rules'}
            </h2>
            <p className="text-indigo-100 mt-1">Please read carefully before beginning</p>
          </div>
          <CardContent className="p-8">
            <div className="space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 prose prose-slate max-w-none">
                <h3 className="text-lg font-bold text-slate-900 mb-2">Terms & Regulations</h3>
                <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                  {exam?.rules || `No specific rules provided for this ${exam?.isCompetition ? 'competition' : 'assessment'}.`}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">Anti-Cheating</h4>
                    <p className="text-xs text-amber-700">Max {maxViolations} tab switches permitted. System logs all focus loss.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <Clock className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-blue-900 text-sm">Timer Policy</h4>
                    <p className="text-xs text-blue-700">Once started, the timer cannot be paused or reset.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Checkbox
                  id="agree"
                  checked={hasAgreed}
                  onCheckedChange={(checked) => setHasAgreed(checked === true)}
                  className="h-5 w-5 border-2 border-indigo-600 data-[state=checked]:bg-indigo-600"
                />
                <label
                  htmlFor="agree"
                  className="text-sm font-bold text-slate-700 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  I have read and agree to follow all the rules of this {exam?.isCompetition ? 'competition' : 'assessment'}.
                </label>
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  className="w-full bg-indigo-600 hover:bg-indigo-700 h-14 rounded-2xl font-bold text-lg group transition-all"
                  onClick={handleStartExam}
                  disabled={verifying || !hasAgreed}
                >
                  {verifying ? 'Starting...' : (
                    <div className="flex items-center gap-2">
                       Enter Fullscreen & Launch {exam?.isCompetition ? 'Competition' : 'Assessment'}
                       <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  )}
                </Button>
                <Button variant="ghost" onClick={() => setShowRules(false)} className="rounded-xl">
                  Go Back
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (exam?.isSecureMode && !identityVerified) {
    return (
      <div className="container max-w-4xl py-12">
        <Card className="shadow-2xl border-none overflow-hidden bg-gradient-to-b from-white to-slate-50">
          <CardContent className="p-0">
            <IdentityVerification 
              scheduleId={scheduleId as string} 
              onVerified={() => {
                setIdentityVerified(true);
              }} 
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isStarted) {
    return (
      <div className="max-w-2xl mx-auto py-8">
        <Card className="rounded-3xl shadow-lg border-0 bg-white/50 backdrop-blur-sm overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-emerald-400 to-indigo-500" />
          <CardContent className="p-8">
            <h1 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">
              {exam?.title || 'Exam'}
            </h1>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Duration</p>
                  <p className="text-xl font-black text-slate-900">{exam?.duration || 60} mins</p>
                </div>
                <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category</p>
                  <p className="text-xl font-black text-slate-900">{exam?.category || 'General'}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Access Code</label>
                <input
                  type="text"
                  placeholder="Enter your exam access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full p-4 border-2 border-slate-100 bg-slate-50 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all font-mono tracking-widest"
                />
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5">
                <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Candidate Instructions:
                </h3>
                <ul className="text-sm text-indigo-700 space-y-2 font-medium">
                  <li className="flex gap-2 items-start"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" /> Timer starts immediately upon launch.</li>
                  <li className="flex gap-2 items-start"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" /> Do not refresh or use browser navigation.</li>
                  <li className="flex gap-2 items-start"><span className="h-1.5 w-1.5 rounded-full bg-indigo-500 mt-1.5 shrink-0" /> {exam?.isCompetition ? 'Competition' : 'Assessment'}s have strict anti-cheating protocols.</li>
                </ul>
              </div>

              <Button
                className={`w-full h-14 rounded-2xl font-bold text-lg shadow-lg transition-all ${
                   exam?.isCompetition ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                }`}
                onClick={handleStartExam}
                disabled={verifying || !accessCode.trim()}
              >
                {verifying ? (
                   <div className="flex items-center gap-2">
                      <div className="h-5 w-5 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                      Authenticating...
                   </div>
                ) : (
                   <div className="flex items-center gap-2">
                      {exam?.isCompetition ? <ShieldCheck className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                      Launch {exam?.isCompetition ? 'Competition' : 'Assessment'}
                   </div>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="max-w-5xl mx-auto select-none"
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
      onPaste={(e) => e.preventDefault()}
    >
      {/* Offline Banner */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600/90 text-white shadow-xl backdrop-blur-md px-4 py-2 flex items-center justify-center gap-3">
           <WifiOff className="h-5 w-5 animate-pulse" />
           <p className="font-bold text-sm tracking-wide">
             You are currently offline. Don't worry, your answers are safely saved locally. Keep taking your exam.
           </p>
        </div>
      )}

      {/* Header */}
      <div className={`sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b pb-4 mb-6 px-4 rounded-b-3xl shadow-sm transition-all ${!isOnline ? 'pt-12' : 'pt-2'}`}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Badge className={`${exam?.isCompetition ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200'} rounded-full px-3`}>
                  {exam?.isCompetition ? 'Competition Mode' : 'Standard Assessment'}
               </Badge>
                {exam?.isCompetition && (
                   <Badge className={`${
                      isFullscreen ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100 animate-pulse'
                   } rounded-full`}>
                      {isFullscreen ? 'Fullscreen Locked' : 'Fullscreen Escaped!'}
                   </Badge>
                )}
             </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">{exam?.title}</h1>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <div className={`flex items-center space-x-2 px-6 py-3 rounded-2xl border-2 transition-all shadow-sm ${
              timeRemaining < 300 ? 'bg-red-50 text-red-700 border-red-200 animate-pulse' : 'bg-slate-50 border-slate-100 text-slate-900 font-bold'
            }`}>
              <Clock className={`h-5 w-5 ${timeRemaining < 300 ? 'text-red-500' : 'text-slate-400'}`} />
              <span className="text-2xl font-mono">
                {formatTime(timeRemaining)}
              </span>
            </div>
            {lastSaved && (
              <div className="hidden lg:flex items-center text-[10px] text-slate-400 font-bold bg-slate-50 px-3 py-1.5 rounded-full border">
                 <Save className="h-3 w-3 mr-1" />
                 Saved {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            <Button
               variant="outline"
               className="rounded-xl border-dashed border-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
               onClick={() => setShowSubmitConfirm(true)}
            >
               End
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
           <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
              <span>Overall Progress</span>
              <span>{answeredCount} of {questions.length} Attempted</span>
           </div>
           <Progress value={progress} className={`h-2.5 rounded-full ${exam?.isCompetition ? 'bg-indigo-50' : 'bg-emerald-50'}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 px-4">
        {/* Sidebar Nav */}
        <div className="lg:col-span-1 space-y-6">
           <Card className="rounded-3xl border-0 bg-slate-50 p-6">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Question Grid</h3>
              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-3 gap-2">
                {questions.map((q: any, index: number) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`h-10 rounded-xl text-xs font-bold transition-all transform hover:scale-105 ${
                      index === currentQuestionIndex
                        ? 'bg-slate-900 text-white shadow-lg ring-4 ring-slate-200'
                        : answers[q.id]
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                        : flaggedQuestions.includes(q.id)
                        ? 'bg-amber-400 text-white'
                        : 'bg-white text-slate-400 hover:bg-slate-200 border border-slate-100'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-slate-200 space-y-3">
                 <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" /> Answered
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <div className="h-2 w-2 rounded-full bg-amber-400" /> Flagged
                 </div>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                    <div className="h-2 w-2 rounded-full bg-slate-900" /> Current
                 </div>
              </div>
           </Card>
        </div>

        {/* Main Question Area */}
        <div className="lg:col-span-3 pb-20">
          {currentQuestion && (
            <Card className="border-0 shadow-sm overflow-hidden rounded-[32px] bg-white">
              <div className="bg-slate-50 flex items-center justify-between px-8 py-4 border-b">
                 <Badge variant="outline" className="bg-white text-slate-600 font-bold px-3 py-1 border-slate-100">
                    Question {currentQuestionIndex + 1}
                 </Badge>
                 <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{currentQuestion.marks} Point(s)</span>
                    <button
                      onClick={() => toggleFlagQuestion(currentQuestion.id)}
                      className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                        flaggedQuestions.includes(currentQuestion.id)
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-white text-slate-300 hover:text-slate-500 border border-slate-100'
                      }`}
                    >
                      <Flag className="h-4 w-4" />
                    </button>
                 </div>
              </div>
              <CardContent className="p-10">
                <h2 className="text-2xl font-black text-slate-900 leading-snug mb-10">
                  {currentQuestion.questionText}
                </h2>

                <div className="space-y-4">
                  {currentQuestion.questionType === 'multiple_choice' && (
                    (currentQuestion.options || []).map((option: string, index: number) => (
                      <label
                        key={index}
                        className={`flex items-center p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                          answers[currentQuestion.id] === index.toString()
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-md transform scale-[1.01]'
                            : 'border-slate-50 hover:bg-slate-50 hover:border-slate-100'
                        }`}
                      >
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center mr-4 transition-all ${
                           answers[currentQuestion.id] === index.toString()
                           ? 'border-indigo-600 bg-indigo-600'
                           : 'border-slate-200'
                        }`}>
                           {answers[currentQuestion.id] === index.toString() && <div className="h-2 w-2 rounded-full bg-white transition-all" />}
                        </div>
                        <input
                          type="radio"
                          className="sr-only"
                          name={`question-${currentQuestion.id}`}
                          value={index}
                          checked={answers[currentQuestion.id] === index.toString()}
                          onChange={() => handleAnswer(currentQuestion.id, index.toString())}
                        />
                        <span className={`text-lg transition-all ${
                           answers[currentQuestion.id] === index.toString() ? 'font-black text-indigo-900' : 'font-medium text-slate-600'
                        }`}>
                           <span className="text-slate-400 mr-2 text-sm">{String.fromCharCode(65 + index)}.</span>
                           {option}
                        </span>
                      </label>
                    ))
                  )}

                  {currentQuestion.questionType === 'true_false' && (
                    ['True', 'False'].map((option, index) => (
                      <label
                        key={index}
                        className={`flex items-center p-6 border-2 rounded-2xl cursor-pointer transition-all ${
                          answers[currentQuestion.id] === index.toString()
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-md transform scale-[1.01]'
                            : 'border-slate-50 hover:bg-slate-50 hover:border-slate-100'
                        }`}
                      >
                        <div className={`h-6 w-6 rounded-full border-2 flex items-center justify-center mr-4 ${
                           answers[currentQuestion.id] === index.toString() ? 'border-indigo-600 bg-indigo-600' : 'border-slate-200'
                        }`}>
                           {answers[currentQuestion.id] === index.toString() && <div className="h-2 w-2 rounded-full bg-white" />}
                        </div>
                        <input
                          type="radio"
                          className="sr-only"
                          name={`question-${currentQuestion.id}`}
                          value={index}
                          checked={answers[currentQuestion.id] === index.toString()}
                          onChange={() => handleAnswer(currentQuestion.id, index.toString())}
                        />
                        <span className={`text-lg ${
                           answers[currentQuestion.id] === index.toString() ? 'font-black text-indigo-900' : 'font-medium text-slate-600'
                        }`}>{option}</span>
                      </label>
                    ))
                  )}

                  {currentQuestion.questionType === 'fill_blank' && (
                    <input
                      type="text"
                      placeholder="Type your answer here..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                      className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:ring-4 focus:ring-indigo-100 focus:border-indigo-600 transition-all font-bold text-lg"
                    />
                  )}

                  {!['multiple_choice', 'true_false', 'fill_blank'].includes(currentQuestion.questionType) && (
                    <Alert className="bg-amber-50 border-amber-200">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <AlertDescription className="text-amber-800">
                        This question type ({currentQuestion.questionType}) is not supported for automatic grading or requires a special input method. Please contact your tutor if you are unsure how to proceed.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Controls */}
          <div className="mt-8 flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
            <Button
              variant="ghost"
              className="rounded-2xl h-12 px-6 font-bold text-slate-500 hover:bg-slate-50"
              onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQuestionIndex === 0}
            >
              <ChevronLeft className="h-5 w-5 mr-2" />
              Previous
            </Button>

            <div className="flex gap-4">
               {currentQuestionIndex < questions.length - 1 ? (
                 <Button
                   className={`rounded-2xl h-12 px-8 font-black shadow-lg transition-all ${
                      exam?.isCompetition ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-slate-900 hover:bg-black shadow-slate-100'
                   }`}
                   onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                 >
                   Next Question
                   <ChevronRight className="h-5 w-5 ml-2" />
                 </Button>
               ) : (
                 <Button
                   className="rounded-2xl h-14 px-12 font-black shadow-lg bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100 text-lg"
                   onClick={() => setShowSubmitConfirm(true)}
                   disabled={isSubmitting}
                 >
                   {isSubmitting ? (
                      <div className="flex items-center gap-2">
                         <div className="h-4 w-4 border-2 border-white/30 border-t-white animate-spin rounded-full" />
                         Submitting...
                      </div>
                   ) : 'Finalize & Submit'}
                 </Button>
               )}
            </div>
          </div>
        </div>
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
      <AlertDialog open={!!resultData} onOpenChange={() => { if (!resultData?.isOfflineQueued) navigate('/student/dashboard'); }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl text-center">
               {resultData?.isOfflineQueued ? 'Exam Saved Offline' : 'Exam Result'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center space-y-4">
              {resultData?.isOfflineQueued ? (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-slate-200">
                  <CloudOff className="h-12 w-12 text-slate-400 mb-4 animate-pulse" />
                  <p className="text-slate-700 font-bold mb-2">Network Disconnected</p>
                  <p className="text-sm text-slate-500">
                    {resultData.message}
                  </p>
                </div>
              ) : resultData?.isDisqualified ? (
                <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-xl border border-red-100">
                  <ShieldCheck className="h-12 w-12 text-red-500 mb-2 opacity-50" />
                  <span className="text-red-500 font-black text-xl mb-1 uppercase tracking-tighter">Disqualified</span>
                  <span className="text-sm text-red-700 font-medium">
                    Security threshold exceeded. Your result has been voided.
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl">
                  <span className="text-slate-500 mb-1 font-bold text-xs uppercase tracking-widest">Your Score</span>
                  <span className={`text-4xl font-black ${resultData?.passed ? 'text-emerald-600' : 'text-red-600'}`}>
                    {resultData?.percentage}%
                  </span>
                  <span className="text-sm text-slate-500 mt-2 font-bold tabular-nums">
                    {resultData?.score} / {resultData?.totalMarks} marks
                  </span>
                </div>
              )}
              {!resultData?.isOfflineQueued && (
                <p className="text-slate-600 font-medium">
                  {resultData?.isDisqualified
                    ? "Due to multiple security violations, this attempt has been flagged and your score is 0."
                    : (resultData?.passed
                      ? "Congratulations! You have passed the exam."
                      : "Unfortunately, you did not pass. Keep studying!")}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
             {resultData?.isOfflineQueued ? (
               <Button onClick={() => window.location.reload()} variant="outline" className="w-full h-12">
                 Refresh Page
               </Button>
             ) : (
               <Button onClick={() => navigate('/student/dashboard')} className="w-full">
                 Return to Dashboard
               </Button>
             )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
