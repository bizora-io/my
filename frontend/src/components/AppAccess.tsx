import React, { useState, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Staff } from '../types';
import {
  Users, Shield, Clock, Plus, Edit2, Trash2, CheckCircle, XCircle, Search, Save,
  Lock, CheckSquare, Square, History, ChevronDown, ChevronRight, Sparkles, AlertCircle,
  Check, Store, ShoppingBag, Package, ShoppingCart, DollarSign, BarChart3, Users2,
  UserCheck, Bell, ShieldCheck, Globe, Factory, KeyRound, Smartphone, RefreshCw
} from 'lucide-react';
import {
  FEATURE_CATEGORIES,
  ALL_FEATURES,
  isFeatureEnabled,
  getFeatureById,
  type FeatureItem,
} from '@shared/lib/featureRegistry';
import {
  RBAC_ROLE_TEMPLATES,
  resolveStaffPermissions,
  matchRoleTemplateId,
  getRoleTemplate,
  type RbacRoleId
} from '../utils/rbacRoles';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  pos: ShoppingBag,
  inventory: Package,
  purchases: ShoppingCart,
  finance: DollarSign,
  reports: BarChart3,
  crm: Users2,
  hrm: UserCheck,
  ecommerce: Globe,
  manufacturing: Factory,
  support: Bell,
  system: ShieldCheck,
};

