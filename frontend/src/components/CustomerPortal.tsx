import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { apiFetch } from '../lib/apiClient';
import { 
    User, Phone, MapPin, Hash, Shield, Key, Lock, ArrowRight, CheckCircle, 
    Search, Calendar, Bell, Plus, Filter, ArrowUpRight, ArrowDownLeft, 
    RefreshCw, Settings, Camera, LogOut, Info, AlertTriangle, MessageSquare, 
    ShoppingBag, CreditCard, ChevronRight, X, Edit2, Check, ExternalLink, Globe
} from 'lucide-react';

export const CustomerPortal: React.FC = () => {
  const { user, logout, updateUser, resetCustomerPin, registeredUsers } = useAuth();
  const { t, currencySymbol } = useSettings();
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'businesses' | 'transactions' | 'payments' | 'notifications' | 'settings'>('dashboard');
  const [confirmLogout, setConfirmLogout] = useState(false);
  
  // Transactions and business state aggregated in real-time
  const [dataVersion, setDataVersion] = useState(0);

  // Normalise customer mobile for comparison
  const customerMobile = user?.mobile || '';
  const cleanCustomerMobile = customerMobile.replace(/\D/g, '').replace(/^0+/, '');

  // Derived real-time transactional data
  const { transactions, businesses, dueSummary } = useMemo(() => {
    const allTransactions: any[] = [];
    const businessMap: Record<string, any> = {};

    registeredUsers.forEach((merchant: any) => {
      const rawTx = localStorage.getItem(`nexus_transactions_${merchant.id}`);
      if (!rawTx) return;
      try {
        const txList = JSON.parse(rawTx);
        txList.forEach((tx: any) => {
          const entityMob = tx.entityMobile || '';
          const cleanEntityMob = entityMob.replace(/\D/g, '').replace(/^0+/, '');
          
          if (cleanEntityMob && cleanCustomerMobile && cleanEntityMob.endsWith(cleanCustomerMobile)) {
            const invoiceNum = tx.reference || tx.id || `INV-${tx.id.substring(0, 5).toUpperCase()}`;
            allTransactions.push({
              ...tx,
              invoiceNum,
              businessId: merchant.id,
              businessName: merchant.businessName || merchant.name || 'Bizora Store'
            });

            // Aggregate by business
            const bizName = merchant.businessName || merchant.name || 'Bizora Store';
            if (!businessMap[merchant.id]) {
              businessMap[merchant.id] = {
                id: merchant.id,
                name: bizName,
                totalPurchase: 0,
                paidAmount: 0,
                currentDue: 0,
                lastTransactionDate: '',
                transactionsCount: 0
              };
            }

            const amount = tx.amount || 0;
            const paid = tx.amountPaid || 0;
            const due = tx.dueAmount || 0;

            businessMap[merchant.id].totalPurchase += amount;
            businessMap[merchant.id].paidAmount += paid;
            businessMap[merchant.id].currentDue += due;
            businessMap[merchant.id].transactionsCount += 1;

            if (!businessMap[merchant.id].lastTransactionDate || new Date(tx.date) > new Date(businessMap[merchant.id].lastTransactionDate)) {
              businessMap[merchant.id].lastTransactionDate = tx.date;
            }
          }
        });
      } catch (e) {
        console.error("Error parsing merchant transactions:", e);
      }
    });

    // Sort transactions by date descending
    allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Compute Due Summary
    let totalPurchase = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let lastPayment = 0;
    let lastPurchaseDate = '';

    allTransactions.forEach((tx) => {
      totalPurchase += tx.amount || 0;
      totalPaid += tx.amountPaid || 0;
      totalDue += tx.dueAmount || 0;
      
      if (tx.amountPaid > 0 && lastPayment === 0) {
        lastPayment = tx.amountPaid;
      }
      if (tx.type === 'Sale' && !lastPurchaseDate) {
        lastPurchaseDate = tx.date;
      }
    });

    return {
      transactions: allTransactions,
      businesses: Object.values(businessMap),
      dueSummary: {
        totalPurchase,
        totalPaid,
        totalDue,
        lastPayment,
        lastPurchaseDate
      }
    };
  }, [registeredUsers, cleanCustomerMobile, dataVersion]);

  // Notifications State (Pre-populated from transaction events or system warnings)
  const [notifications, setNotifications] = useState<any[]>(() => {
    const saved = localStorage.getItem(`customer_notifications_${user?.id}`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Default initial notifications based on transactions
    const initialNotifs = [
      {
        id: 'n-welcome',
        title: 'Welcome to Customer Portal',
        message: 'Securely manage your dues, view invoices, and update profile credentials online.',
        type: 'info',
        date: new Date().toISOString(),
        read: false
      }
    ];
    return initialNotifs;
  });

  useEffect(() => {
    localStorage.setItem(`customer_notifications_${user?.id}`, JSON.stringify(notifications));
  }, [notifications, user?.id]);

  // Sync transactional notifications dynamically
  useEffect(() => {
    if (transactions.length > 0) {
      const lastTx = transactions[0];
      const hasNotify = notifications.some(n => n.id === `tx-notify-${lastTx.id}`);
      if (!hasNotify) {
        const newNotif = {
          id: `tx-notify-${lastTx.id}`,
          title: lastTx.dueAmount > 0 ? 'New Due Statement' : 'Invoice Payment Success',
          message: lastTx.dueAmount > 0 
            ? `New sale of ${currencySymbol}${lastTx.amount} from "${lastTx.businessName}" with an outstanding due of ${currencySymbol}${lastTx.dueAmount}.`
            : `Your payment of ${currencySymbol}${lastTx.amountPaid} to "${lastTx.businessName}" was successfully recorded.`,
          type: lastTx.dueAmount > 0 ? 'warning' : 'success',
          date: lastTx.date,
          read: false
        };
        setNotifications(prev => [newNotif, ...prev]);
      }
    }
  }, [transactions, currencySymbol]);

  // Filtering states for Transaction History
  const [filterBusiness, setFilterBusiness] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterDate, setFilterDate] = useState('');

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchBiz = filterBusiness === 'All' || tx.businessId === filterBusiness;
      const matchStatus = filterStatus === 'All' || (
        filterStatus === 'Paid' ? tx.dueAmount === 0 : tx.dueAmount > 0
      );
      const matchDate = !filterDate || tx.date.startsWith(filterDate);
      return matchBiz && matchStatus && matchDate;
    });
  }, [transactions, filterBusiness, filterStatus, filterDate]);

  // Profile Settings Edit States
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    avatar: user?.avatar || '',
    address: user?.location || ''
  });
  
  const [pinForm, setPinForm] = useState({
    currentPin: '',
    newPin: '',
    confirmPin: '',
    otp: '',
    step: 1 // 1: enter new pin, 2: enter the code sent to confirm
  });

  // Mobile number update states (with OTP verification)
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [mobileForm, setMobileForm] = useState({
    newMobile: '',
    otp: '',
    step: 1 // 1: input mobile, 2: verify OTP
  });

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateUser({
      name: profileForm.name,
      avatar: profileForm.avatar,
      location: profileForm.address
    });
    alert('Profile updated successfully.');
  };

  const handleUpdatePin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pinForm.newPin !== pinForm.confirmPin) {
      alert('New PIN and Confirm PIN do not match.');
      return;
    }
    if (pinForm.newPin.length < 4 || pinForm.newPin.length > 6) {
      alert('PIN must be between 4 and 6 digits.');
      return;
    }

    if (pinForm.step === 1) {
      try {
        await apiFetch('/api/auth/customer-reset-pin/request', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: customerMobile }),
        });
      } catch (err) { console.warn('Reset-pin request failed:', err); }
      setPinForm(prev => ({ ...prev, step: 2 }));
      alert('A verification code has been sent to your registered mobile number.');
      return;
    }

    if (!pinForm.otp) {
      alert('Please enter the verification code sent to your phone.');
      return;
    }
    if (resetCustomerPin) {
      const res = await resetCustomerPin(customerMobile, pinForm.otp, pinForm.newPin);
      if (res.success) {
        alert('Security PIN updated successfully.');
        setPinForm({ currentPin: '', newPin: '', confirmPin: '', otp: '', step: 1 });
      } else {
        alert(res.error || 'Failed to update PIN.');
      }
    }
  };

  const handleMobileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mobileForm.step === 1) {
      if (!mobileForm.newMobile) {
        alert('Please enter a valid mobile number.');
        return;
      }
      try {
        const res = await apiFetch('/api/auth/phone-verify/request', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: mobileForm.newMobile }),
        });
        const body = await res.json().catch(() => ({}));
        if (body.verificationToken) {
          sessionStorage.setItem('bizora_customer_verify_token', body.verificationToken);
        }
      } catch (err) { console.warn('Phone verify request failed:', err); }
      // Go to Step 2 (OTP)
      setMobileForm(prev => ({ ...prev, step: 2 }));
    } else {
      try {
        const verificationToken = sessionStorage.getItem('bizora_customer_verify_token') || undefined;
        const res = await apiFetch('/api/auth/phone-verify/confirm', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: mobileForm.newMobile, otp: mobileForm.otp, verificationToken }),
        });
        const { valid } = await res.json();
        if (!valid) {
          alert('Invalid or expired OTP code.');
          return;
        }
        sessionStorage.removeItem('bizora_customer_verify_token');
      } catch (err) {
        alert('Could not reach the server to verify the code.');
        return;
      }
      
      // Verification Successful: update phone number!
      const oldMobile = customerMobile;
      updateUser({ mobile: mobileForm.newMobile });
      
      // Update phone number in the underlying customer list
      const rawCustomers = localStorage.getItem('bizora_saas_customers');
      if (rawCustomers) {
        try {
          const list = JSON.parse(rawCustomers);
          const idx = list.findIndex((c: any) => c.phone === oldMobile);
          if (idx !== -1) {
            list[idx].phone = mobileForm.newMobile;
            list[idx].updated_at = new Date().toISOString();
            localStorage.setItem('bizora_saas_customers', JSON.stringify(list));
          }
        } catch (err) {
          console.error("Error updating phone in saas customers:", err);
        }
      }

      alert('Mobile number updated successfully.');
      setMobileModalOpen(false);
      setMobileForm({ newMobile: '', otp: '', step: 1 });
      setDataVersion(prev => prev + 1);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const formatDateTime = (isoString: string) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const formatDateOnly = (isoString: string) => {
    if (!isoString) return '--';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  const unreadNotifCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      
      {/* HEADER BAR */}
      <header className="border-b border-slate-800 bg-slate-950/70 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/assets/bizora-emblem.png" alt="Bizora" className="w-10 h-10 object-contain drop-shadow" />
            <div>
              <span className="text-lg font-bold tracking-tight text-white">Bizora Customer Portal</span>
              <span className="ml-2 text-[10px] bg-slate-800 text-indigo-400 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Secured Access</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab('notifications')}
              className="relative p-2 text-slate-400 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl transition-all"
              title="Notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900 animate-pulse">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            {confirmLogout ? (
              <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-1 duration-200">
                <button
                  onClick={() => logout()}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-all shadow-md shadow-rose-950/30"
                  id="confirm-logout-btn"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm</span>
                </button>
                <button
                  onClick={() => setConfirmLogout(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg transition-all"
                  id="cancel-logout-btn"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setConfirmLogout(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-rose-400 hover:text-rose-300 bg-slate-950 border border-rose-950/40 hover:border-rose-900/60 rounded-xl transition-all"
                id="logout-trigger-btn"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CORE CONTENT LAYOUT */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8">
        
        {/* SIDEBAR NAVIGATION / MINI PROFILE */}
        <aside className="w-full lg:w-64 flex-shrink-0 flex flex-col gap-6">
          
          {/* PROFILE SNAPSHOT */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 flex flex-col items-center text-center shadow-xl">
            <div className="relative mb-4 group">
              <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-indigo-500 overflow-hidden flex items-center justify-center">
                {user?.avatar ? (
                  <img src={user.avatar} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-400" />
                )}
              </div>
              <button 
                onClick={() => setActiveTab('settings')}
                className="absolute bottom-0 right-0 p-1.5 bg-indigo-600 rounded-full border-2 border-slate-950 text-white hover:bg-indigo-500 transition-colors"
                title="Edit Profile"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            <h3 className="font-bold text-white text-base leading-tight truncate max-w-full">{user?.name || 'Customer Account'}</h3>
            <p className="text-xs text-slate-400 mt-1 font-mono">{user?.mobile}</p>
            
            <div className="mt-4 pt-4 border-t border-slate-850 w-full text-left space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Customer ID:</span>
                <span className="font-mono text-slate-300 font-semibold">#{user?.id}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500">Account Status:</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Verified
                </span>
              </div>
            </div>
          </div>

          {/* PORTAL NAVIGATION */}
          <nav className="bg-slate-950 border border-slate-850 rounded-2xl p-2.5 flex flex-row lg:flex-col gap-1 overflow-x-auto scrollbar-none shadow-xl">
            {[
              { id: 'dashboard', label: 'Due Overview', icon: Hash },
              { id: 'businesses', label: 'My Businesses', icon: Globe },
              { id: 'transactions', label: 'Transactions', icon: ShoppingBag },
              { id: 'payments', label: 'Payments', icon: CreditCard },
              { id: 'notifications', label: 'Alerts & Messages', icon: Bell },
              { id: 'settings', label: 'Profile Settings', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                    isActive 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/30 font-semibold' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

        </aside>

        {/* MAIN VIEWPORT */}
        <main className="flex-1 min-w-0">
          
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-6 lg:p-8 min-h-[500px] shadow-xl relative">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-10"></div>
            
            <div className="relative z-10">

              {/* TAB 1: DUE OVERVIEW */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="border-b border-slate-850 pb-5">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Financial Due Overview</h2>
                    <p className="text-sm text-slate-400 mt-1">Real-time outstanding balance across all connected merchants.</p>
                  </div>

                  {/* DUE SUMMARY CARDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full pointer-events-none"></div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Purchases</p>
                      <p className="text-3xl font-extrabold text-white mt-2 font-sans">
                        {currencySymbol}{dueSummary.totalPurchase.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-4 font-medium">
                        <ShoppingBag className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Last purchase: {formatDateOnly(dueSummary.lastPurchaseDate)}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 border border-slate-850 rounded-xl p-5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none"></div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Paid Amount</p>
                      <p className="text-3xl font-extrabold text-emerald-400 mt-2 font-sans">
                        {currencySymbol}{dueSummary.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-4 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Last payment: {dueSummary.lastPayment > 0 ? `${currencySymbol}${dueSummary.lastPayment}` : 'None'}</span>
                      </div>
                    </div>

                    <div className="bg-slate-900/60 border border-rose-900/50 rounded-xl p-5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-bl-full pointer-events-none"></div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Due Balance</p>
                      <p className="text-3xl font-extrabold text-rose-500 mt-2 font-sans">
                        {currencySymbol}{dueSummary.totalDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                      <div className="flex items-center gap-1.5 text-xs text-rose-400 mt-4 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span>Immediate action recommended</span>
                      </div>
                    </div>
                  </div>

                  {/* BUSINESS-WISE DUE SECTION */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                      <Globe className="w-5 h-5 text-indigo-400" />
                      Business-wise Due Accounts
                    </h3>
                    
                    {businesses.length === 0 ? (
                      <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-8 text-center text-slate-500">
                        <Globe className="w-12 h-12 mx-auto opacity-15 mb-4" />
                        <p className="font-semibold text-slate-400">No Associated Businesses Found</p>
                        <p className="text-xs mt-1">You do not have any transaction histories recorded with our partner merchants.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {businesses.map((biz: any) => (
                          <div key={biz.id} className="bg-slate-900/50 border border-slate-850 hover:border-slate-750 rounded-xl p-5 transition-all shadow-md flex flex-col justify-between">
                            <div>
                              <div className="flex justify-between items-start">
                                <h4 className="font-bold text-white text-base truncate pr-2">{biz.name}</h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${biz.currentDue > 0 ? 'bg-rose-950 text-rose-400 border border-rose-900/50' : 'bg-emerald-950 text-emerald-400 border border-emerald-900/50'}`}>
                                  {biz.currentDue > 0 ? 'Due Pending' : 'Clear'}
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                                <div>
                                  <span className="text-slate-500">Total Purchase:</span>
                                  <p className="font-semibold text-slate-300 mt-0.5">{currencySymbol}{biz.totalPurchase}</p>
                                </div>
                                <div>
                                  <span className="text-slate-500">Paid Amount:</span>
                                  <p className="font-semibold text-emerald-400 mt-0.5">{currencySymbol}{biz.paidAmount}</p>
                                </div>
                              </div>
                            </div>

                            <div className="mt-5 pt-4 border-t border-slate-850/60 flex justify-between items-center">
                              <div>
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Current Due</span>
                                <span className="text-lg font-black text-rose-500">{currencySymbol}{biz.currentDue}</span>
                              </div>
                              <button 
                                onClick={() => {
                                  setFilterBusiness(biz.id);
                                  setActiveTab('transactions');
                                }}
                                className="p-2 bg-slate-850 hover:bg-indigo-600 rounded-xl text-slate-300 hover:text-white transition-all"
                                title="View Transactions"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: MY BUSINESSES */}
              {activeTab === 'businesses' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="border-b border-slate-850 pb-5 flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">Connected Businesses</h2>
                      <p className="text-sm text-slate-400 mt-1">Merchant shops where you have active accounts.</p>
                    </div>
                    <button 
                      onClick={() => setDataVersion(prev => prev + 1)}
                      className="p-2 hover:bg-slate-800 rounded-xl transition-all text-slate-400 hover:text-white"
                      title="Sync Data"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>

                  {businesses.length === 0 ? (
                    <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-12 text-center text-slate-500">
                      <Globe className="w-16 h-16 mx-auto opacity-15 mb-4 text-indigo-500" />
                      <p className="font-semibold text-slate-400">No associated businesses</p>
                      <p className="text-xs mt-1">All businesses which record a transaction with your phone will appear here automatically.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {businesses.map((biz: any) => (
                        <div key={biz.id} className="bg-slate-900/40 border border-slate-850 hover:border-slate-800 rounded-xl p-6 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-950 border border-indigo-900/50 rounded-xl flex items-center justify-center font-bold text-indigo-400 text-lg uppercase shadow-inner">
                              {biz.name.substring(0, 2)}
                            </div>
                            <div>
                              <h3 className="font-bold text-white text-base">{biz.name}</h3>
                              <p className="text-xs text-slate-500 mt-0.5">Last Transaction: {formatDateOnly(biz.lastTransactionDate)}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-6 md:gap-12 text-center md:text-left">
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Purchases</span>
                              <span className="font-bold text-slate-300 text-sm mt-0.5">{currencySymbol}{biz.totalPurchase}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Paid</span>
                              <span className="font-bold text-emerald-400 text-sm mt-0.5">{currencySymbol}{biz.paidAmount}</span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Due Balance</span>
                              <span className="font-extrabold text-rose-500 text-sm mt-0.5">{currencySymbol}{biz.currentDue}</span>
                            </div>
                          </div>

                          <button 
                            onClick={() => {
                              setFilterBusiness(biz.id);
                              setActiveTab('transactions');
                            }}
                            className="w-full md:w-auto px-4 py-2.5 bg-slate-850 hover:bg-indigo-600 rounded-xl font-semibold text-xs text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
                          >
                            <span>Ledger Logs</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: TRANSACTION HISTORY */}
              {activeTab === 'transactions' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="border-b border-slate-850 pb-5">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Ledger Transaction History</h2>
                    <p className="text-sm text-slate-400 mt-1">Grouped and filtered overview of purchases and invoices.</p>
                  </div>

                  {/* FILTER BAR */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-900/40 border border-slate-850 p-4 rounded-xl">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter by Business</label>
                      <select 
                        value={filterBusiness}
                        onChange={(e) => setFilterBusiness(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200"
                      >
                        <option value="All">All Businesses</option>
                        {businesses.map((biz: any) => (
                          <option key={biz.id} value={biz.id}>{biz.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter by Status</label>
                      <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200"
                      >
                        <option value="All">All Statuses</option>
                        <option value="Paid">Paid (No Due)</option>
                        <option value="Due">Outstanding Due</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Filter by Date</label>
                      <input 
                        type="date"
                        value={filterDate}
                        onChange={(e) => setFilterDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-200 font-mono"
                      />
                    </div>
                  </div>

                  {/* TRANSACTION LIST */}
                  {filteredTransactions.length === 0 ? (
                    <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-12 text-center text-slate-500">
                      <ShoppingBag className="w-16 h-16 mx-auto opacity-15 mb-4 text-indigo-500" />
                      <p className="font-semibold text-slate-400">No Transactions Found</p>
                      <p className="text-xs mt-1">No transaction records match the specified search filters.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-950/40">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900/80 border-b border-slate-850 text-slate-400 font-bold">
                            <th className="p-4">Invoice No</th>
                            <th className="p-4">Date</th>
                            <th className="p-4">Business</th>
                            <th className="p-4 text-right">Amount</th>
                            <th className="p-4 text-right">Paid</th>
                            <th className="p-4 text-right">Due</th>
                            <th className="p-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {filteredTransactions.map((tx: any) => (
                            <tr key={tx.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-4 font-mono font-bold text-slate-300">#{tx.invoiceNum}</td>
                              <td className="p-4 text-slate-400 whitespace-nowrap">{formatDateOnly(tx.date)}</td>
                              <td className="p-4 font-semibold text-slate-200">{tx.businessName}</td>
                              <td className="p-4 text-right font-semibold text-slate-100">{currencySymbol}{tx.amount}</td>
                              <td className="p-4 text-right text-emerald-400 font-semibold">{currencySymbol}{tx.amountPaid || 0}</td>
                              <td className="p-4 text-right text-rose-500 font-semibold">{currencySymbol}{tx.dueAmount || 0}</td>
                              <td className="p-4 text-center">
                                <span className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full ${tx.dueAmount > 0 ? 'bg-rose-950 text-rose-400 border border-rose-900/30' : 'bg-emerald-950 text-emerald-400 border border-emerald-900/30'}`}>
                                  {tx.dueAmount > 0 ? 'Due Pending' : 'Paid'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PAYMENT HISTORY */}
              {activeTab === 'payments' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="border-b border-slate-850 pb-5">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Payment Receipts History</h2>
                    <p className="text-sm text-slate-400 mt-1">Historical ledger records of all successful payments made.</p>
                  </div>

                  {/* FILTERED PAYMENTS */}
                  {transactions.filter(tx => tx.amountPaid > 0).length === 0 ? (
                    <div className="bg-slate-900/30 border border-slate-850 rounded-xl p-12 text-center text-slate-500">
                      <CreditCard className="w-16 h-16 mx-auto opacity-15 mb-4 text-emerald-500" />
                      <p className="font-semibold text-slate-400">No Payments Logged</p>
                      <p className="text-xs mt-1">You do not have any successful payment logs captured under your profile.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {transactions.filter(tx => tx.amountPaid > 0).map((tx: any) => (
                        <div key={tx.id} className="bg-slate-900/40 border border-slate-850 rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-800 transition-all">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-xl bg-emerald-950 border border-emerald-900/30 flex items-center justify-center text-emerald-400">
                              <ArrowDownLeft className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-white">{tx.businessName}</p>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{formatDateTime(tx.date)}</span>
                                <span className="font-mono text-[10px] bg-slate-850 text-slate-400 px-1.5 py-0.5 rounded ml-2">Inv #{tx.invoiceNum}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-left sm:text-right w-full sm:w-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-850/50">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Paid Amount</span>
                            <span className="text-lg font-extrabold text-emerald-400">{currencySymbol}{tx.amountPaid}</span>
                            <span className="text-[10px] text-slate-400 mt-0.5 block">Remaining Due: {currencySymbol}{tx.dueAmount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: ALERTS & MESSAGES */}
              {activeTab === 'notifications' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                  <div className="border-b border-slate-850 pb-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">Security Alerts & Notifications</h2>
                      <p className="text-sm text-slate-400 mt-1">Transaction alerts, system warnings, and ledger alerts.</p>
                    </div>
                    <button 
                      onClick={markAllNotificationsRead}
                      className="px-3.5 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Mark all as read
                    </button>
                  </div>

                  <div className="space-y-3.5">
                    {notifications.map((notif: any) => (
                      <div key={notif.id} className={`bg-slate-900/40 border rounded-xl p-5 flex gap-4 transition-all relative ${notif.read ? 'border-slate-850' : 'border-indigo-900/50 bg-indigo-950/10'}`}>
                        {!notif.read && (
                          <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-indigo-500" title="Unread"></div>
                        )}
                        
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          notif.type === 'success' ? 'bg-emerald-950 text-emerald-400' :
                          notif.type === 'warning' ? 'bg-rose-950 text-rose-400' : 'bg-slate-850 text-slate-300'
                        }`}>
                          {notif.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
                           notif.type === 'warning' ? <AlertTriangle className="w-5 h-5" /> : <Info className="w-5 h-5" />}
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-0 pr-6">
                          <h4 className="font-bold text-white text-sm tracking-tight">{notif.title}</h4>
                          <p className="text-xs text-slate-400 leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-slate-500 font-mono block">{formatDateTime(notif.date)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: PROFILE SETTINGS */}
              {activeTab === 'settings' && (
                <div className="space-y-8 animate-in fade-in duration-300">
                  <div className="border-b border-slate-850 pb-5">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Security & Settings</h2>
                    <p className="text-sm text-slate-400 mt-1">Manage credentials and update profile verification fields.</p>
                  </div>

                  {/* USER PERSONAL DETAILS */}
                  <form onSubmit={handleUpdateProfile} className="space-y-5 bg-slate-900/30 border border-slate-850 p-6 rounded-xl">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <User className="w-4 h-4" />
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Full Name</label>
                        <input 
                          type="text"
                          value={profileForm.name}
                          onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                          placeholder="Your Name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Profile Photo URL</label>
                        <input 
                          type="text"
                          value={profileForm.avatar}
                          onChange={(e) => setProfileForm({ ...profileForm, avatar: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                          placeholder="https://example.com/avatar.jpg"
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Home/Billing Address</label>
                        <textarea 
                          value={profileForm.address}
                          onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100 h-20 resize-none"
                          placeholder="Your street address"
                        />
                      </div>
                    </div>

                    <button 
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      Save Changes
                    </button>
                  </form>

                  {/* MOBILE NUMBER SECTION */}
                  <div className="bg-slate-900/30 border border-slate-850 p-6 rounded-xl space-y-4">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5">
                      <Phone className="w-4 h-4" />
                      Verified Mobile Number
                    </h3>

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950 border border-slate-850/80 p-4 rounded-xl">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Current Mobile Number</span>
                        <span className="font-mono text-white text-base font-bold mt-1 block">{customerMobile}</span>
                        <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 mt-1">
                          <Shield className="w-3 h-3" />
                          OTP Verified
                        </span>
                      </div>
                      <button 
                        onClick={() => {
                          setMobileForm({ newMobile: '', otp: '', step: 1 });
                          setMobileModalOpen(true);
                        }}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Modify Number
                      </button>
                    </div>
                  </div>

                  {/* SECURITY PIN UPDATE */}
                  <form onSubmit={handleUpdatePin} className="space-y-5 bg-slate-900/30 border border-slate-850 p-6 rounded-xl">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                      <Lock className="w-4 h-4" />
                      Change Security PIN
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">New PIN (4-6 digits)</label>
                        <input 
                          type="password"
                          maxLength={6}
                          value={pinForm.newPin}
                          onChange={(e) => setPinForm({ ...pinForm, newPin: e.target.value.replace(/\D/g, '') })}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100 font-mono text-center tracking-widest"
                          placeholder="••••"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Confirm New PIN</label>
                        <input 
                          type="password"
                          maxLength={6}
                          value={pinForm.confirmPin}
                          onChange={(e) => setPinForm({ ...pinForm, confirmPin: e.target.value.replace(/\D/g, '') })}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100 font-mono text-center tracking-widest"
                          placeholder="••••"
                          required
                        />
                      </div>
                    </div>

                    {pinForm.step === 2 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-400 mb-1.5">Verification Code</label>
                        <input 
                          type="text"
                          maxLength={6}
                          value={pinForm.otp}
                          onChange={(e) => setPinForm({ ...pinForm, otp: e.target.value.replace(/\D/g, '') })}
                          className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100 font-mono text-center tracking-widest"
                          placeholder="Enter code sent to your phone"
                          required
                        />
                      </div>
                    )}

                    <button 
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                    >
                      <Lock className="w-4 h-4" />
                      {pinForm.step === 1 ? 'Send Verification Code' : 'Confirm & Update PIN'}
                    </button>
                  </form>

                </div>
              )}

            </div>
          </div>
        </main>

      </div>

      {/* MOBILE VERIFICATION (OTP) MODAL */}
      {mobileModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in-95 duration-200">
            <button 
              onClick={() => setMobileModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-2">Modify Mobile Number</h3>
            <p className="text-xs text-slate-400 mb-5">
              {mobileForm.step === 1 
                ? 'Enter your new mobile number. An OTP will be triggered for verification.' 
                : `Enter the 6-digit OTP code sent to ${mobileForm.newMobile}.`}
            </p>

            <form onSubmit={handleMobileSubmit} className="space-y-4">
              {mobileForm.step === 1 ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">New Mobile Number</label>
                  <input 
                    type="tel"
                    value={mobileForm.newMobile}
                    onChange={(e) => setMobileForm({ ...mobileForm, newMobile: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100 font-mono"
                    placeholder="e.g. 01919630121"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">One-Time Password (OTP)</label>
                  <input 
                    type="text"
                    maxLength={6}
                    value={mobileForm.otp}
                    onChange={(e) => setMobileForm({ ...mobileForm, otp: e.target.value.replace(/\D/g, '') })}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg px-3.5 py-3 text-center text-xl tracking-widest font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-100"
                    placeholder="••••••"
                    required
                  />
                  <span className="text-[10px] text-slate-500 mt-2 block text-center flex items-center justify-center gap-1.5">
                    <Info className="w-3.5 h-3.5" />
                    Temporary OTP for testing is <strong>123456</strong>
                  </span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold text-sm transition-colors mt-4 flex items-center justify-center gap-2"
              >
                <span>{mobileForm.step === 1 ? 'Send OTP Code' : 'Verify & Confirm'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800 bg-slate-950 py-6 text-center text-xs text-slate-500 mt-auto px-4">
        <p>&copy; {new Date().getFullYear()} Bizora ERP Platform. All rights reserved.</p>
        <p className="text-[10px] mt-1 text-slate-500 flex items-center justify-center gap-3">
          <a href="mailto:support@bizora.app" className="hover:text-indigo-400 transition-colors">support@bizora.app</a>
          <span>•</span>
          <a href="tel:+8801700000000" className="hover:text-indigo-400 transition-colors">+880 1700-000000</a>
        </p>
      </footer>

    </div>
  );
};
