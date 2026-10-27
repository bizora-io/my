import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, CheckCheck, Trash2, Info, AlertTriangle, CheckCircle,
  AlertCircle, ShoppingBag, Package, Wallet, HeadphonesIcon,
  Shield, Sparkles, ChevronRight, Megaphone, Volume2, VolumeX,
  Loader2, RefreshCw, Search, ArrowLeft, Filter
} from 'lucide-react';
import { useNotifications, Notification } from '../contexts/NotificationContext';
import { useSound } from '../contexts/SoundContext';
import { useSettings } from '../contexts/SettingsContext';

const getNotificationVisuals = (notif: Notification) => {
  const cat = notif.category || 'general';
  const type = notif.type || 'info';

  if (cat === 'sales') {
    return {
      icon: ShoppingBag,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-800/60',
      badge: 'Sale',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
    };
  }
  if (cat === 'inventory') {
    return {
      icon: Package,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-800/60',
      badge: 'Stock',
      badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
    };
  }
  if (cat === 'finance') {
    return {
      icon: Wallet,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border-blue-100 dark:border-blue-800/60',
      badge: 'Finance',
      badgeClass: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
    };
  }
  if (cat === 'support') {
    return {
      icon: HeadphonesIcon,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 border-purple-100 dark:border-purple-800/60',
      badge: 'Support',
      badgeClass: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
    };
  }
  if (cat === 'announcements') {
    return {
      icon: Megaphone,
      color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 border-sky-100 dark:border-sky-800/60',
      badge: 'Announcement',
      badgeClass: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
    };
  }
  if (cat === 'subscription') {
    return {
      icon: Shield,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border-indigo-100 dark:border-indigo-800/60',
      badge: 'Subscription',
      badgeClass: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
    };
  }
  if (cat === 'system') {
    return {
      icon: Shield,
      color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
      badge: 'System',
      badgeClass: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
    };
  }

  switch (type) {
    case 'warning':
      return {
        icon: AlertTriangle,
        color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-100 dark:border-amber-800/60',
        badge: 'Warning',
        badgeClass: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
      };
    case 'error':
      return {
        icon: AlertCircle,
        color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-100 dark:border-rose-800/60',
        badge: 'Alert',
        badgeClass: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
      };
    case 'success':
      return {
        icon: CheckCircle,
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-100 dark:border-emerald-800/60',
        badge: 'Done',
        badgeClass: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
      };
    default:
      return {
        icon: Info,
        color: 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
        badge: 'Info',
        badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
      };
  }
};

