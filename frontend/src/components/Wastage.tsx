import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import { AlertTriangle, Plus, RefreshCw, CheckCircle2, RotateCcw, Box, Warehouse as WarehouseIcon } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface WastageLine {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  lineCost: number;
  reason?: string;
}

interface WastageRecord {
  id: string;
  warehouseId: string;
  type: string;
  reason: string;
  notes?: string;
  totalCost: number;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  lines: WastageLine[];
  createdAt: string;
  postedAt?: string;
}

interface SummaryData {
  totalCost: number;
  totalItems: number;
  byStatus: { DRAFT: number; POSTED: number; REVERSED: number };
}

export const Wastage: React.FC = () => {
  const { t, formatCurrency } = useSettings();
  const { products, warehouses } = useData();

  const [records, setRecords] = useState<WastageRecord[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form
  const [type, setType] = useState('DAMAGE');
  const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id || 'default');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<WastageLine[]>([]);

  // Line inputs
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qty, setQty] = useState(1);
  const [unitCost, setUnitCost] = useState(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, sumRes] = await Promise.all([
        authFetch('/api/wastage'),
        authFetch('/api/wastage/summary'),
      ]);
      if (listRes.ok) setRecords(await listRes.json());
      if (sumRes.ok) setSummary(await sumRes.json());
    } catch (e) {
      console.warn('Failed to load wastage records', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleProductSelect = (pId: string) => {
    setSelectedProduct(pId);
    const prod = products.find((p) => p.id === pId);
    if (prod) {
      setUnitCost(Number(prod.buyPrice || prod.costPrice || 0));
    }
  };

  const handleAddLine = () => {
    if (!selectedProduct || qty <= 0) return;
    const prod = products.find((p) => p.id === selectedProduct);
    const lineCost = Math.round(qty * unitCost * 100) / 100;
    setLines([
      ...lines,
      {
        productId: selectedProduct,
        productName: prod?.name || 'Product',
        quantity: qty,
        unitCost,
        lineCost,
      },
    ]);
    setSelectedProduct('');
    setQty(1);
    setUnitCost(0);
  };

  const handleRemoveLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      alert(t('Please add at least one line item'));
      return;
    }
    try {
      const res = await authFetch('/api/wastage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          warehouseId,
          type,
          reason,
          notes,
          lines,
        }),
      });
      if (res.ok) {
        setShowModal(false);
        setLines([]);
        setReason('');
        setNotes('');
        loadData();
      }
    } catch (e) {
      console.warn('Create wastage failed', e);
    }
  };

  const handlePost = async (id: string) => {
    if (!confirm(t('Post this wastage? Stock will be immediately deducted and logged as an expense loss.'))) return;
    try {
      const res = await authFetch(`/api/wastage/${id}/post`, { method: 'POST' });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Post wastage failed', e);
    }
  };

  const handleReverse = async (id: string) => {
    if (!confirm(t('Reverse this posted wastage? Deducted stock will be restored to your inventory.'))) return;
    try {
      const res = await authFetch(`/api/wastage/${id}/reverse`, { method: 'POST' });
      if (res.ok) loadData();
    } catch (e) {
      console.warn('Reverse wastage failed', e);
    }
  };

  const totalLinesCost = lines.reduce((s, l) => s + l.lineCost, 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            {t('Wastage & Damage Inventory')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Record broken, expired, or spoiled products with automated inventory deduction and loss journals.')}
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
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('Record Wastage')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Posted Loss Value')}
          </span>
          <span className="text-2xl font-bold text-red-600 dark:text-red-400">
            {formatCurrency(summary?.totalCost ?? 0)}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Items Written Off')}
          </span>
          <span className="text-2xl font-bold text-slate-800 dark:text-white">
            {summary?.totalItems ?? 0} {t('units')}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Pending Drafts')}
          </span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {summary?.byStatus.DRAFT ?? 0}
          </span>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase">
                <th className="p-4">{t('Date')}</th>
                <th className="p-4">{t('Type')}</th>
                <th className="p-4">{t('Reason / Notes')}</th>
                <th className="p-4">{t('Items')}</th>
                <th className="p-4">{t('Total Cost')}</th>
                <th className="p-4">{t('Status')}</th>
                <th className="p-4 text-right">{t('Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    {t('No wastage records recorded.')}
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-4 whitespace-nowrap text-xs text-slate-500">
                      {new Date(rec.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-semibold text-slate-900 dark:text-white">
                      {rec.type}
                    </td>
                    <td className="p-4 max-w-xs truncate">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{rec.reason || '—'}</span>
                      {rec.notes && <p className="text-xs text-slate-400">{rec.notes}</p>}
                    </td>
                    <td className="p-4">
                      {rec.lines?.map((l, i) => (
                        <div key={i} className="text-xs">
                          {l.productName} × {l.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="p-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(rec.totalCost)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          rec.status === 'POSTED'
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
                            : rec.status === 'REVERSED'
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            : 'bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      {rec.status === 'DRAFT' && (
                        <button
                          onClick={() => handlePost(rec.id)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold inline-flex items-center gap-1 shadow-sm"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('Post')}
                        </button>
                      )}
                      {rec.status === 'POSTED' && (
                        <button
                          onClick={() => handleReverse(rec.id)}
                          className="px-3 py-1 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {t('Reverse')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Wastage Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-5 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {t('New Wastage / Damage Entry')}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Wastage Type')}
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-800 dark:text-white"
                  >
                    <option value="DAMAGE">Damaged Goods</option>
                    <option value="EXPIRED">Expired Stock</option>
                    <option value="SPOILED">Spoiled / Rotten</option>
                    <option value="LOST">Lost / Missing</option>
                    <option value="QUALITY_FAIL">Quality Check Failed</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Warehouse / Store')}
                  </label>
                  <select
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-800 dark:text-white"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Primary Reason')} *
                </label>
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Water damage during transit, Expiry date passed"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm text-slate-800 dark:text-white"
                  required
                />
              </div>

              {/* Line items section */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase">
                  {t('Add Product Lines')}
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <div className="sm:col-span-6">
                    <select
                      value={selectedProduct}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm"
                    >
                      <option value="">{t('Select product...')}</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.stock})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      min="1"
                      value={qty}
                      onChange={(e) => setQty(Number(e.target.value))}
                      placeholder="Qty"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      value={unitCost}
                      onChange={(e) => setUnitCost(Number(e.target.value))}
                      placeholder="Cost"
                      className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-lg text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddLine}
                      className="w-full py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-lg text-xs font-bold"
                    >
                      + {t('Add')}
                    </button>
                  </div>
                </div>

                {lines.length > 0 && (
                  <div className="divide-y divide-slate-200 dark:divide-slate-700 pt-2">
                    {lines.map((l, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-semibold text-slate-800 dark:text-white">
                            {l.productName}
                          </span>
                          <span className="text-slate-500 ml-2">
                            {l.quantity} × {formatCurrency(l.unitCost)} = {formatCurrency(l.lineCost)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="text-red-500 hover:text-red-700 font-bold px-2"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    <div className="pt-2 text-right font-bold text-sm text-slate-900 dark:text-white">
                      {t('Total Estimated Loss')}: {formatCurrency(totalLinesCost)}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm font-semibold"
                >
                  {t('Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-semibold"
                >
                  {t('Save as Draft')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Wastage;

