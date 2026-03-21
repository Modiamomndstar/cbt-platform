import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { schoolSettingsAPI } from '@/services/api';
import { toast } from 'sonner';
import { Settings, Users, BookOpen, BellRing, Palette, ExternalLink, ToggleLeft, ToggleRight, Save } from 'lucide-react';

interface SchoolSettings {
  allowExternalStudents: boolean;
  maxExternalPerTutor: number;
  allowTutorCreateStudents: boolean;
  allowTutorEditCategories: boolean;
  studentPortalEnabled: boolean;
  resultReleaseMode: 'immediate' | 'manual';
  allowStudentPdfDownload: boolean;
  defaultExamAttempts: number;
  emailOnExamComplete: boolean;
  emailOnNewStudent: boolean;
  emailOnResultsRelease: boolean;
  primaryColor: string;
  reportSignatureTitle: string;
  reportSignatureName: string;
  allowTutorLms: boolean;
  planAllowLms: boolean;
}

function Toggle({ enabled, onChange, label, description }: {
  enabled: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
          enabled ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
        }`}
      >
        {enabled ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
        {enabled ? 'ON' : 'OFF'}
      </button>
    </div>
  );
}

export default function SchoolSettingsPage() {
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await schoolSettingsAPI.get();
      if (res.data.success) { setSettings(res.data.data); setDirty(false); }
    } catch {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const update = (key: keyof SchoolSettings, value: any) => {
    setSettings(prev => prev ? { ...prev, [key]: value } : prev);
    setDirty(true);
  };

  const save = async () => {
    if (!settings || !dirty) return;
    setSaving(true);
    try {
      await schoolSettingsAPI.update(settings);
      toast.success('Settings saved!');
      setDirty(false);
    } catch {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">School Settings</h1>
          <p className="text-gray-500 text-sm mt-1">Configure how your school operates on the platform</p>
        </div>
        <Button
          onClick={save}
          disabled={!dirty || saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Saving...' : dirty ? 'Save Changes' : 'Saved'}
        </Button>
      </div>

      {dirty && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-700 flex items-center gap-2">
          <Settings className="h-4 w-4" />
          You have unsaved changes — click Save Changes to apply them.
        </div>
      )}

      {/* External Students */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-blue-500" />
            External Students
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            External students are personal students that tutors bring from outside the school's main roster.
            They can take exams but do not have access to the student portal.
          </p>
        </CardHeader>
        <CardContent>
          <Toggle
            enabled={settings.allowExternalStudents}
            onChange={(v) => update('allowExternalStudents', v)}
            label="Allow tutors to add external students"
            description="When ON, each tutor can enroll their own external students up to the limit below."
          />
          {settings.allowExternalStudents && (
            <div className="pl-0 pt-3">
              <label className="text-sm font-medium text-gray-700">Max external students per tutor</label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={settings.maxExternalPerTutor}
                  onChange={(e) => update('maxExternalPerTutor', parseInt(e.target.value) || 0)}
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
                />
                <span className="text-sm text-gray-500">students per tutor</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-purple-500" />
            Student Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Toggle
            enabled={settings.allowTutorCreateStudents}
            onChange={(v) => update('allowTutorCreateStudents', v)}
            label="Allow tutors to create internal students"
            description="When OFF, only school admins can create students."
          />
          <Toggle
            enabled={settings.allowTutorEditCategories}
            onChange={(v) => update('allowTutorEditCategories', v)}
            label="Allow tutors to edit school categories"
            description="When ON, tutors can create, edit, or delete central school categories."
          />
          <Toggle
            enabled={settings.studentPortalEnabled}
            onChange={(v) => update('studentPortalEnabled', v)}
            label="Enable student portal"
            description="Allow students to log in and view their results, history, and profile."
          />
          <Toggle
            enabled={settings.allowStudentPdfDownload}
            onChange={(v) => update('allowStudentPdfDownload', v)}
            label="Allow students to download result PDFs"
            description="Students can download their own exam result as a PDF."
          />
          <div className="pt-3 pb-1">
            <label className="text-sm font-medium text-gray-700">Default exam attempts per student</label>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="number"
                min={1}
                max={10}
                value={settings.defaultExamAttempts}
                onChange={(e) => update('defaultExamAttempts', parseInt(e.target.value) || 1)}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
              />
              <span className="text-sm text-gray-500">attempt(s) per exam</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Learning Management */}
      {settings.planAllowLms ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-indigo-500" />
              Learning Management (LMS)
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Control access to courses and AI-powered learning features.
            </p>
          </CardHeader>
          <CardContent>
            <Toggle
              enabled={settings.allowTutorLms}
              onChange={(v) => update('allowTutorLms', v)}
              label="Enable Tutor LMS Access"
              description="Allow tutors to create courses, generate content with AI, and use the learning assistant."
            />
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-50 border-dashed">
          <CardContent className="py-6 flex flex-col items-center text-center">
            <BookOpen className="h-8 w-8 text-gray-400 mb-2" />
            <h3 className="text-sm font-semibold text-gray-900">Learning Management (LMS)</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-xs">
              AI-powered learning features are available on Advanced Premium and Enterprise plans.
            </p>
            <Button variant="outline" size="sm" className="mt-3 text-xs" onClick={() => window.location.href='/school-admin/billing'}>
              Upgrade Plan
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Exam Results */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-green-500" />
            Exam Results
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="pb-3 border-b border-gray-100">
            <label className="text-sm font-medium text-gray-700">Result release mode</label>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">
              When set to "Manual", results are hidden from students until you release them.
            </p>
            <div className="flex gap-3">
              {(['immediate', 'manual'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => { update('resultReleaseMode', mode); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors capitalize ${
                    settings.resultReleaseMode === mode
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BellRing className="h-4 w-4 text-amber-500" />
            Email Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Toggle
            enabled={settings.emailOnNewStudent}
            onChange={(v) => update('emailOnNewStudent', v)}
            label="Welcome email when a new student is created"
            description="Send login credentials to new students automatically."
          />
          <Toggle
            enabled={settings.emailOnExamComplete}
            onChange={(v) => update('emailOnExamComplete', v)}
            label="Email when a student completes an exam"
            description="Notify the school admin when exam submissions come in."
          />
          <Toggle
            enabled={settings.emailOnResultsRelease}
            onChange={(v) => update('emailOnResultsRelease', v)}
            label="Notify students when results are released"
            description="Send students an email when their results become visible."
          />
        </CardContent>
      </Card>

      {/* Branding */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Palette className="h-4 w-4 text-pink-500" />
            Branding
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <label className="text-sm font-medium text-gray-700">Primary colour</label>
            <p className="text-xs text-gray-500 mt-0.5 mb-3">Used for buttons and highlights in your school's portal.</p>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => update('primaryColor', e.target.value)}
                className="h-10 w-16 rounded-lg border border-gray-300 cursor-pointer p-1"
              />
              <span className="text-sm font-mono text-gray-600">{settings.primaryColor}</span>
              <button
                onClick={() => update('primaryColor', '#6366f1')}
                className="text-xs text-indigo-600 hover:underline"
              >
                Reset to default
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Reports */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Save className="h-4 w-4 text-indigo-500" />
            Advanced Report Settings
          </CardTitle>
          <p className="text-xs text-gray-500 mt-1">
            Configure global defaults for the "Advanced Report Card" premium feature.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Default Signature Title</label>
              <input
                type="text"
                placeholder="e.g. School Principal"
                value={settings.reportSignatureTitle || ''}
                onChange={(e) => update('reportSignatureTitle', e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Default Signature Name</label>
              <input
                type="text"
                placeholder="e.g. Dr. John Doe"
                value={settings.reportSignatureName || ''}
                onChange={(e) => update('reportSignatureName', e.target.value)}
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
              />
            </div>
          </div>
          <p className="text-[10px] text-gray-400">
            These will appear by default on all generated Advanced Report Cards but can still be changed per-student.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
