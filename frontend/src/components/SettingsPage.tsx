import { appVersionLabel } from '@shared/lib/appVersion';
import { assertNotImpersonated } from '@shared/lib/impersonationGuard';
import { runPriorityBackup, readLocalBackup, detectBackupConflict, extractMetaFromPayload, getOrCreateDeviceId, isPendingCloudSync, flushPendingCloudBackup, verifyBackupIntegrity } from '@shared/lib/backupSync';
import { readAutoBackupConfig, writeAutoBackupConfig } from '@shared/lib/autoBackupConfig';
import { isEncryptedBlob, decryptBackupPayload } from '@shared/lib/backupCrypto';

import WebhooksSettings from './WebhooksSettings';
import { useSound } from '../contexts/SoundContext';
import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useSettings, InvoiceConfig, CURRENCY_SYMBOLS, ThemeMode } from '../contexts/SettingsContext';
import { useAuth, Business, BusinessSettings as BusinessSettingsType } from '../contexts/AuthContext';
import { useStores } from '../contexts/StoreContext';
import { AppLanguage, Currency } from '../types';
import { 
    User, FileText, Package, Save, Lock, CheckCircle, Crown, Shield, Smartphone, Mail, Hash, 
    ToggleLeft, ToggleRight, X, Loader2, Briefcase, Palette, Moon, Sun, Monitor, 
    Layout, Image as ImageIcon, PenTool, Eye, Globe, History, Laptop, LogOut, 
    Trash2, Bell, Plus, MapPin, Clock, Phone, Globe as WebsiteIcon, Settings, 
    MessageSquare, Mail as MailIcon, ChevronRight, Building2, Store, Map as MapIcon,
    DollarSign, Percent, Database, Download, Upload, AlertTriangle, RotateCcw, Volume2, VolumeX, Play
} from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import { apiFetch, authFetch } from '../lib/apiClient';
import { LedgerEntry, useData } from '../contexts/DataContext';
import { AuditLog } from './AuditLog';
import EmployeeManagement from './EmployeeManagement';
import Subscription from './Subscription';
import { UserRole } from '../types';


