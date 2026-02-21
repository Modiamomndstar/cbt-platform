import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { schoolSettingsAPI } from '@/services/api';
import { toast } from 'sonner';
import { Settings, Users, BookOpen, BellRing, Palette, ExternalLink, ToggleLeft, ToggleRight, Save } from 'lucide-react';

interface SchoolSettings {
  allow_external_students: boolean;
  max_external_per_tutor: number;
  allow_tutor_create_students: boolean;
  student_portal_enabled: boolean;
  result_release_mode: 'immediate' | 'manual';
  allow_student_pdf_download: boolean;
  default_exam_attempts: number;
  email_on_exam_complete: boolean;
  email_on_new_student: boolean;
  email_on_results_release: boolean;
  primary_color: string;
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
      await schoolSettingsAPI.update({
        allowExternalStudents: settings.allow_external_students,
        maxExternalPerTutor: settings.max_external_per_tutor,
        allowTutorCreateStudents: settings.allow_tutor_create_students,
        studentPortalEnabled: settings.student_portal_enabled,
        resultReleaseMode: settings.result_release_mode,
        allowStudentPdfDownload: settings.allow_student_pdf_download,
        defaultExamAttempts: settings.default_exam_attempts,
        emailOnExamComplete: settings.email_on_exam_complete,
        emailOnNewStudent: settings.email_on_new_student,
        emailOnResultsRelease: settings.email_on_results_release,
        primaryColor: settings.primary_color,
      });
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
            enabled={settings.allow_external_students}
            onChange={(v) => update('allow_external_students', v)}
            label="Allow tutors to add external students"
            description="When ON, each tutor can enroll their own external students up to the limit below."
          />
          {settings.allow_external_students && (
            <div className="pl-0 pt-3">
              <label className="text-sm font-medium text-gray-700">Max external students per tutor</label>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={settings.max_external_per_tutor}
                  onChange={(e) => update('max_external_per_tutor', parseInt(e.target.value) || 0)}
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
            enabled={settings.allow_tutor_create_students}
            onChange={(v) => update('allow_tutor_create_students', v)}
            label="Allow tutors to create internal students"
            description="When OFF, only school admins can create students."
          />
          <Toggle
            enabled={settings.student_portal_enabled}
            onChange={(v) => update('student_portal_enabled', v)}
            label="Enable student portal"
            description="Allow students to log in and view their results, history, and profile."
          />
          <Toggle
            enabled={settings.allow_student_pdf_download}
            onChange={(v) => update('allow_student_pdf_download', v)}
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
                value={settings.default_exam_attempts}
                onChange={(e) => update('default_exam_attempts', parseInt(e.target.value) || 1)}
                className="w-20 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-300 outline-none"
              />
              <span className="text-sm text-gray-500">attempt(s) per exam</span>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  onClick={() => { update('result_release_mode', mode); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border-2 transition-colors capitalize ${
                    settings.result_release_mode === mode
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
            enabled={settings.email_on_new_student}
            onChange={(v) => update('email_on_new_student', v)}
            label="Welcome email when a new student is created"
            description="Send login credentials to new students automatically."
          />
          <Toggle
            enabled={settings.email_on_exam_complete}
            onChange={(v) => update('email_on_exam_complete', v)}
            label="Email when a student completes an exam"
            description="Notify the school admin when exam submissions come in."
          />
          <Toggle
            enabled={settings.email_on_results_release}
            onChange={(v) => update('email_on_results_release', v)}
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
                value={settings.primary_color}
                onChange={(e) => update('primary_color', e.target.value)}
                className="h-10 w-16 rounded-lg border border-gray-300 cursor-pointer p-1"
              />
              <span className="text-sm font-mono text-gray-600">{settings.primary_color}</span>
              <button
                onClick={() => update('primary_color', '#6366f1')}
                className="text-xs text-indigo-600 hover:underline"
              >
                Reset to default
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
