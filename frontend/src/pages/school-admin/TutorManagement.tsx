import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

import { tutorAPI } from '@/services/api';
import { Plus, Trash2, Users, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TutorManagement() {
  const { user } = useAuth();

  const [tutors, setTutors] = useState<any[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);

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
    loadTutors();
  }, [user]);

  const loadTutors = async () => {
    try {
      const response = await tutorAPI.getAll();
      if (response.data.success) {
        setTutors(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load tutors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTutor = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await tutorAPI.create({
        username: newTutor.username,
        password: newTutor.password,
        fullName: newTutor.fullName,
        email: newTutor.email || undefined,
        phone: newTutor.phone || undefined,
        subjects: newTutor.subjects.split(',').map(s => s.trim()).filter(Boolean),
      });

      toast.success(`Tutor ${newTutor.fullName} added successfully`);
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
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to add tutor';
      toast.error(msg);
    }
  };

  const [tutorToDelete, setTutorToDelete] = useState<{ id: string; name: string } | null>(null);

  const confirmDeleteTutor = async () => {
    if (!tutorToDelete) return;
    try {
      await tutorAPI.delete(tutorToDelete.id);
      toast.success('Tutor deleted successfully');
      loadTutors();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Failed to delete tutor';
      toast.error(msg);
    } finally {
      setTutorToDelete(null);
    }
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewTutor(prev => ({ ...prev, password }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tutor Management</h1>
          <p className="text-gray-600">Manage tutors who can create and conduct exams</p>
        </div>
        <div className="flex space-x-2">
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
                  {tutors.map((tutor: any) => (
                    <tr key={tutor.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-700 font-semibold text-sm">
                              {(tutor.full_name || tutor.fullName || '?').charAt(0)}
                            </span>
                          </div>
                          <span className="font-medium text-gray-900">{tutor.full_name || tutor.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{tutor.username}</td>
                      <td className="px-4 py-3 text-gray-600">{tutor.email || '-'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(tutor.subjects || []).map((subject: string, i: number) => (
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
                          tutor.is_active !== false
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {tutor.is_active !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTutorToDelete({ id: tutor.id, name: tutor.full_name || tutor.fullName })}
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

      <AlertDialog open={!!tutorToDelete} onOpenChange={(open) => !open && setTutorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tutor?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete tutor {tutorToDelete?.name}? This action cannot be undone and will remove all their data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTutor} className="bg-red-600 hover:bg-red-700">
              Delete Tutor
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
