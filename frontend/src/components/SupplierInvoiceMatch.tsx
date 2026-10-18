import React, { useMemo, useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData } from '../contexts/DataContext';
import {
  matchSupplierInvoices,
  parseSupplierInvoiceCsv,
  SupplierInvoiceLine,
  InvoiceMatchResult,
  PurchaseBookLite,
} from '../lib/supplierInvoiceMatch';
import { FileText, Upload, RefreshCw, CheckCircle, Link2, X, Plus } from 'lucide-react';

const SupplierInvoiceMatch: React.FC = () => {
  const { formatMoney } = useSettings();
  const { transactions, purchaseOrders, updatePurchaseOrder, updateTransaction } = useData();

  const [invoices, setInvoices] = useState<SupplierInvoiceLine[]>([]);
  const [matches, setMatches] = useState<InvoiceMatchResult[]>([]);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  // Manual form
  const [invNo, setInvNo] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [invSupplier, setInvSupplier] = useState('');
  const [invAmount, setInvAmount] = useState('');
  const [invRef, setInvRef] = useState('');

  const books: PurchaseBookLite[] = useMemo(() => {
    const list: PurchaseBookLite[] = [];
    (purchaseOrders || []).forEach((po) => {
      if (po.status === 'Cancelled') return;
      list.push({
        id: po.id,
        kind: 'po',
        date: (po.date || '').slice(0, 10),
        supplierName: po.supplierName,
        amount: Number(po.total) || 0,
        reference: po.poNumber,
        status: po.status,
        alreadyMatched: !!(po as any).matchedInvoiceId,
      });
    });
    transactions
      .filter((t) => !t.isDeleted && t.type === 'Purchase')
      .forEach((t) => {
        list.push({
          id: t.id,
          kind: 'purchase',
          date: (t.date || '').slice(0, 10),
          supplierName: t.entityName,
          amount: Number(t.amount) || 0,
          reference: t.reference,
          alreadyMatched: !!(t as any).matchedInvoiceId,
        });
      });
    return list;
  }, [purchaseOrders, transactions]);

  const runMatch = (list: SupplierInvoiceLine[]) => {
    setMatches(matchSupplierInvoices(list, books));
  };

  const onFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const parsed = parseSupplierInvoiceCsv(text);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    setError('');
    setInvoices(parsed.lines);
    runMatch(parsed.lines);
  };

  const addManual = () => {
    const amount = parseFloat(invAmount);
    if (!amount || !invSupplier.trim()) {
      setError('Supplier and amount required');
      return;
    }
    const line: SupplierInvoiceLine = {
      id: `sinv-m-${Date.now()}`,
      invoiceNumber: invNo.trim() || `INV-${Date.now().toString().slice(-6)}`,
      date: invDate,
      supplierName: invSupplier.trim(),
      amount,
      reference: invRef.trim() || undefined,
    };
    const next = [line, ...invoices];
    setInvoices(next);
    runMatch(next);
    setInvNo('');
    setInvAmount('');
    setInvRef('');
    setError('');
  };

  const confirmMatch = (invoiceId: string, bookId: string, kind: 'po' | 'purchase') => {
    const inv = invoices.find((i) => i.id === invoiceId);
    setMatches((prev) =>
      prev.map((m) =>
        m.invoiceId === invoiceId
          ? {
              ...m,
              status: 'matched',
              matchedBookIds: [bookId],
              matchedKind: kind,
              confidence: 1,
            }
          : m
      )
    );
    if (kind === 'po') {
      updatePurchaseOrder(bookId, {
        notes: [purchaseOrders.find((p) => p.id === bookId)?.notes, inv ? `Matched invoice ${inv.invoiceNumber}` : 'Matched invoice']
          .filter(Boolean)
          .join(' · '),
        ...( { matchedInvoiceId: inv?.invoiceNumber || invoiceId } as any ),
      });
    } else {
      updateTransaction(bookId, {
        notes: [transactions.find((t) => t.id === bookId)?.notes, inv ? `Matched invoice ${inv.invoiceNumber}` : 'Matched invoice']
          .filter(Boolean)
          .join(' · '),
        ...( { matchedInvoiceId: inv?.invoiceNumber || invoiceId } as any ),
      } as any);
    }
  };

  const ignoreInvoice = (invoiceId: string) => {
    setMatches((prev) =>
      prev.map((m) =>
        m.invoiceId === invoiceId
          ? { ...m, status: 'matched', matchedBookIds: [], confidence: 1 }
          : m
      )
    );
  };

  const getMatch = (id: string) => matches.find((m) => m.invoiceId === id);
  const bookLabel = (id: string) => {
    const b = books.find((x) => x.id === id);
    if (!b) return id;
    return `${b.kind === 'po' ? 'PO' : 'Purchase'} · ${b.supplierName} · ${formatMoney(b.amount)} · ${b.reference || id}`;
  };

  const matchedN = matches.filter((m) => m.status === 'matched' && m.matchedBookIds.length).length;
  const suggestedN = matches.filter((m) => m.status === 'suggested').length;
  const unmatchedN = matches.filter((m) => m.status === 'unmatched').length;

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> Supplier invoice matching
          </h2>
          <p className="text-sm text-slate-500">
            Match supplier bills to purchase orders and purchase ledger entries (amount, supplier, date, reference).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold cursor-pointer hover:bg-indigo-700">
            <Upload className="w-4 h-4" /> Upload CSV
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
          {invoices.length > 0 && (
            <button
              type="button"
              onClick={() => runMatch(invoices)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold"
            >
              <RefreshCw className="w-4 h-4" /> Re-match
            </button>
          )}
        </div>
      </div>

      {/* Manual entry */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 grid grid-cols-2 lg:grid-cols-6 gap-2 items-end">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Invoice #</label>
          <input value={invNo} onChange={(e) => setInvNo(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm" placeholder="INV-001" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Date</label>
          <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm" />
        </div>
        <div className="lg:col-span-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase">Supplier</label>
          <input value={invSupplier} onChange={(e) => setInvSupplier(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm" placeholder="Name" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">Amount</label>
          <input type="number" value={invAmount} onChange={(e) => setInvAmount(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm" placeholder="0" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase">PO / Ref</label>
          <input value={invRef} onChange={(e) => setInvRef(e.target.value)} className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm" placeholder="Optional" />
        </div>
        <button type="button" onClick={addManual} className="px-3 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold inline-flex items-center justify-center gap-1">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold border border-red-100">{error}</div>
      )}

      {invoices.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Invoices</p>
              <p className="text-xl font-black text-slate-800">{invoices.length}</p>
              {fileName && <p className="text-[10px] text-slate-400 truncate">{fileName}</p>}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Matched</p>
              <p className="text-xl font-black text-emerald-600">{matchedN}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Suggested</p>
              <p className="text-xl font-black text-amber-600">{suggestedN}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-[10px] uppercase font-bold text-slate-400">Unmatched</p>
              <p className="text-xl font-black text-slate-600">{unmatchedN}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
            {invoices.map((inv) => {
              const m = getMatch(inv.id);
              const status = m?.status || 'unmatched';
              return (
                <div key={inv.id} className="p-4">
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono text-slate-400">{inv.date}</span>
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
                        </span>
                        {m && m.confidence > 0 && (
                          <span className="text-[10px] text-slate-400">{Math.round(m.confidence * 100)}%</span>
                        )}
                      </div>
                      <p className="font-semibold text-slate-800 mt-1">
                        {inv.invoiceNumber} · {inv.supplierName}
                      </p>
                      {inv.reference && <p className="text-xs text-slate-400">Ref: {inv.reference}</p>}
                    </div>
                    <p className="text-lg font-black text-slate-800 shrink-0">{formatMoney(inv.amount)}</p>
                  </div>

                  {status === 'matched' && m!.matchedBookIds.length > 0 && (
                    <p className="mt-2 text-xs text-emerald-700 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> {bookLabel(m!.matchedBookIds[0])}
                    </p>
                  )}

                  {status === 'suggested' && m && (
                    <div className="mt-2 space-y-1">
                      {m.suggestions.map((s) => (
                        <button
                          key={s.bookId}
                          type="button"
                          onClick={() => confirmMatch(inv.id, s.bookId, s.kind)}
                          className="w-full text-left text-xs px-2 py-1.5 rounded-lg border border-amber-100 hover:bg-amber-50 flex justify-between gap-2"
                        >
                          <span className="truncate">{bookLabel(s.bookId)}</span>
                          <span className="font-bold text-amber-700 shrink-0">{Math.round(s.score * 100)}%</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {(status === 'unmatched' || status === 'suggested') && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {m?.suggestions?.[0] && status === 'unmatched' && (
                        <button
                          type="button"
                          onClick={() => confirmMatch(inv.id, m.suggestions[0].bookId, m.suggestions[0].kind)}
                          className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                        >
                          <Link2 className="w-3 h-3" /> Link best ({Math.round(m.suggestions[0].score * 100)}%)
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => ignoreInvoice(inv.id)}
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
        </>
      )}

      {!invoices.length && !error && (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-10 text-center text-slate-400 text-sm">
          <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
          Upload a CSV (invoice, date, supplier, amount, reference) or add invoices manually.
          <p className="text-xs mt-2">Matching pool: {books.length} PO/purchase records</p>
        </div>
      )}
    </div>
  );
};

export default SupplierInvoiceMatch;
