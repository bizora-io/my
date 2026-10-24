import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { apiFetch, getAdminPortalUrl } from '../lib/apiClient';
import {
  Lock,
  Mail,
  Phone,
  MapPin,
  Building2,
  Store,
  Hash,
  ArrowRight,
  Loader2,
  MessageSquare,
  Shield,
  Zap,
  Globe,
  UserCircle,
  Users,
  ShoppingBag,
  Sparkles,
  Check,
  CheckCircle2,
  Sun,
  Moon,
  ChevronDown,
} from 'lucide-react';
import { appVersionLabel } from '../lib/appVersion';
import './AuthDesign.css';

// Comprehensive Country Code Directory with ISO, Codes, and Validation Regexes
export interface CountryItem {
  code: string;
  name: string;
  iso: string;
  regex?: RegExp;
}

const COUNTRY_LIST: CountryItem[] = [
  { code: '+880', name: 'Bangladesh', iso: 'BD', regex: /^0?1[3-9]\d{8}$/ },
  { code: '+1', name: 'United States', iso: 'US', regex: /^\d{10}$/ },
  { code: '+44', name: 'United Kingdom', iso: 'GB', regex: /^\d{10}$/ },
  { code: '+91', name: 'India', iso: 'IN', regex: /^\d{10}$/ },
  { code: '+971', name: 'United Arab Emirates', iso: 'AE', regex: /^\d{9}$/ },
  { code: '+966', name: 'Saudi Arabia', iso: 'SA', regex: /^\d{9}$/ },
  { code: '+65', name: 'Singapore', iso: 'SG', regex: /^\d{8}$/ },
  { code: '+60', name: 'Malaysia', iso: 'MY', regex: /^\d{9,10}$/ },
  { code: '+1', name: 'Canada', iso: 'CA', regex: /^\d{10}$/ },
  { code: '+61', name: 'Australia', iso: 'AU', regex: /^\d{9}$/ },
  { code: '+49', name: 'Germany', iso: 'DE', regex: /^\d{10,11}$/ },
  { code: '+33', name: 'France', iso: 'FR', regex: /^\d{9}$/ },
  { code: '+39', name: 'Italy', iso: 'IT', regex: /^\d{10}$/ },
  { code: '+34', name: 'Spain', iso: 'ES', regex: /^\d{9}$/ },
  { code: '+81', name: 'Japan', iso: 'JP', regex: /^\d{10}$/ },
  { code: '+82', name: 'South Korea', iso: 'KR', regex: /^\d{9,10}$/ },
  { code: '+86', name: 'China', iso: 'CN', regex: /^\d{11}$/ },
  { code: '+92', name: 'Pakistan', iso: 'PK', regex: /^\d{10}$/ },
  { code: '+977', name: 'Nepal', iso: 'NP', regex: /^\d{10}$/ },
  { code: '+94', name: 'Sri Lanka', iso: 'LK', regex: /^\d{9}$/ },
  { code: '+62', name: 'Indonesia', iso: 'ID', regex: /^\d{9,12}$/ },
  { code: '+63', name: 'Philippines', iso: 'PH', regex: /^\d{10}$/ },
  { code: '+66', name: 'Thailand', iso: 'TH', regex: /^\d{9}$/ },
  { code: '+84', name: 'Vietnam', iso: 'VN', regex: /^\d{9,10}$/ },
  { code: '+90', name: 'Turkey', iso: 'TR', regex: /^\d{10}$/ },
  { code: '+20', name: 'Egypt', iso: 'EG', regex: /^\d{10,11}$/ },
  { code: '+27', name: 'South Africa', iso: 'ZA', regex: /^\d{9}$/ },
  { code: '+234', name: 'Nigeria', iso: 'NG', regex: /^\d{10}$/ },
  { code: '+254', name: 'Kenya', iso: 'KE', regex: /^\d{9}$/ },
  { code: '+974', name: 'Qatar', iso: 'QA', regex: /^\d{8}$/ },
  { code: '+965', name: 'Kuwait', iso: 'KW', regex: /^\d{8}$/ },
  { code: '+968', name: 'Oman', iso: 'OM', regex: /^\d{8}$/ },
  { code: '+973', name: 'Bahrain', iso: 'BH', regex: /^\d{8}$/ },
  { code: '+31', name: 'Netherlands', iso: 'NL', regex: /^\d{9}$/ },
  { code: '+41', name: 'Switzerland', iso: 'CH', regex: /^\d{9}$/ },
  { code: '+46', name: 'Sweden', iso: 'SE', regex: /^\d{9}$/ },
  { code: '+47', name: 'Norway', iso: 'NO', regex: /^\d{8}$/ },
  { code: '+45', name: 'Denmark', iso: 'DK', regex: /^\d{8}$/ },
  { code: '+358', name: 'Finland', iso: 'FI', regex: /^\d{5,12}$/ },
  { code: '+353', name: 'Ireland', iso: 'IE', regex: /^\d{9}$/ },
  { code: '+32', name: 'Belgium', iso: 'BE', regex: /^\d{9}$/ },
  { code: '+43', name: 'Austria', iso: 'AT', regex: /^\d{10,13}$/ },
  { code: '+48', name: 'Poland', iso: 'PL', regex: /^\d{9}$/ },
  { code: '+55', name: 'Brazil', iso: 'BR', regex: /^\d{10,11}$/ },
  { code: '+52', name: 'Mexico', iso: 'MX', regex: /^\d{10}$/ },
  { code: '+54', name: 'Argentina', iso: 'AR', regex: /^\d{10,11}$/ },
  { code: '+56', name: 'Chile', iso: 'CL', regex: /^\d{9}$/ },
  { code: '+57', name: 'Colombia', iso: 'CO', regex: /^\d{10}$/ },
  { code: '+64', name: 'New Zealand', iso: 'NZ', regex: /^\d{8,10}$/ },
  { code: '+351', name: 'Portugal', iso: 'PT', regex: /^\d{9}$/ },
  { code: '+30', name: 'Greece', iso: 'GR', regex: /^\d{10}$/ },
  { code: '+36', name: 'Hungary', iso: 'HU', regex: /^\d{9}$/ },
  { code: '+420', name: 'Czech Republic', iso: 'CZ', regex: /^\d{9}$/ },
  { code: '+40', name: 'Romania', iso: 'RO', regex: /^\d{9,10}$/ },
  { code: '+962', name: 'Jordan', iso: 'JO', regex: /^\d{9}$/ },
  { code: '+961', name: 'Lebanon', iso: 'LB', regex: /^\d{7,8}$/ },
  { code: '+964', name: 'Iraq', iso: 'IQ', regex: /^\d{10}$/ },
  { code: '+93', name: 'Afghanistan', iso: 'AF', regex: /^\d{9}$/ },
  { code: '+213', name: 'Algeria', iso: 'DZ', regex: /^\d{9,10}$/ },
  { code: '+212', name: 'Morocco', iso: 'MA', regex: /^\d{9}$/ },
  { code: '+216', name: 'Tunisia', iso: 'TN', regex: /^\d{8}$/ },
];

