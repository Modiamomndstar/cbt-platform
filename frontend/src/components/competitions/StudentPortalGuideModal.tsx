import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Key,
  User,
  ExternalLink,
  ShieldCheck,
  ClipboardCheck,
  Trophy
} from 'lucide-react';

interface StudentPortalGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StudentPortalGuideModal({ isOpen, onClose }: StudentPortalGuideModalProps) {
  const portalUrl = `${window.location.origin}/student/login`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px] rounded-[32px] overflow-hidden p-0 border-none shadow-2xl">
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 text-white relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Trophy className="h-24 w-24" />
          </div>
          <DialogHeader className="relative z-10">
            <DialogTitle className="text-3xl font-black tracking-tight">Student Access Guide</DialogTitle>
            <DialogDescription className="text-indigo-100 text-lg">
              How students participate in your registered competitions.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-8">
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                <span className="text-indigo-600 font-bold">1</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 text-indigo-500" />
                  Portal Access
                </h4>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Direct your students to the official login portal:
                </p>
                <code className="block p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-indigo-600 font-mono text-xs mt-2 truncate">
                  {portalUrl}
                </code>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                <span className="text-indigo-600 font-bold">2</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Key className="h-4 w-4 text-indigo-500" />
                  Unique Credentials
                </h4>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Students login using their <strong>Student ID</strong> and the system-generated <strong>Password</strong> provided during their initial registration.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center shrink-0 border border-indigo-100">
                <span className="text-indigo-600 font-bold">3</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <ClipboardCheck className="h-4 w-4 text-indigo-500" />
                  Scheduled Exams
                </h4>
                <p className="text-slate-500 text-sm leading-relaxed">
                  Once logged in, competition exams will appear in their **Dashboard** under the **"Active Exams"** or **"Competitions"** section.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-xs text-emerald-800 font-medium leading-relaxed">
              <strong>SuperAdmin Notice:</strong> Competition integrity protocols (Tab-lock, Fullscreen) are automatically enforced when the exam begins.
            </p>
          </div>
        </div>

        <DialogFooter className="p-8 pt-0">
          <Button
            className="w-full bg-slate-900 hover:bg-black text-white h-12 rounded-xl font-bold transition-all shadow-lg shadow-slate-200"
            onClick={onClose}
          >
            Got it, thanks!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
