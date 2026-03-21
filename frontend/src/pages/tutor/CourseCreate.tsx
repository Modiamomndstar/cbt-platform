import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { courseAPI, examCategoryAPI, categoryAPI } from '@/services/api';
import { toast } from 'sonner';
import { GraduationCap, Sparkles, ArrowRight, Loader2, BookOpen, Layers } from 'lucide-react';
import { useEffect } from 'react';

export default function CourseCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAI = searchParams.get('ai') === 'true';
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    exam_category_id: '',
    category_id: ''
  });
  const [examCategories, setExamCategories] = useState<any[]>([]);
  const [studentCategories, setStudentCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const [examRes, studentRes] = await Promise.all([
        examCategoryAPI.getAll(),
        categoryAPI.getAll()
      ]);
      
      if (examRes.data.success) setExamCategories(examRes.data.data || []);
      if (studentRes.data.success) setStudentCategories(studentRes.data.data || []);
    } catch {
      toast.error('Failed to load categories');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error('Please enter a course title');

    try {
      setLoading(true);
      const res = await courseAPI.create(formData);
      if (res.data.success) {
        toast.success('Course created successfully!');
        const courseId = res.data.data.id;
        navigate(`/tutor/courses/${courseId}/builder`);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tutor/courses')}>
          <ArrowRight className="h-5 w-5 rotate-180" />
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isAI ? 'AI Course Creation Wizard' : 'Create New Course'}
        </h1>
      </div>

      <Card className="border-gray-100 shadow-sm overflow-hidden">
        <div className={`h-2 ${isAI ? 'bg-gradient-to-r from-indigo-500 to-purple-500' : 'bg-indigo-500'}`} />
        <CardHeader>
          <div className="flex items-center gap-3 mb-2 text-indigo-600">
            {isAI ? <Sparkles className="h-6 w-6" /> : <GraduationCap className="h-6 w-6" />}
            <span className="text-xs font-bold uppercase tracking-widest">
              {isAI ? 'Smart Content Generation' : 'Manual Setup'}
            </span>
          </div>
          <CardTitle className="text-xl">Course Basic Information</CardTitle>
          <p className="text-sm text-gray-500">
            {isAI 
              ? "Tell AI what you want to teach, and we'll handle the syllabus and lesson structures."
              : "Set up the basic details of your course before adding modules and lessons."
            }
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-gray-400" />
                Course Title / Topic
              </label>
              <input
                type="text"
                placeholder="e.g. Introduction to Quantum Physics"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-indigo-300 outline-none transition-all"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Layers className="h-4 w-4 text-gray-400" />
                Subject Category
              </label>
              <select
                value={formData.exam_category_id}
                onChange={(e) => setFormData({ ...formData, exam_category_id: e.target.value })}
                className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-indigo-300 outline-none transition-all appearance-none bg-white font-medium"
              >
                <option value="">Select Subject</option>
                {examCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700 ml-1">
                Target Class / Level
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                className="w-full h-12 border border-gray-200 rounded-xl px-4 text-sm focus:ring-2 focus:ring-indigo-300 outline-none transition-all appearance-none bg-white font-medium"
              >
                <option value="">Select Class Level</option>
                {studentCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Course Description</label>
              <textarea
                placeholder="What will students learn in this course?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full h-32 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none transition-all resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={`w-full h-12 text-white font-bold rounded-xl shadow-lg transition-all ${
                isAI 
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  {isAI ? 'Launch AI Wizard' : 'Create Course'}
                  <ArrowRight className="h-5 w-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
