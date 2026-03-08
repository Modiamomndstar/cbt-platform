import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UserPlus, Pencil, Trash2, Upload, FolderOpen, Download, FileText, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import api, { API_BASE_URL } from '@/services/api';
import { formatDate } from '@/lib/dateUtils';

interface ExternalStudent {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  username: string;
  isActive: boolean;
  createdAt: string;
  categoryId?: string;
  categoryName?: string;
  categoryColor?: string;
  levelClass?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  color: string;
}

export default function ExternalStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<ExternalStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#4F46E5');
  const [categoryDesc, setCategoryDesc] = useState('');

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkCategoryId, setBulkCategoryId] = useState('');
  const [sendBulkEmail, setSendBulkEmail] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    levelClass: '',
    categoryId: 'none',
    isActive: true,
    sendEmail: true
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
    setIsFormOpen(true);
    setIsCreating(true);
    setEditingId(null);
    setFormData({ fullName: '', email: '', phone: '', levelClass: '', categoryId: 'none', isActive: true, sendEmail: true });
  };

  const handleEdit = (student: ExternalStudent) => {
    setIsFormOpen(true);
    setIsCreating(false);
    setEditingId(student.id);
    setFormData({
      fullName: student.fullName,
      email: student.email || '',
      phone: student.phone || '',
      levelClass: student.levelClass || '',
      categoryId: student.categoryId || 'none',
      isActive: student.isActive,
      sendEmail: false
    });
  };

  const handleCancel = () => {
    setIsFormOpen(false);
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
        setIsFormOpen(false);
        setIsCreating(false);
      } else if (editingId) {
        const updatePayload: any = {
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          levelClass: formData.levelClass,
          isActive: formData.isActive,
          categoryId: payload.categoryId,
          sendEmail: formData.sendEmail
        };

        const res = await api.patch(`/tutor/external-students/${editingId}`, updatePayload);
        setStudents(students.map(s => s.id === editingId ? res.data.data : s));
        toast.success("Student updated successfully.");
        setIsFormOpen(false);
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
      const formDataUpload = new FormData();
      formDataUpload.append('file', bulkFile);
      if (bulkCategoryId && bulkCategoryId !== 'none') formDataUpload.append('categoryId', bulkCategoryId);
      formDataUpload.append('sendEmail', String(sendBulkEmail));

      await api.post('/uploads/external-students', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
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
           <Button onClick={handleCreateNew} className="bg-indigo-600 hover:bg-indigo-700">
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
            <DialogDescription>Upload a CSV file containing columns: full_name, email, phone, level_class.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
              <Download className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="text-sm text-gray-600">Need the correct format?</span>
              <a
                href={`${API_BASE_URL}/uploads/template/external-students`}
                download="external_students_template.csv"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 underline"
              >
                Download CSV Template
              </a>
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
            <div className="flex items-center space-x-2 p-3 bg-indigo-50 rounded-lg">
              <input
                type="checkbox"
                id="sendBulkEmail"
                checked={sendBulkEmail}
                onChange={e => setSendBulkEmail(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <Label htmlFor="sendBulkEmail" className="text-sm font-medium text-indigo-700 cursor-pointer">
                Send Welcome Email with Portal Credentials (PAYG Credits)
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkUpload}>Upload Students</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

       <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isCreating ? 'Add New External Student' : 'Edit Student Details'}</DialogTitle>
            <DialogDescription>
              {isCreating ? 'Provide details for the new independent student.' : 'Update information for this independent student.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name <span className="text-red-500">*</span></Label>
                <Input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} placeholder="e.g. John Doe" />
              </div>
              <div className="space-y-2">
                <Label>Level / Class <span className="text-gray-400 text-xs">(Optional)</span></Label>
                <Input value={formData.levelClass} onChange={e => setFormData({...formData, levelClass: e.target.value})} placeholder="e.g. Grade 10" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email <span className="text-gray-400 text-xs">(Optional)</span></Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="john@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Phone <span className="text-gray-400 text-xs">(Optional)</span></Label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+234..." />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category / Cohort</Label>
                <Select value={formData.categoryId} onValueChange={(val) => setFormData({...formData, categoryId: val})}>
                  <SelectTrigger><SelectValue placeholder="No Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Category</SelectItem>
                    {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex flex-col space-y-2 justify-center h-10">
                  {isCreating && (
                    <div className="flex items-center space-x-2 text-indigo-700">
                      <input
                        type="checkbox"
                        id="sendEmail"
                        checked={formData.sendEmail}
                        onChange={e => setFormData({...formData, sendEmail: e.target.checked})}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                      />
                      <Label htmlFor="sendEmail" className="text-sm font-medium cursor-pointer">
                        Send Welcome Email (PAYG)
                      </Label>
                    </div>
                  )}
                  {editingId && (
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={e => setFormData({...formData, isActive: e.target.checked})}
                        className="rounded border-gray-300 text-indigo-600 shadow-sm focus:ring-indigo-500"
                      />
                      <Label htmlFor="isActive" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Account Active
                      </Label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700">
                {isCreating ? 'Create Student' : 'Update Student'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-4">Student Details</th>
                <th className="px-6 py-4">Level / Class</th>
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
                    <div className="font-medium text-gray-900">{student.fullName}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-indigo-600 font-medium">@{student.username}</span>
                      {student.categoryName && (
                         <Badge style={{ backgroundColor: student.categoryColor || '#4F46E5', color: 'white' }} className="text-[10px] h-4 px-1 pb-0 shadow-sm border-none leading-none items-center">{student.categoryName}</Badge>
                      )}
                    </div>
                  </td>
                   <td className="px-6 py-4">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {student.levelClass || 'General'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-gray-900">{student.email || '—'}</div>
                    <div className="text-xs text-gray-500">{student.phone || '—'}</div>
                  </td>
                  <td className="px-6 py-4">
                    {student.isActive ?
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-none">Active</Badge> :
                      <Badge variant="secondary" className="bg-red-100 text-red-700 border-none">Suspended</Badge>
                    }
                  </td>
                  <td className="px-6 py-4">
                    {formatDate(student.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                        onClick={() => navigate(`/advanced-report/${student.id}`)}
                        title="Generate Advanced Report"
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 hover:text-gray-900"
                        onClick={() => navigate(`/report-card/${student.id}`)}
                        title="View Standard Report"
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(student)}>
                        <Pencil className="w-4 h-4 text-indigo-600" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(student.id, student.fullName)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
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
