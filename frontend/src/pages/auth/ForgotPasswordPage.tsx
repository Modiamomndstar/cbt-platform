import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Mail, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { authAPI } from '@/services/api';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await authAPI.forgotPassword(email);
      setIsSent(true);
      toast.success('Reset link sent to your email');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to request reset link');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSent) {
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
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Check Your Inbox</h2>
              <p className="text-slate-500">
                We've sent a password reset link to <span className="font-bold text-slate-700">{email}</span>.
                The link will expire in 1 hour.
              </p>
            </div>
            <Button 
                variant="outline" 
                className="w-full h-12 text-slate-600 border-slate-200"
                onClick={() => navigate('/login')}
            >
              Back to Login
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
           <Link to="/login" className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Login
          </Link>
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div className="h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <Mail className="h-6 w-6" />
                </div>
            </div>
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Forgot Password?</h1>
          <p className="text-slate-500 italic">No worries, we'll send you reset instructions.</p>
        </div>

        <Card className="border-none shadow-xl bg-white overflow-hidden">
          <div className="h-1.5 bg-gradient-to-r from-indigo-600 to-purple-600" />
          <CardHeader className="pb-2">
            <CardTitle className="text-xl font-bold">Request Reset Link</CardTitle>
            <CardDescription>Enter your school administrator email address.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-bold text-slate-700">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@school.com"
                  className="h-12 bg-slate-50 border-slate-200 focus:ring-indigo-500"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-lg shadow-indigo-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-slate-500">
          Remembered your password?{' '}
          <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500 underline decoration-2 underline-offset-4">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
