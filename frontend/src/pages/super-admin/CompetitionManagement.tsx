import { useState, useEffect } from 'react';
import {
  Trophy, Plus, Globe, Flag, Users,
  Calendar, Layout, Search,
  ChevronRight, Filter, AlertCircle,
  Settings, Star, Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { competitionAPI } from '@/services/api';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Award, Zap } from 'lucide-react';
import CreateCompetitionModal from './CreateCompetitionModal';

export default function CompetitionManagement() {
  const [competitions, setCompetitions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComp, setSelectedComp] = useState<any>(null);
  const [isPromoModalOpen, setIsPromoModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [hubStats, setHubStats] = useState({
    totalEvents: 0,
    activeParticipants: 0,
    regionalScope: 0,
    awardsIssued: 0
  });
  const [promoForm, setPromoForm] = useState({
    isFeatured: false,
    bannerUrl: '',
    rewards: [] as any[],
    competitionRules: '',
    maxViolations: 3,
    negativeMarkingRate: 0
  });

  const loadCompetitions = async () => {
    try {
      setLoading(true);
      const res = await competitionAPI.getAll();
      if (res.data.success) {
        setCompetitions(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load competitions:', err);
      toast.error('Failed to load competitions');
    } finally {
      setLoading(false);
    }
  };

  const loadHubStats = async () => {
    try {
      const res = await competitionAPI.getHubStats();
      if (res.data.success) {
        setHubStats(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load hub stats:', err);
    }
  };

  useEffect(() => {
    loadCompetitions();
    loadHubStats();
  }, []);

  const handleOpenPromo = async (comp: any) => {
    setSelectedComp(comp);
    setPromoForm({
      isFeatured: comp.isFeatured || false,
      bannerUrl: comp.bannerUrl || '',
      rewards: [],
      competitionRules: comp.competitionRules || '',
      maxViolations: comp.maxViolations ?? 3,
      negativeMarkingRate: comp.negativeMarkingRate || 0
    });

    // Load rewards
    try {
      const res = await competitionAPI.getRewards(comp.id);
      if (res.data.success) {
        setPromoForm(prev => ({ ...prev, rewards: res.data.data || [] }));
      }
    } catch (err) {
      console.error('Failed to load rewards:', err);
    }

    setIsPromoModalOpen(true);
  };

  const handleSavePromo = async () => {
    try {
      // Update competition featured/banner (need a PATCH endpoint or reuse updateStatus/create logic)
      // For now we'll assume a generic update endpoint or handle via specific ones if available
      // Since we only added status update on backend, let's assume we need to update Competition table

      // Update rewards
      await competitionAPI.setRewards(selectedComp.id, promoForm.rewards);

      // Update featured status, rules, and proctoring
      await competitionAPI.updatePromotion(selectedComp.id, {
        isFeatured: promoForm.isFeatured,
        bannerUrl: promoForm.bannerUrl,
        competitionRules: promoForm.competitionRules,
        maxViolations: promoForm.maxViolations,
        negativeMarkingRate: promoForm.negativeMarkingRate
      });

      toast.success('Promotion settings updated successfully');
      setIsPromoModalOpen(false);
      loadCompetitions();
    } catch (err) {
      console.error('Failed to save promotion:', err);
      toast.error('Failed to save promotion settings');
    }
  };

  const addReward = () => {
    setPromoForm(prev => ({
      ...prev,
      rewards: [...prev.rewards, { rankFrom: 1, rankTo: 1, rewardTitle: '', rewardDescription: '', rewardValue: 0, rewardType: 'cash' }]
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registration_open': return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Live Registration</Badge>;
      case 'draft': return <Badge variant="outline" className="text-gray-500">Draft</Badge>;
      case 'exam_in_progress': return <Badge className="bg-amber-100 text-amber-700 animate-pulse">Exam In Progress</Badge>;
      case 'completed': return <Badge className="bg-blue-100 text-blue-700">Completed</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            Competition Hub
          </h1>
          <p className="text-slate-500 mt-1">Design, monitor, and scale cross-school competition events</p>
        </div>
        <Button
          className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 gap-2"
          onClick={() => setIsCreateModalOpen(true)}
        >
          <Plus className="h-4 w-4" /> Create Competition
        </Button>
      </div>

      <CreateCompetitionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadCompetitions();
          loadHubStats();
        }}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Events" value={hubStats?.totalEvents || 0} icon={Layout} color="text-blue-600" />
        <StatCard title="Active Participants" value={(hubStats?.activeParticipants || 0).toLocaleString()} icon={Users} color="text-indigo-600" />
        <StatCard title="Regional Scope" value={`${hubStats?.regionalScope || 0} ${(hubStats?.regionalScope || 0) === 1 ? 'Country' : 'Countries'}`} icon={Globe} color="text-emerald-600" />
        <StatCard title="Awards Issued" value={(hubStats?.awardsIssued || 0).toLocaleString()} icon={Flag} color="text-purple-600" />

      </div>

      <div className="flex items-center gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search competitions..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border-0 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" /> Filter
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
          ))
        ) : (
          competitions.map((comp) => (
            <Card key={comp.id} className="border-0 shadow-sm overflow-hidden hover:shadow-md transition-all group">
               <CardHeader className="bg-slate-50/50 border-b pb-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        {comp.scope === 'national' ? <Flag className="h-4 w-4 text-red-500" /> : <Globe className="h-4 w-4 text-indigo-500" />}
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                          {comp.scope} Event • {comp.targetCountries?.join(', ') || comp.targetRegions?.join(', ')}
                        </span>
                      </div>
                      <CardTitle className="text-xl font-bold text-slate-800 leading-tight">
                        {comp.title}
                      </CardTitle>
                    </div>
                    {getStatusBadge(comp.status)}
                  </div>
               </CardHeader>
               <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-tighter">Categories</p>
                      <p className="text-lg font-bold text-slate-900">{comp.categoriesCount}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-tighter">Stages</p>
                      <p className="text-lg font-bold text-slate-900">{comp.stagesCount}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-lg text-center">
                      <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-tighter">Registered</p>
                      <p className="text-lg font-bold text-slate-900">{comp.participantsCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <Calendar className="h-3.5 w-3.5" /> Starts {comp.createdAt ? new Date(comp.createdAt).toLocaleDateString() : 'TBD'}
                      </div>
                      {comp.isFeatured && (
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none h-5 px-1.5">
                          <Star className="h-3 w-3 mr-1 fill-current" /> Featured
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" className="text-slate-500" onClick={() => handleOpenPromo(comp)}>
                        <Sparkles className="h-4 w-4 mr-1 text-amber-500" />
                        Promotion
                      </Button>
                      <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4">
                        Manage Ecosystem <ChevronRight className="h-4 w-4 ml-1 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                      </Button>
                    </div>
                  </div>
               </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-800 to-slate-900 text-white overflow-hidden relative">
        <div className="absolute right-0 top-0 p-8 opacity-10">
          <Settings className="h-32 w-32 rotate-12" />
        </div>
        <CardHeader className="relative z-10">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            Competition Admin Strategy
          </CardTitle>
          <CardDescription className="text-slate-300">
            Current global engagement settings for automated qualification and reward distribution.
          </CardDescription>
        </CardHeader>
        <CardContent className="relative z-10">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <StrategyItem
                title="Automated Scoring"
                desc="Difficulty depth (Fill-in-the-gap) is weighted at 1.5x."
              />
              <StrategyItem
                title="Proctoring Protocol"
                desc="Window-lock and Tab-detection enabled for all stages."
              />
              <StrategyItem
                title="Reward Fulfillment"
                desc="Digital Certificates generated instantly upon final stage completion."
              />
           </div>
        </CardContent>
      </Card>

      {/* Promotion & Rewards Modal */}
      <Dialog open={isPromoModalOpen} onOpenChange={setIsPromoModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-amber-500" />
              Promotion & Rewards: {selectedComp?.title}
            </DialogTitle>
            <DialogDescription>
              Configure how this competition is promoted to schools and students.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
          <Tabs defaultValue="visuals" className="mt-4">
            <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 p-1 h-12 rounded-xl">
              <TabsTrigger value="visuals" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Layout className="h-4 w-4 mr-2" /> Visuals
              </TabsTrigger>
              <TabsTrigger value="security" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Shield className="h-4 w-4 mr-2" /> Security & Rules
              </TabsTrigger>
              <TabsTrigger value="rewards" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
                <Award className="h-4 w-4 mr-2" /> Rewards
              </TabsTrigger>
            </TabsList>

            <TabsContent value="visuals" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <Label className="text-lg font-bold">Featured Status</Label>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border">
                    <div className="space-y-0.5">
                      <p className="font-bold">Show on Dashboards</p>
                      <p className="text-sm text-slate-500 text-pretty">Display this competition in the featured banner area.</p>
                    </div>
                    <Switch
                      checked={promoForm.isFeatured}
                      onCheckedChange={(val) => setPromoForm(prev => ({ ...prev, isFeatured: val }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-lg font-bold">Banner URL</Label>
                  <Input
                    placeholder="https://example.com/banner.jpg"
                    value={promoForm.bannerUrl}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, bannerUrl: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500">Recommended size: 1200x400px</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-lg font-bold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-indigo-600" />
                    Violation Threshold
                  </Label>
                  <Input
                    type="number"
                    value={promoForm.maxViolations}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, maxViolations: parseInt(e.target.value) }))}
                  />
                  <p className="text-xs text-slate-500">Max tab switches/blur before auto-disqualification.</p>
                </div>

                <div className="space-y-2">
                  <Label className="text-lg font-bold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-600" />
                    Negative Marking (%)
                  </Label>
                  <Input
                    type="number"
                    value={promoForm.negativeMarkingRate}
                    onChange={(e) => setPromoForm(prev => ({ ...prev, negativeMarkingRate: parseFloat(e.target.value) }))}
                  />
                  <p className="text-xs text-slate-500">Percentage of marks to deduct for each wrong answer.</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-lg font-bold">Competition Rules & Instructions</Label>
                <Textarea
                  placeholder="Enter the official rules for this competition..."
                  className="h-32 rounded-xl border-slate-200"
                  value={promoForm.competitionRules}
                  onChange={(e) => setPromoForm(prev => ({ ...prev, competitionRules: e.target.value }))}
                />
                <p className="text-xs text-slate-500">These will be shown to students before the exam starts.</p>
              </div>
            </TabsContent>

            <TabsContent value="rewards" className="space-y-6">
              <div className="flex justify-between items-center mb-4">
                <Label className="text-xl font-black">Prize Pool & Rewards</Label>
                <Button variant="outline" size="sm" onClick={addReward} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Reward Bracket
                </Button>
              </div>

              <div className="space-y-4">
                {promoForm.rewards.map((reward, idx) => (
                  <div key={idx} className="p-4 border rounded-xl bg-slate-50 relative group">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-slate-500 font-bold">Rank From</Label>
                        <Input
                          type="number"
                          value={reward.rankFrom}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newRewards = [...promoForm.rewards];
                            newRewards[idx].rankFrom = parseInt(e.target.value);
                            setPromoForm(prev => ({ ...prev, rewards: newRewards }));
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs uppercase text-slate-500 font-bold">Rank To</Label>
                        <Input
                          type="number"
                          value={reward.rankTo}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newRewards = [...promoForm.rewards];
                            newRewards[idx].rankTo = parseInt(e.target.value);
                            setPromoForm(prev => ({ ...prev, rewards: newRewards }));
                          }}
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <Label className="text-xs uppercase text-slate-500 font-bold">Reward Title</Label>
                        <Input
                          placeholder="Gold Prize"
                          value={reward.rewardTitle}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newRewards = [...promoForm.rewards];
                            newRewards[idx].rewardTitle = e.target.value;
                            setPromoForm(prev => ({ ...prev, rewards: newRewards }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                       <div className="col-span-2 space-y-2">
                        <Label className="text-xs uppercase text-slate-500 font-bold">Description</Label>
                        <Input
                          placeholder="Full scholarship and $500 cash"
                          value={reward.rewardDescription}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newRewards = [...promoForm.rewards];
                            newRewards[idx].rewardDescription = e.target.value;
                            setPromoForm(prev => ({ ...prev, rewards: newRewards }));
                          }}
                        />
                       </div>
                       <div className="space-y-2">
                        <Label className="text-xs uppercase text-slate-500 font-bold">Cash Value (USD)</Label>
                        <Input
                          type="number"
                          value={reward.rewardValue}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            const newRewards = [...promoForm.rewards];
                            newRewards[idx].rewardValue = parseFloat(e.target.value);
                            setPromoForm(prev => ({ ...prev, rewards: newRewards }));
                          }}
                        />
                       </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const newRewards = promoForm.rewards.filter((_, i) => i !== idx);
                        setPromoForm(prev => ({ ...prev, rewards: newRewards }));
                      }}
                    >
                      <Plus className="h-4 w-4 rotate-45" />
                    </Button>
                  </div>
                ))}

                {promoForm.rewards.length === 0 && (
                  <div className="text-center py-8 border-2 border-dashed rounded-xl text-slate-400">
                    No rewards configured for this competition.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="ghost" onClick={() => setIsPromoModalOpen(false)}>Cancel</Button>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleSavePromo}>
              Save Promotion Settings
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1 tracking-tight">{title}</p>
            <p className="text-3xl font-black text-slate-900 tabular-nums">{value}</p>
          </div>
          <div className={`p-2 rounded-lg bg-slate-50 ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StrategyItem({ title, desc }: any) {
  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 p-4 rounded-xl">
       <h4 className="font-bold text-amber-400 text-sm mb-1">{title}</h4>
       <p className="text-xs text-slate-300 leading-relaxed font-medium">{desc}</p>
    </div>
  );
}
