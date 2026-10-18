import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  X, ExternalLink, Sparkles, AlertTriangle, Info, CheckCircle2, 
  Megaphone, ArrowRight, ShieldCheck, Flame, ChevronRight
} from 'lucide-react';
import { authFetch } from '../lib/apiClient';

export interface AnnouncementItem {
  id: string;
  title: string;
  message?: string;
  body?: string;
  type?: 'info' | 'update' | 'promotion' | 'warning' | 'maintenance' | string;
  format?: 'text' | 'image' | 'both' | string;
  imageUrl?: string;
  ctaText?: string;
  ctaLink?: string;
  displayMode?: 'both' | 'popup_only' | 'notification_only' | string;
  frequency?: 'once_per_user' | 'once_per_session' | 'until_dismissed' | string;
  audience?: string;
  startsAt?: string;
  endsAt?: string;
  active?: boolean;
}

interface AnnouncementPopupProps {
  user?: any;
}

export const AnnouncementPopup: React.FC<AnnouncementPopupProps> = ({ user }) => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  // Helper to check if an announcement is dismissed according to its frequency rule
  const isDismissed = (ann: AnnouncementItem): boolean => {
    try {
      const freq = ann.frequency || 'until_dismissed';
      if (freq === 'once_per_user') {
        const permanentDismissals = JSON.parse(localStorage.getItem('bizora_announcement_user_dismissed') || '[]');
        return permanentDismissals.includes(ann.id);
      }
      if (freq === 'once_per_session') {
        const sessionDismissals = JSON.parse(sessionStorage.getItem('bizora_announcement_session_dismissed') || '[]');
        return sessionDismissals.includes(ann.id);
      }
      // until_dismissed: check both session and temporary local dismissals
      const localDismissals = JSON.parse(localStorage.getItem('bizora_dismissed_announcements') || '[]');
      return localDismissals.includes(ann.id);
    } catch {
      return false;
    }
  };

  const markDismissed = (ann: AnnouncementItem) => {
    try {
      const freq = ann.frequency || 'until_dismissed';
      if (freq === 'once_per_user') {
        const permanentDismissals = JSON.parse(localStorage.getItem('bizora_announcement_user_dismissed') || '[]');
        if (!permanentDismissals.includes(ann.id)) {
          localStorage.setItem('bizora_announcement_user_dismissed', JSON.stringify([...permanentDismissals, ann.id]));
        }
      } else if (freq === 'once_per_session') {
        const sessionDismissals = JSON.parse(sessionStorage.getItem('bizora_announcement_session_dismissed') || '[]');
        if (!sessionDismissals.includes(ann.id)) {
          sessionStorage.setItem('bizora_announcement_session_dismissed', JSON.stringify([...sessionDismissals, ann.id]));
        }
      }
      // Always add to general dismissed list
      const localDismissals = JSON.parse(localStorage.getItem('bizora_dismissed_announcements') || '[]');
      if (!localDismissals.includes(ann.id)) {
        localStorage.setItem('bizora_dismissed_announcements', JSON.stringify([...localDismissals, ann.id]));
      }
    } catch (e) {
      console.warn('Failed to save announcement dismissal:', e);
    }
  };

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const fetchActive = async () => {
      try {
        const res = await authFetch('/api/announcements');
        if (!res.ok) return;
        const body = await res.json();
        const list: AnnouncementItem[] = body?.announcements || [];

        // Filter: active, not notification_only, and not dismissed
        const popupList = list.filter(item => {
          if (item.displayMode === 'notification_only') return false;
          return !isDismissed(item);
        });

        if (isMounted && popupList.length > 0) {
          setAnnouncements(popupList);
          setCurrentIndex(0);
          setIsVisible(true);
        }
      } catch (err) {
        console.warn('Failed to load popup announcements:', err);
      }
    };

    fetchActive();
    return () => { isMounted = false; };
  }, [user]);

  // Current announcement being shown
  const currentAnnouncement = announcements[currentIndex];

  const handleClose = () => {
    if (!currentAnnouncement) return;
    markDismissed(currentAnnouncement);

    if (currentIndex + 1 < announcements.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsVisible(false);
    }
  };

  const handleActionClick = () => {
    if (!currentAnnouncement) return;
    markDismissed(currentAnnouncement);
    setIsVisible(false);

    if (currentAnnouncement.ctaLink) {
      const link = currentAnnouncement.ctaLink.trim();
      if (link.startsWith('http://') || link.startsWith('https://')) {
        window.open(link, '_blank', 'noopener,noreferrer');
      } else {
        navigate(link);
      }
    }
  };

  if (!isVisible || !currentAnnouncement) {
    return null;
  }

  const getTypeTheme = (type?: string) => {
    switch (type) {
      case 'update':
        return {
          badge: 'New Update',
          badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
          gradient: 'from-purple-600 to-indigo-600',
          icon: Sparkles,
        };
      case 'promotion':
        return {
          badge: 'Special Offer',
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          gradient: 'from-emerald-600 to-teal-600',
          icon: Flame,
        };
      case 'warning':
        return {
          badge: 'Important Notice',
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          gradient: 'from-amber-500 to-orange-600',
          icon: AlertTriangle,
        };
      case 'maintenance':
        return {
          badge: 'Maintenance',
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
          gradient: 'from-rose-600 to-red-600',
          icon: AlertTriangle,
        };
      default:
        return {
          badge: 'Announcement',
          badgeClass: 'bg-sky-50 text-sky-700 border-sky-200',
          gradient: 'from-sky-600 to-blue-600',
          icon: Megaphone,
        };
    }
  };

  const theme = getTypeTheme(currentAnnouncement.type);
  const TypeIcon = theme.icon;
  const messageText = currentAnnouncement.body || currentAnnouncement.message || '';

  return (
    <div 
      className="fixed inset-0 z-[120] bg-slate-950/65 backdrop-blur-sm flex items-end sm:items-center justify-center p-3 sm:p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="announcement-modal-title"
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 slide-in-from-bottom-6 duration-300"
      >
        {/* Banner Graphic Header if present */}
        {currentAnnouncement.imageUrl ? (
          <div className="relative h-44 sm:h-52 w-full bg-slate-900 overflow-hidden shrink-0">
            <img 
              src={currentAnnouncement.imageUrl} 
              alt={currentAnnouncement.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-black/30" />
            
            {/* Close Button on Banner */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close announcement"
              className="absolute top-3.5 right-3.5 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white backdrop-blur-md transition-all border border-white/20"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Type badge on banner */}
            <div className="absolute bottom-3.5 left-4 flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 backdrop-blur-md text-slate-900 shadow-md flex items-center gap-1.5">
                <TypeIcon className="w-3 h-3 text-indigo-600" />
                {theme.badge}
              </span>
              {announcements.length > 1 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-black/50 text-white/90 border border-white/20 backdrop-blur-sm">
                  {currentIndex + 1} of {announcements.length}
                </span>
              )}
            </div>
          </div>
        ) : (
          /* Top bar without banner image */
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border flex items-center gap-1.5 ${theme.badgeClass}`}>
                <TypeIcon className="w-3 h-3" />
                {theme.badge}
              </span>
              {announcements.length > 1 && (
                <span className="text-[10px] font-bold text-slate-400">
                  ({currentIndex + 1}/{announcements.length})
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close announcement"
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4">
          <h2 
            id="announcement-modal-title"
            className="text-lg sm:text-xl font-black text-slate-900 leading-snug tracking-tight"
          >
            {currentAnnouncement.title}
          </h2>

          <div className="text-xs sm:text-sm text-slate-600 leading-relaxed space-y-2 whitespace-pre-line">
            {messageText}
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-2.5 shrink-0">
          {currentAnnouncement.ctaText && (
            <button
              type="button"
              onClick={handleActionClick}
              className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/25 transition-all"
            >
              <span>{currentAnnouncement.ctaText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className={`w-full ${currentAnnouncement.ctaText ? 'sm:w-auto px-4' : 'sm:flex-1'} py-3 rounded-xl border border-slate-200 hover:bg-white text-slate-600 hover:text-slate-900 text-xs font-bold transition-colors`}
          >
            {currentAnnouncement.ctaText ? 'Dismiss' : 'Got it, thanks!'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementPopup;
