import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const result = await login('super_admin', adminUsername, adminPassword);

    if (result.success) {
      navigate('/super-admin/dashboard');
    } else {
      setError(result.message || 'Invalid administrator credentials.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-8 flex justify-center">
        <div className="flex items-center space-x-2 text-white">
          <GraduationCap className="h-10 w-10 text-indigo-400" />
          <span className="text-2xl font-bold">CBT Platform</span>
        </div>
      </div>

      <Card className="w-full max-w-md border-slate-700 bg-slate-800 text-white shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mb-4 text-indigo-400">
            <Shield className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Staff Portal</CardTitle>
          <CardDescription className="text-slate-400">
            Authorized personnel only
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6 bg-red-900/50 border-red-900 text-red-200">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="admin-username" className="text-slate-300">Username</Label>
              <Input
                id="admin-username"
                placeholder="Enter staff username"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                required
                className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password" className="text-slate-300">Password</Label>
              <div className="relative">
                <Input
                  id="admin-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  required
                  className="bg-slate-900 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-indigo-500 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-6 mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Authenticating...' : 'Secure Login'}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <Button
              variant="link"
              onClick={() => navigate('/')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Return to Public Site
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="mt-8 text-sm text-slate-500">
        Access to this system is restricted to authorized company staff.
      </p>
    </div>
  );
}
