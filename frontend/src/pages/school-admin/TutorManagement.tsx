import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { 
  getTutorsBySchool, 
  createTutor, 
  createTutorsBulk, 
  deleteTutor, 
  hashPassword,
  generatePassword 
} from '@/lib/dataStore';
import { parseCSV, parseExcel, validateTutorCSV, downloadTemplate, type TutorCSVRow } from '@/lib/csvParser';
import { Plus, Upload, Download, Trash2, Users, FileSpreadsheet, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import type { Tutor } from '@/types';

export default function TutorManagement() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [tutors, setTutors] = useState<Tutor[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<TutorCSVRow[]>([]);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);

  // Add tutor form
  const [newTutor, setNewTutor] = useState({
    username: '',
    password: '',
    fullName: '',
    email: '',
    phone: '',
    subjects: '',
  });

  useEffect(() => {
    if (user?.schoolId) {
      loadTutors();
    }
  }, [user]);

  const loadTutors = () => {
    if (user?.schoolId) {
      const schoolTutors = getTutorsBySchool(user.schoolId);
      setTutors(schoolTutors);
    }
  };

  const handleAddTutor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.schoolId) return;

    const tutor = createTutor({
      schoolId: user.schoolId,
      username: newTutor.username,
      password: hashPassword(newTutor.password),
      fullName: newTutor.fullName,
      email: newTutor.email || undefined,
      phone: newTutor.phone || undefined,
      subjects: newTutor.subjects.split(',').map(s => s.trim()).filter(Boolean),
      isActive: true,
    });

    toast.success(`Tutor ${tutor.fullName} added successfully`);
    setNewTutor({
      username: '',
      password: '',
      fullName: '',
      email: '',
      phone: '',
      subjects: '',
    });
    setIsAddDialogOpen(false);
    loadTutors();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      let data: TutorCSVRow[] = [];
      
      if (file.name.endsWith('.csv')) {
        data = await parseCSV<TutorCSVRow>(file);
      } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        data = await parseExcel<TutorCSVRow>(file);
      } else {
        toast.error('Please upload a CSV or Excel file');
        return;
      }

      const validation = validateTutorCSV(data);
      setUploadPreview(validation.data);
      setUploadErrors(validation.errors);
    } catch (error) {
      toast.error('Error parsing file');
      console.error(error);
    }
  };

  const handleBulkUpload = () => {
    if (!user?.schoolId || uploadPreview.length === 0) return;

    const tutorsToCreate = uploadPreview.map(row => ({
      schoolId: user.schoolId!,
      username: row.username,
      password: hashPassword(row.password),
      fullName: row.fullName,
      email: row.email,
      phone: row.phone,
      subjects: row.subjects?.split(',').map(s => s.trim()).filter(Boolean) || [],
      isActive: true,
    }));

    createTutorsBulk(tutorsToCreate);
    toast.success(`${tutorsToCreate.length} tutors added successfully`);
    setIsUploadDialogOpen(false);
    setUploadPreview([]);
    setUploadErrors([]);
    loadTutors();
  };

  const handleDeleteTutor = (tutorId: string, tutorName: string) => {
    if (confirm(`Are you sure you want to delete tutor ${tutorName}?`)) {
      deleteTutor(tutorId);
      toast.success('Tutor deleted successfully');
      loadTutors();
    }
  };

  const generateRandomPassword = () => {
    const password = generatePassword(10);
    setNewTutor(prev => ({ ...prev, password }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutor Management</h1>
          <p className="text-gray-600">Manage tutors who can create and conduct exams</p>
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
                <DialogTitle>Bulk Upload Tutors</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Button 
                    variant="outline" 
                    onClick={() => downloadTemplate('tutors')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls"
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
                      Preview ({uploadPreview.length} tutors):
                    </p>
                    <div className="max-h-64 overflow-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left">Username</th>
                            <th className="px-4 py-2 text-left">Full Name</th>
                            <th className="px-4 py-2 text-left">Email</th>
                            <th className="px-4 py-2 text-left">Subjects</th>
                          </tr>
                        </thead>
                        <tbody>
                          {uploadPreview.map((row, i) => (
                            <tr key={i} className="border-t">
                              <td className="px-4 py-2">{row.username}</td>
                              <td className="px-4 py-2">{row.fullName}</td>
                              <td className="px-4 py-2">{row.email}</td>
                              <td className="px-4 py-2">{row.subjects}</td>
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
                      Upload {uploadPreview.length} Tutors
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
                Add Tutor
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Tutor</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddTutor} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      value={newTutor.username}
                      onChange={(e) => setNewTutor(prev => ({ ...prev, username: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={newTutor.password}
                          onChange={(e) => setNewTutor(prev => ({ ...prev, password: e.target.value }))}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={generateRandomPassword}
                      >
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={newTutor.fullName}
                    onChange={(e) => setNewTutor(prev => ({ ...prev, fullName: e.target.value }))}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newTutor.email}
                      onChange={(e) => setNewTutor(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={newTutor.phone}
                      onChange={(e) => setNewTutor(prev => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subjects">Subjects (comma-separated)</Label>
                  <Input
                    id="subjects"
                    placeholder="Math, Physics, Chemistry"
                    value={newTutor.subjects}
                    onChange={(e) => setNewTutor(prev => ({ ...prev, subjects: e.target.value }))}
                  />
                </div>
                <Button type="submit" className="w-full">
                  Add Tutor
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tutors List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Users className="h-5 w-5 mr-2" />
            All Tutors ({tutors.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tutors.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Username</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Subjects</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {tutors.map((tutor) => (
                    <tr key={tutor.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-700 font-semibold text-sm">
                              {tutor.fullName.charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{tutor.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{tutor.username}</td>
                      <td className="px-4 py-3 text-gray-600">{tutor.email || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {tutor.subjects.map((subject, i) => (
                            <span 
                              key={i} 
                              className="px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full"
                            >
                              {subject}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          tutor.isActive 
                            ? 'bg-emerald-100 text-emerald-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {tutor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTutor(tutor.id, tutor.fullName)}
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
              <p className="text-gray-500">No tutors added yet</p>
              <p className="text-sm text-gray-400 mt-1">
                Add tutors individually or upload in bulk
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
