import { getStaffLeaveBalances, canRequestLeave, countLeaveDays, DEFAULT_LEAVE_POLICY } from '../lib/leaveBalance';
import { getStaffSalesInPeriod, currentYearMonth } from '../lib/salesTargets';
import React, { useState, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, LedgerEntry } from '../contexts/DataContext';
import { Staff } from '../types';
import { RBAC_ROLE_TEMPLATES, resolveStaffPermissions, matchRoleTemplateId } from '../utils/rbacRoles';
import { Users, Clock, DollarSign, Award, MapPin, Calendar, CheckCircle, XCircle, Search, Save, Star, TrendingUp, UserCheck, Briefcase, AlertCircle, Plus, Trash2 } from 'lucide-react';

const EmployeeManagement: React.FC = () => {
    const { t, currencySymbol, formatMoney } = useSettings();
    const { staff, markAttendance, updateStaff, updatePerformance, addTransaction, transactions, addStaff, deleteStaff, designations, workShifts, isHolidayDate, payrollRuns, addPayrollRun, voidPayrollRun, leaveRequests, leavePolicy, setLeavePolicy, addLeaveRequest, reviewLeaveRequest, cancelLeaveRequest } = useData();
    const [activeTab, setActiveTab] = useState<'staff' | 'attendance' | 'leave' | 'payroll' | 'performance'>('staff');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [showAddModal, setShowAddModal] = useState(false);
    const [enteredMobile, setEnteredMobile] = useState('');

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<Partial<Staff>>({});
    const [adjustments, setAdjustments] = useState<Record<string, { bonus: number, fine: number }>>({});
    const [ratingModal, setRatingModal] = useState<{show: boolean, id: string | null}>({ show: false, id: null });
    const [historyModal, setHistoryModal] = useState<{show: boolean, staff: Staff | null}>({ show: false, staff: null });
    const [newRating, setNewRating] = useState(5);
    const [reviewText, setReviewText] = useState('');

    // Load Global Registry for search / career display
    const globalEmployeesRegistry = useMemo(() => {
        const saved = localStorage.getItem('bizora_global_employee_registry');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Error parsing global registry:", e);
            }
        }
        return [];
    }, [staff, showAddModal]);

    // Check if entered mobile number exists globally
    const foundGlobalEmployee = useMemo(() => {
        if (!enteredMobile) return null;
        const clean = enteredMobile.replace(/\D/g, '');
        if (clean.length < 5) return null; // Avoid eager short matching
        return globalEmployeesRegistry.find((e: any) => e.mobile === enteredMobile || e.mobile.replace(/\D/g, '').endsWith(clean)) || null;
    }, [enteredMobile, globalEmployeesRegistry]);

    // Derived Data: Search by Mobile (Global Employee ID) or Name
    const filteredStaff = staff.filter(s => 
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
        (s.mobile && s.mobile.includes(searchTerm)) ||
        (s.id && s.id.includes(searchTerm))
    );

    const stats = useMemo(() => {
        const total = filteredStaff.length;
        const present = filteredStaff.filter(s => s.attendance?.[selectedDate]?.status === 'Present').length;
        const absent = filteredStaff.filter(s => s.attendance?.[selectedDate]?.status === 'Absent').length;
        const leave = filteredStaff.filter(s => s.attendance?.[selectedDate]?.status === 'Leave').length;
        return { total, present, absent, leave };
    }, [filteredStaff, selectedDate]);

    // --- SUB-COMPONENTS ---

    const StaffListTab = () => {
        const handleEdit = (employee: Staff) => {
            setEditingId(employee.id);
            setEditData({ 
                name: employee.name,
                role: employee.role,
                status: employee.status,
                basicSalary: employee.basicSalary, 
                joiningDate: employee.joiningDate,
                salesTarget: employee.salesTarget,
                commissionRate: employee.commissionRate
            });
        };

        const handleSave = (id: string) => {
            updateStaff(id, editData);
            setEditingId(null);
        };

        const handleDelete = (id: string) => {
            if (window.confirm('Are you sure you want to delete this employee? This will set their status to inactive and end their career history with your business.')) {
                deleteStaff(id);
            }
        };

        return (
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or mobile ID..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>
                    <button 
                        onClick={() => {
                            setEnteredMobile('');
                            setShowAddModal(true);
                        }}
                        className="w-full sm:w-auto bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add New Employee
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2">
                    {filteredStaff.map(employee => {
                        const globalRecord = globalEmployeesRegistry.find((e: any) => e.mobile === employee.mobile || e.mobile === employee.id);
                        return (
                            <div key={employee.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">
                                                {employee?.name?.charAt(0) || 'E'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-slate-800">{employee?.name || ''}</h3>
                                                {employee.mobile && (
                                                    <p className="text-xs text-slate-500 font-mono mt-0.5">Mobile/ID: {employee.mobile}</p>
                                                )}
                                                <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${employee.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {employee.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => editingId === employee.id ? handleSave(employee.id) : handleEdit(employee)}
                                                className={`text-xs px-3 py-1 rounded border transition-colors ${editingId === employee.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                                            >
                                                {editingId === employee.id ? 'Save' : 'Edit'}
                                            </button>
                                            {editingId !== employee.id && (
                                                <button 
                                                    onClick={() => handleDelete(employee.id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Career History / Connected Businesses Section */}
                                    <div className="mt-4 pt-4 border-t border-slate-100 bg-slate-50 p-3 rounded-lg mb-4">
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                                            <Briefcase className="w-3 h-3 text-indigo-500" />
                                            SaaS Career Registry ({globalRecord?.employments?.length || 1} employment{(globalRecord?.employments?.length || 1) > 1 ? 's' : ''})
                                        </p>
                                        <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                                            {globalRecord && globalRecord.employments && globalRecord.employments.length > 0 ? (
                                                globalRecord.employments.map((emp: any, index: number) => (
                                                    <div key={index} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-100">
                                                        <div>
                                                            <p className="font-semibold text-slate-700">{emp.businessName}</p>
                                                            <p className="text-[10px] text-slate-400">Role: {emp.role}{emp.shiftId ? ` • ${workShifts.find(s => s.id === emp.shiftId)?.name || ''}` : ''} • Salary: {currencySymbol}{emp.basicSalary || 0}</p>
                                                            <p className="text-[9px] text-slate-400">Joined: {emp.joiningDate || 'N/A'}</p>
                                                        </div>
                                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${emp.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                                                            {emp.status}
                                                        </span>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="flex justify-between items-center text-xs bg-white p-2 rounded border border-slate-100">
                                                    <div>
                                                        <p className="font-semibold text-slate-700">Current Business</p>
                                                        <p className="text-[10px] text-slate-400">Role: {employee.role}{employee.shiftId ? ` • ${workShifts.find(s => s.id === employee.shiftId)?.name || ''}` : ''} • Salary: {currencySymbol}{employee.basicSalary || 0}</p>
                                                        <p className="text-[9px] text-slate-400">Joined: {employee.joiningDate || 'N/A'}</p>
                                                    </div>
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-emerald-50 text-emerald-600">
                                                        Active
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {editingId === employee.id ? (
                                    <div className="space-y-3 bg-slate-50 p-3 rounded-lg grid grid-cols-2 gap-3">
                                        <div className="col-span-2">
                                            <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                                            <input 
                                                type="text" 
                                                value={editData.name || ''} 
                                                onChange={e => setEditData({...editData, name: e.target.value})}
                                                className="w-full p-2 border rounded text-sm"
                                            />
                                        </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Role</label>
                                        <select 
                                            value={editData.role || ''} 
                                            onChange={e => {
                                              const role = e.target.value;
                                              const roleTemplateId = matchRoleTemplateId(role);
                                              setEditData({
                                                ...editData,
                                                role,
                                                roleTemplateId,
                                                permissions: resolveStaffPermissions({ role, roleTemplateId }),
                                              });
                                            }}
                                            className="w-full p-2 border rounded text-sm"
                                        >
                                            {RBAC_ROLE_TEMPLATES.filter(r => r.id !== 'custom').map(r => (
                                              <option key={r.id} value={r.label}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Status</label>
                                        <select 
                                            value={editData.status || ''} 
                                            onChange={e => setEditData({...editData, status: e.target.value as 'Active' | 'Inactive'})}
                                            className="w-full p-2 border rounded text-sm"
                                        >
                                            <option value="Active">Active</option>
                                            <option value="Inactive">Inactive</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Basic Salary</label>
                                        <input 
                                            type="number" 
                                            value={editData.basicSalary ?? ''} 
                                            onChange={e => setEditData({...editData, basicSalary: parseFloat(e.target.value) || 0})}
                                            className="w-full p-2 border rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Joining Date</label>
                                        <input 
                                            type="date" 
                                            value={editData.joiningDate ?? ''} 
                                            onChange={e => setEditData({...editData, joiningDate: e.target.value})}
                                            className="w-full p-2 border rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Sales Target</label>
                                        <input 
                                            type="number" 
                                            value={editData.salesTarget ?? ''} 
                                            onChange={e => setEditData({...editData, salesTarget: parseFloat(e.target.value) || 0})}
                                            className="w-full p-2 border rounded text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Commission (%)</label>
                                        <input 
                                            type="number" 
                                            value={editData.commissionRate ?? ''} 
                                            onChange={e => setEditData({...editData, commissionRate: parseFloat(e.target.value) || 0})}
                                            className="w-full p-2 border rounded text-sm"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4 text-sm mt-2">
                                    <div>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase">Role</p>
                                        <p className="font-medium text-slate-800">{employee.role}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase">Basic Salary</p>
                                        <p className="font-medium text-slate-800">{formatMoney(employee.basicSalary || 0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase">Sales Target</p>
                                        <p className="font-medium text-slate-800">{employee.salesTarget ? formatMoney(employee.salesTarget) : 'N/A'}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-500 text-[10px] font-bold uppercase">Commission</p>
                                        <p className="font-medium text-slate-800">{employee.commissionRate ? `${employee.commissionRate}%` : 'N/A'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
                </div>
            </div>
        );
    };

    const AttendanceTab = () => {
        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                {/* Stats Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                        <p className="text-slate-500 text-xs uppercase font-bold">Total Staff</p>
                        <p className="text-2xl font-bold text-slate-800">{stats.total}</p>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                        <p className="text-emerald-600 text-xs uppercase font-bold">Present</p>
                        <p className="text-2xl font-bold text-emerald-700">{stats.present}</p>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                        <p className="text-red-600 text-xs uppercase font-bold">Absent</p>
                        <p className="text-2xl font-bold text-red-700">{stats.absent}</p>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
                        <p className="text-orange-600 text-xs uppercase font-bold">On Leave</p>
                        <p className="text-2xl font-bold text-orange-700">{stats.leave}</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Daily Attendance</h3>
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={e => setSelectedDate(e.target.value)}
                            className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    {isHolidayDate(selectedDate) && (
                        <div className="mx-4 mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs font-semibold">
                            Company holiday: {isHolidayDate(selectedDate)?.name}
                            {isHolidayDate(selectedDate)?.paid ? ' (paid)' : ' (unpaid)'} — consider marking staff as Leave.
                        </div>
                    )}
                    <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-center">Clock In</th>
                                <th className="px-6 py-4 text-center">Clock Out</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredStaff.map(employee => {
                                const record = employee.attendance?.[selectedDate];
                                return (
                                    <tr key={employee.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-800">{employee.name}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${
                                                record?.status === 'Present' ? 'bg-emerald-100 text-emerald-700' :
                                                record?.status === 'Absent' ? 'bg-red-100 text-red-700' :
                                                record?.status === 'Leave' ? 'bg-orange-100 text-orange-700' :
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                                {record?.status || 'Not Marked'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center text-slate-600">{record?.checkIn || '-'}</td>
                                        <td className="px-6 py-4 text-center text-slate-600">{record?.checkOut || '-'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => markAttendance(employee.id, selectedDate, 'Present')}
                                                    className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 border border-emerald-200"
                                                    title="Mark Present"
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => markAttendance(employee.id, selectedDate, 'Absent')}
                                                    className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 border border-red-200"
                                                    title="Mark Absent"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    </div>
                </div>
            </div>
        );
    };


    const LeaveTab = () => {
        const [staffId, setStaffId] = useState('');
        const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
        const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
        const [leaveType, setLeaveType] = useState<'Annual' | 'Sick' | 'Unpaid' | 'Casual' | 'Other'>('Annual');
        const [reason, setReason] = useState('');

        const policy = leavePolicy || DEFAULT_LEAVE_POLICY();
        const selectedStaff = staff.find(s => s.id === staffId);
        const balances = staffId ? getStaffLeaveBalances(staffId, leaveRequests, policy, { joiningDate: selectedStaff?.joiningDate }) : [];


        const submit = () => {
            const emp = staff.find(s => s.id === staffId);
            if (!emp) { alert('Select an employee'); return; }
            if (endDate < startDate) { alert('End date must be on or after start date'); return; }
            const check = canRequestLeave({
                staffId: emp.id,
                leaveType,
                startDate,
                endDate,
                requests: leaveRequests,
                policy,
                joiningDate: emp.joiningDate,
            });
            if (!check.ok) {
                alert(check.error || 'Cannot request leave');
                return;
            }
            addLeaveRequest({
                id: `lr-${Date.now()}`,
                staffId: emp.id,
                staffName: emp.name,
                startDate,
                endDate,
                leaveType,
                reason: reason.trim() || undefined,
                status: 'Pending',
                requestedAt: new Date().toISOString(),
            });
            setReason('');
            alert(`Leave request submitted (${check.days} day(s))`);
        };

        return (
            <div className="space-y-6 animate-in fade-in">
                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="font-bold text-slate-800">Leave policy ({policy.year})</h3>
                        <div className="flex flex-wrap gap-2 text-xs items-center">
                            <label className="flex items-center gap-1">Annual <input type="number" className="w-14 border rounded px-1 py-0.5" value={policy.annualDays} onChange={e => setLeavePolicy({ ...policy, annualDays: parseInt(e.target.value) || 0 })} /></label>
                            <label className="flex items-center gap-1">Sick <input type="number" className="w-14 border rounded px-1 py-0.5" value={policy.sickDays} onChange={e => setLeavePolicy({ ...policy, sickDays: parseInt(e.target.value) || 0 })} /></label>
                            <label className="flex items-center gap-1">Casual <input type="number" className="w-14 border rounded px-1 py-0.5" value={policy.casualDays} onChange={e => setLeavePolicy({ ...policy, casualDays: parseInt(e.target.value) || 0 })} /></label>
                            <label className="flex items-center gap-1 text-slate-500">
                                <input type="checkbox" checked={!!policy.excludeWeekends} onChange={e => setLeavePolicy({ ...policy, excludeWeekends: e.target.checked })} /> Skip weekends
                            </label>
                            <label className="flex items-center gap-1 text-slate-500">
                                <input type="checkbox" checked={policy.carryForwardEnabled !== false} onChange={e => setLeavePolicy({ ...policy, carryForwardEnabled: e.target.checked })} /> Carry-forward
                            </label>
                            {policy.carryForwardEnabled !== false && (
                                <label className="flex items-center gap-1">Max CF <input type="number" className="w-12 border rounded px-1 py-0.5" value={policy.carryForwardMaxAnnual ?? 5} onChange={e => setLeavePolicy({ ...policy, carryForwardMaxAnnual: parseInt(e.target.value) || 0 })} /></label>
                            )}
                            <label className="flex items-center gap-1 text-slate-500">
                                <input type="checkbox" checked={policy.accrualEnabled !== false} onChange={e => setLeavePolicy({ ...policy, accrualEnabled: e.target.checked })} /> Monthly accrual
                            </label>
                        </div>
                    </div>
                </div>

                {staffId && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {balances.filter(b => b.leaveType !== 'Other' || b.quota).map(b => (
                            <div key={b.leaveType} className="bg-white rounded-xl border border-slate-200 p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-400">{b.leaveType}</p>
                                <p className="text-lg font-black text-slate-800">
                                    {b.quota == null ? '∞' : b.remaining}
                                    <span className="text-xs font-medium text-slate-400"> / {b.quota == null ? '∞' : b.quota}</span>
                                </p>
                                <p className="text-[10px] text-slate-400">
                                    Used {b.used} · Pending {b.pending}
                                    {b.carriedIn > 0 ? ` · +${b.carriedIn} CF` : ''}
                                    {b.accruedMonths != null ? ` · ${b.accruedMonths}/12 mo` : ''}
                                </p>
                                {b.leaveType === 'Annual' && b.yearEntitlement != null && policy.accrualEnabled !== false && (
                                    <p className="text-[10px] text-indigo-500">Year entitlement {b.yearEntitlement} · accrued {b.baseQuota}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3">
                    <h3 className="font-bold text-slate-800">Request leave</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        <select value={staffId} onChange={e => setStaffId(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                            <option value="">Select employee</option>
                            {staff.filter(s => s.status === 'Active').map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                        <select value={leaveType} onChange={e => setLeaveType(e.target.value as any)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
                            <option value="Annual">Annual</option>
                            <option value="Sick">Sick</option>
                            <option value="Casual">Casual</option>
                            <option value="Unpaid">Unpaid</option>
                            <option value="Other">Other</option>
                        </select>
                        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Reason (optional)" className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        <button type="button" onClick={submit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold">Submit request</button>
                    </div>
                </div>
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b bg-slate-50 font-bold text-sm text-slate-800">Leave requests</div>
                    <table className="w-full text-sm">
                        <thead className="text-left text-slate-500 border-b text-xs">
                            <tr>
                                <th className="px-4 py-2">Employee</th>
                                <th className="px-4 py-2">Dates</th>
                                <th className="px-4 py-2">Days</th>
                                <th className="px-4 py-2">Type</th>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {leaveRequests.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No leave requests.</td></tr>
                            ) : leaveRequests.map(lr => (
                                <tr key={lr.id}>
                                    <td className="px-4 py-3 font-medium">{lr.staffName}</td>
                                    <td className="px-4 py-3 text-xs">{lr.startDate} → {lr.endDate}</td>
                                    <td className="px-4 py-3 text-xs">{countLeaveDays(lr.startDate, lr.endDate, policy.excludeWeekends)}</td>
                                    <td className="px-4 py-3">{lr.leaveType}</td>
                                    <td className="px-4 py-3">
                                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                            lr.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                                            lr.status === 'Rejected' ? 'bg-red-50 text-red-700' :
                                            lr.status === 'Cancelled' ? 'bg-slate-100 text-slate-500' :
                                            'bg-amber-50 text-amber-700'
                                        }`}>{lr.status}</span>
                                    </td>
                                    <td className="px-4 py-3 text-right space-x-2">
                                        {lr.status === 'Pending' && (
                                            <>
                                                <button type="button" className="text-xs text-emerald-600 font-bold hover:underline" onClick={() => {
                                                    const pol = leavePolicy || DEFAULT_LEAVE_POLICY();
                                                    const emp = staff.find(s => s.id === lr.staffId);
                                                    const check = canRequestLeave({
                                                        staffId: lr.staffId,
                                                        leaveType: lr.leaveType as any,
                                                        startDate: lr.startDate,
                                                        endDate: lr.endDate,
                                                        requests: leaveRequests.filter(r => r.id !== lr.id),
                                                        policy: pol,
                                                        joiningDate: emp?.joiningDate,
                                                    });
                                                    if (lr.leaveType !== 'Unpaid' && !check.ok) {
                                                        if (!confirm((check.error || 'Over quota') + ' Approve anyway?')) return;
                                                    }
                                                    reviewLeaveRequest(lr.id, 'Approved');
                                                }}>Approve</button>
                                                <button type="button" className="text-xs text-red-600 font-bold hover:underline" onClick={() => reviewLeaveRequest(lr.id, 'Rejected')}>Reject</button>
                                                <button type="button" className="text-xs text-slate-500 hover:underline" onClick={() => cancelLeaveRequest(lr.id)}>Cancel</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const PayrollTab = () => {
        // State to hold temporary adjustments before processing

        const getAdjustment = (id: string) => adjustments[id] || { bonus: 0, fine: 0 };

        const updateAdjustment = (id: string, field: 'bonus' | 'fine', value: number) => {
            setAdjustments(prev => ({
                ...prev,
                [id]: { ...getAdjustment(id), [field]: value }
            }));
        };

        // --- AUTO-DETECTION LOGIC ---
        const getPayrollDetails = (employee: Staff) => {
            const now = new Date();
            const currentMonth = now.getMonth();
            const currentYear = now.getFullYear();
            const currentMonthPrefix = now.toISOString().slice(0, 7); // YYYY-MM

            // 1. Detect Advances (Transactions: Expense, Name matches, 'Advance' in ref)
            const advances = transactions
                .filter(t => {
                    if (!t.date) return false;
                    const tDate = new Date(t.date);
                    if (isNaN(tDate.getTime())) return false;
                    
                    return t.type === 'Expense' && 
                        t.entityName === employee.name && 
                        tDate.getMonth() === currentMonth &&
                        tDate.getFullYear() === currentYear &&
                        (t.reference?.toLowerCase().includes('advance') || false);
                })
                .reduce((sum, t) => sum + t.amount, 0);

            // 2. Detect Absence (Count 'Absent' days in current month)
            let absentDays = 0;
            if (employee.attendance) {
                Object.entries(employee.attendance).forEach(([date, record]) => {
                    if (date.startsWith(currentMonthPrefix) && record.status === 'Absent') {
                        absentDays++;
                    }
                });
            }
            
            // Calculate Absence Deduction (Basic Salary / 30 * Absent Days)
            const dailyRate = (employee.basicSalary || 0) / 30;
            const absentDeduction = Math.round(dailyRate * absentDays);

            // 3. Calculate Commission
            let totalSales = 0;
            transactions.forEach(t => {
                if (t.type === 'Sale' && t.date?.startsWith(currentMonthPrefix)) {
                    if (t.salesperson === employee.name || t.createdBy === employee.name) {
                        totalSales += t.amount;
                    }
                }
            });
            
            let commission = 0;
            if (employee.commissionRate && employee.commissionRate > 0) {
                commission = (totalSales * employee.commissionRate) / 100;
            }

            return { advances, absentDays, absentDeduction, totalSales, commission };
        };

        const currentPeriod = new Date().toISOString().slice(0, 7);

        const processPayroll = (employee: Staff) => {
            const adj = getAdjustment(employee.id);
            const { advances, absentDeduction, absentDays, commission, totalSales } = getPayrollDetails(employee);
            
            const netSalary = (employee.basicSalary || 0) + adj.bonus + commission - (advances + absentDeduction + adj.fine);

            if (netSalary <= 0) {
                alert("Net salary cannot be zero or negative.");
                return;
            }

            const alreadyPaid = payrollRuns.some(
                r => r.staffId === employee.id && r.period === currentPeriod && r.status === 'Paid'
            );
            if (alreadyPaid) {
                if (!confirm(`${employee.name} already has a paid payroll run for ${currentPeriod}. Pay again anyway?`)) {
                    return;
                }
            }

            const deductionDetails = [];
            if (advances > 0) deductionDetails.push(`Adv: ${advances}`);
            if (absentDeduction > 0) deductionDetails.push(`Absent(${absentDays}): ${absentDeduction}`);
            if (adj.fine > 0) deductionDetails.push(`Fine: ${adj.fine}`);
            if (commission > 0) deductionDetails.push(`Comm: ${commission}`);
            
            const refText = deductionDetails.length > 0 
                ? `Salary ${currentPeriod} (Less: ${deductionDetails.join(', ')})`
                : `Salary Payment ${currentPeriod}`;

            const txId = `pay-${Date.now()}`;
            const tx: LedgerEntry = {
                id: txId,
                date: new Date().toISOString().split('T')[0],
                entityName: employee.name,
                type: 'Expense',
                amount: netSalary,
                paymentMethod: 'Cash',
                reference: refText,
                details: { subtotal: netSalary, tax: 0, discount: 0, delivery: 0 }
            };

            addTransaction(tx);

            addPayrollRun({
                id: `pr-${Date.now()}`,
                staffId: employee.id,
                staffName: employee.name,
                period: currentPeriod,
                basicSalary: employee.basicSalary || 0,
                bonus: adj.bonus || 0,
                commission,
                advances,
                absentDays,
                absentDeduction,
                fine: adj.fine || 0,
                netPay: netSalary,
                transactionId: txId,
                status: 'Paid',
                paidAt: new Date().toISOString(),
                notes: totalSales > 0 ? `Sales this period: ${totalSales}` : undefined,
            });

            alert(`Payroll processed for ${employee.name}. Paid: ${formatMoney(netSalary)}`);
            
            setAdjustments(prev => {
                const next = { ...prev };
                delete next[employee.id];
                return next;
            });
        };

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                        <p className="text-sm font-bold text-blue-800">Payroll Assistant</p>
                        <p className="text-xs text-blue-700">Advances, Absent days, and Commissions are auto-detected from expenses, attendance, and sales for the current month.</p>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-4 min-w-[150px]">Employee</th>
                                    <th className="px-4 py-4 text-right">Basic</th>
                                    <th className="px-4 py-4 text-center bg-emerald-50/50">Commission</th>
                                    <th className="px-4 py-4 text-center bg-orange-50/50">Advances</th>
                                    <th className="px-4 py-4 text-center bg-red-50/50">Absent Cost</th>
                                    <th className="px-4 py-4 text-center w-24">Bonus (+)</th>
                                    <th className="px-4 py-4 text-center w-24">Fine (-)</th>
                                    <th className="px-4 py-4 text-right">Net Payable</th>
                                    <th className="px-4 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredStaff.map(employee => {
                                    const adj = getAdjustment(employee.id);
                                    const { advances, absentDeduction, absentDays, commission } = getPayrollDetails(employee);
                                    const net = (employee.basicSalary || 0) + adj.bonus + commission - (advances + absentDeduction + adj.fine);
                                    
                                    return (
                                        <tr key={employee.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-4 font-bold text-slate-800">{employee.name}</td>
                                            <td className="px-4 py-4 text-right text-slate-600">{formatMoney(employee.basicSalary || 0)}</td>
                                            
                                            {/* Auto Detected Columns */}
                                            <td className="px-4 py-4 text-center bg-emerald-50/30">
                                                {commission > 0 ? (
                                                    <span className="text-emerald-600 font-medium">{formatMoney(commission)}</span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-4 py-4 text-center bg-orange-50/30">
                                                {advances > 0 ? (
                                                    <span className="text-orange-600 font-medium">{formatMoney(advances)}</span>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="px-4 py-4 text-center bg-red-50/30">
                                                {absentDeduction > 0 ? (
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-red-600 font-medium">{formatMoney(absentDeduction)}</span>
                                                        <span className="text-[9px] text-red-400">({absentDays} days)</span>
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>

                                            {/* Manual Inputs */}
                                            <td className="px-4 py-4">
                                                <input 
                                                    type="number" 
                                                    className="w-full border rounded p-1 text-center focus:ring-1 focus:ring-indigo-500 outline-none text-xs"
                                                    value={adj.bonus || ''}
                                                    placeholder="0"
                                                    onChange={e => updateAdjustment(employee.id, 'bonus', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <input 
                                                    type="number" 
                                                    className="w-full border rounded p-1 text-center focus:ring-1 focus:ring-red-500 outline-none text-red-600 text-xs"
                                                    value={adj.fine || ''}
                                                    placeholder="0"
                                                    onChange={e => updateAdjustment(employee.id, 'fine', parseFloat(e.target.value) || 0)}
                                                />
                                            </td>

                                            <td className="px-4 py-4 text-right font-bold text-indigo-700 text-base">{formatMoney(net)}</td>
                                            <td className="px-4 py-4 text-right">
                                                {payrollRuns.some(r => r.staffId === employee.id && r.period === currentPeriod && r.status === 'Paid') ? (
                                                    <button 
                                                        onClick={() => processPayroll(employee)}
                                                        className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded text-xs font-bold hover:bg-emerald-100 transition-colors"
                                                        title="Already paid this period — click to pay again"
                                                    >
                                                        Paid
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => processPayroll(employee)}
                                                        className="bg-slate-900 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-800 transition-colors"
                                                    >
                                                        Pay
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-sm">Payroll history (synced)</h3>
                        <span className="text-xs text-slate-400">Period {currentPeriod}</span>
                    </div>
                    <div className="overflow-x-auto max-h-72">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-slate-500 border-b text-xs">
                                <tr>
                                    <th className="px-4 py-2">Period</th>
                                    <th className="px-4 py-2">Employee</th>
                                    <th className="px-4 py-2 text-right">Basic</th>
                                    <th className="px-4 py-2 text-right">Net</th>
                                    <th className="px-4 py-2">Status</th>
                                    <th className="px-4 py-2 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[...payrollRuns].sort((a, b) => (b.paidAt || '').localeCompare(a.paidAt || '')).slice(0, 50).map(run => (
                                    <tr key={run.id} className={run.status === 'Void' ? 'opacity-50' : ''}>
                                        <td className="px-4 py-2 font-mono text-xs">{run.period}</td>
                                        <td className="px-4 py-2 font-medium text-slate-800">{run.staffName}</td>
                                        <td className="px-4 py-2 text-right text-slate-600">{formatMoney(run.basicSalary)}</td>
                                        <td className="px-4 py-2 text-right font-semibold">{formatMoney(run.netPay)}</td>
                                        <td className="px-4 py-2">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${run.status === 'Paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {run.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right">
                                            {run.status === 'Paid' && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (confirm(`Void payroll for ${run.staffName} (${run.period})?\n\nThis posts a Payroll Reversal (Income) of ${run.netPay} and marks the run Void. Cannot be undone.`)) {
                                                            voidPayrollRun(run.id);
                                                        }
                                                    }}
                                                    className="text-xs text-red-600 hover:underline"
                                                >
                                                    Void
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {payrollRuns.length === 0 && (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 text-sm">No payroll runs yet.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const PerformanceTab = () => {

        const handleAddReview = () => {
            if (ratingModal.id && reviewText) {
                updatePerformance(ratingModal.id, newRating, reviewText);
                setRatingModal({ show: false, id: null });
                setReviewText('');
                setNewRating(5);
            }
        };

        const getSalesProgress = (employee: Staff) => {
            const { year, month } = currentYearMonth();
            const target = employee.salesTarget || 0;
            const totalSales = getStaffSalesInPeriod(employee, transactions, year, month);
            const percentage = target > 0 ? Math.min(100, (totalSales / target) * 100) : 0;
            return { totalSales, target, percentage };
        };

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredStaff.map(employee => {
                        const progress = getSalesProgress(employee);
                        return (
                            <div key={employee.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-full flex items-center justify-center font-bold text-indigo-600 text-xl">
                                            {employee?.name?.charAt(0) || 'E'}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">{employee?.name || ''}</h3>
                                            <div className="flex items-center gap-1 text-yellow-500 mt-1">
                                                <Star className="w-4 h-4 fill-current" />
                                                <span className="font-bold text-slate-700">{employee.performance?.rating || 'N/A'}</span>
                                                <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setRatingModal({ show: true, id: employee.id })}
                                        className="text-xs font-medium text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded transition-colors"
                                    >
                                        + Add Review
                                    </button>
                                </div>

                                {/* Sales Target Progress */}
                                <div className="p-4 border-b border-slate-100">
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sales Target Progress</span>
                                        <span className="text-xs font-bold text-indigo-600">{progress.percentage.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-indigo-600 transition-all duration-500" 
                                            style={{ width: `${progress.percentage}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between mt-1 text-[10px] text-slate-500">
                                        <span>{formatMoney(progress.totalSales)} achieved</span>
                                        <span>Target: {formatMoney(progress.target)}</span>
                                    </div>
                                </div>
                                
                                {/* Geo Tracking */}
                                <div className="bg-slate-50 p-4 border-b border-slate-100">
                                    <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                                        <span className="font-bold uppercase flex items-center gap-1"><MapPin className="w-3 h-3"/> Last Known Location</span>
                                        <button 
                                            onClick={() => setHistoryModal({ show: true, staff: employee })}
                                            className="text-indigo-600 hover:underline font-bold"
                                        >
                                            View History
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-700 bg-white p-2 rounded border border-slate-200">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                        {employee.lastLocation?.address || 'Location data unavailable'}
                                        <span className="text-[10px] text-slate-400 ml-auto">{employee.lastLocation?.timestamp}</span>
                                    </div>
                                </div>

                                <div className="p-4 max-h-40 overflow-y-auto">
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-2">Recent Reviews</p>
                                    {employee.performance?.reviews && employee.performance.reviews.length > 0 ? (
                                        <div className="space-y-3">
                                            {employee.performance.reviews.map((rev, idx) => (
                                                <div key={idx} className="text-sm border-l-2 border-indigo-200 pl-3">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <span className="font-medium text-slate-700">{rev.rating} ★</span>
                                                        <span className="text-xs text-slate-400">{rev.date}</span>
                                                    </div>
                                                    <p className="text-slate-600 italic">"{rev.comment}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-slate-400 italic">No reviews added yet.</p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Rating Modal */}
                {ratingModal.show && (
                    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
                            <h3 className="font-bold text-slate-800 mb-4">Add Performance Review</h3>
                            
                            <div className="flex justify-center gap-2 mb-6">
                                {[1, 2, 3, 4, 5].map(star => (
                                    <button key={star} onClick={() => setNewRating(star)} className="focus:outline-none transition-transform hover:scale-110">
                                        <Star className={`w-8 h-8 ${star <= newRating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'}`} />
                                    </button>
                                ))}
                            </div>

                            <textarea 
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none mb-4"
                                placeholder="Write your evaluation comments..."
                                value={reviewText}
                                onChange={e => setReviewText(e.target.value)}
                            />

                            <div className="flex gap-2">
                                <button onClick={() => setRatingModal({ show: false, id: null })} className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium">Cancel</button>
                                <button onClick={handleAddReview} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Submit</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Location History Modal */}
                {historyModal.show && historyModal.staff && (
                    <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                        <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800">Location History: {historyModal.staff.name}</h3>
                                <button onClick={() => setHistoryModal({ show: false, staff: null })} className="text-slate-400 hover:text-slate-600">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                {historyModal.staff.locationHistory && historyModal.staff.locationHistory.length > 0 ? (
                                    historyModal.staff.locationHistory.map((loc, idx) => (
                                        <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-start gap-3">
                                            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200 shrink-0">
                                                <MapPin className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-slate-800 font-medium break-words">{loc.address}</p>
                                                <p className="text-[10px] text-slate-400 mt-1">{loc.timestamp}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-10 text-slate-400 italic">
                                        No location history available for this employee.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
                    <Users className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('Employee Management')}</h1>
                    <p className="text-slate-500 text-sm">HR, Payroll, and Performance Tracking</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 overflow-x-auto">
                <button onClick={() => setActiveTab('staff')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'staff' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <UserCheck className="w-4 h-4" /> Staff List
                </button>
                <button onClick={() => setActiveTab('attendance')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'attendance' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Clock className="w-4 h-4" /> Attendance
                </button>
                <button onClick={() => setActiveTab('leave')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'leave' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <Calendar className="w-4 h-4" /> Leave
                </button>
                <button onClick={() => setActiveTab('payroll')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'payroll' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <DollarSign className="w-4 h-4" /> Payroll
                </button>
                <button onClick={() => setActiveTab('performance')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'performance' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                    <TrendingUp className="w-4 h-4" /> Performance
                </button>
            </div>

            {/* Content Area */}
            <div>
                {activeTab === 'staff' && StaffListTab()}
                {activeTab === 'attendance' && AttendanceTab()}
                {activeTab === 'leave' && LeaveTab()}
                {activeTab === 'payroll' && PayrollTab()}
                {activeTab === 'performance' && PerformanceTab()}
            </div>

            {/* Add Staff Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-slate-800 text-lg">Add New Employee</h3>
                            <button onClick={() => {
                                setShowAddModal(false);
                                setEnteredMobile('');
                            }} className="text-slate-400 hover:text-slate-600">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const mobile = (formData.get('mobile') as string || enteredMobile).trim();
                            const name = foundGlobalEmployee ? foundGlobalEmployee.name : (formData.get('name') as string || '').trim();
                            // If this mobile already has a global profile, don't touch their PIN at
                            // all (leave it '' - addStaff/backend both treat that as "unchanged").
                            // Reading and re-sending their existing PIN here would leak it in plain
                            // text over the wire for no reason, since it isn't actually changing.
                            const pin = foundGlobalEmployee ? '' : (formData.get('pin') as string || '1234').trim();
                            
                            if (!mobile) {
                                alert("Mobile number is required as the unique Global Employee ID.");
                                return;
                            }

                            const roleLabel = (formData.get('role') as string) || 'Cashier';
                            const roleTemplateId = matchRoleTemplateId(roleLabel);
                            const permissions = resolveStaffPermissions({ role: roleLabel, roleTemplateId });
                            const newStaff: Staff = {
                                id: mobile,
                                name: name,
                                mobile: mobile,
                                role: roleLabel,
                                status: 'Active',
                                pin: pin,
                                permissions,
                                roleTemplateId,
                                basicSalary: parseFloat(formData.get('salary') as string) || 0,
                                joiningDate: formData.get('joiningDate') as string || new Date().toISOString().split('T')[0],
                                salesTarget: parseFloat(formData.get('target') as string) || 0,
                                commissionRate: parseFloat(formData.get('commission') as string) || 0,
                                designationId: (formData.get('designationId') as string) || undefined,
                                shiftId: (formData.get('shiftId') as string) || undefined,
                                attendance: {},
                                performance: { rating: 5, reviews: [] }
                            };
                            addStaff(newStaff);
                            setShowAddModal(false);
                            setEnteredMobile('');
                        }} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Mobile Number (Global Employee ID)</label>
                                <input 
                                    name="mobile" 
                                    required 
                                    type="tel" 
                                    className="w-full p-2.5 border rounded-lg text-sm font-mono" 
                                    placeholder="e.g. 01712345678" 
                                    value={enteredMobile}
                                    onChange={e => setEnteredMobile(e.target.value)}
                                />
                            </div>

                            {foundGlobalEmployee && (
                                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-xs space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold">
                                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span>Existing Profile Found Globally</span>
                                    </div>
                                    <p>Employee Name: <strong>{foundGlobalEmployee.name}</strong></p>
                                    <p className="text-slate-500 text-[10px]">Adding them will automatically link their global profile to your business, preserving their career history. Their global login PIN will remain unchanged.</p>
                                </div>
                            )}

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase font-sans">Full Name</label>
                                <input 
                                    name="name" 
                                    required={!foundGlobalEmployee}
                                    readOnly={!!foundGlobalEmployee}
                                    value={foundGlobalEmployee ? foundGlobalEmployee.name : undefined}
                                    type="text" 
                                    className={`w-full p-2.5 border rounded-lg text-sm ${foundGlobalEmployee ? 'bg-slate-100 text-slate-600 outline-none' : 'bg-white text-slate-800'}`} 
                                    placeholder={foundGlobalEmployee ? foundGlobalEmployee.name : "e.g. John Doe"} 
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                                    <select name="role" className="w-full p-2.5 border rounded-lg text-sm" defaultValue="Cashier">
                                        {RBAC_ROLE_TEMPLATES.filter(r => r.id !== 'custom').map(r => (
                                          <option key={r.id} value={r.label}>{r.label}</option>
                                        ))}
                                    </select>
                                    <p className="text-[9px] text-slate-400 mt-1">Applies POS/inventory permission pack. Fine-tune in Access Control.</p>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Designation <span className="normal-case text-slate-400">(job title, optional)</span></label>
                                    <select name="designationId" className="w-full p-2.5 border rounded-lg text-sm">
                                        <option value="">— None —</option>
                                        {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Work Shift</label>
                                <select name="shiftId" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                                    <option value="">No shift assigned</option>
                                    {workShifts.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</option>
                                    ))}
                                </select>
                            </div>
                                {!foundGlobalEmployee && (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 uppercase">Login PIN</label>
                                        <input 
                                            name="pin" 
                                            required 
                                            type="password" 
                                            maxLength={4} 
                                            className="w-full p-2.5 border rounded-lg text-sm font-mono" 
                                            placeholder="4 digits" 
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Basic Salary</label>
                                    <input name="salary" type="number" className="w-full p-2.5 border rounded-lg text-sm" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Joining Date</label>
                                    <input name="joiningDate" type="date" className="w-full p-2.5 border rounded-lg text-sm" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Sales Target</label>
                                    <input name="target" type="number" className="w-full p-2.5 border rounded-lg text-sm" placeholder="0.00" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-slate-500 uppercase">Commission (%)</label>
                                    <input name="commission" type="number" className="w-full p-2.5 border rounded-lg text-sm" placeholder="0" />
                                </div>
                            </div>
                            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all mt-2">
                                {foundGlobalEmployee ? 'Link & Connect Profile' : 'Create Employee Profile'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeManagement;