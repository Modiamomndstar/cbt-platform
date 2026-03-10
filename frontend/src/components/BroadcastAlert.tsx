import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";
import { messagesAPI } from "@/services/api";
import { formatDate } from '@/lib/dateUtils';

export function BroadcastAlert() {
  const [broadcast, setBroadcast] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchLatestBroadcast = async () => {
      try {
        const res = await messagesAPI.getLatestBroadcast();
        if (res.data.success && res.data.data) {
          setBroadcast(res.data.data);
          setIsOpen(true);
        }
      } catch (error) {
        console.error("Failed to fetch broadcast alert:", error);
      }
    };

    fetchLatestBroadcast();
  }, []);

  const handleClose = async () => {
    if (broadcast) {
      try {
        await messagesAPI.markBroadcastAsViewed(broadcast.id);
      } catch (error) {
        console.error("Failed to mark broadcast as viewed:", error);
      }
    }
    setIsOpen(false);
  };

  if (!broadcast) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
              <Megaphone className="h-5 w-5" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
              New Announcement
            </span>
          </div>
          <DialogTitle className="text-xl font-bold">{broadcast.title}</DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            {broadcast.created_at ? (
              `Posted on ${formatDate(broadcast.created_at, { year: 'numeric', month: 'long', day: 'numeric' })}`
            ) : (
              'New Announcement'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 max-h-[40vh] overflow-y-auto">
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {broadcast.content}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose} className="w-full sm:w-auto">
            Got it, thanks!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
