import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

import {
  getStudentsByTutor,
  createStudent,
  createStudentsBulk,
  deleteStudent
} from '@/lib/dataStore';
import { parseCSV, validateStudentCSV, downloadTemplate, type StudentCSVRow } from '@/lib/csvParser';
import { Plus, Upload, Download, Trash2, Users, FileSpreadsheet, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { Student } from '@/types';

export default function StudentManagement() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<StudentCSVRow[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  // Add student form
  const [newStudent, setNewStudent] = useState({
    studentId: '',
    fullName: '',
    email: '',
    phone: '',
    level: '',
  });

  useEffect(() => {
    if (user?.tutorId && user?.schoolId) {
      loadStudents();
    }
  }, [user]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = students.filter(student =>
        student.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.level.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchQuery, students]);

  const loadStudents = () => {
    if (user?.tutorId) {
      const tutorStudents = getStudentsByTutor(user.tutorId);
      setStudents(tutorStudents);
      setFilteredStudents(tutorStudents);
    }
  };

  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.tutorId || !user?.schoolId) return;

    const student = createStudent({
      schoolId: user.schoolId,
      tutorId: user.tutorId,
      studentId: newStudent.studentId,
      fullName: newStudent.fullName,
      email: newStudent.email || undefined,
      phone: newStudent.phone || undefined,
      level: newStudent.level,
    });

    toast.success(`Student ${student.fullName} added successfully`);
    setNewStudent({
      studentId: '',
      fullName: '',
      email: '',
      phone: '',
      level: '',
    });
    setIsAddDialogOpen(false);
    loadStudents();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let data: StudentCSVRow[] = [];

      if (file.name.endsWith('.csv')) {
        data = await parseCSV<StudentCSVRow>(file);
      } else {
        toast.error('Please upload a CSV file');
        return;
      }

      const validation = validateStudentCSV(data);
      setUploadPreview(validation.data);
      setUploadErrors(validation.errors);
    } catch (error) {
      toast.error('Error parsing file');
      console.error(error);
    }
  };

  const handleBulkUpload = () => {
    if (!user?.tutorId || !user?.schoolId || uploadPreview.length === 0) return;

    const studentsToCreate = uploadPreview.map(row => ({
      schoolId: user.schoolId!,
      tutorId: user.tutorId!,
      studentId: row.studentId,
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      level: row.level,
    }));

    createStudentsBulk(studentsToCreate);
    toast.success(`${studentsToCreate.length} students added successfully`);
    setIsUploadDialogOpen(false);
    setUploadPreview([]);
    setUploadErrors([]);
    loadStudents();
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    if (confirm(`Are you sure you want to delete student ${studentName}?`)) {
      deleteStudent(studentId);
      toast.success('Student deleted successfully');
      loadStudents();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Management</h1>
          <p className="text-gray-600">Manage students who will take your exams</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Bulk Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Upload Students</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button
                    variant="outline"
                    onClick={() => downloadTemplate('students')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Select File
                  </Button>
                </div>

                {uploadErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertDescription>
                      <p className="font-medium">Validation Errors:</p>
                      <ul className="list-disc list-inside text-sm mt-2 max-h-32 overflow-auto">
                        {uploadErrors.map((error, i) => (
                          <li key={i}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {uploadPreview.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Preview ({uploadPreview.length} students):
                    </p>
                    <div className="max-h-64 overflow-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Student ID</th>
                            <th className="px-4 py-2 text-left">Full Name</th>
                            <th className="px-4 py-2 text-left">Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadPreview.map((row, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-4 py-2">{row.studentId}</td>
                              <td className="px-4 py-2">{row.fullName}</td>
                              <td className="px-4 py-2">{row.level}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={handleBulkUpload}
                      disabled={uploadPreview.length === 0}
                    >
                      Upload {uploadPreview.length} Students
                    </Button>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddStudent} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="studentId">Student ID *</Label>
                    <Input
                      id="studentId"
                      placeholder="e.g., STU001"
                      value={newStudent.studentId}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, studentId: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="level">Level/Class *</Label>
                    <Input
                      id="level"
                      placeholder="e.g., SS2"
                      value={newStudent.level}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, level: e.target.value }))}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    placeholder="Enter student full name"
                    value={newStudent.fullName}
                    onChange={(e) => setNewStudent(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="student@school.edu"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      placeholder="+1234567890"
                      value={newStudent.phone}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Add Student
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search students by name, ID, or level..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Users className="h-5 w-5 mr-2" />
            All Students ({filteredStudents.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Student ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Level</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Phone</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-900">{student.studentId}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                            <span className="text-emerald-700 font-semibold text-sm">
                              {student.fullName.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{student.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full">
                          {student.level}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{student.email || '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{student.phone || '-'}</td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStudent(student.id, student.fullName)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">
                {searchQuery ? 'No students found' : 'No students added yet'}
              </p>
              {!searchQuery && (
                <p className="text-sm text-gray-400 mt-1">
                  Add students individually or upload in bulk
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
