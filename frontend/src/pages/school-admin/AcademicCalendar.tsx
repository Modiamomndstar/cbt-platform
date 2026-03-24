import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  Clock, 
  Settings, 
  CheckCircle2, 
  Loader2,
  CalendarDays,
  Globe,
  ChevronRight
} from 'lucide-react';
import { academicCalendarAPI } from '@/services/api';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format, isValid } from 'date-fns';

export default function AcademicCalendar() {
  const [activeYear, setActiveYear] = useState<any>(null);
  
  const safeFormat = (dateStr: any, formatStr: string) => {
    try {
      if (!dateStr) return 'N/A';
      const d = new Date(dateStr);
      if (!isValid(d)) return 'N/A';
      return format(d, formatStr);
    } catch (e) {
      return 'N/A';
    }
  };
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [formData, setFormData] = useState({
    name: `${new Date().getFullYear()}/${new Date().getFullYear() + 1} Session`,
    startDate: new Date().toISOString().split('T')[0],
    preset: '3-term' as '3-term' | '2-semester' | 'flexible',
    periodCount: 1,
    weeksPerPeriod: 6
  });

  useEffect(() => {
    loadActiveYear();
  }, []);

  const loadActiveYear = async () => {
    try {
      setLoading(true);
      const res = await academicCalendarAPI.getActiveYear();
      if (res.data.success) {
        setActiveYear(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to load academic calendar. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPreset = async () => {
    try {
      setSettingUp(true);
      let res;
      if (formData.preset === 'flexible') {
        res = await academicCalendarAPI.setupFlexible({
            name: formData.name,
            startDate: formData.startDate,
            periodCount: formData.periodCount,
            weeksPerPeriod: formData.weeksPerPeriod
        });
      } else {
        res = await academicCalendarAPI.setupPreset({
            name: formData.name,
            startDate: formData.startDate,
            weeksPerTerm: formData.preset === '3-term' ? 13 : 15
        });
      }
      
      if (res.data.success) {
        toast.success("Academic Calendar generated successfully!");
        loadActiveYear();
      }
    } catch (error) {
      toast.error("Setup failed. Please check your dates and program structure.");
    } finally {
      setSettingUp(false);
    }
  };

  if (loading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-600" /></div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <CalendarDays className="text-indigo-600" />
            Academic Calendar
          </h1>
          <p className="text-gray-500 text-sm">Configure your school's session, terms, and weeks.</p>
        </div>
        {!activeYear && (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                Setup Required
            </Badge>
        )}
      </div>

      {!activeYear ? (
        <Card className="border-2 border-dashed border-indigo-100 bg-indigo-50/20">
          <CardContent className="p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-6">
                <Globe className="h-8 w-8 text-indigo-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Initialize Your Academic Clock</h2>
            <p className="text-gray-500 max-w-md mb-8">
                Your school doesn't have an active academic year. Setting this up allows tutors to 
                schedule their curriculum week-by-week.
            </p>

            <div className="w-full max-w-md space-y-4 bg-white p-6 rounded-xl border border-indigo-100 shadow-sm text-left">
                <div className="space-y-2">
                    <Label>Session Name</Label>
                    <Input 
                        placeholder="e.g. 2024/2025 Academic Year" 
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input 
                        type="date" 
                        value={formData.startDate}
                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <Label>System Preset</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button 
                            onClick={() => setFormData({...formData, preset: '3-term'})}
                            className={`p-3 text-xs rounded-lg border text-left flex flex-col gap-1 transition-all ${formData.preset === '3-term' ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}`}
                        >
                            <span className="font-bold">3 Terms</span>
                            <span className="text-[10px] text-gray-500">Nigeria, UK, Kenya standard</span>
                        </button>
                        <button 
                            onClick={() => setFormData({...formData, preset: '2-semester'})}
                            className={`p-3 text-xs rounded-lg border text-left flex flex-col gap-1 transition-all ${formData.preset === '2-semester' ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}`}
                        >
                            <span className="font-bold">2 Semesters</span>
                            <span className="text-[10px] text-gray-500">Polytechnic / University</span>
                        </button>
                        <button 
                            onClick={() => setFormData({...formData, preset: 'flexible'})}
                            className={`p-3 text-xs rounded-lg border text-left flex flex-col gap-1 transition-all ${formData.preset === 'flexible' ? 'border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200' : 'border-gray-200 hover:border-indigo-300'}`}
                        >
                            <span className="font-bold">Tutorial / Flexible</span>
                            <span className="text-[10px] text-gray-500">Short programs, Bootcamps</span>
                        </button>
                    </div>
                </div>

                {formData.preset === 'flexible' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="space-y-2">
                            <Label>Program Duration (Weeks)</Label>
                            <Input 
                                type="number" 
                                min={1}
                                max={52}
                                value={formData.weeksPerPeriod}
                                onChange={(e) => setFormData({...formData, weeksPerPeriod: parseInt(e.target.value)})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Number of Modules/Terms</Label>
                            <Input 
                                type="number" 
                                min={1}
                                max={12}
                                value={formData.periodCount}
                                onChange={(e) => setFormData({...formData, periodCount: parseInt(e.target.value)})}
                            />
                        </div>
                    </div>
                )}
                <Button 
                    className="w-full bg-indigo-600 hover:bg-indigo-700 mt-4 h-12"
                    onClick={handleSetupPreset}
                    disabled={settingUp}
                >
                    {settingUp ? <Loader2 className="animate-spin mr-2" /> : <Clock className="mr-2 h-4 w-4" />}
                    Configure Academic Clock
                </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
            {/* Active Year Summary */}
            <Card className="bg-indigo-600 text-white border-none overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Calendar className="h-32 w-32" />
                </div>
                <CardContent className="p-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <Badge className="bg-white/20 text-white border-white/30 mb-4 hover:bg-white/30">Active Session</Badge>
                            <h2 className="text-3xl font-bold">{activeYear.name}</h2>
                            <div className="flex items-center gap-4 mt-2 text-indigo-100 text-sm">
                                <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {safeFormat(activeYear.start_date, 'MMMM yyyy')} - {safeFormat(activeYear.end_date, 'MMMM yyyy')}</span>
                            </div>
                        </div>
                        <Button variant="outline" className="bg-white/10 border-white/30 hover:bg-white/20 text-white">
                            <Settings className="h-4 w-4 mr-2" />
                            Manage Session
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Terms / Periods List */}
            <div className="grid md:grid-cols-3 gap-6">
                {activeYear.periods?.map((period: any, idx: number) => (
                    <Card key={period.id} className="border-slate-200 hover:border-indigo-300 transition-all shadow-sm group">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-sm font-bold text-slate-800">{period.name}</CardTitle>
                                <CardDescription className="text-[10px]">{safeFormat(period.start_date, 'MMM d')} - {safeFormat(period.end_date, 'MMM d, yyyy')}</CardDescription>
                            </div>
                            <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                {idx + 1}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-slate-500">Instructional Weeks</span>
                                    <span className="font-bold text-indigo-600">13 Weeks</span>
                                </div>
                                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-indigo-500 h-full w-1/4 rounded-full"></div>
                                </div>
                                <Button variant="ghost" size="sm" className="w-full text-[10px] hover:bg-indigo-50 hover:text-indigo-600 p-0 h-6">
                                    View Detailed Timeline <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <Card className="border-slate-100 bg-emerald-50/20">
                <CardContent className="p-6 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-900 text-sm">Calendar Integrated</h4>
                        <p className="text-xs text-slate-500">Tutors can now map their curriculum modules to these specific weeks for precise student tracking.</p>
                    </div>
                </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}
