import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { apiFetch } from '../lib/apiClient';
import { Lock, Mail, Phone, MapPin, Building2, Store, Hash, ArrowRight, Loader2, MessageSquare, ChevronDown, Info, Shield, Zap, Globe, UserCircle, Users, ShoppingBag } from 'lucide-react';
import { appVersionLabel } from '../lib/appVersion';

// Comprehensive Country List with Validation Regex
const COUNTRY_CODES = [
    { code: '+93', name: 'Afghanistan', regex: /^\d{9}$/ },
    { code: '+355', name: 'Albania', regex: /^\d{8,9}$/ },
    { code: '+213', name: 'Algeria', regex: /^\d{9,10}$/ },
    { code: '+1-684', name: 'American Samoa', regex: /^\d{7}$/ },
    { code: '+376', name: 'Andorra', regex: /^\d{6}$/ },
    { code: '+244', name: 'Angola', regex: /^\d{9}$/ },
    { code: '+1-264', name: 'Anguilla', regex: /^\d{7}$/ },
    { code: '+1-268', name: 'Antigua and Barbuda', regex: /^\d{7}$/ },
    { code: '+54', name: 'Argentina', regex: /^\d{10,11}$/ },
    { code: '+374', name: 'Armenia', regex: /^\d{8}$/ },
    { code: '+297', name: 'Aruba', regex: /^\d{7}$/ },
    { code: '+61', name: 'Australia', regex: /^\d{9}$/ },
    { code: '+43', name: 'Austria', regex: /^\d{10,13}$/ },
    { code: '+994', name: 'Azerbaijan', regex: /^\d{9}$/ },
    { code: '+1-242', name: 'Bahamas', regex: /^\d{7}$/ },
    { code: '+973', name: 'Bahrain', regex: /^\d{8}$/ },
    { code: '+880', name: 'Bangladesh', regex: /^1[3-9]\d{8}$/ }, // 10 digits omitting leading 0
    { code: '+1-246', name: 'Barbados', regex: /^\d{7}$/ },
    { code: '+375', name: 'Belarus', regex: /^\d{9}$/ },
    { code: '+32', name: 'Belgium', regex: /^\d{9}$/ },
    { code: '+501', name: 'Belize', regex: /^\d{7}$/ },
    { code: '+229', name: 'Benin', regex: /^\d{8}$/ },
    { code: '+1-441', name: 'Bermuda', regex: /^\d{7}$/ },
    { code: '+975', name: 'Bhutan', regex: /^\d{8}$/ },
    { code: '+591', name: 'Bolivia', regex: /^\d{8}$/ },
    { code: '+387', name: 'Bosnia and Herzegovina', regex: /^\d{8}$/ },
    { code: '+267', name: 'Botswana', regex: /^\d{7,8}$/ },
    { code: '+55', name: 'Brazil', regex: /^\d{10,11}$/ },
    { code: '+1-284', name: 'British Virgin Islands', regex: /^\d{7}$/ },
    { code: '+673', name: 'Brunei', regex: /^\d{7}$/ },
    { code: '+359', name: 'Bulgaria', regex: /^\d{8,9}$/ },
    { code: '+226', name: 'Burkina Faso', regex: /^\d{8}$/ },
    { code: '+257', name: 'Burundi', regex: /^\d{8}$/ },
    { code: '+855', name: 'Cambodia', regex: /^\d{8,9}$/ },
    { code: '+237', name: 'Cameroon', regex: /^\d{9}$/ },
    { code: '+1', name: 'Canada', regex: /^\d{10}$/ },
    { code: '+238', name: 'Cape Verde', regex: /^\d{7}$/ },
    { code: '+1-345', name: 'Cayman Islands', regex: /^\d{7}$/ },
    { code: '+236', name: 'Central African Republic', regex: /^\d{8}$/ },
    { code: '+235', name: 'Chad', regex: /^\d{8}$/ },
    { code: '+56', name: 'Chile', regex: /^\d{9}$/ },
    { code: '+86', name: 'China', regex: /^\d{11}$/ },
    { code: '+57', name: 'Colombia', regex: /^\d{10}$/ },
    { code: '+269', name: 'Comoros', regex: /^\d{7}$/ },
    { code: '+242', name: 'Congo', regex: /^\d{9}$/ },
    { code: '+243', name: 'DR Congo', regex: /^\d{9}$/ },
    { code: '+682', name: 'Cook Islands', regex: /^\d{5}$/ },
    { code: '+506', name: 'Costa Rica', regex: /^\d{8}$/ },
    { code: '+385', name: 'Croatia', regex: /^\d{8,9}$/ },
    { code: '+53', name: 'Cuba', regex: /^\d{8}$/ },
    { code: '+599', name: 'Curaçao', regex: /^\d{7,8}$/ },
    { code: '+357', name: 'Cyprus', regex: /^\d{8}$/ },
    { code: '+420', name: 'Czech Republic', regex: /^\d{9}$/ },
    { code: '+45', name: 'Denmark', regex: /^\d{8}$/ },
    { code: '+253', name: 'Djibouti', regex: /^\d{8}$/ },
    { code: '+1-767', name: 'Dominica', regex: /^\d{7}$/ },
    { code: '+1-809', name: 'Dominican Republic', regex: /^\d{7}$/ },
    { code: '+593', name: 'Ecuador', regex: /^\d{9}$/ },
    { code: '+20', name: 'Egypt', regex: /^\d{10,11}$/ },
    { code: '+503', name: 'El Salvador', regex: /^\d{8}$/ },
    { code: '+240', name: 'Equatorial Guinea', regex: /^\d{9}$/ },
    { code: '+291', name: 'Eritrea', regex: /^\d{7}$/ },
    { code: '+372', name: 'Estonia', regex: /^\d{7,8}$/ },
    { code: '+251', name: 'Ethiopia', regex: /^\d{9}$/ },
    { code: '+298', name: 'Faroe Islands', regex: /^\d{6}$/ },
    { code: '+679', name: 'Fiji', regex: /^\d{7}$/ },
    { code: '+358', name: 'Finland', regex: /^\d{5,12}$/ },
    { code: '+33', name: 'France', regex: /^\d{9}$/ },
    { code: '+594', name: 'French Guiana', regex: /^\d{9}$/ },
    { code: '+689', name: 'French Polynesia', regex: /^\d{6}$/ },
    { code: '+241', name: 'Gabon', regex: /^\d{7}$/ },
    { code: '+220', name: 'Gambia', regex: /^\d{7}$/ },
    { code: '+995', name: 'Georgia', regex: /^\d{9}$/ },
    { code: '+49', name: 'Germany', regex: /^\d{10,11}$/ },
    { code: '+233', name: 'Ghana', regex: /^\d{9}$/ },
    { code: '+350', name: 'Gibraltar', regex: /^\d{8}$/ },
    { code: '+30', name: 'Greece', regex: /^\d{10}$/ },
    { code: '+299', name: 'Greenland', regex: /^\d{6}$/ },
    { code: '+1-473', name: 'Grenada', regex: /^\d{7}$/ },
    { code: '+590', name: 'Guadeloupe', regex: /^\d{9}$/ },
    { code: '+1-671', name: 'Guam', regex: /^\d{7}$/ },
    { code: '+502', name: 'Guatemala', regex: /^\d{8}$/ },
    { code: '+224', name: 'Guinea', regex: /^\d{9}$/ },
    { code: '+245', name: 'Guinea-Bissau', regex: /^\d{7,9}$/ },
    { code: '+592', name: 'Guyana', regex: /^\d{7}$/ },
    { code: '+509', name: 'Haiti', regex: /^\d{8}$/ },
    { code: '+504', name: 'Honduras', regex: /^\d{8}$/ },
    { code: '+852', name: 'Hong Kong', regex: /^\d{8}$/ },
    { code: '+36', name: 'Hungary', regex: /^\d{9}$/ },
    { code: '+354', name: 'Iceland', regex: /^\d{7}$/ },
    { code: '+91', name: 'India', regex: /^\d{10}$/ },
    { code: '+62', name: 'Indonesia', regex: /^\d{9,12}$/ },
    { code: '+98', name: 'Iran', regex: /^\d{10}$/ },
    { code: '+964', name: 'Iraq', regex: /^\d{10}$/ },
    { code: '+353', name: 'Ireland', regex: /^\d{9}$/ },
    { code: '+972', name: 'Israel', regex: /^\d{9}$/ },
    { code: '+39', name: 'Italy', regex: /^\d{10}$/ },
    { code: '+1-876', name: 'Jamaica', regex: /^\d{7}$/ },
    { code: '+81', name: 'Japan', regex: /^\d{10}$/ },
    { code: '+962', name: 'Jordan', regex: /^\d{9}$/ },
    { code: '+7', name: 'Kazakhstan', regex: /^\d{10}$/ },
    { code: '+254', name: 'Kenya', regex: /^\d{9}$/ },
    { code: '+686', name: 'Kiribati', regex: /^\d{8}$/ },
    { code: '+383', name: 'Kosovo', regex: /^\d{8}$/ },
    { code: '+965', name: 'Kuwait', regex: /^\d{8}$/ },
    { code: '+996', name: 'Kyrgyzstan', regex: /^\d{9}$/ },
    { code: '+856', name: 'Laos', regex: /^\d{9,10}$/ },
    { code: '+371', name: 'Latvia', regex: /^\d{8}$/ },
    { code: '+961', name: 'Lebanon', regex: /^\d{7,8}$/ },
    { code: '+266', name: 'Lesotho', regex: /^\d{8}$/ },
    { code: '+231', name: 'Liberia', regex: /^\d{7,8}$/ },
    { code: '+218', name: 'Libya', regex: /^\d{9}$/ },
    { code: '+423', name: 'Liechtenstein', regex: /^\d{7}$/ },
    { code: '+370', name: 'Lithuania', regex: /^\d{8}$/ },
    { code: '+352', name: 'Luxembourg', regex: /^\d{9}$/ },
    { code: '+853', name: 'Macau', regex: /^\d{8}$/ },
    { code: '+389', name: 'Macedonia', regex: /^\d{8}$/ },
    { code: '+261', name: 'Madagascar', regex: /^\d{9}$/ },
    { code: '+265', name: 'Malawi', regex: /^\d{9}$/ },
    { code: '+60', name: 'Malaysia', regex: /^\d{9,10}$/ },
    { code: '+960', name: 'Maldives', regex: /^\d{7}$/ },
    { code: '+223', name: 'Mali', regex: /^\d{8}$/ },
    { code: '+356', name: 'Malta', regex: /^\d{8}$/ },
    { code: '+692', name: 'Marshall Islands', regex: /^\d{7}$/ },
    { code: '+222', name: 'Mauritania', regex: /^\d{8}$/ },
    { code: '+230', name: 'Mauritius', regex: /^\d{7,8}$/ },
    { code: '+52', name: 'Mexico', regex: /^\d{10}$/ },
    { code: '+691', name: 'Micronesia', regex: /^\d{7}$/ },
    { code: '+373', name: 'Moldova', regex: /^\d{8}$/ },
    { code: '+377', name: 'Monaco', regex: /^\d{8,9}$/ },
    { code: '+976', name: 'Mongolia', regex: /^\d{8}$/ },
    { code: '+382', name: 'Montenegro', regex: /^\d{8}$/ },
    { code: '+1-664', name: 'Montserrat', regex: /^\d{7}$/ },
    { code: '+212', name: 'Morocco', regex: /^\d{9}$/ },
    { code: '+258', name: 'Mozambique', regex: /^\d{9}$/ },
    { code: '+95', name: 'Myanmar', regex: /^\d{8,10}$/ },
    { code: '+264', name: 'Namibia', regex: /^\d{8,9}$/ },
    { code: '+674', name: 'Nauru', regex: /^\d{7}$/ },
    { code: '+977', name: 'Nepal', regex: /^\d{10}$/ },
    { code: '+31', name: 'Netherlands', regex: /^\d{9}$/ },
    { code: '+687', name: 'New Caledonia', regex: /^\d{6}$/ },
    { code: '+64', name: 'New Zealand', regex: /^\d{8,10}$/ },
    { code: '+505', name: 'Nicaragua', regex: /^\d{8}$/ },
    { code: '+227', name: 'Niger', regex: /^\d{8}$/ },
    { code: '+234', name: 'Nigeria', regex: /^\d{10}$/ },
    { code: '+683', name: 'Niue', regex: /^\d{4}$/ },
    { code: '+850', name: 'North Korea', regex: /^\d{8,10}$/ },
    { code: '+47', name: 'Norway', regex: /^\d{8}$/ },
    { code: '+968', name: 'Oman', regex: /^\d{8}$/ },
    { code: '+92', name: 'Pakistan', regex: /^\d{10}$/ },
    { code: '+680', name: 'Palau', regex: /^\d{7}$/ },
    { code: '+970', name: 'Palestine', regex: /^\d{9}$/ },
    { code: '+507', name: 'Panama', regex: /^\d{7,8}$/ },
    { code: '+675', name: 'Papua New Guinea', regex: /^\d{8}$/ },
    { code: '+595', name: 'Paraguay', regex: /^\d{9}$/ },
    { code: '+51', name: 'Peru', regex: /^\d{9}$/ },
    { code: '+63', name: 'Philippines', regex: /^\d{10}$/ },
    { code: '+48', name: 'Poland', regex: /^\d{9}$/ },
    { code: '+351', name: 'Portugal', regex: /^\d{9}$/ },
    { code: '+1-787', name: 'Puerto Rico', regex: /^\d{7}$/ },
    { code: '+974', name: 'Qatar', regex: /^\d{8}$/ },
    { code: '+40', name: 'Romania', regex: /^\d{9,10}$/ },
    { code: '+7', name: 'Russia', regex: /^\d{10}$/ },
    { code: '+250', name: 'Rwanda', regex: /^\d{9}$/ },
    { code: '+1-869', name: 'Saint Kitts and Nevis', regex: /^\d{7}$/ },
    { code: '+1-758', name: 'Saint Lucia', regex: /^\d{7}$/ },
    { code: '+1-784', name: 'Saint Vincent', regex: /^\d{7}$/ },
    { code: '+685', name: 'Samoa', regex: /^\d{5,7}$/ },
    { code: '+378', name: 'San Marino', regex: /^\d{6,10}$/ },
    { code: '+239', name: 'Sao Tome and Principe', regex: /^\d{7}$/ },
    { code: '+966', name: 'Saudi Arabia', regex: /^\d{9}$/ },
    { code: '+221', name: 'Senegal', regex: /^\d{9}$/ },
    { code: '+381', name: 'Serbia', regex: /^\d{8,9}$/ },
    { code: '+248', name: 'Seychelles', regex: /^\d{7}$/ },
    { code: '+232', name: 'Sierra Leone', regex: /^\d{8}$/ },
    { code: '+65', name: 'Singapore', regex: /^\d{8}$/ },
    { code: '+421', name: 'Slovakia', regex: /^\d{9}$/ },
    { code: '+386', name: 'Slovenia', regex: /^\d{8}$/ },
    { code: '+677', name: 'Solomon Islands', regex: /^\d{5,7}$/ },
    { code: '+252', name: 'Somalia', regex: /^\d{8,9}$/ },
    { code: '+27', name: 'South Africa', regex: /^\d{9}$/ },
    { code: '+82', name: 'South Korea', regex: /^\d{9,11}$/ },
    { code: '+211', name: 'South Sudan', regex: /^\d{9}$/ },
    { code: '+34', name: 'Spain', regex: /^\d{9}$/ },
    { code: '+94', name: 'Sri Lanka', regex: /^\d{9}$/ },
    { code: '+249', name: 'Sudan', regex: /^\d{9}$/ },
    { code: '+597', name: 'Suriname', regex: /^\d{6,7}$/ },
    { code: '+268', name: 'Swaziland', regex: /^\d{8}$/ },
    { code: '+46', name: 'Sweden', regex: /^\d{7,13}$/ },
    { code: '+41', name: 'Switzerland', regex: /^\d{9}$/ },
    { code: '+963', name: 'Syria', regex: /^\d{9}$/ },
    { code: '+886', name: 'Taiwan', regex: /^\d{9}$/ },
    { code: '+992', name: 'Tajikistan', regex: /^\d{9}$/ },
    { code: '+255', name: 'Tanzania', regex: /^\d{9}$/ },
    { code: '+66', name: 'Thailand', regex: /^\d{9}$/ },
    { code: '+670', name: 'Timor-Leste', regex: /^\d{7,8}$/ },
    { code: '+228', name: 'Togo', regex: /^\d{8}$/ },
    { code: '+676', name: 'Tonga', regex: /^\d{5,7}$/ },
    { code: '+1-868', name: 'Trinidad and Tobago', regex: /^\d{7}$/ },
    { code: '+216', name: 'Tunisia', regex: /^\d{8}$/ },
    { code: '+90', name: 'Turkey', regex: /^\d{10}$/ },
    { code: '+993', name: 'Turkmenistan', regex: /^\d{8}$/ },
    { code: '+1-649', name: 'Turks and Caicos', regex: /^\d{7}$/ },
    { code: '+688', name: 'Tuvalu', regex: /^\d{5}$/ },
    { code: '+256', name: 'Uganda', regex: /^\d{9}$/ },
    { code: '+380', name: 'Ukraine', regex: /^\d{9}$/ },
    { code: '+971', name: 'United Arab Emirates', regex: /^\d{9}$/ },
    { code: '+44', name: 'United Kingdom', regex: /^\d{10}$/ },
    { code: '+1', name: 'United States', regex: /^\d{10}$/ },
    { code: '+598', name: 'Uruguay', regex: /^\d{8}$/ },
    { code: '+998', name: 'Uzbekistan', regex: /^\d{9}$/ },
    { code: '+678', name: 'Vanuatu', regex: /^\d{5,7}$/ },
    { code: '+39', name: 'Vatican City', regex: /^\d{10}$/ },
    { code: '+58', name: 'Venezuela', regex: /^\d{10}$/ },
    { code: '+84', name: 'Vietnam', regex: /^\d{9,10}$/ },
    { code: '+967', name: 'Yemen', regex: /^\d{9}$/ },
    { code: '+260', name: 'Zambia', regex: /^\d{9}$/ },
    { code: '+263', name: 'Zimbabwe', regex: /^\d{9}$/ }
];

