import { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { messagesAPI } from '@/services/api';
import { useAuth } from './useAuth';

interface MessagesContextType {
  unreadCount: number;
  refreshUnreadCount: () => Promise<void>;
}

const MessagesContext = createContext<MessagesContextType | undefined>(undefined);

export function MessagesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnreadCount = useCallback(async () => {
    const token = localStorage.getItem('token');
    const path = window.location.pathname;
    const isLoginPage = path === '/login' || path === '/admin/login' || path === '/student/login';

    if (!user || !token || isLoginPage) return;
    try {
      const res = await messagesAPI.getUnreadCount();
      if (res.data.success) {
        setUnreadCount(res.data.data.count);
      }
    } catch (err) {
      console.error("Failed to fetch unread count:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshUnreadCount();
      // Poll every 30 seconds
      const interval = setInterval(refreshUnreadCount, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user, refreshUnreadCount]);

  return (
    <MessagesContext.Provider value={{ unreadCount, refreshUnreadCount }}>
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error('useMessages must be used within a MessagesProvider');
  }
  return context;
}
