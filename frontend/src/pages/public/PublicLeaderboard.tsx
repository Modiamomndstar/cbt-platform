import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { resultAPI, competitionAPI } from '@/services/api';
import { Trophy, Medal, Award, MapPin, Globe, Clock, RefreshCcw } from 'lucide-react';
import { formatTime } from '@/lib/dateUtils';

interface LeaderboardEntry {
  rank: number;
  studentName: string;
  schoolName: string;
  state: string;
  country: string;
  score: number;
  percentage: string;
  category: string;
  stage: string;
  timeSpent: number;
  completedAt: string;
}

export default function PublicLeaderboard() {
  const { competitionId } = useParams<{ competitionId: string }>();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [selectedCategory] = useState<string>('all');
  const [competition, setCompetition] = useState<any>(null);
  const [rewards, setRewards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchLeaderboard = async () => {
    if (!competitionId) return;
    try {
      const response = await resultAPI.getLeaderboard(
        competitionId,
        selectedCategory === 'all' ? undefined : selectedCategory
      );
      setEntries(response.data.data || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompetitionDetails = async () => {
    if (!competitionId) return;
    try {
      const [compRes, rewardRes] = await Promise.all([
        competitionAPI.getById(competitionId),
        competitionAPI.getRewards(competitionId),
      ]);
      setCompetition(compRes.data.data);
      setRewards(rewardRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch competition details:', error);
    }
  };

  useEffect(() => {
    fetchCompetitionDetails();
    fetchLeaderboard();

    const interval = setInterval(fetchLeaderboard, 60000);
    return () => clearInterval(interval);
  }, [competitionId, selectedCategory]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="h-6 w-6 text-yellow-500" />;
      case 2: return <Medal className="h-6 w-6 text-slate-400" />;
      case 3: return <Medal className="h-6 w-6 text-amber-600" />;
      default: return <span className="font-bold text-slate-500">#{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="bg-indigo-900 text-white py-12 px-6 shadow-xl">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <Badge variant="outline" className="text-indigo-200 border-indigo-500 mb-4 bg-indigo-800/50">
              Live Competition Leaderboard
            </Badge>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 flex items-center gap-3">
              <Trophy className="h-10 w-10 text-yellow-400" />
              {competition?.title || 'Competition Rankings'}
            </h1>
            <p className="text-indigo-200 text-lg max-w-2xl">
              Celebrating excellence. View real-time rankings of top performers from across the globe.
            </p>
          </div>

          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2 text-sm text-indigo-300">
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Last updated: {formatTime(lastUpdated)}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-8 space-y-8">
        {rewards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {rewards.slice(0, 3).map((reward, idx) => (
              <Card key={reward.id} className="border-none shadow-lg bg-gradient-to-br from-white to-slate-50 relative overflow-hidden group hover:-translate-y-1 transition-all">
                <div className={`absolute top-0 left-0 w-1 h-full ${idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-600'}`}></div>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-xl ${idx === 0 ? 'bg-yellow-50 text-yellow-600' : idx === 1 ? 'bg-slate-50 text-slate-600' : 'bg-amber-50 text-amber-600'}`}>
                      {idx === 0 ? <Trophy className="h-6 w-6" /> : <Award className="h-6 w-6" />}
                    </div>
                       {reward.rewardValue > 0 && (
                       <span className="text-xl font-black text-indigo-900">${reward.rewardValue}</span>
                     )}
                   </div>
                   <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm mb-1">{reward.rewardTitle}</h3>
                   <p className="text-slate-500 text-xs font-medium leading-relaxed">{reward.rewardDescription}</p>
                   <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                     Rank {reward.rankFrom} {reward.rankTo !== reward.rankFrom ? `- ${reward.rankTo}` : ''}
                   </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="shadow-2xl border-none overflow-hidden">
          <CardHeader className="bg-white border-b flex flex-row items-center justify-between py-6">
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Award className="h-6 w-6 text-indigo-600" />
              Elite Standings
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-slate-400" />
                <span className="text-sm text-slate-500">Global Ranking</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading && entries.length === 0 ? (
              <div className="p-20 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-slate-500">Loading live rankings...</p>
              </div>
            ) : entries.length === 0 ? (
              <div className="p-20 text-center">
                <Award className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-slate-700">No results yet</h3>
                <p className="text-slate-500">The competition results will appear here as students complete their exams.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-20 text-center">Rank</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>School Information</TableHead>
                      <TableHead className="text-center">Score</TableHead>
                      <TableHead className="text-center">Time Spent</TableHead>
                      <TableHead className="text-center">Category / Stage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((entry, idx) => (
                      <TableRow key={`${entry.studentName}-${idx}`} className="hover:bg-indigo-50/30 transition-colors">
                        <TableCell className="text-center">
                          {getRankIcon(entry.rank)}
                        </TableCell>
                        <TableCell className="font-bold text-slate-900">
                          {entry.studentName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-800">{entry.schoolName}</span>
                            <span className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {entry.state}, {entry.country}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-lg font-black text-indigo-700">{entry.score}</span>
                            <span className="text-xs font-semibold text-slate-400">{entry.percentage}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 rounded text-slate-600 text-sm">
                            <Clock className="h-3 w-3" />
                            {entry.timeSpent}m
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                           <div className="flex flex-col items-center gap-1">
                             <Badge variant="outline" className="text-[10px] uppercase tracking-wider">{entry.category}</Badge>
                             <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-[10px] hover:bg-amber-100 shadow-none">
                               {entry.stage}
                             </Badge>
                           </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-12 text-center text-slate-400">
        <p className="text-sm">Competition Exam Engine Platform &copy; 2026</p>
        <p className="text-xs mt-1 italic">Verified Official Results</p>
      </div>
    </div>
  );
}
