import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { createExam } from '@/lib/dataStore';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function CreateExam() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    duration: 60,
    totalQuestions: 50,
    passingScore: 50,
    shuffleQuestions: true,
    shuffleOptions: true,
    showResultImmediately: true,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    setError('');
  };

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [name]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tutorId || !user?.schoolId) return;

    // Validation
    if (!formData.title.trim()) {
      setError('Exam title is required');
      return;
    }
    if (!formData.category.trim()) {
      setError('Category/Level is required');
      return;
    }
    if (formData.duration < 1) {
      setError('Duration must be at least 1 minute');
      return;
    }
    if (formData.totalQuestions < 1) {
      setError('Total questions must be at least 1');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const exam = createExam({
        schoolId: user.schoolId,
        tutorId: user.tutorId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        duration: formData.duration,
        totalQuestions: formData.totalQuestions,
        passingScore: formData.passingScore,
        shuffleQuestions: formData.shuffleQuestions,
        shuffleOptions: formData.shuffleOptions,
        showResultImmediately: formData.showResultImmediately,
      });

      toast.success('Exam created successfully');
      navigate(`/tutor/exams/${exam.id}/questions`);
    } catch (err) {
      setError('An error occurred. Please try again.');
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
          <p className="text-gray-600">Set up your exam details and configuration</p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Basic Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
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
                <Label htmlFor="category">Category / Level *</Label>
                <Input
                  id="category"
                  name="category"
                  placeholder="e.g., SS2, JSS3, Mathematics"
                  value={formData.category}
                  onChange={handleInputChange}
                />
                <p className="text-xs text-gray-500">
                  This helps organize exams by class or subject
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Exam Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  name="duration"
                  type="number"
                  min={1}
                  value={formData.duration}
                  onChange={handleNumberChange}
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
                  onChange={handleNumberChange}
                />
                <p className="text-xs text-gray-500">
                  Number of questions each student will receive
                </p>
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
                  onChange={handleNumberChange}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Options */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Exam Options</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="flex items-center justify-between space-x-4">
                <div>
                  <p className="font-medium">Shuffle Questions</p>
                  <p className="text-sm text-gray-500">Randomize question order for each student</p>
                </div>
                <Switch
                  checked={formData.shuffleQuestions}
                  onCheckedChange={(checked) => handleSwitchChange('shuffleQuestions', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-4">
                <div>
                  <p className="font-medium">Shuffle Options</p>
                  <p className="text-sm text-gray-500">Randomize answer options for each student</p>
                </div>
                <Switch
                  checked={formData.shuffleOptions}
                  onCheckedChange={(checked) => handleSwitchChange('shuffleOptions', checked)}
                />
              </div>

              <div className="flex items-center justify-between space-x-4">
                <div>
                  <p className="font-medium">Show Results Immediately</p>
                  <p className="text-sm text-gray-500">Display score after exam submission</p>
                </div>
                <Switch
                  checked={formData.showResultImmediately}
                  onCheckedChange={(checked) => handleSwitchChange('showResultImmediately', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end mt-6 space-x-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/tutor/exams')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? 'Creating...' : 'Create Exam'}
          </Button>
        </div>
      </form>
    </div>
  );
}
