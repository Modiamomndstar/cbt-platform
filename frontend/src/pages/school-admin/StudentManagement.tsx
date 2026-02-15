import { useState, useEffect } from 'react';
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
  Upload
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
  student_id: string;
  full_name: string;
  email?: string;
  phone?: string;
  category_id?: string;
  category_name?: string;
  category_color?: string;
  is_active: boolean;
  assigned_tutors?: Array<{ id: string; name: string }>;
}

interface Category {
  id: string;
  name: string;
}

interface Tutor {
  id: string;
  full_name: string;
}

export default function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState<string>('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [assignTutorId, setAssignTutorId] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    studentId: '',
    email: '',
    phone: '',
    categoryId: '',
    password: 'password123' // Default initial password
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

      if (studentsRes.data.success) setStudents(studentsRes.data.data);
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
      await studentAPI.create(formData);
      toast.success("Student created successfully");
      setIsAddOpen(false);
      resetForm();
      loadData(); // Reload to get new student
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create student");
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

  const handleRemoveTutor = async (studentId: string, tutorId: string) => {
    if (!window.confirm("Are you sure you want to remove this tutor assignment?")) return;
    try {
      await studentAPI.removeTutor(studentId, tutorId);
      toast.success("Tutor removed successfully");
      loadData();
    } catch (error: any) {
      toast.error("Failed to remove tutor");
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!window.confirm("Are you sure? This will delete the student and their exam history.")) return;
    try {
      await studentAPI.delete(id);
      toast.success("Student deleted successfully");
      loadData();
    } catch (error: any) {
      toast.error("Failed to delete student");
    }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("Please select a file");
      return;
    }
    setSubmitting(true);
    try {
      await uploadAPI.uploadStudents(bulkFile, bulkCategoryId || undefined);
      toast.success("Students uploaded successfully");
      setIsBulkOpen(false);
      setBulkFile(null);
      setBulkCategoryId('');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to upload students");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fullName: '',
      studentId: '',
      email: '',
      phone: '',
      categoryId: '',
      password: 'password123'
    });
    setSelectedStudent(null);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || student.category_id === categoryFilter;
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
                    <div>
                      <div className="font-medium">{student.full_name}</div>
                      <div className="text-xs text-muted-foreground">ID: {student.student_id}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.category_name ? (
                      <Badge
                        variant="secondary"
                        style={{ backgroundColor: student.category_color + '20', color: student.category_color }}
                      >
                        {student.category_name}
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
                      {student.assigned_tutors && student.assigned_tutors.length > 0 ? (
                        student.assigned_tutors.map(t => (
                          <Badge key={t.id} variant="outline" className="flex gap-1 items-center">
                            {t.name}
                            <button
                              onClick={() => handleRemoveTutor(student.id, t.id)}
                              className="ml-1 hover:text-red-600 rounded-full p-0.5"
                            >
                              <XIcon className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => { setSelectedStudent(student); setIsAssignOpen(true); }}>
                          <UserPlus className="mr-2 h-4 w-4" /> Assign Tutor
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled>
                          <Edit2 className="mr-2 h-4 w-4" /> Edit Details
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
                value={formData.categoryId}
                onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
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
            <DialogTitle>Assign Tutor to {selectedStudent?.full_name}</DialogTitle>
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
    </div>
  );
}

function XIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
