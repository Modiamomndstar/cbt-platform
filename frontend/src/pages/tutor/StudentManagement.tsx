import { useState, useEffect } from 'react';
import { usePlan } from '@/hooks/usePlan';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { tutorAPI, categoryAPI, externalStudentAPI } from '@/services/api';
import { Users, Search, Loader2, Mail, Phone, FileText, Sparkles } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function StudentManagement() {
  const { user } = useAuth();
  const { isFeatureAllowed } = usePlan();
  const [internalStudents, setInternalStudents] = useState<any[]>([]);
  const [externalStudents, setExternalStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Categories
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'internal' | 'external'>('internal');

  // Bulk Actions
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user]);

  useEffect(() => {
    // If category changes, reload students with filter
    if (user?.id) {
       loadStudents();
    }
  }, [selectedCategory, searchQuery, selectedType]); // Reload when filter changes

  // Optimize: Debounce search or just filter client-side if list is small.
  // For now, let's filter client-side if we fetch all assigned students,
  // OR fetch from server. The API supports params.
  // The backend `getStudents` supports `categoryId` query param.

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadStudents(), loadCategories()]);
    setLoading(false);
  };

  const loadStudents = async () => {
    try {
      const params: any = {};
      if (selectedCategory && selectedCategory !== 'all') {
        params.categoryId = selectedCategory;
      }

      const [internalRes, externalRes] = await Promise.all([
        tutorAPI.getStudents(user?.id || '', params),
        externalStudentAPI.getAll() // external students might not support category filtering in backend same way yet
      ]);

      if (internalRes.data.success) {
        let iData = internalRes.data.data || [];
        if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          iData = iData.filter((s: any) =>
            (s.full_name || '').toLowerCase().includes(lowerQ) ||
            (s.student_id || '').toLowerCase().includes(lowerQ)
          );
        }
        setInternalStudents(iData);
      }

      if (externalRes.data.success) {
        let eData = externalRes.data.data || [];
        if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          eData = eData.filter((s: any) =>
            (s.full_name || '').toLowerCase().includes(lowerQ) ||
            (s.username || '').toLowerCase().includes(lowerQ) ||
            (s.email || '').toLowerCase().includes(lowerQ)
          );
        }
        // Filter by category if needed
        if (selectedCategory && selectedCategory !== 'all') {
            if (selectedCategory === 'uncategorized') {
                eData = eData.filter((s: any) => !s.category_id);
            } else {
                eData = eData.filter((s: any) => s.category_id === selectedCategory);
            }
        }
        setExternalStudents(eData);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const loadCategories = async () => {
    try {
      // Fetch all school categories (so tutors can assign students to any valid category)
      const response = await categoryAPI.getAll();
      if (response.data.success) {
        setCategories(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const activeStudents = selectedType === 'internal' ? internalStudents : externalStudents;

  const toggleSelectAll = () => {
    if (selectedStudents.size === activeStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(activeStudents.map(s => s.id)));
    }
  };

  const toggleSelectStudent = (id: string) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudents(newSelected);
  };

  const handleBulkAssign = async () => {
    if (!targetCategory) {
      toast.error('Please select a category');
      return;
    }

    setAssigning(true);
    try {
      await categoryAPI.addStudents(targetCategory, Array.from(selectedStudents));
      toast.success(`Assigned ${selectedStudents.size} students to category`);
      setIsAssignOpen(false);
      setSelectedStudents(new Set());
      setTargetCategory('');
      loadData(); // Reload to reflect changes
    } catch (err) {
      console.error('Failed to assign category:', err);
      toast.error('Failed to assign category');
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
          <p className="text-gray-600">View and manage students assigned to you.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="w-full md:w-64">
           <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="uncategorized">Uncategorized</SelectItem>
              {categories.map((cat: any) => (
                <SelectItem key={cat.id || cat.category_id} value={cat.id || cat.category_id}>
                  {cat.name || cat.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {selectedStudents.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-900">{selectedStudents.size} selected</span>
            <Button variant="outline" size="sm" onClick={() => setSelectedStudents(new Set())} className="text-xs h-7 border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-100">
              Clear
            </Button>
          </div>
          <Button size="sm" onClick={() => setIsAssignOpen(true)}>
             Assign Category
          </Button>
        </div>
      )}

      {/* Student Type Filters */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${
            selectedType === 'internal'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => {
            setSelectedType('internal');
            setSelectedStudents(new Set());
          }}
        >
          Internal Students
        </button>
        <button
          className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${
            selectedType === 'external'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => {
            setSelectedType('external');
            setSelectedStudents(new Set());
          }}
        >
          Independent / External
        </button>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>{selectedType === 'internal' ? 'Assigned Students' : 'Independent Students'}</span>
              <Badge variant="secondary" className="ml-2">
                {activeStudents.length}
              </Badge>
            </div>
            {(searchQuery || selectedCategory !== 'all') && (
              <button
                onClick={clearFilters}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-normal"
              >
                Clear Filters
              </button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
             <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
          ) : activeStudents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                   <tr>
                    <th className="px-4 py-3 w-12">
                      <Checkbox
                        checked={activeStudents.length > 0 && selectedStudents.size === activeStudents.length}
                        onCheckedChange={toggleSelectAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                      {selectedType === 'internal' ? 'Student Info' : 'Personal Info'}
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category / Cohort</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Performance</th>
                  </tr>
                </thead>
                 <tbody className="divide-y divide-gray-200">
                  {activeStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selectedStudents.has(student.id)}
                          onCheckedChange={() => toggleSelectStudent(student.id)}
                          aria-label={`Select ${student.full_name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${selectedType === 'internal' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {student.full_name?.charAt(0) || student.username?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{student.full_name}</div>
                            <div className="text-sm text-gray-500">
                              {selectedType === 'internal' ? (
                                <span>ID: {student.student_id}</span>
                              ) : (
                                <span className="text-emerald-600">@{student.username}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 items-start">
                           {student.category_name ? (
                            <Badge
                              variant="outline"
                              className="font-normal"
                              style={{
                                borderColor: student.category_color,
                                color: student.category_color,
                                backgroundColor: student.category_color ? `${student.category_color}10` : 'transparent'
                              }}
                            >
                              {student.category_name}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">Uncategorized</span>
                          )}
                           {selectedType === 'external' ? (
                              <Badge variant="outline" className="text-[10px] h-4 text-emerald-600 bg-emerald-50 border-emerald-100">Independent</Badge>
                           ) : (
                              <Badge variant="outline" className="text-[10px] h-4 text-indigo-600 bg-indigo-50 border-indigo-100">School Assigned</Badge>
                           )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {student.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="h-3 w-3 mr-2 opacity-70" />
                              <span className="truncate max-w-[150px]">{student.email}</span>
                            </div>
                          )}
                          {student.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="h-3 w-3 mr-2 opacity-70" />
                              {student.phone}
                            </div>
                          )}
                          {!student.email && !student.phone && (
                             <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                         <div className="flex items-center justify-end gap-2">
                           <div className="flex justify-end gap-2">
                            {isFeatureAllowed('advanced_analytics') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 px-2 flex items-center gap-1.5"
                                onClick={() => navigate(`/advanced-report/${student.id}`)}
                                title="Generate Advanced Report"
                              >
                                <Sparkles className="h-4 w-4" />
                                <span className="text-xs font-semibold">Adv. Report</span>
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              className="px-2 flex items-center gap-1.5"
                              onClick={() => navigate(`/report-card/${student.id}`)}
                            >
                              <FileText className="h-4 w-4" />
                              <span className="text-xs font-medium">Std. Report</span>
                            </Button>
                         </div>
                          </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900">No students found</h3>
              <p className="text-gray-500 mt-2 max-w-sm mx-auto">
                {selectedCategory !== 'all'
                  ? "No students found in this category. Try selecting a different filter."
                  : "You haven't been assigned any students yet. Contact your school administrator."}
              </p>
             </div>
          )}
        </CardContent>
      </Card>
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Category to {selectedStudents.size} Students</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Category</Label>
              <Select value={targetCategory} onValueChange={setTargetCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a category..." />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat: any) => (
                    <SelectItem key={cat.id || cat.category_id} value={cat.id || cat.category_id}>
                      {cat.name || cat.category_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkAssign} disabled={assigning || !targetCategory}>
              {assigning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                'Assign Category'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
