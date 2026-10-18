import React, { useMemo, useState } from 'react';
import {
  Briefcase,
  Search,
  Users,
  Phone,
  Mail,
  MapPin,
  Shield,
  Building2,
  RefreshCw,
  Store,
  Calendar,
  DollarSign,
  CheckCircle2,
  Lock,
} from 'lucide-react';

type Props = {
  employeeRoleFilter?: string;
  employeeSearch?: string;
  globalEmployees?: any[];
  selectedEmployee?: any;
  setEmployeeRoleFilter?: (v: string) => void;
  setEmployeeSearch?: (v: string) => void;
  setGlobalEmployees?: (v: any[]) => void;
  setSelectedEmployee?: (v: any) => void;
  showToast?: (msg: string, type?: string) => void;
  refreshEmployees?: () => void;
  user?: any;
};

/** SaaS Admin — Global employee registry across all tenant businesses */
export const AdminEmployeesTab: React.FC<Props> = ({
  employeeRoleFilter: roleFilterProp,
  employeeSearch: searchProp,
  globalEmployees = [],
  selectedEmployee,
  setEmployeeRoleFilter,
  setEmployeeSearch,
  setSelectedEmployee,
  showToast,
  refreshEmployees,
}) => {
  const [localSearch, setLocalSearch] = useState('');
  const [localRole, setLocalRole] = useState('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const search = searchProp !== undefined ? searchProp : localSearch;
  const setSearch = setEmployeeSearch || setLocalSearch;
  const roleFilter = roleFilterProp !== undefined ? roleFilterProp : localRole;
  const setRoleFilter = setEmployeeRoleFilter || setLocalRole;

  const list = Array.isArray(globalEmployees) ? globalEmployees : [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refreshEmployees) {
        await refreshEmployees();
      }
      showToast?.('Employee directory refreshed from database', 'success');
    } catch {
      showToast?.('Failed to refresh employee directory', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const roles = useMemo(() => {
    const s = new Set<string>(['ALL']);
    list.forEach((e) => {
      const primaryRole = e.role || e.employments?.[0]?.role;
      if (primaryRole) s.add(String(primaryRole));
      if (Array.isArray(e.employments)) {
        e.employments.forEach((emp: any) => {
          if (emp.role) s.add(String(emp.role));
        });
      }
    });
    return Array.from(s);
  }, [list]);

  const filtered = useMemo(() => {
    const q = (search || '').trim().toLowerCase();
    return list.filter((e) => {
      const primaryRole = e.role || e.employments?.[0]?.role || 'Staff';
      const allRoles = [primaryRole, ...(e.employments || []).map((emp: any) => emp.role)].map(r => String(r).toLowerCase());
      if (roleFilter && roleFilter !== 'ALL' && !allRoles.includes(roleFilter.toLowerCase())) return false;
      if (!q) return true;

      const shopNames = (e.employments || []).map((emp: any) => emp.businessName).join(' ');
      const hay = [e.name, e.email, e.mobile, e.phone, primaryRole, e.businessName, shopNames, e.id]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [list, search, roleFilter]);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-indigo-400" /> Employee & Staff Registry
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Global employee directory across all registered tenant shops, roles, and branch assignments.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sync & Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Total Employees</p>
          <p className="text-2xl font-black text-slate-800">{list.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Filtered</p>
          <p className="text-2xl font-black text-indigo-600">{filtered.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2 md:col-span-1">
          <p className="text-[10px] font-black uppercase text-slate-400">Active Roles</p>
          <p className="text-2xl font-black text-slate-800">{Math.max(0, roles.length - 1)}</p>
        </div>
      </div>

      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee name, mobile, shop, or role…"
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {r === 'ALL' ? 'All Roles' : r}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left min-w-[640px]">
              <thead className="bg-slate-900 text-slate-200 text-[10px] uppercase font-bold">
                <tr>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Shop Assignment(s)</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-slate-400 text-xs">
                      {list.length === 0 ? 'No employees registered yet. When Shop Owners add staff, they will appear here.' : 'No employees matching your search filter.'}
                    </td>
                  </tr>
                )}
                {filtered.map((e) => {
                  const on = selectedEmployee?.id === e.id || selectedEmployee?.mobile === e.mobile;
                  const primaryRole = e.role || e.employments?.[0]?.role || 'Staff';
                  const shopName = e.businessName || e.employments?.map((emp: any) => emp.businessName).join(', ') || '—';
                  const status = e.status || e.employments?.[0]?.status || 'Active';

                  return (
                    <tr
                      key={e.id || e.mobile}
                      onClick={() => setSelectedEmployee?.(e)}
                      className={`cursor-pointer transition-colors ${on ? 'bg-indigo-50/80' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-900 text-xs sm:text-sm">{e.name || '—'}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{e.mobile || e.id || ''}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {primaryRole}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <Store className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="line-clamp-1">{shopName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        <div className="font-medium">{e.mobile || e.phone || '—'}</div>
                        {e.email && <div className="text-[11px] text-slate-400">{e.email}</div>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 min-h-[220px]">
          {!selectedEmployee ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-10">
              <Users className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-600">Select an employee</p>
              <p className="text-xs text-slate-400 mt-0.5">Click any row to inspect role, shop assignments, and permissions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">{selectedEmployee.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
                    <Shield className="w-3 h-3" /> {selectedEmployee.role || selectedEmployee.employments?.[0]?.role || 'Staff'}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                    selectedEmployee.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {selectedEmployee.status || 'Active'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-600 space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-mono font-medium">{selectedEmployee.mobile || '—'}</span>
                </div>
                {selectedEmployee.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedEmployee.email}</span>
                  </div>
                )}
              </div>

              {/* Employments List */}
              <div className="pt-2 border-t border-slate-100">
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2">
                  Shop Employments ({selectedEmployee.employments?.length || 1})
                </p>
                <div className="space-y-2">
                  {(selectedEmployee.employments || [
                    {
                      businessName: selectedEmployee.businessName || 'Business',
                      role: selectedEmployee.role || 'Staff',
                      joiningDate: selectedEmployee.joiningDate || 'N/A',
                      basicSalary: selectedEmployee.basicSalary || 0
                    }
                  ]).map((emp: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between font-bold text-slate-800">
                        <span className="flex items-center gap-1">
                          <Store className="w-3.5 h-3.5 text-indigo-500" />
                          {emp.businessName || emp.businessId || 'Shop'}
                        </span>
                        <span className="text-[10px] uppercase font-black px-1.5 py-0.5 bg-white border rounded">
                          {emp.role || 'Staff'}
                        </span>
                      </div>
                      {emp.joiningDate && (
                        <p className="text-[10px] text-slate-500">Joined: {emp.joiningDate}</p>
                      )}
                      {emp.basicSalary > 0 && (
                        <p className="text-[10px] text-slate-500 font-mono">Salary: ৳ {Number(emp.basicSalary).toLocaleString()}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminEmployeesTab;
