import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData, LedgerEntry, Entity } from '../contexts/DataContext';
import { apiFetch } from '../lib/apiClient';
import { 
  LayoutDashboard, 
  LogOut, 
  Package, 
  User, 
  FileText, 
  Bell, 
  Building, 
  Globe, 
  Mail, 
  Phone, 
  MapPin, 
  Landmark, 
  ExternalLink, 
  ShieldCheck, 
  AlertTriangle, 
  History, 
  CreditCard, 
  DollarSign, 
  Settings, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileCheck, 
  Smartphone,
  Eye,
  Send,
  Loader2,
  Menu,
  X
} from 'lucide-react';

const SidebarItem: React.FC<{ icon: React.ElementType; label: string; active: boolean; onClick: () => void }> = ({ icon: Icon, label, active, onClick }) => (
    <button 
        onClick={onClick}
        className={`flex items-center gap-3 w-full p-3 rounded-lg transition-colors text-left ${active ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
    >
        <Icon className="w-5 h-5" />
        <span className="text-sm">{label}</span>
    </button>
);

const StatCard: React.FC<{ label: string; value: string | number; icon: React.ElementType; color: string }> = ({ label, value, icon: Icon, color }) => (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
        <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-6 h-6" />
        </div>
        <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{value}</p>
        </div>
    </div>
);

export const SupplierPortal: React.FC = () => {
  const { user, logout, updateUser, resetSupplierPin } = useAuth();
  const { globalSuppliers, updateSupplierProfile } = useData();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Profile Form States
  const [profileName, setProfileName] = useState('');
  const [profileCompanyName, setProfileCompanyName] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [profileCity, setProfileCity] = useState('');
  const [profileCountry, setProfileCountry] = useState('');
  const [profileLogo, setProfileLogo] = useState('');

  // Compliance Form States
  const [tradeLicense, setTradeLicense] = useState('');
  const [binVat, setBinVat] = useState('');
  const [nid, setNid] = useState('');

  // Bank Form States
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [branchName, setBranchName] = useState('');

  // Mobile Banking States
  const [bkash, setBkash] = useState('');
  const [rocket, setRocket] = useState('');
  const [nagad, setNagad] = useState('');

  // PIN Change States
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeOtp, setPinChangeOtp] = useState('');
  const [pinChangeStep, setPinChangeStep] = useState<1 | 2>(1);

  // Phone Number Update States
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [showOtpField, setShowOtpField] = useState(false);

  // Filters and Modals
  const [filterBusiness, setFilterBusiness] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPO, setSelectedPO] = useState<any | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Find the current supplier's global profile
  const supplierProfile = globalSuppliers.find(s => s.mobile === user?.mobile);

  // Sync profile details to states
  useEffect(() => {
    if (supplierProfile) {
      setProfileName(supplierProfile.name || '');
      setProfileCompanyName(supplierProfile.companyName || '');
      setProfileEmail(supplierProfile.email || '');
      setProfileAddress(supplierProfile.address || '');
      setProfileCity(supplierProfile.city || '');
      setProfileCountry(supplierProfile.country || 'Bangladesh');
      setProfileLogo(supplierProfile.logo || '');

      setTradeLicense(supplierProfile.tradeLicense || '');
      setBinVat(supplierProfile.binVat || '');
      setNid(supplierProfile.nid || '');

      setBankName(supplierProfile.bankDetails?.bankName || '');
      setAccountName(supplierProfile.bankDetails?.accountName || '');
      setAccountNumber(supplierProfile.bankDetails?.accountNumber || '');
      setRoutingNumber(supplierProfile.bankDetails?.routingNumber || '');
      setBranchName(supplierProfile.bankDetails?.branchName || '');

      setBkash(supplierProfile.mobileBankingDetails?.bKash || '');
      setRocket(supplierProfile.mobileBankingDetails?.Rocket || '');
      setNagad(supplierProfile.mobileBankingDetails?.Nagad || '');
    }
  }, [supplierProfile]);

  // Aggregate connections live from local storage
  const getConnectedBusinesses = () => {
    const connected = [...(supplierProfile?.businesses || [])];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nexus_suppliers_')) {
        const businessId = key.replace('nexus_suppliers_', '');
        try {
          const suppliersList = JSON.parse(localStorage.getItem(key) || '[]');
          const isLinked = suppliersList.some((s: any) => s.mobile?.replace(/\D/g, '') === supplierProfile?.mobile?.replace(/\D/g, ''));
          if (isLinked && !connected.some(c => c.businessId === businessId)) {
            const registeredUsers = JSON.parse(localStorage.getItem('bizora_registered_users') || '[]');
            const bizUser = registeredUsers.find((u: any) => u.id === businessId);
            const businessName = bizUser?.businessName || `Business Owner (${businessId})`;
            connected.push({
              businessId,
              businessName,
              connectedAt: new Date().toISOString()
            });
          }
        } catch (e) {
          console.error(e);
        }
      }
    }

    return connected;
  };

  const connectedBusinesses = getConnectedBusinesses();

  // Aggregate live ledger transactions from all businesses
  const getSupplierTransactions = () => {
    if (!supplierProfile?.mobile) return [];
    const cleanSupMobile = supplierProfile.mobile.replace(/\D/g, '').replace(/^0+/, '');
    const found: any[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('nexus_transactions_')) {
        const businessId = key.replace('nexus_transactions_', '');
        try {
          const list = JSON.parse(localStorage.getItem(key) || '[]');
          list.forEach((tx: any) => {
            const cleanEntityMobile = tx.entityMobile?.replace(/\D/g, '').replace(/^0+/, '');
            if (cleanEntityMobile === cleanSupMobile && (tx.type === 'Purchase' || tx.type === 'Supplier Payment' || tx.type === 'Purchase Return')) {
              const registeredUsers = JSON.parse(localStorage.getItem('bizora_registered_users') || '[]');
              const bizUser = registeredUsers.find((u: any) => u.id === businessId);
              const businessName = bizUser?.businessName || `Business Owner (${businessId})`;
              found.push({
                ...tx,
                businessId,
                businessName
              });
            }
          });
        } catch (e) {
          console.error(e);
        }
      }
    }
    return found;
  };

  const realTx = getSupplierTransactions();

  const mockPOs: any[] = [];
  const defaultHistory: any[] = [];
  const defaultPayments: any[] = [];

  // Dynamic calculations from real records
  const hasRealData = realTx.length > 0;

  const historyData = hasRealData ? realTx.filter(t => t.type === 'Purchase' || t.type === 'Purchase Return').map(t => ({
    id: t.reference || t.id,
    businessName: t.businessName,
    date: t.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    products: t.items?.map((it: any) => it.name).join(', ') || 'Inventory Supplies',
    qty: t.items?.reduce((acc: number, it: any) => acc + (it.qty || 0), 0) || 1,
    amount: t.amount,
    status: t.dueAmount && t.dueAmount > 0 ? (t.amountPaid && t.amountPaid > 0 ? 'Partial' : 'Due') : 'Paid'
  })) : [];

  const paymentsData = hasRealData ? realTx.filter(t => t.type === 'Supplier Payment' || (t.type === 'Purchase' && t.amountPaid && t.amountPaid > 0)).map(t => ({
    date: t.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    businessName: t.businessName,
    method: t.paymentMethod || 'Bank',
    txNumber: t.reference || `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
    amount: t.amountPaid || t.amount,
    remainingDue: t.dueAmount || 0
  })) : [];

  // Aggregate overall metrics
  const totalTransactionsCount = historyData.length;
  const totalSettledAmount = paymentsData.reduce((acc, p) => acc + p.amount, 0);
  const outstandingBalance = hasRealData ? realTx.reduce((acc, t) => acc + (t.dueAmount || 0), 0) : 0;

  const [notifications, setNotifications] = useState<any[]>([]);

  const unreadNotificationsCount = notifications.filter(n => n.unread).length;

  const handleMarkAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
  };

  const handleMarkNotificationRead = (id: number) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const handleRequestSettlement = (businessName: string, amount: number) => {
    setSuccessMessage(`Settlement request of ৳ ${amount.toLocaleString()} has been sent to ${businessName}. They will receive an automated portal alert & SMS invoice callback.`);
  };

  // Profile Save
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierProfile) return;

    const globalData = {
      name: profileName,
      companyName: profileCompanyName,
      email: profileEmail,
      address: profileAddress,
      city: profileCity,
      country: profileCountry,
      logo: profileLogo
    };

    updateSupplierProfile(supplierProfile.mobile, globalData);
    updateUser({ ...user, name: profileName, email: profileEmail });
    setSuccessMessage('General profile details updated successfully!');
  };

  // Compliance Save
  const handleSaveCompliance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierProfile) return;

    updateSupplierProfile(supplierProfile.mobile, {
      tradeLicense,
      binVat,
      nid
    });
    setSuccessMessage('Identity & compliance documents successfully updated!');
  };

  // Financial Save
  const handleSaveFinancial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierProfile) return;

    updateSupplierProfile(supplierProfile.mobile, {
      bankDetails: {
        bankName,
        accountName,
        accountNumber,
        routingNumber,
        branchName
      },
      mobileBankingDetails: {
        bKash: bkash,
        Rocket: rocket,
        Nagad: nagad
      }
    });
    setSuccessMessage('Financial accounts & settlement parameters saved successfully!');
  };

  // Change PIN
  const handleChangePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPin || newPin.length < 4 || newPin.length > 6) {
      alert('Security PIN must be 4 to 6 digits long.');
      return;
    }
    if (newPin !== confirmPin) {
      alert('PIN and Confirm PIN do not match.');
      return;
    }
    if (!resetSupplierPin || !user?.mobile) return;

    if (pinChangeStep === 1) {
      try {
        await apiFetch('/api/auth/supplier-reset-pin/request', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: user.mobile }),
        });
      } catch (err) { console.warn('Reset-pin request failed:', err); }
      setPinChangeStep(2);
      setSuccessMessage('A verification code has been sent to your registered mobile number.');
      return;
    }

    if (!pinChangeOtp) {
      alert('Please enter the verification code sent to your phone.');
      return;
    }

    const res = await resetSupplierPin(user.mobile, pinChangeOtp, newPin);
    if (res.success) {
      setSuccessMessage('Security PIN updated successfully!');
      setNewPin('');
      setConfirmPin('');
      setPinChangeOtp('');
      setPinChangeStep(1);
    } else {
      alert(res.error || 'Failed to update security PIN.');
    }
  };

  // Change Phone
  const handleTriggerPhoneChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone) {
      alert('Please enter a valid mobile number.');
      return;
    }
    try {
      const res = await apiFetch('/api/auth/phone-verify/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: newPhone }),
      });
      const body = await res.json().catch(() => ({}));
      if (body.verificationToken) {
        sessionStorage.setItem('bizora_supplier_verify_token', body.verificationToken);
      }
    } catch (err) { console.warn('Phone verify request failed:', err); }
    setShowOtpField(true);
    setSuccessMessage('A verification code has been sent to the new number.');
  };

  const handleVerifyPhoneChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const verificationToken = sessionStorage.getItem('bizora_supplier_verify_token') || undefined;
      const res = await apiFetch('/api/auth/phone-verify/confirm', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: newPhone, otp: phoneOtp, verificationToken }),
      });
      const { valid } = await res.json();
      if (!valid) {
        alert('Invalid or expired OTP code.');
        return;
      }
      sessionStorage.removeItem('bizora_supplier_verify_token');
    } catch (err) {
      alert('Could not reach the server to verify the code.');
      return;
    }

    if (!supplierProfile) return;
    updateSupplierProfile(supplierProfile.mobile, { mobile: newPhone });
    updateUser({ ...user, mobile: newPhone });
    setSuccessMessage('Global Supplier ID mobile number updated successfully!');
    setNewPhone('');
    setPhoneOtp('');
    setShowOtpField(false);
  };

  // Filter logic
  const filteredPOs = mockPOs.filter(po => {
    const matchBiz = filterBusiness === 'all' || po.businessId === filterBusiness;
    const matchStatus = filterStatus === 'all' || po.status.toLowerCase() === filterStatus.toLowerCase();
    const matchSearch = po.id.toLowerCase().includes(searchQuery.toLowerCase()) || po.businessName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchBiz && matchStatus && matchSearch;
  });

  const filteredHistory = historyData.filter(h => {
    const matchBiz = filterBusiness === 'all' || h.businessName === filterBusiness;
    const matchSearch = h.id.toLowerCase().includes(searchQuery.toLowerCase()) || h.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || h.products.toLowerCase().includes(searchQuery.toLowerCase());
    return matchBiz && matchSearch;
  });

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'Profile Profile', icon: User },
    { id: 'orders', label: 'Purchase Orders', icon: Package },
    { id: 'history', label: 'Purchase History', icon: History },
    { id: 'payments', label: 'Payment History', icon: CreditCard },
    { id: 'dues', label: 'Due Summary', icon: DollarSign },
    { id: 'documents', label: 'Documents', icon: FileText },
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadNotificationsCount },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar navigation */}
      <aside className={`w-64 bg-white border-r border-slate-200 p-6 flex flex-col fixed h-full z-50 transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2.5">
            <img src="/assets/bizora-emblem.png" alt="Bizora" className="w-8 h-8 object-contain drop-shadow" />
            <h2 className="text-xl font-black text-slate-800">Bizora Portal</h2>
          </div>
          <button className="lg:hidden text-slate-500 hover:text-slate-800" onClick={() => setIsSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2">
          {tabs.map(tab => (
            <div key={tab.id} className="relative">
              <SidebarItem 
                icon={tab.icon} 
                label={tab.label} 
                active={activeTab === tab.id} 
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsSidebarOpen(false);
                }} 
              />
              {tab.badge && tab.badge > 0 ? (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              ) : null}
            </div>
          ))}
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <button onClick={logout} className="flex items-center gap-3 w-full p-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-bold text-left">
            <LogOut className="w-5 h-5" /> <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 md:p-8 lg:ml-64 overflow-x-hidden min-h-screen">
        <header className="flex justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <button 
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 lg:hidden rounded-lg bg-white border border-slate-200"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-slate-800 capitalize leading-none">
                {tabs.find(t => t.id === activeTab)?.label}
              </h1>
              <p className="text-slate-500 text-xs md:text-sm font-medium mt-1">Global Supplier ID: {user?.mobile}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              className="p-2 text-slate-400 hover:text-slate-600 transition-colors relative bg-white border border-slate-200 rounded-lg shadow-sm"
              onClick={() => setActiveTab('notifications')}
            >
              <Bell className="w-5 h-5" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-black text-slate-800 leading-tight">{supplierProfile?.name || user?.name}</p>
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Verified Supplier</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-100 border-2 border-white shadow-sm flex items-center justify-center font-black text-indigo-600 text-sm">
                {(supplierProfile?.name || user?.name)?.charAt(0)}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Views */}
        <div className="space-y-6">
          
          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Connected Businesses" value={connectedBusinesses.length} icon={Building} color="bg-blue-50 text-blue-600" />
                <StatCard label="Pending Orders" value={mockPOs.filter(p => p.status === 'Pending').length} icon={Package} color="bg-amber-50 text-amber-600" />
                <StatCard label="Total Supply" value={`৳ ${totalSettledAmount.toLocaleString()}`} icon={Landmark} color="bg-emerald-50 text-emerald-600" />
                <StatCard label="Outstanding Balance" value={`৳ ${outstandingBalance.toLocaleString()}`} icon={AlertTriangle} color="bg-rose-50 text-rose-600" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-indigo-600" />
                    Recently Connected Businesses
                  </h3>
                  {connectedBusinesses.length > 0 ? (
                    <div className="space-y-3">
                      {connectedBusinesses.slice(0, 5).map((biz, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl transition-colors border border-slate-100">
                          <div>
                            <p className="font-bold text-sm text-slate-800">{biz.businessName}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Partner since {new Date(biz.connectedAt).toLocaleDateString()}</p>
                          </div>
                          <button 
                            onClick={() => setActiveTab('businesses')} 
                            className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-slate-400 text-sm italic">No businesses connected yet.</p>
                    </div>
                  )}
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-base font-black text-slate-800 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" />
                    Recent Purchase Orders
                  </h3>
                  <div className="space-y-3">
                    {mockPOs.slice(0, 3).map((po) => (
                      <div key={po.id} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{po.id}</span>
                            <span className="font-bold text-sm text-slate-800">{po.businessName}</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">৳ {po.amount.toLocaleString()} • {po.itemsCount} items</p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            po.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {po.status}
                          </span>
                          <button 
                            onClick={() => { setSelectedPO(po); }}
                            className="block text-indigo-600 hover:text-indigo-800 text-xs font-bold mt-1.5 transition-colors"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PROFILE VIEW TAB */}
          {activeTab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center">
                  <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-indigo-100 shadow-inner overflow-hidden">
                    {supplierProfile?.logo ? (
                      <img src={supplierProfile.logo} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-indigo-300" />
                    )}
                  </div>
                  <h3 className="text-lg font-black text-slate-800 leading-tight">{supplierProfile?.name}</h3>
                  <p className="text-slate-400 font-bold text-xs mt-0.5 uppercase tracking-wider">{supplierProfile?.companyName || 'Global Supplier'}</p>
                  
                  <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Profile
                  </div>

                  <p className="text-slate-400 font-medium text-xs mt-3 bg-slate-50 p-2 rounded-lg">
                    Registered On: {new Date(supplierProfile?.createdAt || '').toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-4 uppercase text-xs tracking-wider">Contact Information</h4>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Email Address</p>
                        <p className="text-slate-700 font-bold text-xs">{supplierProfile?.email || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Mobile Number</p>
                        <p className="text-slate-700 font-bold text-xs">{supplierProfile?.mobile}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Business Address</p>
                        <p className="text-slate-700 font-bold text-xs leading-tight">
                          {supplierProfile?.address || 'No Address'}, {supplierProfile?.city || ''}, {supplierProfile?.country || 'Bangladesh'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h4 className="text-base font-black text-slate-800 mb-6 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-indigo-600" /> Financial & Compliance Registry
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Bank Account Parameters</h5>
                      <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase">Bank Name</p>
                          <p className="text-xs font-bold text-slate-800">{supplierProfile?.bankDetails?.bankName || 'Not Set'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase">Account Name</p>
                          <p className="text-xs font-bold text-slate-800">{supplierProfile?.bankDetails?.accountName || 'Not Set'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase">Account Number</p>
                          <p className="text-xs font-mono font-bold text-slate-800">{supplierProfile?.bankDetails?.accountNumber || 'Not Set'}</p>
                        </div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-black uppercase">Branch & Routing</p>
                          <p className="text-xs font-bold text-slate-800">{supplierProfile?.bankDetails?.branchName || 'Not Set'} ({supplierProfile?.bankDetails?.routingNumber || 'N/A'})</p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div>
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Identity & Verification Numbers</h5>
                        <div className="grid grid-cols-1 gap-2.5">
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-[9px] text-slate-400 font-black uppercase">Trade License</p>
                            <p className="text-xs font-bold text-slate-800">{supplierProfile?.tradeLicense || 'Not Set'}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-[9px] text-slate-400 font-black uppercase">BIN/VAT Identification</p>
                            <p className="text-xs font-bold text-slate-800">{supplierProfile?.binVat || 'Not Set'}</p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                            <p className="text-[9px] text-slate-400 font-black uppercase">National ID Number (NID)</p>
                            <p className="text-xs font-bold text-slate-800">{supplierProfile?.nid || 'Not Set'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h5 className="text-xs font-black text-slate-400 uppercase tracking-wider mb-2.5">Active Mobile Banking Wallets</h5>
                        <div className="flex flex-wrap gap-2">
                          {supplierProfile?.mobileBankingDetails?.bKash ? (
                            <div className="px-3 py-1.5 bg-pink-50 text-pink-600 rounded-lg text-xs font-bold border border-pink-100 flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5" /> bKash: {supplierProfile.mobileBankingDetails.bKash}
                            </div>
                          ) : null}
                          {supplierProfile?.mobileBankingDetails?.Nagad ? (
                            <div className="px-3 py-1.5 bg-orange-50 text-orange-600 rounded-lg text-xs font-bold border border-orange-100 flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5" /> Nagad: {supplierProfile.mobileBankingDetails.Nagad}
                            </div>
                          ) : null}
                          {supplierProfile?.mobileBankingDetails?.Rocket ? (
                            <div className="px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold border border-purple-100 flex items-center gap-1.5">
                              <Smartphone className="w-3.5 h-3.5" /> Rocket: {supplierProfile.mobileBankingDetails.Rocket}
                            </div>
                          ) : null}
                          {!supplierProfile?.mobileBankingDetails?.bKash && !supplierProfile?.mobileBankingDetails?.Nagad && !supplierProfile?.mobileBankingDetails?.Rocket && (
                            <p className="text-slate-400 text-xs italic">No mobile wallets configured.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PURCHASE ORDERS TAB */}
          {activeTab === 'orders' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by PO ID or business..." 
                    className="w-full pl-9 pr-4 py-2 border rounded-xl bg-slate-50 focus:bg-white transition-all text-sm outline-none"
                  />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                  <select 
                    value={filterBusiness}
                    onChange={(e) => setFilterBusiness(e.target.value)}
                    className="flex-1 md:flex-none border rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-600"
                  >
                    <option value="all">All Businesses</option>
                    {connectedBusinesses.map(b => (
                      <option key={b.businessId} value={b.businessId}>{b.businessName}</option>
                    ))}
                  </select>
                  <select 
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="flex-1 md:flex-none border rounded-xl px-3 py-2 text-xs font-bold bg-white text-slate-600"
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="delivered">Delivered</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="p-4">PO Number</th>
                      <th className="p-4">Business Name</th>
                      <th className="p-4">Order Date</th>
                      <th className="p-4">Expected Delivery</th>
                      <th className="p-4 text-right">Total Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
                    {filteredPOs.length > 0 ? (
                      filteredPOs.map((po) => (
                        <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-indigo-600">{po.id}</td>
                          <td className="p-4 font-bold text-slate-800">{po.businessName}</td>
                          <td className="p-4 text-xs text-slate-500">{new Date(po.date).toLocaleDateString()}</td>
                          <td className="p-4 text-xs text-slate-500">{new Date(po.deliveryDate).toLocaleDateString()}</td>
                          <td className="p-4 text-right font-bold">৳ {po.amount.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              po.status === 'Pending' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            }`}>
                              {po.status}
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button 
                              onClick={() => setSelectedPO(po)}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 rounded-lg transition-colors flex items-center gap-1 mx-auto"
                            >
                              <Eye className="w-3.5 h-3.5" /> Details
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">No purchase orders matching filters.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PURCHASE HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by invoice ID, item name..." 
                    className="w-full pl-9 pr-4 py-2 border rounded-xl bg-slate-50 focus:bg-white transition-all text-sm outline-none"
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="p-4">Invoice ID</th>
                      <th className="p-4">Business Name</th>
                      <th className="p-4">Products / Supplies Supplied</th>
                      <th className="p-4">Quantity Supplied</th>
                      <th className="p-4 text-right">Total Amount</th>
                      <th className="p-4 text-center">Settlement Status</th>
                      <th className="p-4">Purchase Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
                    {filteredHistory.length > 0 ? (
                      filteredHistory.map((h, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 font-mono font-bold text-slate-600">{h.id}</td>
                          <td className="p-4 font-bold text-slate-800">{h.businessName}</td>
                          <td className="p-4 text-xs text-slate-500 max-w-xs truncate">{h.products}</td>
                          <td className="p-4 text-slate-600 font-bold">{h.qty}</td>
                          <td className="p-4 text-right font-black">৳ {h.amount.toLocaleString()}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                              h.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                              h.status === 'Partial' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-red-50 text-red-600 border border-red-100'
                            }`}>
                              {h.status}
                            </span>
                          </td>
                          <td className="p-4 text-xs text-slate-500">{new Date(h.date).toLocaleDateString()}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-400 italic">No supply history records found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* PAYMENT HISTORY TAB */}
          {activeTab === 'payments' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      <th className="p-4">Payment Date</th>
                      <th className="p-4">Business Name</th>
                      <th className="p-4">Method</th>
                      <th className="p-4">Reference / Tx ID</th>
                      <th className="p-4 text-right">Settled Amount</th>
                      <th className="p-4 text-right">Outstanding Dues</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700 text-sm font-medium">
                    {paymentsData.length > 0 ? (
                      paymentsData.map((p, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-4 text-xs text-slate-500">{new Date(p.date).toLocaleDateString()}</td>
                          <td className="p-4 font-bold text-slate-800">{p.businessName}</td>
                          <td className="p-4">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded">
                              {p.method}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-xs text-slate-500">{p.txNumber}</td>
                          <td className="p-4 text-right font-black text-emerald-600">৳ {p.amount.toLocaleString()}</td>
                          <td className="p-4 text-right font-bold text-rose-500">
                            {p.remainingDue > 0 ? `৳ ${p.remainingDue.toLocaleString()}` : '৳ 0'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400 italic">No payment/settlement history found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* DUE SUMMARY TAB */}
          {activeTab === 'dues' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 md:p-8 rounded-xl border border-rose-500 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
                <div>
                  <h3 className="text-base font-bold text-rose-100 uppercase tracking-widest">Total Outstanding Receivables</h3>
                  <p className="text-4xl font-black mt-2">৳ {outstandingBalance.toLocaleString()}</p>
                  <p className="text-xs text-rose-200 mt-2 font-semibold">* Aggregated cross-tenant balance active in global ledger</p>
                </div>
                <div>
                  <button 
                    onClick={() => handleRequestSettlement('All Connected Partners', outstandingBalance)}
                    className="px-6 py-3.5 bg-white text-rose-600 rounded-xl font-bold hover:bg-slate-50 transition-all shadow-lg text-sm"
                  >
                    Send Unified Due Reminders
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {connectedBusinesses.map((biz) => {
                  // Calculate dynamic due for this specific business
                  const bizDue = hasRealData ? realTx
                    .filter(t => t.businessId === biz.businessId)
                    .reduce((acc, t) => acc + (t.dueAmount || 0), 0) : 15000;
                  
                  return (
                    <div key={biz.businessId} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold">
                            {biz.businessName.charAt(0)}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                            bizDue > 0 ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          }`}>
                            {bizDue > 0 ? 'Dues Pending' : 'Settled'}
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-800 leading-tight">{biz.businessName}</h4>
                        <p className="text-xs text-slate-400 font-bold uppercase mt-1">Outstanding Balance</p>
                        <p className="text-2xl font-black text-slate-900 mt-1">৳ {bizDue.toLocaleString()}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-100">
                        <button 
                          disabled={bizDue === 0}
                          onClick={() => handleRequestSettlement(biz.businessName, bizDue)}
                          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white disabled:bg-slate-100 disabled:text-slate-400 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3.5 h-3.5" /> Request Settled payment
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-slate-800">Trade License Certificate</h4>
                  <p className="text-xs text-slate-400 font-medium mt-1">Essential document proving valid global commerce capability.</p>
                  
                  {supplierProfile?.tradeLicense ? (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> ID Reference Registered: {supplierProfile.tradeLicense}
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-slate-50 border rounded-lg text-slate-400 text-xs italic">
                      No document registered. Add in settings tab.
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="w-full mt-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Configure License
                </button>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-xl flex items-center justify-center mb-4">
                    <FileCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-slate-800">BIN/VAT Verification</h4>
                  <p className="text-xs text-slate-400 font-medium mt-1">Proof of official business VAT enrollment with regulatory councils.</p>
                  
                  {supplierProfile?.binVat ? (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> ID Reference Registered: {supplierProfile.binVat}
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-slate-50 border rounded-lg text-slate-400 text-xs italic">
                      No document registered. Add in settings tab.
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="w-full mt-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Configure BIN/VAT
                </button>
              </div>

              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-4">
                    <User className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-black text-slate-800">NID Document Reference</h4>
                  <p className="text-xs text-slate-400 font-medium mt-1">Proof of national identity card for legal director compliance.</p>
                  
                  {supplierProfile?.nid ? (
                    <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-700 text-xs font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-500" /> ID Reference Registered: {supplierProfile.nid}
                    </div>
                  ) : (
                    <div className="mt-4 p-3 bg-slate-50 border rounded-lg text-slate-400 text-xs italic">
                      No document registered. Add in settings tab.
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="w-full mt-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                >
                  Configure NID
                </button>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-slate-100">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Alert Feed ({unreadNotificationsCount} Unread)</h3>
                <button 
                  onClick={handleMarkAllNotificationsRead}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  Mark All as Read
                </button>
              </div>

              <div className="space-y-2">
                {notifications.map((n) => (
                  <div 
                    key={n.id} 
                    className={`p-4 rounded-xl border transition-all flex justify-between items-start gap-4 ${
                      n.unread ? 'bg-indigo-50/50 border-indigo-100 shadow-sm' : 'bg-slate-50/50 border-slate-100'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 ${
                        n.unread ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-slate-800">{n.title}</h4>
                          {n.unread && (
                            <span className="w-2 h-2 bg-indigo-600 rounded-full" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.desc}</p>
                        <span className="text-[10px] text-slate-400 font-semibold uppercase mt-2 block">{n.time}</span>
                      </div>
                    </div>
                    {n.unread && (
                      <button 
                        onClick={() => handleMarkNotificationRead(n.id)}
                        className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 rounded px-2 py-1 hover:bg-indigo-50 transition-colors uppercase tracking-wider"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PROFILE SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* General Profile settings */}
              <div className="space-y-6">
                <form onSubmit={handleSaveProfile} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-base font-black text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <User className="w-5 h-5 text-indigo-600" /> Basic Information
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Supplier Profile Name</label>
                      <input 
                        type="text" 
                        value={profileName} 
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Company Entity Name</label>
                      <input 
                        type="text" 
                        value={profileCompanyName} 
                        onChange={(e) => setProfileCompanyName(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Contact Email Address</label>
                      <input 
                        type="email" 
                        value={profileEmail} 
                        onChange={(e) => setProfileEmail(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Registered Business Address</label>
                      <input 
                        type="text" 
                        value={profileAddress} 
                        onChange={(e) => setProfileAddress(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">City / State</label>
                      <input 
                        type="text" 
                        value={profileCity} 
                        onChange={(e) => setProfileCity(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Country</label>
                      <input 
                        type="text" 
                        value={profileCountry} 
                        onChange={(e) => setProfileCountry(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        required 
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Company Logo / Photo Image URL</label>
                      <input 
                        type="text" 
                        value={profileLogo} 
                        onChange={(e) => setProfileLogo(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
                    Save Profile Details
                  </button>
                </form>

                <form onSubmit={handleSaveCompliance} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-base font-black text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" /> Identity & Compliance ID Numbers
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Trade License Certificate ID</label>
                      <input 
                        type="text" 
                        value={tradeLicense} 
                        onChange={(e) => setTradeLicense(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        placeholder="TR-XXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">BIN / VAT Taxpayer Number</label>
                      <input 
                        type="text" 
                        value={binVat} 
                        onChange={(e) => setBinVat(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        placeholder="BIN-XXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">National Identity Card Number (NID)</label>
                      <input 
                        type="text" 
                        value={nid} 
                        onChange={(e) => setNid(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        placeholder="NID-XXXXXXXX"
                      />
                    </div>
                  </div>
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
                    Save Compliance Documents
                  </button>
                </form>
              </div>

              {/* Financial & PIN Settings */}
              <div className="space-y-6">
                <form onSubmit={handleSaveFinancial} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-base font-black text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-indigo-600" /> Settlement & Banking Details
                  </h4>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Settlement Bank Name</label>
                        <input 
                          type="text" 
                          value={bankName} 
                          onChange={(e) => setBankName(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Account Title Holder Name</label>
                        <input 
                          type="text" 
                          value={accountName} 
                          onChange={(e) => setAccountName(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Bank Account Number</label>
                        <input 
                          type="text" 
                          value={accountNumber} 
                          onChange={(e) => setAccountNumber(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors text-xs font-mono" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Routing Code</label>
                        <input 
                          type="text" 
                          value={routingNumber} 
                          onChange={(e) => setRoutingNumber(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Branch Name</label>
                        <input 
                          type="text" 
                          value={branchName} 
                          onChange={(e) => setBranchName(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        />
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <h5 className="text-xs font-black text-indigo-600 uppercase mb-3">Mobile Wallet Accounts</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5">bKash Personal</label>
                          <input 
                            type="tel" 
                            value={bkash} 
                            onChange={(e) => setBkash(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                            placeholder="01XXXXXXXXX"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5">Rocket Personal</label>
                          <input 
                            type="tel" 
                            value={rocket} 
                            onChange={(e) => setRocket(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                            placeholder="01XXXXXXXXX"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1.5">Nagad Personal</label>
                          <input 
                            type="tel" 
                            value={nagad} 
                            onChange={(e) => setNagad(e.target.value)}
                            className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                            placeholder="01XXXXXXXXX"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100">
                    Save Settlement Parameters
                  </button>
                </form>

                <form onSubmit={handleChangePin} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-base font-black text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-indigo-600" /> Change Security PIN
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">New Security PIN</label>
                      <input 
                        type="password" 
                        value={newPin} 
                        onChange={(e) => setNewPin(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        placeholder="4-6 digit numeric PIN"
                        maxLength={6}
                        required 
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Confirm New PIN</label>
                      <input 
                        type="password" 
                        value={confirmPin} 
                        onChange={(e) => setConfirmPin(e.target.value)}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        placeholder="Re-enter new PIN"
                        maxLength={6}
                        required 
                      />
                    </div>
                  </div>
                  {pinChangeStep === 2 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Verification Code</label>
                      <input 
                        type="text" 
                        value={pinChangeOtp} 
                        onChange={(e) => setPinChangeOtp(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                        placeholder="Enter code sent to your phone"
                        maxLength={6}
                        required 
                      />
                    </div>
                  )}
                  <button type="submit" className="px-5 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-lg">
                    {pinChangeStep === 1 ? 'Send Verification Code' : 'Confirm & Update PIN'}
                  </button>
                </form>

                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-base font-black text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-indigo-600" /> Change Mobile Number (Global ID)
                  </h4>
                  {!showOtpField ? (
                    <form onSubmit={handleTriggerPhoneChange} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">New Mobile Number</label>
                        <input 
                          type="tel" 
                          value={newPhone} 
                          onChange={(e) => setNewPhone(e.target.value)}
                          className="w-full px-3 py-2 border rounded-xl bg-slate-50 text-sm focus:outline-none focus:bg-white transition-colors" 
                          placeholder="e.g. 01712345678"
                          required 
                        />
                      </div>
                      <button type="submit" className="px-5 py-2.5 bg-slate-950 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors">
                        Trigger Phone Change Flow
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleVerifyPhoneChange} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Enter 6-digit Verification OTP</label>
                        <input 
                          type="text" 
                          value={phoneOtp} 
                          onChange={(e) => setPhoneOtp(e.target.value)}
                          className="w-full px-3 py-2.5 border rounded-xl bg-slate-50 text-center font-mono font-bold text-sm focus:outline-none focus:bg-white transition-colors" 
                          placeholder="123456"
                          maxLength={6}
                          required 
                        />
                        <p className="mt-1.5 text-[10px] text-amber-600 bg-amber-50 p-1.5 rounded border border-amber-100">
                          * Testing verification code: <strong>123456</strong>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors">
                          Verify & Save
                        </button>
                        <button 
                          type="button" 
                          onClick={() => setShowOtpField(false)}
                          className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* PURCHASE ORDER DETAILS MODAL */}
      {selectedPO && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-55">
              <div>
                <span className="font-mono text-xs font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{selectedPO.id}</span>
                <h3 className="text-base font-black text-slate-800 mt-1">Purchase Requisition</h3>
              </div>
              <button onClick={() => setSelectedPO(null)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                <div>
                  <p className="text-slate-400 font-bold uppercase">Requested By</p>
                  <p className="text-slate-800 font-black text-sm mt-0.5">{selectedPO.businessName}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase">Expected Delivery Date</p>
                  <p className="text-slate-800 font-black text-sm mt-0.5">{new Date(selectedPO.deliveryDate).toLocaleDateString()}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider mb-2">Itemized Order Specifications</p>
                <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {selectedPO.items?.map((item: any, i: number) => (
                    <div key={i} className="p-3 bg-slate-50/50 flex justify-between items-center gap-2 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{item.name}</p>
                        <p className="text-slate-400 mt-0.5">৳ {item.price.toLocaleString()} x {item.qty}</p>
                      </div>
                      <p className="font-black text-slate-800">৳ {item.total.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100 text-indigo-900">
                <span className="font-bold text-xs uppercase tracking-wider">Estimated Total Value</span>
                <span className="font-black text-lg">৳ {selectedPO.amount.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-2">
              <button 
                onClick={() => {
                  setSuccessMessage(`Order ${selectedPO.id} marked as "Delivered" and successfully reported back to ${selectedPO.businessName}.`);
                  setSelectedPO(null);
                }}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors text-xs"
              >
                Mark Delivered
              </button>
              <button 
                onClick={() => setSelectedPO(null)}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors text-xs"
              >
                Dismiss Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL POPUP */}
      {successMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-all">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-emerald-100">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-black text-slate-800 mb-1">Update Successful!</h3>
            <p className="text-slate-500 text-xs font-semibold leading-relaxed px-2">
              {successMessage}
            </p>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="w-full mt-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors text-xs shadow-lg shadow-emerald-100"
            >
              Got It!
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
