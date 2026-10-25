import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { authFetch } from '../lib/apiClient';
import { daysUntilExpiry, statusFromDays, policyFromSettings, lotsFromProduct } from '../lib/fefoPolicy';
import { Package, Search, AlertTriangle, Clock, Pencil, Download, Trash2 } from 'lucide-react';

type Row = {
  productId: string;
  productName: string;
  lotNumber: string;
  qty: number;
  expiryDate?: string;
  receivedAt?: string;
  daysUntilExpiry: number | null;
  status: 'ok' | 'warning' | 'critical' | 'expired' | 'none';
  warehouseId?: string;
  variantId?: string;
};

const LotEnquiry: React.FC = () => {
  const dataCtx = useData();
  const { products } = dataCtx;
  const refreshProducts = (dataCtx as any).refreshProducts;
  const { currencySymbol, t } = useSettings();
  const { user } = useAuth();
  const bizSettings = useMemo(() => {
    const b = user?.businesses?.find((x: any) => x && x.name === user.businessName) || user?.businesses?.[0];
    return (b as any)?.settings || {};
  }, [user]);
  const fefoPolicy = useMemo(() => policyFromSettings(bizSettings), [bizSettings]);
  const fefoWarnDays = fefoPolicy.warnDays;
  const fefoCriticalDays = fefoPolicy.criticalDays;
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(() => searchParams.get('q') || '');
  const [filter, setFilter] = useState<'all' | 'expired' | 'critical' | 'warning' | 'ok'>(() => {
    const s = searchParams.get('status') || 'all';
    return (['all', 'expired', 'critical', 'warning', 'ok'].includes(s) ? s : 'all') as any;
  });

  const [adjustModal, setAdjustModal] = useState<Row | null>(null);
  const [adjQty, setAdjQty] = useState('');
  const [adjMode, setAdjMode] = useState<'set' | 'delta'>('set');
  const [adjReason, setAdjReason] = useState('count');
  const [adjBusy, setAdjBusy] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams();
    if (q.trim()) next.set('q', q.trim());
    if (filter !== 'all') next.set('status', filter);
    setSearchParams(next, { replace: true });
  }, [q, filter]);

  const [woBusy, setWoBusy] = useState(false);
  const [historyLot, setHistoryLot] = useState<Row | null>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [movBusy, setMovBusy] = useState(false);

  const [adjError, setAdjError] = useState('');


  const rows = useMemo(() => {
    const out: Row[] = [];
    for (const p of products) {
      if ((p as any).isDeleted || (p as any).type === 'Service') continue;
      const lots = Array.isArray((p as any).lots) ? (p as any).lots : [];
      if (lots.length) {
        for (const lot of lots) {
          if ((Number(lot.qty) || 0) <= 0) continue;
          const days = daysUntilExpiry(lot.expiryDate);
          out.push({
            productId: p.id,
            productName: p.name,
            lotNumber: lot.lotNumber || '—',
            qty: Number(lot.qty) || 0,
            expiryDate: lot.expiryDate,
            receivedAt: lot.receivedAt,
            daysUntilExpiry: days,
            status: statusFromDays(days, fefoPolicy) as any,
            warehouseId: lot.warehouseId || (p as any).warehouseId,
          });
        }
      } else if ((Number(p.stock) || 0) > 0) {
        // Synthetic single lot from product-level fields
        const days = daysUntilExpiry((p as any).expiryDate);
        out.push({
          productId: p.id,
          productName: p.name,
          lotNumber: (p as any).batchNumber || 'DEFAULT',
          qty: Number(p.stock) || 0,
          expiryDate: (p as any).expiryDate,
          daysUntilExpiry: days,
          status: statusFromDays(days, fefoPolicy) as any,
        });
      }

      // Variant-level lots
      if (Array.isArray((p as any).variants)) {
        for (const v of (p as any).variants) {
          const vlots = Array.isArray(v.lots) ? v.lots : [];
          if (vlots.length) {
            for (const lot of vlots) {
              const days = daysUntilExpiry(lot.expiryDate);
              out.push({
                productId: p.id,
                productName: `${p.name} · ${v.name || v.id}`,
                lotNumber: lot.lotNumber || '—',
                qty: Number(lot.qty) || 0,
                expiryDate: lot.expiryDate,
                receivedAt: lot.receivedAt,
                daysUntilExpiry: days,
                status: statusFromDays(days, fefoPolicy) as any,
                warehouseId: lot.warehouseId || (p as any).warehouseId,
                variantId: v.id,
              });
            }
          } else if ((Number(v.stock) || 0) > 0 && (v.expiryDate || v.batchNumber)) {
            const days = daysUntilExpiry(v.expiryDate);
            out.push({
              productId: p.id,
              productName: `${p.name} · ${v.name || v.id}`,
              lotNumber: v.batchNumber || 'DEFAULT',
              qty: Number(v.stock) || 0,
              expiryDate: v.expiryDate,
              daysUntilExpiry: days,
              status: statusFromDays(days, fefoPolicy) as any,
              warehouseId: (p as any).warehouseId,
              variantId: v.id,
            });
          }
        }
      }
    }

    out.sort((a, b) => {
      const da = a.daysUntilExpiry ?? 9999;
      const db = b.daysUntilExpiry ?? 9999;
      if (da !== db) return da - db;
      return a.productName.localeCompare(b.productName);
    });

    return out;
  }, [products, fefoPolicy]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter !== 'all' && r.status !== filter) return false;
      if (!term) return true;
      return (
        r.productName.toLowerCase().includes(term) ||
        r.lotNumber.toLowerCase().includes(term) ||
        r.productId.toLowerCase().includes(term)
      );
    });
  }, [rows, q, filter]);

  const summary = useMemo(() => ({
    lots: rows.length,
    qty: rows.reduce((s, r) => s + r.qty, 0),
    expired: rows.filter((r) => r.status === 'expired').length,
    critical: rows.filter((r) => r.status === 'critical').length,
    warning: rows.filter((r) => r.status === 'warning').length,
  }), [rows]);

  const statusClass: Record<Row['status'], string> = {
    expired: 'bg-rose-100 text-rose-800',
    critical: 'bg-orange-100 text-orange-800',
    warning: 'bg-amber-50 text-amber-800',
    ok: 'bg-emerald-50 text-emerald-800',
    none: 'bg-slate-100 text-slate-600',
  };

  const exportCsv = () => {
    const header = ['productId', 'productName', 'lotNumber', 'qty', 'expiryDate', 'daysUntilExpiry', 'status', 'receivedAt'];
    const esc = (v: any) => {
      const s = v == null ? '' : String(v);
      return /["\n,]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(',')];
    for (const r of filtered) {
      lines.push([
        r.productId,
        r.productName,
        r.lotNumber,
        r.qty,
        r.expiryDate || '',
        r.daysUntilExpiry ?? '',
        r.status,
        r.receivedAt || '',
      ].map(esc).join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lot-enquiry-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="p-3 bg-indigo-100 rounded-lg text-indigo-700">
          <Package className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('Lot Enquiry') || 'Lot Enquiry'}</h1>
          <p className="text-slate-500 text-sm">Stock by lot · FEFO order · expiry status</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          {summary.expired > 0 && (
            <button
              type="button"
              disabled={woBusy}
              onClick={async () => {
                if (!confirm(`Write off ${summary.expired} expired lot line(s)? This sets qty to 0 and posts stock adjustments.`)) return;
                setWoBusy(true);
                try {
                  const res = await authFetch('/api/fefo/write-off-expired', {
                    method: 'POST',
                    body: JSON.stringify({ reason: 'expired' }),
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || 'Write-off failed');
                  alert(`Removed ${data.lotsRemoved || 0} lots (${data.qtyRemoved || 0} units) on ${data.productsAffected || 0} products.`);
                  if (typeof refreshProducts === 'function') await refreshProducts();
                } catch (e: any) {
                  alert(e?.message || 'Write-off failed');
                } finally {
                  setWoBusy(false);
                }
              }}
              className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-bold rounded-lg hover:bg-rose-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> {woBusy ? 'Working…' : `Write off expired (${summary.expired})`}
            </button>
          )}
          <button
            type="button"
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ['Lots', summary.lots, 'text-slate-800'],
          ['Units', summary.qty, 'text-slate-800'],
          ['Expired', summary.expired, 'text-rose-600'],
          ['≤7 days', summary.critical, 'text-orange-600'],
          ['≤30 days', summary.warning, 'text-amber-600'],
        ].map(([label, val, color]) => (
          <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-3">
            <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{val as any}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm"
            placeholder="Search product or lot..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="all">All statuses</option>
          <option value="expired">Expired</option>
          <option value="critical">Critical (≤{fefoCriticalDays}d)</option>
          <option value="warning">Warning (≤{fefoWarnDays}d)</option>
          <option value="ok">OK</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 font-black">
            <tr>
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-left px-4 py-3">Lot</th>
              <th className="text-right px-4 py-3">Qty</th>
              <th className="text-left px-4 py-3">Expiry</th>
              <th className="text-left px-4 py-3">Warehouse</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-right px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <tr key={`${r.productId}-${r.lotNumber}-${r.expiryDate || ''}`} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800">
                  {r.productName}
                  <span className="block text-[10px] text-slate-400 font-normal">{r.productId.slice(-8)}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-indigo-700">
                  <button
                    type="button"
                    className="hover:underline"
                    title="View movements"
                    onClick={async () => {
                      setHistoryLot(r);
                      setMovBusy(true);
                      setMovements([]);
                      try {
                        const res = await authFetch(
                          `/api/fefo/movements?lotNumber=${encodeURIComponent(r.lotNumber)}&productId=${encodeURIComponent(r.productId)}`
                        );
                        const data = await res.json().catch(() => ({}));
                        setMovements(data.movements || []);
                      } catch {
                        setMovements([]);
                      } finally {
                        setMovBusy(false);
                      }
                    }}
                  >
                    {r.lotNumber}
                  </button>
                </td>
                <td className="px-4 py-3 text-right font-bold">{r.qty}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.expiryDate ? String(r.expiryDate).slice(0, 10) : '—'}
                  {r.daysUntilExpiry != null && (
                    <span className="block text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Clock className="w-3 h-3" />
                      {r.daysUntilExpiry < 0
                        ? `${Math.abs(r.daysUntilExpiry)}d overdue`
                        : `${r.daysUntilExpiry}d left`}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500 font-mono">{r.warehouseId || '—'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${statusClass[r.status]}`}>
                    {(r.status === 'expired' || r.status === 'critical') && <AlertTriangle className="w-3 h-3" />}
                    {r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-indigo-600 hover:text-indigo-800 p-1"
                    title="Adjust lot"
                    onClick={() => {
                      setAdjustModal(r);
                      setAdjQty(String(r.qty));
                      setAdjMode('set');
                      setAdjReason('count');
                      setAdjError('');
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No lots match this filter
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-slate-400">
        Rows are sorted FEFO-style (earliest expiry first). Products without a lot register show a DEFAULT / batch line from product stock.
      </p>

      {historyLot && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Lot movements</h3>
                <p className="text-sm text-slate-500">
                  {historyLot.productName} · <span className="font-mono text-indigo-700">{historyLot.lotNumber}</span>
                </p>
              </div>
              <button type="button" className="text-slate-400 hover:text-slate-600 font-bold" onClick={() => setHistoryLot(null)}>✕</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {movBusy && <p className="text-sm text-slate-400">Loading…</p>}
              {!movBusy && !movements.length && (
                <p className="text-sm text-slate-400">No ledger lines found for this lot yet.</p>
              )}
              {movements.map((m, i) => (
                <div key={i} className="border border-slate-100 rounded-lg p-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-bold text-slate-800">{m.type}</span>
                    <span className={`font-black ${m.direction === 'in' ? 'text-emerald-600' : m.direction === 'out' ? 'text-rose-600' : 'text-slate-500'}`}>
                      {m.direction === 'in' ? '+' : m.direction === 'out' ? '−' : ''}{m.qty}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {String(m.date || '').slice(0, 10)} · {m.entityName || '—'} · {m.reference || m.transactionId?.slice?.(-6)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {adjustModal && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-3">
            <h3 className="font-bold text-lg text-slate-800">Adjust lot</h3>
            <p className="text-sm text-slate-500">
              {adjustModal.productName} · <span className="font-mono text-indigo-700">{adjustModal.lotNumber}</span>
              <span className="block text-xs">Current qty: {adjustModal.qty}</span>
            </p>
            {adjError && <p className="text-sm text-rose-600 font-semibold">{adjError}</p>}
            <div>
              <label className="text-xs font-bold text-slate-500">Mode</label>
              <select className="w-full border rounded-lg p-2 text-sm" value={adjMode} onChange={(e) => setAdjMode(e.target.value as any)}>
                <option value="set">Set absolute qty</option>
                <option value="delta">Adjust by delta (+/−)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">{adjMode === 'set' ? 'New qty' : 'Delta (e.g. -2 or 5)'}</label>
              <input type="number" className="w-full border rounded-lg p-2 text-sm" value={adjQty} onChange={(e) => setAdjQty(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500">Reason</label>
              <select className="w-full border rounded-lg p-2 text-sm" value={adjReason} onChange={(e) => setAdjReason(e.target.value)}>
                <option value="count">Stock count</option>
                <option value="damage">Damage / write-off</option>
                <option value="expired">Expired disposal</option>
                <option value="correction">Data correction</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" className="flex-1 border rounded-lg py-2 font-bold text-slate-600" onClick={() => setAdjustModal(null)}>Cancel</button>
              <button
                type="button"
                disabled={adjBusy}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2 font-bold disabled:opacity-50"
                onClick={async () => {
                  if (!adjustModal) return;
                  setAdjBusy(true);
                  setAdjError('');
                  try {
                    const body: any = {
                      productId: adjustModal.productId,
                      lotNumber: adjustModal.lotNumber,
                      reason: adjReason,
                      expiryDate: adjustModal.expiryDate,
                    };
                    if (adjMode === 'set') body.setQty = Number(adjQty);
                    else body.qtyDelta = Number(adjQty);
                    const res = await authFetch('/api/fefo/adjust', { method: 'POST', body: JSON.stringify(body) });
                    const data = await res.json().catch(() => ({}));
                    if (!res.ok) throw new Error(data.error || 'Adjust failed');
                    if (typeof refreshProducts === 'function') await refreshProducts();
                    if (data.adjustmentId) {
                      // Soft notify — stock report will pick up Stock Adjustment on next ledger load
                      console.info('Lot adjustment ledger', data.adjustmentId, data.qtyDelta);
                    }
                    setAdjustModal(null);
                  } catch (e: any) {
                    setAdjError(e?.message || 'Failed');
                  } finally {
                    setAdjBusy(false);
                  }
                }}
              >
                {adjBusy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotEnquiry;
