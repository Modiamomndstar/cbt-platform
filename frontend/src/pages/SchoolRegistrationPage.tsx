import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { schoolAPI } from '@/services/api';
import { GraduationCap, ArrowLeft, Upload, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';

export default function SchoolRegistrationPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    confirmPassword: '',
    email: '',
    phone: '',
    address: '',
    description: '',
    logo: '',
  });

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
        setFormData(prev => ({ ...prev, logo: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError('School name is required');
      return false;
    }
    if (!formData.username.trim()) {
      setError('Username is required');
      return false;
    }
    if (formData.username.length < 4) {
      setError('Username must be at least 4 characters');
      return false;
    }
    if (!formData.password) {
      setError('Password is required');
      return false;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.email.trim()) {
      setError('Email is required');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }
    if (!formData.address.trim()) {
      setError('Address is required');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
      setError('');
    } else if (step === 2 && validateStep2()) {
      setStep(3);
      setError('');
    }
  };

  const handleBack = () => {
    setStep(prev => prev - 1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await schoolAPI.register({
        name: formData.name,
        username: formData.username,
        password: formData.password,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        description: formData.description,
      });

      toast.success('School registered successfully!');

      // Show success message and redirect to login
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'An error occurred during registration. Please try again.';
      setError(msg);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">School Name *</Label>
        <Input
          id="name"
          name="name"
          placeholder="Enter school name"
          value={formData.name}
          onChange={handleInputChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Username *</Label>
        <Input
          id="username"
          name="username"
          placeholder="Choose a username for login"
          value={formData.username}
          onChange={handleInputChange}
        />
        <p className="text-xs text-gray-500">This will be used for login. Minimum 4 characters.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password *</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Create a password"
            value={formData.password}
            onChange={handleInputChange}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-500">Minimum 6 characters.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm Password *</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleInputChange}
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="school@example.edu"
          value={formData.email}
          onChange={handleInputChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <Input
          id="phone"
          name="phone"
          placeholder="+1234567890"
          value={formData.phone}
          onChange={handleInputChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Textarea
          id="address"
          name="address"
          placeholder="Enter school address"
          value={formData.address}
          onChange={handleInputChange}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          placeholder="Brief description of your school"
          value={formData.description}
          onChange={handleInputChange}
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label>School Logo</Label>
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition-colors"
        >
          {logoPreview ? (
            <div className="flex flex-col items-center">
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-24 w-24 object-contain mb-4"
              />
              <p className="text-sm text-gray-600">Click to change logo</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-12 w-12 text-gray-400 mb-4" />
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
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-3">Review Your Information</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">School Name:</span>
            <span className="font-medium">{formData.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Username:</span>
            <span className="font-medium">{formData.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Email:</span>
            <span className="font-medium">{formData.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Phone:</span>
            <span className="font-medium">{formData.phone}</span>
          </div>
        </div>
      </div>

      <div className="flex items-start space-x-3">
        <CheckCircle className="h-5 w-5 text-emerald-500 mt-0.5" />
        <p className="text-sm text-gray-600">
          By registering, you agree to our terms of service and privacy policy.
          Your school account will be activated immediately.
        </p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-900 hover:text-indigo-600"
            >
              <GraduationCap className="h-8 w-8" />
              <span className="text-xl font-bold">CBT Platform</span>
            </button>
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      {/* Registration Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Register Your School</CardTitle>
            <CardDescription>
              Create a school account to start conducting online exams
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6">
              <Progress value={(step / 3) * 100} className="h-2" />
              <div className="flex justify-between mt-2 text-sm text-gray-600">
                <span className={step >= 1 ? 'text-indigo-600 font-medium' : ''}>Account</span>
                <span className={step >= 2 ? 'text-indigo-600 font-medium' : ''}>Details</span>
                <span className={step >= 3 ? 'text-indigo-600 font-medium' : ''}>Review</span>
              </div>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit}>
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
              {step === 3 && renderStep3()}

              <div className="flex justify-between mt-6">
                {step > 1 && (
                  <Button type="button" variant="outline" onClick={handleBack}>
                    Back
                  </Button>
                )}
                {step < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className={step === 1 ? 'ml-auto' : ''}
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="ml-auto"
                  >
                    {isLoading ? 'Registering...' : 'Complete Registration'}
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                Already have an account?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Login here
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
