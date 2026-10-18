import React, { useState, useEffect, lazy, Suspense, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserRole, GlobalEmployee } from '../types';
import { PERMISSIONS, hasPermission, canAccessPermission } from '../utils/permissions';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth, User } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { authFetch, hasAuthToken } from '../lib/apiClient';
import { useRealtimeSync, ensureRealtimeSocket } from '@shared/lib/realtimeSocket';
import { 
    Shield, Lock, Save, Trash2, Edit3, Image as ImageIcon, Users, 
    Activity, AlertTriangle, Search, Crown, CheckCircle, X, 
    TrendingUp, ShoppingCart, DollarSign, Package, Calendar, MoreVertical,
    ShoppingBag, FileText, CreditCard, Upload, UserPlus, Key, Database, Server, Download, HardDrive,
    HeadphonesIcon, Eye, EyeOff, Store, ClipboardList, ChevronDown, ChevronUp, Check, Briefcase, Bell, Mail, Plus, Play, Megaphone,
    Clock, ShieldAlert, RotateCcw, Smartphone, Phone, MapPin, AlertCircle, ArrowRight, ChevronRight, Star, Award,
    LayoutDashboard, Grid
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { AuditLog } from './AuditLog';
import { appVersionLabel, APP_VERSION, APP_BUILD } from '@shared/lib/appVersion';
import AdminReadinessPanel from './admin/AdminReadinessPanel';
import { ADMIN_NAV_CATEGORIES, getAdminModulesForRole } from './admin/adminNavCategories';
import { SubscriptionHealthBadge } from './admin/SubscriptionHealthBadge';
import Suppliers from './Suppliers';

// Lazy-loaded admin tabs (code-split — only load when opened)
const AdminBusinessesTab = lazy(() => import('./admin/AdminBusinessesTab'));
const AdminSuppliersTab = lazy(() => import('./admin/AdminSuppliersTab'));
const AdminSupportTab = lazy(() => import('./admin/AdminSupportTab'));
const AdminSubscriptionsTab = lazy(() => import('./admin/AdminSubscriptionsTab'));
const AdminNotificationsTab = lazy(() => import('./admin/AdminNotificationsTab'));
const AdminDashboardTab = lazy(() => import('./admin/AdminDashboardTab'));
const AdminSecurityTab = lazy(() => import('./admin/AdminSecurityTab'));
const AdminEmployeesTab = lazy(() => import('./admin/AdminEmployeesTab'));
const AdminRevenueCenterTab = lazy(() => import('./admin/AdminRevenueCenterTab'));
const AdminCustomerSearchTab = lazy(() => import('./admin/AdminCustomerSearchTab'));
const AdminSystemSettingsTab = lazy(() => import('./admin/AdminSystemSettingsTab'));
const AdminAnnouncementsTab = lazy(() => import('./admin/AdminAnnouncementsTab'));
const AdminPaymentGatewayTab = lazy(() => import('./admin/AdminPaymentGatewayTab'));
const AdminAiCenterTab = lazy(() => import('./admin/AdminAiCenterTab'));
const AdminAnalyticsCenterTab = lazy(() => import('./admin/AdminAnalyticsCenterTab'));
const AdminApiManagerTab = lazy(() => import('./admin/AdminApiManagerTab'));
const AdminAuditTab = lazy(() => import('./admin/AdminAuditTab'));
const AdminCustomerPortalTab = lazy(() => import('./admin/AdminCustomerPortalTab'));
const AdminDatabaseManagerTab = lazy(() => import('./admin/AdminDatabaseManagerTab'));
const AdminDeveloperTab = lazy(() => import('./admin/AdminDeveloperTab'));
const AdminEnterpriseTab = lazy(() => import('./admin/AdminEnterpriseTab'));
const AdminFeatureManagerTab = lazy(() => import('./admin/AdminFeatureManagerTab'));
const AdminFinanceAnalyticsTab = lazy(() => import('./admin/AdminFinanceAnalyticsTab'));
const AdminGlobalSearchTab = lazy(() => import('./admin/AdminGlobalSearchTab'));
const AdminLogsTab = lazy(() => import('./admin/AdminLogsTab'));
const AdminMarketingCenterTab = lazy(() => import('./admin/AdminMarketingCenterTab'));
const AdminMonitoringTab = lazy(() => import('./admin/AdminMonitoringTab'));
const AdminOwnerProfileTab = lazy(() => import('./admin/AdminOwnerProfileTab'));
const AdminReportsCenterTab = lazy(() => import('./admin/AdminReportsCenterTab'));
const AdminSupplierPortalTab = lazy(() => import('./admin/AdminSupplierPortalTab'));
const AdminTemplatesTab = lazy(() => import('./admin/AdminTemplatesTab'));
const AdminWebsiteCmsTab = lazy(() => import('./admin/AdminWebsiteCmsTab'));
import AdminNotificationCenter from './admin/AdminNotificationCenter';


// Mock Database of Shop Owners
const INITIAL_USERS: any[] = [];

// Mock Invoice Templates
const INITIAL_TEMPLATES: any[] = [];

// Mock Subscription Plans
const INITIAL_PLANS: any[] = [
  { id: 'trial', name: 'Trial', price: 0, features: ['5 products', '3 customers', 'Limited sales'], interval: '14 days' },
  { id: 'basic', name: 'Basic', price: 999, features: ['Single store', 'Basic reports', 'POS'], interval: 'month' },
  { id: 'pro', name: 'Pro', price: 2499, features: ['Multi branch', 'Advanced reports', 'Online shop'], interval: 'month' },
  { id: 'enterprise', name: 'Enterprise', price: 4999, features: ['Unlimited branches', 'API', 'Priority support'], interval: 'month' },
];

const AVAILABLE_FEATURES = [
    'Single Store', 'Unlimited Stores', 'Basic Reports', 'Advanced Analytics', 
    'Employee Management', 'Automated Tax Reports', 'Priority Support', 
    'E-commerce Integration', 'Real-time Backups', 'Custom API Access', 
    'White-label Options', 'SLA 99.9% Uptime', 'On-premise Deployment', 'Advanced Security Audit'
];

// Mock Subscription Requests
const INITIAL_REQUESTS: any[] = [];

// Mock Admins
const INITIAL_ADMINS: any[] = [];

// Mock System Logs
const INITIAL_LOGS: any[] = [];


const DEFAULT_GLOBAL_EMPLOYEES: GlobalEmployee[] = [];

const AdminPanel: React.FC = () => {
    const { t, promoSlides, updatePromoSlides, currencySymbol } = useSettings();
    const { user, registeredUsers, saasRequests, refreshSaasRequests, approveSaaSRequest, rejectSaaSRequest, impersonateUser, exitImpersonation, deleteUser, updateRegisteredUser } = useAuth();
    const { transactions, getAllData, importData, archiveTransactions, saasTickets, updateSaasTicket, refreshSaasTickets } = useData() as any; 
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') || 'dashboard';

    const [globalEmployees, setGlobalEmployees] = useState<GlobalEmployee[]>(() => {
        const saved = localStorage.getItem('bizora_global_employee_registry');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) {
                    return parsed.filter(e => !['Tanvir Rahman', 'Sadia Akhter', 'Arif Hasan', 'Sumaiya Islam'].includes(e.name));
                }
            } catch (e) {
                console.error("Error parsing global employee registry:", e);
            }
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem('bizora_global_employee_registry', JSON.stringify(globalEmployees));
    }, [globalEmployees]);

    const [selectedEmployee, setSelectedEmployee] = useState<GlobalEmployee | null>(null);
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [employeeRoleFilter, setEmployeeRoleFilter] = useState('ALL');

        const setActiveTab = (tab: string) => {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.set('tab', tab);
        setSearchParams(newParams, { replace: false });
        try {
          const el = document.getElementById('admin-workspace');
          el?.scrollTo?.({ top: 0, behavior: 'smooth' });
        } catch (_) {}
    };

    useEffect(() => {
        const currentMod = ADMIN_NAV_CATEGORIES.flatMap(c => c.modules).find(m => m.id === activeTab);
        const title = currentMod ? currentMod.label : (activeTab.charAt(0).toUpperCase() + activeTab.slice(1).replace('-', ' '));
        document.title = `${title} · Bizora SaaS Admin`;
    }, [activeTab]);


    const [viewingShopData, setViewingShopData] = useState<any | null>(null);

    // ROLE PREVIEW (synchronized with searchParams) - lets a real
    // SUPER_ADMIN preview the UI as a lower-privileged role, WITHOUT ever
    // letting a lower-privileged admin escalate themselves via the URL.
    // (Previously this defaulted to SUPER_ADMIN regardless of who was
    // actually logged in, which meant any authenticated SaaS Admin could
    // just visit ?simRole=SUPER_ADMIN and the UI would show every
    // super-admin-only section.)
    const roleStr = String(user?.role || '');
    const isOwner = roleStr === UserRole.SAAS_OWNER || roleStr === 'SAAS_OWNER' || roleStr === 'saas-owner';
    const realRole: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' = isOwner ? 'SUPER_ADMIN' : 'ADMIN';
    const requestedRole = searchParams.get('simRole') as 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' | null;
    const simulatedRole: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT' =
        realRole === 'SUPER_ADMIN' && requestedRole ? requestedRole : realRole;
    const setSimulatedRole = (role: 'SUPER_ADMIN' | 'ADMIN' | 'SUPPORT') => {
        if (realRole !== 'SUPER_ADMIN') return; // no-op for anyone who isn't really the Owner
        const newParams = new URLSearchParams(searchParams);
        newParams.set('simRole', role);
        setSearchParams(newParams);
    };

    // SEARCH & NAVIGATION STATES
    const [searchModuleQuery, setSearchModuleQuery] = useState('');

    // 7. CUSTOMER PORTAL STATES
    const [customerPortalAccounts, setCustomerPortalAccounts] = useState([
        { id: 'CUST-001', name: 'Kabir Ahmed', phone: '01711122233', status: 'Active', loginLogs: '2026-07-04 10:15 - Mirpur, Dhaka', verified: true },
        { id: 'CUST-002', name: 'Sultana Razia', phone: '01899112233', status: 'Active', loginLogs: '2026-07-03 18:42 - Chittagong', verified: true },
        { id: 'CUST-003', name: 'Naimur Rahman', phone: '01555443322', status: 'Suspended', loginLogs: '2026-06-28 11:05 - Sylhet', verified: false },
    ]);

    // 8. SUPPLIER PORTAL STATES
    const [supplierPortalAccounts, setSupplierPortalAccounts] = useState([
        { id: 'SUPP-001', name: 'Square Fabrics', phone: '01911223344', status: 'Verified', loginLogs: '2026-07-04 09:20 - Uttara, Dhaka' },
        { id: 'SUPP-002', name: 'Ananta Logistics', phone: '01811223344', status: 'Pending Verification', loginLogs: '2026-07-01 14:10 - Gazipur' },
    ]);

    // 9. PAYMENT GATEWAY STATES
    const [gatewaySettings, setGatewaySettings] = useState({
        sslcommerz: { active: true, storeId: 'bizora_live_90382', storeKey: '••••••••••••••••' },
        bkash: { active: true, appKey: 'bk_app_90381029', appSecret: '••••••••••••••••' },
        nagad: { active: true, merchantId: 'ng_merch_20392', privateKey: '••••••••••••••••' },
        stripe: { active: false, publishableKey: 'pk_live_51N...', secretKey: '••••••••••••••••' }
    });
    const [gatewayLogs, setGatewayLogs] = useState([
        { time: '2026-07-04 10:55', gateway: 'bKash', txId: 'BK92019302', amount: 15000, status: 'Success' },
        { time: '2026-07-04 09:12', gateway: 'SSLCommerz', txId: 'SSL8902183', amount: 82000, status: 'Success' },
        { time: '2026-07-04 08:30', gateway: 'Nagad', txId: 'NG8901238', amount: 20000, status: 'Success' }
    ]);

    // 10. REVENUE CENTER STATES - real payments ledger (backend/src/api/revenue.ts)
    const [commissionRate, setCommissionRate] = useState(1.5); // 1.5% commission on transactions
    const [revenuePayments, setRevenuePayments] = useState<any[]>([]);
    const [revenueSummary, setRevenueSummary] = useState({ totalRevenue: 0, totalRefunded: 0, netRevenue: 0, monthRevenue: 0, paymentCount: 0, refundCount: 0, monthly: [] as {month:string;amount:number}[], byMethod: {} as Record<string, number> });
    const [mrrSnapshots, setMrrSnapshots] = useState<any[]>([]);
    const [historicalNrr, setHistoricalNrr] = useState<any>(null);
    const [snapshotBusy, setSnapshotBusy] = useState(false);
    const [saasAlerts, setSaasAlerts] = useState<any[]>([]);
    const [atRiskThreshold, setAtRiskThreshold] = useState(5000);
    const [paymentForm, setPaymentForm] = useState({ businessId: '', amount: '', method: 'Bank Transfer' });

    const refreshRevenue = () => {
        if (!hasAuthToken()) return;
        authFetch('/api/admin/revenue/payments')
            .then(res => res.ok ? res.json() : null)
            .then(body => { if (body?.payments) setRevenuePayments(body.payments); })
            .catch(err => console.warn('Failed to load revenue payments:', err));
        authFetch('/api/admin/revenue/summary')
            .then(res => res.ok ? res.json() : null)
            .then(body => { if (body) setRevenueSummary(body); })
            .catch(err => console.warn('Failed to load revenue summary:', err));
    };

    useEffect(() => { refreshRevenue(); }, []);

    const refreshMrrSnapshots = () => {
        if (!hasAuthToken()) return;
        authFetch('/api/admin/mrr-snapshots')
            .then(res => res.ok ? res.json() : null)
            .then(body => {
                if (!body) return;
                setMrrSnapshots(body.snapshots || []);
                setHistoricalNrr(body.historicalNrr || null);
            })
            .catch(err => console.warn('MRR snapshots:', err));
    };
    useEffect(() => { refreshMrrSnapshots(); }, []);

    const refreshSaasAlerts = () => {
        if (!hasAuthToken()) return;
        authFetch('/api/admin/alerts?unread=1')
            .then(res => res.ok ? res.json() : null)
            .then(body => { if (body?.alerts) setSaasAlerts(body.alerts); })
            .catch(() => {});
    };
    useEffect(() => { refreshSaasAlerts(); }, []);

    const refreshCustomers = async () => {
        if (!hasAuthToken()) return;
        try {
            const res = await authFetch('/api/admin/customers');
            if (res.ok) {
                const body = await res.json();
                if (Array.isArray(body?.customers)) {
                    const normalized = body.customers.map((c: any) => ({
                        id: c.id,
                        name: c.name || 'Customer',
                        phone: c.mobile || c.phone || 'N/A',
                        mobile: c.mobile || c.phone || 'N/A',
                        email: c.email || '',
                        status: c.status || 'Active',
                        businessId: c.businessId,
                        businessName: c.businessName || 'Business',
                        loginLogs: c.updatedAt ? new Date(c.updatedAt).toLocaleString() : (c.createdAt ? new Date(c.createdAt).toLocaleString() : 'N/A'),
                        verified: Boolean(c.verified || c.mobile),
                        currentDue: c.currentDue || 0,
                        walletBalance: c.walletBalance || 0,
                    }));
                    setCustomerPortalAccounts(normalized);
                }
            }
        } catch (err) {
            console.warn('Failed to load admin customers:', err);
        }
    };
    useEffect(() => { refreshCustomers(); }, []);

    const refreshGlobalEmployees = async () => {
        if (!hasAuthToken()) return;
        try {
            const res = await authFetch('/api/admin/employees');
            if (res.ok) {
                const body = await res.json();
                if (Array.isArray(body?.employees)) {
                    setGlobalEmployees(body.employees);
                }
            }
        } catch (err) {
            console.warn('Failed to load admin employees:', err);
        }
    };
    useEffect(() => { refreshGlobalEmployees(); }, []);


    const captureMrrSnapshot = async (force = false) => {
        setSnapshotBusy(true);
        try {
            const res = await authFetch(`/api/admin/mrr-snapshots${force ? '?force=1' : ''}`, { method: 'POST', body: JSON.stringify({ force }) });
            if (res.ok) {
                const body = await res.json();
                showToast(body.created ? `Snapshot ${body.snapshot.month} saved` : `Snapshot ${body.snapshot.month} already exists`);
                refreshMrrSnapshots();
            } else showToast('Could not capture snapshot', 'error');
        } catch { showToast('Could not reach server', 'error'); }
        finally { setSnapshotBusy(false); }
    };


    const recordRevenuePayment = async () => {
        if (!paymentForm.businessId || !paymentForm.amount) return;
        const business = users.find((u: any) => u.id === paymentForm.businessId);
        try {
            const res = await authFetch('/api/admin/revenue/payments', {
                method: 'POST',
                body: JSON.stringify({
                    businessId: paymentForm.businessId,
                    businessName: business?.businessName || business?.name,
                    amount: parseFloat(paymentForm.amount),
                    plan: business?.plan,
                    method: paymentForm.method,
                }),
            });
            if (res.ok) {
                showToast('Payment recorded successfully', 'success');
                setPaymentForm({ businessId: '', amount: '', method: 'Bank Transfer' });
                refreshRevenue();
            } else {
                showToast('Could not record payment', 'error');
            }
        } catch (err) {
            showToast('Could not reach the server', 'error');
        }
    };

    const refundRevenuePayment = async (paymentId: string) => {
        try {
            const res = await authFetch(`/api/admin/revenue/payments/${paymentId}/refund`, { method: 'PATCH' });
            if (res.ok) {
                showToast('Payment refunded', 'success');
                refreshRevenue();
            } else {
                showToast('Could not process refund', 'error');
            }
        } catch (err) {
            showToast('Could not reach the server', 'error');
        }
    };

    // 11. FINANCE ANALYTICS STATES
    const [forecastMonths, setForecastMonths] = useState(6);
    const [forecastGrowth, setForecastGrowth] = useState(15); // 15% estimated monthly growth

    // 14. WEBSITE CMS STATES
    const [cmsHeroTitle, setCmsHeroTitle] = useState('Bizora ERP – Next-Gen Retail & Wholesale OS');
    const [cmsHeroSubtitle, setCmsHeroSubtitle] = useState('Complete Multi-Branch Store Management, Advanced Billing, Real-Time Ledgers, Dynamic Supplier/Employee Portals, and Advanced Business Intelligence.');
    const [cmsFaqs, setCmsFaqs] = useState([
        { q: 'Can I connect multiple branches?', a: 'Yes! The Enterprise & Nexus Pro plans support unlimited branch sync with unified warehouse transfers.' },
        { q: 'Is there an offline mode?', a: 'Yes, our local-first offline syncing engine automatically pushes sales transactions when the connection restores.' }
    ]);

    // 16. FEATURE MANAGER STATES
    const [globalFeatures, setGlobalFeatures] = useState<any>({
        aiAssistant: true,
        smsGateway: true,
        automatedTax: true,
        multiBranchSync: true,
        whiteLabeling: false,
        maintenanceMode: false
    });

    // 18. DATABASE MANAGER STATES
    const [dbBackups, setDbBackups] = useState([
        { id: 'DB-BAK-20260704', name: 'backup_live_20260704_0400.sql', size: '142 MB', status: 'Completed', date: '2026-07-04 04:00 AM' },
        { id: 'DB-BAK-20260703', name: 'backup_live_20260703_0400.sql', size: '139 MB', status: 'Completed', date: '2026-07-03 04:00 AM' },
        { id: 'DB-BAK-20260702', name: 'backup_live_20260702_0400.sql', size: '135 MB', status: 'Completed', date: '2026-07-02 04:00 AM' }
    ]);

    // 19. API MANAGER STATES
    const [apiKeys, setApiKeys] = useState([
        { id: 'KEY-01', label: 'External POS Webhook', key: 'biz_live_apk_782019a3b8d...', status: 'Active', created: '2026-05-12' },
        { id: 'KEY-02', label: 'Android Sync Core', key: 'biz_live_apk_90382017df8...', status: 'Active', created: '2026-06-01' }
    ]);
    const [webhookUrl, setWebhookUrl] = useState('https://api.myclienterp.com/webhooks/bizora');
    const [webhookLogs, setWebhookLogs] = useState([
        { id: 'WH-LOG-001', event: 'business.verified', url: 'https://api.myclienterp.com/...', status: 200, time: '2026-07-04 10:12 AM' },
        { id: 'WH-LOG-002', event: 'subscription.upgraded', url: 'https://api.myclienterp.com/...', status: 200, time: '2026-07-03 04:30 PM' }
    ]);

    // 20. AI CENTER STATES
    const [aiChatMessages, setAiChatMessages] = useState<any[]>([
        { sender: 'ai', text: 'Hello! I can answer real questions about your platform - businesses, subscriptions, and support tickets - computed directly from your live data. Try asking about "tickets", "churn risk", "plans", or "total businesses".' }
    ]);
    const [aiChatInput, setAiChatInput] = useState('');

    // Real, self-contained analytics answers - computed directly from
    // registeredUsers/saasTickets (both real Firestore-backed data now),
    // no external AI API call of any kind. Replaces what used to be a
    // hardcoded canned response regardless of what was typed.
    const getAdminAnalyticsReply = (query: string): string => {
        const q = query.toLowerCase();
        const totalBusinesses = serverDashboardStats?.totalBusinesses ?? registeredUsers.length;
        const premiumBusinesses = serverDashboardStats?.premiumBusinesses ?? registeredUsers.filter((u: any) => u.isPremium).length;
        const freeBusinesses = totalBusinesses - premiumBusinesses;
        const openTickets = saasTickets.filter(t => t.status === 'Open').length;
        const urgentTickets = saasTickets.filter(t => t.status === 'Open' && t.priority === 'Urgent').length;
        const ticketCountByBusiness: Record<string, number> = {};
        saasTickets.filter(t => t.status === 'Open').forEach(t => {
            ticketCountByBusiness[t.business_id] = (ticketCountByBusiness[t.business_id] || 0) + 1;
        });
        const atRiskCount = Object.values(ticketCountByBusiness).filter(c => c >= 2).length;

        if (q.includes('churn') || q.includes('risk')) {
            return atRiskCount > 0
                ? `${atRiskCount} business(es) have 2+ open support tickets right now, which is the closest real signal I have for risk - I don't have payment-history or login-activity data to model true churn probability yet. Check the Support Inbox for details.`
                : `No businesses currently have multiple open tickets, so nothing stands out as at-risk by that measure right now. (Note: I don't have payment-history or login-activity data yet to model true churn probability.)`;
        }
        if (q.includes('ticket') || q.includes('support')) {
            return `You have ${openTickets} open support ticket(s) right now, ${urgentTickets} of which are marked Urgent. ${atRiskCount} business(es) have 2 or more open tickets at once.`;
        }
        if (q.includes('plan') || q.includes('subscription') || q.includes('premium') || q.includes('growth') || q.includes('revenue')) {
            return `${premiumBusinesses} of your ${totalBusinesses} registered businesses are on a paid plan, and ${freeBusinesses} are on the free tier. I don't have historical snapshots stored yet, so I can't compute month-over-month growth - that would need a periodic snapshot job.`;
        }
        if (q.includes('business') || q.includes('shop') || q.includes('total') || q.includes('tenant')) {
            return `You have ${totalBusinesses} registered businesses in total - ${premiumBusinesses} on a paid plan and ${freeBusinesses} on the free tier.`;
        }
        return `Here's a quick snapshot: ${totalBusinesses} total businesses (${premiumBusinesses} paid), ${openTickets} open tickets (${urgentTickets} urgent). Ask me specifically about "tickets", "churn risk", or "plans" for more detail.`;
    };

    // 21. MARKETING CENTER STATES
    const [marketingCampaigns, setMarketingCampaigns] = useState<any[]>([]);

    // 24. GLOBAL SEARCH STATES
    const [globalSearchVal, setGlobalSearchVal] = useState('');

    // INTERACTIVE SYSTEM DASHBOARD STATES
    const [isOptimizingDb, setIsOptimizingDb] = useState(false);
    const [isPurgingCache, setIsPurgingCache] = useState(false);
    const [isRestartingWorkers, setIsRestartingWorkers] = useState(false);
    const [isTestingGateways, setIsTestingGateways] = useState(false);
    const [gatewayTestResult, setGatewayTestResult] = useState<{ bkash: string; ssl: string } | null>(null);
    const [serverDashboardStats, setServerDashboardStats] = useState<any>(null);
    useEffect(() => {
        if (activeTab !== 'dashboard' && activeTab !== 'analytics-center') return;
        const token = localStorage.getItem('bizora_token');
        if (!token) return;
        const base = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3000';
        fetch(`${base}/api/admin/dashboard-stats`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.ok ? r.json() : null)
            .then(body => { if (body?.stats) setServerDashboardStats(body.stats); })
            .catch(() => {});
    }, [activeTab]);


    const [liveCacheHitRate, setLiveCacheHitRate] = useState(98.4);
    const [liveDbResponseTime, setLiveDbResponseTime] = useState(12);
    // Real global announcement banner (backend/src/api/announcements.ts) -
    // replaces what used to be a localStorage-only value that only this
    // SaaS Owner's own browser could ever see, despite the UI calling it a
    // "broadcast" - no business ever actually received it. Now it's a
    // real Firestore-backed announcement that businesses fetch too (see
    // App.tsx's announcement banner on the business side).
    const [activeAnnouncementId, setActiveAnnouncementId] = useState<string | null>(null);
    const [globalEmergencyBanner, setGlobalEmergencyBanner] = useState('');
    const [emergencyBannerInput, setEmergencyBannerInput] = useState('');
    const [isBannerInputOpen, setIsBannerInputOpen] = useState(false);

    useEffect(() => {
        authFetch('/api/admin/announcements')
            .then(res => res.ok ? res.json() : null)
            .then(body => {
                const active = (body?.announcements || []).find((a: any) => a.scope === 'global' && a.active);
                if (active) {
                    setGlobalEmergencyBanner(active.message);
                    setActiveAnnouncementId(active.id);
                }
            })
            .catch(err => console.warn('Failed to load real announcements:', err));
    }, []);

    const broadcastAnnouncement = async (message: string) => {
        try {
            const res = await authFetch('/api/admin/announcements', {
                method: 'POST',
                body: JSON.stringify({ title: 'System Broadcast', message, type: 'maintenance', scope: 'global' }),
            });
            if (res.ok) {
                const { announcement } = await res.json();
                setGlobalEmergencyBanner(announcement.message);
                setActiveAnnouncementId(announcement.id);
                showToast('Global emergency banner broadcasted successfully!');
            } else {
                showToast('Could not broadcast the banner', 'error');
            }
        } catch (err) {
            showToast('Could not reach the server', 'error');
        }
    };

    const dismissAnnouncement = async () => {
        setGlobalEmergencyBanner('');
        if (!activeAnnouncementId) return;
        try {
            await authFetch(`/api/admin/announcements/${activeAnnouncementId}`, {
                method: 'PATCH',
                body: JSON.stringify({ active: false }),
            });
        } catch (err) {
            console.warn('Failed to retire announcement on the backend:', err);
        }
        setActiveAnnouncementId(null);
        showToast('Broadcast banner dismissed.');
    };

    // --- Announcement management (list + create) ---
    const [announcementList, setAnnouncementList] = useState<any[]>([]);
    const [annForm, setAnnForm] = useState({ title: '', message: '', type: 'info', scope: 'global', businessId: '', startsAt: '', endsAt: '' });

    const refreshAnnouncements = () => {
        authFetch('/api/admin/announcements')
            .then(res => res.ok ? res.json() : null)
            .then(body => { if (body?.announcements) setAnnouncementList(body.announcements); })
            .catch(err => console.warn('Failed to load announcements list:', err));
    };
    useEffect(() => { refreshAnnouncements(); }, []);

    const createAnnouncement = async (overridePayload?: any) => {
        const payloadToUse = overridePayload || {
            title: annForm.title,
            message: annForm.message,
            type: annForm.type,
            scope: annForm.scope,
            businessId: annForm.scope === 'business' ? annForm.businessId : undefined,
            active: true,
            startsAt: annForm.startsAt || undefined,
            endsAt: annForm.endsAt || undefined,
        };
        const title = (payloadToUse.title || '').trim();
        const msg = (payloadToUse.message || payloadToUse.body || '').trim();
        if (!title || !msg) {
            showToast('Title and message required', 'error');
            return;
        }
        try {
            const res = await authFetch('/api/admin/announcements', {
                method: 'POST',
                body: JSON.stringify(payloadToUse),
            });
            if (res.ok) {
                const body = await res.json();
                const announcement = body?.announcement;
                showToast('Announcement published successfully');
                const wasGlobalMaint = payloadToUse.scope === 'global' && payloadToUse.type === 'maintenance';
                setAnnForm({ title: '', message: '', type: 'info', scope: 'global', businessId: '', startsAt: '', endsAt: '' });
                refreshAnnouncements();
                if (wasGlobalMaint && announcement) {
                    setGlobalEmergencyBanner(announcement.message);
                    setActiveAnnouncementId(announcement.id);
                }
            } else {
                const errJson = await res.json().catch(() => ({}));
                showToast(errJson.error || 'Could not create announcement', 'error');
            }
        } catch { showToast('Could not reach the server', 'error'); }
    };

    const toggleAnnouncement = async (id: string, active: boolean) => {
        try {
            const res = await authFetch(`/api/admin/announcements/${id}`, {
                method: 'PATCH',
                body: JSON.stringify({ active }),
            });
            if (res.ok) {
                showToast(active ? 'Announcement activated' : 'Announcement retired');
                refreshAnnouncements();
            } else showToast('Update failed', 'error');
        } catch { showToast('Could not reach the server', 'error'); }
    };

    const deleteAnnouncement = async (id: string) => {
        if (!confirm('Delete this announcement?')) return;
        try {
            const res = await authFetch(`/api/admin/announcements/${id}`, { method: 'DELETE' });
            if (res.ok) {
                showToast('Announcement deleted');
                refreshAnnouncements();
            } else showToast('Delete failed', 'error');
        } catch { showToast('Could not reach the server', 'error'); }
    };

    // 25. SYSTEM SETTINGS STATES
    const [brandingName, setBrandingName] = useState('Bizora ERP');
    const [smtpHost, setSmtpHost] = useState('');
    const [smsGatewayUrl, setSmsGatewayUrl] = useState('');
    const [defaultCurrency, setDefaultCurrency] = useState('BDT');
    const [defaultTimezone, setDefaultTimezone] = useState('Asia/Dhaka');
    const [logoUrl, setLogoUrl] = useState('');
    const [faviconUrl, setFaviconUrl] = useState('');
    const [seoTitle, setSeoTitle] = useState('');
    const [seoDescription, setSeoDescription] = useState('');

    useEffect(() => {
        authFetch('/api/platform/settings')
            .then(res => res.ok ? res.json() : null)
            .then(body => {
                if (!body?.settings) return;
                const s = body.settings;
                setBrandingName(s.brandingName || 'Bizora ERP');
                setSmtpHost(s.smtpHost || '');
                setSmsGatewayUrl(s.smsGatewayUrl || '');
                setDefaultCurrency(s.defaultCurrency || 'BDT');
                setDefaultTimezone(s.defaultTimezone || 'Asia/Dhaka');
                setLogoUrl(s.logoUrl || '');
                setFaviconUrl(s.faviconUrl || '');
                setSeoTitle(s.seoTitle || '');
                setSeoDescription(s.seoDescription || '');
            })
            .catch(err => console.warn('Failed to load real platform settings:', err));
    }, []);

    const saveSystemSettings = async () => {
        try {
            const res = await authFetch('/api/platform/settings', {
                method: 'PUT',
                body: JSON.stringify({
                    brandingName, smtpHost, smsGatewayUrl, defaultCurrency, defaultTimezone,
                    logoUrl, faviconUrl, seoTitle, seoDescription,
                }),
            });
            if (res.ok) showToast('Global system configuration updated', 'success');
            else showToast('Could not save settings', 'error');
        } catch (err) {
            showToast('Could not reach the server', 'error');
        }
    };

    // 27. MONITORING CENTER STATES
    const [monitoringStats, setMonitoringStats] = useState({
        cpu: 0,
        ram: 0,
        storage: 0,
        queueCount: 0,
        failedJobs: 0,
        uptimeSeconds: 0,
        nodeVersion: '',
    });

    useEffect(() => {
        const fetchHealth = () => {
            authFetch('/api/admin/system-health')
                .then(res => res.ok ? res.json() : null)
                .then(body => {
                    if (!body) return;
                    setMonitoringStats(prev => ({
                        ...prev,
                        cpu: body.cpuLoadPercent ?? 0,
                        ram: body.memory?.systemUsedPercent ?? 0,
                        storage: 0, // disk usage isn't available without hosting-platform APIs - not fabricated
                        uptimeSeconds: body.uptimeSeconds ?? 0,
                        nodeVersion: body.nodeVersion ?? '',
                    }));
                })
                .catch(err => console.warn('Failed to load real system health:', err));
        };
        fetchHealth();
        const interval = setInterval(fetchHealth, 15000); // refresh every 15s while this tab is open
        return () => clearInterval(interval);
    }, []);

    // 28. DEVELOPER CENTER STATES
    const [terminalLogs, setTerminalLogs] = useState<string[]>([
        '[SYSTEM] Bizora Admin developer console initialized.'
    ]);
    const [devLogsInput, setDevLogsInput] = useState('');

    // Memoized Actual Shop Data loaders lookup from localStorage based on viewingShopData.id
    const inspectedProducts = useMemo(() => {
        if (!viewingShopData) return [];
        const saved = localStorage.getItem(`nexus_products_${viewingShopData.id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((p: any) => ({
                        name: p.name,
                        cat: p.category || 'Fashion & Clothing',
                        stock: p.stock !== undefined ? p.stock : 10,
                        buy: p.purchasePrice || 100,
                        sell: p.salePrice || 150
                    }));
                }
            } catch (e) {
                console.error('Error parsing product data', e);
            }
        }
        return [
            { name: 'Kashmiri Silk Saree Premium', cat: 'Fashion & Clothing', stock: 12, buy: 3500, sell: 5500 },
            { name: 'Pure Cotton Handloom Panjabi', cat: 'Fashion & Clothing', stock: 45, buy: 850, sell: 1450 },
            { name: 'Samsung Crystal 4K UHD Pro 43"', cat: 'Consumer Electronics', stock: 4, buy: 38000, sell: 43500 },
            { name: 'Sony WH-1000XM4 Noise Cancelling', cat: 'Consumer Electronics', stock: 8, buy: 23000, sell: 26500 },
            { name: 'Miniket Rice Premium Thin Grain (50kg)', cat: 'Grocery & Staples', stock: 15, buy: 3200, sell: 3650 },
            { name: 'Rupchanda Soyabean Oil Can 5L', cat: 'Grocery & Staples', stock: 20, buy: 810, sell: 890 },
            { name: 'Organic Darjeeling Green Tea Jar 250g', cat: 'Grocery & Staples', stock: 2, buy: 420, sell: 650 },
        ];
    }, [viewingShopData]);

    const inspectedCategories = useMemo(() => {
        if (!viewingShopData) return [];
        const saved = localStorage.getItem(`nexus_categories_${viewingShopData.id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((c: any) => ({
                        name: c.name,
                        sub: Array.isArray(c.subCategories) ? c.subCategories.join(', ') : 'None',
                        products: Math.floor(Math.random() * 10) + 5,
                        sales: `৳ ${(Math.floor(Math.random() * 40) + 5) * 1000}`
                    }));
                }
            } catch (e) {}
        }
        return [
            { name: 'Fashion & Accessories', sub: 'Traditional, Casual, Punjabi, Saree', products: 28, sales: '৳ 3,45,000' },
            { name: 'Premium Electronics', sub: 'Calculators, Routers, Mobile Chargers', products: 14, sales: '৳ 8,40,000' },
            { name: 'Organic Cosmetics', sub: 'Face Wash, Hair Treatment, Serum', products: 19, sales: '৳ 1,22,000' },
            { name: 'Fresh Groceries', sub: 'Spices, Teas, Rice, Edible Oils', products: 33, sales: '৳ 95,000' },
            { name: 'Stationery & Gift', sub: 'Notebooks, Pens, Gift Wrapping', products: 12, sales: '৳ 42,000' },
            { name: 'Home Appliances', sub: 'Blenders, Cookers, Air Fryers', products: 8, sales: '৳ 3,10,000' },
        ];
    }, [viewingShopData]);

    const inspectedCustomers = useMemo(() => {
        if (!viewingShopData) return [];
        const saved = localStorage.getItem(`nexus_customers_${viewingShopData.id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((c: any) => ({
                        name: c.name,
                        address: c.address || 'Dhaka, Bangladesh',
                        email: c.email || `${c.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
                        mobile: c.mobile || '01711223344',
                        group: c.loyaltyPoints && c.loyaltyPoints > 200 ? 'VIP Elite' : 'Regular',
                        spent: (c.loyaltyPoints || 0) * 150 || (Math.floor(Math.random() * 8) + 1) * 3000,
                        points: c.loyaltyPoints || 0,
                        due: c.walletBalance && c.walletBalance < 0 ? Math.abs(c.walletBalance) : 0
                    }));
                }
            } catch (e) {}
        }
        return [
            { name: 'Syed Rafsan Jani', address: 'Dhanmondi, Dhaka', email: 'rafsan@outlook.com', mobile: '01712345678', group: 'VIP Elite', spent: 85000, points: 1250, due: 0 },
            { name: 'Nusrat Jahan', address: 'Banani, Dhaka', email: 'nusrat@gmail.com', mobile: '01898765432', group: 'Regular', spent: 34000, points: 450, due: 1200 },
            { name: 'Dr. Imtiaz Ahmed', address: 'Uttara Sector 4, Dhaka', email: 'imtiaz.med@yahoo.com', mobile: '01511223344', group: 'VIP Elite', spent: 142000, points: 2800, due: 0 },
            { name: 'Farhan Kabir', address: 'Chittagong GEC', email: 'farhan@kabir.net', mobile: '01655667788', group: 'Credit Client', spent: 19500, points: 120, due: 8500 },
            { name: 'Tasnim Alam', address: 'Mirpur-10, Dhaka', email: 'tasnim@gmail.com', mobile: '01300998877', group: 'Regular', spent: 12400, points: 95, due: 0 },
        ];
    }, [viewingShopData]);

    const inspectedSuppliers = useMemo(() => {
        if (!viewingShopData) return [];
        const saved = localStorage.getItem(`nexus_suppliers_${viewingShopData.id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((s: any) => ({
                        firm: s.company || s.name || 'Vendor Firm',
                        contact: s.name,
                        ph: s.mobile || '01911223344',
                        count: Math.floor(Math.random() * 8) + 2,
                        due: s.walletBalance && s.walletBalance < 0 ? Math.abs(s.walletBalance) : 0,
                        active: true
                    }));
                }
            } catch (e) {}
        }
        return [
            { firm: 'Square Consumer Goods Ltd.', contact: 'Mustafizur Rahman', ph: '01912994455', count: 12, due: 45000, active: true },
            { firm: 'Pran-RFL Wholesale Outlet', contact: 'Maksudul Alam', ph: '01815668822', count: 24, due: 125000, active: true },
            { firm: 'Aarong Handlooms Trading', contact: 'Sayeeda Sultana', ph: '01712883399', count: 9, due: 0, active: true },
            { firm: 'Apex Footwear Distributor', contact: 'Zulfiqar Ahmed', ph: '01511883377', count: 15, due: 38200, active: true },
        ];
    }, [viewingShopData]);

    const inspectedSales = useMemo(() => {
        if (!viewingShopData) return [];
        const saved = localStorage.getItem(`nexus_transactions_${viewingShopData.id}`);
        console.log(`Inspected sales for ${viewingShopData.id}:`, saved);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const salesOnly = parsed.filter((t: any) => t.type === 'Sale');
                    if (salesOnly.length > 0) {
                        return salesOnly.map((s: any) => ({
                            txId: s.id.startsWith('t') ? `INV-${s.id}` : s.id,
                            time: s.date,
                            items: s.details?.items?.length || 1,
                            cashier: s.createdBy || 'Staff',
                            type: s.paymentMethod || 'POS Cash',
                            total: s.amount
                        }));
                    }
                }
            } catch (e) {}
        }
        return [
            { txId: 'INV-2026-90432', time: '2026-06-10 14:32', items: 3, cashier: 'Tahsan (Staff)', type: 'bKash Merchant', total: 6450 },
            { txId: 'INV-2026-90431', time: '2026-06-10 13:10', items: 1, cashier: 'Tahsan (Staff)', type: 'POS Cash', total: 1200 },
            { txId: 'INV-2026-90430', time: '2026-06-10 11:24', items: 8, cashier: 'Adiba (Manager)', type: 'Visa Gateway', total: 54100 },
            { txId: 'INV-2026-90429', time: '2026-06-09 19:40', items: 2, cashier: 'Adiba (Manager)', type: 'POS Cash', total: 2400 },
            { txId: 'INV-2026-90428', time: '2026-06-09 18:02', items: 5, cashier: 'Tahsan (Staff)', type: 'Nagad Pay', total: 8200 },
        ];
    }, [viewingShopData]);

    const inspectedPurchases = useMemo(() => {
        if (!viewingShopData) return [];
        const saved = localStorage.getItem(`nexus_transactions_${viewingShopData.id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const purchasesOnly = parsed.filter((t: any) => t.type === 'Purchase');
                    if (purchasesOnly.length > 0) {
                        return purchasesOnly.map((p: any) => ({
                            po: `PO-${p.id}`,
                            firm: p.entityName || 'General Supplier',
                            date: p.date,
                            status: 'Received',
                            total: p.amount
                        }));
                    }
                }
            } catch (e) {}
        }
        return [
            { po: 'PO-2026-0032', firm: 'Square Consumer Goods Ltd.', date: '2026-05-18', status: 'Received', total: 45000 },
            { po: 'PO-2026-0031', firm: 'Pran-RFL Wholesale Outlet', date: '2026-05-12', status: 'Pending Goods Check', total: 125000 },
            { po: 'PO-2026-0030', firm: 'Apex Enterprise Distributor', date: '2026-04-28', status: 'Received', total: 38200 },
        ];
    }, [viewingShopData]);

    const inspectedExpenses = useMemo(() => {
        if (!viewingShopData) return [];
        const saved = localStorage.getItem(`nexus_transactions_${viewingShopData.id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    const expensesOnly = parsed.filter((t: any) => t.type === 'Expense');
                    if (expensesOnly.length > 0) {
                        return expensesOnly.map((exp: any) => ({
                            id: `VOUCH-${exp.id}`,
                            cat: exp.reference || exp.details?.note || 'Operational Cost',
                            auth: exp.createdBy || 'Manager',
                            date: exp.date,
                            pay: exp.paymentMethod || 'Petty Cash',
                            amount: exp.amount
                        }));
                    }
                }
            } catch (e) {}
        }
        return [
            { id: 'VOUCH-1009', cat: 'Warehouse Monthly Rent', auth: 'Adiba (Manager)', date: '2026-06-05', pay: 'Bank Transfer CIB', amount: 35000 },
            { id: 'VOUCH-1008', cat: 'Corporate Office Electricity Bill', auth: 'Adiba (Manager)', date: '2026-06-03', pay: 'bKash Merchant Pay', amount: 4800 },
            { id: 'VOUCH-1007', cat: 'Supplies Logistics & Loading charges', auth: 'Adiba (Manager)', date: '2026-05-28', pay: 'Petty Cash Desk', amount: 1500 },
            { id: 'VOUCH-1006', cat: 'Staff Buffet Iftar Catering Payout', auth: 'Adiba (Manager)', date: '2026-05-20', pay: 'Petty Cash Desk', amount: 6000 },
        ];
    }, [viewingShopData]);

    const inspectedInventory = useMemo(() => {
        const lowStockItems = inspectedProducts.filter(p => p.stock < 15);
        if (lowStockItems.length > 0) {
            return lowStockItems.map((p: any) => ({
                item: p.name,
                floor: 15,
                current: p.stock,
                shelve: p.cat === 'Fashion & Clothing' ? 'Hanger Section C' : 'Rack A-Level 3',
                date: '2026-06-01'
            }));
        }
        return [
            { item: 'Organic Darjeeling Green Tea Jar 250g', floor: 10, current: 2, shelve: 'Rack A-Level 3', date: '2026-04-12' },
            { item: 'Kashmiri Silk Saree Premium', floor: 15, current: 12, shelve: 'Hanger Section C', date: '2026-05-18' },
            { item: 'Sony WH-1000XM4 Noise Cancelling', floor: 10, current: 8, shelve: 'Safe Cabinet B-4', date: '2026-05-24' },
        ];
    }, [inspectedProducts]);

    const inspectedEmployees = useMemo(() => {
        if (!viewingShopData) return [];
        const saved = localStorage.getItem(`nexus_staff_${viewingShopData.id}`);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    return parsed.map((st: any) => ({
                        name: st.name,
                        role: st.role || 'Sales Crew',
                        phone: st.phone || '01700112233',
                        pin: st.pin || '1234',
                        status: st.status || 'Active',
                        salary: `৳ ${(st.basicSalary || 15000).toLocaleString()}`
                    }));
                }
            } catch (e) {}
        }
        return [
            { name: 'Adiba Karim', role: 'Store Manager', phone: '01700112233', pin: '5566', status: 'Active', salary: '৳ 32,000' },
            { name: 'Tahsan Chowdhury', role: 'Sales Cashier', phone: '01899887766', pin: '1212', status: 'Active', salary: '৳ 18,005' },
        ];
    }, [viewingShopData]);

    const getUserTotalBusiness = (u: any) => {
        if (!u) return 0;
        let business = u.totalBusiness || 0;
        const txs = localStorage.getItem(`nexus_transactions_${u.id}`);
        if (txs) {
            try {
                const parsedTxs = JSON.parse(txs);
                if (Array.isArray(parsedTxs)) {
                    const salesSum = parsedTxs.filter((t: any) => t.type === 'Sale').reduce((acc: any, t: any) => acc + (t.amount || 0), 0);
                    if (salesSum > 0) {
                        business = salesSum;
                    }
                }
            } catch (e) {}
        }
        return business;
    };

    const inspectedTotalValuation = useMemo(() => {
        return inspectedProducts.reduce((sum, p) => sum + (p.stock || 0) * (p.buy || 0), 0);
    }, [inspectedProducts]);

    const calculatedSalesGross = useMemo(() => {
        const transactionVal = inspectedSales.reduce((sum, s) => sum + s.total, 0);
        return transactionVal || getUserTotalBusiness(viewingShopData) || 154000;
    }, [inspectedSales, viewingShopData]);

    const calculatedPurchaseVal = useMemo(() => {
        const val = inspectedPurchases.reduce((sum, p) => sum + p.total, 0);
        return val || (calculatedSalesGross * 0.55);
    }, [inspectedPurchases, calculatedSalesGross]);

    const calculatedProfitVal = useMemo(() => {
        const expenseVal = inspectedExpenses.reduce((sum, e) => sum + e.amount, 0);
        return Math.max(0, calculatedSalesGross - calculatedPurchaseVal - expenseVal) || (calculatedSalesGross * 0.35);
    }, [calculatedSalesGross, calculatedPurchaseVal, inspectedExpenses]);

    const [activeInspectorTab, setActiveInspectorTab] = useState<string>('products');
    const [editModalTab, setEditModalTab] = useState<'general' | 'features'>('general');
    
    // Support Tab States
    const [supportFilter, setSupportFilter] = useState('All Tickets');
    const [selectedSupportTicket, setSelectedSupportTicket] = useState<any>(null);
    const [supportReplyText, setSupportReplyText] = useState('');
    const [supportNoteText, setSupportNoteText] = useState('');

    // Helper to map and protect default limits and features
    const mapUserDefaultLimits = (u: any) => {
        const plan = u.plan || 'Free';
        const isEnt = plan === 'Enterprise';
        const isPro = plan === 'Nexus Pro' || plan === 'Pro';
        return {
            ...u,
            plan,
            isPremium: isEnt || isPro || u.isPremium || false,
            employeeCount: u.employeeCount !== undefined ? u.employeeCount : (isEnt ? 12 : isPro ? 5 : 1),
            branchCount: u.branchCount !== undefined ? u.branchCount : (isEnt ? 4 : isPro ? 2 : 1),
            storageLimit: u.storageLimit !== undefined ? u.storageLimit : (isEnt ? 2048 : isPro ? 500 : 100),
            employeeLimit: u.employeeLimit !== undefined ? u.employeeLimit : (isEnt ? 30 : isPro ? 10 : 3),
            branchLimit: u.branchLimit !== undefined ? u.branchLimit : (isEnt ? 10 : isPro ? 3 : 1),
            enabledFeatures: u.enabledFeatures || u.features || (isEnt ? ['Single Store', 'Unlimited Stores', 'Advanced Analytics', 'Employee Management', 'Automated Tax Reports'] : isPro ? ['Single Store', 'Basic Reports', 'Employee Management'] : ['Single Store', 'Basic Reports']),
            features: u.features || u.enabledFeatures || (isEnt ? ['Single Store', 'Unlimited Stores', 'Advanced Analytics', 'Employee Management', 'Automated Tax Reports'] : isPro ? ['Single Store', 'Basic Reports', 'Employee Management'] : ['Single Store', 'Basic Reports']),
            totalBusiness: getUserTotalBusiness(u)
        };
    };

    // Data State
    const [users, setUsers] = useState(() => {
        const saved = localStorage.getItem('saas_users');
        try {
            const parsed = saved ? JSON.parse(saved) : INITIAL_USERS;
            return (Array.isArray(parsed) ? parsed : INITIAL_USERS).map(mapUserDefaultLimits);
        } catch (e) {
            console.error("Error parsing saas_users:", e);
            return INITIAL_USERS;
        }
    });
    const [templates, setTemplates] = useState(INITIAL_TEMPLATES);

    useEffect(() => {
        setUsers(registeredUsers.map(mapUserDefaultLimits));
    }, [registeredUsers]);

    // Real business list (Stage: SaaS Admin backend wiring) - GET
    // /api/admin/businesses returns every registered business from
    // Firestore, not just whichever ones happened to sync to this
    // browser's local registeredUsers during this session.
    useEffect(() => {
        if (!hasAuthToken()) return;
        authFetch('/api/admin/businesses')
            .then(async (res) => {
                if (res.ok) return res.json();
                const err = await res.json().catch(() => ({}));
                console.warn('[admin] businesses', res.status, err);
                return null;
            })
            .then(body => {
                if (body?.businesses) setUsers(body.businesses.map(mapUserDefaultLimits));
            })
            .catch(err => console.warn('Failed to load real business list, showing local data only:', err));
    }, []);

    // Real-time: full SaaS owner live data (businesses, stats, alerts, tickets, audit, revenue)
    const [rtStatus, setRtStatus] = useState<'connected' | 'disconnected' | 'error' | 'idle'>('idle');
    const [rtLastAt, setRtLastAt] = useState<string | null>(null);

    const reloadAdminLive = React.useCallback((domain?: string) => {
        if (!hasAuthToken()) return;
        const d = (domain || 'all').toLowerCase();

        const pullBusinesses = () => {
            authFetch('/api/admin/businesses')
                .then(res => res.ok ? res.json() : null)
                .then(body => {
                    if (body?.businesses) setUsers(body.businesses.map(mapUserDefaultLimits));
                })
                .catch(() => {});
        };
        const pullStats = () => {
            authFetch('/api/admin/dashboard-stats')
                .then(res => res.ok ? res.json() : null)
                .then(body => {
                    if (body?.stats) setServerDashboardStats(body.stats);
                    else if (body) setServerDashboardStats(body);
                })
                .catch(() => {});
        };
        const pullAuditLogs = () => {
            authFetch('/api/admin/audit-logs?limit=300')
                .then(res => res.ok ? res.json() : null)
                .then(body => {
                    if (!body?.logs) return;
                    setLogs(body.logs.map((l: any) => ({
                        id: l.id,
                        time: l.timestamp ? new Date(l.timestamp).toLocaleString() : '',
                        user: l.actorName || l.actorRole || l.actorId || 'Unknown',
                        module: l.targetType || 'platform',
                        action: l.action,
                        details: [l.details || l.targetId || '', l.impersonatorId ? `via ${l.impersonatorId}` : ''].filter(Boolean).join(' · '),
                        impersonated: !!l.impersonated,
                        impersonatorId: l.impersonatorId || '',
                        isLoginAs: !!(l.impersonated || l.impersonatorId || String(l.action || '').toLowerCase().includes('impersonat')),
                    })));
                })
                .catch(() => {});
        };
        const pullHealth = () => {
            authFetch('/api/admin/system-health')
                .then(res => res.ok ? res.json() : null)
                .then(body => {
                    if (!body) return;
                    setMonitoringStats(prev => ({
                        ...prev,
                        cpu: body.cpuLoadPercent ?? 0,
                        ram: body.memory?.systemUsedPercent ?? 0,
                        uptimeSeconds: body.uptimeSeconds ?? 0,
                        nodeVersion: body.nodeVersion ?? '',
                    }));
                })
                .catch(() => {});
        };

        if (d === 'all') {
            pullBusinesses();
            pullStats();
            pullAuditLogs();
            pullHealth();
            try { refreshSaasAlerts(); } catch { /* */ }
            try { refreshAnnouncements(); } catch { /* */ }
            try { refreshRevenue(); } catch { /* */ }
            try { refreshMrrSnapshots(); } catch { /* */ }
            try { void refreshSaasTickets?.(); } catch { /* */ }
            try { void refreshSaasRequests?.(); } catch { /* */ }
        } else {
            if (['subscription', 'trial', 'businesses', 'users'].includes(d)) {
                pullBusinesses();
                pullStats();
            }
            if (['alerts'].includes(d)) {
                try { refreshSaasAlerts(); } catch { /* */ }
            }
            if (['announcements'].includes(d)) {
                try { refreshAnnouncements(); } catch { /* */ }
            }
            if (['revenue', 'payments', 'transactions'].includes(d)) {
                try { refreshRevenue(); } catch { /* */ }
                try { refreshMrrSnapshots(); } catch { /* */ }
                pullStats();
            }
            if (['tickets', 'support'].includes(d)) {
                try { void refreshSaasTickets?.(); } catch { /* */ }
            }
            if (['plan_requests', 'requests', 'subscriptions'].includes(d)) {
                try { void refreshSaasRequests?.(); } catch { /* */ }
                pullBusinesses();
                pullStats();
            }
            if (['audit'].includes(d)) {
                pullAuditLogs();
            }
            if (['system', 'health'].includes(d)) {
                pullHealth();
            }
        }

        setRtLastAt(new Date().toLocaleTimeString());
    }, [refreshSaasRequests, refreshSaasTickets]);

    useRealtimeSync({
        onStatus: (s) => setRtStatus(s),
        onHello: (ev) => {
            console.info('[admin realtime] hello', ev);
            setRtStatus('connected');
            // Full pull once connected so owner starts with fresh data
            reloadAdminLive('all');
        },
        onBusinessSync: (ev) => {
            console.info('[admin realtime] sync', ev.domain, ev.reason);
            reloadAdminLive(ev.domain || 'all');
        },
    });

    useEffect(() => {
        ensureRealtimeSocket();
    }, [user?.id]);

    // Live background polling (every 45s fallback, while sockets provide instant push)
    useEffect(() => {
        if (!user?.id) return;
        const id = window.setInterval(() => {
            reloadAdminLive('all');
        }, 45_000);
        return () => window.clearInterval(id);
    }, [user?.id, reloadAdminLive]);


    // Real status/plan changes - hits the backend so a suspension is
    // actually enforced (checked on every request server-side), not just
    // a local UI flag that resets on refresh.
    
    const saveBusinessTrialLimits = async (businessId: string, payload: {
        trialLimits?: Record<string, number>;
        trialUsage?: Record<string, number>;
        extendDays?: number;
        subscriptionStatus?: string;
    }) => {
        try {
            const res = await authFetch(`/api/admin/businesses/${businessId}/trial-limits`, {
                method: 'PATCH',
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const body = await res.json().catch(() => ({}));
                showToast(body.error || 'Failed to update trial limits', 'error');
                return false;
            }
            return true;
        } catch (e) {
            console.warn('trial-limits save failed', e);
            showToast('Failed to update trial limits', 'error');
            return false;
        }
    };

    const updateBusinessStatus = async (businessId: string, accountStatus: string) => {
        try {
            const res = await authFetch(`/api/admin/businesses/${businessId}`, {
                method: 'PATCH',
                body: JSON.stringify({ accountStatus }),
            });
            if (res.ok) {
                const { business } = await res.json();
                setUsers(prev => prev.map(u => u.id === businessId ? { ...mapUserDefaultLimits(business) } : u));
            }
        } catch (err) {
            console.warn('Failed to update business status:', err);
        }
    };

    const updateBusinessPlan = async (businessId: string, plan: string) => {
        try {
            const res = await authFetch(`/api/admin/businesses/${businessId}`, {
                method: 'PATCH',
                body: JSON.stringify({ plan, isPremium: plan !== 'Basic' }),
            });
            if (res.ok) {
                const { business } = await res.json();
                setUsers(prev => prev.map(u => u.id === businessId ? { ...mapUserDefaultLimits(business) } : u));
            }
        } catch (err) {
            console.warn('Failed to update business plan:', err);
        }
    };

    const updateBusinessSubscription = async (businessId: string, fields: Record<string, any>) => {
        try {
            const res = await authFetch(`/api/admin/businesses/${businessId}`, {
                method: 'PATCH',
                body: JSON.stringify(fields),
            });
            if (res.ok) {
                const { business } = await res.json();
                setUsers(prev => prev.map(u => u.id === businessId ? { ...mapUserDefaultLimits(business) } : u));
            }
        } catch (err) {
            console.warn('Failed to update subscription fields:', err);
        }
    };

    const deleteBusinessReal = async (businessId: string) => {
        try {
            const res = await authFetch(`/api/admin/businesses/${businessId}`, { method: 'DELETE' });
            if (res.ok) setUsers(prev => prev.filter(u => u.id !== businessId));
        } catch (err) {
            console.warn('Failed to delete business:', err);
        }
    };
    const [plans, setPlans] = useState(() => {
        const saved = localStorage.getItem('saas_plans');
        try {
            const parsed = saved ? JSON.parse(saved) : INITIAL_PLANS;
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            return INITIAL_PLANS;
        } catch (e) {
            console.error("Error parsing saas_plans:", e);
            return INITIAL_PLANS;
        }
    });
    const [plansLoading, setPlansLoading] = useState(false);
    const [plansSyncError, setPlansSyncError] = useState<string | null>(null);

    // Load plans from server (source of truth); cache locally as offline fallback
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setPlansLoading(true);
            setPlansSyncError(null);
            try {
                const res = await authFetch('/api/platform/plans');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const body = await res.json();
                const list = Array.isArray(body?.plans) ? body.plans : [];
                if (!cancelled && list.length > 0) {
                    setPlans(list);
                    localStorage.setItem('saas_plans', JSON.stringify(list));
                }
            } catch (e: any) {
                console.warn('[admin] load plans failed, using local cache', e);
                if (!cancelled) setPlansSyncError(e?.message || 'Could not load plans from server');
            } finally {
                if (!cancelled) setPlansLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const persistPlans = async (next: any[]) => {
        setPlans(next);
        localStorage.setItem('saas_plans', JSON.stringify(next));
        try {
            const res = await authFetch('/api/platform/plans', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plans: next }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setPlansSyncError(null);
            showToast?.('Plans saved to server');
        } catch (e: any) {
            console.warn('[admin] save plans failed', e);
            setPlansSyncError(e?.message || 'Save failed — kept locally');
            showToast?.('Plans saved locally only (server offline)');
        }
    };
    const [admins, setAdmins] = useState(() => {
        const saved = localStorage.getItem('saas_admins');
        try {
            const parsed = saved ? JSON.parse(saved) : INITIAL_ADMINS;
            return Array.isArray(parsed) ? parsed : INITIAL_ADMINS;
        } catch (e) {
            console.error("Error parsing saas_admins:", e);
            return INITIAL_ADMINS;
        }
    });

    useEffect(() => {
        localStorage.setItem('saas_users', JSON.stringify(users));
    }, [users]);

    useEffect(() => {
        localStorage.setItem('saas_admins', JSON.stringify(admins));
    }, [admins]);

    const [logs, setLogs] = useState(INITIAL_LOGS);

    useEffect(() => {
        authFetch('/api/admin/audit-logs?limit=300')
            .then(res => res.ok ? res.json() : null)
            .then(body => {
                if (!body?.logs) return;
                setLogs(body.logs.map((l: any) => ({
                    id: l.id,
                    time: l.timestamp ? new Date(l.timestamp).toLocaleString() : '',
                    user: l.actorName || l.actorRole || l.actorId || 'Unknown',
                    module: l.targetType || 'platform',
                    action: l.action,
                    details: [l.details || l.targetId || '', l.impersonatorId ? `via ${l.impersonatorId}` : ''].filter(Boolean).join(' · '),
                    impersonated: !!l.impersonated,
                    impersonatorId: l.impersonatorId || '',
                    isLoginAs: !!(l.impersonated || l.impersonatorId || String(l.action || '').toLowerCase().includes('impersonat')),
                })));
            })
            .catch(err => console.warn('Failed to load real audit logs:', err));
    }, []);
    const [logFilter, setLogFilter] = useState('All');
    const [logLoginAsOnly, setLogLoginAsOnly] = useState(false);
    const [readinessReport, setReadinessReport] = useState<any | null>(null);
    const [readinessOpen, setReadinessOpen] = useState(false);
    const [readinessFilter, setReadinessFilter] = useState<'all' | 'fail' | 'warn'>('all');

    
    const [searchTerm, setSearchTerm] = useState('');
    
    // Customer Search Tab States
    const [searchPhone, setSearchPhone] = useState('');
    const [hasSearched, setHasSearched] = useState(false);
    const [searchResult, setSearchResult] = useState<any | null>(null);

    const handleCustomerSearch = async (phoneToSearch: string) => {
        if (!phoneToSearch.trim()) {
            setSearchResult(null);
            setHasSearched(false);
            return;
        }

        const cleanPhone = phoneToSearch.trim();
        setHasSearched(true);

        try {
            const res = await authFetch(`/api/admin/customers/search?phone=${encodeURIComponent(cleanPhone)}`);
            if (res.ok) {
                const data = await res.json();
                setSearchResult(data);
                return;
            }
        } catch (e) {
            console.warn('API customer search failed, falling back to local search:', e);
        }

        // Let's search across all registered users (shops) (fallback)
        const connectedBusinesses: any[] = [];
        let totalDue = 0;
        let totalPaid = 0;
        let totalSales = 0;
        let customerProfile: any = null;
        const allTransactions: any[] = [];
        let lastActivityDate = '';
        let lastActivityDesc = '';

        users.forEach((u: any) => {
            // Load their customers list from localStorage or fallback
            let shopCustomers: any[] = [];
            const savedCustomers = localStorage.getItem(`nexus_customers_${u.id}`);
            if (savedCustomers) {
                try {
                    shopCustomers = JSON.parse(savedCustomers);
                } catch (e) {
                    console.error("Error parsing customers for " + u.id, e);
                }
            } else {
                // query default list for demo users if they don't have custom localStorage
                shopCustomers = [
                    { id: 'c1', name: 'Syed Rafsan Jani', address: 'Dhanmondi, Dhaka', email: 'rafsan@outlook.com', mobile: '01712345678', group: 'VIP Elite', spent: 85000, points: 1250, walletBalance: 0 },
                    { id: 'c2', name: 'Nusrat Jahan', address: 'Banani, Dhaka', email: 'nusrat@gmail.com', mobile: '01898765432', group: 'Regular', spent: 34000, points: 450, walletBalance: -1200 },
                    { id: 'c3', name: 'Dr. Imtiaz Ahmed', address: 'Uttara Sector 4, Dhaka', email: 'imtiaz.med@yahoo.com', mobile: '01511223344', group: 'VIP Elite', spent: 142000, points: 2800, walletBalance: 0 },
                    { id: 'c4', name: 'Farhan Kabir', address: 'Chittagong GEC', email: 'farhan@kabir.net', mobile: '01655667788', group: 'Credit Client', spent: 19500, points: 120, walletBalance: -8500 },
                    { id: 'c5', name: 'Tasnim Alam', address: 'Mirpur-10, Dhaka', email: 'tasnim@gmail.com', mobile: '01300998877', group: 'Regular', spent: 12400, points: 95, walletBalance: 0 },
                ];
            }

            // Find matching customer by mobile/phone matching
            const match = shopCustomers.find((c: any) => {
                const cMobile = (c.mobile || '').replace(/[\s\-\+]/g, '');
                const sMobile = cleanPhone.replace(/[\s\-\+]/g, '');
                return cMobile.includes(sMobile) || sMobile.includes(cMobile);
            });

            if (match) {
                // Keep the first complete customer profile found or merge them
                if (!customerProfile) {
                    customerProfile = {
                        name: match.name,
                        mobile: match.mobile,
                        email: match.email || `${match.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
                        address: match.address || 'Dhaka, Bangladesh',
                        group: match.group || 'Regular',
                        notes: match.notes || 'N/A'
                    };
                }

                // Load transactions for this shop
                let shopTxs: any[] = [];
                const savedTxs = localStorage.getItem(`nexus_transactions_${u.id}`);
                if (savedTxs) {
                    try {
                        shopTxs = JSON.parse(savedTxs);
                    } catch (e) {
                        console.error("Error parsing transactions for " + u.id, e);
                    }
                } else {
                    // Fallback transactions matching the customer
                    shopTxs = [
                        { id: 't1', entityName: 'Syed Rafsan Jani', entityMobile: '01712345678', type: 'Sale', amount: 85000, amountPaid: 85000, dueAmount: 0, date: '2026-06-10 14:32', paymentMethod: 'Card' },
                        { id: 't2', entityName: 'Nusrat Jahan', entityMobile: '01898765432', type: 'Sale', amount: 34000, amountPaid: 32800, dueAmount: 1200, date: '2026-06-10 13:10', paymentMethod: 'Partial' },
                        { id: 't3', entityName: 'Dr. Imtiaz Ahmed', entityMobile: '01511223344', type: 'Sale', amount: 142000, amountPaid: 142000, dueAmount: 0, date: '2026-06-10 11:24', paymentMethod: 'Bank' },
                        { id: 't4', entityName: 'Farhan Kabir', entityMobile: '01655667788', type: 'Sale', amount: 19500, amountPaid: 11000, dueAmount: 8500, date: '2026-06-09 19:40', paymentMethod: 'Partial' },
                        { id: 't5', entityName: 'Tasnim Alam', entityMobile: '01300998877', type: 'Sale', amount: 12400, amountPaid: 12400, dueAmount: 0, date: '2026-06-09 18:02', paymentMethod: 'Mobile' },
                    ];
                }

                // Filter transactions belonging to this customer
                const customerTxs = shopTxs.filter((t: any) => {
                    // Match by name or mobile (fallback)
                    const tMobile = (t.entityMobile || '').replace(/[\s\-\+]/g, '');
                    const sMobile = cleanPhone.replace(/[\s\-\+]/g, '');
                    const isMobileMatch = tMobile && (tMobile.includes(sMobile) || sMobile.includes(tMobile));
                    const isNameMatch = t.entityName && match.name && t.entityName.toLowerCase() === match.name.toLowerCase();
                    return isMobileMatch || isNameMatch;
                });

                // Calculate metrics for this business
                let businessSales = 0;
                let businessPaid = 0;
                let businessDue = 0;

                customerTxs.forEach((t: any) => {
                    if (t.type === 'Sale') {
                        businessSales += t.amount || 0;
                        businessPaid += t.amountPaid !== undefined ? t.amountPaid : (t.amount || 0);
                        businessDue += t.dueAmount !== undefined ? t.dueAmount : 0;
                    } else if (t.type === 'Payment' || t.type === 'Due Payment') {
                        businessPaid += t.amount || 0;
                        businessDue -= t.amount || 0;
                    } else if (t.type === 'Sales Return') {
                        businessSales -= t.amount || 0;
                        businessPaid -= t.amountPaid || 0;
                        businessDue -= t.dueAmount || 0;
                    }

                    // Push to aggregated transactions list
                    allTransactions.push({
                        ...t,
                        businessId: u.id,
                        businessName: u.businessName,
                    });
                });

                // Make sure due balance is consistent with walletBalance if it's there
                const finalDue = match.walletBalance && match.walletBalance < 0 ? Math.abs(match.walletBalance) : Math.max(0, businessDue);

                connectedBusinesses.push({
                    id: u.id,
                    businessName: u.businessName,
                    owner: u.owner,
                    mobile: u.mobile,
                    plan: u.plan,
                    salesCount: customerTxs.filter(t => t.type === 'Sale').length,
                    totalSales: businessSales,
                    totalPaid: businessPaid,
                    totalDue: finalDue
                });

                totalSales += businessSales;
                totalPaid += businessPaid;
                totalDue += finalDue;
            }
        });

        // If transactions exist, find latest for last activity
        if (allTransactions.length > 0) {
            allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
            const latest = allTransactions[0];
            lastActivityDate = latest.date;
            lastActivityDesc = `${latest.type} transaction of ৳ ${latest.amount} at ${latest.businessName} (Method: ${latest.paymentMethod || 'Cash'})`;
        } else if (customerProfile) {
            lastActivityDate = 'N/A';
            lastActivityDesc = 'Registered with profile details but no transaction activity logged.';
        }

        if (customerProfile) {
            setSearchResult({
                profile: customerProfile,
                connectedBusinesses,
                totalDueAcrossAll: totalDue,
                totalPaidAcrossAll: totalPaid,
                totalSalesAcrossAll: totalSales,
                transactions: allTransactions,
                lastActivity: {
                    date: lastActivityDate,
                    description: lastActivityDesc
                }
            });
        } else {
            setSearchResult(null);
        }
        setHasSearched(true);
    };
    const [viewingUserDetail, setViewingUserDetail] = useState<any | null>(null);
    const [viewingStoresForMobile, setViewingStoresForMobile] = useState<string | null>(null);
    const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
    const [changingPasswordAdmin, setChangingPasswordAdmin] = useState<any>(null);
    const [newAdminPassword, setNewAdminPassword] = useState('');
    
    // Modals & Forms State
    const [editingUser, setEditingUser] = useState<any | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);
    
    const [viewingTxUser, setViewingTxUser] = useState<any | null>(null); // For "User Transaction Details"
    const [showTxModal, setShowTxModal] = useState(false);

    const [uploadMode, setUploadMode] = useState<'product' | 'due' | null>(null); // For Bulk Upload
    const [uploadUser, setUploadUser] = useState<string | null>(null);

    const [showAdminModal, setShowAdminModal] = useState(false);
    const [newAdmin, setNewAdmin] = useState({ name: '', email: '', role: 'Admin', permissions: [] as string[] });
    const [editingAdminPermissions, setEditingAdminPermissions] = useState<any>(null);
    const [expandedModules, setExpandedModules] = useState<string[]>([]);

    // Security Tab State
    const [backupPassword, setBackupPassword] = useState('');
    const [archiveDate, setArchiveDate] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    // Notification Composer Form State
    const [compTitle, setCompTitle] = useState('');
    const [compMessage, setCompMessage] = useState('');
    const [compChannels, setCompChannels] = useState<{inApp: boolean, push: boolean, sms: boolean, email: boolean}>({
        inApp: true,
        push: false,
        sms: false,
        email: false
    });
    const [compAudience, setCompAudience] = useState('all_shops'); // all_shops, all_users, plan_basic, plan_pro, plan_ent, shop_u1, shop_u2, role_cashier, role_manager
    const [isScheduled, setIsScheduled] = useState(false);
    const [scheduleDate, setScheduleDate] = useState('2026-06-25');
    const [scheduleTime, setScheduleTime] = useState('10:00');
    const [selectedTemplateId, setSelectedTemplateId] = useState('');

    // Notification Management State - Persisted in localStorage
    const [campaigns, setCampaigns] = useState<any[]>(() => {
        const saved = localStorage.getItem('saas_campaigns');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed.filter((c: any) => !['camp-1', 'camp-2', 'camp-3'].includes(c?.id));
            } catch { return []; }
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem('saas_campaigns', JSON.stringify(campaigns));
    }, [campaigns]);

    const [failedMessages, setFailedMessages] = useState<any[]>(() => {
        const saved = localStorage.getItem('saas_failed_messages');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed.filter((m: any) => !['f-1', 'f-2'].includes(m?.id));
            } catch { return []; }
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem('saas_failed_messages', JSON.stringify(failedMessages));
    }, [failedMessages]);

    const [notificationTemplates, setNotificationTemplates] = useState<any[]>(() => {
        const saved = localStorage.getItem('saas_notification_templates');
        if (saved) return JSON.parse(saved);
        return [
            { id: 'temp-1', title: 'Plan Upgrade Offer', message: 'Upgrade to our Premium Plan today to unlock advanced artificial intelligence features, priority backup, and full multi-tenant security guarantees!', category: 'Marketing' },
            { id: 'temp-2', title: 'Low Inventory Alert', message: 'Urgent Alert: The stock level of {item_name} has fallen below your floor set ({floor} pcs). Currently remaining: {current} pcs in {shelve}. Please place a purchase order.', category: 'Business Alert' },
            { id: 'temp-3', title: 'Sustained Expiry warning', message: 'Dear Valued Merchant, Your subscription to the {plan_name} plan at Bizora will terminate on {expiry_date}. Please replenish to secure operations.', category: 'Subscription Alert' },
            { id: 'temp-4', title: 'New Employee Invitation', message: 'Welcome to the team! You have been registered in the role of {role} at our branch ({branch}). Please login using PIN: {pin}.', category: 'Operational Account' }
        ];
    });

    useEffect(() => {
        localStorage.setItem('saas_notification_templates', JSON.stringify(notificationTemplates));
    }, [notificationTemplates]);

    // Notification Audit Logs table matching requirement 10
    const [notificationAudits, setNotificationAudits] = useState<any[]>(() => {
        const saved = localStorage.getItem('saas_notification_audits');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed.filter((a: any) => !['aud-101', 'aud-102', 'aud-103'].includes(a?.id));
            } catch { return []; }
        }
        return [];
    });

    useEffect(() => {
        localStorage.setItem('saas_notification_audits', JSON.stringify(notificationAudits));
    }, [notificationAudits]);

    // Template Creator State
    const [newTempTitle, setNewTempTitle] = useState('');
    const [newTempMessage, setNewTempMessage] = useState('');
    const [newTempCat, setNewTempCat] = useState('Marketing');

    // Custom UI Notifications
    const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' } | null>(null);
    const [confirmModal, setConfirmModal] = useState<{
        show: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        type: 'danger' | 'warning' | 'info';
    }>({
        show: false,
        title: '',
        message: '',
        onConfirm: () => {},
        type: 'info'
    });

    const [inputModal, setInputModal] = useState<{
        show: boolean;
        title: string;
        label: string;
        value: string;
        onConfirm: (val: string) => void;
        type: 'text' | 'password';
    }>({
        show: false,
        title: '',
        label: '',
        value: '',
        onConfirm: () => {},
        type: 'text'
    });

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const closeConfirm = () => setConfirmModal(prev => ({ ...prev, show: false }));

    // --- Subscription Activity & Feature Management ---
    const handleRequestTemporaryFeature = (user: User, feature: string) => {
        const updatedUsers = users.map(u => {
            if (u.id === user.id) {
                return {
                    ...u,
                    temporaryFeatures: [
                        ...u.temporaryFeatures,
                        { feature, expiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), status: 'pending' }
                    ]
                };
            }
            return u;
        });
        setUsers(updatedUsers);
        showToast(`Request for ${feature} submitted for approval.`);
    };

    const handleApproveTemporaryFeature = (userId: string, featureIndex: number) => {
        const updatedUsers = users.map(u => {
            if (u.id === userId) {
                const newTempFeatures = [...u.temporaryFeatures];
                newTempFeatures[featureIndex].status = 'approved';
                return {
                    ...u,
                    temporaryFeatures: newTempFeatures,
                    features: [...u.features, newTempFeatures[featureIndex].feature]
                };
            }
            return u;
        });
        setUsers(updatedUsers);
        showToast("Feature access approved.");
    };

    const handleApproveRequest = (requestId: string, options?: any) => {
        approveSaaSRequest(requestId, options);
        showToast("Subscription request approved and synced with revenue.");
    };

    const handleRejectRequest = (requestId: string, options?: any) => {
        rejectSaaSRequest(requestId, options);
        showToast("Subscription request rejected.", "error");
    };

    // Security Check
    const isSaaSUser = user?.role === UserRole.SAAS_OWNER || user?.role === UserRole.SAAS_ADMIN || true; // Enable simulation mode view
    const canViewAllShops = simulatedRole === 'SUPER_ADMIN';
    const isSuperAdmin = simulatedRole === 'SUPER_ADMIN' || isOwner;
    const isFullAdminNav = isSuperAdmin || simulatedRole === 'ADMIN';
    // SAAS_OWNER: every tab content is allowed (no permission key filter)
    const saasUnlockAll = isSuperAdmin;

    const isAdminRole = simulatedRole === 'ADMIN';
    const isSupportRole = simulatedRole === 'SUPPORT';

    if (!isSaaSUser) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-slate-500">
                <Shield className="w-16 h-16 mb-4 text-slate-300" />
                <h2 className="text-xl font-bold text-slate-700">Access Restricted</h2>
                <p>This panel is for Main System Administrators only.</p>
            </div>
        );
    }

    // --- Actions ---

    // User Management
    const handleEditClick = (u: any) => {
        setEditingUser({ ...u });
        setShowEditModal(true);
    };

    const handleUserSave = async (e: React.FormEvent) => {
        e.preventDefault();
        updateRegisteredUser(editingUser.id, editingUser);
        setUsers(prev => prev.map(u => u.id === editingUser.id ? editingUser : u));
        setShowEditModal(false);
        showToast("User Subscription & Details Updated!");

        // Push the real fields to the backend too, so status/plan changes
        // actually take effect server-side (enforced on every request via
        // the auth middleware) instead of only existing in this browser.
        if (editingUser.accountStatus) await updateBusinessStatus(editingUser.id, editingUser.accountStatus);
        if (editingUser.plan) await updateBusinessPlan(editingUser.id, editingUser.plan);
        const subPatch: Record<string, any> = {};
        if (editingUser.subscriptionStatus != null) subPatch.subscriptionStatus = editingUser.subscriptionStatus;
        if (editingUser.subscriptionRenewsAt != null || editingUser.expiry != null) {
            subPatch.subscriptionRenewsAt = editingUser.subscriptionRenewsAt || editingUser.expiry || null;
        }
        if (editingUser.subscriptionEnforce != null) subPatch.subscriptionEnforce = !!editingUser.subscriptionEnforce;
        if (Object.keys(subPatch).length) await updateBusinessSubscription(editingUser.id, subPatch);

        // Trial package: SaaS can raise caps / extend / reset usage
        const tl = editingUser.trialLimits || {};
        await saveBusinessTrialLimits(editingUser.id, {
            trialLimits: {
                products: Number(tl.products) || 0,
                customers: Number(tl.customers) || 0,
                buys: Number(tl.buys) || 0,
                sells: Number(tl.sells) || 0,
                expenses: Number(tl.expenses) || 0,
                quickSales: Number(tl.quickSales) || 0,
            },
            trialUsage: editingUser.trialUsage,
            extendDays: Number(editingUser._extendTrialDays) || undefined,
            subscriptionStatus: editingUser.subscriptionStatus,
        });
    };

    const handleDeleteUser = (id: string) => {
        setConfirmModal({
            show: true,
            title: 'Delete Shop',
            message: 'Are you sure you want to delete this shop? All data will be lost.',
            type: 'danger',
            onConfirm: async () => {
                deleteUser(id);
                setUsers(prev => prev.filter(u => u.id !== id));
                showToast("Shop deleted successfully", "success");
                closeConfirm();
                await deleteBusinessReal(id);
            }
        });
    };

    const handleForceSync = (u: any) => {
        const currentPlan = u.plan || 'Free';
        const isEnt = currentPlan === 'Enterprise';
        const isPro = currentPlan === 'Nexus Pro' || currentPlan === 'Pro';
        
        const updatedFields = {
            plan: currentPlan,
            isPremium: isEnt || isPro,
            storageLimit: isEnt ? 2048 : isPro ? 500 : 100,
            employeeLimit: isEnt ? 30 : isPro ? 10 : 3,
            branchLimit: isEnt ? 10 : isPro ? 3 : 1,
            features: isEnt 
              ? ['Single Store', 'Unlimited Stores', 'Basic Reports', 'Advanced Analytics', 'Employee Management', 'Automated Tax Reports', 'SMS Gateway Notification System', 'Automated Tax Filings & GST', 'E-commerce Online Shop Integration', 'Developer API Keys & Webhooks', 'Custom Domain & White-label SaaS'] 
              : isPro 
                ? ['Single Store', 'Basic Reports', 'Employee Management', 'AI Assistant & Smart Analytics', 'SMS Gateway Notification System', 'Automated Tax Filings & GST', 'E-commerce Online Shop Integration'] 
                : ['Single Store', 'Basic Reports'],
            enabledFeatures: isEnt 
              ? ['Single Store', 'Unlimited Stores', 'Basic Reports', 'Advanced Analytics', 'Employee Management', 'Automated Tax Reports', 'SMS Gateway Notification System', 'Automated Tax Filings & GST', 'E-commerce Online Shop Integration', 'Developer API Keys & Webhooks', 'Custom Domain & White-label SaaS'] 
              : isPro 
                ? ['Single Store', 'Basic Reports', 'Employee Management', 'AI Assistant & Smart Analytics', 'SMS Gateway Notification System', 'Automated Tax Filings & GST', 'E-commerce Online Shop Integration'] 
                : ['Single Store', 'Basic Reports']
        };

        // Update the user
        updateRegisteredUser(u.id, updatedFields);
        
        // Also update local state
        setUsers(prev => prev.map(item => item.id === u.id ? { ...item, ...updatedFields } : item));
        
        // Update saas_users in localStorage
        const savedSaasUsers = localStorage.getItem('saas_users');
        if (savedSaasUsers) {
            try {
                const saasUsers = JSON.parse(savedSaasUsers);
                const updatedUsers = saasUsers.map((item: any) => {
                    if (item.id === u.id) {
                        return { ...item, ...updatedFields };
                    }
                    return item;
                });
                localStorage.setItem('saas_users', JSON.stringify(updatedUsers));
            } catch (e) {
                console.error("Error updating saas_users in handleForceSync:", e);
            }
        }

        showToast(`Force synced and refreshed permissions, limits & subscription for ${u.businessName}!`, 'success');
    };

    const handleViewTransactions = (u: any) => {
        setViewingTxUser(u);
        setShowTxModal(true);
    };

    // Admin Management
    const toggleAdminPermission = (adminId: string | null, key: string) => {
        if (adminId === null) {
            // New Admin
            setNewAdmin(prev => {
                const current = prev.permissions || [];
                if (current.includes('all')) return prev;
                if (current.includes(key)) {
                    return { ...prev, permissions: current.filter(p => p !== key) };
                } else {
                    return { ...prev, permissions: [...current, key] };
                }
            });
        } else {
            // Existing Admin
            setEditingAdminPermissions((prev: any) => {
                const current = prev.permissions || [];
                if (current.includes('all')) return prev;
                if (current.includes(key)) {
                    return { ...prev, permissions: current.filter((p: string) => p !== key) };
                } else {
                    return { ...prev, permissions: [...current, key] };
                }
            });
        }
    };

    const toggleAdminModulePermissions = (adminId: string | null, moduleKey: string) => {
        const module = PERMISSIONS[moduleKey as keyof typeof PERMISSIONS];
        const modulePermissions = Object.values(module.subFeatures).map(sf => sf.key);
        
        if (adminId === null) {
            setNewAdmin(prev => {
                const current = prev.permissions || [];
                if (current.includes('all')) return prev;
                const allModulePermissionsSelected = modulePermissions.every(p => current.includes(p));
                if (allModulePermissionsSelected) {
                    return { ...prev, permissions: current.filter(p => !modulePermissions.includes(p)) };
                } else {
                    const newPermissions = [...current];
                    modulePermissions.forEach(p => { if (!newPermissions.includes(p)) newPermissions.push(p); });
                    return { ...prev, permissions: newPermissions };
                }
            });
        } else {
            setEditingAdminPermissions((prev: any) => {
                const current = prev.permissions || [];
                if (current.includes('all')) return prev;
                const allModulePermissionsSelected = modulePermissions.every(p => current.includes(p));
                if (allModulePermissionsSelected) {
                    return { ...prev, permissions: current.filter((p: string) => !modulePermissions.includes(p)) };
                } else {
                    const newPermissions = [...current];
                    modulePermissions.forEach(p => { if (!newPermissions.includes(p)) newPermissions.push(p); });
                    return { ...prev, permissions: newPermissions };
                }
            });
        }
    };

    const toggleAdminAllPermissions = (adminId: string | null) => {
        if (adminId === null) {
            setNewAdmin(prev => {
                const current = prev.permissions || [];
                return { ...prev, permissions: current.includes('all') ? [] : ['all'] };
            });
        } else {
            setEditingAdminPermissions((prev: any) => {
                const current = prev.permissions || [];
                return { ...prev, permissions: current.includes('all') ? [] : ['all'] };
            });
        }
    };

    const isModuleFullySelected = (permissions: string[], moduleKey: string) => {
        const module = PERMISSIONS[moduleKey as keyof typeof PERMISSIONS];
        const modulePermissions = Object.values(module.subFeatures).map(sf => sf.key);
        return modulePermissions.every(p => permissions.includes(p));
    };

    const isModulePartiallySelected = (permissions: string[], moduleKey: string) => {
        const module = PERMISSIONS[moduleKey as keyof typeof PERMISSIONS];
        const modulePermissions = Object.values(module.subFeatures).map(sf => sf.key);
        const selectedCount = modulePermissions.filter(p => permissions.includes(p)).length;
        return selectedCount > 0 && selectedCount < modulePermissions.length;
    };

    const handleAddAdmin = (e: React.FormEvent) => {
        e.preventDefault();
        setAdmins([...admins, { id: `a${Date.now()}`, ...newAdmin, ip: 'N/A', lastActive: 'Never' } as any]);
        setShowAdminModal(false);
        setNewAdmin({ name: '', email: '', role: 'Admin', permissions: [] });
        showToast("New Admin Added!");
    };

    const handleSaveAdminPermissions = () => {
        if (!editingAdminPermissions) return;
        setAdmins(prev => prev.map(a => a.id === editingAdminPermissions.id ? { ...a, permissions: editingAdminPermissions.permissions } : a));
        setEditingAdminPermissions(null);
        showToast("Admin Permissions Updated!");
    };

    const toggleModuleExpand = (moduleKey: string) => {
        setExpandedModules(prev => 
            prev.includes(moduleKey) 
                ? prev.filter(k => k !== moduleKey) 
                : [...prev, moduleKey]
        );
    };

    const handleChangeAdminRole = (id: string, newRole: string) => {
        setAdmins(prev => prev.map(a => a.id === id ? { ...a, role: newRole } : a));
    };

    const handleDeleteAdmin = (id: string) => {
        setConfirmModal({
            show: true,
            title: 'Remove Admin',
            message: 'Are you sure you want to remove this admin access?',
            type: 'danger',
            onConfirm: () => {
                setAdmins(prev => prev.filter(a => a.id !== id));
                showToast("Admin access removed", "success");
                closeConfirm();
            }
        });
    };

    const togglePasswordVisibility = (id: string) => {
        const newShow = new Set(showPasswords);
        if (newShow.has(id)) newShow.delete(id);
        else newShow.add(id);
        setShowPasswords(newShow);
    };

    const handlePasswordChange = (adminId: string, newPassword: string) => {
        setAdmins(prev => prev.map(a => a.id === adminId ? { ...a, password: newPassword } : a));
        setChangingPasswordAdmin(null);
        setNewAdminPassword('');
        showToast("Password updated successfully!");
    };

    // Bulk Upload Mock
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            showToast(`File "${e.target.files[0].name}" uploaded successfully for ${uploadMode} management.`);
            setUploadMode(null);
            setUploadUser(null);
        }
    };

    // Template Management
    const handleDeleteTemplate = (id: number) => {
        setConfirmModal({
            show: true,
            title: 'Delete Template',
            message: 'Are you sure you want to delete this invoice template?',
            type: 'danger',
            onConfirm: () => {
                setTemplates(prev => prev.filter(t => t.id !== id));
                showToast("Template deleted successfully");
                closeConfirm();
            }
        });
    };

    const handleAddTemplate = () => {
        setInputModal({
            show: true,
            title: 'Add New Template',
            label: 'Template Name',
            value: '',
            type: 'text',
            onConfirm: (name) => {
                if (name) {
                    setTemplates([...templates, { id: Date.now(), name, status: 'Active' }]);
                    showToast("Template added successfully");
                }
                setInputModal(prev => ({ ...prev, show: false }));
            }
        });
    };

    // Data Security Logic
    const handleBackup = async () => {
        if (!backupPassword) {
            showToast("Please set a password for the backup file.", "error");
            return;
        }
        setIsProcessing(true);
        // Simulate encryption delay
        await new Promise(r => setTimeout(r, 1000));
        
        const data = getAllData();
        const jsonStr = JSON.stringify(data);
        
        // Simple Base64 + Salt Simulation for Encryption Visual
        // (In real app, use SubtleCrypto AES-GCM)
        const salt = btoa(backupPassword).slice(0, 8);
        const fakeEncrypted = btoa(encodeURIComponent(jsonStr)).split('').reverse().join('') + `.${salt}`;
        
        const blob = new Blob([fakeEncrypted], { type: "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `nexus_secure_backup_${new Date().toISOString().split('T')[0]}.enc`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setIsProcessing(false);
        setBackupPassword('');
        showToast("Encrypted backup downloaded successfully.");
    };

    const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setInputModal({
            show: true,
            title: 'Restore Database',
            label: 'Enter backup password to decrypt',
            value: '',
            type: 'password',
            onConfirm: (pwd) => {
                if (!pwd) return;
                setInputModal(prev => ({ ...prev, show: false }));
                
                const reader = new FileReader();
                reader.onload = (ev) => {
                    const content = ev.target?.result as string;
                    
                    // Validate "decryption"
                    const salt = btoa(pwd).slice(0, 8);
                    if (!content.endsWith(`.${salt}`)) {
                        showToast("Incorrect password or corrupted file.", "error");
                        return;
                    }

                    try {
                        const cleanContent = content.split('.')[0].split('').reverse().join('');
                        const jsonStr = decodeURIComponent(atob(cleanContent));
                        importData(jsonStr); // This reloads the page on success
                    } catch (err) {
                        showToast("Failed to restore data. File may be corrupted.", "error");
                    }
                };
                reader.readAsText(file);
            }
        });
    };

    const handleArchive = async () => {
        if (!archiveDate) {
            showToast("Select a date threshold.", "error");
            return;
        }
        setConfirmModal({
            show: true,
            title: 'Archive Transactions',
            message: `Are you sure you want to archive and remove transactions older than ${archiveDate}? This action downloads an archive file.`,
            type: 'warning',
            onConfirm: async () => {
                setIsProcessing(true);
                const count = await archiveTransactions(archiveDate);
                setIsProcessing(false);
                if (count > 0) {
                    showToast(`Archived ${count} transactions successfully.`);
                } else {
                    showToast("No transactions found older than selected date.", "error");
                }
                closeConfirm();
            }
        });
    };

    useEffect(() => {
        console.log("AdminPanel: SAAS_ADMIN check. User:", user);
        console.log("AdminPanel: users length:", users.length);
        console.log("AdminPanel: SAAS_ADMIN isSuperAdmin:", isSaaSUser && (user?.role === UserRole.SAAS_OWNER || user?.role === UserRole.SAAS_ADMIN));
    }, [user, users]);
    
    // Computed Stats
    const visibleUsers = canViewAllShops ? users : users.filter((u: any) => u.assignedAdminId === user?.id);
    const visibleRequests = canViewAllShops ? saasRequests : saasRequests.filter((r: any) => visibleUsers.some((vu: any) => vu.id === r.userId || vu.businessName === r.businessName));

    const totalRevenueServer = serverDashboardStats?.revenueThisMonth;
    const totalRevenueAllTime = serverDashboardStats?.revenueTotal;
    const estimatedMRR = serverDashboardStats?.estimatedMRR ?? 0;
    const estimatedARR = serverDashboardStats?.estimatedARR ?? 0;
    const payingCustomers = serverDashboardStats?.payingCustomers ?? 0;
    const arpu = serverDashboardStats?.arpu ?? 0;
    const logoChurnRate = serverDashboardStats?.logoChurnRate ?? 0;
    const revenueChurnRate = serverDashboardStats?.revenueChurnRate ?? 0;
    const atRiskCount = serverDashboardStats?.atRiskCount ?? 0;
    const atRiskMRR = serverDashboardStats?.atRiskMRR ?? 0;
    const churnedCount = serverDashboardStats?.churnedCount ?? 0;
    const atRiskList = serverDashboardStats?.atRisk || [];
    const nrrRate = serverDashboardStats?.nrr ?? null;
    const cohorts = serverDashboardStats?.cohorts || [];
    const nrrDetail = serverDashboardStats?.nrrDetail || null;
    const serverPlanCounts = serverDashboardStats?.planCounts || {};
    const recentServerSignups = serverDashboardStats?.recentSignups || [];
        const totalRevenue = visibleUsers.reduce((acc: any, u: any) => acc + (u.plan === 'Enterprise' ? 99 : u.plan === 'Pro' ? 29 : 0), 0);
    
    // Platform-level sell/buy are not available from other tenants' localStorage —
    // use fields returned by the admin businesses API only.
    const totalNetworkSell = visibleUsers.reduce((sum: any, u: any) => sum + (Number(u.totalSell) || 0), 0);
    const totalNetworkBuy = visibleUsers.reduce((sum: any, u: any) => sum + (Number(u.totalBuy) || 0), 0);
    
    // Total Store = Unique owners (unique mobile numbers)
    const uniqueMobiles = new Set(visibleUsers.map((u: any) => u.mobile));
    const totalUniqueOwners = uniqueMobiles.size;
    
    // Total Branch = Additional stores beyond the first one for each owner
    const totalAdditionalBranches = visibleUsers.length - totalUniqueOwners;

    const totalNetworkBusiness = visibleUsers.reduce((sum: any, u: any) => sum + getUserTotalBusiness(u), 0);
    const totalNetworkDue = visibleUsers.reduce((sum: any, u: any) => sum + (u.totalDue || 0), 0);
    const activeSubs = serverDashboardStats?.activeBusinesses ?? visibleUsers.filter((u: any) => u.status === 'Active' || u.accountStatus === 'Active').length;

    const categories = ADMIN_NAV_CATEGORIES;
    const getModulesForRole = (role: string) => getAdminModulesForRole(role, categories);

    const visibleModuleGroups = getModulesForRole(simulatedRole);

    return (
        <div className="fixed inset-0 z-0 flex bg-slate-100 overflow-hidden">
            {/* Full-height left sidebar */}
            <aside className="hidden md:flex w-64 lg:w-72 shrink-0 h-full flex-col relative overflow-hidden text-slate-100 border-r border-white/10 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950/95 backdrop-blur-2xl shadow-[4px_0_48px_rgba(15,23,42,0.45)]">
                <div className="admin-sidebar-orb pointer-events-none absolute -top-20 -left-12 w-44 h-44 rounded-full bg-indigo-500/25 blur-3xl animate-pulse" />
                <div className="pointer-events-none absolute bottom-32 -right-8 w-36 h-36 rounded-full bg-fuchsia-600/15 blur-3xl" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(165deg,rgba(255,255,255,0.07)_0%,transparent_35%)]" />

                <div className="px-4 pt-4 pb-3 border-b border-white/10 bg-white/[0.04]/80 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveTab('dashboard')}
                      className="flex items-center gap-2.5 text-left group w-full mb-1"
                      title="Return to Dashboard"
                    >
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-indigo-500/30 group-hover:bg-indigo-500 transition-colors">
                        B
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-wider text-white group-hover:text-indigo-300 transition-colors leading-none">Bizora Admin</p>
                        <p className="text-[9px] text-slate-400 font-medium leading-none mt-1">{user?.name || 'SaaS Control Center'}</p>
                      </div>
                    </button>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <p className={`text-[9px] font-bold ${rtStatus === 'connected' ? 'text-emerald-400' : rtStatus === 'error' ? 'text-rose-400' : 'text-slate-500'}`}>
                        Realtime: {rtStatus === 'connected' ? 'live' : rtStatus}
                        {rtLastAt ? ` · ${rtLastAt}` : ''}
                      </p>
                      <button
                        type="button"
                        onClick={() => { ensureRealtimeSocket(); reloadAdminLive('all'); }}
                        className="text-[9px] font-black uppercase tracking-wide text-indigo-300 hover:text-white"
                      >
                        Sync now
                      </button>
                    </div>
                </div>
                <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin">
                {visibleModuleGroups.map((cat) => (
                    <div key={cat.name} className="space-y-1">
                        <p className="px-2.5 text-[9px] font-black uppercase tracking-[0.14em] text-slate-500/90">{cat.name}</p>
                        {cat.modules.map((m) => {
                            const Icon = m.icon;
                            const on = activeTab === m.id;
                            return (
                                <button
                                    key={m.id}
                                    type="button"
                                    title={m.desc}
                                    onClick={() => setActiveTab(m.id)}
                                    className={`w-full flex items-center gap-2.5 text-left px-2.5 py-2 rounded-xl text-[11px] font-semibold transition-all duration-300 ease-out ${on ? 'bg-white/15 text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] ring-1 ring-white/20 backdrop-blur-md scale-[1.02]' : 'text-slate-400 hover:text-white hover:bg-white/10 hover:translate-x-0.5'}`}
                                >
                                    {Icon ? <Icon className="w-3.5 h-3.5 shrink-0 opacity-80" /> : null}
                                    <span className="truncate">{m.label}</span>
                                </button>
                            );
                        })}
                    </div>
                ))}
                </nav>
            </aside>

            {/* Mobile glass capsule dock — primary admin tabs */}
            <nav
              className="md:hidden fixed bottom-0 inset-x-0 z-[100] pointer-events-none"
              style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
              aria-label="Admin mobile navigation"
            >
              <div className="pointer-events-auto mx-auto max-w-md px-3 pb-1">
                <div className="flex items-center justify-between gap-1 rounded-2xl border border-white/60 bg-white/85 backdrop-blur-2xl shadow-[0_16px_40px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 px-1.5 py-1.5">
                  {(
                    [
                      { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
                      { id: 'businesses', label: 'Shops', icon: Store },
                      { id: 'subscriptions', label: 'Plans', icon: Crown },
                      { id: 'support', label: 'Tickets', icon: HeadphonesIcon },
                      { id: 'system-settings', label: 'More', icon: Grid },
                    ] as const
                  ).map((tab) => {
                    const on = activeTab === tab.id || (tab.id === 'system-settings' && ['system-settings','security','monitoring-center','feature-manager'].includes(activeTab));
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex flex-1 flex-col items-center justify-center gap-1 min-w-0 h-12 rounded-xl text-[10px] font-bold transition-all ${
                          on ? 'bg-indigo-600/10 text-indigo-600 ring-1 ring-indigo-500/20 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Icon className="w-5 h-5 shrink-0" strokeWidth={on ? 2.5 : 2} />
                        <span className="truncate max-w-full px-0.5 leading-none">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </nav>

            {/* Mobile category chips (scroll) above content */}
            <div className="md:hidden w-full col-span-full -mt-1 mb-2">
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                {visibleModuleGroups.flatMap((cat) =>
                  cat.modules.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setActiveTab(m.id)}
                      className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all ${activeTab === m.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs' : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'}`}
                    >
                      {m.label}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
                {/* Modern SaaS Admin Top Header */}
                <header className="h-14 sm:h-16 px-4 md:px-6 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 z-30 shadow-2xs">
                    <div className="flex items-center gap-3">
                        <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight capitalize">
                            {activeTab.replace(/-/g, ' ')}
                        </h1>
                        <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                            SaaS Admin Panel
                        </span>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3">
                        {/* Quick action buttons */}
                        <button
                            type="button"
                            onClick={() => setActiveTab('announcements-center')}
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                        >
                            <Megaphone className="w-3.5 h-3.5" />
                            <span>Broadcast</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setActiveTab('subscriptions')}
                            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 transition-colors"
                        >
                            <Crown className="w-3.5 h-3.5" />
                            <span>Plans</span>
                        </button>

                        {/* Admin Notification Center Bell */}
                        <AdminNotificationCenter onNavigateTab={(tab) => setActiveTab(tab)} showToast={showToast} />

                        {/* Admin Avatar & Role */}
                        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
                            </div>
                            <div className="hidden lg:block text-left">
                                <p className="text-xs font-bold text-slate-800 leading-tight truncate max-w-[120px]">{user?.name || 'Administrator'}</p>
                                <p className="text-[10px] font-extrabold uppercase text-indigo-600 leading-none mt-0.5">{user?.role || 'SaaS Owner'}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="flex-1 min-w-0 h-full overflow-y-auto">
                {globalEmergencyBanner && (
                    <div className="bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 text-white px-6 py-3.5 rounded-2xl shadow-lg flex items-center justify-between border border-blue-500/30 m-4 mb-0 animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3">
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-duration-1000"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-200"></span>
                            </span>
                            <span className="font-mono text-[9px] tracking-wider uppercase font-black bg-blue-500/40 text-blue-100 px-2 py-0.5 rounded-md">
                                System Broadcast
                            </span>
                            <span className="text-sm font-semibold tracking-tight">{globalEmergencyBanner}</span>
                        </div>
                        <button 
                            onClick={dismissAnnouncement}
                            className="text-white hover:text-sky-200 transition-colors bg-white/10 hover:bg-white/20 p-1.5 rounded-xl border border-white/10"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                )}

                <div id="admin-workspace" className="w-full max-w-[1600px] mx-auto space-y-6 p-4 md:p-6 pb-28 sm:pb-32 md:pb-8">
            {/* --- DASHBOARD TAB --- */}
            
            {saasAlerts.length > 0 && (
                <div id="saas-alert-banner" className="mb-4 bg-amber-500 text-white px-4 py-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-md">
                    <div className="text-sm font-semibold">
                        <span className="uppercase text-[10px] opacity-90 mr-2">Alert</span>
                        {saasAlerts[0].title}: {saasAlerts[0].message}
                    </div>
                    <div className="flex gap-2 shrink-0">
                        <button type="button" className="px-3 py-1 rounded-lg bg-white/20 text-xs font-bold" onClick={() => setActiveTab('analytics-center')}>View analytics</button>
                        <button type="button" className="px-3 py-1 rounded-lg bg-white/10 text-xs font-bold" onClick={async () => {
                            await authFetch(`/api/admin/alerts/${saasAlerts[0].id}/read`, { method: 'PATCH' });
                            refreshSaasAlerts();
                        }}>Dismiss</button>
                    </div>
                </div>
            )}

            <Suspense fallback={<div className="p-8 text-sm text-slate-500 animate-pulse">Loading module…</div>}>
            {activeTab === 'dashboard' && (
                <AdminDashboardTab
                  activeSubs={activeSubs}
                  activeTab={activeTab}
                  emergencyBannerInput={emergencyBannerInput}
                  gatewayTestResult={gatewayTestResult}
                  globalFeatures={globalFeatures}
                  isBannerInputOpen={isBannerInputOpen}
                  isOptimizingDb={isOptimizingDb}
                  isPurgingCache={isPurgingCache}
                  isRestartingWorkers={isRestartingWorkers}
                  isTestingGateways={isTestingGateways}
                  liveCacheHitRate={liveCacheHitRate}
                  liveDbResponseTime={liveDbResponseTime}
                  saasTickets={saasTickets}
                  setActiveTab={setActiveTab}
                  setConfirmModal={setConfirmModal}
                  setEmergencyBannerInput={setEmergencyBannerInput}
                  setGatewayTestResult={setGatewayTestResult}
                  setGlobalFeatures={setGlobalFeatures}
                  setIsBannerInputOpen={setIsBannerInputOpen}
                  setIsOptimizingDb={setIsOptimizingDb}
                  setIsPurgingCache={setIsPurgingCache}
                  setIsRestartingWorkers={setIsRestartingWorkers}
                  setIsTestingGateways={setIsTestingGateways}
                  setLiveCacheHitRate={setLiveCacheHitRate}
                  setLiveDbResponseTime={setLiveDbResponseTime}
                  setSelectedSupportTicket={setSelectedSupportTicket}
                  showToast={showToast}
                  simulatedRole={simulatedRole}
                  user={user}
                  visibleUsers={visibleUsers}
                  totalRevenue={totalRevenue}
                  estimatedMRR={estimatedMRR}
                  estimatedARR={estimatedARR}
                  payingCustomers={payingCustomers}
                  arpu={arpu}
                  logoChurnRate={logoChurnRate}
                  revenueChurnRate={revenueChurnRate}
                  atRiskCount={atRiskCount}
                  atRiskMRR={atRiskMRR}
                  churnedCount={churnedCount}
                  totalNetworkSell={totalNetworkSell}
                  totalNetworkBuy={totalNetworkBuy}
                  totalUniqueOwners={totalUniqueOwners}
                  totalAdditionalBranches={totalAdditionalBranches}
                  totalNetworkBusiness={totalNetworkBusiness}
                  totalNetworkDue={totalNetworkDue}
                />
            )}

            {activeTab === 'customer-search' && (
                                <AdminCustomerSearchTab
                  handleCustomerSearch={handleCustomerSearch}
                  searchPhone={searchPhone}
                  setSearchPhone={setSearchPhone}
                  searchResult={searchResult}
                  hasSearched={hasSearched}
                  currencySymbol={currencySymbol}
                  user={user}
                />
            )}

            {activeTab === 'employees' && (
                <AdminEmployeesTab
                  employeeRoleFilter={employeeRoleFilter}
                  employeeSearch={employeeSearch}
                  globalEmployees={globalEmployees}
                  selectedEmployee={selectedEmployee}
                  setEmployeeRoleFilter={setEmployeeRoleFilter}
                  setEmployeeSearch={setEmployeeSearch}
                  setGlobalEmployees={setGlobalEmployees}
                  setSelectedEmployee={setSelectedEmployee}
                  showToast={showToast}
                  refreshEmployees={refreshGlobalEmployees}
                  user={user}
                />
            )}

            {/* --- SECURITY & SCALABILITY TAB --- */}
            {activeTab === 'security' && (
                <AdminSecurityTab
                  archiveDate={archiveDate}
                  backupPassword={backupPassword}
                  setArchiveDate={setArchiveDate}
                  setBackupPassword={setBackupPassword}
                  user={user}
                  handleBackup={handleBackup}
                  handleArchive={handleArchive}
                />
            )}

            {activeTab === 'businesses' && (
                <AdminBusinessesTab
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  visibleUsers={visibleUsers}
                  currencySymbol={currencySymbol}
                  getUserTotalBusiness={getUserTotalBusiness}
                  isSuperAdmin={isSuperAdmin}
                  handleEditClick={handleEditClick}
                  onRefresh={() => reloadAdminLive?.('businesses')}
                  handleDeleteUser={handleDeleteUser}
                  handleForceSync={typeof handleForceSync === 'function' ? handleForceSync : undefined}
                  handleViewTransactions={typeof handleViewTransactions === 'function' ? handleViewTransactions : undefined}
                  impersonateUser={impersonateUser}
                />
            )}

            {/* --- TEMPLATES TAB --- */}
            {activeTab === 'templates' && (
                <AdminTemplatesTab
                  handleAddTemplate={handleAddTemplate}
                  handleDeleteTemplate={handleDeleteTemplate}
                  templates={templates}
                  user={user}
                />
            )}

            {activeTab === 'subscriptions' && (
                <AdminSubscriptionsTab
                  plans={plans}
                  currencySymbol={currencySymbol}
                  user={user}
                  isSuperAdmin={isSuperAdmin}
                  setEditingPlan={setEditingPlan}
                  setShowPlanModal={setShowPlanModal}
                  handleApproveRequest={handleApproveRequest}
                  handleRejectRequest={handleRejectRequest}
                  saasRequests={saasRequests}
                />
            )}


            {activeTab === 'revenue-center' && (
                <AdminRevenueCenterTab
                  currencySymbol={currencySymbol}
                  commissionRate={commissionRate}
                  paymentForm={paymentForm}
                  revenueSummary={revenueSummary}
                  setCommissionRate={setCommissionRate}
                  setPaymentForm={setPaymentForm}
                  showToast={showToast}
                  authFetch={authFetch}
                />
            )}

            {activeTab === 'requests' && (
                <AdminSubscriptionsTab
                  plans={[]}
                  currencySymbol={currencySymbol}
                  isSuperAdmin={isSuperAdmin}
                  handleApproveRequest={handleApproveRequest}
                  handleRejectRequest={handleRejectRequest}
                  saasRequests={saasRequests}
                  visibleRequests={visibleRequests}
                />
            )}

            {activeTab === 'users' && (isSuperAdmin || isAdminRole) && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div>
                      <h2 className="font-bold text-slate-800 text-lg">Admin users</h2>
                      <p className="text-xs text-slate-500">SaaS staff accounts on this platform</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAdminModal?.(true)}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold"
                    >
                      Add admin
                    </button>
                  </div>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-4 py-2">Name</th>
                          <th className="px-4 py-2">Email</th>
                          <th className="px-4 py-2">Role</th>
                          <th className="px-4 py-2">Last active</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(admins || []).length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">No admin users saved yet</td>
                          </tr>
                        )}
                        {(admins || []).map((a: any) => (
                          <tr key={a.id}>
                            <td className="px-4 py-3 font-semibold text-slate-800">{a.name || '—'}</td>
                            <td className="px-4 py-3 text-slate-600">{a.email || '—'}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">{a.role || 'Admin'}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs">{a.lastActive || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            )}


            {/* --- SUPPORT TAB --- */}
            {activeTab === 'support' && (
                <AdminSupportTab
                  saasTickets={saasTickets}
                  updateSaasTicket={updateSaasTicket}
                  user={user}
                  supportFilter={supportFilter}
                  setSupportFilter={setSupportFilter}
                  selectedSupportTicket={selectedSupportTicket}
                  setSelectedSupportTicket={setSelectedSupportTicket}
                  supportReplyText={supportReplyText}
                  setSupportReplyText={setSupportReplyText}
                  supportNoteText={supportNoteText}
                  setSupportNoteText={setSupportNoteText}
                  setEditModalTab={setEditModalTab}
                />
            )}

            {activeTab === 'notifications' && (
                <AdminNotificationsTab
                  campaigns={campaigns}
                  compAudience={compAudience}
                  compChannels={compChannels}
                  compMessage={compMessage}
                  compTitle={compTitle}
                  failedMessages={failedMessages}
                  isScheduled={isScheduled}
                  newTempCat={newTempCat}
                  newTempMessage={newTempMessage}
                  newTempTitle={newTempTitle}
                  notificationAudits={notificationAudits}
                  notificationTemplates={notificationTemplates}
                  scheduleDate={scheduleDate}
                  scheduleTime={scheduleTime}
                  selectedTemplateId={selectedTemplateId}
                  setCampaigns={setCampaigns}
                  setCompAudience={setCompAudience}
                  setCompChannels={setCompChannels}
                  setCompMessage={setCompMessage}
                  setCompTitle={setCompTitle}
                  setFailedMessages={setFailedMessages}
                  setIsScheduled={setIsScheduled}
                  setNewTempCat={setNewTempCat}
                  setNewTempMessage={setNewTempMessage}
                  setNewTempTitle={setNewTempTitle}
                  setNotificationAudits={setNotificationAudits}
                  setNotificationTemplates={setNotificationTemplates}
                  setScheduleDate={setScheduleDate}
                  setScheduleTime={setScheduleTime}
                  setSelectedTemplateId={setSelectedTemplateId}
                  showToast={showToast}
                  user={user}
                />
            )}

            {/* --- SUPPLIERS REGISTRY TAB --- */}
            {activeTab === 'suppliers' && (
                <AdminSuppliersTab visibleUsers={visibleUsers} currencySymbol={currencySymbol} />
            )}

            {/* --- AUDIT LOG TAB --- */}
            {activeTab === 'audit' && (
                <AdminAuditTab />
            )}

            {activeTab === 'logs' && (isSuperAdmin || isAdminRole) && (
                <AdminLogsTab
                  isSuperAdmin={isSuperAdmin}
                  logFilter={logFilter}
                  logLoginAsOnly={logLoginAsOnly}
                  setLogFilter={setLogFilter}
                  setLogLoginAsOnly={setLogLoginAsOnly}
                  user={user}
                  logs={logs}
                />
            )}

            {activeTab === 'customer-portal' && (
                <AdminCustomerPortalTab
                  customerPortalAccounts={customerPortalAccounts}
                  setCustomerPortalAccounts={setCustomerPortalAccounts}
                  showToast={showToast}
                  refreshCustomers={refreshCustomers}
                />
            )}

            {activeTab === 'supplier-portal' && (
                <AdminSupplierPortalTab
                  setSupplierPortalAccounts={setSupplierPortalAccounts}
                  showToast={showToast}
                  supplierPortalAccounts={supplierPortalAccounts}
                />
            )}

            {activeTab === 'payment-gateway' && (
                <AdminPaymentGatewayTab
                  gatewayLogs={gatewayLogs}
                  commissionRate={commissionRate}
                  gatewaySettings={gatewaySettings}
                  paymentForm={paymentForm}
                  setCommissionRate={setCommissionRate}
                  setGatewaySettings={setGatewaySettings}
                  setPaymentForm={setPaymentForm}
                  showToast={showToast}
                />
            )}

            {activeTab === 'announcements-center' && (
                <AdminAnnouncementsTab
                  annForm={annForm}
                  setAnnForm={setAnnForm}
                  announcementList={announcementList}
                  createAnnouncement={typeof createAnnouncement === 'function' ? createAnnouncement : undefined}
                  toggleAnnouncement={typeof toggleAnnouncement === 'function' ? toggleAnnouncement : undefined}
                  deleteAnnouncement={typeof deleteAnnouncement === 'function' ? deleteAnnouncement : undefined}
                  showToast={showToast}
                  user={user}
                  plans={plans}
                  businesses={registeredUsers}
                  refreshAnnouncements={refreshAnnouncements}
                />
            )}

            {activeTab === 'finance-analytics' && (
                <AdminFinanceAnalyticsTab
                  forecastGrowth={forecastGrowth}
                  forecastMonths={forecastMonths}
                  setForecastGrowth={setForecastGrowth}
                  setForecastMonths={setForecastMonths}
                />
            )}

            {activeTab === 'website-cms' && (
                <AdminWebsiteCmsTab
                  cmsFaqs={cmsFaqs}
                  cmsHeroSubtitle={cmsHeroSubtitle}
                  cmsHeroTitle={cmsHeroTitle}
                  setCmsFaqs={setCmsFaqs}
                  setCmsHeroSubtitle={setCmsHeroSubtitle}
                  setCmsHeroTitle={setCmsHeroTitle}
                  showToast={showToast}
                />
            )}

            {activeTab === 'feature-manager' && (
                <AdminFeatureManagerTab
                  globalFeatures={globalFeatures}
                  setGlobalFeatures={setGlobalFeatures}
                  showToast={showToast}
                />
            )}

            {activeTab === 'database-manager' && (
                <AdminDatabaseManagerTab
                  dbBackups={dbBackups}
                  setDbBackups={setDbBackups}
                  showToast={showToast}
                />
            )}

            {activeTab === 'api-manager' && (
                <AdminApiManagerTab
                  apiKeys={apiKeys}
                  setApiKeys={setApiKeys}
                  setWebhookLogs={setWebhookLogs}
                  setWebhookUrl={setWebhookUrl}
                  showToast={showToast}
                  webhookLogs={webhookLogs}
                  webhookUrl={webhookUrl}
                />
            )}

            {activeTab === 'ai-center' && (
                <AdminAiCenterTab
                  aiChatInput={aiChatInput}
                  aiChatMessages={aiChatMessages}
                  saasTickets={saasTickets}
                  setAiChatInput={setAiChatInput}
                  setAiChatMessages={setAiChatMessages}
                  user={user}
                  visibleUsers={visibleUsers}
                />
            )}

            {activeTab === 'marketing-center' && (
                <AdminMarketingCenterTab
                  marketingCampaigns={marketingCampaigns}
                  setMarketingCampaigns={setMarketingCampaigns}
                  showToast={showToast}
                />
            )}

            {activeTab === 'analytics-center' && (
                <AdminAnalyticsCenterTab
                  authFetch={authFetch}
                  readinessFilter={readinessFilter}
                  readinessOpen={readinessOpen}
                  readinessReport={readinessReport}
                  serverDashboardStats={serverDashboardStats}
                  setEditingUser={setEditingUser}
                  setReadinessFilter={setReadinessFilter}
                  setReadinessOpen={setReadinessOpen}
                  setReadinessReport={setReadinessReport}
                  setServerDashboardStats={setServerDashboardStats}
                  setShowEditModal={setShowEditModal}
                  showToast={showToast}
                />
            )}

            {activeTab === 'reports-center' && (
                <AdminReportsCenterTab
                  showToast={showToast}
                  visibleUsers={visibleUsers}
                  saasTickets={saasTickets}
                />
            )}

            {activeTab === 'global-search' && (
                <AdminGlobalSearchTab
                  activeTab={activeTab}
                  globalSearchVal={globalSearchVal}
                  setGlobalSearchVal={setGlobalSearchVal}
                  setSearchParams={setSearchParams}
                  setActiveTab={setActiveTab}
                  registeredUsers={registeredUsers}
                />
            )}

            {activeTab === 'system-settings' && (
                <AdminSystemSettingsTab
                  showToast={showToast}
                  brandingName={brandingName}
                  defaultCurrency={defaultCurrency}
                  defaultTimezone={defaultTimezone}
                  faviconUrl={faviconUrl}
                  logoUrl={logoUrl}
                  seoDescription={seoDescription}
                  seoTitle={seoTitle}
                  setBrandingName={setBrandingName}
                  setDefaultCurrency={setDefaultCurrency}
                  setDefaultTimezone={setDefaultTimezone}
                  setFaviconUrl={setFaviconUrl}
                  setLogoUrl={setLogoUrl}
                  setSeoDescription={setSeoDescription}
                  setSeoTitle={setSeoTitle}
                  setSmsGatewayUrl={setSmsGatewayUrl}
                  setSmtpHost={setSmtpHost}
                  smsGatewayUrl={smsGatewayUrl}
                  smtpHost={smtpHost}
                />
            )}

            {activeTab === 'monitoring-center' && (
                <AdminMonitoringTab

                />
            )}

            {activeTab === 'developer-center' && (
                <AdminDeveloperTab
                  devLogsInput={devLogsInput}
                  setDevLogsInput={setDevLogsInput}
                  setTerminalLogs={setTerminalLogs}
                  terminalLogs={terminalLogs}
                />
            )}

            {activeTab === 'owner-profile' && (
                <AdminOwnerProfileTab
                  showToast={showToast}
                />
            )}

            {activeTab === 'enterprise-features' && (
                <AdminEnterpriseTab
                  showToast={showToast}
                />
            )}
            </Suspense>

            </div>{/* #admin-workspace */}
            </div>{/* main scroll column */}

            {/* --- MODALS --- */}
            
            {/* Custom Toast Notification */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[100] animate-in slide-in-from-right-10 fade-in duration-300`}>
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl border ${
                        toast.type === 'success' 
                            ? 'bg-emerald-600 border-emerald-500 text-white' 
                            : 'bg-red-600 border-red-500 text-white'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                        <p className="font-bold">{toast.message}</p>
                    </div>
                </div>
            )}

            {/* Custom Confirmation Modal */}
            {confirmModal.show && (
                <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                                confirmModal.type === 'danger' ? 'bg-red-100 text-red-600' : 
                                confirmModal.type === 'warning' ? 'bg-orange-100 text-orange-600' : 
                                'bg-indigo-100 text-indigo-600'
                            }`}>
                                {confirmModal.type === 'danger' ? <Trash2 className="w-8 h-8" /> : 
                                 confirmModal.type === 'warning' ? <AlertTriangle className="w-8 h-8" /> : 
                                 <Shield className="w-8 h-8" />}
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{confirmModal.title}</h3>
                            <p className="text-slate-500 mb-8">{confirmModal.message}</p>
                            <div className="flex gap-3">
                                <button 
                                    onClick={closeConfirm}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={confirmModal.onConfirm}
                                    className={`flex-1 px-4 py-3 rounded-xl font-bold text-white transition-colors ${
                                        confirmModal.type === 'danger' ? 'bg-red-600 hover:bg-red-700' : 
                                        confirmModal.type === 'warning' ? 'bg-orange-600 hover:bg-orange-700' : 
                                        'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                                >
                                    Confirm
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Custom Input Modal */}
            {inputModal.show && (
                <div className="fixed inset-0 bg-slate-900/60 z-[120] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <form onSubmit={(e) => { e.preventDefault(); inputModal.onConfirm(inputModal.value); }} className="p-6">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">{inputModal.title}</h3>
                            <div className="mb-6">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{inputModal.label}</label>
                                <input 
                                    autoFocus
                                    type={inputModal.type}
                                    value={inputModal.value}
                                    onChange={(e) => setInputModal(prev => ({ ...prev, value: e.target.value }))}
                                    className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder={`Enter ${inputModal.label.toLowerCase()}...`}
                                />
                            </div>
                            <div className="flex gap-3">
                                <button 
                                    type="button"
                                    onClick={() => setInputModal(prev => ({ ...prev, show: false }))}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
                                >
                                    Submit
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Stores List Modal */}
            {viewingStoresForMobile && (
                <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <Store className="w-5 h-5 text-indigo-600" /> 
                                Stores for {visibleUsers.find((u: any) => u.mobile === viewingStoresForMobile)?.owner}
                            </h3>
                            <button onClick={() => setViewingStoresForMobile(null)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            <div className="space-y-3">
                                {(() => {
                                    const userStores = visibleUsers.filter((u: any) => u.mobile === viewingStoresForMobile);
                                    const allowedStores = Math.max(...userStores.map((u: any) => u.totalStores || 0), userStores.length);
                                    
                                    return Array.from({ length: allowedStores }).map((_, idx) => {
                                        const store = userStores[idx];
                                        
                                        if (store) {
                                            return (
                                                <div 
                                                    key={store.id} 
                                                    onClick={() => {
                                                        setViewingStoresForMobile(null);
                                                        setEditingUser(store);
                                                        setShowEditModal(true);
                                                    }}
                                                    className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div>
                                                            <h4 className="font-bold text-indigo-600 group-hover:text-indigo-800 text-lg text-left">
                                                                {store.businessName}
                                                            </h4>
                                                            <p className="text-xs text-slate-500">{store.businessType}</p>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${store.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                            {store.status}
                                                        </span>
                                                    </div>
                                                    <div className="flex justify-between items-end mt-4">
                                                        <div>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Plan</p>
                                                            <p className="text-sm font-bold text-indigo-600">{store.plan}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase">Total Business</p>
                                                            <p className="text-sm font-bold text-emerald-600">{currencySymbol} {getUserTotalBusiness(store).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            return (
                                                <div key={`empty-${idx}`} className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl flex items-center justify-center h-[116px]">
                                                    <div className="text-center">
                                                        <p className="text-sm font-bold text-slate-400">Empty Store Slot</p>
                                                        <p className="text-xs text-slate-400 mt-1">Available for new branch</p>
                                                    </div>
                                                </div>
                                            );
                                        }
                                    });
                                })()}
                            </div>
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                            <button 
                                onClick={() => setViewingStoresForMobile(null)}
                                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Shop Detail View Modal */}
            {viewingUserDetail && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Store className="w-5 h-5 text-indigo-600" /> Shop Full Details
                            </h3>
                            <button onClick={() => setViewingUserDetail(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Business Name</label>
                                    <p className="text-lg font-bold text-slate-800">{viewingUserDetail.businessName}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Owner Name</label>
                                    <p className="text-lg font-bold text-slate-800">{viewingUserDetail.owner}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Mobile Number</label>
                                    <p className={`text-lg font-bold ${isSuperAdmin ? 'text-indigo-600' : 'text-slate-300 italic'}`}>
                                        {isSuperAdmin ? viewingUserDetail.mobile : 'Restricted'}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Current Plan</label>
                                    <p className="text-lg font-bold text-slate-800">{viewingUserDetail.plan}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Status</label>
                                    <p className={`text-lg font-bold ${viewingUserDetail.status === 'Active' ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {viewingUserDetail.status}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Expiry Date</label>
                                    <p className="text-lg font-bold text-slate-800">{viewingUserDetail.expiry}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Total Store</label>
                                    <p className="text-lg font-bold text-indigo-600">{viewingUserDetail.totalStores || 0}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Total Branch</label>
                                    <p className="text-lg font-bold text-indigo-600">{visibleUsers.filter((x: any) => x.mobile === viewingUserDetail.mobile).length}</p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-slate-400 uppercase">Total Business</label>
                                    <p className="text-lg font-bold text-emerald-600">{currencySymbol} {getUserTotalBusiness(viewingUserDetail).toLocaleString()}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <h4 className="font-bold text-slate-700 mb-2 flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Signup Information
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-500">Registration Date:</span>
                                        <span className="ml-2 font-medium">{(viewingUserDetail as any).signupDate || '2023-10-12'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Email:</span>
                                        <span className="ml-2 font-medium">{viewingUserDetail.email || `${viewingUserDetail.owner.toLowerCase().replace(' ', '.')}@gmail.com`}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Address:</span>
                                        <span className="ml-2 font-medium">{(viewingUserDetail as any).address || 'Dhaka, Bangladesh'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Business Type:</span>
                                        <span className="ml-2 font-medium">{(viewingUserDetail as any).businessType || 'Retail / Fashion'}</span>
                                    </div>
                                    <div className="col-span-2 mt-4 border-t pt-4">
                                        <h4 className="font-bold text-slate-700 mb-2">Feature Access</h4>
                                        <p className="text-sm text-slate-600">{viewingUserDetail.features?.join(', ') || 'None'}</p>
                                        
                                        <h4 className="font-bold text-slate-700 mt-4 mb-2">Temporary Feature Requests</h4>
                                        {viewingUserDetail.temporaryFeatures?.map((tf: any, index: number) => (
                                            <div key={index} className="flex justify-between items-center bg-slate-50 p-2 rounded text-sm mb-1">
                                                <span>{tf.feature} (Expires: {new Date(tf.expiry).toLocaleDateString()})</span>
                                                <span className={`px-2 py-0.5 rounded text-xs ${tf.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{tf.status}</span>
                                                {isSuperAdmin && tf.status === 'pending' && (
                                                    <button onClick={() => handleApproveTemporaryFeature(viewingUserDetail.id, index)} className="text-emerald-600 font-bold text-xs">Approve</button>
                                                )}
                                            </div>
                                        ))}
                                        {isSaaSUser && !isSuperAdmin && (
                                            <div className="mt-2">
                                                <select className="border p-1 rounded text-sm" onChange={(e) => handleRequestTemporaryFeature(viewingUserDetail, e.target.value)}>
                                                    <option value="">Request Feature</option>
                                                    {AVAILABLE_FEATURES.filter(f => !viewingUserDetail.features?.includes(f)).map(f => <option key={f} value={f}>{f}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    <div className="col-span-2 mt-4 border-t pt-4">
                                        <h4 className="font-bold text-slate-700 mb-2">Subscription Activity</h4>
                                        <ul className="text-sm text-slate-600 space-y-1">
                                            <li>Plan upgraded to {viewingUserDetail.plan} on {viewingUserDetail.signupDate}</li>
                                            <li>Last billing cycle processed on 2026-03-01</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                <h4 className="font-bold text-indigo-900 mb-2 flex items-center gap-2">
                                    <Shield className="w-4 h-4" /> Technical & Security
                                </h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-500">Last Active:</span>
                                        <span className="ml-2 font-medium text-indigo-700">{(viewingUserDetail as any).lastActive || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Login Count:</span>
                                        <span className="ml-2 font-medium text-indigo-700">{(viewingUserDetail as any).loginCount || 0} times</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Last IP:</span>
                                        <span className="ml-2 font-mono text-xs text-indigo-700">{(viewingUserDetail as any).lastIp || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-500">Password:</span>
                                        <span className="ml-2 font-mono text-xs text-indigo-700">
                                            {isSuperAdmin ? (
                                                <span className="flex items-center gap-1">
                                                    {showPasswords.has(viewingUserDetail.id) ? (viewingUserDetail as any).password : '••••••••'}
                                                    <button onClick={() => togglePasswordVisibility(viewingUserDetail.id)} className="text-indigo-400 hover:text-indigo-600">
                                                        {showPasswords.has(viewingUserDetail.id) ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                                    </button>
                                                </span>
                                            ) : 'Restricted'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {isSuperAdmin && (
                                <div className="flex gap-3 pt-4 border-t border-slate-100">
                                    <button 
                                        onClick={() => {
                                            setEditingUser({...viewingUserDetail});
                                            setShowEditModal(true);
                                            setViewingUserDetail(null);
                                        }}
                                        className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Edit3 className="w-4 h-4" /> Edit
                                    </button>
                                    <button 
                                        onClick={() => {
                                            handleDeleteUser(viewingUserDetail.id);
                                            setViewingUserDetail(null);
                                        }}
                                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> Delete
                                    </button>
                                    <button 
                                        onClick={() => setViewingUserDetail(null)}
                                        className="px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                                    >
                                        Close
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit User Modal */}
            {showEditModal && editingUser && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200">
                        {/* Title bar */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 relative">
                            <div>
                                <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                                    <Edit3 className="w-5 h-5 text-indigo-600" /> 
                                    <span>Control Node: <span className="text-indigo-600">{editingUser.businessName}</span></span>
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Configure limits, flags, features & subscription status</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Tab selection Bar */}
                        <div className="flex border-b border-slate-200 p-2 bg-slate-100/50">
                            <button
                                type="button"
                                onClick={() => setEditModalTab('general')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${editModalTab === 'general' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                                General Details & Limits
                            </button>
                            <button
                                type="button"
                                onClick={() => setEditModalTab('features')}
                                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${editModalTab === 'features' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-800'}`}
                            >
                                Subscription & Features Toggle ({AVAILABLE_FEATURES.filter(f => (editingUser.enabledFeatures || editingUser.features || []).includes(f)).length} Active)
                            </button>
                        </div>

                        <form onSubmit={handleUserSave} className="p-6 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
                            {editModalTab === 'general' ? (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Business Name</label>
                                            <input 
                                                type="text" 
                                                value={editingUser.businessName || ''}
                                                onChange={e => setEditingUser({...editingUser, businessName: e.target.value})}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-850"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Owner Name</label>
                                            <input 
                                                type="text" 
                                                value={editingUser.owner || ''}
                                                onChange={e => setEditingUser({...editingUser, owner: e.target.value})}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-850"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile Contact</label>
                                            <input 
                                                type="text" 
                                                value={editingUser.mobile || ''}
                                                onChange={e => setEditingUser({...editingUser, mobile: e.target.value})}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-slate-850"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Address</label>
                                            <input 
                                                type="email" 
                                                value={editingUser.email || ''}
                                                onChange={e => setEditingUser({...editingUser, email: e.target.value})}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-850"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Business Category / Type</label>
                                            <input 
                                                type="text" 
                                                value={editingUser.businessType || ''}
                                                onChange={e => setEditingUser({...editingUser, businessType: e.target.value})}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-medium text-slate-850"
                                                placeholder="e.g. Retail / Fashion"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">User Password</label>
                                            <input 
                                                type="text" 
                                                value={editingUser.password || ''}
                                                onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-mono text-slate-850"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-800 uppercase mb-1 flex items-center gap-1">
                                                <HardDrive className="w-3.5 h-3.5" /> Storage (MB)
                                            </label>
                                            <input 
                                                type="number" 
                                                value={editingUser.storageLimit || 500}
                                                onChange={e => setEditingUser({...editingUser, storageLimit: parseInt(e.target.value) || 0})}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold font-mono text-slate-850"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-800 uppercase mb-1 flex items-center gap-1">
                                                <Users className="w-3.5 h-3.5" /> Max Employee
                                            </label>
                                            <input 
                                                type="number" 
                                                value={editingUser.employeeLimit || 5}
                                                onChange={e => setEditingUser({...editingUser, employeeLimit: parseInt(e.target.value) || 0})}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold font-mono text-slate-850"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-indigo-800 uppercase mb-1 flex items-center gap-1">
                                                <Store className="w-3.5 h-3.5" /> Max Branches
                                            </label>
                                            <input 
                                                type="number" 
                                                value={editingUser.branchLimit || 1}
                                                onChange={e => setEditingUser({...editingUser, branchLimit: parseInt(e.target.value) || 0})}
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 font-bold font-mono text-slate-850"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-150">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-550 mb-1">Status Code</label>
                                            <select 
                                                value={editingUser.status || editingUser.subscriptionStatus || 'Active'}
                                                onChange={e => setEditingUser({
                                                    ...editingUser,
                                                    status: e.target.value,
                                                    subscriptionStatus: e.target.value,
                                                    accountStatus: e.target.value === 'Suspended' ? 'Suspended' : editingUser.accountStatus,
                                                })}
                                                className="w-full px-3 py-2 border rounded-lg bg-white font-bold text-slate-800"
                                            >
                                                <option value="Active">Active</option>
                                                <option value="Suspended">Suspended</option>
                                                <option value="Expired">Expired</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-550 mb-1">Expiry Date</label>
                                            <input 
                                                type="date" 
                                                value={(editingUser.expiry || editingUser.subscriptionRenewsAt || '').toString().slice(0, 10)}
                                                onChange={e => setEditingUser({
                                                    ...editingUser,
                                                    expiry: e.target.value,
                                                    subscriptionRenewsAt: e.target.value,
                                                })}
                                                className="w-full px-3 py-2 border rounded-lg bg-white font-bold text-slate-850"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <label className="flex items-start gap-2 cursor-pointer p-3 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50/50">
                                                <input
                                                    type="checkbox"
                                                    checked={!!editingUser.subscriptionEnforce}
                                                    onChange={e => setEditingUser({ ...editingUser, subscriptionEnforce: e.target.checked })}
                                                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <span>
                                                    <span className="block text-sm font-bold text-slate-800">Enforce expiry lock</span>
                                                    <span className="block text-xs text-slate-500">When expired, block the shop app until renewed (API + UI).</span>
                                                </span>
                                            </label>
                                        </div>
                                        <div className="col-span-2 mt-2 p-3 rounded-xl border border-sky-200 bg-sky-50/80 space-y-3">
                                            <p className="text-xs font-black uppercase text-sky-800 tracking-wide">Trial package limits</p>
                                            <p className="text-[11px] text-sky-700">Raise caps for this shop. Usage counters shown for reference; set to 0 to clear a counter.</p>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {(['products','customers','buys','sells','expenses','quickSales'] as const).map((k) => (
                                                    <label key={k} className="text-[10px] font-bold text-slate-600 uppercase">
                                                        {k}
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            className="mt-0.5 w-full px-2 py-1.5 border rounded-lg text-sm font-bold text-slate-800"
                                                            value={editingUser.trialLimits?.[k] ?? ''}
                                                            placeholder={k === 'products' ? '5' : ''}
                                                            onChange={(e) => setEditingUser({
                                                                ...editingUser,
                                                                trialLimits: {
                                                                    ...(editingUser.trialLimits || {}),
                                                                    [k]: e.target.value === '' ? 0 : Number(e.target.value),
                                                                },
                                                            })}
                                                        />
                                                        <span className="text-[9px] text-slate-400 font-medium normal-case">
                                                            used {editingUser.trialUsage?.[k] ?? 0}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                            <div className="flex flex-wrap gap-2 items-end">
                                                <label className="text-[10px] font-bold text-slate-600 uppercase">
                                                    Extend trial (days)
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        className="mt-0.5 w-24 px-2 py-1.5 border rounded-lg text-sm font-bold"
                                                        value={editingUser._extendTrialDays ?? ''}
                                                        onChange={(e) => setEditingUser({
                                                            ...editingUser,
                                                            _extendTrialDays: e.target.value === '' ? undefined : Number(e.target.value),
                                                        })}
                                                    />
                                                </label>
                                                <button
                                                    type="button"
                                                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                                                    onClick={() => setEditingUser({
                                                        ...editingUser,
                                                        trialUsage: {
                                                            products: 0, customers: 0, buys: 0, sells: 0, expenses: 0, quickSales: 0,
                                                        },
                                                        subscriptionStatus: 'Trial',
                                                    })}
                                                >
                                                    Reset usage counters
                                                </button>
                                                <button
                                                    type="button"
                                                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                                    onClick={() => setEditingUser({
                                                        ...editingUser,
                                                        trialLimits: {
                                                            products: 50, customers: 50, buys: 50, sells: 100, expenses: 50, quickSales: 100,
                                                        },
                                                        subscriptionStatus: 'Trial',
                                                    })}
                                                >
                                                    Boost limits (×10-ish)
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4 animate-in fade-in duration-150">
                                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                                        <label className="block text-xs font-bold text-indigo-800 uppercase mb-2 flex items-center gap-1">
                                            <Crown className="w-3 h-3" /> Upgrade / Downgrade Subscription Plan
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {plans.map((plan: any) => (
                                                <button
                                                    key={plan.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const pFeatures = Array.isArray(plan.features)
                                                            ? plan.features.map((f: any) => String(f).trim())
                                                            : typeof plan.features === 'string'
                                                                ? plan.features.split(',').map((f: string) => f.trim())
                                                                : [];
                                                        // Automatically adjust limits when upgrade/downgrade occurs
                                                        const isEnt = plan.name === 'Enterprise';
                                                        const isPro = plan.name === 'Nexus Pro' || plan.name === 'Pro';
                                                        setEditingUser({
                                                            ...editingUser,
                                                            plan: plan.name,
                                                            employeeLimit: isEnt ? 30 : isPro ? 10 : 3,
                                                            branchLimit: isEnt ? 10 : isPro ? 3 : 1,
                                                            storageLimit: isEnt ? 2048 : isPro ? 500 : 100,
                                                            enabledFeatures: pFeatures,
                                                            features: pFeatures
                                                        });
                                                    }}
                                                    className={`py-3 text-xs font-bold rounded-lg border transition-all ${editingUser.plan === plan.name ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                                                >
                                                    {plan.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase">Toggle Individual Feature Flags</label>
                                            <span className="text-[10px] text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded font-bold">
                                                Plan: {editingUser.plan || 'Basic Starter'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs font-medium">
                                            {AVAILABLE_FEATURES.map((feat) => {
                                                const currentList = editingUser.enabledFeatures || editingUser.features || [];
                                                
                                                // Check if feature is allowed in current plan
                                                const planName = (editingUser.plan || '').toLowerCase();
                                                let isAllowedByPlan = false;
                                                let requiredTier = 'Basic Starter';
                                                
                                                if (planName.includes('enterprise') || planName.includes('ent')) {
                                                    isAllowedByPlan = true;
                                                    requiredTier = 'Enterprise';
                                                } else if (planName.includes('pro') || planName.includes('nexus')) {
                                                    const proAllowed = [
                                                        'Single Store', 'Unlimited Stores', 'Basic Reports', 'Advanced Analytics', 
                                                        'Employee Management', 'Priority Support', 'E-commerce Integration', 'Real-time Backups'
                                                    ];
                                                    isAllowedByPlan = proAllowed.includes(feat);
                                                    requiredTier = 'Nexus Pro';
                                                } else {
                                                    const basicAllowed = ['Single Store', 'Basic Reports'];
                                                    isAllowedByPlan = basicAllowed.includes(feat);
                                                    requiredTier = 'Basic Starter';
                                                }

                                                // If allowed by plan, check if it's currently enabled. 
                                                const isEnabled = currentList.includes(feat);
                                                
                                                return (
                                                    <label 
                                                        key={feat} 
                                                        className={`flex items-center gap-2 p-2 rounded-lg border select-none transition-all ${
                                                            isAllowedByPlan 
                                                                ? 'bg-white border-slate-200 hover:border-indigo-300 cursor-pointer text-slate-800' 
                                                                : 'bg-slate-100/70 border-slate-150 cursor-not-allowed text-slate-400 opacity-70'
                                                        }`}
                                                    >
                                                        <input 
                                                            type="checkbox"
                                                            checked={isAllowedByPlan && isEnabled}
                                                            disabled={!isAllowedByPlan}
                                                            onChange={(e) => {
                                                                if (!isAllowedByPlan) return;
                                                                const updated = e.target.checked 
                                                                    ? [...currentList, feat]
                                                                    : currentList.filter((f: string) => f !== feat);
                                                                setEditingUser({
                                                                    ...editingUser,
                                                                    enabledFeatures: updated,
                                                                    features: updated
                                                                });
                                                            }}
                                                            className={`rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 ${!isAllowedByPlan ? 'bg-slate-200 cursor-not-allowed' : ''}`}
                                                        />
                                                        <div className="flex flex-col">
                                                            <span className="flex items-center gap-1">
                                                                {feat}
                                                                {!isAllowedByPlan && <Lock className="w-2.5 h-2.5 text-slate-400 shrink-0" />}
                                                            </span>
                                                            {!isAllowedByPlan && (
                                                                <span className="text-[9px] text-red-500 font-bold">
                                                                    Locked ({requiredTier === 'Enterprise' ? 'Requires Enterprise' : 'Requires Pro'})
                                                                </span>
                                                            )}
                                                        </div>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                                <button 
                                    type="button" 
                                    onClick={() => setShowEditModal(false)}
                                    className="px-4 py-2 border rounded-lg text-xs font-bold text-slate-650 hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-sm transition-colors text-xs select-none"
                                >
                                    Apply Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Shop Data Inspector Drawer Modal Overlay */}
            {viewingShopData && (
                <div className="fixed inset-0 bg-slate-900/75 z-50 flex items-center justify-center p-6 backdrop-blur-md">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col border border-slate-200 animate-in fade-in slide-in-from-bottom duration-250">
                        {/* Header */}
                        <div className="bg-[#1e293b] text-white p-5 flex justify-between items-center shrink-0 border-b border-slate-800">
                            <div className="flex items-center gap-3">
                                <div className="bg-indigo-600 p-2.5 rounded-xl">
                                    <Database className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-extrabold text-lg tracking-tight select-none">{viewingShopData.businessName}</h3>
                                        <span className="px-2 py-0.5 bg-slate-700 text-indigo-300 font-bold text-[10px] rounded border border-slate-600">INSPECTOR NODE</span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        Shop Owner: <span className="text-slate-200 font-bold">{viewingShopData.owner}</span> | Phone: <span className="font-mono text-slate-200">{viewingShopData.mobile}</span> | Plan: <span className="font-bold text-amber-400">{viewingShopData.plan}</span>
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        if (impersonateUser) {
                                            impersonateUser(viewingShopData);
                                            showToast(`Launching switched terminal for ${viewingShopData.businessName}...`, 'success');
                                            setTimeout(() => { window.location.href = '/dashboard'; }, 1000);
                                        }
                                    }}
                                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
                                >
                                    <Key className="w-4 h-4" />
                                    <span>Impersonate (Login As)</span>
                                </button>
                                <button
                                    onClick={() => setViewingShopData(null)}
                                    className="p-2 bg-slate-805 hover:bg-slate-700 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer bg-slate-800"
                                    title="Close Inspector"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Main Interactive Workspace Area */}
                        <div className="flex-1 flex overflow-hidden">
                            {/* Left Drawer Navigation */}
                            <div className="w-64 bg-slate-50 border-r border-slate-200 p-4 space-y-1.5 flex flex-col justify-between shrink-0 overflow-y-auto">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2 whitespace-nowrap">Shop Registers</p>
                                    {[
                                        { id: 'products', label: 'Products', count: 18, icon: Package },
                                        { id: 'categories', label: 'Categories', count: 6, icon: Briefcase },
                                        { id: 'customers', label: 'Customers', count: 42, icon: Users },
                                        { id: 'suppliers', label: 'Suppliers', count: 8, icon: Store },
                                        { id: 'sales', label: 'Sales Logs', count: 124, icon: DollarSign },
                                        { id: 'purchases', label: 'Purchases (PO)', count: 12, icon: ShoppingCart },
                                        { id: 'expenses', label: 'Expenses', count: 14, icon: FileText },
                                        { id: 'inventory', label: 'Inventory (Alerts)', count: 3, icon: HardDrive },
                                        { id: 'employees', label: 'Employees Staff', count: viewingShopData.employeeCount || 2, icon: Users },
                                    ].map((item) => {
                                        const IconComp = item.icon;
                                        const isAct = activeInspectorTab === item.id;
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                onClick={() => setActiveInspectorTab(item.id)}
                                                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-xs font-bold transition-all border ${
                                                    isAct 
                                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                                        : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1 rounded ${isAct ? 'bg-indigo-700' : 'bg-slate-100'}`}>
                                                        <IconComp className="w-4 h-4" />
                                                    </div>
                                                    <span>{item.label}</span>
                                                </div>
                                                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${isAct ? 'bg-indigo-850 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                    {item.count}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="pt-4 border-t border-slate-200 space-y-1">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">SaaS System Nodes</p>
                                    <button
                                        type="button"
                                        onClick={() => setActiveInspectorTab('reports')}
                                        className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all border ${
                                            activeInspectorTab === 'reports' 
                                                ? 'bg-indigo-600 text-white border-indigo-600' 
                                                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                                        }`}
                                    >
                                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                                        <span>Profitability Analytics</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveInspectorTab('settings')}
                                        className={`w-full flex items-center gap-2 p-2.5 rounded-xl text-xs font-bold transition-all border ${
                                            activeInspectorTab === 'settings' 
                                                ? 'bg-indigo-600 text-white border-indigo-600' 
                                                : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                                        }`}
                                    >
                                        <Shield className="w-4 h-4 text-amber-500" />
                                        <span>Store Core Settings</span>
                                    </button>
                                </div>
                            </div>

                            {/* Main Content Pane */}
                            <div className="flex-1 p-6 overflow-y-auto bg-slate-50">
                                {/* Dynamic View rendering depending on activeInspectorTab */}
                                {activeInspectorTab === 'products' && (
                                    <div className="space-y-4 animate-in fade-in duration-150">
                                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                                            <div className="text-left">
                                                <h4 className="text-base font-extrabold text-slate-900">Products Inventory</h4>
                                                <p className="text-xs text-slate-550 mt-0.5">Live products configured for {viewingShopData.businessName}</p>
                                            </div>
                                            <span className="text-xs bg-indigo-55 bg-indigo-100 font-extrabold border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-lg select-all">Total valuation: {currencySymbol} {inspectedTotalValuation.toLocaleString()}</span>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-[#0f172a] text-slate-100 font-bold border-b">
                                                    <tr>
                                                        <th className="px-4 py-3">Product Name</th>
                                                        <th className="px-4 py-3">Category</th>
                                                        <th className="px-4 py-3 text-center">In-Stock</th>
                                                        <th className="px-4 py-3 text-right">Purchase Cost</th>
                                                        <th className="px-4 py-3 text-right">Sale Price</th>
                                                        <th className="px-4 py-3 text-center">Gross Margin</th>
                                                        <th className="px-4 py-3 text-center border-l">Alert</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-150 font-medium text-slate-800">
                                                    {inspectedProducts.map((p, idx) => {
                                                        const profit = p.sell - p.buy;
                                                        const pct = ((profit / p.buy) * 100).toFixed(0);
                                                        return (
                                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                                <td className="px-4 py-3.5 font-bold text-slate-900 text-left">{p.name}</td>
                                                                <td className="px-4 py-3.5 text-slate-600 font-bold text-left">{p.cat}</td>
                                                                <td className="px-4 py-3.5 text-center font-bold text-slate-750">{p.stock} pcs</td>
                                                                <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-600">{currencySymbol} {p.buy.toLocaleString()}</td>
                                                                <td className="px-4 py-3.5 text-right font-mono font-bold text-indigo-700">{currencySymbol} {p.sell.toLocaleString()}</td>
                                                                <td className="px-4 py-3.5 text-center">
                                                                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-850 font-bold">+{pct}%</span>
                                                                </td>
                                                                <td className="px-4 py-3.5 text-center border-l">
                                                                    {p.stock <= 5 ? (
                                                                        <span className="text-red-500 font-bold animate-pulse">Low Stock</span>
                                                                    ) : (
                                                                        <span className="text-emerald-600 font-bold">Healthy</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeInspectorTab === 'categories' && (
                                    <div className="space-y-4 animate-in fade-in duration-150">
                                        <div className="text-left">
                                            <h4 className="text-base font-extrabold text-slate-900 font-display">Categories Hierarchy</h4>
                                            <p className="text-xs text-slate-500">Sales catalogs categories and product associations</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            {inspectedCategories.map((cat, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-indigo-400 transition-all flex flex-col justify-between">
                                                    <div className="text-left">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Category Node</span>
                                                        <h5 className="font-bold text-slate-800 mt-2 text-sm">{cat.name}</h5>
                                                        <p className="text-xs text-slate-500 mt-1 font-medium italic">Subs: {cat.sub}</p>
                                                    </div>
                                                    <div className="pt-4 mt-3 border-t border-slate-100 flex justify-between items-center">
                                                        <span className="text-[11px] font-bold text-slate-600">{cat.products} products</span>
                                                        <span className="text-xs font-bold text-emerald-600">{cat.sales} sales</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeInspectorTab === 'customers' && (
                                    <div className="space-y-4 animate-in fade-in duration-150">
                                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                                            <div className="text-left">
                                                <h4 className="text-base font-extrabold text-slate-900 font-display">Customers Database (CRM)</h4>
                                                <p className="text-xs text-slate-550 mt-0.5">Contact list and customer lifetime worth</p>
                                            </div>
                                            <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1 text-xs rounded-lg font-bold">Average Loyalty Level: Gold</span>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-[#0f172a] text-slate-100 font-bold border-b">
                                                    <tr>
                                                        <th className="px-4 py-3">Customer Profile</th>
                                                        <th className="px-4 py-3">Identity Details</th>
                                                        <th className="px-4 py-3 text-center">Group Level</th>
                                                        <th className="px-4 py-3 text-right">Lifetime Spent</th>
                                                        <th className="px-4 py-3 text-right">Loyalty Points</th>
                                                        <th className="px-4 py-3 text-right">Outstanding Dues</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                                                    {inspectedCustomers.map((c, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3.5 text-left">
                                                                <p className="font-bold text-slate-900">{c.name}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">{c.address}</p>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-left">
                                                                <p className="font-mono">{c.mobile}</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">{c.email}</p>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-center">
                                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                                    c.group === 'VIP Elite' ? 'bg-amber-100 text-amber-850 border border-amber-200' :
                                                                    c.group === 'Credit Client' ? 'bg-rose-100 text-rose-850 border border-rose-200' :
                                                                    'bg-sky-100 text-sky-800'
                                                                }`}>
                                                                    {c.group}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right font-mono font-bold text-slate-805">{currencySymbol} {c.spent.toLocaleString()}</td>
                                                            <td className="px-4 py-3.5 text-right font-bold text-indigo-700">{c.points} pts</td>
                                                            <td className={`px-4 py-3.5 text-right font-mono font-bold ${c.due > 0 ? 'text-red-500' : 'text-slate-400'}`}>
                                                                {c.due > 0 ? `${currencySymbol} ${c.due.toLocaleString()}` : 'No Dues'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeInspectorTab === 'suppliers' && (
                                    <div className="space-y-4 animate-in fade-in duration-150">
                                        <div className="text-left">
                                            <h4 className="text-base font-extrabold text-slate-900 font-display">Procurement & Suppliers</h4>
                                            <p className="text-xs text-slate-500">Corporate suppliers and wholesale merchants list</p>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-[#0f172a] text-slate-100 font-bold border-b">
                                                    <tr>
                                                        <th className="px-4 py-3">Vendor / Supplier Firm</th>
                                                        <th className="px-4 py-3">Key Contact Person</th>
                                                        <th className="px-4 py-3">Contact Number</th>
                                                        <th className="px-4 py-3 text-center">Items Supplied</th>
                                                        <th className="px-4 py-3 text-right">Outstanding Payables</th>
                                                        <th className="px-4 py-3 text-center">Status Badge</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-150 font-medium text-slate-750">
                                                    {inspectedSuppliers.map((s, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3.5 font-bold text-slate-900 text-left">{s.firm}</td>
                                                            <td className="px-4 py-3.5 font-semibold text-slate-600 text-left">{s.contact}</td>
                                                            <td className="px-4 py-3.5 font-mono text-slate-500 text-left">{s.ph}</td>
                                                            <td className="px-4 py-3.5 text-center font-bold text-slate-705">{s.count} variants</td>
                                                            <td className={`px-4 py-3.5 text-right font-mono font-bold ${s.due > 0 ? 'text-amber-500' : 'text-slate-400'}`}>
                                                                {s.due > 0 ? `${currencySymbol} ${s.due.toLocaleString()}` : `${currencySymbol} 0.00`}
                                                            </td>
                                                            <td className="px-4 py-3.5 text-center">
                                                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-md">Supplying</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeInspectorTab === 'sales' && (
                                    <div className="space-y-4 animate-in fade-in duration-150">
                                        <div className="text-left">
                                            <h4 className="text-base font-extrabold text-slate-900 font-display">Point of Sales (POS) Logs</h4>
                                            <p className="text-xs text-slate-500">Sales ledger node history</p>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-[#0f172a] text-slate-100 font-bold border-b">
                                                    <tr>
                                                        <th className="px-4 py-3">Receipt Invoice ID</th>
                                                        <th className="px-4 py-3">Date & Time UTC</th>
                                                        <th className="px-4 py-3 text-center">Product Count</th>
                                                        <th className="px-4 py-3 text-center">Terminal Cashier</th>
                                                        <th className="px-4 py-3 text-center">Billing Method</th>
                                                        <th className="px-4 py-3 text-right">Grand Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-150 font-medium text-slate-700">
                                                    {inspectedSales.map((x, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3.5 font-bold font-mono text-indigo-600 text-left">{x.txId}</td>
                                                            <td className="px-4 py-3.5 text-slate-500 font-mono text-left">{x.time}</td>
                                                            <td className="px-4 py-3.5 text-center font-bold text-slate-700">{x.items} items</td>
                                                            <td className="px-4 py-3.5 text-center font-bold text-slate-650">{x.cashier}</td>
                                                            <td className="px-4 py-3.5 text-center">
                                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">{x.type}</span>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right font-bold text-emerald-600 font-mono">{currencySymbol} {x.total.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeInspectorTab === 'purchases' && (
                                    <div className="space-y-4 animate-in fade-in duration-150">
                                        <div className="text-left">
                                            <h4 className="text-base font-extrabold text-slate-900 font-display">Purchase Orders (PO)</h4>
                                            <p className="text-xs text-slate-500">Acquisitions of raw inventory registers</p>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-[#0f172a] text-slate-100 font-bold border-b">
                                                    <tr>
                                                        <th className="px-4 py-3">PO Reference ID</th>
                                                        <th className="px-4 py-3">Supplier Firm</th>
                                                        <th className="px-4 py-3 text-center">Procurement Date</th>
                                                        <th className="px-4 py-3 text-center">Goods Quality Status</th>
                                                        <th className="px-4 py-3 text-right">Wholesale Bill Sum</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-150 font-medium text-slate-750">
                                                    {inspectedPurchases.map((p, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3.5 font-bold font-mono text-indigo-600 text-left">{p.po}</td>
                                                            <td className="px-4 py-3.5 text-slate-700 font-bold text-left">{p.firm}</td>
                                                            <td className="px-4 py-3.5 text-center text-slate-500 font-mono">{p.date}</td>
                                                            <td className="px-4 py-3.5 text-center">
                                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                                    p.status === 'Received' ? 'bg-emerald-100 text-emerald-805' : 'bg-amber-100 text-amber-805 animate-pulse'
                                                                }`}>{p.status}</span>
                                                            </td>
                                                            <td className="px-4 py-3.5 text-right font-black text-rose-500 font-mono">{currencySymbol} {p.total.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeInspectorTab === 'expenses' && (
                                    <div className="space-y-4 animate-in fade-in duration-150">
                                        <div className="text-left">
                                            <h4 className="text-base font-extrabold text-slate-900 font-display">Expenses Log</h4>
                                            <p className="text-xs text-slate-500">Operational costs, salary payouts, and utility cash flows</p>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-[#0f172a] text-slate-100 font-bold border-b">
                                                    <tr>
                                                        <th className="px-4 py-3">Expense Voucher</th>
                                                        <th className="px-4 py-3">Expense Category</th>
                                                        <th className="px-4 py-3">Approved By Author</th>
                                                        <th className="px-4 py-3 text-center">Date Logged</th>
                                                        <th className="px-4 py-3 text-center">Payment System</th>
                                                        <th className="px-4 py-3 text-right">Debit Amount</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-150 font-medium text-slate-800">
                                                    {inspectedExpenses.map((e, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-4 py-3.5 font-bold font-mono text-rose-500 text-left">{e.id}</td>
                                                            <td className="px-4 py-3.5 font-bold text-slate-700 text-left">{e.cat}</td>
                                                            <td className="px-4 py-3.5 font-semibold text-slate-600 text-left">{e.auth}</td>
                                                            <td className="px-4 py-3.5 text-center text-slate-500 font-mono">{e.date}</td>
                                                            <td className="px-4 py-3.5 text-center text-[10px] text-slate-500 font-mono">{e.pay}</td>
                                                            <td className="px-4 py-3.5 text-right font-black text-rose-600 font-mono">{currencySymbol} {e.amount.toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeInspectorTab === 'inventory' && (
                                    <div className="space-y-4 animate-in fade-in duration-150 font-medium">
                                        <div className="text-left font-sans">
                                            <h4 className="text-base font-extrabold text-slate-900 font-display">Inventory Status & Alerts</h4>
                                            <p className="text-xs text-slate-500">Automated warning monitors for replenishment safety loops</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-xl border border-amber-200 bg-amber-50/50 flex items-center gap-3">
                                            <AlertTriangle className="w-8 h-8 text-amber-500 shrink-0" />
                                            <div className="text-left">
                                                <h5 className="font-extrabold text-amber-800 text-xs text-left">Low Stock Alarm Active</h5>
                                                <p className="text-[11px] text-amber-700 font-medium">3 items have breached their safety storage threshold. Immediate restock order is recommended to prevent sales downtime.</p>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                                            <table className="w-full text-xs text-left">
                                                <thead className="bg-[#0f172a] text-slate-100 font-bold border-b">
                                                    <tr>
                                                        <th className="px-4 py-3">In-Stock Item</th>
                                                        <th className="px-4 py-3 text-center">Safety Floor Limit</th>
                                                        <th className="px-4 py-3 text-center text-amber-600">Current Qty</th>
                                                        <th className="px-4 py-3 text-center">Warehouse Shelf Location</th>
                                                        <th className="px-4 py-3 text-center">Last Replenish Date</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-150 font-medium text-slate-850">
                                                    {inspectedInventory.map((item, idx) => (
                                                        <tr key={idx} className="hover:bg-amber-50/10 transition-colors">
                                                            <td className="px-4 py-4 font-bold text-slate-900 text-left">{item.item}</td>
                                                            <td className="px-4 py-4 text-center font-bold text-slate-600">{item.floor} pcs</td>
                                                            <td className="px-4 py-4 text-center font-black text-rose-600 font-mono">{item.current} pcs</td>
                                                            <td className="px-4 py-4 text-center font-bold text-slate-500">{item.shelve}</td>
                                                            <td className="px-4 py-4 text-center text-slate-500 font-mono">{item.date}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {activeInspectorTab === 'employees' && (
                                    <div className="space-y-4 animate-in fade-in duration-150 font-medium">
                                        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
                                            <div className="text-left">
                                                <h4 className="text-base font-extrabold text-slate-900">Employees staff panel</h4>
                                                <p className="text-xs text-slate-550 mt-0.5">Live directory of users authorized to access the POS terminal</p>
                                            </div>
                                            <span className="bg-indigo-50 border border-indigo-100 font-bold text-indigo-700 px-3 py-1.5 rounded-lg text-xs">
                                                Limit Bound: {viewingShopData.employeeCount || 2} used / {viewingShopData.employeeLimit || 5} allowed
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {inspectedEmployees.map((emp, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-left">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-3 bg-slate-100 text-indigo-600 rounded-lg">
                                                            <Users className="w-5 h-5" />
                                                        </div>
                                                        <div>
                                                            <h5 className="font-bold text-slate-800 text-sm">{emp.name}</h5>
                                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase">{emp.role}</span>
                                                            <p className="text-xs text-slate-500 font-mono mt-1">{emp.phone}</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-[11px] font-mono font-bold block mb-1">Terminal PIN: <span className="font-extrabold text-indigo-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-250">{emp.pin}</span></span>
                                                        <span className="text-xs text-slate-500 block text-nowrap">Payout: <strong>{emp.salary}</strong></span>
                                                        <span className="px-2 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 rounded mt-1.5 inline-block">Clocked In</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeInspectorTab === 'reports' && (
                                    <div className="space-y-4 animate-in fade-in duration-150">
                                        <div className="text-left font-sans">
                                            <h4 className="text-base font-extrabold text-slate-900 font-display">Profitability Ledger Analytics</h4>
                                            <p className="text-xs text-slate-500">Automatic financial summarization report for {viewingShopData.businessName}</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-left">
                                                <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-tight">Total Sales Gross</p>
                                                <h5 className="font-extrabold text-lg text-emerald-600">{currencySymbol} {calculatedSalesGross.toLocaleString()}</h5>
                                                <span className="text-[10px] text-emerald-505 font-bold">↑ 14.5% compared to prev month</span>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-left">
                                                <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-tight">Purchase Costs</p>
                                                <h5 className="font-extrabold text-lg text-rose-500">{currencySymbol} {calculatedPurchaseVal.toLocaleString()}</h5>
                                                <span className="text-[10px] text-slate-500 font-mono">55% Cost of Goods Sold</span>
                                            </div>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs text-left">
                                                <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-tight">Net Estimated Profit</p>
                                                <h5 className="font-extrabold text-lg text-indigo-600">{currencySymbol} {calculatedProfitVal.toLocaleString()}</h5>
                                                <span className="text-[10px] text-indigo-505 font-bold">35% Net Margin Yield</span>
                                            </div>
                                        </div>
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                                            <h5 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-tight text-left">Asset Evaluation index</h5>
                                            <div className="space-y-3 font-medium text-xs">
                                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                                    <span className="text-slate-600 font-semibold">Total Stock Assets Value</span>
                                                    <span className="font-bold text-slate-800 font-mono">{currencySymbol} {inspectedTotalValuation.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                                    <span className="text-slate-600 font-semibold">Accounts Receivable Outstanding</span>
                                                    <span className="font-bold text-slate-800 font-mono">{currencySymbol} {inspectedCustomers.reduce((sum, c) => sum + (c.due || 0), 0).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center bg-slate-50 p-2 rounded">
                                                    <span className="text-slate-600 font-semibold">Accounts Payable outstanding</span>
                                                    <span className="font-bold text-rose-600 font-mono">{currencySymbol} {inspectedSuppliers.reduce((sum, s) => sum + (s.due || 0), 0).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeInspectorTab === 'settings' && (
                                    <div className="space-y-4 animate-in fade-in duration-150">
                                        <div className="text-left font-sans">
                                            <h4 className="text-base font-extrabold text-slate-900 font-display">Store Core configuration</h4>
                                            <p className="text-xs text-slate-500">Backend options, configuration structures, and metadata switches</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 text-xs font-medium text-left">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-405 mb-1">Tax / VAT Register Number (BIN)</label>
                                                    <p className="bg-slate-50 p-2 rounded-lg font-mono font-bold text-slate-800 border select-all">BIN-0094-884821</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-405 mb-1">Standard VAT Rate applied</label>
                                                    <p className="bg-slate-50 p-2 rounded-lg font-bold text-slate-800 border">5% Standard Retail VAT</p>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-405 mb-1">Default POS Currency</label>
                                                    <p className="bg-slate-50 p-2 rounded-lg font-bold text-slate-800 border">BDT (৳) Bangladesh Taka</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[11px] font-bold text-slate-405 mb-1">Billing Receipt Header Notes</label>
                                                    <p className="bg-slate-50 p-2 rounded-lg font-bold text-slate-800 border">"ধন্যবাদ, আবার আসবেন!"</p>
                                                </div>
                                            </div>
                                            <div className="pt-4 border-t border-slate-100">
                                                <label className="block text-[11px] font-bold text-slate-405 mb-2">Systems features configured</label>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {(viewingShopData.enabledFeatures || viewingShopData.features || ['Single Store', 'Basic Reports']).map((feat: string, idx: number) => (
                                                        <span key={idx} className="px-2.5 py-1 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-full text-[10px] font-black">
                                                            ✓ {feat}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {uploadMode && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Upload className="w-5 h-5 text-indigo-600" /> 
                                {uploadMode === 'product' ? 'Bulk Product Upload' : 'Due Management CSV'}
                            </h3>
                            <button onClick={() => setUploadMode(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <p className="text-sm text-slate-500 mb-4">
                                Uploading for: <span className="font-bold text-slate-800">{uploadUser}</span>
                            </p>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 bg-slate-50 mb-4 relative">
                                <input type="file" accept=".csv" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                <p className="text-xs text-slate-500">Click to upload CSV</p>
                            </div>
                            <button className="text-xs text-indigo-600 hover:underline">Download Sample CSV</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction View Modal */}
            {showTxModal && viewingTxUser && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Transactions: {viewingTxUser.businessName}</h3>
                            <button onClick={() => setShowTxModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold sticky top-0">
                                    <tr>
                                        <th className="px-4 py-2">Date</th>
                                        <th className="px-4 py-2">Type</th>
                                        <th className="px-4 py-2">Amount</th>
                                        <th className="px-4 py-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {((transactions || []).filter((t: any) => t.userId === viewingTxUser.id || t.storeId === viewingTxUser.id)).length > 0 ? (
                                        (transactions || [])
                                            .filter((t: any) => t.userId === viewingTxUser.id || t.storeId === viewingTxUser.id)
                                            .map((tx: any) => (
                                                <tr key={tx.id}>
                                                    <td className="px-4 py-3">{tx.date?.split('T')[0] || tx.date}</td>
                                                    <td className="px-4 py-3">{tx.type}</td>
                                                    <td className="px-4 py-3 font-bold">{currencySymbol} {tx.amount}</td>
                                                    <td className="px-4 py-3 text-emerald-600">{tx.status || 'Completed'}</td>
                                                </tr>
                                            ))
                                    ) : (
                                        <tr>
                                            <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                                No transactions recorded for this business.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Admin Modal */}
            {showAdminModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Add New Admin</h3>
                            <button onClick={() => setShowAdminModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                        </div>
                        <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
                            <input 
                                placeholder="Full Name" 
                                className="w-full border p-2 rounded" 
                                value={newAdmin.name} 
                                onChange={e => setNewAdmin({...newAdmin, name: e.target.value})} 
                                required 
                            />
                            <input 
                                placeholder="Email Address" 
                                type="email" 
                                className="w-full border p-2 rounded" 
                                value={newAdmin.email} 
                                onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} 
                                required 
                            />
                            <input 
                                placeholder="Password" 
                                type="password" 
                                className="w-full border p-2 rounded" 
                                value={(newAdmin as any).password || ''} 
                                onChange={e => setNewAdmin({...newAdmin, password: e.target.value} as any)} 
                                required 
                            />
                            <select 
                                className="w-full border p-2 rounded bg-white"
                                value={newAdmin.role}
                                onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}
                            >
                                <option value="Admin">Admin</option>
                                <option value="SuperAdmin">Super Admin</option>
                            </select>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase">Permissions</label>
                                <div className="border rounded-lg overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => toggleAdminAllPermissions(null)}
                                        className={`w-full p-3 text-left flex items-center justify-between border-b ${newAdmin.permissions?.includes('all') ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Shield className="w-4 h-4" />
                                            <span className="font-bold">All Permissions (Super Admin)</span>
                                        </div>
                                        {newAdmin.permissions?.includes('all') && <Check className="w-4 h-4" />}
                                    </button>
                                    {!newAdmin.permissions?.includes('all') && (
                                        <div className="max-h-60 overflow-y-auto">
                                            {Object.entries(PERMISSIONS)
                                                .filter(([key]) => key === 'SAAS')
                                                .map(([key, module]) => {
                                                const isExpanded = expandedModules.includes(key);
                                                const isFullySelected = isModuleFullySelected(newAdmin.permissions || [], key);
                                                const isPartiallySelected = isModulePartiallySelected(newAdmin.permissions || [], key);

                                                return (
                                                    <div key={key} className="border-b last:border-0">
                                                        <div className="flex items-center bg-slate-50/50">
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleAdminModulePermissions(null, key)}
                                                                className="flex-1 p-3 flex items-center gap-3 text-left"
                                                            >
                                                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isFullySelected ? 'bg-indigo-600 border-indigo-600 text-white' : isPartiallySelected ? 'bg-indigo-100 border-indigo-600 text-indigo-600' : 'bg-white border-slate-300'}`}>
                                                                    {isFullySelected && <Check className="w-3 h-3" />}
                                                                    {isPartiallySelected && <div className="w-2 h-0.5 bg-indigo-600 rounded-full" />}
                                                                </div>
                                                                <span className="text-sm font-bold text-slate-700">{module.label}</span>
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleModuleExpand(key)}
                                                                className="p-3 text-slate-400 hover:text-slate-600"
                                                            >
                                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                            </button>
                                                        </div>
                                                        {isExpanded && (
                                                            <div className="bg-white p-2 grid grid-cols-1 gap-1">
                                                                {Object.values(module.subFeatures).map((sf: any) => (
                                                                    <button
                                                                        key={sf.key}
                                                                        type="button"
                                                                        onClick={() => toggleAdminPermission(null, sf.key)}
                                                                        className={`flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${newAdmin.permissions?.includes(sf.key) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                                                    >
                                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${newAdmin.permissions?.includes(sf.key) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                                                                            {newAdmin.permissions?.includes(sf.key) && <Check className="w-2.5 h-2.5" />}
                                                                        </div>
                                                                        <span className="text-xs font-medium">{sf.label}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button className="w-full bg-slate-900 text-white py-2 rounded font-bold">Add User</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Edit Admin Permissions Modal */}
            {editingAdminPermissions && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Edit Permissions: {editingAdminPermissions.name}</h3>
                            <button onClick={() => setEditingAdminPermissions(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="border rounded-lg overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => toggleAdminAllPermissions(editingAdminPermissions.id)}
                                    className={`w-full p-3 text-left flex items-center justify-between border-b ${editingAdminPermissions.permissions?.includes('all') ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-700'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        <span className="font-bold">All Permissions (Super Admin)</span>
                                    </div>
                                    {editingAdminPermissions.permissions?.includes('all') && <Check className="w-4 h-4" />}
                                </button>
                                {!editingAdminPermissions.permissions?.includes('all') && (
                                    <div className="max-h-96 overflow-y-auto">
                                        {Object.entries(PERMISSIONS)
                                            .filter(([key]) => key === 'SAAS')
                                            .map(([key, module]) => {
                                            const isExpanded = expandedModules.includes(key);
                                            const isFullySelected = isModuleFullySelected(editingAdminPermissions.permissions || [], key);
                                            const isPartiallySelected = isModulePartiallySelected(editingAdminPermissions.permissions || [], key);

                                            return (
                                                <div key={key} className="border-b last:border-0">
                                                    <div className="flex items-center bg-slate-50/50">
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleAdminModulePermissions(editingAdminPermissions.id, key)}
                                                            className="flex-1 p-3 flex items-center gap-3 text-left"
                                                        >
                                                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${isFullySelected ? 'bg-indigo-600 border-indigo-600 text-white' : isPartiallySelected ? 'bg-indigo-100 border-indigo-600 text-indigo-600' : 'bg-white border-slate-300'}`}>
                                                                {isFullySelected && <Check className="w-3 h-3" />}
                                                                {isPartiallySelected && <div className="w-2 h-0.5 bg-indigo-600 rounded-full" />}
                                                            </div>
                                                            <span className="text-sm font-bold text-slate-700">{module.label}</span>
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleModuleExpand(key)}
                                                            className="p-3 text-slate-400 hover:text-slate-600"
                                                        >
                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                    {isExpanded && (
                                                        <div className="bg-white p-2 grid grid-cols-1 gap-1">
                                                            {Object.values(module.subFeatures).map((sf: any) => (
                                                                <button
                                                                    key={sf.key}
                                                                    type="button"
                                                                    onClick={() => toggleAdminPermission(editingAdminPermissions.id, sf.key)}
                                                                    className={`flex items-center gap-3 p-2 rounded-lg text-left transition-colors ${editingAdminPermissions.permissions?.includes(sf.key) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}
                                                                >
                                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center ${editingAdminPermissions.permissions?.includes(sf.key) ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'}`}>
                                                                        {editingAdminPermissions.permissions?.includes(sf.key) && <Check className="w-2.5 h-2.5" />}
                                                                    </div>
                                                                    <span className="text-xs font-medium">{sf.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                            <button 
                                onClick={handleSaveAdminPermissions}
                                className="w-full bg-indigo-600 text-white py-2 rounded font-bold"
                            >
                                Save Permissions
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {changingPasswordAdmin && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">Change Password</h3>
                            <button onClick={() => setChangingPasswordAdmin(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-500">Changing password for <span className="font-bold">{changingPasswordAdmin.name}</span></p>
                            <input 
                                type="text"
                                className="w-full border p-2 rounded" 
                                value={newAdminPassword} 
                                onChange={e => setNewAdminPassword(e.target.value)} 
                                placeholder="New Password"
                            />
                            <button 
                                onClick={() => handlePasswordChange(changingPasswordAdmin.id, newAdminPassword)}
                                className="w-full bg-indigo-600 text-white py-2 rounded font-bold"
                            >
                                Update Password
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showPlanModal && editingPlan && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">{editingPlan.id ? 'Edit Plan' : 'Add New Plan'}</h3>
                            <button onClick={() => setShowPlanModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Plan Name</label>
                                <input type="text" className="w-full border p-2 rounded" value={editingPlan.name || ''} onChange={e => setEditingPlan({...editingPlan, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price ($)</label>
                                <input type="number" className="w-full border p-2 rounded" value={editingPlan.price || 0} onChange={e => setEditingPlan({...editingPlan, price: Number(e.target.value)})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Features</label>
                                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border p-2 rounded">
                                    {AVAILABLE_FEATURES.map(feat => (
                                        <label key={feat} className="flex items-center gap-2 text-sm text-slate-700">
                                            <input 
                                                type="checkbox" 
                                                checked={(typeof editingPlan.features === 'string' ? editingPlan.features : (editingPlan.features || []).join(',')).split(',').map((f: string) => f.trim()).includes(feat)}
                                                onChange={e => {
                                                    const currentFeatures = (typeof editingPlan.features === 'string' ? editingPlan.features : (editingPlan.features || []).join(',')).split(',').map((f: string) => f.trim()).filter(Boolean);
                                                    let newFeatures;
                                                    if (e.target.checked) {
                                                        newFeatures = [...currentFeatures, feat];
                                                    } else {
                                                        newFeatures = currentFeatures.filter(f => f !== feat);
                                                    }
                                                    setEditingPlan({...editingPlan, features: newFeatures.join(', ')});
                                                }}
                                            />
                                            {feat}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button 
                                onClick={async () => {
                                    if (editingPlan.id) {
                                        const next = plans.map(p => p.id === editingPlan.id ? editingPlan : p);
                                        await persistPlans(next);
                                        showToast("Plan updated successfully");
                                    } else {
                                        const next = [...plans, { ...editingPlan, id: Date.now().toString() }];
                                        await persistPlans(next);
                                        showToast("Plan added successfully");
                                    }
                                    setShowPlanModal(false);
                                }}
                                className="w-full bg-indigo-600 text-white py-2 rounded font-bold"
                            >
                                {editingPlan.id ? 'Update Plan' : 'Add Plan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </div>
    );
};

export default AdminPanel;
