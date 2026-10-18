import React, { useMemo, useState, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useStores } from '../contexts/StoreContext';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import {
  ArrowRightLeft,
  Plus,
  Trash2,
  Package,
  AlertCircle,
  ArrowRight,
  History,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

interface TransferItem {
  productId: string;
  productName: string;
  quantity: number;
  currentStock: number;
  variantId?: string;
  variantName?: string;
}

const STATUS_STYLE: Record<string, string> = {
  Pending: 'bg-amber-50 text-amber-800',
  Approved: 'bg-emerald-50 text-emerald-700',
  Rejected: 'bg-red-50 text-red-700',
  Cancelled: 'bg-slate-100 text-slate-600',
};

const ProductTransfer: React.FC = () => {
  const { t, language } = useSettings();
  const { user } = useAuth();
  const { stores } = useStores();
  const {
    products,
    warehouses,
    stockTransferRequests,
    createStockTransferRequest,
    approveStockTransfer,
    rejectStockTransfer,
    cancelStockTransfer,
    transactions,
  } = useData();

  const [sourceStore, setSourceStore] = useState('');
  const [destStore, setDestStore] = useState('');
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [destWarehouse, setDestWarehouse] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedVariantId, setSelectedVariantId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [tab, setTab] = useState<'request' | 'approvals' | 'history'>('request');

  const sourceWarehouses = useMemo(
    () => warehouses.filter((w) => !sourceStore || !w.storeId || w.storeId === sourceStore),
    [warehouses, sourceStore]
  );
  const destWarehouses = useMemo(
    () => warehouses.filter((w) => !destStore || !w.storeId || w.storeId === destStore),
    [warehouses, destStore]
  );

  const sourceStoreProducts = products.filter(
    (p) =>
      !p.isDeleted &&
      (!sourceStore || !p.storeId || p.storeId === sourceStore) &&
      (!sourceWarehouse || !p.warehouseId || p.warehouseId === sourceWarehouse)
  );

  const productData = sourceStoreProducts.find((p) => p.id === selectedProduct);
  const productVariants = (productData as any)?.variants || [];
  const selectedVariant = productVariants.find((v: any) => v.id === selectedVariantId);
  const existingQty = transferItems
    .filter((item) =>
      item.productId === selectedProduct &&
      (item.variantId || '') === (selectedVariantId || '')
    )
    .reduce((acc, item) => acc + item.quantity, 0);
  const availableStock = selectedVariant
    ? Math.max(0, (Number(selectedVariant.stock) || 0) - existingQty)
    : Math.max(0, (Number(productData?.stock) || 0) - existingQty);
  const isExceedingStock = !!selectedProduct && quantity > availableStock;

  const pending = useMemo(
    () => (stockTransferRequests || []).filter((r) => r.status === 'Pending'),
    [stockTransferRequests]
  );
  const allRequests = useMemo(
    () =>
      [...(stockTransferRequests || [])].sort((a, b) =>
        String(b.requestedAt).localeCompare(String(a.requestedAt))
      ),
    [stockTransferRequests]
  );

  const transferHistory = useMemo(
    () =>
      transactions
        .filter((tx) => !tx.isDeleted && tx.type === 'Transfer')
        .sort((a, b) => String(b.date).localeCompare(String(a.date)))
        .slice(0, 20),
    [transactions]
  );

  const storeName = (id: string) => stores.find((s) => s.id === id)?.name || id;
  const whName = (id?: string) => (id ? warehouses.find((w) => w.id === id)?.name : null);

  const handleAddItem = () => {
    setErrorMsg('');
    if (!selectedProduct) {
      setErrorMsg('Please select a product');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg('Quantity must be greater than 0');
      return;
    }
    if (isExceedingStock) {
      setErrorMsg(`Quantity exceeds available stock (${availableStock})`);
      return;
    }
    if (productData) {
      if (productVariants.length && !selectedVariantId) {
        setErrorMsg('Select a variant for this product');
        return;
      }
      const vName = selectedVariant?.name;
      setTransferItems([
        ...transferItems,
        {
          productId: productData.id,
          productName: vName ? `${productData.name} · ${vName}` : productData.name,
          quantity,
          currentStock: selectedVariant ? Number(selectedVariant.stock) || 0 : productData.stock,
          variantId: selectedVariantId || undefined,
          variantName: vName,
        },
      ]);
      setSelectedProduct('');
      setSelectedVariantId('');
      setQuantity(1);
    }
  };

  const [submitBusy, setSubmitBusy] = useState(false);
  const submitInFlightRef = useRef(false);

  const submitRequest = () => {
    if (submitInFlightRef.current) return;
    setErrorMsg('');
    if (!sourceStore || !destStore || transferItems.length === 0) {
      setErrorMsg('Select stores and at least one item');
      return;
    }
    if (sourceStore === destStore && sourceWarehouse === destWarehouse) {
      setErrorMsg('Source and destination cannot be the same');
      return;
    }
    submitInFlightRef.current = true;
    setSubmitBusy(true);
    try {
    createStockTransferRequest({
      id: `st-${Date.now()}`,
      sourceStoreId: sourceStore,
      destStoreId: destStore,
      sourceWarehouseId: sourceWarehouse || undefined,
      destWarehouseId: destWarehouse || undefined,
      items: transferItems.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        variantId: i.variantId,
        variantName: i.variantName,
      })),
      notes: notes.trim() || undefined,
      requestedBy: user?.name || user?.email || user?.id,
      status: 'Pending',
    });

    setSuccessMsg(language === 'bn' ? 'ট্রান্সফার রিকোয়েস্ট জমা — অনুমোদনের অপেক্ষায়।' : 'Transfer request submitted — waiting for approval.');
    setTransferItems([]);
    setNotes('');
    setSelectedProduct('');
    setTab('approvals');
    setTimeout(() => setSuccessMsg(''), 4000);
    } finally {
      submitInFlightRef.current = false;
      setSubmitBusy(false);
    }
  };

  const approveInFlightRef = useRef(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const onApprove = (id: string) => {
    if (approveInFlightRef.current) return;
    approveInFlightRef.current = true;
    setApprovingId(id);
    try {
    const result = approveStockTransfer(id, user?.name || user?.id);
    if (!result.ok) {
      alert(result.error || 'Approve failed');
      return;
    }
    setSuccessMsg(language === 'bn' ? 'ট্রান্সফার অনুমোদিত — স্টক সরানো হয়েছে।' : 'Transfer approved — stock moved.');
    setTimeout(() => setSuccessMsg(''), 3000);
    } finally {
      approveInFlightRef.current = false;
      setApprovingId(null);
    }
  };

  const onReject = (id: string) => {
    const note = prompt('Rejection reason (optional)') || undefined;
    rejectStockTransfer(id, note, user?.name || user?.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in p-1">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
            {t('Stock Transfer') || 'Stock Transfer'}
          </h2>
          <p className="text-sm text-slate-500">
            Request transfers between stores/warehouses — stock moves only after approval.
          </p>
        </div>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
          {(
            [
              ['request', 'New request'],
              ['approvals', `Approvals${pending.length ? ` (${pending.length})` : ''}`],
              ['history', 'History'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md ${
                tab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {successMsg && (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm font-semibold border border-emerald-100">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="px-4 py-3 rounded-xl bg-red-50 text-red-700 text-sm font-semibold border border-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {errorMsg}
        </div>
      )}

      {tab === 'request' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">From store</label>
                <select
                  value={sourceStore}
                  onChange={(e) => {
                    setSourceStore(e.target.value);
                    setSourceWarehouse('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Select…</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">To store</label>
                <select
                  value={destStore}
                  onChange={(e) => {
                    setDestStore(e.target.value);
                    setDestWarehouse('');
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Select…</option>
                  {stores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {warehouses.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">From warehouse</label>
                  <select
                    value={sourceWarehouse}
                    onChange={(e) => setSourceWarehouse(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Any / main</option>
                    {sourceWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">To warehouse</label>
                  <select
                    value={destWarehouse}
                    onChange={(e) => setDestWarehouse(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="">Any / main</option>
                    {destWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-center text-slate-300">
              <ArrowRight className="w-5 h-5" />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => {
                  setSelectedProduct(e.target.value);
                  setSelectedVariantId('');
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                disabled={!sourceStore}
              >
                <option value="">Select product…</option>
                {sourceStoreProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.stock})
                  </option>
                ))}
              </select>
            </div>

            {productVariants.length > 0 && (
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Variant</label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="">Select variant…</option>
                  {productVariants.map((v: any) => (
                    <option key={v.id} value={v.id}>
                      {v.name || v.id} (stock {v.stock || 0})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm ${isExceedingStock ? 'border-red-300' : 'border-slate-200'}`}
                />
                {isExceedingStock && (
                  <p className="text-[10px] text-red-600 font-semibold mt-1">Exceeds available ({availableStock})</p>
                )}
              </div>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold inline-flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="Reason for transfer"
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-4 h-4" /> Items
              </h3>
              <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                {transferItems.length} items
              </span>
            </div>
            <div className="flex-1 space-y-2 min-h-[12rem]">
              {transferItems.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-10">No items yet</p>
              ) : (
                transferItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.productName}</p>
                      <p className="text-[10px] text-slate-400">Qty {item.quantity}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setTransferItems(transferItems.filter((_, i) => i !== idx))}
                      className="text-red-500 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
            <button
              type="button"
              disabled={submitBusy || transferItems.length === 0 || !sourceStore || !destStore}
              onClick={submitRequest}
              className="mt-4 w-full py-3 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 disabled:opacity-40 inline-flex items-center justify-center gap-2"
            >
              <Clock className="w-4 h-4" />
              {submitBusy
                ? (language === 'bn' ? 'প্রসেসিং…' : 'Processing…')
                : (language === 'bn' ? 'অনুমোদনের জন্য জমা' : 'Submit for approval')}
            </button>
          </div>
        </div>
      )}

      {tab === 'approvals' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-700">Transfer requests</h3>
          </div>
          {allRequests.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">No transfer requests yet.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {allRequests.map((r) => (
                <div key={r.id} className="p-4 space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${STATUS_STYLE[r.status] || STATUS_STYLE.Pending}`}>
                          {r.status}
                        </span>
                        <span className="text-xs font-mono text-slate-400">{r.id}</span>
                      </div>
                      <p className="font-semibold text-slate-800 mt-1">
                        {storeName(r.sourceStoreId)}
                        {whName(r.sourceWarehouseId) ? ` (${whName(r.sourceWarehouseId)})` : ''}
                        {' → '}
                        {storeName(r.destStoreId)}
                        {whName(r.destWarehouseId) ? ` (${whName(r.destWarehouseId)})` : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        Requested by {r.requestedBy || '—'} ·{' '}
                        {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : ''}
                      </p>
                      {r.notes && <p className="text-xs text-slate-400 italic">{r.notes}</p>}
                      {r.reviewNote && (
                        <p className="text-xs text-red-600">Reject note: {r.reviewNote}</p>
                      )}
                    </div>
                    {r.status === 'Pending' && (
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onApprove(r.id)}
                          disabled={approvingId === r.id}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-emerald-600 text-white inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {approvingId === r.id
                            ? (language === 'bn' ? 'প্রসেসিং…' : 'Processing…')
                            : (language === 'bn' ? 'অনুমোদন' : 'Approve')}
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(r.id)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg border border-red-200 text-red-600 inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelStockTransfer(r.id)}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                  <ul className="text-xs text-slate-600 space-y-0.5 pl-1">
                    {r.items?.map((i) => (
                      <li key={i.productId}>
                        {i.productName} × {i.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b bg-slate-50 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-bold text-slate-700">Completed stock movements</h3>
          </div>
          {transferHistory.length === 0 ? (
            <p className="p-8 text-center text-slate-400 text-sm">No completed transfers yet.</p>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {transferHistory.map((tx) => (
                <div
                  key={tx.id}
                  className="px-4 py-3 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{tx.entityName}</p>
                    <p className="text-xs text-slate-500">{tx.reference}</p>
                    {tx.notes && <p className="text-xs text-slate-400 italic">{tx.notes}</p>}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {tx.date ? new Date(tx.date).toLocaleString() : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProductTransfer;
