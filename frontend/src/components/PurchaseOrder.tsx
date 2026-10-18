import React, { useState, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, PurchaseOrder, InvoiceItem } from '../contexts/DataContext';
import { ClipboardList, Plus, Search, Trash2, X, PackageCheck, Printer, RefreshCw } from 'lucide-react';
import { collectReorderSuggestions, reorderTotals } from '../lib/reorderSuggestions';

const STATUS_STYLES: Record<PurchaseOrder['status'], string> = {
  Ordered: 'bg-blue-100 text-blue-700',
  Partial: 'bg-amber-100 text-amber-800',
  Received: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-red-100 text-red-700',
};

const PurchaseOrderPage: React.FC = () => {
  const { t, formatMoney, currencySymbol } = useSettings();
  const { purchaseOrders, addPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, receivePurchaseOrder, products, suppliers } = useData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | PurchaseOrder['status']>('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingPO, setViewingPO] = useState<PurchaseOrder | null>(null);
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, number>>({});


  // --- Create form state ---
  const [supplierName, setSupplierName] = useState('');
  const [supplierMobile, setSupplierMobile] = useState('');
  const [expectedDays, setExpectedDays] = useState(7);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  const reorderSuggestions = useMemo(() => collectReorderSuggestions(products as any), [products]);
  const reorderSum = useMemo(() => reorderTotals(reorderSuggestions), [reorderSuggestions]);

  const createPOFromSuggestions = (filterProductIds?: string[]) => {
    const list = filterProductIds
      ? reorderSuggestions.filter(s => filterProductIds.includes(s.productId))
      : reorderSuggestions;
    if (!list.length) return;
    const poItems: InvoiceItem[] = list.map(s => {
      const prod = products.find(p => p.id === s.productId);
      const price = Number(prod?.purchasePrice) || (s.suggestedQty ? s.estimatedCost / s.suggestedQty : 0) || 0;
      return {
        productId: s.productId,
        productName: s.productName,
        quantity: s.suggestedQty,
        unitPrice: price,
        total: s.suggestedQty * price,
      };
    });
    setItems(poItems);
    const firstSupplierId = list[0]?.supplierId;
    if (firstSupplierId) {
      const sup = suppliers.find(sp => sp.id === firstSupplierId);
      if (sup) {
        setSupplierName(sup.name);
        setSupplierMobile(sup.mobile || '');
      }
    }
    setShowCreateModal(true);
  };

  const filteredPOs = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchesSearch = po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()) || po.poNumber.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
      return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [purchaseOrders, searchTerm, statusFilter]);

  const matchingProducts = productSearch
    ? products.filter(p => !p.isDeleted && p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 6)
    : [];

  const addItem = (product: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1, total: (i.qty + 1) * i.price } : i);
      }
      return [...prev, { productId: product.id, name: product.name, qty: 1, price: product.purchasePrice || product.salePrice, total: product.purchasePrice || product.salePrice }];
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
    setSupplierName(''); setSupplierMobile(''); setExpectedDays(7); setItems([]);
    setProductSearch(''); setDiscount(0); setNotes('');
  };

  const handleCreate = () => {
    if (!supplierName || items.length === 0) return;
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + expectedDays);

    const po: PurchaseOrder = {
      id: `po-${Date.now()}`,
      poNumber: `PO-${Date.now().toString().slice(-8)}`,
      date: new Date().toISOString(),
      expectedDate: expectedDate.toISOString(),
      supplierName,
      supplierMobile: supplierMobile || undefined,
      items,
      subtotal,
      tax: 0,
      discount,
      total,
      status: 'Ordered',
      notes: notes || undefined,
    };
    addPurchaseOrder(po);
    resetForm();
    setShowCreateModal(false);
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-300">

      {reorderSuggestions.length > 0 && (
        <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
          <div className="px-4 py-3 border-b bg-amber-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Reorder suggestions
              </h3>
              <p className="text-xs text-amber-800/80">
                {reorderSum.count} product(s) at/below min · ~{formatMoney(reorderSum.estimatedCost)} · target 2× min stock
              </p>
            </div>
            <button
              type="button"
              onClick={() => createPOFromSuggestions()}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700 shrink-0"
            >
              Create PO for all
            </button>
          </div>
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {reorderSuggestions.slice(0, 25).map(s => (
              <div key={s.productId} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800 truncate">{s.productName}</p>
                  <p className="text-[10px] text-slate-500">
                    Stock {s.stock} / min {s.minStock} · order {s.suggestedQty}{s.unit ? ` ${s.unit}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold text-slate-600">{formatMoney(s.estimatedCost)}</span>
                  <button
                    type="button"
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                    onClick={() => createPOFromSuggestions([s.productId])}
                  >
                    PO
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800">{t('Purchase Orders')}</h1>
          <p className="text-sm text-slate-500 mt-0.5">Order stock from suppliers, then receive it when it actually arrives — stock and the ledger only update on receipt.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> {t('New Purchase Order')}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by supplier or PO number..."
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="All">All Statuses</option>
          <option value="Ordered">Ordered</option>
          <option value="Partial">Partial</option>
            <option value="Received">Received</option>
          <option value="Cancelled">Cancelled</option>
        </select>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">PO #</th>
              <th className="px-6 py-3">Supplier</th>
              <th className="px-6 py-3">Ordered</th>
              <th className="px-6 py-3">Expected</th>
              <th className="px-6 py-3 text-right">Total</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredPOs.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400">No purchase orders yet. Create your first one above.</td></tr>
            ) : filteredPOs.map(po => (
              <tr key={po.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setViewingPO(po)}>
                <td className="px-6 py-4 font-bold text-slate-800">{po.poNumber}</td>
                <td className="px-6 py-4 text-slate-600">{po.supplierName}</td>
                <td className="px-6 py-4 text-slate-500">{new Date(po.date).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-slate-500">{new Date(po.expectedDate).toLocaleDateString()}</td>
                <td className="px-6 py-4 text-right font-bold text-slate-800">{formatMoney(po.total)}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${STATUS_STYLES[po.status]}`}>{po.status}</span>
                </td>
                <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-end gap-1.5">
                    {(po.status === 'Ordered' || po.status === 'Partial') && (
                      <>
                        <button onClick={() => {
                      setReceivingPO(po);
                      const init: Record<string, number> = {};
                      po.items.forEach(i => {
                        const already = Number((i as any).receivedQty) || 0;
                        init[i.productId] = Math.max(0, i.qty - already);
                      });
                      setReceiveQtys(init);
                    }} title="Receive Stock" className="p-1.5 hover:bg-emerald-50 text-emerald-600 rounded-lg"><PackageCheck className="w-4 h-4" /></button>
                        <button onClick={() => updatePurchaseOrder(po.id, { status: 'Cancelled' })} title="Cancel" className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"><X className="w-4 h-4" /></button>
                      </>
                    )}
                    {(po.status === 'Ordered' || po.status === 'Partial') && (
                      <button onClick={() => { if (confirm('Delete this purchase order?')) deletePurchaseOrder(po.id); }} title="Delete" className="p-1.5 hover:bg-red-50 text-red-600 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-600" /> New Purchase Order</h3>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Supplier Name</label>
                  <input value={supplierName} onChange={e => setSupplierName(e.target.value)} list="po-suppliers" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Supplier name" />
                  <datalist id="po-suppliers">
                    {suppliers.map(s => <option key={s.id} value={s.name} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Mobile (optional)</label>
                  <input value={supplierMobile} onChange={e => setSupplierMobile(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="01XXXXXXXXX" />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Add Products</label>
                <div className="relative">
                  <input value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="Search products to order..." />
                  {matchingProducts.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                      {matchingProducts.map(p => (
                        <button key={p.id} onClick={() => addItem(p)} className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm flex justify-between">
                          <span>{p.name}</span>
                          <span className="text-slate-400">{formatMoney(p.purchasePrice || p.salePrice)}</span>
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
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Expected In (days)</label>
                  <input type="number" min={1} value={expectedDays} onChange={e => setExpectedDays(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
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
                disabled={!supplierName || items.length === 0}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-bold transition-colors"
              >
                Create Purchase Order
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewingPO && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800">{viewingPO.poNumber}</h3>
                <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_STYLES[viewingPO.status]}`}>{viewingPO.status}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} title="Print"><Printer className="w-4 h-4 text-slate-400 hover:text-slate-700" /></button>
                <button onClick={() => setViewingPO(null)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
            </div>
            <div className="p-5 space-y-4 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Supplier</span><span className="font-semibold text-slate-800">{viewingPO.supplierName}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Ordered</span><span>{new Date(viewingPO.date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Expected</span><span>{new Date(viewingPO.expectedDate).toLocaleDateString()}</span>
              </div>
              <div className="border-t border-slate-100 pt-3 space-y-1.5">
                {viewingPO.items.map(i => {
                  const rec = Number((i as any).receivedQty) || 0;
                  return (
                  <div key={i.productId} className="flex justify-between gap-2">
                    <span className="text-slate-600">{i.name} × {i.qty}
                      {rec > 0 && <span className="text-emerald-600 text-xs ml-1">(recv {rec})</span>}
                    </span>
                    <span className="font-semibold">{formatMoney(i.total)}</span>
                  </div>
                  );
                })}
              </div>
              <div className="border-t border-slate-100 pt-3 flex justify-between font-bold text-slate-800 text-base">
                <span>Total</span><span>{formatMoney(viewingPO.total)}</span>
              </div>
              {viewingPO.notes && <p className="text-slate-500 italic border-t border-slate-100 pt-3">{viewingPO.notes}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Partial / full receive modal */}
      {receivingPO && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-emerald-600" /> Receive goods
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{receivingPO.poNumber} · {receivingPO.supplierName}</p>
              </div>
              <button type="button" onClick={() => setReceivingPO(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              {receivingPO.items.map(i => {
                const already = Number((i as any).receivedQty) || 0;
                const remaining = Math.max(0, i.qty - already);
                return (
                  <div key={i.productId} className="flex items-center justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{i.name}</p>
                      <p className="text-[10px] text-slate-400">Ordered {i.qty} · Already {already} · Left {remaining}</p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={remaining}
                      className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-sm font-bold"
                      value={receiveQtys[i.productId] ?? remaining}
                      onChange={e => setReceiveQtys({
                        ...receiveQtys,
                        [i.productId]: Math.min(remaining, Math.max(0, parseInt(e.target.value) || 0)),
                      })}
                      disabled={remaining <= 0}
                    />
                  </div>
                );
              })}
              <button
                type="button"
                className="w-full mt-2 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700"
                onClick={() => {
                  receivePurchaseOrder(receivingPO.id, receiveQtys);
                  setReceivingPO(null);
                  setViewingPO(null);
                }}
              >
                Confirm receive
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default PurchaseOrderPage;
