import { useEffect, useState } from 'react';
import { Trophy, Globe, Users, Calendar, ArrowRight, Award, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { competitionAPI } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';

export default function StudentCompetitionHub() {
  const { user } = useAuth();
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyCompetitions();
  }, [user]);

  const loadMyCompetitions = async () => {
    try {
      setLoading(true);
      const res = await competitionAPI.getMyCompetitions();
      if (res.data.success) {
        setCompetitions(res.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load competitions:", error);
      toast.error("Failed to load your competitions.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
     return (
       <div className="flex flex-col items-center justify-center h-64 gap-4">
         <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
         <p className="text-sm text-slate-500 font-medium">Loading your competition profile...</p>
       </div>
     );
  }

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            My Competitions
          </h1>
          <p className="text-slate-500 mt-1">Manage your active registrations and view upcoming challenges</p>
        </div>
      </div>

      {competitions.length === 0 ? (
        <Card className="border-dashed border-2 bg-slate-50/50">
          <CardContent className="py-16 text-center">
            <Globe className="h-16 w-16 text-slate-200 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-slate-900">No active registrations</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2">
              You haven't been registered for any competitions yet. Ask your school administrator or tutor to register you for available events.
            </p>
            <Button className="mt-8 bg-indigo-600 hover:bg-indigo-700 font-bold px-8 rounded-full">
              Explore Available Events
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competitions.map((comp) => (
            <Card key={comp.id} className="overflow-hidden border-none shadow-md hover:shadow-xl transition-all duration-300 rounded-2xl group bg-white">
              <div className="h-2 bg-gradient-to-r from-amber-400 to-indigo-600" />
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start mb-3">
                   <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none font-bold uppercase text-[10px] tracking-widest">
                     {comp.scope}
                   </Badge>
                   {comp.registration_status === 'approved' && (
                     <div className="flex items-center text-emerald-600 gap-1 text-xs font-bold">
                        <CheckCircle className="h-3.5 w-3.5" />
                        Confirmed
                     </div>
                   )}
                </div>
                <CardTitle className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                  {comp.title}
                </CardTitle>
                <CardDescription className="font-bold text-indigo-500 uppercase text-[10px] tracking-tight mt-1">
                   Category: {comp.category_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600 text-sm mb-6 line-clamp-2 leading-relaxed">
                  {comp.description}
                </p>

                <div className="flex flex-col gap-3">
                   <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                      <div className="flex items-center gap-2">
                         <Calendar className="h-4 w-4 text-slate-400" />
                         <span className="text-xs font-bold text-slate-500 uppercase">Stage 1 Start</span>
                      </div>
                      <span className="text-xs font-black text-slate-900">March 15, 2026</span>
                   </div>

                   <Button className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold rounded-xl mt-2 py-6">
                      Go to Competition Hub <ArrowRight className="h-4 w-4 ml-2" />
                   </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Rewards Showcase if registrations exist */}
      {competitions.length > 0 && (
        <Card className="bg-slate-900 text-white border-none rounded-3xl overflow-hidden relative shadow-2xl">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
             <Trophy className="h-64 w-64" />
          </div>
          <CardHeader className="p-8 pb-4 relative z-10">
             <Badge className="bg-amber-500/20 text-amber-400 border-none mb-4 px-3 py-1">Rewards & Prizes</Badge>
             <CardTitle className="text-2xl font-black">Top Performers Recognition</CardTitle>
             <CardDescription className="text-slate-400">Winning isn't just about the trophy, it's about the benefits</CardDescription>
          </CardHeader>
          <CardContent className="p-8 pt-0 relative z-10">
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                <RewardCard icon={Award} label="Gold Medalist" value="Scholarship + $500" />
                <RewardCard icon={Globe} label="Top 1%" value="Global Portfolio Feature" />
                <RewardCard icon={CheckCircle} label="Participation" value="Blockchain Certificate" />
                <RewardCard icon={Users} label="Team" value="Exclusive Community Access" />
             </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RewardCard({ icon: Icon, label, value }: any) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl">
       <div className="p-2 bg-indigo-500/20 rounded-lg w-fit mb-3">
          <Icon className="h-5 w-5 text-indigo-400" />
       </div>
       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
       <p className="text-sm font-bold mt-1 text-white">{value}</p>
    </div>
  );
}
