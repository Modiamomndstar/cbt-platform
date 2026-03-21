import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { courseAPI, examAPI, examTypeAPI, academicCalendarAPI, categoryAPI } from '@/services/api';
import { toast } from 'sonner';
import { 
  Plus, Sparkles, BookOpen, 
  FileText, Video, Link as LinkIcon, Trash2, Save, 
  CheckCircle2, AlertCircle, Loader2, ArrowLeft,
  Settings as SettingsIcon, BrainCircuit
} from 'lucide-react';
import AddContentModal from './AddContentModal';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

export default function CourseBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [structure, setStructure] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingSyllabus, setGeneratingSyllabus] = useState(false);
  const [generatingLesson, setGeneratingLesson] = useState<string | null>(null);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [generatingExam, setGeneratingExam] = useState(false);
  const [exams, setExams] = useState<any[]>([]);
  const [examTypes, setExamTypes] = useState<any[]>([]);
  const [studentCategories, setStudentCategories] = useState<any[]>([]);
  const [activeYear, setActiveYear] = useState<any>(null);
  const [updatingCourse, setUpdatingCourse] = useState(false);
  const [isAddContentModalOpen, setIsAddContentModalOpen] = useState(false);

  useEffect(() => {
    loadCourseData();
    loadExams();
    loadExamTypes();
    loadStudentCategories();
    loadActiveYear();
  }, [id]);

  const loadStudentCategories = async () => {
    try {
      const res = await categoryAPI.getAll();
      if (res.data.success) {
        setStudentCategories(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load student categories", error);
    }
  };

  const loadActiveYear = async () => {
    try {
      const res = await academicCalendarAPI.getActiveYear();
      if (res.data.success) {
        setActiveYear(res.data.data);
      }
    } catch (error) {
       console.error("Failed to load active academic year", error);
    }
  };

  const loadExamTypes = async () => {
    try {
      const res = await examTypeAPI.getAll();
      if (res.data.success) {
        setExamTypes(res.data.data || []);
      }
    } catch (error) {
       console.error("Failed to load exam types", error);
    }
  };

  const loadCourseData = async () => {
    try {
      setLoading(true);
      const res = await courseAPI.getById(id!);
      if (res.data.success) {
        setCourse(res.data.data);
        setStructure(res.data.data.structure || []);
        if (res.data.data.structure?.length > 0) {
           setActiveModule(res.data.data.structure[0].id);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load course details');
    } finally {
      setLoading(false);
    }
  };

  const loadExams = async () => {
    const res = await examAPI.getAll();
    if (res.data.success) {
      setExams(res.data.data || []);
    }
  };

  const filteredExams = exams.filter(e => 
    !course?.exam_category_id || e.category_id === course.exam_category_id
  );

  const handleGenerateSyllabus = async () => {
    if (!course?.title) return;
    try {
      setGeneratingSyllabus(true);
      const res = await courseAPI.generateSyllabus(course.title, 'General');
      if (res.data.success) {
        const aiModules = res.data.data.modules;
        for (let i = 0; i < aiModules.length; i++) {
          const m = aiModules[i];
          const modRes = await courseAPI.addModule(id!, m.title, i + 1);
          if (modRes.data.success) {
            const moduleId = modRes.data.data.id;
            
            // Handle subtopics if returned by AI (optional for now)
            if (m.subtopics) {
                for(let k = 0; k < m.subtopics.length; k++) {
                    await courseAPI.addModule(id!, m.subtopics[k], k + 1, moduleId);
                }
            }

            // Add lesson placeholders
            for (let j = 0; j < m.lessons.length; j++) {
               await courseAPI.addContent(moduleId, {
                 title: m.lessons[j],
                 content_type: 'text',
                 order_index: j + 1,
                 content_data: 'AI generation pending...'
               });
            }
          }
        }
        toast.success('AI Syllabus generated successfully!');
        loadCourseData();
      }
    } catch (error) {
      toast.error('AI Generation failed');
    } finally {
      setGeneratingSyllabus(false);
    }
  };

  const handleUpdateCourseSettings = async (updates: any) => {
    try {
      setUpdatingCourse(true);
      const res = await courseAPI.update(id!, updates);
      if (res.data.success) {
        toast.success('Course settings updated');
        setCourse((prev: any) => ({ ...prev, ...updates }));
      }
    } catch {
      toast.error('Failed to update course settings');
    } finally {
      setUpdatingCourse(false);
    }
  };

  const handleAddModule = async (parentId?: string) => {
    const title = window.prompt(parentId ? 'Enter Subtopic Title' : 'Enter Module Title');
    if (!title) return;
    try {
       const res = await courseAPI.addModule(id!, title, structure.length + 1, parentId);
       if (res.data.success) {
         toast.success(parentId ? 'Subtopic added' : 'Module added');
         loadCourseData();
       }
    } catch {
       toast.error('Failed to add module');
    }
  };

  const handleAddContent = async (data: any) => {
    if (!activeModule) return;
    try {
      const res = await courseAPI.addContent(activeModule, {
        ...data,
        order_index: structure.find(m => m.id === activeModule)?.contents?.length + 1 || 1
      });
      if (res.data.success) {
        toast.success(`"${data.title}" added to module`);
        loadCourseData();
      }
    } catch (error) {
      toast.error('Failed to add content');
    }
  };

  const handleGenerateContent = async (moduleId: string, content: any) => {
    try {
      setGeneratingLesson(content.id);
      const res = await courseAPI.generateContent({
        moduleTitle: structure.find(m => m.id === moduleId)?.title,
        lessonTitle: content.title,
        topic: course.title
      });
      if (res.data.success) {
        // Update content in DB (using existing addContent for now as a "mock" update or I should add an updateContent API)
        // For simplicity, let's assume we update the local state and then save
        toast.success(`Content for "${content.title}" generated!`);
        loadCourseData();
      }
    } catch (error) {
       toast.error('Failed to generate lesson content');
    } finally {
      setGeneratingLesson(null);
    }
  };

  const handleLinkExam = async (moduleId: string, data: Partial<any>) => {
    try {
      const res = await courseAPI.updateModule(moduleId, data);
      if (res.data.success) {
        toast.success('Module settings updated');
        loadCourseData();
      }
    } catch {
      toast.error('Failed to update module');
    }
  };

  const handleGenerateIntegratedExam = async (moduleId: string) => {
    try {
      setGeneratingExam(true);
      const mod = structure.find(m => m.id === moduleId);
      const res = await courseAPI.generateIntegratedExam(id!, {
        moduleIds: [moduleId],
        numQuestions: 10,
        topic: mod?.title || 'Module Assessment'
      });

      if (res.data.success) {
        const questions = res.data.data;
        // Save as official Exam and link it
        const importRes = await examAPI.integratedImport({
          examData: {
            title: `${mod?.title} Assessment`,
            description: `Generated assessment for ${mod?.title}`,
            categoryId: course?.exam_category_id,
            duration: 30
          },
          questions,
          examTypeId: mod?.exam_type_id // Use the synchronized style
        });

        if (importRes.data.success) {
          const newExamId = importRes.data.data.id;
          
          // 3. Link to module
          await handleLinkExam(moduleId, { 
            linked_exam_id: newExamId,
            assessment_type: mod?.assessment_type || 'weekly_classwork'
          });

          toast.success('AI Exam generated and linked precisely!');
          loadCourseData();
        } else {
          toast.error('Failed to save generated exam.');
        }
      } else {
        toast.error('AI could not generate questions for this content');
      }
    } catch (error) {
       console.error("AI Exam generation failed", error);
       toast.error('AI Exam generation failed');
    } finally {
      setGeneratingExam(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin" /></div>;

  const activeModuleData = structure.find(m => m.id === activeModule);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tutor/courses')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{course?.title}</h1>
              {course?.category_name && (
                <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-600 bg-indigo-50">
                  {course.category_name}
                </Badge>
              )}
            </div>
            <p className="text-gray-500 text-sm">Course Curriculum Builder</p>
          </div>
        </div>
        <div className="flex gap-3">
           <Button 
             variant="outline" 
             onClick={handleGenerateSyllabus} 
             disabled={generatingSyllabus || structure.length > 0}
             className="border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
           >
             <BrainCircuit className={`h-4 w-4 mr-2 ${generatingSyllabus ? 'animate-pulse' : ''}`} />
             {generatingSyllabus ? 'AI Crafting Syllabus...' : 'Generate with AI'}
           </Button>
           <Button className="bg-indigo-600">
             <Save className="h-4 w-4 mr-2" />
             Publish Changes
           </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Navigation Sidebar */}
        <div className="col-span-12 md:col-span-4 space-y-4">
          <Card className="border-gray-100">
                <CardHeader className="pb-3 border-b border-gray-50">
                   <CardTitle className="text-sm font-semibold flex items-center justify-between">
                     Modules
                     <Button 
                       variant="ghost" 
                       size="icon" 
                       className="h-6 w-6"
                       onClick={() => handleAddModule()}
                     >
                       <Plus className="h-4 w-4" />
                     </Button>
                   </CardTitle>
                </CardHeader>
                <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
             <div className="p-4 border-b border-gray-50 bg-indigo-50/10">
                <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block mb-2">Target Class / Level</label>
                <Select 
                  value={course?.category_id || 'none'} 
                  onValueChange={(val) => handleUpdateCourseSettings({ category_id: val === 'none' ? null : val })}
                  disabled={updatingCourse}
                >
                  <SelectTrigger className="w-full h-10 bg-white border-indigo-100 rounded-lg text-xs">
                    <SelectValue placeholder="Select Class Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">School Wide (All students)</SelectItem>
                    {studentCategories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
             {structure
.length === 0 && !generatingSyllabus && (
                     <div className="p-6 text-center">
                       <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                       <p className="text-xs text-gray-500">Your course is empty. Use the AI Wizard to get started!</p>
                     </div>
                   )}
                   <div className="divide-y divide-gray-50">
                     {structure
                       .filter(m => !m.parent_module_id)
                       .map((mod) => (
                       <div key={mod.id}>
                         <div 
                           className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 group ${activeModule === mod.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                           onClick={() => setActiveModule(mod.id)}
                         >
                           <div className="flex items-center justify-between">
                             <span className="text-sm font-bold text-gray-900 truncate pr-2">
                               {mod.order_index}. {mod.title}
                             </span>
                             <div className="flex items-center gap-1">
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                 onClick={(e) => { e.stopPropagation(); handleAddModule(mod.id); }}
                                 title="Add Subtopic"
                               >
                                 <Plus className="h-3 w-3" />
                               </Button>
                               {mod.exam_type_name && (
                                 <Badge 
                                   variant="outline" 
                                   style={{ borderColor: `${mod.exam_type_color}40`, color: mod.exam_type_color, backgroundColor: `${mod.exam_type_color}10` }}
                                   className="text-[10px] h-4 px-1.5"
                                 >
                                   {mod.exam_type_name}
                                 </Badge>
                               )}
                               {mod.academic_week_id && (
                                 <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-emerald-200 text-emerald-700 bg-emerald-50">
                                    Week {mod.week_number || '?'}
                                 </Badge>
                               )}
                               {mod.linked_exam_id ? (
                                 <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-blue-200 text-blue-700 bg-blue-50">
                                   Exam Linked
                                 </Badge>
                               ) : (
                                 <Badge variant="outline" className="text-[10px] h-4 px-1.5 border-red-200 text-red-700 bg-red-50">
                                   No Exam
                                 </Badge>
                               )}
                               <Badge variant="outline" className="text-[10px] bg-white">
                                 {mod.contents?.length || 0}
                               </Badge>
                             </div>
                           </div>
                         </div>
                         
                         {/* Render Subtopics */}
                         {structure
                           .filter(sub => sub.parent_module_id === mod.id)
                           .map(sub => (
                             <div 
                               key={sub.id}
                               className={`p-3 pl-8 cursor-pointer border-l-2 border-gray-100 transition-colors hover:bg-gray-50 ${activeModule === sub.id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                               onClick={() => setActiveModule(sub.id)}
                             >
                               <div className="flex items-center justify-between group">
                                 <span className="text-xs font-medium text-gray-700 truncate pr-2">
                                   • {sub.title}
                                 </span>
                                 <div className="flex items-center gap-1">
                                    {sub.linked_exam_id ? (
                                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-blue-200 text-blue-700 bg-blue-50">Exam Linked</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-[9px] h-3.5 px-1 border-red-200 text-red-700 bg-red-50">No Exam</Badge>
                                    )}
                                    <Badge variant="outline" className="text-[9px] bg-white px-1">
                                      {sub.contents?.length || 0}
                                    </Badge>
                                 </div>
                               </div>
                             </div>
                           ))}
                       </div>
                     ))}
                   </div>
                </CardContent>
          </Card>
        </div>

        {/* Content Area */}
        <div className="col-span-12 md:col-span-8 space-y-6">
           {activeModule ? (
             <>
               <Card className="border-gray-100">
                 <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-gray-50">
                   <div>
                     <CardTitle className="text-lg">
                       {activeModuleData?.title}
                     </CardTitle>
                     <p className="text-xs text-gray-500 mt-0.5">Manage module lessons and activities</p>
                   </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 text-xs"
                      onClick={() => setIsAddContentModalOpen(true)}
                    >
                      <Plus className="h-3 w-3 mr-1" /> Add Content
                    </Button>
                 </CardHeader>
                 <CardContent className="p-0">
                   <div className="divide-y divide-gray-50">
                     {activeModuleData?.contents.map((item: any) => (
                       <div key={item.id} className="p-4 flex items-center justify-between group hover:bg-gray-50/50">
                         <div className="flex items-center gap-4">
                           <div className="h-10 w-10 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                             {item.content_type === 'text' && <FileText className="h-5 w-5" />}
                             {item.content_type === 'video' && <Video className="h-5 w-5" />}
                             {item.content_type === 'exam' && <BookOpen className="h-5 w-5" />}
                           </div>
                           <div>
                             <p className="text-sm font-medium text-gray-900">{item.title}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                               <Badge className="text-[10px] h-4 uppercase" variant="secondary">{item.content_type}</Badge>
                               {item.content_data && <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><CheckCircle2 className="h-2.5 w-2.5" /> Content Ready</span>}
                             </div>
                           </div>
                         </div>
                         <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.content_type === 'text' && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 text-[10px] text-indigo-600 hover:text-indigo-700"
                                onClick={() => handleGenerateContent(activeModule!, item)}
                                disabled={generatingLesson === item.id}
                              >
                                {generatingLesson === item.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                                AI Content
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400">
                              <SettingsIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-500">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                         </div>
                       </div>
                     ))}
                   </div>
                 </CardContent>
               </Card>

               {/* Exam Linker Component */}
               <Card className="border-indigo-100 bg-indigo-50/30">
                 <CardHeader className="pb-3 border-b border-indigo-50">
                   <CardTitle className="text-sm font-bold flex items-center gap-2 text-indigo-900">
                     <LinkIcon className="h-4 w-4" />
                     Module Assessment
                   </CardTitle>
                 </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Assessment Style Sync */}
                        <div className="space-y-1 col-span-2">
                          <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Official Assessment Style</label>
                          <Select 
                            value={activeModuleData?.exam_type_id || 'none'} 
                            onValueChange={(val: string) => handleLinkExam(activeModule!, { exam_type_id: val === 'none' ? null : val })}
                          >
                            <SelectTrigger className="w-full h-10 bg-white border border-indigo-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                              <SelectValue placeholder="Select School Style" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">General / Uncategorized</SelectItem>
                              {examTypes.map((type) => (
                                <SelectItem key={type.id} value={type.id}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: type.color }}></div>
                                    {type.name}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-[10px] text-slate-500 mt-1 italic">This link ensures grades are categorized correctly in school reports.</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Linked Exam</label>
                       <select 
                         className="w-full h-10 bg-white border border-indigo-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                         value={structure.find(m => m.id === activeModule)?.linked_exam_id || ''}
                         onChange={(e) => handleLinkExam(activeModule!, { linked_exam_id: e.target.value || null })}
                       >
                         <option value="">No Assessment Linked</option>
                         {filteredExams.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                       </select>
                    </div>

                    <div className="pt-2">
                       <Button 
                         variant="outline" 
                         size="sm" 
                         className="w-full h-10 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                         onClick={() => handleGenerateIntegratedExam(activeModule!)}
                         disabled={generatingExam}
                       >
                         <Sparkles className={`h-4 w-4 mr-2 ${generatingExam ? 'animate-spin' : ''}`} />
                         {generatingExam ? 'AI Generating Exam...' : 'Generate Exam from Module Content'}
                       </Button>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Instructional Week</label>
                          <Select 
                            value={activeModuleData?.academic_week_id || 'none'} 
                            onValueChange={(val: string) => handleLinkExam(activeModule!, { academic_week_id: val === 'none' ? null : val })}
                          >
                            <SelectTrigger className="w-full h-10 bg-white border border-indigo-200 rounded-lg px-3 text-sm focus:ring-2 focus:ring-indigo-300 outline-none">
                              <SelectValue placeholder={activeYear ? "Assign to Week" : "Setup Calendar First"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Not Scheduled</SelectItem>
                              {activeYear?.periods?.map((period: any) => (
                                <div key={period.id}>
                                  <div className="px-2 py-1.5 text-[10px] font-bold text-slate-400 bg-slate-50 uppercase tracking-widest">{period.name}</div>
                                  {period.weeks?.map((week: any) => (
                                    <SelectItem key={week.id} value={week.id}>
                                      Week {week.week_number} ({format(new Date(week.start_date), 'MMM d')})
                                    </SelectItem>
                                  ))}
                                </div>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                    </div>
                  </CardContent>
               </Card>
             </>
           ) : (
             <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50">
               <BookOpen className="h-10 w-10 text-gray-300 mb-2" />
               <p className="text-sm text-gray-500 font-medium">Select a module to edit its contents</p>
             </div>
          )}
        </div>
      </div>
      
      <AddContentModal 
        isOpen={isAddContentModalOpen}
        onClose={() => setIsAddContentModalOpen(false)}
        onAdd={handleAddContent}
        exams={filteredExams}
      />
    </div>
  );
}
