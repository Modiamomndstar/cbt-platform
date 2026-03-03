import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlan } from '@/hooks/usePlan';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Loader2,
  UserPlus,
  MoreVertical,
  Upload,
  X,
  Key,
  ShieldAlert,
  Mail,
  Copy,
  CheckCircle2,
  Sparkles,
  FileText
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { studentAPI, categoryAPI, tutorAPI, uploadAPI, API_BASE_URL } from '@/services/api';

interface Student {
  id: string;
  studentId: string;
  fullName: string;
  email?: string;
  phone?: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  isActive: boolean;
  assignedTutors?: Array<{ id: string; name: string; subjects?: string }>;
  username?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Tutor {
  id: string;
  fullName: string;
}

export default function StudentManagement() {
  const navigate = useNavigate();
  const { isFeatureAllowed } = usePlan();
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCredentialsModalOpen, setIsCredentialsModalOpen] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState<{username: string, password?: string} | null>(null);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [bulkSendEmail, setBulkSendEmail] = useState(true);
  const [bulkResults, setBulkResults] = useState<{success: any[], failed: any[]} | null>(null);
  const [isBulkResultOpen, setIsBulkResultOpen] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    description: '',
    onConfirm: () => {}
  });

  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [resetOptions, setResetOptions] = useState<{
    id: string;
    name: string;
    username: string;
    email: string | null;
    sendEmail: boolean;
  }>({ id: '', name: '', username: '', email: null, sendEmail: true });

  const confirmAction = (title: string, description: string, onConfirm: () => void) => {
    setConfirmDialog({ isOpen: true, title, description, onConfirm });
  };

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [assignTutorId, setAssignTutorId] = useState<string>('');

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    categoryId: '',
    password: 'password123',
    sendEmail: true
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [studentsRes, categoriesRes, tutorsRes] = await Promise.all([
        studentAPI.getAll(),
        categoryAPI.getAll(),
        tutorAPI.getAll()
      ]);

      if (studentsRes.data.success) {
        console.log("Fetched students payload:", studentsRes.data.data);
        setStudents(studentsRes.data.data);
      }
      if (categoriesRes.data.success) setCategories(categoriesRes.data.data);
      if (tutorsRes.data.success) setTutors(tutorsRes.data.data);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error("Failed to load students data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await studentAPI.create(formData);
      toast.success("Student created successfully");

      const newStudent = res.data.data;
      if (newStudent.plainTextPassword) {
        setGeneratedCredentials({
          username: newStudent.username,
          password: newStudent.plainTextPassword
        });
        setIsCredentialsModalOpen(true);
      }

      setIsAddOpen(false);
      resetForm();
      loadData(); // Reload to get new student
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setSubmitting(true);
    try {
      await studentAPI.update(selectedStudent.id, formData);
      toast.success("Student updated successfully");
      setIsEditOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update student");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    setSubmitting(true);
    try {
      const res = await studentAPI.resetPassword(resetOptions.id, { sendEmail: resetOptions.sendEmail });
      toast.success("Password reset successfully");
      setGeneratedCredentials({
        username: res.data.data.username || resetOptions.username,
        password: res.data.newPassword
      });
      setIsResetConfirmOpen(false);
      setIsCredentialsModalOpen(true);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to reset password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignTutor = async () => {
    if (!selectedStudent || !assignTutorId) return;
    setSubmitting(true);
    try {
      await studentAPI.assignTutor(selectedStudent.id, assignTutorId);
      toast.success("Tutor assigned successfully");
      setIsAssignOpen(false);
      setAssignTutorId('');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to assign tutor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkAssignTutor = async () => {
    if (!assignTutorId || selectedStudents.length === 0) return;
    setSubmitting(true);
    try {
      await studentAPI.assignTutorsBulk(selectedStudents, assignTutorId);
      toast.success("Tutor assigned to selected students successfully");
      setIsBulkAssignOpen(false);
      setAssignTutorId('');
      setSelectedStudents([]);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to bulk assign tutor");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveTutor = (studentId: string, tutorId: string) => {
    confirmAction(
      "Remove Tutor",
      "Are you sure you want to remove this tutor assignment?",
      async () => {
        try {
          await studentAPI.removeTutor(studentId, tutorId);
          toast.success("Tutor removed successfully");
          loadData();
        } catch (error: any) {
          toast.error("Failed to remove tutor");
        }
      }
    );
  };

  const handleDeleteStudent = (id: string) => {
    confirmAction(
      "Delete Student",
      "Are you sure? This will delete the student and their exam history.",
      async () => {
        try {
          await studentAPI.delete(id);
          toast.success("Student deleted successfully");
          loadData();
        } catch (error: any) {
          toast.error("Failed to delete student");
        }
      }
    );
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("Please select a file");
      return;
    }
    setSubmitting(true);
    try {
      const res = await uploadAPI.uploadStudents(bulkFile, bulkCategoryId || undefined, bulkSendEmail);
      toast.success("Students uploaded successfully");
      setIsBulkOpen(false);
      setBulkFile(null);
      setBulkCategoryId('');
      setBulkSendEmail(true);
      loadData();

      if (res.data?.data) {
        setBulkResults(res.data.data);
        setIsBulkResultOpen(true);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to upload students");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadBulkCredentialsCSV = () => {
    if (!bulkResults?.success?.length) return;
    let csvContent = "data:text/csv;charset=utf-8,Student Name,Student ID,Username,Password\n";
    bulkResults.success.forEach(s => {
      csvContent += `"${s.fullName}","${s.studentId}","${s.username}","${s.generatedPassword || ''}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "bulk_student_credentials.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      studentId: '',
      email: '',
      phone: '',
      categoryId: '',
      password: 'password123',
      sendEmail: true
    });
    setSelectedStudent(null);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      (student.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.studentId || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || student.categoryId === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Student Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student profiles, enrollments, and tutor assignments.
          </p>
        </div>
        <div className="flex gap-2">
          {selectedStudents.length > 0 && (
            <Button variant="secondary" onClick={() => setIsBulkAssignOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Tutor ({selectedStudents.length})
            </Button>
          )}
          <Button variant="outline" onClick={() => setIsBulkOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-white rounded-md border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={filteredStudents.length > 0 && selectedStudents.length === filteredStudents.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedStudents(filteredStudents.map(s => s.id));
                    } else {
                      setSelectedStudents([]);
                    }
                  }}
                />
              </TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Assigned Tutors</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <div className="flex justify-center items-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                    <span>Loading students...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedStudents.includes(student.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedStudents(prev => [...prev, student.id]);
                        } else {
                          setSelectedStudents(prev => prev.filter(id => id !== student.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{student.fullName}</div>
                      <div className="text-xs text-muted-foreground">ID: {student.studentId}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.categoryName ? (
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: student.categoryColor + '20', color: student.categoryColor }}
                      >
                        {student.categoryName}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {student.email && <div>{student.email}</div>}
                      {student.phone && <div className="text-muted-foreground">{student.phone}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {student.assignedTutors && student.assignedTutors.filter(t => t.id).length > 0 ? (
                        student.assignedTutors.filter(t => t.id).map(t => (
                          <Badge key={t.id} variant="outline" className="flex gap-1 items-center">
                            {t.name} {t.subjects && <span className="opacity-70 text-[10px] ml-1 font-normal select-none">({t.subjects})</span>}
                            <button
                              onClick={() => handleRemoveTutor(student.id, t.id)}
                              className="ml-1 hover:text-red-600 rounded-full p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                       {isFeatureAllowed('advanced_analytics') && (
                         <Button
                           variant="ghost"
                           size="sm"
                           className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                           onClick={() => navigate(`/advanced-report/${student.id}`)}
                           title="Advanced Report Card"
                         >
                           <Sparkles className="h-4 w-4" />
                         </Button>
                       )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        {isFeatureAllowed('advanced_analytics') && (
                          <DropdownMenuItem onSelect={() => navigate(`/advanced-report/${student.id}`)}>
                            <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
                            Generate Advanced Report
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => navigate(`/report-card/${student.id}`)}>
                          <FileText className="mr-2 h-4 w-4" />
                          View Standard Report
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { setSelectedStudent(student); setIsAssignOpen(true); }}>
                          <UserPlus className="mr-2 h-4 w-4" /> Assign Tutor
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setSelectedStudent(student);
                          setFormData({
                            fullName: student.fullName,
                            studentId: student.studentId,
                            email: student.email || '',
                            phone: student.phone || '',
                            categoryId: student.categoryId || '',
                            password: '',
                            sendEmail: !!student.email
                          });
                          setIsEditOpen(true);
                        }}>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          setResetOptions({
                            id: student.id,
                            name: student.fullName,
                            username: student.username || student.studentId,
                            email: student.email || null,
                            sendEmail: !!student.email
                          });
                          setIsResetConfirmOpen(true);
                        }}>
                          <Key className="mr-2 h-4 w-4" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => handleDeleteStudent(student.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete Student
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Student Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateStudent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentId">Student ID</Label>
                <Input
                  id="studentId"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category / Class</Label>
              <Select
                value={formData.categoryId || "none"}
                onValueChange={(val) => setFormData({ ...formData, categoryId: val === "none" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-gray-500 italic">No Category</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email (Optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone (Optional)</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-2 pb-2">
              <Checkbox
                id="sendEmail"
                checked={formData.sendEmail}
                onCheckedChange={(checked) => setFormData({ ...formData, sendEmail: checked as boolean })}
              />
              <Label htmlFor="sendEmail" className="text-sm font-normal cursor-pointer">
                Send login credentials to student's email (if provided)
              </Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Student
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Assign Tutor Modal */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tutor to {selectedStudent?.fullName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Tutor</Label>
              <Select value={assignTutorId} onValueChange={setAssignTutorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tutor..." />
                </SelectTrigger>
                <SelectContent>
                  {tutors.map(tutor => (
                    <SelectItem key={tutor.id} value={tutor.id}>{tutor.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              By assigning a tutor, they will be able to view this student's profile, set exams for them, and track their progress.
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleAssignTutor} disabled={!assignTutorId || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Tutor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Tutor Modal */}
      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Tutor to {selectedStudents.length} Students</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Tutor</Label>
              <Select value={assignTutorId} onValueChange={setAssignTutorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a tutor..." />
                </SelectTrigger>
                <SelectContent>
                  {tutors.map(tutor => (
                    <SelectItem key={tutor.id} value={tutor.id}>{tutor.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              By assigning a tutor, they will be able to view these students' profiles, set exams for them, and track their progress.
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsBulkAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAssignTutor} disabled={!assignTutorId || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Tutor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Bulk Upload Modal */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload Students</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
             <div className="bg-blue-50 border border-blue-100 p-4 rounded-md text-sm text-blue-800">
                <p className="font-semibold mb-1">CSV Format Required:</p>
                <p>student_id, full_name, email, phone, level_class</p>
                <a href={`${API_BASE_URL}/uploads/template/students`} download="students_template.csv" target="_blank" rel="noopener noreferrer" className="underline mt-2 inline-block">Download Template</a>
             </div>
             <div className="space-y-2">
                <Label>Select Category (Optional)</Label>
                <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to class..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
             <div className="space-y-2">
                <Label>Upload CSV File</Label>
                <Input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                     const file = e.target.files?.[0];
                     if(file) setBulkFile(file);
                  }}
                />
             </div>

             <div className="flex items-center space-x-2 pt-2">
               <Checkbox
                 id="bulkSendEmail"
                 checked={bulkSendEmail}
                 onCheckedChange={(checked) => setBulkSendEmail(checked as boolean)}
               />
               <Label htmlFor="bulkSendEmail" className="text-sm font-normal cursor-pointer">
                 Automatically email generated login credentials to students with an email
               </Label>
             </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkUpload} disabled={!bulkFile || submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Edit Student Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditStudent} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFullName">Full Name</Label>
                <Input
                  id="editFullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editStudentId">Student ID</Label>
                <Input
                  id="editStudentId"
                  value={formData.studentId}
                  onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="editCategory">Category / Class</Label>
              <Select
                value={formData.categoryId || "none"}
                onValueChange={(val) => setFormData({ ...formData, categoryId: val === "none" ? "" : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none" className="text-gray-500 italic">No Category</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editEmail">Email (Optional)</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editPhone">Phone (Optional)</Label>
                <Input
                  id="editPhone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Confirmation Modal */}
      <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Key className="h-5 w-5 text-indigo-600" />
              Reset Password
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-900">Security Warning</p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Resetting the password for <strong>{resetOptions.name}</strong> will immediately invalidate their current login credentials.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-xs uppercase tracking-wider text-slate-500 font-bold">Notification Options</Label>
              <div className="flex items-start space-x-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                <Checkbox
                  id="resetSendEmail"
                  checked={resetOptions.sendEmail}
                  disabled={!resetOptions.email}
                  onCheckedChange={(checked) => setResetOptions(prev => ({ ...prev, sendEmail: !!checked }))}
                />
                <div className="space-y-1 cursor-pointer" onClick={() => resetOptions.email && setResetOptions(prev => ({ ...prev, sendEmail: !prev.sendEmail }))}>
                  <Label htmlFor="resetSendEmail" className="text-sm font-bold flex items-center gap-2">
                    <Mail className="h-4 w-4 text-slate-400" />
                    Email new credentials
                  </Label>
                  <p className="text-xs text-slate-500">
                    {resetOptions.email
                      ? `Send to ${resetOptions.email}`
                      : "No student email on file. Notification disabled."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsResetConfirmOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 font-bold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Key className="h-4 w-4 mr-2" />}
              Reset Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credentials Modal */}
      <Dialog open={isCredentialsModalOpen} onOpenChange={setIsCredentialsModalOpen}>
        <DialogContent className="sm:max-w-[450px] p-0 overflow-hidden border-none shadow-2xl rounded-[32px]">
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <Key className="h-24 w-24 rotate-12" />
            </div>

            <DialogHeader className="relative z-10 text-left">
              <div className="h-12 w-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/20">
                <CheckCircle2 className="h-6 w-6 text-emerald-400" />
              </div>
              <DialogTitle className="text-2xl font-black tracking-tight">Security Credentials</DialogTitle>
              <p className="text-indigo-200/70 text-sm mt-1">Portal access details updated successfully.</p>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-8 bg-white">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Portal Username</Label>
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                  <span className="font-mono text-lg font-bold text-slate-800">{generatedCredentials?.username}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:shadow-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials?.username || '');
                      toast.success("Username copied");
                    }}
                  >
                    <Copy className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Secure Password</Label>
                <div className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 group">
                  <span className="font-mono text-lg font-bold text-indigo-700">{generatedCredentials?.password}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:shadow-sm"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedCredentials?.password || '');
                      toast.success("Password copied");
                    }}
                  >
                    <Copy className="h-4 w-4 text-indigo-400" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
               <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                  <ShieldAlert className="h-3 w-3 text-amber-500" />
                  Important Instructions
               </div>
               <p className="text-xs text-slate-500 leading-relaxed">
                 Provide these credentials to the student. They should not share them with anyone else.
               </p>
            </div>

            <Button
              className="w-full h-12 bg-slate-900 hover:bg-black text-white font-bold rounded-xl shadow-xl shadow-slate-200 transition-all border-none"
              onClick={() => setIsCredentialsModalOpen(false)}
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Results / Credentials Modal */}
      <Dialog open={isBulkResultOpen} onOpenChange={setIsBulkResultOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Upload Completed</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <p className="text-sm text-foreground">
              {bulkResults?.success.length} students were successfully created and assigned passwords.
            </p>
            {bulkResults?.failed && bulkResults.failed.length > 0 && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                <strong>{bulkResults.failed.length} students failed to upload:</strong>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  {bulkResults.failed.slice(0, 5).map((err, i) => (
                    <li key={i}>{typeof err.record === 'object' ? JSON.stringify(err.record) : err.record} - {err.reason}</li>
                  ))}
                  {bulkResults.failed.length > 5 && <li>... and {bulkResults.failed.length - 5} more</li>}
                </ul>
              </div>
            )}

            {bulkResults?.success && bulkResults.success.length > 0 && (
              <div className="border rounded-md mt-4 overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead>Full Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Password</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkResults.success.slice(0, 10).map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="py-2">{s.fullName}</TableCell>
                        <TableCell className="py-2 font-mono text-xs">{s.username}</TableCell>
                        <TableCell className="py-2 font-mono text-xs">{s.generatedPassword}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {bulkResults.success.length > 10 && (
                  <div className="text-center text-xs text-muted-foreground p-2 border-t bg-muted/30">
                    Showing top 10 rows. Download CSV to see all {bulkResults.success.length} students.
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
             {bulkResults?.success && bulkResults.success.length > 0 && (
               <Button variant="default" onClick={downloadBulkCredentialsCSV} className="mr-auto">
                 Download Excel/CSV
               </Button>
             )}
            <Button onClick={() => setIsBulkResultOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reusable Confirm Dialog */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={(isOpen) => setConfirmDialog(prev => ({ ...prev, isOpen }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setConfirmDialog(prev => ({ ...prev, isOpen: false }));
              confirmDialog.onConfirm();
            }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

