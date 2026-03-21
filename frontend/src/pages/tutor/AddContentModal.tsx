import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Video, BookOpen, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface AddContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: any) => void;
  exams: any[];
}

export default function AddContentModal({ isOpen, onClose, onAdd, exams }: AddContentModalProps) {
  const [contentType, setContentType] = useState<'text' | 'video' | 'exam'>('text');
  const [formData, setFormData] = useState({
    title: '',
    content_data: '',
    video_url: '',
    linked_exam_id: '',
    order_index: 1
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd({
      ...formData,
      content_type: contentType
    });
    // Reset form
    setFormData({
      title: '',
      content_data: '',
      video_url: '',
      linked_exam_id: '',
      order_index: 1
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            Add Course Content
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            {/* Content Type Selector */}
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setContentType('text')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  contentType === 'text' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 hover:border-gray-200 text-gray-400'
                }`}
              >
                <FileText className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-bold uppercase">Text</span>
              </button>
              <button
                type="button"
                onClick={() => setContentType('video')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  contentType === 'video' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 hover:border-gray-200 text-gray-400'
                }`}
              >
                <Video className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-bold uppercase">Video</span>
              </button>
              <button
                type="button"
                onClick={() => setContentType('exam')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${
                  contentType === 'exam' ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-gray-100 hover:border-gray-200 text-gray-400'
                }`}
              >
                <BookOpen className="h-5 w-5 mb-1" />
                <span className="text-[10px] font-bold uppercase">Exam</span>
              </button>
            </div>

            {/* Common: Title */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-gray-500">Lesson Title</Label>
              <Input
                placeholder="e.g. Introduction to Variables"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Type Specific: Text Content */}
            {contentType === 'text' && (
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-gray-500">Lesson Body (Markdown)</Label>
                <Textarea
                  placeholder="Explain the topic here..."
                  className="min-h-[150px] resize-none"
                  value={formData.content_data}
                  onChange={(e) => setFormData({ ...formData, content_data: e.target.value })}
                />
              </div>
            )}

            {/* Type Specific: Video URL */}
            {contentType === 'video' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-gray-500">YouTube URL / Video Link</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="https://youtube.com/watch?v=..."
                      className="pl-10"
                      value={formData.video_url}
                      onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg flex gap-3 text-amber-800 text-xs italic border border-amber-100">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  YouTube videos are automatically embedded for students. Raw files (MP4) will use the native player.
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-gray-500">Extra Notes (Optional)</Label>
                  <Textarea
                    placeholder="Provide a brief summary or context..."
                    className="min-h-[80px]"
                    value={formData.content_data}
                    onChange={(e) => setFormData({ ...formData, content_data: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* Type Specific: Exam Selection */}
            {contentType === 'exam' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-gray-500">Select Exam Assessment</Label>
                  <Select
                    value={formData.linked_exam_id}
                    onValueChange={(val) => setFormData({ ...formData, linked_exam_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select an Exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {exams.map((exam) => (
                        <SelectItem key={exam.id} value={exam.id}>
                          {exam.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[10px] text-gray-500">Students must complete this exam to proceed or gain credit for this lesson.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">Add to Module</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
