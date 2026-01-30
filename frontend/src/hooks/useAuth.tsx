import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { UserSession, UserRole } from '@/types';
import { authAPI } from '@/services/api';

interface AuthContextType {
  user: UserSession | null;
  login: (role: UserRole, email: string, password: string, accessCode?: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    const token = localStorage.getItem('token');
    if (token) {
      refreshUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      if (response.data.success) {
        const userData = response.data.data;
        const session: UserSession = {
          id: userData.id,
          role: userData.role,
          username: userData.username || userData.email || `${userData.firstName || ''}${userData.lastName ? ' ' + userData.lastName : ''}`.trim(),
          email: userData.email,
          name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.fullName || userData.username || '',
          schoolId: userData.schoolId,
          tutorId: userData.role === 'tutor' ? userData.id : undefined,
          studentId: userData.role === 'student' ? userData.id : undefined,
        };
        setUser(session);
        localStorage.setItem('user', JSON.stringify(session));
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (role: UserRole, email: string, password: string, accessCode?: string): Promise<{ success: boolean; message?: string }> => {
    try {
      let response;

      switch (role) {
        case 'super_admin':
          response = await authAPI.superAdminLogin(email, password);
          break;
        case 'school_admin':
          response = await authAPI.schoolLogin(email, password);
          break;
        case 'tutor':
          response = await authAPI.tutorLogin(email, password);
          break;
        case 'student':
          response = await authAPI.studentLogin(email, password, accessCode);
          break;
        default:
          return { success: false, message: 'Invalid role' };
      }

      if (response.data.success) {
        const { token, user: userData } = response.data.data;
        localStorage.setItem('token', token);

        const session: UserSession = {
          id: userData.id,
          role: userData.role,
          username: userData.username || userData.email || `${userData.firstName || ''}${userData.lastName ? ' ' + userData.lastName : ''}`.trim(),
          email: userData.email,
          name: userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.fullName || userData.username || '',
          schoolId: userData.schoolId,
          tutorId: userData.role === 'tutor' ? userData.id : undefined,
          studentId: userData.role === 'student' ? userData.id : undefined,
        };

        localStorage.setItem('user', JSON.stringify(session));
        setUser(session);
        return { success: true };
      }

      return { success: false, message: response.data.message || 'Login failed' };
    } catch (error: any) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Network error. Please try again.'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function RequireAuth({ children, allowedRoles }: { children: ReactNode; allowedRoles: UserRole[] }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    // Redirect to login
    window.location.href = '/login';
    return null;
  }

  return <>{children}</>;
}
