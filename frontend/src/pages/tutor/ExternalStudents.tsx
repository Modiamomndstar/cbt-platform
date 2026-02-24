import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Pencil, Trash2, Eye, EyeOff, Upload, FolderOpen, Download } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api, { uploadAPI } from '@/services/api';

interface ExternalStudent {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  username: string;
  is_active: boolean;
  created_at: string;
  category_id?: string;
  category_name?: string;
  category_color?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
}

export default function ExternalStudents() {
  const [students, setStudents] = useState<ExternalStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#4F46E5');
  const [categoryDesc, setCategoryDesc] = useState('');

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    categoryId: 'none',
    isActive: true
  });

  useEffect(() => {
    fetchStudents();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/tutor/external-students/categories');
      setCategories(res.data.data);
    } catch (e) {}
  };

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
    setFormData({ fullName: '', email: '', phone: '', categoryId: 'none', isActive: true });
  };

  const handleEdit = (student: ExternalStudent) => {
    setIsCreating(false);
    setEditingId(student.id);
    setFormData({
      fullName: student.full_name,
      email: student.email || '',
      phone: student.phone || '',
      categoryId: student.category_id || 'none',
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
      const payload: any = { ...formData };
      if (payload.categoryId === 'none') {
         delete payload.categoryId;
         payload.categoryId = null; // explicit null updates db to null
      }

      if (isCreating) {
        const res = await api.post('/tutor/external-students', payload);
        setStudents([res.data.data, ...students]);
        toast.success("External student added successfully.");
        setIsCreating(false);
      } else if (editingId) {
        const updatePayload: any = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          isActive: formData.isActive,
          categoryId: payload.categoryId
        };

        const res = await api.patch(`/tutor/external-students/${editingId}`, updatePayload);
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

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? Ext. Students in this category will become uncategorized.`)) return;
    try {
      await api.delete(`/tutor/external-students/categories/${id}`);
      setCategories(categories.filter(c => c.id !== id));
      toast.success('Category deleted');
      fetchStudents(); // Refresh to clear the category marks
    } catch (e) { toast.error('Failed to delete category'); }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return;
    try {
      const res = await api.post('/tutor/external-students/categories', { name: categoryName, color: categoryColor, description: categoryDesc });
      setCategories([...categories, res.data.data]);
      setCategoryName(''); setCategoryDesc(''); setCategoryColor('#4F46E5');
      toast.success('Category created');
    } catch (error: any) { toast.error(error.response?.data?.message || 'Failed to create category'); }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) {
      toast.error("Please select a file");
      return;
    }
    try {
      toast.loading('Uploading students...');
      await externalStudentAPI.upload(bulkFile, bulkCategoryId === 'none' ? undefined : bulkCategoryId);
      // Wait a sec for triggers/data then reload
      setTimeout(fetchStudents, 500);
      toast.dismiss();
      toast.success("External Students uploaded successfully");
      setIsBulkOpen(false);
      setBulkFile(null);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.response?.data?.message || "Failed to upload students");
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading your external students...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">External Students</h1>
          <p className="text-gray-500 mt-1">Manage your independent students separate from the main school directory.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
            <FolderOpen className="w-4 h-4 mr-2" /> Categories
          </Button>
          <Button variant="outline" onClick={() => setIsBulkOpen(true)}>
            <Upload className="w-4 h-4 mr-2" /> Bulk Add
          </Button>
          <Button onClick={handleCreateNew} disabled={isCreating || !!editingId} className="bg-indigo-600 hover:bg-indigo-700">
            <UserPlus className="w-4 h-4 mr-2" /> Add Student
          </Button>
        </div>
      </div>

      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>External Student Categories</DialogTitle>
            <DialogDescription>Group your external students to efficiently assign exams to cohorts.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-muted p-4 rounded-md">
              <form onSubmit={handleCreateCategory} className="space-y-3">
                <div className="flex gap-2">
                  <Input placeholder="Category Name" value={categoryName} onChange={e => setCategoryName(e.target.value)} required/>
                  <Input type="color" value={categoryColor} onChange={e => setCategoryColor(e.target.value)} className="w-14 px-1" title="Badge Color"/>
                </div>
                <Input placeholder="Description (optional)" value={categoryDesc} onChange={e => setCategoryDesc(e.target.value)} />
                <Button type="submit" className="w-full" size="sm">Create Category</Button>
              </form>
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex justify-between items-center border p-3 rounded-md">
                   <div>
                     <Badge style={{ backgroundColor: cat.color }}>{cat.name}</Badge>
                     <p className="text-xs text-muted-foreground mt-1">{cat.description}</p>
                   </div>
                   <Button variant="ghost" size="sm" onClick={() => handleDeleteCategory(cat.id, cat.name)}><Trash2 className="w-4 h-4 text-red-500"/></Button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-sm text-center text-muted-foreground">No categories yet.</p>}
            </div>
          </div>
          <DialogFooter><Button onClick={() => setIsCategoryModalOpen(false)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload External Students</DialogTitle>
            <DialogDescription>Upload a CSV file containing columns: Registration Number, Full Name, Category ID, Email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <Download className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="text-sm text-gray-600">Need the correct format?</span>
              <button
                type="button"
                onClick={() => {
                  const csv = 'Registration Number,Full Name,Email\nSTU001,John Doe,john@example.com\nSTU002,Jane Smith,jane@example.com';
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'external_students_template.csv';
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline"
              >
                Download CSV Template
              </button>
            </div>
            <div className="space-y-2">
              <Label>Assign Category (Optional)</Label>
              <Select value={bulkCategoryId} onValueChange={setBulkCategoryId}>
                <SelectTrigger><SelectValue placeholder="No Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Category</SelectItem>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>CSV File *</Label>
              <Input type="file" accept=".csv" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkUpload}>Upload Students</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {(isCreating || editingId) && (
        <Card className="border-indigo-100 shadow-md">
          <CardHeader className="bg-indigo-50/50">
            <CardTitle>{isCreating ? 'Add New External Student' : 'Edit Student Details'}</CardTitle>
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
                <Label>Category</Label>
                <Select value={formData.categoryId} onValueChange={(val) => setFormData({...formData, categoryId: val})}>
                  <SelectTrigger><SelectValue placeholder="No Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Email <span className="text-gray-400">(Optional)</span></Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Phone <span className="text-gray-400">(Optional)</span></Label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
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
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-indigo-600 font-medium">@{student.username}</span>
                      {student.category_name && (
                         <Badge style={{ backgroundColor: student.category_color || '#4F46E5', color: 'white' }} className="text-[10px] h-4 px-1 pb-0 shadow-sm border-none leading-none items-center">{student.category_name}</Badge>
                      )}
                    </div>
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
                      <p className="text-lg font-medium text-gray-900">No External Students Yet</p>
                      <p className="text-sm mt-1">Add your first external student to start assigning exams.</p>
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
