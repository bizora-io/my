import React, { useState } from 'react';
import { 
  Megaphone, Plus, Trash2, Power, Eye, X, ExternalLink, 
  Sparkles, ShieldAlert, Tag, Calendar, Users, Filter, CheckCircle2,
  Laptop, Smartphone, Layers, AlertTriangle, Info, Bell
} from 'lucide-react';

type Props = {
  annForm?: any;
  setAnnForm?: (v: any) => void;
  announcementList?: any[];
  setAnnouncementList?: (v: any[]) => void;
  createAnnouncement?: (payload?: any) => Promise<void> | void;
  toggleAnnouncement?: (id: string, active: boolean) => Promise<void> | void;
  deleteAnnouncement?: (id: string) => Promise<void> | void;
  showToast?: (msg: string, type?: string) => void;
  user?: any;
  plans?: any[];
  businesses?: any[];
  refreshAnnouncements?: () => void;
};

const IMAGE_PRESETS = [
  { label: 'Feature Launch', url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80' },
  { label: 'System Update', url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80' },
  { label: 'Special Promotion', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?auto=format&fit=crop&w=800&q=80' },
  { label: 'Maintenance Notice', url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80' },
];

export const AdminAnnouncementsTab: React.FC<Props> = ({
  annForm: formProp,
  setAnnForm,
  announcementList = [],
  createAnnouncement,
  toggleAnnouncement,
  deleteAnnouncement,
  showToast,
  user,
  plans = [],
  businesses = [],
  refreshAnnouncements,
}) => {
  // Local form state
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    type: 'info', // 'info' | 'update' | 'promotion' | 'warning' | 'maintenance'
    format: 'text', // 'text' | 'image'
    imageUrl: '',
    hasCta: false,
    ctaText: 'Learn More',
    ctaLink: '',
    audience: 'all', // 'all' | 'plans' | 'businesses' | 'admins'
    targetPlans: [] as string[],
    targetBusinesses: [] as string[],
    displayMode: 'both', // 'both' | 'popup_only' | 'notification_only'
    frequency: 'until_dismissed', // 'once_per_user' | 'once_per_session' | 'until_dismissed'
    startsAt: '',
    endsAt: '',
    active: true,
  });

  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewItem, setPreviewItem] = useState<any>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'popups'>('all');
  const [searchFilter, setSearchFilter] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const list = Array.isArray(announcementList) ? announcementList : [];

  // Plan list options (normalized)
  const availablePlans = plans && plans.length > 0 
    ? plans.map(p => ({ id: p.id || p.name?.toLowerCase(), name: p.name || p.id }))
    : [
        { id: 'free', name: 'Free Tier' },
        { id: 'starter', name: 'Starter' },
        { id: 'pro', name: 'Professional' },
        { id: 'enterprise', name: 'Enterprise' },
      ];

  const handleTogglePlan = (planId: string) => {
    setFormData(prev => {
      const exists = prev.targetPlans.includes(planId);
      return {
        ...prev,
        targetPlans: exists ? prev.targetPlans.filter(p => p !== planId) : [...prev.targetPlans, planId]
      };
    });
  };

  const handleCreate = async () => {
    const title = formData.title.trim();
    const body = formData.body.trim();
    if (!title || !body) {
      showToast?.('Announcement title and message are required', 'error');
      return;
    }

    if (formData.audience === 'plans' && formData.targetPlans.length === 0) {
      showToast?.('Please select at least one target plan', 'error');
      return;
    }

    const payload = {
      title,
      message: body,
      body,
      type: formData.type,
      format: formData.imageUrl ? 'both' : formData.format,
      imageUrl: formData.imageUrl.trim() || undefined,
      ctaText: formData.hasCta ? formData.ctaText.trim() : undefined,
      ctaLink: formData.hasCta ? formData.ctaLink.trim() : undefined,
      audience: formData.audience,
      targetPlans: formData.audience === 'plans' ? formData.targetPlans : [],
      targetBusinesses: formData.audience === 'businesses' ? formData.targetBusinesses : [],
      displayMode: formData.displayMode,
      frequency: formData.frequency,
      scope: formData.audience === 'businesses' && formData.targetBusinesses.length === 1 ? 'business' : 'global',
      businessId: formData.audience === 'businesses' && formData.targetBusinesses.length === 1 ? formData.targetBusinesses[0] : undefined,
      active: formData.active,
      startsAt: formData.startsAt ? new Date(formData.startsAt).toISOString() : undefined,
      endsAt: formData.endsAt ? new Date(formData.endsAt).toISOString() : undefined,
    };

    setIsSubmitting(true);
    try {
      if (createAnnouncement) {
        await Promise.resolve(createAnnouncement(payload));
      } else {
        const res = await fetch('/api/admin/announcements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('bizora_token') || ''}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create');
      }
      showToast?.('Announcement published successfully', 'success');
      // Reset form
      setFormData({
        title: '',
        body: '',
        type: 'info',
        format: 'text',
        imageUrl: '',
        hasCta: false,
        ctaText: 'Learn More',
        ctaLink: '',
        audience: 'all',
        targetPlans: [],
        targetBusinesses: [],
        displayMode: 'both',
        frequency: 'until_dismissed',
        startsAt: '',
        endsAt: '',
        active: true,
      });
      refreshAnnouncements?.();
    } catch {
      showToast?.('Failed to publish announcement', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPreview = (item?: any) => {
    if (item) {
      setPreviewItem(item);
    } else {
      setPreviewItem({
        title: formData.title || 'Sample Announcement Title',
        body: formData.body || 'This is how your announcement content will appear inside the interactive popup modal on the client and shop owner panel.',
        type: formData.type,
        format: formData.format,
        imageUrl: formData.imageUrl,
        ctaText: formData.hasCta ? formData.ctaText : undefined,
        ctaLink: formData.hasCta ? formData.ctaLink : undefined,
        audience: formData.audience,
        targetPlans: formData.targetPlans,
        displayMode: formData.displayMode,
        frequency: formData.frequency,
      });
    }
    setPreviewModalOpen(true);
  };

  const filteredList = list.filter(item => {
    if (statusFilter === 'active' && !item.active) return false;
    if (statusFilter === 'inactive' && item.active) return false;
    if (statusFilter === 'popups' && item.displayMode === 'notification_only') return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      const matchTitle = (item.title || '').toLowerCase().includes(q);
      const matchBody = (item.body || item.message || '').toLowerCase().includes(q);
      if (!matchTitle && !matchBody) return false;
    }
    return true;
  });

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'update':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'promotion':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'maintenance':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-sky-50 text-sky-700 border-sky-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in pb-12">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Megaphone className="w-4 h-4" />
              <span>Broadcast & Communications</span>
            </div>
            <h2 className="text-2xl font-black text-white">Centralized Announcement System</h2>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Broadcast modal popups and real-time notifications to shop owners and client panels with rich graphics, call-to-actions, and precision audience targeting.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => openPreview()}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/15 text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Live Popup</span>
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80 text-xs">
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold">Total Broadcasts</p>
            <p className="text-lg font-black text-white mt-0.5">{list.length}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold">Active Broadcasts</p>
            <p className="text-lg font-black text-emerald-400 mt-0.5">{list.filter(i => i.active).length}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold">Active Popups</p>
            <p className="text-lg font-black text-sky-400 mt-0.5">{list.filter(i => i.active && i.displayMode !== 'notification_only').length}</p>
          </div>
          <div>
            <p className="text-slate-400 text-[10px] uppercase font-bold">Targeted Plans</p>
            <p className="text-lg font-black text-indigo-400 mt-0.5">{availablePlans.length} Plans Available</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Creator Form Column */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 md:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <Plus className="w-4 h-4 text-indigo-600" />
                <span>Create New Announcement</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Configure appearance, audience targeting, and display rules</p>
            </div>
            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
              Interactive Modal
            </span>
          </div>

          {/* Title & Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Announcement Title *</label>
              <input
                type="text"
                placeholder="e.g. Introducing Automated Branch Sync!"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Badge / Category</label>
              <select
                value={formData.type}
                onChange={e => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-white"
              >
                <option value="info">Info / General</option>
                <option value="update">New Feature / Update</option>
                <option value="promotion">Special Promotion</option>
                <option value="warning">Important Notice</option>
                <option value="maintenance">Maintenance Alert</option>
              </select>
            </div>
          </div>

          {/* Announcement Message Body */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700">Announcement Message *</label>
              <span className="text-[10px] text-slate-400 font-mono">{formData.body.length} characters</span>
            </div>
            <textarea
              rows={4}
              placeholder="Describe your announcement or update in clear, friendly language..."
              value={formData.body}
              onChange={e => setFormData({ ...formData, body: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all leading-relaxed"
            />
          </div>

          {/* Banner Image Settings */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Rich Banner Image (Optional)</span>
              </label>
              {formData.imageUrl && (
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, imageUrl: '', format: 'text' })}
                  className="text-[10px] text-rose-600 hover:underline font-bold"
                >
                  Clear Image
                </button>
              )}
            </div>

            <input
              type="url"
              placeholder="https://example.com/banner-image.jpg"
              value={formData.imageUrl}
              onChange={e => setFormData({ ...formData, imageUrl: e.target.value, format: e.target.value ? 'both' : 'text' })}
              className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />

            {/* Image Presets */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Presets:</span>
              {IMAGE_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setFormData({ ...formData, imageUrl: preset.url, format: 'both' })}
                  className="text-[10px] font-bold px-2 py-1 rounded bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 text-slate-600 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {formData.imageUrl && (
              <div className="relative mt-2 rounded-lg overflow-hidden border border-slate-200 max-h-32 bg-slate-900">
                <img
                  src={formData.imageUrl}
                  alt="Preview"
                  className="w-full h-32 object-cover"
                  onError={() => showToast?.('Image failed to load, check URL', 'error')}
                />
                <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/60 text-white text-[9px] font-mono">
                  Banner Loaded
                </span>
              </div>
            )}
          </div>

          {/* Call-to-Action (CTA) Button Settings */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.hasCta}
                  onChange={e => setFormData({ ...formData, hasCta: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                />
                <span>Include Action / CTA Button</span>
              </label>
              {formData.hasCta && (
                <span className="text-[10px] text-indigo-600 font-extrabold uppercase">Button Active</span>
              )}
            </div>

            {formData.hasCta && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Button Label</label>
                  <input
                    type="text"
                    placeholder="e.g. Upgrade Plan Now"
                    value={formData.ctaText}
                    onChange={e => setFormData({ ...formData, ctaText: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Action Route / URL</label>
                  <input
                    type="text"
                    placeholder="/subscription or https://..."
                    value={formData.ctaLink}
                    onChange={e => setFormData({ ...formData, ctaLink: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-600" />
              <span>Target Audience</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'all', label: 'All Users', desc: 'Every registered shop' },
                { id: 'plans', label: 'By Plan Tier', desc: 'Targeted plan levels' },
                { id: 'businesses', label: 'Specific Shop', desc: 'Direct business ID' },
                { id: 'admins', label: 'Admins Only', desc: 'Internal SaaS staff' },
              ].map(aud => (
                <button
                  key={aud.id}
                  type="button"
                  onClick={() => setFormData({ ...formData, audience: aud.id })}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    formData.audience === aud.id
                      ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <p className={`text-xs font-bold ${formData.audience === aud.id ? 'text-indigo-900' : 'text-slate-800'}`}>
                    {aud.label}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{aud.desc}</p>
                </button>
              ))}
            </div>

            {/* Plan selector if audience === 'plans' */}
            {formData.audience === 'plans' && (
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 mt-2 space-y-2">
                <p className="text-[11px] font-bold text-indigo-900">Select which subscription plans see this announcement:</p>
                <div className="flex flex-wrap gap-2">
                  {availablePlans.map(p => {
                    const selected = formData.targetPlans.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleTogglePlan(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                          selected
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {selected ? '✓ ' : '+ '} {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Business selector if audience === 'businesses' */}
            {formData.audience === 'businesses' && (
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 mt-2 space-y-2">
                <label className="text-[11px] font-bold text-indigo-900">Select Target Business:</label>
                <select
                  value={formData.targetBusinesses[0] || ''}
                  onChange={e => setFormData({ ...formData, targetBusinesses: e.target.value ? [e.target.value] : [] })}
                  className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-slate-200 bg-white"
                >
                  <option value="">Select a registered business...</option>
                  {businesses.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name || b.businessName || b.email || b.id} ({b.plan || 'Free'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Delivery & Display Rules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-600" />
                <span>Display Delivery Mode</span>
              </label>
              <select
                value={formData.displayMode}
                onChange={e => setFormData({ ...formData, displayMode: e.target.value })}
                className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
              >
                <option value="both">Modal Popup + Notification Bell (Recommended)</option>
                <option value="popup_only">Modal Popup Only</option>
                <option value="notification_only">Notification Bell Only</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Frequency Control</span>
              </label>
              <select
                value={formData.frequency}
                onChange={e => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white"
              >
                <option value="until_dismissed">Show on every visit until dismissed</option>
                <option value="once_per_user">Show once per user permanently</option>
                <option value="once_per_session">Show once per browser session</option>
              </select>
            </div>
          </div>

          {/* Active status & Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={formData.active}
                onChange={e => setFormData({ ...formData, active: e.target.checked })}
                className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
              />
              <span className="text-xs font-bold text-slate-700">Activate immediately upon publish</span>
            </label>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => openPreview()}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span>Preview Popup</span>
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCreate}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-600/20 disabled:opacity-50"
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Publishing...' : 'Publish Announcement'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Existing Announcements List Column */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col max-h-[880px]">
          <div className="p-4 border-b border-slate-100 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-indigo-600" />
                <span>Broadcast History ({filteredList.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => refreshAnnouncements?.()}
                className="text-[10px] font-bold text-indigo-600 hover:underline"
              >
                Refresh
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-bold">
              {[
                { id: 'all', label: 'All' },
                { id: 'active', label: 'Active' },
                { id: 'inactive', label: 'Inactive' },
                { id: 'popups', label: 'Popups' },
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id as any)}
                  className={`px-2.5 py-1 rounded-lg transition-all shrink-0 ${
                    statusFilter === f.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Search filter */}
            <input
              type="text"
              placeholder="Search announcements..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
            {filteredList.length === 0 ? (
              <div className="p-10 text-center text-slate-400">
                <Megaphone className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs font-bold text-slate-600">No announcements match filter</p>
                <p className="text-[10px] text-slate-400 mt-1">Create an announcement to reach your shop users</p>
              </div>
            ) : (
              filteredList.map(a => (
                <div key={a.id} className="p-3 hover:bg-slate-50/80 rounded-xl transition-all space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${getTypeBadgeStyle(a.type)}`}>
                          {a.type || 'info'}
                        </span>
                        {a.displayMode && a.displayMode !== 'notification_only' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                            Popup
                          </span>
                        )}
                        <span className="text-[9px] font-mono text-slate-400">
                          {a.audience ? `Audience: ${a.audience}` : a.scope || 'global'}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{a.title}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {a.body || a.message}
                      </p>
                    </div>

                    {/* Status Pill */}
                    <button
                      type="button"
                      onClick={() => toggleAnnouncement?.(a.id, !a.active)}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg border transition-all shrink-0 flex items-center gap-1 ${
                        a.active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={a.active ? 'Click to deactivate' : 'Click to activate'}
                    >
                      <Power className="w-2.5 h-2.5" />
                      <span>{a.active ? 'Active' : 'Draft'}</span>
                    </button>
                  </div>

                  {/* Image thumbnail if any */}
                  {a.imageUrl && (
                    <div className="h-16 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                      <img src={a.imageUrl} alt="" className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Actions & Metadata */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span>
                      {a.createdAt ? new Date(a.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent'}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openPreview(a)}
                        className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 px-2 py-0.5 rounded hover:bg-indigo-50"
                      >
                        <Eye className="w-2.5 h-2.5" /> Preview
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Delete this announcement permanently?')) {
                            deleteAnnouncement?.(a.id);
                          }
                        }}
                        className="text-rose-600 hover:text-rose-800 font-bold flex items-center gap-0.5 px-2 py-0.5 rounded hover:bg-rose-50"
                      >
                        <Trash2 className="w-2.5 h-2.5" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- LIVE PREVIEW MODAL --- */}
      {previewModalOpen && previewItem && (
        <div className="fixed inset-0 z-[999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            {/* Top Modal Controls bar */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold tracking-tight">Client Panel Popup Preview</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('desktop')}
                    className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                      previewDevice === 'desktop' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Laptop className="w-3 h-3" /> Desktop
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewDevice('mobile')}
                    className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${
                      previewDevice === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-3 h-3" /> Mobile
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Popup Rendering Container */}
            <div className="p-6 overflow-y-auto bg-slate-100 flex items-center justify-center min-h-[360px]">
              <div
                className={`bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden transition-all duration-300 ${
                  previewDevice === 'mobile' ? 'w-[320px]' : 'w-full max-w-md'
                }`}
              >
                {/* Header Banner Image */}
                {previewItem.imageUrl && (
                  <div className="relative h-44 w-full bg-slate-900 overflow-hidden">
                    <img
                      src={previewItem.imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  </div>
                )}

                {/* Content */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded border tracking-wider ${getTypeBadgeStyle(previewItem.type)}`}>
                      {previewItem.type || 'Announcement'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">Bizora Broadcast</span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {previewItem.title || 'Announcement Title'}
                  </h3>

                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                    {previewItem.body || previewItem.message || 'Announcement message text appears here.'}
                  </p>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-col gap-2">
                    {previewItem.ctaText && (
                      <button
                        type="button"
                        onClick={() => showToast?.(`Action clicked: ${previewItem.ctaLink || '/'}`)}
                        className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
                      >
                        <span>{previewItem.ctaText}</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setPreviewModalOpen(false)}
                      className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                    >
                      Dismiss / Got it
                    </button>
                  </div>
                </div>

                {/* Frequency Footer */}
                <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Frequency: {previewItem.frequency || 'until_dismissed'}</span>
                  <span>Target: {previewItem.audience || 'all'}</span>
                </div>
              </div>
            </div>

            {/* Modal Bottom note */}
            <div className="px-5 py-3 bg-white border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Dismissals will be saved per user/session
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminAnnouncementsTab;
