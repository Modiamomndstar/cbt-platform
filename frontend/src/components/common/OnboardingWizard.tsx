import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Rocket,
  Palette,
  Users,
  ChevronRight,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEPS = [
  {
    title: "Welcome to CBT Portal",
    description: "Let's set up your institution in 3 simple steps to get you started.",
    icon: <Rocket className="h-10 w-10 text-indigo-600" />,
    color: "bg-indigo-50"
  },
  {
    title: "institution Branding",
    description: "Upload your school logo and set your primary theme colors for a personalized student experience.",
    icon: <Palette className="h-10 w-10 text-emerald-600" />,
    color: "bg-emerald-50",
    action: "/school-admin/settings",
    actionLabel: "Set Branding"
  },
  {
    title: "Scale Early",
    description: "Add your first tutor or use the Marketplace to increase your student capacity beyond the freemium limit.",
    icon: <Users className="h-10 w-10 text-amber-600" />,
    color: "bg-amber-50",
    action: "/school-admin/tutors",
    actionLabel: "Manage Tutors"
  }
];

export default function OnboardingWizard({ isOpen, onClose }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handleAction = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose(); }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden border-0 rounded-[32px] shadow-2xl">
        <div className={`h-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-emerald-500`} />

        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === currentStep ? 'w-8 bg-indigo-600' : 'w-2 bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => { onClose(); }} className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              Skip Guide
            </Button>
          </div>

          <DialogHeader className="space-y-4">
            <div className={`h-20 w-20 ${STEPS[currentStep].color} rounded-3xl flex items-center justify-center mb-2 animate-in zoom-in duration-500`}>
              {STEPS[currentStep].icon}
            </div>
            <DialogTitle className="text-2xl font-black text-gray-900 tracking-tight">
              {STEPS[currentStep].title}
            </DialogTitle>
            <DialogDescription className="text-base text-gray-500 font-medium leading-relaxed">
              {STEPS[currentStep].description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-10 space-y-4">
            {STEPS[currentStep].action && (
              <Button
                onClick={() => handleAction(STEPS[currentStep].action!)}
                className="w-full h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 text-slate-900 hover:bg-slate-100 font-black gap-2"
              >
                <Sparkles className="h-5 w-5 text-amber-500" />
                {STEPS[currentStep].actionLabel}
              </Button>
            )}

            <Button
               onClick={handleNext}
               className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black shadow-lg shadow-indigo-100 gap-2 text-lg"
            >
              {currentStep === STEPS.length - 1 ? "Finish Setup" : "Continue"}
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>

          <div className="mt-6 flex justify-center gap-2">
             <div className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                <CheckCircle2 className="h-3 w-3" /> Secure Configuration
             </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