// Visual Component for Mini Invoice Designs
const MiniInvoice = ({ id }: { id: any }) => {
    const rawNum = typeof id === 'number' ? id : parseInt(String(id).replace(/\D/g, ''), 10) || 1;
    const numId = ((rawNum - 1) % 5) + 1;
    return (
        <div className={`w-full h-full bg-white flex flex-col shadow-sm border border-slate-100 overflow-hidden text-[4px] leading-tight select-none`}>
            
            {/* Template 1: Classic Simple */}
            {numId === 1 && (
                <div className="p-2 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-2 border-b border-slate-100 pb-1">
                        <div className="space-y-0.5">
                            <div className="w-4 h-4 bg-slate-800 rounded mb-0.5"></div>
                            <div className="w-8 h-1 bg-slate-300 rounded-sm"></div>
                        </div>
                        <div className="text-right">
                            <div className="w-10 h-2 bg-slate-200 rounded-sm mb-0.5 ml-auto"></div>
                            <div className="w-6 h-0.5 bg-slate-200 rounded-sm ml-auto"></div>
                        </div>
                    </div>
                    <div className="space-y-1 mt-1">
                        <div className="w-full h-2 bg-slate-50"></div>
                        <div className="w-full h-2 bg-white"></div>
                        <div className="w-full h-2 bg-slate-50"></div>
                    </div>
                </div>
            )}

            {/* Template 2: Modern Indigo */}
            {numId === 2 && (
                <div className="flex flex-col h-full">
                    <div className="bg-indigo-600 h-8 w-full relative mb-2">
                        <div className="absolute bottom-1 left-2 w-6 h-1 bg-white/50 rounded-sm"></div>
                        <div className="absolute top-1 right-2 w-8 h-2 bg-white/20 rounded-sm"></div>
                    </div>
                    <div className="px-2">
                        <div className="flex justify-between mb-2">
                            <div className="w-6 h-2 bg-slate-200 rounded-sm"></div>
                            <div className="w-6 h-2 bg-slate-200 rounded-sm"></div>
                        </div>
                        <div className="w-full h-1.5 bg-indigo-50 rounded-sm mb-0.5"></div>
                        <div className="w-full h-1.5 bg-white rounded-sm mb-0.5"></div>
                        <div className="w-full h-1.5 bg-indigo-50/50 rounded-sm mb-0.5"></div>
                        
                        <div className="mt-2 ml-auto w-8 h-4 bg-indigo-50 rounded-sm flex items-center justify-center">
                            <div className="w-6 h-1 bg-indigo-200 rounded-sm"></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Template 3: Dark Professional */}
            {numId === 3 && (
                <div className="flex flex-col h-full">
                    <div className="bg-slate-900 h-6 w-full p-1 flex justify-between items-center mb-2">
                         <div className="w-2 h-2 bg-white rounded-sm"></div>
                         <div className="w-6 h-1 bg-slate-700 rounded-sm"></div>
                    </div>
                    <div className="px-2">
                        <div className="flex gap-2 mb-2">
                            <div className="w-1/2 h-4 bg-slate-50 rounded-sm"></div>
                            <div className="w-1/2 h-4 bg-slate-50 rounded-sm"></div>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-sm mb-0.5"></div>
                        <div className="w-full h-1 bg-slate-100 mb-0.5"></div>
                        <div className="w-full h-1 bg-slate-100 mb-0.5"></div>
                    </div>
                </div>
            )}

            {/* Template 4: Creative Orange */}
            {numId === 4 && (
                <div className="flex h-full">
                    <div className="w-1/3 bg-orange-500 h-full p-1 flex flex-col justify-between">
                        <div className="w-4 h-4 border border-white/50 rounded-full"></div>
                        <div className="space-y-0.5">
                             <div className="w-6 h-0.5 bg-white/50"></div>
                             <div className="w-4 h-0.5 bg-white/50"></div>
                        </div>
                    </div>
                    <div className="flex-1 p-2 flex flex-col">
                        <div className="w-12 h-2 bg-slate-800 rounded-sm mb-2"></div>
                        <div className="w-full h-1 bg-orange-100 mb-1"></div>
                        <div className="w-full h-1 bg-white mb-1"></div>
                        <div className="w-full h-1 bg-orange-50 mb-1"></div>
                        <div className="mt-auto w-full h-6 bg-orange-50 rounded-sm border border-orange-100"></div>
                    </div>
                </div>
            )}

            {/* Template 5: Formal Serif */}
            {numId === 5 && (
                <div className="p-2 flex flex-col h-full bg-[#fdfbf7]">
                    <div className="border-b border-double border-slate-300 pb-1 mb-2 text-center">
                        <div className="w-12 h-1.5 bg-slate-900 mx-auto mb-0.5 font-serif"></div>
                        <div className="w-8 h-0.5 bg-slate-400 mx-auto"></div>
                    </div>
                    <div className="flex justify-between mb-2">
                        <div className="w-8 h-2 bg-slate-100"></div>
                        <div className="w-8 h-2 bg-slate-100 text-right"></div>
                    </div>
                    <div className="w-full border border-slate-200 h-10 mb-1 flex flex-col">
                        <div className="w-full h-2 bg-slate-100 border-b border-slate-200"></div>
                        <div className="w-full h-2 border-b border-slate-100"></div>
                    </div>
                </div>
            )}
        </div>
    );
};

const TEMPLATES = [
    { id: 'tpl-01', numericId: 1, name: 'Classic Simple', price: 0, availability: 'all', layout: 'classic' },
    { id: 'tpl-02', numericId: 2, name: 'Modern Indigo', price: 10, availability: 'paid', layout: 'modern' },
    { id: 'tpl-03', numericId: 3, name: 'Dark Professional', price: 15, availability: 'paid', layout: 'dark' },
    { id: 'tpl-04', numericId: 4, name: 'Creative Orange', price: 12, availability: 'plan_restricted', requiredPlan: 'pro', layout: 'creative' },
    { id: 'tpl-05', numericId: 5, name: 'Formal Serif', price: 20, availability: 'plan_restricted', requiredPlan: 'enterprise', layout: 'formal' },
    { id: 'tpl-06', numericId: 6, name: 'Minimal Mono', price: 0, availability: 'all', layout: 'minimal' },
];

const PRESET_COLORS = [
    { name: 'Nexus Indigo', value: '#4f46e5' },
    { name: 'Ocean Blue', value: '#0ea5e9' },
    { name: 'Royal Rose', value: '#e11d48' },
    { name: 'Forest Green', value: '#059669' },
    { name: 'Golden Amber', value: '#d97706' },
    { name: 'Deep Purple', value: '#7c3aed' },
];

const SettingsPage: React.FC = () => {
    const { 
        t, formatMoney, 
        invoiceTemplateId, setInvoiceTemplateId, 
        invoiceConfig, setInvoiceConfig,
        decimalPlaces, setDecimalPlaces, 
        currency, setCurrency, 
        language, setLanguage,
        themeMode, setThemeMode,
        brandColor, setBrandColor,
        autoLogoutTimer, setAutoLogoutTimer,
        applyExchangeRates, setApplyExchangeRates,
        baseCurrency, setBaseCurrency,
        exchangeRates, setExchangeRate,
        convertAmount, formatMoneyIn,
        fxMeta, refreshExchangeRates,
    } = useSettings();
    const { 
        user, updateUser, unlockTemplate, initiate2faSetup, verifyAndEnable2fa, disable2fa, 
        sessions, loginHistory, devices, terminateSession, removeDevice, activityLogs, 
        switchBusiness, updateBusinessSettings, addBusiness, hasFeature,
        saasRequests, createSaaSRequest, logActivity
    } = useAuth();
    const { stores, addStore, updateStore, deleteStore } = useStores();
    const { getAllData, importData, resetData } = useData();
    const { soundEnabled, soundVolume, toggleSound, setSoundVolume, previewSound } = useSound();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const tabParam = searchParams.get('tab') as any;
    const isAuditRoute = location.pathname === '/audit' || location.pathname === '/audit-log';
    const validTabs = ['profile', 'appearance', 'business', 'templates', 'security', 'audit', 'data', 'users', 'subscription', 'webhooks'];
    const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'business' | 'templates' | 'security' | 'audit' | 'data' | 'users' | 'subscription' | 'webhooks'>(
      isAuditRoute ? 'audit' : (validTabs.includes(tabParam) ? tabParam : 'profile')
    );

    useEffect(() => {
      if (isAuditRoute) {
        setActiveTab('audit');
      } else if (validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }, [tabParam, isAuditRoute]);
    const [businessSubTab, setBusinessSubTab] = useState<'general' | 'stores' | 'tax' | 'hours' | 'notifications'>('general');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isResetting, setIsResetting] = useState(false);
    const [resetError, setResetError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Automatic + cloud backup
    const [autoBackupEnabled, setAutoBackupEnabled] = useState(true);
    const [autoBackupHours, setAutoBackupHours] = useState(0.25);
    const [autoBackupKeep, setAutoBackupKeep] = useState(15);
    

    const [lastAutoBackup, setLastAutoBackup] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.id) return;
        const c = readAutoBackupConfig(user.id);
        setAutoBackupEnabled(c.enabled);
        setAutoBackupHours(c.intervalHours);
        setAutoBackupKeep(c.keepLast);
        if (c.lastRun) setLastAutoBackup(c.lastRun);
    }, [user?.id]);
    const [cloudBackups, setCloudBackups] = useState<any[]>([]);
    const [backupBusy, setBackupBusy] = useState(false);
    const [backupMsg, setBackupMsg] = useState('');
    const [backupPassphrase, setBackupPassphrase] = useState('');
    const [backupEncryptEnabled, setBackupEncryptEnabled] = useState(() => {
        try { return localStorage.getItem('bizora_backup_encrypt') === '1'; } catch { return false; }
    });


    // Cloud Config & Cache State
    const [configData, setConfigData] = useState<any>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    useEffect(() => {
        if (!user?.id) return;
        try {
            const raw = localStorage.getItem(`bizora_auto_backup_${user.id}`);
            if (raw) {
                const cfg = JSON.parse(raw);
                setAutoBackupEnabled(!!cfg.enabled);
                setAutoBackupHours(cfg.intervalHours || 24);
                setAutoBackupKeep(cfg.keepLast || 7);
                setLastAutoBackup(cfg.lastRun || null);
            }
        } catch { /* ignore */ }
    }, [user?.id]);

    const persistAutoBackupCfg = (patch: Record<string, any>) => {
        if (!user?.id) return;
        const next = {
            enabled: autoBackupEnabled,
            intervalHours: autoBackupHours,
            keepLast: autoBackupKeep,
            lastRun: lastAutoBackup,
            ...patch,
        };
        localStorage.setItem(`bizora_auto_backup_${user.id}`, JSON.stringify(next));
        if (patch.enabled !== undefined) setAutoBackupEnabled(patch.enabled);
        if (patch.intervalHours !== undefined) setAutoBackupHours(patch.intervalHours);
        if (patch.keepLast !== undefined) setAutoBackupKeep(patch.keepLast);
        if (patch.lastRun !== undefined) setLastAutoBackup(patch.lastRun);
    };

    const refreshCloudBackups = async () => {
        try {
            const res = await authFetch('/api/backups');
            if (res.ok) {
                const body = await res.json();
                setCloudBackups(body.backups || []);
            }
        } catch (e) {
            console.warn('Could not list cloud backups', e);
        }
    };

    const pushCloudBackup = async (source: string = 'manual') => {
        if (!user?.id) return false;
        setBackupBusy(true);
        setBackupMsg('');
        try {
            const result = await runPriorityBackup({
                businessId: user.id,
                source,
                keepLocalHistory: autoBackupKeep,
                getData: () => getAllData(),
                isOnline: () => typeof navigator !== 'undefined' && navigator.onLine,
                passphrase: backupEncryptEnabled && backupPassphrase ? backupPassphrase : undefined,
                cloudPost: async (payload) => {
                    const res = await authFetch('/api/backups', {
                        method: 'POST',
                        body: JSON.stringify({
                            payload,
                            source,
                            keep: autoBackupKeep,
                            label: source === 'auto' ? `Auto ${new Date().toLocaleString()}` : `Manual ${new Date().toLocaleString()}`,
                            deviceId: payload.meta?.deviceId,
                            revision: payload.meta?.revision,
                            contentHash: payload.meta?.contentHash,
                            meta: payload.meta,
                        }),
                    });
                    const body = await res.json().catch(() => ({}));
                    if (!res.ok) return { ok: false, error: body.error || res.statusText };
                    return { ok: true };
                },
            });
            const now = new Date().toISOString();
            persistAutoBackupCfg({ lastRun: now });
            if (user?.id) writeAutoBackupConfig(user.id, { lastRun: now, enabled: autoBackupEnabled, intervalHours: autoBackupHours, keepLast: autoBackupKeep });
            setBackupMsg(result.messageBn || result.message);
            if (result.mode === 'cloud') await refreshCloudBackups();
            logActivity(result.mode === 'cloud' ? 'Cloud Backup' : 'Local Backup', 'Data', source);
            return result.ok;
        } catch (e: any) {
            setBackupMsg(e?.message || 'Backup failed');
            return false;
        } finally {
            setBackupBusy(false);
        }
    };

    // Interval auto-backup while app is open
    useEffect(() => {
        if (!autoBackupEnabled || !user?.id) return;
        const tick = () => {
            const last = lastAutoBackup ? new Date(lastAutoBackup).getTime() : 0;
            const due = Date.now() - last > autoBackupHours * 3600 * 1000;
            if (due) pushCloudBackup('auto');
        };
        tick();
        const id = window.setInterval(tick, Math.min(Math.max(autoBackupHours, 1), 24) * 3600 * 1000);
        return () => clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoBackupEnabled, autoBackupHours, user?.id, lastAutoBackup]);

    useEffect(() => {
        if (activeTab === 'data') refreshCloudBackups();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);


    const fetchConfig = async () => {
        try {
            const res = await apiFetch('/api/business/config');
            if (res.ok) {
                const data = await res.json();
                setConfigData(data);
            }
        } catch (err) {
            console.error("Failed to load business configuration:", err);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleRefreshData = async () => {
        setIsRefreshing(true);
        try {
            // 1. Purge Browser Caches
            if ('caches' in window) {
                const keys = await caches.keys();
                for (const key of keys) {
                    await caches.delete(key);
                }
                console.log("Caches purged successfully!");
            }
            
            // 2. Fetch fresh configuration data from server with timestamp to bypass intermediate layers
            const res = await apiFetch(`/api/business/config?t=${Date.now()}`);
            if (res.ok) {
                const data = await res.json();
                setConfigData(data);
                logActivity('Data', 'Forced system cache purge and re-fetched business configuration');
                alert("Cache purged and business configuration data refreshed successfully!");
            } else {
                alert("Caches purged, but failed to fetch the latest business configuration from server.");
            }
        } catch (err) {
            console.error("Refresh config error:", err);
            alert("Failed to refresh: check your network connection.");
        } finally {
            setIsRefreshing(false);
        }
    };
    
    // Business State
    const activeBusiness = user?.businesses?.find(b => b && b.name === user.businessName) || user?.businesses?.[0];
    const [businessData, setBusinessData] = useState<Partial<Business>>(activeBusiness || {});
    const [isAddingBusiness, setIsAddingBusiness] = useState(false);
    const [newBusinessName, setNewBusinessName] = useState('');
    
    // Store Modal State
    const [showStoreModal, setShowStoreModal] = useState(false);
    const [editingStore, setEditingStore] = useState<any>(null);
    const [storeFormData, setStoreFormData] = useState({ name: '', location: '', phone: '', isHeadOffice: false });
    const [show2faSetup, setShow2faSetup] = useState(false);
    const [twoFactorData, setTwoFactorData] = useState<{ secret: string; qrCode: string } | null>(null);
    const [twoFactorOtp, setTwoFactorOtp] = useState('');
    const [isVerifying2fa, setIsVerifying2fa] = useState(false);
    
    // Profile State
    const [profileData, setProfileData] = useState({
        businessName: user?.businessName || '',
        businessType: user?.businessType || '',
        location: user?.location || '',
        locationCount: user?.locationCount || 1,
    });

    // Business Control State (Mock)
    const [fiscalYearStart, setFiscalYearStart] = useState('2024-01-01');
    const [taxRegion, setTaxRegion] = useState('Default');

    // Security State
    const [googleAuth, setGoogleAuth] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [currentPasswordForChange, setCurrentPasswordForChange] = useState('');

    // Purchase Modal & Dynamic Server Templates
    const [serverTemplates, setServerTemplates] = useState<any[]>(TEMPLATES);
    const [purchaseModal, setPurchaseModal] = useState<{show: boolean, template: any | null}>({ show: false, template: null });
    const [templatePaymentMethod, setTemplatePaymentMethod] = useState<'bKash' | 'Nagad' | 'Card' | 'Bank'>('bKash');
    const [templatePaymentRef, setTemplatePaymentRef] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const res = await authFetch('/api/invoice-templates');
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data?.templates) && data.templates.length) {
                        setServerTemplates(data.templates);
                    }
                }
            } catch (err) {
                console.warn('Failed to load server invoice templates:', err);
            }
        })();
    }, []);

    // Invoice Preview State
    const [showInvoicePreview, setShowInvoicePreview] = useState(false);

    const handleProfileSave = (e: React.FormEvent) => {
        e.preventDefault();
        updateUser(profileData);
        alert("Profile updated successfully!");
    };

    const handleBusinessSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (activeBusiness) {
            updateBusinessSettings(activeBusiness.id, businessData.settings || {});
            updateUser({ 
                businessName: businessData.name,
                businessType: businessData.type,
                location: businessData.location
            });
            alert("Business settings updated successfully!");
        }
    };

    const handleAddBusiness = (e: React.FormEvent) => {
        e.preventDefault();
        if (newBusinessName) {
            addBusiness({ 
                name: newBusinessName, 
                type: 'Retail', 
                location: 'Main Office' 
            });
            setNewBusinessName('');
            setIsAddingBusiness(false);
            alert("New business added successfully!");
        }
    };

    const handleStoreSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingStore) {
            updateStore(editingStore.id, storeFormData);
        } else {
            addStore(storeFormData);
        }
        setShowStoreModal(false);
        setEditingStore(null);
        setStoreFormData({ name: '', location: '', phone: '', isHeadOffice: false });
    };

    const handleBusinessLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBusinessData({
                    ...businessData,
                    settings: { ...businessData.settings, logo: reader.result as string }
                });
            };
            reader.readAsDataURL(file);
        }
    };

    const isUnlocked = (tmpl: any) => {
        if (!tmpl) return true;
        const target = typeof tmpl === 'object' 
            ? tmpl 
            : (serverTemplates.find(t => t.id === tmpl || t.numericId === tmpl) || TEMPLATES.find(t => t.id === tmpl || t.numericId === tmpl) || { id: tmpl });
        if (target.isUnlocked !== undefined) return target.isUnlocked;
        if (Number(target.price) === 0 || target.availability === 'all') return true;
        const plan = String(user?.plan || '').toLowerCase();
        if (user?.isPremium || plan.includes('pro') || plan.includes('enterprise')) {
            if (target.requiredPlan !== 'enterprise' || plan.includes('enterprise')) return true;
        }
        const unlocked = Array.isArray(user?.unlockedTemplates) ? user.unlockedTemplates : [];
        return unlocked.includes(target.id) || (target.numericId && unlocked.includes(target.numericId));
    };

    const handleTemplateClick = (template: any) => {
        if (isUnlocked(template)) {
            setInvoiceTemplateId(template.numericId ?? template.id);
        } else {
            setPurchaseModal({ show: true, template });
        }
    };

    const handleToggle2fa = async () => {
        if (user?.twoFactorEnabled) {
            if (confirm("Are you sure you want to disable Two-Factor Authentication? This will make your account less secure.")) {
                await disable2fa();
                alert("2FA has been disabled.");
            }
        } else {
            const data = await initiate2faSetup();
            setTwoFactorData(data);
            setShow2faSetup(true);
        }
    };

    const handleVerifyAndEnable2fa = async () => {
        setIsVerifying2fa(true);
        const success = await verifyAndEnable2fa(twoFactorOtp);
        if (success) {
            alert("Two-Factor Authentication has been enabled successfully!");
            setShow2faSetup(false);
            setTwoFactorOtp('');
        } else {
            alert("Invalid verification code. Please try again.");
        }
        setIsVerifying2fa(false);
    };

    const handlePurchase = async () => {
        if (!purchaseModal.template) return;
        setIsProcessing(true);
        try {
            const tpl = purchaseModal.template;
            const res = await authFetch(`/api/invoice-templates/${tpl.id}/purchase`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paymentMethod: templatePaymentMethod,
                    paymentReference: templatePaymentRef || `TRX-${Date.now()}`,
                }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || 'Payment processing failed');
            }

            const data = await res.json();
            const unlockedList = data.unlockedTemplates || [
                ...(user?.unlockedTemplates || []),
                tpl.id,
                tpl.numericId,
            ];

            updateUser({
                unlockedTemplates: unlockedList,
            });

            setInvoiceTemplateId(tpl.numericId ?? tpl.id);
            setPurchaseModal({ show: false, template: null });
            setTemplatePaymentRef('');
            alert(`Template "${tpl.name}" successfully unlocked and set as your active invoice design!`);
        } catch (error: any) {
            alert(error.message || 'Payment processing failed. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await authFetch('/api/auth/me/password', {
                method: 'PATCH',
                body: JSON.stringify({ currentPassword: currentPasswordForChange, newPassword }),
            });
            const body = await res.json();
            if (res.ok) {
                alert("Password changed successfully!");
                setNewPassword('');
                setCurrentPasswordForChange('');
            } else {
                alert(body.error || "Could not change password.");
            }
        } catch (err) {
            alert("Could not reach the server. Please try again.");
        }
    };

    const handleColorChange = (color: string) => {
        if (!user?.isPremium) {
            alert("Custom branding is a Premium feature. Please upgrade to Pro.");
            return;
        }
        setBrandColor(color);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setInvoiceConfig({ ...invoiceConfig, logo: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    // Dummy data for preview
    const dummyInvoice: LedgerEntry = {
        id: 'PREVIEW-001',
        date: new Date().toISOString().split('T')[0],
        entityName: 'John Doe Client',
        entityMobile: '0123456789',
        entityAddress: '123 Demo St, Preview City',
        type: 'Sale',
        amount: 2500,
        paymentMethod: 'Cash',
        reference: 'INV-DEMO',
        items: [
            { productId: '1', name: 'Premium Service', qty: 1, price: 1500, total: 1500 },
            { productId: '2', name: 'Standard Product', qty: 2, price: 500, total: 1000 }
        ],
        details: { subtotal: 2500, tax: 0, discount: 0, delivery: 0 }
    };

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">{t('Settings')}</h1>

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide">
                {[
                    { id: 'profile', icon: User, label: t('Profile'), show: true },
                    { id: 'appearance', icon: Palette, label: t('Appearance'), show: true },
                    { id: 'business', icon: Briefcase, label: t('Business'), show: true },
                    { id: 'templates', icon: FileText, label: t('Templates'), show: true },
                    { id: 'security', icon: Shield, label: t('Security'), show: true },
                    { 
                        id: 'users', 
                        icon: User, 
                        label: t('Users'),
                        show: [UserRole.SHOP_OWNER, UserRole.OWNER, UserRole.SAAS_OWNER, UserRole.SAAS_ADMIN].includes(user?.role as UserRole)
                    },
                    { 
                        id: 'subscription', 
                        icon: Crown, 
                        label: t('Subscription'),
                        show: [UserRole.SHOP_OWNER, UserRole.OWNER, UserRole.SAAS_OWNER, UserRole.SAAS_ADMIN].includes(user?.role as UserRole)
                    },
                    { 
                        id: 'data', 
                        icon: Database, 
                        label: t('Data & Backup'),
                        show: [UserRole.SHOP_OWNER, UserRole.OWNER, UserRole.SAAS_OWNER, UserRole.SAAS_ADMIN].includes(user?.role as UserRole)
                    },
                    { 
                        id: 'audit', 
                        icon: Clock, 
                        label: t('Audit Log'),
                        show: [UserRole.SHOP_OWNER, UserRole.OWNER, UserRole.SAAS_OWNER, UserRole.SAAS_ADMIN].includes(user?.role as UserRole)
                    },
                ].filter(tab => tab.show !== false).map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap flex-shrink-0 ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                    </button>
                ))}
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                
                {/* --- PROFILE TAB --- */}
                {activeTab === 'profile' && (
                    <form onSubmit={handleProfileSave} className="max-w-2xl space-y-5">
                        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100 flex items-start gap-3">
                            <Lock className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                                <p className="text-sm font-semibold text-yellow-800">{t('Account Security')}</p>
                                <p className="text-xs text-yellow-700 mt-1">{t('Mobile number and Email address cannot be changed for security reasons.')}</p>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Business Name')}</label>
                            <input type="text" value={profileData.businessName} onChange={e => setProfileData({...profileData, businessName: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('Business Type')}</label>
                                <select value={profileData.businessType} onChange={e => setProfileData({...profileData, businessType: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white">
                                    <option>Retail</option>
                                    <option>Wholesale</option>
                                    <option>Restaurant</option>
                                    <option>Cafe & Bakery</option>
                                    <option>Hotel & Hospitality</option>
                                    <option>Service</option>
                                    <option>Manufacturing</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('Number of Locations')}</label>
                                <input type="number" value={profileData.locationCount} onChange={e => setProfileData({...profileData, locationCount: parseInt(e.target.value)})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Location / Address')}</label>
                            <input type="text" value={profileData.location} onChange={e => setProfileData({...profileData, location: e.target.value})} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"/>
                        </div>
                        <button type="submit" className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                            <Save className="w-4 h-4" /> {t('Save Changes')}
                        </button>
                    </form>
                )}

                {/* --- APPEARANCE TAB --- */}
                {activeTab === 'appearance' && (
                    <div className="max-w-4xl">
                        {/* Theme Mode */}
                        <div className="mb-10">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Layout className="w-5 h-5 text-slate-500" /> {t('Interface Theme')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <button 
                                    onClick={() => setThemeMode('light')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${themeMode === 'light' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="w-full h-24 bg-white rounded-lg border border-slate-200 shadow-sm flex flex-col p-2 overflow-hidden">
                                        <div className="h-2 w-1/2 bg-slate-200 rounded mb-2"></div>
                                        <div className="flex-1 bg-slate-50 rounded"></div>
                                    </div>
                                    <span className={`font-bold flex items-center gap-2 ${themeMode === 'light' ? 'text-indigo-700' : 'text-slate-600'}`}>
                                        <Sun className="w-4 h-4" /> {t('Light Mode')}
                                    </span>
                                </button>

                                <button 
                                    onClick={() => setThemeMode('dark')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${themeMode === 'dark' ? 'border-indigo-600 bg-slate-800' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="w-full h-24 bg-slate-900 rounded-lg border border-slate-700 shadow-sm flex flex-col p-2 overflow-hidden">
                                        <div className="h-2 w-1/2 bg-slate-700 rounded mb-2"></div>
                                        <div className="flex-1 bg-slate-800 rounded"></div>
                                    </div>
                                    <span className={`font-bold flex items-center gap-2 ${themeMode === 'dark' ? 'text-white' : 'text-slate-600'}`}>
                                        <Moon className="w-4 h-4" /> {t('Dark Mode')}
                                    </span>
                                </button>

                                <button 
                                    onClick={() => setThemeMode('system')}
                                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${themeMode === 'system' ? 'border-indigo-600 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}
                                >
                                    <div className="w-full h-24 bg-gradient-to-r from-white to-slate-900 rounded-lg border border-slate-200 shadow-sm flex flex-col p-2 overflow-hidden opacity-80">
                                    </div>
                                    <span className={`font-bold flex items-center gap-2 ${themeMode === 'system' ? 'text-indigo-700' : 'text-slate-600'}`}>
                                        <Monitor className="w-4 h-4" /> {t('System Default')}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Brand Color (Premium) */}
                        <div className="border-t border-slate-100 pt-8">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Palette className="w-5 h-5 text-slate-500" /> {t('Custom Brand Theme')}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">{t('Customize the primary color to match your brand identity.')}</p>
                                </div>
                                {!user?.isPremium && (
                                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border border-yellow-200">
                                        <Crown className="w-3 h-3" /> {t('Premium Feature')}
                                    </span>
                                )}
                            </div>

                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-8 ${!user?.isPremium ? 'opacity-60 pointer-events-none' : ''}`}>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 mb-3 block">{t('Preset Palettes')}</label>
                                    <div className="grid grid-cols-3 gap-3 mb-6">
                                        {PRESET_COLORS.map(color => (
                                            <button
                                                key={color.value}
                                                onClick={() => handleColorChange(color.value)}
                                                className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${brandColor === color.value ? 'border-slate-800 ring-1 ring-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300'}`}
                                            >
                                                <div className="w-6 h-6 rounded-full shadow-sm" style={{ backgroundColor: color.value }}></div>
                                                <span className="text-xs font-medium text-slate-700">{color.name}</span>
                                            </button>
                                        ))}
                                    </div>

                                    <label className="text-sm font-bold text-slate-700 mb-3 block">{t('Custom Hex Color')}</label>
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-lg border border-slate-200 shadow-sm" style={{ backgroundColor: brandColor }}></div>
                                        <input 
                                            type="text" 
                                            value={brandColor}
                                            onChange={(e) => handleColorChange(e.target.value)}
                                            className="uppercase font-mono border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-slate-400 outline-none w-32"
                                            maxLength={7}
                                        />
                                        <input 
                                            type="color" 
                                            value={brandColor}
                                            onChange={(e) => handleColorChange(e.target.value)}
                                            className="w-10 h-10 p-0 border-0 rounded cursor-pointer"
                                        />
                                    </div>
                                </div>

                                {/* Live Preview Card */}
                                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 flex items-center justify-center">
                                    <div className="bg-white w-64 rounded-xl shadow-lg overflow-hidden">
                                        <div className="h-24 p-4 text-white flex flex-col justify-between" style={{ backgroundColor: brandColor }}>
                                            <div className="w-8 h-8 bg-white/20 rounded-lg"></div>
                                            <div>
                                                <div className="w-24 h-2 bg-white/80 rounded mb-1"></div>
                                                <div className="w-16 h-2 bg-white/50 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="p-4 space-y-3">
                                            <div className="flex gap-2">
                                                <div className="flex-1 h-8 rounded bg-slate-100"></div>
                                                <div className="w-8 h-8 rounded" style={{ backgroundColor: `${brandColor}20`, color: brandColor }}></div>
                                            </div>
                                            <div className="h-2 w-full bg-slate-100 rounded"></div>
                                            <div className="h-2 w-2/3 bg-slate-100 rounded"></div>
                                            <button className="w-full py-2 rounded text-xs font-bold text-white mt-2" style={{ backgroundColor: brandColor }}>
                                                Preview Button
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Audio & Sound Effects */}
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-8 mt-8">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                        <Volume2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> {t('Audio & Sound Effects')}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{t('Configure acoustic feedback for POS sales, notifications, and store activities.')}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6">
                                {/* Sound Enabled Toggle */}
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{t('System Sounds')}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('Play audio tones on checkout completion, new alerts, and status changes')}</p>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={toggleSound}
                                        className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors ${soundEnabled ? 'bg-indigo-600 justify-end' : 'bg-slate-300 dark:bg-slate-700 justify-start'}`}
                                        aria-label={soundEnabled ? 'Disable system sounds' : 'Enable system sounds'}
                                    >
                                        <div className="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform"></div>
                                    </button>
                                </div>

                                {/* Volume Slider */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                            {soundEnabled ? <Volume2 className="w-4 h-4 text-slate-500" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                                            {t('Master Volume')}
                                        </label>
                                        <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
                                            {Math.round(soundVolume * 100)}%
                                        </span>
                                    </div>
                                    <input 
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={soundVolume}
                                        disabled={!soundEnabled}
                                        onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                                        className="w-full accent-indigo-600 disabled:opacity-40 cursor-pointer"
                                    />
                                </div>

                                {/* Test Sound Previews */}
                                <div>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">{t('Test Sound Effects')}</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                        <button
                                            type="button"
                                            disabled={!soundEnabled}
                                            onClick={() => previewSound('sale')}
                                            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-2xs"
                                        >
                                            <Play className="w-3 h-3 text-emerald-600" /> {t('Sale Success')}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!soundEnabled}
                                            onClick={() => previewSound('notification')}
                                            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-2xs"
                                        >
                                            <Play className="w-3 h-3 text-indigo-600" /> {t('Notification')}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!soundEnabled}
                                            onClick={() => previewSound('order')}
                                            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-2xs"
                                        >
                                            <Play className="w-3 h-3 text-sky-600" /> {t('Online Order')}
                                        </button>
                                        <button
                                            type="button"
                                            disabled={!soundEnabled}
                                            onClick={() => previewSound('action')}
                                            className="px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 disabled:opacity-40 shadow-2xs"
                                        >
                                            <Play className="w-3 h-3 text-amber-600" /> {t('Quick Action')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- BUSINESS TAB --- */}
                {activeTab === 'business' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex gap-4">
                                {['general', 'stores', 'tax', 'hours', 'notifications'].map((sub) => (
                                    <button
                                        key={sub}
                                        onClick={() => setBusinessSubTab(sub as any)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all uppercase tracking-wider ${businessSubTab === sub ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                                    >
                                        {t(sub)}
                                    </button>
                                ))}
                            </div>
                            <button 
                                onClick={() => setIsAddingBusiness(true)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                            >
                                <Plus className="w-3 h-3" /> {t('Add Business')}
                            </button>
                        </div>

                        {/* Sub-Tab: General Profile */}
                        {businessSubTab === 'general' && (
                            <form onSubmit={handleBusinessSave} className="space-y-6 max-w-3xl">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Business Name')}</label>
                                            <input 
                                                type="text" 
                                                value={businessData.name || ''} 
                                                onChange={e => setBusinessData({...businessData, name: e.target.value})} 
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Business Category')}</label>
                                            <select 
                                                value={businessData.settings?.category || ''} 
                                                onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, category: e.target.value}})} 
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                            >
                                                <option value="Retail">Retail</option>
                                                <option value="Wholesale">Wholesale</option>
                                                <option value="Restaurant">Restaurant / Cafe</option>
                                                <option value="Pharmacy">Pharmacy</option>
                                                <option value="Electronics">Electronics</option>
                                                <option value="Fashion">Fashion & Apparel</option>
                                                <option value="Service">Service Provider</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Timezone')}</label>
                                            <div className="relative">
                                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                                <select 
                                                    value={businessData.settings?.timezone || 'UTC'} 
                                                    onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, timezone: e.target.value}})} 
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                                >
                                                    <option value="UTC">UTC (Coordinated Universal Time)</option>
                                                    <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                                                    <option value="America/New_York">America/New_York (EST)</option>
                                                    <option value="Europe/London">Europe/London (GMT)</option>
                                                    <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('Business Logo')}</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-32 h-32 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative bg-slate-50 hover:bg-white transition-colors group">
                                                {businessData.settings?.logo ? (
                                                    <img src={businessData.settings.logo} alt="Logo" className="w-full h-full object-contain" />
                                                ) : (
                                                    <ImageIcon className="w-10 h-10 text-slate-400 group-hover:text-indigo-500" />
                                                )}
                                                <input type="file" accept="image/*" onChange={handleBusinessLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                            <div className="text-xs text-slate-500">
                                                <p>Upload your official logo.</p>
                                                <p>Recommended: 512x512px</p>
                                                {businessData.settings?.logo && (
                                                    <button type="button" onClick={() => setBusinessData({...businessData, settings: {...businessData.settings, logo: undefined}})} className="text-red-600 hover:underline mt-2 font-bold">Remove Logo</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-6">
                                    <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-slate-500" /> {t('Contact Information')}
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('Email Address')}</label>
                                            <input 
                                                type="email" 
                                                value={businessData.settings?.contactEmail || ''} 
                                                onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, contactEmail: e.target.value}})} 
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="info@business.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('Phone Number')}</label>
                                            <input 
                                                type="text" 
                                                value={businessData.settings?.contactPhone || ''} 
                                                onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, contactPhone: e.target.value}})} 
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="+1 234 567 890"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('Website')}</label>
                                            <input 
                                                type="text" 
                                                value={businessData.settings?.website || ''} 
                                                onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, website: e.target.value}})} 
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="https://www.business.com"
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('Business Address')}</label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                                <textarea 
                                                    value={businessData.location || ''} 
                                                    onChange={e => setBusinessData({...businessData, location: e.target.value})} 
                                                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                                                    placeholder="Enter full physical address"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button type="submit" className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center gap-2">
                                        <Save className="w-4 h-4" /> {t('Save Business Profile')}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Sub-Tab: Stores & Branches */}
                        {businessSubTab === 'stores' && (
                            <div className="space-y-6">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-slate-800">{t('Stores & Branches')}</h3>
                                        <p className="text-sm text-slate-500">Manage your physical outlets and warehouse locations.</p>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            if (hasFeature('Unlimited Stores')) {
                                                setEditingStore(null); setShowStoreModal(true);
                                            } else {
                                                alert('Please upgrade your plan to add more stores.');
                                            }
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        <Plus className="w-4 h-4" /> {t('Add New Store')}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {stores.map(store => (
                                        <div key={store.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-indigo-300 transition-all group">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                                    <Store className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => {
                                                            setEditingStore(store); setStoreFormData(store as any); setShowStoreModal(true);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md transition-colors"
                                                    >
                                                        <PenTool className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            if (stores.length <= 1) {
                                                                alert(t('You must have at least one store.'));
                                                            } else {
                                                                deleteStore(store.id);
                                                            }
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-md transition-colors"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                {store.name}
                                                {store.isHeadOffice && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-bold">HQ</span>}
                                            </h4>
                                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                                <MapPin className="w-3 h-3" /> {store.location}
                                            </p>
                                            {store.phone && (
                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                                    <Phone className="w-3 h-3" /> {store.phone}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sub-Tab: Tax & Invoicing */}
                        {businessSubTab === 'tax' && (
                            <form onSubmit={handleBusinessSave} className="space-y-8 max-w-2xl">
                                <div>
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Percent className="w-5 h-5 text-slate-500" /> {t('Tax Settings')}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Tax Identification Number')}</label>
                                            <input 
                                                type="text" 
                                                value={businessData.settings?.taxNumber || ''} 
                                                onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, taxNumber: e.target.value}})} 
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                                placeholder="VAT / GST / TIN"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Default Tax Rate (%)')}</label>
                                            <input 
                                                type="number" 
                                                value={businessData.settings?.taxRate || 0} 
                                                onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, taxRate: parseFloat(e.target.value)}})} 
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-8">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <FileText className="w-5 h-5 text-slate-500" /> {t('Invoice Settings')}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Invoice Prefix')}</label>
                                            <input 
                                                type="text" 
                                                value={businessData.settings?.invoicePrefix || 'INV-'} 
                                                onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, invoicePrefix: e.target.value}})} 
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Default Currency')}</label>
                                            <select 
                                                value={businessData.settings?.currency || currency} 
                                                onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, currency: e.target.value}})} 
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
                                            >
                                                {Object.values(Currency).map(c => (
                                                    <option key={c} value={c}>{CURRENCY_SYMBOLS[c] || c} {c}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="col-span-2 border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800">Exchange rates (FX)</p>
                                                    <p className="text-xs text-slate-500">Rates are vs USD. Ledger stays in base currency; display can convert.</p>
                                                    {fxMeta.fetchedAt && (
                                                      <p className="text-[10px] text-slate-400 mt-0.5">
                                                        Live: {fxMeta.provider || 'api'} · {new Date(fxMeta.fetchedAt).toLocaleString()}
                                                      </p>
                                                    )}
                                                    {fxMeta.error && (
                                                      <p className="text-[10px] text-red-600 font-semibold mt-0.5">{fxMeta.error}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <button
                                                      type="button"
                                                      disabled={fxMeta.loading}
                                                      onClick={async () => {
                                                        const r = await refreshExchangeRates(true);
                                                        if (!r.ok) alert(r.error || 'Failed to refresh rates');
                                                        else alert(`Updated ${r.count || 0} rates`);
                                                      }}
                                                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                                                    >
                                                      {fxMeta.loading ? 'Fetching…' : 'Refresh live rates'}
                                                    </button>
                                                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                                        <input type="checkbox" checked={applyExchangeRates} onChange={e => setApplyExchangeRates(e.target.checked)} />
                                                        Apply on display
                                                    </label>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Base (books)</label>
                                                    <select value={baseCurrency} onChange={e => setBaseCurrency(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                                                        {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Display currency</label>
                                                    <select value={currency} onChange={e => setCurrency(e.target.value as any)} className="w-full px-3 py-2 border rounded-lg text-sm bg-white">
                                                        {Object.values(Currency).map(c => <option key={c} value={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            {applyExchangeRates && (
                                                <p className="text-xs text-indigo-700 font-semibold">
                                                    Example: {formatMoneyIn(1000, currency)} = 1,000 {baseCurrency} in books
                                                    {' · '}
                                                    100 {currency} ≈ {convertAmount(100, currency, baseCurrency).toFixed(2)} {baseCurrency}
                                                </p>
                                            )}
                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                                                {['USD','EUR','GBP','BDT','INR','AED','SAR','CNY','PKR','MYR','SGD','JPY','AUD','CAD','CHF','TRY'].map(code => (
                                                    <label key={code} className="text-[10px] font-bold text-slate-500">
                                                        {code} / USD
                                                        <input
                                                            type="number"
                                                            step="0.0001"
                                                            className="w-full mt-0.5 px-2 py-1 border rounded text-sm font-semibold text-slate-800"
                                                            value={exchangeRates[code] ?? ''}
                                                            onChange={e => setExchangeRate(code, parseFloat(e.target.value) || 0)}
                                                        />
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="col-span-2">
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('Invoice Footer Text')}</label>
                                            <textarea 
                                                value={businessData.settings?.invoiceFooter || ''} 
                                                onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, invoiceFooter: e.target.value}})} 
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                                                placeholder="Terms and conditions, bank details, etc."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button type="submit" className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">
                                        {t('Save Financial Settings')}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Sub-Tab: Working Hours */}
                        {businessSubTab === 'hours' && (
                            <form onSubmit={handleBusinessSave} className="space-y-6 max-w-2xl">
                                <div>
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Clock className="w-5 h-5 text-slate-500" /> {t('Business Working Hours')}
                                    </h3>
                                    <div className="space-y-3">
                                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                                            const dayData = businessData.settings?.workingHours?.[day] || { open: '09:00', close: '17:00', closed: false };
                                            return (
                                                <div key={day} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                    <span className="w-24 font-bold text-slate-700 capitalize">{day}</span>
                                                    <div className="flex items-center gap-4">
                                                        {!dayData.closed ? (
                                                            <>
                                                                <input 
                                                                    type="time" 
                                                                    value={dayData.open} 
                                                                    onChange={e => setBusinessData({
                                                                        ...businessData, 
                                                                        settings: {
                                                                            ...businessData.settings,
                                                                            workingHours: {
                                                                                ...businessData.settings?.workingHours,
                                                                                [day]: { ...dayData, open: e.target.value }
                                                                            }
                                                                        }
                                                                    })}
                                                                    className="px-2 py-1 border border-slate-300 rounded text-sm"
                                                                />
                                                                <span className="text-slate-400">to</span>
                                                                <input 
                                                                    type="time" 
                                                                    value={dayData.close} 
                                                                    onChange={e => setBusinessData({
                                                                        ...businessData, 
                                                                        settings: {
                                                                            ...businessData.settings,
                                                                            workingHours: {
                                                                                ...businessData.settings?.workingHours,
                                                                                [day]: { ...dayData, close: e.target.value }
                                                                            }
                                                                        }
                                                                    })}
                                                                    className="px-2 py-1 border border-slate-300 rounded text-sm"
                                                                />
                                                            </>
                                                        ) : (
                                                            <span className="text-red-500 font-bold text-sm uppercase px-10">Closed</span>
                                                        )}
                                                        <button 
                                                            type="button"
                                                            onClick={() => setBusinessData({
                                                                ...businessData, 
                                                                settings: {
                                                                    ...businessData.settings,
                                                                    workingHours: {
                                                                        ...businessData.settings?.workingHours,
                                                                        [day]: { ...dayData, closed: !dayData.closed }
                                                                    }
                                                                }
                                                            })}
                                                            className={`text-xs font-bold px-3 py-1 rounded-md transition-colors ${dayData.closed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                                                        >
                                                            {dayData.closed ? 'Open' : 'Close'}
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button type="submit" className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">
                                        {t('Save Working Hours')}
                                    </button>
                                </div>
                            </form>
                        )}

                        {/* Sub-Tab: Notifications & Templates */}
                        {businessSubTab === 'notifications' && (
                            <div className="space-y-8 max-w-3xl">
                                <div>
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <MailIcon className="w-5 h-5 text-slate-500" /> {t('Email Templates')}
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {['welcome', 'invoice', 'receipt'].map(type => (
                                            <div key={type} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <div className="flex justify-between items-center mb-3">
                                                    <h4 className="font-bold text-slate-700 capitalize">{type} Email</h4>
                                                    <button className="text-xs text-indigo-600 font-bold hover:underline">Edit Template</button>
                                                </div>
                                                <p className="text-xs text-slate-500">Sent automatically when {type === 'welcome' ? 'a new user joins' : `a ${type} is generated`}.</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="border-t border-slate-100 pt-8">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                        <Package className="w-5 h-5 text-slate-500" /> FEFO / Lot policy
                                    </h3>
                                    <p className="text-xs text-slate-500 mb-4">Controls POS near-expiry warnings and whether expired lots can be sold.</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Warn within (days)</label>
                                            <input
                                                type="number"
                                                min={1}
                                                value={businessData.settings?.fefoWarnDays ?? 30}
                                                onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, fefoWarnDays: parseInt(e.target.value) || 30}})}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">Critical within (days)</label>
                                            <input
                                                type="number"
                                                min={0}
                                                value={businessData.settings?.fefoCriticalDays ?? 7}
                                                onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, fefoCriticalDays: parseInt(e.target.value) || 7}})}
                                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                        </div>
                                    </div>
                                    <label className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={!!businessData.settings?.fefoBlockExpired}
                                            onChange={e => setBusinessData({...businessData, settings: {...businessData.settings, fefoBlockExpired: e.target.checked}})}
                                            className="rounded border-slate-300"
                                        />
                                        Block checkout if cart would use expired lots
                                    </label>
                                </div>

                                <div className="border-t border-slate-100 pt-8">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <MessageSquare className="w-5 h-5 text-slate-500" /> {t('SMS Notification Setup')}
                                        </h3>
                                        <div className={`w-12 h-6 rounded-full flex items-center px-1 transition-colors cursor-pointer ${businessData.settings?.smsSettings?.enabled ? 'bg-indigo-600' : 'bg-slate-300'}`} onClick={() => setBusinessData({...businessData, settings: {...businessData.settings, smsSettings: {...businessData.settings?.smsSettings, enabled: !businessData.settings?.smsSettings?.enabled}}})}>
                                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${businessData.settings?.smsSettings?.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>
                                    
                                    <div className={`grid grid-cols-2 gap-4 ${!businessData.settings?.smsSettings?.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('SMS Provider')}</label>
                                            <select className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white">
                                                <option>Twilio</option>
                                                <option>Vonage</option>
                                                <option>MessageBird</option>
                                                <option>BulkSMS</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('API Key / Token')}</label>
                                            <input type="password" value="••••••••••••" className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50" readOnly />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* --- TEMPLATES TAB --- */}
                {activeTab === 'templates' && (
                    <div className="space-y-8">
                        {/* Select Design */}
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-slate-800">{t('Select Invoice Design')}</h3>
                                    <p className="text-sm text-slate-500">This template will be applied to all your invoices.</p>
                                </div>
                                <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
                                    Current: Template {invoiceTemplateId}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                                {serverTemplates.map((tmpl) => {
                                    const unlocked = isUnlocked(tmpl);
                                    const isActive = invoiceTemplateId === tmpl.id || invoiceTemplateId === tmpl.numericId || invoiceTemplateId === Number(tmpl.id?.replace(/\D/g, ''));
                                    return (
                                        <div 
                                            key={tmpl.id} 
                                            onClick={() => handleTemplateClick(tmpl)} 
                                            className={`group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white ${
                                                isActive ? 'ring-2 ring-indigo-600 ring-offset-2 shadow-md' : 'border border-slate-200 hover:border-indigo-200'
                                            }`}
                                        >
                                            <div className="aspect-[3/4] bg-slate-50 relative overflow-hidden">
                                                <MiniInvoice id={tmpl.numericId || tmpl.id} />
                                                {!unlocked && (
                                                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white transition-opacity group-hover:bg-slate-900/70 p-2 text-center">
                                                        <div className="p-2.5 bg-slate-800 rounded-full shadow-lg mb-2 text-amber-400">
                                                            <Lock className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-bold text-sm tracking-tight">
                                                            {Number(tmpl.price) > 0 ? formatMoney(tmpl.price) : 'Plan Upgrade'}
                                                        </span>
                                                        <span className="text-[10px] uppercase font-bold tracking-wider mt-1 px-2 py-0.5 rounded-full bg-indigo-500/80">
                                                            {tmpl.requiredPlan ? `${tmpl.requiredPlan}+` : 'Unlock'}
                                                        </span>
                                                    </div>
                                                )}
                                                {unlocked && Number(tmpl.price) > 0 && (
                                                    <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/90 text-white shadow-sm">
                                                        Unlocked
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`p-2.5 text-center text-xs font-semibold truncate ${isActive ? 'bg-indigo-50 text-indigo-700' : 'bg-white text-slate-700'}`}>
                                                {tmpl.name}
                                            </div>
                                            {isActive && (
                                                <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full shadow-md z-10">
                                                    <CheckCircle className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Customize Design Section - LOCKED FOR NON-PREMIUM */}
                        <div className={`border-t border-slate-100 pt-8 relative ${!user?.isPremium ? 'opacity-60 pointer-events-none' : ''}`}>
                            {!user?.isPremium && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[1px]">
                                     <div className="bg-slate-900 text-white px-5 py-3 rounded-xl font-bold shadow-2xl flex items-center gap-3 border border-slate-700 animate-in zoom-in duration-300">
                                        <Crown className="w-5 h-5 text-yellow-400" /> 
                                        <span>Unlock Customization with Premium</span>
                                     </div>
                                </div>
                            )}
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <PenTool className="w-5 h-5 text-indigo-600" /> {t('Customize Design')}
                                </h3>
                                <button 
                                    onClick={() => setShowInvoicePreview(true)}
                                    className="text-sm bg-slate-900 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-slate-800 transition-colors pointer-events-auto" // Preview remains clickable even if section locked? Usually not, but let's keep it consistent with the lock.
                                    disabled={!user?.isPremium}
                                >
                                    <Eye className="w-4 h-4" /> {t('Preview Invoice')}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    {/* Logo Upload */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">{t('Business Logo')}</label>
                                        <div className="flex items-center gap-4">
                                            <div className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center overflow-hidden relative bg-slate-50 hover:bg-white transition-colors group">
                                                {invoiceConfig.logo ? (
                                                    <img src={invoiceConfig.logo} alt="Logo" className="w-full h-full object-contain" />
                                                ) : (
                                                    <ImageIcon className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" />
                                                )}
                                                <input type="file" accept="image/*" onChange={handleLogoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                <p>Upload a clear PNG or JPG.</p>
                                                {invoiceConfig.logo && (
                                                    <button onClick={() => setInvoiceConfig({ ...invoiceConfig, logo: undefined })} className="text-red-600 hover:underline mt-1 text-xs font-bold">Remove Logo</button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Toggles */}
                                    <div className="space-y-4">
                                        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-200 transition-colors">
                                            <span className="text-sm font-medium text-slate-700">{t('Show Authorised Signature Line')}</span>
                                            <div onClick={(e) => { e.preventDefault(); setInvoiceConfig({...invoiceConfig, showSignature: !invoiceConfig.showSignature}); }} className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${invoiceConfig.showSignature ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${invoiceConfig.showSignature ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                        </label>
                                        
                                        <label className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-200 transition-colors">
                                            <span className="text-sm font-medium text-slate-700">{t('Show Business Seal / Stamp Placeholder')}</span>
                                            <div onClick={(e) => { e.preventDefault(); setInvoiceConfig({...invoiceConfig, showSeal: !invoiceConfig.showSeal}); }} className={`w-10 h-6 rounded-full flex items-center px-1 transition-colors ${invoiceConfig.showSeal ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${invoiceConfig.showSeal ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {/* Footer Note */}
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-2">{t('Footer Note / Terms')}</label>
                                        <textarea 
                                            value={invoiceConfig.footerNote}
                                            onChange={(e) => setInvoiceConfig({...invoiceConfig, footerNote: e.target.value})}
                                            className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-32 resize-none"
                                            placeholder="e.g. Thank you for your business! Payment due in 30 days."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- SECURITY TAB --- */}
                {activeTab === 'security' && (
                    <div className="max-w-2xl space-y-8">
                        <form onSubmit={handlePasswordChange} className="space-y-4 border-b border-slate-100 pb-8">
                            <h3 className="font-bold text-slate-800">{t('Change Password')}</h3>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('Current Password')}</label>
                                <input type="password" value={currentPasswordForChange} onChange={e => setCurrentPasswordForChange(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('New Password')}</label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" required minLength={6} />
                            </div>
                            <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">{t('Update Password')}</button>
                        </form>

                        <div className="flex items-center justify-between border-b border-slate-100 pb-8">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Shield className="w-4 h-4 text-emerald-500"/> {t('Two-Factor Authentication')}</h3>
                                <p className="text-sm text-slate-500">{t('Enable 2FA for extra security. You will need to enter a code from your authenticator app when logging in.')}</p>
                            </div>
                            <button 
                                onClick={handleToggle2fa} 
                                className={`w-12 h-6 rounded-full flex items-center transition-colors px-1 ${user?.twoFactorEnabled ? 'bg-emerald-500 justify-end' : 'bg-slate-300 justify-start'}`}
                            >
                                <div className="w-4 h-4 bg-white rounded-full shadow-sm"></div>
                            </button>
                        </div>

                        {/* Configurable Auto-Logout */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
                            <div>
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-indigo-600" /> {t('Auto-Logout Inactivity Timer')}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">
                                    {t('To protect multi-user retail registers, automatically log out users after a specified period of inactivity.')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={autoLogoutTimer}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        setAutoLogoutTimer(val);
                                        logActivity(
                                            'Inactivity Timer Updated',
                                            'Security',
                                            val === 0 
                                                ? 'Disabled auto-logout inactivity timer' 
                                                : `Changed auto-logout inactivity timer to ${val} minute${val > 1 ? 's' : ''}`
                                        );
                                    }}
                                    className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[150px]"
                                >
                                    <option value={0}>{t('Disabled')}</option>
                                    <option value={1}>{t('1 Minute')}</option>
                                    <option value={2}>{t('2 Minutes')}</option>
                                    <option value={5}>{t('5 Minutes')}</option>
                                    <option value={10}>{t('10 Minutes')}</option>
                                    <option value={15}>{t('15 Minutes')}</option>
                                    <option value={30}>{t('30 Minutes')}</option>
                                    <option value={60}>{t('1 Hour')}</option>
                                </select>
                            </div>
                        </div>

                        {/* Active Sessions */}
                        <div className="border-b border-slate-100 pb-8">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <LogOut className="w-4 h-4 text-indigo-600" /> {t('Active Sessions')}
                            </h3>
                            <div className="space-y-3">
                                {sessions.map(session => (
                                    <div key={session.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-white rounded-lg shadow-sm">
                                                {session.device.toLowerCase().includes('mobile') ? <Smartphone className="w-5 h-5 text-slate-600" /> : <Laptop className="w-5 h-5 text-slate-600" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{session.device} {session.isCurrent && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded uppercase">Current</span>}</p>
                                                <p className="text-xs text-slate-500">{session.location} • {session.ip}</p>
                                            </div>
                                        </div>
                                        {!session.isCurrent && (
                                            <button 
                                                onClick={() => terminateSession(session.id)}
                                                className="text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                Terminate
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Trusted Devices */}
                        <div className="border-b border-slate-100 pb-8">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Smartphone className="w-4 h-4 text-indigo-600" /> {t('Trusted Devices')}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {devices.map(device => (
                                    <div key={device.id} className="p-4 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                                                {device.type === 'MOBILE' ? <Smartphone className="w-5 h-5 text-slate-500" /> : <Laptop className="w-5 h-5 text-slate-500" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{device.name}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-medium">Last used: {new Date(device.lastUsed).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => removeDevice(device.id)}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Login History */}
                        <div className="border-b border-slate-100 pb-8">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <History className="w-4 h-4 text-indigo-600" /> {t('Login History')}
                            </h3>
                            <div className="overflow-x-auto rounded-xl border border-slate-200">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-4 py-3 font-bold text-slate-700">Time</th>
                                            <th className="px-4 py-3 font-bold text-slate-700">Device</th>
                                            <th className="px-4 py-3 font-bold text-slate-700">Method</th>
                                            <th className="px-4 py-3 font-bold text-slate-700">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {loginHistory.map(entry => (
                                            <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 text-slate-600 text-xs">{new Date(entry.timestamp).toLocaleString()}</td>
                                                <td className="px-4 py-3 text-slate-800 font-medium">{entry.device}</td>
                                                <td className="px-4 py-3">
                                                    <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded uppercase">{entry.method}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${entry.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {entry.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Security Alerts / Activity Log */}
                        <div>
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Bell className="w-4 h-4 text-indigo-600" /> {t('Security Alerts & Activity')}
                            </h3>
                            <div className="space-y-3">
                                {activityLogs.filter(log => log.module === 'Security' || log.module === 'Auth').slice(0, 5).map(log => (
                                    <div key={log.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className={`p-1.5 rounded-full mt-0.5 ${(log.action || '').includes('Login') ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                            <Shield className="w-3.5 h-3.5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{log.action}</p>
                                            <p className="text-xs text-slate-500">{log.details || log.module}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{new Date(log.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                                {activityLogs.length === 0 && (
                                    <div className="text-center py-8 text-slate-400 italic text-sm">
                                        No security activity recorded yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- DATA & BACKUP TAB --- */}
                {activeTab === 'data' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-1">{t('Data Management')}</h3>
                            <p className="text-sm text-slate-500">{t('Cloud-first backup (all features). Offline → local. Multi-device: revision + device id avoid silent overwrite.')}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Backup & Restore Card */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <Database className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-slate-800">{t('Backup & Restore')}</h4>
                                </div>
                                <p className="text-sm text-slate-600">
                                    {t('Download a full copy of your account data including products, transactions, and settings. You can use this file to restore your account at any time.')}
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                    <button 
                                        onClick={() => {
                                            const data = getAllData();
                                            const jsonStr = JSON.stringify(data, null, 2);
                                            const blob = new Blob([jsonStr], { type: "application/json" });
                                            const url = URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `bizora_backup_${new Date().toISOString().split('T')[0]}.json`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(url);
                                            logActivity('Data', 'Exported full system backup');
                                        }}
                                        className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Download className="w-4 h-4" /> {t('Download Backup')}
                                    </button>
                                    <button 
                                        onClick={() => fileInputRef.current?.click()}
                                        className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Upload className="w-4 h-4" /> {t('Restore Data')}
                                    </button>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef}
                                        accept=".json" 
                                        className="hidden" 
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const content = event.target?.result as string;
                                                try {
                                                    let parsed: any = JSON.parse(content);
                                                    if (parsed?.encrypted && backupPassphrase) {
                                                        // decrypt path handled elsewhere for cloud; file restore expects plain JSON
                                                    }
                                                    const incomingMeta = extractMetaFromPayload(parsed);
                                                    const localRaw = readLocalBackup(user?.id || 'default');
                                                    const localMeta = localRaw ? extractMetaFromPayload(localRaw) : null;
                                                    const conflict = detectBackupConflict(localMeta, incomingMeta);
                                                    if (conflict.hasConflict) {
                                                        const detail = [
                                                            conflict.reason || 'divergence',
                                                            localMeta ? `local rev ${localMeta.revision} @ ${localMeta.exportedAt}` : 'no local meta',
                                                            incomingMeta ? `file rev ${incomingMeta.revision} @ ${incomingMeta.exportedAt}` : 'no file meta',
                                                            `suggestion: ${conflict.suggestion}`,
                                                        ].join('\n');
                                                        if (conflict.suggestion === 'local') {
                                                            if (!window.confirm(`Backup conflict — local looks newer.\n${detail}\n\nOverwrite local with file anyway?`)) {
                                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                                                return;
                                                            }
                                                        } else if (conflict.suggestion === 'ask' || conflict.suggestion === 'incoming') {
                                                            if (!window.confirm(`Backup conflict (multi-device).\n${detail}\n\nRestore file and overwrite current data?`)) {
                                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                                                return;
                                                            }
                                                        }
                                                    } else if (!window.confirm('WARNING: Restoring will OVERWRITE current records. Continue?')) {
                                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                                        return;
                                                    }
                                                    importData(typeof content === 'string' ? content : JSON.stringify(parsed));
                                                    logActivity('Data', 'Restored system from backup file');
                                                    setBackupMsg?.('Restored from file. Reload recommended.');
                                                } catch (err: any) {
                                                    alert(err?.message || 'Invalid backup file');
                                                }
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            };
                                            reader.readAsText(file);
                                        }}
                                    />
                                </div>
                            </div>

                            {/* System Cache & Sync Card */}
                            
                            {/* Automatic & Cloud Backup */}
                            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 md:col-span-2 lg:col-span-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-violet-100 text-violet-600 rounded-lg">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">Automatic & Cloud Backup</h4>
                                        <p className="text-xs text-slate-500">While the app is open, snapshots can be saved to the server (and a local copy).</p>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoBackupEnabled}
                                            onChange={e => persistAutoBackupCfg({ enabled: e.target.checked })}
                                            className="rounded border-slate-300"
                                        />
                                        Enable automatic backup
                                    </label>
                                    <label className="text-sm text-slate-600 flex items-center gap-2">
                                        Every
                                        <select
                                            value={autoBackupHours} min={0.25} step={0.25}
                                            onChange={e => persistAutoBackupCfg({ intervalHours: parseInt(e.target.value) })}
                                            className="border border-slate-200 rounded-lg px-2 py-1 text-sm"
                                        >
                                            <option value={1}>1 hour</option>
                                            <option value={6}>6 hours</option>
                                            <option value={12}>12 hours</option>
                                            <option value={24}>24 hours</option>
                                            <option value={168}>7 days</option>
                                        </select>
                                    </label>
                                    <label className="text-sm text-slate-600 flex items-center gap-2">
                                        Keep last
                                        <input
                                            type="number"
                                            min={1}
                                            max={30}
                                            value={autoBackupKeep}
                                            onChange={e => persistAutoBackupCfg({ keepLast: parseInt(e.target.value) || 7 })}
                                            className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm"
                                        />
                                        cloud copies
                                    </label>
                                    <button
                                        type="button"
                                        disabled={backupBusy}
                                        onClick={() => pushCloudBackup('manual')}
                                        className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold"
                                    >
                                        {backupBusy ? 'Saving…' : 'Backup to cloud now'}
                                    </button>
                                </div>
                                {lastAutoBackup && (
                                    <p className="text-xs text-slate-500">Last backup: {new Date(lastAutoBackup).toLocaleString()}</p>
                                )}
                                {backupMsg && (
                                    <p className={`text-xs font-semibold ${backupMsg.includes('failed') || backupMsg.includes('large') ? 'text-amber-700' : 'text-emerald-700'}`}>{backupMsg}</p>
                                )}
                                {user?.id && isPendingCloudSync(user.id) && (
                                    <p className="text-xs font-semibold text-amber-700">Pending: local backup will upload when online.</p>
                                )}
                                <button
                                    type="button"
                                    className="text-xs font-bold text-slate-600 hover:text-indigo-600 underline"
                                    onClick={() => {
                                        if (!user?.id) return;
                                        const local = readLocalBackup(user.id);
                                        if (!local?.data) {
                                            setBackupMsg('No local backup to verify.');
                                            return;
                                        }
                                        const r = verifyBackupIntegrity(local.data);
                                        setBackupMsg(r.ok
                                            ? `Local integrity OK (rev ${r.revision ?? '—'}, hash ${r.actualHash?.slice(0, 8)}…)`
                                            : r.reason);
                                    }}
                                >
                                    Verify local backup integrity
                                </button>
                                <div className="border border-slate-100 rounded-xl p-3 space-y-2 bg-slate-50">
                                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                                        <input
                                            type="checkbox"
                                            checked={backupEncryptEnabled}
                                            onChange={(e) => {
                                                setBackupEncryptEnabled(e.target.checked);
                                                try { localStorage.setItem('bizora_backup_encrypt', e.target.checked ? '1' : '0'); } catch { /* */ }
                                            }}
                                        />
                                        Encrypt backups (AES-256-GCM)
                                    </label>
                                    {backupEncryptEnabled && (
                                        <input
                                            type="password"
                                            value={backupPassphrase}
                                            onChange={(e) => setBackupPassphrase(e.target.value)}
                                            placeholder="Backup passphrase (min 6 chars)"
                                            className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
                                            autoComplete="new-password"
                                        />
                                    )}
                                    <p className="text-[10px] text-slate-500">Passphrase is never uploaded. Required to restore encrypted backups.</p>
                                </div>
                                <div className="border-t border-slate-100 pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <h5 className="text-sm font-bold text-slate-700">Cloud backups <span className="text-[10px] font-normal text-slate-400">device {getOrCreateDeviceId().slice(0, 12)}…</span></h5>
                                        <button type="button" onClick={refreshCloudBackups} className="text-xs text-indigo-600 hover:underline">Refresh</button>
                                    </div>
                                    <p className="text-[10px] text-slate-400 mb-2">Priority: cloud when online → always local mirror. Optional AES-256-GCM encryption (passphrase stays on device).</p>
                                    {cloudBackups.length === 0 ? (
                                        <p className="text-xs text-slate-400">No cloud backups yet.</p>
                                    ) : (
                                        <ul className="divide-y divide-slate-100 max-h-48 overflow-y-auto text-sm">
                                            {cloudBackups.map((b: any) => (
                                                <li key={b.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                                                    <div>
                                                        <span className="font-medium text-slate-800">{b.label || b.id}</span>
                                                        <span className="text-xs text-slate-400 ml-2">{b.createdAt ? new Date(b.createdAt).toLocaleString() : ''} · {b.source || ''} · {b.sizeBytes || b.sizeChars || 0} B</span>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button
                                                            type="button"
                                                            className="text-xs font-bold text-indigo-600 hover:underline"
                                                            onClick={async () => {
                                                                setBackupBusy(true);
                                                                try {
                                                                    const res = await authFetch(`/api/backups/${b.id}`);
                                                                    const body = await res.json();
                                                                    if (!res.ok) throw new Error(body.error || 'Failed');
                                                                    const payload = body.backup?.payload;
                                                                    let parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
                                                                    if (parsed?.encrypted && isEncryptedBlob(parsed.blob)) {
                                                                        const pass = backupPassphrase || window.prompt('Enter backup passphrase') || '';
                                                                        if (!pass) throw new Error('Passphrase required for encrypted backup');
                                                                        const plain = await decryptBackupPayload(parsed.blob, pass);
                                                                        parsed = { ...(plain as object), meta: parsed.meta };
                                                                    } else if (isEncryptedBlob(parsed)) {
                                                                        const pass = backupPassphrase || window.prompt('Enter backup passphrase') || '';
                                                                        if (!pass) throw new Error('Passphrase required for encrypted backup');
                                                                        parsed = await decryptBackupPayload(parsed, pass);
                                                                    }
                                                                    const integrity = verifyBackupIntegrity(parsed);
                                                                    if (!integrity.ok) {
                                                                        throw new Error(integrity.reason);
                                                                    }
                                                                    const localEnv = user?.id ? readLocalBackup(user.id) : null;
                                                                    const localMeta = localEnv?.meta || extractMetaFromPayload(localEnv?.data);
                                                                    const incomingMeta = extractMetaFromPayload(parsed) || body.backup?.meta;
                                                                    const conflict = detectBackupConflict(localMeta, incomingMeta);
                                                                    if (conflict.hasConflict) {
                                                                        const detail = `Local rev ${localMeta?.revision} (${localMeta?.deviceId?.slice(0,8)}…) vs cloud rev ${incomingMeta?.revision} (${incomingMeta?.deviceId?.slice(0,8)}…). Suggestion: ${conflict.suggestion}`;
                                                                        if (!confirm(`Multi-device backup conflict.\n${detail}\n\nRestore cloud copy and overwrite local?`)) {
                                                                            setBackupMsg('Restore cancelled — conflict unresolved.');
                                                                            return;
                                                                        }
                                                                    } else if (!confirm('Restore this cloud backup? Current local data will be overwritten.')) {
                                                                        return;
                                                                    }
                                                                    const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
                                                                    importData(json);
                                                                    setBackupMsg('Restored from cloud backup. Reloading…');
                                                                    setTimeout(() => window.location.reload(), 800);
                                                                } catch (e: any) {
                                                                    setBackupMsg(e?.message || 'Restore failed');
                                                                } finally {
                                                                    setBackupBusy(false);
                                                                }
                                                            }}
                                                        >
                                                            Restore
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="text-xs text-red-600 hover:underline"
                                                            onClick={async () => {
                                                                if (!confirm('Delete this cloud backup?')) return;
                                                                await authFetch(`/api/backups/${b.id}`, { method: 'DELETE' });
                                                                refreshCloudBackups();
                                                            }}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            </div>

<div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                            <RotateCcw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                                        </div>
                                        <h4 className="font-bold text-slate-800">{t('Cache & Config Sync')}</h4>
                                    </div>
                                    <p className="text-sm text-slate-600">
                                        {t('Force an immediate purge of your local application cache and fetch the latest business configuration from the server to synchronize systems.')}
                                    </p>
                                    
                                    {configData ? (
                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-500 space-y-1.5 font-mono">
                                            <div className="flex justify-between">
                                                <span>{t('Sys Version')}:</span>
                                                <span className="font-bold text-slate-700">{configData.systemVersion}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>{t('Environment')}:</span>
                                                <span className="font-bold text-slate-700 capitalize">{configData.environment}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>{t('Last Synced')}:</span>
                                                <span className="font-bold text-indigo-600">{new Date(configData.lastUpdated).toLocaleTimeString()}</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-400 italic text-center">
                                            {t('No local config cache loaded. Click Refresh to synchronize.')}
                                        </div>
                                    )}
                                </div>
                                <div className="pt-2">
                                    <button 
                                        onClick={handleRefreshData}
                                        disabled={isRefreshing}
                                        className="w-full px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                                    >
                                        {isRefreshing ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" /> {t('Refreshing...')}
                                            </>
                                        ) : (
                                            <>
                                                <RotateCcw className="w-4 h-4" /> {t('Refresh Data')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Danger Zone Card */}
                            <div className="bg-white p-6 rounded-xl border border-red-100 shadow-sm space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                                        <AlertTriangle className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-bold text-red-700">{t('Danger Zone')}</h4>
                                </div>
                                <p className="text-sm text-slate-600">
                                    {t('Resetting your account will permanently delete ALL your records including sales, products, and customers. This action cannot be undone.')}
                                </p>
                                <div className="pt-2">
                                    <button 
                                        onClick={() => setShowResetConfirm(true)}
                                        className="w-full px-4 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" /> {t('Reset All Account Data')}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Password Confirmation Modal */}
                        {showResetConfirm && (
                            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                                <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                                    <div className="p-6 text-center border-b border-slate-100">
                                        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <AlertTriangle className="w-8 h-8" />
                                        </div>
                                        <h4 className="text-xl font-bold text-slate-800 mb-2">{t('Confirm Data Reset')}</h4>
                                        <p className="text-sm text-slate-500">
                                            {t('To delete ALL records permanently, please enter your login password to confirm.')}
                                        </p>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">{t('Your Password')}</label>
                                            <input 
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder={t('Enter password')}
                                                className={`w-full px-4 py-2.5 bg-slate-50 border ${resetError ? 'border-red-300' : 'border-slate-200'} rounded-xl focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all`}
                                                autoFocus
                                            />
                                            {resetError && <p className="text-xs text-red-500 mt-1.5 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {resetError}</p>}
                                        </div>
                                        
                                        <div className="flex gap-3">
                                            <button 
                                                onClick={() => {
                                                    setShowResetConfirm(false);
                                                    setConfirmPassword('');
                                                    setResetError('');
                                                }}
                                                className="flex-1 px-4 py-2.5 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-colors"
                                                disabled={isResetting}
                                            >
                                                {t('Cancel')}
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    if (!confirmPassword) {
                                                        setResetError('Password is required');
                                                        return;
                                                    }
                                                    setIsResetting(true);
                                                    setResetError('');
                                                    try {
                                                        const success = await resetData(confirmPassword);
                                                        if (success) {
                                                            alert("All data has been reset successfully. The page will now reload.");
                                                            window.location.reload();
                                                        } else {
                                                            setResetError('Invalid password. Please try again.');
                                                            setIsResetting(false);
                                                        }
                                                    } catch (e) {
                                                        setResetError('An error occurred. Please try again.');
                                                        setIsResetting(false);
                                                    }
                                                }}
                                                disabled={isResetting}
                                                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isResetting ? (
                                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                {t('Confirm Reset')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Recent Data Actions */}
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <History className="w-4 h-4 text-slate-500" /> {t('Recent Data Actions')}
                            </h4>
                            <div className="space-y-3">
                                {activityLogs.filter(log => log.module === 'Data' || log.module === 'System').slice(0, 5).map(log => (
                                    <div key={log.id} className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <Settings className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-800">{log.action}</p>
                                                <p className="text-xs text-slate-500">{log.details || log.module}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-medium uppercase">{new Date(log.timestamp).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                                {activityLogs.filter(log => log.module === 'Data' || log.module === 'System').length === 0 && (
                                    <p className="text-center py-4 text-slate-400 text-sm italic">No recent data actions recorded.</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- AUDIT LOG TAB --- */}
                {activeTab === 'audit' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <AuditLog />
                    </div>
                )}

                {/* --- USERS TAB --- */}
                {activeTab === 'users' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <EmployeeManagement />
                    </div>
                )}

                {/* --- SUBSCRIPTION TAB --- */}
                {activeTab === 'webhooks' && (
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <WebhooksSettings />
                    </div>
                )}
                {activeTab === 'subscription' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-200">
                        <Subscription />
                    </div>
                )}
            </div>

            {/* --- MODALS --- */}
            
            {/* Add/Edit Store Modal */}
            {showStoreModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">{editingStore ? t('Edit Store') : t('Add New Store')}</h3>
                            <button onClick={() => setShowStoreModal(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleStoreSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('Store Name')}</label>
                                <input 
                                    type="text" 
                                    value={storeFormData.name} 
                                    onChange={e => setStoreFormData({...storeFormData, name: e.target.value})} 
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="e.g. Downtown Branch"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('Location / Address')}</label>
                                <input 
                                    type="text" 
                                    value={storeFormData.location} 
                                    onChange={e => setStoreFormData({...storeFormData, location: e.target.value})} 
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="123 Street, City"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('Phone Number')}</label>
                                <input 
                                    type="text" 
                                    value={storeFormData.phone} 
                                    onChange={e => setStoreFormData({...storeFormData, phone: e.target.value})} 
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                            <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200 cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={storeFormData.isHeadOffice} 
                                    onChange={e => setStoreFormData({...storeFormData, isHeadOffice: e.target.checked})}
                                    className="w-4 h-4 text-indigo-600 rounded"
                                />
                                <span className="text-sm font-medium text-slate-700">{t('Set as Head Office')}</span>
                            </label>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowStoreModal(false)} className="flex-1 py-2.5 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                    {t('Cancel')}
                                </button>
                                <button type="submit" className="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">
                                    {editingStore ? t('Update Store') : t('Save Store')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Business Modal */}
            {isAddingBusiness && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">{t('Add New Business')}</h3>
                            <button onClick={() => setIsAddingBusiness(false)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500" />
                            </button>
                        </div>
                        <form onSubmit={handleAddBusiness} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('Business Name')}</label>
                                <input 
                                    type="text" 
                                    value={newBusinessName} 
                                    onChange={e => setNewBusinessName(e.target.value)} 
                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="Enter business name"
                                    required
                                />
                            </div>
                            <p className="text-xs text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                Adding a new business allows you to manage separate entities with their own stores, products, and ledgers.
                            </p>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsAddingBusiness(false)} className="flex-1 py-2.5 border border-slate-300 rounded-lg font-bold text-slate-600 hover:bg-slate-50 transition-colors">
                                    {t('Cancel')}
                                </button>
                                <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                                    {t('Create Business')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 2FA Setup Modal */}
            {show2faSetup && twoFactorData && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <Shield className="w-6 h-6 text-indigo-600" />
                                </div>
                                <h3 className="font-bold text-xl text-slate-800">Setup 2FA</h3>
                            </div>
                            <button onClick={() => setShow2faSetup(false)} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-400"/>
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="text-center">
                                <p className="text-sm text-slate-600 mb-4">Scan this QR code with your authenticator app (like Google Authenticator or Authy).</p>
                                <div className="bg-white p-4 border-2 border-slate-100 rounded-xl inline-block shadow-sm">
                                    <img src={twoFactorData.qrCode} alt="2FA QR Code" className="w-48 h-48" referrerPolicy="no-referrer" />
                                </div>
                            </div>

                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-2">Or enter this secret key manually</p>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                                    <code className="text-sm font-mono font-bold text-slate-700">{twoFactorData.secret}</code>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(twoFactorData.secret);
                                            alert("Secret key copied to clipboard!");
                                        }}
                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-6">
                                <label className="block text-sm font-bold text-slate-700 mb-3 text-center">Enter the 6-digit code from your app</label>
                                <input 
                                    type="text" 
                                    value={twoFactorOtp} 
                                    onChange={e => setTwoFactorOtp(e.target.value)} 
                                    placeholder="000000"
                                    className="w-full text-center text-3xl tracking-[0.5em] font-bold py-4 border-2 border-slate-200 rounded-xl mb-6 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all"
                                    maxLength={6}
                                />
                                <button 
                                    onClick={handleVerifyAndEnable2fa} 
                                    disabled={isVerifying2fa || twoFactorOtp.length < 4}
                                    className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    {isVerifying2fa ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Enable 2FA"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Purchase Modal */}
            {purchaseModal.show && purchaseModal.template && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="relative h-28 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 flex items-center justify-between px-6 text-white">
                            <div>
                                <span className="text-[11px] uppercase tracking-wider font-semibold text-indigo-200">Invoice Template</span>
                                <h3 className="font-bold text-xl">{purchaseModal.template.name}</h3>
                            </div>
                            <button onClick={() => setPurchaseModal({ show: false, template: null })} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl">
                                <div>
                                    <div className="text-xs text-slate-500 font-medium">Price (One-time)</div>
                                    <div className="text-xl font-bold text-slate-900">{formatMoney(purchaseModal.template.price)}</div>
                                </div>
                                <div className="text-right">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                                        <CheckCircle className="w-3.5 h-3.5" /> Lifetime Access
                                    </span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">Payment Method</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['bKash', 'Nagad', 'Card', 'Bank'] as const).map((method) => (
                                        <button
                                            key={method}
                                            type="button"
                                            onClick={() => setTemplatePaymentMethod(method)}
                                            className={`py-2 px-2 rounded-lg text-xs font-bold border transition-all text-center ${
                                                templatePaymentMethod === method
                                                    ? 'border-indigo-600 bg-indigo-50/80 text-indigo-700 ring-2 ring-indigo-500/20 shadow-sm'
                                                    : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                                            }`}
                                        >
                                            {method}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                                    Transaction Reference / TRX ID
                                </label>
                                <input
                                    type="text"
                                    value={templatePaymentRef}
                                    onChange={(e) => setTemplatePaymentRef(e.target.value)}
                                    placeholder="e.g. TRX-9823412 or Card Ref"
                                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                />
                                <p className="text-[11px] text-slate-400 mt-1">Leave empty to auto-generate a verified test reference.</p>
                            </div>

                            <div className="pt-2">
                                <button
                                    onClick={handlePurchase}
                                    disabled={isProcessing}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                                >
                                    {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Pay {formatMoney(purchaseModal.template.price)} & Unlock</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8 mb-4 px-1 text-center">
              <p className="text-[10px] text-slate-400 font-medium select-all allow-select">{appVersionLabel()}</p>
              <p className="text-[9px] text-slate-300 mt-0.5">Support diagnostics</p>
            </div>

            {/* Invoice Preview Modal */}
            {showInvoicePreview && (
                <InvoiceTemplate 
                    data={dummyInvoice} 
                    onClose={() => setShowInvoicePreview(false)} 
                />
            )}
        </div>
    );
};

export default SettingsPage;
