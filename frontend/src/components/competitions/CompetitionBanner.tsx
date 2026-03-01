import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { competitionAPI } from '@/services/api';
import { Trophy, Users, Globe, ArrowRight, Star, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface Competition {
  id: string;
  title: string;
  description: string;
  banner_url?: string;
  scope: string;
  status: string;
}

export const CompetitionBanner: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [featured, setFeatured] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await competitionAPI.getFeatured();
        if (res.data.success) {
          setFeatured(res.data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch featured competitions:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  if (loading || featured.length === 0) return null;

  const current = featured[0]; // For now, show the most recent featured one

  const handleAction = () => {
    if (user?.role === 'school_admin') {
      navigate('/school-admin/competitions'); // Assuming this route exists or will be added
    } else if (user?.role === 'student') {
      navigate('/student/exams'); // Or a specific competition joining page
    }
  };

  return (
    <Card className="overflow-hidden border-none shadow-xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white relative group">
      {/* Background Decorative Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl group-hover:bg-purple-500/10 transition-all duration-700"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full -ml-10 -mb-10 blur-2xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>

      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row items-center">
          {/* Banner Image Placeholder or Actual Image */}
          <div className="w-full md:w-1/3 h-48 md:h-64 relative overflow-hidden">
            {current.banner_url ? (
              <img
                src={current.banner_url}
                alt={current.title}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center relative">
                 <Trophy className="w-20 h-20 text-white/20 absolute" />
                 <Sparkles className="w-12 h-12 text-amber-300 animate-pulse" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-indigo-950/80 to-transparent"></div>
          </div>

          {/* Content */}
          <div className="w-full md:w-2/3 p-6 md:p-8 relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-amber-500 hover:bg-amber-600 text-white border-none px-3 py-1 flex items-center gap-1 shadow-lg shadow-amber-900/20">
                <Star className="w-3 h-3 fill-current" />
                Featured Competition
              </Badge>
              <Badge variant="outline" className="text-indigo-200 border-indigo-700/50 bg-indigo-950/50 backdrop-blur-sm">
                <Globe className="w-3 h-3 mr-1" />
                {current.scope.toUpperCase()}
              </Badge>
            </div>

            <h2 className="text-3xl md:text-4xl font-black mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-indigo-200">
              {current.title}
            </h2>

            <p className="text-indigo-100/80 text-lg mb-6 max-w-2xl line-clamp-2 font-medium leading-relaxed">
              {current.description}
            </p>

            <div className="flex flex-wrap items-center gap-6">
              <Button
                onClick={handleAction}
                className="bg-white text-indigo-950 hover:bg-indigo-50 font-bold px-8 py-6 h-auto text-lg rounded-xl shadow-xl shadow-indigo-950/40 transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2"
              >
                {user?.role === 'school_admin' ? (
                  <>
                    <Users className="w-5 h-5" />
                    Register Students
                  </>
                ) : (
                  <>
                    Join Competition
                  </>
                )}
                <ArrowRight className="w-5 h-5 ml-1" />
              </Button>

              <div className="flex items-center gap-4 text-indigo-200/60 font-medium">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span>Registration Open</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
