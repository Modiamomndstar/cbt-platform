import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Search, Loader2, UserCheck, AlertCircle } from 'lucide-react';
import { studentAPI, competitionAPI } from '@/services/api';
import { toast } from 'sonner';

interface StudentRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  competitionId: string;
  competitionTitle: string;
  category: {
    id: string;
    name: string;
    min_age?: number;
    max_age?: number;
    min_grade?: string;
    max_grade?: string;
  } | null;
  onSuccess: () => void;
}

export default function StudentRegistrationModal({
  isOpen,
  onClose,
  competitionId,
  competitionTitle,
  category,
  onSuccess
}: StudentRegistrationModalProps) {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && category) {
      loadStudents();
    }
  }, [isOpen, category]);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const res = await studentAPI.getAll();
      if (res.data.success) {
        // In a real app, we'd filter by age/grade here if those fields existed
        // For now, we show all students
        setStudents(res.data.data);
      }
    } catch (error) {
      toast.error("Failed to load students");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!category || selectedIds.length === 0) return;

    try {
      setSubmitting(true);
      await competitionAPI.register(competitionId, {
        categoryId: category.id,
        studentIds: selectedIds
      });
      toast.success(`Successfully registered ${selectedIds.length} students`);
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to register students");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredStudents = students.filter(s =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Register Representatives</DialogTitle>
          <DialogDescription>
            Select students to represent your school in the <strong>{category?.name}</strong> category of {competitionTitle}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search students by name or ID..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-2 items-start text-xs text-amber-800">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Only students meeting the eligibility criteria (Age/Grade) will be accepted by the system.
              Please ensure your student records are up to date.
            </p>
          </div>

          <div className="border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-2" />
                <p className="text-sm text-slate-500">Loading student roster...</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 italic">
                No students found matching your search.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b sticky top-0 z-10">
                  <tr>
                    <th className="w-10 p-3 text-left">
                      <Checkbox
                        checked={selectedIds.length === filteredStudents.length && filteredStudents.length > 0}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedIds(filteredStudents.map(s => s.id));
                          else setSelectedIds([]);
                        }}
                      />
                    </th>
                    <th className="p-3 text-left font-semibold text-slate-600">Student Name</th>
                    <th className="p-3 text-left font-semibold text-slate-600">ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3">
                        <Checkbox
                          checked={selectedIds.includes(student.id)}
                          onCheckedChange={(checked) => {
                            if (checked) setSelectedIds(prev => [...prev, student.id]);
                            else setSelectedIds(prev => prev.filter(id => id !== student.id));
                          }}
                        />
                      </td>
                      <td className="p-3 font-medium text-slate-900">{student.full_name}</td>
                      <td className="p-3 text-slate-500 uppercase">{student.student_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between">
          <div className="text-sm font-medium text-slate-600">
            {selectedIds.length} {selectedIds.length === 1 ? 'student' : 'students'} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
            <Button
               className="bg-indigo-600 hover:bg-indigo-700 gap-2"
               disabled={selectedIds.length === 0 || submitting}
               onClick={handleRegister}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
              Complete Registration
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
