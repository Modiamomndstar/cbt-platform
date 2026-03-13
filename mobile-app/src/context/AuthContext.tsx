import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  role: string;
  schoolId: string;
  schoolName?: string;
  schoolLogo?: string;
  isExternal?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  currentExam: any | null;
  login: (type: 'portal' | 'exam', username: string, password: string, accessCode?: string) => Promise<{ success: boolean; data?: any; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [currentExam, setCurrentExam] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        const response = await authAPI.getMe();
        if (response.data.success) {
          setUser(response.data.data.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (type: 'portal' | 'exam', username: string, password: string, accessCode?: string): Promise<{ success: boolean; data?: any; message?: string }> => {
    try {
      const response = type === 'portal'
        ? await authAPI.login(username, password)
        : await authAPI.loginExam(username, password, accessCode);

      if (response.data.success) {
        const { token, user: userData, exam } = response.data.data;
        await AsyncStorage.setItem('token', token);
        setUser(userData);
        if (exam) {
          setCurrentExam(exam);
        }
        return { success: true, data: response.data.data };
      }

      return { success: false, message: response.data.message };
    } catch (error: any) {
      console.error('Login error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        code: error.code
      });

      if (error.code === 'ERR_NETWORK' || !error.response) {
        return {
          success: false,
          message: 'Network error: Cannot reach the server. Please check your internet connection or API_BASE_URL.'
        };
      }

      return {
        success: false,
        message: error.response?.data?.message || 'Login failed: ' + (error.message || 'Unknown error')
      };
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setUser(null);
    setCurrentExam(null);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, currentExam, login, logout }}>
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