export interface AuthProps {
  initialRole?: 'business' | 'employee' | 'customer' | 'supplier';
  portalMode?: 'shop' | 'employee' | 'customer' | 'admin';
  lockRole?: boolean;
}

export const Auth: React.FC<AuthProps> = ({ initialRole, portalMode, lockRole = false }) => {
  const { login, signup, complete2fa, socialLogin, recoverAccount, resetPassword, customerLogin, customerSignup, resetCustomerPin, supplierLogin, supplierSignup, resetSupplierPin } = useAuth();
  const { t } = useSettings();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [is2faStep, setIs2faStep] = useState(false);
  const [isRecoveryStep, setIsRecoveryStep] = useState(false);
  const [recoveryVerificationStep, setRecoveryVerificationStep] = useState(false);

  // Authentication mode role
  const resolvedInitialRole = initialRole || (portalMode === 'employee' ? 'employee' : portalMode === 'customer' ? 'customer' : 'business');
  const [authRole, setAuthRole] = useState<'business' | 'employee' | 'customer' | 'supplier'>(resolvedInitialRole);

  React.useEffect(() => {
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

  // Customer State Login
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerPin, setCustomerPin] = useState('');

  // Customer Signup Wizard State
  const [customerSignupStep, setCustomerSignupStep] = useState(1); // 1, 2, 3, 4
  const [customerSignupName, setCustomerSignupName] = useState('');
  const [customerSignupPhone, setCustomerSignupPhone] = useState('');
  const [customerSignupOtp, setCustomerSignupOtp] = useState('');
  const [customerSignupPin, setCustomerSignupPin] = useState('');
  const [customerSignupConfirmPin, setCustomerSignupConfirmPin] = useState('');

  // Supplier State Login
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierPin, setSupplierPin] = useState('');

  // Supplier Signup Wizard State
  const [isSupplierSignup, setIsSupplierSignup] = useState(false);
  const [supplierSignupStep, setSupplierSignupStep] = useState(1); // 1, 2, 3, 4
  const [supplierSignupName, setSupplierSignupName] = useState('');
  const [supplierSignupMobile, setSupplierSignupMobile] = useState('');
  const [supplierSignupCompany, setSupplierSignupCompany] = useState('');
  const [supplierSignupEmail, setSupplierSignupEmail] = useState('');
  const [supplierSignupOtp, setSupplierSignupOtp] = useState('');
  const [supplierSignupPin, setSupplierSignupPin] = useState('');
  const [supplierSignupConfirmPin, setSupplierSignupConfirmPin] = useState('');

  // Customer Recovery state
  const [isCustomerRecovery, setIsCustomerRecovery] = useState(false);
  const [customerRecoveryStep, setCustomerRecoveryStep] = useState(1); // 1, 2, 3
  const [customerRecoveryPhone, setCustomerRecoveryPhone] = useState('');
  const [customerRecoveryOtp, setCustomerRecoveryOtp] = useState('');
  const [customerRecoveryPin, setCustomerRecoveryPin] = useState('');
  const [customerRecoveryConfirmPin, setCustomerRecoveryConfirmPin] = useState('');

  // Supplier Recovery state
  const [isSupplierRecovery, setIsSupplierRecovery] = useState(false);
  const [supplierRecoveryStep, setSupplierRecoveryStep] = useState(1); // 1, 2, 3
  const [supplierRecoveryPhone, setSupplierRecoveryPhone] = useState('');
  const [supplierRecoveryOtp, setSupplierRecoveryOtp] = useState('');
  const [supplierRecoveryPin, setSupplierRecoveryPin] = useState('');
  const [supplierRecoveryConfirmPin, setSupplierRecoveryConfirmPin] = useState('');

  // Login State
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [loginOtp, setLoginOtp] = useState('');

  // Recovery State
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('');
  const [recoveryOtp, setRecoveryOtp] = useState('');
  const [newPin, setNewPin] = useState('');

  // Signup State
  const [verificationStep, setVerificationStep] = useState(false);
  const [otp, setOtp] = useState('');
  const [signupData, setSignupData] = useState({
    businessName: '',
    locationCount: 1,
    businessType: 'Retail',
    location: '',
    mobile: '',
    email: '',
    pin: ''
  });
  
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES.find(c => c.name === 'Bangladesh') || COUNTRY_CODES[0]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!identifier.trim() || !pin.trim()) {
      setLoginError(loginMethod === 'phone'
        ? 'Enter your phone / user ID and PIN.'
        : 'Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      // Shop owners use password (email OR mobile). Short numeric secrets → employee PIN path inside login().
      const method = (loginMethod === 'phone' && pin.trim().length <= 6 && /^\d+$/.test(pin.trim()))
        ? 'PIN'
        : 'PASSWORD';
      const result = await login(identifier, pin, method, { allowSaas: false });
      if (result.success) {
        if (result.require2fa) {
          setIs2faStep(true);
          setLoginError('');
        }
      } else {
        const code = result.error || 'invalid_credentials';
        if (code === 'saas_portal_only') {
          setLoginError('SaaS accounts must sign in at the Admin portal only.');
        } else if (code === 'empty_fields') {
          setLoginError('Email/phone and password/PIN are required.');
        } else if (code === 'network_error') {
          setLoginError('Could not reach the server. Check your connection and try again.');
        } else if (code === 'server_error') {
          setLoginError('Server error during login. Restart backend (JWT fix) and try again.');
        } else if (code === 'suspended') {
          setLoginError('This account is suspended. Contact support.');
        } else if (code === 'rate_limited') {
          const sec = result.retryAfterSec || 900;
          const min = Math.ceil(sec / 60);
          setLoginError(`Too many failed attempts. Try again in ${min} minute${min === 1 ? '' : 's'} (${sec}s).`);
        } else {
          const left = result.remainingAttempts;
          const base = loginMethod === 'phone'
            ? 'Invalid phone / ID or PIN.'
            : 'Invalid email or password.';
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
      }
    } catch {
      setLoginError('Could not verify 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // --- CUSTOMER PORTAL HANDLERS ---
  const handleCustomerLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerLogin) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800)); // Smooth transit
    const res = await customerLogin(customerPhone, customerPin);
    setLoading(false);
    if (!res.success) {
      alert(res.error || 'Invalid customer phone number or security PIN.');
    }
  };

  const handleCustomerSignupStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerSignupPhone || !customerSignupName) {
      alert('Please fill out all fields.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth/phone-verify/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: customerSignupPhone }),
      });
    } catch (err) { console.warn('Phone verify request failed:', err); }
    setLoading(false);
    setCustomerSignupStep(2);
  };

  const handleSupplierSignupStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierSignupMobile || !supplierSignupName) {
      alert('Please fill out all fields.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth/phone-verify/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: supplierSignupMobile }),
      });
    } catch (err) { console.warn('Phone verify request failed:', err); }
    setLoading(false);
    setSupplierSignupStep(2);
  };

  const handleSupplierSignupStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/phone-verify/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: supplierSignupMobile, otp: supplierSignupOtp }),
      });
      const { valid } = await res.json();
      setLoading(false);
      if (!valid) {
        alert('Invalid or expired OTP code.');
        return;
      }
    } catch (err) {
      setLoading(false);
      alert('Could not reach the server to verify the code.');
      return;
    }
    setSupplierSignupStep(3);
  };

  const handleSupplierSignupStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supplierSignupPin.length < 4 || supplierSignupPin.length > 6) {
      alert('Security PIN must be between 4 and 6 digits.');
      return;
    }
    if (supplierSignupPin !== supplierSignupConfirmPin) {
      alert('PIN and Confirm PIN do not match.');
      return;
    }
    if (!supplierSignup) return;
    
    setLoading(true);
    const res = await supplierSignup({
      name: supplierSignupName,
      mobile: supplierSignupMobile,
      pin: supplierSignupPin,
      companyName: supplierSignupCompany,
      email: supplierSignupEmail
    });
    setLoading(false);
    
    if (res.success) {
      setSupplierSignupStep(4);
    } else {
      alert(res.error || 'Failed to complete supplier registration.');
    }
  };

  const handleCustomerSignupStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/phone-verify/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: customerSignupPhone, otp: customerSignupOtp }),
      });
      const { valid } = await res.json();
      setLoading(false);
      if (!valid) {
        alert('Invalid or expired OTP code.');
        return;
      }
    } catch (err) {
      setLoading(false);
      alert('Could not reach the server to verify the code.');
      return;
    }
    setCustomerSignupStep(3);
  };

  const handleCustomerSignupStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customerSignupPin.length < 4 || customerSignupPin.length > 6) {
      alert('Security PIN must be between 4 and 6 digits.');
      return;
    }
    if (customerSignupPin !== customerSignupConfirmPin) {
      alert('PIN and Confirm PIN do not match.');
      return;
    }
    if (!customerSignup) return;
    setLoading(true);
    const res = await customerSignup({
      name: customerSignupName,
      phone: customerSignupPhone,
      pin: customerSignupPin
    });
    setLoading(false);
    if (res.success) {
      setCustomerSignupStep(4);
    } else {
      alert(res.error || 'Failed to complete registration.');
    }
  };

  const handleCustomerRecoveryStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerRecoveryPhone) {
      alert('Please enter your mobile number.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth/customer-reset-pin/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: customerRecoveryPhone }),
      });
    } catch (err) { console.warn('Reset-pin request failed:', err); }
    setLoading(false);
    setCustomerRecoveryStep(2);
  };

  const handleCustomerRecoveryStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerRecoveryOtp) {
      alert('Please enter the code sent to your phone.');
      return;
    }
    // The code itself is verified together with the new PIN in step 3
    // (backend/src/api/customerAuth.ts's reset-pin/confirm does both in
    // one call) - there's no separate "just verify" endpoint to call here.
    setCustomerRecoveryStep(3);
  };

  const handleCustomerRecoveryStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customerRecoveryPin.length < 4 || customerRecoveryPin.length > 6) {
      alert('Security PIN must be between 4 and 6 digits.');
      return;
    }
    if (customerRecoveryPin !== customerRecoveryConfirmPin) {
      alert('PIN and Confirm PIN do not match.');
      return;
    }
    if (!resetCustomerPin) return;
    setLoading(true);
    const res = await resetCustomerPin(customerRecoveryPhone, customerRecoveryOtp, customerRecoveryPin);
    setLoading(false);
    if (res.success) {
      alert('PIN reset successful! You can now log in.');
      setIsCustomerRecovery(false);
      setCustomerRecoveryStep(1);
      setCustomerPhone(customerRecoveryPhone);
      setIsLogin(true);
    } else {
      alert(res.error || 'Failed to reset PIN.');
    }
  };

  const handleSupplierRecoveryStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierRecoveryPhone) {
      alert('Please enter your mobile number.');
      return;
    }
    setLoading(true);
    try {
      await apiFetch('/api/auth/supplier-reset-pin/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: supplierRecoveryPhone }),
      });
    } catch (err) { console.warn('Reset-pin request failed:', err); }
    setLoading(false);
    setSupplierRecoveryStep(2);
  };

  const handleSupplierRecoveryStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierRecoveryOtp) {
      alert('Please enter the code sent to your phone.');
      return;
    }
    // Same as the customer flow above - the code is verified together
    // with the new PIN in step 3.
    setSupplierRecoveryStep(3);
  };

  const handleSupplierRecoveryStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supplierRecoveryPin.length < 4 || supplierRecoveryPin.length > 6) {
      alert('Security PIN must be between 4 and 6 digits.');
      return;
    }
    if (supplierRecoveryPin !== supplierRecoveryConfirmPin) {
      alert('PIN and Confirm PIN do not match.');
      return;
    }
    if (!resetSupplierPin) return;
    setLoading(true);
    const res = await resetSupplierPin(supplierRecoveryPhone, supplierRecoveryOtp, supplierRecoveryPin);
    setLoading(false);
    if (res.success) {
      alert('PIN reset successful! You can now log in.');
      setIsSupplierRecovery(false);
      setSupplierRecoveryStep(1);
      setSupplierPhone(supplierRecoveryPhone);
    } else {
      alert(res.error || 'Failed to reset PIN.');
    }
  };

  const validateEmail = (email: string) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validatePhoneNumber = (phone: string, country: typeof COUNTRY_CODES[0]) => {
      // If the selected country has a specific regex, use it
      if (country.regex) {
          // Note: Input is clean digits, regex should match full number without country code
          return country.regex.test(phone);
      }
      // Default fallback if no regex (6 to 15 digits)
      return /^\d{6,15}$/.test(phone);
  };

  const initiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupData.mobile) {
        alert("Mobile number is required for verification.");
        return;
    }

    // Strict Phone Validation
    const cleanMobile = signupData.mobile.replace(/\D/g, '').replace(/^0+/, ''); // Remove non-digits and leading zeros
    if (!validatePhoneNumber(cleanMobile, selectedCountry)) {
        alert(`Invalid phone number format for ${selectedCountry.name}.\nPlease enter a valid mobile number (e.g. for BD: 1712345678).`);
        return;
    }

    if (!signupData.email || !validateEmail(signupData.email)) {
        alert("Please enter a valid email address.");
        return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/api/auth/phone-verify/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: `${selectedCountry.code}${cleanMobile}` }),
      });
      const body = await res.json().catch(() => ({} as any));
      if (!res.ok) {
        const msg =
          body.error ||
          body.message ||
          (typeof body === 'string' ? body : null) ||
          (res.status === 429
            ? 'Please wait a moment before requesting another OTP (cooldown / rate limit).'
            : `Could not send verification code (${res.status}). Check backend SMS/OTP config.`);
        alert(msg);
        setLoading(false);
        return;
      }
      if (body.devCode) {
        console.info('[OTP dev]', body.devCode);
        alert(`Dev OTP (also in backend console): ${body.devCode}`);
      }
      setVerificationStep(true);
    } catch (err: any) {
      console.warn('Phone verify request failed:', err);
      alert(err?.message || 'Could not reach server to send OTP. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const completeSignup = async (e: React.FormEvent) => {
      e.preventDefault();
      const cleanMobile = signupData.mobile.replace(/\D/g, '').replace(/^0+/, '');
      setLoading(true);
      try {
        const res = await apiFetch('/api/auth/phone-verify/confirm', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: `${selectedCountry.code}${cleanMobile}`, otp }),
        });
        const { valid } = await res.json();
        if (!valid) {
          setLoading(false);
          alert("Invalid or expired verification code.");
          return;
        }
      } catch (err) {
        setLoading(false);
        alert("Could not reach the server to verify the code.");
        return;
      }

      const result = await signup({ ...signupData, mobile: `${selectedCountry.code}${cleanMobile}` });
      setLoading(false);

      if (result.success) {
        alert('Account created! Free trial started:\n• 5 products · 3 customers\n• 5 buys · 10 sells · 5 expenses · 20 quick sales');
        return;
      }

      const err = (result.error || '').toLowerCase();
      if (err.includes('email already') || err.includes('mobile already') || err.includes('already exists')) {
        const goLogin = confirm(
          (result.error || 'This email or mobile is already registered.') +
          '\n\nOpen login instead?'
        );
        if (goLogin) {
          setIsLogin(true);
          setVerificationStep(false);
        }
        return;
      }
      alert(result.error || 'Could not create your account. Please try again.');
  };

  const handleInitiateRecovery = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const success = await recoverAccount(recoveryIdentifier);
      if (success) {
          setRecoveryVerificationStep(true);
      }
      setLoading(false);
  };

  const handleResetPin = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      const success = await resetPassword(recoveryIdentifier, recoveryOtp, newPin);
      if (success) {
          alert("PIN successfully reset. You can now login.");
          setIsRecoveryStep(false);
          setRecoveryVerificationStep(false);
          setIsLogin(true);
      } else {
          alert("Invalid recovery code. Please try again.");
      }
      setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden w-full max-w-4xl flex flex-col md:flex-row min-h-[600px]">
        
        {/* Left Side - Hero / Branding */}
        <div className="w-full md:w-1/2 bg-[#050505] p-6 sm:p-8 md:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#334155 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6 sm:mb-8 md:mb-12">
                <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white text-xl shadow-lg shadow-indigo-500/30">B</div>
                <span className="text-2xl font-bold tracking-tight">Bizora</span>
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6 leading-tight">
              Scale your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">business faster.</span>
            </h1>
            <p className="text-slate-400 text-sm sm:text-base md:text-lg leading-relaxed max-w-sm">
              The all-in-one platform for modern commerce. Accounting, inventory, and POS, reimagined for modern businesses.
            </p>
          </div>

          <div className="relative z-10 space-y-4 mt-6 md:mt-0">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                <div className="bg-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
                    <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 mb-1.5 sm:mb-2" />
                    <p className="font-semibold text-xs sm:text-sm">Enterprise Grade</p>
                    <p className="text-[10px] sm:text-xs text-slate-400">Military-level security</p>
                </div>
                <div className="bg-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
                    <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 mb-1.5 sm:mb-2" />
                    <p className="font-semibold text-xs sm:text-sm">Ultra Fast</p>
                    <p className="text-[10px] sm:text-xs text-slate-400">Sub-millisecond latency</p>
                </div>
                <div className="bg-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
                    <Globe className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 mb-1.5 sm:mb-2" />
                    <p className="font-semibold text-xs sm:text-sm">Global Ready</p>
                    <p className="text-[10px] sm:text-xs text-slate-400">Multi-currency support</p>
                </div>
                <div className="bg-white/5 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10">
                    <Hash className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 mb-1.5 sm:mb-2" />
                    <p className="font-semibold text-xs sm:text-sm">Context Insights</p>
                    <p className="text-[10px] sm:text-xs text-slate-400">Predictive analytics</p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 pt-4 sm:pt-6 border-t border-white/10">
                <div className="flex -space-x-2 shrink-0">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-700 border-2 border-[#050505]"></div>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-600 border-2 border-[#050505]"></div>
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-slate-500 border-2 border-[#050505]"></div>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400">Trusted by <span className="font-bold text-white">10,000+</span> businesses worldwide</p>
            </div>
          </div>
        </div>

        {/* Right Side - Forms */}
        <div className="w-full md:w-1/2 p-5 sm:p-8 md:p-12 bg-white relative">
          <div className="max-w-md mx-auto h-full flex flex-col justify-center">
            
            {/* Auth Role Selector or Dedicated Portal Badge */}
            {lockRole ? (
              <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                    authRole === 'employee' ? 'bg-blue-100 text-blue-700' :
                    authRole === 'customer' ? 'bg-purple-100 text-purple-700' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {authRole === 'employee' ? <Users className="w-5 h-5" /> :
                     authRole === 'customer' ? <ShoppingBag className="w-5 h-5" /> :
                     <Store className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 tracking-tight">
                      {authRole === 'employee' ? 'Employee Portal' :
                       authRole === 'customer' ? 'Customer Self-Service' :
                       'Shop Owner Portal'}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {authRole === 'employee' ? 'employee.bizora.io' :
                       authRole === 'customer' ? 'customer.bizora.io' :
                       'shop.bizora.io'}
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-700 shadow-2xs">
                  Dedicated
                </span>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl mb-6 text-[11px] font-bold">
                {[
                  { id: 'business', label: 'Owner' },
                  { id: 'employee', label: 'Employee' },
                  { id: 'customer', label: 'Customer' },
                  { id: 'supplier', label: 'Supplier' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setAuthRole(tab.id as any);
                      setIsLogin(true);
                      setLoginError('');
                      // Reset Customer State
                      setCustomerSignupStep(1);
                      setCustomerRecoveryStep(1);
                      setIsCustomerRecovery(false);
                      setCustomerPhone('');
                      setCustomerPin('');
                      // Reset Supplier State
                      setIsSupplierSignup(false);
                      setSupplierSignupStep(1);
                      setSupplierPhone('');
                      setSupplierPin('');
                      // Reset general credentials
                      setIdentifier('');
                      setPin('');
                    }}
                    className={`py-2 rounded-lg text-center transition-all ${authRole === tab.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-slate-500 mb-4 text-center">
              Platform / SaaS admin? Use the{' '}
              <a
                href={(import.meta as any).env?.VITE_ADMIN_URL || 'http://localhost:5174'}
                className="font-bold text-indigo-600 hover:underline"
              >
                Admin portal
              </a>
              .
            </p>

            <div className="mb-6">
              <h2 className="text-3xl font-bold text-slate-900 mb-2">
                {authRole === 'customer' ? (
                  isCustomerRecovery ? (
                    customerRecoveryStep === 1 ? 'Recover PIN' :
                    customerRecoveryStep === 2 ? 'Verify OTP' :
                    'Set New PIN'
                  ) : isLogin ? (
                    'Customer Portal'
                  ) : (
                    customerSignupStep === 1 ? 'Customer Signup' :
                    customerSignupStep === 2 ? 'Verify OTP' :
                    customerSignupStep === 3 ? 'Set Security PIN' :
                    'Welcome Aboard!'
                  )
                ) : isRecoveryStep ? (
                  (recoveryVerificationStep ? 'Reset PIN' : 'Recover Account')
                ) : isLogin ? (
                  (is2faStep ? 'Two-Factor Auth' : 'Welcome Back')
                ) : (
                  (verificationStep ? 'Verify Mobile' : 'Create Account')
                )}
              </h2>
              <p className="text-slate-500 text-sm">
                {authRole === 'customer' ? (
                  isCustomerRecovery ? (
                    customerRecoveryStep === 1 ? 'Enter your registered mobile number to receive an OTP.' :
                    customerRecoveryStep === 2 ? 'Enter the 6-digit OTP code sent to your mobile.' :
                    'Choose a secure 4-6 digit Security PIN.'
                  ) : isLogin ? (
                    'Securely access your active transactions, payment history and dues.'
                  ) : (
                    customerSignupStep === 1 ? 'Register as a Bizora Customer using your mobile number.' :
                    customerSignupStep === 2 ? 'Enter the 6-digit verification code sent to your mobile.' :
                    customerSignupStep === 3 ? 'Choose a secure 4-6 digit Security PIN.' :
                    'Your Bizora Customer account is ready!'
                  )
                ) : isRecoveryStep ? (
                  (recoveryVerificationStep 
                      ? 'Enter the code sent to you and choose a new PIN.' 
                      : 'Enter your email or phone to receive a recovery code.')
                ) : isLogin ? (
                  (is2faStep 
                      ? 'Enter the 2FA code from your authenticator app.' 
                      : 'Enter your credentials to access your dashboard.')
                ) : (
                  (verificationStep 
                      ? `Enter the code sent to ${selectedCountry.code} ${signupData.mobile}` 
                      : 'Start your journey with Bizora today.')
                )}
              </p>
            </div>

            {/* SUPPLIER PORTAL INTERFACE */}
            {authRole === 'supplier' ? (
              isSupplierRecovery ? (
                // SUPPLIER RECOVERY FLOWS
                supplierRecoveryStep === 1 ? (
                  <form onSubmit={handleSupplierRecoveryStep1} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Supplier Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="tel"
                          value={supplierRecoveryPhone}
                          onChange={(e) => setSupplierRecoveryPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="e.g. 01712345678"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Verification OTP"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsSupplierRecovery(false)}
                      className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Back to Login
                    </button>
                  </form>
                ) : supplierRecoveryStep === 2 ? (
                  <form onSubmit={handleSupplierRecoveryStep2} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Enter Verification Code</label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={supplierRecoveryOtp}
                          onChange={(e) => setSupplierRecoveryOtp(e.target.value)}
                          className="w-full pl-10 pr-4 py-3.5 text-center text-xl tracking-widest font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="123456"
                          maxLength={6}
                          required
                        />
                      </div>
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                        A 6-digit code has been sent to this number.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify OTP"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSupplierRecoveryStep(1)}
                      className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Back to Mobile Number
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleSupplierRecoveryStep3} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">New Security PIN</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="password"
                          value={supplierRecoveryPin}
                          onChange={(e) => setSupplierRecoveryPin(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="Enter 4-6 digit PIN"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirm New PIN</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="password"
                          value={supplierRecoveryConfirmPin}
                          onChange={(e) => setSupplierRecoveryConfirmPin(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="Re-enter PIN"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Security PIN"}
                    </button>
                  </form>
                )
              ) : isSupplierSignup ? (
                // SUPPLIER SIGNUP FLOWS
                supplierSignupStep === 1 ? (
                  <form onSubmit={handleSupplierSignupStep1} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Supplier Name</label>
                      <input type="text" value={supplierSignupName} onChange={(e) => setSupplierSignupName(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="e.g. John Doe" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Company Name (Optional)</label>
                      <input type="text" value={supplierSignupCompany} onChange={(e) => setSupplierSignupCompany(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="e.g. Apex Supplies Ltd." />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Mobile Number</label>
                      <input type="tel" value={supplierSignupMobile} onChange={(e) => setSupplierSignupMobile(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="e.g. 01712345678" required />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Email (Optional)</label>
                      <input type="email" value={supplierSignupEmail} onChange={(e) => setSupplierSignupEmail(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="e.g. contact@company.com" />
                    </div>
                    <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold">Continue</button>
                    <button type="button" onClick={() => setIsSupplierSignup(false)} className="w-full text-sm text-slate-500">Back to Login</button>
                  </form>
                ) : supplierSignupStep === 2 ? (
                  <form onSubmit={handleSupplierSignupStep2} className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Enter Verification Code</label>
                    <input type="text" value={supplierSignupOtp} onChange={(e) => setSupplierSignupOtp(e.target.value)} className="w-full p-3 border rounded-xl text-center text-xl tracking-widest font-mono" placeholder="123456" maxLength={6} required />
                    <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">A 6-digit code has been sent to this number.</p>
                    <button type="submit" className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold">Verify OTP</button>
                  </form>
                ) : supplierSignupStep === 3 ? (
                  <form onSubmit={handleSupplierSignupStep3} className="space-y-4">
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Set Security PIN</label>
                    <input type="password" value={supplierSignupPin} onChange={(e) => setSupplierSignupPin(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="4-6 digit PIN" maxLength={6} required />
                    <input type="password" value={supplierSignupConfirmPin} onChange={(e) => setSupplierSignupConfirmPin(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="Confirm PIN" maxLength={6} required />
                    <button type="submit" className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold">Complete Setup</button>
                  </form>
                ) : (
                  <div className="text-center">
                    <p className="text-lg font-bold mb-4">Your Supplier Account has been created successfully.</p>
                    <button onClick={() => { setIsSupplierSignup(false); setSupplierSignupStep(1); }} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold">Back to Login</button>
                  </div>
                )
              ) : (
                // SUPPLIER LOGIN FORM
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!supplierLogin) return;
                    setLoading(true);
                    const res = await supplierLogin(supplierPhone, supplierPin);
                    setLoading(false);
                    if (!res.success) {
                        alert(res.error || 'Invalid mobile or PIN.');
                    }
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="tel"
                        value={supplierPhone}
                        onChange={(e) => setSupplierPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                        placeholder="e.g. 01712345678"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-sm font-bold text-slate-700">Security PIN</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsSupplierRecovery(true);
                          setSupplierRecoveryStep(1);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        value={supplierPin}
                        onChange={(e) => setSupplierPin(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                        placeholder="••••"
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#050505] text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-6"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        Sign In as Supplier <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <div className="mt-8 text-center text-sm text-slate-500">
                    Are you a new supplier?{' '}
                    <button type="button" onClick={() => setIsSupplierSignup(true)} className="font-bold text-indigo-600 hover:text-indigo-800">
                      Register Portal Account
                    </button>
                  </div>
                </form>
              )
            ) : authRole === 'customer' ? (
              isCustomerRecovery ? (
                // CUSTOMER RECOVERY FLOWS
                customerRecoveryStep === 1 ? (
                  <form onSubmit={handleCustomerRecoveryStep1} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="tel"
                          value={customerRecoveryPhone}
                          onChange={(e) => setCustomerRecoveryPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="e.g. 01712345678"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Verification OTP"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCustomerRecovery(false)}
                      className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Back to Login
                    </button>
                  </form>
                ) : customerRecoveryStep === 2 ? (
                  <form onSubmit={handleCustomerRecoveryStep2} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Enter Verification Code</label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={customerRecoveryOtp}
                          onChange={(e) => setCustomerRecoveryOtp(e.target.value)}
                          className="w-full pl-10 pr-4 py-3.5 text-center text-xl tracking-widest font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="123456"
                          maxLength={6}
                          required
                        />
                      </div>
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                        A 6-digit code has been sent to this number.
                      </p>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify OTP"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerRecoveryStep(1)}
                      className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Back to Mobile Number
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleCustomerRecoveryStep3} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">New Security PIN</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="password"
                          value={customerRecoveryPin}
                          onChange={(e) => setCustomerRecoveryPin(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="Enter 4-6 digit PIN"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirm New PIN</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="password"
                          value={customerRecoveryConfirmPin}
                          onChange={(e) => setCustomerRecoveryConfirmPin(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="Re-enter PIN"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Save Security PIN"}
                    </button>
                  </form>
                )
              ) : isLogin ? (
                // CUSTOMER LOGIN FORM
                <form onSubmit={handleCustomerLogin} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Mobile Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                        placeholder="e.g. 01712345678"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-sm font-bold text-slate-700">Security PIN</label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomerRecovery(true);
                          setCustomerRecoveryStep(1);
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Forgot?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input
                        type="password"
                        value={customerPin}
                        onChange={(e) => setCustomerPin(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                        placeholder="••••"
                        maxLength={6}
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#050505] text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-6"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                      <>
                        Sign In as Customer <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="mt-8 text-center text-sm text-slate-500">
                    Are you a new customer?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(false);
                        setCustomerSignupStep(1);
                      }}
                      className="font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      Register Portal Account
                    </button>
                  </div>
                </form>
              ) : (
                // CUSTOMER SIGNUP FLOWS
                customerSignupStep === 1 ? (
                  <form onSubmit={handleCustomerSignupStep1} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Full Name</label>
                      <div className="relative">
                        <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={customerSignupName}
                          onChange={(e) => setCustomerSignupName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="Your full name"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Mobile Number</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="tel"
                          value={customerSignupPhone}
                          onChange={(e) => setCustomerSignupPhone(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="e.g. 01712345678"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-4"
                    >
                      Continue <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="mt-6 text-center text-sm text-slate-500">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setIsLogin(true)}
                        className="font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Sign In
                      </button>
                    </div>
                  </form>
                ) : customerSignupStep === 2 ? (
                  <form onSubmit={handleCustomerSignupStep2} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5 text-center">OTP Verification</label>
                      <p className="text-xs text-slate-500 text-center mb-4">
                        We have simulated sending an SMS OTP to <strong>{customerSignupPhone}</strong>
                      </p>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={customerSignupOtp}
                          onChange={(e) => setCustomerSignupOtp(e.target.value)}
                          className="w-full pl-10 pr-4 py-3.5 text-center text-xl tracking-widest font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="123456"
                          maxLength={6}
                          required
                        />
                      </div>
                      <p className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                        A 6-digit code has been sent to this number.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center"
                    >
                      Verify OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerSignupStep(1)}
                      className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Back to details
                    </button>
                  </form>
                ) : customerSignupStep === 3 ? (
                  <form onSubmit={handleCustomerSignupStep3} className="space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Create Security PIN</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="password"
                          value={customerSignupPin}
                          onChange={(e) => setCustomerSignupPin(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="4-6 digit security PIN"
                          maxLength={6}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirm Security PIN</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="password"
                          value={customerSignupConfirmPin}
                          onChange={(e) => setCustomerSignupConfirmPin(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="Re-enter PIN"
                          maxLength={6}
                          required
                        />
                      </div>
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Info className="w-3 h-3" />
                        <span>PINs are securely hashed and encrypted before storing.</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Complete Registration"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomerSignupStep(2)}
                      className="w-full text-sm text-slate-500 hover:text-slate-700 font-medium"
                    >
                      Back to Verification
                    </button>
                  </form>
                ) : (
                  // REGISTRATION COMPLETE
                  <div className="space-y-6 text-center py-4">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
                      <Shield className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Portal Account Created!</h3>
                      <p className="text-sm text-slate-500 mt-2">
                        Your Bizora Customer Portal account is active. You can now access all your ledger dues and payments anytime.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsLogin(true);
                        setCustomerSignupStep(1);
                        setCustomerPhone(customerSignupPhone);
                      }}
                      className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                    >
                      Log In Now
                    </button>
                  </div>
                )
              )
            ) : (
              // STANDARD ERP USER INTERFACE (Owner, Employee, SaaS Admin)
              isRecoveryStep ? (
                recoveryVerificationStep ? (
                  // RESET PIN FORM
                  <form onSubmit={handleResetPin} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Recovery Code</label>
                      <div className="relative">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={recoveryOtp}
                          onChange={(e) => setRecoveryOtp(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                          placeholder="1234"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">New PIN</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="password"
                          value={newPin}
                          onChange={(e) => setNewPin(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                          placeholder="Enter new PIN"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Reset PIN"}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setRecoveryVerificationStep(false)}
                      className="w-full text-sm text-slate-500 hover:text-slate-700"
                    >
                      Back
                    </button>
                  </form>
                ) : (
                  // INITIATE RECOVERY FORM
                  <form onSubmit={handleInitiateRecovery} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Email or Phone Number</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="text"
                          value={recoveryIdentifier}
                          onChange={(e) => setRecoveryIdentifier(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                          placeholder="Enter your email or phone"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Recovery Code"}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setIsRecoveryStep(false)}
                      className="w-full text-sm text-slate-500 hover:text-slate-700"
                    >
                      Back to Login
                    </button>
                  </form>
                )
              ) : isLogin ? (
                is2faStep ? (
                  // 2FA LOGIN FORM
                  <form onSubmit={handle2faLogin} className="space-y-6">
                      <div>
                          <label className="block text-center text-sm font-bold text-slate-500 uppercase mb-4">Verification Code</label>
                          <div className="relative">
                              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                              <input
                                  type="text"
                                  value={loginOtp}
                                  onChange={(e) => setLoginOtp(e.target.value)}
                                  className="w-full pl-10 pr-4 py-4 text-center text-2xl tracking-widest font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                                  placeholder="..."
                                  maxLength={6}
                                  required
                              />
                          </div>
                      </div>
                      
                      <button
                          type="submit"
                          disabled={loading}
                          className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                      >
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
                      </button>
                      
                      <button 
                          type="button" 
                          onClick={() => setIs2faStep(false)}
                          className="w-full text-sm text-slate-500 hover:text-slate-700"
                      >
                          Back to Login
                      </button>
                  </form>
                ) : (
                  // STANDARD LOGIN FORM
                  <>
                  {loginError && (
                      <div role="alert" className="mb-4 text-sm font-semibold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5">
                        {loginError}
                      </div>
                    )}
                  <form onSubmit={handleLogin} className="space-y-4">
                    {/* Method Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                      <button
                        type="button"
                        onClick={() => setLoginMethod('phone')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMethod === 'phone' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                      >
                        Phone / ID
                      </button>
                      <button
                        type="button"
                        onClick={() => setLoginMethod('email')}
                        className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${loginMethod === 'email' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}
                      >
                        Email
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">
                        {loginMethod === 'phone' ? 'Phone Number / User ID' : 'Email'}
                      </label>
                      <div className="relative">
                        {loginMethod === 'phone' ? (
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        ) : (
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        )}
                        <input
                          type={loginMethod === 'phone' ? 'text' : 'email'} 
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder={loginMethod === 'phone' ? 'Enter mobile or ID' : 'name@company.com'}
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-sm font-bold text-slate-700">PIN Code</label>
                        <button 
                            type="button" 
                            onClick={() => setIsRecoveryStep(true)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                            Forgot?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                          type="password"
                          value={pin}
                          onChange={(e) => setPin(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-slate-900 transition-colors"
                          placeholder="••••"
                          maxLength={12} 
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#050505] text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-6"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                        <>
                          Sign In <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="mt-8 text-center text-sm text-slate-500">
                      Don't have an account?{' '}
                      <button type="button" onClick={() => setIsLogin(false)} className="font-bold text-indigo-600 hover:text-indigo-800">
                        Sign Up
                      </button>
                    </div>

                    <div className="mt-auto text-center text-xs text-slate-400">
                      <p>&copy; 2026 Bizora Platform. All rights reserved.</p>
                      <div className="flex justify-center gap-4 mt-2">
                        <a href="#" className="hover:text-slate-600">Privacy Policy</a>
                        <a href="#" className="hover:text-slate-600">Terms of Service</a>
                      </div>
                    </div>
                  </form>
                  </>
                )
              ) : verificationStep ? (
                // STANDARD VERIFICATION FORM
                <form onSubmit={completeSignup} className="space-y-6">
                    <div>
                        <label className="block text-center text-sm font-bold text-slate-500 uppercase mb-4">One-Time Password (OTP)</label>
                        <div className="relative">
                            <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full pl-10 pr-4 py-4 text-center text-2xl tracking-widest font-mono border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                                placeholder="..."
                                maxLength={6}
                                required
                            />
                        </div>
                    </div>
                    
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Create Account"}
                    </button>
                    
                    <button 
                        type="button" 
                        onClick={() => setVerificationStep(false)}
                        className="w-full text-sm text-slate-500 hover:text-slate-700"
                    >
                        Back to Details
                    </button>
                </form>
              ) : (
                // STANDARD SIGNUP FORM
                <form onSubmit={initiateSignup} className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t('Business Name')}</label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={signupData.businessName}
                        onChange={(e) => setSignupData({...signupData, businessName: e.target.value})}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t('Business Type')}</label>
                      <select
                        value={signupData.businessType}
                        onChange={(e) => setSignupData({...signupData, businessType: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option>Retail</option>
                        <option>Wholesale</option>
                        <option>Service</option>
                        <option>Manufacturing</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t('Number of Locations')}</label>
                      <input
                        type="number"
                        min="1"
                        value={signupData.locationCount}
                        onChange={(e) => setSignupData({...signupData, locationCount: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t('Location')}</label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        value={signupData.location}
                        onChange={(e) => setSignupData({...signupData, location: e.target.value})}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="City, Address"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t('Mobile Number')}</label>
                      <div className="flex rounded-lg shadow-sm">
                          {/* Custom Country Selector with Invisible Overlay */}
                          <div className="relative flex items-center border-y border-l border-slate-200 rounded-l-lg bg-slate-50 w-[85px]">
                              {/* Display Value - Updates on Selection */}
                              <div className="flex items-center justify-between w-full px-2 pointer-events-none">
                                  <span className="text-sm font-medium text-slate-700 truncate">{selectedCountry.code}</span>
                                  <ChevronDown className="w-3 h-3 text-slate-400" />
                              </div>
                              
                              {/* Invisible Select - Overlays the visual part */}
                              <select
                                  value={selectedCountry.name}
                                  onChange={(e) => {
                                      const c = COUNTRY_CODES.find(cnt => cnt.name === e.target.value);
                                      if(c) setSelectedCountry(c);
                                  }}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none z-10"
                                  title="Select Country"
                              >
                                  {COUNTRY_CODES.map((c) => (
                                      <option key={c.name} value={c.name}>
                                          {c.code} {c.name}
                                      </option>
                                  ))}
                              </select>
                          </div>
                          <input
                              type="tel"
                              value={signupData.mobile}
                              onChange={(e) => setSignupData({...signupData, mobile: e.target.value})}
                              className="w-full px-3 py-2 border border-slate-200 rounded-r-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 -ml-px z-0"
                              placeholder="1712345678"
                              required
                          />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t('Email')}</label>
                      <input
                        type="email"
                        value={signupData.email}
                        onChange={(e) => setSignupData({...signupData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{t('PIN Code')}</label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        maxLength={6}
                        value={signupData.pin}
                        onChange={(e) => setSignupData({...signupData, pin: e.target.value})}
                        className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Create a PIN"
                        required
                      />
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">
                        <Info className="w-3 h-3" />
                        <span>Create a secure 4-6 digit PIN for quick login.</span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 mt-4"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('Sign Up')}
                  </button>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-slate-500">
                      {isLogin ? t('Don\'t have an account?') : t('Already have an account?')}
                      <button
                        type="button"
                        onClick={() => { 
                            setIsLogin(!isLogin); 
                            setVerificationStep(false); 
                            setIs2faStep(false); 
                            setIsRecoveryStep(false);
                            setRecoveryVerificationStep(false);
                        }}
                        className="ml-2 font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        {isLogin ? t('Sign Up') : t('Login')}
                      </button>
                    </p>
                  </div>
                </form>
              )
            )}

          <p className="mt-6 text-center text-[10px] text-slate-400 select-all allow-select">{appVersionLabel()}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
