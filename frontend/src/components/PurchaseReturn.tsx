import React, { useState, useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, LedgerEntry } from '../contexts/DataContext';
import { Search, RotateCcw, Package, CheckCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import {
  isReturnForPurchase,
  remainingReturnable,
  calculatePartialRefundWithAdjustments,
  sliceLotsForQty,
} from '@shared/lib/partialSalesReturn';

/**
 * Purchase Return — reverse a supplier purchase and deduct FEFO lots.
 */
const PurchaseReturn: React.FC = () => {
  const { t, currencySymbol, language } = useSettings();
  const { transactions, addTransaction, updateProductStock, financialAccounts } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<LedgerEntry | null>(null);
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Card' | 'Bank' | 'Mobile' | 'Due'>('Cash');
  const [accountId, setAccountId] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [deductStock, setDeductStock] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const returnInFlightRef = useRef(false);
  const [returnBusy, setReturnBusy] = useState(false);
  const location = useLocation();
  const navState = location.state as { invoiceId?: string } | null;

  // Deep-link from invoice / ledger
  useEffect(() => {
    if (!navState?.invoiceId) return;
    const tx = transactions.find((x) => x.id === navState.invoiceId && x.type === 'Purchase');
    if (tx) {
      setSelectedPurchase(tx);
      setReturnQuantities({});
      setSuccessMsg('');
      setSearchTerm(tx.entityName || tx.reference || '');
    }
  }, [navState?.invoiceId, transactions]);

  useEffect(() => {
    if (financialAccounts.length > 0 && !accountId) {
      const def = financialAccounts.find((a) => a.isDefault) || financialAccounts[0];
      if (def) setAccountId(def.id);
    }
  }, [financialAccounts, accountId]);

  const purchases = transactions.filter(
    (tx) =>
      tx.type === 'Purchase' &&
      (tx.entityName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.id.includes(searchTerm) ||
        (tx.reference || '').toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (tx: LedgerEntry) => {
    setSelectedPurchase(tx);
    setReturnQuantities({});
    setSuccessMsg('');
  };

  const lineKey = (item: any, idx: number) =>
    `${item.productId}::${item.variantId || ''}::${idx}`;

  const handleQty = (key: string, maxQty: number, val: string) => {
    const qty = parseInt(val, 10) || 0;
    if (qty < 0 || qty > maxQty) return;
    setReturnQuantities((prev) => ({ ...prev, [key]: qty }));
  };

  const priorReturns = selectedPurchase
    ? transactions.filter((tx) => isReturnForPurchase(tx as any, selectedPurchase.id))
    : [];

  const remainingQtys = selectedPurchase?.items
    ? remainingReturnable(selectedPurchase.items as any, priorReturns as any)
    : [];

  const itemMax = (idx: number) =>
    remainingQtys[idx] ?? (Number(selectedPurchase?.items?.[idx]?.qty) || 0);

  const creditBreakdown = (() => {
    if (!selectedPurchase?.items) {
      return { linesSubtotal: 0, discountShare: 0, taxShare: 0, refund: 0, ratio: 0 };
    }
    const qtys = selectedPurchase.items.map((item, idx) => {
      const raw = returnQuantities[lineKey(item, idx)] || returnQuantities[item.productId] || 0;
      return Math.min(raw, itemMax(idx));
    });
    const d = (selectedPurchase as any).details || {};
    return calculatePartialRefundWithAdjustments(selectedPurchase.items as any, qtys, {
      subtotal: d.subtotal,
      discount: d.discount,
      tax: d.tax,
      amount: selectedPurchase.amount,
    });
  })();

  const calculateCredit = () => creditBreakdown.refund;

  const processReturn = () => {
    if (returnInFlightRef.current) return;
    if (!selectedPurchase?.items) return;
    const creditAmount = calculateCredit();
    if (creditAmount <= 0) {
      alert('Please select items to return');
      return;
    }
    returnInFlightRef.current = true;
    setReturnBusy(true);
    try {
    const returnItems = selectedPurchase.items
      .map((item, idx) => {
        const raw = returnQuantities[lineKey(item, idx)] || returnQuantities[item.productId] || 0;
        return { item, idx, qty: Math.min(raw, itemMax(idx)) };
      })
      .filter(({ qty }) => qty > 0)
      .map(({ item, qty }) => {
        const origLots = Array.isArray((item as any).lots)
          ? ((item as any).lots as { lotNumber: string; qty: number; expiryDate?: string }[])
          : [];
        const auditLots = origLots.length
          ? sliceLotsForQty(origLots, qty)
          : ((item as any).batchNumber || item.expiryDate)
            ? [{ lotNumber: (item as any).batchNumber || 'PO-RET', qty, expiryDate: item.expiryDate }]
            : [];

        if (deductStock && qty > 0) {
          updateProductStock(item.productId, qty, 'decrease', (item as any).variantId);
        }

        return {
          ...item,
          qty,
          variantId: (item as any).variantId,
          variantName: (item as any).variantName,
          lots: auditLots.length ? auditLots : (item as any).lots,
          batchNumber: auditLots[0]?.lotNumber || (item as any).batchNumber,
          expiryDate: auditLots[0]?.expiryDate || item.expiryDate,
        };
      });

    const returnTx: LedgerEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      entityName: selectedPurchase.entityName,
      entityMobile: selectedPurchase.entityMobile,
      entityId: selectedPurchase.entityId,
      type: 'Purchase Return',
      amount: creditAmount,
      paymentMethod: refundMethod as any,
      accountId: accountId || undefined,
      reference: `PRET-${selectedPurchase.id}`,
      notes: [returnReason, `Original purchase: ${selectedPurchase.id}`].filter(Boolean).join(' | '),
      originalPurchaseId: selectedPurchase.id,
      items: returnItems,
      timeline: [
        {
          status: 'Purchase Return Processed',
          date: new Date().toISOString(),
          note: `Reason: ${returnReason || 'n/a'}; stock ${deductStock ? 'deducted (FEFO)' : 'not changed'}`,
        },
      ],
    };

    addTransaction(returnTx);
    setSuccessMsg(`Purchase return recorded. Credit: ${currencySymbol}${creditAmount.toFixed(2)}`);
    setTimeout(() => {
      setSelectedPurchase(null);
      setReturnQuantities({});
      setSuccessMsg('');
    }, 3000);
    } finally {
      returnInFlightRef.current = false;
      setReturnBusy(false);
    }
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 rounded-lg text-blue-700">
          <RotateCcw className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">{t('Purchase Return') || 'Purchase Return'}</h1>
          <p className="text-slate-500 text-sm">Return goods to supplier and deduct inventory (FEFO)</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-semibold">
          <CheckCircle className="w-4 h-4" /> {successMsg}
        </div>
      )}

      <div className="flex-1 flex gap-6 overflow-hidden min-h-[420px]">
        <div className="w-1/3 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search supplier or purchase ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-slate-50">
            {purchases.map((tx) => (
              <button
                key={tx.id}
                type="button"
                onClick={() => handleSelect(tx)}
                className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${
                  selectedPurchase?.id === tx.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                }`}
              >
                <div className="font-bold text-slate-800 text-sm">{tx.entityName}</div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {tx.date?.slice?.(0, 10)} · {tx.reference || tx.id.slice(-6)} · {currencySymbol}
                  {Number(tx.amount).toFixed(2)}
                </div>
              </button>
            ))}
            {!purchases.length && (
              <p className="p-6 text-center text-slate-400 text-sm">No purchases found</p>
            )}
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
          {selectedPurchase ? (
            <>
              <div className="p-4 border-b border-slate-100 flex justify-between items-start">
                <div>
                  <h2 className="font-bold text-lg text-slate-800">{selectedPurchase.entityName}</h2>
                  <p className="text-xs text-slate-500">
                    {selectedPurchase.date?.slice?.(0, 10)} · Ref {selectedPurchase.reference || selectedPurchase.id}
                  </p>
                </div>
                <Package className="w-8 h-8 text-slate-200" />
              </div>
              {priorReturns.length > 0 && (
                <div className="mx-4 mt-3 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  {priorReturns.length} prior return(s) on this purchase — only remaining qty can be returned.
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {(selectedPurchase.items || []).map((item, idx) => (
                  <div
                    key={lineKey(item, idx)}
                    className="flex items-center gap-4 border border-slate-100 rounded-lg p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">
                        Bought {item.qty} · Left {itemMax(idx)} @ {currencySymbol}
                        {item.price}
                        {(item as any).batchNumber ? ` · Lot ${(item as any).batchNumber}` : ''}
                        {item.expiryDate ? ` · Exp ${item.expiryDate}` : ''}
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={itemMax(idx)}
                      disabled={itemMax(idx) <= 0}
                      className="w-20 border rounded-lg px-2 py-1.5 text-sm text-center font-bold disabled:opacity-40"
                      value={returnQuantities[lineKey(item, idx)] || returnQuantities[item.productId] || ''}
                      placeholder="0"
                      onChange={(e) => handleQty(lineKey(item, idx), itemMax(idx), e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-slate-100 space-y-3 bg-slate-50">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Refund method</label>
                    <select
                      className="w-full border rounded-lg p-2 text-sm bg-white"
                      value={refundMethod}
                      onChange={(e) => setRefundMethod(e.target.value as any)}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank">Bank</option>
                      <option value="Card">Card</option>
                      <option value="Mobile">Mobile</option>
                      <option value="Due">Supplier credit</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-400">Reason</label>
                    <input
                      className="w-full border rounded-lg p-2 text-sm"
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={deductStock}
                    onChange={(e) => setDeductStock(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Deduct stock (FEFO)
                </label>
                <div className="flex justify-between items-center pt-2">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400">Supplier credit</p>
                    <p className="text-2xl font-black text-blue-700">
                      {currencySymbol} {calculateCredit().toFixed(2)}
                    {(creditBreakdown.discountShare > 0 || creditBreakdown.taxShare > 0) && (
                      <p className="text-[10px] text-slate-500 mt-1">
                        Lines {currencySymbol}{creditBreakdown.linesSubtotal.toFixed(2)}
                        {creditBreakdown.discountShare > 0 ? ` − disc ${currencySymbol}${creditBreakdown.discountShare.toFixed(2)}` : ''}
                        {creditBreakdown.taxShare > 0 ? ` + tax ${currencySymbol}${creditBreakdown.taxShare.toFixed(2)}` : ''}
                      </p>
                    )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={processReturn}
                    disabled={returnBusy}
                    className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
                  >
                    <RotateCcw className="w-5 h-5" />
                    {returnBusy
                      ? (language === 'bn' ? 'প্রসেসিং…' : 'Processing…')
                      : (language === 'bn' ? 'রিটার্ন প্রসেস' : 'Process return')}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <RotateCcw className="w-16 h-16 mb-4 opacity-10" />
              <p className="text-lg font-medium">Select a purchase to return</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PurchaseReturn;
