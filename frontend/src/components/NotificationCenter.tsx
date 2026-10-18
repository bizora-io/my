import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, X, Check, CheckCheck, Trash2, Info, AlertTriangle, 
  CheckCircle, AlertCircle, ShoppingBag, Package, Wallet, 
  HeadphonesIcon, Shield, Sparkles, Filter, ChevronRight, Megaphone
} from 'lucide-react';
import { useNotifications, Notification, NotificationType, NotificationCategory } from '../contexts/NotificationContext';

const getNotificationVisuals = (notif: Notification) => {
  const cat = notif.category || 'general';
  const type = notif.type || 'info';

  if (cat === 'sales') {
    return {
      icon: ShoppingBag,
      color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      badge: 'Sale',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
    };
  }
  if (cat === 'inventory') {
    return {
      icon: Package,
      color: 'text-amber-600 bg-amber-50 border-amber-100',
      badge: 'Stock',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
    };
  }
  if (cat === 'finance') {
    return {
      icon: Wallet,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      badge: 'Finance',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200'
    };
  }
  if (cat === 'support') {
    return {
      icon: HeadphonesIcon,
      color: 'text-purple-600 bg-purple-50 border-purple-100',
      badge: 'Support',
      badgeClass: 'bg-purple-50 text-purple-700 border-purple-200'
    };
  }
  if (cat === 'announcements') {
    return {
      icon: Megaphone,
      color: 'text-sky-600 bg-sky-50 border-sky-100',
      badge: 'Announcement',
      badgeClass: 'bg-sky-50 text-sky-700 border-sky-200'
    };
  }
  if (cat === 'subscription') {
    return {
      icon: Shield,
      color: 'text-indigo-600 bg-indigo-50 border-indigo-100',
      badge: 'Subscription',
      badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200'
    };
  }
  if (cat === 'system') {
    return {
      icon: Shield,
      color: 'text-slate-600 bg-slate-50 border-slate-100',
      badge: 'System',
      badgeClass: 'bg-slate-50 text-slate-700 border-slate-200'
    };
  }

  // Fallback by type
  switch (type) {
    case 'warning':
      return {
        icon: AlertTriangle,
        color: 'text-amber-600 bg-amber-50 border-amber-100',
        badge: 'Warning',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
      };
    case 'error':
      return {
        icon: AlertCircle,
        color: 'text-rose-600 bg-rose-50 border-rose-100',
        badge: 'Alert',
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200'
      };
    case 'success':
      return {
        icon: CheckCircle,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
        badge: 'Done',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      };
    default:
      return {
        icon: Info,
        color: 'text-slate-600 bg-slate-100 border-slate-200',
        badge: 'Info',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
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
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const getDateBucket = (dateParam: Date | string): 'Today' | 'Yesterday' | 'Earlier' => {
  const d = new Date(dateParam);
  if (isNaN(d.getTime())) return 'Earlier';
  const now = new Date();
  
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return 'Today';

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';

  return 'Earlier';
};

const NotificationCenter: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification, clearAll } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'announcements' | 'subscription' | 'sales' | 'inventory' | 'finance' | 'system'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside on desktop
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Lock body scroll on mobile drawer
  useEffect(() => {
    if (isOpen && window.innerWidth < 768) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const filteredNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (activeFilter === 'unread') return !n.read;
      if (activeFilter === 'announcements') return n.category === 'announcements';
      if (activeFilter === 'subscription') return n.category === 'subscription';
      if (activeFilter === 'sales') return n.category === 'sales';
      if (activeFilter === 'inventory') return n.category === 'inventory';
      if (activeFilter === 'finance') return n.category === 'finance';
      if (activeFilter === 'system') return n.category === 'system' || n.category === 'support';
      return true;
    });
  }, [notifications, activeFilter]);

  const groupedNotifications = useMemo(() => {
    const groups: Record<'Today' | 'Yesterday' | 'Earlier', Notification[]> = {
      Today: [],
      Yesterday: [],
      Earlier: []
    };

    filteredNotifications.forEach(n => {
      const bucket = getDateBucket(n.timestamp);
      groups[bucket].push(n);
    });

    return groups;
  }, [filteredNotifications]);

  const handleNotificationClick = (n: Notification) => {
    markAsRead(n.id);
    if (n.target) {
      navigate(n.target);
      setIsOpen(false);
    }
  };

  const renderNotificationItem = (n: Notification) => {
    const visual = getNotificationVisuals(n);
    const Icon = visual.icon;

    return (
      <div 
        key={n.id}
        onClick={() => handleNotificationClick(n)}
        className={`relative group p-3.5 transition-all duration-200 cursor-pointer flex items-start gap-3 border-b border-slate-100 last:border-b-0 ${
          n.read 
            ? 'bg-white hover:bg-slate-50/80 text-slate-600' 
            : 'bg-indigo-50/30 hover:bg-indigo-50/60 text-slate-900 font-medium'
        }`}
      >
        {/* Category Icon */}
        <div className={`p-2 rounded-xl border shrink-0 transition-transform group-hover:scale-105 shadow-2xs ${visual.color}`}>
          <Icon className="w-4 h-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border tracking-wider ${visual.badgeClass}`}>
              {visual.badge}
            </span>
            <p className={`text-xs truncate ${n.read ? 'font-semibold text-slate-800' : 'font-bold text-slate-900'}`}>
              {n.title}
            </p>
          </div>

          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
            {n.message}
          </p>

          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
            <span>{formatTimeAgo(n.timestamp)}</span>
            {n.target && (
              <>
                <span>•</span>
                <span className="text-indigo-600 font-semibold group-hover:underline flex items-center gap-0.5">
                  View <ChevronRight className="w-2.5 h-2.5" />
                </span>
              </>
            )}
          </div>
        </div>

        {/* Unread indicator */}
        {!n.read && (
          <span className="absolute top-4 right-3.5 w-2 h-2 rounded-full bg-indigo-600 ring-4 ring-indigo-100 shrink-0" />
        )}

        {/* Dismiss button */}
        <button 
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            removeNotification(n.id);
          }}
          className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger */}
      <button 
        type="button"
        id="notification-bell-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Open notifications"
        aria-expanded={isOpen}
        className={`p-2.5 rounded-xl border transition-all duration-200 relative ${
          isOpen 
            ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-xs' 
            : 'bg-white border-slate-200/90 text-slate-600 hover:bg-slate-50 hover:border-slate-300 hover:text-slate-800 shadow-2xs'
        }`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-rose-600 text-white text-[9px] font-black shadow-xs ring-2 ring-white animate-in zoom-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* --- DESKTOP DROPDOWN --- */}
      {isOpen && (
        <div className="hidden md:block absolute right-0 mt-2.5 w-[420px] max-h-[580px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-[0_20px_50px_rgba(15,23,42,0.15)] border border-slate-200/90 z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/80">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-sm tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button 
                  type="button"
                  onClick={markAllAsRead}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                  title="Mark all as read"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Mark all read</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button 
                  type="button"
                  onClick={clearAll}
                  className="text-xs font-semibold text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
                  title="Clear all"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All' },
              { id: 'unread', label: `Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}` },
              { id: 'announcements', label: 'Announcements' },
              { id: 'subscription', label: 'Plans' },
              { id: 'sales', label: 'Sales' },
              { id: 'inventory', label: 'Stock' },
              { id: 'finance', label: 'Finance' },
              { id: 'system', label: 'System' },
            ].map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
                  activeFilter === f.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-100/70'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Notifications Scrollable List */}
          <div className="flex-1 overflow-y-auto max-h-[440px] custom-scrollbar divide-y divide-slate-100">
            {filteredNotifications.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                  <Sparkles className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-slate-700">
                  {activeFilter === 'unread' ? 'All caught up!' : 'No notifications'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-[220px]">
                  {activeFilter === 'unread' 
                    ? 'You have read all notifications in this view.' 
                    : 'New transactions, stock alerts, and updates will show up here.'}
                </p>
              </div>
            ) : (
              (['Today', 'Yesterday', 'Earlier'] as const).map(bucket => {
                const items = groupedNotifications[bucket];
                if (!items.length) return null;

                return (
                  <div key={bucket} className="bg-white">
                    <div className="px-4 py-1.5 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 sticky top-0 z-10">
                      {bucket}
                    </div>
                    {items.map(renderNotificationItem)}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- MOBILE FULL DRAWER / BOTTOM SHEET --- */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-[120]">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setIsOpen(false)}
          />

          {/* Sliding Bottom Sheet */}
          <div className="fixed inset-x-0 bottom-0 max-h-[85vh] bg-white rounded-t-3xl shadow-2xl flex flex-col border-t border-slate-200 z-10 animate-in slide-in-from-bottom duration-300 pb-mobile-dock">
            
            {/* Grab handle */}
            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-2.5 shrink-0" />

            {/* Mobile Header */}
            <div className="px-4 pb-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-base">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button 
                    type="button"
                    onClick={markAllAsRead}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 p-1.5"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-full"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Mobile Filter Chips */}
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {[
                { id: 'all', label: 'All' },
                { id: 'unread', label: `Unread ${unreadCount > 0 ? `(${unreadCount})` : ''}` },
                { id: 'sales', label: 'Sales' },
                { id: 'inventory', label: 'Stock' },
                { id: 'finance', label: 'Finance' },
                { id: 'system', label: 'System' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 ${
                    activeFilter === f.id
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Mobile List Content */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 custom-scrollbar">
              {filteredNotifications.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">
                    {activeFilter === 'unread' ? 'All caught up!' : 'No notifications'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                    {activeFilter === 'unread' 
                      ? 'You have read all notifications.' 
                      : 'New sales, stock alerts, and updates will show up here.'}
                  </p>
                </div>
              ) : (
                (['Today', 'Yesterday', 'Earlier'] as const).map(bucket => {
                  const items = groupedNotifications[bucket];
                  if (!items.length) return null;

                  return (
                    <div key={bucket} className="bg-white">
                      <div className="px-4 py-1.5 bg-slate-50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100 sticky top-0 z-10">
                        {bucket}
                      </div>
                      {items.map(renderNotificationItem)}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