export interface AuthProps {
  initialRole?: 'business' | 'employee' | 'customer' | 'supplier';
  portalMode?: 'shop' | 'employee' | 'customer' | 'admin';
  lockRole?: boolean;
}

export const Auth: React.FC<AuthProps> = ({ initialRole, portalMode, lockRole = false }) => {
  const {
    login,
    signup,
    complete2fa,
    recoverAccount,
    resetPassword,
    customerLogin,
    supplierLogin,
    signInWithGoogleAuth,
    sendPhoneOtpCode,
  } = useAuth();
  const { t } = useSettings();

  // Mode: Sign In vs Sign Up (toggles the smooth sliding overlay)
  const [isSignupView, setIsSignupView] = useState(false);
  const [loading, setLoading] = useState(false);
  const [btnSuccess, setBtnSuccess] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('email');

  // Multi-step Shop Owner Signup: Step 1 (Owner info), Step 2 (Shop info), Step 3 (OTP verification)
  const [signupStep, setSignupStep] = useState<1 | 2 | 3>(1);

  // Field validation flags
  const [badFields, setBadFields] = useState<Record<string, boolean>>({});

  // Sub-flows
  const [is2faStep, setIs2faStep] = useState(false);
  const [isRecoveryStep, setIsRecoveryStep] = useState(false);
  const [recoveryVerificationStep, setRecoveryVerificationStep] = useState(false);
  const [phoneConfirmation, setPhoneConfirmation] = useState<any>(null);
  const [otpDeliveryNotice, setOtpDeliveryNotice] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  // Password / PIN visibility toggles
  const [showLoginPin, setShowLoginPin] = useState(false);
  const [showSignupPin, setShowSignupPin] = useState(false);

  // Theme toggle state
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bizora_theme');
      if (saved) return saved === 'dark';
      return (
        document.documentElement.getAttribute('data-theme') === 'dark' ||
        window.matchMedia('(prefers-color-scheme: dark)').matches
      );
    }
    return false;
  });

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', next ? 'dark' : 'light');
      localStorage.setItem('bizora_theme', next ? 'dark' : 'light');
    }
  };

  // Role management
  const resolvedInitialRole =
    initialRole ||
    (portalMode === 'employee' ? 'employee' : portalMode === 'customer' ? 'customer' : 'business');
  const [authRole, setAuthRole] = useState<'business' | 'employee' | 'customer' | 'supplier'>(
    resolvedInitialRole
  );

  useEffect(() => {
    if (initialRole) {
      setAuthRole(initialRole);
    } else if (portalMode === 'employee') {
      setAuthRole('employee');
    } else if (portalMode === 'customer') {
      setAuthRole('customer');
    } else if (portalMode === 'shop') {
      setAuthRole('business');
    }
  }, [initialRole, portalMode]);

  // Country Code Picker
  const [selectedCountry, setSelectedCountry] = useState<CountryItem>(COUNTRY_LIST[0]);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const countryMenuRef = useRef<HTMLDivElement>(null);
  const ccBtnRef = useRef<HTMLButtonElement>(null);

  // Close country dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        countryMenuRef.current &&
        !countryMenuRef.current.contains(e.target as Node) &&
        ccBtnRef.current &&
        !ccBtnRef.current.contains(e.target as Node)
      ) {
        setCountryMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCountryMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Login Form State
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [loginOtp, setLoginOtp] = useState('');

  // Recovery State
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [newPin, setNewPin] = useState('');

  // Shop Owner Signup State
  const [ownerName, setOwnerName] = useState('');
  const [signupData, setSignupData] = useState({
    businessName: '',
    locationCount: 1,
    businessType: 'Retail',
    location: '',
    mobile: '',
    email: '',
    pin: '',
  });
  const [otp, setOtp] = useState('');

  // Customer State
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPin, setCustomerPin] = useState('');

  // Supplier State
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierPin, setSupplierPin] = useState('');

  // Live Overlay Interactive Animations
  const [liveRevenue, setLiveRevenue] = useState('$128,430');
  const [toastMessage, setToastMessage] = useState({ title: 'New order', subtitle: '#1048, $2,340' });
  const cardRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Revenue count-up animation
  useEffect(() => {
    const isReduced =
      typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) {
      setLiveRevenue('$128,430');
      return;
    }
    const target = 128430;
    const runCount = () => {
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min((now - start) / 1800, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setLiveRevenue('$' + Math.round(target * ease).toLocaleString('en-US'));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    runCount();
    const interval = setInterval(runCount, 8000);
    return () => clearInterval(interval);
  }, []);

  // Cycling real-time live toasts
  useEffect(() => {
    const toasts = [
      { title: 'New order', subtitle: '#1048, $2,340' },
      { title: 'Invoice paid', subtitle: '#3021, $860' },
      { title: 'Low stock', subtitle: 'SKU-204, 12 left' },
      { title: 'Payroll', subtitle: 'Run completed' },
      { title: 'New order', subtitle: '#1049, $1,120' },
    ];
    let idx = 0;
    const tInterval = setInterval(() => {
      idx = (idx + 1) % toasts.length;
      setToastMessage(toasts[idx]);
    }, 6000);
    return () => clearInterval(tInterval);
  }, []);

  // Parallax cursor effect on desktop overlay
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!cardRef.current || !overlayRef.current) return;
    const r = cardRef.current.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width - 0.5).toFixed(3);
    const my = ((e.clientY - r.top) / r.height - 0.5).toFixed(3);
    overlayRef.current.style.setProperty('--mx', mx);
    overlayRef.current.style.setProperty('--my', my);
  };

  const handlePointerLeave = () => {
    if (!overlayRef.current) return;
    overlayRef.current.style.setProperty('--mx', '0');
    overlayRef.current.style.setProperty('--my', '0');
  };

  // Google OAuth Handler
  const handleGoogleSignIn = async () => {
    if (!signInWithGoogleAuth) return;
    setLoading(true);
    setLoginError('');
    try {
      const target =
        authRole === 'employee' ? 'EMPLOYEE' : authRole === 'customer' ? 'CUSTOMER' : 'SHOP_OWNER';
      const res = await signInWithGoogleAuth(target);
      if (!res.success) {
        setLoginError(res.error || 'Google Sign-In was cancelled or failed.');
      } else {
        setBtnSuccess(true);
      }
    } catch (err: any) {
      if (err?.code === 'auth/unauthorized-domain' || err?.message?.includes('unauthorized-domain')) {
        setLoginError(
          `Firebase Error: Current domain "${typeof window !== 'undefined' ? window.location.hostname : ''}" is not authorized. Please navigate to https://bizora-app-io.vercel.app or add this domain in Firebase Console > Authentication > Settings > Authorized domains.`
        );
      } else if (err?.code === 'auth/popup-closed-by-user') {
        setLoginError('Google Sign-In popup was closed before completing authorization.');
      } else {
        setLoginError(err?.message || 'Google Sign-In failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const newBad: Record<string, boolean> = {};

    if (!identifier.trim()) newBad.identifier = true;
    if (!pin.trim()) newBad.pin = true;

    if (Object.keys(newBad).length > 0) {
      setBadFields(newBad);
      setLoginError(
        loginMethod === 'phone'
          ? 'Enter your mobile number / ID and PIN.'
          : 'Enter your work email and PIN.'
      );
      return;
    }

    setLoading(true);
    try {
      const method =
        loginMethod === 'phone' && pin.trim().length <= 6 && /^\d+$/.test(pin.trim())
          ? 'PIN'
          : 'PASSWORD';

      // Combine with country code if phone method and no plus sign
      const finalIdentifier =
        loginMethod === 'phone' && !identifier.trim().startsWith('+')
          ? `${selectedCountry.code}${identifier.trim().replace(/^0+/, '')}`
          : identifier.trim();

      const result = await login(finalIdentifier, pin, method, {
        allowSaas: false,
        targetRole: authRole,
      });

      if (result.success) {
        if (result.require2fa) {
          setIs2faStep(true);
        } else {
          setBtnSuccess(true);
        }
      } else {
        const code = result.error || 'invalid_credentials';
        if (code === 'saas_portal_only') {
          setLoginError('SaaS accounts must sign in at the Admin portal only.');
        } else if (code === 'empty_fields') {
          setLoginError('Email/phone and password/PIN are required.');
        } else if (code === 'network_error') {
          setLoginError('Could not reach the server. Check your connection.');
        } else if (code === 'suspended') {
          setLoginError('This account is suspended. Contact support.');
        } else if (code === 'rate_limited') {
          const sec = result.retryAfterSec || 900;
          const min = Math.ceil(sec / 60);
          setLoginError(`Too many failed attempts. Try again in ${min} minute(s).`);
        } else {
          const left = result.remainingAttempts;
          const base =
            loginMethod === 'phone' ? 'Invalid phone / ID or PIN.' : 'Invalid email or PIN.';
          setLoginError(
            typeof left === 'number' && left >= 0
              ? `${base} ${left} attempt${left === 1 ? '' : 's'} remaining.`
              : `${base} Please try again.`
          );
        }
      }
    } catch {
      setLoginError('Login failed unexpectedly. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 2FA Login
  const handle2faLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginOtp.trim()) {
      setLoginError('Enter the 2FA code from your authenticator.');
      return;
    }
    setLoading(true);
    try {
      const success = await complete2fa(loginOtp);
      if (!success) {
        setLoginError('Invalid or expired 2FA code. Please try again.');
      } else {
        setBtnSuccess(true);
      }
    } catch {
      setLoginError('Could not verify 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 1 Validation -> Proceed to Step 2
  const handleSignupStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    const newBad: Record<string, boolean> = {};

    if (!ownerName.trim()) newBad.ownerName = true;
    if (!signupData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(signupData.email)) {
      newBad.email = true;
    }
    const cleanMobile = signupData.mobile.replace(/\D/g, '').replace(/^0+/, '');
    if (!cleanMobile || (selectedCountry.regex && !selectedCountry.regex.test(cleanMobile))) {
      newBad.mobile = true;
    }

    if (Object.keys(newBad).length > 0) {
      setBadFields(newBad);
      return;
    }

    setBadFields({});
    setSignupStep(2);
  };

  // Step 2 Submission -> Trigger OTP Verification
  const handleSignupStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newBad: Record<string, boolean> = {};

    if (!signupData.businessName.trim()) newBad.businessName = true;
    if (!signupData.location.trim()) newBad.location = true;
    if (!signupData.pin.trim() || signupData.pin.length < 4 || signupData.pin.length > 6) {
      newBad.signupPin = true;
    }

    if (Object.keys(newBad).length > 0) {
      setBadFields(newBad);
      return;
    }

    setBadFields({});
    setLoading(true);
    setOtpDeliveryNotice(null);

    const cleanMobile = signupData.mobile.replace(/\D/g, '').replace(/^0+/, '');
    const fullMobile = `${selectedCountry.code}${cleanMobile}`;

    // 1. Attempt Firebase Phone Authentication first (SMS OTP directly via Firebase)
    if (sendPhoneOtpCode) {
      try {
        const confirmation = await sendPhoneOtpCode(fullMobile, 'recaptcha-container');
        if (confirmation) {
          setPhoneConfirmation(confirmation);
          setOtpDeliveryNotice(`SMS code sent to ${fullMobile} via Firebase.`);
          setSignupStep(3);
          setLoading(false);
          return;
        }
      } catch (fbErr: any) {
        console.warn('[signup] Firebase Phone Auth unavailable or error:', fbErr?.message || fbErr);
      }
    }

    // 2. Fallback to backend verification request
    try {
      const res = await apiFetch('/api/auth/phone-verify/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: fullMobile, email: signupData.email }),
      });
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const msg =
          body.error ||
          body.message ||
          (res.status === 429
            ? 'Please wait a moment before requesting another OTP.'
            : 'Could not send verification code.');
        alert(msg);
        setLoading(false);
        return;
      }
      if (body.verificationToken) {
        setVerificationToken(body.verificationToken);
        try {
          sessionStorage.setItem('bizora_phone_verify_token', body.verificationToken);
          sessionStorage.setItem('bizora_phone_verify_mobile', fullMobile);
        } catch { /* storage quota or private mode */ }
      }
      if (body.devCode) {
        setOtp(body.devCode);
        setOtpDeliveryNotice(`Verification Code: ${body.devCode}`);
      } else if (body.channel === 'email') {
        setOtpDeliveryNotice(`Verification code sent to ${signupData.email}.`);
      } else {
        setOtpDeliveryNotice(`Verification code sent via SMS to ${fullMobile}.`);
      }
      setSignupStep(3);
    } catch (err: any) {
      alert(err?.message || 'Could not reach server to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete verification and create account
  const handleVerifyAndCompleteSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.trim().length < 4) {
      setBadFields({ otp: true });
      return;
    }

    setBadFields({});
    const cleanMobile = signupData.mobile.replace(/\D/g, '').replace(/^0+/, '');
    const fullMobile = `${selectedCountry.code}${cleanMobile}`;
    setLoading(true);

    let firebaseUid: string | undefined;

    // Verify Firebase Phone Auth
    if (phoneConfirmation) {
      try {
        const cred = await phoneConfirmation.confirm(otp.trim());
        firebaseUid = cred.user?.uid;
      } catch (fbErr: any) {
        setLoading(false);
        alert(fbErr?.message || 'Invalid or expired Firebase verification code.');
        return;
      }
    } else {
      // Backend confirmation
      try {
        const effectiveToken =
          verificationToken ||
          (typeof window !== 'undefined' ? sessionStorage.getItem('bizora_phone_verify_token') : null) ||
          undefined;

        const res = await apiFetch('/api/auth/phone-verify/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile: fullMobile,
            otp: otp.trim(),
            verificationToken: effectiveToken,
          }),
        });
        const body = await res.json().catch(() => ({} as any));
        if (!body.valid) {
          setLoading(false);
          alert(body.error || 'Invalid or expired verification code.');
          return;
        }
        try {
          sessionStorage.removeItem('bizora_phone_verify_token');
          sessionStorage.removeItem('bizora_phone_verify_mobile');
        } catch { /* ignore */ }
      } catch {
        setLoading(false);
        alert('Could not reach the server to verify the code.');
        return;
      }
    }

    // Register Workspace
    const result = await signup({
      ...signupData,
      ownerName,
      mobile: fullMobile,
      firebaseUid,
    });
    setLoading(false);

    if (result.success) {
      setBtnSuccess(true);
      setTimeout(() => {
        alert(
          'Workspace created! 14-day Pro trial activated:\n• Multi-branch enabled\n• Complete Accounts, POS & Inventory'
        );
      }, 500);
      return;
    }

    const err = (result.error || '').toLowerCase();
    if (err.includes('email already') || err.includes('mobile already') || err.includes('exists')) {
      const goLogin = confirm(
        (result.error || 'This email or mobile is already registered.') + '\n\nOpen login instead?'
      );
      if (goLogin) {
        setIsSignupView(false);
        setSignupStep(1);
      }
      return;
    }
    alert(result.error || 'Could not create your workspace. Please try again.');
  };

  // Recovery Handlers
  const handleInitiateRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryIdentifier.trim()) return;
    setLoading(true);
    const success = await recoverAccount(recoveryIdentifier);
    if (success) {
      setRecoveryVerificationStep(true);
    }
    setLoading(false);
  };

  const handleResetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoveryOtp || !newPin) return;
    setLoading(true);
    const success = await resetPassword(recoveryIdentifier, recoveryOtp, newPin);
    if (success) {
      alert('PIN successfully reset! You can now log in.');
      setIsRecoveryStep(false);
      setRecoveryVerificationStep(false);
      setIsSignupView(false);
    } else {
      alert('Invalid recovery code. Please try again.');
    }
    setLoading(false);
  };

  // Customer / Supplier Portal Handlers
  const handleCustomerLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerLogin) return;
    setLoading(true);
    const res = await customerLogin(customerPhone, customerPin);
    setLoading(false);
    if (!res.success) {
      alert(res.error || 'Invalid customer phone number or security PIN.');
    }
  };

  const handleSupplierLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierLogin) return;
    setLoading(true);
    const res = await supplierLogin(supplierPhone, supplierPin);
    setLoading(false);
    if (!res.success) {
      alert(res.error || 'Invalid supplier phone number or security PIN.');
    }
  };

  // Country Search Filter
  const filteredCountries = COUNTRY_LIST.filter((c) => {
    const q = countryQuery.toLowerCase().trim().replace(/^\+/, '');
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.code.includes(q) ||
      c.iso.toLowerCase() === q
    );
  });

  return (
    <div className="bizora-auth-viewport">
      {/* Animated ambient background blobs */}
      <div className="auth-blob auth-b1" />
      <div className="auth-blob auth-b2" />
      <div className="auth-blob auth-b3" />

      {/* Floating Theme Switcher */}
      <button
        type="button"
        className="auth-theme-btn"
        onClick={toggleTheme}
        aria-label="Switch light or dark theme"
        title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      >
        {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-indigo-600" />}
      </button>

      {/* Global Container for Firebase Phone Auth reCAPTCHA */}
      <div id="recaptcha-container" />

      {/* Main Glassmorphic Card Container */}
      <main
        className={`auth-card ${isSignupView ? 'is-signup' : ''}`}
        id="card"
        ref={cardRef}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        {/* ============================================================== */}
        {/* PANE 1: SIGN IN                                                */}
        {/* ============================================================== */}
        <section className="auth-pane pane-in" aria-label="Sign in">
          {/* Brand & Portal Header */}
          <div className="auth-brand">
            <img
              src="/assets/bizora-emblem.png"
              alt="Bizora"
              style={{ width: 34, height: 34, objectFit: 'contain' }}
            />
            <span>Bizora</span>
            <small>ERP</small>
            {lockRole && (
              <span className="dedicated-tag">
                {portalMode === 'employee'
                  ? 'Employee'
                  : portalMode === 'customer'
                  ? 'Customer'
                  : 'Dedicated'}
              </span>
            )}
          </div>

          {/* Role selector if not locked */}
          {!lockRole && (
            <div className="auth-role-tabs">
              {(
                [
                  { id: 'business', label: 'Owner' },
                  { id: 'employee', label: 'Employee' },
                  { id: 'customer', label: 'Customer' },
                  { id: 'supplier', label: 'Supplier' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`auth-role-tab ${authRole === tab.id ? 'active' : ''}`}
                  onClick={() => {
                    setAuthRole(tab.id);
                    setLoginError('');
                    setIs2faStep(false);
                    setIsRecoveryStep(false);
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Subheader Title */}
          {isRecoveryStep ? (
            <>
              <h1>{recoveryVerificationStep ? 'Reset PIN' : 'Recover Account'}</h1>
              <p className="auth-sub">
                {recoveryVerificationStep
                  ? 'Enter the code sent to you and set your new PIN.'
                  : 'Enter your registered email or mobile to receive a reset code.'}
              </p>
            </>
          ) : is2faStep ? (
            <>
              <h1>Two-Factor Auth</h1>
              <p className="auth-sub">Enter the 6-digit code from your authenticator app.</p>
            </>
          ) : (
            <>
              <h1>
                {authRole === 'customer'
                  ? 'Customer Portal'
                  : authRole === 'supplier'
                  ? 'Supplier Portal'
                  : 'Sign in to workspace'}
              </h1>
              <p className="auth-sub">
                {authRole === 'customer'
                  ? 'Access your statements, invoices, and active dues.'
                  : authRole === 'supplier'
                  ? 'View supply orders, deliveries, and payment status.'
                  : 'Orders, stock, accounting, and sales are ready.'}
              </p>
            </>
          )}

          {/* Error Banner */}
          {loginError && (
            <div
              role="alert"
              className="mb-4 text-xs font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900 rounded-xl px-3 py-2.5"
            >
              {loginError}
            </div>
          )}

          {/* RECOVERY SUB-FLOW */}
          {isRecoveryStep ? (
            recoveryVerificationStep ? (
              <form onSubmit={handleResetPin}>
                <div className="auth-field">
                  <input
                    id="recCode"
                    type="text"
                    placeholder=" "
                    value={recoveryOtp}
                    onChange={(e) => setRecoveryOtp(e.target.value)}
                    required
                  />
                  <label htmlFor="recCode">Recovery Code</label>
                </div>
                <div className="auth-field">
                  <input
                    id="newPin"
                    type="password"
                    placeholder=" "
                    value={newPin}
                    onChange={(e) => setNewPin(e.target.value)}
                    maxLength={6}
                    required
                  />
                  <label htmlFor="newPin">New Security PIN</label>
                </div>
                <button type="submit" className="auth-btn" disabled={loading}>
                  <span className="t">{loading ? 'Updating...' : 'Set New PIN'}</span>
                  <i className="spin" />
                </button>
                <div className="text-center mt-3">
                  <button
                    type="button"
                    className="auth-link text-xs"
                    onClick={() => setRecoveryVerificationStep(false)}
                  >
                    Back to recovery
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleInitiateRecovery}>
                <div className="auth-field">
                  <input
                    id="recIdent"
                    type="text"
                    placeholder=" "
                    value={recoveryIdentifier}
                    onChange={(e) => setRecoveryIdentifier(e.target.value)}
                    required
                  />
                  <label htmlFor="recIdent">Email or Mobile Number</label>
                </div>
                <button type="submit" className="auth-btn" disabled={loading}>
                  <span className="t">{loading ? 'Sending...' : 'Send Recovery Code'}</span>
                  <i className="spin" />
                </button>
                <div className="text-center mt-3">
                  <button
                    type="button"
                    className="auth-link text-xs"
                    onClick={() => setIsRecoveryStep(false)}
                  >
                    Cancel and Return to Login
                  </button>
                </div>
              </form>
            )
          ) : is2faStep ? (
            /* 2FA LOGIN FORM */
            <form onSubmit={handle2faLogin}>
              <div className="auth-field">
                <input
                  id="twoFaCode"
                  type="text"
                  placeholder=" "
                  value={loginOtp}
                  onChange={(e) => setLoginOtp(e.target.value)}
                  maxLength={6}
                  required
                />
                <label htmlFor="twoFaCode">6-Digit 2FA Code</label>
              </div>
              <button type="submit" className="auth-btn" disabled={loading}>
                <span className="t">{loading ? 'Verifying...' : 'Verify & Continue'}</span>
                <i className="spin" />
              </button>
              <div className="text-center mt-3">
                <button
                  type="button"
                  className="auth-link text-xs"
                  onClick={() => setIs2faStep(false)}
                >
                  Cancel and Sign In Again
                </button>
              </div>
            </form>
          ) : authRole === 'customer' ? (
            /* CUSTOMER LOGIN */
            <form onSubmit={handleCustomerLoginSubmit}>
              <div className="auth-field auth-phonef">
                <button
                  type="button"
                  className="auth-ccbtn"
                  ref={ccBtnRef}
                  onClick={() => setCountryMenuOpen(!countryMenuOpen)}
                  aria-expanded={countryMenuOpen}
                >
                  <span>{selectedCountry.code}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>
                <input
                  id="cPhone"
                  type="tel"
                  placeholder=" "
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                />
                <label htmlFor="cPhone">Mobile Number</label>
              </div>
              <div className="auth-field">
                <input
                  id="cPin"
                  type={showLoginPin ? 'text' : 'password'}
                  placeholder=" "
                  value={customerPin}
                  onChange={(e) => setCustomerPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                />
                <label htmlFor="cPin">Security PIN</label>
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowLoginPin(!showLoginPin)}
                  aria-label={showLoginPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showLoginPin ? <EyeOffIcon /> : <EyeOnIcon />}
                </button>
              </div>
              <button
                type="submit"
                className={`auth-btn ${loading ? 'loading' : ''} ${btnSuccess ? 'done' : ''}`}
                disabled={loading}
              >
                <span className="t">Sign in as Customer</span>
                <i className="spin" />
                <svg className="tick" viewBox="0 0 28 28">
                  <path d="M6 15l6 6 11-13" />
                </svg>
              </button>
              <div className="auth-or">or</div>
              <button type="button" className="auth-gbtn" onClick={handleGoogleSignIn}>
                <GoogleIcon />
                <span>Continue with Google</span>
              </button>
            </form>
          ) : authRole === 'supplier' ? (
            /* SUPPLIER LOGIN */
            <form onSubmit={handleSupplierLoginSubmit}>
              <div className="auth-field auth-phonef">
                <button
                  type="button"
                  className="auth-ccbtn"
                  ref={ccBtnRef}
                  onClick={() => setCountryMenuOpen(!countryMenuOpen)}
                  aria-expanded={countryMenuOpen}
                >
                  <span>{selectedCountry.code}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>
                <input
                  id="sPhone"
                  type="tel"
                  placeholder=" "
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  required
                />
                <label htmlFor="sPhone">Supplier Mobile</label>
              </div>
              <div className="auth-field">
                <input
                  id="sPin"
                  type={showLoginPin ? 'text' : 'password'}
                  placeholder=" "
                  value={supplierPin}
                  onChange={(e) => setSupplierPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  required
                />
                <label htmlFor="sPin">Supplier PIN</label>
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowLoginPin(!showLoginPin)}
                  aria-label={showLoginPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showLoginPin ? <EyeOffIcon /> : <EyeOnIcon />}
                </button>
              </div>
              <button
                type="submit"
                className={`auth-btn ${loading ? 'loading' : ''} ${btnSuccess ? 'done' : ''}`}
                disabled={loading}
              >
                <span className="t">Sign in as Supplier</span>
                <i className="spin" />
                <svg className="tick" viewBox="0 0 28 28">
                  <path d="M6 15l6 6 11-13" />
                </svg>
              </button>
            </form>
          ) : (
            /* STANDARD OWNER & EMPLOYEE LOGIN */
            <form onSubmit={handleLogin} noValidate>
              {/* Segmented Toggle: Email vs Phone */}
              <div
                className="auth-seg"
                data-m={loginMethod}
                role="tablist"
                aria-label="Sign in method"
              >
                <button
                  type="button"
                  className={loginMethod === 'email' ? 'on' : ''}
                  onClick={() => {
                    setLoginMethod('email');
                    setBadFields({});
                  }}
                  role="tab"
                  aria-selected={loginMethod === 'email'}
                >
                  Email
                </button>
                <button
                  type="button"
                  className={loginMethod === 'phone' ? 'on' : ''}
                  onClick={() => {
                    setLoginMethod('phone');
                    setBadFields({});
                  }}
                  role="tab"
                  aria-selected={loginMethod === 'phone'}
                >
                  Phone
                </button>
                <i />
              </div>

              {/* Email Input */}
              {loginMethod === 'email' ? (
                <div className={`auth-field ${badFields.identifier ? 'bad' : ''}`}>
                  <input
                    id="e1"
                    type="email"
                    placeholder=" "
                    autoComplete="email"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (badFields.identifier) setBadFields({ ...badFields, identifier: false });
                    }}
                  />
                  <label htmlFor="e1">Work email</label>
                  <span className="auth-msg">Enter a valid work email.</span>
                </div>
              ) : (
                /* Phone Input with Country Code */
                <div className={`auth-field auth-phonef ${badFields.identifier ? 'bad' : ''}`}>
                  <button
                    type="button"
                    className="auth-ccbtn"
                    ref={ccBtnRef}
                    onClick={() => setCountryMenuOpen(!countryMenuOpen)}
                    aria-expanded={countryMenuOpen}
                    aria-label={`Country code: ${selectedCountry.name} ${selectedCountry.code}`}
                  >
                    <span>{selectedCountry.code}</span>
                    <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                  </button>
                  <input
                    id="ph1"
                    type="tel"
                    inputMode="tel"
                    placeholder=" "
                    autoComplete="tel-national"
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value.replace(/[^\d\s-]/g, ''));
                      if (badFields.identifier) setBadFields({ ...badFields, identifier: false });
                    }}
                  />
                  <label htmlFor="ph1">Mobile number</label>
                  <span className="auth-msg">Enter a valid mobile number.</span>
                </div>
              )}

              {/* PIN Code Field */}
              <div className={`auth-field ${badFields.pin ? 'bad' : ''}`}>
                <input
                  id="p1"
                  type={showLoginPin ? 'text' : 'password'}
                  placeholder=" "
                  autoComplete="current-password"
                  inputMode="numeric"
                  maxLength={12}
                  value={pin}
                  onChange={(e) => {
                    setPin(e.target.value);
                    if (badFields.pin) setBadFields({ ...badFields, pin: false });
                  }}
                />
                <label htmlFor="p1">PIN code</label>
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowLoginPin(!showLoginPin)}
                  aria-label={showLoginPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showLoginPin ? <EyeOffIcon /> : <EyeOnIcon />}
                </button>
                <span className="auth-msg">Enter your 4 to 6 digit security PIN.</span>
              </div>

              {/* Row: Keep signed in & Forgot PIN */}
              <div className="auth-row">
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked style={{ accentColor: 'var(--auth-teal)' }} />
                  <span>Keep me signed in</span>
                </label>
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => {
                    setIsRecoveryStep(true);
                    setRecoveryVerificationStep(false);
                  }}
                >
                  Forgot PIN?
                </button>
              </div>

              {/* Submit Button */}
              <button
                className={`auth-btn ${loading ? 'loading' : ''} ${btnSuccess ? 'done' : ''}`}
                type="submit"
                disabled={loading}
              >
                <span className="t">Sign in</span>
                <i className="spin" />
                <svg className="tick" viewBox="0 0 28 28">
                  <path d="M6 15l6 6 11-13" />
                </svg>
              </button>

              <div className="auth-or">or</div>

              {/* Google OAuth */}
              <button
                className="auth-gbtn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <GoogleIcon />
                <span>Sign in with Google</span>
              </button>

              {/* Mobile Quick Switcher */}
              <p className="auth-swap">
                New to Bizora?{' '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => setIsSignupView(true)}
                >
                  Create a workspace
                </button>
              </p>
            </form>
          )}

          {/* SaaS Admin Portal Helper */}
          <div className="mt-6 text-center text-xs text-slate-400">
            Platform / SaaS admin?{' '}
            <a
              href={getAdminPortalUrl()}
              className="font-semibold text-emerald-600 hover:underline"
            >
              Admin portal &rarr;
            </a>
          </div>

          <p className="mt-4 text-center text-[10px] text-slate-400 select-all allow-select">
            {appVersionLabel()}
          </p>
        </section>

        {/* ============================================================== */}
        {/* PANE 2: SIGN UP (Progressive 2-Step Onboarding)                */}
        {/* ============================================================== */}
        <section className="auth-pane pane-up" aria-label="Create workspace">
          {/* Brand */}
          <div className="auth-brand">
            <img
              src="/assets/bizora-emblem.png"
              alt="Bizora"
              style={{ width: 34, height: 34, objectFit: 'contain' }}
            />
            <span>Bizora</span>
            <small>ERP</small>
          </div>

          <h1>Create your workspace</h1>
          <p className="auth-sub">Free for 14 days. No card required.</p>

          {/* Progress Bar Indicator */}
          <div className="auth-prog">
            <span>
              {signupStep === 1
                ? 'Step 1 of 2: About you'
                : signupStep === 2
                ? 'Step 2 of 2: Your shop'
                : 'Final step: Verification'}
            </span>
            <b>
              <i
                style={{
                  width: signupStep === 1 ? '50%' : '100%',
                }}
              />
            </b>
          </div>

          {/* STEP 1: OWNER INFO */}
          {signupStep === 1 && (
            <form onSubmit={handleSignupStep1Next} noValidate>
              <div className={`auth-field ${badFields.ownerName ? 'bad' : ''}`}>
                <input
                  id="n2"
                  type="text"
                  placeholder=" "
                  autoComplete="name"
                  value={ownerName}
                  onChange={(e) => {
                    setOwnerName(e.target.value);
                    if (badFields.ownerName) setBadFields({ ...badFields, ownerName: false });
                  }}
                />
                <label htmlFor="n2">Shop owner name</label>
                <span className="auth-msg">Enter the owner’s full name.</span>
              </div>

              <div className={`auth-field ${badFields.email ? 'bad' : ''}`}>
                <input
                  id="e2"
                  type="email"
                  placeholder=" "
                  autoComplete="email"
                  value={signupData.email}
                  onChange={(e) => {
                    setSignupData({ ...signupData, email: e.target.value });
                    if (badFields.email) setBadFields({ ...badFields, email: false });
                  }}
                />
                <label htmlFor="e2">Work email</label>
                <span className="auth-msg">Enter a valid work email address.</span>
              </div>

              <div className={`auth-field auth-phonef ${badFields.mobile ? 'bad' : ''}`}>
                <button
                  type="button"
                  className="auth-ccbtn"
                  ref={ccBtnRef}
                  onClick={() => setCountryMenuOpen(!countryMenuOpen)}
                  aria-expanded={countryMenuOpen}
                  aria-label={`Country code: ${selectedCountry.name} ${selectedCountry.code}`}
                >
                  <span>{selectedCountry.code}</span>
                  <ChevronDown className="w-3.5 h-3.5 opacity-70" />
                </button>
                <input
                  id="ph2"
                  type="tel"
                  inputMode="tel"
                  placeholder=" "
                  autoComplete="tel-national"
                  value={signupData.mobile}
                  onChange={(e) => {
                    setSignupData({ ...signupData, mobile: e.target.value.replace(/[^\d\s-]/g, '') });
                    if (badFields.mobile) setBadFields({ ...badFields, mobile: false });
                  }}
                />
                <label htmlFor="ph2">Mobile number</label>
                <span className="auth-msg">Enter a valid mobile number.</span>
              </div>

              <button className="auth-btn" type="submit">
                <span className="t">Continue &rarr;</span>
              </button>

              <div className="auth-or">or</div>

              <button
                className="auth-gbtn"
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <GoogleIcon />
                <span>Sign up with Google</span>
              </button>

              <p className="auth-swap">
                Already have a workspace?{' '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => setIsSignupView(false)}
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* STEP 2: SHOP DETAILS */}
          {signupStep === 2 && (
            <form onSubmit={handleSignupStep2Submit} noValidate>
              <div className={`auth-field ${badFields.businessName ? 'bad' : ''}`}>
                <input
                  id="sn2"
                  type="text"
                  placeholder=" "
                  autoComplete="organization"
                  value={signupData.businessName}
                  onChange={(e) => {
                    setSignupData({ ...signupData, businessName: e.target.value });
                    if (badFields.businessName) setBadFields({ ...badFields, businessName: false });
                  }}
                />
                <label htmlFor="sn2">Shop name</label>
                <span className="auth-msg">Enter your business or shop name.</span>
              </div>

              <div className={`auth-field ${badFields.location ? 'bad' : ''}`}>
                <input
                  id="ad2"
                  type="text"
                  placeholder=" "
                  autoComplete="street-address"
                  value={signupData.location}
                  onChange={(e) => {
                    setSignupData({ ...signupData, location: e.target.value });
                    if (badFields.location) setBadFields({ ...badFields, location: false });
                  }}
                />
                <label htmlFor="ad2">Shop address (City, Area)</label>
                <span className="auth-msg">Enter your store location.</span>
              </div>

              <div className="auth-two-col">
                <div className="auth-field">
                  <select
                    id="bc2"
                    value={signupData.businessType}
                    onChange={(e) => setSignupData({ ...signupData, businessType: e.target.value })}
                  >
                    <option value="Retail">Retail & General Store</option>
                    <option value="Pharmacy">Pharmacy & Healthcare</option>
                    <option value="Fashion">Clothing & Fashion</option>
                    <option value="Electronics">Electronics & Mobile</option>
                    <option value="Restaurant">Restaurant & Café</option>
                    <option value="Hardware">Hardware & Tools</option>
                    <option value="Cosmetics">Beauty & Cosmetics</option>
                    <option value="Wholesale">Wholesale & Distribution</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Other">Other Enterprise</option>
                  </select>
                  <label htmlFor="bc2">Category</label>
                </div>

                <div className="auth-field">
                  <input
                    id="br2"
                    type="number"
                    min="1"
                    max="99"
                    value={signupData.locationCount}
                    onChange={(e) =>
                      setSignupData({ ...signupData, locationCount: parseInt(e.target.value) || 1 })
                    }
                    placeholder=" "
                  />
                  <label htmlFor="br2">Branches</label>
                  <button
                    type="button"
                    className="auth-nb"
                    onClick={() =>
                      setSignupData({
                        ...signupData,
                        locationCount: Math.max(1, signupData.locationCount - 1),
                      })
                    }
                  >
                    &minus;
                  </button>
                  <button
                    type="button"
                    className="auth-nb auth-nb2"
                    onClick={() =>
                      setSignupData({
                        ...signupData,
                        locationCount: Math.min(99, signupData.locationCount + 1),
                      })
                    }
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={`auth-field ${badFields.signupPin ? 'bad' : ''}`}>
                <input
                  id="p2"
                  type={showSignupPin ? 'text' : 'password'}
                  placeholder=" "
                  autoComplete="new-password"
                  inputMode="numeric"
                  maxLength={6}
                  value={signupData.pin}
                  onChange={(e) => {
                    setSignupData({ ...signupData, pin: e.target.value.replace(/\D/g, '').slice(0, 6) });
                    if (badFields.signupPin) setBadFields({ ...badFields, signupPin: false });
                  }}
                />
                <label htmlFor="p2">Create PIN (4–6 digits)</label>
                <button
                  type="button"
                  className="auth-eye"
                  onClick={() => setShowSignupPin(!showSignupPin)}
                  aria-label={showSignupPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showSignupPin ? <EyeOffIcon /> : <EyeOnIcon />}
                </button>
                <span className="auth-msg">Choose a secure 4 to 6 digit security PIN.</span>
              </div>

              <div className="auth-btnrow">
                <button
                  type="button"
                  className="auth-ghost"
                  onClick={() => setSignupStep(1)}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  className={`auth-btn ${loading ? 'loading' : ''} ${btnSuccess ? 'done' : ''}`}
                  type="submit"
                  disabled={loading}
                >
                  <span className="t">Create workspace</span>
                  <i className="spin" />
                  <svg className="tick" viewBox="0 0 28 28">
                    <path d="M6 15l6 6 11-13" />
                  </svg>
                </button>
              </div>

              <p className="auth-swap">
                Already have a workspace?{' '}
                <button
                  type="button"
                  className="auth-link"
                  onClick={() => setIsSignupView(false)}
                >
                  Sign in
                </button>
              </p>
            </form>
          )}

          {/* STEP 3: OTP VERIFICATION */}
          {signupStep === 3 && (
            <form onSubmit={handleVerifyAndCompleteSignup} noValidate>
              {otpDeliveryNotice && (
                <div className="mb-4 p-3 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 text-xs text-center font-medium shadow-xs">
                  {otpDeliveryNotice}
                </div>
              )}

              <div className={`auth-field ${badFields.otp ? 'bad' : ''}`}>
                <input
                  id="otpCode"
                  type="text"
                  placeholder=" "
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ''));
                    if (badFields.otp) setBadFields({ ...badFields, otp: false });
                  }}
                  autoFocus
                />
                <label htmlFor="otpCode">6-Digit Verification Code</label>
                <span className="auth-msg">Enter the 6-digit verification code.</span>
              </div>

              <div className="auth-btnrow">
                <button
                  type="button"
                  className="auth-ghost"
                  onClick={() => setSignupStep(2)}
                  disabled={loading}
                >
                  Back
                </button>
                <button
                  className={`auth-btn ${loading ? 'loading' : ''} ${btnSuccess ? 'done' : ''}`}
                  type="submit"
                  disabled={loading}
                >
                  <span className="t">Verify & Create</span>
                  <i className="spin" />
                  <svg className="tick" viewBox="0 0 28 28">
                    <path d="M6 15l6 6 11-13" />
                  </svg>
                </button>
              </div>
            </form>
          )}
        </section>

        {/* ============================================================== */}
        {/* INTERACTIVE DESKTOP LIVE ERP PREVIEW OVERLAY                   */}
        {/* ============================================================== */}
        <aside className="auth-overlay" id="ov" ref={overlayRef}>
          {/* Live Order / Payment Toast */}
          <div className="auth-toast" id="toast">
            <b>{toastMessage.title}</b>
            <span>{toastMessage.subtitle}</span>
          </div>

          {/* Glass Widget 1: Revenue count-up */}
          <div className="auth-glass auth-g1">
            <div className="auth-lbl">Revenue this month</div>
            <div className="auth-big">
              <span id="rev">{liveRevenue}</span>
              <span className="auth-chip">+12.4%</span>
            </div>
          </div>

          {/* Glass Widget 2: Animated sparkline orders */}
          <div className="auth-glass auth-g2">
            <div className="auth-lbl">Orders this week</div>
            <svg className="auth-spark" viewBox="0 0 160 50">
              <path d="M2 42 L24 34 L46 38 L68 22 L90 27 L112 12 L134 16 L158 4" />
            </svg>
          </div>

          {/* Glass Widget 3: Live stock bars */}
          <div className="auth-glass auth-g3">
            <div className="auth-lbl">Stock levels</div>
            <div className="auth-bars">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>

          {/* Glass Widget 4: Active Modules with live pulsing dot */}
          <div className="auth-glass auth-g4">
            <div className="auth-lbl">Modules</div>
            <div className="auth-mods">
              <b>Accounts</b>
              <b>Sales</b>
              <b>HR</b>
            </div>
          </div>

          {/* Rising particles */}
          {[...Array(16)].map((_, i) => (
            <i
              key={i}
              className="auth-pt"
              style={
                {
                  '--x': `${(i * 6.25 + 3) % 100}%`,
                  '--s': `${3 + (i % 5)}px`,
                  '--t': `${8 + (i % 7)}s`,
                  '--dl': `-${i * 0.8}s`,
                } as React.CSSProperties
              }
            />
          ))}

          {/* Bottom Call-to-action A: When in Sign In view */}
          <div className="auth-ov-cta cta-a">
            <h2>Run your whole business from one place.</h2>
            <p>Accounting, inventory, HR, and sales stay in sync, live.</p>
            <button
              type="button"
              className="auth-out-btn"
              onClick={() => setIsSignupView(true)}
            >
              Create a workspace &rarr;
            </button>
          </div>

          {/* Bottom Call-to-action B: When in Sign Up view */}
          <div className="auth-ov-cta cta-b">
            <h2>Your workspace is ready when you are.</h2>
            <p>Sign in to see today’s orders, stock, and live cash flow.</p>
            <button
              type="button"
              className="auth-out-btn"
              onClick={() => setIsSignupView(false)}
            >
              &larr; Sign in
            </button>
          </div>
        </aside>
      </main>

      {/* ============================================================== */}
      {/* COUNTRY CODE PICKER MODAL                                      */}
      {/* ============================================================== */}
      {countryMenuOpen && (
        <div
          className="auth-ccmenu open"
          id="ccmenu"
          ref={countryMenuRef}
          role="dialog"
          aria-label="Choose country code"
          style={{
            top: ccBtnRef.current
              ? Math.min(
                  window.innerHeight - 320,
                  ccBtnRef.current.getBoundingClientRect().bottom + 6
                )
              : 100,
            left: ccBtnRef.current
              ? Math.max(
                  12,
                  Math.min(
                    ccBtnRef.current.getBoundingClientRect().left,
                    window.innerWidth - 328
                  )
                )
              : 20,
          }}
        >
          <input
            type="search"
            placeholder="Search country or code"
            aria-label="Search countries"
            autoComplete="off"
            value={countryQuery}
            onChange={(e) => setCountryQuery(e.target.value)}
            autoFocus
          />
          <ul role="listbox">
            {filteredCountries.map((c) => (
              <li
                key={`${c.iso}-${c.code}`}
                role="option"
                aria-selected={c.iso === selectedCountry.iso}
                className={c.iso === selectedCountry.iso ? 'sel' : ''}
                onClick={() => {
                  setSelectedCountry(c);
                  setCountryMenuOpen(false);
                  setCountryQuery('');
                }}
              >
                <span className="n">{c.name}</span>
                <span className="c">{c.code}</span>
              </li>
            ))}
            {filteredCountries.length === 0 && (
              <li style={{ color: 'var(--auth-muted)', padding: '12px' }}>No matches found</li>
            )}
          </ul>
        </div>
      )}

      {/* Legal & Trust Links */}
      <footer
        className="auth-legal-footer"
        style={{
          marginTop: 20,
          marginBottom: 10,
          fontSize: 11,
          color: 'var(--auth-muted)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
          zIndex: 10,
        }}
      >
        <a href="#/legal/privacy-policy" style={{ color: 'inherit', textDecoration: 'underline' }}>Privacy Policy</a>
        <span>·</span>
        <a href="#/legal/terms-of-service" style={{ color: 'inherit', textDecoration: 'underline' }}>Terms of Service</a>
        <span>·</span>
        <a href="#/legal/cookie-policy" style={{ color: 'inherit', textDecoration: 'underline' }}>Cookie Policy</a>
        <span>·</span>
        <a href="#/legal" style={{ color: 'inherit', textDecoration: 'underline' }}>Trust Center</a>
      </footer>
    </div>
  );
};

// SVG Icon helpers
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
  </svg>
);

const EyeOnIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.9 17.9A10.9 10.9 0 0 1 12 19C5 19 1 12 1 12a18 18 0 0 1 5.1-5.9M9.9 5.1A10 10 0 0 1 12 5c7 0 11 7 11 7a18 18 0 0 1-2.2 3.2M1 1l22 22" />
  </svg>
);

export default Auth;
