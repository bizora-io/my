import React, { useCallback, useEffect, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { authFetch } from '../lib/apiClient';
import { Building2, RefreshCw, Plus, Trash2, Printer } from 'lucide-react';

const Consolidation: React.FC = () => {
  const { formatMoney, currencySymbol } = useSettings();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [memberId, setMemberId] = useState('');
  const [from, setFrom] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [error, setError] = useState('');
  const [eliminateIc, setEliminateIc] = useState(true);
  const [useWeight, setUseWeight] = useState(true);

  const loadGroups = useCallback(() => {
    authFetch('/api/consolidation/groups')
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (body?.groups) {
          setGroups(body.groups);
          if (!selectedId && body.groups[0]) setSelectedId(body.groups[0].id);
        }
      })
      .catch(() => setError('Could not load groups'));
  }, [selectedId]);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    if (selectedId) void loadReport(selectedId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, from, to, eliminateIc, useWeight]);

  const loadReport = async (id = selectedId) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      if (from) q.set('from', from);
      if (to) q.set('to', to);
      q.set('eliminate', eliminateIc ? '1' : '0');
      q.set('weight', useWeight ? '1' : '0');
      const res = await authFetch(`/api/consolidation/groups/${id}/report?${q}`);
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || `HTTP ${res.status}`);
      }
      setReport(await res.json());
    } catch (e: any) {
      setError(e.message || 'Report failed');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!name.trim()) return;
    const members = memberId.trim()
      ? [{ businessId: memberId.trim() }, { businessId: 'self' }]
      : [];
    // API always adds owner; only pass extra subsidiary ids
    const extra = memberId.trim() ? [{ businessId: memberId.trim() }] : [];
    const res = await authFetch('/api/consolidation/groups', {
      method: 'POST',
      body: JSON.stringify({ name: name.trim(), members: extra }),
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || 'Create failed');
      return;
    }
    const body = await res.json();
    setName('');
    setMemberId('');
    loadGroups();
    if (body.group?.id) {
      setSelectedId(body.group.id);
      loadReport(body.group.id);
    }
  };

  const deleteGroup = async (id: string) => {
    if (!confirm('Delete this consolidation group?')) return;
    await authFetch(`/api/consolidation/groups/${id}`, { method: 'DELETE' });
    if (selectedId === id) {
      setSelectedId('');
      setReport(null);
    }
    loadGroups();
  };

  const c = report?.consolidated;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-800">Multi-company consolidation</h1>
          <p className="text-xs text-slate-500 mt-0.5">Group entities · IC eliminate · ownership-weighted P&amp;L · CSV / print</p>
          <p className="text-sm text-slate-500">
            Group subsidiaries (via <code className="text-xs bg-slate-100 px-1 rounded">parentBusinessId</code>) and view combined sales, purchases, and expenses.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 text-rose-700 text-sm font-semibold px-4 py-2 rounded-xl border border-rose-100">{error}</div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">Create group</h2>
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Group name (e.g. Holding Co.)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            placeholder="Subsidiary business ID (optional)"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
          />
          <p className="text-[10px] text-slate-400">
            Subsidiary docs must have <strong>parentBusinessId</strong> = your business id (or use SaaS admin).
          </p>
          <button
            type="button"
            onClick={createGroup}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <h2 className="text-sm font-black text-slate-700 uppercase tracking-wide">Your groups</h2>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {groups.length === 0 ? (
              <p className="text-sm text-slate-400">No groups yet.</p>
            ) : (
              groups.map((g) => (
                <div
                  key={g.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg border text-sm cursor-pointer ${
                    selectedId === g.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100'
                  }`}
                  onClick={() => setSelectedId(g.id)}
                >
                  <span className="font-semibold text-slate-800">{g.name}</span>
                  <button
                    type="button"
                    className="text-rose-500 p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteGroup(g.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">From</label>
              <input type="date" className="block border rounded-lg px-2 py-1 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">To</label>
              <input type="date" className="block border rounded-lg px-2 py-1 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <input type="checkbox" checked={eliminateIc} onChange={(e) => setEliminateIc(e.target.checked)} />
              Eliminate IC
            </label>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
              <input type="checkbox" checked={useWeight} onChange={(e) => setUseWeight(e.target.checked)} />
              Ownership %
            </label>
            <button
              type="button"
              disabled={!selectedId || loading}
              onClick={() => loadReport()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 text-white text-xs font-bold disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Run report
            </button>
            <button
              type="button"
              disabled={!selectedId}
              onClick={async () => {
                const q = new URLSearchParams();
                if (from) q.set('from', from);
                if (to) q.set('to', to);
                q.set('eliminate', eliminateIc ? '1' : '0');
                q.set('weight', useWeight ? '1' : '0');
                const res = await authFetch(`/api/consolidation/groups/${selectedId}/export.csv?${q}`);
                if (!res.ok) { setError('Export failed'); return; }
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `consolidation-${selectedId}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-700"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {c && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Sales (ex-IC)', value: c.sales, color: 'text-emerald-600' },
              { label: 'Purchases (ex-IC)', value: c.purchases, color: 'text-amber-600' },
              { label: 'Expenses', value: c.expenses, color: 'text-rose-600' },
              { label: 'Net', value: c.net, color: 'text-indigo-600' },
              { label: 'Eliminated sales', value: c.eliminatedSales, color: 'text-slate-600' },
              { label: 'Eliminated purchases', value: c.eliminatedPurchases, color: 'text-slate-600' },
              { label: 'Weighted net', value: report?.weighted?.net, color: 'text-violet-600' },
              { label: 'IC txns removed', value: c.eliminatedTxnCount, color: 'text-slate-500' },
            ].map((k) => (
              <div key={k.label} className="bg-white rounded-xl border border-slate-200 p-4">
                <p className="text-[10px] font-black uppercase text-slate-400">{k.label}</p>
                <p className={`text-xl font-black mt-1 ${k.color}`}>
                  {currencySymbol}
                  {Number(k.value || 0).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b text-sm font-bold text-slate-700">By company</div>
            <table className="w-full text-sm">
              <thead className="text-[10px] uppercase text-slate-400 bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-2">Company</th>
                  <th className="text-right px-4 py-2">Own%</th>
                  <th className="text-right px-4 py-2">Sales</th>
                  <th className="text-right px-4 py-2">Purchases</th>
                  <th className="text-right px-4 py-2">Expenses</th>
                  <th className="text-right px-4 py-2">Net</th>
                  <th className="text-right px-4 py-2">W.Net</th>
                  <th className="text-right px-4 py-2">IC$</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(report.byCompany || []).map((row: any) => (
                  <tr key={row.businessId}>
                    <td className="px-4 py-2 font-semibold text-slate-800">
                      {row.businessName}
                      <span className="block text-[10px] text-slate-400 font-normal">{row.businessId}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-500">{row.ownershipPct ?? 100}%</td>
                    <td className="px-4 py-2 text-right">{Number(row.sales).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{Number(row.purchases).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">{Number(row.expenses).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-bold text-indigo-700">{Number(row.net).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-violet-700">{Number(row.weightedNet || 0).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-slate-400">{Number((row.intercompanySales || 0) + (row.intercompanyPurchases || 0)).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {(report.eliminations || []).length > 0 && (
            <div className="rounded-xl border border-amber-200 overflow-hidden bg-amber-50/40">
              <div className="px-4 py-2 text-xs font-bold text-amber-900 border-b border-amber-100">
                Intercompany eliminations ({report.eliminations.length})
              </div>
              <ul className="max-h-40 overflow-y-auto text-[11px] divide-y divide-amber-100">
                {report.eliminations.slice(0, 50).map((e: any, i: number) => (
                  <li key={i} className="px-4 py-1.5 flex justify-between gap-2">
                    <span className="text-slate-700 truncate">{e.businessName || e.businessId} · {e.type} · {e.entityName || e.reference || e.id}</span>
                    <span className="font-mono shrink-0">{Number(e.amount || 0).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(report.notes || []).length > 0 && (
            <ul className="text-[11px] text-slate-500 list-disc pl-5 space-y-1">
              {report.notes.map((n: string, i: number) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          )}

          <div className="flex justify-end print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="w-3.5 h-3.5" /> Print / PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Consolidation;
