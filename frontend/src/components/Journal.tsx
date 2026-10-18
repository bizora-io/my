import React, { useMemo, useState, useRef } from 'react';
import { useData, JournalEntry, JournalLine, JournalAccount } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { BookOpen, Plus, Trash2, Scale, Download, RefreshCw, Undo2 } from 'lucide-react';
import { buildAutoJournalEntry } from '@shared/lib/journalAutoPost';
import { buildPnL, buildBalanceSheet } from '@shared/lib/journalStatements';

const DEFAULT_ACCOUNTS: JournalAccount[] = [
  { id: 'a-1000', code: '1000', name: 'Cash', type: 'Asset' },
  { id: 'a-1100', code: '1100', name: 'Bank', type: 'Asset' },
  { id: 'a-1200', code: '1200', name: 'Accounts Receivable', type: 'Asset' },
  { id: 'a-1300', code: '1300', name: 'Inventory', type: 'Asset' },
  { id: 'a-2000', code: '2000', name: 'Accounts Payable', type: 'Liability' },
  { id: 'a-2100', code: '2100', name: 'Store Credit Liability', type: 'Liability' },
  { id: 'a-3000', code: '3000', name: 'Owner Equity', type: 'Equity' },
  { id: 'a-4000', code: '4000', name: 'Sales Revenue', type: 'Revenue' },
  { id: 'a-4100', code: '4100', name: 'Other Income', type: 'Revenue' },
  { id: 'a-5000', code: '5000', name: 'Cost of Goods Sold', type: 'Expense' },
  { id: 'a-5100', code: '5100', name: 'Operating Expense', type: 'Expense' },
  { id: 'a-5200', code: '5200', name: 'Salary Expense', type: 'Expense' },
];

const emptyLine = (): JournalLine => ({
  accountId: '',
  accountCode: '',
  accountName: '',
  debit: 0,
  credit: 0,
});

