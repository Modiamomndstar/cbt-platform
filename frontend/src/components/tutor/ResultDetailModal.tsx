// import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
// import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Printer, Check, XCircle, AlertCircle } from 'lucide-react';

interface QuestionDetail {
  id: string;
  text: string;
  type: string;
  options: any;
  correctAnswer: string;
  marks: number;
  studentAnswer: string | null;
  marksObtained: number;
  isCorrect: boolean;
  explanation?: string;
  isFlagged?: boolean;
}

interface ResultDetail {
  id: string;
  studentName: string;
  registrationNumber: string | null;
  examTitle: string;
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  status: string;
  timeSpentMinutes: number;
  submittedAt: string;
  questions: QuestionDetail[];
}

interface ResultDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: ResultDetail | null;
}

export function ResultDetailModal({ isOpen, onClose, result }: ResultDetailModalProps) {
  if (!result) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 dialog-content-print">
        <DialogHeader className="p-6 pb-2">
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              .fixed, .absolute, .print\\:hidden { display: none !important; }
              .dialog-content-print {
                position: static !important;
                transform: none !important;
                width: 100% !important;
                max-width: none !important;
                height: auto !important;
                max-height: none !important;
                display: block !important;
                overflow: visible !important;
              }
              .scroll-area-print {
                overflow: visible !important;
                height: auto !important;
                display: block !important;
              }
              body { background: white !important; }
              .rounded-lg, .border { border-color: #e2e8f0 !important; }
              div { overflow: visible !important; }
              @page { margin: 2cm; }
            }
          `}} />
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              /* Hide EVERYTHING outside the modal portal */
              #root,
              header,
              aside,
              button[aria-label="Close"],
              .fixed:not([role="dialog"]),
              .absolute:not([role="dialog"]) {
                display: none !important;
              }

              /* Force the Dialog portal to take up full page width/height */
              .dialog-content-print {
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                width: 100% !important;
                max-width: none !important;
                height: auto !important;
                max-height: none !important;
                display: block !important;
                overflow: visible !important;
                padding: 0 !important;
                margin: 0 !important;
                border: none !important;
                box-shadow: none !important;
                background: white !important;
              }

              .scroll-area-print {
                overflow: visible !important;
                height: auto !important;
                display: block !important;
              }

              /* Result Header Report Styles */
              .report-header {
                display: block !important;
                border-bottom: 2px solid #334155 !important;
                margin-bottom: 2rem !important;
                padding-bottom: 1rem !important;
              }

              body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }

              .rounded-lg, .border {
                border-color: #e2e8f0 !important;
              }

              div {
                overflow: visible !important;
              }

              .print\\:hidden {
                display: none !important;
              }

              .no-break {
                page-break-inside: avoid;
              }

              @page {
                margin: 1.5cm;
                size: portrait;
              }
            }
          `}} />
          <div className="flex justify-between items-start print:hidden">
            <div>
              <DialogTitle className="text-2xl font-bold">{result.studentName}</DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                {result.examTitle} • {result.registrationNumber || 'No Reg Num'}
              </p>
            </div>
            <div className="flex gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print / PDF
              </Button>
            </div>
          </div>

          {/* Report Header for Print/PDF - EXPLICITLY FORCING VISIBILITY */}
          <div className="hidden print:block border-b-4 border-slate-900 pb-6 mb-8 mt-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-1 text-left">Exam Result Report</h1>
                <div className="h-1.5 w-32 bg-indigo-600 mb-4"></div>
                <p className="text-slate-500 font-bold text-sm tracking-widest text-left">COMPUTER BASED TEST PLATFORM • OFFICIAL TRANSCRIPT</p>
              </div>
              <div className="text-right flex flex-col items-end">
                 <div className="bg-slate-900 text-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] mb-2 rounded-sm">
                   Authenticated Record
                 </div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Report Generation Date</p>
                 <p className="text-sm font-bold text-slate-900">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mt-10">
              <div className="space-y-6">
                <div className="border-l-4 border-slate-200 pl-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Candidate Full Name</label>
                  <p className="text-xl font-black text-slate-900 leading-tight">{result.studentName}</p>
                </div>
                <div className="border-l-4 border-slate-200 pl-4">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Registration ID / Roll No</label>
                  <p className="text-xl font-bold font-mono text-slate-900 tracking-tighter">{result.registrationNumber || 'N/A'}</p>
                </div>
              </div>
              <div className="space-y-6 text-right">
                <div className="pr-4 border-r-4 border-slate-200">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assessment Title</label>
                  <p className="text-xl font-black text-slate-900 leading-tight">{result.examTitle}</p>
                </div>
                <div className="pr-4 border-r-4 border-slate-200">
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Submission Date & Time</label>
                   <p className="text-xl font-bold text-slate-900">{new Date(result.submittedAt).toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-2 bg-slate-50 border-y flex justify-between items-center text-sm print:bg-white print:border-slate-200">
           <div className="flex gap-6">
             <div>
               <span className="text-gray-500 font-medium">Final Score:</span>
               <span className="font-bold ml-1 text-slate-900">{result.score} / {result.totalMarks}</span>
             </div>
             <div>
               <span className="text-gray-500 font-medium">Performance:</span>
               <span className={`font-bold ml-1 ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                 {Math.round(result.percentage)}% ({result.passed ? 'PASS' : 'FAIL'})
               </span>
             </div>
             <div>
                <span className="text-gray-500 font-medium text-slate-600">Time Taken:</span>
                <span className="font-bold ml-1 text-slate-900">{result.timeSpentMinutes} min</span>
             </div>
           </div>
           <div className="text-gray-500 print:hidden">
             Submitted: {new Date(result.submittedAt).toLocaleString()}
           </div>
        </div>

        <ScrollArea className="flex-1 p-6 scroll-area-print">
          <div className="space-y-6">
            {result.questions.map((q, index) => (
              <div key={q.id} className={`border rounded-lg p-4 no-break mb-6 ${q.isCorrect ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2 items-center">
                    <span className="font-bold text-gray-700">Q{index + 1}.</span>
                    <div className="font-medium text-gray-900" dangerouslySetInnerHTML={{ __html: q.text }} />
                    {q.isFlagged && (
                      <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-700 border-amber-200 gap-1 animate-pulse print:animate-none">
                        <AlertCircle className="h-3 w-3" />
                        Flagged
                      </Badge>
                    )}
                  </div>
                  <Badge variant={q.isCorrect ? 'default' : 'destructive'} className={q.isCorrect ? 'bg-green-600' : ''}>
                    {q.marksObtained} / {q.marks} Marks
                  </Badge>
                </div>

                <div className="ml-8 space-y-2 mt-3 text-sm">
                  {/* Options (if multiple choice) */}
                  {q.type === 'multiple_choice' && Array.isArray(q.options) && (
                    <div className="grid grid-cols-1 gap-1 mb-3">
                      {q.options.map((opt: any, i: number) => {
                         const optText = typeof opt === 'string' ? opt : opt.text;
                         const isSelected = q.studentAnswer === optText;
                         const isCorrectOpt = q.correctAnswer === optText; // Simple check, might need better logic if keys logic differs

                         let rowClass = "p-2 rounded border";
                         if (isSelected && isCorrectOpt) rowClass += " bg-green-100 border-green-300";
                         else if (isSelected && !isCorrectOpt) rowClass += " bg-red-100 border-red-300";
                         else if (isCorrectOpt) rowClass += " bg-green-50 border-green-200 border-dashed"; // Show correct answer if missed
                         else rowClass += " bg-white border-gray-100";

                         return (
                           <div key={i} className={rowClass}>
                             <div className="flex items-center gap-2">
                               {isSelected && isCorrectOpt && <Check className="h-4 w-4 text-green-600" />}
                               {isSelected && !isCorrectOpt && <XCircle className="h-4 w-4 text-red-600" />}
                               {!isSelected && isCorrectOpt && <Check className="h-4 w-4 text-green-400 opacity-50" />}
                               <span>{optText}</span>
                             </div>
                           </div>
                         )
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-2 rounded border">
                      <span className="text-xs text-gray-500 uppercase font-semibold block mb-1">Student Answer</span>
                      <span className={q.isCorrect ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                        {q.studentAnswer || '(No Answer)'}
                      </span>
                    </div>
                     <div className="bg-white p-2 rounded border">
                      <span className="text-xs text-gray-500 uppercase font-semibold block mb-1">Correct Answer</span>
                      <span className="text-gray-900 font-medium">
                        {q.correctAnswer}
                      </span>
                    </div>
                  </div>

                  {q.explanation && (
                    <div className="bg-blue-50 p-2 rounded text-blue-800 text-xs mt-2 flex gap-2 items-start">
                       <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                       <div>
                         <span className="font-semibold block">Explanation:</span>
                         {q.explanation}
                       </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
