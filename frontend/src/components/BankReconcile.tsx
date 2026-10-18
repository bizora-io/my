import React, { useMemo, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  parseBankCsv,
  matchStatementToBooks,
  summarizeMatchResults,
  statementTotals,
  detectColumnMap,
  loadColumnMaps,
  saveColumnMap,
  deleteColumnMap,
  ParsedStatementLine,
  LineMatchResult,
  CsvColumnMap,
} from '../lib/bankReconcile';
import { authFetch, hasAuthToken } from '../lib/apiClient';
import { Upload, RefreshCw, CheckCircle, AlertCircle, Link2, X, Save, BookOpen } from 'lucide-react';
import { AUTO_JOURNAL_ACCOUNTS, journalLine, validateJournalLines } from '@shared/lib/journalAutoPost';

const BankReconcile: React.FC = () => {
  const { currencySymbol, formatMoney } = useSettings();
  const { financialAccounts, transactions, addTransaction, addJournalEntry } = useData();
  const bankAccounts = financialAccounts.filter(
    (a) => a.type === 'Bank' || a.type === 'Mobile Wallet' || a.type === 'Cash'
  );

  const [accountId, setAccountId] = useState(bankAccounts[0]?.id || '');
  const [lines, setLines] = useState<ParsedStatementLine[]>([]);
  const [matches, setMatches] = useState<LineMatchResult[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');
  const [rawCsv, setRawCsv] = useState('');
  const [saving, setSaving] = useState(false);
  const [enableMulti, setEnableMulti] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [columnMap, setColumnMap] = useState<Partial<CsvColumnMap>>({});
  const [profileName, setProfileName] = useState('Default bank');
  const [savedMaps, setSavedMaps] = useState<CsvColumnMap[]>(() => {
    try {
      return loadColumnMaps();
    } catch {
      return [];
    }
  });

  const bookTxs = useMemo(
    () =>
      transactions
        .filter((t) => !t.isDeleted)
        .map((t) => ({
          id: t.id,
          date: t.date,
          amount: t.amount,
          accountId: t.accountId,
          paymentMethod: t.paymentMethod,
          type: t.type,
          entityName: t.entityName,
          reference: t.reference,
          notes: t.notes,
          isDeleted: t.isDeleted,
        })),
    [transactions]
  );

  const runMatch = (nextLines: ParsedStatementLine[], accId: string) => {
    setMatches(matchStatementToBooks(nextLines, bookTxs, accId, { enableMultiMatch: enableMulti }));
  };

  const applyParse = (text: string, map?: Partial<CsvColumnMap>) => {
    const parsed = parseBankCsv(text, map);
    if (parsed.error) {
      setError(parsed.error);
      setLines([]);
      setMatches([]);
      setHeaders(parsed.headers);
      setColumnMap(parsed.usedMap);
      setShowMap(true);
      return;
    }
    setError('');
    setHeaders(parsed.headers);
    setColumnMap(parsed.usedMap);
    setLines(parsed.lines);
    if (!accountId) {
      setError('Select a financial account first.');
      return;
    }
    runMatch(parsed.lines, accountId);
  };

  const onFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    setRawCsv(text);
    applyParse(text, columnMap.date ? columnMap : undefined);
  };

  const totals = statementTotals(lines);
  const matchedN = matches.filter((m) => m.status === 'matched').length;
  const suggestedN = matches.filter((m) => m.status === 'suggested').length;
  const unmatchedN = matches.filter((m) => m.status === 'unmatched').length;
  const multiN = matches.filter((m) => m.multiMatch).length;
  const partialN = matches.filter((m) =>
    (m.suggestions || []).some((s: any) => (s.reasons || []).includes('partial_amount'))
  ).length;


  const confirmSuggestion = (lineId: string, txId: string) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.lineId === lineId
          ? { ...m, status: 'matched', matchedTransactionIds: [txId], confidence: 1, multiMatch: false }
          : m
      )
    );
  };

  const ignoreLine = (lineId: string) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.lineId === lineId
          ? { ...m, status: 'matched', matchedTransactionIds: [], confidence: 1 }
          : m
      )
    );
  };

  const createFromLine = (line: ParsedStatementLine) => {
    if (!accountId) return;
    const isIn = line.amount > 0;
    addTransaction({
      id: `br-${Date.now()}`,
      date: line.date,
      entityName: line.description.slice(0, 80) || (isIn ? 'Bank credit' : 'Bank debit'),
      type: isIn ? 'Income' : 'Expense',
      amount: Math.abs(line.amount),
      paymentMethod: 'Bank',
      accountId,
      reference: line.reference || line.externalId,
      notes: `From bank statement: ${line.description}`,
      category: isIn ? 'Bank deposit' : 'Bank charge',
      details: { subtotal: Math.abs(line.amount), tax: 0, discount: 0, delivery: 0 },
    } as any);
    setTimeout(() => runMatch(lines, accountId), 50);
  };

  /** Post double-entry journal only (Bank ↔ OpEx / Other Income) and mark line matched. */
  const postJournalFromLine = (line: ParsedStatementLine) => {
    const amt = Math.abs(Number(line.amount) || 0);
    if (amt <= 0) return;
    const isIn = line.amount > 0;
    const bank = AUTO_JOURNAL_ACCOUNTS.bank;
    const counter = isIn ? AUTO_JOURNAL_ACCOUNTS.otherIncome : AUTO_JOURNAL_ACCOUNTS.opex;
    const linesJe = isIn
      ? [journalLine(bank, amt, 0), journalLine(counter, 0, amt)]
      : [journalLine(counter, amt, 0), journalLine(bank, 0, amt)];
    const check = validateJournalLines(linesJe);
    if (!check.ok) {
      alert(check.error || 'Invalid journal');
      return;
    }
    const res = addJournalEntry({
      id: `je-br-${Date.now()}`,
      date: line.date || new Date().toISOString().slice(0, 10),
      memo: `Bank recon: ${line.description.slice(0, 80) || (isIn ? 'Deposit' : 'Charge')}`,
      reference: line.reference || line.externalId || `BR-${line.id}`,
      lines: linesJe as any,
      createdAt: new Date().toISOString(),
      isPosted: true,
    });
    if (!res.ok) {
      alert(res.error || 'Journal post failed');
      return;
    }
    ignoreLine(line.id); // mark reconciled against books via journal
  };

  const postAllUnmatchedJournals = () => {
    const open = matches.filter((m) => m.status === 'unmatched' || m.status === 'suggested');
    if (!open.length) {
      alert('No unmatched lines');
      return;
    }
    if (!confirm(`Post journal for ${open.length} open statement line(s)?`)) return;
    let ok = 0;
    let fail = 0;
    for (const m of open) {
      const line = lines.find((l) => l.id === m.lineId);
      if (!line) continue;
      const amt = Math.abs(Number(line.amount) || 0);
      if (amt <= 0) continue;
      const isIn = line.amount > 0;
      const bank = AUTO_JOURNAL_ACCOUNTS.bank;
      const counter = isIn ? AUTO_JOURNAL_ACCOUNTS.otherIncome : AUTO_JOURNAL_ACCOUNTS.opex;
      const linesJe = isIn
        ? [journalLine(bank, amt, 0), journalLine(counter, 0, amt)]
        : [journalLine(counter, amt, 0), journalLine(bank, 0, amt)];
      if (!validateJournalLines(linesJe).ok) {
        fail++;
        continue;
      }
      const res = addJournalEntry({
        id: `je-br-${Date.now()}-${ok}`,
        date: line.date || new Date().toISOString().slice(0, 10),
        memo: `Bank recon: ${line.description.slice(0, 80) || (isIn ? 'Deposit' : 'Charge')}`,
        reference: line.reference || line.externalId || `BR-${line.id}`,
        lines: linesJe as any,
        createdAt: new Date().toISOString(),
        isPosted: true,
      });
      if (res.ok) {
        ok++;
        ignoreLine(line.id);
      } else fail++;
    }
    alert(`Journal posts: ${ok} ok${fail ? `, ${fail} failed` : ''}`);
  };

  const saveSession = async () => {

    if (!accountId || !lines.length) return;
    setSaving(true);
    try {
      const payload = {
        id: `bs-${Date.now()}`,
        accountId,
        fileName,
        importedAt: new Date().toISOString(),
        lines,
        matches,
        totals,
        status: unmatchedN === 0 && suggestedN === 0 ? 'reconciled' : 'open',
      };
      if (hasAuthToken()) {
        await authFetch('/api/bank-statements', { method: 'POST', body: JSON.stringify(payload) });
      }
      localStorage.setItem(`bizora_last_bank_recon_${accountId}`, JSON.stringify(payload));
      alert(payload.status === 'reconciled' ? 'Session saved as reconciled.' : 'Session saved (still has open items).');
    } catch (e: any) {
      alert(e?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const saveMapProfile = () => {
    if (!columnMap.date) {
      alert('Map at least the Date column.');
      return;
    }
    const map: CsvColumnMap = {
      profileName: profileName.trim() || 'Default bank',
      date: columnMap.date!,
      amount: columnMap.amount,
      debit: columnMap.debit,
      credit: columnMap.credit,
      description: columnMap.description,
      reference: columnMap.reference,
      invertAmount: columnMap.invertAmount,
    };
    saveColumnMap(map);
    setSavedMaps(loadColumnMaps());
    alert(`Saved map "${map.profileName}"`);
  };

  const getMatch = (lineId: string) => matches.find((m) => m.lineId === lineId);
  const txLabel = (id: string) => {
    const t = transactions.find((x) => x.id === id);
    if (!t) return id;
    return `${t.type} · ${t.entityName || ''} · ${formatMoney(t.amount)}`;
  };

  const selectClass = 'px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white';

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Bank reconciliation</h2>
          <p className="text-sm text-slate-500">
            CSV import, column maps, auto-match + multi-match batch deposits.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              if (lines.length) runMatch(lines, e.target.value);
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">Select account</option>
            {bankAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.type}) · {formatMoney(a.balance)}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold cursor-pointer hover:bg-indigo-700">
            <Upload className="w-4 h-4" />
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFile(f);
                e.target.value = '';
              }}
            />
          </label>
          {lines.length > 0 && (
            <button
              type="button"
              onClick={() => runMatch(lines, accountId)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="w-4 h-4" /> Re-match
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowMap((v) => !v)}
            className="text-sm font-semibold px-3 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50"
          >
            Column map
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs items-center">
        <label className="flex items-center gap-1.5 font-semibold text-slate-600">
          <input type="checkbox" checked={enableMulti} onChange={(e) => setEnableMulti(e.target.checked)} />
          Multi-match (batch sum)
        </label>
        {savedMaps.length > 0 && (
          <select
            className={selectClass}
            defaultValue=""
            onChange={(e) => {
              const m = savedMaps.find((x) => x.profileName === e.target.value);
              if (m) {
                setColumnMap(m);
                setProfileName(m.profileName);
                if (rawCsv) applyParse(rawCsv, m);
              }
            }}
          >
            <option value="">Load saved map…</option>
            {savedMaps.map((m) => (
              <option key={m.profileName} value={m.profileName}>
                {m.profileName}
              </option>
            ))}
          </select>
        )}
      </div>

      {showMap && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <p className="text-sm font-bold text-slate-800">CSV column mapping</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(
              [
                ['date', 'Date *'],
                ['amount', 'Amount'],
                ['debit', 'Debit'],
                ['credit', 'Credit'],
                ['description', 'Description'],
                ['reference', 'Reference'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="text-xs space-y-1">
                <span className="font-semibold text-slate-500">{label}</span>
                <select
                  className={`w-full ${selectClass}`}
                  value={(columnMap as any)[key] || ''}
                  onChange={(e) => setColumnMap({ ...columnMap, [key]: e.target.value || undefined })}
                >
                  <option value="">—</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
            <input
              type="checkbox"
              checked={!!columnMap.invertAmount}
              onChange={(e) => setColumnMap({ ...columnMap, invertAmount: e.target.checked })}
            />
            Invert amount signs
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Profile name"
            />
            <button
              type="button"
              onClick={saveMapProfile}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white inline-flex items-center gap-1"
            >
              <Save className="w-3 h-3" /> Save map
            </button>
            <button
              type="button"
              onClick={() => {
                if (rawCsv) applyParse(rawCsv, columnMap);
                else if (headers.length) setColumnMap({ ...detectColumnMap(headers), ...columnMap });
              }}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200"
            >
              Apply map
            </button>
            {profileName && savedMaps.some((m) => m.profileName === profileName) && (
              <button
                type="button"
                onClick={() => {
                  deleteColumnMap(profileName);
                  setSavedMaps(loadColumnMaps());
                }}
                className="text-xs text-red-600 font-semibold"
              >
                Delete profile
              </button>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold border border-red-100">{error}</div>
      )}

      {lines.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Lines</p>
              <p className="text-xl font-black text-slate-800">{totals.count}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Inflow</p>
              <p className="text-xl font-black text-emerald-600">
                {currencySymbol}
                {totals.inflow.toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Outflow</p>
              <p className="text-xl font-black text-red-600">
                {currencySymbol}
                {Math.abs(totals.outflow).toFixed(2)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Matched</p>
              <p className="text-xl font-black text-indigo-600">{matchedN}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Multi</p>
              <p className="text-xl font-black text-violet-600">{multiN}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Open</p>
              <p className="text-xl font-black text-amber-600">{suggestedN + unmatchedN}</p>
              {partialN > 0 && (
                <p className="text-[10px] text-amber-700 mt-1">{partialN} near-amount (review)</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b bg-slate-50 flex justify-between items-center">
              <span className="text-sm font-bold text-slate-700">
                {fileName || 'Statement'} · {headers.length} columns
              </span>
              <div className="flex gap-2">
                {(unmatchedN + suggestedN) > 0 && (
                  <button
                    type="button"
                    onClick={postAllUnmatchedJournals}
                    className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Journal all open ({unmatchedN + suggestedN})
                  </button>
                )}
                <button
                  type="button"
                  disabled={saving}
                  onClick={saveSession}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                >
                  {saving ? 'Saving…' : 'Save session'}
                </button>
              </div>
            </div>
            <div className="divide-y divide-slate-100 max-h-[28rem] overflow-y-auto">
              {lines.map((line) => {
                const m = getMatch(line.id);
                const status = m?.status || 'unmatched';
                return (
                  <div key={line.id} className="p-4 hover:bg-slate-50/80">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{line.date}</span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              status === 'matched'
                                ? 'bg-emerald-50 text-emerald-700'
                                : status === 'suggested'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {status}
                            {m?.multiMatch ? ' · multi' : ''}
                          </span>
                          {m && m.confidence > 0 && (
                            <span className="text-[10px] text-slate-400">{Math.round(m.confidence * 100)}% conf.</span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-800 mt-1 truncate">{line.description || '—'}</p>
                        {line.reference && <p className="text-xs text-slate-400">Ref: {line.reference}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-lg font-black ${line.amount >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {line.amount >= 0 ? '+' : ''}
                          {currencySymbol}
                          {line.amount.toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {status === 'matched' && m!.matchedTransactionIds.length > 0 && (
                      <div className="mt-2 space-y-0.5">
                        {m!.matchedTransactionIds.map((id) => (
                          <p key={id} className="text-xs text-emerald-700 flex items-center gap-1">
                            <CheckCircle className="w-3.5 h-3.5" /> {txLabel(id)}
                          </p>
                        ))}
                      </div>
                    )}

                    {status === 'suggested' && m && (
                      <div className="mt-2 space-y-1">
                        <p className="text-[10px] font-bold uppercase text-amber-600 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Suggestions
                        </p>
                        {m.suggestions.map((s) => (
                          <button
                            key={s.transactionId}
                            type="button"
                            onClick={() => confirmSuggestion(line.id, s.transactionId)}
                            className="w-full text-left text-xs px-2 py-1.5 rounded-lg border border-amber-100 hover:bg-amber-50 flex justify-between gap-2"
                          >
                            <span className="truncate">{txLabel(s.transactionId)}</span>
                            <span className="text-amber-700 font-bold shrink-0">{Math.round(s.score * 100)}%</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {(status === 'unmatched' || status === 'suggested') && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => createFromLine(line)}
                          className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                        >
                          <Link2 className="w-3 h-3" /> Create ledger entry
                        </button>
                        <button
                          type="button"
                          onClick={() => postJournalFromLine(line)}
                          className="text-xs font-bold text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <BookOpen className="w-3 h-3" /> Post journal
                        </button>
                        <button
                          type="button"
                          onClick={() => ignoreLine(line.id)}
                          className="text-xs text-slate-500 hover:underline inline-flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Ignore
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {!lines.length && !error && (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-400 text-sm">
          <Upload className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Select an account and upload a CSV. Use <strong>Column map</strong> if headers are non-standard.
        </div>
      )}
    </div>
  );
};

export default BankReconcile;
