import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, Permission, UserSession, LoginHistoryEntry, ActivityLogEntry, DeviceInfo, Staff, GlobalEmployee } from '../types';
import { useNotifications } from './NotificationContext';
import { apiFetch, authFetch, hasAuthToken, setAuthTokens, clearAuthTokens, getRefreshToken } from '../lib/apiClient';
import { buildSignupTrialFields } from '../lib/trialLimits';
import { subscribeBusinessSync, ensureRealtimeSocket } from '../lib/realtimeSocket';
import {
  signInWithGoogle,
  sendFirebasePhoneOtp,
  confirmFirebasePhoneOtp,
  registerWithFirebaseEmail,
  sendEmailVerificationToCurrent,
  reloadAndCheckEmailVerified,
} from '../lib/firebaseAuthService';

export interface BusinessSettings {
  category?: string;
  logo?: string;
  taxNumber?: string;
  taxRate?: number;
  invoicePrefix?: string;
  invoiceFooter?: string;
  workingHours?: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
  timezone?: string;
  currency?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  emailTemplates?: {
    welcome?: string;
    invoice?: string;
    receipt?: string;
  };
  smsSettings?: {
    enabled: boolean;
    provider?: string;
    apiKey?: string;
  };
}

export interface Business {
  id: string;
  name: string;
  type: string;
  location: string;
  settings?: BusinessSettings;
}

import { PERMISSIONS, getAllPermissions } from '../utils/permissions';
import { isFeatureEnabled } from '../lib/featureRegistry';

export interface User {
  id: string;
  name?: string; // Added name property
  businessName: string;
  email: string;
  mobile: string;
  businessType: string;
  location: string;
  locationCount: number;
  isPremium: boolean;
  unlockedTemplates: number[];
  role: UserRole;
  permissions: string[];
  initialLoginDate: string;
  twoFactorEnabled: boolean;
  pinEnabled: boolean;
  passwordEnabled: boolean;
  avatar?: string;
  parentId?: string; // For sub-users
  businesses?: Business[];
  totalStores?: number;
  totalBusiness?: number;
  features: string[];
  isImpersonated?: boolean;
  storageLimit?: number;
  employeeLimit?: number;
  branchLimit?: number;
  employeeCount?: number;
  branchCount?: number;
  enabledFeatures?: string[];
  plan?: string;
  business_id?: string;
  password?: string;
  subscriptionStatus?: 'Active' | 'Grace' | 'Expired' | 'Trial' | string;
  subscriptionRenewsAt?: string | null;
  autoRenew?: boolean;
  subscriptionEnforce?: boolean;
  trialLimits?: {
    products: number;
    customers: number;
    buys: number;
    sells: number;
    expenses: number;
    quickSales: number;
  };
  trialUsage?: {
    products: number;
    customers: number;
    buys: number;
    sells: number;
    expenses: number;
    quickSales: number;
  };
  trialStartedAt?: string;
}

export interface SaaSRequest {
  id: string;
  userId: string;
  userName: string;
  businessName: string;
  type: 'subscription' | 'template';
  details: any;
  status: 'pending' | 'approved' | 'rejected';
  date: string;
  amount: number;
  plan?: string;
  planId?: string;
  currency?: string;
  billingCycle?: 'monthly' | 'yearly';
  paymentMethod?: string;
  paymentReference?: string;
  paymentStatus?: string;
  note?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  sessions: UserSession[];
  loginHistory: LoginHistoryEntry[];
  activityLogs: ActivityLogEntry[];
  devices: DeviceInfo[];
  
  hasFeature: (feature: string) => boolean;
  login: (identifier: string, secret: string, method: 'PASSWORD' | 'PIN' | 'OTP', opts?: { allowSaas?: boolean; targetRole?: 'business' | 'employee' | 'customer' | 'saas' | 'supplier' }) => Promise<{ success: boolean; require2fa?: boolean; error?: string; retryAfterSec?: number; remainingAttempts?: number }>;
  signInWithGoogleAuth?: (targetRole?: 'SHOP_OWNER' | 'EMPLOYEE' | 'CUSTOMER' | 'SUPPLIER', metadata?: any) => Promise<{ success: boolean; user?: any; error?: string }>;
  sendPhoneOtpCode?: (phoneNumber: string, containerId?: string) => Promise<any>;
  confirmPhoneOtpCode?: (confirmationResult: any, otpCode: string, targetRole?: 'SHOP_OWNER' | 'EMPLOYEE' | 'CUSTOMER' | 'SUPPLIER', metadata?: any) => Promise<{ success: boolean; user?: any; error?: string }>;
  registerWithEmailOtp?: (email: string, password: string, metadata?: any) => Promise<{ success: boolean; user?: any; error?: string; requireEmailVerification?: boolean }>;
  reloadEmailVerification?: () => Promise<boolean>;
  resendEmailVerificationLink?: () => Promise<boolean>;
  signup: (data: any) => Promise<{ success: boolean; error?: string }>;
  socialLogin: (provider: 'google' | 'facebook' | 'apple') => Promise<boolean>;
  complete2fa: (otp: string) => Promise<boolean>;
  logout: () => void;
  registeredUsers: User[];
  upgradeSubscription: () => void;
  updateUser: (data: Partial<User>) => void;
  refreshSessionFromServer?: () => Promise<void>;
  unlockTemplate: (templateId: number) => void;
  switchBusiness: (businessId: string) => void;
  updateBusinessSettings: (businessId: string, settings: Partial<BusinessSettings>) => void;
  addBusiness: (business: Omit<Business, 'id'>) => void;
  
