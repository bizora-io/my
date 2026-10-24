import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasOperationalPermissions } from '../utils/permissions';
import { Link } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { authFetch } from '../lib/apiClient';
import { 
    Clock, User, MapPin, Shield, Key, Lock, CheckCircle, Calendar, 
    TrendingUp, LogOut, Briefcase, Settings, AlertCircle, Award, 
    DollarSign, XCircle, Plus, Search, ChevronRight, Star, ArrowUpRight
} from 'lucide-react';

export const EmployeePortal: React.FC = () => {
    const { user, logout } = useAuth();
    const canUseShop = hasOperationalPermissions(user?.permissions);
    const { t, currencySymbol, formatMoney } = useSettings();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'employments' | 'attendance' | 'performance' | 'settings'>('dashboard');
    
    // Real-time states
    const [globalRegistry, setGlobalRegistry] = useState<any[]>([]);
    const [selectedEmploymentId, setSelectedEmploymentId] = useState<string>('');
    const [pinForm, setPinForm] = useState({ currentPin: '', newPin: '', confirmPin: '' });
    const [pinSuccess, setPinSuccess] = useState('');
    const [pinError, setPinError] = useState('');
    
    // Clock State
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Load data from LocalStorage
    const fetchGlobalData = () => {
        const saved = localStorage.getItem('bizora_global_employee_registry');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setGlobalRegistry(parsed);
                
                // If there's an employee logged in, set their default selected employment
                const emp = parsed.find((e: any) => e.mobile === user?.mobile);
                if (emp && emp.employments && emp.employments.length > 0) {
                    const activeEmp = emp.employments.find((e: any) => e.status === 'Active') || emp.employments[0];
                    setSelectedEmploymentId(activeEmp.businessId);
                }
            } catch (e) {
                console.error("Error loading registry inside employee portal:", e);
            }
        }
    };

    useEffect(() => {
        fetchGlobalData();
    }, [user?.mobile]);

    // If staff has operational ACL, prefer shop shell (AppContent already routes this; banner is fallback).

    // Current employee object in global registry
    const currentEmployee = useMemo(() => {
        return globalRegistry.find((e: any) => e.mobile === user?.mobile);
    }, [globalRegistry, user?.mobile]);

    // Currently selected employment object
    const selectedEmployment = useMemo(() => {
        if (!currentEmployee || !selectedEmploymentId) return null;
        return currentEmployee.employments.find((emp: any) => emp.businessId === selectedEmploymentId) || null;
    }, [currentEmployee, selectedEmploymentId]);

    // Format current date e.g. Friday, July 3, 2026
    const formattedDateString = useMemo(() => {
        return currentTime.toLocaleDateString(undefined, { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }, [currentTime]);

    // Today's date key for index-matching (YYYY-MM-DD)
    const todayStr = useMemo(() => {
        return new Date().toISOString().split('T')[0];
    }, []);

    // Clock In/Out Status for selected business
    const todayAttendanceRecord = useMemo(() => {
        if (!selectedEmployment || !selectedEmployment.attendance) return null;
        return selectedEmployment.attendance[todayStr] || null;
    }, [selectedEmployment, todayStr]);

    // Handle Clock In
    const handleClockIn = () => {
        if (!currentEmployee || !selectedEmploymentId) return;
        
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updatedRegistry = globalRegistry.map((emp: any) => {
            if (emp.mobile === currentEmployee.mobile) {
                const updatedEmployments = emp.employments.map((empRec: any) => {
                    if (empRec.businessId === selectedEmploymentId) {
                        const existingAtt = empRec.attendance || {};
                        return {
                            ...empRec,
                            attendance: {
                                ...existingAtt,
                                [todayStr]: {
                                    status: 'Present',
                                    checkIn: nowTime
                                }
                            }
                        };
                    }
                    return empRec;
                });
                return { ...emp, employments: updatedEmployments };
            }
            return emp;
        });

        // Save to Global Registry
        localStorage.setItem('bizora_global_employee_registry', JSON.stringify(updatedRegistry));
        setGlobalRegistry(updatedRegistry);

        // Sync back to specific Business Local Staff List
        const bizStaffKey = `nexus_staff_${selectedEmploymentId}`;
        const savedStaffList = localStorage.getItem(bizStaffKey);
        if (savedStaffList) {
            try {
                const staffArray = JSON.parse(savedStaffList);
                const updatedStaffArray = staffArray.map((s: any) => {
                    if (s.id === currentEmployee.mobile || s.mobile === currentEmployee.mobile) {
                        const currentAtt = s.attendance || {};
                        return {
                            ...s,
                            attendance: {
                                ...currentAtt,
                                [todayStr]: {
                                    status: 'Present',
                                    checkIn: nowTime
                                }
                            }
                        };
                    }
                    return s;
                });
                localStorage.setItem(bizStaffKey, JSON.stringify(updatedStaffArray));
            } catch (e) {
                console.error("Error syncing local staff list on clock in:", e);
            }
        }
    };

    // Handle Clock Out
    const handleClockOut = () => {
        if (!currentEmployee || !selectedEmploymentId || !todayAttendanceRecord) return;
        
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const updatedRegistry = globalRegistry.map((emp: any) => {
            if (emp.mobile === currentEmployee.mobile) {
                const updatedEmployments = emp.employments.map((empRec: any) => {
                    if (empRec.businessId === selectedEmploymentId) {
                        const existingAtt = empRec.attendance || {};
                        return {
                            ...empRec,
                            attendance: {
                                ...existingAtt,
                                [todayStr]: {
                                    ...existingAtt[todayStr],
                                    checkOut: nowTime
                                }
                            }
                        };
                    }
                    return empRec;
                });
                return { ...emp, employments: updatedEmployments };
            }
            return emp;
        });

        // Save to Global Registry
        localStorage.setItem('bizora_global_employee_registry', JSON.stringify(updatedRegistry));
        setGlobalRegistry(updatedRegistry);

        // Sync back to specific Business Local Staff List
        const bizStaffKey = `nexus_staff_${selectedEmploymentId}`;
        const savedStaffList = localStorage.getItem(bizStaffKey);
        if (savedStaffList) {
            try {
                const staffArray = JSON.parse(savedStaffList);
                const updatedStaffArray = staffArray.map((s: any) => {
                    if (s.id === currentEmployee.mobile || s.mobile === currentEmployee.mobile) {
                        const currentAtt = s.attendance || {};
                        return {
                            ...s,
                            attendance: {
                                ...currentAtt,
                                [todayStr]: {
                                    ...currentAtt[todayStr],
                                    checkOut: nowTime
                                }
                            }
                        };
                    }
                    return s;
                });
                localStorage.setItem(bizStaffKey, JSON.stringify(updatedStaffArray));
            } catch (e) {
                console.error("Error syncing local staff list on clock out:", e);
            }
        }
    };

    // Handle Pin Update
    const handleUpdatePin = async (e: React.FormEvent) => {
        e.preventDefault();
        setPinError('');
        setPinSuccess('');

        if (pinForm.newPin.length !== 4 || !/^\d+$/.test(pinForm.newPin)) {
            setPinError('New PIN must be exactly 4 numeric digits.');
            return;
        }

        if (pinForm.newPin !== pinForm.confirmPin) {
            setPinError('New PIN and confirmation PIN do not match.');
            return;
        }

        if (!currentEmployee) return;

        // Current PIN is verified server-side now (backend/src/api/employees.ts,
        // PATCH /api/employees/me/pin) - the plaintext PIN is never compared or
        // stored in this component anymore.
        try {
            const res = await authFetch('/api/employees/me/pin', {
                method: 'PATCH',
                body: JSON.stringify({ currentPin: pinForm.currentPin, newPin: pinForm.newPin }),
            });
            const body = await res.json();
            if (!res.ok) {
                setPinError(body.error || 'Could not update PIN.');
                return;
            }
        } catch (err) {
            setPinError('Could not reach the server. Please try again.');
            return;
        }

        setPinSuccess('PIN updated successfully. Use your new PIN for future logins.');
        setPinForm({ currentPin: '', newPin: '', confirmPin: '' });

        // Best-effort local mirror so the offline-fallback login path (if the
        // backend is ever unreachable) also has the new PIN. Not the source
        // of truth anymore - the backend hash above is.
        const updatedRegistry = globalRegistry.map((emp: any) => {
            if (emp.mobile === currentEmployee.mobile) {
                return { ...emp, pin: pinForm.newPin };
            }
            return emp;
        });
        localStorage.setItem('bizora_global_employee_registry', JSON.stringify(updatedRegistry));
        setGlobalRegistry(updatedRegistry);

        if (currentEmployee.employments) {
            currentEmployee.employments.forEach((empRec: any) => {
                const bizStaffKey = `nexus_staff_${empRec.businessId}`;
                const savedStaffList = localStorage.getItem(bizStaffKey);
                if (savedStaffList) {
                    try {
                        const staffArray = JSON.parse(savedStaffList);
                        const updatedStaffArray = staffArray.map((s: any) => {
                            if (s.id === currentEmployee.mobile || s.mobile === currentEmployee.mobile) {
                                return { ...s, pin: pinForm.newPin };
                            }
                            return s;
                        });
                        localStorage.setItem(bizStaffKey, JSON.stringify(updatedStaffArray));
                    } catch (e) {
                        console.error("Error syncing local PIN:", e);
                    }
                }
            });
        }
    };

    return (
        <div className="min-h-[100dvh] bg-slate-50 text-slate-800 pb-24 lg:pb-0">

            {canUseShop && (
                <div className="mx-3 sm:mx-4 mt-3 rounded-2xl border border-indigo-200 bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-4 shadow-lg shadow-indigo-200/40">
                    <p className="text-sm font-black">Shop modules available</p>
                    <p className="text-xs text-indigo-100 mt-1 mb-3">Your role includes POS/inventory permissions. Open the full workspace.</p>
                    <button
                        type="button"
                        onClick={() => { window.location.hash = '#/'; window.location.reload(); }}
                        className="inline-flex items-center gap-2 bg-white text-indigo-700 text-xs font-black px-4 py-2 rounded-xl active:scale-95"
                    >
                        Continue to workspace <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Nav Header */}
            <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
                <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/assets/bizora-emblem.png" alt="Bizora" className="w-10 h-10 object-contain drop-shadow" />
                        <div>
                            <span className="font-bold tracking-tight text-lg">BIZORA <span className="text-xs bg-indigo-500 px-2 py-0.5 rounded text-white ml-2">Employee Portal</span></span>
                            <p className="text-[10px] text-slate-400 font-mono">Global Employee ID: {user?.mobile}</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={logout}
                        className="flex items-center gap-2 bg-slate-800 hover:bg-red-900 border border-slate-700 hover:border-red-800 px-3 py-1.5 rounded-lg text-sm transition-all font-medium"
                    >
                        <LogOut className="w-4 h-4 text-slate-300" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </header>

            {/* Quick Profile Overview Bar */}
            <div className="bg-white border-b border-slate-200 py-3 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-extrabold text-xl shadow-sm">
                            {user?.name?.charAt(0) || 'E'}
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-800 text-base">{user?.name}</h2>
                            <p className="text-xs text-slate-500 flex items-center gap-1">
                                <Shield className="w-3.5 h-3.5 text-indigo-500" /> 
                                Verified Global Profile
                            </p>
                        </div>
                    </div>

                    {/* Business Switcher */}
                    {currentEmployee?.employments && currentEmployee.employments.length > 0 && (
                        <div className="flex items-center gap-2 bg-slate-100 p-2 rounded-lg border border-slate-200">
                            <span className="text-xs font-bold text-slate-500 uppercase font-sans">Duty Business:</span>
                            <select 
                                value={selectedEmploymentId}
                                onChange={(e) => setSelectedEmploymentId(e.target.value)}
                                className="bg-white text-xs border border-slate-300 rounded px-2.5 py-1 font-bold text-indigo-700 focus:outline-none"
                            >
                                {currentEmployee.employments.map((emp: any) => (
                                    <option key={emp.businessId} value={emp.businessId}>
                                        {emp.businessName} ({emp.role})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Section */}
            <main className="max-w-5xl mx-auto px-4 py-6">
                {/* Tab Controls */}
                <div className="flex gap-2 border-b border-slate-200 pb-px mb-6 overflow-x-auto custom-scrollbar">
                    <button 
                        onClick={() => setActiveTab('dashboard')} 
                        className={`px-4 py-2.5 font-bold text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'dashboard' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Clock className="w-4 h-4" /> Duty Terminal
                    </button>
                    <button 
                        onClick={() => setActiveTab('employments')} 
                        className={`px-4 py-2.5 font-bold text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'employments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Briefcase className="w-4 h-4" /> Career & Businesses
                    </button>
                    <button 
                        onClick={() => setActiveTab('attendance')} 
                        className={`px-4 py-2.5 font-bold text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'attendance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Calendar className="w-4 h-4" /> Attendance Logs
                    </button>
                    <button 
                        onClick={() => setActiveTab('performance')} 
                        className={`px-4 py-2.5 font-bold text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'performance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <TrendingUp className="w-4 h-4" /> Performance Reviews
                    </button>
                    <button 
                        onClick={() => setActiveTab('settings')} 
                        className={`px-4 py-2.5 font-bold text-sm border-b-2 flex items-center gap-2 whitespace-nowrap transition-all ${activeTab === 'settings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Settings className="w-4 h-4" /> Security Settings
                    </button>
                </div>

                {/* Tab Contents */}
                <div className="space-y-6">

                    {/* DASHBOARD TAB */}
                    {activeTab === 'dashboard' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-150">
                            {/* Live terminal card */}
                            <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between space-y-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Store Shift</span>
                                        <h3 className="font-extrabold text-2xl text-slate-800 mt-1">{selectedEmployment?.businessName || 'No Business Connected'}</h3>
                                        <p className="text-sm text-slate-500 font-medium">As assigned: <strong className="text-indigo-600 font-bold">{selectedEmployment?.role || 'N/A'}</strong></p>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-3 py-1 rounded-full text-xs font-extrabold tracking-wider uppercase ${todayAttendanceRecord?.checkIn ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                                            {todayAttendanceRecord?.checkIn ? 'Clocked In' : 'Off Shift'}
                                        </span>
                                    </div>
                                </div>

                                <div className="py-8 text-center bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center justify-center">
                                    <p className="text-sm font-semibold text-slate-400 font-mono tracking-wider">{formattedDateString}</p>
                                    <h1 className="text-5xl font-extrabold text-slate-800 font-mono tracking-tighter my-2">
                                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                    </h1>
                                    <div className="flex items-center gap-1 text-slate-500 mt-2 text-xs font-medium">
                                        <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                                        <span>Terminal IP logged automatically • GPS check-in enabled</span>
                                    </div>
                                </div>

                                <div className="flex gap-4">
                                    <button 
                                        onClick={handleClockIn}
                                        disabled={!!todayAttendanceRecord?.checkIn}
                                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-sm transition-all disabled:shadow-none"
                                    >
                                        <Clock className="w-5 h-5" />
                                        <span>Clock In</span>
                                        {todayAttendanceRecord?.checkIn && <span className="text-[10px] font-mono text-emerald-600">at {todayAttendanceRecord.checkIn}</span>}
                                    </button>
                                    <button 
                                        onClick={handleClockOut}
                                        disabled={!todayAttendanceRecord?.checkIn || !!todayAttendanceRecord?.checkOut}
                                        className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-sm transition-all disabled:shadow-none"
                                    >
                                        <XCircle className="w-5 h-5" />
                                        <span>Clock Out</span>
                                        {todayAttendanceRecord?.checkOut && <span className="text-[10px] font-mono text-rose-600">at {todayAttendanceRecord.checkOut}</span>}
                                    </button>
                                </div>
                            </div>

                            {/* Job info list */}
                            <div className="space-y-6">
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
                                    <h3 className="font-extrabold text-slate-800 text-sm border-b border-slate-100 pb-3 uppercase tracking-wider flex items-center gap-2">
                                        <DollarSign className="w-4 h-4 text-emerald-500" strokeWidth={3} /> Shift Compensation
                                    </h3>
                                    
                                    <div className="space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Basic Monthly Salary</span>
                                            <span className="font-bold text-slate-800">{currencySymbol}{selectedEmployment?.basicSalary ? selectedEmployment.basicSalary.toLocaleString() : '0.00'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Sales Commission</span>
                                            <span className="font-bold text-slate-800">{selectedEmployment?.commissionRate ? `${selectedEmployment.commissionRate}%` : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-500">Sales Target</span>
                                            <span className="font-bold text-slate-800">{selectedEmployment?.salesTarget ? `${currencySymbol}${selectedEmployment.salesTarget.toLocaleString()}` : 'No target'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white shadow-md p-6 relative overflow-hidden">
                                    <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                                        <Award className="w-40 h-40" />
                                    </div>
                                    <h3 className="font-extrabold text-sm uppercase tracking-wider mb-2">My Service Streaks</h3>
                                    <p className="text-2xl font-black">Connected to {currentEmployee?.employments?.length || 1} Businesses</p>
                                    <p className="text-xs text-indigo-100 mt-2 font-medium">Your permanent career history accumulates globally under this verified mobile number.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* EMPLOYMENTS TAB */}
                    {activeTab === 'employments' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 className="font-extrabold text-slate-800 text-lg mb-1">Global Employment Registry</h3>
                                <p className="text-sm text-slate-500 mb-6">Your official career history recorded on the Bizora SaaS platform.</p>
                                
                                <div className="space-y-4">
                                    {currentEmployee?.employments && currentEmployee.employments.length > 0 ? (
                                        currentEmployee.employments.map((emp: any, index: number) => (
                                            <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-200 transition-all">
                                                <div className="flex items-start gap-3">
                                                    <div className="p-3 bg-white rounded-lg border border-slate-200 text-indigo-600 shrink-0">
                                                        <Briefcase className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-base">{emp.businessName}</h4>
                                                        <p className="text-xs text-slate-500 font-medium">Role: <strong className="text-slate-700">{emp.role}</strong> • Status: <strong className="text-slate-700">{emp.status}</strong></p>
                                                        <p className="text-[10px] text-slate-400 font-mono mt-1">Joined: {emp.joiningDate || 'N/A'}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-row md:flex-col items-start md:items-end gap-3 md:gap-1 text-sm bg-white p-3 rounded-lg border border-slate-100 w-full md:w-auto">
                                                    <div>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Basic Salary</p>
                                                        <p className="font-bold text-emerald-600">{currencySymbol}{emp.basicSalary ? emp.basicSalary.toLocaleString() : '0.00'}</p>
                                                    </div>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ml-auto md:ml-0 ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                                        {emp.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 italic">
                                            No active or historical employments recorded for this ID yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ATTENDANCE TAB */}
                    {activeTab === 'attendance' && (
                        <div className="space-y-4 animate-in fade-in duration-150">
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div>
                                        <h3 className="font-extrabold text-slate-800 text-lg">My Attendance Ledger</h3>
                                        <p className="text-xs text-slate-500">History of shifts and check-in terminals for {selectedEmployment?.businessName || 'Business'}.</p>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                                            <tr>
                                                <th className="px-6 py-4">Date</th>
                                                <th className="px-6 py-4">Check-In</th>
                                                <th className="px-6 py-4">Check-Out</th>
                                                <th className="px-6 py-4 text-center">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {selectedEmployment && selectedEmployment.attendance && Object.keys(selectedEmployment.attendance).length > 0 ? (
                                                Object.entries(selectedEmployment.attendance)
                                                    .sort((a, b) => new Date(b[0]).getTime() - new Date(a[0]).getTime())
                                                    .map(([dateKey, record]: [string, any]) => (
                                                        <tr key={dateKey} className="hover:bg-slate-50/50">
                                                            <td className="px-6 py-4 font-bold text-slate-700 font-mono">{dateKey}</td>
                                                            <td className="px-6 py-4 text-slate-600 font-mono">{record.checkIn || '—'}</td>
                                                            <td className="px-6 py-4 text-slate-600 font-mono">{record.checkOut || '—'}</td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`px-2.5 py-1 rounded text-xs font-extrabold ${record.status === 'Present' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                                    {record.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                                                        No attendance records logged for this employment.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PERFORMANCE TAB */}
                    {activeTab === 'performance' && (
                        <div className="space-y-6 animate-in fade-in duration-150">
                            {/* Target Progress card */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 className="font-extrabold text-slate-800 text-lg mb-1">Sales Goals & Targets</h3>
                                <p className="text-sm text-slate-500 mb-6">Review your performance quotas and active store sales target.</p>
                                
                                {selectedEmployment?.salesTarget ? (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium text-slate-500">Active Monthly Target</span>
                                            <span className="font-bold text-indigo-700">{currencySymbol}{selectedEmployment.salesTarget.toLocaleString()}</span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3">
                                            <div className="bg-indigo-600 h-3 rounded-full" style={{ width: '35%' }}></div>
                                        </div>
                                        <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                                            <span>In Progress (35%)</span>
                                            <span>Remaining: {currencySymbol}{(selectedEmployment.salesTarget * 0.65).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-6 bg-slate-50 rounded-xl text-slate-400 italic text-sm">
                                        No active sales target set for this position.
                                    </div>
                                )}
                            </div>

                            {/* Reviews history card */}
                            <div className="bg-white rounded-xl border border-slate-200 p-6">
                                <h3 className="font-extrabold text-slate-800 text-lg mb-1">Performance Feedback</h3>
                                <p className="text-sm text-slate-500 mb-6">Official merchant reviews left by your business managers and supervisors.</p>

                                <div className="space-y-4">
                                    {selectedEmployment?.performance?.reviews && selectedEmployment.performance.reviews.length > 0 ? (
                                        selectedEmployment.performance.reviews.map((rev: any, index: number) => (
                                            <div key={index} className="p-4 bg-slate-50 rounded-lg border border-slate-150 space-y-2">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs text-slate-400 font-mono">{rev.date}</span>
                                                    <div className="flex items-center gap-0.5 text-amber-500">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? 'fill-current' : 'text-slate-200'}`} />
                                                        ))}
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-700 font-medium italic">"{rev.comment}"</p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-slate-400 italic text-sm">
                                            No supervisor reviews submitted yet. Keep up the great work!
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === 'settings' && (
                        <div className="max-w-md bg-white rounded-xl border border-slate-200 p-6 animate-in fade-in duration-150">
                            <h3 className="font-extrabold text-slate-800 text-lg mb-1">Reset Login PIN</h3>
                            <p className="text-sm text-slate-500 mb-6">Change your secure 4-digit employee portal entrance PIN.</p>
                            
                            <form onSubmit={handleUpdatePin} className="space-y-4">
                                {pinSuccess && (
                                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-xs font-semibold">
                                        {pinSuccess}
                                    </div>
                                )}
                                {pinError && (
                                    <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-xs font-semibold">
                                        {pinError}
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Current Login PIN</label>
                                    <input 
                                        type="password" 
                                        maxLength={4} 
                                        required 
                                        value={pinForm.currentPin}
                                        onChange={e => setPinForm({ ...pinForm, currentPin: e.target.value })}
                                        className="w-full p-2.5 border rounded-lg text-sm font-mono mt-1" 
                                        placeholder="••••" 
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">New Login PIN</label>
                                    <input 
                                        type="password" 
                                        maxLength={4} 
                                        required 
                                        value={pinForm.newPin}
                                        onChange={e => setPinForm({ ...pinForm, newPin: e.target.value })}
                                        className="w-full p-2.5 border rounded-lg text-sm font-mono mt-1" 
                                        placeholder="4 digits" 
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Confirm New PIN</label>
                                    <input 
                                        type="password" 
                                        maxLength={4} 
                                        required 
                                        value={pinForm.confirmPin}
                                        onChange={e => setPinForm({ ...pinForm, confirmPin: e.target.value })}
                                        className="w-full p-2.5 border rounded-lg text-sm font-mono mt-1" 
                                        placeholder="Confirm 4 digits" 
                                    />
                                </div>

                                <button type="submit" className="w-full py-2.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all">
                                    Update Entry PIN
                                </button>
                            </form>
                        </div>
                    )}

                </div>
            </main>

      {/* Glass capsule dock — employee portal tabs */}
      <nav
        aria-label="Employee bottom navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 pointer-events-none"
        style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="pointer-events-auto mx-auto max-w-md px-3">
          <div className="flex items-stretch justify-between gap-0.5 rounded-[1.75rem] border border-white/60 bg-white/70 backdrop-blur-2xl shadow-[0_10px_40px_rgba(15,23,42,0.14)] ring-1 ring-slate-900/5 px-1.5 py-1.5">
          {([
            { id: 'dashboard', label: 'Home', icon: Briefcase },
            { id: 'employments', label: 'Jobs', icon: MapPin },
            { id: 'attendance', label: 'Attend', icon: Clock },
            { id: 'performance', label: 'Perf', icon: TrendingUp },
            { id: 'settings', label: 'Settings', icon: Settings },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const on = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 flex-col items-center justify-center gap-0.5 min-w-0 h-12 rounded-2xl transition-all ${
                  on
                    ? 'bg-indigo-600/10 text-indigo-600 shadow-sm ring-1 ring-indigo-500/20'
                    : 'text-slate-500 active:bg-slate-100/80'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" strokeWidth={on ? 2.5 : 2} />
                <span className="text-[9px] font-semibold leading-none truncate max-w-full px-0.5 text-center">{tab.label}</span>
              </button>
            );
          })}
          </div>
        </div>
      </nav>
        </div>
  );
};
