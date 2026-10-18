import React, { useState, useEffect, useMemo } from 'react';
import {
  Crown, Edit3, Plus, Check, X, ArrowRight, ArrowRightLeft, History,
  Users, Store, Shield, Sparkles, AlertCircle, RefreshCw, Trash2,
  Calendar, DollarSign, Layers, CheckCircle2, Clock, FileText, ChevronRight, Copy
} from 'lucide-react';
import { authFetch } from '../../lib/apiClient';
import { PlanWizardModal } from './PlanWizardModal';

type Props = {
  plans?: any[];
  currencySymbol?: string;
  user?: any;
  isSuperAdmin?: boolean;
  setEditingPlan?: (p: any) => void;
  setShowPlanModal?: (v: boolean) => void;
  handleApproveRequest?: (id: string, options?: any) => void;
  handleRejectRequest?: (id: string, options?: any) => void;
  saasRequests?: any[];
  visibleRequests?: any[];
};

export const AdminSubscriptionsTab: React.FC<Props> = ({
  plans: propPlans = [],
  currencySymbol = '৳',
  isSuperAdmin = true,
  handleApproveRequest,
  handleRejectRequest,
  saasRequests,
  visibleRequests,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'plans' | 'migrate' | 'history' | 'requests'>('plans');

  // Real backend state
  const [plans, setPlans] = useState<any[]>(propPlans);
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [migrations, setMigrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals & view state
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any | null>(null);
  const [subscribersModalPlan, setSubscribersModalPlan] = useState<any | null>(null);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<any | null>(null);
  const [approveModalRequest, setApproveModalRequest] = useState<any | null>(null);
  const [approveForm, setApproveForm] = useState<{
    markPaid: boolean;
    paymentMethod: string;
    paymentReference: string;
    note: string;
  }>({
    markPaid: true,
    paymentMethod: 'bKash Merchant',
    paymentReference: '',
    note: '',
  });
  const [rejectModalRequest, setRejectModalRequest] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  // Migration form state
  const [selectedBizId, setSelectedBizId] = useState<string>('');
  const [targetPlanId, setTargetPlanId] = useState<string>('');
  const [effectiveImmediately, setEffectiveImmediately] = useState<boolean>(true);
  const [adjustRenewalDate, setAdjustRenewalDate] = useState<boolean>(false);
  const [customRenewsAt, setCustomRenewsAt] = useState<string>('');
  const [billingAdjustment, setBillingAdjustment] = useState<number>(0);
  const [migrationReason, setMigrationReason] = useState<string>('');
  const [migrationConfirmOpen, setMigrationConfirmOpen] = useState(false);

  // Form state for Add/Edit Plan
  const [planForm, setPlanForm] = useState<{
    id: string;
    name: string;
    price: number;
    interval: string;
    description: string;
    limitStores: number;
    limitUsers: number;
    limitEmployees: number;
    limitStorageMb: number;
    trialDays: number;
    renewalGraceDays: number;
    status: 'active' | 'inactive';
    isPopular: boolean;
    features: string[];
    modules: string[];
  }>({
    id: '',
    name: '',
    price: 999,
    interval: 'month',
    description: '',
    limitStores: 1,
    limitUsers: 5,
    limitEmployees: 10,
    limitStorageMb: 1024,
    trialDays: 0,
    renewalGraceDays: 7,
    status: 'active',
    isPopular: false,
    features: ['Single store POS operations', 'Basic sales reports', 'Email support'],
    modules: ['pos', 'inventory', 'reports'],
  });

  const [featureInput, setFeatureInput] = useState('');

  const AVAILABLE_MODULES = [
    { id: 'pos', label: 'POS & Billing' },
    { id: 'inventory', label: 'Stock & Inventory' },
    { id: 'hrm', label: 'HR & Employees' },
    { id: 'accounting', label: 'Accounts & Ledgers' },
    { id: 'reports', label: 'Analytics & Reports' },
    { id: 'manufacturing', label: 'Manufacturing / MRP' },
    { id: 'ecommerce', label: 'E-commerce Storefront' },
    { id: 'multi_branch', label: 'Multi-Branch Sync' },
    { id: 'api', label: 'Custom API & Webhooks' },
  ];

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Fetch real plans, businesses, and migrations from backend
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [plansRes, bizRes, migRes] = await Promise.all([
        authFetch('/api/platform/plans').catch(() => null),
        authFetch('/api/admin/businesses').catch(() => null),
        authFetch('/api/admin/subscriptions/migrations').catch(() => null),
      ]);

      if (plansRes && plansRes.ok) {
        const body = await plansRes.json();
        if (Array.isArray(body?.plans)) {
          setPlans(body.plans);
        }
      }

      if (bizRes && bizRes.ok) {
        const body = await bizRes.json();
        if (Array.isArray(body?.businesses)) {
          setBusinesses(body.businesses);
        }
      }

      if (migRes && migRes.ok) {
        const body = await migRes.json();
        if (Array.isArray(body?.migrations)) {
          setMigrations(body.migrations);
        }
      }
    } catch (e) {
      console.error('Failed to load subscription data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedBusiness = useMemo(() => {
    return businesses.find((b) => b.id === selectedBizId) || null;
  }, [businesses, selectedBizId]);

  const selectedTargetPlan = useMemo(() => {
    return plans.find((p) => p.id === targetPlanId || p.name === targetPlanId) || null;
  }, [plans, targetPlanId]);

  // Map subscribers count per plan
  const subscriberCountByPlan = useMemo(() => {
    const map: Record<string, number> = {};
    businesses.forEach((b) => {
      const pName = (b.plan || b.subscription?.planId || 'Basic').toLowerCase().trim();
      map[pName] = (map[pName] || 0) + 1;
    });
    return map;
  }, [businesses]);

  // Open Edit Modal
  const openEditPlan = (plan: any) => {
    setEditingPlan(plan);
    setPlanForm({
      id: plan.id || '',
      name: plan.name || '',
      price: Number(plan.price) || 0,
      interval: plan.interval || 'month',
      description: plan.description || '',
      limitStores: Number(plan.limitStores ?? 1),
      limitUsers: Number(plan.limitUsers ?? 5),
      limitEmployees: Number(plan.limitEmployees ?? 10),
      limitStorageMb: Number(plan.limitStorageMb ?? 1024),
      trialDays: Number(plan.trialDays ?? 0),
      renewalGraceDays: Number(plan.renewalGraceDays ?? 7),
      status: plan.status === 'inactive' ? 'inactive' : 'active',
      isPopular: Boolean(plan.isPopular),
      features: Array.isArray(plan.features) ? [...plan.features] : [],
      modules: Array.isArray(plan.modules) ? [...plan.modules] : ['pos', 'inventory', 'reports'],
    });
    setPlanModalOpen(true);
  };

  const openAddPlan = () => {
    setEditingPlan(null);
    setPlanForm({
      id: '',
      name: '',
      price: 999,
      interval: 'month',
      description: '',
      limitStores: 1,
      limitUsers: 5,
      limitEmployees: 10,
      limitStorageMb: 1024,
      trialDays: 0,
      renewalGraceDays: 7,
      status: 'active',
      isPopular: false,
      features: ['Single store POS operations', 'Basic sales reports', 'Email support'],
      modules: ['pos', 'inventory', 'reports'],
    });
    setPlanModalOpen(true);
  };

  // Open Duplicate Plan
  const openDuplicatePlan = (plan: any) => {
    setEditingPlan(null); // Create as new
    setPlanForm({
      id: `${plan.id || plan.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-copy`,
      name: `Copy of ${plan.name}`,
      price: Number(plan.price) || 0,
      interval: plan.interval || 'month',
      description: plan.description || '',
      limitStores: Number(plan.limitStores ?? 1),
      limitUsers: Number(plan.limitUsers ?? 5),
      limitEmployees: Number(plan.limitEmployees ?? 10),
      limitStorageMb: Number(plan.limitStorageMb ?? 1024),
      trialDays: Number(plan.trialDays ?? 0),
      renewalGraceDays: Number(plan.renewalGraceDays ?? 7),
      status: 'draft',
      isPopular: false,
      features: Array.isArray(plan.features) ? [...plan.features] : [],
      modules: Array.isArray(plan.modules) ? [...plan.modules] : ['pos', 'inventory', 'reports'],
    } as any);
    setPlanModalOpen(true);
  };

  // Save Plan from Wizard
  const handleSavePlanFromWizard = async (payload: any) => {
    setActionLoading(true);
    try {
      let res: Response;
      if (editingPlan) {
        res = await authFetch(`/api/platform/plans/${editingPlan.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await authFetch('/api/platform/plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save plan');
      }

      const body = await res.json();
      if (Array.isArray(body?.plans)) {
        setPlans(body.plans);
      } else {
        await loadData();
      }

      setPlanModalOpen(false);
      showToast('success', editingPlan ? 'Plan updated successfully!' : 'New plan saved successfully!');
    } catch (error: any) {
      showToast('error', error.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Save Plan (Create or Update)
  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSavePlanFromWizard(planForm);
  };

  // Toggle active status
  const handleTogglePlanStatus = async (plan: any) => {
    const newStatus = plan.status === 'inactive' ? 'active' : 'inactive';
    try {
      const res = await authFetch(`/api/platform/plans/${plan.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setPlans((prev) =>
          prev.map((p) => (p.id === plan.id ? { ...p, status: newStatus } : p))
        );
        showToast('success', `Plan set to ${newStatus}`);
      }
    } catch {
      showToast('error', 'Failed to update plan status');
    }
  };

  // Delete plan (or safely archive if subscribers exist)
  const handleDeletePlan = async () => {
    if (!deleteConfirmPlan) return;
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/platform/plans/${deleteConfirmPlan.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete plan');
      }
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.plans)) {
        setPlans(data.plans);
      } else {
        setPlans((prev) => prev.filter((p) => p.id !== deleteConfirmPlan.id));
      }
      setDeleteConfirmPlan(null);
      showToast('success', data.message || 'Plan processed successfully.');
    } catch (error: any) {
      showToast('error', error.message || 'Could not delete plan');
    } finally {
      setActionLoading(false);
    }
  };

  // Execute Subscription Migration
  const handleExecuteMigration = async () => {
    if (!selectedBizId || !targetPlanId) {
      showToast('error', 'Please select both a business and a target plan.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await authFetch('/api/admin/subscriptions/migrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: selectedBizId,
          targetPlanId: selectedTargetPlan?.id || targetPlanId,
          targetPlanName: selectedTargetPlan?.name || targetPlanId,
          effectiveImmediately,
          billingAdjustment: Number(billingAdjustment) || 0,
          reason: migrationReason || `Migrated to ${selectedTargetPlan?.name || targetPlanId}`,
          adjustRenewalDate,
          customRenewsAt: customRenewsAt || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Migration failed');
      }

      const body = await res.json();
      showToast('success', body.message || 'Migration executed successfully!');
      setMigrationConfirmOpen(false);

      // Refresh state
      await loadData();
      setActiveSubTab('history');
      setMigrationReason('');
      setBillingAdjustment(0);
      setSelectedBizId('');
      setTargetPlanId('');
    } catch (error: any) {
      showToast('error', error.message || 'Failed to execute migration');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenApproveModal = (req: any) => {
    setApproveModalRequest(req);
    setApproveForm({
      markPaid: true,
      paymentMethod: req.paymentMethod || req.details?.paymentMethod || 'bKash Merchant',
      paymentReference: req.paymentReference || req.details?.paymentReference || '',
      note: req.note || `Approved upgrade to ${req.plan || req.requestedPlan || 'plan'}`,
    });
  };

  const executeApproval = async () => {
    if (!approveModalRequest) return;
    setActionLoading(true);
    try {
      if (handleApproveRequest) {
        await handleApproveRequest(approveModalRequest.id || approveModalRequest.userId, approveForm);
      } else {
        const res = await authFetch(`/api/plan-requests/${approveModalRequest.id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(approveForm),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to approve request');
        }
      }
      showToast('success', `Plan request approved for ${approveModalRequest.businessName || 'client'}`);
      setApproveModalRequest(null);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Approval failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenRejectModal = (req: any) => {
    setRejectModalRequest(req);
    setRejectReason('');
  };

  const executeRejection = async () => {
    if (!rejectModalRequest) return;
    setActionLoading(true);
    try {
      if (handleRejectRequest) {
        await handleRejectRequest(rejectModalRequest.id || rejectModalRequest.userId, { reason: rejectReason });
      } else {
        const res = await authFetch(`/api/plan-requests/${rejectModalRequest.id}/reject`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: rejectReason || 'Rejected by SaaS administrator' }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || 'Failed to reject request');
        }
      }
      showToast('error', `Plan request rejected for ${rejectModalRequest.businessName || 'client'}`);
      setRejectModalRequest(null);
      await loadData();
    } catch (err: any) {
      showToast('error', err.message || 'Rejection failed');
    } finally {
      setActionLoading(false);
    }
  };

  const requests = Array.isArray(visibleRequests)
    ? visibleRequests
    : Array.isArray(saasRequests)
      ? saasRequests
      : [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
      {/* Toast notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold flex items-center gap-2 animate-in slide-in-from-top-2 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Sub-Header Navigation */}
      <div className="bg-white/80 backdrop-blur-xl p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-black text-slate-800 text-lg flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-sm shadow-amber-500/20">
              <Crown className="w-5 h-5" />
            </div>
            Subscription & Migration Hub
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure real-time packages, execute client migrations, and monitor subscriptions.
          </p>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveSubTab('plans')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'plans'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Plans ({plans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('migrate')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'migrate'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Migrate Client
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'history'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            History ({migrations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('requests')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'requests'
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Requests ({requests.filter((r) => r.status === 'pending').length})
          </button>
          <button
            type="button"
            onClick={loadData}
            title="Refresh"
            disabled={isLoading}
            className="p-1.5 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-white"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 1. PLANS & PACKAGES TAB                                       */}
      {/* ============================================================== */}
      {activeSubTab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Configured Tiers · Syncs with Client Portal
            </p>
            {isSuperAdmin && (
              <button
                type="button"
                onClick={openAddPlan}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 active:scale-95 transition-transform"
              >
                <Plus className="w-4 h-4" /> Add Plan
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {plans.map((plan: any) => {
              const subCount = subscriberCountByPlan[(plan.name || '').toLowerCase()] || 0;
              const isInactive = plan.status === 'inactive';

              return (
                <div
                  key={plan.id || plan.name}
                  className={`relative rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                    plan.isPopular
                      ? 'ring-2 ring-indigo-500/80 border-indigo-200'
                      : 'border-slate-200/80'
                  } ${isInactive ? 'opacity-70 bg-slate-50/80' : ''}`}
                >
                  {plan.isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Popular
                    </div>
                  )}

                  <div>
                    {/* Header */}
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-black text-slate-800 text-base">{plan.name}</h3>
                          {plan.status === 'draft' ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Draft
                            </span>
                          ) : isInactive ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              Inactive
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {plan.description || `${plan.interval || 'month'} package`}
                        </p>
                      </div>

                      {isSuperAdmin && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openDuplicatePlan(plan)}
                            title="Duplicate plan"
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditPlan(plan)}
                            title="Edit plan"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmPlan(plan)}
                            title="Delete plan"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Price */}
                    <div className="mb-4">
                      <p className="text-2xl font-black text-slate-900 tracking-tight">
                        {currencySymbol}
                        {Number(plan.price || 0).toLocaleString()}
                        <span className="text-xs font-semibold text-slate-400 font-sans ml-1">
                          /{plan.interval || 'month'}
                        </span>
                      </p>
                      {plan.trialDays > 0 && (
                        <span className="inline-block mt-1 text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                          {plan.trialDays} Days Free Trial
                        </span>
                      )}
                    </div>

                    {/* Limits bar */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-4 font-medium text-slate-700">
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Stores</span>
                        {plan.limitStores ?? 1} branch(es)
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Staff Limit</span>
                        {plan.limitEmployees ?? 10} staff
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Users</span>
                        {plan.limitUsers ?? 5} user(s)
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Storage</span>
                        {plan.limitStorageMb ?? 1024} MB
                      </div>
                    </div>

                    {/* Modules pills */}
                    <div className="mb-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                        Included Modules
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(plan.modules || ['pos', 'inventory', 'reports']).map((m: string) => (
                          <span
                            key={m}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50/80 text-indigo-700 border border-indigo-100/80 uppercase"
                          >
                            {m.replace('_', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Feature list */}
                    <ul className="text-xs text-slate-600 space-y-1.5 mb-4">
                      {(Array.isArray(plan.features) ? plan.features : []).slice(0, 5).map((f: string, i: number) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="line-clamp-1">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Footer actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => setSubscribersModalPlan(plan)}
                      className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                    >
                      <Store className="w-3.5 h-3.5" />
                      {subCount} shop{subCount === 1 ? '' : 's'} subscribed
                    </button>

                    <button
                      type="button"
                      onClick={() => handleTogglePlanStatus(plan)}
                      className={`text-[11px] font-bold px-2 py-1 rounded-md transition-colors ${
                        isInactive
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {isInactive ? 'Activate' : 'Deactivate'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 2. SUBSCRIPTION MIGRATION TAB                                 */}
      {/* ============================================================== */}
      {activeSubTab === 'migrate' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
              Migrate Client Subscription Plan
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upgrade or downgrade a shop between tiers with real-time recalculation of feature limits, modules, and renewal schedules.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Form Controls */}
            <div className="space-y-4">
              {/* Select Business */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  1. Select Client Business *
                </label>
                <select
                  value={selectedBizId}
                  onChange={(e) => setSelectedBizId(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                >
                  <option value="">-- Choose a registered business --</option>
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name || b.businessName} (Current: {b.plan || 'Basic'}) · {b.ownerName || b.email}
                    </option>
                  ))}
                </select>
              </div>

              {/* Target Plan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Select Target Plan *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {plans.map((p) => {
                    const isSelected = targetPlanId === p.id || targetPlanId === p.name;
                    const isCurrent = selectedBusiness && (selectedBusiness.plan || '').toLowerCase() === (p.name || '').toLowerCase();

                    return (
                      <div
                        key={p.id}
                        onClick={() => setTargetPlanId(p.id)}
                        className={`cursor-pointer rounded-xl p-3 border text-left transition-all ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <p className="font-bold text-xs text-slate-900">{p.name}</p>
                          {isCurrent && (
                            <span className="text-[9px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-black text-indigo-600 mt-1">
                          {currencySymbol}{Number(p.price || 0).toLocaleString()}
                          <span className="text-[10px] text-slate-400 font-normal">/{p.interval || 'mo'}</span>
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-1">
                          {p.limitStores} stores · {p.limitEmployees} staff
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Effective Timing */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Effective Date & Timing
                </label>
                <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="effective"
                      checked={effectiveImmediately}
                      onChange={() => setEffectiveImmediately(true)}
                      className="text-indigo-600"
                    />
                    Apply Immediately
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="effective"
                      checked={!effectiveImmediately}
                      onChange={() => setEffectiveImmediately(false)}
                      className="text-indigo-600"
                    />
                    At Next Renewal Date
                  </label>
                </div>
              </div>

              {/* Renewal Date options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Reset Renewal Cycle
                  </label>
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={adjustRenewalDate}
                      onChange={(e) => setAdjustRenewalDate(e.target.checked)}
                      className="rounded text-indigo-600"
                    />
                    <span>Reset 30-day period from today</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Custom Renewal Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={customRenewsAt}
                    onChange={(e) => setCustomRenewsAt(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>

              {/* Billing Adjustment & Reason */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Billing Adjustment ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    value={billingAdjustment}
                    onChange={(e) => setBillingAdjustment(Number(e.target.value))}
                    placeholder="0"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Reason for Migration *
                  </label>
                  <input
                    type="text"
                    value={migrationReason}
                    onChange={(e) => setMigrationReason(e.target.value)}
                    placeholder="e.g. Branch expansion, payment adjustment"
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Right Column: Comparison & Confirmation Preview */}
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 mb-3 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-indigo-600" /> Migration Comparison Preview
                </h4>

                {selectedBusiness ? (
                  <div className="space-y-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                      <div className="flex justify-between font-bold text-slate-800">
                        <span>{selectedBusiness.name || selectedBusiness.businessName}</span>
                        <span className="text-indigo-600">ID: {selectedBusiness.id}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Owner: {selectedBusiness.ownerName || '—'} · Status: {selectedBusiness.subscriptionStatus || 'Active'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-200">
                        <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Current Tier</p>
                        <p className="font-black text-slate-800 text-sm">{selectedBusiness.plan || 'Basic'}</p>
                        <p className="text-indigo-600 font-bold mt-1">
                          {currencySymbol}{Number(selectedBusiness.monthlyFee || 0).toLocaleString()}/mo
                        </p>
                        <ul className="text-[11px] text-slate-500 mt-2 space-y-0.5">
                          <li>Stores: {selectedBusiness.branchLimit || 1}</li>
                          <li>Staff: {selectedBusiness.employeeLimit || 5}</li>
                          <li>Storage: {selectedBusiness.storageLimit || 1024} MB</li>
                        </ul>
                      </div>

                      <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200">
                        <p className="text-[10px] font-bold uppercase text-indigo-600 mb-1">Target Tier</p>
                        <p className="font-black text-indigo-900 text-sm">
                          {selectedTargetPlan?.name || 'Select target plan'}
                        </p>
                        <p className="text-indigo-700 font-bold mt-1">
                          {selectedTargetPlan
                            ? `${currencySymbol}${Number(selectedTargetPlan.price || 0).toLocaleString()}/${selectedTargetPlan.interval || 'mo'}`
                            : '—'}
                        </p>
                        {selectedTargetPlan && (
                          <ul className="text-[11px] text-indigo-800 mt-2 space-y-0.5">
                            <li>Stores: {selectedTargetPlan.limitStores}</li>
                            <li>Staff: {selectedTargetPlan.limitEmployees}</li>
                            <li>Storage: {selectedTargetPlan.limitStorageMb} MB</li>
                          </ul>
                        )}
                      </div>
                    </div>

                    {selectedTargetPlan && (
                      <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 text-xs flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Ready to apply</p>
                          <p className="text-[11px] text-emerald-700 mt-0.5">
                            Limits and modules will update immediately in the database. The client portal will reflect the new package without restart.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    Please select a business from the left to view comparison details.
                  </div>
                )}
              </div>

              <button
                type="button"
                disabled={!selectedBizId || !targetPlanId || actionLoading}
                onClick={() => setMigrationConfirmOpen(true)}
                className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm transition-all ${
                  !selectedBizId || !targetPlanId || actionLoading
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20 active:scale-98'
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
                Confirm & Migrate Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 3. MIGRATION HISTORY TAB                                      */}
      {/* ============================================================== */}
      {activeSubTab === 'history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-800 text-sm">Subscription Migration Audit History</h3>
              <p className="text-xs text-slate-400">Complete immutable record of all client plan migrations</p>
            </div>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
              {migrations.length} Migration(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Client / Business</th>
                  <th className="px-4 py-3">Migration</th>
                  <th className="px-4 py-3">Adjustment</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Administrator</th>
                  <th className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {migrations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                      No migration records on file yet.
                    </td>
                  </tr>
                ) : (
                  migrations.map((m: any) => (
                    <tr key={m.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : '—'}
                        <span className="block text-[10px] text-slate-400">
                          {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-800">
                        {m.businessName}
                        <span className="block text-[10px] text-slate-400 font-normal">ID: {m.businessId}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-1.5 font-bold">
                          <span className="text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {m.previousPlan}
                          </span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {m.newPlan}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">
                        {m.billingAdjustment > 0
                          ? `+${currencySymbol}${m.billingAdjustment.toLocaleString()}`
                          : `${currencySymbol}0`}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={m.reason}>
                        {m.reason || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {m.migratedBy || 'Admin'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <Check className="w-3 h-3" /> Completed
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4. PLAN REQUESTS TAB                                          */}
      {/* ============================================================== */}
      {activeSubTab === 'requests' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-black text-slate-800 text-sm">Client Plan Upgrade Requests</h3>
            <p className="text-xs text-slate-400">Incoming requests from shop owners in client portals</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Requested Plan</th>
                  <th className="px-4 py-3">Details / Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                      No upgrade requests found.
                    </td>
                  </tr>
                ) : (
                  requests.map((r: any) => {
                    const amt = Number(r.amount ?? r.price ?? r.details?.amount);
                    const planName = String(r.plan || r.requestedPlan || r.details?.plan || '').toLowerCase();
                    const isFree = amt === 0 || planName.includes('free') || planName.includes('trial');
                    const cycle = r.billingCycle || r.details?.billingCycle || 'monthly';
                    const curr = r.currency || r.details?.currency || (currencySymbol === '৳' ? 'BDT' : 'USD');
                    const sym = curr === 'BDT' ? '৳' : curr === 'USD' ? '$' : curr;
                    const hasValidPrice = !isNaN(amt) && amt > 0;

                    return (
                      <tr key={r.id || r.userId} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-bold text-slate-800">
                          <div>{r.businessName || r.userId || '—'}</div>
                          {r.userName && r.userName !== r.businessName && (
                            <div className="text-[10px] text-slate-400 font-normal">{r.userName}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-indigo-600">
                          <div className="flex items-center gap-1.5">
                            <span>{r.plan || r.requestedPlan || r.details?.plan || '—'}</span>
                            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700">
                              {cycle}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {hasValidPrice ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-xs">
                                {sym}{amt.toLocaleString()}{' '}
                                <span className="text-[11px] font-medium text-slate-400">/ {cycle}</span>
                              </span>
                              {(r.paymentMethod || r.paymentReference) && (
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  {r.paymentMethod || 'Direct'} {r.paymentReference ? `· Ref: ${r.paymentReference}` : ''}
                                </span>
                              )}
                            </div>
                          ) : isFree ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                              Free / Trial
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Missing Price Config
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span
                              className={`text-[10px] font-black uppercase px-2 py-0.5 rounded w-fit ${
                                r.status === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : r.status === 'rejected'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {r.status || 'pending'}
                            </span>
                            {r.paymentStatus && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                Payment: {r.paymentStatus}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {(r.status === 'pending' || !r.status) && (
                            <div className="inline-flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenApproveModal(r)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
                              >
                                <Check className="w-3.5 h-3.5" /> Verify & Approve
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(r)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1 border border-rose-200 transition-all"
                              >
                                <X className="w-3.5 h-3.5" /> Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 4-STEP WIZARD MODAL: ADD / EDIT / DUPLICATE PLAN               */}
      {/* ============================================================== */}
      <PlanWizardModal
        isOpen={planModalOpen}
        onClose={() => setPlanModalOpen(false)}
        editingPlan={editingPlan}
        onSave={handleSavePlanFromWizard}
        currencySymbol={currencySymbol}
        actionLoading={actionLoading}
      />

      {/* ============================================================== */}
      {/* MODAL: SUBSCRIBED CLIENTS DRAWER                              */}
      {/* ============================================================== */}
      {subscribersModalPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-slate-800 text-base">
                  Subscribed Clients · {subscribersModalPlan.name}
                </h3>
                <p className="text-xs text-slate-400">Businesses currently active on this subscription plan</p>
              </div>
              <button
                type="button"
                onClick={() => setSubscribersModalPlan(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {businesses.filter(
                (b) => (b.plan || '').toLowerCase() === (subscribersModalPlan.name || '').toLowerCase()
              ).length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8">
                  No businesses currently subscribed to this tier.
                </p>
              ) : (
                businesses
                  .filter(
                    (b) => (b.plan || '').toLowerCase() === (subscribersModalPlan.name || '').toLowerCase()
                  )
                  .map((b) => (
                    <div
                      key={b.id}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-800">{b.name || b.businessName}</p>
                        <p className="text-[11px] text-slate-500">
                          {b.ownerName || '—'} · {b.mobile || b.email}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          {b.subscriptionStatus || 'Active'}
                        </span>
                        {b.subscriptionRenewsAt && (
                          <span className="block text-[10px] text-slate-400 mt-0.5">
                            Renews: {new Date(b.subscriptionRenewsAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: CONFIRM MIGRATION                                      */}
      {/* ============================================================== */}
      {migrationConfirmOpen && selectedBusiness && selectedTargetPlan && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-slate-800">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
              <ArrowRightLeft className="w-6 h-6" />
            </div>

            <h3 className="font-black text-lg text-slate-900">Confirm Plan Migration</h3>
            <p className="text-xs text-slate-500 mt-1">
              You are about to migrate{' '}
              <span className="font-bold text-slate-800">{selectedBusiness.name || selectedBusiness.businessName}</span>{' '}
              from <span className="font-bold text-slate-800">{selectedBusiness.plan || 'Basic'}</span> to{' '}
              <span className="font-bold text-indigo-600">{selectedTargetPlan.name}</span>.
            </p>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 my-4 text-xs space-y-1">
              <p className="flex justify-between">
                <span className="text-slate-500">New Price:</span>
                <span className="font-bold">
                  {currencySymbol}{Number(selectedTargetPlan.price || 0).toLocaleString()}
                </span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Effective:</span>
                <span className="font-bold">{effectiveImmediately ? 'Immediate' : 'Next Cycle'}</span>
              </p>
              <p className="flex justify-between">
                <span className="text-slate-500">Adjustment:</span>
                <span className="font-bold">{currencySymbol}{billingAdjustment.toLocaleString()}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMigrationConfirmOpen(false)}
                className="flex-1 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleExecuteMigration}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20"
              >
                {actionLoading ? 'Migrating...' : 'Execute Migration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DELETE PLAN CONFIRMATION                               */}
      {/* ============================================================== */}
      {deleteConfirmPlan && (() => {
        const idKey = (deleteConfirmPlan.id || '').toLowerCase().trim();
        const nameKey = (deleteConfirmPlan.name || '').toLowerCase().trim();
        const activeSubscribers = (subscriberCountByPlan[idKey] || 0) + (idKey !== nameKey ? (subscriberCountByPlan[nameKey] || 0) : 0);
        const willArchive = activeSubscribers > 0;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <div className={`p-2.5 rounded-xl ${willArchive ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {willArchive ? 'Archive Subscription Plan' : 'Delete Subscription Plan'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Plan: <span className="font-bold text-slate-800">{deleteConfirmPlan.name}</span>
                  </p>
                </div>
              </div>

              {willArchive ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 my-3 text-xs text-amber-900 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                    Safe Archive Protection Active ({activeSubscribers} Subscriber{activeSubscribers > 1 ? 's' : ''})
                  </p>
                  <p className="text-amber-800/90 leading-relaxed">
                    This package currently has <strong>{activeSubscribers} active subscriber store(s)</strong>. To prevent breaking operational access and ongoing billing cycles, this plan will be <strong>safely archived</strong> and unpublished from public signups. Existing subscribers retain uninterrupted access.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-slate-600 leading-relaxed my-3">
                  This plan has <strong>0 active subscribers</strong>. Are you sure you want to permanently delete <span className="font-bold text-slate-800">{deleteConfirmPlan.name}</span>? This action will remove the plan from Bizora ERP.
                </p>
              )}

              <div className="flex justify-end gap-2 mt-5">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmPlan(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleDeletePlan}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-sm ${
                    willArchive
                      ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                      : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  }`}
                >
                  {actionLoading ? 'Processing...' : willArchive ? 'Safely Archive Plan' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ============================================================== */}
      {/* MODAL: VERIFY & APPROVE SUBSCRIPTION REQUEST                   */}
      {/* ============================================================== */}
      {approveModalRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Verify & Approve Subscription</h3>
                  <p className="text-[11px] text-slate-400">Review payment details and sync SaaS revenue</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setApproveModalRequest(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 mb-4">
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Business / Shop:</span>
                <span className="font-bold text-slate-900">
                  {approveModalRequest.businessName || approveModalRequest.userName || approveModalRequest.userId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-medium">Requested Plan:</span>
                <span className="font-bold text-indigo-600">
                  {approveModalRequest.plan || approveModalRequest.details?.plan} ({approveModalRequest.billingCycle || 'monthly'})
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Subscription Fee:</span>
                <span className="text-base font-black text-slate-900">
                  {approveModalRequest.currency === 'BDT' ? '৳' : approveModalRequest.currency === 'USD' ? '$' : (currencySymbol || '৳')}
                  {Number(approveModalRequest.amount || approveModalRequest.price || 0).toLocaleString()}
                </span>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeApproval();
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={approveForm.paymentMethod}
                  onChange={(e) => setApproveForm({ ...approveForm, paymentMethod: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="bKash Merchant">bKash Merchant / Direct</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Credit Card">Credit Card / Gateway</option>
                  <option value="Bank Transfer">Bank Transfer / Wire</option>
                  <option value="Cash / Manual">Cash / Offline Collection</option>
                  <option value="Free / Promo">Complimentary / Free Waiver</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Reference / TRX ID</label>
                <input
                  type="text"
                  placeholder="e.g. TRX-982348 or Bank Deposit Slip #"
                  value={approveForm.paymentReference}
                  onChange={(e) => setApproveForm({ ...approveForm, paymentReference: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Administrative Note</label>
                <input
                  type="text"
                  placeholder="Optional audit notes"
                  value={approveForm.note}
                  onChange={(e) => setApproveForm({ ...approveForm, note: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div className="flex items-center gap-2 pt-2 pb-1">
                <input
                  type="checkbox"
                  id="markPaid"
                  checked={approveForm.markPaid}
                  onChange={(e) => setApproveForm({ ...approveForm, markPaid: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                />
                <label htmlFor="markPaid" className="font-bold text-slate-800 select-none">
                  Mark as Paid & Record Revenue immediately
                </label>
              </div>

              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApproveModalRequest(null)}
                  className="flex-1 py-2.5 rounded-xl font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5"
                >
                  {actionLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Confirm & Activate Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: REJECT SUBSCRIPTION REQUEST                             */}
      {/* ============================================================== */}
      {rejectModalRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200 text-slate-800 animate-in fade-in zoom-in-95">
            <h3 className="font-black text-slate-900 text-base">Reject Subscription Request</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to decline the upgrade request for{' '}
              <span className="font-bold text-slate-800">
                {rejectModalRequest.businessName || rejectModalRequest.userName}
              </span>
              ?
            </p>

            <div className="mt-3">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Reason for Rejection</label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Invalid payment reference or expired invoice"
                className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium"
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setRejectModalRequest(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={executeRejection}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSubscriptionsTab;
