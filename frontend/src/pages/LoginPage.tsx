import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { School, Users, Eye, EyeOff, Mail, RefreshCw } from 'lucide-react';
import type { UserRole } from '@/types';
import { authAPI } from '@/services/api';
import { toast } from 'sonner';
import { useEffect } from 'react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState<UserRole>('school_admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [schoolUsername, setSchoolUsername] = useState('');
  const [schoolPassword, setSchoolPassword] = useState('');
  const [tutorUsername, setTutorUsername] = useState('');
  const [tutorPassword, setTutorPassword] = useState('');
  const [tutorSchoolId, setTutorSchoolId] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResendLink = async () => {
    if (!schoolUsername || isResending || resendCooldown > 0) return;
    setIsResending(true);
    try {
      const res = await authAPI.resendVerification(schoolUsername);
      if (res.data.success) {
        toast.success(res.data.message || 'Verification email sent!');
        setResendCooldown(60); // 1 minute UI cooldown
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to resend email');
    } finally {
      setIsResending(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    let username = '';
    let password = '';
    let schoolId = '';

    switch (activeTab) {
      case 'school_admin':
        username = schoolUsername;
        password = schoolPassword;
        break;
      case 'tutor':
        username = tutorUsername;
        password = tutorPassword;
        schoolId = tutorSchoolId;
        break;
    }

    const result = await login(activeTab, username, password, schoolId || undefined);

    if (result.success) {
      switch (activeTab) {
        case 'school_admin':
          navigate('/school-admin/dashboard');
          break;
        case 'tutor':
          navigate('/tutor/dashboard');
          break;
      }
    } else {
      setError(result.message || 'Invalid credentials. Please try again.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 py-24 md:py-32">
      <Card className="w-full max-w-md shadow-2xl border-indigo-100/50 rounded-[32px] overflow-hidden">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-3xl font-black text-gray-900 tracking-tight">Welcome Back</CardTitle>
          <CardDescription className="text-gray-500 font-medium mt-2">
            Login to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UserRole)}>
            <TabsList className="grid w-full grid-cols-2 p-1.5 bg-gray-100/80 rounded-2xl mb-8">
              <TabsTrigger value="school_admin" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                <School className="h-4 w-4" />
                <span className="font-bold">School</span>
              </TabsTrigger>
              <TabsTrigger value="tutor" className="flex items-center gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                <Users className="h-4 w-4" />
                <span className="font-bold">Tutor</span>
              </TabsTrigger>
            </TabsList>

            {error && (
              <Alert variant="destructive" className="mb-6 rounded-2xl bg-rose-50 border-rose-100 text-rose-900">
                <AlertDescription className="flex flex-col gap-3">
                  <p className="font-medium text-sm">{error}</p>
                  {error.includes('verify your email') && activeTab === 'school_admin' && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs font-bold rounded-xl border-rose-200 hover:bg-white transition-colors"
                      onClick={handleResendLink}
                      disabled={isResending || resendCooldown > 0}
                    >
                      {isResending ? (
                        <RefreshCw className="h-3 w-3 animate-spin mr-2" />
                      ) : (
                        <Mail className="h-3 w-3 mr-2" />
                      )}
                      {resendCooldown > 0 
                        ? `Wait ${resendCooldown}s to resend` 
                        : 'Resend Verification Link'}
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-5">
                {activeTab === 'tutor' && (
                  <div className="space-y-2">
                    <Label htmlFor="schoolId" className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">School ID</Label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <School className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                      </div>
                      <Input
                        id="schoolId"
                        placeholder="Enter your school code"
                        value={tutorSchoolId}
                        onChange={(e) => setTutorSchoolId(e.target.value)}
                        className="pl-12 h-14 bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-100/50 rounded-2xl transition-all font-medium"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="username" className="text-xs font-black uppercase tracking-widest text-gray-400 ml-1">Username</Label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Users className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
                    </div>
                    <Input
                      id="username"
                      placeholder="Your login username"
                      value={activeTab === 'school_admin' ? schoolUsername : tutorUsername}
                      onChange={(e) => activeTab === 'school_admin' ? setSchoolUsername(e.target.value) : setTutorUsername(e.target.value)}
                      className="pl-12 h-14 bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-100/50 rounded-2xl transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-gray-400">Password</Label>
                    {activeTab === 'school_admin' && (
                      <button 
                        type="button" 
                        onClick={() => navigate('/forgot-password')}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={activeTab === 'school_admin' ? schoolPassword : tutorPassword}
                      onChange={(e) => activeTab === 'school_admin' ? setSchoolPassword(e.target.value) : setTutorPassword(e.target.value)}
                      className="h-14 bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-indigo-100/50 rounded-2xl transition-all font-medium pr-12"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95"
                disabled={isLoading}
              >
                {isLoading ? (
                  <RefreshCw className="h-5 w-5 animate-spin" />
                ) : (
                  'Login to Dashboard'
                )}
              </Button>
            </form>
          </Tabs>

          <div className="mt-10 pt-8 border-t border-gray-100 space-y-4">
            <p className="text-sm font-medium text-gray-500 text-center">
              Are you a student?{' '}
              <button
                onClick={() => navigate('/student/login')}
                className="text-indigo-600 hover:underline font-black ml-1"
              >
                Login here
              </button>
            </p>
            <p className="text-sm font-medium text-gray-500 text-center">
              New to CBT Platform?{' '}
              <button
                onClick={() => navigate('/register-school')}
                className="text-indigo-600 hover:underline font-black ml-1"
              >
                Register School
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