const Journal: React.FC = () => {
  const { currencySymbol, t, language } = useSettings();
  const { journalEntries, addJournalEntry, deleteJournalEntry, journalTrialBalance, transactions, products, journalPeriodClosedThrough, setJournalPeriodClosedThrough } = useData();
  const [tab, setTab] = useState<'entries' | 'new' | 'tb' | 'gl' | 'stmt' | 'ob'>('entries');
  const [obAmounts, setObAmounts] = useState<Record<string, string>>({});
  const [stmtFrom, setStmtFrom] = useState('');
  const [stmtTo, setStmtTo] = useState('');
  const [glAccountId, setGlAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [memo, setMemo] = useState('');
  const [reference, setReference] = useState('');
  const [lines, setLines] = useState<JournalLine[]>([emptyLine(), emptyLine()]);
  const [error, setError] = useState('');
  const [entryFilter, setEntryFilter] = useState<'all' | 'auto' | 'manual'>('all');
  const [entrySearch, setEntrySearch] = useState('');
  const postInFlightRef = useRef(false);
  const [postBusy, setPostBusy] = useState(false);
  const backfillInFlightRef = useRef(false);
  const [backfillBusy, setBackfillBusy] = useState(false);
  const obInFlightRef = useRef(false);
  const [obBusy, setObBusy] = useState(false);
  const reverseInFlightRef = useRef(false);
  const [reversingId, setReversingId] = useState<string | null>(null);

  const filteredEntries = useMemo(() => {
    const q = entrySearch.trim().toLowerCase();
    return journalEntries.filter((e) => {
      const auto = !!(e as any).autoPosted;
      if (entryFilter === 'auto' && !auto) return false;
      if (entryFilter === 'manual' && auto) return false;
      if (!q) return true;
      return (
        (e.memo || '').toLowerCase().includes(q) ||
        (e.reference || '').toLowerCase().includes(q) ||
        String(e.date || '').includes(q) ||
        (e.lines || []).some(
          (l) =>
            (l.accountName || '').toLowerCase().includes(q) ||
            (l.accountCode || '').includes(q)
        )
      );
    });
  }, [journalEntries, entryFilter, entrySearch]);

  const totals = useMemo(() => ({

    debit: lines.reduce((s, l) => s + (Number(l.debit) || 0), 0),
    credit: lines.reduce((s, l) => s + (Number(l.credit) || 0), 0),
  }), [lines]);

  const setAccount = (idx: number, accountId: string) => {
    const acc = DEFAULT_ACCOUNTS.find(a => a.id === accountId);
    setLines(prev => prev.map((l, i) => i === idx ? {
      ...l,
      accountId,
      accountCode: acc?.code || '',
      accountName: acc?.name || '',
    } : l));
  };

  const postOpeningBalances = () => {
    if (obInFlightRef.current) return;
    setError('');
    obInFlightRef.current = true;
    setObBusy(true);
    try {
    const linesOut: JournalLine[] = [];
    let assetSum = 0;
    let creditSum = 0; // liabilities + equity entered
    for (const acc of DEFAULT_ACCOUNTS) {
      if (acc.id === 'a-3000') continue; // equity is plug
      const raw = obAmounts[acc.id];
      if (raw === undefined || raw === '') continue;
      const amt = Math.round((parseFloat(raw) || 0) * 100) / 100;
      if (amt === 0) continue;
      if (acc.type === 'Asset') {
        linesOut.push({
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          debit: amt > 0 ? amt : 0,
          credit: amt < 0 ? Math.abs(amt) : 0,
        });
        assetSum += amt;
      } else if (acc.type === 'Liability' || acc.type === 'Equity') {
        linesOut.push({
          accountId: acc.id,
          accountCode: acc.code,
          accountName: acc.name,
          debit: amt < 0 ? Math.abs(amt) : 0,
          credit: amt > 0 ? amt : 0,
        });
        creditSum += amt;
      }
      // skip pure P&L seed on opening (optional): allow expense/revenue as debit/credit starting
      else if (acc.type === 'Expense') {
        linesOut.push({
          accountId: acc.id, accountCode: acc.code, accountName: acc.name,
          debit: amt > 0 ? amt : 0, credit: amt < 0 ? Math.abs(amt) : 0,
        });
        assetSum += amt; // treat as debit side for plug math
      } else if (acc.type === 'Revenue') {
        linesOut.push({
          accountId: acc.id, accountCode: acc.code, accountName: acc.name,
          debit: amt < 0 ? Math.abs(amt) : 0, credit: amt > 0 ? amt : 0,
        });
        creditSum += amt;
      }
    }
    // Equity plug so Assets = Liabilities + Equity
    const plug = Math.round((assetSum - creditSum) * 100) / 100;
    const equity = DEFAULT_ACCOUNTS.find((a) => a.id === 'a-3000')!;
    if (Math.abs(plug) > 0.009) {
      linesOut.push({
        accountId: equity.id,
        accountCode: equity.code,
        accountName: equity.name,
        debit: plug < 0 ? Math.abs(plug) : 0,
        credit: plug > 0 ? plug : 0,
      });
    }
    if (linesOut.length < 2) {
      setError('Enter at least two opening amounts (equity can auto-fill).');
      return;
    }
    const entry: JournalEntry = {
      id: `je-ob-${Date.now()}`,
      date,
      memo: memo.trim() || 'Opening balances',
      reference: reference.trim() || 'OPENING',
      lines: linesOut.filter((l) => (l.debit || 0) > 0 || (l.credit || 0) > 0),
      createdAt: new Date().toISOString(),
      isPosted: true,
    };
    const res = addJournalEntry(entry);
    if (!res.ok) {
      setError(res.error || 'Failed');
      return;
    }
    setObAmounts({});
    setMemo('');
    setReference('');
    setTab('entries');
    } finally {
      obInFlightRef.current = false;
      setObBusy(false);
    }
  };

  const reverseJournalEntry = (e: JournalEntry) => {
    if (reverseInFlightRef.current) return;
    if (!confirm(language === 'bn'
      ? `"${e.memo}" এর রিভার্সিং এন্ট্রি পোস্ট করবেন?`
      : `Post reversing entry for "${e.memo}"?`)) return;
    reverseInFlightRef.current = true;
    setReversingId(e.id);
    try {
    const revLines: JournalLine[] = (e.lines || []).map((l) => ({
      accountId: l.accountId,
      accountCode: l.accountCode,
      accountName: l.accountName,
      debit: Number(l.credit) || 0,
      credit: Number(l.debit) || 0,
    }));
    const entry: JournalEntry = {
      id: `je-rev-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      memo: `Reversal: ${e.memo}`,
      reference: `REV-${e.reference || e.id}`,
      lines: revLines,
      createdAt: new Date().toISOString(),
      isPosted: true,
    };
    const res = addJournalEntry(entry);
    if (!res.ok) {
      alert(res.error || (language === 'bn' ? 'রিভার্সাল ব্যর্থ (পিরিয়ড লক হতে পারে)' : 'Reversal failed (period may be locked)'));
      return;
    }
    } finally {
      reverseInFlightRef.current = false;
      setReversingId(null);
    }
  };

  const post = () => {
    if (postInFlightRef.current) return;
    setError('');
    postInFlightRef.current = true;
    setPostBusy(true);
    try {
    const entry: JournalEntry = {
      id: `je-${Date.now()}`,
      date,
      memo: memo.trim() || 'Journal entry',
      reference: reference.trim() || undefined,
      lines: lines.filter(l => l.accountId && ((l.debit || 0) > 0 || (l.credit || 0) > 0)),
      createdAt: new Date().toISOString(),
      isPosted: true,
    };
    const res = addJournalEntry(entry);
    if (!res.ok) {
      setError(res.error || 'Failed');
      return;
    }
    setMemo('');
    setReference('');
    setLines([emptyLine(), emptyLine()]);
    setTab('entries');
    } finally {
      postInFlightRef.current = false;
      setPostBusy(false);
    }
  };

  const backfillJournals = () => {
    if (backfillInFlightRef.current) return;
    backfillInFlightRef.current = true;
    setBackfillBusy(true);
    try {
    const existing = new Set(
      journalEntries.map((j) => (j as any).sourceTransactionId || j.id).filter(Boolean)
    );
    let n = 0;
    let skipped = 0;
    for (const tx of transactions) {
      if (tx.isDeleted) continue;
      if (existing.has(tx.id) || existing.has(`aje-${tx.id}`)) {
        skipped++;
        continue;
      }
      const items = (tx.items || []).map((it: any) => {
        const prod = products.find((p) => p.id === it.productId);
        return { ...it, purchasePrice: it.purchasePrice ?? prod?.purchasePrice ?? 0 };
      });
      const je = buildAutoJournalEntry({ ...tx, items } as any);
      if (!je) continue;
      const res = addJournalEntry(je as any);
      if (res.ok) {
        n++;
        existing.add(tx.id);
        existing.add(je.id);
      }
    }
    alert(language === 'bn'
      ? `ব্যাকফিল শেষ: ${n}টি জার্নাল তৈরি${skipped ? `, ${skipped}টি আগেই লিংকড` : ''}।`
      : `Backfill complete: ${n} journal entr${n === 1 ? 'y' : 'ies'} created${skipped ? `, ${skipped} already linked` : ''}.`);
    } finally {
      backfillInFlightRef.current = false;
      setBackfillBusy(false);
    }
  };

  const exportStatementsCsv = (kind: 'pnl' | 'bs') => {
    const esc = (v: any) => {
      const s = v === undefined || v === null ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines: string[] = [];
    if (kind === 'pnl') {
      lines.push('Section,Code,Name,Amount');
      for (const r of journalPnL.revenue) {
        lines.push(['Revenue', esc(r.code), esc(r.name), esc(r.amount)].join(','));
      }
      lines.push(['Revenue', '', 'Total revenue', esc(journalPnL.totalRevenue)].join(','));
      for (const r of journalPnL.expense) {
        lines.push(['Expense', esc(r.code), esc(r.name), esc(r.amount)].join(','));
      }
      lines.push(['Expense', '', 'Total expenses', esc(journalPnL.totalExpense)].join(','));
      lines.push(['', '', 'Net income', esc(journalPnL.netIncome)].join(','));
    } else {
      lines.push('Section,Code,Name,Amount');
      for (const r of journalBS.assets) {
        lines.push(['Asset', esc(r.code), esc(r.name), esc(r.amount)].join(','));
      }
      lines.push(['Asset', '', 'Total assets', esc(journalBS.totalAssets)].join(','));
      for (const r of journalBS.liabilities) {
        lines.push(['Liability', esc(r.code), esc(r.name), esc(r.amount)].join(','));
      }
      lines.push(['Liability', '', 'Total liabilities', esc(journalBS.totalLiabilities)].join(','));
      for (const r of journalBS.equity) {
        lines.push(['Equity', esc(r.code), esc(r.name), esc(r.amount)].join(','));
      }
      lines.push(['Equity', '', 'Retained earnings', esc(journalBS.retainedEarnings)].join(','));
      lines.push(['Equity', '', 'Total equity', esc(journalBS.totalEquity)].join(','));
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportJournalCsv = () => {

    const esc = (v: any) => {
      const s = v === undefined || v === null ? '' : String(v);
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const lines = [
      ['EntryId', 'Date', 'Memo', 'Reference', 'Auto', 'AccountCode', 'AccountName', 'Debit', 'Credit'].join(','),
    ];
    for (const e of journalEntries) {
      for (const l of e.lines || []) {
        lines.push(
          [
            esc(e.id),
            esc(String(e.date || '').slice(0, 10)),
            esc(e.memo),
            esc(e.reference || ''),
            esc((e as any).autoPosted ? 'yes' : 'no'),
            esc(l.accountCode),
            esc(l.accountName),
            esc(Number(l.debit) || 0),
            esc(Number(l.credit) || 0),
          ].join(',')
        );
      }
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const tb = journalTrialBalance();
  const tbDebit = tb.reduce((s, r) => s + r.debit, 0);
  const tbCredit = tb.reduce((s, r) => s + r.credit, 0);

  const glLedger = useMemo(() => {
    if (!glAccountId) return [];
    const acc = DEFAULT_ACCOUNTS.find((a) => a.id === glAccountId || a.code === glAccountId);
    const matchIds = new Set([glAccountId, acc?.id, acc?.code].filter(Boolean) as string[]);
    const rows: {
      entryId: string;
      date: string;
      memo: string;
      reference?: string;
      debit: number;
      credit: number;
      balance: number;
      auto?: boolean;
    }[] = [];
    const sorted = [...journalEntries]
      .filter((e) => e.isPosted !== false)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    let bal = 0;
    for (const e of sorted) {
      for (const l of e.lines || []) {
        if (!matchIds.has(l.accountId) && !matchIds.has(l.accountCode)) continue;
        const d = Number(l.debit) || 0;
        const c = Number(l.credit) || 0;
        bal += d - c;
        rows.push({
          entryId: e.id,
          date: String(e.date || '').slice(0, 10),
          memo: e.memo,
          reference: e.reference,
          debit: d,
          credit: c,
          balance: Math.round(bal * 100) / 100,
          auto: !!(e as any).autoPosted,
        });
      }
    }
    return rows;
  }, [journalEntries, glAccountId]);

  const coaForStmt = DEFAULT_ACCOUNTS.map((a) => ({
    id: a.id,
    code: a.code,
    name: a.name,
    type: a.type as any,
  }));
  const journalPnL = useMemo(
    () =>
      buildPnL(journalEntries as any, coaForStmt, {
        from: stmtFrom || undefined,
        to: stmtTo || undefined,
      }),
    [journalEntries, stmtFrom, stmtTo]
  );
  const journalBS = useMemo(
    () =>
      buildBalanceSheet(journalEntries as any, coaForStmt, {
        to: stmtTo || undefined,
      }),
    [journalEntries, stmtTo]
  );

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" /> {t('Journal') || 'General Journal'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Double-entry journal — debits must equal credits on every entry.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={backfillJournals}
            disabled={backfillBusy}
            className="px-3 py-1.5 rounded-lg text-sm font-bold bg-white border border-slate-200 text-slate-700 inline-flex items-center gap-1 hover:bg-slate-50 disabled:opacity-50"
            title="Create journal entries from existing ledger transactions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${backfillBusy ? 'animate-spin' : ''}`} />
            {backfillBusy
              ? (language === 'bn' ? 'প্রসেসিং…' : 'Processing…')
              : (language === 'bn' ? 'ব্যাকফিল' : 'Backfill')}
          </button>
          <button
            type="button"
            onClick={exportJournalCsv}
            className="px-3 py-1.5 rounded-lg text-sm font-bold bg-white border border-slate-200 text-slate-700 inline-flex items-center gap-1 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          {(['entries', 'new', 'tb', 'gl', 'stmt', 'ob'] as const).map(k => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold ${tab === k ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}
            >
              {k === 'entries' ? 'Entries' : k === 'new' ? 'New entry' : k === 'tb' ? 'Trial balance' : k === 'gl' ? 'Account ledger' : k === 'stmt' ? 'Statements' : 'Opening'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex flex-wrap gap-3 items-end justify-between">
        <div>
          <p className="text-xs font-bold uppercase text-amber-800">Accounting period lock</p>
          <p className="text-xs text-amber-700/80 mt-0.5">
            Journals dated on or before this day cannot be posted (including auto-post from POS).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <input
            type="date"
            value={journalPeriodClosedThrough || ''}
            onChange={(e) => setJournalPeriodClosedThrough(e.target.value || null)}
            className="border border-amber-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          {journalPeriodClosedThrough && (
            <button
              type="button"
              onClick={() => setJournalPeriodClosedThrough(null)}
              className="text-xs font-bold text-amber-900 underline"
            >
              Unlock
            </button>
          )}
          <span className="text-xs font-bold text-amber-900">
            {journalPeriodClosedThrough ? `Closed through ${journalPeriodClosedThrough}` : 'No lock'}
          </span>
        </div>
      </div>


      {tab === 'ob' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div>
            <h3 className="font-bold text-slate-800">Opening balances</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter asset / liability balances. <strong>Owner Equity</strong> is calculated so the entry balances (Assets − Liabilities − other credits).
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">As of date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Reference</label>
              <input value={reference} onChange={e => setReference(e.target.value)} placeholder="OPENING" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Memo</label>
              <input value={memo} onChange={e => setMemo(e.target.value)} placeholder="Opening balances" className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
          </div>
          <div className="overflow-x-auto border border-slate-100 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-left">
                <tr>
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DEFAULT_ACCOUNTS.filter((a) => a.id !== 'a-3000').map((a) => (
                  <tr key={a.id}>
                    <td className="px-3 py-2 font-medium">{a.code} — {a.name}</td>
                    <td className="px-3 py-2 text-xs text-slate-500">{a.type}</td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        step="0.01"
                        className="w-32 border rounded-lg px-2 py-1 text-right text-sm"
                        value={obAmounts[a.id] ?? ''}
                        placeholder="0"
                        onChange={(e) => setObAmounts((prev) => ({ ...prev, [a.id]: e.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
                <tr className="bg-indigo-50/50">
                  <td className="px-3 py-2 font-bold text-indigo-900">3000 — Owner Equity</td>
                  <td className="px-3 py-2 text-xs">Equity (auto)</td>
                  <td className="px-3 py-2 text-right text-xs font-bold text-indigo-700">Auto plug</td>
                </tr>
              </tbody>
            </table>
          </div>
          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
          <button type="button" onClick={postOpeningBalances} disabled={obBusy} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold disabled:opacity-50">
            {obBusy
              ? (language === 'bn' ? 'প্রসেসিং…' : 'Processing…')
              : (language === 'bn' ? 'ওপেনিং পোস্ট' : 'Post opening entry')}
          </button>
        </div>
      )}

      {tab === 'new' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase">Reference</label>
              <input value={reference} onChange={e => setReference(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="JE-001" />
            </div>
            <div className="sm:col-span-1">
              <label className="text-xs font-bold text-slate-500 uppercase">Memo</label>
              <input value={memo} onChange={e => setMemo(e.target.value)} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Description" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b">
                <tr>
                  <th className="py-2 pr-2">Account</th>
                  <th className="py-2 w-32 text-right">Debit</th>
                  <th className="py-2 w-32 text-right">Credit</th>
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, idx) => (
                  <tr key={idx} className="border-b border-slate-50">
                    <td className="py-2 pr-2">
                      <select
                        value={line.accountId}
                        onChange={e => setAccount(idx, e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm"
                      >
                        <option value="">Select account</option>
                        {DEFAULT_ACCOUNTS.map(a => (
                          <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        value={line.debit || ''}
                        onChange={e => setLines(prev => prev.map((l, i) => i === idx ? { ...l, debit: parseFloat(e.target.value) || 0, credit: 0 } : l))}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        value={line.credit || ''}
                        onChange={e => setLines(prev => prev.map((l, i) => i === idx ? { ...l, credit: parseFloat(e.target.value) || 0, debit: 0 } : l))}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right"
                      />
                    </td>
                    <td className="py-2 text-center">
                      {lines.length > 2 && (
                        <button type="button" onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-bold">
                  <td className="py-2">
                    <button type="button" onClick={() => setLines(prev => [...prev, emptyLine()])} className="text-indigo-600 text-xs flex items-center gap-1">
                      <Plus className="w-3 h-3" /> Add line
                    </button>
                  </td>
                  <td className={`py-2 text-right ${Math.abs(totals.debit - totals.credit) > 0.009 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {currencySymbol}{totals.debit.toFixed(2)}
                  </td>
                  <td className={`py-2 text-right ${Math.abs(totals.debit - totals.credit) > 0.009 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {currencySymbol}{totals.credit.toFixed(2)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {error && <p className="text-sm text-red-600 font-semibold">{error}</p>}
          <button type="button" onClick={post} disabled={postBusy} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold disabled:opacity-50">
            {postBusy
              ? (language === 'bn' ? 'প্রসেসিং…' : 'Processing…')
              : (language === 'bn' ? 'জার্নাল পোস্ট' : 'Post journal entry')}
          </button>
        </div>
      )}

      {tab === 'entries' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-3 border-b border-slate-100 flex flex-wrap gap-2 items-center bg-slate-50">
            <div className="flex bg-white rounded-lg border border-slate-200 p-0.5">
              {(['all', 'auto', 'manual'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setEntryFilter(f)}
                  className={`px-3 py-1 rounded-md text-xs font-bold capitalize ${entryFilter === f ? 'bg-indigo-600 text-white' : 'text-slate-600'}`}
                >
                  {f}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={entrySearch}
              onChange={(e) => setEntrySearch(e.target.value)}
              placeholder="Search memo, ref, account…"
              className="flex-1 min-w-[160px] px-3 py-1.5 border border-slate-200 rounded-lg text-sm"
            />
            <span className="text-xs text-slate-400">{filteredEntries.length}/{journalEntries.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {filteredEntries.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-slate-400 text-sm">{journalEntries.length === 0 ? 'No journal entries yet.' : 'No entries match filter.'}</p>
                {journalEntries.length === 0 && (
                  <div className="text-xs text-slate-500 max-w-sm mx-auto space-y-2">
                    <p className="font-semibold text-slate-600">{language === 'bn' ? 'কীভাবে শুরু করবেন' : 'How to get started'}</p>
                    <ol className="text-left list-decimal list-inside space-y-1">
                      {language === 'bn' ? (
                        <>
                          <li><strong>বিক্রি</strong> বা <strong>ক্রয়</strong> করলে জার্নাল অটো পোস্ট হয়</li>
                          <li>পুরনো লেনদেনের জন্য <strong>Backfill</strong></li>
                          <li>শুরুর ব্যালেন্সের জন্য <strong>Opening</strong></li>
                        </>
                      ) : (
                        <>
                          <li>Record a <strong>Sale</strong> or <strong>Buy</strong> — books post automatically</li>
                          <li>Or use <strong>Backfill</strong> for older transactions</li>
                          <li>Or open <strong>Opening</strong> for starting balances</li>
                        </>
                      )}
                    </ol>
                  </div>
                )}
              </div>
            ) : filteredEntries.map(e => {
              const d = e.lines.reduce((s, l) => s + (l.debit || 0), 0);
              return (
                <div key={e.id} className="p-4 hover:bg-slate-50">
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-semibold text-slate-800">{e.memo}</p>
                      <p className="text-xs text-slate-400">{e.date}{e.reference ? ` · ${e.reference}` : ''} · {e.lines.length} lines · {currencySymbol}{d.toFixed(2)}
                        {(e as any).autoPosted ? ' · Auto from ledger' : ''}
                      </p>
                      <ul className="mt-2 text-xs text-slate-600 space-y-0.5">
                        {e.lines.map((l, i) => (
                          <li key={i}>
                            {l.accountCode} {l.accountName}
                            {l.debit > 0 ? ` Dr ${currencySymbol}${l.debit.toFixed(2)}` : ` Cr ${currencySymbol}${l.credit.toFixed(2)}`}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        title={language === 'bn' ? 'রিভার্সিং এন্ট্রি' : 'Post reversing entry'}
                        onClick={() => reverseJournalEntry(e)}
                        disabled={reversingId === e.id}
                        className="text-slate-400 hover:text-indigo-600 disabled:opacity-40"
                      >
                        <Undo2 className={`w-4 h-4 ${reversingId === e.id ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const ed = String(e.date || '').slice(0, 10);
                          if (journalPeriodClosedThrough && ed && ed <= journalPeriodClosedThrough) {
                            alert(`Period closed through ${journalPeriodClosedThrough}. Use Reversal instead of delete.`);
                            return;
                          }
                          if (confirm('Delete this journal entry? Prefer Reversal for audit trail.')) deleteJournalEntry(e.id);
                        }}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === 'tb' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-800 text-sm">Trial balance (from journal only)</h3>
          </div>
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500 border-b bg-white">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Account</th>
                <th className="px-4 py-2 text-right">Debit</th>
                <th className="px-4 py-2 text-right">Credit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tb.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">No posted balances.</td></tr>
              ) : tb.map(r => (
                <tr
                  key={r.accountId || r.code}
                  className="hover:bg-indigo-50/50 cursor-pointer"
                  onClick={() => {
                    setGlAccountId(r.accountId || r.code);
                    setTab('gl');
                  }}
                  title="Open account ledger"
                >
                  <td className="px-4 py-2 font-mono text-xs text-indigo-700">{r.code}</td>
                  <td className="px-4 py-2 text-indigo-800 font-medium">{r.name}</td>
                  <td className="px-4 py-2 text-right">{r.debit ? `${currencySymbol}${r.debit.toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-2 text-right">{r.credit ? `${currencySymbol}${r.credit.toFixed(2)}` : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="font-bold border-t">
              <tr>
                <td className="px-4 py-3" colSpan={2}>Total</td>
                <td className={`px-4 py-3 text-right ${Math.abs(tbDebit - tbCredit) > 0.009 ? 'text-red-600' : 'text-emerald-700'}`}>{currencySymbol}{tbDebit.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right ${Math.abs(tbDebit - tbCredit) > 0.009 ? 'text-red-600' : 'text-emerald-700'}`}>{currencySymbol}{tbCredit.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="px-4 py-3 text-xs text-slate-400 border-t">From posted journal entries (including auto-post from POS). Click a row for account ledger.</p>
        </div>
      )}


      {tab === 'stmt' && (
        <div className="space-y-6">
          <div className="flex flex-wrap gap-3 items-end bg-white border border-slate-200 rounded-xl p-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">From</label>
              <input type="date" value={stmtFrom} onChange={(e) => setStmtFrom(e.target.value)} className="block border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400">To</label>
              <input type="date" value={stmtTo} onChange={(e) => setStmtTo(e.target.value)} className="block border rounded-lg px-3 py-2 text-sm" />
            </div>
            <button type="button" onClick={() => exportStatementsCsv('pnl')} className="px-3 py-2 border rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> P&amp;L CSV
            </button>
            <button type="button" onClick={() => exportStatementsCsv('bs')} className="px-3 py-2 border rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1">
              <Download className="w-3.5 h-3.5" /> Balance sheet CSV
            </button>
            <p className="text-xs text-slate-500 pb-2 w-full">P&amp;L uses date range; Balance Sheet is cumulative through To (or all).</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 font-bold text-slate-800 text-sm">Profit &amp; Loss</div>
              <div className="p-4 space-y-3 text-sm">
                <p className="text-xs font-bold uppercase text-emerald-700">Revenue</p>
                {journalPnL.revenue.map((r) => (
                  <div key={r.id} className="flex justify-between"><span>{r.code} {r.name}</span><span className="font-mono">{currencySymbol}{r.amount.toFixed(2)}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total revenue</span><span>{currencySymbol}{journalPnL.totalRevenue.toFixed(2)}</span></div>
                <p className="text-xs font-bold uppercase text-red-700 pt-2">Expenses</p>
                {journalPnL.expense.map((r) => (
                  <div key={r.id} className="flex justify-between"><span>{r.code} {r.name}</span><span className="font-mono">{currencySymbol}{r.amount.toFixed(2)}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total expenses</span><span>{currencySymbol}{journalPnL.totalExpense.toFixed(2)}</span></div>
                <div className={`flex justify-between font-black text-base border-t-2 pt-3 ${journalPnL.netIncome >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  <span>Net income</span>
                  <span>{currencySymbol}{journalPnL.netIncome.toFixed(2)}</span>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="p-4 border-b bg-slate-50 font-bold text-slate-800 text-sm">Balance Sheet</div>
              <div className="p-4 space-y-3 text-sm">
                <p className="text-xs font-bold uppercase text-emerald-700">Assets</p>
                {journalBS.assets.map((r) => (
                  <div key={r.id} className="flex justify-between"><span>{r.code} {r.name}</span><span className="font-mono">{currencySymbol}{r.amount.toFixed(2)}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total assets</span><span>{currencySymbol}{journalBS.totalAssets.toFixed(2)}</span></div>
                <p className="text-xs font-bold uppercase text-red-700 pt-2">Liabilities</p>
                {journalBS.liabilities.map((r) => (
                  <div key={r.id} className="flex justify-between"><span>{r.code} {r.name}</span><span className="font-mono">{currencySymbol}{r.amount.toFixed(2)}</span></div>
                ))}
                <div className="flex justify-between font-bold border-t pt-2"><span>Total liabilities</span><span>{currencySymbol}{journalBS.totalLiabilities.toFixed(2)}</span></div>
                <p className="text-xs font-bold uppercase text-indigo-700 pt-2">Equity</p>
                {journalBS.equity.map((r) => (
                  <div key={r.id} className="flex justify-between"><span>{r.code} {r.name}</span><span className="font-mono">{currencySymbol}{r.amount.toFixed(2)}</span></div>
                ))}
                <div className="flex justify-between"><span>Retained earnings (P&amp;L)</span><span className="font-mono">{currencySymbol}{journalBS.retainedEarnings.toFixed(2)}</span></div>
                <div className="flex justify-between font-bold border-t pt-2"><span>Total equity</span><span>{currencySymbol}{journalBS.totalEquity.toFixed(2)}</span></div>
                <div className={`flex justify-between font-black border-t-2 pt-3 ${Math.abs(journalBS.totalAssets - journalBS.totalLiabilities - journalBS.totalEquity) < 0.02 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  <span>Assets − Liab − Equity</span>
                  <span>{currencySymbol}{(journalBS.totalAssets - journalBS.totalLiabilities - journalBS.totalEquity).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {tab === 'gl' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-wrap gap-3 items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">General ledger by account</h3>
            <select
              value={glAccountId}
              onChange={(e) => setGlAccountId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[220px]"
            >
              <option value="">Select account…</option>
              {DEFAULT_ACCOUNTS.map((a) => (
                <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
              ))}
            </select>
          </div>
          {!glAccountId ? (
            <p className="p-8 text-center text-slate-400 text-sm">Choose an account or click one on Trial balance.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-left text-slate-500 border-b bg-white">
                <tr>
                  <th className="px-4 py-2">Date</th>
                  <th className="px-4 py-2">Memo</th>
                  <th className="px-4 py-2 text-right">Debit</th>
                  <th className="px-4 py-2 text-right">Credit</th>
                  <th className="px-4 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {glLedger.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No movements for this account.</td></tr>
                ) : glLedger.map((row, i) => (
                  <tr key={`${row.entryId}-${i}`} className="hover:bg-slate-50">
                    <td className="px-4 py-2 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-2">
                      <span className="font-medium text-slate-800">{row.memo}</span>
                      {row.reference ? <span className="text-xs text-slate-400 block">{row.reference}{row.auto ? ' · auto' : ''}</span> : null}
                    </td>
                    <td className="px-4 py-2 text-right">{row.debit ? `${currencySymbol}${row.debit.toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-2 text-right">{row.credit ? `${currencySymbol}${row.credit.toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-2 text-right font-mono text-xs">{currencySymbol}{row.balance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
};

export default Journal;
