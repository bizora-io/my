
import { subscribeOfflineQueue, subscribeOfflineConflicts, flushOfflineQueue, getOfflineQueueCount, getOfflineConflicts, clearOfflineConflicts } from './lib/offlineQueue';
import { getSubscriptionView } from './lib/subscriptionStatus';
import { collectExpiryAlerts, expiryAlertTotals } from '@shared/lib/expiryAlerts';
import { collectDueReminders, dueReminderTotals } from '@shared/lib/dueReminders';
import { useBackupOnlineSync } from './hooks/useBackupOnlineSync';
import { useAutoBackup } from './hooks/useAutoBackup';
import React, { useState, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ShoppingCart, ShoppingBag, Zap, ClipboardList, FileText, 
  BookOpen, DollarSign, Users, Box, Package, Printer, Megaphone, Globe, 
  Trash2, Menu, X, Bot, Settings, UserCircle, Video, ShieldCheck, Search, 
  ArrowRightLeft, Store, Shield, Crown, LogOut, RotateCcw, Briefcase, CheckCircle,
  Factory, ChevronLeft, ChevronRight, Home, Grid, MoreHorizontal, Wallet, MessageSquare, ChevronDown, Image, HeadphonesIcon, WifiOff, Cloud, Wifi, AlertCircle, Sparkles, Lightbulb, TrendingUp,
  Award, Star, Smartphone, CreditCard, Mail, Lock, Database, Key, Server, Activity, CalendarClock, ChefHat, Bell, Tags, Building, UserCheck,
  Sun, Moon, AlertTriangle, FileSpreadsheet, Landmark, Hotel as HotelIcon, PiggyBank, Truck, FolderGit2, ScanText
} from 'lucide-react';
import {
  getAuthorizedNavGroups,
  NAV_GROUPS,
  getNavIcon,
  getNavBreadcrumbs,
  PATH_TO_NAV_ITEM,
  PATH_TO_NAV_GROUP,
  searchNavigation,
  NavItemConfig,
  NavGroupConfig
} from './config/navigation';
const Catalog = lazy(() => import('./components/Catalog'));
const Wastage = lazy(() => import('./components/Wastage'));
const LetterOfCredit = lazy(() => import('./components/LetterOfCredit'));
const Loans = lazy(() => import('./components/Loans'));
const Hotel = lazy(() => import('./components/Hotel'));
const ProvidentFund = lazy(() => import('./components/ProvidentFund'));
const Eprocurement = lazy(() => import('./components/Eprocurement'));
const Vehicles = lazy(() => import('./components/Vehicles'));
const Visitors = lazy(() => import('./components/Visitors'));
const Projects = lazy(() => import('./components/Projects'));
const Dealers = lazy(() => import('./components/Dealers'));
const DocumentAi = lazy(() => import('./components/DocumentAi'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const CustomerSupport = lazy(() => import('./components/CustomerSupport'));
const ProductTransfer = lazy(() => import('./components/ProductTransfer'));
const ProductList = lazy(() => import('./components/ProductList'));
const ProductAttributes = lazy(() => import('./components/ProductAttributes'));
const StoreManagement = lazy(() => import('./components/StoreManagement'));
const Subscription = lazy(() => import('./components/Subscription'));
const NotificationCenter = lazy(() => import('./components/NotificationCenter'));
const Buy = lazy(() => import('./components/Buy'));
const Sell = lazy(() => import('./components/Sell'));
const SalesReturn = lazy(() => import('./components/SalesReturn'));
const PurchaseReturn = lazy(() => import('./components/PurchaseReturn'));
const QuotationPage = lazy(() => import('./components/Quotation'));
const InstallmentLedger = lazy(() => import('./components/InstallmentLedger'));
const KitchenDisplay = lazy(() => import('./components/KitchenDisplay'));
const PurchaseOrderPage = lazy(() => import('./components/PurchaseOrder'));
const DepartmentDesignation = lazy(() => import('./components/DepartmentDesignation'));
const Cashbox = lazy(() => import('./components/Cashbox'));
const QuickSale = lazy(() => import('./components/QuickSale'));
const Communication = lazy(() => import('./components/Communication'));
const RecycleBin = lazy(() => import('./components/RecycleBin'));
const BusinessReports = lazy(() => import('./components/BusinessReports'));
const Consolidation = lazy(() => import('./components/Consolidation'));
const Journal = lazy(() => import('./components/Journal'));
const OnlinePayments = lazy(() => import('./components/OnlinePayments'));
const StockReport = lazy(() => import('./components/StockReport'));
const LotEnquiry = lazy(() => import('./components/LotEnquiry'));
const SettingsPage = lazy(() => import('./components/SettingsPage'));
const PrinterConfig = lazy(() => import('./components/PrinterConfig'));
const AppAccess = lazy(() => import('./components/AppAccess'));
const OnlineShop = lazy(() => import('./components/OnlineShop'));
const StorefrontPublic = lazy(() => import('./components/StorefrontPublic'));
const Marketing = lazy(() => import('./components/Marketing'));
const EmployeeManagement = lazy(() => import('./components/EmployeeManagement'));
const Production = lazy(() => import('./components/Production'));
const Customers = lazy(() => import('./components/Customers'));
const Suppliers = lazy(() => import('./components/Suppliers'));
const AIChat = lazy(() => import('./components/AIChat').then(m => ({ default: m.AIChat })));
const PurchaseLedger = lazy(() => import('./components/Ledgers').then(m => ({ default: m.PurchaseLedger })));
const SaleLedger = lazy(() => import('./components/Ledgers').then(m => ({ default: m.SaleLedger })));
const DueLedger = lazy(() => import('./components/Ledgers').then(m => ({ default: m.DueLedger })));
const ExpenseLedger = lazy(() => import('./components/Ledgers').then(m => ({ default: m.ExpenseLedger })));
const NotFound = lazy(() => import('./components/NotFound'));
const LandingPage = lazy(() => import('./components/landing/LandingPage'));
const PortalLogin = lazy(() => import('./components/portal/PortalLogin'));
const LegalRouter = lazy(() => import('./components/legal/LegalRouter'));
import { CookieBanner } from './components/legal/CookieBanner';
import { SEOHead } from './components/common/SEOHead';
import { detectCurrentPortal, PortalType } from './lib/domainRouter';
import { Auth } from './components/Auth';
import { CustomerPortal } from './components/CustomerPortal';
import { EmployeePortal } from './components/EmployeePortal';
import { SupplierPortal } from './components/SupplierPortal';
import { InactivityTimer } from './components/InactivityTimer';
import { AppLanguage, Currency, UserRole } from './types';
import { SoundProvider } from './contexts/SoundContext';
import { SettingsProvider, useSettings, CURRENCY_SYMBOLS } from './contexts/SettingsContext';
import { NotificationProvider, useNotifications } from './contexts/NotificationContext';
import { StoreProvider, useStores } from './contexts/StoreContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { authFetch, getAdminPortalUrl } from './lib/apiClient';
import { DataProvider, useData } from './contexts/DataContext';
import { PERMISSIONS, hasPermission, canAccessPermission, hasOperationalPermissions, isFullAccessRole } from './utils/permissions';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import { OnboardingTour } from './components/OnboardingTour';
import { AnnouncementPopup } from './components/AnnouncementPopup';
import { APP_VERSION } from '@shared/lib/appVersion';



class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; resetKey: number }
> {
  props!: { children?: React.ReactNode };
  setState!: (updater: any) => void;
  state: { error: Error | null; resetKey: number } = { error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Route render error:', error, info);
  }

  softRetry = () => {
    this.setState((s) => ({ error: null, resetKey: s.resetKey + 1 }));
  };

  hardReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      const msg = this.state.error.message || 'Unknown error';
      const isChunk =
        /Failed to fetch dynamically imported module|Loading chunk|ChunkLoadError|importing a module script failed/i.test(
          msg
        );
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 px-6 text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center text-xl font-black">!</div>
          <p className="text-sm font-bold text-slate-800">
            {isChunk ? 'Could not load this page' : 'This page failed to load'}
          </p>
          <p className="text-xs text-slate-500 max-w-sm">
            {isChunk
              ? 'Network glitch or an app update. Retry, or reload if it keeps failing.'
              : msg}
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
              onClick={this.softRetry}
            >
              Retry
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold"
              onClick={this.hardReload}
            >
              Reload app
            </button>
            <a href="#/" className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">
              Go Home
            </a>
          </div>
        </div>
      );
    }
    return <React.Fragment key={this.state.resetKey}>{this.props.children}</React.Fragment>;
  }
}


/** Map path → dynamic import for hover/focus prefetch (warm the chunk). */
const ROUTE_PREFETCH: Record<string, () => Promise<unknown>> = {
  '/stock': () => import('./components/StockReport'),
  '/products': () => import('./components/ProductList'),
  '/customers': () => import('./components/Customers'),
  '/suppliers': () => import('./components/Suppliers'),
  '/cashbox': () => import('./components/Cashbox'),
  '/reports': () => import('./components/BusinessReports'),
  '/journal': () => import('./components/Journal'),
  '/settings': () => import('./components/SettingsPage'),
  '/shop': () => import('./components/OnlineShop'),
  '/employees': () => import('./components/EmployeeManagement'),
  '/sale-ledger': () => import('./components/Ledgers'),
  '/purchase-ledger': () => import('./components/Ledgers'),
  '/due-ledger': () => import('./components/Ledgers'),
  '/expense-ledger': () => import('./components/Ledgers'),
  '/sales-return': () => import('./components/SalesReturn'),
  '/purchase-return': () => import('./components/PurchaseReturn'),
  '/production': () => import('./components/Production'),
  '/transfer': () => import('./components/ProductTransfer'),
  '/subscription': () => import('./components/Subscription'),
  '/marketing': () => import('./components/Marketing'),
  '/communication': () => import('./components/Communication'),
  '/lots': () => import('./components/LotEnquiry'),
  '/catalog': () => import('./components/Catalog'),
  '/wastage': () => import('./components/Wastage'),
  '/lc': () => import('./components/LetterOfCredit'),
  '/loans': () => import('./components/Loans'),
  '/hotel': () => import('./components/Hotel'),
  '/pf': () => import('./components/ProvidentFund'),
  '/eprocurement': () => import('./components/Eprocurement'),
  '/vehicles': () => import('./components/Vehicles'),
  '/visitors': () => import('./components/Visitors'),
  '/projects': () => import('./components/Projects'),
  '/dealers': () => import('./components/Dealers'),
  '/document-ai': () => import('./components/DocumentAi'),
  '/bank-reconcile': () => import('./components/Cashbox'),
  '/audit-log': () => import('./components/SettingsPage'),
  '/audit': () => import('./components/SettingsPage'),
};

const prefetched = new Set<string>();
function prefetchRoute(to: string) {
  const path = (to || '').split('?')[0];
  if (!path || prefetched.has(path)) return;
  const loader = ROUTE_PREFETCH[path];
  if (!loader) return;
  prefetched.add(path);
  loader().catch(() => { prefetched.delete(path); });
}

function idlePrefetchCommonRoutes() {
  const paths = ['/stock', '/customers', '/cashbox', '/settings', '/reports', '/products'];
  const run = () => {
    paths.forEach((path, i) => {
      window.setTimeout(() => prefetchRoute(path), i * 400);
    });
  };
  if (typeof (window as any).requestIdleCallback === 'function') {
    (window as any).requestIdleCallback(() => run(), { timeout: 4000 });
  } else {
    window.setTimeout(run, 2000);
  }
}


const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 text-slate-400">
    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    <p className="text-xs font-semibold">Loading…</p>
  </div>
);

// --- Components for Navigation ---

// The Admin (SaaS) panel now lives in its own separately-deployed app.
// Any nav item pointing at /admin is opened there instead of via in-app routing.
const ADMIN_APP_URL: string = getAdminPortalUrl();
const isAdminPath = (to: string) => typeof to === 'string' && to.startsWith('/admin');

// The Admin (SaaS) panel is a separate deployed app now. Anything that used
// to route to /admin inside this app instead does a full browser redirect.
const ExternalAdminRedirect: React.FC = () => {
  useEffect(() => {
    window.location.href = `${ADMIN_APP_URL}/admin${window.location.search || ''}`;
  }, []);
  return (
    <div className="flex items-center justify-center h-full w-full text-slate-500 text-sm">
      Redirecting to the Admin app...
    </div>
  );
};

