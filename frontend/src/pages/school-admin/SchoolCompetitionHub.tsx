import { useState, useEffect } from 'react';
import {
  Trophy, Globe, Flag, Users,
  Calendar, ChevronRight,
  Layout, BookOpen,
  ArrowRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { competitionAPI } from '@/services/api';
import StudentRegistrationModal from '@/components/competitions/StudentRegistrationModal';
import StudentPortalGuideModal from '@/components/competitions/StudentPortalGuideModal';
import { HelpCircle } from 'lucide-react';

export default function SchoolCompetitionHub() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComp, setSelectedComp] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const res = await competitionAPI.getAvailableForSchool();
      if (res.data.success) {
        setCompetitions(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load competitions:", error);
      toast.error("Failed to load live competitions. Please try again later.");
      setCompetitions([]);
    } finally {
      setLoading(false);
    }
  };

  const openRegistration = (comp: any, category: any) => {
    setSelectedComp(comp);
    setSelectedCategory(category);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            Competition Hub
          </h1>
          <p className="text-slate-500 mt-1">Discover and register your students for national and global events</p>
        </div>
      </div>

      {/* Hero / Info - Premium Glassmorphism */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
         <div className="absolute right-0 top-0 p-12 opacity-10">
            <Globe className="h-48 w-48 rotate-12" />
         </div>
         <div className="relative z-10 max-w-2xl">
            <Badge className="bg-indigo-400/30 text-white border-indigo-400/50 mb-4 px-3 py-1">Marketing & Engagement</Badge>
            <h2 className="text-3xl font-bold mb-4">Elevate Your School's Recognition</h2>
            <p className="text-indigo-100 text-lg leading-relaxed mb-6">
              Participate in high-stakes competitions to showcase your students' excellence.
              Top performing schools gain global visibility on our public leaderboards.
            </p>
            <div className="flex flex-wrap gap-4">
               <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                  <Users className="h-4 w-4 text-indigo-200" />
                  <span className="text-sm font-medium">Verify Representatives</span>
               </div>
               <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20">
                  <Layout className="h-4 w-4 text-indigo-200" />
                  <span className="text-sm font-medium">Earn Digital Awards</span>
               </div>
               <Button
                variant="ghost"
                onClick={() => setIsGuideOpen(true)}
                className="bg-white text-indigo-600 hover:bg-slate-50 border-none rounded-full px-6 shadow-xl shadow-indigo-900/20 font-bold"
               >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  How Students Access Portal
               </Button>
            </div>
         </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200"></div>
        <span className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Available Competitions</span>
        <div className="h-px flex-1 bg-slate-200"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {loading ? (
             Array(2).fill(0).map((_, i) => (
                <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-3xl" />
             ))
        ) : competitions.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <Trophy className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No active competitions</h3>
            <p className="text-slate-500">Check back later for new national and global events.</p>
          </div>
        ) : (
          competitions.map((comp) => (
            <Card key={comp.id} className="border-0 shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm group hover:shadow-xl transition-all duration-300 rounded-3xl">
              <CardHeader className="bg-slate-50 border-b p-6 pb-4">
                <div className="flex justify-between items-start mb-2">
                   <div className="flex items-center gap-2">
                      {comp.scope === 'national' ? <Flag className="h-4 w-4 text-red-500" /> : <Globe className="h-4 w-4 text-indigo-500" />}
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        {comp.scope} Event • {comp.target_countries?.join(', ') || comp.target_regions?.join(', ')}
                      </span>
                   </div>
                   <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none px-3">Open</Badge>
                </div>
                <CardTitle className="text-2xl font-black text-slate-900 leading-tight">
                  {comp.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-slate-600 text-sm mb-6 line-clamp-2">
                  {comp.description}
                </p>

                <div className="space-y-4">
                   <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-tight mb-2">
                      <span>Available Categories</span>
                      <span className="text-indigo-600 flex items-center gap-1">
                        <Users className="h-3 w-3" /> {comp.registration_count} Registered
                      </span>
                   </div>

                   <div className="grid gap-3">
                      {(comp.categories || []).map((cat: any) => (
                         <div key={cat.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex justify-between items-center group/cat hover:border-indigo-200 hover:bg-white transition-all">
                            <div className="flex items-center gap-3">
                               <div className="h-10 w-10 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover/cat:bg-indigo-600 group-hover/cat:text-white transition-colors">
                                  <BookOpen className="h-5 w-5" />
                               </div>
                               <div>
                                  <h4 className="font-bold text-slate-900 group-hover/cat:text-indigo-600 transition-colors uppercase text-xs tracking-tight">{cat.name}</h4>
                                  <p className="text-[10px] text-slate-500 font-medium">
                                     Eligibility: Age {cat.min_age}-{cat.max_age}
                                  </p>
                               </div>
                            </div>
                            <Button
                               size="sm"
                               className="bg-white text-slate-900 hover:bg-slate-900 hover:text-white border border-slate-200 rounded-lg shadow-sm font-bold h-8 px-4"
                               onClick={() => openRegistration(comp, cat)}
                            >
                               Register <ArrowRight className="h-3.5 w-3.5 ml-2" />
                            </Button>
                         </div>
                      ))}
                   </div>
                </div>

                <div className="mt-8 pt-6 border-t flex items-center justify-between">
                   <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                      <Calendar className="h-4 w-4" /> Start Date: March 2026
                   </div>
                   <div className="flex gap-2">
                     <Button
                       variant="ghost"
                       className="text-amber-600 font-bold text-xs gap-1 hover:bg-amber-50"
                       onClick={() => window.open(`/leaderboard/${comp.id}`, '_blank')}
                     >
                        <Trophy className="h-4 w-4 text-amber-500" />
                        Global Leaderboard
                     </Button>
                     <Button variant="ghost" className="text-indigo-600 font-bold text-xs gap-1 hover:bg-indigo-50">
                        Full Details <ChevronRight className="h-4 w-4" />
                     </Button>
                   </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <StudentRegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        competitionId={selectedComp?.id}
        competitionTitle={selectedComp?.title}
        category={selectedCategory}
        onSuccess={loadCompetitions}
      />

      <StudentPortalGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
}
