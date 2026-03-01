import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Trophy, Globe, GraduationCap, ChevronRight, ChevronLeft, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { competitionAPI } from '@/services/api';

interface CreateCompetitionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateCompetitionModal({ isOpen, onClose, onSuccess }: CreateCompetitionModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scope: 'global',
    visibility: 'public',
    banner_url: '',
    auto_promote: true,
    is_featured: false,
    target_countries: [] as string[],
  });

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const response = await competitionAPI.create(formData);
      if (response.data.success) {
        toast.success('Competition created successfully!');
        onSuccess();
        onClose();
        setStep(1);
        setFormData({
          title: '',
          description: '',
          scope: 'global',
          visibility: 'public',
          banner_url: '',
          auto_promote: true,
          is_featured: false,
          target_countries: [],
        });
      }
    } catch (err: any) {
      console.error('Failed to create competition:', err);
      toast.error(err?.response?.data?.message || 'Failed to create competition');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] rounded-[32px] overflow-hidden p-0 border-none shadow-2xl">
        <div className="bg-indigo-600 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Trophy className="h-24 w-24" />
          </div>
          <DialogHeader className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-white/20 text-white border-none backdrop-blur-md">
                Step {step} of 3
              </Badge>
            </div>
            <DialogTitle className="text-3xl font-black tracking-tight">
              {step === 1 ? 'Design Competition' : step === 2 ? 'Global Reach' : 'Governance & Launch'}
            </DialogTitle>
            <DialogDescription className="text-indigo-100 text-lg">
              {step === 1 ? 'Set the identity and description of your event' :
               step === 2 ? 'Define geographic constraints and visibility' :
               'Configure automation and finalize your event'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6">
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Competition Title</Label>
                <Input
                  placeholder="e.g. National Math Olympiad 2026"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="h-12 rounded-xl border-slate-100 bg-slate-50 focus:ring-indigo-100"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Description</Label>
                <Textarea
                  placeholder="Tell students what this competition is about..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-[120px] rounded-xl border-slate-100 bg-slate-50 focus:ring-indigo-100"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Geographic Scope</Label>
                  <Select
                    value={formData.scope}
                    onValueChange={val => setFormData({ ...formData, scope: val as any })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50">
                      <SelectValue placeholder="Select Scope" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local (School/Cluster)</SelectItem>
                      <SelectItem value="national">National (Single Country)</SelectItem>
                      <SelectItem value="global">Global (Unrestricted)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Visibility</Label>
                  <Select
                    value={formData.visibility}
                    onValueChange={val => setFormData({ ...formData, visibility: val as any })}
                  >
                    <SelectTrigger className="h-12 rounded-xl border-slate-100 bg-slate-50">
                      <SelectValue placeholder="Select Visibility" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public Marketplace</SelectItem>
                      <SelectItem value="private">Invite-only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                <Globe className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-800 font-medium">
                  {formData.scope === 'global' ?
                    'Global competitions are visible to all students across the platform regardless of region.' :
                    'Targeted competitions will prioritize students in the specific countries you define.'}
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="font-bold text-slate-900">Auto-Promotion</Label>
                  <p className="text-xs text-slate-500">Automatically advance top performers to the next stage.</p>
                </div>
                <Switch
                  checked={formData.auto_promote}
                  onCheckedChange={val => setFormData({ ...formData, auto_promote: val })}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="space-y-0.5">
                  <Label className="font-bold text-slate-900">Featured Placement</Label>
                  <p className="text-xs text-slate-500">Showcase this event on student and school login banners.</p>
                </div>
                <Switch
                  checked={formData.is_featured}
                  onCheckedChange={val => setFormData({ ...formData, is_featured: val })}
                />
              </div>

              <div className="p-6 bg-slate-900 rounded-3xl text-white">
                <div className="flex items-center gap-3 mb-4">
                  <GraduationCap className="h-6 w-6 text-indigo-400" />
                  <h4 className="font-black text-lg">Platform Readiness</h4>
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Upon creation, this competition will start in <span className="text-indigo-400 font-bold">Draft</span> mode.
                  You will then need to configure stages, categories, and reward brackets before opening registration.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-8 pt-0 flex gap-2">
          {step > 1 && (
            <Button
              variant="outline"
              onClick={handleBack}
              className="h-12 rounded-xl border-slate-200"
            >
              <ChevronLeft className="h-4 w-4 mr-2" /> Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-bold shadow-lg shadow-indigo-100 group"
              onClick={handleNext}
              disabled={!formData.title}
            >
              Continue <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          ) : (
            <Button
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 rounded-xl font-bold shadow-lg shadow-indigo-100"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Creating...' : (
                <div className="flex items-center gap-2">
                  <Rocket className="h-4 w-4" /> Create Competition
                </div>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
