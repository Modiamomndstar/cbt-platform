import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import api, { examAPI, examTypeAPI } from '@/services/api';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateExam() {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    categoryId: 'none',
    duration: 60,
    totalQuestions: 20,
    passingScore: 50,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResultImmediately: true,
    isSecureMode: false,
    maxViolations: 3,
    examTypeId: 'none',
    examType: '', // Fallback for display
    academicSession: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value,
    }));
    setError('');
  };

  const [categories, setCategories] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);

  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [catsRes, typesRes] = await Promise.all([
          api.get('/exam-categories'),
          examTypeAPI.getAll()
        ]);
        setCategories(catsRes.data.data || []);
        const types = typesRes.data.data || [];
        setExamTypes(types);

        // Auto-select first type if available
        if (types.length > 0) {
          setFormData(p => ({ ...p, examTypeId: types[0].id, examType: types[0].name }));
        }
      } catch (err) {
        console.error("Failed to load metadata:", err);
      }
    };
    loadMetadata();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Exam title is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const payload: any = {
        title: formData.title,
        description: formData.description,
        duration: formData.duration,
        totalQuestions: formData.totalQuestions,
        passingScore: formData.passingScore,
        shuffleQuestions: formData.shuffleQuestions,
        shuffleOptions: formData.shuffleOptions,
        showResultImmediately: formData.showResultImmediately,
        isSecureMode: formData.isSecureMode,
        maxViolations: formData.maxViolations,
        examTypeId: formData.examTypeId !== 'none' ? formData.examTypeId : null,
        examType: formData.examType,
        academicSession: formData.academicSession,
      };

      if (formData.categoryId !== 'none') {
         payload.categoryId = formData.categoryId;
      }

      const response = await examAPI.create(payload);

      if (response.data.success) {
        toast.success('Exam created successfully!');
        const examId = response.data.data?.id;
        if (examId) {
          navigate(`/tutor/exams/${examId}/questions`);
        } else {
          navigate('/tutor/exams');
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to create exam';
      setError(msg);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" onClick={() => navigate('/tutor/exams')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create New Exam</h1>
          <p className="text-gray-600">Set up exam details, then add questions</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Exam Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Exam Title *</Label>
                <Input
                  id="title"
                  name="title"
                  placeholder="e.g., Mathematics Mid-Term Exam"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Brief description of the exam"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoryId">Subject / Course (Optional)</Label>
                <Select value={formData.categoryId} onValueChange={(val) => setFormData(p => ({...p, categoryId: val}))}>
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="No Subject / Course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">General / No Subject</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="examTypeId">Exam Type / Style</Label>
                  <Select
                    value={formData.examTypeId}
                    onValueChange={(val) => {
                      const selected = examTypes.find(t => t.id === val);
                      setFormData(p => ({...p, examTypeId: val, examType: selected?.name || ''}));
                    }}
                  >
                    <SelectTrigger id="examTypeId">
                      <SelectValue placeholder="Select Style" />
                    </SelectTrigger>
                    <SelectContent>
                      {examTypes.length === 0 && <SelectItem value="none">No Styles Defined</SelectItem>}
                      {examTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academicSession">Academic Session / Term</Label>
                  <Input
                    id="academicSession"
                    name="academicSession"
                    placeholder="e.g., 2024/2025 First Term"
                    value={formData.academicSession}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min={5}
                  max={300}
                  value={formData.duration}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalQuestions">Total Questions *</Label>
                <Input
                  id="totalQuestions"
                  name="totalQuestions"
                  type="number"
                  min={1}
                  value={formData.totalQuestions}
                  onChange={handleInputChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passingScore">Passing Score (%)</Label>
                <Input
                  id="passingScore"
                  name="passingScore"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.passingScore}
                  onChange={handleInputChange}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="shuffleQuestions"
                  checked={formData.shuffleQuestions}
                  onChange={(e) => setFormData(prev => ({ ...prev, shuffleQuestions: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="shuffleQuestions">Shuffle Questions</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="shuffleOptions"
                  checked={formData.shuffleOptions}
                  onChange={(e) => setFormData(prev => ({ ...prev, shuffleOptions: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="shuffleOptions">Shuffle Options</Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="showResultImmediately"
                  checked={formData.showResultImmediately}
                  onChange={(e) => setFormData(prev => ({ ...prev, showResultImmediately: e.target.checked }))}
                  className="rounded"
                />
                <Label htmlFor="showResultImmediately">Show Results to Students</Label>
              </div>

              <div className="border-t pt-4 mt-4 space-y-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isSecureMode"
                    checked={formData.isSecureMode}
                    onChange={(e) => setFormData(prev => ({ ...prev, isSecureMode: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="isSecureMode" className="text-indigo-600 font-bold flex items-center gap-1">
                    Secure Mode (Anti-Cheat)
                  </Label>
                </div>

                {formData.isSecureMode && (
                  <div className="space-y-2 pl-6 animate-in slide-in-from-left-2 duration-200">
                    <Label htmlFor="maxViolations" className="text-xs">Max Alt-Tab Violations</Label>
                    <Input
                      id="maxViolations"
                      name="maxViolations"
                      type="number"
                      min={1}
                      max={10}
                      value={formData.maxViolations}
                      onChange={handleInputChange}
                      className="h-8 text-xs"
                    />
                    <p className="text-[10px] text-gray-400">Student will be auto-submitted if they switch tabs more than this.</p>
                  </div>
                )}
              </div>
            </CardContent>

          </Card>
        </div>

        <div className="flex justify-end mt-6 space-x-4">
          <Button type="button" variant="outline" onClick={() => navigate('/tutor/exams')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Exam'}
          </Button>
        </div>
      </form>
    </div>
  );
}
