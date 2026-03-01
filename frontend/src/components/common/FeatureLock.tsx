import { Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface FeatureLockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  description?: string;
}

export function FeatureLockedModal({ isOpen, onClose, featureName, description }: FeatureLockedModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-amber-600" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">Unlock {featureName}</DialogTitle>
          <DialogDescription className="text-center pt-2">
            {description || `${featureName} is a premium feature available on our Advanced and Enterprise plans. Upgrade your subscription to gain access to deep performance insights, AI-assisted tools, and more.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2 mt-4">
          <Button
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            onClick={() => {
              onClose();
              navigate('/school-admin/billing');
            }}
          >
            View Pricing & Upgrade
          </Button>
          <Button variant="ghost" onClick={onClose} className="w-full">
            Maybe Later
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function FeatureLockBadge() {
  return (
    <span className="inline-flex items-center ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 border border-amber-200">
      <Lock className="h-2.5 w-2.5 mr-1" />
      PREMIUM
    </span>
  );
}
