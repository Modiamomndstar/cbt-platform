import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  getExamById, 
  getQuestionsByExam, 
  createQuestion, 
  createQuestionsBulk,
  deleteQuestion 
} from '@/lib/dataStore';
import { 
  parseCSV, 
  parseExcel, 
  validateQuestionCSV, 
  downloadTemplate,
  type QuestionCSVRow 
} from '@/lib/csvParser';
import { 
  generateQuestionsFromMaterial, 
  generateQuestionsFromTopics 
} from '@/lib/aiQuestionGenerator';
import { 
  Plus, 
  Upload, 
  Download, 
  Trash2, 
  ArrowLeft, 
  FileSpreadsheet, 
  Sparkles,
  BookOpen,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import type { Question } from '@/types';

export default function QuestionBank() {
  const { examId } = useParams<{ examId: string }>();
  const navigate = useNavigate();
  
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
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
  const [learningMaterial, setLearningMaterial] = useState('');
  const [topics, setTopics] = useState('');
  const [generateCount, setGenerateCount] = useState(10);
  const [generateDifficulty, setGenerateDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (examId) {
      const examData = getExamById(examId);
      if (examData) {
        setExam(examData);
        loadQuestions();
      } else {
        navigate('/tutor/exams');
      }
    }
  }, [examId]);

  const loadQuestions = () => {
    if (examId) {
      const examQuestions = getQuestionsByExam(examId);
      setQuestions(examQuestions);
    }
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!examId) return;

    // Use a switch to handle all question types without type narrowing issues
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

    createQuestion({
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
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let data: QuestionCSVRow[] = [];
      
      if (file.name.endsWith('.csv')) {
        data = await parseCSV<QuestionCSVRow>(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        data = await parseExcel<QuestionCSVRow>(file);
      } else {
        toast.error('Please upload a CSV or Excel file');
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

  const handleBulkUpload = () => {
    if (!examId || uploadPreview.length === 0) return;

    const questionsToCreate = uploadPreview.map(row => {
      const options = [row.option1, row.option2, row.option3, row.option4].filter(Boolean) as string[];
      return {
        examId,
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

    createQuestionsBulk(questionsToCreate);
    toast.success(`${questionsToCreate.length} questions added successfully`);
    setIsUploadDialogOpen(false);
    setUploadPreview([]);
    setUploadErrors([]);
    loadQuestions();
  };

  const handleGenerateQuestions = async () => {
    if (!examId) return;
    
    setIsGenerating(true);
    
    try {
      let generatedQuestions: Omit<Question, 'id' | 'examId'>[] = [];
      
      if (learningMaterial.trim()) {
        // Generate from learning material
        const topicsList = topics.split(',').map(t => t.trim()).filter(Boolean);
        generatedQuestions = generateQuestionsFromMaterial(
          learningMaterial,
          topicsList.length > 0 ? topicsList : ['General'],
          generateCount
        );
      } else if (topics.trim()) {
        // Generate from topics only
        const topicsList = topics.split(',').map(t => t.trim()).filter(Boolean);
        generatedQuestions = generateQuestionsFromTopics(
          topicsList,
          generateDifficulty,
          generateCount
        );
      } else {
        toast.error('Please provide learning material or topics');
        setIsGenerating(false);
        return;
      }

      const questionsToCreate = generatedQuestions.map(q => ({
        examId,
        ...q,
      }));

      createQuestionsBulk(questionsToCreate);
      toast.success(`${questionsToCreate.length} questions generated successfully`);
      setIsGenerateDialogOpen(false);
      setLearningMaterial('');
      setTopics('');
      loadQuestions();
    } catch (error) {
      toast.error('Error generating questions');
      console.error(error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (confirm('Are you sure you want to delete this question?')) {
      deleteQuestion(questionId);
      toast.success('Question deleted');
      loadQuestions();
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...newQuestion.options];
    newOptions[index] = value;
    setNewQuestion(prev => ({ ...prev, options: newOptions }));
  };

  if (!exam) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
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
          <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Generate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Generate Questions with AI</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Tabs defaultValue="material">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="material">From Material</TabsTrigger>
                    <TabsTrigger value="topics">From Topics</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="material" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Learning Material</Label>
                      <Textarea
                        placeholder="Paste your learning material, notes, or textbook content here..."
                        value={learningMaterial}
                        onChange={(e) => setLearningMaterial(e.target.value)}
                        rows={6}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Topics (optional, comma-separated)</Label>
                      <Input
                        placeholder="e.g., Algebra, Geometry, Calculus"
                        value={topics}
                        onChange={(e) => setTopics(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="topics" className="space-y-4">
                    <div className="space-y-2">
                      <Label>Topics (comma-separated)</Label>
                      <Input
                        placeholder="e.g., Algebra, Geometry, Calculus"
                        value={topics}
                        onChange={(e) => setTopics(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select value={generateDifficulty} onValueChange={(v: any) => setGenerateDifficulty(v)}>
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
                  </TabsContent>
                </Tabs>

                <div className="space-y-2">
                  <Label>Number of Questions</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={generateCount}
                    onChange={(e) => setGenerateCount(parseInt(e.target.value) || 10)}
                  />
                </div>

                <Button 
                  className="w-full" 
                  onClick={handleGenerateQuestions}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Questions
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Upload Questions</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
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
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
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
          questions.map((question, index) => (
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
                      <Badge variant="outline">{question.questionType.replace('_', ' ')}</Badge>
                    </div>
                    <p className="text-gray-900 mb-3">{question.questionText}</p>
                    
                    {question.options.length > 0 && (
                      <div className="space-y-1 ml-4">
                        {question.options.map((option, i) => (
                          <div 
                            key={i} 
                            className={`text-sm ${
                              i === (typeof question.correctAnswer === 'number' ? question.correctAnswer : 0)
                                ? 'text-emerald-600 font-medium'
                                : 'text-gray-600'
                            }`}
                          >
                            {String.fromCharCode(65 + i)}. {option}
                            {i === (typeof question.correctAnswer === 'number' ? question.correctAnswer : 0) && (
                              <span className="ml-2 text-xs">(Correct)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {question.questionType === 'fill_blank' && (
                      <p className="text-sm text-emerald-600 ml-4">
                        Answer: {question.correctAnswer}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteQuestion(question.id)}
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
              <p className="text-gray-500 mb-4">Add questions manually, upload in bulk, or generate with AI</p>
              <div className="flex justify-center space-x-2">
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