const AppAccess: React.FC = () => {
  const { t } = useSettings();
  const { staff, appLogs, addStaff, updateStaff, deleteStaff } = useData();
  const { user } = useAuth() as any;

  const [activeTab, setActiveTab] = useState<'staff' | 'logs'>('staff');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [featureSearchQuery, setFeatureSearchQuery] = useState('');

  // Form State
  const [formData, setFormData] = useState<Partial<Staff> & { roleTemplateId?: string }>({
    name: '',
    role: 'Salesperson',
    roleTemplateId: 'salesperson',
    pin: '',
    mobile: '',
    status: 'Active',
    permissions: []
  });

  // Expanded module categories in modal
  const [expandedCategories, setExpandedCategories] = useState<string[]>(FEATURE_CATEGORIES.map(c => c.id));

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return staff.filter(s => 
      (s.name || '').toLowerCase().includes(q) ||
      (s.role || '').toLowerCase().includes(q) ||
      (s.mobile || '').toLowerCase().includes(q)
    );
  }, [staff, searchTerm]);

  // Filtered app logs
  const filteredLogs = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    return appLogs.filter(l => 
      (l.staffName || '').toLowerCase().includes(q) || 
      (l.action || '').toLowerCase().includes(q) ||
      (l.details || '').toLowerCase().includes(q)
    );
  }, [appLogs, searchTerm]);

  // Helper: check if a feature is included in the shop's active subscription
  const isShopSubscriptionFeature = (featureId: string): boolean => {
    // If user is superadmin/owner or has wildcard subscription
    const userFeatures = user?.features;
    const userModules = user?.modules;
    return isFeatureEnabled(featureId, userFeatures, userModules);
  };

  const openModal = (staffMember?: Staff) => {
    setFeatureSearchQuery('');
    if (staffMember) {
      setEditingStaff(staffMember);
      const tid = (staffMember as any).roleTemplateId || matchRoleTemplateId(staffMember.role);
      const resolved = resolveStaffPermissions({
        role: staffMember.role,
        permissions: staffMember.permissions,
        roleTemplateId: tid,
      });
      setFormData({
        ...staffMember,
        mobile: staffMember.mobile || staffMember.id,
        roleTemplateId: tid,
        permissions: resolved,
      });
    } else {
      setEditingStaff(null);
      // By default for new employees, grant baseline permissions for Salesperson
      const defaultTid = 'salesperson';
      setFormData({
        name: '',
        role: 'Salesperson',
        roleTemplateId: defaultTid,
        pin: '',
        mobile: '',
        status: 'Active',
        permissions: resolveStaffPermissions({ role: 'Salesperson', roleTemplateId: defaultTid })
      });
    }
    setExpandedCategories(FEATURE_CATEGORIES.map(c => c.id));
    setShowStaffModal(true);
  };

  const handleSave = () => {
    if (!formData.name?.trim()) {
      alert("Employee name is required.");
      return;
    }
    if (!formData.pin?.trim() || !/^\d{4,6}$/.test(formData.pin.trim())) {
      alert("Please provide a 4 to 6 digit numeric login PIN.");
      return;
    }

    const roleTemplateId = formData.roleTemplateId || matchRoleTemplateId(formData.role);
    const resolvedPermissions = resolveStaffPermissions({
      role: formData.role,
      permissions: formData.permissions,
      roleTemplateId,
    });

    const cleanMobile = (formData.mobile || formData.id || '').trim();

    const payload: Staff = {
      id: editingStaff ? editingStaff.id : (cleanMobile || Date.now().toString()),
      name: formData.name.trim(),
      role: getRoleTemplate(roleTemplateId as RbacRoleId).label === 'Custom'
        ? (formData.role || 'Custom')
        : getRoleTemplate(roleTemplateId as RbacRoleId).label,
      roleTemplateId,
      pin: formData.pin.trim(),
      mobile: cleanMobile,
      status: formData.status || 'Active',
      permissions: resolvedPermissions,
      lastLogin: editingStaff?.lastLogin || 'Never',
    };

    if (editingStaff) {
      updateStaff(editingStaff.id, payload);
    } else {
      addStaff(payload);
    }
    setShowStaffModal(false);
  };

  const applyRoleTemplate = (templateId: string) => {
    const tpl = getRoleTemplate(templateId as RbacRoleId);
    const resolved = resolveStaffPermissions({
      role: tpl.label,
      roleTemplateId: templateId,
      permissions: templateId === 'custom' ? (formData.permissions || []) : [],
    });
    setFormData({
      ...formData,
      roleTemplateId: templateId,
      role: tpl.label,
      permissions: resolved,
    });
  };

  const togglePermission = (key: string) => {
    // If locked by shop subscription, do not allow toggling
    if (!isShopSubscriptionFeature(key)) {
      alert("This capability is locked by your shop's active subscription package. Please upgrade your subscription to enable it for employees.");
      return;
    }

    setFormData(prev => {
      const current = prev.permissions || [];
      if (current.includes('all')) {
        // Break wildcard into specific allowed features
        const allAllowed = ALL_FEATURES.map(f => f.id).filter(id => isShopSubscriptionFeature(id));
        return {
          ...prev,
          permissions: allAllowed.filter(p => p !== key),
          roleTemplateId: 'custom',
        };
      }

      const nextPermissions = current.includes(key)
        ? current.filter(p => p !== key)
        : [...current, key];

      return {
        ...prev,
        permissions: nextPermissions,
        roleTemplateId: 'custom',
      };
    });
  };

  const toggleCategoryPermissions = (categoryId: string) => {
    const cat = FEATURE_CATEGORIES.find(c => c.id === categoryId);
    if (!cat) return;

    // Only consider features permitted by the shop's active subscription
    const allowedFeatureIds = cat.features
      .map(f => f.id)
      .filter(id => isShopSubscriptionFeature(id));

    if (allowedFeatureIds.length === 0) {
      alert("All features in this module are locked by your shop's subscription package.");
      return;
    }

    setFormData(prev => {
      const current = prev.permissions || [];
      const allSelected = allowedFeatureIds.every(id => current.includes(id));

      let nextPermissions: string[];
      if (allSelected) {
        // Deselect all allowed in this module
        nextPermissions = current.filter(p => !allowedFeatureIds.includes(p));
      } else {
        // Select all allowed in this module
        const added = allowedFeatureIds.filter(id => !current.includes(id));
        nextPermissions = [...current, ...added];
      }

      return {
        ...prev,
        permissions: nextPermissions,
        roleTemplateId: 'custom',
      };
    });
  };

  const toggleCategoryExpand = (catId: string) => {
    setExpandedCategories(prev => 
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-600/20">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {t('App Access & Permissions')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Control employee roles, granular permissions across 51 ERP features, and audit activity logs.
            </p>
          </div>
        </div>

        <button 
          type="button"
          onClick={() => openModal()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm flex items-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95 transition-all self-stretch sm:self-auto justify-center"
        >
          <Plus className="w-4 h-4" /> Add Staff Member
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button 
          type="button"
          onClick={() => setActiveTab('staff')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'staff' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <Users className="w-4 h-4" /> Staff Accounts ({staff.length})
        </button>
        <button 
          type="button"
          onClick={() => setActiveTab('logs')}
          className={`px-6 py-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-colors ${
            activeTab === 'logs' 
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <History className="w-4 h-4" /> System Audit Trail ({appLogs.length})
        </button>
      </div>

      {/* STAFF TAB */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          {/* Search Toolbar */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search staff by name, role, mobile..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredStaff.map(s => {
              const permsCount = Array.isArray(s.permissions) 
                ? (s.permissions.includes('all') ? ALL_FEATURES.length : s.permissions.length)
                : 0;

              return (
                <div 
                  key={s.id} 
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white text-base shadow-sm ${
                          s.role === 'Admin' ? 'bg-indigo-600' :
                          s.role === 'Manager' ? 'bg-purple-600' :
                          s.role === 'Cashier' ? 'bg-emerald-600' : 'bg-blue-600'
                        }`}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-black text-base text-slate-900 dark:text-white">{s.name}</h3>
                          <span className="inline-block mt-0.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {s.role}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                        s.status === 'Active' 
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' 
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                      }`}>
                        {s.status}
                      </span>
                    </div>

                    <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                      <div className="flex justify-between">
                        <span>Staff ID:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{s.id}</span>
                      </div>
                      {s.mobile && (
                        <div className="flex justify-between">
                          <span>Mobile:</span>
                          <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{s.mobile}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Permission Scope:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {permsCount} / {ALL_FEATURES.length} Features
                        </span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>Last Active:</span>
                        <span>{s.lastLogin || 'Never'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-5 pt-2">
                    <button 
                      type="button"
                      onClick={() => openModal(s)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Permissions
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        if (confirm(`Remove staff member ${s.name}?`)) {
                          deleteStaff(s.id);
                        }
                      }}
                      className="p-1.5 rounded-xl border border-rose-200 dark:border-rose-900/50 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 transition"
                      title="Remove Staff"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStaff.length === 0 && (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8">
              <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No staff members found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {searchTerm ? `No records match "${searchTerm}".` : 'Add your cashiers, store managers, and accountants to control what they can access.'}
              </p>
              {!searchTerm && (
                <button
                  type="button"
                  onClick={() => openModal()}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                >
                  Create First Staff Account
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-bold text-xs uppercase border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">Staff Member</th>
                  <th className="px-5 py-3">Module</th>
                  <th className="px-5 py-3">Action</th>
                  <th className="px-5 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-700 dark:text-slate-300">
                    <td className="px-5 py-3 text-xs font-mono text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-5 py-3 font-bold text-slate-900 dark:text-white">
                      {log.staffName}
                    </td>
                    <td className="px-5 py-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {log.module}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-xs">
                      {log.action}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {log.details}
                    </td>
                  </tr>
                ))}
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400 text-xs">
                      No system logs recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT STAFF & PERMISSIONS MODAL */}
      {showStaffModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 dark:text-white">
                    {editingStaff ? `Edit Permissions: ${editingStaff.name}` : 'Add Staff Member & Configure Access'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Permissions are enforced in both frontend menus and backend REST APIs.
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Full Name *
                  </label>
                  <input 
                    type="text" 
                    value={formData.name ?? ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g. Shakib Al Hasan"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Mobile Number (Login ID)
                  </label>
                  <input 
                    type="tel" 
                    value={formData.mobile ?? ''}
                    onChange={e => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="01XXXXXXXXX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Login PIN (4-6 Digits) *
                  </label>
                  <input 
                    type="text" 
                    value={formData.pin ?? ''}
                    onChange={e => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm font-mono tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="1234"
                    maxLength={6}
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Account Status
                  </label>
                  <select 
                    value={formData.status ?? 'Active'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs sm:text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* RBAC Role Preset Templates */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Role Template Presets
                  </label>
                  <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
                    {(formData.permissions || []).length} / {ALL_FEATURES.length} features assigned
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  {RBAC_ROLE_TEMPLATES.map(tpl => {
                    const isSelected = formData.roleTemplateId === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => applyRoleTemplate(tpl.id)}
                        className={`p-2.5 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 ring-2 ring-indigo-500 text-indigo-900 dark:text-white'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-extrabold text-xs block">{tpl.label}</span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">{tpl.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Complete 51 Features Matrix */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-black text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-500" /> Granular ERP Feature Access Matrix
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Features not included in your active subscription package are marked locked.
                    </p>
                  </div>

                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text" 
                      value={featureSearchQuery}
                      onChange={e => setFeatureSearchQuery(e.target.value)}
                      placeholder="Search features..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>

                {/* Categories Accordion */}
                <div className="space-y-3">
                  {FEATURE_CATEGORIES.map(category => {
                    const isExpanded = expandedCategories.includes(category.id);
                    const CatIcon = CATEGORY_ICONS[category.id] || Package;

                    const catFeatures = category.features.filter(f => {
                      if (!featureSearchQuery.trim()) return true;
                      const q = featureSearchQuery.trim().toLowerCase();
                      return f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q) || f.id.toLowerCase().includes(q);
                    });

                    if (catFeatures.length === 0) return null;

                    // Subscription-allowed features count
                    const allowedInShop = catFeatures.filter(f => isShopSubscriptionFeature(f.id));
                    // Employee-granted features count
                    const currentPerms = formData.permissions || [];
                    const grantedCount = allowedInShop.filter(f => currentPerms.includes(f.id) || currentPerms.includes('all')).length;

                    return (
                      <div 
                        key={category.id}
                        className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden"
                      >
                        {/* Category Header */}
                        <div className="p-3.5 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => toggleCategoryExpand(category.id)}
                            className="flex items-center gap-2.5 flex-1 text-left"
                          >
                            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                              <CatIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="font-extrabold text-xs sm:text-sm text-slate-800 dark:text-white">
                                {category.name}
                              </h5>
                              <p className="text-[10px] text-slate-400 line-clamp-1">{category.description}</p>
                            </div>
                          </button>

                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {grantedCount} / {allowedInShop.length} Enabled
                            </span>

                            {allowedInShop.length > 0 && (
                              <button
                                type="button"
                                onClick={() => toggleCategoryPermissions(category.id)}
                                className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 hover:underline"
                              >
                                {grantedCount === allowedInShop.length ? 'Revoke All' : 'Grant All'}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => toggleCategoryExpand(category.id)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                            >
                              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Category Features Grid */}
                        {isExpanded && (
                          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 bg-white dark:bg-slate-950">
                            {catFeatures.map(feat => {
                              const isSubAllowed = isShopSubscriptionFeature(feat.id);
                              const isEmpGranted = isSubAllowed && (
                                (formData.permissions || []).includes('all') ||
                                (formData.permissions || []).includes(feat.id)
                              );

                              return (
                                <div
                                  key={feat.id}
                                  className={`p-3 rounded-2xl border transition-all flex items-start justify-between gap-3 ${
                                    !isSubAllowed 
                                      ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 opacity-60'
                                      : isEmpGranted
                                        ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/60'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                                  }`}
                                >
                                  <div className="space-y-0.5 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold text-slate-900 dark:text-white">
                                        {feat.name}
                                      </p>
                                      {!isSubAllowed && (
                                        <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900">
                                          <Lock className="w-2.5 h-2.5" /> Plan Lock
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-400 leading-normal line-clamp-2">
                                      {feat.description}
                                    </p>
                                    <span className="text-[9px] font-mono text-slate-400 block pt-0.5">
                                      {feat.id}
                                    </span>
                                  </div>

                                  <div className="shrink-0 pt-0.5">
                                    {!isSubAllowed ? (
                                      <span 
                                        className="text-[10px] font-bold text-slate-400 flex items-center gap-1"
                                        title="Requires subscription upgrade to unlock for your shop"
                                      >
                                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => togglePermission(feat.id)}
                                        className={`relative inline-flex h-5 w-10 items-center rounded-full transition-colors focus:outline-none ${
                                          isEmpGranted ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                                        }`}
                                      >
                                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                          isEmpGranted ? 'translate-x-5' : 'translate-x-1'
                                        }`} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setShowStaffModal(false)}
                className="px-5 py-2.5 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-white dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-wider shadow-md shadow-indigo-600/20 active:scale-95 transition flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Save Staff Permissions
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppAccess;