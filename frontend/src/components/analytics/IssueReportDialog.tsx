import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Loader2 } from 'lucide-react';

interface IssueReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (title: string) => Promise<void>;
  isSubmitting: boolean;
}

export function IssueReportDialog({ isOpen, onClose, onConfirm, isSubmitting }: IssueReportDialogProps) {
  const [title, setTitle] = useState('Official Academic Report');

  const handleConfirm = async () => {
    if (!title.trim()) return;
    await onConfirm(title);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
            Issue to Portal
          </DialogTitle>
          <DialogDescription>
            Give this report a title. The student will see this title in their portal.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Report Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Term 1 Performance Report"
              className="col-span-3"
              disabled={isSubmitting}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isSubmitting || !title.trim()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm & Issue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
