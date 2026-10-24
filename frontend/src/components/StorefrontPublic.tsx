import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShoppingCart,
  Package,
  CheckCircle,
  X,
  Search,
  Truck,
  ShieldCheck,
  RefreshCw,
  Phone,
  MapPin,
  Tag,
  Clock,
  Trash2,
  Plus,
  Minus,
  Eye,
  CreditCard,
  Building,
  Check,
  ChevronDown
} from 'lucide-react';
import { SEOHead } from './common/SEOHead';

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  stock: number;
  sku?: string | null;
}

interface Product {
  id: string;
  name: string;
  description: string;
  salePrice: number;
  comparePrice?: number;
  stock: number;
  image: string | null;
  images: string[];
  category: string;
  brand?: string | null;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  variants: ProductVariant[];
}

interface ShopDetails {
  id: string;
  name: string;
  slug: string;
  currency: string;
  theme: {
    id: string;
    primary: string;
    accent: string;
    heroStyle: 'centered' | 'split' | 'banner';
    name: string;
  };
  published: boolean;
  host: string;
  customDomain: string | null;
  subdomain: string | null;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  logo: string | null;
  deliverySettings: {
    insideCityFee: number;
    outsideCityFee: number;
    freeDeliveryThreshold: number;
  };
  paymentOptions: Array<{ id: string; label: string; enabled?: boolean }>;
  bkashNumber?: string;
  nagadNumber?: string;
  paymentInstructions?: string;
}

interface CartItem {
  productId: string;
  qty: number;
  variantId?: string | null;
}

interface RecentOrderRecord {
  orderId: string;
  orderNumber: string;
  date: string;
  total: number;
  status: string;
}