  // Security & Management
  initiate2faSetup: () => Promise<{ secret: string; qrCode: string }>;
  verifyAndEnable2fa: (otp: string) => Promise<boolean>;
  disable2fa: () => Promise<void>;
  terminateSession: (sessionId: string) => void;
  removeDevice: (deviceId: string) => void;
  recoverAccount: (identifier: string) => Promise<boolean>;
  resetPassword: (identifier: string, otp: string, newPin: string) => Promise<boolean>;
  verifyPassword: (password: string) => Promise<boolean>;
  logActivity: (action: string, module: string, details?: string) => void;
  updateRegisteredUser: (userId: string, data: Partial<User>) => void;
  createSubUser: (userData: Partial<User>) => Promise<boolean>;
  deleteSubUser: (userId: string) => void;
  deleteUser: (userId: string) => void;
  saasRequests: SaaSRequest[];
  refreshSaasRequests?: () => Promise<void>;
  createSaaSRequest: (request: Omit<SaaSRequest, 'id' | 'date' | 'status' | 'userId' | 'userName' | 'businessName'> & { plan?: string; planId?: string; billingCycle?: 'monthly' | 'yearly'; currency?: string; paymentMethod?: string; paymentReference?: string; note?: string }) => void | Promise<void>;
  approveSaaSRequest: (requestId: string, options?: { markPaid?: boolean; paymentMethod?: string; paymentReference?: string; note?: string }) => void | Promise<void>;
  rejectSaaSRequest: (requestId: string, options?: { reason?: string }) => void | Promise<void>;
  impersonateUser: (shop: any) => void;
  exitImpersonation: () => void;
  customerLogin?: (phone: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  customerSignup?: (data: { name: string; phone: string; pin: string; address?: string; photo?: string }) => Promise<{ success: boolean; error?: string }>;
  resetCustomerPin?: (phone: string, otp: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  supplierLogin?: (mobile: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  supplierSignup?: (data: { name: string; mobile: string; pin: string; companyName?: string; email?: string }) => Promise<{ success: boolean; error?: string }>;
  resetSupplierPin?: (mobile: string, otp: string, pin: string) => Promise<{ success: boolean; error?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification } = useNotifications();
  const [user, setUser] = useState<User | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogEntry[]>(() => {
    const saved = localStorage.getItem('nexus_activity_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [saasRequests, setSaasRequests] = useState<SaaSRequest[]>([]);
  
  // Real registered users (Shop Owners)
  const [registeredUsers, setRegisteredUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('bizora_registered_users');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing bizora_registered_users:", e);
      }
    }
    return [];
  });

  useEffect(() => {
    localStorage.setItem('nexus_activity_logs', JSON.stringify(activityLogs));
  }, [activityLogs]);

  useEffect(() => {
    localStorage.setItem('bizora_registered_users', JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  // Keep the active shopowner/user session synchronized with changes to registeredUsers (e.g. from SaaS Admin Panel)
  useEffect(() => {
    if (user && (user.role === UserRole.SHOP_OWNER || user.isImpersonated)) {
      const latestUser = registeredUsers.find(u => u.id === user.id);
      if (latestUser) {
        const { password, ...sessionUser } = latestUser as any;
        const updatedSessionUser = {
          ...sessionUser,
          isImpersonated: user.isImpersonated
        };
        if (JSON.stringify(updatedSessionUser) !== JSON.stringify(user)) {
          setUser(updatedSessionUser);
          localStorage.setItem('nexus_user', JSON.stringify(updatedSessionUser));
        }
      }
    }
  }, [registeredUsers, user]);

  useEffect(() => {
    setSessions([]);
    setDevices([]);
    setLoginHistory([]);

    const savedRequests = localStorage.getItem('saas_requests');
    if (savedRequests) {
      try {
        setSaasRequests(JSON.parse(savedRequests));
      } catch (e) {
        console.error("Error parsing saas_requests:", e);
      }
    }

    // Restore session ONLY after JWT validates — avoids mass 401 on /api/admin/*
    (async () => {
      try {
        const { getAccessToken, clearAuthTokens, authFetch } = await import('../lib/apiClient');
        const token = getAccessToken();
        const raw = localStorage.getItem('nexus_user');
        if (!token) {
          if (raw) {
            console.warn('[auth] Saved user without token — clear session');
            localStorage.removeItem('nexus_user');
          }
          setUser(null);
          return;
        }
        const res = await authFetch('/api/auth/me');
        if (!res.ok) {
          console.warn('[auth] Token rejected — force re-login', res.status);
          clearAuthTokens();
          localStorage.removeItem('nexus_user');
          setUser(null);
          return;
        }
        const body = await res.json().catch(() => ({}));
        if (body?.user) {
          // Prefer server user; keep local extras if any
          let local: any = {};
          try { local = raw ? JSON.parse(raw) : {}; } catch { /* */ }
          const merged = {
            ...local,
            ...body.user,
            role: body.user.role || local.role,
            id: body.user.id || local.id,
          };
          setUser(merged);
          localStorage.setItem('nexus_user', JSON.stringify(merged));
        } else if (raw) {
          try { setUser(JSON.parse(raw)); } catch { setUser(null); }
        }
      } catch (e) {
        console.warn('[auth] session validate failed', e);
        // Keep offline local session only if token exists (dev offline)
        try {
          const raw = localStorage.getItem('nexus_user');
          const { getAccessToken } = await import('../lib/apiClient');
          if (raw && getAccessToken()) setUser(JSON.parse(raw));
          else setUser(null);
        } catch {
          setUser(null);
        }
      }
    })();
  }, []);

  useEffect(() => {
    localStorage.setItem('saas_requests', JSON.stringify(saasRequests));
  }, [saasRequests]);

  // Live plan requests from server
  const refreshSaasRequests = async () => {
    try {
      if (!hasAuthToken() || !user?.id) return;
      const res = await authFetch('/api/plan-requests');
      if (!res.ok) return;
      const body = await res.json();
      const list = Array.isArray(body?.requests) ? body.requests : [];
      // Normalize shape for AdminSubscriptionsTab & Client panels
      const mapped = list.map((r: any) => ({
        ...r,
        type: r.type || 'subscription',
        plan: r.plan || r.details?.plan || 'Pro',
        planId: r.planId || r.details?.planId || 'pro',
        amount: Number(r.amount ?? r.price ?? r.details?.amount ?? 0),
        currency: r.currency || r.details?.currency || 'BDT',
        billingCycle: r.billingCycle || r.details?.billingCycle || 'monthly',
        paymentMethod: r.paymentMethod || r.details?.paymentMethod || '',
        paymentReference: r.paymentReference || r.details?.paymentReference || '',
        paymentStatus: r.paymentStatus || (r.status === 'approved' ? 'Paid' : 'Pending'),
        details: r.details || { plan: r.plan, amount: r.amount, billingCycle: r.billingCycle },
        date: (r.createdAt || r.date || '').slice(0, 10),
        status: r.status || 'pending',
      }));
      setSaasRequests(mapped);
    } catch (e) {
      console.warn('[auth] refresh plan-requests failed', e);
    }
  };

  useEffect(() => {
    if (user?.id && hasAuthToken()) {
      refreshSaasRequests();
      const id = window.setInterval(refreshSaasRequests, 25000);
      return () => window.clearInterval(id);
    }
  }, [user?.id]);

  // Pull trial/subscription overrides from server (SaaS raised limits, expiry, etc.)
  useEffect(() => {
    if (!user?.id || !hasAuthToken()) return;
    const role = String(user.role || '');
    if (role === 'SAAS_OWNER' || role === 'SAAS_ADMIN') return;
    const tick = () => { void refreshSessionFromServer(); };
    tick();
    const onVis = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', tick);
    const id = window.setInterval(tick, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', tick);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.role]);

  // Real-time: SaaS raised trial limits / usage expired on another device
  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeBusinessSync((ev) => {
      if (ev.domain === 'trial' || ev.domain === 'subscription' || ev.domain === 'all') {
        void refreshSessionFromServer();
      }
      if (['plan_requests', 'subscription', 'requests', 'all'].includes(ev.domain)) {
        void refreshSaasRequests();
      }
    });
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);




  const logActivity = (action: string, module: string, details?: string) => {
    const newLog: ActivityLogEntry = {
        id: Math.random().toString(36).substring(2, 9),
        userId: user?.id || 'anonymous',
        userName: user?.businessName || 'System',
        action,
        module,
        timestamp: new Date().toISOString(),
        details
    };
    setActivityLogs(prev => [newLog, ...prev]);

    // Trigger security notification for sensitive actions (only for SaaS/Admins or failed auth)
    const isFailedAuth = action.toLowerCase().includes('fail');
    const isSaasUser = user?.role === UserRole.SAAS_OWNER || user?.role === UserRole.SAAS_ADMIN;
    
    if (module === 'Security' || (module === 'Auth' && (isFailedAuth || isSaasUser))) {
        // Skip routine successful logins from triggering notifications for regular users
        if (module === 'Auth' && action === 'Login' && !isSaasUser) return;
        
        addNotification(
            `Security Alert: ${action}`,
            details || `A security-related action was performed in the ${module} module.`,
            isFailedAuth ? 'error' : 'warning',
            '/access'
        );
    }
  };

  const handleFirebaseSessionResult = (result: any) => {
    if (!result || !result.success || !result.user) return result;
    const { user: rawUser } = result;
    const role = (rawUser.role || '').toUpperCase();

    if (role === 'SHOP_OWNER' || !role) {
      const sessionUser: User = {
        ...rawUser,
        role: UserRole.SHOP_OWNER,
        locationCount: rawUser.locationCount ?? 1,
        initialLoginDate: rawUser.initialLoginDate || rawUser.createdAt || new Date().toISOString(),
        permissions: (rawUser.permissions && rawUser.permissions.length)
          ? rawUser.permissions
          : getAllPermissions().filter((p: string) => !p.startsWith('saas.')),
        businesses: rawUser.businesses || [],
        features: rawUser.features || [],
      };
      setUser(sessionUser);
      localStorage.setItem('nexus_user', JSON.stringify(sessionUser));
      logActivity('Login', 'Auth', 'Shop Owner signed in via Firebase');
    } else if (role === 'EMPLOYEE') {
      const activeEmp = rawUser.employments?.find((emp: any) => emp.status === 'Active') || rawUser.employments?.[0];
      const employeeUser: User = {
        id: rawUser.mobile || rawUser.id,
        name: rawUser.name || 'Employee',
        businessName: activeEmp?.businessName || rawUser.businessName || 'Bizora ERP',
        email: rawUser.email || `${(rawUser.name || 'staff').toLowerCase().replace(/\s/g, '.')}@bizora.com`,
        mobile: rawUser.mobile || rawUser.id,
        businessType: 'Retail',
        location: 'Main Office',
        locationCount: 1,
        isPremium: false,
        unlockedTemplates: [1],
        role: UserRole.EMPLOYEE,
        permissions: rawUser.permissions || activeEmp?.permissions || [],
        initialLoginDate: new Date().toISOString(),
        twoFactorEnabled: false,
        pinEnabled: true,
        passwordEnabled: false,
        businesses: (rawUser.employments || []).map((emp: any) => ({
          id: emp.businessId,
          name: emp.businessName,
          type: 'Retail',
          location: 'Not Specified'
        })),
        features: [],
        business_id: rawUser.activeBusinessId || activeEmp?.businessId,
      };
      setUser(employeeUser);
      localStorage.setItem('nexus_user', JSON.stringify(employeeUser));
      logActivity('Login', 'Auth', `Employee ${rawUser.name} signed in via Firebase`);
    } else if (role === 'CUSTOMER') {
      const customerUser: User = {
        id: rawUser.id || rawUser.phone,
        name: rawUser.name || 'Customer',
        businessName: 'Customer Portal',
        email: rawUser.email || '',
        mobile: rawUser.phone || rawUser.id,
        businessType: 'Retail',
        location: rawUser.address || '',
        locationCount: 0,
        isPremium: false,
        unlockedTemplates: [1],
        role: UserRole.CUSTOMER,
        permissions: ['customer.portal'],
        initialLoginDate: new Date().toISOString(),
        twoFactorEnabled: false,
        pinEnabled: true,
        passwordEnabled: false,
        businesses: [],
        features: [],
      };
      setUser(customerUser);
      localStorage.setItem('nexus_user', JSON.stringify(customerUser));
      logActivity('Login', 'Auth', 'Customer signed in via Firebase');
    }

    return result;
  };

  const signInWithGoogleAuth = async (targetRole: 'SHOP_OWNER' | 'EMPLOYEE' | 'CUSTOMER' | 'SUPPLIER' = 'SHOP_OWNER', metadata?: any) => {
    try {
      const result = await signInWithGoogle(targetRole, metadata);
      return handleFirebaseSessionResult(result);
    } catch (err: any) {
      console.error('[auth] Google sign in error:', err);
      return { success: false, error: err?.message || 'Google sign in failed' };
    }
  };

  const sendPhoneOtpCode = async (phoneNumber: string, containerId = 'recaptcha-container') => {
    return await sendFirebasePhoneOtp(phoneNumber, containerId);
  };

  const confirmPhoneOtpCode = async (confirmationResult: any, otpCode: string, targetRole: 'SHOP_OWNER' | 'EMPLOYEE' | 'CUSTOMER' | 'SUPPLIER' = 'SHOP_OWNER', metadata?: any) => {
    try {
      const result = await confirmFirebasePhoneOtp(confirmationResult, otpCode, targetRole, metadata);
      return handleFirebaseSessionResult(result);
    } catch (err: any) {
      console.error('[auth] Phone OTP confirm error:', err);
      return { success: false, error: err?.message || 'Invalid verification code' };
    }
  };

  const registerWithEmailOtp = async (email: string, password: string, metadata?: any) => {
    try {
      const result = await registerWithFirebaseEmail(email, password, metadata);
      return handleFirebaseSessionResult(result);
    } catch (err: any) {
      console.error('[auth] Email registration error:', err);
      return { success: false, error: err?.message || 'Email registration failed' };
    }
  };

  const reloadEmailVerification = async () => {
    return await reloadAndCheckEmailVerified();
  };

  const resendEmailVerificationLink = async () => {
    return await sendEmailVerificationToCurrent();
  };

  const login = async (
    rawIdentifier: string,
    rawSecret: string,
    method: 'PASSWORD' | 'PIN' | 'OTP',
    opts?: { allowSaas?: boolean; targetRole?: 'business' | 'employee' | 'customer' | 'saas' | 'supplier' }
  ): Promise<{ success: boolean; require2fa?: boolean; error?: string; retryAfterSec?: number; remainingAttempts?: number }> => {
    const identifier = rawIdentifier.trim();
    const secret = rawSecret.trim();
    const allowSaas = opts?.allowSaas === true || opts?.targetRole === 'saas';
    const targetRole = opts?.targetRole || (allowSaas ? 'saas' : (method === 'PIN' ? 'employee' : 'business'));

    if (!identifier || !secret) {
      return { success: false, error: 'empty_fields' };
    }

    // 1. SaaS Owner / SaaS Admin — only on admin portal
    if (allowSaas || targetRole === 'saas') {
      try {
        const res = await apiFetch('/api/auth/saas-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password: secret }),
        });
        if (res.status === 429) {
          const body = await res.json().catch(() => ({}));
          return {
            success: false,
            error: 'rate_limited',
            retryAfterSec: Number(body.retryAfterSec) || Number(res.headers.get('Retry-After')) || 900,
            remainingAttempts: 0,
          };
        }
        if (res.ok) {
          const body = await res.json();
          if (body.requires2fa) {
            localStorage.setItem('bizora_preauth_token', body.preAuthToken);
            setPendingUser({ role: UserRole.SAAS_OWNER } as User);
            return { success: true, require2fa: true };
          }
          const { user: backendUser, token, accessToken, refreshToken } = body;
          const saasUser: User = {
            ...backendUser,
            businessType: 'SaaS',
            location: 'Global',
            locationCount: 0,
            isPremium: true,
            unlockedTemplates: [1, 2, 3, 4, 5],
            role: backendUser.role === 'SAAS_OWNER' ? UserRole.SAAS_OWNER : UserRole.SAAS_ADMIN,
            initialLoginDate: new Date().toISOString(),
            twoFactorEnabled: false,
            pinEnabled: true,
            passwordEnabled: true,
            businesses: [],
            features: [],
          };
          setAuthTokens({ token, accessToken, refreshToken });
          setUser(saasUser);
          try { ensureRealtimeSocket(); } catch { /* */ }
          localStorage.setItem('nexus_user', JSON.stringify(saasUser));
          logActivity('Login', 'Auth', `${saasUser.role} logged in via ${method}`);
          return { success: true };
        }
        if (res.status === 401) {
          const body = await res.json().catch(() => ({}));
          return {
            success: false,
            error: 'invalid_credentials',
            remainingAttempts: body.remainingAttempts,
            retryAfterSec: body.retryAfterSec,
          };
        }
        if (res.status === 403) {
          const body = await res.json().catch(() => ({}));
          return { success: false, error: body.error === 'This account has been suspended. Please contact support.' ? 'suspended' : 'forbidden' };
        }
        return { success: false, error: 'server_error' };
      } catch (err) {
        console.error('[auth] SaaS login error:', err);
        return { success: false, error: 'network_error' };
      }
    }

    // 2. Customer Portal Login
    if (targetRole === 'customer') {
      if (customerLogin) {
        const res = await customerLogin(identifier, secret);
        return { success: res.success, error: res.error };
      }
      return { success: false, error: 'invalid_credentials' };
    }

    // 3. Supplier Portal Login
    if (targetRole === 'supplier') {
      if (supplierLogin) {
        const res = await supplierLogin(identifier, secret);
        return { success: res.success, error: res.error };
      }
      return { success: false, error: 'invalid_credentials' };
    }

    // 4. Employee Portal Login (Dedicated - Never calls Shop Owner login)
    if (targetRole === 'employee') {
      try {
        const res = await apiFetch('/api/auth/employee-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, pin: secret }),
        });
        if (res.ok) {
          const body = await res.json();
          const { employee, token, accessToken, refreshToken } = body;
          setAuthTokens({ token, accessToken, refreshToken });
          const activeEmp = employee.employments?.find((emp: any) => emp.status === 'Active') || employee.employments?.[0];
          const empPerms: string[] = Array.isArray(employee.permissions) && employee.permissions.length
            ? employee.permissions
            : (Array.isArray(body.permissions) ? body.permissions : (activeEmp?.permissions || []));
          const employeeUser: User = {
            id: employee.mobile,
            name: employee.name,
            businessName: activeEmp?.businessName || 'Bizora ERP',
            email: `${employee.name.toLowerCase().replace(/\s/g, '.')}@bizora.com`,
            mobile: employee.mobile,
            businessType: 'Retail',
            location: 'Main Office',
            locationCount: 1,
            isPremium: false,
            unlockedTemplates: [1],
            role: UserRole.EMPLOYEE,
            permissions: empPerms,
            initialLoginDate: new Date().toISOString(),
            twoFactorEnabled: false,
            pinEnabled: true,
            passwordEnabled: false,
            businesses: (employee.employments || []).map((emp: any) => ({
              id: emp.businessId,
              name: emp.businessName,
              type: 'Retail',
              location: 'Not Specified'
            })),
            features: [],
            business_id: employee.activeBusinessId || activeEmp?.businessId,
          };
          setUser(employeeUser);
          localStorage.setItem('nexus_user', JSON.stringify(employeeUser));
          logActivity('Login', 'Auth', `Employee ${employee.name} logged in (backend-verified)`);
          return { success: true };
        }
        if (res.status === 401) {
          return { success: false, error: 'invalid_credentials' };
        }
        if (res.status === 403) {
          return { success: false, error: 'forbidden' };
        }
      } catch (err) {
        console.warn('Employee backend login unavailable, falling back to local registry:', err);
      }

      const savedGlobalRegistry = localStorage.getItem('bizora_global_employee_registry');
      if (savedGlobalRegistry) {
        let globalEmployees: GlobalEmployee[] = [];
        try {
          globalEmployees = JSON.parse(savedGlobalRegistry);
        } catch (e) {
          console.error("Error parsing global employee registry:", e);
        }
        
        const cleanMobile = identifier.replace(/\D/g, '');
        const empMatch = globalEmployees.find(e => 
          (e.mobile === identifier || e.mobile.replace(/\D/g, '').endsWith(cleanMobile)) && 
          e.pin === secret
        );

        if (empMatch) {
          const activeEmployment = empMatch.employments.find(emp => emp.status === 'Active') || empMatch.employments[0];
          const employeeUser: User = {
            id: empMatch.mobile,
            name: empMatch.name,
            businessName: activeEmployment?.businessName || 'Bizora ERP',
            email: `${empMatch.name.toLowerCase().replace(/\s/g, '.')}@bizora.com`,
            mobile: empMatch.mobile,
            businessType: 'Retail',
            location: 'Main Office',
            locationCount: 1,
            isPremium: false,
            unlockedTemplates: [1],
            role: UserRole.EMPLOYEE,
            permissions: Array.isArray(activeEmployment?.permissions) ? activeEmployment.permissions : [],
            initialLoginDate: new Date().toISOString(),
            twoFactorEnabled: false,
            pinEnabled: true,
            passwordEnabled: false,
            businesses: empMatch.employments.map(emp => ({
              id: emp.businessId,
              name: emp.businessName,
              type: 'Retail',
              location: 'Not Specified'
            })),
            features: []
          };
          setUser(employeeUser);
          localStorage.setItem('nexus_user', JSON.stringify(employeeUser));
          logActivity('Login', 'Auth', `Employee ${empMatch.name} logged in`);
          return { success: true };
        }
      }

      return { success: false, error: 'invalid_credentials' };
    }

    // 5. Shop Owner Login (Dedicated - Never waterfalls to employee login)
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password: secret }),
      });
      if (res.status === 429) {
        const body = await res.json().catch(() => ({}));
        return {
          success: false,
          error: 'rate_limited',
          retryAfterSec: Number(body.retryAfterSec) || Number(res.headers.get('Retry-After')) || 900,
          remainingAttempts: 0,
        };
      }
      if (res.ok) {
        const body = await res.json();
        if (body.requires2fa) {
          localStorage.setItem('bizora_preauth_token', body.preAuthToken);
          setPendingUser({ role: UserRole.SHOP_OWNER } as User);
          return { success: true, require2fa: true };
        }

        const { user: backendUser, token, accessToken, refreshToken } = body;
        const sessionUser: User = {
          ...backendUser,
          role: UserRole.SHOP_OWNER,
          locationCount: backendUser.locationCount ?? 1,
          initialLoginDate: backendUser.initialLoginDate || backendUser.createdAt || new Date().toISOString(),
          permissions: (backendUser.permissions && backendUser.permissions.length)
            ? backendUser.permissions
            : getAllPermissions().filter((p: string) => !p.startsWith('saas.')),
          businesses: backendUser.businesses || [],
          features: backendUser.features || [],
        };
        setAuthTokens({ token, accessToken, refreshToken });

        setUser(sessionUser);
        localStorage.setItem('nexus_user', JSON.stringify(sessionUser));
        logActivity('Login', 'Auth', `Shop Owner logged in via ${method}`);
        return { success: true };
      }
      if (res.status === 401) {
        const body = await res.json().catch(() => ({}));
        return {
          success: false,
          error: 'invalid_credentials',
          remainingAttempts: body.remainingAttempts,
          retryAfterSec: body.retryAfterSec,
        };
      }
      if (res.status === 403) {
        const body = await res.json().catch(() => ({}));
        return { success: false, error: body.error === 'This account has been suspended. Please contact support.' ? 'suspended' : 'forbidden' };
      }
      if (res.status >= 500) {
        return { success: false, error: 'server_error' };
      }
      return { success: false, error: 'invalid_credentials' };
    } catch (err) {
      console.error('[auth] Shop login network error:', err);
      return { success: false, error: 'network_error' };
    }
  };

  const complete2fa = async (otp: string): Promise<boolean> => {
    const preAuthToken = localStorage.getItem('bizora_preauth_token');
    if (!preAuthToken) return false;

    try {
      const res = await apiFetch('/api/auth/2fa/verify-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${preAuthToken}` },
        body: JSON.stringify({ otp }),
      });
      if (!res.ok) return false;

      const body = await res.json();
        const { user: backendUser, token, accessToken, refreshToken } = body;
      const isSaas = backendUser.role === 'SAAS_OWNER' || backendUser.role === 'SAAS_ADMIN';
      const sessionUser: User = isSaas ? {
        ...backendUser,
        businessType: 'SaaS',
        location: 'Global',
        locationCount: 0,
        isPremium: true,
        unlockedTemplates: [1, 2, 3, 4, 5],
        role: backendUser.role === 'SAAS_OWNER' ? UserRole.SAAS_OWNER : UserRole.SAAS_ADMIN,
        pinEnabled: true,
        passwordEnabled: true,
        businesses: [],
        features: [],
      } : {
        ...backendUser,
        role: UserRole.SHOP_OWNER,
        locationCount: backendUser.locationCount ?? 1,
        permissions: backendUser.permissions || [],
        businesses: backendUser.businesses || [],
        features: backendUser.features || [],
      };

      localStorage.removeItem('bizora_preauth_token');
      setAuthTokens({ token, accessToken, refreshToken });
      setUser(sessionUser);
      localStorage.setItem('nexus_user', JSON.stringify(sessionUser));
      logActivity('Login 2FA', 'Auth', 'Completed 2FA verification');
      setPendingUser(null);
      return true;
    } catch (err) {
      console.warn('2FA verification failed:', err);
      return false;
    }
  };

