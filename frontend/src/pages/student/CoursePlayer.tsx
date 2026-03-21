import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { courseAPI } from '@/services/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, ChevronRight, BookOpen, 
  Sparkles, Send, Book,
  PlayCircle, Loader2, ArrowLeft,
  GraduationCap, HelpCircle, FileText
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

export default function CoursePlayer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<any>(null);
  const [structure, setStructure] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeContent, setActiveContent] = useState<any>(null);
  const [aiHistory, setAiHistory] = useState<any[]>([]);
  const [aiMessage, setAiMessage] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);
  const charEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCourse();
  }, [id]);

  useEffect(() => {
    charEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [aiHistory]);

  const loadCourse = async () => {
    try {
      setLoading(true);
      const res = await courseAPI.getById(id!);
      if (res.data.success) {
        setCourse(res.data.data);
        const fullStructure = res.data.data.structure || [];
        setStructure(fullStructure);
        
        // Auto-select first content if available
        if (fullStructure.length > 0 && fullStructure[0].contents?.length > 0) {
          setActiveContent(fullStructure[0].contents[0]);
        }
      }
    } catch (error: any) {
      toast.error('Failed to load course contents');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim() || !activeContent) return;

    const userMsg = { role: 'user', content: aiMessage };
    setAiHistory(prev => [...prev, userMsg]);
    setAiMessage('');
    setLoadingAi(true);

    try {
      const res = await courseAPI.aiAssistant({
        lessonContent: activeContent.content_data,
        userMessage: aiMessage,
        history: aiHistory
      });
      if (res.data.success) {
        setAiHistory(prev => [...prev, { role: 'assistant', content: res.data.data }]);
      }
    } catch (error) {
      toast.error('AI Assistant is currently unavailable.');
    } finally {
      setLoadingAi(false);
    }
  };

  const handleContentSelect = (content: any) => {
    setActiveContent(content);
    courseAPI.updateProgress(id!, content.id).then(() => {
        // Optionally refresh structure to show checkmarks if we add them later
    });
  };

  const handleCompleteNext = async () => {
    if (!activeContent) return;
    
    // Find current content in structure to get next
    let nextContent = null;
    let foundCurrent = false;
    
    for (const mod of structure) {
      if (mod.contents) {
        for (const c of mod.contents) {
          if (foundCurrent) {
            nextContent = c;
            break;
          }
          if (c.id === activeContent.id) foundCurrent = true;
        }
      }
      if (nextContent) break;
    }

    await courseAPI.updateProgress(id!, activeContent.id);
    if (nextContent) {
      setActiveContent(nextContent);
    } else {
      toast.success("Course module completed!");
    }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-emerald-600" /></div>;

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col gap-6 overflow-hidden">
      {/* Course Header */}
      <div className="bg-white px-6 py-4 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/student/courses')} className="hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-black text-gray-900 leading-tight">
              {course?.title}
            </h1>
            <div className="flex items-center gap-3 mt-1 text-xs font-bold text-gray-400">
              <span className="flex items-center gap-1">
                 <BookOpen className="h-3 w-3" />
                 {structure.length} Modules
              </span>
              <span className="text-emerald-500 flex items-center gap-1 uppercase tracking-widest">
                 <Sparkles className="h-3 w-3" />
                 AI Coach Online
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="border-gray-200">
            Get Certificate
          </Button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left Side: Navigation */}
        <Card className="w-80 flex-shrink-0 border-gray-100 overflow-hidden flex flex-col">
          <CardHeader className="py-4 border-b border-gray-50 bg-gray-50/30">
             <CardTitle className="text-sm font-black flex items-center gap-2">
               <Book className="h-4 w-4 text-emerald-600" />
               Curriculum
             </CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-y-auto custom-scrollbar">
             {structure
               .filter(m => !m.parent_module_id)
               .map((mod, modIdx) => (
               <div key={mod.id} className="border-b border-gray-50 last:border-0">
                   <div className="bg-gray-50/50 p-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-gray-400">
                     <span>Module {modIdx + 1}: {mod.title}</span>
                     {mod.academic_week_id && (
                       <Badge variant="outline" className="text-[9px] h-4 px-1 border-indigo-200 text-indigo-600 bg-indigo-50">Wk {mod.week_number || '?'}</Badge>
                     )}
                   </div>
                   <div className="p-2 space-y-1">
                    {/* Module's direct lessons */}
                    {mod.contents?.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => handleContentSelect(c)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                          activeContent?.id === c.id
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100'
                            : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                         <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${activeContent?.id === c.id ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>
                            {c.content_type === 'text' && <FileText size={16} />}
                            {c.content_type === 'video' && <PlayCircle size={16} />}
                         </div>
                         <span className="text-xs font-bold truncate flex-1">{c.title}</span>
                      </button>
                    ))}

                    {/* Subtopics and their lessons */}
                    {structure
                      .filter(sub => sub.parent_module_id === mod.id)
                      .map(sub => (
                        <div key={sub.id} className="mt-2 ml-2">
                           <div className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-300">
                             • {sub.title}
                           </div>
                           <div className="space-y-1">
                             {sub.contents?.map((c: any) => (
                               <button
                                 key={c.id}
                                 onClick={() => handleContentSelect(c)}
                                 className={`w-full text-left p-2.5 pl-4 rounded-lg transition-all flex items-center gap-3 ${
                                   activeContent?.id === c.id
                                     ? 'bg-emerald-500 text-white shadow-md shadow-emerald-50'
                                     : 'hover:bg-gray-50 text-gray-600'
                                 }`}
                               >
                                 <div className={`h-6 w-6 rounded-md flex items-center justify-center ${activeContent?.id === c.id ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>
                                    {c.content_type === 'text' && <FileText size={12} />}
                                    {c.content_type === 'video' && <PlayCircle size={12} />}
                                 </div>
                                 <span className="text-[11px] font-bold truncate flex-1">{c.title}</span>
                               </button>
                             ))}
                           </div>
                        </div>
                      ))}
                  </div>
               </div>
             ))}
          </CardContent>
        </Card>

        {/* Center: Content Viewer */}
        <Card className="flex-1 border-gray-100 flex flex-col overflow-hidden">
           <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-12 bg-white prose prose-emerald max-w-none prose-headings:font-black prose-p:text-gray-600 line-height-relaxed">
                 {activeContent ? (
                   <>
                     <h1 className="text-4xl font-black text-gray-900 mb-8 border-b-4 border-emerald-500 pb-4 inline-block">
                       {activeContent.title}
                     </h1>

                      {/* Video Player Section */}
                      {activeContent.content_type === 'video' && activeContent.video_url && (
                        <div className="mb-10 w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-xl border border-gray-100">
                          {activeContent.video_url.includes('youtube.com') || activeContent.video_url.includes('youtu.be') ? (
                            <iframe 
                              width="100%" 
                              height="100%" 
                              src={`https://www.youtube.com/embed/${
                                activeContent.video_url.includes('v=') 
                                  ? activeContent.video_url.split('v=')[1].split('&')[0] 
                                  : activeContent.video_url.split('/').pop()
                              }`}
                              title={activeContent.title}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          ) : (
                            <video 
                              src={activeContent.video_url} 
                              controls 
                              className="w-full h-full"
                            >
                              Your browser does not support the video tag.
                            </video>
                          )}
                        </div>
                      )}

                     <ReactMarkdown>
                       {activeContent.content_data || (activeContent.content_type === 'video' ? '' : 'No content provided for this lesson.')}
                     </ReactMarkdown>

                     {/* Lesson Actions */}
                     <div className="mt-20 pt-10 border-t border-gray-100 flex justify-between">
                        <Button variant="ghost" disabled className="text-gray-400">
                           <ChevronLeft className="h-5 w-5 mr-2" /> Previous
                        </Button>
                         <Button
                           className="bg-emerald-600 hover:bg-emerald-700"
                           onClick={handleCompleteNext}
                         >
                            Complete & Next <ChevronRight className="h-5 w-5 ml-2" />
                         </Button>
                     </div>
                   </>
                 ) : (
                   <div className="flex flex-col items-center justify-center h-full text-center">
                      <GraduationCap className="h-16 w-16 text-gray-100 mb-4" />
                      <p className="text-gray-400 font-bold">Select a lesson to begin your journey</p>
                   </div>
                 )}
              </div>
           </CardContent>
        </Card>

        {/* Right Side: AI Assistant */}
        <Card className="w-96 flex-shrink-0 border-emerald-100 flex flex-col overflow-hidden shadow-2xl shadow-emerald-100/20">
           <CardHeader className="py-4 border-b border-emerald-50 bg-emerald-50/50">
              <CardTitle className="text-sm font-black flex items-center justify-between text-emerald-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  AI Learning Assistant
                </div>
                <div className="flex gap-1">
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse delay-75" />
                   <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse delay-150" />
                </div>
              </CardTitle>
           </CardHeader>
           
           <CardContent className="p-0 flex-1 flex flex-col overflow-hidden bg-gray-50/30">
              {/* Chat History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                 <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 mb-1.5">
                       <HelpCircle size={14} /> AI GUIDE
                    </p>
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                       Hi! I'm your AI tutor. Ask me anything about this lesson — whether it's context, examples, or just clarifying a confusing concept!
                    </p>
                 </div>

                 {aiHistory.map((msg, i) => (
                   <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-2xl text-xs font-medium leading-relaxed shadow-sm ${
                        msg.role === 'user' 
                          ? 'bg-gray-900 text-white border-none' 
                          : 'bg-white text-gray-700 border border-emerald-100'
                      }`}>
                         {msg.content}
                      </div>
                   </div>
                 ))}
                 {loadingAi && (
                   <div className="flex justify-start">
                     <div className="bg-white p-4 rounded-2xl border border-emerald-100 animate-pulse">
                        <div className="h-4 w-32 bg-emerald-50 rounded" />
                     </div>
                   </div>
                 )}
                 <div ref={charEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 bg-white border-t border-gray-100">
                 <form onSubmit={handleSendMessage} className="relative">
                    <input 
                      type="text"
                      placeholder="Ask the AI about this lesson..."
                      value={aiMessage}
                      onChange={(e) => setAiMessage(e.target.value)}
                      className="w-full h-12 bg-gray-50 border border-transparent rounded-xl pl-4 pr-12 text-xs focus:bg-white focus:border-emerald-500 outline-none transition-all font-medium"
                    />
                    <Button 
                      type="submit"
                      disabled={loadingAi || !aiMessage.trim()}
                      className="absolute right-1.5 top-1.5 h-9 w-9 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg p-0"
                    >
                       <Send className="h-4 w-4" />
                    </Button>
                 </form>
                 <p className="text-[9px] text-gray-400 mt-3 text-center font-bold uppercase tracking-widest">
                    AI can make mistakes. Verify important info.
                 </p>
              </div>
           </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Add CSS for prosy and scrollbar later in globals or index.css
