import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authFetch, hasAuthToken } from '../lib/apiClient';
import soundService from '../services/soundService';

export type NotificationType = 'info' | 'success' | 'warning' | 'error';
export type NotificationCategory = 'general' | 'sales' | 'inventory' | 'finance' | 'subscription' | 'support' | 'announcements' | 'system';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category?: NotificationCategory;
  timestamp: Date | string;
  read: boolean;
  target?: string;
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  addNotification: (title: string, message: string, type?: NotificationType, target?: string, category?: NotificationCategory) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const isInitialLoadRef = React.useRef(true);

  // Periodically synchronize user context to ensure swift switching during impersonation
  useEffect(() => {
    const checkUser = () => {
      const uStr = localStorage.getItem('nexus_user');
      if (uStr) {
        try {
          const u = JSON.parse(uStr);
          if (u && (u.id || u.businessId) && (u.id || u.businessId) !== userId) {
            setUserId(u.id || u.businessId);
            setUserRole(u.role || '');
          }
        } catch (e) {}
      } else if (userId) {
        setUserId('');
        setUserRole('');
        setNotifications([]);
      }
    };
    checkUser();
    const interval = setInterval(checkUser, 1000);
    return () => clearInterval(interval);
  }, [userId]);

  // Load from backend API if online + authenticated, fallback to localStorage
  const refreshNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    if (hasAuthToken()) {
      try {
        const res = await authFetch('/api/notifications');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.notifications)) {
            if (isInitialLoadRef.current) {
              isInitialLoadRef.current = false;
              // Mark existing notifications as seen so historical ones do not chime on app start
              data.notifications.forEach((n: Notification) => soundService.markNotificationAsSeen(n.id));
            } else {
              const newUnread = data.notifications.find((n: Notification) => !n.read && !notifications.some(existing => existing.id === n.id));
              if (newUnread) {
                soundService.playNotificationOnce(newUnread.id);
              }
            }
            setNotifications(data.notifications);
            localStorage.setItem(`nexus_notifications_${userId}`, JSON.stringify(data.notifications));
            setIsLoading(false);
            return;
          }
        } else {
          setError('Failed to fetch notifications from server');
        }
      } catch (err: any) {
        setError(err?.message || 'Network error fetching notifications');
      }
    }

    const saved = localStorage.getItem(`nexus_notifications_${userId}`);
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        setNotifications([]);
      }
    } else {
      const isSaas = userRole === 'SuperAdmin' || userRole === 'Admin' || userRole.includes('SAAS');
      const defaults: Notification[] = isSaas ? [
        {
          id: 'n-def-1',
          title: 'Welcome to Bizora SaaS Admin!',
          message: 'Your SaaS administrative space is ready.',
          type: 'success',
          category: 'system',
          timestamp: new Date().toISOString(),
          read: false,
          target: '/admin?tab=dashboard'
        },
        {
          id: 'n-def-2',
          title: 'Secure Multi-Tenant Enclave Active',
          message: 'Database security queries successfully enforced for tenant_id: ' + userId,
          type: 'info',
          category: 'system',
          timestamp: new Date(Date.now() - 60000).toISOString(),
          read: false,
          target: '/admin?tab=security'
        }
      ] : [];

      setNotifications(defaults);
      localStorage.setItem(`nexus_notifications_${userId}`, JSON.stringify(defaults));
    }
    setIsLoading(false);
  }, [userId, userRole]);

  useEffect(() => {
    refreshNotifications();
  }, [refreshNotifications]);

  const saveLocal = (notifs: Notification[]) => {
    if (userId) {
      localStorage.setItem(`nexus_notifications_${userId}`, JSON.stringify(notifs));
    }
  };

  const addNotification = useCallback((
    title: string, 
    message: string, 
    type: NotificationType = 'info', 
    target?: string,
    category: NotificationCategory = 'general'
  ) => {
    const newNotif: Notification = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type,
      category,
      timestamp: new Date().toISOString(),
      read: false,
      target,
    };

    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      saveLocal(updated);
      return updated;
    });

    soundService.playNotificationOnce(newNotif.id);

    if (hasAuthToken()) {
      authFetch('/api/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title,
          message,
          type,
          category,
          target,
          id: newNotif.id,
        })
      }).catch(() => {});
    }
  }, [userId]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => (n.id === id ? { ...n, read: true } : n));
      saveLocal(updated);
      return updated;
    });

    if (hasAuthToken()) {
      try {
        await authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
      } catch (err) {}
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveLocal(updated);
      return updated;
    });

    if (hasAuthToken()) {
      try {
        await authFetch('/api/notifications/read-all', { method: 'POST' });
      } catch (err) {}
    }
  };

  const removeNotification = async (id: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== id);
      saveLocal(updated);
      return updated;
    });

    if (hasAuthToken()) {
      try {
        await authFetch(`/api/notifications/${id}`, { method: 'DELETE' });
      } catch (err) {}
    }
  };

  const clearAll = async () => {
    setNotifications([]);
    saveLocal([]);

    if (hasAuthToken()) {
      try {
        await authFetch('/api/notifications', { method: 'DELETE' });
      } catch (err) {}
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      isLoading,
      error,
      addNotification,
      markAsRead,
      markAllAsRead,
      removeNotification,
      clearAll,
      refreshNotifications
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
