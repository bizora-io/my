import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, Lock } from 'lucide-react';

export const DesktopSidebarItem: React.FC<{
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  active?: boolean;
  onClick?: (e: any) => void;
  collapsed?: boolean;
  isLocked?: boolean;
  badge?: string;
  badgeColor?: string;
  adminAppUrl?: string;
  onWarm?: () => void;
}> = ({ to, icon: Icon, label, active, onClick, collapsed, isLocked, badge, badgeColor, adminAppUrl, onWarm }) => {
  const navigate = useNavigate();
  const isAdminPath = typeof to === 'string' && to.startsWith('/admin');
  const handleClick = (e: any) => {
    if (isLocked) {
      e.preventDefault();
      e.stopPropagation();
      alert(`The feature "${label}" is locked under your current plan. Please upgrade your subscription to unlock it!`);
      navigate('/subscription');
      return;
    }
    if (onClick) onClick(e);
  };

  const linkId = `sidebar-link-${label.toLowerCase().replace(/\W+/g, '-')}`;
  const goesToAdminApp = !isLocked && isAdminPath;
  const LinkTag: any = goesToAdminApp ? 'a' : Link;
  const linkProps = goesToAdminApp
    ? { href: `${adminAppUrl || ''}${to}` }
    : { to: isLocked ? '#' : to };

  return (
    <LinkTag 
      {...linkProps}
      onClick={handleClick}
      onMouseEnter={onWarm}
      onFocus={onWarm}
      id={linkId}
      className={`flex items-center justify-between px-3 py-2 mx-1.5 rounded-xl group relative overflow-visible select-none transition-all duration-200 ease-out ${
          isLocked
          ? 'text-slate-500/70 hover:text-slate-400 hover:bg-white/5 cursor-not-allowed opacity-75'
          : active 
            ? 'bg-gradient-to-r from-indigo-600/40 to-indigo-500/20 text-white font-semibold shadow-[0_0_20px_rgba(99,102,241,0.25)] ring-1 ring-indigo-400/30 backdrop-blur-md translate-x-1' 
            : 'text-slate-300 hover:text-white hover:bg-white/10 hover:backdrop-blur-xs hover:translate-x-0.5'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 transition-all duration-200 ${
            isLocked
              ? 'bg-transparent'
              : active
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'bg-white/5 text-slate-400 group-hover:bg-white/15 group-hover:text-white'
          }`}>
          <Icon className="w-4 h-4 flex-shrink-0" />
        </span>
        {!collapsed && (
          <span className="truncate text-xs tracking-tight">
            {label}
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          {isLocked ? (
            <span className="flex items-center gap-0.5 text-[9px] font-medium text-amber-300 bg-amber-500/15 border border-amber-400/30 px-1.5 py-0.5 rounded-md shadow-xs">
              <Lock className="w-2.5 h-2.5" />
              <span>PRO</span>
            </span>
          ) : badge ? (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badgeColor || 'bg-indigo-500/30 text-indigo-200'}`}>
              {badge}
            </span>
          ) : null}
        </div>
      )}

      {/* Collapsed Tooltip */}
      {collapsed && (
        <div className="pointer-events-none absolute left-full ml-3 px-2.5 py-1 bg-slate-900/95 text-white text-xs rounded-lg shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 flex items-center gap-1.5">
          <span>{label}</span>
          {isLocked && <Lock className="w-3 h-3 text-amber-400" />}
          {badge && <span className="text-[10px] opacity-75">({badge})</span>}
        </div>
      )}
    </LinkTag>
  );
};

export const MobileMenuItem: React.FC<{
  to: string;
  icon: React.ComponentType<any>;
  label: string;
  onClick?: (e: any) => void;
  description?: string;
  badge?: string;
  badgeColor?: string;
  active?: boolean;
  isLocked?: boolean;
  adminAppUrl?: string;
}> = ({ to, icon: Icon, label, onClick, description, badge, badgeColor, active, isLocked, adminAppUrl }) => {
  const navigate = useNavigate();
  const isAdminPath = typeof to === 'string' && to.startsWith('/admin');
  const handleClick = (e: any) => {
    if (isLocked) {
      e.preventDefault();
      e.stopPropagation();
      alert(`The feature "${label}" is locked under your current plan. Please upgrade to unlock it!`);
      navigate('/subscription');
      return;
    }
    if (onClick) onClick(e);
  };

  const goesToAdmin = !isLocked && isAdminPath;
  const Tag: any = goesToAdmin ? 'a' : Link;
  const props = goesToAdmin ? { href: `${adminAppUrl || ''}${to}` } : { to: isLocked ? '#' : to };

  return (
    <Tag
      {...props}
      onClick={handleClick}
      className={`flex items-start gap-3 p-3 rounded-2xl transition-all duration-200 ${
        isLocked
          ? 'opacity-60 bg-slate-50/50 dark:bg-slate-800/20'
          : active
            ? 'bg-gradient-to-r from-indigo-500/15 via-indigo-500/10 to-transparent border-l-4 border-indigo-600 dark:border-indigo-400 pl-3'
            : 'hover:bg-slate-100/70 dark:hover:bg-slate-800/40 active:scale-[0.99]'
      }`}
    >
      <div className={`p-2.5 rounded-xl shrink-0 transition-colors ${
        active 
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20' 
          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
      }`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold truncate ${
            active ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-800 dark:text-slate-100'
          }`}>
            {label}
          </span>
          {isLocked && (
            <span className="flex items-center gap-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-md border border-amber-300/60 dark:border-amber-700/60">
              <Lock className="w-2.5 h-2.5" /> PRO
            </span>
          )}
          {badge && !isLocked && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${badgeColor || 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'}`}>
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
            {description}
          </p>
        )}
      </div>
    </Tag>
  );
};

export const SectionHeader: React.FC<{ 
  label: string; 
  collapsed?: boolean; 
  isOpen?: boolean; 
  onToggle?: () => void; 
  count?: number; 
}> = ({ label, collapsed, isOpen, onToggle, count }) => {
    if (collapsed) {
        return (
            <div className="px-4 py-2 flex justify-center">
                <div className="w-6 h-[1px] bg-slate-800/60" />
            </div>
        );
    }
    if (onToggle) {
        return (
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center justify-between px-3 mt-4 mb-1.5 py-1 text-[10px] font-bold text-slate-400 hover:text-slate-200 uppercase tracking-wider select-none group transition-colors focus:outline-none"
            >
                <span className="flex items-center gap-1.5 truncate">
                    <span className="truncate">{label}</span>
                    {typeof count === 'number' && (
                        <span className="text-[9px] font-semibold text-slate-500 group-hover:text-slate-300 bg-white/5 px-1.5 py-0.2 rounded-full">
                            {count}
                        </span>
                    )}
                </span>
                <ChevronDown
                    className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 shrink-0 ${
                        isOpen ? 'rotate-0' : '-rotate-90'
                    }`}
                />
            </button>
        );
    }
    return (
        <div className="px-5 mt-6 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest select-none animate-in fade-in duration-300">
            {label}
        </div>
    );
};
