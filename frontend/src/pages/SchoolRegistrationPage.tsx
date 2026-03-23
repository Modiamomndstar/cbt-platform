import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { schoolAPI, uploadAPI } from '@/services/api';
import { Checkbox } from '@/components/ui/checkbox';
import { Upload, CheckCircle, Eye, EyeOff, Loader2, School, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function SchoolRegistrationPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchParams] = useSearchParams();

  // Auto-fill referral from URL
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      setFormData(prev => ({ ...prev, referralCode: ref.toUpperCase() }));
    }
  }, [searchParams]);

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
    referralCode: '',
    agreedToPolicies: false,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setError('Logo file size must be less than 2MB');
        return;
      }

      setIsUploadingLogo(true);
      setError('');

      try {
        const response = await uploadAPI.uploadPublicImage(file);
        const uploadedUrl = response.data.data.url;

        setLogoPreview(URL.createObjectURL(file)); // Local preview for speed
        setFormData(prev => ({ ...prev, logo: uploadedUrl }));
        toast.success('Logo uploaded successfully');
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Failed to upload logo. Please try again.';
        setError(msg);
        console.error(err);
      } finally {
        setIsUploadingLogo(false);
      }
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
    if (step < 3) return;
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
        logo: formData.logo,
        referralCode: formData.referralCode,
        agreedToPolicies: formData.agreedToPolicies,
      });

      toast.success('Registration successful! Please check your email.');
      setIsSuccess(true);
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
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? 'text' : 'password'}
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChange={handleInputChange}
        />
      </div>

      <div className="space-y-2 pt-2">
        <Label htmlFor="referralCode">Referral Code (Optional)</Label>
        <Input
          id="referralCode"
          name="referralCode"
          placeholder="Enter referral code if you have one"
          value={formData.referralCode}
          onChange={handleInputChange}
          className="uppercase"
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
          {isUploadingLogo ? (
            <div className="flex flex-col items-center py-4">
              <Loader2 className="h-12 w-12 text-indigo-500 animate-spin mb-4" />
              <p className="text-sm text-gray-600">Uploading logo...</p>
            </div>
          ) : logoPreview ? (
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

      <div className="flex items-start space-x-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
        <Checkbox 
          id="agreedToPolicies" 
          checked={formData.agreedToPolicies}
          onCheckedChange={(checked) => setFormData(prev => ({ ...prev, agreedToPolicies: checked === true }))}
          className="mt-1 border-indigo-300 data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
        />
        <div className="space-y-1">
          <Label htmlFor="agreedToPolicies" className="text-sm font-bold text-indigo-900 cursor-pointer">
            I agree to the Terms of Service and Privacy Policy
          </Label>
          <p className="text-xs text-indigo-700/70 font-medium">
            By checking this box, you acknowledge that you have read and agree to our <Link to="/terms" className="underline font-bold hover:text-indigo-900" target="_blank">Terms of Service</Link> and <Link to="/privacy" className="underline font-bold hover:text-indigo-900" target="_blank">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pt-24 md:pt-32 pb-20">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-xl shadow-2xl border-indigo-100/50 rounded-[32px] overflow-hidden">
          <CardHeader className="text-center pt-10 pb-6 bg-indigo-600 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
              <School className="h-32 w-32" />
            </div>
            <CardTitle className="text-3xl font-black tracking-tight mb-2">Register Your School</CardTitle>
            <CardDescription className="text-indigo-100 font-medium opacity-90">
              Create a school account to start conducting online exams
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8 md:p-12">
            {!isSuccess && (
              <div className="mb-10">
                <div className="flex justify-between mb-4 px-2">
                  <StepIndicator step={1} current={step} label="Setup" />
                  <StepIndicator step={2} current={step} label="Contact" />
                  <StepIndicator step={3} current={step} label="Verify" />
                </div>
                <Progress value={(step / 3) * 100} className="h-2 bg-indigo-50" />
              </div>
            )}

            {error && (
              <Alert variant="destructive" className="mb-8 rounded-2xl bg-rose-50 border-rose-100 text-rose-900">
                <AlertDescription className="font-bold text-sm tracking-tight">{error}</AlertDescription>
              </Alert>
            )}

            {isSuccess ? (
              <div className="text-center py-10 space-y-8 animate-in fade-in duration-700">
                <div className="flex justify-center">
                  <div className="bg-emerald-100 p-6 rounded-full shadow-lg shadow-emerald-100 ring-8 ring-emerald-50">
                    <CheckCircle className="h-16 w-16 text-emerald-600" />
                  </div>
                </div>
                <div className="space-y-4">
                  <h3 className="text-3xl font-black text-gray-900 tracking-tight">Registration Sent!</h3>
                  <p className="text-lg text-gray-500 font-medium leading-relaxed">
                    We've sent a verification link to <br className="hidden sm:block" />
                    <span className="font-black text-indigo-600 text-xl tracking-tight">{formData.email}</span>
                  </p>
                </div>
                
                <div className="bg-indigo-50/50 border border-indigo-100 rounded-[32px] p-8 text-left">
                  <h4 className="font-black text-indigo-900 mb-4 flex items-center text-sm uppercase tracking-widest">
                    Next Steps
                  </h4>
                  <ul className="space-y-4 text-sm text-indigo-800/80 font-bold">
                    <li className="flex gap-4">
                       <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-[10px] text-indigo-600">1</div>
                       Check your email inbox (and spam folder).
                    </li>
                    <li className="flex gap-4">
                       <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-[10px] text-indigo-600">2</div>
                       Click the link to verify your account.
                    </li>
                    <li className="flex gap-4">
                       <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-[10px] text-indigo-600">3</div>
                       Log in to access your 14-day free trial.
                    </li>
                  </ul>
                </div>
                
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95"
                >
                  Proceed to Login
                </Button>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && step < 3) {
                    e.preventDefault();
                    handleNext();
                  }
                }}
                className="space-y-8"
              >
                {step === 1 && renderStep1()}
                {step === 2 && renderStep2()}
                {step === 3 && renderStep3()}

                <div className="flex gap-4 pt-4">
                  {step > 1 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleBack}
                      className="h-14 px-8 border-2 border-gray-100 font-bold text-gray-500 rounded-2xl hover:bg-gray-50"
                    >
                      Back
                    </Button>
                  )}
                  {step < 3 ? (
                    <Button
                      type="button"
                      onClick={handleNext}
                      className="flex-1 h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg shadow-indigo-100 active:scale-95 transition-all"
                    >
                      Continue
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      disabled={isLoading || !formData.agreedToPolicies}
                      className="flex-1 h-16 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-200 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                    >
                      {isLoading ? <RefreshCw className="h-6 w-6 animate-spin" /> : 'Complete Registration'}
                    </Button>
                  )}
                </div>
              </form>
            )}

            {!isSuccess && (
              <div className="mt-12 pt-8 border-t border-gray-100 text-center">
                <p className="text-sm font-medium text-gray-500 tracking-tight">
                  Already registered?{' '}
                  <button
                    onClick={() => navigate('/login')}
                    className="text-indigo-600 hover:underline font-black ml-1"
                  >
                    Login to Dashboard
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StepIndicator({ step, current, label }: { step: number, current: number, label: string }) {
  const active = current >= step;
  const focus = current === step;
  
  return (
    <div className="flex flex-col items-center gap-2 group">
      <div className={cn(
        "w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black transition-all duration-500",
        active ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-gray-100 text-gray-400",
        focus && "ring-4 ring-indigo-50"
      )}>
        {step}
      </div>
      <span className={cn(
        "text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
        active ? "text-indigo-600" : "text-gray-400"
      )}>
        {label}
      </span>
    </div>
  );
}