const DesktopSidebarItem = ({ to, icon: Icon, label, active, onClick, collapsed, isLocked, badge, badgeColor }: any) => {
  const navigate = useNavigate();
  const warm = () => { if (!isLocked && !isAdminPath(to)) prefetchRoute(to); };
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
  const goesToAdminApp = !isLocked && isAdminPath(to);
  const LinkTag: any = goesToAdminApp ? 'a' : Link;
  const linkProps = goesToAdminApp
    ? { href: `${ADMIN_APP_URL}${to}` }
    : { to: isLocked ? '#' : to };

  return (
    <LinkTag 
      {...linkProps}
      onClick={handleClick}
      onMouseEnter={warm}
      onFocus={warm}
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
          <span className={`font-medium text-xs tracking-wide truncate ${isLocked ? 'text-slate-500 group-hover:text-slate-400' : active ? 'text-white font-bold' : 'text-slate-300'}`}>
            {label}
          </span>
        )}
      </div>

      {!collapsed && (
        <div className="flex items-center gap-1 shrink-0 ml-1">
          {badge && !isLocked && (
            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${badgeColor || 'bg-indigo-500/20 text-indigo-200'}`}>
              {badge}
            </span>
          )}
          {isLocked && (
            <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-400" />
          )}
        </div>
      )}
      
      {collapsed && (
        <div className="absolute left-16 bg-slate-900 text-slate-100 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700/80 shadow-2xl pointer-events-none z-50 whitespace-nowrap opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 ease-out flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-indigo-400" />
          <span>{label}</span>
          {isLocked && <Lock className="w-3 h-3 text-amber-400" />}
          {badge && !isLocked && <span className="text-[9px] px-1 py-0.2 bg-indigo-600 rounded text-white">{badge}</span>}
        </div>
      )}
    </LinkTag>
  );
};

const MobileMenuItem = ({ to, icon: Icon, label, onClick, description, badge, badgeColor, active, isLocked }: any) => {
  const goesToAdminApp = isAdminPath(to);
  const LinkTag: any = goesToAdminApp ? 'a' : Link;
  const linkProps = goesToAdminApp ? { href: `${ADMIN_APP_URL}${to}` } : { to: isLocked ? '#' : to };
  const warm = () => { if (!goesToAdminApp && !isLocked) prefetchRoute(to); };
  
  const handleClick = (e: any) => {
    if (isLocked) {
      e.preventDefault();
      e.stopPropagation();
      alert(`The feature "${label}" is locked under your current plan. Please upgrade your subscription to unlock it!`);
      return;
    }
    if (onClick) onClick(e);
  };

  return (
    <LinkTag 
      {...linkProps} 
      onClick={handleClick} 
      onMouseEnter={warm} 
      onFocus={warm} 
      onTouchStart={warm} 
      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all select-none min-h-[50px] ${
        active 
          ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold shadow-xs' 
          : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 hover:border-indigo-200'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
          active ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
        }`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 text-left">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs sm:text-sm font-bold truncate">{label}</span>
            {badge && !isLocked && (
              <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full ${badgeColor || 'bg-indigo-100 text-indigo-800'}`}>
                {badge}
              </span>
            )}
          </div>
          {description && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px] sm:max-w-xs">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0 ml-2">
        {isLocked ? (
          <Lock className="w-4 h-4 text-amber-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400" />
        )}
      </div>
    </LinkTag>
  );
};

const SectionHeader = ({ 
  label, 
  collapsed, 
  isOpen, 
  onToggle, 
  count 
}: { 
  label: string; 
  collapsed?: boolean; 
  isOpen?: boolean; 
  onToggle?: () => void; 
  count?: number; 
}) => {
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

const ProtectedRoute = ({ 
  requiredPermission, 
  requiredFeature,
  children 
}: { 
  requiredPermission?: string; 
  requiredFeature?: string;
  children: React.ReactNode;
}) => {
    const { user, hasFeature } = useAuth();
    const { t } = useSettings();
    
    // Check subscription plan feature entitlement
    if (requiredFeature && hasFeature && !hasFeature(requiredFeature)) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 py-12 bg-slate-50 text-slate-700 animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-8 border border-slate-200/90 shadow-xl text-center space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <Crown className="w-8 h-8" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full border border-amber-200">
                Subscription Plan Upgrade Required
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-2">
                {t('Feature Locked Under Current Plan')}
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                This module is not included in your current subscription tier (<span className="font-bold text-slate-800">{user?.plan || 'Free'}</span>). Upgrade your plan to unlock full capability and expand your business operations.
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Unlock advanced automation & unlimited workflows</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Cloud real-time multi-branch synchronization</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Priority customer support & feature updates</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Link 
                to="/subscription" 
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all"
              >
                <Crown className="w-4 h-4" />
                <span>{t('View & Upgrade Subscription Plans')}</span>
              </Link>
              <Link 
                to="/" 
                className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold transition-colors"
              >
                {t('Return to Dashboard')}
              </Link>
            </div>
          </div>
        </div>
      );
    }

    if (!requiredPermission) return <>{children}</>;

    if (canAccessPermission(user?.role, user?.permissions, requiredPermission, { impersonated: !!user?.isImpersonated })) {
        return <>{children}</>;
    }
    
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 bg-slate-50 text-slate-600">
            <Shield className="w-16 h-16 text-slate-300 mb-4" />
            <h2 className="text-2xl font-bold mb-2 text-center">{t('Access Denied')}</h2>
            <p className="text-center text-sm max-w-md">{t('You do not have permission to view this page.')}</p>
            <Link to="/" className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                {t('Go Home')}
            </Link>
        </div>
    );
};

// --- Business Switcher Component ---
const BusinessSwitcher = () => {
    const { user, switchBusiness } = useAuth();
    const { t } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Outside click & touch listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside, { passive: true });
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);
    
    if (!user?.businesses || user.businesses.length <= 1) return null;

    return (
        <div className="relative shrink-0" ref={dropdownRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label={t('Switch Business')}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-colors border ${
                    isOpen 
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
            >
                <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="text-xs font-bold whitespace-nowrap max-w-[70px] sm:max-w-[140px] truncate">
                    {user.businessName}
                </span>
                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-64 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                    <div className="p-2">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase px-3 py-2">{t('Switch Business')}</p>
                        <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                            {user.businesses.map(biz => (
                                <button
                                    key={biz?.id}
                                    type="button"
                                    onClick={() => {
                                        if (biz?.id) switchBusiness(biz.id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-3 transition-colors ${
                                        user.businessName === biz?.name 
                                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold' 
                                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                    }`}
                                >
                                    <div className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold ${
                                        user.businessName === biz?.name 
                                            ? 'bg-indigo-600 text-white' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                                    }`}>
                                        {biz?.name?.charAt(0) || ''}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="truncate text-xs font-semibold">{biz?.name || ''}</p>
                                        <p className="text-[10px] opacity-70 truncate font-normal">{biz?.type || ''}</p>
                                    </div>
                                    {user.businessName === biz?.name && <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Store Switcher Component ---
const StoreSwitcher = () => {
    const { stores, activeStore, switchStore } = useStores();
    const { t } = useSettings();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Outside click & touch listener
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside, { passive: true });
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [isOpen]);

    // Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        if (isOpen) window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);
    
    return (
        <div className="relative shrink-0" ref={dropdownRef}>
            <button 
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label={t('Switch Store')}
                className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 rounded-lg transition-colors border ${
                    isOpen
                        ? 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-800 dark:text-indigo-200 border-indigo-300 dark:border-indigo-700 shadow-2xs'
                        : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                }`}
            >
                <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-bold whitespace-nowrap max-w-[80px] sm:max-w-[160px] truncate">
                    {activeStore === 'HEAD_OFFICE' ? t('Head Office (All)') : activeStore.name}
                </span>
                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <div className="absolute top-full right-0 mt-1 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden z-[100] animate-in fade-in slide-in-from-top-2">
                    <div className="p-2">
                        <button 
                            type="button"
                            onClick={() => {
                                switchStore('HEAD_OFFICE');
                                setIsOpen(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                                activeStore === 'HEAD_OFFICE' 
                                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold' 
                                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                        >
                            <Building className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" /> 
                            <span className="truncate flex-1">{t('Head Office (All)')}</span>
                            {activeStore === 'HEAD_OFFICE' && <CheckCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                        </button>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                        <div className="max-h-60 overflow-y-auto space-y-0.5 custom-scrollbar">
                            {stores.map(store => {
                                const isSelected = activeStore !== 'HEAD_OFFICE' && activeStore.id === store.id;
                                return (
                                    <button
                                        key={store.id}
                                        type="button"
                                        onClick={() => {
                                            switchStore(store.id);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
                                            isSelected 
                                                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold' 
                                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                    >
                                        <div className={`w-2 h-2 rounded-full shrink-0 ${isSelected ? 'bg-indigo-600 dark:bg-indigo-400' : 'bg-emerald-500'}`}></div>
                                        <span className="truncate flex-1">{store.name}</span>
                                        {isSelected && <CheckCircle className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                                    </button>
                                );
                            })}
                        </div>
                        <div className="my-1 border-t border-slate-100 dark:border-slate-800"></div>
                        <Link 
                            to="/stores" 
                            onClick={() => setIsOpen(false)}
                            className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 transition-colors"
                        >
                            <Settings className="w-3.5 h-3.5" /> {t('Manage Stores')}
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- NEW COMPONENTS ---

const PlaceholderPage = ({ title }: { title: string }) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
            <Settings className="w-10 h-10 opacity-20" />
        </div>
        <h2 className="text-2xl font-bold text-slate-600 mb-2">{title}</h2>
        <p>This module is currently under development.</p>
    </div>
);

const TrainingPage = () => {
  const { startTour } = useOnboarding();
  const { t } = useSettings();

  const guides = [
    { title: t('POS Quick Billing'), desc: t('Learn how to search products, scan barcodes, apply discount codes, and process payments in seconds.'), icon: ShoppingCart, color: 'text-indigo-600 bg-indigo-50' },
    { title: t('Installment (EMI) Setup'), desc: t('Configure automated installment plans with flexible due intervals and track payments step by step.'), icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
    { title: t('Analytics & Daily Logs'), desc: t('Understand your cashflow ledger, net profit metrics, and how to track target-performance metrics.'), icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
    { title: t('User & Access Control'), desc: t('Manage staff roles, security protocols, permissions mapping, and prevent unauthorized actions.'), icon: ShieldCheck, color: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Hero Welcome */}
      <div className="bg-slate-900 rounded-3xl p-6 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none rounded-r-3xl"></div>
        <div className="relative z-10 max-w-xl">
          <span className="bg-indigo-500/20 text-indigo-300 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-500/30">
            {t('Training Portal')}
          </span>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mt-4 leading-tight">
            {t('Master Bizora in Minutes')}
          </h1>
          <p className="text-slate-300 text-sm mt-3 leading-relaxed">
            {t('Get a complete, hands-on, step-by-step interactive tour of the most critical sales, billing, and accounting features of your ERP.')}
          </p>
          <button 
            onClick={startTour}
            className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /> {t('Start Interactive Tour')}
          </button>
        </div>
      </div>

      {/* Recommended Guides Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('Recommended Guides & Tutorials')}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {guides.map((g, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-100 hover:shadow-lg transition-all duration-300 flex gap-4 group">
              <div className={`p-3 rounded-xl shrink-0 h-12 w-12 flex items-center justify-center ${g.color} group-hover:scale-110 transition-transform`}>
                <g.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{g.title}</h3>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-medium">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POS Shortcuts / Cheat Sheet */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" /> {t('POS Operator Quick Reference')}
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">01</span>
            <h4 className="font-bold text-slate-800 text-xs mb-1">Barcode Scanning</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">Use any standard USB/Bluetooth scanner on the Sale page to automatically append scanned items directly into the cart.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">02</span>
            <h4 className="font-bold text-slate-800 text-xs mb-1">Due Ledger Collection</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">Process collections for regular corporate accounts by recording Debit/Credit transactions inside the custom ledger sheet.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">03</span>
            <h4 className="font-bold text-slate-800 text-xs mb-1">Receipt Printing</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">Configure thermal ticket configurations or print professional 80mm roll receipts immediately upon successful checkout.</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
          <h4 className="font-bold text-slate-800 text-xs mb-3">Keyboard shortcuts</h4>
          <div className="grid sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
            <p><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border font-mono text-[10px]">F2</kbd> Sell / Buy — focus product search</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border font-mono text-[10px]">Enter</kbd> Sell — add / barcode scan</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border font-mono text-[10px]">F9</kbd> Sell / Quick Sale — checkout or charge</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border font-mono text-[10px]">Esc</kbd> Clear search · close scanner · Quick Sale AC</p>
            <p className="sm:col-span-2 text-slate-500">Quick Sale also accepts number keys, <kbd className="px-1 rounded bg-slate-100 border font-mono">+</kbd><kbd className="px-1 rounded bg-slate-100 border font-mono">-</kbd><kbd className="px-1 rounded bg-slate-100 border font-mono">*</kbd><kbd className="px-1 rounded bg-slate-100 border font-mono">/</kbd>, and Backspace.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Layout Component ---

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const isPublicStorefront = location.pathname.startsWith('/s/') || location.pathname.startsWith('/store/');

  const [searchParams, setSearchParams] = useSearchParams();
  const simulatedRole = (searchParams.get('simRole') as 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT') || 'SUPER_ADMIN';
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    NAV_GROUPS.forEach(g => { init[g.id] = true; });
    return init;
  });

  // Auto-expand parent group when active route changes
  useEffect(() => {
    const activeGroup = PATH_TO_NAV_GROUP[location.pathname];
    if (activeGroup && !openGroups[activeGroup.id]) {
      setOpenGroups(prev => ({ ...prev, [activeGroup.id]: true }));
    }
  }, [location.pathname]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const [appUpdateAvailable, setAppUpdateAvailable] = useState(false);
  const mainScrollRef = useRef<HTMLElement | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [syncingQueue, setSyncingQueue] = useState(false);
  const [offlineConflictCount, setOfflineConflictCount] = useState(0);
  const [dismissLowStock, setDismissLowStock] = useState(() => {
    try { return sessionStorage.getItem('bizora_dismiss_lowstock') === '1'; } catch { return false; }
  });
  const [dismissTransferPending, setDismissTransferPending] = useState(() => {
    try { return sessionStorage.getItem('bizora_dismiss_transfer') === '1'; } catch { return false; }
  });
  const [dismissDueReminders, setDismissDueReminders] = useState(() => {
    try { return sessionStorage.getItem('bizora_dismiss_due') === '1'; } catch { return false; }
  });
  const [dismissExpiryAlerts, setDismissExpiryAlerts] = useState(() => {
    try { return sessionStorage.getItem('bizora_dismiss_expiry') === '1'; } catch { return false; }
  });



  const [globalAlert, setGlobalAlert] = useState<string | null>(null);
  const [activeAnnouncements, setActiveAnnouncements] = useState<any[]>([]);
  const [activeAnnouncement, setActiveAnnouncement] = useState<{ id: string; title: string; message: string; type: string } | null>(null);
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('bizora_dismissed_announcements') || '[]'); } catch { return []; }
  });
  const { language, setLanguage, currency, setCurrency, t, themeMode, setThemeMode } = useSettings();
  const { user, logout, switchBusiness, exitImpersonation, hasFeature } = useAuth();
  // Impersonation TTL countdown + auto-exit
  useEffect(() => {
    if (!user?.isImpersonated && localStorage.getItem('bizora_impersonating') !== '1') return;
    const started = localStorage.getItem('bizora_impersonate_started_at');
    const ttlMs = 15 * 60 * 1000; // default 15m (matches IMPERSONATE_TTL)
    const tick = () => {
      const el = document.getElementById('impersonation-ttl');
      if (!started) return;
      const left = Math.max(0, new Date(started).getTime() + ttlMs - Date.now());
      const m = Math.floor(left / 60000);
      const s = Math.floor((left % 60000) / 1000);
      if (el) el.textContent = left > 0 ? `(${m}:${String(s).padStart(2, '0')} left)` : '(expired)';
      if (left <= 0) {
        void (async () => {
          try { await exitImpersonation?.(); } catch { /* */ }
          window.location.href = `${ADMIN_APP_URL}/#/admin?tab=businesses`;
        })();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [user?.isImpersonated, user?.id, exitImpersonation]);

  const { lowStockProducts, stockTransferRequests, transactions, products } = useData();
  const { addNotification, notifications } = useNotifications();
  const subView = getSubscriptionView(user);

  // Product expiry alerts (once per product per day)
  useEffect(() => {
    const items = collectExpiryAlerts(products || []).filter(i => i.status === 'expired' || i.status === 'critical');
    if (!items.length) return;
    const dayKey = new Date().toISOString().slice(0, 10);
    let seen: string[] = [];
    try { seen = JSON.parse(localStorage.getItem('bizora_notified_expiry') || '[]'); } catch { seen = []; }
    const nextSeen = [...seen];
    items.slice(0, 8).forEach((item) => {
      const key = `${dayKey}:${item.productId}`;
      if (seen.includes(key)) return;
      addNotification(
        item.status === 'expired' ? 'Product expired' : 'Product expiring soon',
        `${item.productName} · ${item.status === 'expired' ? 'expired' : item.daysUntilExpiry + 'd left'} · stock ${item.stock}`,
        item.status === 'expired' ? 'error' : 'warning',
        '/products'
      );
      nextSeen.push(key);
    });
    try { localStorage.setItem('bizora_notified_expiry', JSON.stringify(nextSeen.slice(-100))); } catch { /* ignore */ }
  }, [products]);


  // Customer due / installment reminders (notify once per item id per day)
  useEffect(() => {
    const items = collectDueReminders(transactions || [], { graceDays: 0 });
    const overdue = items.filter(i => i.daysOverdue > 0).slice(0, 10);
    if (!overdue.length) return;
    const dayKey = new Date().toISOString().slice(0, 10);
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem('bizora_notified_dues') || '[]');
    } catch { seen = []; }
    const nextSeen = [...seen];
    overdue.forEach((item) => {
      const key = `${dayKey}:${item.id}`;
      if (seen.includes(key)) return;
      addNotification(
        item.daysOverdue > 0 ? 'Overdue receivable' : 'Payment due',
        `${item.label} · ${item.amount.toFixed(2)}`,
        item.daysOverdue > 7 ? 'error' : 'warning',
        '/installments'
      );
      nextSeen.push(key);
    });
    try {
      localStorage.setItem('bizora_notified_dues', JSON.stringify(nextSeen.slice(-100)));
    } catch { /* ignore */ }
  }, [transactions]);


  // Notify once per pending stock transfer request
  useEffect(() => {
    const pending = (stockTransferRequests || []).filter((r: any) => r.status === 'Pending');
    if (!pending.length) return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(localStorage.getItem('bizora_notified_transfers') || '[]');
    } catch { seen = []; }
    const nextSeen = [...seen];
    pending.forEach((r: any) => {
      if (seen.includes(r.id)) return;
      // avoid duplicate if already in notification list
      const exists = (notifications || []).some((n: any) => n.id === `transfer-${r.id}` || (n.target === '/transfer' && n.message && n.message.includes(r.id)));
      if (!exists) {
        addNotification(
          'Stock transfer pending approval',
          `${r.items?.length || 0} item(s) · ${r.sourceStoreId} → ${r.destStoreId} (${r.id})`,
          'warning',
          '/transfer'
        );
      }
      nextSeen.push(r.id);
    });
    // prune approved ids from seen? keep last 50
    const pendingIds = new Set(pending.map((r: any) => r.id));
    const pruned = nextSeen.filter((id, i, arr) => arr.indexOf(id) === i).slice(-50);
    // Also remove from seen when no longer pending so re-open gets new notify - actually keep so we don't re-spam
    try {
      localStorage.setItem('bizora_notified_transfers', JSON.stringify(pruned));
    } catch { /* ignore */ }
  }, [stockTransferRequests]);

  const isAdmin = isFullAccessRole(user?.role) || !!user?.isImpersonated;
  const isEmployeeUser = user?.role === UserRole.EMPLOYEE || String(user?.role || '') === 'EMPLOYEE';
  const check = (perm: string) => canAccessPermission(user?.role, user?.permissions, perm, { impersonated: !!user?.isImpersonated });


  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setSyncingQueue(true);
      flushOfflineQueue(authFetch).finally(() => {
        setOfflineQueueCount(getOfflineQueueCount());
        setSyncingQueue(false);
      });
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const unsub = subscribeOfflineQueue((items) => setOfflineQueueCount(items.length));
    const unsubC = subscribeOfflineConflicts((items) => setOfflineConflictCount(items.length));


    const originalAlert = window.alert;
    window.alert = (message: any) => {
        setGlobalAlert(String(message));
    };

    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        unsub();
        unsubC();
        window.alert = originalAlert;
    };
  }, []);

  // Real announcement banner (backend/src/api/announcements.ts) - shows
  // whatever the SaaS Owner/Admin has actually broadcast (global, or
  // targeted at this business specifically), not a fake local-only value.
  useEffect(() => {
    if (!user) return;
    const fetchAnnouncements = () => {
      authFetch('/api/announcements')
        .then(res => res.ok ? res.json() : null)
        .then(body => {
          const list = body?.announcements || [];
          const firstUndismissed = list.find((a: any) => !dismissedAnnouncementIds.includes(a.id));
          const undismissed = list.filter((a: any) => !dismissedAnnouncementIds.includes(a.id));
          setActiveAnnouncements(undismissed.slice(0, 5));
          setActiveAnnouncement(undismissed[0] || null);
        })
        .catch(err => console.warn('Failed to load announcements:', err));
    };
    fetchAnnouncements();
    const interval = setInterval(fetchAnnouncements, 60000);
    return () => clearInterval(interval);
  }, [user, dismissedAnnouncementIds]);

  const dismissAnnouncementBanner = () => {
    if (!activeAnnouncement) return;
    const updated = [...dismissedAnnouncementIds, activeAnnouncement.id];
    setDismissedAnnouncementIds(updated);
    localStorage.setItem('bizora_dismissed_announcements', JSON.stringify(updated));
    setActiveAnnouncement(null);
  };

  const getPageTitle = (path: string) => {
    const cleanPath = path.split('?')[0];
    const isBn = language === AppLanguage.BENGALI || language === 'bn';
    const navItem = PATH_TO_NAV_ITEM[cleanPath];
    if (navItem) {
      return isBn ? navItem.labelBn : navItem.label;
    }

    const routeKeyMap: Record<string, string> = {
      '/': 'Home',
      '/landing': 'Bizora | 3D Experience & Business OS',
      '/admin': 'SaaS Administration',
      '/legal': 'Legal & Trust Center',
      '/legal/privacy-policy': 'Privacy Policy',
      '/legal/terms-of-service': 'Terms of Service',
      '/legal/cookie-policy': 'Cookie Policy',
      '/legal/refund-policy': 'Refund & Cancellation',
      '/legal/security': 'Data Security & Processing',
      '/legal/account-deletion': 'Account & Data Deletion'
    };
    
    if (routeKeyMap[cleanPath]) return t(routeKeyMap[cleanPath]);

    // Fallback for unknown routes
    if (cleanPath === '/') return t('Home');
    const clean = cleanPath.substring(1).replace(/[-_]/g, ' ');
    return clean.charAt(0).toUpperCase() + clean.slice(1);
  };


  // Browser tab title follows current route (mobile multitasking UX)
  useEffect(() => {
    const page = getPageTitle(location.pathname);
    const biz = user?.businessName ? ` · ${user.businessName}` : '';
    document.title = page ? `${page}${biz} · Bizora` : 'Bizora';
  }, [location.pathname, language, user?.businessName]);

  const getPageHint = (path: string): string | null => {
    const cleanPath = path.split('?')[0];
    const isBn = language === AppLanguage.BENGALI || language === 'bn';
    const navItem = PATH_TO_NAV_ITEM[cleanPath];
    if (navItem) {
      return isBn ? navItem.descriptionBn : navItem.description;
    }
    return null;
  };

  const isSaaSUser = user?.role === UserRole.SAAS_OWNER || user?.role === UserRole.SAAS_ADMIN;

  // Canonical authorized navigation groups from single source of truth
  const authorizedNavGroups = useMemo(() => {
    if (!user || isSaaSUser) return [];
    return getAuthorizedNavGroups({
      user,
      hasPermission: (perm) => !perm || check(perm),
      hasFeature: (feat) => !feat || hasFeature(feat),
      isFullAccess: isFullAccessRole(user?.role) || !!user?.isImpersonated
    });
  }, [user?.id, user?.role, user?.permissions, user?.businessType, user?.isImpersonated]);

  const allAuthorizedItems = useMemo(() => {
    return authorizedNavGroups.flatMap(g => g.items);
  }, [authorizedNavGroups]);

  const searchResults = useMemo(() => {
    if (!mobileSearchQuery.trim()) return [];
    return searchNavigation(mobileSearchQuery, allAuthorizedItems);
  }, [mobileSearchQuery, allAuthorizedItems]);

  // Memoized navigation sections for business (tenant) users to ensure role-based menu items are computed once per session
  const businessSections = useMemo(() => {
    if (!user || isSaaSUser) return [];
    
    const sections = [
      {
        title: t('Operations'),
        items: [
          { to: '/sale', icon: ShoppingBag, label: t('Sell'), permission: PERMISSIONS.POS.subFeatures.SELL.key },
          { to: '/purchase', icon: ShoppingCart, label: t('Buy'), permission: PERMISSIONS.INVENTORY.subFeatures.PURCHASE.key },
          { to: '/quick-sale', icon: Zap, label: t('Quick Sale'), permission: PERMISSIONS.POS.subFeatures.QUICK_SALE.key },
          { to: '/sales-return', icon: RotateCcw, label: t('Sales Return') || 'Sales Return', permission: PERMISSIONS.POS.subFeatures.RETURNS.key },
          { to: '/purchase-return', icon: RotateCcw, label: t('Purchase Return') || 'Purchase Return', permission: PERMISSIONS.POS.subFeatures.RETURNS.key },
          { to: '/quotations', icon: FileText, label: t('Quotations'), permission: PERMISSIONS.POS.subFeatures.SELL.key },
          { to: '/purchase-orders', icon: ClipboardList, label: t('Purchase Orders'), permission: PERMISSIONS.INVENTORY.subFeatures.PURCHASE.key },
          { to: '/wastage', icon: AlertTriangle, label: t('Wastage & Damage'), permission: PERMISSIONS.INVENTORY.subFeatures.ADJUSTMENT.key },
          { to: '/eprocurement', icon: Briefcase, label: t('E-Procurement'), permission: PERMISSIONS.INVENTORY.subFeatures.PURCHASE.key },
          { to: '/lc', icon: FileSpreadsheet, label: t('Letter of Credit (LC)'), permission: PERMISSIONS.INVENTORY.subFeatures.PURCHASE.key },
          ...(['restaurant', 'cafe', 'food', 'bakery', 'hospitality'].some(k => (user.businessType || '').toLowerCase().includes(k)) || user.role === 'SHOP_OWNER' || (Array.isArray(user.permissions) && (user.permissions.includes('all') || user.permissions.includes('pos.sell'))) ? [{ to: '/kitchen', icon: ChefHat, label: t('Kitchen Management (KDS)') || 'Kitchen Management (KDS)', permission: PERMISSIONS.POS.subFeatures.SELL.key }] : [])
        ]
      },
      {
        title: t('Finance'),
        items: [
          { to: '/cashbox', icon: Wallet, label: t('Accounts & Cash'), permission: PERMISSIONS.FINANCE.subFeatures.VIEW_CASHBOX.key },
          { to: '/sale-ledger', icon: FileText, label: t('Sale Ledger'), permission: PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key },
          { to: '/purchase-ledger', icon: ClipboardList, label: t('Purchase Ledger'), permission: PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key },
          { to: '/due-ledger', icon: BookOpen, label: t('Due Ledger'), permission: PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key },
          { to: '/installments', icon: CalendarClock, label: t('Installments'), permission: PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key },
          { to: '/expense-ledger', icon: DollarSign, label: t('Expense Ledger'), permission: PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key },
          { to: '/loans', icon: Landmark, label: t('Loans & Debt'), permission: PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key },
          { to: '/pf', icon: PiggyBank, label: t('Provident Fund'), permission: PERMISSIONS.HR.subFeatures.VIEW_PAYROLL.key },
          { to: '/journal', icon: BookOpen, label: t('Journal') || 'Journal', permission: PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key },
        ]
      },
      {
        title: t('Management'),
        items: [
          { to: '/customers', icon: Users, label: t('Customers'), permission: PERMISSIONS.CRM.subFeatures.VIEW_CUSTOMERS.key },
          { to: '/suppliers', icon: Briefcase, label: t('Suppliers'), permission: PERMISSIONS.CRM.subFeatures.VIEW_CUSTOMERS.key },
          { to: '/lots', icon: Package, label: t('Lot Enquiry') || 'Lots', permission: PERMISSIONS.INVENTORY.subFeatures.VIEW_STOCK.key },
          { to: '/stock', icon: Package, label: t('Stock Report'), permission: PERMISSIONS.INVENTORY.subFeatures.VIEW_STOCK.key },
          { to: '/products', icon: Box, label: t('Product List'), permission: PERMISSIONS.INVENTORY.subFeatures.VIEW_STOCK.key },
          { to: '/catalog', icon: Tags, label: t('Catalog Master'), permission: PERMISSIONS.INVENTORY.subFeatures.VIEW_STOCK.key },
          { to: '/product-attributes', icon: Tags, label: t('Categories & Brands'), permission: PERMISSIONS.INVENTORY.subFeatures.VIEW_STOCK.key },
          { to: '/production', icon: Factory, label: t('Production'), permission: PERMISSIONS.INVENTORY.subFeatures.PRODUCTION.key },
          { to: '/hotel', icon: HotelIcon, label: t('Hotel & Hospitality'), permission: PERMISSIONS.POS.subFeatures.SELL.key },
          { to: '/vehicles', icon: Truck, label: t('Fleet & Vehicles'), permission: PERMISSIONS.ADMIN.subFeatures.MANAGE_STORES.key },
          { to: '/visitors', icon: UserCheck, label: t('Visitors & Passes'), permission: PERMISSIONS.CRM.subFeatures.VIEW_CUSTOMERS.key },
          { to: '/projects', icon: FolderGit2, label: t('Projects & Tasks'), permission: PERMISSIONS.REPORTS.subFeatures.VIEW_REPORTS.key },
          { to: '/dealers', icon: Award, label: t('Dealer Targets'), permission: PERMISSIONS.POS.subFeatures.VIEW_SALES.key },
          { to: '/transfer', icon: ArrowRightLeft, label: t('Product Transfer'), permission: PERMISSIONS.INVENTORY.subFeatures.TRANSFER.key, requiredFeature: 'Unlimited Stores' },
          { to: '/stores', icon: Store, label: t('Store Management'), permission: PERMISSIONS.ADMIN.subFeatures.MANAGE_STORES.key },
          { to: '/employees', icon: Briefcase, label: t('Employees'), permission: PERMISSIONS.HR.subFeatures.MANAGE_STAFF.key, requiredFeature: 'Employee Management' },
          { to: '/hr-structure', icon: Building, label: t('HR Structure'), permission: PERMISSIONS.HR.subFeatures.MANAGE_STAFF.key, requiredFeature: 'Employee Management' },
          { to: '/access', icon: ShieldCheck, label: t('Access Control'), permission: PERMISSIONS.ADMIN.subFeatures.ACCESS_CONTROL.key, requiredFeature: 'Employee Management' },
          { to: '/subscription', icon: Crown, label: t('Subscription'), permission: PERMISSIONS.ADMIN.subFeatures.SUBSCRIPTION.key }
        ]
      },
      {
        title: t('Tools'),
        items: [
          { to: '/document-ai', icon: ScanText, label: t('Document AI Scan'), permission: PERMISSIONS.FINANCE.subFeatures.ADD_EXPENSE.key },
          { to: '/communication', icon: MessageSquare, label: t('Communication'), permission: PERMISSIONS.CRM.subFeatures.COMMUNICATION.key, requiredFeature: 'SMS Gateway Notification System' },
          { to: '/marketing', icon: Megaphone, label: t('Marketing'), permission: PERMISSIONS.CRM.subFeatures.MARKETING.key, requiredFeature: 'SMS Gateway Notification System' },
          { to: '/reports', icon: Briefcase, label: t('Reports & Tax'), permission: PERMISSIONS.REPORTS.subFeatures.VIEW_REPORTS.key },
          { to: '/consolidation', icon: Briefcase, label: t('Consolidation'), permission: PERMISSIONS.REPORTS.subFeatures.VIEW_REPORTS.key },          { to: '/payments', icon: CreditCard, label: 'Online Payments', permission: PERMISSIONS.FINANCE.subFeatures.VIEW_CASHBOX.key },
          { to: '/shop', icon: Globe, label: t('Online Shop'), permission: PERMISSIONS.ONLINE_SHOP.subFeatures.MANAGE_SHOP.key, requiredFeature: 'E-commerce Integration' },
          { to: '/support', icon: HeadphonesIcon, label: t('Support'), permission: PERMISSIONS.CRM.subFeatures.SUPPORT.key },
          { to: '/bin', icon: Trash2, label: t('Recycle Bin'), permission: PERMISSIONS.ADMIN.subFeatures.RECYCLE_BIN.key },
          { to: '/training', icon: BookOpen, label: t('App Training'), permission: PERMISSIONS.ADMIN.subFeatures.SETTINGS.key },
          { to: '/printer', icon: Printer, label: t('Printer Config'), permission: PERMISSIONS.ADMIN.subFeatures.SETTINGS.key },
          { to: '/settings', icon: Settings, label: t('Settings'), permission: PERMISSIONS.ADMIN.subFeatures.SETTINGS.key }
        ]
      }
    ];

    return sections.map(sec => ({
      ...sec,
      items: sec.items.filter(item => check(item.permission))
    })).filter(sec => sec.items.length > 0);
  }, [user?.id, user?.role, user?.permissions, language]);

  // Memoized navigation sections for SaaS platform admins
  const saasSections = useMemo(() => {
    if (!user || !isSaaSUser) return [];

    const sections = [
      {
        title: t('Analytics & Insights'),
        items: [
          { to: '/admin', icon: LayoutDashboard, label: t('Overview'), activeOnlyOnDashboard: true, permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
          { to: '/admin?tab=finance-analytics', icon: TrendingUp, label: t('Finance Analytics'), permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
          { to: '/admin?tab=analytics-center', icon: Sparkles, label: t('Analytics Center'), permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
          { to: '/admin?tab=reports-center', icon: FileText, label: t('Reports Center'), permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key }
        ]
      },
      {
        title: t('Core Registries'),
        items: [
          { to: '/admin?tab=businesses', icon: Store, label: t('Business Management'), permission: PERMISSIONS.SAAS.subFeatures.MANAGE_BUSINESSES.key },
          { to: '/admin?tab=customer-search', icon: Search, label: t('Customer Search'), permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
          { to: '/admin?tab=employees', icon: Briefcase, label: t('Employees'), permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
          { to: '/admin?tab=suppliers', icon: Users, label: t('Suppliers'), permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key }
        ]
      },
      {
        title: t('Portal & Subscriptions'),
        items: [
          { to: '/admin?tab=subscriptions', icon: Crown, label: t('Subscription Management'), permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
          { to: '/admin?tab=requests', icon: ClipboardList, label: t('Requests'), permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
          { to: '/admin?tab=customer-portal', icon: Smartphone, label: t('Customer Portal'), permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
          { to: '/admin?tab=supplier-portal', icon: Smartphone, label: t('Supplier Portal'), permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
          { to: '/admin?tab=enterprise-features', icon: Award, label: t('Enterprise Features'), permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key }
        ]
      },
      {
        title: t('Revenue & Finance'),
        items: [
          { to: '/admin?tab=payment-gateway', icon: CreditCard, label: t('Payment Gateway'), permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
          { to: '/admin?tab=revenue-center', icon: DollarSign, label: t('Revenue Center'), permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key }
        ]
      },
      {
        title: t('Communication & CMS'),
        items: [
          { to: '/admin?tab=support', icon: HeadphonesIcon, label: t('Support Center'), permission: PERMISSIONS.SAAS.subFeatures.SUPPORT.key },
          { to: '/admin?tab=notifications', icon: Megaphone, label: t('Notification Center'), permission: PERMISSIONS.SAAS.subFeatures.MANAGE_BUSINESSES.key },
          { to: '/admin?tab=website-cms', icon: FileText, label: t('Website CMS'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
          { to: '/admin?tab=marketing-center', icon: Mail, label: t('Marketing Center'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key }
        ]
      },
      {
        title: t('System & Settings'),
        items: [
          { to: '/admin?tab=users', icon: Users, label: t('Admins'), permission: PERMISSIONS.SAAS.subFeatures.MANAGE_USERS.key },
          { to: '/admin?tab=feature-manager', icon: Shield, label: t('Feature Manager'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
          { to: '/admin?tab=security', icon: ShieldCheck, label: t('Security Center'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
          { to: '/admin?tab=database-manager', icon: Database, label: t('Database Manager'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
          { to: '/admin?tab=api-manager', icon: Key, label: t('API Manager'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
          { to: '/admin?tab=global-search', icon: Search, label: t('Global Search'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
          { to: '/admin?tab=system-settings', icon: Server, label: t('System Settings'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
          { to: '/admin?tab=audit', icon: FileText, label: t('Audit Log'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
          { to: '/admin?tab=monitoring-center', icon: Activity, label: t('Monitoring Center'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
          { to: '/admin?tab=developer-center', icon: Bot, label: t('Developer Center'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
          { to: '/admin?tab=owner-profile', icon: UserCircle, label: t('SaaS Profile'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
          { to: '/settings', icon: Settings, label: t('Global Configuration'), permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key }
        ]
      }
    ];

    return sections.map(sec => {
      const filteredItems = sec.items.filter(item => {
        if (item.permission && !check(item.permission)) return false;

        if (simulatedRole === 'SUPER_ADMIN') return true;

        const tab = item.to.includes('tab=') ? item.to.split('tab=')[1] : 'dashboard';

        if (simulatedRole === 'ADMIN') {
          return [
            'dashboard', 'businesses', 'customer-search', 'subscriptions', 'requests',
            'payment-gateway', 'revenue-center', 'announcements-center', 'finance-analytics',
            'database-manager', 'api-manager', 'monitoring-center', 'system-settings',
            'reports-center', 'support', 'feature-manager', 'website-cms',
          ].includes(tab);
        }

        // SUPPORT role — registries + tickets + light ops
        return [
          'dashboard', 'businesses', 'customer-search', 'employees', 'suppliers',
          'support', 'notifications', 'global-search', 'customer-portal', 'supplier-portal',
        ].includes(tab);
      });

      return {
        ...sec,
        items: filteredItems
      };
    }).filter(sec => sec.items.length > 0);
  }, [user?.id, user?.role, user?.permissions, language, simulatedRole]);

  // Mobile glass dock — permission pool; owners always get core slots even if ACL array empty
  const bottomNavItems = useMemo(() => {
    if (!user || isSaaSUser) return [];

    const allItems = [
      { to: '/sale', icon: ShoppingBag, label: t('Sell') || 'Sell', permission: PERMISSIONS.POS.subFeatures.SELL.key },
      { to: '/purchase', icon: ShoppingCart, label: t('Buy') || 'Buy', permission: PERMISSIONS.INVENTORY.subFeatures.PURCHASE.key },
      { to: '/stock', icon: Package, label: t('Stock') || 'Stock', permission: PERMISSIONS.INVENTORY.subFeatures.VIEW_STOCK.key },
      { to: '/cashbox', icon: Wallet, label: t('Cash') || 'Cash', permission: PERMISSIONS.FINANCE.subFeatures.VIEW_CASHBOX.key },
      { to: '/customers', icon: Users, label: t('Customers') || 'Customers', permission: PERMISSIONS.CRM.subFeatures.VIEW_CUSTOMERS.key },
      { to: '/due-ledger', icon: BookOpen, label: t('Due') || 'Due', permission: PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key },
      { to: '/reports', icon: Briefcase, label: t('Reports') || 'Reports', permission: PERMISSIONS.REPORTS.subFeatures.VIEW_REPORTS.key },
      { to: '/employees', icon: UserCheck, label: t('HR') || 'HR', permission: PERMISSIONS.HR.subFeatures.MANAGE_STAFF.key },
      { to: '/settings', icon: Settings, label: t('Settings') || 'Settings', permission: PERMISSIONS.ADMIN.subFeatures.SETTINGS.key },
    ];

    let allowed = allItems.filter((item) => check(item.permission));
    if (allowed.length === 0 && isFullAccessRole(user.role)) {
      allowed = allItems.slice(0, 4);
    }
    // Always keep at least Sell + Stock when empty (shop shell)
    if (allowed.length === 0) {
      allowed = allItems.filter((i) => i.to === '/sale' || i.to === '/stock').slice(0, 2);
    }
    return allowed.slice(0, 4);
  }, [user?.id, user?.role, user?.permissions, language]);

  const NavList = ({ collapsed }: { collapsed?: boolean }) => {
    if (isSaaSUser) {
        return (
            <div className="pb-20 space-y-1">
                {saasSections.map(section => (
                    <React.Fragment key={section.title}>
                        <SectionHeader label={section.title} collapsed={collapsed} />
                        {section.items.map(item => {
                            const isOverviewTab = item.to === '/admin' && (!location.search || location.search.includes('tab=dashboard') || !location.search.includes('tab='));
                            const hasQuery = item.to.includes('?');
                            const pathPart = item.to.split('?')[0];
                            const queryPart = hasQuery ? item.to.split('?')[1] : '';
                            
                            const isActive = item.activeOnlyOnDashboard 
                                ? isOverviewTab 
                                : location.pathname === pathPart && (hasQuery ? location.search.includes(queryPart) : (!location.search || !location.search.includes('tab=')));
                            return (
                                <DesktopSidebarItem 
                                    key={item.to + item.label}
                                    to={item.to} 
                                    icon={item.icon} 
                                    label={item.label} 
                                    active={isActive} 
                                    collapsed={collapsed} 
                                />
                            );
                        })}
                    </React.Fragment>
                ))}
            </div>
        );
    }

    return (
        <div className="pb-20 space-y-1">
            {authorizedNavGroups.map(group => {
                const isExpanded = openGroups[group.id] !== false;
                const groupTitle = language === 'bn' ? group.titleBn : group.title;
                return (
                    <div key={group.id} className="mb-2">
                        <SectionHeader 
                            label={groupTitle} 
                            collapsed={collapsed} 
                            isOpen={isExpanded}
                            onToggle={() => toggleGroup(group.id)}
                            count={group.items.length}
                        />
                        {(!collapsed ? isExpanded : true) && (
                            <div className="space-y-0.5">
                                {group.items.map(item => {
                                    const IconComponent = getNavIcon(item.iconName);
                                    const itemLabel = language === 'bn' ? item.labelBn : item.label;
                                    const isActive = location.pathname === item.to;
                                    return (
                                        <DesktopSidebarItem 
                                            key={item.id} 
                                            to={item.to} 
                                            icon={IconComponent} 
                                            label={itemLabel} 
                                            active={isActive} 
                                            collapsed={collapsed} 
                                            badge={item.badge}
                                            badgeColor={item.badgeColor}
                                            isLocked={item.isLocked}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
  };




  // Mobile browser chrome color (status bar / PWA)
  useEffect(() => {
    const meta = document.getElementById('bizora-theme-color') as HTMLMetaElement | null
      || document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    if (isOffline) meta.setAttribute('content', '#ef4444');
    else if (user?.isImpersonated) meta.setAttribute('content', '#f59e0b');
    else meta.setAttribute('content', '#4f46e5');
  }, [isOffline, user?.isImpersonated]);


  // Production: detect new service worker / app version
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const host = window.location.hostname;
    if (host === 'localhost' || host === '127.0.0.1') return;

    let cancelled = false;
    let reg: ServiceWorkerRegistration | null = null;

    const onUpdateFound = () => {
      const installing = reg?.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller && !cancelled) {
          setAppUpdateAvailable(true);
        }
      });
    };

    navigator.serviceWorker.getRegistration().then((r) => {
      if (!r || cancelled) return;
      reg = r;
      r.addEventListener('updatefound', onUpdateFound);
      r.update().catch(() => {});
    }).catch(() => {});

    const interval = window.setInterval(() => {
      reg?.update().catch(() => {});
    }, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      reg?.removeEventListener('updatefound', onUpdateFound);
    };
  }, []);

  // After first paint, warm common chunks on idle (shop users only)
  useEffect(() => {
    if (!user || isSaaSUser) return;
    idlePrefetchCommonRoutes();
  }, [user?.id]);

  // On route change: scroll main content to top and close mobile drawer
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo(0, 0);
    }
    setMobileMenuOpen(false);
  }, [location.pathname, location.search]);

  // Lock body scroll while mobile menu is open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileMenuOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [mobileMenuOpen]);

  const isPOSPage = ['/sale', '/purchase', '/quick-sale', '/sales-return', '/purchase-return'].includes(location.pathname);

  if (isPublicStorefront || location.pathname.startsWith('/legal')) return <>{children}</>;

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-slate-50 overflow-hidden font-sans">
      {(user?.isImpersonated || (typeof localStorage !== 'undefined' && localStorage.getItem('bizora_impersonating') === '1')) && (
        <div
          id="impersonation-banner"
          className="fixed top-0 inset-x-0 z-[200] bg-amber-500 text-slate-950 px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm font-semibold shadow-lg border-b-2 border-amber-700"
          role="alert"
        >
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-950"></span>
            </span>
            <span className="leading-tight">
              {language === 'bn' ? (
                <>Login-As চলছে: <strong>{user?.businessName}</strong>
                  {localStorage.getItem('bizora_impersonate_reason') ? <> — <em>{localStorage.getItem('bizora_impersonate_reason')}</em></> : null}
                </>
              ) : (
                <>Login-As active: <strong>{user?.businessName}</strong>
                  {localStorage.getItem('bizora_impersonate_reason') ? <> — <em>{localStorage.getItem('bizora_impersonate_reason')}</em></> : null}
                </>
              )}
              <span id="impersonation-ttl" className="ml-2 opacity-80 font-medium" />
            </span>
          </div>
          <button
            type="button"
            title="Exit Login-As and restore SaaS admin session"
            id="exit-impersonation-btn"
            onClick={async () => {
              try {
                if (exitImpersonation) await exitImpersonation();
              } finally {
                window.location.href = `${ADMIN_APP_URL}/#/admin?tab=businesses`;
              }
            }}
            className="w-full sm:w-auto bg-slate-950 text-white text-xs font-bold px-4 py-2 rounded-xl hover:bg-slate-800 transition-colors shadow-md flex items-center justify-center gap-1.5 shrink-0 ring-2 ring-white/30"
          >
            <LogOut className="w-3.5 h-3.5" /> {language === 'bn' ? 'Exit → SaaS Admin' : 'Exit → SaaS Admin'}
          </button>
        </div>
      )}
      {(user?.isImpersonated || (typeof localStorage !== 'undefined' && localStorage.getItem('bizora_impersonating') === '1')) && (
        <div className="h-14 sm:h-12 shrink-0" aria-hidden />
      )}

      {user && !user.isImpersonated && (user.role === 'SHOP_OWNER' || String(user.role).includes('SHOP') || user.role === 'ShopOwner' || true) && (subView.phase === 'expired' || subView.phase === 'grace' || (subView.daysRemaining != null && subView.daysRemaining <= 7 && subView.daysRemaining >= 0)) && (
        <div id="subscription-expiry-banner" className={`px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm font-semibold z-[100] shadow-md shrink-0 ${
          subView.phase === 'expired' ? 'bg-red-600 text-white' : subView.phase === 'grace' ? 'bg-amber-500 text-slate-950' : 'bg-indigo-600 text-white'
        }`}>
          <span>
            {subView.phase === 'expired'
              ? (language === 'bn'
                  ? `সাবস্ক্রিপশন শেষ (${subView.plan})। পূর্ণ অ্যাক্সেসের জন্য রিনিউ করুন।`
                  : `Subscription expired (${subView.plan}). Renew to restore full access.`)
              : subView.phase === 'grace'
                ? (language === 'bn'
                    ? `গ্রেস পিরিয়ড (${subView.plan})। বিঘ্ন এড়াতে রিনিউ করুন।`
                    : `Subscription in grace period (${subView.plan}). Renew to avoid interruption.`)
                : (language === 'bn'
                    ? `সাবস্ক্রিপশন ${subView.daysRemaining} দিনের মধ্যে নবায়ন (${subView.plan})।`
                    : `Subscription renews in ${subView.daysRemaining} day(s) (${subView.plan}).`)}
          </span>
          <a href="#/subscription" className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-bold shrink-0">
            {subView.phase === 'expired' || subView.phase === 'grace'
              ? (language === 'bn' ? 'এখন রিনিউ' : 'Renew now')
              : (language === 'bn' ? 'প্ল্যান দেখুন' : 'View plan')}
          </a>
        </div>
      )}

      {user && subView.isBlocked && !location.pathname.startsWith('/subscription') && !location.pathname.startsWith('/s/') && (
        <div id="subscription-block-overlay" className="fixed inset-0 z-[200] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-center">
            <h2 className="text-xl font-black text-slate-900">{language === 'bn' ? 'সাবস্ক্রিপশন শেষ' : 'Subscription expired'}</h2>
            <p className="text-sm text-slate-600">
              {language === 'bn'
                ? <>আপনার <strong>{subView.plan}</strong> প্ল্যানের মেয়াদ শেষ। চালিয়ে যেতে রিনিউ করুন।</>
                : <>Your <strong>{subView.plan}</strong> plan has expired. Renew to continue using Bizora for this business.</>}
            </p>
            <a
              href="#/subscription"
              className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {language === 'bn' ? 'সাবস্ক্রিপশন রিনিউ' : 'Renew subscription'}
            </a>
            <button
              type="button"
              onClick={() => logout && logout()}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 underline"
            >
              {language === 'bn' ? 'সাইন আউট' : 'Sign out'}
            </button>
          </div>
        </div>
      )}






      {!dismissExpiryAlerts && (() => {
        const items = collectExpiryAlerts(products || []);
        const totals = expiryAlertTotals(items);
        if (!totals.count) return null;
        return (
          <div id="expiry-alert-banner" className="bg-orange-600 text-white px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm font-semibold z-[100] shadow-md shrink-0">
            <span>
              {language === 'bn' ? (
                <>
                  {totals.expired > 0 ? `${totals.expired}টি মেয়াদোত্তীর্ণ` : ''}
                  {totals.expired > 0 && (totals.critical + totals.warning) > 0 ? ' · ' : ''}
                  {(totals.critical + totals.warning) > 0 ? `${totals.critical + totals.warning}টি মেয়াদ কাছাকাছি` : ''}
                  {' '}(৩০ দিনের মধ্যে)
                </>
              ) : (
                <>
                  {totals.expired > 0 ? `${totals.expired} expired` : ''}
                  {totals.expired > 0 && (totals.critical + totals.warning) > 0 ? ' · ' : ''}
                  {(totals.critical + totals.warning) > 0 ? `${totals.critical + totals.warning} near expiry` : ''}
                  {' '}(within 30 days)
                </>
              )}
            </span>
            <div className="flex gap-2 shrink-0">
              <a href="#/products" className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-bold">{language === 'bn' ? 'ইনভেন্টরি' : 'Inventory'}</a>
              <button type="button" onClick={() => {
                setDismissExpiryAlerts(true);
                try { sessionStorage.setItem('bizora_dismiss_expiry', '1'); } catch {}
              }} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold">{language === 'bn' ? 'বন্ধ' : 'Dismiss'}</button>
            </div>
          </div>
        );
      })()}

      {!dismissDueReminders && (() => {
        const items = collectDueReminders(transactions || [], { graceDays: 0 });
        const totals = dueReminderTotals(items.filter(i => i.daysOverdue > 0));
        if (!totals.count) return null;
        return (
          <div id="due-reminder-banner" className="bg-amber-600 text-white px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm font-semibold z-[100] shadow-md shrink-0">
            <span>
              {language === 'bn'
                ? `${totals.overdueCount}টি বাকি আদায়যোগ্য · ${totals.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                : `${totals.overdueCount} overdue receivable(s) · ${totals.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            </span>
            <div className="flex gap-2 shrink-0">
              <a href="#/installments" className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-bold">{language === 'bn' ? 'আদায়' : 'Collect'}</a>
              <button type="button" onClick={() => {
                setDismissDueReminders(true);
                try { sessionStorage.setItem('bizora_dismiss_due', '1'); } catch {}
              }} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold">{language === 'bn' ? 'বন্ধ' : 'Dismiss'}</button>
            </div>
          </div>
        );
      })()}

      {!dismissTransferPending && (stockTransferRequests || []).filter((r: any) => r.status === 'Pending').length > 0 && (
        <div id="transfer-pending-banner" className="bg-violet-600 text-white px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm font-semibold z-[100] shadow-md shrink-0">
          <span>
            {language === 'bn'
              ? `${(stockTransferRequests || []).filter((r: any) => r.status === 'Pending').length}টি স্টক ট্রান্সফার অনুমোদনের অপেক্ষায়`
              : `${(stockTransferRequests || []).filter((r: any) => r.status === 'Pending').length} stock transfer(s) waiting for approval`}
          </span>
          <div className="flex gap-2 shrink-0">
            <a href="#/transfer" className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-bold">{language === 'bn' ? 'রিভিউ' : 'Review'}</a>
            <button type="button" onClick={() => {
              setDismissTransferPending(true);
              try { sessionStorage.setItem('bizora_dismiss_transfer', '1'); } catch {}
            }} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold">{language === 'bn' ? 'বন্ধ' : 'Dismiss'}</button>
          </div>
        </div>
      )}

      {!dismissLowStock && lowStockProducts && lowStockProducts.length > 0 && (
        <div id="low-stock-banner" className="bg-rose-600 text-white px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm font-semibold z-[100] shadow-md shrink-0">
          <span>
            {language === 'bn'
              ? `${lowStockProducts.length}টি পণ্য ন্যূনতম স্টকের নিচে বা সমান`
              : `${lowStockProducts.length} product(s) at or below minimum stock`}
            {lowStockProducts.slice(0, 3).map(p => p.name).filter(Boolean).length
              ? `: ${lowStockProducts.slice(0, 3).map(p => p.name).join(', ')}${lowStockProducts.length > 3 ? '…' : ''}`
              : ''}
          </span>
          <div className="flex gap-2 shrink-0">
            <a href="#/products" className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-bold">{language === 'bn' ? 'ইনভেন্টরি দেখুন' : 'View inventory'}</a>
            <button type="button" onClick={() => {
              setDismissLowStock(true);
              try { sessionStorage.setItem('bizora_dismiss_lowstock', '1'); } catch {}
            }} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 font-bold">{language === 'bn' ? 'বন্ধ' : 'Dismiss'}</button>
          </div>
        </div>
      )}

      
      {appUpdateAvailable && (
        <div className="bg-indigo-600 text-white px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-sm font-semibold z-[100] shadow-md shrink-0">
          <span>{language === 'bn' ? 'নতুন ভার্সন উপলব্ধ' : 'A new version is available'}</span>
          <button
            type="button"
            className="px-3 py-1 rounded-lg bg-white text-indigo-700 text-xs font-black"
            onClick={() => window.location.reload()}
          >
            {language === 'bn' ? 'আপডেট' : 'Update'}
          </button>
          <button
            type="button"
            className="px-2 py-1 rounded-lg bg-indigo-500/80 text-white text-xs font-bold"
            onClick={() => setAppUpdateAvailable(false)}
          >
            {language === 'bn' ? 'পরে' : 'Later'}
          </button>
        </div>
      )}

      {(isOffline || offlineQueueCount > 0 || offlineConflictCount > 0) && (
        <div className={`${isOffline ? 'bg-red-500' : offlineConflictCount > 0 ? 'bg-orange-600' : 'bg-amber-500'} text-white px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-sm font-semibold z-[100] shadow-md shrink-0 animate-in slide-in-from-top-2`}>
            <WifiOff className="w-4 h-4" />
            <span>
              {isOffline
                ? (language === 'bn'
                    ? 'আপনি অফলাইন। বিক্রি লোকালে সেভ হবে এবং অনলাইন হলে সিঙ্ক হবে।'
                    : 'You are offline. Sales still save locally and will sync when back online.')
                : offlineQueueCount > 0
                  ? (language === 'bn'
                      ? `${offlineQueueCount}টি পরিবর্তন সিঙ্কের অপেক্ষায়।`
                      : `${offlineQueueCount} change(s) waiting to sync.`)
                  : ''}
              {offlineConflictCount > 0
                ? (language === 'bn'
                    ? ` ${offlineConflictCount}টি সিঙ্ক কনফ্লিক্ট মীমাংসিত।`
                    : ` ${offlineConflictCount} sync conflict(s) resolved (server kept or delta applied).`)
                : ''}
            </span>
            {!isOffline && offlineQueueCount > 0 && (
              <button
                type="button"
                disabled={syncingQueue}
                onClick={() => {
                  setSyncingQueue(true);
                  flushOfflineQueue(authFetch).finally(() => {
                    setOfflineQueueCount(getOfflineQueueCount());
                    setOfflineConflictCount(getOfflineConflicts().length);
                    setSyncingQueue(false);
                  });
                }}
                className="ml-2 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-xs font-bold"
              >
                {syncingQueue ? (language === 'bn' ? 'সিঙ্ক হচ্ছে…' : 'Syncing…') : (language === 'bn' ? 'এখন সিঙ্ক' : 'Sync now')}
              </button>
            )}
            {!isOffline && offlineConflictCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  const list = getOfflineConflicts();
                  if (list.length) {
                    const preview = list.slice(0, 8).map((c: any) => `${c.entity || c.method || 'item'}: ${c.message || c.reason || c.id || 'conflict'}`).join('\n');
                    window.alert((language === 'bn' ? 'সিঙ্ক কনফ্লিক্ট:\n' : 'Sync conflicts:\n') + preview + (list.length > 8 ? '\n…' : ''));
                  }
                  clearOfflineConflicts();
                  setOfflineConflictCount(0);
                }}
                className="ml-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 text-xs font-bold"
              >
                Dismiss conflicts
              </button>
            )}
        </div>
      )}
      {(activeAnnouncements || []).map((ann: any) => {
        const bg =
          ann.type === 'maintenance' || ann.type === 'error' ? 'bg-red-600'
          : ann.type === 'warning' ? 'bg-amber-500'
          : ann.type === 'success' ? 'bg-emerald-600'
          : 'bg-indigo-600';
        return (
        <div key={ann.id} className={`${bg} text-white px-4 py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm font-semibold z-[100] shadow-md shrink-0`}>
          <span>
            <span className="uppercase text-[10px] opacity-80 mr-2">{ann.type || 'info'}</span>
            <strong className="mr-1">{ann.title}</strong>
            {ann.message}
            {ann.endsAt ? (
              <span className="opacity-80 font-normal ml-1">
                · until {new Date(ann.endsAt).toLocaleString()}
              </span>
            ) : null}
          </span>
          <button type="button" onClick={() => {
            const updated = [...dismissedAnnouncementIds, ann.id];
            setDismissedAnnouncementIds(updated);
            localStorage.setItem('bizora_dismissed_announcements', JSON.stringify(updated));
            setActiveAnnouncements(prev => prev.filter((x: any) => x.id !== ann.id));
            setActiveAnnouncement(null);
          }} className="px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 font-bold shrink-0">Dismiss</button>
        </div>
        );
      })}
      
      {globalAlert && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 mb-2">Notification</h3>
                    <p className="text-slate-600 text-sm whitespace-pre-wrap">{globalAlert}</p>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center">
                    <button 
                        onClick={() => setGlobalAlert(null)}
                        className="w-full py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        {t('OK')}
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside 
        className={`hidden lg:flex flex-col relative text-white transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] z-30 overflow-hidden ${sidebarOpen ? 'w-64' : 'w-20'} border-r border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/90 backdrop-blur-2xl shadow-[4px_0_40px_rgba(15,23,42,0.4)]`}
      >
        {/* Glass ambient layers */}
        <div className="sidebar-glass-orb pointer-events-none absolute -top-24 -left-16 w-48 h-48 rounded-full bg-indigo-500/20 blur-3xl animate-pulse" />
        <div className="pointer-events-none absolute bottom-20 -right-10 w-40 h-40 rounded-full bg-violet-600/15 blur-3xl" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,transparent_28%,transparent_100%)]" />

        <div className={`relative z-10 h-16 flex items-center ${sidebarOpen ? 'justify-between px-4' : 'justify-center'} border-b border-white/10 bg-white/5 backdrop-blur-md`}>
           <Link to="/" className="flex items-center gap-2.5 group transition-transform active:scale-95" title="Bizora Dashboard">
               <img src="/assets/bizora-emblem.png" alt="Bizora" className="w-8 h-8 object-contain shrink-0 group-hover:scale-105 transition-transform" />
               {sidebarOpen && (
                 <div className="flex flex-col">
                   <h1 className="text-lg font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent leading-none">Bizora</h1>
                   <span className="text-[9px] font-semibold text-cyan-400 tracking-wider uppercase mt-0.5">Cloud ERP</span>
                 </div>
               )}
           </Link>
           {sidebarOpen && (
               <button onClick={() => setSidebarOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                   <ChevronLeft className="w-5 h-5" />
               </button>
           )}
        </div>
        
        <nav className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar py-4">
          <NavList collapsed={!sidebarOpen} />
        </nav>

        <div className="p-3 border-t border-white/10 bg-white/5 backdrop-blur-md bg-[#0f172a]">
           <div className={`flex items-center ${sidebarOpen ? 'gap-3 px-2' : 'justify-center'} transition-all`}>
              <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 border border-slate-600">
                 <UserCircle className="w-5 h-5 text-slate-300" />
              </div>
              {sidebarOpen && (
                  <div className="flex-1 min-w-0">
                     <p className="text-xs font-semibold text-white truncate">{isSaaSUser ? t('SaaS Platform') : (user?.businessName || 'Business')}</p>
                     <p className="text-[10px] text-slate-400 truncate">{isSaaSUser ? t('Administrator') : (user?.role || 'User')}</p>
                  </div>
              )}
              {sidebarOpen && (
                  <button onClick={logout} className="text-slate-400 hover:text-red-400 transition-colors p-1" title={t('Logout')}>
                     <LogOut className="w-4 h-4" />
                  </button>
              )}
           </div>
        </div>
      </aside>

      {/* --- MOBILE FULL MENU DRAWER / SLIDE-OVER --- */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setMobileMenuOpen(false)}
            />
            {/* Panel */}
            <div className="absolute right-0 top-0 bottom-0 w-full sm:w-[480px] sm:max-w-md bg-slate-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 z-10 border-l border-slate-200" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
                <div className="p-4 flex justify-between items-center bg-white border-b border-slate-200 shrink-0">
                    <div className="min-w-0">
                      <h2 className="font-bold text-lg text-slate-800 leading-tight">{t('All Applications')}</h2>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                        {user?.name || user?.businessName || ''}
                        {isEmployeeUser ? ' · Staff' : ''}
                      </p>
                    </div>
                    <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-600 transition-colors shrink-0" aria-label="Close menu">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar pb-8">
                    <div className="mb-4 flex gap-2">
                      <Link
                        to="/settings"
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex-1 text-center text-xs font-bold py-2 rounded-xl bg-white border border-slate-200 text-slate-700"
                      >
                        {t('Settings')}
                      </Link>
                      <button
                        type="button"
                        id="mobile-menu-logout"
                        onClick={() => { setMobileMenuOpen(false); logout(); }}
                        className="flex-1 text-center text-xs font-bold py-2 rounded-xl bg-rose-50 border border-rose-100 text-rose-700"
                      >
                        {t('Logout') || 'Logout'}
                      </button>
                    </div>
                    {/* Real-time Navigation Search Filter */}
                    <div className="relative mb-4">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={mobileSearchQuery}
                        onChange={(e) => setMobileSearchQuery(e.target.value)}
                        placeholder={language === 'bn' ? 'ফিচার বা মেনু খুঁজুন...' : 'Search features or pages...'}
                        className="w-full pl-9 pr-9 py-2.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100 placeholder-slate-400"
                      />
                      {mobileSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setMobileSearchQuery('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {mobileSearchQuery.trim() ? (
                      <div className="mb-6 space-y-2">
                        <div className="flex items-center justify-between px-1 mb-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            {language === 'bn' ? 'অনুসন্ধানের ফলাফল' : 'Search Results'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {searchResults.length} {language === 'bn' ? 'টি পাওয়া গেছে' : 'found'}
                          </span>
                        </div>
                        {searchResults.length > 0 ? (
                          <div className="space-y-1.5">
                            {searchResults.map(item => {
                              const IconComponent = getNavIcon(item.iconName);
                              const itemLabel = language === 'bn' ? item.labelBn : item.label;
                              const itemDesc = language === 'bn' ? item.descriptionBn : item.description;
                              const isActive = location.pathname === item.to;
                              return (
                                <MobileMenuItem
                                  key={item.id}
                                  to={item.to}
                                  icon={IconComponent}
                                  label={itemLabel}
                                  description={itemDesc}
                                  badge={item.badge}
                                  badgeColor={item.badgeColor}
                                  active={isActive}
                                  isLocked={item.isLocked}
                                  onClick={() => setMobileMenuOpen(false)}
                                />
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-8 text-center bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
                            <Search className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                              {language === 'bn' ? 'কোনো ফলাফল পাওয়া যায়নি' : 'No features found'}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-1">
                              {language === 'bn' ? `"${mobileSearchQuery}" এর জন্য কিছু খুঁজে পাওয়া যায়নি` : `No matching routes for "${mobileSearchQuery}"`}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : isSaaSUser ? (
                        saasSections.map(section => (
                            <React.Fragment key={section.title}>
                                <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 px-1">{section.title}</h3>
                                <div className="space-y-1.5 mb-6">
                                    {section.items.map(item => (
                                        <MobileMenuItem 
                                            key={item.to + item.label}
                                            to={item.to} 
                                            icon={item.icon} 
                                            label={item.label} 
                                            active={location.pathname === item.to.split('?')[0]}
                                            onClick={() => setMobileMenuOpen(false)} 
                                        />
                                    ))}
                                </div>
                            </React.Fragment>
                        ))
                    ) : (
                        <>
                            {/* Quick Access Shortcuts */}
                            <div className="mb-5">
                              <h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2 px-1 tracking-wider">
                                {language === 'bn' ? 'দ্রুত শর্টকাট' : 'Quick Actions'}
                              </h3>
                              <div className="grid grid-cols-4 gap-2">
                                {[
                                  { to: '/', label: language === 'bn' ? 'হোম' : 'Home', icon: LayoutDashboard },
                                  { to: '/sale', label: language === 'bn' ? 'বিক্রয়' : 'Sell', icon: ShoppingBag },
                                  { to: '/stock', label: language === 'bn' ? 'স্টক' : 'Stock', icon: Package },
                                  { to: '/cashbox', label: language === 'bn' ? 'ক্যাশ' : 'Cash', icon: Wallet },
                                ].map(quick => (
                                  <Link
                                    key={quick.to}
                                    to={quick.to}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all text-center ${
                                      location.pathname === quick.to
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-300'
                                    }`}
                                  >
                                    <quick.icon className="w-5 h-5 mb-1" />
                                    <span className="text-[10px] font-bold truncate max-w-full">{quick.label}</span>
                                  </Link>
                                ))}
                              </div>
                            </div>

                            {/* Category Accordions */}
                            <div className="space-y-3 mb-6">
                              {authorizedNavGroups.map(group => {
                                const isExpanded = openGroups[group.id] !== false;
                                const groupTitle = language === 'bn' ? group.titleBn : group.title;
                                const GroupIcon = getNavIcon(group.iconName);
                                const hasActive = group.items.some(i => location.pathname === i.to);

                                return (
                                  <div key={group.id} className="rounded-xl border border-slate-200/80 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/40 overflow-hidden">
                                    <button
                                      type="button"
                                      onClick={() => toggleGroup(group.id)}
                                      className={`w-full flex items-center justify-between p-3 transition-colors ${
                                        hasActive ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                          hasActive ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
                                        }`}>
                                          <GroupIcon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-xs font-bold truncate">{groupTitle}</span>
                                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">
                                          {group.items.length}
                                        </span>
                                      </div>
                                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                                    </button>
                                    {isExpanded && (
                                      <div className="p-2 space-y-1.5 border-t border-slate-100 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/30">
                                        {group.items.map(item => {
                                          const IconComponent = getNavIcon(item.iconName);
                                          const itemLabel = language === 'bn' ? item.labelBn : item.label;
                                          const itemDesc = language === 'bn' ? item.descriptionBn : item.description;
                                          const isActive = location.pathname === item.to;
                                          return (
                                            <MobileMenuItem
                                              key={item.id}
                                              to={item.to}
                                              icon={IconComponent}
                                              label={itemLabel}
                                              description={itemDesc}
                                              badge={item.badge}
                                              badgeColor={item.badgeColor}
                                              active={isActive}
                                              isLocked={item.isLocked}
                                              onClick={() => setMobileMenuOpen(false)}
                                            />
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                        </>
                    )}
                    
                    {user?.businesses && user.businesses.length > 1 && (
                        <div className="mb-6">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 px-1">{t('Switch Business')}</h3>
                            <div className="space-y-2">
                                {user.businesses.map(biz => (
                                    <button
                                        key={biz?.id}
                                        onClick={() => {
                                            if (biz?.id) {
                                                switchBusiness(biz.id);
                                                setMobileMenuOpen(false);
                                            }
                                        }}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all ${user.businessName === biz?.name ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white border border-slate-200 text-slate-700'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${user.businessName === biz?.name ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                                            {biz?.name?.charAt(0) || ''}
                                        </div>
                                        <div className="text-left flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate">{biz?.name || ''}</p>
                                            <p className={`text-[10px] truncate ${user.businessName === biz?.name ? 'text-white/70' : 'text-slate-500'}`}>{biz?.type || ''}</p>
                                        </div>
                                        {user.businessName === biz?.name && <CheckCircle className="w-4 h-4" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Mobile Settings Panel (Language, Currency, Theme) */}
                    <div className="mb-6 p-4 bg-slate-100/60 rounded-xl border border-slate-200/60">
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 px-1">{t('System Settings')}</h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-slate-500 font-medium px-1">{t('Language')}</span>
                                <select 
                                    value={language} 
                                    onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                                    className="w-full bg-white text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none hover:border-slate-300"
                                >
                                    {Object.entries(AppLanguage).map(([key, value]) => (
                                      <option key={value} value={value}>{key.charAt(0) + key.slice(1).toLowerCase()}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] text-slate-500 font-medium px-1">{t('Currency')}</span>
                                <select 
                                    value={currency} 
                                    onChange={(e) => setCurrency(e.target.value as Currency)}
                                    className="w-full bg-white text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none hover:border-slate-300"
                                >
                                    {Object.values(Currency).map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                            <span className="text-[11px] text-slate-600 font-semibold px-1">{language === 'bn' ? 'থিম মোড' : 'Theme Mode'}</span>
                            <div className="flex bg-white rounded-lg p-0.5 border border-slate-200 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setThemeMode('light')}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${themeMode === 'light' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    <Sun className="w-3.5 h-3.5" />
                                    <span>{language === 'bn' ? 'লাইট' : 'Light'}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setThemeMode('dark')}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md font-bold transition-all ${themeMode === 'dark' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                                >
                                    <Moon className="w-3.5 h-3.5" />
                                    <span>{language === 'bn' ? 'ডার্ক' : 'Dark'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={logout} className="w-full py-3 text-red-600 font-bold bg-red-50 rounded-xl mt-4 mb-safe border border-red-100">
                        {t('Logout')}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 relative border-l border-slate-200 dark:border-slate-800 shadow-sm max-w-full overflow-x-hidden">
        
        {/* Header */}
        <header className="h-16 shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-[60] max-w-full overflow-visible">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1 mr-2">
            {!sidebarOpen && (
                <button onClick={() => setSidebarOpen(true)} className="hidden lg:flex p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">
                    <Menu className="w-5 h-5"/>
                </button>
            )}
            {/* Mobile Logo in Header with Hamburger Toggle */}
            <div className="lg:hidden flex items-center gap-2 min-w-0 flex-1">
                <button 
                  onClick={() => setMobileMenuOpen(true)} 
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition-colors focus:outline-none shrink-0" 
                  aria-label="Open menu"
                >
                    <Menu className="w-5 h-5"/>
                </button>
                <Link to="/" className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform active:scale-95" title="Bizora Dashboard">
                  <img src="/assets/bizora-emblem.png" alt="Bizora" className="w-8 h-8 object-contain drop-shadow-sm" />
                </Link>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="text-sm font-bold text-slate-800 truncate">{getPageTitle(location.pathname)}</h2>
                    {isEmployeeUser && (
                      <span className="shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">Staff</span>
                    )}
                  </div>
                  {getPageHint(location.pathname) && (
                    <p className="text-[10px] text-slate-500 truncate">{getPageHint(location.pathname)}</p>
                  )}
                </div>
            </div>
            
            {location.pathname === '/admin' ? (
              <div className="hidden lg:flex items-center gap-3">
                <span className="font-extrabold text-slate-800 text-lg tracking-tight">Bizora ERP</span>
                <span className={`text-[10px] px-2.5 py-1 rounded-full font-black uppercase tracking-wider border shadow-xs ${
                    simulatedRole === 'SUPER_ADMIN' ? 'bg-indigo-50 text-indigo-600 border-indigo-200' :
                    simulatedRole === 'ADMIN' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    'bg-rose-50 text-rose-600 border-rose-200'
                }`}>
                    {simulatedRole === 'SUPER_ADMIN' ? 'Super Admin' :
                     simulatedRole === 'ADMIN' ? 'Operations Admin' : 'Support Specialist'}
                </span>
              </div>
            ) : (
              <div className="hidden lg:block min-w-0">
                <nav className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-0.5 select-none" aria-label="Breadcrumb">
                  {getNavBreadcrumbs(location.pathname, language).map((crumb, idx, arr) => {
                    const isLast = idx === arr.length - 1;
                    return (
                      <React.Fragment key={crumb.label + idx}>
                        {crumb.to && !isLast ? (
                          <Link to={crumb.to} className="hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors">
                            {crumb.label}
                          </Link>
                        ) : (
                          <span className={isLast ? 'font-bold text-slate-800 dark:text-slate-100' : 'font-medium'}>
                            {crumb.label}
                          </span>
                        )}
                        {!isLast && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      </React.Fragment>
                    );
                  })}
                  {isEmployeeUser && (
                    <span className="ml-1 text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">Staff</span>
                  )}
                </nav>
                {getPageHint(location.pathname) && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-md">{getPageHint(location.pathname)}</p>
                )}
              </div>
            )}
            {isSaaSUser && location.pathname !== '/admin' && (
              <a 
                href={`${ADMIN_APP_URL}/admin`} 
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-indigo-950/20 shrink-0"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Go to Admin Panel</span>
              </a>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4 shrink-0">
            {/* If admin, show UX Simulator here */}
            {location.pathname === '/admin' && (
              <div className="flex bg-slate-100 border border-slate-200 p-1 rounded-xl items-center gap-1">
                <span className="text-[9px] font-bold text-slate-500 px-2 uppercase tracking-wider select-none hidden md:inline">UX Simulator</span>
                {[
                  { key: 'SUPER_ADMIN', label: 'Super Admin', activeClass: 'bg-indigo-600 text-white shadow-xs', color: 'bg-indigo-500' },
                  { key: 'ADMIN', label: 'Operations', activeClass: 'bg-blue-600 text-white shadow-xs', color: 'bg-blue-500' },
                  { key: 'SUPPORT', label: 'Support Team', activeClass: 'bg-rose-600 text-white shadow-xs', color: 'bg-rose-500' }
                ].map(btn => (
                  <button
                    key={btn.key}
                    onClick={() => {
                      const newParams = new URLSearchParams(searchParams);
                      newParams.set('simRole', btn.key);
                      setSearchParams(newParams);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      simulatedRole === btn.key 
                        ? btn.activeClass 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${simulatedRole === btn.key ? 'bg-white' : btn.color} shrink-0`} />
                    <span className="hidden sm:inline">{btn.label}</span>
                    <span className="sm:hidden">{btn.label === 'Support Team' ? 'Support' : btn.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Action Shortcuts (Desktop) */}
            {!isSaaSUser && (
              <div className="hidden xl:flex items-center gap-1.5 mr-1">
                <Link
                  to="/quick-sale"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 border border-amber-200 dark:border-amber-800 transition-all shadow-xs"
                  title="Quick Sale (Cashier)"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  <span>{language === 'bn' ? 'দ্রুত বিক্রি' : 'Quick Sale'}</span>
                </Link>
                <Link
                  to="/ai-chat"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-800 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 transition-all shadow-xs"
                  title="Bizora AI Assistant"
                >
                  <Bot className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{language === 'bn' ? 'এআই' : 'AI Assistant'}</span>
                </Link>
              </div>
            )}

            {/* Business Switcher */}
            {!isSaaSUser && <BusinessSwitcher />}

            {/* Store Switcher */}
            {!isSaaSUser && <StoreSwitcher />}

            {/* Language/Currency for Desktop */}
            <div className="hidden md:flex items-center gap-2">
                <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value as AppLanguage)}
                    className="bg-slate-50 text-xs font-medium text-slate-700 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none hover:border-slate-300"
                >
                    {Object.entries(AppLanguage).map(([key, value]) => (
                      <option key={value} value={value}>{key.charAt(0) + key.slice(1).toLowerCase()}</option>
                    ))}
                </select>
                <select 
                    value={currency} 
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="bg-slate-50 text-xs font-medium text-slate-700 border border-slate-200 rounded-md px-2 py-1.5 focus:outline-none hover:border-slate-300"
                >
                    {Object.values(Currency).map(c => <option key={c} value={c}>{CURRENCY_SYMBOLS[c]} {c}</option>)}
                </select>
                <button
                    type="button"
                    onClick={() => setThemeMode(themeMode === 'dark' ? 'light' : 'dark')}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors border border-slate-200 dark:border-slate-700"
                    title={themeMode === 'dark' ? (language === 'bn' ? 'লাইট মোড চালু করুন' : 'Switch to Light Mode') : (language === 'bn' ? 'ডার্ক মোড চালু করুন' : 'Switch to Dark Mode')}
                    aria-label="Toggle theme mode"
                >
                    {themeMode === 'dark' ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                        <Moon className="w-4 h-4 text-slate-600" />
                    )}
                </button>
            </div>


            {/* Connection status (mobile-visible) */}
            <div
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold border shrink-0 ${
                isOffline
                  ? 'bg-red-50 text-red-700 border-red-200'
                  : offlineConflictCount > 0
                    ? 'bg-orange-50 text-orange-800 border-orange-200'
                    : offlineQueueCount > 0
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
              title={isOffline ? 'Offline' : offlineQueueCount > 0 ? `${offlineQueueCount} pending` : 'Online'}
            >
              {isOffline ? (
                <WifiOff className="w-3.5 h-3.5" />
              ) : offlineQueueCount > 0 ? (
                <Cloud className="w-3.5 h-3.5" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
              <span className="hidden sm:inline">
                {isOffline
                  ? (language === 'bn' ? 'অফলাইন' : 'Offline')
                  : offlineConflictCount > 0
                    ? (language === 'bn' ? 'কনফ্লিক্ট' : 'Conflict')
                    : offlineQueueCount > 0
                      ? (language === 'bn' ? `${offlineQueueCount} পেন্ডিং` : `${offlineQueueCount} pending`)
                      : (language === 'bn' ? 'অনলাইন' : 'Online')}
              </span>
              <span className="sm:hidden">
                {isOffline ? 'Off' : offlineQueueCount > 0 ? offlineQueueCount : 'On'}
              </span>
            </div>

            <NotificationCenter />
            
            <Link to="/settings" className="hidden lg:flex p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative group">
                <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform duration-500" />
            </Link>
          </div>
        </header>

        {/* Scrollable View */}
        <main ref={mainScrollRef} className={`flex-1 overflow-y-auto overflow-x-hidden scroll-smooth bg-slate-50 relative ${isPOSPage ? 'p-0 pb-24 lg:pb-0' : 'p-3 sm:p-4 lg:p-8 pb-24 lg:pb-8 animate-in fade-in duration-500'}`}>
          {!isPOSPage && (
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px] opacity-30 dark:hidden"></div>
          )}
          <div className={`relative ${isPOSPage ? 'h-full' : 'max-w-[1600px] mx-auto w-full'}`}>
            {children}
            {!isPOSPage && !isPublicStorefront && (
              <footer className="mt-12 pt-6 pb-2 border-t border-slate-200/80 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-700">Bizora ERP</span>
                  <span>·</span>
                  <span>v{APP_VERSION}</span>
                  <span>·</span>
                  <span>&copy; {new Date().getFullYear()} Bizora Platform</span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-slate-500">
                  <Link to="/support" className="hover:text-indigo-600 transition-colors">Help &amp; Support</Link>
                  <Link to="/training" className="hover:text-indigo-600 transition-colors">User Guide</Link>
                  <a href="#/legal/privacy-policy" className="hover:text-indigo-600 transition-colors">Privacy</a>
                  <a href="#/legal/terms-of-service" className="hover:text-indigo-600 transition-colors">Terms</a>
                  <a href="#/legal" className="hover:text-indigo-600 transition-colors">Trust Center</a>
                  <a href="mailto:support@bizora.app" className="hover:text-indigo-600 transition-colors">support@bizora.app</a>
                </div>
              </footer>
            )}
          </div>
        </main>

        {/* --- MOBILE GLASS HORIZONTAL DOCK --- */}
        {!isSaaSUser && user && (() => {
            const hasQuick = check(PERMISSIONS.POS.subFeatures.QUICK_SALE.key);
            const hasSell = check(PERMISSIONS.POS.subFeatures.SELL.key);
            const sellPath = hasQuick ? '/quick-sale' : (hasSell ? '/sale' : '/stock');
            const sellLabel = hasQuick ? (t('Quick Sale') || 'Quick Sale') : (t('Sell') || 'Sell');
            const SellIcon = hasQuick ? Zap : ShoppingBag;

            const primaryNav: Array<{ to?: string; label: string; icon: any; isMenu?: boolean }> = [
              { to: '/', label: t('Home') || 'Home', icon: Home },
              { to: sellPath, label: sellLabel, icon: SellIcon },
              { to: '/stock', label: t('Stock') || 'Stock', icon: Package },
              { to: '/cashbox', label: t('Cash') || 'Cash', icon: Wallet },
              { isMenu: true, label: t('Menu') || (language === 'bn' ? 'মেনু' : 'Menu'), icon: Grid },
            ];

            return (
              <nav
                aria-label="Mobile Navigation"
                className="lg:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none"
                style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
              >
                <div className="pointer-events-auto mx-auto max-w-md px-3">
                  <div className="grid grid-cols-5 items-center gap-1 rounded-2xl border border-white/60 dark:border-white/10 bg-white/85 dark:bg-slate-900/90 backdrop-blur-2xl shadow-[0_16px_40px_rgba(15,23,42,0.18)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] ring-1 ring-slate-900/5 dark:ring-white/10 px-1.5 py-1.5">
                    {primaryNav.map((item, idx) => {
                      if (item.isMenu) {
                        return (
                          <button
                            key="bottom-nav-menu"
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="flex flex-col items-center justify-center gap-1 h-12 w-full rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 active:bg-slate-100/80 dark:active:bg-slate-800/80 transition-all select-none"
                          >
                            <Grid className="w-5 h-5 shrink-0" />
                            <span className="text-[10px] font-semibold leading-none truncate max-w-full px-0.5">
                              {item.label}
                            </span>
                          </button>
                        );
                      }

                      const Icon = item.icon;
                      const active = item.to === '/'
                        ? location.pathname === '/'
                        : (item.to && (location.pathname === item.to || location.pathname.startsWith(item.to + '/')));

                      return (
                        <Link
                          key={item.to || idx}
                          to={item.to!}
                          onMouseEnter={() => item.to && prefetchRoute(item.to)}
                          onFocus={() => item.to && prefetchRoute(item.to)}
                          onTouchStart={() => item.to && prefetchRoute(item.to)}
                          className={`flex flex-col items-center justify-center gap-1 h-12 w-full rounded-xl transition-all select-none ${
                            active
                              ? 'bg-indigo-600/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 font-bold ring-1 ring-indigo-500/20 shadow-xs'
                              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 active:bg-slate-100/80 dark:active:bg-slate-800/80'
                          }`}
                        >
                          <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                          <span className="text-[10px] font-semibold leading-none truncate max-w-full px-0.5 text-center">
                            {item.label}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </nav>
            );
        })()}


      </div>
    </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { setCurrency } = useSettings();
  const [activePortal, setActivePortal] = useState<PortalType>(() => detectCurrentPortal());
  useAutoBackup();

  useEffect(() => {
    const handleLocationChange = () => {
      setActivePortal(detectCurrentPortal());
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.businesses && user.businessName) {
      const activeBusiness = user.businesses.find(b => b && b.name === user.businessName);
      if (activeBusiness?.settings?.currency) {
        setCurrency(activeBusiness.settings.currency as Currency);
      }
    }
  }, [isAuthenticated, user?.businessName, user?.businesses, setCurrency]);

  const isLegalRoute = typeof window !== 'undefined' && (
    window.location.hash.toLowerCase().includes('/legal') ||
    window.location.pathname.toLowerCase().includes('/legal')
  );

  if (isLegalRoute) {
    return (
      <Router>
        <Suspense fallback={<PageLoader />}>
          <LegalRouter />
          <CookieBanner />
        </Suspense>
      </Router>
    );
  }

  if (!isAuthenticated) {
    if (activePortal === 'landing') {
      return (
        <Suspense fallback={<PageLoader />}>
          <LandingPage onNavigatePortal={(p) => setActivePortal(p)} />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<PageLoader />}>
        <PortalLogin portal={activePortal as any} onSwitchPortal={(p) => setActivePortal(p)} />
      </Suspense>
    );
  }

  // If user is authenticated but specifically opened #/landing, show LandingPage with a banner to jump back to ERP
  if (typeof window !== 'undefined' && window.location.hash.toLowerCase().startsWith('#/landing')) {
    return (
      <div className="relative">
        <div className="bg-slate-900 text-white px-4 py-2 text-xs font-bold flex items-center justify-between sticky top-0 z-[60] border-b border-slate-800">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Signed in as {user?.name || 'User'} ({user?.role}) · Viewing Public 3D Website
          </span>
          <a href="#/" className="px-3 py-1 bg-amber-400 text-black rounded-lg font-black hover:bg-amber-300 transition-colors">
            Return to ERP Dashboard →
          </a>
        </div>
        <Suspense fallback={<PageLoader />}>
          <LandingPage onNavigatePortal={(p) => setActivePortal(p)} />
        </Suspense>
      </div>
    );
  }

  if (user?.role === UserRole.CUSTOMER) {
    return <CustomerPortal />;
  }

  if (user?.role === UserRole.EMPLOYEE) {
    // Staff with POS/inventory/etc. permissions use the full shop shell (filtered nav).
    // HR-only employees stay on the self-service Employee Portal.
    if (hasOperationalPermissions(user.permissions)) {
      // fall through to main shop AppLayout
    } else {
      return <EmployeePortal />;
    }
  }

  if (user?.role === UserRole.SUPPLIER) {
    return <SupplierPortal />;
  }

  const isSaaSUser = user?.role === UserRole.SAAS_OWNER || user?.role === UserRole.SAAS_ADMIN;

  // SaaS accounts are not served by the shop client — send them to Admin app.
  if (isSaaSUser) {
    return <ExternalAdminRedirect />;
  }

  return (
    <Router>
      <SEOHead
        title="Bizora ERP Dashboard — Business Management"
        description="Bizora Cloud ERP authenticated business management portal."
        noIndex={true}
      />
      <OnboardingProvider>
        <InactivityTimer />
        <OnboardingTour />
        <Layout>
        <RouteErrorBoundary>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/s/:slug" element={<StorefrontPublic />} />
          <Route path="/store/:slug" element={<StorefrontPublic />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/legal" element={<LegalRouter />} />
          <Route path="/legal/*" element={<LegalRouter />} />
          {/* The Admin (SaaS) panel is now a separate app - see /admin project.
              SaaS users are bounced there instead of routing in-app. */}
          <Route path="/admin" element={<ExternalAdminRedirect />} />

          {/* Redirect SaaS users to the standalone admin app */}
          <Route path="/" element={
            isSaaSUser ? <ExternalAdminRedirect /> : <Dashboard />
          } />

          {/* Business Routes - Only accessible to non-SaaS users */}
          {!isSaaSUser && (
            <>
              <Route path="/sale" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.POS.subFeatures.SELL.key}>
                  <Sell />
                </ProtectedRoute>
              } />
              <Route path="/purchase" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY.subFeatures.PURCHASE.key}>
                  <Buy />
                </ProtectedRoute>
              } />
              <Route path="/quick-sale" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.POS.subFeatures.QUICK_SALE.key}>
                  <QuickSale />
                </ProtectedRoute>
              } />
              <Route path="/purchase-return" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.POS.subFeatures.RETURNS.key}>
                  <PurchaseReturn />
                </ProtectedRoute>
              } />
              <Route path="/sales-return" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.POS.subFeatures.RETURNS.key}>
                  <SalesReturn />
                </ProtectedRoute>
              } />
              <Route path="/quotations" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.POS.subFeatures.SELL.key}>
                  <QuotationPage />
                </ProtectedRoute>
              } />
              <Route path="/cashbox" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.VIEW_CASHBOX.key}>
                  <Cashbox />
                </ProtectedRoute>
              } />
              <Route path="/bank-reconcile" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.VIEW_CASHBOX.key}>
                  <Cashbox />
                </ProtectedRoute>
              } />
              <Route path="/sale-ledger" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key}>
                  <SaleLedger />
                </ProtectedRoute>
              } />
              <Route path="/purchase-ledger" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key}>
                  <PurchaseLedger />
                </ProtectedRoute>
              } />
              <Route path="/due-ledger" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key}>
                  <DueLedger />
                </ProtectedRoute>
              } />
              <Route path="/installments" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key}>
                  <InstallmentLedger />
                </ProtectedRoute>
              } />
              <Route path="/kitchen" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.POS.subFeatures.SELL.key}>
                  <KitchenDisplay />
                </ProtectedRoute>
              } />
              <Route path="/purchase-orders" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY.subFeatures.PURCHASE.key}>
                  <PurchaseOrderPage />
                </ProtectedRoute>
              } />
              <Route path="/hr-structure" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.HR.subFeatures.MANAGE_STAFF.key}>
                  <DepartmentDesignation />
                </ProtectedRoute>
              } />
              <Route path="/expense-ledger" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key}>
                  <ExpenseLedger />
                </ProtectedRoute>
              } />
              <Route path="/customers" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.CRM.subFeatures.VIEW_CUSTOMERS.key}>
                  <Customers />
                </ProtectedRoute>
              } />
              <Route path="/suppliers" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.CRM.subFeatures.VIEW_CUSTOMERS.key}>
                  <Suppliers />
                </ProtectedRoute>
              } />
              <Route path="/lots" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY.subFeatures.VIEW_STOCK.key}>
                  <LotEnquiry />
                </ProtectedRoute>
              } />
              <Route path="/stock" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY.subFeatures.VIEW_STOCK.key}>
                  <StockReport />
                </ProtectedRoute>
              } />
              <Route path="/products" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY.subFeatures.VIEW_STOCK.key}>
                  <ProductList />
                </ProtectedRoute>
              } />
              <Route path="/product-attributes" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY.subFeatures.VIEW_STOCK.key}>
                  <ProductAttributes />
                </ProtectedRoute>
              } />
              <Route path="/production" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY.subFeatures.PRODUCTION.key} requiredFeature="manufacturing">
                  <Production />
                </ProtectedRoute>
              } />
              <Route path="/transfer" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY.subFeatures.TRANSFER.key} requiredFeature="inventory.transfers">
                  <ProductTransfer />
                </ProtectedRoute>
              } />
              <Route path="/stores" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN.subFeatures.MANAGE_STORES.key} requiredFeature="system.multi_branch">
                  <StoreManagement />
                </ProtectedRoute>
              } />
              <Route path="/employees" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.HR.subFeatures.MANAGE_STAFF.key} requiredFeature="hrm">
                  <EmployeeManagement />
                </ProtectedRoute>
              } />
              <Route path="/access" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN.subFeatures.ACCESS_CONTROL.key}>
                  <AppAccess />
                </ProtectedRoute>
              } />
              <Route path="/communication" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.CRM.subFeatures.COMMUNICATION.key} requiredFeature="crm.sms_email">
                  <Communication />
                </ProtectedRoute>
              } />
              <Route path="/marketing" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.CRM.subFeatures.MARKETING.key} requiredFeature="crm.marketing">
                  <Marketing />
                </ProtectedRoute>
              } />
              <Route path="/journal" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.VIEW_LEDGERS.key} requiredFeature="finance.ledgers">
                  <Journal />
                </ProtectedRoute>
              } />
              <Route path="/payments" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.VIEW_CASHBOX.key} requiredFeature="finance.online_gateways">
                  <OnlinePayments />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.REPORTS.subFeatures.VIEW_REPORTS.key}>
                  <BusinessReports />
                </ProtectedRoute>
              } />
              <Route path="/consolidation" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.REPORTS.subFeatures.VIEW_REPORTS.key} requiredFeature="reports.consolidated">
                  <Consolidation />
                </ProtectedRoute>
              } />
              <Route path="/shop" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.ONLINE_SHOP.subFeatures.MANAGE_SHOP.key} requiredFeature="ecommerce">
                  <OnlineShop />
                </ProtectedRoute>
              } />
              <Route path="/support" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.CRM.subFeatures.SUPPORT.key}>
                  <CustomerSupport />
                </ProtectedRoute>
              } />
              <Route path="/bin" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN.subFeatures.RECYCLE_BIN.key}>
                  <RecycleBin />
                </ProtectedRoute>
              } />
              <Route path="/subscription" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN.subFeatures.SUBSCRIPTION.key}>
                  <Subscription />
                </ProtectedRoute>
              } />
              <Route path="/training" element={<TrainingPage />} />
              <Route path="/printer" element={
                <ProtectedRoute requiredPermission={
                  isSaaSUser 
                    ? PERMISSIONS.SAAS.subFeatures.SETTINGS.key 
                    : PERMISSIONS.ADMIN.subFeatures.SETTINGS.key
                }>
                  <PrinterConfig />
                </ProtectedRoute>
              } />
              <Route path="/ai-chat" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.REPORTS.subFeatures.VIEW_REPORTS.key} requiredFeature="system.ai_assistant">
                  <AIChat />
                </ProtectedRoute>
              } />
              <Route path="/assistant" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.REPORTS.subFeatures.VIEW_REPORTS.key} requiredFeature="system.ai_assistant">
                  <AIChat />
                </ProtectedRoute>
              } />
              <Route path="/catalog" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY.subFeatures.VIEW_STOCK.key}>
                  <Catalog />
                </ProtectedRoute>
              } />
              <Route path="/wastage" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY.subFeatures.ADJUSTMENT.key}>
                  <Wastage />
                </ProtectedRoute>
              } />
              <Route path="/lc" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.MANAGE_ACCOUNTS.key}>
                  <LetterOfCredit />
                </ProtectedRoute>
              } />
              <Route path="/loans" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.MANAGE_ACCOUNTS.key}>
                  <Loans />
                </ProtectedRoute>
              } />
              <Route path="/hotel" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.POS.subFeatures.SELL.key}>
                  <Hotel />
                </ProtectedRoute>
              } />
              <Route path="/pf" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.HR.subFeatures.VIEW_PAYROLL.key}>
                  <ProvidentFund />
                </ProtectedRoute>
              } />
              <Route path="/eprocurement" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.INVENTORY.subFeatures.PURCHASE.key}>
                  <Eprocurement />
                </ProtectedRoute>
              } />
              <Route path="/vehicles" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN.subFeatures.SETTINGS.key}>
                  <Vehicles />
                </ProtectedRoute>
              } />
              <Route path="/visitors" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN.subFeatures.SETTINGS.key}>
                  <Visitors />
                </ProtectedRoute>
              } />
              <Route path="/projects" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.ADMIN.subFeatures.SETTINGS.key}>
                  <Projects />
                </ProtectedRoute>
              } />
              <Route path="/dealers" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.CRM.subFeatures.VIEW_CUSTOMERS.key}>
                  <Dealers />
                </ProtectedRoute>
              } />
              <Route path="/document-ai" element={
                <ProtectedRoute requiredPermission={PERMISSIONS.FINANCE.subFeatures.ADD_EXPENSE.key}>
                  <DocumentAi />
                </ProtectedRoute>
              } />
            </>
          )}

          {/* Shared Routes */}
          <Route path="/settings" element={
            <ProtectedRoute requiredPermission={
              isSaaSUser 
                ? PERMISSIONS.SAAS.subFeatures.SETTINGS.key 
                : PERMISSIONS.ADMIN.subFeatures.SETTINGS.key
            }>
              <SettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/audit" element={
            <ProtectedRoute requiredPermission={
              isSaaSUser 
                ? PERMISSIONS.SAAS.subFeatures.SETTINGS.key 
                : PERMISSIONS.ADMIN.subFeatures.SETTINGS.key
            }>
              <SettingsPage />
            </ProtectedRoute>
          } />
          <Route path="/audit-log" element={
            <ProtectedRoute requiredPermission={
              isSaaSUser 
                ? PERMISSIONS.SAAS.subFeatures.SETTINGS.key 
                : PERMISSIONS.ADMIN.subFeatures.SETTINGS.key
            }>
              <SettingsPage />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </RouteErrorBoundary>
      </Layout>
      <AnnouncementPopup user={user} />
      </OnboardingProvider>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <SoundProvider>
      <SettingsProvider>
        <NotificationProvider>
          <AuthProvider>
            <StoreProvider>
              <DataProvider>
                <AppContent />
              </DataProvider>
            </StoreProvider>
          </AuthProvider>
        </NotificationProvider>
      </SettingsProvider>
    </SoundProvider>
  );
};

export default App;
