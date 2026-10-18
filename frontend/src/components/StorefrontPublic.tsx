import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShoppingCart, Package, CheckCircle, X } from 'lucide-react';

/**
 * Public customer-facing storefront — loads theme + catalog from API.
 * No auth required. Orders POST to same slug.
 */
const StorefrontPublic: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ customerName: '', address: '', mobile: '', paymentMethod: 'COD' });
  const [placing, setPlacing] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [showTrack, setShowTrack] = useState(false);
  const [trackForm, setTrackForm] = useState({ mobile: '', orderId: '' });
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackErr, setTrackErr] = useState('');


  const apiBase = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${apiBase}/api/storefront/${encodeURIComponent(slug)}/catalog`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Shop unavailable');
        setShop(d.shop);
        setProducts(d.products || []);
        setError('');
      })
      .catch((e) => setError(e.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, [slug, apiBase]);

  const theme = shop?.theme || { primary: '#0f172a', accent: '#6366f1', heroStyle: 'centered', name: 'Minimal' };
  const cartCount: number = (Object.values(cart) as number[]).reduce((a, b) => a + b, 0);
  const cartLines = products.filter((p) => cart[p.id] > 0);
  const cartTotal = cartLines.reduce((s, p) => s + (Number(p.salePrice) || 0) * (cart[p.id] || 0), 0);

  const placeOrder = async () => {
    if (!form.customerName.trim() || !form.address.trim() || !cartLines.length) {
      alert('Name, address and at least one item required');
      return;
    }
    setPlacing(true);
    try {
      const res = await fetch(`${apiBase}/api/storefront/${encodeURIComponent(slug!)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          address: form.address,
          mobile: form.mobile,
          platform: 'Bizora',
          paymentMethod: form.paymentMethod || 'COD',
          items: cartLines.map((p) => ({ productId: p.id, qty: cart[p.id], price: p.salePrice })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Order failed');
      setDone(data.order?.id || 'ok');
      setCart({});
      setCheckout(false);
    } catch (e: any) {
      alert(e.message || 'Order failed');
    } finally {
      setPlacing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 font-semibold">
        Loading shop…
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center p-8">
          <p className="text-rose-600 font-bold text-lg">{error}</p>
          <p className="text-slate-400 text-sm mt-2">Check subdomain or publish status in Bizora Online Shop.</p>
        </div>
      </div>
    );
  }

  const isDark = theme.id === 'tech';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{ backgroundColor: isDark ? 'rgba(2,6,23,0.9)' : 'rgba(255,255,255,0.92)', borderColor: isDark ? '#1e293b' : '#e2e8f0' }}
      >
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-black text-lg tracking-tight" style={{ color: theme.primary }}>{shop?.name}</h1>
            <p className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{shop?.tagline}</p>
          </div>
          <button
            type="button"
            onClick={() => { setShowTrack(true); setTrackResult(null); setTrackErr(''); }}
            className={`text-xs font-bold px-3 py-2 rounded-full border ${isDark ? 'border-slate-700' : 'border-slate-200'}`}
          >
            Track order
          </button>
          <button
            type="button"
            onClick={() => setCheckout(true)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-bold shadow-lg"
            style={{ backgroundColor: theme.accent }}
          >
            <ShoppingCart className="w-4 h-4" />
            Cart
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white text-[10px] font-black flex items-center justify-center" style={{ color: theme.accent }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section
        className="px-4 py-12 md:py-16"
        style={{
          background:
            theme.heroStyle === 'banner'
              ? `linear-gradient(135deg, ${theme.primary} 0%, ${theme.accent} 100%)`
              : isDark
                ? theme.primary
                : `${theme.accent}12`,
        }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <h2 className={`text-3xl md:text-4xl font-black mb-2 ${theme.heroStyle === 'banner' || isDark ? 'text-white' : ''}`} style={theme.heroStyle !== 'banner' && !isDark ? { color: theme.primary } : undefined}>
            {shop?.name}
          </h2>
          <p className={`text-sm md:text-base max-w-lg mx-auto ${theme.heroStyle === 'banner' || isDark ? 'text-white/80' : 'text-slate-600'}`}>
            {shop?.tagline || 'Order online — synced with our store'}
          </p>
        </div>
      </section>

      {/* Products */}
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {products.map((p) => (
            <div
              key={p.id}
              className={`rounded-xl border overflow-hidden flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <div className={`aspect-square flex items-center justify-center ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                {p.image ? (
                  <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Package className={`w-10 h-10 ${isDark ? 'text-slate-600' : 'text-slate-300'}`} />
                )}
              </div>
              <div className="p-3 flex-1 flex flex-col">
                <h3 className="font-bold text-sm line-clamp-2 flex-1">{p.name}</h3>
                <p className="text-xs mt-1 opacity-60">{p.stock > 0 ? `In stock · ${p.unit}` : 'Out of stock'}</p>
                <div className="flex items-center justify-between mt-2 gap-2">
                  <span className="font-black text-sm" style={{ color: theme.accent }}>
                    {shop?.currency || ''} {Number(p.salePrice).toFixed(0)}
                  </span>
                  <button
                    type="button"
                    disabled={p.stock <= 0}
                    onClick={() => setCart((c) => ({ ...c, [p.id]: (c[p.id] || 0) + 1 }))}
                    className="text-[10px] font-black uppercase px-2 py-1 rounded-md text-white disabled:opacity-40"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {!products.length && (
          <p className="text-center text-slate-400 py-16">No products listed yet. Mark items Sell online in POS.</p>
        )}
      </main>

      {/* Checkout modal */}
      {checkout && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className={`w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-5 max-h-[90vh] overflow-y-auto ${isDark ? 'bg-slate-900 text-white' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Checkout</h3>
              <button type="button" onClick={() => setCheckout(false)}><X className="w-5 h-5 opacity-50" /></button>
            </div>
            {cartLines.length === 0 ? (
              <p className="text-sm opacity-60 py-6 text-center">Cart is empty</p>
            ) : (
              <>
                <ul className="space-y-2 mb-4 text-sm">
                  {cartLines.map((p) => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <span>{p.name} × {cart[p.id]}</span>
                      <span className="font-bold">{(p.salePrice * cart[p.id]).toFixed(0)}</span>
                    </li>
                  ))}
                </ul>
                <p className="font-black text-right mb-4" style={{ color: theme.accent }}>Total {cartTotal.toFixed(0)}</p>
                <div className="space-y-2 mb-4">
                  <input className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="Your name" value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                  <input className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="Mobile" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
                  <textarea className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="Delivery address" rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="mb-4">
                  <p className="text-xs font-bold uppercase opacity-60 mb-2">Payment</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(shop?.paymentOptions || [
                      { id: 'COD', label: 'Cash on delivery' },
                      { id: 'bKash', label: 'bKash' },
                      { id: 'Nagad', label: 'Nagad' },
                      { id: 'Online', label: 'Card / Online' },
                    ]).map((opt: any) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setForm({ ...form, paymentMethod: opt.id })}
                        className={`text-left text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                          form.paymentMethod === opt.id
                            ? 'border-current'
                            : isDark ? 'border-slate-700 opacity-70' : 'border-slate-200 opacity-80'
                        }`}
                        style={form.paymentMethod === opt.id ? { borderColor: theme.accent, color: theme.accent } : undefined}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {form.paymentMethod !== 'COD' && (
                    <p className="text-[10px] opacity-60 mt-2">Pay on delivery confirmation / merchant will share number if needed.</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={placing}
                  onClick={placeOrder}
                  className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-50"
                  style={{ backgroundColor: theme.accent }}
                >
                  {placing ? 'Placing…' : 'Place order'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {done && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm text-center text-slate-800 shadow-xl">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="font-bold text-lg">Order received!</h3>
            <p className="text-sm text-slate-500 mt-1">Ref: {String(done).slice(-8)} — use Track order with your mobile anytime.</p>
            <button type="button" className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm" onClick={() => setDone(null)}>OK</button>
          </div>
        </div>
      )}

      {showTrack && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className={`w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-5 ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg">Track your order</h3>
              <button type="button" onClick={() => setShowTrack(false)}><X className="w-5 h-5 opacity-50" /></button>
            </div>
            <div className="space-y-2 mb-3">
              <input className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="Mobile number" value={trackForm.mobile}
                onChange={(e) => setTrackForm({ ...trackForm, mobile: e.target.value })} />
              <input className="w-full border rounded-lg px-3 py-2 text-sm bg-transparent" placeholder="Order ID (optional)" value={trackForm.orderId}
                onChange={(e) => setTrackForm({ ...trackForm, orderId: e.target.value })} />
            </div>
            <button
              type="button"
              className="w-full py-2.5 rounded-xl text-white font-bold text-sm mb-3"
              style={{ backgroundColor: theme.accent }}
              onClick={async () => {
                setTrackErr('');
                setTrackResult(null);
                try {
                  const q = new URLSearchParams();
                  if (trackForm.mobile) q.set('mobile', trackForm.mobile);
                  if (trackForm.orderId) q.set('orderId', trackForm.orderId);
                  const res = await fetch(`${apiBase}/api/storefront/${encodeURIComponent(slug!)}/orders/track?${q}`);
                  const d = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(d.error || 'Not found');
                  setTrackResult(d.order);
                } catch (e: any) {
                  setTrackErr(e.message || 'Not found');
                }
              }}
            >
              Look up
            </button>
            {trackErr && <p className="text-sm text-rose-500">{trackErr}</p>}
            {trackResult && (
              <div className={`text-sm rounded-xl p-3 border space-y-3 ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <div>
                  <p className="font-bold text-base" style={{ color: theme.accent }}>
                    {trackResult.deliveryStatus || trackResult.status}
                  </p>
                  <p className="opacity-70 text-xs mt-1">#{String(trackResult.id).slice(-8)} · {trackResult.date}</p>
                  <p className="mt-1">Total: {trackResult.total} · {trackResult.paymentMethod}</p>
                  {trackResult.trackingNumber && (
                    <p className="mt-1 text-xs font-mono">{trackResult.courier}: {trackResult.trackingNumber}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase opacity-50 mb-2">Delivery timeline</p>
                  <ol className="space-y-2 border-l-2 pl-3" style={{ borderColor: theme.accent }}>
                    {(trackResult.deliveryTimeline || []).map((ev: any, idx: number) => (
                      <li key={idx} className="relative">
                        <span
                          className="absolute -left-[1.15rem] top-1 w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: theme.accent }}
                        />
                        <p className="font-semibold text-xs">{ev.status}</p>
                        <p className="text-[10px] opacity-60">
                          {ev.at ? String(ev.at).replace('T', ' ').slice(0, 16) : ''}
                          {ev.note ? ` · ${ev.note}` : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
                <ul className="space-y-1 text-xs opacity-80 border-t pt-2">
                  {(trackResult.items || []).map((i: any, idx: number) => (
                    <li key={idx}>{i.name} × {i.qty}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="text-center text-xs py-8 text-slate-500 border-t border-slate-200/50 mt-12 space-y-1">
        <p>© {new Date().getFullYear()} {shop?.businessName || 'Bizora Store'}. All rights reserved.</p>
        <p className="text-[11px] text-slate-400">
          Powered by <a href="#/" className="hover:text-indigo-600 font-semibold underline underline-offset-2">Bizora ERP</a> · Independent Storefront
        </p>
      </footer>
    </div>
  );
};

export default StorefrontPublic;
