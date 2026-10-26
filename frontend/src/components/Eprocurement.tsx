import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Briefcase, Plus, RefreshCw, CheckCircle2, Trophy, Clock, Send, ShoppingCart } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface Bid {
  id: string;
  supplierId?: string;
  supplierName: string;
  bidAmount: number;
  deliveryDays: number;
  notes?: string;
  submittedAt: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'REJECTED';
}

interface RFQItem {
  productName: string;
  quantity: number;
  unit?: string;
  targetPrice?: number;
}

interface RFQRecord {
  id: string;
  title: string;
  description?: string;
  category: string;
  deadline: string;
  status: 'DRAFT' | 'PUBLISHED' | 'AWARDED' | 'CANCELLED';
  items: RFQItem[];
  bids: Bid[];
  awardedBidId?: string;
  awardedSupplierName?: string;
  awardedAmount?: number;
  purchaseOrderId?: string;
  createdAt: string;
}

export const Eprocurement: React.FC = () => {
  const { t, formatCurrency } = useSettings();
  const [rfqs, setRfqs] = useState<RFQRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRfq, setSelectedRfq] = useState<RFQRecord | null>(null);

  // Create form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Raw Materials');
  const [deadline, setDeadline] = useState('');
  const [items, setItems] = useState<RFQItem[]>([{ productName: '', quantity: 1, unit: 'pcs' }]);

  // Add Bid form
  const [bidSupplier, setBidSupplier] = useState('');
  const [bidAmount, setBidAmount] = useState<number>(0);
  const [bidDays, setBidDays] = useState<number>(7);
  const [bidNotes, setBidNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/eprocurement');
      if (res.ok) setRfqs(await res.json());
    } catch (e) {
      console.warn('Failed to load RFQs', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddItem = () => {
    setItems([...items, { productName: '', quantity: 1, unit: 'pcs' }]);
  };

  const handleUpdateItem = (index: number, field: keyof RFQItem, val: any) => {
    const next = [...items];
    (next[index] as any)[field] = val;
    setItems(next);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    try {
      const res = await authFetch('/api/eprocurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          deadline,
          items: items.filter((i) => i.productName.trim()),
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setTitle('');
        setItems([{ productName: '', quantity: 1, unit: 'pcs' }]);
        loadData();
      }
    } catch (e) {
      console.warn('Create RFQ failed', e);
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const res = await authFetch(`/api/eprocurement/${id}/publish`, { method: 'POST' });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Publish RFQ failed', e);
    }
  };

  const handleAddBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRfq || !bidSupplier || bidAmount <= 0) return;
    try {
      const res = await authFetch(`/api/eprocurement/${selectedRfq.id}/bids`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierName: bidSupplier,
          bidAmount,
          deliveryDays: bidDays,
          notes: bidNotes,
        }),
      });
      if (res.ok) {
        setBidSupplier('');
        setBidAmount(0);
        const updated = await res.json();
        setSelectedRfq(updated);
        loadData();
      }
    } catch (e) {
      console.warn('Submit bid failed', e);
    }
  };

  const handleAward = async (bidId: string) => {
    if (!selectedRfq) return;
    if (!confirm(t('Award this tender to this bid? A formal Purchase Order will be created.'))) return;
    try {
      const res = await authFetch(`/api/eprocurement/${selectedRfq.id}/award`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bidId, createPurchaseOrder: true }),
      });
      if (res.ok) {
        setSelectedRfq(null);
        loadData();
      }
    } catch (e) {
      console.warn('Award RFQ failed', e);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Briefcase className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            {t('E-Procurement & Tender System')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Create Request for Quotations (RFQs), compare vendor bids, and auto-award into Purchase Orders.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('Create RFQ')}
          </button>
        </div>
      </div>

      {/* Grid of RFQs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rfqs.map((rfq) => (
          <div
            key={rfq.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {rfq.category}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    rfq.status === 'AWARDED'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : rfq.status === 'PUBLISHED'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                  }`}
                >
                  {rfq.status}
                </span>
              </div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">
                {rfq.title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Deadline: {rfq.deadline ? new Date(rfq.deadline).toLocaleDateString() : 'N/A'}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs space-y-1">
                <div className="text-slate-600 dark:text-slate-300 font-medium">
                  {rfq.items?.length || 0} items requested
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  {rfq.bids?.length || 0} vendor bids received
                </div>
                {rfq.status === 'AWARDED' && (
                  <div className="text-emerald-600 font-bold pt-1">
                    Awarded to: {rfq.awardedSupplierName} ({formatCurrency(rfq.awardedAmount || 0)})
                  </div>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {rfq.status === 'DRAFT' && (
                <button
                  onClick={() => handlePublish(rfq.id)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t('Publish')}
                </button>
              )}
              <button
                onClick={() => setSelectedRfq(rfq)}
                className="px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold ml-auto"
              >
                {t('View & Bids')} ({rfq.bids?.length || 0})
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">{t('Create Request for Quotation (RFQ)')}</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Tender / RFQ Title')} *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Procurement of 500 Reams A4 Paper"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Category')}</label>
                  <input
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Bid Submission Deadline')}</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
              </div>

              {/* Items required */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">{t('Required Items')}</span>
                  <button type="button" onClick={handleAddItem} className="text-xs text-indigo-600 font-bold">+ {t('Add Item')}</button>
                </div>
                {items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2">
                    <input
                      placeholder="Item name"
                      value={it.productName}
                      onChange={(e) => handleUpdateItem(idx, 'productName', e.target.value)}
                      className="col-span-7 px-3 py-1.5 border rounded-lg text-xs"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={it.quantity}
                      onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                      className="col-span-3 px-3 py-1.5 border rounded-lg text-xs"
                    />
                    <input
                      placeholder="Unit"
                      value={it.unit}
                      onChange={(e) => handleUpdateItem(idx, 'unit', e.target.value)}
                      className="col-span-2 px-3 py-1.5 border rounded-lg text-xs"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold">
                  {t('Save RFQ')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bids Modal */}
      {selectedRfq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{selectedRfq.title}</h2>
                <span className="text-xs text-slate-400">Status: {selectedRfq.status}</span>
              </div>
              <button onClick={() => setSelectedRfq(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            {/* Existing Bids */}
            <div className="space-y-3">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-300">
                {t('Received Supplier Quotations')} ({selectedRfq.bids?.length || 0})
              </span>
              {(selectedRfq.bids || []).length === 0 ? (
                <p className="text-xs text-slate-400 p-4 border rounded-lg text-center">No bids submitted yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedRfq.bids.map((b) => (
                    <div
                      key={b.id}
                      className="p-3 border rounded-xl flex items-center justify-between bg-slate-50 dark:bg-slate-800/40"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white text-sm">{b.supplierName}</div>
                        <div className="text-xs text-slate-500">
                          Delivery: {b.deliveryDays} days {b.notes && `• ${b.notes}`}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-base text-emerald-600">{formatCurrency(b.bidAmount)}</span>
                        {selectedRfq.status !== 'AWARDED' && (
                          <button
                            onClick={() => handleAward(b.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold inline-flex items-center gap-1"
                          >
                            <Trophy className="w-3.5 h-3.5" />
                            {t('Award')}
                          </button>
                        )}
                        {b.status === 'ACCEPTED' && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">
                            WINNER
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Bid Form */}
            {selectedRfq.status !== 'AWARDED' && (
              <form onSubmit={handleAddBid} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl space-y-3 border">
                <span className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 block">
                  + {t('Submit New Supplier Bid')}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    placeholder="Supplier name"
                    value={bidSupplier}
                    onChange={(e) => setBidSupplier(e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-xs"
                    required
                  />
                  <input
                    type="number"
                    placeholder="Quoted Amount (Tk)"
                    value={bidAmount || ''}
                    onChange={(e) => setBidAmount(Number(e.target.value))}
                    className="px-3 py-1.5 border rounded-lg text-xs"
                    required
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="px-3 py-1.5 bg-slate-800 text-white rounded text-xs font-bold">
                    {t('Add Bid')}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Eprocurement;

