import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText, Plus, Trash2, Edit3, Image as ImageIcon, Copy,
  Check, X, Eye, DollarSign, Search, Filter, Sparkles, CheckCircle2,
  AlertCircle, RefreshCw, Printer, ShieldCheck, QrCode
} from 'lucide-react';
import { authFetch } from '../../lib/apiClient';

type Props = {
  handleAddTemplate?: any;
  handleDeleteTemplate?: any;
  templates?: any[];
  user?: any;
  currencySymbol?: string;
};

export const AdminTemplatesTab: React.FC<Props> = ({
  currencySymbol = '৳',
}) => {
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterLayout, setFilterLayout] = useState<string>('all');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals state
  const [editorModalOpen, setEditorModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any | null>(null);
  const [previewModalTemplate, setPreviewModalTemplate] = useState<any | null>(null);
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<any | null>(null);

  // Form State
  const [formState, setFormState] = useState<{
    name: string;
    description: string;
    layout: 'classic' | 'modern' | 'dark' | 'creative' | 'formal' | 'minimal';
    price: number;
    status: 'active' | 'inactive';
    availability: 'all' | 'subscription' | 'paid';
    requiredPlan: 'all' | 'basic' | 'pro' | 'enterprise';
    config: {
      primaryColor: string;
      accentColor: string;
      fontFamily: 'sans' | 'serif' | 'mono';
      paperSize: 'A4' | 'A5' | 'Letter' | '80mm' | '58mm';
      showLogo: boolean;
      showWatermark: boolean;
      showQrCode: boolean;
      showTerms: boolean;
      termsText: string;
      footerNote: string;
    };
  }>({
    name: '',
    description: '',
    layout: 'modern',
    price: 999,
    status: 'active',
    availability: 'subscription',
    requiredPlan: 'pro',
    config: {
      primaryColor: '#4f46e5',
      accentColor: '#818cf8',
      fontFamily: 'sans',
      paperSize: 'A4',
      showLogo: true,
      showWatermark: false,
      showQrCode: true,
      showTerms: true,
      termsText: 'Thank you for your business. Returns accepted within 7 days with original invoice.',
      footerNote: 'Powered by Bizora ERP',
    },
  });

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Load real templates from backend
  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/invoice-templates/admin/all');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data?.templates)) {
          setTemplates(data.templates);
        }
      }
    } catch (e) {
      console.error('Failed to load templates:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesSearch =
        !searchQuery ||
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tpl.description || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && tpl.status === 'active') ||
        (filterStatus === 'inactive' && tpl.status === 'inactive') ||
        (filterStatus === 'free' && Number(tpl.price) === 0) ||
        (filterStatus === 'paid' && Number(tpl.price) > 0);

      const matchesLayout =
        filterLayout === 'all' || tpl.layout === filterLayout;

      return matchesSearch && matchesStatus && matchesLayout;
    });
  }, [templates, searchQuery, filterStatus, filterLayout]);

  const openAddModal = () => {
    setEditingTemplate(null);
    setFormState({
      name: '',
      description: '',
      layout: 'modern',
      price: 999,
      status: 'active',
      availability: 'subscription',
      requiredPlan: 'pro',
      config: {
        primaryColor: '#4f46e5',
        accentColor: '#818cf8',
        fontFamily: 'sans',
        paperSize: 'A4',
        showLogo: true,
        showWatermark: false,
        showQrCode: true,
        showTerms: true,
        termsText: 'Thank you for your business. Returns accepted within 7 days with original invoice.',
        footerNote: 'Powered by Bizora ERP',
      },
    });
    setEditorModalOpen(true);
  };

  const openEditModal = (tpl: any) => {
    setEditingTemplate(tpl);
    setFormState({
      name: tpl.name || '',
      description: tpl.description || '',
      layout: tpl.layout || 'modern',
      price: Number(tpl.price) || 0,
      status: tpl.status === 'inactive' ? 'inactive' : 'active',
      availability: tpl.availability || 'subscription',
      requiredPlan: tpl.requiredPlan || 'pro',
      config: {
        primaryColor: tpl.config?.primaryColor || '#4f46e5',
        accentColor: tpl.config?.accentColor || '#818cf8',
        fontFamily: tpl.config?.fontFamily || 'sans',
        paperSize: tpl.config?.paperSize || 'A4',
        showLogo: tpl.config?.showLogo ?? true,
        showWatermark: tpl.config?.showWatermark ?? false,
        showQrCode: tpl.config?.showQrCode ?? true,
        showTerms: tpl.config?.showTerms ?? true,
        termsText: tpl.config?.termsText || 'Thank you for your business.',
        footerNote: tpl.config?.footerNote || 'Powered by Bizora ERP',
      },
    });
    setEditorModalOpen(true);
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.name.trim()) {
      showToast('error', 'Template name is required.');
      return;
    }

    setActionLoading(true);
    try {
      let res: Response;
      if (editingTemplate) {
        res = await authFetch(`/api/invoice-templates/${editingTemplate.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formState),
        });
      } else {
        res = await authFetch('/api/invoice-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formState),
        });
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save template');
      }

      showToast('success', editingTemplate ? 'Template updated successfully!' : 'New template created!');
      setEditorModalOpen(false);
      await loadTemplates();
    } catch (error: any) {
      showToast('error', error.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const res = await authFetch(`/api/invoice-templates/${id}/duplicate`, {
        method: 'POST',
      });
      if (res.ok) {
        showToast('success', 'Template duplicated successfully!');
        await loadTemplates();
      }
    } catch {
      showToast('error', 'Failed to duplicate template');
    }
  };

  const handleToggleStatus = async (tpl: any) => {
    const newStatus = tpl.status === 'active' ? 'inactive' : 'active';
    try {
      const res = await authFetch(`/api/invoice-templates/${tpl.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setTemplates((prev) =>
          prev.map((t) => (t.id === tpl.id ? { ...t, status: newStatus } : t))
        );
        showToast('success', `Template set to ${newStatus}`);
      }
    } catch {
      showToast('error', 'Failed to change status');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmTemplate) return;
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/invoice-templates/${deleteConfirmTemplate.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete template');
      }
      showToast('success', 'Template deleted successfully.');
      setDeleteConfirmTemplate(null);
      await loadTemplates();
    } catch (error: any) {
      showToast('error', error.message || 'Could not delete template');
    } finally {
      setActionLoading(false);
    }
  };

  // Thumbnail preview component
  const TemplateThumbnail = ({ tpl }: { tpl: any }) => {
    const primary = tpl.config?.primaryColor || '#4f46e5';
    const accent = tpl.config?.accentColor || '#818cf8';
    const layout = tpl.layout || 'modern';

    return (
      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 bg-white p-2.5 flex flex-col justify-between shadow-inner relative group-hover:border-indigo-300 transition-colors">
        {/* Mock Header */}
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="w-8 h-2 rounded-sm" style={{ backgroundColor: primary }}></div>
            <div className="w-12 h-1 bg-slate-200 rounded-sm"></div>
          </div>
          <div className="w-6 h-2 rounded-sm bg-slate-100"></div>
        </div>

        {/* Mock Lines */}
        <div className="space-y-1 my-1">
          <div
            className="w-full h-1.5 rounded-sm"
            style={{ backgroundColor: layout === 'dark' ? '#0f172a' : `${primary}20` }}
          ></div>
          <div className="w-3/4 h-1 bg-slate-100 rounded-sm"></div>
          <div className="w-5/6 h-1 bg-slate-100 rounded-sm"></div>
        </div>

        {/* Mock Footer / Totals */}
        <div className="flex justify-between items-end pt-1 border-t border-slate-100 text-[8px]">
          <div className="w-6 h-1 bg-slate-200 rounded-sm"></div>
          <div className="w-10 h-2 rounded-sm" style={{ backgroundColor: accent }}></div>
        </div>
      </div>
    );
  };

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

      {/* Header Bar */}
      <div className="bg-white/80 backdrop-blur-xl p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-black text-slate-800 text-lg flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white shadow-sm shadow-indigo-600/20">
              <FileText className="w-5 h-5" />
            </div>
            Invoice Template Studio
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Design, publish, price, and distribute responsive invoice & receipt templates to client shops.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            type="button"
            onClick={loadTemplates}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl border border-slate-200/80"
            title="Refresh templates"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm shadow-indigo-600/20 active:scale-95 transition-transform shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Template
          </button>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700"
          >
            <option value="all">All Status & Types</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive</option>
            <option value="free">Free Templates</option>
            <option value="paid">Paid Templates</option>
          </select>

          <select
            value={filterLayout}
            onChange={(e) => setFilterLayout(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-700"
          >
            <option value="all">All Layouts</option>
            <option value="classic">Classic</option>
            <option value="modern">Modern</option>
            <option value="dark">Dark</option>
            <option value="creative">Creative</option>
            <option value="formal">Formal</option>
            <option value="minimal">Minimal POS</option>
          </select>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredTemplates.length === 0 ? (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-slate-200">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-700 text-sm">No templates matched</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or add a new template above.</p>
          </div>
        ) : (
          filteredTemplates.map((tpl) => {
            const isInactive = tpl.status === 'inactive';
            const isFree = Number(tpl.price) === 0;

            return (
              <div
                key={tpl.id}
                className={`bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
                  isInactive ? 'opacity-70 border-slate-200 bg-slate-50/50' : 'border-slate-200/90'
                }`}
              >
                <div>
                  {/* Thumbnail */}
                  <div className="relative mb-3">
                    <TemplateThumbnail tpl={tpl} />
                    <span
                      className={`absolute top-2 right-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full shadow-sm ${
                        isFree
                          ? 'bg-emerald-500 text-white'
                          : 'bg-indigo-600 text-white'
                      }`}
                    >
                      {isFree ? 'Free' : `${currencySymbol}${Number(tpl.price).toLocaleString()}`}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="font-black text-slate-800 text-sm">{tpl.name}</h3>
                      <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {tpl.description || 'Custom print template'}
                      </p>
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      {tpl.layout}
                    </span>
                  </div>

                  {/* Metadata & Purchases */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2 rounded-xl my-3 text-slate-600 font-medium">
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Access</span>
                      {tpl.availability === 'all'
                        ? 'All Shops'
                        : tpl.availability === 'subscription'
                        ? `Included in ${tpl.requiredPlan}+`
                        : 'Paid Purchase'}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Paper Size</span>
                      {tpl.config?.paperSize || 'A4'}
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Purchases</span>
                      {tpl.totalPurchases || 0} shop(s)
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Revenue</span>
                      {currencySymbol}{Number(tpl.totalRevenue || 0).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewModalTemplate(tpl)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-bold flex items-center gap-1"
                      title="Preview Template"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicate(tpl.id)}
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Duplicate Template"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(tpl)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${
                        isInactive
                          ? 'text-emerald-700 hover:bg-emerald-50'
                          : 'text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {isInactive ? 'Activate' : 'Deactivate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditModal(tpl)}
                      className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    {tpl.id !== 'tpl-01' && (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmTemplate(tpl)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: ADD / EDIT TEMPLATE                                     */}
      {/* ============================================================== */}
      {editorModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 my-8">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-5">
              <div>
                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  {editingTemplate ? 'Edit Invoice Template' : 'Create New Invoice Template'}
                </h3>
                <p className="text-xs text-slate-400">Configure visual layout, branding colors, typography and pricing</p>
              </div>
              <button
                type="button"
                onClick={() => setEditorModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTemplate} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Cols: Form Fields */}
              <div className="lg:col-span-2 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Template Name *</label>
                    <input
                      type="text"
                      required
                      value={formState.name}
                      onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                      placeholder="e.g. Modern Boutique Indigo"
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Price ({currencySymbol})</label>
                    <input
                      type="number"
                      value={formState.price}
                      onChange={(e) => setFormState({ ...formState, price: Number(e.target.value) })}
                      placeholder="0 for Free"
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <input
                    type="text"
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    placeholder="Short description for client preview..."
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                {/* Layout Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Layout Style</label>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {(['classic', 'modern', 'dark', 'creative', 'formal', 'minimal'] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setFormState({ ...formState, layout: l })}
                        className={`p-2 rounded-xl border text-xs font-bold capitalize transition-all ${
                          formState.layout === l
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Pricing & Entitlement */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Availability</label>
                    <select
                      value={formState.availability}
                      onChange={(e: any) => setFormState({ ...formState, availability: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                    >
                      <option value="all">Free For All</option>
                      <option value="subscription">Included in Subscription</option>
                      <option value="paid">Paid Purchase Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Required Tier</label>
                    <select
                      value={formState.requiredPlan}
                      onChange={(e: any) => setFormState({ ...formState, requiredPlan: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                    >
                      <option value="all">Any Plan</option>
                      <option value="basic">Basic+</option>
                      <option value="pro">Pro+</option>
                      <option value="enterprise">Enterprise Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Paper Size</label>
                    <select
                      value={formState.config.paperSize}
                      onChange={(e: any) =>
                        setFormState({
                          ...formState,
                          config: { ...formState.config, paperSize: e.target.value },
                        })
                      }
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                    >
                      <option value="A4">A4 Standard</option>
                      <option value="A5">A5 Half</option>
                      <option value="Letter">US Letter</option>
                      <option value="80mm">80mm Thermal</option>
                      <option value="58mm">58mm Thermal</option>
                    </select>
                  </div>
                </div>

                {/* Colors & Typography */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formState.config.primaryColor}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            config: { ...formState.config, primaryColor: e.target.value },
                          })
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                      />
                      <input
                        type="text"
                        value={formState.config.primaryColor}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            config: { ...formState.config, primaryColor: e.target.value },
                          })
                        }
                        className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formState.config.accentColor}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            config: { ...formState.config, accentColor: e.target.value },
                          })
                        }
                        className="w-8 h-8 rounded-lg cursor-pointer border border-slate-300 p-0.5"
                      />
                      <input
                        type="text"
                        value={formState.config.accentColor}
                        onChange={(e) =>
                          setFormState({
                            ...formState,
                            config: { ...formState.config, accentColor: e.target.value },
                          })
                        }
                        className="flex-1 text-xs bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Typography</label>
                    <select
                      value={formState.config.fontFamily}
                      onChange={(e: any) =>
                        setFormState({
                          ...formState,
                          config: { ...formState.config, fontFamily: e.target.value },
                        })
                      }
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                    >
                      <option value="sans">Clean Sans-Serif</option>
                      <option value="serif">Formal Serif</option>
                      <option value="mono">Receipt Monospace</option>
                    </select>
                  </div>
                </div>

                {/* Branding Toggles */}
                <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.config.showLogo}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          config: { ...formState.config, showLogo: e.target.checked },
                        })
                      }
                      className="rounded text-indigo-600"
                    />
                    <span>Show Shop Logo</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.config.showQrCode}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          config: { ...formState.config, showQrCode: e.target.checked },
                        })
                      }
                      className="rounded text-indigo-600"
                    />
                    <span>Show QR Code</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formState.config.showTerms}
                      onChange={(e) =>
                        setFormState({
                          ...formState,
                          config: { ...formState.config, showTerms: e.target.checked },
                        })
                      }
                      className="rounded text-indigo-600"
                    />
                    <span>Show Terms & Notes</span>
                  </label>
                </div>
              </div>

              {/* Right Col: Live Preview Box */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 flex flex-col justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" /> Live Render Preview
                  </p>

                  <div
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm text-[11px] space-y-3"
                    style={{
                      fontFamily:
                        formState.config.fontFamily === 'serif'
                          ? 'serif'
                          : formState.config.fontFamily === 'mono'
                          ? 'monospace'
                          : 'sans-serif',
                    }}
                  >
                    {/* Header */}
                    <div
                      className="p-3 rounded-lg flex justify-between items-center text-white"
                      style={{ backgroundColor: formState.config.primaryColor }}
                    >
                      <div>
                        <p className="font-bold text-xs">{formState.name || 'Sample Invoice'}</p>
                        <p className="text-[9px] opacity-80">Invoice #INV-2026-001</p>
                      </div>
                      <div className="text-right text-[9px] opacity-90">
                        <p>Date: 2026-10-16</p>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="border border-slate-100 rounded-lg overflow-hidden">
                      <div className="bg-slate-50 px-2 py-1 font-bold text-[9px] text-slate-500 flex justify-between">
                        <span>Item</span>
                        <span>Qty</span>
                        <span>Total</span>
                      </div>
                      <div className="px-2 py-1 flex justify-between border-t border-slate-50 text-[10px]">
                        <span>Sample Retail Product</span>
                        <span>1</span>
                        <span>{currencySymbol}1,500</span>
                      </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-between items-end pt-2 border-t border-slate-100 font-bold">
                      <span className="text-slate-500 text-[10px]">Grand Total</span>
                      <span className="text-sm" style={{ color: formState.config.accentColor }}>
                        {currencySymbol}1,500
                      </span>
                    </div>

                    {formState.config.showTerms && (
                      <p className="text-[9px] text-slate-400 pt-1 border-t border-slate-100">
                        {formState.config.termsText || 'Terms apply.'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditorModalOpen(false)}
                    className="flex-1 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200/60 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20"
                  >
                    {actionLoading ? 'Saving...' : editingTemplate ? 'Update' : 'Publish'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: PREVIEW INVOICE                                         */}
      {/* ============================================================== */}
      {previewModalTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
              <div>
                <h3 className="font-black text-slate-800 text-base">{previewModalTemplate.name}</h3>
                <p className="text-xs text-slate-400">Layout: {previewModalTemplate.layout} · {previewModalTemplate.config?.paperSize || 'A4'}</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModalTemplate(null)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
              <div
                className="p-4 rounded-xl text-white flex justify-between items-center"
                style={{ backgroundColor: previewModalTemplate.config?.primaryColor || '#4f46e5' }}
              >
                <div>
                  <h4 className="font-bold text-sm">Bizora Demo Shop</h4>
                  <p className="text-[10px] opacity-80">Invoice #INV-2026-9901</p>
                </div>
                <div className="text-right text-[10px] opacity-90">
                  <p>Customer: Md Rafiqul</p>
                  <p>Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1">
                <div className="flex justify-between text-slate-400 text-[10px] font-bold uppercase pb-1 border-b">
                  <span>Description</span>
                  <span>Price</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Premium Cotton Polo Shirt</span>
                  <span>{currencySymbol}1,200</span>
                </div>
                <div className="flex justify-between py-1">
                  <span>Casual Denim Pants</span>
                  <span>{currencySymbol}2,400</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-3 flex justify-between items-center font-bold">
                <span className="text-slate-600">Total Paid</span>
                <span className="text-base text-indigo-600">{currencySymbol}3,600</span>
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="button"
                onClick={() => setPreviewModalTemplate(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL: DELETE CONFIRMATION                                     */}
      {/* ============================================================== */}
      {deleteConfirmTemplate && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-black text-slate-900 text-base">Delete Template</h3>
            <p className="text-xs text-slate-500 mt-1">
              Are you sure you want to delete <span className="font-bold text-slate-800">{deleteConfirmTemplate.name}</span>? Shops currently using it will fall back to the default classic layout.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setDeleteConfirmTemplate(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleDelete}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                {actionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTemplatesTab;
