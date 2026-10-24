import React from 'react';
import { useSearchParams } from 'react-router-dom';
import {
    LayoutDashboard, TrendingUp, Sparkles, FileText, Store, Search, Briefcase, Users,
    Crown, ClipboardList, Smartphone, Award, CreditCard, DollarSign, HeadphonesIcon,
    Megaphone, Shield, ShieldCheck, Database, Key, Server, Activity, Bot, UserCircle,
    Settings, LogOut, Menu, X
} from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { PERMISSIONS, hasPermission } from '../utils/permissions';

// The standalone admin app has no router-level nav (it only ever mounts
// AdminPanel at /admin, switching sections via the ?tab= query param), so
// this sidebar is the only navigation surface for the whole app.

const SAAS_SECTIONS = [
    {
        title: 'Analytics & Insights',
        items: [
            { tab: 'dashboard', icon: LayoutDashboard, label: 'Overview', permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
            { tab: 'finance-analytics', icon: TrendingUp, label: 'Finance Analytics', permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
            { tab: 'analytics-center', icon: Sparkles, label: 'Analytics Center', permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
            { tab: 'reports-center', icon: FileText, label: 'Reports Center', permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
        ]
    },
    {
        title: 'Core Registries',
        items: [
            { tab: 'businesses', icon: Store, label: 'Business Management', permission: PERMISSIONS.SAAS.subFeatures.MANAGE_BUSINESSES.key },
            { tab: 'customer-search', icon: Search, label: 'Customer Search', permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
            { tab: 'employees', icon: Briefcase, label: 'Employees', permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
            { tab: 'suppliers', icon: Users, label: 'Suppliers', permission: PERMISSIONS.SAAS.subFeatures.DASHBOARD.key },
        ]
    },
    {
        title: 'Portal & Subscriptions',
        items: [
            { tab: 'subscriptions', icon: Crown, label: 'Subscription Management', permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
            { tab: 'requests', icon: ClipboardList, label: 'Requests', permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
            { tab: 'customer-portal', icon: Smartphone, label: 'Customer Portal', permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
            { tab: 'supplier-portal', icon: Smartphone, label: 'Supplier Portal', permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
            { tab: 'enterprise-features', icon: Award, label: 'Enterprise Features', permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
        ]
    },
    {
        title: 'Revenue & Finance',
        items: [
            { tab: 'payment-gateway', icon: CreditCard, label: 'Payment Gateway', permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
            { tab: 'revenue-center', icon: DollarSign, label: 'Revenue Center', permission: PERMISSIONS.SAAS.subFeatures.SUBSCRIPTIONS.key },
        ]
    },
    {
        title: 'Communication & CMS',
        items: [
            { tab: 'support', icon: HeadphonesIcon, label: 'Support Center', permission: PERMISSIONS.SAAS.subFeatures.SUPPORT.key },
            { tab: 'notifications', icon: Megaphone, label: 'Notification Center', permission: PERMISSIONS.SAAS.subFeatures.MANAGE_BUSINESSES.key },
            { tab: 'website-cms', icon: FileText, label: 'Website CMS', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
            { tab: 'marketing-center', icon: Megaphone, label: 'Marketing Center', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
        ]
    },
    {
        title: 'System & Settings',
        items: [
            { tab: 'users', icon: Users, label: 'Admins', permission: PERMISSIONS.SAAS.subFeatures.MANAGE_USERS.key },
            { tab: 'feature-manager', icon: Shield, label: 'Feature Manager', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
            { tab: 'security', icon: ShieldCheck, label: 'Security Center', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
            { tab: 'database-manager', icon: Database, label: 'Database Manager', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
            { tab: 'api-manager', icon: Key, label: 'API Manager', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
            { tab: 'global-search', icon: Search, label: 'Global Search', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
            { tab: 'system-settings', icon: Server, label: 'System Settings', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
            { tab: 'audit', icon: FileText, label: 'Audit Log', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
            { tab: 'monitoring-center', icon: Activity, label: 'Monitoring Center', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
            { tab: 'developer-center', icon: Bot, label: 'Developer Center', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
            { tab: 'owner-profile', icon: UserCircle, label: 'SaaS Profile', permission: PERMISSIONS.SAAS.subFeatures.SETTINGS.key },
        ]
    }
];

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { t } = useSettings();
    const { user, logout } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();
    const [mobileOpen, setMobileOpen] = React.useState(false);
    const activeTab = searchParams.get('tab') || 'dashboard';

    const goTo = (tab: string) => {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('tab', tab);
        setSearchParams(newParams);
        setMobileOpen(false);
    };

    const sections = SAAS_SECTIONS.map(sec => ({
        ...sec,
        items: sec.items.filter(item => hasPermission(user?.permissions, item.permission))
    })).filter(sec => sec.items.length > 0);

    const SidebarContent = () => (
        <>
            {sections.map(section => (
                <div key={section.title} className="mb-2">
                    <div className="px-5 mt-6 mb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest select-none">
                        {section.title}
                    </div>
                    {section.items.map(item => (
                        <button
                            key={item.tab}
                            onClick={() => goTo(item.tab)}
                            className={`w-full flex items-center gap-3 px-3 py-2 mx-2 rounded-lg transition-colors duration-150 text-left ${
                                activeTab === item.tab
                                    ? 'bg-indigo-600 text-white font-semibold'
                                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/40'
                            }`}
                            style={{ width: 'calc(100% - 1rem)' }}
                        >
                            <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                            <span className="font-medium text-sm tracking-wide truncate">{item.label}</span>
                        </button>
                    ))}
                </div>
            ))}
        </>
    );

    return (
        <div className="flex h-[100dvh] w-full bg-slate-50 overflow-hidden font-sans">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 bg-[#0f172a] text-white border-r border-slate-800 z-30">
                <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/50">
                    <div className="flex items-center gap-3">
                        <img src="/assets/bizora-emblem.png" alt="Bizora" className="w-8 h-8 object-contain drop-shadow" />
                        <h1 className="text-lg font-bold tracking-tight text-slate-100">Bizora Admin</h1>
                    </div>
                </div>
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 pb-20">
                    <SidebarContent />
                </nav>
                <div className="p-3 border-t border-slate-800 bg-[#0f172a]">
                    <div className="flex items-center gap-3 px-2">
                        <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0 border border-slate-600">
                            <UserCircle className="w-5 h-5 text-slate-300" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Admin'}</p>
                            <p className="text-[10px] text-slate-400 truncate">{user?.role || 'SaaS Admin'}</p>
                        </div>
                        <button onClick={logout} className="text-slate-400 hover:text-red-400 transition-colors p-1" title="Logout">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Drawer */}
            {mobileOpen && (
                <div className="fixed inset-0 z-[70] lg:hidden">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setMobileOpen(false)} />
                    <div className="absolute left-0 top-0 bottom-0 w-72 bg-[#0f172a] text-white flex flex-col shadow-2xl">
                        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/50">
                            <h1 className="text-lg font-bold tracking-tight text-slate-100">Bizora Admin</h1>
                            <button onClick={() => setMobileOpen(false)} className="p-2 text-slate-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <nav className="flex-1 overflow-y-auto py-4 pb-20">
                            <SidebarContent />
                        </nav>
                        <div className="p-3 border-t border-slate-800">
                            <button onClick={logout} className="w-full flex items-center justify-center gap-2 py-2.5 text-red-400 bg-red-950/30 rounded-lg font-bold text-sm">
                                <LogOut className="w-4 h-4" /> Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 relative">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-[60]">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 hover:bg-slate-100 rounded-lg text-slate-500">
                            <Menu className="w-5 h-5" />
                        </button>
                        <div className="lg:hidden w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shrink-0">B</div>
                        <span className="font-extrabold text-slate-800 text-lg tracking-tight capitalize">
                            {activeTab.replace(/-/g, ' ')}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Settings className="w-5 h-5 text-slate-400" />
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto p-4 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;