const formatTimeAgo = (dateParam: Date | string) => {
  const d = new Date(dateParam);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.floor(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const getDateBucket = (dateParam: Date | string): 'Today' | 'Yesterday' | 'Earlier' => {
  const d = new Date(dateParam);
  if (isNaN(d.getTime())) return 'Earlier';
  const now = new Date();

  if (d.toDateString() === now.toDateString()) return 'Today';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return 'Earlier';
};

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    refreshNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications();
  const { soundEnabled, toggleSound, previewSound } = useSound();
  const { t } = useSettings();
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'sales' | 'inventory' | 'finance' | 'system' | 'announcements'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshNotifications();
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Category filter
      if (activeFilter === 'unread' && n.read) return false;
      if (activeFilter === 'sales' && n.category !== 'sales') return false;
      if (activeFilter === 'inventory' && n.category !== 'inventory') return false;
      if (activeFilter === 'finance' && n.category !== 'finance') return false;
      if (activeFilter === 'system' && n.category !== 'system' && n.category !== 'support') return false;
      if (activeFilter === 'announcements' && n.category !== 'announcements') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (n.title || '').toLowerCase().includes(q);
        const messageMatch = (n.message || '').toLowerCase().includes(q);
        if (!titleMatch && !messageMatch) return false;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<'Today' | 'Yesterday' | 'Earlier', Notification[]> = {
      Today: [],
      Yesterday: [],
      Earlier: [],
    };
    filteredNotifications.forEach((n) => {
      const bucket = getDateBucket(n.timestamp);
      groups[bucket].push(n);
    });
    return groups;
  }, [filteredNotifications]);

  const handleItemClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.target) {
      navigate(n.target);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Go back"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {t('Notifications') || 'Notification Center'}
              </h1>
              {unreadCount > 0 && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time platform events, transactional alerts, and inventory triggers.
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              toggleSound();
              if (!soundEnabled) previewSound('notification');
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'
            }`}
            title={soundEnabled ? 'Sound is on (Click to mute)' : 'Sound is off (Click to enable)'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-indigo-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span>{soundEnabled ? 'Audio On' : 'Muted'}</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleRefresh}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark all read</span>
            </button>
          )}

          {/* Clear all */}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={clearAll}
              className="px-3 py-2 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'unread', label: `Unread (${unreadCount})` },
            { id: 'sales', label: 'Sales' },
            { id: 'inventory', label: 'Inventory' },
            { id: 'finance', label: 'Finance' },
            { id: 'system', label: 'System' },
            { id: 'announcements', label: 'Announcements' },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setActiveFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                activeFilter === f.id
                  ? 'bg-slate-900 text-white dark:bg-indigo-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search alerts..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-white"
          />
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {isLoading && notifications.length === 0 ? (
          <div className="p-8 space-y-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-4 p-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="p-16 text-center flex flex-col items-center justify-center text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
              <Sparkles className="w-7 h-7 text-indigo-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              {activeFilter === 'unread' ? 'All caught up!' : 'No notifications found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {searchQuery
                ? `No alerts matching "${searchQuery}".`
                : 'Transactions, low stock alerts, and platform notifications will appear here in real time.'}
            </p>
          </div>
        ) : (
          (['Today', 'Yesterday', 'Earlier'] as const).map((bucket) => {
            const items = groupedNotifications[bucket];
            if (!items.length) return null;

            return (
              <div key={bucket} className="divide-y divide-slate-100 dark:divide-slate-800/80">
                <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/80 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200/80 dark:border-slate-800 sticky top-0 z-10 flex items-center justify-between">
                  <span>{bucket}</span>
                  <span className="text-[10px] font-bold text-slate-400">{items.length} alerts</span>
                </div>

                {items.map((n) => {
                  const visual = getNotificationVisuals(n);
                  const Icon = visual.icon;

                  return (
                    <div
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      className={`relative group p-4 sm:p-5 transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                        n.read
                          ? 'bg-white hover:bg-slate-50/80 dark:bg-slate-900 dark:hover:bg-slate-800/70 text-slate-600 dark:text-slate-300'
                          : 'bg-indigo-50/40 hover:bg-indigo-50/70 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 text-slate-900 dark:text-slate-100 font-medium'
                      }`}
                    >
                      {/* Category Icon */}
                      <div className={`p-3 rounded-2xl border shrink-0 shadow-2xs group-hover:scale-105 transition-transform ${visual.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pr-10">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border tracking-wider ${visual.badgeClass}`}>
                            {visual.badge}
                          </span>
                          <h4 className={`text-sm truncate ${n.read ? 'font-semibold text-slate-800 dark:text-slate-200' : 'font-bold text-slate-900 dark:text-white'}`}>
                            {n.title}
                          </h4>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                          {n.message}
                        </p>

                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-400 dark:text-slate-500">
                          <span>{formatTimeAgo(n.timestamp)}</span>
                          {n.target && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600 dark:text-indigo-400 font-bold group-hover:underline flex items-center gap-0.5">
                                Go to feature <ChevronRight className="w-3 h-3" />
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Unread indicator */}
                      {!n.read && (
                        <span className="absolute top-5 right-12 w-2.5 h-2.5 rounded-full bg-indigo-600 dark:bg-indigo-400 ring-4 ring-indigo-100 dark:ring-indigo-950 shrink-0" />
                      )}

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeNotification(n.id);
                        }}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                        title="Delete notification"
                        aria-label="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
