import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { examAPI, questionAPI } from '@/services/api';
import {
  parseCSV,
  validateQuestionCSV,
  downloadTemplate,
  type QuestionCSVRow
} from '@/lib/csvParser';
import {
  Plus,
  Upload,
  Download,
  Trash2,
  ArrowLeft,
  FileSpreadsheet,
  BookOpen,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function QuestionBank() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();

  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isAIDialogOpen, setIsAIDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add question form
  const [newQuestion, setNewQuestion] = useState<{
    questionText: string;
    questionType: 'multiple_choice' | 'true_false' | 'fill_blank';
    options: string[];
    correctAnswer: string;
    marks: number;
    difficulty: 'easy' | 'medium' | 'hard';
  }>({
    questionText: '',
    questionType: 'multiple_choice',
    options: ['', '', '', ''],
    correctAnswer: '0',
    marks: 5,
    difficulty: 'medium',
  });

  // Upload preview
  const [uploadPreview, setUploadPreview] = useState<QuestionCSVRow[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // AI Generation
  const [aiMode, setAiMode] = useState<'topic' | 'content'>('topic');
  const [aiForm, setAiForm] = useState({
    topic: '',
    subject: '',
    content: '',
    numQuestions: 5,
    difficulty: 'medium',
    questionType: 'multiple_choice',
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPreview, setAiPreview] = useState<any[]>([]);

  useEffect(() => {
    if (examId) {
      loadExamAndQuestions();
    }
  }, [examId]);

  const loadExamAndQuestions = async () => {
    if (!examId) return;
    try {
      const [examRes, questionsRes] = await Promise.all([
        examAPI.getById(examId),
        questionAPI.getByExam(examId),
      ]);
      if (examRes.data.success) {
        setExam(examRes.data.data);
      } else {
        navigate('/tutor/exams');
        return;
      }
      if (questionsRes.data.success) {
        setQuestions(questionsRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load exam:', err);
      navigate('/tutor/exams');
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async () => {
    if (!examId) return;
    try {
      const response = await questionAPI.getByExam(examId);
      if (response.data.success) {
        setQuestions(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId) return;

    let options: string[] = [];
    let correctAnswer: string | number = newQuestion.correctAnswer;

    switch (newQuestion.questionType) {
      case 'multiple_choice':
        options = newQuestion.options.filter(o => o.trim());
        correctAnswer = parseInt(newQuestion.correctAnswer);
        break;
      case 'true_false':
        options = ['True', 'False'];
        correctAnswer = parseInt(newQuestion.correctAnswer);
        break;
      case 'fill_blank':
        options = [];
        correctAnswer = newQuestion.correctAnswer;
        break;
    }

    try {
      await questionAPI.create({
        examId,
        questionText: newQuestion.questionText,
        questionType: newQuestion.questionType,
        options,
        correctAnswer,
        marks: newQuestion.marks,
        difficulty: newQuestion.difficulty,
      });

      toast.success('Question added successfully');
      setNewQuestion({
        questionText: '',
        questionType: 'multiple_choice',
        options: ['', '', '', ''],
        correctAnswer: '0',
        marks: 5,
        difficulty: 'medium',
      });
      setIsAddDialogOpen(false);
      loadQuestions();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to add question';
      toast.error(msg);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let data: QuestionCSVRow[] = [];

      if (file.name.endsWith('.csv')) {
        data = await parseCSV<QuestionCSVRow>(file);
      } else {
        toast.error('Please upload a CSV file');
        return;
      }

      const validation = validateQuestionCSV(data);
      setUploadPreview(validation.data);
      setUploadErrors(validation.errors);
    } catch (error) {
      toast.error('Error parsing file');
      console.error(error);
    }
  };

  const handleBulkUpload = async () => {
    if (!examId || uploadPreview.length === 0) return;

    const questionsToCreate = uploadPreview.map(row => {
      const options = [row.option1, row.option2, row.option3, row.option4].filter(Boolean) as string[];
      return {
        questionText: row.questionText,
        questionType: row.questionType,
        options,
        correctAnswer: row.questionType === 'fill_blank'
          ? row.correctAnswer
          : parseInt(row.correctAnswer),
        marks: parseInt(row.marks) || 5,
        difficulty: row.difficulty,
      };
    });

    try {
      await questionAPI.bulkCreate(examId, questionsToCreate);
      toast.success(`${questionsToCreate.length} questions added successfully`);
      setIsUploadDialogOpen(false);
      setUploadPreview([]);
      setUploadErrors([]);
      loadQuestions();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to upload questions';
      toast.error(msg);
    }
  };

  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;
    try {
      await questionAPI.delete(questionToDelete);
      toast.success('Question deleted');
      loadQuestions();
    } catch (err: any) {
      toast.error('Failed to delete question');
    } finally {
      setQuestionToDelete(null);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion(prev => ({ ...prev, options: newOptions }));
  };

  // AI Generation
  const handleAIGenerate = async () => {
    if (aiMode === 'topic' && !aiForm.topic.trim()) {
      toast.error('Please enter a topic');
      return;
    }
    if (aiMode === 'content' && !aiForm.content.trim()) {
      toast.error('Please provide learning content');
      return;
    }

    setAiGenerating(true);
    setAiPreview([]);

    try {
      const payload: any = {
        numQuestions: aiForm.numQuestions,
        difficulty: aiForm.difficulty,
        questionType: aiForm.questionType,
        subject: aiForm.subject || exam?.category || '',
      };

      if (aiMode === 'topic') {
        payload.topic = aiForm.topic;
      } else {
        // For content-based, we pass the content as the topic context
        payload.topic = `Based on the following learning content, generate questions:\n\n${aiForm.content}`;
      }

      const response = await questionAPI.aiGenerate(payload);

      if (response.data.success) {
        setAiPreview(response.data.data || []);
        toast.success(`${(response.data.data || []).length} questions generated!`);
      } else {
        toast.error(response.data.message || 'AI generation failed');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to generate questions. Make sure AI is configured.';
      toast.error(msg);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSaveAIQuestions = async () => {
    if (!examId || aiPreview.length === 0) return;

    try {
      const questionsToCreate = aiPreview.map((q) => {
        // Convert correctAnswer from text to index
        let correctAnswer: string | number = 0;
        if (q.options && q.options.length > 0) {
          const idx = q.options.findIndex((o: string) => o === q.correctAnswer);
          correctAnswer = idx >= 0 ? idx : 0;
        } else {
          correctAnswer = q.correctAnswer;
        }

        return {
          questionText: q.questionText,
          questionType: q.questionType || aiForm.questionType,
          options: q.options || [],
          correctAnswer,
          marks: q.marks || 5,
          difficulty: q.difficulty || aiForm.difficulty,
        };
      });

      await questionAPI.bulkCreate(examId, questionsToCreate);
      toast.success(`${questionsToCreate.length} AI-generated questions saved!`);
      setIsAIDialogOpen(false);
      setAiPreview([]);
      setAiForm({ topic: '', subject: '', content: '', numQuestions: 5, difficulty: 'medium', questionType: 'multiple_choice' });
      loadQuestions();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to save questions';
      toast.error(msg);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Exam not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/tutor/exams')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Question Bank</h1>
            <p className="text-gray-600">{exam.title} • {questions.length} questions</p>
          </div>
        </div>
        <div className="flex space-x-2">
          {/* AI Generate Dialog */}
          <Dialog open={isAIDialogOpen} onOpenChange={setIsAIDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200 text-purple-700 hover:from-purple-100 hover:to-blue-100">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center">
                  <Sparkles className="h-5 w-5 mr-2 text-purple-600" />
                  AI Question Generator
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Mode selector */}
                <div className="flex rounded-lg border overflow-hidden">
                  <button
                    onClick={() => setAiMode('topic')}
                    className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                      aiMode === 'topic'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    📝 From Topic
                  </button>
                  <button
                    onClick={() => setAiMode('content')}
                    className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                      aiMode === 'content'
                        ? 'bg-purple-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    📖 From Content
                  </button>
                </div>

                {aiMode === 'topic' ? (
                  <>
                    <div className="space-y-2">
                      <Label>Topic *</Label>
                      <Input
                        placeholder="e.g., Photosynthesis, World War II, Quadratic Equations"
                        value={aiForm.topic}
                        onChange={(e) => setAiForm(prev => ({ ...prev, topic: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Subject</Label>
                      <Input
                        placeholder="e.g., Biology, History, Mathematics"
                        value={aiForm.subject}
                        onChange={(e) => setAiForm(prev => ({ ...prev, subject: e.target.value }))}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <Label>Learning Content / Context *</Label>
                    <Textarea
                      placeholder="Paste your lecture notes, textbook content, or any learning material here. The AI will generate questions based on this content..."
                      value={aiForm.content}
                      onChange={(e) => setAiForm(prev => ({ ...prev, content: e.target.value }))}
                      rows={8}
                    />
                    <p className="text-xs text-gray-500">
                      The AI will analyze this content and create questions directly from it.
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Number of Questions</Label>
                    <Input
                      type="number"
                      min={1}
                      max={20}
                      value={aiForm.numQuestions}
                      onChange={(e) => setAiForm(prev => ({ ...prev, numQuestions: parseInt(e.target.value) || 5 }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <select
                      className="w-full border rounded-md p-2 text-sm"
                      value={aiForm.difficulty}
                      onChange={(e) => setAiForm(prev => ({ ...prev, difficulty: e.target.value }))}
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <select
                      className="w-full border rounded-md p-2 text-sm"
                      value={aiForm.questionType}
                      onChange={(e) => setAiForm(prev => ({ ...prev, questionType: e.target.value }))}
                    >
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True/False</option>
                      <option value="fill_blank">Fill in Blank</option>
                    </select>
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  onClick={handleAIGenerate}
                  disabled={aiGenerating}
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Questions
                    </>
                  )}
                </Button>

                {/* AI Preview */}
                {aiPreview.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-green-700">
                      ✅ {aiPreview.length} questions generated! Review and save:
                    </p>
                    <div className="max-h-64 overflow-auto border rounded-lg divide-y">
                      {aiPreview.map((q, i) => (
                        <div key={i} className="p-3">
                          <p className="text-sm font-medium mb-1">Q{i + 1}: {q.questionText}</p>
                          {q.options && q.options.length > 0 && (
                            <div className="ml-4 space-y-0.5">
                              {q.options.map((opt: string, j: number) => (
                                <p
                                  key={j}
                                  className={`text-xs ${opt === q.correctAnswer ? 'text-green-600 font-medium' : 'text-gray-600'}`}
                                >
                                  {String.fromCharCode(65 + j)}. {opt}
                                  {opt === q.correctAnswer && ' ✓'}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleSaveAIQuestions}
                    >
                      Save All {aiPreview.length} Questions to Exam
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* CSV Upload Dialog */}
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                CSV Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Upload Questions via CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Download the CSV template, fill in your questions, then upload to add them in bulk.
                </p>
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate('questions')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                </div>

                {/* Template info */}
                <div className="bg-blue-50 p-3 rounded-lg text-sm">
                  <p className="font-medium text-blue-800 mb-1">CSV Template Columns:</p>
                  <p className="text-blue-700 text-xs">
                    <code className="bg-blue-100 px-1 rounded">questionText</code>,{' '}
                    <code className="bg-blue-100 px-1 rounded">questionType</code> (multiple_choice/true_false/fill_blank),{' '}
                    <code className="bg-blue-100 px-1 rounded">option1-4</code>,{' '}
                    <code className="bg-blue-100 px-1 rounded">correctAnswer</code> (index for MC, text for fill),{' '}
                    <code className="bg-blue-100 px-1 rounded">marks</code>,{' '}
                    <code className="bg-blue-100 px-1 rounded">difficulty</code>
                  </p>
                </div>

                {uploadErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <p className="font-medium">Validation Errors:</p>
                      <ul className="list-disc list-inside text-sm mt-2 max-h-32 overflow-auto">
                        {uploadErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {uploadPreview.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Preview ({uploadPreview.length} questions):
                    </p>
                    <div className="max-h-64 overflow-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Question</th>
                            <th className="px-4 py-2 text-left">Type</th>
                            <th className="px-4 py-2 text-left">Marks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadPreview.slice(0, 5).map((row, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-4 py-2 truncate max-w-xs">{row.questionText}</td>
                              <td className="px-4 py-2">{row.questionType}</td>
                              <td className="px-4 py-2">{row.marks}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {uploadPreview.length > 5 && (
                        <p className="text-center text-sm text-gray-500 py-2">
                          ...and {uploadPreview.length - 5} more
                        </p>
                      )}
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={handleBulkUpload}
                    >
                      Upload {uploadPreview.length} Questions
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Manual Add Dialog */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Question</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddQuestion} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="questionText">Question Text *</Label>
                  <Textarea
                    id="questionText"
                    placeholder="Enter your question"
                    value={newQuestion.questionText}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, questionText: e.target.value }))}
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Question Type</Label>
                    <Select
                      value={newQuestion.questionType}
                      onValueChange={(v: any) => setNewQuestion(prev => ({ ...prev, questionType: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True/False</SelectItem>
                        <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select
                      value={newQuestion.difficulty}
                      onValueChange={(v: any) => setNewQuestion(prev => ({ ...prev, difficulty: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {newQuestion.questionType === 'multiple_choice' && (
                  <div className="space-y-2">
                    <Label>Options</Label>
                    {newQuestion.options.map((option, index) => (
                      <Input
                        key={index}
                        placeholder={`Option ${index + 1}`}
                        value={option}
                        onChange={(e) => updateOption(index, e.target.value)}
                      />
                    ))}
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Correct Answer</Label>
                  {newQuestion.questionType === 'multiple_choice' ? (
                    <Select
                      value={newQuestion.correctAnswer}
                      onValueChange={(v) => setNewQuestion(prev => ({ ...prev, correctAnswer: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select correct option" />
                      </SelectTrigger>
                      <SelectContent>
                        {newQuestion.options.map((_, index) => (
                          <SelectItem key={index} value={index.toString()}>
                            Option {index + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : newQuestion.questionType === 'true_false' ? (
                    <Select
                      value={newQuestion.correctAnswer}
                      onValueChange={(v) => setNewQuestion(prev => ({ ...prev, correctAnswer: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">True</SelectItem>
                        <SelectItem value="1">False</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Enter the correct answer"
                      value={newQuestion.correctAnswer}
                      onChange={(e) => setNewQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marks">Marks</Label>
                  <Input
                    id="marks"
                    type="number"
                    min={1}
                    value={newQuestion.marks}
                    onChange={(e) => setNewQuestion(prev => ({ ...prev, marks: parseInt(e.target.value) || 5 }))}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Add Question
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.length > 0 ? (
          questions.map((question: any, index: number) => (
            <Card key={question.id}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-sm font-medium text-gray-500">Q{index + 1}</span>
                      <Badge variant={
                        question.difficulty === 'easy' ? 'secondary' :
                        question.difficulty === 'medium' ? 'default' : 'destructive'
                      }>
                        {question.difficulty}
                      </Badge>
                      <Badge variant="outline">{question.marks} marks</Badge>
                      <Badge variant="outline">{(question.question_type || question.questionType || '').replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-gray-900 mb-3">{question.question_text || question.questionText}</p>

                    {(question.options || []).length > 0 && (
                      <div className="space-y-1 ml-4">
                        {question.options.map((option: string, i: number) => (
                          <div
                            key={i}
                            className={`text-sm ${
                              i === (typeof question.correct_answer === 'number' ? question.correct_answer :
                                     typeof question.correctAnswer === 'number' ? question.correctAnswer : 0)
                                ? 'text-emerald-600 font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {option}
                            {i === (typeof question.correct_answer === 'number' ? question.correct_answer :
                                    typeof question.correctAnswer === 'number' ? question.correctAnswer : 0) && (
                              <span className="ml-2 text-xs">(Correct)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {(question.question_type || question.questionType) === 'fill_blank' && (
                      <p className="text-sm text-emerald-600 ml-4">
                        Answer: {question.correct_answer || question.correctAnswer}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setQuestionToDelete(question.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions yet</h3>
              <p className="text-gray-500 mb-4">Add questions manually, upload via CSV, or generate with AI</p>
              <div className="flex justify-center space-x-2">
                <Button variant="outline" onClick={() => setIsAIDialogOpen(true)}>
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Generate
                </Button>
                <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  CSV Upload
                </Button>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={!!questionToDelete} onOpenChange={(open) => !open && setQuestionToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this question? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteQuestion} className="bg-red-600 hover:bg-red-700">
              Delete Question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