  const signup = async (data: any): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: data.businessName,
          email: data.email,
          mobile: data.mobile,
          password: data.pin || data.password,
          businessType: data.businessType,
          location: data.location,
          name: data.name,
        }),
      });

      const body = await res.json();

      if (!res.ok) {
        const msg =
          body.error ||
          (res.status === 409
            ? "An account with this email or mobile already exists. Please log in."
            : "Could not create your account.");
        addNotification("Signup Failed", msg, "error");
        return { success: false, error: msg };
      }

      const { user: backendUser, token, accessToken, refreshToken } = body;
      setAuthTokens({ token, accessToken, refreshToken });

      const trialDefaults =
        typeof buildSignupTrialFields === 'function'
          ? buildSignupTrialFields(14)
          : {
              plan: 'Trial',
              subscriptionStatus: 'Trial',
              subscriptionRenewsAt: new Date(Date.now() + 14 * 864e5).toISOString(),
              subscriptionEnforce: true,
              trialLimits: { products: 5, customers: 3, buys: 5, sells: 10, expenses: 5, quickSales: 20 },
              trialUsage: { products: 0, customers: 0, buys: 0, sells: 0, expenses: 0, quickSales: 0 },
              trialStartedAt: new Date().toISOString(),
            };
      const sessionUser: User = {
        ...backendUser,
        role: UserRole.SHOP_OWNER,
        locationCount: parseInt(data.locationCount || '1'),
        permissions: getAllPermissions().filter(p => !p.startsWith('saas.')),
        businesses: [],
        features: backendUser.features || ['Single Store', 'Basic Reports'],
        plan: backendUser.plan || trialDefaults.plan,
        subscriptionStatus: backendUser.subscriptionStatus || trialDefaults.subscriptionStatus,
        subscriptionRenewsAt: backendUser.subscriptionRenewsAt || trialDefaults.subscriptionRenewsAt,
        subscriptionEnforce: backendUser.subscriptionEnforce ?? trialDefaults.subscriptionEnforce,
        trialLimits: backendUser.trialLimits || trialDefaults.trialLimits,
        trialUsage: backendUser.trialUsage || trialDefaults.trialUsage,
        trialStartedAt: backendUser.trialStartedAt || trialDefaults.trialStartedAt,
      };

      // Keep a lightweight local mirror (no password) so existing
      // Admin > Business Management views still see the account until
      // that screen is migrated to read from the backend directly.
      setRegisteredUsers(prev => [...prev, sessionUser]);

      setUser(sessionUser);
      localStorage.setItem('nexus_user', JSON.stringify(sessionUser));
      logActivity('Signup', 'Auth', 'Created new account');
      return { success: true };
    } catch (err) {
      console.error('Signup error:', err);
      addNotification("Signup Failed", "Could not reach the server. Please try again.", "error");
      return { success: false, error: 'network_error' };
    }
  };

  const socialLogin = async (provider: 'google' | 'facebook' | 'apple'): Promise<boolean> => {
    // Mock social login
    const result = await login('social-user@example.com', 'social', 'OTP');
    return result.success;
  };

  const logout = () => {
    logActivity('Logout', 'Auth');
    setUser(null);
    localStorage.removeItem('nexus_user');
    const rt = getRefreshToken();
    if (rt) {
      apiFetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(() => {});
    }
    clearAuthTokens();
  };

  const upgradeSubscription = () => {
    if (user) {
      const updatedUser = { ...user, isPremium: true };
      setUser(updatedUser);
      localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
      
      // Update registered users as well
      setRegisteredUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
      
      // Also update saas_users in localStorage for AdminPanel
      const savedSaasUsers = localStorage.getItem('saas_users');
      if (savedSaasUsers) {
        let saasUsers: any[] = [];
        try {
          saasUsers = JSON.parse(savedSaasUsers);
        } catch (e) {
          console.error("Error parsing saas_users:", e);
        }
        const updatedUsers = saasUsers.map((u: any) => u.id === user.id ? { ...u, isPremium: true, plan: 'Pro' } : u);
        localStorage.setItem('saas_users', JSON.stringify(updatedUsers));
      }
      
      logActivity('Upgrade', 'Subscription', 'Upgraded to Premium');
    }
  };

  const hashPin = async (pin: string): Promise<string> => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(pin);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
      let hash = 0;
      for (let i = 0; i < pin.length; i++) {
        const char = pin.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash;
      }
      return 'fallback-' + hash.toString(16);
    }
  };

  const customerSignup = async (data: { name: string; phone: string; pin: string; address?: string; photo?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch('/api/auth/customer-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) return { success: false, error: body.error || 'Could not create account.' };
      return { success: true };
    } catch (err) {
      console.warn('Customer backend signup unavailable, falling back to local registry:', err);
    }

    const rawCustomers = localStorage.getItem('bizora_saas_customers');
    let customersList: any[] = [];
    if (rawCustomers) {
      try { customersList = JSON.parse(rawCustomers); } catch (e) {}
    }

    const cleanPhone = data.phone.replace(/\D/g, '').replace(/^0+/, '');
    const exists = customersList.some((c: any) => c.phone.replace(/\D/g, '').replace(/^0+/, '') === cleanPhone);
    if (exists) {
      return { success: false, error: 'Customer already exists with this mobile number.' };
    }

    const pin_hash = await hashPin(data.pin);
    const newCustomer = {
      id: 'cust-' + Math.random().toString(36).substring(2, 7),
      phone: data.phone,
      name: data.name,
      photo: data.photo || '',
      address: data.address || '',
      pin_hash,
      phone_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    customersList.push(newCustomer);
    localStorage.setItem('bizora_saas_customers', JSON.stringify(customersList));
    return { success: true };
  };

  const customerLogin = async (phone: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch('/api/auth/customer-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, pin }),
      });
      if (res.ok) {
        const body = await res.json();
        const { customer, token, accessToken, refreshToken } = body;
        setAuthTokens({ token, accessToken, refreshToken });
        const customerUser: User = {
          id: customer.id,
          name: customer.name,
          businessName: 'Customer Portal',
          email: '',
          mobile: customer.phone,
          businessType: 'Customer',
          location: customer.address || 'Not Specified',
          locationCount: 0,
          isPremium: false,
          unlockedTemplates: [],
          role: UserRole.CUSTOMER,
          permissions: [],
          initialLoginDate: customer.createdAt || new Date().toISOString(),
          twoFactorEnabled: false,
          pinEnabled: true,
          passwordEnabled: false,
          businesses: [],
          features: [],
          avatar: customer.photo || ''
        };
        setUser(customerUser);
        localStorage.setItem('nexus_user', JSON.stringify(customerUser));
        logActivity('Customer Login', 'Auth', `Customer ${customer.name} logged in (backend-verified)`);
        return { success: true };
      }
    } catch (err) {
      console.warn('Customer backend login unavailable, falling back to local registry:', err);
    }

    const rawCustomers = localStorage.getItem('bizora_saas_customers');
    let customersList: any[] = [];
    if (rawCustomers) {
      try { customersList = JSON.parse(rawCustomers); } catch (e) {}
    }

    const cleanPhone = phone.replace(/\D/g, '').replace(/^0+/, '');
    const customer = customersList.find((c: any) => c.phone.replace(/\D/g, '').replace(/^0+/, '') === cleanPhone);
    if (!customer) {
      return { success: false, error: 'Customer not found.' };
    }

    const inputHash = await hashPin(pin);
    if (customer.pin_hash !== inputHash) {
      return { success: false, error: 'Invalid PIN.' };
    }

    const customerUser: User = {
      id: customer.id,
      name: customer.name,
      businessName: 'Customer Portal',
      email: '',
      mobile: customer.phone,
      businessType: 'Customer',
      location: customer.address || 'Not Specified',
      locationCount: 0,
      isPremium: false,
      unlockedTemplates: [],
      role: UserRole.CUSTOMER,
      permissions: [],
      initialLoginDate: customer.created_at,
      twoFactorEnabled: false,
      pinEnabled: true,
      passwordEnabled: false,
      businesses: [],
      features: [],
      avatar: customer.photo || ''
    };

    setUser(customerUser);
    localStorage.setItem('nexus_user', JSON.stringify(customerUser));
    logActivity('Customer Login', 'Auth', `Customer ${customer.name} logged in`);
    return { success: true };
  };

  const supplierLogin = async (mobile: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch('/api/auth/supplier-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, pin }),
      });
      if (res.ok) {
        const body = await res.json();
        const { supplier, token, accessToken, refreshToken } = body;
        setAuthTokens({ token, accessToken, refreshToken });
        const supplierUser: User = {
          id: supplier.mobile,
          name: supplier.name,
          businessName: 'Supplier Portal',
          email: supplier.email || '',
          mobile: supplier.mobile,
          businessType: 'Supplier',
          location: supplier.address || 'Not Specified',
          locationCount: 0,
          isPremium: false,
          unlockedTemplates: [],
          role: UserRole.SUPPLIER,
          permissions: [],
          initialLoginDate: supplier.createdAt || new Date().toISOString(),
          twoFactorEnabled: false,
          pinEnabled: true,
          passwordEnabled: false,
          businesses: [],
          features: [],
          avatar: supplier.logo || ''
        };
        setUser(supplierUser);
        localStorage.setItem('nexus_user', JSON.stringify(supplierUser));
        logActivity('Supplier Login', 'Auth', `Supplier ${supplier.name} logged in (backend-verified)`);
        return { success: true };
      }
    } catch (err) {
      console.warn('Supplier backend login unavailable, falling back to local registry:', err);
    }

    const rawGlobalSuppliers = localStorage.getItem('bizora_global_supplier_registry');
    let globalSuppliersList: any[] = [];
    if (rawGlobalSuppliers) {
        try { globalSuppliersList = JSON.parse(rawGlobalSuppliers); } catch (e) {}
    }

    const cleanMobile = mobile.replace(/\D/g, '').replace(/^0+/, '');
    const supplier = globalSuppliersList.find((s: any) => s.mobile.replace(/\D/g, '').replace(/^0+/, '') === cleanMobile);
    
    if (!supplier) {
      return { success: false, error: 'Supplier not found.' };
    }

    const inputHash = await hashPin(pin);
    if (supplier.pin && supplier.pin !== inputHash) {
      return { success: false, error: 'Invalid PIN.' };
    }

    const supplierUser: User = {
      id: supplier.mobile,
      name: supplier.name,
      businessName: 'Supplier Portal',
      email: supplier.email || '',
      mobile: supplier.mobile,
      businessType: 'Supplier',
      location: supplier.address || 'Not Specified',
      locationCount: 0,
      isPremium: false,
      unlockedTemplates: [],
      role: UserRole.SUPPLIER,
      permissions: [],
      initialLoginDate: supplier.createdAt,
      twoFactorEnabled: false,
      pinEnabled: true,
      passwordEnabled: false,
      businesses: [],
      features: [],
      avatar: supplier.logo || ''
    };

    setUser(supplierUser);
    localStorage.setItem('nexus_user', JSON.stringify(supplierUser));
    logActivity('Supplier Login', 'Auth', `Supplier ${supplier.name} logged in`);
    return { success: true };
  };

  const supplierSignup = async (data: { name: string; mobile: string; pin: string; companyName?: string; email?: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch('/api/auth/supplier-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) {
        return { success: false, error: body.error || 'Could not create supplier account.' };
      }
      logActivity('Supplier Signup', 'Auth', `New supplier registered: ${data.name}`);
      return { success: true };
    } catch (err) {
      console.warn('Supplier backend signup unavailable, falling back to local registry:', err);
    }

    const rawGlobalSuppliers = localStorage.getItem('bizora_global_supplier_registry');
    let globalSuppliersList: any[] = [];
    if (rawGlobalSuppliers) {
        try { globalSuppliersList = JSON.parse(rawGlobalSuppliers); } catch (e) {}
    }

    const cleanMobile = data.mobile.replace(/\D/g, '').replace(/^0+/, '');
    const exists = globalSuppliersList.some((s: any) => s.mobile.replace(/\D/g, '').replace(/^0+/, '') === cleanMobile);
    
    if (exists) {
      return { success: false, error: 'Supplier already exists with this mobile number.' };
    }

    const pin_hash = await hashPin(data.pin);
    const newSupplier = {
      id: 'sup-' + Math.random().toString(36).substring(2, 7),
      name: data.name,
      mobile: data.mobile,
      company: data.companyName || '',
      companyName: data.companyName || '',
      email: data.email || '',
      pin: pin_hash,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    globalSuppliersList.push(newSupplier);
    localStorage.setItem('bizora_global_supplier_registry', JSON.stringify(globalSuppliersList));
    logActivity('Supplier Signup', 'Auth', `New supplier registered: ${data.name}`);
    return { success: true };
  };

  const resetSupplierPin = async (mobile: string, otp: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch('/api/auth/supplier-reset-pin/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, otp, newPin: pin }),
      });
      const body = await res.json();
      if (res.ok) {
        logActivity('Supplier Reset PIN', 'Auth', `Supplier PIN reset for mobile: ${mobile}`);
        return { success: true };
      }
      return { success: false, error: body.error };
    } catch (err) {
      console.warn('Supplier reset-pin confirm failed:', err);
      return { success: false, error: 'Could not reach the server.' };
    }
  };

  const resetCustomerPin = async (phone: string, otp: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await apiFetch('/api/auth/customer-reset-pin/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp, newPin: pin }),
      });
      const body = await res.json();
      if (res.ok) return { success: true };
      return { success: false, error: body.error };
    } catch (err) {
      console.warn('Customer reset-pin confirm failed:', err);
      return { success: false, error: 'Could not reach the server.' };
    }
  };

  const refreshSessionFromServer = async () => {
    try {
      if (!hasAuthToken()) return;
      const res = await authFetch('/api/auth/me');
      if (!res.ok) {
        if (res.status === 401) {
          clearAuthTokens();
          localStorage.removeItem('nexus_user');
          setUser(null);
        }
        return;
      }
      const body = await res.json();
      const remote = body.user;
      if (!remote || !remote.id) return;
      setUser((prev) => {
        if (!prev || prev.id !== remote.id) return prev;
        // Merge subscription / trial fields from server (SaaS overrides)
        const merged = {
          ...prev,
          plan: remote.plan ?? prev.plan,
          subscriptionStatus: remote.subscriptionStatus ?? prev.subscriptionStatus,
          subscriptionRenewsAt: remote.subscriptionRenewsAt ?? prev.subscriptionRenewsAt,
          subscriptionEnforce: remote.subscriptionEnforce ?? prev.subscriptionEnforce,
          trialLimits: remote.trialLimits ?? prev.trialLimits,
          trialUsage: remote.trialUsage ?? prev.trialUsage,
          trialStartedAt: remote.trialStartedAt ?? prev.trialStartedAt,
          features: remote.features ?? prev.features,
          isPremium: remote.isPremium ?? prev.isPremium,
          accountStatus: remote.accountStatus ?? prev.accountStatus,
        };
        localStorage.setItem('nexus_user', JSON.stringify(merged));
        return merged;
      });
    } catch (e) {
      console.warn('refreshSessionFromServer failed', e);
    }
  };

  const updateUser = (data: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('nexus_user', JSON.stringify(updatedUser));

      // Mirror trial / subscription fields into registered users list
      if (user.role === UserRole.SHOP_OWNER || user.role === UserRole.ADMIN) {
        setRegisteredUsers(prev => {
          const idx = prev.findIndex(u => u.id === user.id);
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = { ...next[idx], ...data };
          return next;
        });
      }

      // Persist trial usage to backend when present (authFetch attaches bearer token)
      if (data.trialUsage && hasAuthToken()) {
        authFetch('/api/auth/trial-usage', {
          method: 'PATCH',
          body: JSON.stringify({
            trialUsage: data.trialUsage,
            ...(data.subscriptionStatus ? { subscriptionStatus: data.subscriptionStatus } : {}),
          }),
        }).catch(() => { /* offline ok */ });
      }

      logActivity('Update Profile', 'Settings');

      if (user.role === UserRole.CUSTOMER) {
        const rawCustomers = localStorage.getItem('bizora_saas_customers');
        let customersList: any[] = [];
        if (rawCustomers) {
          try { customersList = JSON.parse(rawCustomers); } catch (e) {}
        }
        const custIdx = customersList.findIndex((c: any) => c.id === user.id);
        if (custIdx !== -1) {
          if (data.name) customersList[custIdx].name = data.name;
          if (data.avatar) customersList[custIdx].photo = data.avatar;
          if (data.location) customersList[custIdx].address = data.location;
          customersList[custIdx].updated_at = new Date().toISOString();
          localStorage.setItem('bizora_saas_customers', JSON.stringify(customersList));
        }
      }
    }
  };

  const unlockTemplate = (templateId: number) => {
      if (user) {
          const unlocked = user.unlockedTemplates || [];
          if (!unlocked.includes(templateId)) {
              const updatedUser = { 
                  ...user, 
                  unlockedTemplates: [...unlocked, templateId] 
              };
              setUser(updatedUser);
              localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
          }
      }
  };

  const switchBusiness = (businessId: string) => {
    if (user && user.businesses) {
        const target = user.businesses.find(b => b.id === businessId);
        if (target) {
            const updatedUser = { 
                ...user, 
                businessName: target.name,
                businessType: target.type,
                location: target.location
            };
            setUser(updatedUser);
            localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
            logActivity('Switch Business', 'Auth', `Switched to ${target.name}`);
            // In a real app, this would trigger a reload of all data contexts
            window.location.reload(); 
        }
    }
  };

  const updateBusinessSettings = (businessId: string, settings: Partial<BusinessSettings>) => {
    if (user && user.businesses) {
        const updatedBusinesses = user.businesses.map(b => 
            b.id === businessId ? { ...b, settings: { ...b.settings, ...settings } } : b
        );
        updateUser({ businesses: updatedBusinesses });
        logActivity('Update Business Settings', 'Settings', `Business ID: ${businessId}`);
    }
  };

  const addBusiness = (businessData: Omit<Business, 'id'>) => {
    if (user) {
        const newBusiness: Business = {
            ...businessData,
            id: Math.random().toString(36).substring(2, 9),
            settings: {
                timezone: 'UTC',
                currency: 'USD',
                workingHours: {
                    monday: { open: '09:00', close: '17:00', closed: false },
                    tuesday: { open: '09:00', close: '17:00', closed: false },
                    wednesday: { open: '09:00', close: '17:00', closed: false },
                    thursday: { open: '09:00', close: '17:00', closed: false },
                    friday: { open: '09:00', close: '17:00', closed: false },
                    saturday: { open: '10:00', close: '14:00', closed: false },
                    sunday: { open: '00:00', close: '00:00', closed: true },
                }
            }
        };
        const updatedBusinesses = [...(user.businesses || []), newBusiness];
        updateUser({ businesses: updatedBusinesses });
        logActivity('Add Business', 'Auth', `Added ${newBusiness.name}`);
    }
  };

  const initiate2faSetup = async () => {
    try {
      const res = await authFetch('/api/auth/2fa/setup', { method: 'POST' });
      if (res.ok) {
        const { secret, otpauthUrl } = await res.json();
        const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;
        return { secret, qrCode };
      }
    } catch (err) {
      console.warn('2FA setup request failed:', err);
    }
    return { secret: '', qrCode: '' };
  };

  const verifyAndEnable2fa = async (otp: string): Promise<boolean> => {
    if (!user) return false;
    try {
      const res = await authFetch('/api/auth/2fa/enable', {
        method: 'POST',
        body: JSON.stringify({ otp }),
      });
      if (res.ok) {
        updateUser({ twoFactorEnabled: true });
        logActivity('Enable 2FA', 'Security', 'User verified and enabled 2FA');
        return true;
      }
    } catch (err) {
      console.warn('2FA enable failed:', err);
    }
    return false;
  };

  const disable2fa = async () => {
    if (user) {
        try {
          await authFetch('/api/auth/2fa/disable', { method: 'POST' });
        } catch (err) {
          console.warn('2FA disable request failed:', err);
        }
        updateUser({ twoFactorEnabled: false });
        logActivity('Disable 2FA', 'Security', 'User disabled 2FA');
    }
  };

  const terminateSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    logActivity('Terminate Session', 'Security', `Session ID: ${sessionId}`);
  };

  const removeDevice = (deviceId: string) => {
    setDevices(prev => prev.filter(d => d.id !== deviceId));
    logActivity('Remove Device', 'Security', `Device ID: ${deviceId}`);
  };

  const recoverAccount = async (identifier: string) => {
    try {
      const res = await apiFetch('/api/auth/reset-pin/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier }),
      });
      logActivity('Recovery Requested', 'Auth', `Recovery code requested for ${identifier}`);
      return res.ok;
    } catch (err) {
      console.warn('Recovery request failed:', err);
      return false;
    }
  };

  const resetPassword = async (identifier: string, otp: string, newPin: string) => {
      try {
        const res = await apiFetch('/api/auth/reset-pin/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, otp, newPin }),
        });
        if (res.ok) {
          logActivity('PIN Reset', 'Security', `PIN successfully reset for ${identifier}`);
          return true;
        }
        return false;
      } catch (err) {
        console.warn('Reset confirm failed:', err);
        return false;
      }
  };

  const verifyPassword = async (password: string): Promise<boolean> => {
    if (!user) return false;

    // Real backend re-auth (backend/src/api/auth.ts, POST
    // /api/auth/verify-password) - replaces what used to be hardcoded
    // SaaS Owner/Admin passwords shipped in this file's compiled JS.
    // Authoritative whenever reachable; only falls back to the local Shop
    // Owner check below if the backend can't be reached at all.
    if (hasAuthToken()) {
      try {
        const res = await authFetch('/api/auth/verify-password', {
          method: 'POST',
          body: JSON.stringify({ password }),
        });
        if (res.ok) {
          const { valid } = await res.json();
          return valid;
        }
      } catch (err) {
        console.warn('Backend password verification unavailable, falling back to local check:', err);
      }
    }

    // Shop Owner re-auth (accounts not yet migrated / offline fallback)
    const registeredUser = registeredUsers.find(u => u.id === user.id);
    if (registeredUser && (registeredUser as any).password === password) {
        return true;
    }

    return false;
  };

  const createSubUser = async (userData: Partial<User>) => {
    logActivity('Create Sub-User', 'User Management', `Name: ${userData.businessName}`);
    return true;
  };

  const deleteSubUser = (userId: string) => {
    logActivity('Delete Sub-User', 'User Management', `User ID: ${userId}`);
  };

  const deleteUser = (userId: string) => {
    setRegisteredUsers(prev => prev.filter(u => u.id !== userId));
    // Also remove from saas_users in localStorage if needed (AdminPanel uses that)
    const savedSaasUsers = localStorage.getItem('saas_users');
    if (savedSaasUsers) {
      const saasUsers = JSON.parse(savedSaasUsers);
      const updatedUsers = saasUsers.filter((u: any) => u.id !== userId);
      localStorage.setItem('saas_users', JSON.stringify(updatedUsers));
    }
    logActivity('Delete Shop/User', 'Admin', `Deleted User/Shop ID: ${userId}`);
  };

  const updateRegisteredUser = (userId: string, data: Partial<User>) => {
    // Derive isPremium if plan is changed in data
    const isPremium = data.plan ? (data.plan === 'Enterprise' || data.plan === 'Nexus Pro' || data.plan === 'Pro') : data.isPremium;
    const updatedData = { ...data, isPremium };

    setRegisteredUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updatedData } : u));
    
    // If the updated user is the currently logged-in user, update their session too
    if (user && user.id === userId) {
      const updatedUser = { ...user, ...updatedData };
      setUser(updatedUser);
      localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
    }
    
    logActivity('Update User', 'Admin', `Updated User ID: ${userId}`);
  };

  const createSaaSRequest = async (requestData: Omit<SaaSRequest, 'id' | 'date' | 'status' | 'userId' | 'userName' | 'businessName'> & { plan?: string; planId?: string; billingCycle?: 'monthly' | 'yearly'; currency?: string; paymentMethod?: string; paymentReference?: string; note?: string }) => {
    if (!user) return;
    const plan = requestData.plan || (requestData as any)?.details?.plan || 'Pro';
    const planId = requestData.planId || (requestData as any)?.details?.planId || String(plan).toLowerCase();
    const amount = Number(requestData.amount ?? (requestData as any)?.details?.amount ?? 0);
    const currency = requestData.currency || (requestData as any)?.details?.currency || 'BDT';
    const billingCycle = requestData.billingCycle || (requestData as any)?.details?.billingCycle || 'monthly';
    const paymentMethod = requestData.paymentMethod || (requestData as any)?.details?.paymentMethod || 'Manual';
    const paymentReference = requestData.paymentReference || (requestData as any)?.details?.paymentReference || '';
    const note = requestData.note || (requestData as any)?.details?.note || '';

    const optimistic: SaaSRequest = {
      ...requestData,
      id: 'req-local-' + Date.now(),
      userId: user.id,
      userName: user.name || user.businessName,
      businessName: user.businessName,
      status: 'pending',
      date: new Date().toISOString().split('T')[0],
      plan,
      planId,
      amount,
      currency,
      billingCycle: billingCycle as 'monthly' | 'yearly',
      paymentMethod,
      paymentReference,
      details: {
        ...(requestData.details || {}),
        plan,
        planId,
        amount,
        currency,
        billingCycle,
        paymentMethod,
        paymentReference,
      },
    } as SaaSRequest;
    setSaasRequests(prev => [optimistic, ...prev]);
    try {
      const res = await authFetch('/api/plan-requests', {
        method: 'POST',
        body: JSON.stringify({
          plan,
          planId,
          amount,
          currency,
          billingCycle,
          paymentMethod,
          paymentReference,
          note,
          details: optimistic.details,
          type: requestData.type || 'subscription',
        }),
      });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        addNotification?.('Pending request', body.error || 'Already have a pending request', 'warning');
        await refreshSaasRequests();
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      if (body?.request) {
        setSaasRequests(prev => {
          const withoutOpt = prev.filter(r => r.id !== optimistic.id);
          const req = body.request;
          return [{
            ...req,
            plan: req.plan || plan,
            planId: req.planId || planId,
            amount: Number(req.amount ?? amount),
            currency: req.currency || currency,
            billingCycle: req.billingCycle || billingCycle,
            paymentMethod: req.paymentMethod || paymentMethod,
            paymentReference: req.paymentReference || paymentReference,
            details: req.details || optimistic.details,
            date: (req.createdAt || '').slice(0, 10),
            type: req.type || 'subscription',
            status: req.status || 'pending',
          }, ...withoutOpt];
        });
      }
      logActivity('SaaS Request', 'Billing', `Requested plan: ${plan} (${currency} ${amount}/${billingCycle})`);
      addNotification?.('Request sent', `Upgrade to ${plan} (${currency} ${amount}) is pending admin approval`, 'success');
    } catch (e) {
      console.warn('createSaaSRequest server failed, kept local', e);
      logActivity('SaaS Request', 'Billing', `Requested ${requestData.type}: ${JSON.stringify(requestData.details)} (local)`);
    }
  };

  const approveSaaSRequest = async (requestId: string, options?: { markPaid?: boolean; paymentMethod?: string; paymentReference?: string; note?: string }) => {
    const request = saasRequests.find(r => r.id === requestId);
    if (!request) return;

    setSaasRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved', paymentStatus: 'Paid' } : r));
    try {
      if (hasAuthToken() && !String(requestId).startsWith('req-local-')) {
        const res = await authFetch(`/api/plan-requests/${requestId}/approve`, {
          method: 'POST',
          body: JSON.stringify({
            markPaid: options?.markPaid !== false,
            paymentMethod: options?.paymentMethod,
            paymentReference: options?.paymentReference,
            note: options?.note,
          }),
        });
        if (!res.ok) console.warn('approve API', res.status);
        else await refreshSaasRequests();
      }
    } catch (e) {
      console.warn('approveSaaSRequest API', e);
    }
    
    if (request.type === 'subscription') {
      const requestedPlan = request.details?.plan || 'Nexus Pro';
      const isEnt = requestedPlan === 'Enterprise';
      const isPro = requestedPlan === 'Nexus Pro' || requestedPlan === 'Pro';
      
      const updatedFields: Partial<User> = {
        plan: requestedPlan,
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

      // 1. Update in registeredUsers list (source of truth database)
      setRegisteredUsers(prev => prev.map(u => u.id === request.userId ? { ...u, ...updatedFields } : u));

      // 2. Update saas_users in localStorage for AdminPanel to show updated values immediately!
      const savedSaasUsers = localStorage.getItem('saas_users');
      if (savedSaasUsers) {
        try {
          const saasUsers = JSON.parse(savedSaasUsers);
          const updatedUsers = saasUsers.map((u: any) => {
            if (u.id === request.userId) {
              return { ...u, ...updatedFields };
            }
            return u;
          });
          localStorage.setItem('saas_users', JSON.stringify(updatedUsers));
        } catch (e) {
          console.error("Error updating saas_users in approveSaaSRequest:", e);
        }
      }

      // 3. If the currently logged-in user is the one whose request is approved, update their session too
      if (user && user.id === request.userId) {
        const updatedUser = { ...user, ...updatedFields };
        setUser(updatedUser);
        localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
      }
    } else if (request.type === 'template') {
      const templateId = request.details?.templateId;
      if (templateId) {
        setRegisteredUsers(prev => prev.map(u => {
          if (u.id === request.userId) {
            const unlocked = u.unlockedTemplates || [];
            if (!unlocked.includes(templateId)) {
              return { ...u, unlockedTemplates: [...unlocked, templateId] };
            }
          }
          return u;
        }));

        const savedSaasUsers = localStorage.getItem('saas_users');
        if (savedSaasUsers) {
          try {
            const saasUsers = JSON.parse(savedSaasUsers);
            const updatedUsers = saasUsers.map((u: any) => {
              if (u.id === request.userId) {
                const unlocked = u.unlockedTemplates || [];
                if (!unlocked.includes(templateId)) {
                  return { ...u, unlockedTemplates: [...unlocked, templateId] };
                }
              }
              return u;
            });
            localStorage.setItem('saas_users', JSON.stringify(updatedUsers));
          } catch (e) {
            console.error("Error updating saas_users for template unlock:", e);
          }
        }

        if (user && user.id === request.userId) {
          const unlocked = user.unlockedTemplates || [];
          if (!unlocked.includes(templateId)) {
            const updatedUser = { ...user, unlockedTemplates: [...unlocked, templateId] };
            setUser(updatedUser);
            localStorage.setItem('nexus_user', JSON.stringify(updatedUser));
          }
        }
      }
    }
    
    logActivity('Approve Request', 'Admin', `Approved ${request.type} for ${request.businessName}`);
  };

  const rejectSaaSRequest = async (requestId: string, options?: { reason?: string }) => {
    setSaasRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
    try {
      if (hasAuthToken() && !String(requestId).startsWith('req-local-')) {
        await authFetch(`/api/plan-requests/${requestId}/reject`, {
          method: 'POST',
          body: JSON.stringify({ reason: options?.reason || 'Rejected by administrator' }),
        });
        await refreshSaasRequests();
      }
    } catch (e) {
      console.warn('rejectSaaSRequest API', e);
    }
    logActivity('Reject Request', 'Admin', `Rejected request ${requestId}`);
  };

    const impersonateUser = async (shop: any) => {
    if (!user || user.isImpersonated) return;
    const reason = typeof window !== 'undefined'
      ? (window.prompt('Support reason for Login-As (required, min 5 chars):', '') || '').trim()
      : '';
    if (reason.length < 5) {
      addNotification('Impersonation blocked', 'A support reason is required.', 'error');
      return;
    }

    localStorage.setItem('nexus_original_saas_user', JSON.stringify(user));
    const saasAccess = localStorage.getItem('bizora_token');
    const saasRefresh = localStorage.getItem('bizora_refresh_token');
    if (saasAccess) localStorage.setItem('bizora_saas_token_backup', saasAccess);
    if (saasRefresh) localStorage.setItem('bizora_saas_refresh_backup', saasRefresh);
    localStorage.setItem('bizora_impersonate_reason', reason);
    localStorage.setItem('bizora_impersonate_started_at', new Date().toISOString());
    localStorage.setItem('bizora_impersonating', '1');

    try {
      const res = await apiFetch('/api/admin/impersonate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${saasAccess || ''}`,
        },
        body: JSON.stringify({ businessId: shop.id, reason }),
      });
      if (res.ok) {
        const body = await res.json();
        setAuthTokens({ token: body.accessToken || body.token, accessToken: body.accessToken || body.token });
        const shopUser: User = {
          id: body.user.id,
          name: body.user.name || shop.owner || body.user.businessName,
          businessName: body.user.businessName,
          email: body.user.email || shop.email,
          mobile: body.user.mobile || shop.mobile,
          businessType: body.user.businessType || shop.businessType || 'Retail',
          location: shop.address || shop.location || 'Not Specified',
          locationCount: shop.totalStores || 1,
          isPremium: !!body.user.isPremium,
          unlockedTemplates: [1, 2, 3, 4, 5],
          role: UserRole.SHOP_OWNER,
          permissions: getAllPermissions().filter(p => !p.startsWith('saas.')),
          initialLoginDate: shop.signupDate || new Date().toISOString(),
          twoFactorEnabled: false,
          pinEnabled: true,
          passwordEnabled: true,
          businesses: [{ id: body.user.id, name: body.user.businessName, type: body.user.businessType || 'Retail', location: shop.address || '' }],
          features: body.user.features || shop.features || ['Single Store', 'Basic Reports'],
          isImpersonated: true,
          storageLimit: shop.storageLimit || 500,
          employeeLimit: shop.employeeLimit || 5,
          branchLimit: shop.branchLimit || 1,
          enabledFeatures: body.user.enabledFeatures || body.user.features || shop.enabledFeatures || [],
        };
        setUser(shopUser);
        localStorage.setItem('nexus_user', JSON.stringify(shopUser));
        logActivity('Impersonate login', 'Admin', `Impersonated "${shop.businessName}" — ${reason}`);
        addNotification('Login-As active', `Viewing ${shop.businessName}. Session is time-limited.`, 'warning');
        return;
      }
      const errBody = await res.json().catch(() => ({}));
      addNotification('Impersonation failed', errBody.error || res.statusText, 'error');
      console.warn('Impersonate API failed', errBody);
      // Do not fall back to local-only in production-like flows — keep SaaS session
      localStorage.removeItem('nexus_original_saas_user');
      localStorage.removeItem('bizora_impersonate_reason');
      return;
    } catch (e) {
      console.warn('Impersonate API unavailable', e);
      addNotification('Impersonation failed', 'Could not reach server.', 'error');
      localStorage.removeItem('nexus_original_saas_user');
      localStorage.removeItem('bizora_impersonate_reason');
      return;
    }
  };

  const exitImpersonation = async () => {
    const savedOriginal = localStorage.getItem('nexus_original_saas_user');
    const businessId = user?.id;
    const reason = localStorage.getItem('bizora_impersonate_reason') || '';
    const shopToken = localStorage.getItem('bizora_token');
    try {
      await apiFetch('/api/admin/impersonate/exit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${shopToken || ''}` },
        body: JSON.stringify({ businessId, reason }),
      });
    } catch { /* offline ok */ }

    // Always restore SaaS tokens FIRST so admin tab never keeps shop JWT
    const saasTok = localStorage.getItem('bizora_saas_token_backup');
    const saasRef = localStorage.getItem('bizora_saas_refresh_backup');
    if (saasTok) {
      setAuthTokens({ token: saasTok, accessToken: saasTok, refreshToken: saasRef || undefined });
      localStorage.setItem('bizora_token', saasTok);
      localStorage.setItem('bizora_access_token', saasTok);
      if (saasRef) localStorage.setItem('bizora_refresh_token', saasRef);
      localStorage.removeItem('bizora_saas_token_backup');
      localStorage.removeItem('bizora_saas_refresh_backup');
    }

    if (savedOriginal) {
      try {
        const originalUser = JSON.parse(savedOriginal);
        setUser({ ...originalUser, isImpersonated: false });
        localStorage.setItem('nexus_user', JSON.stringify({ ...originalUser, isImpersonated: false }));
      } catch (e) {
        console.error("Error parsing nexus_original_saas_user:", e);
      }
      localStorage.removeItem('nexus_original_saas_user');
    } else if (user?.isImpersonated) {
      // No backup user — clear shop session rather than leave half state
      setUser(null);
      localStorage.removeItem('nexus_user');
    }

    localStorage.removeItem('bizora_impersonate_reason');
    localStorage.removeItem('bizora_impersonate_started_at');
    localStorage.removeItem('bizora_impersonating');
    logActivity('Impersonate exit', 'Admin', `Exited impersonation session.`);
    try { ensureRealtimeSocket(); } catch { /* */ }
  };

  const hasFeature = (feature: string) => {
    if (!user) return false;
    if (user.role === UserRole.SAAS_OWNER || user.role === UserRole.SAAS_ADMIN) return true;
    const userFeatureList = Array.isArray(user.features)
      ? user.features
      : Array.isArray((user as any).enabledFeatures)
      ? (user as any).enabledFeatures
      : [];
    const userModuleList = Array.isArray((user as any).modules) ? (user as any).modules : [];
    return isFeatureEnabled(feature, userFeatureList, userModuleList);
  };

  return (
    <AuthContext.Provider value={{ 
        user, 
        isAuthenticated: !!user, 
        sessions,
        loginHistory,
        activityLogs,
        devices,
        hasFeature,
        login, 
        signup, 
        socialLogin,
        complete2fa,
        logout, 
        upgradeSubscription, 
        updateUser, 
        unlockTemplate,
        switchBusiness,
        updateBusinessSettings,
        addBusiness,
        initiate2faSetup,
        verifyAndEnable2fa,
        disable2fa,
        terminateSession,
        removeDevice,
        recoverAccount,
        resetPassword,
        verifyPassword,
        logActivity,
        createSubUser,
        deleteSubUser,
        deleteUser,
        updateRegisteredUser,
        saasRequests,
        refreshSaasRequests,
        createSaaSRequest,
        approveSaaSRequest,
        rejectSaaSRequest,
        impersonateUser,
        exitImpersonation,
        registeredUsers,
        customerLogin,
        customerSignup,
        resetCustomerPin,
        supplierLogin,
        supplierSignup,
        resetSupplierPin,
        signInWithGoogleAuth,
        sendPhoneOtpCode,
        confirmPhoneOtpCode,
        registerWithEmailOtp,
        reloadEmailVerification,
        resendEmailVerificationLink,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

/** Safe when provider order is wrong or nested outside Auth (e.g. StoreProvider bootstrap). */
export const useAuthOptional = () => useContext(AuthContext);
