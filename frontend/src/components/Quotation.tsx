import React, { useState, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, Quotation, InvoiceItem } from '../contexts/DataContext';
import { FileText, Plus, Search, Trash2, X, CheckCircle2, XCircle, RefreshCcw, ArrowRightCircle, Printer } from 'lucide-react';

const STATUS_STYLES: Record<Quotation['status'], string> = {
  Draft: 'bg-slate-100 text-slate-600',
  Sent: 'bg-blue-100 text-blue-700',
  Accepted: 'bg-emerald-100 text-emerald-700',
  Rejected: 'bg-red-100 text-red-700',
  Converted: 'bg-indigo-100 text-indigo-700',
  Expired: 'bg-amber-100 text-amber-700',
};

const QuotationPage: React.FC = () => {
  const { t, formatMoney, currencySymbol } = useSettings();
  const { quotations, addQuotation, updateQuotation, deleteQuotation, convertQuotationToSale, products, customers } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Quotation['status']>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingQuote, setViewingQuote] = useState<Quotation | null>(null);
  const [convertingQuote, setConvertingQuote] = useState<Quotation | null>(null);
  const [convertPayMethod, setConvertPayMethod] = useState<'Cash' | 'Card' | 'Bank' | 'Due' | 'Mobile Wallet'>('Cash');


  // --- Create form state ---
  const [entityName, setEntityName] = useState('');
  const [entityMobile, setEntityMobile] = useState('');
  const [validDays, setValidDays] = useState(7);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  const filteredQuotes = useMemo(() => {
    return quotations.filter(q => {
      const matchesSearch = q.entityName.toLowerCase().includes(searchTerm.toLowerCase()) || q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || q.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [quotations, searchTerm, statusFilter]);

  const matchingProducts = productSearch
    ? products.filter(p => !p.isDeleted && p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 6)
    : [];

  const addItem = (product: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price } : i);
      }
      return [...prev, { productId: product.id, name: product.name, qty: 1, price: product.salePrice, total: product.salePrice }];
    });
    setProductSearch('');
  };

  const updateItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setItems(prev => prev.filter(i => i.productId !== productId));
      return;
    }
    setItems(prev => prev.map(i => i.productId === productId ? { ...i, qty, total: qty * i.price } : i));
  };

  const subtotal = items.reduce((sum, i) => sum + i.total, 0);
  const total = Math.max(0, subtotal - discount);

  const resetForm = () => {
    setEntityName(''); setEntityMobile(''); setValidDays(7); setItems([]);
    setProductSearch(''); setDiscount(0); setNotes('');
  };

  const handleCreate = () => {
    if (!entityName || items.length === 0) return;
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validDays);

    const quote: Quotation = {
      id: `quote-${Date.now()}`,
      quoteNumber: `QT-${Date.now().toString().slice(-8)}`,
      date: new Date().toISOString(),
      validUntil: validUntil.toISOString(),
      entityName,
      entityMobile: entityMobile || undefined,
      items,
      subtotal,
      tax: 0,
      discount,
      total,
      status: 'Draft',
      notes: notes || undefined,
    };
    addQuotation(quote);
    resetForm();
    setShowCreateModal(false);
  };

  const isExpired = (q: Quotation) => q.status !== 'Converted' && q.status !== 'Rejected' && new Date(q.validUntil) < new Date();

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800">{t('Quotations')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create price quotes for customers, and convert accepted ones straight into a sale.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t('New Quotation')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by customer or quote number..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="All">All Statuses</option>
          {(['Draft', 'Sent', 'Accepted', 'Rejected', 'Converted', 'Expired'] as const).map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Quote #</th>
              <th className="px-6 py-3">Customer</th>
              <th className="px-6 py-3">Date</th>
              <th className="px-6 py-3">Valid Until</th>
              <th className="px-6 py-3 text-right">Total</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredQuotes.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No quotations yet. Create your first one above.</td></tr>
            ) : filteredQuotes.map(q => {
              const expired = isExpired(q);
              const status = expired ? 'Expired' : q.status;
              return (
                <tr key={q.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setViewingQuote(q)}>
                  <td className="px-6 py-4 font-bold text-slate-800">{q.quoteNumber}</td>
                  <td className="px-6 py-4 text-slate-600">{q.entityName}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(q.date).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(q.validUntil).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-slate-800">{formatMoney(q.total)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLES[status]}`}>{status}</span>
                  </td>
                  <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      {q.status === 'Draft' && (
                        <button onClick={() => updateQuotation(q.id, { status: 'Sent' })} title="Mark as Sent" className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg"><ArrowRightCircle className="w-4 h-4" /></button>
                      )}
                      {(q.status === 'Sent' || q.status === 'Draft') && !expired && (
                        <>
                          <button onClick={() => updateQuotation(q.id, { status: 'Accepted' })} title="Mark Accepted" className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 className="w-4 h-4" /></button>
                          <button onClick={() => updateQuotation(q.id, { status: 'Rejected' })} title="Mark Rejected" className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"><XCircle className="w-4 h-4" /></button>
                        </>
                      )}
                      {(q.status === 'Accepted' || q.status === 'Sent') && (
                        <button onClick={() => { setConvertingQuote(q); setConvertPayMethod('Cash'); }} title="Convert to Sale" className="p-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg"><RefreshCcw className="w-4 h-4" /></button>
                      )}
                      {q.status !== 'Converted' && (
                        <button onClick={() => { if (confirm('Delete this quotation?')) deleteQuotation(q.id); }} title="Delete" className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-indigo-600" /> New Quotation</h3>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Customer Name</label>
                  <input value={entityName} onChange={e => setEntityName(e.target.value)} list="quote-customers" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Customer name" />
                  <datalist id="quote-customers">
                    {customers.map(c => <option key={c.id} value={c.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mobile (optional)</label>
                  <input value={entityMobile} onChange={e => setEntityMobile(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="01XXXXXXXXX" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Add Products</label>
                <div className="relative">
                  <input value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Search products to add..." />
                  {matchingProducts.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {matchingProducts.map(p => (
                        <button key={p.id} onClick={() => addItem(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between">
                          <span>{p.name}</span>
                          <span className="text-slate-400">{formatMoney(p.salePrice)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {items.length > 0 && (
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-xs font-bold">
                      <tr><th className="px-3 py-2 text-left">Item</th><th className="px-3 py-2 w-24">Qty</th><th className="px-3 py-2 text-right">Total</th><th className="w-8"></th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map(i => (
                        <tr key={i.productId}>
                          <td className="px-3 py-2">{i.name}</td>
                          <td className="px-3 py-2">
                            <input type="number" min={1} value={i.qty} onChange={e => updateItemQty(i.productId, parseInt(e.target.value) || 0)} className="w-16 px-2 py-1 border border-slate-200 rounded text-sm" />
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">{formatMoney(i.total)}</td>
                          <td className="px-3 py-2"><button onClick={() => updateItemQty(i.productId, 0)}><X className="w-3.5 h-3.5 text-slate-400 hover:text-red-500" /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Valid For (days)</label>
                  <input type="number" min={1} value={validDays} onChange={e => setValidDays(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Discount ({currencySymbol})</label>
                  <input type="number" min={0} value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <div className="text-sm text-slate-500">Subtotal: {formatMoney(subtotal)} {discount > 0 && `− ${formatMoney(discount)} discount`}</div>
                <div className="text-lg font-bold text-slate-800">Total: {formatMoney(total)}</div>
              </div>

              <button
                onClick={handleCreate}
                disabled={!entityName || items.length === 0}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors"
              >
                Create Quotation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingQuote && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">{viewingQuote.quoteNumber}</h3>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLES[viewingQuote.status]}`}>{viewingQuote.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} title="Print"><Printer className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
                <button onClick={() => setViewingQuote(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Customer</span><span className="font-semibold text-slate-800">{viewingQuote.entityName}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Date</span><span>{new Date(viewingQuote.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Valid Until</span><span>{new Date(viewingQuote.validUntil).toLocaleDateString()}</span>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                {viewingQuote.items.map(i => (
                  <div key={i.productId} className="flex justify-between">
                    <span className="text-slate-600">{i.name} × {i.qty}</span>
                    <span className="font-semibold">{formatMoney(i.total)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-slate-800 text-base">
                <span>Total</span><span>{formatMoney(viewingQuote.total)}</span>
              </div>
              {viewingQuote.notes && <p className="text-slate-500 italic border-t border-slate-100 pt-3">{viewingQuote.notes}</p>}
            </div>
          </div>
        </div>
      )}

      {convertingQuote && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">Convert to sale</h3>
                <p className="text-xs text-slate-500 mt-0.5">{convertingQuote.quoteNumber} · {convertingQuote.entityName} · {formatMoney(convertingQuote.total)}</p>
              </div>
              <button type="button" onClick={() => setConvertingQuote(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Payment method</label>
                <select
                  value={convertPayMethod}
                  onChange={e => setConvertPayMethod(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="Card">Card</option>
                  <option value="Bank">Bank transfer</option>
                  <option value="Mobile Wallet">Mobile wallet</option>
                  <option value="Due">Due / Credit</option>
                </select>
              </div>
              <ul className="text-xs text-slate-500 space-y-1 max-h-32 overflow-y-auto">
                {convertingQuote.items.map(i => (
                  <li key={i.productId} className="flex justify-between">
                    <span>{i.name} × {i.qty}</span>
                    <span>{formatMoney(i.total)}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="w-full py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700"
                onClick={() => {
                  const result = convertQuotationToSale(convertingQuote.id, convertPayMethod);
                  if (result && result.ok === false) {
                    alert(result.error || 'Convert failed');
                    return;
                  }
                  alert(result?.saleId ? `Sale created: ${result.saleId}` : 'Converted to sale');
                  setConvertingQuote(null);
                  setViewingQuote(null);
                }}
              >
                Confirm convert
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default QuotationPage;
