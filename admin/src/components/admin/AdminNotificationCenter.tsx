import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Bell, X, Check, CheckCheck, Trash2, Crown, HeadphonesIcon, 
  Megaphone, Shield, AlertTriangle, AlertCircle, CheckCircle2, 
  Sparkles, ChevronRight, ExternalLink, RefreshCw
} from 'lucide-react';
import { authFetch } from '../../lib/apiClient';
import { subscribeBusinessSync } from '@shared/lib/realtimeSocket';

export interface AdminNotification {
  id: string;
  userId?: string;
  businessId?: string;
  targetRole?: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  category?: 'subscription' | 'support' | 'announcements' | 'system' | 'sales' | 'finance' | string;
  title: string;
  message: string;
  target?: string;
  read?: boolean;
  timestamp?: string;
  createdAt?: string;
  metadata?: Record<string, any>;
}

interface Props {
  onNavigateTab?: (tabId: string) => void;
  showToast?: (msg: string, type?: string) => void;
}

const formatTimeAgo = (dateParam?: string) => {
  if (!dateParam) return '';
  const d = new Date(dateParam);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getCategoryVisuals = (notif: AdminNotification) => {
  const cat = notif.category || 'system';
  if (cat === 'subscription' || cat === 'plan_requests') {
    return {
      icon: Crown,
      badge: 'Plan Request',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      iconClass: 'text-amber-600 bg-amber-50 border-amber-200',
      targetTab: 'subscriptions',
    };
  }
  if (cat === 'support' || cat === 'tickets') {
    return {
      icon: HeadphonesIcon,
      badge: 'Support Ticket',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
      iconClass: 'text-purple-600 bg-purple-50 border-purple-200',
      targetTab: 'support',
    };
  }
  if (cat === 'announcements') {
    return {
      icon: Megaphone,
      badge: 'Announcement',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
      iconClass: 'text-sky-600 bg-sky-50 border-sky-200',
      targetTab: 'announcements-center',
    };
  }
  if (notif.type === 'error' || notif.type === 'warning') {
    return {
      icon: AlertTriangle,
      badge: notif.type === 'error' ? 'Critical' : 'Alert',
      badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
      iconClass: 'text-rose-600 bg-rose-50 border-rose-200',
      targetTab: 'monitoring-center',
    };
  }
  return {
    icon: Shield,
    badge: 'System',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    iconClass: 'text-slate-600 bg-slate-100 border-slate-200',
    targetTab: 'dashboard',
  };
};

export const AdminNotificationCenter: React.FC<Props> = ({ onNavigateTab, showToast }) => {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'subscription' | 'support' | 'announcements' | 'system'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await authFetch('/api/notifications');
      if (res.ok) {
        const body = await res.json();
        setNotifications(body?.notifications || []);
      }
    } catch (e) {
      console.warn('Failed to fetch admin notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time socket events for notifications
    const unsubscribe = subscribeBusinessSync((ev) => {
      if (ev.domain === 'notifications' || ev.domain === 'tickets' || ev.domain === 'plan_requests') {
        fetchNotifications();
        if (ev.domain === 'notifications' && ev.payload) {
          const payload = ev.payload as any;
          showToast?.(payload.title || 'New Admin Notification');
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = useMemo(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeFilter === 'unread') return !n.read;
      if (activeFilter === 'subscription') return n.category === 'subscription' || n.category === 'plan_requests';
      if (activeFilter === 'support') return n.category === 'support' || n.category === 'tickets';
      if (activeFilter === 'announcements') return n.category === 'announcements';
      if (activeFilter === 'system') return n.category === 'system' || n.type === 'error' || n.type === 'warning';
      return true;
    });
  }, [notifications, activeFilter]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try {
      await authFetch(`/api/notifications/${id}/read`, { method: 'PATCH' });
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await authFetch('/api/notifications/read-all', { method: 'POST' });
      showToast?.('All notifications marked as read', 'success');
    } catch {
      // ignore
    }
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await authFetch(`/api/notifications/${id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (notif: AdminNotification) => {
    markAsRead(notif.id);
    const visuals = getCategoryVisuals(notif);
    if (onNavigateTab) {
      onNavigateTab(visuals.targetTab);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Admin Notifications"
        className="relative p-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-black text-white shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-[340px] sm:w-[420px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 z-[200] overflow-hidden flex flex-col max-h-[560px] animate-in fade-in zoom-in-95 duration-200"
          role="dialog"
          aria-label="Admin Notifications List"
        >
          {/* Header */}
          <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-indigo-400" />
                  <span>SaaS Notifications</span>
                </h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Live platform requests, tickets & alerts</p>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={fetchNotifications}
                title="Refresh notifications"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Tabs */}
          <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0 text-[11px] font-bold">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}` },
              { id: 'subscription', label: 'Plans' },
              { id: 'support', label: 'Support' },
              { id: 'announcements', label: 'Announcements' },
              { id: 'system', label: 'System' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                  activeFilter === f.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notification List Scroll Area */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                  <Sparkles className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">
                  {activeFilter === 'unread' ? 'No unread notifications' : 'No notifications'}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Platform alerts will appear here in real time.
                </p>
              </div>
            ) : (
              filteredNotifications.map(notif => {
                const visual = getCategoryVisuals(notif);
                const Icon = visual.icon;

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 group relative ${
                      notif.read ? 'bg-white hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/70 font-medium'
                    }`}
                  >
                    {/* Category Icon */}
                    <div className={`p-2 rounded-xl border shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${visual.iconClass}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border tracking-wider ${visual.badgeClass}`}>
                          {visual.badge}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          {formatTimeAgo(notif.timestamp || notif.createdAt)}
                        </span>
                      </div>

                      <h4 className={`text-xs truncate ${notif.read ? 'font-semibold text-slate-800' : 'font-bold text-slate-900'}`}>
                        {notif.title}
                      </h4>

                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>

                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-indigo-600 font-bold group-hover:underline">
                        <span>Open {visual.badge} module</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>

                    {/* Unread dot */}
                    {!notif.read && (
                      <span className="absolute top-4 right-8 w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-indigo-100" />
                    )}

                    {/* Delete action */}
                    <button
                      type="button"
                      onClick={(e) => deleteNotification(notif.id, e)}
                      title="Dismiss notification"
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all absolute top-3.5 right-2"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer note */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Real-time Socket.IO Sync Active</span>
            <span className="font-mono">{notifications.length} Total</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNotificationCenter;

