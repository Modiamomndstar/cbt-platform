import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { GraduationCap, School, Users, Shield, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import type { UserRole } from '@/types';

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
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

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
      case 'super_admin':
        username = adminUsername;
        password = adminPassword;
        break;
    }

    const success = await login(activeTab, username, password, schoolId || undefined);

    if (success) {
      switch (activeTab) {
        case 'school_admin':
          navigate('/school-admin/dashboard');
          break;
        case 'tutor':
          navigate('/tutor/dashboard');
          break;
        case 'super_admin':
          navigate('/super-admin/dashboard');
          break;
      }
    } else {
      setError('Invalid credentials. Please try again.');
    }

    setIsLoading(false);
  };

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

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Login to access your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as UserRole)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="school_admin" className="flex items-center gap-2">
                  <School className="h-4 w-4" />
                  <span className="hidden sm:inline">School</span>
                </TabsTrigger>
                <TabsTrigger value="tutor" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">Tutor</span>
                </TabsTrigger>
                <TabsTrigger value="super_admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:inline">Admin</span>
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleLogin}>
                <TabsContent value="school_admin" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="school-username">Username</Label>
                    <Input
                      id="school-username"
                      placeholder="Enter school username"
                      value={schoolUsername}
                      onChange={(e) => setSchoolUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="school-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="school-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={schoolPassword}
                        onChange={(e) => setSchoolPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Demo: username: demoschool, password: password123
                  </p>
                </TabsContent>

                <TabsContent value="tutor" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tutor-school">School ID</Label>
                    <Input
                      id="tutor-school"
                      placeholder="Enter school ID"
                      value={tutorSchoolId}
                      onChange={(e) => setTutorSchoolId(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tutor-username">Username</Label>
                    <Input
                      id="tutor-username"
                      placeholder="Enter tutor username"
                      value={tutorUsername}
                      onChange={(e) => setTutorUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tutor-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="tutor-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={tutorPassword}
                        onChange={(e) => setTutorPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Demo: school ID from school admin, username: demotutor, password: tutor123
                  </p>
                </TabsContent>

                <TabsContent value="super_admin" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-username">Username</Label>
                    <Input
                      id="admin-username"
                      placeholder="Enter admin username"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="admin-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter password"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Demo: username: admin, password: admin123
                  </p>
                </TabsContent>

                <Button 
                  type="submit" 
                  className="w-full mt-6" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </Tabs>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                Are you a student?{' '}
                <button 
                  onClick={() => navigate('/student/login')}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Login here
                </button>
              </p>
            </div>

            <div className="mt-4 text-center text-sm text-gray-600">
              <p>
                Don&apos;t have a school account?{' '}
                <button 
                  onClick={() => navigate('/register-school')}
                  className="text-indigo-600 hover:underline font-medium"
                >
                  Register School
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