const StorefrontPublic: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name-asc'>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  // Cart & Drawer State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Product Detail Modal State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewImageIdx, setQuickViewImageIdx] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [quickViewQty, setQuickViewQty] = useState(1);

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [deliveryRegion, setDeliveryRegion] = useState<'inside_city' | 'outside_city'>('inside_city');
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [trxId, setTrxId] = useState('');
  const [senderMobile, setSenderMobile] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Order Completed Modal
  const [placedOrder, setPlacedOrder] = useState<any>(null);

  // Tracking Modal State
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackLookupMobile, setTrackLookupMobile] = useState('');
  const [trackLookupOrderId, setTrackLookupOrderId] = useState('');
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState('');
  const [trackLoading, setTrackLoading] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);

  // Recent Orders (stored in localStorage)
  const [recentOrders, setRecentOrders] = useState<RecentOrderRecord[]>([]);

  const apiBase = ((import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '');

  // Load Catalog
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetch(`${apiBase}/api/storefront/${encodeURIComponent(slug)}/catalog`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || 'Shop unavailable');
        setShop(d.shop);
        setProducts(d.products || []);
        setCategories(d.categories || []);
        setError('');
      })
      .catch((e) => setError(e.message || 'Failed to load shop catalog'))
      .finally(() => setLoading(false));
  }, [slug, apiBase]);

  // Load Recent Orders from LocalStorage
  useEffect(() => {
    if (!slug) return;
    try {
      const saved = localStorage.getItem(`bizora_recent_orders_${slug}`);
      if (saved) {
        setRecentOrders(JSON.parse(saved));
      }
    } catch { /* ignore storage errors */ }
  }, [slug]);

  const saveRecentOrder = (order: any) => {
    if (!slug) return;
    try {
      const record: RecentOrderRecord = {
        orderId: order.id,
        orderNumber: order.orderNumber || order.id,
        date: order.date || new Date().toISOString().slice(0, 10),
        total: order.total || 0,
        status: order.status || 'Pending',
      };
      const updated = [record, ...recentOrders.filter((r) => r.orderId !== order.id)].slice(0, 8);
      setRecentOrders(updated);
      localStorage.setItem(`bizora_recent_orders_${slug}`, JSON.stringify(updated));
    } catch { /* ignore storage errors */ }
  };

  const theme = shop?.theme || {
    id: 'minimal',
    primary: '#0f172a',
    accent: '#2563eb',
    heroStyle: 'centered',
    name: 'Minimal',
  };
  const isDark = theme.id === 'tech';

  // Products Map for rapid lookups
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) {
      map.set(p.id, p);
    }
    return map;
  }, [products]);

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let list = [...products];

    if (selectedCategory !== 'All') {
      list = list.filter((p) => (p.category || 'General').toLowerCase() === selectedCategory.toLowerCase());
    }

    if (inStockOnly) {
      list = list.filter((p) => p.stock > 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q)) ||
          (p.category && p.category.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'price-asc') {
      list.sort((a, b) => a.salePrice - b.salePrice);
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => b.salePrice - a.salePrice);
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [products, selectedCategory, inStockOnly, searchQuery, sortBy]);

  // Cart Calculations
  const cartLines = useMemo(() => {
    return cart.map((item) => {
      const prod = productMap.get(item.productId);
      let unitPrice = prod ? prod.salePrice : 0;
      let variantName: string | null = null;

      if (prod && item.variantId && Array.isArray(prod.variants)) {
        const v = prod.variants.find((varItem) => varItem.id === item.variantId);
        if (v) {
          variantName = v.name;
          if (v.price > 0) unitPrice = v.price;
        }
      }

      return {
        ...item,
        product: prod,
        unitPrice,
        variantName,
        lineTotal: unitPrice * item.qty,
      };
    }).filter((line) => line.product != null);
  }, [cart, productMap]);

  const cartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.qty, 0);
  }, [cart]);

  const subtotal = useMemo(() => {
    return cartLines.reduce((acc, line) => acc + line.lineTotal, 0);
  }, [cartLines]);

  const deliveryFee = useMemo(() => {
    if (!shop) return 0;
    const settings = shop.deliverySettings || { insideCityFee: 60, outsideCityFee: 120, freeDeliveryThreshold: 2000 };
    if (subtotal >= settings.freeDeliveryThreshold && settings.freeDeliveryThreshold > 0) {
      return 0;
    }
    return deliveryRegion === 'outside_city' ? settings.outsideCityFee : settings.insideCityFee;
  }, [shop, subtotal, deliveryRegion]);

  const grandTotal = subtotal + deliveryFee;

  const freeDeliveryProgress = useMemo(() => {
    const threshold = shop?.deliverySettings?.freeDeliveryThreshold || 2000;
    if (subtotal >= threshold) return { unlocked: true, remaining: 0, percent: 100 };
    const remaining = Math.max(0, threshold - subtotal);
    const percent = Math.min(100, Math.round((subtotal / threshold) * 100));
    return { unlocked: false, remaining, percent };
  }, [shop, subtotal]);

  // Cart Handlers
  const addToCart = (productId: string, qty = 1, variantId: string | null = null) => {
    const prod = productMap.get(productId);
    if (!prod || prod.stock <= 0) return;

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.productId === productId && (item.variantId || null) === (variantId || null));
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = Math.min(prod.stock, updated[existingIdx].qty + qty);
        updated[existingIdx] = { ...updated[existingIdx], qty: newQty };
        return updated;
      }
      return [...prev, { productId, qty: Math.min(prod.stock, qty), variantId }];
    });
  };

  const updateCartQty = (productId: string, variantId: string | null, delta: number) => {
    const prod = productMap.get(productId);
    if (!prod) return;

    setCart((prev) => {
      return prev
        .map((item) => {
          if (item.productId === productId && (item.variantId || null) === (variantId || null)) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: Math.min(prod.stock, newQty) } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (productId: string, variantId: string | null) => {
    setCart((prev) => prev.filter((item) => !(item.productId === productId && (item.variantId || null) === (variantId || null))));
  };

  // Place Order Handler
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');

    if (!customerName.trim() || customerName.trim().length < 2) {
      setCheckoutError('Please enter your full name (at least 2 characters)');
      return;
    }
    if (!mobile.trim() || mobile.trim().replace(/\D/g, '').length < 8) {
      setCheckoutError('Please enter a valid mobile phone number');
      return;
    }
    if (!address.trim() || address.trim().length < 5) {
      setCheckoutError('Please provide a complete delivery address with house/road details');
      return;
    }
    if (!cartLines.length) {
      setCheckoutError('Your cart is empty. Please add products to continue');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        mobile: mobile.trim(),
        customerEmail: email.trim() || undefined,
        address: address.trim(),
        city: city.trim() || (deliveryRegion === 'inside_city' ? 'Dhaka' : 'Outside Dhaka'),
        deliveryRegion,
        paymentMethod,
        trxId: trxId.trim() || undefined,
        senderMobile: senderMobile.trim() || undefined,
        notes: customerNotes.trim() || undefined,
        idempotencyKey: `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        items: cartLines.map((line) => ({
          productId: line.productId,
          qty: line.qty,
          variantId: line.variantId || undefined,
        })),
      };

      const res = await fetch(`${apiBase}/api/storefront/${encodeURIComponent(slug!)}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to place order');
      }

      const confirmedOrder = data.order;
      setPlacedOrder(confirmedOrder);
      saveRecentOrder(confirmedOrder);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsCartOpen(false);
    } catch (err: any) {
      setCheckoutError(err.message || 'Something went wrong while placing your order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Order Lookup Tracking Handler
  const handleTrackLookup = async (orderIdToSearch?: string, mobileToSearch?: string) => {
    const qOrderId = orderIdToSearch || trackLookupOrderId.trim();
    const qMobile = mobileToSearch || trackLookupMobile.trim();

    if (!qOrderId && !qMobile) {
      setTrackError('Please enter either your Mobile Number or Order Reference.');
      return;
    }

    setTrackLoading(true);
    setTrackError('');
    setTrackResult(null);

    try {
      const params = new URLSearchParams();
      if (qOrderId) params.set('orderId', qOrderId);
      if (qMobile) params.set('mobile', qMobile);

      const res = await fetch(`${apiBase}/api/storefront/${encodeURIComponent(slug!)}/orders/track?${params}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Order not found');
      }
      setTrackResult(data.order);
    } catch (err: any) {
      setTrackError(err.message || 'Unable to find order matching your details');
    } finally {
      setTrackLoading(false);
    }
  };

  // Cancel Order Handler
  const handleCancelOrder = async (orderId: string, orderMobile: string) => {
    if (!confirm('Are you sure you want to cancel this order? It will release the reserved items.')) return;
    setCancelBusy(true);
    try {
      const res = await fetch(`${apiBase}/api/storefront/${encodeURIComponent(slug!)}/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: orderMobile, reason: 'Customer requested cancellation via Storefront' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to cancel order');

      alert('Order has been cancelled successfully.');
      handleTrackLookup(orderId, orderMobile);
    } catch (err: any) {
      alert(err.message || 'Error cancelling order');
    } finally {
      setCancelBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-lg">Loading Official Storefront…</p>
        <p className="text-xs text-slate-400 mt-1">Directly connected to store inventory</p>
      </div>
    );
  }

  if (error || !shop) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-xl">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2">Shop Unavailable</h2>
          <p className="text-slate-600 text-sm mb-6">{error || 'This storefront is currently not active or under maintenance.'}</p>
          <a
            href="#/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
          >
            Go to Bizora Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-50/60 text-slate-900'}`}>
      <SEOHead
        title={`${shop.name} — Official Online Store`}
        description={shop.tagline || `Browse official online products from ${shop.name}. Fast delivery and Cash on Delivery powered by Bizora.`}
        canonicalUrl={`/s/${slug || ''}`}
        ogType="website"
      />

      {/* Top Notification Bar */}
      <div className="bg-slate-900 text-slate-200 text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2 text-[11px] font-medium">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Official Storefront · Verified Merchant by Bizora ERP</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-300">
            {shop.phone && (
              <span className="flex items-center gap-1 hover:text-white">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                {shop.phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-cyan-400" />
              Delivery across Bangladesh
            </span>
          </div>
        </div>
      </div>

      {/* Main Sticky Header */}
      <header
        className="sticky top-0 z-30 border-b backdrop-blur-xl transition-all"
        style={{
          backgroundColor: isDark ? 'rgba(2, 6, 23, 0.92)' : 'rgba(255, 255, 255, 0.95)',
          borderColor: isDark ? '#1e293b' : '#e2e8f0',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4 flex items-center justify-between gap-3 md:gap-6">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3 min-w-0">
            {shop.logo ? (
              <img src={shop.logo} alt={shop.name} className="w-10 h-10 rounded-xl object-contain bg-white shadow-sm border p-0.5" />
            ) : (
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md flex-shrink-0"
                style={{ backgroundColor: theme.primary }}
              >
                {shop.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="font-black text-base sm:text-lg tracking-tight truncate leading-tight" style={{ color: isDark ? '#ffffff' : theme.primary }}>
                {shop.name}
              </h1>
              <p className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {shop.tagline || 'Online Store'}
              </p>
            </div>
          </div>

          {/* Search Bar (Desktop / Tablet) */}
          <div className="hidden md:flex flex-1 max-w-md mx-2">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by title, category, SKU…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-9 py-2 text-xs rounded-full border transition-all outline-none ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400 focus:bg-slate-900'
                    : 'bg-slate-100/80 border-slate-200 text-slate-900 focus:border-blue-600 focus:bg-white'
                }`}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Action Buttons: Track Order & Cart */}
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                setShowTrackModal(true);
                setTrackResult(null);
                setTrackError('');
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-full border transition-all ${
                isDark
                  ? 'border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:text-white'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 shadow-sm'
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span className="hidden sm:inline">Track Order</span>
              <span className="sm:hidden">Track</span>
            </button>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-4 py-2 rounded-full text-white text-xs sm:text-sm font-bold shadow-md hover:opacity-95 transition-all"
              style={{ backgroundColor: theme.accent }}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Bag</span>
              {cartCount > 0 && (
                <span className="bg-white text-[11px] font-black px-1.5 py-0.2 rounded-full shadow-sm" style={{ color: theme.accent }}>
                  {cartCount}
                </span>
              )}
              {cartCount > 0 && (
                <span className="hidden md:inline font-bold text-xs opacity-90 pl-1 border-l border-white/30">
                  {shop.currency} {subtotal.toFixed(0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden px-4 pb-3">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search products…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-9 py-2 text-xs rounded-full border transition-all outline-none ${
                isDark
                  ? 'bg-slate-900 border-slate-700 text-white'
                  : 'bg-slate-100 border-slate-200 text-slate-900 focus:bg-white'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        className="relative overflow-hidden py-10 md:py-16 px-4"
        style={{
          background:
            theme.heroStyle === 'banner'
              ? `linear-gradient(135deg, ${theme.primary} 0%, ${theme.accent} 100%)`
              : isDark
                ? '#020617'
                : `linear-gradient(180deg, ${theme.accent}14 0%, transparent 100%)`,
        }}
      >
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold mb-3 shadow-sm"
               style={{
                 backgroundColor: theme.heroStyle === 'banner' ? 'rgba(255,255,255,0.2)' : `${theme.accent}20`,
                 color: theme.heroStyle === 'banner' ? '#ffffff' : theme.accent,
               }}>
            <ShieldCheck className="w-3.5 h-3.5" />
            Verified Authentic Products · Direct POS Inventory
          </div>

          <h2
            className={`text-3xl md:text-5xl font-black tracking-tight mb-3 ${
              theme.heroStyle === 'banner' ? 'text-white' : ''
            }`}
            style={theme.heroStyle !== 'banner' ? { color: isDark ? '#ffffff' : theme.primary } : undefined}
          >
            {shop.name}
          </h2>

          <p
            className={`text-sm md:text-base max-w-xl mx-auto mb-6 ${
              theme.heroStyle === 'banner' ? 'text-white/80' : isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {shop.tagline || 'Browse our real-time catalog. Real inventory synced directly from our store shelves.'}
          </p>

          {/* Trust Value Props */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 max-w-3xl mx-auto text-left">
            <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 shadow-sm ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
              <Truck className="w-5 h-5 text-indigo-500 flex-shrink-0" />
              <div>
                <p className="font-bold">Fast Delivery</p>
                <p className="text-[10px] opacity-70">Inside & outside city</p>
              </div>
            </div>
            <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 shadow-sm ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
              <CreditCard className="w-5 h-5 text-emerald-500 flex-shrink-0" />
              <div>
                <p className="font-bold">Cash on Delivery</p>
                <p className="text-[10px] opacity-70">Pay when delivered</p>
              </div>
            </div>
            <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 shadow-sm ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
              <RefreshCw className="w-5 h-5 text-blue-500 flex-shrink-0" />
              <div>
                <p className="font-bold">Live Inventory</p>
                <p className="text-[10px] opacity-70">No out-of-stock orders</p>
              </div>
            </div>
            <div className={`p-3 rounded-2xl border text-xs flex items-center gap-2.5 shadow-sm ${isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
              <ShieldCheck className="w-5 h-5 text-violet-500 flex-shrink-0" />
              <div>
                <p className="font-bold">Bizora Secured</p>
                <p className="text-[10px] opacity-70">Direct SME store</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Section */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Categories Bar & Filter Controls */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200/80">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setSelectedCategory('All')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                selectedCategory === 'All'
                  ? 'text-white shadow-sm'
                  : isDark
                    ? 'bg-slate-900 text-slate-400 hover:text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
              style={selectedCategory === 'All' ? { backgroundColor: theme.primary } : undefined}
            >
              All Products ({products.length})
            </button>
            {categories.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelectedCategory(c.name)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory.toLowerCase() === c.name.toLowerCase()
                    ? 'text-white shadow-sm'
                    : isDark
                      ? 'bg-slate-900 text-slate-400 hover:text-white'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
                style={selectedCategory.toLowerCase() === c.name.toLowerCase() ? { backgroundColor: theme.primary } : undefined}
              >
                {c.name} ({c.count})
              </button>
            ))}
          </div>

          {/* Sort & In-Stock Controls */}
          <div className="flex items-center gap-3 w-full lg:w-auto justify-between lg:justify-end text-xs">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-0"
              />
              <span className={`font-medium ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>In Stock Only</span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 hidden sm:inline">Sort:</span>
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className={`pl-3 pr-8 py-1.5 rounded-full border text-xs font-semibold appearance-none outline-none ${
                    isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name-asc">Name: A to Z</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Product Cards Grid */}
        {filteredProducts.length === 0 ? (
          <div className={`text-center py-16 px-4 rounded-3xl border ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
            <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-base text-slate-700 mb-1">No products found</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {searchQuery
                ? `No items matched your search query "${searchQuery}". Try different keywords.`
                : 'No products are currently published in this category.'}
            </p>
            {(searchQuery || selectedCategory !== 'All' || inStockOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('All');
                  setInStockOnly(false);
                }}
                className="px-4 py-2 rounded-full text-xs font-bold text-white shadow-sm"
                style={{ backgroundColor: theme.primary }}
              >
                Reset All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5">
            {filteredProducts.map((p) => {
              const inCartQty = cart.find((item) => item.productId === p.id && !item.variantId)?.qty || 0;
              const hasDiscount = (p.comparePrice || 0) > p.salePrice;
              const discountPercent = hasDiscount ? Math.round((((p.comparePrice || 0) - p.salePrice) / (p.comparePrice || 1)) * 100) : 0;

              return (
                <div
                  key={p.id}
                  className={`group rounded-2xl border overflow-hidden flex flex-col transition-all duration-200 hover:shadow-lg ${
                    isDark ? 'bg-slate-900 border-slate-800 hover:border-slate-700' : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {/* Thumbnail Container */}
                  <div
                    className={`relative aspect-square cursor-pointer overflow-hidden flex items-center justify-center ${
                      isDark ? 'bg-slate-800/80' : 'bg-slate-100/70'
                    }`}
                    onClick={() => {
                      setQuickViewProduct(p);
                      setQuickViewImageIdx(0);
                      setSelectedVariantId(p.variants?.[0]?.id || null);
                      setQuickViewQty(1);
                    }}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <Package className={`w-12 h-12 ${isDark ? 'text-slate-700' : 'text-slate-300'}`} />
                    )}

                    {/* Discount Badge */}
                    {hasDiscount && discountPercent > 0 && (
                      <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                        -{discountPercent}%
                      </span>
                    )}

                    {/* Stock status badge */}
                    {p.stock <= 0 ? (
                      <span className="absolute bottom-2.5 left-2.5 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Sold Out
                      </span>
                    ) : p.stock <= 3 ? (
                      <span className="absolute bottom-2.5 left-2.5 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        Only {p.stock} left
                      </span>
                    ) : null}

                    {/* Quick View Button Hover Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                      <span className="bg-white/90 text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5" /> Details
                      </span>
                    </div>
                  </div>

                  {/* Product Info */}
                  <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="truncate">{p.category || 'General'}</span>
                        {p.unit && <span>{p.unit}</span>}
                      </div>
                      <h3
                        className="font-bold text-xs sm:text-sm line-clamp-2 cursor-pointer hover:underline"
                        onClick={() => {
                          setQuickViewProduct(p);
                          setQuickViewImageIdx(0);
                          setSelectedVariantId(p.variants?.[0]?.id || null);
                          setQuickViewQty(1);
                        }}
                      >
                        {p.name}
                      </h3>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="font-black text-sm sm:text-base" style={{ color: theme.accent }}>
                          {shop.currency} {p.salePrice.toLocaleString()}
                        </span>
                        {hasDiscount && (
                          <span className="text-xs text-slate-400 line-through">
                            {shop.currency} {p.comparePrice?.toLocaleString()}
                          </span>
                        )}
                      </div>

                      {/* Add to Cart / Qty Stepper */}
                      {p.stock <= 0 ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-400 text-xs font-bold cursor-not-allowed"
                        >
                          Out of Stock
                        </button>
                      ) : p.variants && p.variants.length > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            setQuickViewProduct(p);
                            setQuickViewImageIdx(0);
                            setSelectedVariantId(p.variants[0]?.id || null);
                            setQuickViewQty(1);
                          }}
                          className="w-full py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                          style={{ backgroundColor: theme.primary }}
                        >
                          Select Options
                        </button>
                      ) : inCartQty > 0 ? (
                        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                          <button
                            type="button"
                            onClick={() => updateCartQty(p.id, null, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs hover:bg-slate-200"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-bold text-xs">{inCartQty}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(p.id, null, 1)}
                            disabled={inCartQty >= p.stock}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs hover:bg-slate-200 disabled:opacity-40"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(p.id, 1)}
                          className="w-full py-2 rounded-xl text-xs font-bold text-white shadow-sm flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Product Detail Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div
            className={`relative w-full max-w-2xl rounded-3xl p-5 sm:p-7 shadow-2xl transition-all my-auto max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
            }`}
          >
            <button
              type="button"
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Image Gallery */}
              <div>
                <div className={`aspect-square rounded-2xl overflow-hidden flex items-center justify-center mb-3 ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
                  {quickViewProduct.images && quickViewProduct.images.length > 0 ? (
                    <img
                      src={quickViewProduct.images[quickViewImageIdx] || quickViewProduct.image || ''}
                      alt={quickViewProduct.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Package className="w-16 h-16 text-slate-400" />
                  )}
                </div>

                {quickViewProduct.images && quickViewProduct.images.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {quickViewProduct.images.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setQuickViewImageIdx(idx)}
                        className={`w-14 h-14 rounded-xl border-2 overflow-hidden flex-shrink-0 ${
                          quickViewImageIdx === idx ? 'border-indigo-600' : 'border-transparent opacity-70'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info & Actions */}
              <div className="flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {quickViewProduct.category || 'General'}
                    </span>
                    {quickViewProduct.brand && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {quickViewProduct.brand}
                      </span>
                    )}
                  </div>

                  <h3 className="text-lg sm:text-xl font-black mb-2">{quickViewProduct.name}</h3>

                  <div className="flex items-baseline gap-2 mb-3">
                    <span className="text-xl sm:text-2xl font-black" style={{ color: theme.accent }}>
                      {shop.currency} {quickViewProduct.salePrice.toLocaleString()}
                    </span>
                    {quickViewProduct.comparePrice && quickViewProduct.comparePrice > quickViewProduct.salePrice && (
                      <span className="text-sm text-slate-400 line-through">
                        {shop.currency} {quickViewProduct.comparePrice.toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs mb-4">
                    <span className={`inline-block w-2 h-2 rounded-full ${quickViewProduct.stock > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <span className={quickViewProduct.stock > 0 ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                      {quickViewProduct.stock > 0 ? `In Stock (${quickViewProduct.stock} ${quickViewProduct.unit || 'units'} available)` : 'Out of Stock'}
                    </span>
                  </div>

                  {/* Variants */}
                  {quickViewProduct.variants && quickViewProduct.variants.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Select Variant:</p>
                      <div className="flex flex-wrap gap-2">
                        {quickViewProduct.variants.map((v) => (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setSelectedVariantId(v.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                              selectedVariantId === v.id
                                ? 'border-current shadow-sm'
                                : 'border-slate-200 dark:border-slate-700 opacity-70'
                            }`}
                            style={selectedVariantId === v.id ? { borderColor: theme.accent, color: theme.accent } : undefined}
                          >
                            {v.name}
                            {v.price > 0 && ` (${shop.currency} ${v.price})`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {quickViewProduct.description && (
                    <div className="mb-4 text-xs text-slate-600 dark:text-slate-400 max-h-32 overflow-y-auto leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                      {quickViewProduct.description}
                    </div>
                  )}
                </div>

                {/* Stepper & Action Buttons */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-bold text-slate-500">Quantity:</span>
                    <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                      <button
                        type="button"
                        onClick={() => setQuickViewQty((q) => Math.max(1, q - 1))}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-10 text-center font-bold text-xs">{quickViewQty}</span>
                      <button
                        type="button"
                        onClick={() => setQuickViewQty((q) => Math.min(quickViewProduct.stock, q + 1))}
                        disabled={quickViewQty >= quickViewProduct.stock}
                        className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs disabled:opacity-40"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={quickViewProduct.stock <= 0}
                      onClick={() => {
                        addToCart(quickViewProduct.id, quickViewQty, selectedVariantId);
                        setQuickViewProduct(null);
                        setIsCartOpen(true);
                      }}
                      className="py-3 rounded-2xl font-bold text-xs sm:text-sm text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: theme.primary }}
                    >
                      Add to Cart
                    </button>
                    <button
                      type="button"
                      disabled={quickViewProduct.stock <= 0}
                      onClick={() => {
                        addToCart(quickViewProduct.id, quickViewQty, selectedVariantId);
                        setQuickViewProduct(null);
                        setIsCheckoutOpen(true);
                      }}
                      className="py-3 rounded-2xl font-bold text-xs sm:text-sm text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ backgroundColor: theme.accent }}
                    >
                      Buy Now
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cart Slide-Over Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div
            className={`w-full max-w-md h-full flex flex-col shadow-2xl transition-all ${
              isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
            }`}
          >
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-500" />
                <h3 className="font-black text-base">Your Cart ({cartCount})</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Free Delivery Banner */}
            <div className="px-5 py-3 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-100 dark:border-indigo-900 text-xs">
              {freeDeliveryProgress.unlocked ? (
                <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-bold">
                  <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>You unlocked FREE Delivery across Bangladesh!</span>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 mb-1.5">
                    <span>Add {shop.currency} {freeDeliveryProgress.remaining.toLocaleString()} more for FREE Delivery</span>
                    <span>{freeDeliveryProgress.percent}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-900 overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                      style={{ width: `${freeDeliveryProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Items List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
              {cartLines.length === 0 ? (
                <div className="text-center py-20 text-slate-400">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-40" />
                  <p className="font-bold text-sm">Your shopping bag is empty</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">Discover products from our verified shelves</p>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="px-5 py-2 rounded-full text-xs font-bold text-white shadow-sm"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Start Shopping
                  </button>
                </div>
              ) : (
                cartLines.map((line) => (
                  <div
                    key={`${line.productId}-${line.variantId || 'default'}`}
                    className="flex items-center gap-3 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                  >
                    <div className="w-16 h-16 rounded-xl bg-white dark:bg-slate-700 p-1 border flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {line.product?.image ? (
                        <img src={line.product.image} alt={line.product.name} className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Package className="w-6 h-6 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-xs truncate">{line.product?.name}</h4>
                      {line.variantName && (
                        <p className="text-[10px] text-indigo-500 font-semibold">{line.variantName}</p>
                      )}
                      <p className="font-black text-xs mt-1" style={{ color: theme.accent }}>
                        {shop.currency} {line.unitPrice.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => removeFromCart(line.productId, line.variantId || null)}
                        className="text-slate-400 hover:text-rose-500 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-0.5">
                        <button
                          type="button"
                          onClick={() => updateCartQty(line.productId, line.variantId || null, -1)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-xs"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold">{line.qty}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(line.productId, line.variantId || null, 1)}
                          disabled={line.qty >= (line.product?.stock || 0)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-xs disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Drawer Footer Checkout */}
            {cartLines.length > 0 && (
              <div className="p-4 sm:p-5 border-t border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {shop.currency} {subtotal.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Estimated Delivery</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {deliveryFee === 0 ? (
                        <span className="text-emerald-600 font-bold">FREE</span>
                      ) : (
                        `${shop.currency} ${deliveryFee}`
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-100 dark:border-slate-800">
                    <span>Total</span>
                    <span style={{ color: theme.accent }}>
                      {shop.currency} {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setIsCartOpen(false);
                    setIsCheckoutOpen(true);
                  }}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 hover:opacity-95 transition-opacity"
                  style={{ backgroundColor: theme.accent }}
                >
                  Proceed to Checkout ({shop.currency} {grandTotal.toLocaleString()})
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal / Form */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={`w-full max-w-xl rounded-3xl p-5 sm:p-7 shadow-2xl transition-all my-auto max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-black text-lg">Secure Checkout</h3>
                <p className="text-xs text-slate-500">Fast delivery directly to your doorstep</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {checkoutError && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold flex items-center gap-2">
                <span>{checkoutError}</span>
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="space-y-4">
              {/* Delivery Contact Info */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" /> 1. Shipping Details
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Tariqul Islam"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 focus:bg-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Mobile Phone Number *</label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 01711223344"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">Email Address (Optional)</label>
                    <input
                      type="email"
                      placeholder="receipt@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 focus:bg-white'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 mb-1">City / District</label>
                    <input
                      type="text"
                      placeholder="e.g. Dhaka, Chittagong, Sylhet"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                        isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 focus:bg-white'
                      }`}
                    />
                  </div>
                </div>

                {/* Delivery Region Picker */}
                <div className="mb-3">
                  <label className="block text-[11px] font-bold text-slate-500 mb-1.5">Delivery Region</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryRegion('inside_city')}
                      className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all ${
                        deliveryRegion === 'inside_city'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <p className="font-bold">Inside City (Dhaka)</p>
                      <p className="text-[10px] opacity-70">
                        {freeDeliveryProgress.unlocked ? 'Free Delivery' : `${shop.currency} ${shop.deliverySettings.insideCityFee}`}
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryRegion('outside_city')}
                      className={`p-3 rounded-2xl border text-left text-xs font-semibold transition-all ${
                        deliveryRegion === 'outside_city'
                          ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-300'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <p className="font-bold">Outside City</p>
                      <p className="text-[10px] opacity-70">
                        {freeDeliveryProgress.unlocked ? 'Free Delivery' : `${shop.currency} ${shop.deliverySettings.outsideCityFee}`}
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Full Street Address *</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="House / Flat No, Road No, Area, Thana"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200 focus:bg-white'
                    }`}
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" /> 2. Payment Method
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                  {(shop.paymentOptions || [
                    { id: 'COD', label: 'Cash on Delivery' },
                    { id: 'bKash', label: 'bKash' },
                    { id: 'Nagad', label: 'Nagad' },
                    { id: 'Online', label: 'Card / Online' },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPaymentMethod(opt.id)}
                      className={`p-2.5 rounded-2xl border text-left text-xs font-semibold transition-all ${
                        paymentMethod === opt.id
                          ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-300 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <p className="font-bold">{opt.label}</p>
                      <p className="text-[10px] opacity-70">
                        {opt.id === 'COD' ? 'Pay upon parcel arrival' : 'Mobile Banking'}
                      </p>
                    </button>
                  ))}
                </div>

                {/* Mobile Banking Payment Details Form (bKash / Nagad) */}
                {(paymentMethod === 'bKash' || paymentMethod === 'Nagad') && (
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs mb-3 space-y-2">
                    <p className="font-bold text-slate-700 dark:text-slate-200">
                      Send {shop.currency} {grandTotal.toLocaleString()} to our official {paymentMethod} number:
                    </p>
                    <p className="text-sm font-mono font-black text-indigo-600 dark:text-cyan-400 select-all">
                      {paymentMethod === 'bKash' ? (shop.bkashNumber || shop.phone) : (shop.nagadNumber || shop.phone)}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="Transaction ID (TrxID) *"
                        value={trxId}
                        onChange={(e) => setTrxId(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
                      />
                      <input
                        type="tel"
                        placeholder="Sender Phone Number"
                        value={senderMobile}
                        onChange={(e) => setSenderMobile(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs outline-none"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 mb-1">Special Delivery Instructions (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Please call before arriving or deliver after 5 PM"
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className={`w-full px-3.5 py-2 rounded-xl border text-xs outline-none ${
                      isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  />
                </div>
              </div>

              {/* Order Summary & Confirm Button */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Items Total ({cartCount})</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{shop.currency} {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Delivery Fee ({deliveryRegion === 'inside_city' ? 'Inside City' : 'Outside City'})</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {deliveryFee === 0 ? <span className="text-emerald-600 font-bold">FREE</span> : `${shop.currency} ${deliveryFee}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-black pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span>Grand Total</span>
                    <span style={{ color: theme.accent }}>{shop.currency} {grandTotal.toLocaleString()}</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 hover:opacity-95 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: theme.accent }}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Securing Stock & Placing Order…
                    </span>
                  ) : (
                    <span>Confirm Order ({shop.currency} {grandTotal.toLocaleString()})</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Placed Order Success Modal */}
      {placedOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center text-slate-900 shadow-2xl">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle className="w-9 h-9" />
            </div>

            <h3 className="font-black text-2xl tracking-tight mb-1">Order Received!</h3>
            <p className="text-xs text-slate-500 mb-4">
              Thank you for shopping with <strong className="text-slate-800">{shop.name}</strong>.
            </p>

            <div className="bg-slate-50 rounded-2xl p-4 text-xs space-y-2 mb-6 border border-slate-100 text-left">
              <div className="flex justify-between">
                <span className="text-slate-500">Order Reference:</span>
                <span className="font-mono font-black text-indigo-600">{placedOrder.orderNumber || placedOrder.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Total Amount:</span>
                <span className="font-black">{shop.currency} {Number(placedOrder.total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Method:</span>
                <span className="font-bold">{placedOrder.paymentMethod || 'COD'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Estimated Delivery:</span>
                <span className="font-bold text-emerald-600">2 — 4 Business Days</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  const o = placedOrder;
                  setPlacedOrder(null);
                  setShowTrackModal(true);
                  handleTrackLookup(o.orderNumber || o.id, o.customerMobile);
                }}
                className="py-3 rounded-2xl bg-indigo-50 text-indigo-600 font-bold text-xs hover:bg-indigo-100"
              >
                Track Status
              </button>
              <button
                type="button"
                onClick={() => setPlacedOrder(null)}
                className="py-3 rounded-2xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Tracking Modal */}
      {showTrackModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div
            className={`w-full max-w-lg rounded-3xl p-5 sm:p-7 shadow-2xl transition-all my-auto max-h-[90vh] overflow-y-auto ${
              isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h3 className="font-black text-lg">Track Your Order</h3>
                <p className="text-xs text-slate-500">Direct status tracking synced with courier</p>
              </div>
              <button
                type="button"
                onClick={() => setShowTrackModal(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Recent Orders Pill Bar */}
            {recentOrders.length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">My Recent Orders:</p>
                <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                  {recentOrders.map((rec) => (
                    <button
                      key={rec.orderId}
                      type="button"
                      onClick={() => handleTrackLookup(rec.orderNumber || rec.orderId)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs font-semibold whitespace-nowrap hover:border-indigo-500"
                    >
                      <span className="font-mono">{rec.orderNumber}</span>
                      <span className="ml-1.5 text-[10px] opacity-70">({rec.status})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lookup Inputs */}
            <div className="space-y-2 mb-4">
              <input
                type="text"
                placeholder="Order Reference (e.g. ORD-261024-8492)"
                value={trackLookupOrderId}
                onChange={(e) => setTrackLookupOrderId(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              />
              <input
                type="tel"
                placeholder="Or Mobile Phone Number (e.g. 01711223344)"
                value={trackLookupMobile}
                onChange={(e) => setTrackLookupMobile(e.target.value)}
                className={`w-full px-3.5 py-2.5 rounded-xl border text-xs font-medium outline-none ${
                  isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              />

              <button
                type="button"
                disabled={trackLoading}
                onClick={() => handleTrackLookup()}
                className="w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: theme.primary }}
              >
                {trackLoading ? 'Searching Order…' : 'Track Status'}
              </button>
            </div>

            {trackError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold mb-4">
                {trackError}
              </div>
            )}

            {/* Tracking Result View */}
            {trackResult && (
              <div className={`p-4 rounded-2xl border space-y-4 ${isDark ? 'border-slate-800 bg-slate-800/40' : 'border-slate-200 bg-slate-50/50'}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
                    <h4 className="text-base font-black" style={{ color: theme.accent }}>
                      {trackResult.deliveryStatus || trackResult.status}
                    </h4>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">#{trackResult.orderNumber}</p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-black">{shop.currency} {Number(trackResult.total || 0).toLocaleString()}</span>
                    <p className="text-[10px] text-slate-400">{trackResult.paymentMethod} ({trackResult.paymentStatus})</p>
                  </div>
                </div>

                {/* Courier info if available */}
                {trackResult.trackingNumber && (
                  <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 text-xs flex items-center justify-between">
                    <span className="font-semibold">{trackResult.courier || 'Courier Partner'}:</span>
                    <span className="font-mono font-black text-indigo-600 dark:text-cyan-400">{trackResult.trackingNumber}</span>
                  </div>
                )}

                {/* Stepper Timeline */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-3">Delivery Timeline</p>
                  <ol className="relative border-l-2 pl-4 space-y-4" style={{ borderColor: theme.accent }}>
                    {(trackResult.deliveryTimeline || []).map((step: any, idx: number) => (
                      <li key={idx} className="relative">
                        <span
                          className="absolute -left-[1.35rem] top-1 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: theme.accent }}
                        />
                        <p className="font-bold text-xs">{step.status}</p>
                        <p className="text-[10px] text-slate-400">
                          {step.at ? String(step.at).replace('T', ' ').slice(0, 16) : ''}
                          {step.note ? ` · ${step.note}` : ''}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Items in Order */}
                <div className="border-t border-slate-200 dark:border-slate-700 pt-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Order Items ({trackResult.items?.length || 0})</p>
                  <ul className="space-y-1.5 text-xs">
                    {(trackResult.items || []).map((item: any, idx: number) => (
                      <li key={idx} className="flex justify-between text-slate-600 dark:text-slate-300">
                        <span>
                          {item.name} {item.variantName ? `(${item.variantName})` : ''} × {item.qty}
                        </span>
                        <span className="font-bold">{shop.currency} {Number(item.total || item.price * item.qty).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cancel Action if Pending */}
                {trackResult.canCancel && (
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={cancelBusy}
                      onClick={() => handleCancelOrder(trackResult.id, trackResult.customerMobile)}
                      className="w-full py-2 rounded-xl text-rose-600 border border-rose-200 dark:border-rose-800 text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/30"
                    >
                      {cancelBusy ? 'Cancelling…' : 'Cancel This Order (Release Items)'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer & Bizora Trust Badge */}
      <footer className="border-t border-slate-200 dark:border-slate-800 mt-16 py-12 px-4 bg-white dark:bg-slate-900 transition-colors">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 text-xs">
          <div>
            <h4 className="font-black text-sm mb-2" style={{ color: theme.primary }}>{shop.name}</h4>
            <p className="text-slate-500 leading-relaxed mb-3">{shop.tagline || 'Direct storefront connected to physical store inventory.'}</p>
            {shop.address && (
              <p className="text-slate-400 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-slate-500" />
                <span>{shop.address}</span>
              </p>
            )}
          </div>

          <div>
            <h4 className="font-black text-sm mb-2">Customer Care & Support</h4>
            <ul className="space-y-2 text-slate-500">
              {shop.phone && (
                <li className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Helpline: {shop.phone}</span>
                </li>
              )}
              {shop.email && (
                <li>Email: {shop.email}</li>
              )}
              <li>Cash on Delivery verified across 64 districts</li>
              <li>Free replacement within 7 days for damaged items</li>
            </ul>
          </div>

          <div>
            <h4 className="font-black text-sm mb-2">Verified E-Commerce Engine</h4>
            <p className="text-slate-500 leading-relaxed mb-3">
              This online shop is independently operated and secured by the Bizora SaaS ERP infrastructure.
            </p>
            <div className="inline-flex items-center gap-2 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <img src="/assets/bizora-emblem.png" alt="Bizora" className="w-6 h-6 object-contain" />
              <div className="text-[11px]">
                <p className="font-black text-slate-800 dark:text-slate-100 leading-tight">Bizora ERP</p>
                <p className="text-slate-400 text-[10px]">Smart Business. Better Tomorrow.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-6 border-t border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-400 text-[11px]">
          <p>© {new Date().getFullYear()} {shop.name}. All rights reserved.</p>
          <p className="flex items-center gap-1">
            <span>Powered by</span>
            <a href="#/" className="font-bold text-indigo-600 hover:underline">Bizora Cloud ERP</a>
            <span>· Independent SME Storefront</span>
          </p>
        </div>
      </footer>
    </div>
  );
};

export default StorefrontPublic;
