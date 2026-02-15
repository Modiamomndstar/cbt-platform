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
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-6 pb-2">
          <div className="flex justify-between items-start">
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
        </DialogHeader>

        <div className="px-6 py-2 bg-slate-50 border-y flex justify-between items-center text-sm">
           <div className="flex gap-4">
             <div>
               <span className="text-gray-500">Score:</span>
               <span className="font-bold ml-1">{result.score} / {result.totalMarks}</span>
             </div>
             <div>
               <span className="text-gray-500">Percentage:</span>
               <span className={`font-bold ml-1 ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                 {result.percentage}% ({result.passed ? 'PASS' : 'FAIL'})
               </span>
             </div>
             <div>
                <span className="text-gray-500">Time Spent:</span>
                <span className="font-bold ml-1">{result.timeSpentMinutes} min</span>
             </div>
           </div>
           <div className="text-gray-500">
             Submitted: {new Date(result.submittedAt).toLocaleString()}
           </div>
        </div>

        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {result.questions.map((q, index) => (
              <div key={q.id} className={`border rounded-lg p-4 ${q.isCorrect ? 'bg-green-50/50 border-green-200' : 'bg-red-50/50 border-red-200'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex gap-2">
                    <span className="font-bold text-gray-700">Q{index + 1}.</span>
                    <div className="font-medium text-gray-900" dangerouslySetInnerHTML={{ __html: q.text }} />
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
