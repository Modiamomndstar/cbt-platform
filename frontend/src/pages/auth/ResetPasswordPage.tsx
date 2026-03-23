import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { authAPI } from '@/services/api';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Invalid reset link');
      navigate('/login');
    }
  }, [token, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await authAPI.resetPassword(token!, password);
      setIsSuccess(true);
      toast.success('Password reset successfully');
      setTimeout(() => navigate('/login'), 3000);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-none shadow-xl bg-white text-center py-8">
          <CardContent className="space-y-6">
            <div className="flex justify-center">
              <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                <CheckCircle2 className="h-12 w-12" />
              </div>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Password Reset!</h2>
              <p className="text-slate-500">
                Your password has been successfully updated. Redirecting you to login...
              </p>
            </div>
            <Button 
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 font-bold"
                onClick={() => navigate('/login')}
            >
              Sign In Now
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
             <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <KeyRound className="h-6 w-6" />
                </div>
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Create New Password</h1>
          <p className="text-slate-500 italic">Please enter your new secure password below.</p>
        </div>

        {!token ? (
           <Card className="border-red-100 bg-red-50">
              <CardContent className="pt-6 flex gap-3 text-red-700">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <p className="text-sm font-medium">No valid reset token found in the URL. Please check your email link again.</p>
              </CardContent>
           </Card>
        ) : (
          <Card className="border-none shadow-xl bg-white overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-indigo-600 to-purple-600" />
            <CardHeader className="pb-2">
              <CardTitle className="text-xl font-bold">New Password</CardTitle>
              <CardDescription>Enter a strong password to protect your institution.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="password font-bold text-slate-700">New Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-12 bg-slate-50 border-slate-200 focus:ring-indigo-500 pr-10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword font-bold text-slate-700">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="h-12 bg-slate-50 border-slate-200 focus:ring-indigo-500"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-200"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-sm text-slate-500">
          Changed your mind?{' '}
          <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500 underline decoration-2 underline-offset-4">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
