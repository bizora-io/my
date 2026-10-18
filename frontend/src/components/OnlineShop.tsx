import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, OnlineOrder } from '../contexts/DataContext';
import { authFetch } from '../lib/apiClient';
import { Globe, Truck, Package, Search, ExternalLink, Settings, Save, CheckCircle, X, Copy, ShoppingCart, Clock } from 'lucide-react';

const OnlineShop: React.FC = () => {
    const { t, formatMoney } = useSettings();
    const { onlineOrders, updateOnlineOrder, courierSettings, updateCourierSettings, products, domainSettings, updateDomainSettings, updateProduct } = useData() as any;
    
    const [activeTab, setActiveTab] = useState<'orders' | 'website' | 'settings'>('orders');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<OnlineOrder | null>(null);
    const [trackingNo, setTrackingNo] = useState('');
    const [fulfillBusy, setFulfillBusy] = useState<string | null>(null);
    const [sfSettings, setSfSettings] = useState<any>(null);
    const [apiKeyDraft, setApiKeyDraft] = useState('');
    const [slugHint, setSlugHint] = useState('');
    const [themes, setThemes] = useState<any[]>([]);
    const [selectedTheme, setSelectedTheme] = useState('minimal');
    const [published, setPublished] = useState(true);
    const [tagline, setTagline] = useState('');
    const [subdomainInput, setSubdomainInput] = useState('');
    const [customDomainInput, setCustomDomainInput] = useState('');
    const [siteBusy, setSiteBusy] = useState(false);


    useEffect(() => {
      if (activeTab !== 'settings' && activeTab !== 'website') return;
      authFetch('/api/storefront/settings').then(async (r) => {
        if (!r.ok) return;
        const d = await r.json();
        setSfSettings(d);
        setThemes(d.themes || []);
        setSelectedTheme(d.ecommerce?.themeId || 'minimal');
        setPublished(d.ecommerce?.published !== false);
        setTagline(d.ecommerce?.tagline || '');
        const sub = d.domainSettings?.subdomain || domainSettings?.subdomain || '';
        setSlugHint(sub);
        setSubdomainInput(String(sub).replace(/\.bizora\.com$/i, ''));
        setCustomDomainInput(d.domainSettings?.customDomain || '');
      }).catch(() => null);
      if (!themes.length) {
        authFetch('/api/storefront/themes').then(async (r) => {
          if (r.ok) {
            const d = await r.json();
            setThemes(d.themes || []);
          }
        }).catch(() => null);
      }
    }, [activeTab]);

    const onlineProductCount = (products || []).filter((p: any) => p.sellOnline && !p.isDeleted).length;
    const pendingCount = (onlineOrders || []).filter((o: any) => o.status === 'Pending').length;

    const refreshOrders = async () => {
      try {
        const r = await authFetch('/api/online-orders');
        if (!r.ok) return;
        const d = await r.json();
        const list = d.onlineOrders || d.orders || d.items || [];
        if (Array.isArray(list) && list.length) {
          // soft: re-fetch triggers DataContext if we dispatch
          window.dispatchEvent(new CustomEvent('bizora-refresh-online-orders', { detail: list }));
        }
        // fallback: page reload of list via context is hard — map updateOnlineOrder not list set
        alert(`Loaded ${list.length || onlineOrders.length} orders (sync from server)`);
      } catch { /* ignore */ }
    };

    const enableAllSellOnline = async () => {
      const list = (products || []).filter((p: any) => !p.isDeleted && !p.sellOnline && (Number(p.stock) || 0) > 0);
      if (!list.length) {
        alert('All in-stock products already online or none found');
        return;
      }
      if (!confirm(`Enable Sell online on ${list.length} in-stock products?`)) return;
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
        } catch { /* skip */ }
      }
      alert(`Enabled on ${n} products`);
    };


    const handleFulfill = async (orderId: string, asShipped = false) => {
      setFulfillBusy(orderId);
      try {
        const res = await authFetch('/api/storefront/fulfill', {
          method: 'POST',
          body: JSON.stringify({ orderId, status: asShipped ? 'Shipped' : 'Processing' }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Fulfill failed');
        updateOnlineOrder(orderId, {
          status: data.status || 'Processing',
          // @ts-ignore
          fulfilledTransactionId: data.transactionId,
        } as any);
        alert(data.alreadyFulfilled ? 'Already fulfilled' : `Fulfilled → sale ${data.transactionId}`);
      } catch (e: any) {
        alert(e?.message || 'Fulfill failed');
      } finally {
        setFulfillBusy(null);
      }
    };

    const DELIVERY_OPTS = [
      'Processing', 'PickedUp', 'InTransit', 'OutForDelivery', 'Delivered', 'Failed', 'Returned',
    ];

    const handleSyncCourier = async (orderId: string) => {
      setFulfillBusy(orderId);
      try {
        const res = await authFetch('/api/couriers/sync-status', {
          method: 'POST',
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Sync failed');
        updateOnlineOrder(orderId, {
          status: data.status,
          deliveryStatus: data.deliveryStatus,
          deliveryTimeline: data.timeline,
        } as any);
        alert(`Synced: ${data.deliveryStatus}${data.rawStatus ? ` (${data.rawStatus})` : ''}`);
      } catch (e: any) {
        alert(e?.message || 'Sync failed');
      } finally {
        setFulfillBusy(null);
      }
    };

    const handleDeliveryStatus = async (orderId: string) => {

      const current = (onlineOrders.find((o: any) => o.id === orderId) as any)?.deliveryStatus || '';
      const pick = window.prompt(
        `Delivery status:\n${DELIVERY_OPTS.join(', ')}`,
        current || 'InTransit'
      );
      if (!pick || !DELIVERY_OPTS.includes(pick) && pick !== 'Pending' && pick !== 'Cancelled') {
        if (pick) alert('Invalid status');
        return;
      }
      setFulfillBusy(orderId);
      try {
        const res = await authFetch('/api/couriers/delivery-status', {
          method: 'POST',
          body: JSON.stringify({ orderId, deliveryStatus: pick }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Update failed');
        updateOnlineOrder(orderId, {
          status: data.status,
          deliveryStatus: data.deliveryStatus,
          deliveryTimeline: data.timeline,
        } as any);
      } catch (e: any) {
        alert(e?.message || 'Failed');
      } finally {
        setFulfillBusy(null);
      }
    };

    const handleShip = async (orderId: string, provider?: string) => {
      setFulfillBusy(orderId);
      try {
        const enabled = (courierSettings || []).filter((c: any) => c.enabled);
        const pick =
          provider ||
          enabled.find((c: any) => c.provider !== 'Manual')?.provider ||
          'Manual';
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
        alert(
          data.mode === 'live'
            ? `Shipped via ${data.provider}: ${data.trackingNumber}`
            : `Shipped (${data.provider}): ${data.trackingNumber}\n${data.message || ''}`
        );
      } catch (e: any) {
        alert(e?.message || 'Ship failed');
      } finally {
        setFulfillBusy(null);
      }
    };


    const filteredOrders = onlineOrders.filter(o => 
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) || 
        o.customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleStatusUpdate = (id: string, status: OnlineOrder['status']) => {
        updateOnlineOrder(id, { status });
    };

    const openOrderDetails = (order: OnlineOrder) => {
        setSelectedOrder(order);
        setTrackingNo(order.trackingNumber || '');
    };

    const handleSaveOrder = () => {
        if (selectedOrder) {
            updateOnlineOrder(selectedOrder.id, { trackingNumber: trackingNo });
            // If adding tracking, assume shipped if previously pending/processing
            if (trackingNo && (selectedOrder.status === 'Pending' || selectedOrder.status === 'Processing')) {
                updateOnlineOrder(selectedOrder.id, { status: 'Shipped' });
            }
            setSelectedOrder(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 flex-wrap">
                <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
                    <Globe className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('Online Shop')}</h1>
                    <p className="text-slate-500 text-sm">Self-hosted online store · no Shopify/Woo required · orders in this app</p>
                </div>
                <div className="ml-auto text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full">
                    {onlineProductCount} products online
                </div>
            </div>

            <div className="flex border-b border-slate-200 overflow-x-auto">
                <button 
                    onClick={() => setActiveTab('orders')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'orders' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <ShoppingCart className="w-4 h-4" /> Orders
                </button>
                <button 
                    onClick={() => setActiveTab('website')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'website' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Globe className="w-4 h-4" /> Website
                </button>
                <button 
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'settings' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Settings className="w-4 h-4" /> Courier & API
                </button>
            </div>

            {activeTab === 'orders' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex flex-wrap gap-2 mb-4 items-center">
                        {pendingCount > 0 && (
                          <span className="text-xs font-black uppercase bg-amber-100 text-amber-800 px-2 py-1 rounded-full">
                            {pendingCount} pending
                          </span>
                        )}
                        <button type="button" onClick={refreshOrders} className="text-xs font-bold border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                          Refresh orders
                        </button>
                    </div>
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search Order ID, Customer..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {filteredOrders.map(order => (
                            <div key={order.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between gap-4">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                                        <Package className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-slate-800 text-lg">{order.id}</h3>
                                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-500 border border-slate-200">{order.platform}</span>
                                        </div>
                                        <p className="text-sm font-medium text-slate-700">{order.customerName}</p>
                                        <p className="text-xs text-slate-500">{order.date} • {order.items.length} Items</p>
                                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1"><Truck className="w-3 h-3"/> {order.address}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-3">
                                    <div className="text-right">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            order.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700' :
                                            order.status === 'Cancelled' ? 'bg-red-100 text-red-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                            {order.status}
                                        </span>
                                        <p className="font-bold text-slate-800 mt-2 text-lg">{formatMoney(order.total)}</p>
                                        {(order as any).paymentMethod && (
                                          <p className="text-[10px] font-bold uppercase text-slate-500 mt-1">
                                            Pay: {(order as any).paymentMethod}
                                            {(order as any).paymentStatus ? ` · ${(order as any).paymentStatus}` : ''}
                                          </p>
                                        )}
                                    </div>
                                    
                                    <div className="flex gap-2">
                                        <select 
                                            value={order.status}
                                            onChange={(e) => handleStatusUpdate(order.id, e.target.value as any)}
                                            className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                                        >
                                            <option value="Pending">Pending</option>
                                            <option value="Processing">Processing</option>
                                            <option value="Shipped">Shipped</option>
                                            <option value="Delivered">Delivered</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                        {(order.status === 'Pending' || order.status === 'Processing') && !(order as any).fulfilledTransactionId && (
                                          <button
                                            type="button"
                                            disabled={fulfillBusy === order.id}
                                            onClick={() => handleFulfill(order.id, false)}
                                            className="text-xs font-bold bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                                          >
                                            {fulfillBusy === order.id ? '…' : 'Fulfill (stock)'}
                                          </button>
                                        )}
                                        {order.status !== 'Shipped' && order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                                          <button
                                            type="button"
                                            disabled={fulfillBusy === order.id}
                                            onClick={() => {
                                              const enabled = (courierSettings || []).filter((c: any) => c.enabled).map((c: any) => c.provider);
                                              const list = enabled.length ? enabled : ['Manual'];
                                              const pick = list.length === 1 ? list[0] : window.prompt(`Courier: ${list.join(', ')}`, list[0] || 'Manual');
                                              if (pick) handleShip(order.id, pick);
                                            }}
                                            className="text-xs font-bold bg-amber-600 text-white px-2 py-1 rounded hover:bg-amber-700 disabled:opacity-50"
                                          >
                                            Ship
                                          </button>
                                        )}
                                        {(order as any).fulfilledTransactionId && (
                                          <span className="text-[10px] font-bold text-emerald-600">Sale linked</span>
                                        )}
                                        {order.trackingNumber && (
                                          <span className="text-[10px] font-mono text-slate-500">{order.courier}: {order.trackingNumber}</span>
                                        )}
                                        <button 
                                            onClick={() => openOrderDetails(order)}
                                            className="text-xs bg-slate-900 text-white px-3 py-1 rounded hover:bg-slate-800"
                                        >
                                            Details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredOrders.length === 0 && (
                            <div className="text-center p-8 text-slate-400">No orders found.</div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-950">
                    <p className="font-bold mb-1 flex items-center gap-2"><Truck className="w-4 h-4" /> Courier integration</p>
                    <p className="mb-2">Enable a provider, paste API keys (optional). <strong>Ship</strong> on an order creates tracking and marks Shipped. Without keys, Bizora still issues a local tracking ID (own delivery works offline).</p>
                    <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="text-xs font-bold bg-amber-700 text-white px-3 py-1.5 rounded-lg"
                      onClick={async () => {
                        const res = await authFetch('/api/couriers/settings', {
                          method: 'PUT',
                          body: JSON.stringify({ courierSettings }),
                        });
                        if (res.ok) alert('Courier settings saved to server');
                        else alert('Save failed');
                      }}
                    >
                      Save courier settings to server
                    </button>
                    <button
                      type="button"
                      className="text-xs font-bold border border-amber-700 text-amber-900 px-3 py-1.5 rounded-lg"
                      onClick={async () => {
                        const res = await authFetch('/api/couriers/webhook-info');
                        const d = await res.json().catch(() => ({}));
                        if (!res.ok) return alert('Could not load webhook URLs');
                        const msg = [
                          'Steadfast: ' + d.endpoints?.steadfast,
                          'RedX: ' + d.endpoints?.redx,
                          'Pathao: ' + d.endpoints?.pathao,
                          'Paperfly: ' + d.endpoints?.paperfly,
                          '',
                          d.header,
                          d.note,
                        ].join('\n');
                        alert(msg);
                        try {
                          await navigator.clipboard.writeText(d.endpoints?.steadfast || '');
                        } catch { /* ignore */ }
                      }}
                    >
                      Webhook URLs
                    </button>
                    </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Globe className="w-4 h-4 text-blue-600" /> Storefront API</h3>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg"
                        onClick={async () => {
                          const res = await authFetch('/api/storefront/settings', {
                            method: 'PUT',
                            body: JSON.stringify({ ecommerce: { published: true } }),
                          });
                          if (res.ok) alert('Storefront published — catalog is public');
                          else alert('Publish failed');
                        }}
                      >
                        Publish storefront
                      </button>
                      <button
                        type="button"
                        className="text-xs font-bold border border-slate-300 px-3 py-1.5 rounded-lg"
                        onClick={async () => {
                          const res = await authFetch('/api/storefront/settings', {
                            method: 'PUT',
                            body: JSON.stringify({ ecommerce: { published: false } }),
                          });
                          if (res.ok) alert('Storefront unpublished');
                          else alert('Failed');
                        }}
                      >
                        Unpublish
                      </button>
                      <button
                        type="button"
                        className="text-xs font-bold border border-indigo-300 text-indigo-700 px-3 py-1.5 rounded-lg"
                        onClick={() => {
                          const slug = slugHint || domainSettings?.subdomain || '';
                          if (!slug) return alert('Set subdomain first');
                          const base = (import.meta as any).env?.VITE_API_URL || '';
                          window.open(`${base}/api/storefront/${encodeURIComponent(String(slug).replace(/\.bizora\.com$/i,''))}/catalog`, '_blank');
                        }}
                      >
                        Preview catalog JSON
                      </button>
                      <button
                        type="button"
                        className="text-xs font-bold border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-lg"
                        onClick={() => {
                          const slug = String(slugHint || domainSettings?.subdomain || '').replace(/\.bizora\.com$/i, '');
                          if (!slug) return alert('Set subdomain first');
                          // Public SPA route if available
                          window.open(`/#/store/${encodeURIComponent(slug)}`, '_blank');
                        }}
                      >
                        Open public shop
                      </button>
                    </div>
                    <p className="text-sm text-slate-500">
                        Self-hosted storefront API. Slug:{' '}
                        <span className="font-mono font-bold text-indigo-700">{slugHint || domainSettings?.subdomain || 'your-subdomain'}</span>
                    </p>
                    <div className="bg-slate-50 rounded-lg p-3 text-xs font-mono text-slate-700 space-y-1">
                        <p>GET /api/storefront/{'{slug}'}/catalog</p>
                        <p>POST /api/storefront/{'{slug}'}/orders</p>
                        <p className="text-slate-400">Header x-storefront-key (if API key set)</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">API key</label>
                        <div className="flex gap-2 flex-wrap">
                            <input
                                type="text"
                                className="flex-1 min-w-[160px] border rounded-lg px-3 py-2 text-sm"
                                placeholder={sfSettings?.ecommerce?.hasApiKey ? 'Key set — enter to rotate' : 'Optional secret for connectors'}
                                value={apiKeyDraft}
                                onChange={(e) => setApiKeyDraft(e.target.value)}
                            />
                            <button
                                type="button"
                                className="px-3 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg"
                                onClick={async () => {
                                    const key = apiKeyDraft.trim() || `sf_${Math.random().toString(36).slice(2, 12)}`;
                                    const res = await authFetch('/api/storefront/settings', {
                                        method: 'PUT',
                                        body: JSON.stringify({ apiKey: key }),
                                    });
                                    if (res.ok) {
                                        setApiKeyDraft(key);
                                        alert('API key saved — copy it now.');
                                    } else alert('Save failed');
                                }}
                            >
                                Save key
                            </button>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500">
                        Enable <strong>Sell online</strong> on products for catalog. Use <strong>Fulfill (stock)</strong> on orders to create a Sale and deduct FEFO inventory.
                    </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {courierSettings.map((courier, idx) => (
                        <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Truck className="w-5 h-5 text-slate-500" /> {courier.provider}
                                </h3>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={courier.enabled} 
                                        onChange={(e) => updateCourierSettings(courier.provider, { enabled: e.target.checked })} 
                                        className="sr-only peer" 
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">API Key</label>
                                    <input 
                                        type="password" 
                                        value={courier.apiKey}
                                        onChange={(e) => updateCourierSettings(courier.provider, { apiKey: e.target.value })}
                                        className="w-full border p-2 rounded text-sm"
                                        placeholder="Paste API Key"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Secret Key</label>
                                    <input 
                                        type="password" 
                                        value={courier.apiSecret}
                                        onChange={(e) => updateCourierSettings(courier.provider, { apiSecret: e.target.value })}
                                        className="w-full border p-2 rounded text-sm"
                                        placeholder="Paste Secret Key"
                                    />
                                </div>
                                {courier.provider === 'Paperfly' && (
                                  <>
                                    <p className="text-[10px] text-slate-500">API Key = Paperfly merchant key. Username + password required for live create.</p>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                                      <input
                                        type="text"
                                        value={(courier as any).username || ''}
                                        onChange={(e) => updateCourierSettings(courier.provider, { username: e.target.value } as any)}
                                        className="w-full border p-2 rounded text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                      <input
                                        type="password"
                                        value={(courier as any).password || ''}
                                        onChange={(e) => updateCourierSettings(courier.provider, { password: e.target.value } as any)}
                                        className="w-full border p-2 rounded text-sm"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pickup label (optional)</label>
                                      <input
                                        type="text"
                                        value={(courier as any).storeId || ''}
                                        onChange={(e) => updateCourierSettings(courier.provider, { storeId: e.target.value } as any)}
                                        className="w-full border p-2 rounded text-sm"
                                        placeholder="Store / pickup name"
                                      />
                                    </div>
                                  </>
                                )}
                                {courier.provider === 'RedX' && (
                                  <>
                                    <p className="text-[10px] text-slate-500">API Key = RedX JWT (API-ACCESS-TOKEN). Optional: Area ID + Pickup store ID.</p>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Area ID</label>
                                      <input
                                        type="text"
                                        value={(courier as any).areaId || ''}
                                        onChange={(e) => updateCourierSettings(courier.provider, { areaId: e.target.value } as any)}
                                        className="w-full border p-2 rounded text-sm"
                                        placeholder="delivery_area_id"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Pickup store ID</label>
                                      <input
                                        type="text"
                                        value={(courier as any).storeId || ''}
                                        onChange={(e) => updateCourierSettings(courier.provider, { storeId: e.target.value } as any)}
                                        className="w-full border p-2 rounded text-sm"
                                        placeholder="pickup_store_id"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Base URL</label>
                                      <input
                                        type="text"
                                        value={(courier as any).baseUrl || ''}
                                        onChange={(e) => updateCourierSettings(courier.provider, { baseUrl: e.target.value } as any)}
                                        className="w-full border p-2 rounded text-sm"
                                        placeholder="https://openapi.redx.com.bd/v1.0.0-beta"
                                      />
                                    </div>
                                  </>
                                )}
                                {courier.provider === 'Pathao' && (
                                  <>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username (email)</label>
                                      <input
                                        type="text"
                                        value={(courier as any).username || ''}
                                        onChange={(e) => updateCourierSettings(courier.provider, { username: e.target.value } as any)}
                                        className="w-full border p-2 rounded text-sm"
                                        placeholder="merchant@email.com"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Password</label>
                                      <input
                                        type="password"
                                        value={(courier as any).password || ''}
                                        onChange={(e) => updateCourierSettings(courier.provider, { password: e.target.value } as any)}
                                        className="w-full border p-2 rounded text-sm"
                                        placeholder="Pathao password"
                                      />
                                    </div>
                                    <div>
                                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Store ID</label>
                                      <input
                                        type="text"
                                        value={(courier as any).storeId || ''}
                                        onChange={(e) => updateCourierSettings(courier.provider, { storeId: e.target.value } as any)}
                                        className="w-full border p-2 rounded text-sm"
                                        placeholder="Pathao store_id"
                                      />
                                    </div>
                                    <button
                                      type="button"
                                      className="text-xs font-bold bg-slate-800 text-white px-3 py-1.5 rounded-lg"
                                      onClick={async () => {
                                        const res = await authFetch('/api/couriers/pathao/test-auth', {
                                          method: 'POST',
                                          body: JSON.stringify({
                                            apiKey: courier.apiKey,
                                            apiSecret: courier.apiSecret,
                                            username: (courier as any).username,
                                            password: (courier as any).password,
                                            baseUrl: (courier as any).baseUrl,
                                          }),
                                        });
                                        const d = await res.json().catch(() => ({}));
                                        if (res.ok) alert('Pathao OK: token issued');
                                        else alert(d.error || 'Auth failed');
                                      }}
                                    >
                                      Test Pathao auth
                                    </button>
                                  </>
                                )}
                                <button className="w-full bg-slate-100 text-slate-600 py-2 rounded text-sm font-bold hover:bg-slate-200 transition-colors">
                                    Test Connection
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                </div>
            )}

            {/* Order Details Modal */}
            {selectedOrder && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Order {selectedOrder.id}</h3>
                                <p className="text-sm text-slate-500">{selectedOrder.date}</p>
                            </div>
                            <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <p className="text-sm font-medium text-slate-700 mb-1">Items</p>
                                {selectedOrder.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm text-slate-600 border-b border-slate-100 last:border-0 py-1">
                                        <span>{item.qty}x {item.name}</span>
                                        <span>{formatMoney(item.price * item.qty)}</span>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm font-bold text-slate-800 mt-2 pt-2 border-t border-slate-200">
                                    <span>Total</span>
                                    <span>{formatMoney(selectedOrder.total)}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tracking Number</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={trackingNo}
                                        onChange={e => setTrackingNo(e.target.value)}
                                        className="flex-1 border p-2 rounded-lg font-mono text-sm"
                                        placeholder="Enter tracking number"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(trackingNo);
                                            // Quick animation or tooltip could go here, for simplicity:
                                            alert("Copied!");
                                        }}
                                        className="bg-slate-100 px-3 rounded-lg text-slate-600 hover:bg-slate-200 transition-colors flex items-center justify-center min-w-[40px]"
                                        title="Copy Tracking Number"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button 
                                        onClick={() => setTrackingNo(`TRK-${Math.floor(Math.random() * 1000000)}`)}
                                        className="bg-slate-100 px-3 rounded-lg text-slate-600 hover:bg-slate-200 text-xs font-bold"
                                    >
                                        Generate
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSaveOrder} className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
                            Save Changes
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OnlineShop;