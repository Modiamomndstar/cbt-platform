import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import api from '@/services/api';

interface ExternalStudent {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  username: string;
  is_active: boolean;
  created_at: string;
}

export default function ExternalStudents() {
  const [students, setStudents] = useState<ExternalStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    password: '',
    email: '',
    phone: '',
    isActive: true
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/tutor/external-students');
      setStudents(res.data.data);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error('External students are currently disabled by your school administrator.');
      } else {
        toast.error('Failed to load external students');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingId(null);
    setFormData({ fullName: '', username: '', password: '', email: '', phone: '', isActive: true });
  };

  const handleEdit = (student: ExternalStudent) => {
    setIsCreating(false);
    setEditingId(student.id);
    setFormData({
      fullName: student.full_name,
      username: student.username,
      password: '', // blank intentionally
      email: student.email || '',
      phone: student.phone || '',
      isActive: student.is_active
    });
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isCreating) {
        if (!formData.password) {
          toast.error("Password is required for new accounts");
          return;
        }
        const res = await api.post('/tutor/external-students', formData);
        setStudents([res.data.data, ...students]);
        toast.success("Private student added successfully.");
        setIsCreating(false);
      } else if (editingId) {
        const payload: any = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          isActive: formData.isActive
        };
        if (formData.password) payload.password = formData.password;

        const res = await api.patch(`/tutor/external-students/${editingId}`, payload);
        setStudents(students.map(s => s.id === editingId ? res.data.data : s));
        toast.success("Student updated successfully.");
        setEditingId(null);
      }
    } catch (error: any) {
      if (error.response?.data?.code === 'PLAN_LIMIT_EXCEEDED') {
        toast.error(error.response.data.message || 'Plan limit exceeded.');
      } else {
        toast.error(error.response?.data?.message || 'Action failed.');
      }
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you absolutely sure you want to permanently delete ${name}? All their exam results will be lost.`)) return;
    try {
      await api.delete(`/tutor/external-students/${id}`);
      setStudents(students.filter(s => s.id !== id));
      toast.success("Student deleted permanently.");
    } catch (error) {
      toast.error('Failed to delete student.');
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading your private students...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Private Students</h1>
          <p className="text-gray-500 mt-1">Manage your independent students separate from the main school directory.</p>
        </div>
        <Button onClick={handleCreateNew} disabled={isCreating || !!editingId} className="bg-indigo-600 hover:bg-indigo-700">
          <UserPlus className="w-4 h-4 mr-2" /> Add Private Student
        </Button>
      </div>

      {(isCreating || editingId) && (
        <Card className="border-indigo-100 shadow-md">
          <CardHeader className="bg-indigo-50/50">
            <CardTitle>{isCreating ? 'Add New Private Student' : 'Edit Student Details'}</CardTitle>
            <CardDescription>
              These students will be assigned to your account directly.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Username <span className="text-red-500">*</span></Label>
                <Input required disabled={!!editingId} value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                {editingId && <p className="text-xs text-gray-400">Username cannot be changed</p>}
              </div>

              <div className="space-y-2">
                <Label>Email <span className="text-gray-400">(Optional)</span></Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone <span className="text-gray-400">(Optional)</span></Label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>

              <div className="space-y-2">
                <Label>Password {isCreating && <span className="text-red-500">*</span>}</Label>
                <div className="relative">
                  <Input
                    required={isCreating}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={editingId ? 'Leave blank to keep current password' : ''}
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
                    {showPassword ? <EyeOff className="w-4 h-4"/> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {editingId && (
                <div className="space-y-2 flex flex-col justify-center">
                  <Label>Account Status</Label>
                  <div className="flex items-center space-x-2 mt-2">
                    <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500" />
                    <span className="text-sm font-medium text-gray-700">Account is Active</span>
                  </div>
                </div>
              )}

              <div className="md:col-span-2 flex justify-end space-x-4 pt-4 border-t">
                <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                  {isCreating ? 'Create Student' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">Student Details</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b bg-white hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{student.full_name}</div>
                    <div className="text-xs text-indigo-600 font-medium">@{student.username}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{student.email || '—'}</div>
                    <div className="text-xs text-gray-500">{student.phone || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    {student.is_active ?
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-none">Active</Badge> :
                      <Badge variant="secondary" className="bg-red-100 text-red-700 border-none">Suspended</Badge>
                    }
                  </td>
                  <td className="px-6 py-4">
                    {new Date(student.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(student)}>
                        <Pencil className="w-4 h-4 text-indigo-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(student.id, student.full_name)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <UserPlus className="w-8 h-8 text-gray-400" />
                      </div>
                      <p className="text-lg font-medium text-gray-900">No Private Students Yet</p>
                      <p className="text-sm mt-1">Add your first private student to start assigning exams.</p>
                      <Button onClick={handleCreateNew} className="mt-4" variant="outline">Create Initial Profile</Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
