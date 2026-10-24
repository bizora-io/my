import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, OnlineOrder } from '../contexts/DataContext';
import { authFetch } from '../lib/apiClient';
import {
  Globe,
  Truck,
  Package,
  Search,
  ExternalLink,
  Settings,
  Save,
  CheckCircle,
  X,
  Copy,
  ShoppingCart,
  Clock,
  Check,
  Printer,
  RefreshCw,
  Palette,
  CreditCard,
  MapPin,
  Phone,
  ShieldCheck,
  ChevronRight,
  Filter
} from 'lucide-react';

const OnlineShop: React.FC = () => {
  const { t, formatMoney } = useSettings();
  const {
    onlineOrders,
    updateOnlineOrder,
    courierSettings,
    updateCourierSettings,
    products,
    domainSettings,
    updateProduct,
  } = useData() as any;

  const [activeTab, setActiveTab] = useState<'orders' | 'website' | 'settings'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
  const [trackingNo, setTrackingNo] = useState('');
  const [fulfillBusy, setFulfillBusy] = useState<string | null>(null);
  const [cancelBusy, setCancelBusy] = useState<string | null>(null);
  const [sfSettings, setSfSettings] = useState<any>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState('');
  const [slugHint, setSlugHint] = useState('');
  const [themes, setThemes] = useState<any[]>([]);
  const [selectedTheme, setSelectedTheme] = useState('minimal');
  const [published, setPublished] = useState(true);
  const [tagline, setTagline] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [deliveryInside, setDeliveryInside] = useState<number>(60);
  const [deliveryOutside, setDeliveryOutside] = useState<number>(120);
  const [freeDeliveryMin, setFreeDeliveryMin] = useState<number>(2000);
  const [bkashNum, setBkashNum] = useState('');
  const [nagadNum, setNagadNum] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [subdomainInput, setSubdomainInput] = useState('');
  const [customDomainInput, setCustomDomainInput] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Load Settings & Themes
  useEffect(() => {
    authFetch('/api/storefront/settings')
      .then(async (r) => {
        if (!r.ok) return;
        const d = await r.json();
        setSfSettings(d);
        setThemes(d.themes || []);
        const ecom = d.ecommerce || {};
        setSelectedTheme(ecom.themeId || 'minimal');
        setPublished(ecom.published !== false);
        setTagline(ecom.tagline || '');
        setPhoneInput(ecom.phone || '');
        setEmailInput(ecom.email || '');
        setAddressInput(ecom.address || '');
        setDeliveryInside(Number(ecom.deliveryFeeInside ?? 60));
        setDeliveryOutside(Number(ecom.deliveryFeeOutside ?? 120));
        setFreeDeliveryMin(Number(ecom.freeDeliveryThreshold ?? 2000));
        setBkashNum(ecom.bkashNumber || '');
        setNagadNum(ecom.nagadNumber || '');
        setPaymentNotes(ecom.paymentInstructions || '');

        const sub = d.domainSettings?.subdomain || domainSettings?.subdomain || '';
        setSlugHint(sub);
        setSubdomainInput(String(sub).replace(/\.bizora\.com$/i, ''));
        setCustomDomainInput(d.domainSettings?.customDomain || '');
      })
      .catch(() => null);

    authFetch('/api/storefront/themes')
      .then(async (r) => {
        if (r.ok) {
          const d = await r.json();
          setThemes(d.themes || []);
        }
      })
      .catch(() => null);
  }, [domainSettings]);

  const onlineProductCount = (products || []).filter((p: any) => p.sellOnline && !p.isDeleted).length;
  const pendingCount = (onlineOrders || []).filter((o: any) => o.status === 'Pending').length;

  const currentSlug = String(subdomainInput || slugHint || domainSettings?.subdomain || 'shop')
    .toLowerCase()
    .replace(/\.bizora\.com$/i, '')
    .trim();

  const publicShopUrl = `${window.location.origin}/#/store/${encodeURIComponent(currentSlug)}`;

  const refreshOrders = async () => {
    try {
      const r = await authFetch('/api/online-orders');
      if (!r.ok) return;
      const d = await r.json();
      const list = d.onlineOrders || d.orders || d.items || [];
      if (Array.isArray(list) && list.length) {
        window.dispatchEvent(new CustomEvent('bizora-refresh-online-orders', { detail: list }));
      }
      alert(`Synchronized ${list.length || onlineOrders.length} orders from database.`);
    } catch {
      /* ignore */
    }
  };

  const enableAllSellOnline = async () => {
    const list = (products || []).filter((p: any) => !p.isDeleted && !p.sellOnline && (Number(p.stock) || 0) > 0);
    if (!list.length) {
      alert('All in-stock products are already enabled for online sales.');
      return;
    }
    if (!confirm(`Enable "Sell Online" on ${list.length} in-stock products?`)) return;
    let n = 0;
    for (const p of list) {
      try {
        if (typeof updateProduct === 'function') {
          updateProduct(p.id, { sellOnline: true });
          n++;
        } else {
          await authFetch(`/api/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ sellOnline: true }) });
          n++;
        }
      } catch {
        /* skip */
      }
    }
    alert(`Enabled online catalog visibility for ${n} products.`);
  };

  const handleFulfill = async (orderId: string, asShipped = false) => {
    setFulfillBusy(orderId);
    try {
      const res = await authFetch('/api/storefront/fulfill', {
        method: 'POST',
        body: JSON.stringify({ orderId, status: asShipped ? 'Shipped' : 'Processing' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Fulfillment failed');

      updateOnlineOrder(orderId, {
        status: data.status || 'Processing',
        fulfilledTransactionId: data.transactionId,
      } as any);

      alert(
        data.alreadyFulfilled
          ? 'Order was already fulfilled.'
          : `Order fulfilled! Created Sale #${data.transactionId} in Transactions ledger.`
      );
    } catch (e: any) {
      alert(e?.message || 'Fulfillment failed');
    } finally {
      setFulfillBusy(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order? This will safely restore the items back into inventory.')) {
      return;
    }
    setCancelBusy(orderId);
    try {
      const res = await authFetch(`/api/storefront/${encodeURIComponent(currentSlug)}/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Cancelled by store merchant' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Cancel failed');

      updateOnlineOrder(orderId, {
        status: 'Cancelled',
      } as any);

      alert('Order cancelled successfully. Stock has been restored.');
    } catch (e: any) {
      alert(e?.message || 'Cancellation failed');
    } finally {
      setCancelBusy(null);
    }
  };

  const handleShip = async (orderId: string, provider?: string) => {
    setFulfillBusy(orderId);
    try {
      const enabled = (courierSettings || []).filter((c: any) => c.enabled);
      const pick = provider || enabled.find((c: any) => c.provider !== 'Manual')?.provider || 'Manual';

      const res = await authFetch('/api/couriers/ship', {
        method: 'POST',
        body: JSON.stringify({ orderId, provider: pick }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.message || 'Ship failed');

      updateOnlineOrder(orderId, {
        status: 'Shipped',
        courier: data.provider,
        trackingNumber: data.trackingNumber,
      } as any);

      alert(`Shipped via ${data.provider}: Tracking #${data.trackingNumber}`);
    } catch (e: any) {
      alert(e?.message || 'Ship failed');
    } finally {
      setFulfillBusy(null);
    }
  };

  const handleSaveWebsiteSettings = async () => {
    setSavingSettings(true);
    setSaveSuccessMsg('');
    try {
      const payload = {
        ecommerce: {
          published,
          themeId: selectedTheme,
          tagline,
          phone: phoneInput,
          email: emailInput,
          address: addressInput,
          deliveryFeeInside: Number(deliveryInside),
          deliveryFeeOutside: Number(deliveryOutside),
          freeDeliveryThreshold: Number(freeDeliveryMin),
          bkashNumber: bkashNum,
          nagadNumber: nagadNum,
          paymentInstructions: paymentNotes,
        },
        subdomain: subdomainInput.trim(),
        customDomain: customDomainInput.trim() || undefined,
      };

      const res = await authFetch('/api/storefront/settings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to save settings');
      }

      setSaveSuccessMsg('Website configuration saved successfully!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err: any) {
      alert(err.message || 'Error saving settings');
    } finally {
      setSavingSettings(false);
    }
  };

  // Filtered Orders
  const filteredOrders = (onlineOrders || []).filter((o: any) => {
    const matchSearch =
      (o.id && o.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.orderNumber && o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (o.customerMobile && o.customerMobile.includes(searchTerm));

    if (statusFilter === 'All') return matchSearch;
    return matchSearch && o.status === statusFilter;
  });

  const openOrderDetails = (order: OnlineOrder) => {
    setSelectedOrder(order);
    setTrackingNo(order.trackingNumber || '');
  };

  const handleSaveOrderTracking = () => {
    if (selectedOrder) {
      updateOnlineOrder(selectedOrder.id, { trackingNumber: trackingNo });
      if (trackingNo && (selectedOrder.status === 'Pending' || selectedOrder.status === 'Processing')) {
        updateOnlineOrder(selectedOrder.id, { status: 'Shipped' });
      }
      setSelectedOrder(null);
    }
  };

  const printPackingSlip = (order: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Packing Slip — ${order.orderNumber || order.id}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 30px; color: #1e293b; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 12px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; font-weight: bold; }
            .total { font-weight: bold; font-size: 14px; text-align: right; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>PACKING SLIP / INVOICE</h1>
            <p style="margin: 0; font-size: 12px; color: #64748b;">Ref: ${order.orderNumber || order.id} · Date: ${order.date || ''}</p>
          </div>
          <div class="grid">
            <div>
              <strong>DELIVER TO:</strong><br/>
              ${order.customerName}<br/>
              Phone: ${order.customerMobile || 'N/A'}<br/>
              Address: ${order.address || 'N/A'}<br/>
              ${order.city ? `City: ${order.city}` : ''}
            </div>
            <div>
              <strong>ORDER INFO:</strong><br/>
              Payment Method: ${order.paymentMethod || 'COD'}<br/>
              Status: ${order.status}<br/>
              ${order.trackingNumber ? `Courier: ${order.courier || 'Standard'} (${order.trackingNumber})` : ''}
            </div>
          </div>
          <table>
            <thead>
              <tr><th>Item</th><th>Variant</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr>
            </thead>
            <tbody>
              ${(order.items || []).map((it: any) => `
                <tr>
                  <td>${it.name}</td>
                  <td>${it.variantName || '—'}</td>
                  <td>${it.qty}</td>
                  <td>${Number(it.price).toFixed(0)}</td>
                  <td>${Number(it.total || it.price * it.qty).toFixed(0)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">Grand Total: BDT ${Number(order.total || 0).toFixed(0)}</div>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex items-center gap-3 flex-wrap justify-between bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-800">{t('Online Shop')}</h1>
            <p className="text-slate-500 text-xs mt-0.5">
              Independent e-commerce storefront with real-time POS stock sync · No third-party platform needed
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            {onlineProductCount} Products Online
          </span>
          <a
            href={publicShopUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-indigo-600 text-white text-xs font-bold shadow-md hover:bg-indigo-700 transition-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open Public Storefront</span>
          </a>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-white px-4 rounded-xl shadow-xs">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-5 py-3.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingCart className="w-4 h-4" />
          <span>Orders</span>
          {pendingCount > 0 && (
            <span className="bg-amber-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('website')}
          className={`px-5 py-3.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'website' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Website & Storefront</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-3.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Couriers & APIs</span>
        </button>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4 animate-in fade-in">
          {/* Quick Stats & Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={enableAllSellOnline}
                className="text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl hover:bg-indigo-100"
              >
                Enable All In-Stock Online
              </button>
              <button
                type="button"
                onClick={refreshOrders}
                className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50 flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync DB</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-200/80">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by Order Reference, Customer Name, or Mobile Phone…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          {/* Orders List */}
          <div className="space-y-3">
            {filteredOrders.map((order: any) => {
              const isFulfilled = !!order.fulfilledTransactionId;
              const isCancelled = order.status === 'Cancelled';
              const canFulfill = !isFulfilled && !isCancelled;

              return (
                <div
                  key={order.id}
                  className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 flex flex-col lg:flex-row justify-between gap-4 transition-all hover:border-slate-300"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-slate-100 rounded-2xl text-slate-600 flex-shrink-0">
                      <Package className="w-6 h-6" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-mono font-black text-slate-900 text-sm">
                          {order.orderNumber || order.id}
                        </h3>
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200">
                          {order.platform || 'Online Shop'}
                        </span>
                        {isFulfilled && (
                          <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Sale Recorded
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-800">
                        {order.customerName} {order.customerMobile ? `(${order.customerMobile})` : ''}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        Date: {order.date} · {order.items?.length || 0} items
                      </p>

                      <p className="text-[11px] text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <span>{order.address}</span>
                      </p>

                      {order.trackingNumber && (
                        <p className="text-[11px] font-mono text-indigo-600 font-bold flex items-center gap-1">
                          <Truck className="w-3 h-3" />
                          <span>{order.courier || 'Courier'}: {order.trackingNumber}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-start lg:items-end justify-between gap-3 border-t lg:border-t-0 pt-3 lg:pt-0">
                    <div className="text-left lg:text-right">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'Delivered'
                            ? 'bg-emerald-100 text-emerald-700'
                            : order.status === 'Cancelled'
                              ? 'bg-rose-100 text-rose-700'
                              : order.status === 'Shipped'
                                ? 'bg-cyan-100 text-cyan-800'
                                : order.status === 'Processing'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {order.status}
                      </span>

                      <p className="font-black text-slate-900 text-base mt-1.5">
                        {formatMoney(order.total)}
                      </p>

                      <p className="text-[10px] font-bold uppercase text-slate-500">
                        Payment: {order.paymentMethod || 'COD'} ({order.paymentStatus || 'unpaid'})
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Fulfill to Sale */}
                      {canFulfill && (
                        <button
                          type="button"
                          disabled={fulfillBusy === order.id}
                          onClick={() => handleFulfill(order.id, false)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
                        >
                          {fulfillBusy === order.id ? 'Processing…' : 'Fulfill (Sale)'}
                        </button>
                      )}

                      {/* Ship Button */}
                      {!isCancelled && order.status !== 'Delivered' && (
                        <button
                          type="button"
                          disabled={fulfillBusy === order.id}
                          onClick={() => {
                            const enabled = (courierSettings || []).filter((c: any) => c.enabled).map((c: any) => c.provider);
                            const list = enabled.length ? enabled : ['Manual'];
                            const pick = list.length === 1 ? list[0] : window.prompt(`Select Courier: ${list.join(', ')}`, list[0] || 'Manual');
                            if (pick) handleShip(order.id, pick);
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 text-white shadow-sm hover:bg-amber-700 disabled:opacity-50"
                        >
                          Ship
                        </button>
                      )}

                      {/* Print Packing Slip */}
                      <button
                        type="button"
                        onClick={() => printPackingSlip(order)}
                        className="p-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100"
                        title="Print Packing Slip"
                      >
                        <Printer className="w-4 h-4" />
                      </button>

                      {/* Cancel Button */}
                      {!isCancelled && order.status !== 'Delivered' && (
                        <button
                          type="button"
                          disabled={cancelBusy === order.id}
                          onClick={() => handleCancelOrder(order.id)}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 border border-rose-200 hover:bg-rose-50"
                        >
                          Cancel
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => openOrderDetails(order)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800"
                      >
                        Details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredOrders.length === 0 && (
              <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="font-bold text-sm">No orders found.</p>
                <p className="text-xs text-slate-400 mt-1">Incoming storefront checkouts will show up here automatically.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: WEBSITE & STOREFRONT CONFIGURATION */}
      {activeTab === 'website' && (
        <div className="space-y-6 animate-in fade-in">
          {saveSuccessMsg && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* Published & Domain Overview */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 flex-wrap gap-3">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <Globe className="w-4 h-4 text-blue-600" />
                  Storefront Status & Domain
                </h3>
                <p className="text-xs text-slate-500">Enable your public storefront and choose your web address</p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={published}
                    onChange={(e) => setPublished(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 border-slate-300"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    {published ? 'Published (Live)' : 'Maintenance Mode (Unpublished)'}
                  </span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Subdomain Name</label>
                <div className="flex rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <input
                    type="text"
                    value={subdomainInput}
                    onChange={(e) => setSubdomainInput(e.target.value)}
                    placeholder="mybrand"
                    className="flex-1 px-3 py-2 bg-transparent outline-none font-semibold text-slate-800"
                  />
                  <span className="px-3 py-2 bg-slate-200/70 text-slate-500 font-mono text-[11px] flex items-center">
                    .bizora.com
                  </span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Custom Domain (Optional)</label>
                <input
                  type="text"
                  value={customDomainInput}
                  onChange={(e) => setCustomDomainInput(e.target.value)}
                  placeholder="shop.yourdomain.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium outline-none bg-slate-50 focus:bg-white"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-xs flex items-center justify-between">
              <div>
                <span className="text-slate-500">Live URL: </span>
                <a
                  href={publicShopUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-bold text-indigo-600 hover:underline"
                >
                  {publicShopUrl}
                </a>
              </div>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(publicShopUrl);
                  alert('Copied storefront URL to clipboard!');
                }}
                className="p-1.5 text-slate-500 hover:text-slate-800"
                title="Copy URL"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Theme Selector */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Palette className="w-4 h-4 text-purple-600" />
                Select Storefront Design Theme
              </h3>
              <p className="text-xs text-slate-500">Tailored palettes and layout styles suited to your business vertical</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {themes.map((th) => (
                <div
                  key={th.id}
                  onClick={() => setSelectedTheme(th.id)}
                  className={`p-3.5 rounded-2xl border-2 cursor-pointer transition-all ${
                    selectedTheme === th.id
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs text-slate-900">{th.name}</span>
                    <div className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: th.primary }} />
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: th.accent }} />
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-snug">{th.description}</p>
                  <span className="inline-block mt-2 text-[10px] font-bold text-indigo-600 bg-white px-2 py-0.5 rounded-md border border-slate-100">
                    {th.previewLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Store Branding & Delivery Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Branding & Contact */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-emerald-600" /> Store Branding & Contact
              </h3>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Store Slogan / Tagline</label>
                <input
                  type="text"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  placeholder="e.g. Authentic Gadgets with Express Delivery"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Customer Support Phone</label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. 01711223344"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Support Email</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="support@myshop.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Physical Store Address</label>
                <textarea
                  rows={2}
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  placeholder="Store location displayed in website footer"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>
            </div>

            {/* Delivery & Payment Setup */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" /> Delivery Fees & Payment Options
              </h3>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Inside City Fee (BDT)</label>
                  <input
                    type="number"
                    value={deliveryInside}
                    onChange={(e) => setDeliveryInside(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Outside City Fee (BDT)</label>
                  <input
                    type="number"
                    value={deliveryOutside}
                    onChange={(e) => setDeliveryOutside(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Free Delivery Order Threshold (BDT)</label>
                <input
                  type="number"
                  value={freeDeliveryMin}
                  onChange={(e) => setFreeDeliveryMin(Number(e.target.value))}
                  placeholder="e.g. 2000"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">bKash Merchant/Personal</label>
                  <input
                    type="tel"
                    value={bkashNum}
                    onChange={(e) => setBkashNum(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Nagad Number</label>
                  <input
                    type="tel"
                    value={nagadNum}
                    onChange={(e) => setNagadNum(e.target.value)}
                    placeholder="01xxxxxxxxx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Custom Payment Instructions</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Mention Order ID in bKash reference"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={savingSettings}
              onClick={handleSaveWebsiteSettings}
              className="px-6 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{savingSettings ? 'Saving Configuration…' : 'Save Website Settings'}</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: COURIERS & APIS */}
      {activeTab === 'settings' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Courier Info Alert */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-xs text-amber-950 space-y-2">
            <p className="font-bold text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-700" /> Courier Integration (Bangladesh Delivery)
            </p>
            <p>
              Connect Steadfast, Pathao, RedX, or Paperfly. When you click <strong>Ship</strong> on any online order, Bizora will generate courier tracking and sync statuses in real time. Without API keys, Bizora issues a local tracking ID so self-delivery works seamlessly.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                className="font-bold bg-amber-700 text-white px-3 py-1.5 rounded-xl hover:bg-amber-800"
                onClick={async () => {
                  const res = await authFetch('/api/couriers/settings', {
                    method: 'PUT',
                    body: JSON.stringify({ courierSettings }),
                  });
                  if (res.ok) alert('Courier credentials saved to server.');
                  else alert('Save failed');
                }}
              >
                Save Couriers to Server
              </button>
            </div>
          </div>

          {/* Storefront API Key */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-sm">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" /> Storefront API Access Key
            </h3>
            <p className="text-xs text-slate-500">
              Optional shared secret for mobile apps, channel connectors, or custom external storefronts.
            </p>

            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                className="flex-1 min-w-[200px] border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono outline-none"
                placeholder={sfSettings?.ecommerce?.hasApiKey ? 'Key is set — enter new value to rotate' : 'Enter or generate secret key'}
                value={apiKeyDraft}
                onChange={(e) => setApiKeyDraft(e.target.value)}
              />
              <button
                type="button"
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800"
                onClick={async () => {
                  const key = apiKeyDraft.trim() || `sf_${Math.random().toString(36).slice(2, 14)}`;
                  const res = await authFetch('/api/storefront/settings', {
                    method: 'PUT',
                    body: JSON.stringify({ apiKey: key }),
                  });
                  if (res.ok) {
                    setApiKeyDraft(key);
                    alert('API Key saved successfully!');
                  } else alert('Save failed');
                }}
              >
                Save Key
              </button>
            </div>
          </div>

          {/* Courier Providers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {courierSettings.map((courier: any, idx: number) => (
              <div key={idx} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200/80 space-y-3">
                <div className="flex justify-between items-start">
                  <h3 className="font-black text-slate-800 text-sm flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-600" /> {courier.provider}
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={courier.enabled}
                      onChange={(e) => updateCourierSettings(courier.provider, { enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-0.5">API Key</label>
                    <input
                      type="password"
                      value={courier.apiKey || ''}
                      onChange={(e) => updateCourierSettings(courier.provider, { apiKey: e.target.value })}
                      className="w-full border border-slate-200 p-2 rounded-xl text-xs"
                      placeholder="Paste API Key"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-0.5">Secret Key</label>
                    <input
                      type="password"
                      value={courier.apiSecret || ''}
                      onChange={(e) => updateCourierSettings(courier.provider, { apiSecret: e.target.value })}
                      className="w-full border border-slate-200 p-2 rounded-xl text-xs"
                      placeholder="Paste Secret Key"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-mono font-black text-base text-slate-900">
                  Order {selectedOrder.orderNumber || selectedOrder.id}
                </h3>
                <p className="text-xs text-slate-500">{selectedOrder.date} · {selectedOrder.customerName}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                <p className="font-bold text-slate-700">Customer & Shipping:</p>
                <p className="text-slate-600">Name: {selectedOrder.customerName}</p>
                <p className="text-slate-600">Mobile: {selectedOrder.customerMobile || 'N/A'}</p>
                <p className="text-slate-600">Address: {selectedOrder.address}</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                <p className="font-bold text-slate-700 mb-2">Purchased Items:</p>
                <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                  {(selectedOrder.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between text-slate-600 border-b border-slate-100/80 last:border-0 pb-1">
                      <span>{item.qty}× {item.name} {item.variantName ? `(${item.variantName})` : ''}</span>
                      <span className="font-bold">{formatMoney(item.price * item.qty)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between font-black text-slate-900 mt-2 pt-2 border-t border-slate-200">
                  <span>Grand Total</span>
                  <span>{formatMoney(selectedOrder.total)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                  Tracking Number / Courier Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trackingNo}
                    onChange={(e) => setTrackingNo(e.target.value)}
                    className="flex-1 border border-slate-200 p-2 rounded-xl font-mono text-xs outline-none"
                    placeholder="e.g. SF-948201 or TRK-102938"
                  />
                  <button
                    type="button"
                    onClick={() => setTrackingNo(`TRK-${Math.floor(100000 + Math.random() * 900000)}`)}
                    className="bg-slate-100 px-3 rounded-xl text-slate-700 hover:bg-slate-200 text-xs font-bold"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => printPackingSlip(selectedOrder)}
                className="py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Packing Slip</span>
              </button>
              <button
                type="button"
                onClick={handleSaveOrderTracking}
                className="py-2.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OnlineShop;
