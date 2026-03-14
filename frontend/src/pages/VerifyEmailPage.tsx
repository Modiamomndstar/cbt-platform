import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { authAPI } from '@/services/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    const verifyEmail = async () => {
      try {
        const response = await authAPI.verifyEmail(token);
        setStatus('success');
        setMessage(response.data.message || 'Email verified successfully!');
      } catch (err: any) {
        setStatus('error');
        setMessage(err?.response?.data?.message || 'Verification failed. The link may be expired.');
      }
    };

    verifyEmail();
  }, [token]);

  return (
    <div className="flex-1 flex items-center justify-center p-4 py-24 md:py-32">

      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>Account Verification</CardTitle>
          <CardDescription>
            {status === 'loading' ? 'Please wait while we verify your account' : 'Verification result'}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6">
          {status === 'loading' && (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
              <p className="text-gray-600">{message}</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-emerald-100 p-4 rounded-full">
                <CheckCircle className="h-12 w-12 text-emerald-600" />
              </div>
              <p className="text-lg font-medium text-gray-900">{message}</p>
              <p className="text-sm text-gray-600">
                Your school account is now active and your 14-day free trial has started.
              </p>
              <Button
                onClick={() => navigate('/login')}
                className="w-full mt-4"
              >
                Go to Login
              </Button>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-red-100 p-4 rounded-full">
                <XCircle className="h-12 w-12 text-red-600" />
              </div>
              <p className="text-lg font-medium text-gray-900">{message}</p>
              <p className="text-sm text-gray-600">
                If you believe this is an error, please contact support or try registering again.
              </p>
              <div className="flex space-x-3 w-full mt-4">
                <Button
                  variant="outline"
                  onClick={() => navigate('/register')}
                  className="flex-1"
                >
                  Register
                </Button>
                <Button
                  onClick={() => navigate('/login')}
                  className="flex-1"
                >
                  Back to Login
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
