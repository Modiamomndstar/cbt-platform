import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, ArrowLeft, Clock, Eye, EyeOff, User, KeyRound } from 'lucide-react';

export default function StudentLogin() {
  const navigate = useNavigate();
  const { login, clearSession } = useAuth();

  useEffect(() => {
    // Clear any existing session when the login page loads to avoid 403 errors from background calls
    // Using clearSession instead of logout to avoid the hardcoded redirect to /login
    clearSession();
  }, [clearSession]);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [activeTab, setActiveTab] = useState<'exam' | 'portal'>('exam');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    let result;
    console.log(`Attempting ${activeTab} login for ${username}`);
    if (activeTab === 'exam') {
       result = await login('student', username, password, accessCode);
    } else {
       // Portal login - use the unified login hook
       result = await login('student_portal', username, password);
    }
    console.log(`Login result for ${username}:`, result?.success ? 'Success' : 'Failed', result?.message || '');

    if (result && !result.success) {
      setError(result.message || 'Invalid credentials.');
    } else if (activeTab === 'exam' && result?.data?.exam?.scheduleId) {
       navigate(`/student/take-exam/${result.data.exam.scheduleId}`); // Use direct route
    } else if (activeTab === 'exam') {
       navigate('/student/dashboard'); // Fallback
    } else if (result?.success) {
       navigate('/student/dashboard'); // Portal successful login
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-900 hover:text-emerald-600"
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
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl">Student Login</CardTitle>
            <CardDescription>
              Enter your exam credentials provided by your tutor
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'exam' | 'portal')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="portal" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  <span>Student Portal</span>
                </TabsTrigger>
                <TabsTrigger value="exam" className="flex items-center gap-2">
                  <KeyRound className="h-4 w-4" />
                  <span>Exam Access</span>
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSubmit} className="space-y-4">
                <TabsContent value="portal" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="portal-username">Username</Label>
                    <Input
                      id="portal-username"
                      placeholder="Enter your student username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={activeTab === 'portal'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="portal-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="portal-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={activeTab === 'portal'}
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
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                     <p className="text-xs text-blue-800">
                       Login here to view your permanent profile, history, and upcoming exams.
                     </p>
                  </div>
                </TabsContent>

                <TabsContent value="exam" className="space-y-4 mt-0">
                  <div className="space-y-2">
                    <Label htmlFor="exam-username">Exam Username</Label>
                    <Input
                      id="exam-username"
                      placeholder="Enter exam username (from tutor)"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required={activeTab === 'exam'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="exam-password">Exam Password</Label>
                     <div className="relative">
                      <Input
                        id="exam-password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter exam password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required={activeTab === 'exam'}
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
                  <div className="space-y-2">
                    <Label htmlFor="accessCode">Access Code (Optional)</Label>
                    <Input
                      id="accessCode"
                      placeholder="Enter exam access code"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                    />
                  </div>
                   <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-amber-800 mb-2">Important Notes:</h4>
                    <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                      <li>You can only login during your scheduled exam time</li>
                      <li>Ensure you have a stable internet connection</li>
                    </ul>
                  </div>
                </TabsContent>

                <Button
                  type="submit"
                  className={`w-full ${activeTab === 'portal' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                  disabled={isLoading}
                >
                  {isLoading ? 'Logging in...' : (activeTab === 'portal' ? 'Login to Portal' : 'Start Exam')}
                </Button>
              </form>
            </Tabs>

            <div className="mt-6 text-center text-sm text-gray-600">
              <p>
                Are you a tutor or school admin?{' '}
                <button
                  onClick={() => navigate('/login')}
                  className="text-emerald-600 hover:underline font-medium"
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
