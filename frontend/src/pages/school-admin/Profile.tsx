import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { schoolAPI } from '@/services/api';
import { Save, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function SchoolProfile() {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [school, setSchool] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    description: '',
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await schoolAPI.getProfile();
        if (response.data.success) {
          const data = response.data.data;
          setSchool(data);
          setFormData({
            name: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            address: data.address || '',
            description: data.description || '',
          });
          setLogoPreview(data.logo_url || null);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file size must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    setIsLoading(true);
    setError('');

    try {
      const response = await schoolAPI.updateProfile({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        description: formData.description,
      });

      if (response.data.success) {
        setSchool(response.data.data);
        toast.success('School profile updated successfully');
      } else {
        setError('Failed to update profile');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'An error occurred. Please try again.';
      setError(msg);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Failed to load school profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">School Profile</h1>
        <p className="text-gray-600">Manage your school&apos;s information and settings</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Logo Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">School Logo</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
              >
                {logoPreview ? (
                  <div className="flex flex-col items-center">
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-32 w-32 object-contain mb-4"
                    />
                    <p className="text-sm text-gray-600">Click to change logo</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Building2 className="h-16 w-16 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600">Click to upload school logo</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 2MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* Details Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">School Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">School Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={school.username}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500">Username cannot be changed</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Brief description of your school"
                />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  {isLoading ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Account Info */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Account Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">School ID</p>
                <p className="font-medium">{school.id}</p>
              </div>
              <div>
                <p className="text-gray-500">Created On</p>
                <p className="font-medium">{new Date(school.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Status</p>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  school.is_active
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {school.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
