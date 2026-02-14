import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { tutorAPI } from '@/services/api';
import { Users, Search, Loader2, Mail, Phone } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function StudentManagement() {
  const { user } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Categories
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<'all' | 'school' | 'external'>('all');

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
      // We can also pass search query to backend if supported
      // The current backend implementation might filter by category only

      const response = await tutorAPI.getStudents(user?.id || '', params);
      if (response.data.success) {
        let data = response.data.data || [];

        // Client-side search filtering (since backend might not support search param yet on this specific endpoint)
        if (searchQuery) {
          const lowerQ = searchQuery.toLowerCase();
          data = data.filter((s: any) =>
            (s.full_name || s.fullName || '').toLowerCase().includes(lowerQ) ||
            (s.student_id || s.studentId || '').toLowerCase().includes(lowerQ)
          );
        }

        // Filter by Type (School vs External)
        if (selectedType === 'school') {
            data = data.filter((s: any) => !s.student_id?.startsWith('EXT'));
        } else if (selectedType === 'external') {
            data = data.filter((s: any) => s.student_id?.startsWith('EXT'));
        }

        setStudents(data);
      }
    } catch (err) {
      console.error('Failed to load students:', err);
    }
  };

  const loadCategories = async () => {
    try {
      // Fetch categories associated with this tutor's students
      const response = await tutorAPI.getCategories(user?.id || '');
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
              {categories.map((cat: any) => (
                <SelectItem key={cat.id || cat.category_id} value={cat.id || cat.category_id}>
                  {cat.name || cat.category_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Student Type Filters */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${
            selectedType === 'all'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedType('all')}
        >
          All Students
        </button>
        <button
          className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${
            selectedType === 'school'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedType('school')}
        >
          School Assigned
        </button>
        <button
          className={`pb-2 px-4 text-sm font-medium transition-colors border-b-2 ${
            selectedType === 'external'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setSelectedType('external')}
        >
          My External
        </button>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              <span>Assigned Students</span>
              <Badge variant="secondary" className="ml-2">
                {students.length}
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
          ) : students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Student Info</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Category/Level</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Contact</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold shrink-0">
                            {student.full_name?.charAt(0) || student.username?.charAt(0) || '?'}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{student.full_name}</div>
                            <div className="text-sm text-gray-500">{student.student_id}</div>
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
                            <span className="text-xs text-gray-400">No Category</span>
                          )}
                          {student.level && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                              {student.level}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {student.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="h-3 w-3 mr-2 opacity-70" />
                              {student.email}
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
                      <td className="px-4 py-3">
                         {/* Placeholder for performance stats or actions */}
                         <div className="flex items-center gap-2">
                           <Badge variant="secondary" className="bg-gray-100 text-gray-600 hover:bg-gray-200">
                             History
                           </Badge>
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
    </div>
  );
}
