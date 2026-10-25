
import { authFetch, hasAuthToken } from '../lib/apiClient';
import { usePaymentReturn } from '../hooks/usePaymentReturn';
import { appendWalletHistory, applyWalletDelta } from '@shared/lib/walletHistory';
import { normalizeSerialUnits, allocateSerials, serialsToLegacyList } from '@shared/lib/serialUnits';
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useData, LedgerEntry, Product, Entity, Installment, KitchenOrder } from '../contexts/DataContext';
import { resolvePaymentMethod, computePaidDue, paymentSplitsSummary, ensureDueLine, roundMoney, validatePaymentSplits, rebalanceDueLine, remainingToAllocate, sumCollected, resolveAccountForTender, accountTypeForTender, buildSplitAccountPostings } from '../lib/partialPayments';
import { UserRole, Staff } from '../types';
import { 
  ShoppingBag, User, Plus, Trash2, Search, Barcode, Box, 
  ArrowRight, CheckCircle, X, ShoppingCart, Download, History,
  AlertTriangle, Users, Minus, Wallet, CreditCard, ChevronLeft,
  Settings, ShieldCheck, Hash, Tag, Truck, Calendar, ChefHat,
  ChevronDown, SlidersHorizontal
} from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import BarcodeScanner from './BarcodeScanner';
import { policyFromSettings, daysUntilExpiry, statusFromDays, lotsFromProduct } from '../lib/fefoPolicy';
import { useSound } from '../contexts/SoundContext';

const Sell: React.FC = () => {
  const { t, formatMoney, currencySymbol, language } = useSettings();
  const { user, logActivity } = useAuth();
  const { playSaleSuccess, playActionSuccess } = useSound();
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<LedgerEntry[]>([]);
  const { transactions, products, customers, staff, updateProductStock, updateProduct, addEntity, addTransaction, promoCodes, financialAccounts, addKitchenOrder, updateKitchenOrderStatus, kitchenOrders, validateCoupon, recordCouponUsage, loyaltyConfig, redeemLoyaltyPoints, redeemGiftCard, refreshProducts, lastProductsSyncAt, productsRealtimeActive , updateEntity } = useData();

  // Kitchen Order Ticket (KOT) - only meaningful for restaurant-type
  // businesses, so the UI for it stays out of the way for retail/other
  // business types instead of always showing a "Table Number" field.
  const isRestaurant = (user?.businessType || '').toLowerCase() === 'restaurant';
  const [tableNumber, setTableNumber] = useState('');
  const [orderType, setOrderType] = useState<'Dine-In' | 'Takeaway' | 'Delivery'>('Dine-In');
  const [sentKotIds, setSentKotIds] = useState<string[]>([]);

  const activeBusiness = useMemo(() => 
    user?.businesses?.find(b => b && b.name === user.businessName) || user?.businesses?.[0]
  , [user]);
  
  const bizSettings = activeBusiness?.settings;

  // --- View State ---
  const [activeView, setActiveView] = useState<'products' | 'checkout'>('products');
  
  // --- Transaction State ---
  const [cart, setCart] = useState<{
      id: string, name: string, stock: number, qty: number, price: number, 
      serialNumbers: string[], warranty?: string, image?: string, category?: string
  }[]>([]);
  
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Customer State
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerMobile, setCustomerMobile] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Payment State
  const [payments, setPayments] = useState<{method: string, amount: number}[]>([{method: 'Cash', amount: 0}]);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState('');
  const [giftCardCode, setGiftCardCode] = useState('');
  const [variantPicker, setVariantPicker] = useState<Product | null>(null);
  const [onlinePayBusy, setOnlinePayBusy] = useState(false);
  const [onlinePayMsg, setOnlinePayMsg] = useState('');
  const paymentReturn = usePaymentReturn();

  const [giftCardApplied, setGiftCardApplied] = useState(0);
  const [giftCardError, setGiftCardError] = useState('');
  const [tax, setTax] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [miscLabel, setMiscLabel] = useState('');
  const [miscAmount, setMiscAmount] = useState(0);

  // Installment State
  const [installmentCount, setInstallmentCount] = useState(3);
  const [installmentFrequency, setInstallmentFrequency] = useState<'Monthly' | 'Weekly'>('Monthly');
  const [firstInstallmentDate, setFirstInstallmentDate] = useState(() => {
      const d = new Date();
      d.setMonth(d.getMonth() + 1);
      return d.toISOString().split('T')[0];
  });

  // Order Details State
  const [salesperson, setSalesperson] = useState(() => {
    if (user?.role === UserRole.OWNER) return 'Counter';
    return user?.name || 'Counter';
  });
  const [orderNotes, setOrderNotes] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [orderTags, setOrderTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [autoSendInvoice, setAutoSendInvoice] = useState(false);

  // --- UI & Search State ---
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const checkoutInFlightRef = useRef(false);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  const [scanFeedback, setScanFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [customerSuggestions, setCustomerSuggestions] = useState<Entity[]>([]);
  
  // Modals
  const [duplicateMatch, setDuplicateMatch] = useState<Entity | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (e.key === 'F9') {
        if (showInvoice) return;
        e.preventDefault();
        const btn = document.getElementById('pos-confirm-sale-btn') as HTMLButtonElement | null;
        if (btn && !btn.disabled) btn.click();
        return;
      }
      if (e.key === 'Escape') {
        if (showInvoice) {
          e.preventDefault();
          setShowInvoice(false);
          setTimeout(() => {
            searchInputRef.current?.focus();
            searchInputRef.current?.select();
          }, 50);
          return;
        }
        if (showBarcodeScanner) {
          e.preventDefault();
          setShowBarcodeScanner(false);
          return;
        }
        if (searchTerm) {
          e.preventDefault();
          setSearchTerm('');
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showBarcodeScanner, searchTerm, showInvoice]);
  const [generatedInvoice, setGeneratedInvoice] = useState<LedgerEntry | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showExtras, setShowExtras] = useState(false);
  
  // Item Extras Modal
  const [extrasModal, setExtrasModal] = useState<{show: boolean, itemId: string | null}>({ show: false, itemId: null });
  const [tempWarranty, setTempWarranty] = useState('');
  const [tempSns, setTempSns] = useState<string[]>([]);

  const [previousDue, setPreviousDue] = useState(0);

  // --- Derived Data ---
  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);

  // Calculate Previous Due when customer changes
  useEffect(() => {
      if (selectedCustomerId) {
          const customerTransactions = transactions.filter(t => 
              t.entityId === selectedCustomerId || t.entityName === customerName
          );
          
          const totalDue = customerTransactions
              .filter(t => (t.type === 'Sale' || t.type === 'Due') && (t.dueAmount || 0) > 0)
              .reduce((sum, t) => sum + (t.dueAmount || 0), 0);
          
          const totalPaid = customerTransactions
              .filter(t => t.type === 'Income')
              .reduce((sum, t) => sum + t.amount, 0);

          const totalReturned = customerTransactions
              .filter(t => t.type === 'Sales Return')
              .reduce((sum, t) => sum + t.amount, 0);

          // Net Due = (Sales Due + Opening Due) - (Payments + Returns)
          setPreviousDue(totalDue - totalPaid - totalReturned);
      } else {
          setPreviousDue(0);
      }
  }, [selectedCustomerId, customerName, transactions]);

  const filteredProducts = useMemo(() => {
      return products.filter(p => {
          if (p.isDeleted) return false;
          const searchLower = searchTerm.toLowerCase().trim();
          if (!searchLower) {
              const matchCat = categoryFilter ? p.category === categoryFilter : true;
              return matchCat;
          }
          const matchSearch =
              p.name.toLowerCase().includes(searchLower) ||
              p.id.toLowerCase().includes(searchLower) ||
              (p.barcode || '').toLowerCase() === searchLower ||
              (p.barcode || '').toLowerCase().includes(searchLower) ||
              (p.sku || '').toLowerCase() === searchLower ||
              (p.sku || '').toLowerCase().includes(searchLower) ||
              (p.qrCode || '').toLowerCase() === searchLower;
          const matchCat = categoryFilter ? p.category === categoryFilter : true;
          return matchSearch && matchCat;
      });
  }, [products, searchTerm, categoryFilter]);

  // Auto-select default account
  useEffect(() => {
    if (financialAccounts.length > 0 && !accountId) {
      const def = financialAccounts.find(a => a.isDefault) || financialAccounts[0];
      if (def) setAccountId(def.id);
    }
  }, [financialAccounts, accountId]);

  const subtotal = cart.reduce((acc, item) => acc + (item.qty * item.price), 0);
  
  // Apply coupon logic - real validation (min purchase, expiry, usage
  // limit, max discount cap), not just "does an active code with this
  // text exist".
  const [couponError, setCouponError] = useState('');
  const couponResult = useMemo(() => {
    if (!couponCode) { setCouponError(''); return { valid: false, discount: 0 }; }
    const result = validateCoupon(couponCode, subtotal);
    setCouponError(result.valid ? '' : (result.error || ''));
    return result;
  }, [couponCode, subtotal, promoCodes]);
  const couponDiscount = couponResult.discount;

  // Loyalty point redemption at checkout
  const [redeemPoints, setRedeemPoints] = useState(0);
  const selectedCustomerForLoyalty = customers.find(c => c.id === selectedCustomerId);
  const availableLoyaltyPoints = selectedCustomerForLoyalty?.loyaltyPoints || 0;
  const availableStoreCredit = Number(selectedCustomerForLoyalty?.walletBalance) || 0;
  const loyaltyDiscount = useMemo(() => {
    if (!loyaltyConfig.enabled || redeemPoints <= 0 || !selectedCustomerId) return 0;
    return Math.min(redeemPoints, availableLoyaltyPoints) * (loyaltyConfig.redemptionRate || 1);
  }, [redeemPoints, selectedCustomerId, availableLoyaltyPoints, loyaltyConfig]);

  const totalDiscount = discount + couponDiscount + loyaltyDiscount;
  const grandTotal = Math.max(0, subtotal - totalDiscount + tax + miscAmount);

  const fefoPolicy = useMemo(() => policyFromSettings(bizSettings as any), [bizSettings]);
  const fefoBlockExpired = fefoPolicy.blockExpired;

  /** Lots for a cart line — variant register when variantId set */
  const lotsForCartItem = (product: any, item: any) => {
    const variantId = item.variantId;
    if (variantId && Array.isArray(product.variants)) {
      const v = product.variants.find((x: any) => x.id === variantId);
      if (v) {
        const vl = Array.isArray(v.lots) ? v.lots.filter((l: any) => (Number(l.qty) || 0) > 0) : [];
        if (vl.length) return vl;
        if ((Number(v.stock) || 0) > 0 && (v.batchNumber || v.expiryDate)) {
          return [{ lotNumber: v.batchNumber || 'DEFAULT', qty: Number(v.stock) || 0, expiryDate: v.expiryDate }];
        }
        return [];
      }
    }
    return lotsFromProduct(product);
  };

  /** FEFO near-expiry / expired signal for cart lines (product or variant lots) */
  const nearExpiryCartAlerts = useMemo(() => {
    const alerts: { name: string; lotNumber: string; expiryDate: string; days: number; status: 'expired' | 'critical' | 'warning' }[] = [];
    for (const item of cart) {
      const product = products.find((p) => p.id === item.id);
      if (!product || (product as any).type === 'Service') continue;
      const sorted = [...lotsForCartItem(product as any, item)].sort((a: any, b: any) =>
        String(a.expiryDate || '9999').localeCompare(String(b.expiryDate || '9999'))
      );
      let need = item.qty;
      for (const lot of sorted) {
        if (need <= 0) break;
        if (!lot.expiryDate) {
          need -= Number(lot.qty) || 0;
          continue;
        }
        const days = daysUntilExpiry(lot.expiryDate);
        const take = Math.min(Number(lot.qty) || 0, need);
        need -= take;
        const st = statusFromDays(days, fefoPolicy);
        if (st === 'ok' || st === 'none' || days == null) continue;
        alerts.push({
          name: item.name,
          lotNumber: lot.lotNumber || '—',
          expiryDate: String(lot.expiryDate).slice(0, 10),
          days,
          status: st as 'expired' | 'critical' | 'warning',
        });
      }
    }
    return alerts;
  }, [cart, products, fefoPolicy]);

  const totalPaid = useMemo(() => payments.reduce((sum, p) => sum + p.amount, 0), [payments]);
  const calculatedDue = grandTotal - totalPaid;

  const quickTenderOptions = useMemo(() => {
    const target = Math.max(0, grandTotal);
    if (target <= 0) return [];
    const options = new Set<number>();
    const base = Math.ceil(target);
    options.add(base); // Exact
    const increments = [50, 100, 500, 1000];
    for (const inc of increments) {
      const nextRounded = Math.ceil(base / inc) * inc;
      if (nextRounded > base) {
        options.add(nextRounded);
      }
    }
    return Array.from(options).sort((a, b) => a - b).slice(0, 5);
  }, [grandTotal]);

  const applyCashTender = (amt: number) => {
    const roundedAmt = Math.round(amt * 100) / 100;
    setPayments(prev => {
      const cashIndex = prev.findIndex(p => p.method === 'Cash');
      if (cashIndex >= 0) {
        return prev.map((p, idx) => idx === cashIndex ? { ...p, amount: roundedAmt } : p);
      } else if (prev.length === 1 && prev[0].method !== 'Cash') {
        return [{ method: 'Cash', amount: roundedAmt }];
      } else {
        return [...prev, { method: 'Cash', amount: roundedAmt }];
      }
    });
  };

  // --- VALIDATION: Due Sale Enforcement ---
  const isDueError = (calculatedDue > 0) && (customerName.trim() === 'Walk-in Customer' || !customerName.trim());
  const hasDueWithoutDueMethod = (calculatedDue > 0) && !payments.some(p => p.method === 'Due' || p.method === 'Installment');

  // --- Effects ---

  // Auto-suggest customers when typing
  useEffect(() => {
      if (!selectedCustomerId && customerName && customerName !== 'Walk-in Customer') {
          const lowerTerm = customerName.toLowerCase();
          const matches = customers.filter(c => 
              !c.isDeleted && 
              (c.name.toLowerCase().includes(lowerTerm) || c.mobile?.includes(lowerTerm))
          ).slice(0, 5);
          setCustomerSuggestions(matches);
      } else {
          setCustomerSuggestions([]);
      }
  }, [customerName, selectedCustomerId, customers]);

  // Apply default tax rate from business settings
  useEffect(() => {
      if (bizSettings?.taxRate && subtotal > 0) {
          const calculatedTax = (subtotal * bizSettings.taxRate) / 100;
          setTax(Number(calculatedTax.toFixed(2)));
      }
  }, [bizSettings?.taxRate, subtotal]);

  useEffect(() => {
      const handleResize = () => {
          if (window.innerWidth >= 768) {
              setActiveView('products'); 
          }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Handlers ---

  const addVariantToCart = (product: Product, variant: { id: string; name: string; stock: number; price?: number; sku?: string; barcode?: string }) => {
      if (variant.stock <= 0) {
          alert('This variant is out of stock');
          return;
      }
      // Near-expiry / expired FEFO head for this variant
      {
        const vLots = Array.isArray((variant as any).lots) && (variant as any).lots.length
          ? (variant as any).lots
          : ((Number(variant.stock) || 0) > 0 && ((variant as any).batchNumber || (variant as any).expiryDate)
              ? [{ lotNumber: (variant as any).batchNumber || 'DEFAULT', qty: variant.stock, expiryDate: (variant as any).expiryDate }]
              : []);
        const head = [...vLots]
          .filter((l: any) => l.expiryDate && (Number(l.qty) || 0) > 0)
          .sort((a: any, b: any) => String(a.expiryDate).localeCompare(String(b.expiryDate)))[0];
        if (head) {
          const days = daysUntilExpiry(head.expiryDate);
          const st = statusFromDays(days, fefoPolicy);
          if (st === 'expired' && fefoBlockExpired) {
            alert(`Cannot sell: variant lot ${head.lotNumber} expired (${String(head.expiryDate).slice(0, 10)}).`);
            return;
          }
          if (st === 'expired' || st === 'critical' || st === 'warning') {
            const ok = window.confirm(
              `Variant ${variant.name}: lot ${head.lotNumber} expires ${String(head.expiryDate).slice(0, 10)} (${days}d — ${st}). Add anyway?`
            );
            if (!ok) return;
          }
        }
      }
      const cartKey = `${product.id}::${variant.id}`;
      const existing = cart.find((item: any) => item.cartKey === cartKey || (item.id === product.id && item.variantId === variant.id));
      if (existing) {
          if (existing.qty + 1 > variant.stock) {
              alert(`Insufficient variant stock! Max: ${variant.stock}`);
              return;
          }
          setCart(cart.map((item: any) =>
              (item.cartKey === cartKey || (item.id === product.id && item.variantId === variant.id))
                  ? { ...item, qty: item.qty + 1 }
                  : item
          ));
      } else {
          setCart([...cart, {
              ...product,
              cartKey,
              variantId: variant.id,
              variantName: variant.name,
              name: `${product.name} (${variant.name})`,
              qty: 1,
              price: variant.price != null && variant.price > 0 ? variant.price : product.salePrice,
              stock: variant.stock,
              serialNumbers: [],
              warranty: product.warranty ? (product.warrantyPeriod || 'Yes') : undefined,
          } as any]);
      }
      setVariantPicker(null);
  };



  useEffect(() => {
    if (paymentReturn.status === 'idle') return;
    if (paymentReturn.status === 'checking') setOnlinePayMsg('Confirming online payment…');
    else if (paymentReturn.status === 'succeeded') {
      setOnlinePayMsg(paymentReturn.message || 'Online payment confirmed.');
      // Mark any Online payment line as paid if amount matches
      setPayments(prev => {
        if (!prev.length) return prev;
        return prev.map(p =>
          p.method === 'Online' || (paymentReturn.amount && Math.abs(p.amount - (paymentReturn.amount || 0)) < 0.01)
            ? { ...p, method: 'Online', paidOnline: true, intentId: paymentReturn.intentId } as any
            : p
        );
      });
    } else if (paymentReturn.status === 'cancelled') setOnlinePayMsg(paymentReturn.message || 'Payment cancelled.');
    else if (paymentReturn.status === 'pending') setOnlinePayMsg(paymentReturn.message || 'Payment pending confirmation.');
    else if (paymentReturn.status === 'failed') setOnlinePayMsg(paymentReturn.message || 'Payment failed.');
  }, [paymentReturn.status]);

  // POS inventory sync: pull server stock on focus + every 30s while page is open
  useEffect(() => {
    refreshProducts();
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') refreshProducts();
    }, 30000);
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshProducts();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      clearInterval(tick);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
    };
  }, []);

  const addToCart = (product: Product) => {
      const variants = (product.variants || []).filter(v => v && v.name);
      if (variants.length > 0) {
          setVariantPicker(product);
          return;
      }
      if (product.stock <= 0) {
          alert(language === 'bn' ? 'পণ্যটির স্টক শেষ!' : 'This product is out of stock!');
          return;
      }
      
      const existing = cart.find(item => item.id === product.id && !(item as any).variantId);
      if (existing) {
          if (existing.qty + 1 > product.stock) {
              alert(`Insufficient stock! Max available: ${product.stock}`);
              return;
          }
          setCart(cart.map(item => item.id === product.id && !(item as any).variantId ? {...item, qty: item.qty + 1} : item));
      } else {
          setCart([...cart, { 
              ...product, 
              qty: 1, 
              price: product.salePrice,
              serialNumbers: [],
              warranty: product.warranty ? (product.warrantyPeriod || 'Yes') : undefined
          }]);
      }
  };

  const findProductByCode = (code: string): { product: Product; variant?: any } | undefined => {
      const c = code.trim().toLowerCase();
      if (!c) return undefined;
      for (const p of products) {
          if (p.isDeleted) continue;
          if ((p.barcode || '').toLowerCase() === c || (p.sku || '').toLowerCase() === c || (p.qrCode || '').toLowerCase() === c || p.id.toLowerCase() === c) {
              return { product: p };
          }
          const v = (p.variants || []).find(vv =>
              (vv.barcode || '').toLowerCase() === c || (vv.sku || '').toLowerCase() === c
          );
          if (v) return { product: p, variant: v };
      }
      return undefined;
  };

  const handleBarcodeScan = (code: string) => {
      const hit = findProductByCode(code);
      if (hit) {
          if (hit.variant) {
              addVariantToCart(hit.product, hit.variant);
              setScanFeedback({ type: 'ok', msg: `Added: ${hit.product.name} (${hit.variant.name})` });
          } else {
              addToCart(hit.product);
              setScanFeedback({ type: 'ok', msg: `Added: ${hit.product.name}` });
          }
          setSearchTerm('');
          // short audio cue when available
          try {
              const Ctx = window.AudioContext || (window as any).webkitAudioContext;
              if (Ctx) {
                  const ctx = new Ctx();
                  const o = ctx.createOscillator();
                  const g = ctx.createGain();
                  o.connect(g); g.connect(ctx.destination);
                  o.frequency.value = 880; g.gain.value = 0.08;
                  o.start(); o.stop(ctx.currentTime + 0.08);
              }
          } catch { /* ignore */ }
      } else {
          setScanFeedback({ type: 'err', msg: `No product for code: ${code}` });
          setSearchTerm(code);
      }
      setTimeout(() => setScanFeedback(null), 2500);
  };

  const updateQty = (id: string, delta: number) => {
      const item = cart.find(i => i.id === id);
      if (!item) return;

      const newQty = item.qty + delta;
      if (newQty <= 0) {
          setCart(cart.filter(i => i.id !== id));
      } else if (newQty > item.stock) {
          alert(`Max stock: ${item.stock}`);
      } else {
          setCart(cart.map(i => i.id === id ? { ...i, qty: newQty } : i));
      }
  };

  const updateItemPrice = (id: string, newPrice: string) => {
      const price = parseFloat(newPrice);
      if (isNaN(price) || price < 0) return;
      
      const item = cart.find(i => i.id === id);
      if (item && item.salePrice !== price) {
          logActivity(
              'Price Override',
              'Sales',
              `Overrode price for product "${item.name}" from ${currencySymbol}${item.salePrice} to ${currencySymbol}${price}`
          );
      }
      setCart(cart.map(item => item.id === id ? { ...item, price } : item));
  };

  const openExtrasModal = (itemId: string) => {
      const item = cart.find(i => i.id === itemId);
      if (item) {
          setTempWarranty(item.warranty || '');
          // Initialize SNs array to match quantity
          const currentSns = item.serialNumbers || [];
          const paddedSns = Array(item.qty).fill('').map((_, i) => currentSns[i] || '');
          setTempSns(paddedSns);
          setExtrasModal({ show: true, itemId });
      }
  };

  const saveExtras = () => {
      if (extrasModal.itemId) {
          setCart(cart.map(item => 
              item.id === extrasModal.itemId 
              ? { ...item, warranty: tempWarranty, serialNumbers: tempSns.filter(s => s.trim()) } 
              : item
          ));
      }
      setExtrasModal({ show: false, itemId: null });
  };

  const handleSnChange = (index: number, val: string) => {
      const newSns = [...tempSns];
      newSns[index] = val;
      setTempSns(newSns);
  };

  const handleCustomerSelect = (customer: Entity) => {
      setCustomerName(customer.name);
      setCustomerMobile(customer.mobile || '');
      setSelectedCustomerId(customer.id);
      setCustomerSuggestions([]);
      
      // Load history
      const history = transactions.filter(t => t.entityName === customer.name && t.type === 'Sale');
      setCustomerHistory(history);
  };

  const handleNameChange = (val: string) => {
      setCustomerName(val);
      setSelectedCustomerId(null); 
  };

  // Sends the current cart to the Kitchen Display as an order ticket,
  // without completing the sale - the waiter/cashier still finalizes
  // payment separately via the normal checkout flow below. Lets the
  // kitchen start preparing immediately instead of waiting for payment.
  const sendToKitchen = () => {
    if (cart.length === 0) return;
    const groupId = `kot-group-${Date.now()}`;
    const now = new Date().toISOString();

    // Route each cart item to its product's assigned station (falls back
    // to "Main Kitchen" if the product has none set) - one ticket per
    // station, so the grill station only ever sees grill items, the bar
    // only sees drinks, etc. All tickets from this cart share groupId so
    // the KDS can still show "Table 4's order" as one unit if needed.
    const itemsByStation = new Map<string, { productId: string; name: string; qty: number }[]>();
    cart.forEach(item => {
      const product = products.find(p => p.id === item.id);
      const station = product?.kitchenStation?.trim() || 'Main Kitchen';
      if (!itemsByStation.has(station)) itemsByStation.set(station, []);
      itemsByStation.get(station)!.push({ productId: item.id, name: item.name, qty: item.qty });
    });

    const newIds: string[] = [];
    itemsByStation.forEach((items, station) => {
      const kot: KitchenOrder = {
        id: `kot-${Date.now()}-${station.replace(/\s+/g, '-')}`,
        groupId,
        station,
        tableNumber: orderType === 'Dine-In' ? tableNumber : undefined,
        orderType,
        items,
        status: 'Pending',
        createdAt: now,
        updatedAt: now,
      };
      addKitchenOrder(kot);
      newIds.push(kot.id);
    });
    setSentKotIds(newIds);
  };


  const startOnlinePayment = async (paymentIndex: number) => {
    const p = payments[paymentIndex];
    if (!p || !p.amount || p.amount <= 0) {
      setOnlinePayMsg('Enter a valid online payment amount.');
      return;
    }
    if (!hasAuthToken()) {
      setOnlinePayMsg('Login required for online payments.');
      return;
    }
    setOnlinePayBusy(true);
    setOnlinePayMsg('');
    try {
      const res = await authFetch('/api/payments/intents', {
        method: 'POST',
        body: JSON.stringify({
          amount: p.amount,
          currency: 'BDT',
          description: `POS sale · ${cart.length} item(s)`,
          purpose: 'pos_sale',
          provider: undefined, // server default
          metadata: {
            source: 'pos',
            customerName: customerName || 'Walk-in',
          },
          successUrl: window.location.origin + '/sale?pay=success',
          cancelUrl: window.location.origin + '/sale?pay=cancel',
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setOnlinePayMsg(body.error || 'Failed to create payment intent');
        return;
      }
      const intent = body.intent;
      if (intent.checkoutUrl) {
        setOnlinePayMsg('Redirecting to payment provider…');
        // Stash intent id for after return
        sessionStorage.setItem('bizora_pos_pending_intent', intent.id);
        sessionStorage.setItem('bizora_pos_pending_amount', String(p.amount));
        window.location.href = intent.checkoutUrl;
        return;
      }
      // Sandbox: confirm in-app
      if (intent.provider === 'sandbox' || intent.status === 'requires_confirmation') {
        const conf = await authFetch(`/api/payments/intents/${intent.id}/confirm`, {
          method: 'POST',
          body: '{}',
        });
        const confBody = await conf.json();
        if (!conf.ok) {
          setOnlinePayMsg(confBody.error || 'Confirm failed');
          return;
        }
        // Mark this payment line as Online with reference
        const newPayments = [...payments];
        newPayments[paymentIndex] = {
          ...newPayments[paymentIndex],
          method: 'Online',
          amount: p.amount,
          intentId: intent.id,
          paidOnline: true,
        } as any;
        setPayments(newPayments);
        setOnlinePayMsg(`Online payment confirmed (${intent.id}). You can complete checkout.`);
      } else {
        setOnlinePayMsg(`Intent ${intent.id} created (${intent.status}).`);
      }
    } catch (e: any) {
      setOnlinePayMsg(e?.message || 'Payment request failed');
    } finally {
      setOnlinePayBusy(false);
    }
  };

  // --- CORE CHECKOUT LOGIC ---
  const handleCheckoutClick = async () => {
      if (checkoutInFlightRef.current) return;
      if (cart.length === 0) return;
      if (isDueError || hasDueWithoutDueMethod) return;
      checkoutInFlightRef.current = true;
      setCheckoutBusy(true);
      try {

      const splitCheck = validatePaymentSplits(payments, grandTotal, {
        customerName,
        allowChange: true,
      });
      if (!splitCheck.ok) {
        alert(splitCheck.errors.join('\n'));
        return;
      }

      // Sync inventory before sale to reduce oversell across counters
      let catalog = products;
      try {
        const fresh = await refreshProducts();
        if (Array.isArray(fresh) && fresh.length) catalog = fresh;
      } catch { /* continue with local stock */ }

      const stockErrors: string[] = [];
      for (const item of cart) {
        const product = catalog.find((p: any) => p.id === item.id);
        if (!product) {
          stockErrors.push(`${item.name}: product not found`);
          continue;
        }
        const variantId = (item as any).variantId as string | undefined;
        if (variantId && product.variants?.length) {
          const v = product.variants.find(x => x.id === variantId);
          const avail = v?.stock ?? 0;
          if (item.qty > avail) stockErrors.push(`${item.name}: only ${avail} left`);
        } else if (item.qty > product.stock) {
          stockErrors.push(`${item.name}: only ${product.stock} left`);
        }
      }
      if (stockErrors.length) {
        alert('Insufficient stock (synced):\n' + stockErrors.join('\n'));
        return;
      }

      // Near-expiry FEFO confirmation / block
      if (nearExpiryCartAlerts.length) {
        const expired = nearExpiryCartAlerts.filter((a) => a.status === 'expired');
        const lines = nearExpiryCartAlerts
          .slice(0, 8)
          .map((a) =>
            `• ${a.name} / ${a.lotNumber}: ${a.status === 'expired' ? 'EXPIRED' : a.days + 'd'} (${a.expiryDate})`
          )
          .join('\n');
        if (fefoBlockExpired && expired.length) {
          alert(
            `Checkout blocked: expired lots would be required for this sale.\n\n${lines}\n\nWrite off or restock non-expired inventory, or disable "Block expired" in Settings.`
          );
          return;
        }
        const msg =
          (expired.length
            ? `⚠️ ${expired.length} lot(s) already expired will be skipped by FEFO if other stock exists.\n\n`
            : '') +
          `Near-expiry / expired lots in this sale:\n${lines}\n\nContinue with checkout?`;
        if (!confirm(msg)) return;
      }

      // Customer credit limit (Due / Installment outstanding)
      if (calculatedDue > 0 && selectedCustomerId) {
        const customer = customers.find(c => c.id === selectedCustomerId);
        const limit = Number(customer?.creditLimit) || 0;
        if (limit > 0) {
          const projected = previousDue + calculatedDue;
          if (projected > limit + 0.009) {
            alert(
              `Credit limit exceeded for ${customer?.name || 'customer'}.\n` +
              `Limit: ${limit.toFixed(2)} · Current due: ${previousDue.toFixed(2)} · This bill due: ${calculatedDue.toFixed(2)} · Projected: ${projected.toFixed(2)}\n` +
              `Reduce due amount or collect payment.`
            );
            return;
          }
        }
      }

      if (!selectedCustomerId && customerName.trim() !== 'Walk-in Customer') {
          const exactMatch = customers.find(c => c.name.toLowerCase() === customerName.trim().toLowerCase());
          if (exactMatch) {
              setDuplicateMatch(exactMatch);
              return;
          }
      }
      finalizeTransaction(selectedCustomerId, customerName, customerMobile);
      } finally {
        checkoutInFlightRef.current = false;
        setCheckoutBusy(false);
      }
  };

  const handleDuplicateResolution = (resolution: 'yes' | 'no') => {
      if (resolution === 'yes' && duplicateMatch) {
          finalizeTransaction(duplicateMatch.id, duplicateMatch.name, duplicateMatch.mobile || customerMobile);
      } else {
          setGiftCardCode('');
      setGiftCardApplied(0);
      setDuplicateMatch(null);
      }
  };

    const autoFillDueRemainder = () => {
    setPayments(ensureDueLine(payments, grandTotal));
  };

  const handleAddPayment = () => {
    const remaining = remainingToAllocate(payments, grandTotal);
    // If bill is covered, still allow extra line at 0 for editing
    setPayments([...payments, { method: 'Cash', amount: remaining > 0 ? remaining : 0 }]);
  };

  const handleRemovePayment = (index: number) => {
    if (payments.length <= 1) {
      setPayments([{ method: 'Cash', amount: grandTotal }]);
      return;
    }
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleUpdatePayment = (index: number, field: 'method' | 'amount', value: any) => {
    let newPayments = payments.map((p, i) => {
      if (i !== index) return p;
      if (field === 'amount') {
        return { ...p, amount: typeof value === 'number' ? value : parseFloat(value) || 0 };
      }
      return { ...p, method: String(value) };
    });
    // Keep Due line in balance when editing other tenders
    if (field === 'amount' || field === 'method') {
      newPayments = rebalanceDueLine(newPayments, grandTotal, index);
    }
    setPayments(newPayments);
  };

  const splitValidation = validatePaymentSplits(payments, grandTotal, {
    customerName,
    allowChange: true,
  });


  const finalizeTransaction = (finalId: string | null, finalName: string, finalMobile: string) => {
        if (!finalId && finalName !== 'Walk-in Customer') {
            finalId = Date.now().toString();
            addEntity({
                id: finalId,
                name: finalName,
                mobile: finalMobile,
                type: 'Customer'
            });
        }

        const prefix = bizSettings?.invoicePrefix || 'INV';
        const timestamp = Date.now().toString().slice(-6);
        const reference = `${prefix}-${timestamp}`;

        let installments: Installment[] = [];
        if (payments.some(p => p.method === 'Installment') && calculatedDue > 0) {
            const amountPerInstallment = calculatedDue / installmentCount;
            installments = Array.from({ length: installmentCount }).map((_, i) => {
                const date = new Date(firstInstallmentDate);
                if (installmentFrequency === 'Monthly') {
                    date.setMonth(date.getMonth() + i);
                } else {
                    date.setDate(date.getDate() + (i * 7));
                }
                return {
                    id: `${Date.now()}-${i}`,
                    dueDate: date.toISOString().split('T')[0],
                    amount: parseFloat(amountPerInstallment.toFixed(2)),
                    status: 'Pending'
                };
            });
        }

        let giftApplied = 0;
        if (giftCardCode.trim()) {
            const stillDue = Math.max(0, grandTotal - totalPaid);
            if (stillDue > 0) {
                const gc = redeemGiftCard(giftCardCode.trim(), stillDue);
                if (gc.ok && gc.amount > 0) {
                    giftApplied = gc.amount;
                    setGiftCardApplied(gc.amount);
                    setGiftCardError('');
                } else {
                    setGiftCardError(gc.error || 'Gift card could not be applied');
                    // still allow sale without gift card if user continues - non-blocking
                }
            }
        }
        // Debit customer wallet for Store Credit tender lines
        const storeCreditPaid = payments
          .filter((p) => p.method === 'Store Credit')
          .reduce((s, p) => s + (Number(p.amount) || 0), 0);
        if (storeCreditPaid > 0 && finalId) {
          const cust = customers.find((c) => c.id === finalId);
          const wallet = Number(cust?.walletBalance) || 0;
          if (storeCreditPaid > wallet + 0.001) {
            alert(`Insufficient store credit. Available: ${wallet.toFixed(2)}`);
            return;
          }
          const next = applyWalletDelta(wallet, -storeCreditPaid);
          const walletHistory = appendWalletHistory((cust as any)?.walletHistory, {
            amount: -storeCreditPaid,
            balance: next,
            note: `POS sale store credit`,
            source: 'pos',
          });
          updateEntity(finalId, { walletBalance: next, walletHistory } as any);
        }

        const effectivePaid = roundMoney(totalPaid + giftApplied);
        const { amountPaid: paidBal, dueAmount: effectiveDue } = computePaidDue(grandTotal, effectivePaid);
        const effectivePaidClamped = paidBal;
        const payMethod = resolvePaymentMethod({
            payments: payments as any,
            amountPaid: effectivePaidClamped,
            dueAmount: effectiveDue,
            giftApplied,
            hasInstallments: installments.length > 0,
        });
        const splitsNote = paymentSplitsSummary(payments as any);

        const transaction: LedgerEntry = {
            id: Date.now().toString(),
            date: invoiceDate,
            entityId: finalId || undefined,
            entityName: finalName,
            entityMobile: finalMobile,
            type: 'Sale',
            amount: grandTotal,
            paymentMethod: payMethod as any,
            amountPaid: effectivePaidClamped,
            dueAmount: effectiveDue,
            previousDue: previousDue,
            accountId: accountId,
            reference: reference,
            salesperson: salesperson,
            notes: [orderNotes, giftApplied > 0 ? `Gift card ${giftCardCode.trim().toUpperCase()} applied: ${giftApplied}` : '', splitsNote || ''].filter(Boolean).join(' | '),
            deliveryInstructions: deliveryInstructions,
            tags: orderTags,
            installments: installments.length > 0 ? installments : undefined,
            items: [], // filled after FEFO deduction
          details: { subtotal, discount: totalDiscount, tax, delivery: miscAmount, paymentSplits: payments, giftApplied, splitsNote } as any,
          timeline: [
            { status: 'Order Created', date: new Date().toISOString(), user: user?.name, note: 'Sale processed via POS' }
          ]
      };

      const saleItems = cart.map(c => {
        const lotLines = updateProductStock(c.id, c.qty, 'decrease', (c as any).variantId) || [];
        const primary = lotLines[0];
        const prod = products.find((p) => p.id === c.id);
        let usedSerials: string[] | undefined;
        if (prod && ((prod as any).serialUnits?.length || prod.serialNumbers?.length)) {
          const units = normalizeSerialUnits(prod as any);
          const preferredLot = primary?.lotNumber;
          const { next, used } = allocateSerials(units, c.qty, {
            saleId: transaction.id,
            preferredLot,
          });
          usedSerials = used.map((u) => u.serial);
          updateProduct(c.id, {
            serialUnits: next as any,
            serialNumbers: serialsToLegacyList(next),
          } as any);
        }
        return {
          productId: c.id,
          name: c.name,
          qty: c.qty,
          price: c.price,
          total: c.qty * c.price,
          warranty: c.warranty,
          serialNumbers: usedSerials || c.serialNumbers,
          variantId: (c as any).variantId,
          variantName: (c as any).variantName,
          lots: lotLines.length ? lotLines : undefined,
          batchNumber: primary?.lotNumber || (c as any).batchNumber,
          expiryDate: primary?.expiryDate || (c as any).expiryDate,
        };
      });
      transaction.items = saleItems as any;
      addTransaction(transaction);
      playSaleSuccess();

      if (sentKotIds.length > 0) sentKotIds.forEach(id => updateKitchenOrderStatus(id, 'Preparing'));

      // Record real coupon usage (so its usageLimit is actually enforced
      // next time) and deduct redeemed loyalty points - both only after
      // the sale has actually gone through, not just been previewed.
      if (couponResult.valid && couponResult.promoId) recordCouponUsage(couponResult.promoId);

      if (loyaltyDiscount > 0 && selectedCustomerId) redeemLoyaltyPoints(selectedCustomerId, Math.min(redeemPoints, availableLoyaltyPoints));

      setGeneratedInvoice(transaction);
      setShowInvoice(true);
      setDuplicateMatch(null);
      
      // Reset
      setCart([]);
      setCustomerName('Walk-in Customer');
      setCustomerMobile('');
      setSelectedCustomerId(null);
      setPayments([{method: 'Cash', amount: 0}]);
      setSalesperson(user?.name || '');
      setDiscount(0);
      setCouponCode('');
      setGiftCardCode('');
      setGiftCardApplied(0);
      setGiftCardError('');
      setRedeemPoints(0);
      setTax(0);
      setTableNumber('');
      setSentKotIds([]);
      setMiscLabel('');
      setMiscAmount(0);
      setAutoSendInvoice(false);
      setOrderNotes('');
      setDeliveryInstructions('');
      setOrderTags([]);
      setTagInput('');
      setActiveView('products');
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 100);
  };

  return (
    <div id="sell-container" className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
        
        {/* --- MAIN LAYOUT --- */}
        <div className="flex-1 flex overflow-hidden">
            
            {/* LEFT: PRODUCT CATALOG */}
            <div className={`flex-1 flex flex-col bg-slate-50/50 transition-all duration-300 ${activeView === 'checkout' ? 'hidden md:flex' : 'flex'}`}>
                
                {/* Search & Filter Header */}
                <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-20 flex flex-col gap-3 shrink-0">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                        <span className="font-semibold text-slate-600">{language === 'bn' ? 'শর্টকাট:' : 'Shortcuts:'}</span>
                        <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">F2</kbd> {language === 'bn' ? 'সার্চ' : 'Search'}</span>
                        <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">Enter</kbd> {language === 'bn' ? 'যোগ/স্ক্যান' : 'Add/scan'}</span>
                        <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">F9</kbd> {language === 'bn' ? 'চেকআউট' : 'Checkout'}</span>
                        <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">Esc</kbd> {language === 'bn' ? 'ক্লিয়ার/ইনভয়েস বন্ধ' : 'Clear/close invoice'}</span>
                    </div>
                    <div className="flex gap-3">
                        <div className="relative flex-1 group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                            <input 
                                id="product-search-input"
                                ref={searchInputRef}
                                type="text" 
                                placeholder={t('Search name, SKU or barcode...')}
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const code = searchTerm.trim();
                                        if (!code) return;
                                        // Hardware scanners send digits then Enter — treat as barcode first
                                        const byCode = findProductByCode(code);
                                        if (byCode) {
                                            handleBarcodeScan(code);
                                            return;
                                        }
                                        // Exact single filter match
                                        if (filteredProducts.length === 1) {
                                            addToCart(filteredProducts[0]);
                                            setSearchTerm('');
                                        }
                                    }
                                }}
                                className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                                autoComplete="off"
                                title={language === 'bn' ? 'F2 সার্চ · F9 চেকআউট · Esc ক্লিয়ার' : 'F2 search · F9 checkout · Esc clear/close'}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowBarcodeScanner(true)}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm"
                            title="Open barcode scanner"
                        >
                            <Barcode className="w-6 h-6" />
                        </button>
                    </div>

                    {scanFeedback && (
                        <div className={`text-xs font-semibold px-3 py-2 rounded-lg ${scanFeedback.type === 'ok' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                            {scanFeedback.msg}
                        </div>
                    )}

                    {/* Category Pills */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar -mx-4 px-4">
                        <button 
                            onClick={() => setCategoryFilter('')} 
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${!categoryFilter ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                        >
                            {t('All Items')}
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat} 
                                onClick={() => setCategoryFilter(cat)} 
                                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${categoryFilter === cat ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Product Grid */}
                <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar">
                    {filteredProducts.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 mb-3 shadow-xs">
                                <Search className="w-8 h-8" />
                            </div>
                            <p className="font-bold text-slate-700 text-base">
                                {language === 'bn' ? 'কোনো পণ্য পাওয়া যায়নি' : 'No products found'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                {searchTerm ? `No matches for "${searchTerm}". Try checking the spelling, selecting another category, or scanning a barcode.` : 'Your store has no products loaded in this category.'}
                            </p>
                            {searchTerm && (
                                <button
                                    type="button"
                                    onClick={() => setSearchTerm('')}
                                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs transition-colors"
                                >
                                    {language === 'bn' ? 'সার্চ রিসেট করুন' : 'Clear Search'}
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-32 md:pb-4">
                            {filteredProducts.map(product => {
                                const inCart = cart.find(c => c.id === product.id);
                                const isOutOfStock = product.stock <= 0;
                                const isLowStock = product.stock > 0 && product.stock <= 5;

                                return (
                                    <div 
                                        key={product.id} 
                                        onClick={() => addToCart(product)}
                                        className={`group relative bg-white rounded-2xl p-3 border shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col h-full active:scale-[0.98] ${
                                            inCart 
                                                ? 'ring-2 ring-indigo-500 border-transparent' 
                                                : isOutOfStock 
                                                    ? 'border-slate-200 opacity-60 hover:border-rose-300' 
                                                    : 'border-slate-200 hover:border-indigo-300'
                                        }`}
                                    >
                                        {/* Stock Badge */}
                                        <div className={`absolute top-3 left-3 z-10 px-2 py-0.5 rounded-md text-[10px] font-bold shadow-2xs backdrop-blur-md ${
                                            isOutOfStock 
                                                ? 'bg-rose-600 text-white font-extrabold' 
                                                : isLowStock 
                                                    ? 'bg-amber-500 text-white font-bold' 
                                                    : 'bg-white/95 text-slate-700 ring-1 ring-slate-900/5'
                                        }`}>
                                            {isOutOfStock ? (language === 'bn' ? 'স্টক শেষ' : 'Out of Stock') : `${product.stock} ${product.unit || t('Pcs')}`}
                                        </div>

                                        {/* Qty Badge */}
                                        {inCart && (
                                            <div className="absolute top-3 right-3 z-10 w-6 h-6 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-200">
                                                {inCart.qty}
                                            </div>
                                        )}

                                        {/* Image */}
                                        <div className="aspect-square bg-slate-50 rounded-xl mb-3 relative overflow-hidden flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                                            {product.image ? (
                                                <img src={product.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={product.name} />
                                            ) : (
                                                <Box className="w-10 h-10 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 flex flex-col">
                                            <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1 group-hover:text-indigo-600 transition-colors">{product.name}</h3>
                                            <p className="text-[10px] text-slate-400 font-medium mb-2 hidden md:block uppercase tracking-wider">{product.category}</p>
                                            
                                            <div className="mt-auto flex items-end justify-between pt-3 border-t border-slate-50">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">{t('Price')}</span>
                                                    <span className="font-bold text-base md:text-lg text-indigo-600 leading-none">{formatMoney(product.salePrice)}</span>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    disabled={isOutOfStock}
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all shadow-xs ${
                                                        isOutOfStock 
                                                            ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                                                            : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white'
                                                    }`}
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT: CHECKOUT VIEW */}
            {/* Added md:z-auto to prevent high z-index on desktop */}
            <div className={`fixed inset-0 z-[70] bg-white dark:bg-slate-900 flex flex-col transition-transform duration-300 transform md:relative md:translate-x-0 md:w-[420px] md:border-l md:border-slate-200 dark:md:border-slate-800 md:shadow-xl md:z-0 ${activeView === 'checkout' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
                
                {/* Checkout Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shadow-sm z-10 shrink-0">
                    <button onClick={() => setActiveView('products')} className="md:hidden p-2 -ml-2 text-slate-500 active:bg-slate-50 rounded-lg">
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingCart className="w-5 h-5 text-indigo-600" /> {t('Checkout')}
                        {productsRealtimeActive && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Live stock</span>
                        )}
                        {!productsRealtimeActive && lastProductsSyncAt && (
                          <span className="ml-2 text-[10px] text-slate-400" title={lastProductsSyncAt}>Synced</span>
                        )}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => {
                                const csv = cart.map(i => `${i.name},${i.qty},${i.price}`).join('\n');
                                const blob = new Blob([`Name,Qty,Price\n${csv}`], { type: 'text/csv' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `cart_${Date.now()}.csv`;
                                a.click();
                            }}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Export Cart"
                        >
                            <Download className="w-4 h-4" />
                        </button>
                        <button 
                            type="button"
                            onClick={() => {
                                if (cart.length > 0) setShowClearConfirm(true);
                            }} 
                            disabled={cart.length === 0}
                            className="text-xs font-bold text-red-500 bg-red-50 px-3 py-1.5 rounded-full hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            {t('Clear')}
                        </button>
                    </div>
                </div>

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                    {isRestaurant && (
                        <div className="p-4 bg-orange-50 border-b border-orange-100 space-y-3 shrink-0">
                            <div className="flex items-center gap-2">
                                <ChefHat className="w-4 h-4 text-orange-600" />
                                <span className="text-xs font-bold text-orange-700 uppercase tracking-wider">Kitchen Order</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <select
                                    value={orderType}
                                    onChange={e => setOrderType(e.target.value as any)}
                                    className="px-3 py-2 border border-orange-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                >
                                    <option value="Dine-In">Dine-In</option>
                                    <option value="Takeaway">Takeaway</option>
                                    <option value="Delivery">Delivery</option>
                                </select>
                                {orderType === 'Dine-In' && (
                                    <input
                                        value={tableNumber}
                                        onChange={e => setTableNumber(e.target.value)}
                                        placeholder="Table #"
                                        className="px-3 py-2 border border-orange-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    />
                                )}
                            </div>
                            <button
                                onClick={sendToKitchen}
                                disabled={cart.length === 0 || sentKotIds.length > 0}
                                className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <ChefHat className="w-4 h-4" />
                                {sentKotIds.length > 0 ? `Sent to Kitchen (${sentKotIds.length} station${sentKotIds.length > 1 ? 's' : ''}) ✓` : 'Send to Kitchen'}
                            </button>
                        </div>
                    )}
                    {/* STEP 1: Cart Items Review */}
                    <div className="p-4 bg-white border-b border-slate-200 shrink-0">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <ShoppingCart className="w-3.5 h-3.5 text-indigo-600" />
                                {t('Cart Items')} ({cart.reduce((a, b) => a + b.qty, 0)})
                            </span>
                            <span className="text-xs font-black text-indigo-600">{formatMoney(subtotal)}</span>
                        </div>

                        {cart.length === 0 ? (
                            <div className="py-8 flex flex-col items-center justify-center text-slate-400 opacity-60">
                                <ShoppingBag className="w-12 h-12 mb-2 stroke-1" />
                                <p className="text-xs font-medium text-center">
                                    {language === 'bn'
                                      ? 'কার্ট খালি — সার্চ বা বারকোড স্ক্যান করে পণ্য যোগ করুন'
                                      : 'Cart is empty — search or scan a barcode to add items'}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                                {cart.map(item => (
                                    <div key={(item as any).cartKey || item.id} className="bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 shadow-sm hover:border-indigo-300 transition-colors">
                                        {/* Header */}
                                        <div className="flex justify-between items-baseline mb-2">
                                            <span className="font-bold text-slate-800 text-xs line-clamp-1 pr-2">{item.name}</span>
                                            <span className="font-black text-indigo-600 text-xs shrink-0">{formatMoney(item.price * item.qty)}</span>
                                        </div>
                                        
                                        {/* Controls */}
                                        <div className="flex items-center gap-2">
                                            {/* Qty Stepper */}
                                            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 h-7">
                                                <button 
                                                    type="button"
                                                    onClick={() => updateQty(item.id, -1)} 
                                                    className="w-5 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded active:scale-95 transition-transform"
                                                    title="Decrease quantity"
                                                >
                                                    <Minus className="w-3 h-3"/>
                                                </button>
                                                <span className="w-7 text-center text-xs font-bold text-slate-800">{item.qty}</span>
                                                <button 
                                                    type="button"
                                                    onClick={() => updateQty(item.id, 1)} 
                                                    className="w-5 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded active:scale-95 transition-transform"
                                                    title="Increase quantity"
                                                >
                                                    <Plus className="w-3 h-3"/>
                                                </button>
                                            </div>

                                            {/* Price Edit */}
                                            <div className="flex-1 flex items-center border border-slate-200 rounded-lg px-2 h-7 bg-white focus-within:ring-1 focus-within:ring-indigo-500">
                                                <span className="text-[10px] text-slate-400 mr-1">{currencySymbol}</span>
                                                <input 
                                                    type="number" 
                                                    className="w-full text-xs font-bold text-slate-800 outline-none bg-transparent"
                                                    value={item.price}
                                                    onChange={e => updateItemPrice(item.id, e.target.value)}
                                                />
                                            </div>
                                            
                                            {/* Extras Menu (SN & Warranty) */}
                                            <button 
                                                type="button"
                                                onClick={() => openExtrasModal(item.id)}
                                                className={`h-7 w-7 flex items-center justify-center rounded-lg border transition-colors active:scale-95 ${
                                                    (item.serialNumbers?.length > 0 || item.warranty) 
                                                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                                                    : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                                                }`}
                                                title="Item Serial Number & Warranty"
                                            >
                                                <Settings className="w-3.5 h-3.5" />
                                            </button>

                                            {/* Quick Item Delete */}
                                            <button
                                                type="button"
                                                onClick={() => setCart(cart.filter(i => (i as any).cartKey && (item as any).cartKey ? (i as any).cartKey !== (item as any).cartKey : i.id !== item.id))}
                                                className="h-7 w-7 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                                title={t('Remove item')}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                        
                                        {/* Tags display */}
                                        {(item.serialNumbers.length > 0 || item.warranty) && (
                                            <div className="mt-1.5 flex flex-wrap gap-1">
                                                {item.warranty && <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100 flex items-center gap-1"><ShieldCheck className="w-3 h-3"/> {item.warranty}</span>}
                                                {item.serialNumbers.length > 0 && <span className="text-[9px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1"><Hash className="w-3 h-3"/> {item.serialNumbers.length} SN</span>}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* STEP 2: Customer Selection */}
                    <div className="p-4 bg-slate-50/70 border-b border-slate-200 space-y-3 shrink-0">
                        <div id="customer-select-section" className="relative">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{t('Customer')}</label>
                                {(customerName !== 'Walk-in Customer' || customerMobile || selectedCustomerId) && (
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setSelectedCustomerId(null);
                                            setCustomerName('Walk-in Customer');
                                            setCustomerMobile('');
                                            setPreviousDue(0);
                                            setCustomerSuggestions([]);
                                        }}
                                        className="text-[10px] font-bold text-slate-500 hover:text-red-600 bg-white hover:bg-red-50 border border-slate-200 px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 shadow-sm"
                                        title="Reset to Walk-in Customer"
                                    >
                                        <X className="w-3 h-3" /> Walk-in
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center bg-white border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 overflow-hidden shadow-sm transition-all hover:border-slate-400">
                                <div className="pl-3 text-slate-400"><User className="w-4 h-4" /></div>
                                <input 
                                    type="text"
                                    value={customerName}
                                    onFocus={() => customerName === 'Walk-in Customer' && setCustomerName('')}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    onBlur={() => !customerName.trim() && setCustomerName('Walk-in Customer')}
                                    className="w-full px-3 py-2.5 text-xs outline-none font-medium text-slate-900 placeholder:text-slate-400 bg-transparent"
                                    placeholder="Name or Mobile"
                                />
                                {selectedCustomerId && (
                                    <button 
                                        onClick={() => setShowHistoryModal(true)}
                                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg mr-1"
                                        title="Purchase History"
                                    >
                                        <History className="w-4 h-4" />
                                    </button>
                                )}
                                {selectedCustomerId && <CheckCircle className="w-4 h-4 text-emerald-500 mr-2.5" />}
                            </div>

                            {/* Suggestions Dropdown */}
                            {customerSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 z-50 max-h-48 overflow-y-auto">
                                    {customerSuggestions.map(c => (
                                        <button key={c.id} onClick={() => handleCustomerSelect(c)} className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b border-slate-50 last:border-0 flex justify-between items-center group">
                                            <div>
                                                <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">{c.name}</p>
                                                <p className="text-[10px] text-slate-500">{c.mobile}</p>
                                            </div>
                                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {(customerName !== 'Walk-in Customer' || customerMobile) && (
                            <div className="space-y-2">
                                <input 
                                    type="tel"
                                    value={customerMobile}
                                    onChange={e => setCustomerMobile(e.target.value)}
                                    placeholder={t('Phone Number')}
                                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                                />
                                {previousDue > 0 && (
                                    <div className="flex justify-between items-center px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg animate-in fade-in">
                                        <span className="text-[10px] font-bold text-red-600 uppercase">{t('Previous Due')}</span>
                                        <span className="text-xs font-black text-red-700">{formatMoney(previousDue)}</span>
                                    </div>
                                )}
                                {selectedCustomerId && availableStoreCredit > 0 && (
                                    <div className="flex justify-between items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                                        <div>
                                            <span className="text-[10px] font-bold text-emerald-700 uppercase">Store credit</span>
                                            <span className="text-xs font-black text-emerald-800 ml-2">{formatMoney(availableStoreCredit)}</span>
                                        </div>
                                        <button
                                            type="button"
                                            className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded hover:bg-emerald-700"
                                            onClick={() => {
                                                const remaining = Math.max(0, grandTotal - totalPaid);
                                                const use = Math.min(availableStoreCredit, remaining > 0 ? remaining : grandTotal);
                                                if (use <= 0) return;
                                                const idx = payments.findIndex((p) => p.method === 'Store Credit');
                                                if (idx >= 0) {
                                                    handleUpdatePayment(idx, 'amount', use);
                                                } else {
                                                    setPayments([...payments, { method: 'Store Credit', amount: use }]);
                                                }
                                            }}
                                        >
                                            Apply
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* STEP 3: Receiving Account & Payment Tender */}
                    <div className="p-4 bg-white border-b border-slate-200 space-y-3 shrink-0">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Account</label>
                            <select 
                                value={accountId} 
                                onChange={e => setAccountId(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 font-bold"
                            >
                                {financialAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.balance)})</option>)}
                            </select>
                        </div>

                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('Payments')}</label>
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={handleAddPayment}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" /> {t('Add Method')}
                                </button>
                                <button type="button" onClick={autoFillDueRemainder} className="text-[10px] font-bold text-amber-700 hover:underline">
                                    Auto-fill Due
                                </button>
                            </div>
                        </div>

                        {!splitValidation.ok && (
                            <p className="text-[10px] text-red-600 font-semibold">{splitValidation.errors[0]}</p>
                        )}
                        {splitValidation.ok && splitValidation.warnings[0] && (
                            <p className="text-[10px] text-amber-600 font-semibold">{splitValidation.warnings[0]}</p>
                        )}
                        
                        <div className="space-y-2">
                            {payments.map((p, idx) => (
                                <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
                                    <div className="flex gap-2 items-center">
                                        <select 
                                            value={p.method} 
                                            onChange={e => handleUpdatePayment(idx, 'method', e.target.value)}
                                            className="w-1/2 min-w-0 px-2.5 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900 font-bold truncate"
                                        >
                                            <option value="Cash">Cash</option>
                                            <option value="Card">Card</option>
                                            <option value="Mobile Banking">Mobile Banking</option>
                                            <option value="Store Credit">Store Credit</option>
                                            <option value="Gift Card">Gift Card</option>
                                            <option value="Due">Due / Credit</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="Installment">Installment</option>
                                            <option value="Online">Online (bKash/Stripe/Sandbox)</option>
                                        </select>
                                        <div className="w-1/2 min-w-0 flex items-center bg-white border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                                            <span className="pl-2 text-slate-500 text-[10px] font-bold shrink-0">{currencySymbol}</span>
                                            <input 
                                                type="number"
                                                value={p.amount}
                                                onChange={e => handleUpdatePayment(idx, 'amount', e.target.value ? parseFloat(e.target.value) : 0)}
                                                className="w-full min-w-0 px-2 py-2 text-xs outline-none font-bold text-slate-900 bg-transparent"
                                            />
                                            {payments.length > 1 && (
                                                <button onClick={() => handleRemovePayment(idx)} className="px-2 text-red-400 hover:text-red-600 shrink-0" title="Remove method">
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {p.method === 'Online' && (
                                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200">
                                            <button
                                                type="button"
                                                disabled={onlinePayBusy || !!(p as any).paidOnline}
                                                onClick={() => startOnlinePayment(idx)}
                                                className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                            >
                                                {(p as any).paidOnline ? 'Paid online ✓' : onlinePayBusy ? 'Processing…' : 'Charge online'}
                                            </button>
                                            {(p as any).intentId && (
                                                <span className="text-[10px] text-slate-400 font-mono">{(p as any).intentId}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                            {onlinePayMsg && (
                                <p className="text-[11px] font-semibold text-indigo-700 px-1">{onlinePayMsg}</p>
                            )}
                        </div>

                        {/* Quick Cash Tender Shortcuts */}
                        {payments.some(p => p.method === 'Cash') && grandTotal > 0 && (
                            <div className="pt-1.5 border-t border-slate-100">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                                    Quick Cash Tender
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => applyCashTender(grandTotal)}
                                        className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                                    >
                                        Exact ({formatMoney(grandTotal)})
                                    </button>
                                    {quickTenderOptions.filter(amt => Math.abs(amt - grandTotal) > 0.01).map(amt => (
                                        <button
                                            key={amt}
                                            type="button"
                                            onClick={() => applyCashTender(amt)}
                                            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
                                        >
                                            {formatMoney(amt)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Due & Change Indicators */}
                        <div className="space-y-1.5 pt-1">
                            {calculatedDue > 0 && (
                                <div className="flex justify-between items-center px-3 py-1.5 bg-amber-50 border border-amber-100 rounded-lg">
                                    <span className="text-[10px] font-bold text-amber-700 uppercase">{t('Current Due')}</span>
                                    <span className="text-xs font-black text-amber-700">{formatMoney(calculatedDue)}</span>
                                </div>
                            )}

                            {calculatedDue < 0 && (
                                <div className="flex justify-between items-center px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                                    <span className="text-[10px] font-bold text-emerald-700 uppercase">{t('Change Due')}</span>
                                    <span className="text-xs font-black text-emerald-700">{formatMoney(Math.abs(calculatedDue))}</span>
                                </div>
                            )}
                            
                            {(previousDue > 0 || calculatedDue !== 0) && (
                                <div className={`flex justify-between items-center px-3 py-1.5 border rounded-lg ${previousDue + calculatedDue < 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-100 border-slate-200'}`}>
                                    <span className={`text-[10px] font-bold uppercase ${previousDue + calculatedDue < 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
                                        {previousDue + calculatedDue < 0 ? t('Net Credit Balance') : t('Total Outstanding')}
                                    </span>
                                    <span className={`text-xs font-black ${previousDue + calculatedDue < 0 ? 'text-emerald-800' : 'text-slate-800'}`}>
                                        {formatMoney(Math.abs(previousDue + calculatedDue))}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Installment Plan Config */}
                        {payments.some(p => p.method === 'Installment') && calculatedDue > 0 && (
                            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 space-y-2.5 animate-in fade-in">
                                <h4 className="text-xs font-bold text-indigo-800 uppercase flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5" /> {t('Installment Plan')}
                                </h4>
                                
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] font-bold text-indigo-600 uppercase mb-1 block">{t('Number of Installments')}</label>
                                        <input 
                                            type="number" 
                                            min="2" 
                                            max="36"
                                            value={installmentCount}
                                            onChange={e => setInstallmentCount(Math.max(2, parseInt(e.target.value) || 2))}
                                            className="w-full p-1.5 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-center"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-indigo-600 uppercase mb-1 block">{t('Frequency')}</label>
                                        <select 
                                            value={installmentFrequency}
                                            onChange={e => setInstallmentFrequency(e.target.value as any)}
                                            className="w-full p-1.5 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                        >
                                            <option value="Monthly">Monthly</option>
                                            <option value="Weekly">Weekly</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-indigo-600 uppercase mb-1 block">{t('First Payment Date')}</label>
                                    <input 
                                        type="date" 
                                        value={firstInstallmentDate}
                                        onChange={e => setFirstInstallmentDate(e.target.value)}
                                        className="w-full p-1.5 text-xs border border-indigo-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                                    />
                                </div>

                                <div className="bg-white rounded-lg border border-indigo-100 overflow-hidden">
                                    <div className="bg-indigo-100 px-2.5 py-1 text-[9px] font-bold text-indigo-800 uppercase flex justify-between">
                                        <span>Date</span>
                                        <span>Amount</span>
                                    </div>
                                    <div className="max-h-24 overflow-y-auto">
                                        {Array.from({ length: installmentCount }).map((_, i) => {
                                            const date = new Date(firstInstallmentDate);
                                            if (installmentFrequency === 'Monthly') {
                                                date.setMonth(date.getMonth() + i);
                                            } else {
                                                date.setDate(date.getDate() + (i * 7));
                                            }
                                            const amount = (calculatedDue / installmentCount).toFixed(2);
                                            return (
                                                <div key={i} className="flex justify-between px-2.5 py-1 text-[11px] border-b border-slate-50 last:border-0 text-slate-600">
                                                    <span>{date.toLocaleDateString()}</span>
                                                    <span className="font-mono font-bold">{formatMoney(parseFloat(amount))}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        )}

                        {isDueError && (
                            <div className="bg-red-50 text-red-700 text-xs p-2.5 rounded-lg flex items-start gap-2 font-bold animate-in slide-in-from-top-1 border border-red-100">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                {t('Due/Partial sale এর জন্য কাস্টমার সিলেক্ট করা বাধ্যতামূলক')}
                            </div>
                        )}
                        {hasDueWithoutDueMethod && !isDueError && (
                            <div className="bg-orange-50 text-orange-700 text-xs p-2.5 rounded-lg flex items-start gap-2 font-bold animate-in slide-in-from-top-1 border border-orange-100">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                {t('পেমেন্ট সম্পূর্ণ না হলে পেমেন্ট মেথড হিসেবে "Due/Credit" বা "Installment" যোগ করুন')}
                            </div>
                        )}
                    </div>

                    {/* STEP 4: Collapsible Discounts, Taxes & Order Options */}
                    <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <button
                                type="button"
                                onClick={() => setShowExtras(!showExtras)}
                                className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                                <div className="flex items-center gap-2">
                                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>{t('Discounts, Taxes & Order Options')}</span>
                                    {(discount > 0 || couponResult.valid || giftCardApplied > 0 || loyaltyDiscount > 0 || tax > 0 || miscAmount > 0 || orderNotes || deliveryInstructions) && (
                                        <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                            Applied
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 text-slate-400">
                                    <span className="text-[10px] uppercase font-bold">{showExtras ? 'Hide' : 'Expand'}</span>
                                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showExtras ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            {showExtras && (
                                <div className="p-3.5 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-1 bg-white">
                                    {/* Discount & Coupon */}
                                    <div className="flex gap-2.5">
                                        <div className="flex-1 flex items-center bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 focus-within:border-indigo-300">
                                            <span className="text-[10px] font-bold text-slate-500 mr-2 uppercase">{t('Discount')}</span>
                                            <input 
                                                type="number" 
                                                value={discount} 
                                                onChange={e => setDiscount(parseFloat(e.target.value)||0)} 
                                                className="w-full bg-transparent text-right outline-none text-slate-900 font-bold text-xs" 
                                                placeholder="0" 
                                            />
                                        </div>
                                        <div className="flex-1 flex items-center bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 focus-within:border-indigo-300">
                                            <span className="text-[10px] font-bold text-slate-500 mr-2 uppercase">{t('Coupon')}</span>
                                            <input 
                                                type="text" 
                                                value={couponCode} 
                                                onChange={e => setCouponCode(e.target.value)} 
                                                className="w-full bg-transparent text-right outline-none text-slate-900 font-bold text-xs uppercase" 
                                                placeholder="CODE" 
                                            />
                                        </div>
                                    </div>
                                    {couponError && (
                                        <p className="text-[11px] text-red-500 font-semibold -mt-1.5">{couponError}</p>
                                    )}
                                    {couponResult.valid && (
                                        <p className="text-[11px] text-emerald-600 font-semibold -mt-1.5">Coupon applied: -{formatMoney(couponDiscount)}</p>
                                    )}

                                    {/* Gift Card */}
                                    <div className="flex items-center bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 focus-within:border-indigo-300">
                                        <span className="text-[10px] font-bold text-slate-500 mr-2 uppercase shrink-0">Gift Card</span>
                                        <input 
                                            type="text" 
                                            value={giftCardCode} 
                                            onChange={e => { setGiftCardCode(e.target.value); setGiftCardError(''); setGiftCardApplied(0); }} 
                                            className="w-full bg-transparent text-right outline-none text-slate-900 font-bold text-xs uppercase" 
                                            placeholder="GC-XXXX" 
                                        />
                                    </div>
                                    {giftCardError && (
                                        <p className="text-[11px] text-red-500 font-semibold -mt-1.5">{giftCardError}</p>
                                    )}
                                    {giftCardApplied > 0 && (
                                        <div className="flex justify-between text-emerald-700 text-xs font-bold">
                                            <span>Gift card applied</span>
                                            <span>-{formatMoney(giftCardApplied)}</span>
                                        </div>
                                    )}

                                    {/* Loyalty Redemption */}
                                    {loyaltyConfig.enabled && selectedCustomerId && availableLoyaltyPoints > 0 && (
                                        <div className="space-y-1">
                                            <div className="flex items-center bg-amber-50 rounded-lg px-2.5 py-1.5 border border-amber-200 focus-within:border-amber-400">
                                                <span className="text-[10px] font-bold text-amber-700 mr-2 uppercase whitespace-nowrap">Redeem Points ({availableLoyaltyPoints})</span>
                                                <input
                                                    type="number"
                                                    min={0}
                                                    max={availableLoyaltyPoints}
                                                    value={redeemPoints || ''}
                                                    onChange={e => setRedeemPoints(Math.min(availableLoyaltyPoints, Math.max(0, parseInt(e.target.value) || 0)))}
                                                    className="w-full bg-transparent text-right outline-none text-slate-900 font-bold text-xs"
                                                    placeholder="0"
                                                />
                                            </div>
                                            {loyaltyDiscount > 0 && (
                                                <p className="text-[11px] text-amber-600 font-semibold">Loyalty redemption: -{formatMoney(loyaltyDiscount)}</p>
                                            )}
                                        </div>
                                    )}

                                    {/* Tax & Extra / Delivery Charge */}
                                    <div className="flex gap-2.5">
                                        <div className="flex-1 flex items-center bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 focus-within:border-indigo-300">
                                            <span className="text-[10px] font-bold text-slate-500 mr-2 uppercase">{t('Tax')}</span>
                                            <input 
                                                type="number" 
                                                value={tax} 
                                                onChange={e => setTax(parseFloat(e.target.value)||0)} 
                                                className="w-full bg-transparent text-right outline-none text-slate-900 font-bold text-xs" 
                                                placeholder="0" 
                                            />
                                        </div>
                                        <div className="flex-1 flex gap-1">
                                            <input 
                                                type="text" 
                                                value={miscLabel} 
                                                onChange={e => setMiscLabel(e.target.value)} 
                                                placeholder={t('Delivery')} 
                                                className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-300"
                                            />
                                            <div className={`w-1/2 flex items-center bg-slate-50 rounded-lg px-2 py-1.5 border transition-colors ${miscLabel ? 'border-indigo-300 bg-white' : 'border-slate-200 opacity-60'}`}>
                                                <input 
                                                    type="number" 
                                                    value={miscAmount} 
                                                    onChange={e => setMiscAmount(parseFloat(e.target.value)||0)} 
                                                    disabled={!miscLabel}
                                                    className="w-full bg-transparent text-right outline-none text-slate-900 font-bold text-xs" 
                                                    placeholder="0" 
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Salesperson & Notes */}
                                    <div className="space-y-2 pt-1 border-t border-slate-100">
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{t('Salesperson')}</label>
                                            <select 
                                                value={salesperson} 
                                                onChange={e => setSalesperson(e.target.value)} 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-300 focus:bg-white"
                                            >
                                                <option value="Counter">Counter</option>
                                                {staff.filter(s => s.status === 'Active').map(s => (
                                                    <option key={s.id} value={s.name}>{s.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{t('Order Notes')}</label>
                                            <input 
                                                type="text" 
                                                value={orderNotes} 
                                                onChange={e => setOrderNotes(e.target.value)} 
                                                placeholder={t('Any special notes...')} 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-300 focus:bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{t('Delivery Instructions')}</label>
                                            <input 
                                                type="text" 
                                                value={deliveryInstructions} 
                                                onChange={e => setDeliveryInstructions(e.target.value)} 
                                                placeholder={t('Delivery Instructions')} 
                                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-300 focus:bg-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">{t('Tags')}</label>
                                            <div className="flex flex-wrap gap-1 p-1.5 bg-slate-50 border border-slate-200 rounded-lg min-h-[34px]">
                                                {orderTags.map(tag => (
                                                    <span key={tag} className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 shadow-sm">
                                                        {tag}
                                                        <button type="button" onClick={() => setOrderTags(orderTags.filter(t => t !== tag))} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                                                    </span>
                                                ))}
                                                <input 
                                                    type="text" 
                                                    value={tagInput} 
                                                    onChange={e => setTagInput(e.target.value)} 
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && tagInput.trim()) {
                                                            setOrderTags([...orderTags, tagInput.trim()]);
                                                            setTagInput('');
                                                        }
                                                    }}
                                                    placeholder={t('Add Tag...')} 
                                                    className="bg-transparent border-none rounded px-1 text-[10px] text-slate-800 outline-none w-20"
                                                />
                                            </div>
                                        </div>

                                        {/* Auto Send Invoice Toggle */}
                                        <div className="flex items-center justify-between p-2.5 bg-indigo-50/50 rounded-xl border border-indigo-100">
                                            <div className="flex items-center gap-2.5">
                                                <div 
                                                    className={`w-9 h-5 rounded-full p-0.5 cursor-pointer transition-colors ${autoSendInvoice ? 'bg-indigo-600' : 'bg-slate-300'}`} 
                                                    onClick={() => setAutoSendInvoice(!autoSendInvoice)}
                                                >
                                                    <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${autoSendInvoice ? 'translate-x-4' : 'translate-x-0'}`} />
                                                </div>
                                                <span className="text-xs font-bold text-slate-700">Auto Send Invoice</span>
                                            </div>
                                            {autoSendInvoice && (
                                                <span className="text-[9px] text-indigo-600 font-bold bg-white px-2 py-0.5 rounded-full shadow-sm border border-indigo-100 uppercase">SMS/Email</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* STEP 5: Sticky Summary Footer */}
                <div id="checkout-summary-section" className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] z-10 shrink-0" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}>
                    {nearExpiryCartAlerts.length > 0 && (
                        <div className="mb-2.5 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 flex gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                            <div>
                                <p className="font-bold text-[11px]">
                                    {nearExpiryCartAlerts.filter((a) => a.status === 'expired').length
                                      ? 'Expired / near-expiry lots in cart'
                                      : 'Near-expiry lots in cart'}
                                </p>
                                <ul className="mt-0.5 space-y-0.5 text-[10px]">
                                    {nearExpiryCartAlerts.slice(0, 3).map((a, i) => (
                                        <li key={i}>
                                            {a.name} · {a.lotNumber} ({a.expiryDate})
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5 mb-3 text-xs">
                        <div className="flex justify-between text-slate-500">
                            <span>{t('Subtotal')}</span>
                            <span className="font-semibold text-slate-800">{formatMoney(subtotal)}</span>
                        </div>
                        {totalDiscount > 0 && (
                            <div className="flex justify-between text-emerald-600 font-medium">
                                <span>{t('Discount / Promo')}</span>
                                <span>-{formatMoney(totalDiscount)}</span>
                            </div>
                        )}
                        {(tax > 0 || miscAmount > 0) && (
                            <div className="flex justify-between text-slate-500">
                                <span>
                                    {tax > 0 ? `Tax (${formatMoney(tax)})` : ''}
                                    {tax > 0 && miscAmount > 0 ? ' + ' : ''}
                                    {miscAmount > 0 ? `${miscLabel || 'Extra'} (${formatMoney(miscAmount)})` : ''}
                                </span>
                                <span className="font-semibold text-slate-800">+{formatMoney(tax + miscAmount)}</span>
                            </div>
                        )}

                        <div className="flex justify-between items-baseline pt-2 border-t border-slate-100">
                            <div>
                                <span className="font-extrabold text-base text-slate-900 block leading-tight">{t('Total Payable')}</span>
                                {previousDue > 0 && (
                                    <span className="text-[10px] text-slate-400 font-medium">(Includes prev. due {formatMoney(previousDue)})</span>
                                )}
                            </div>
                            <span className="font-black text-2xl text-indigo-600">{formatMoney(grandTotal + previousDue)}</span>
                        </div>

                        {(calculatedDue + previousDue) > 0 && (
                            <div className="flex justify-between items-center text-red-600 font-bold text-xs pt-0.5">
                                <span>{t('Total Due')}</span>
                                <span>{formatMoney(calculatedDue + previousDue)}</span>
                            </div>
                        )}
                        {calculatedDue < 0 && (
                            <div className="flex justify-between items-center text-emerald-600 font-bold text-xs pt-0.5">
                                <span>{t('Change Due')}</span>
                                <span>{formatMoney(Math.abs(calculatedDue))}</span>
                            </div>
                        )}
                    </div>

                    <button 
                        id="pos-confirm-sale-btn"
                        onClick={() => {
                            handleCheckoutClick();
                            if (autoSendInvoice) {
                                console.log("Auto sending invoice to customer...");
                                alert("Invoice automatically sent to customer!");
                            }
                        }}
                        disabled={checkoutBusy || cart.length === 0 || isDueError || hasDueWithoutDueMethod}
                        className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-base shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                    >
                        {checkoutBusy
                          ? (language === 'bn' ? 'প্রসেসিং…' : 'Processing…')
                          : <>{t('Confirm Sale')} <span className="text-xs opacity-60 font-mono">[F9]</span> <ArrowRight className="w-4 h-4" /></>}
                    </button>
                </div>
            </div>
        </div>

        {/* --- MOBILE STICKY BAR (Only on Product View) --- */}
        {cart.length > 0 && activeView === 'products' && (
            <div 
                className="md:hidden fixed left-0 right-0 bg-white border-t border-slate-200 p-3 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.1)] z-[45] flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2"
                style={{ bottom: 'max(4.25rem, calc(3.85rem + env(safe-area-inset-bottom, 0px)))' }}
            >
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{cart.reduce((a,b)=>a+b.qty,0)} Items</p>
                    <p className="text-xl font-black text-slate-900">{formatMoney(subtotal)}</p>
                </div>
                <button 
                    onClick={() => setActiveView('checkout')}
                    className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-200 active:scale-95 transition-transform"
                >
                    {t('Checkout')} <ArrowRight className="w-5 h-5" />
                </button>
            </div>
        )}

        {/* --- EXTRAS MODAL (SN & Warranty) --- */}
        {extrasModal.show && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-800">{t('Item Details')}</h3>
                        <button onClick={() => setExtrasModal({show: false, itemId: null})}><X className="w-5 h-5 text-slate-400"/></button>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* Warranty */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('Warranty')}</label>
                            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500">
                                <span className="bg-slate-50 p-2 border-r border-slate-200 text-slate-500"><ShieldCheck className="w-4 h-4"/></span>
                                <input 
                                    type="text" 
                                    value={tempWarranty}
                                    onChange={e => setTempWarranty(e.target.value)}
                                    placeholder="e.g. 1 Year"
                                    className="w-full p-2 text-sm outline-none text-slate-800"
                                />
                            </div>
                        </div>

                        {/* Serial Numbers */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Serial Numbers</label>
                            <div className="bg-slate-50 rounded-lg p-2 border border-slate-200 max-h-40 overflow-y-auto space-y-2">
                                {tempSns.map((sn, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-[10px] font-mono text-slate-400 w-4">#{idx+1}</span>
                                        <input 
                                            type="text"
                                            value={sn}
                                            onChange={e => handleSnChange(idx, e.target.value)}
                                            placeholder={`SN for item ${idx+1}`}
                                            className="flex-1 text-sm border border-slate-300 rounded px-2 py-1 outline-none focus:border-indigo-500 text-slate-800"
                                        />
                                    </div>
                                ))}
                                {tempSns.length === 0 && <p className="text-xs text-slate-400 text-center py-2">Add items to cart to enable SN entry.</p>}
                            </div>
                        </div>

                        <button 
                            onClick={saveExtras}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                        >
                            {t('Save Details')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- DUPLICATE CUSTOMER MODAL --- */}
        {duplicateMatch && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                    <div className="bg-amber-50 p-6 flex flex-col items-center text-center border-b border-amber-100">
                        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-7 h-7 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Duplicate Customer</h3>
                        <p className="text-sm text-slate-600 mt-2 font-medium">"This customer name already exists. Is it the same person?"</p>
                        <div className="mt-3 bg-white p-3 rounded-lg border border-amber-200 w-full text-left">
                            <p className="text-xs text-slate-500 uppercase font-bold">Existing Record:</p>
                            <p className="font-bold text-slate-800">{duplicateMatch.name}</p>
                            <p className="text-xs text-slate-500">Mobile: {duplicateMatch.mobile || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="p-4 space-y-3 bg-white">
                        <button 
                            onClick={() => handleDuplicateResolution('yes')}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors"
                        >
                            YES - Use Existing
                        </button>
                        <button 
                            onClick={() => handleDuplicateResolution('no')}
                            className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                        >
                            NO - Change Name
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Customer History Modal */}
        {showHistoryModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="text-xl font-black text-slate-800">{customerName}</h3>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{t('Purchase History')}</p>
                        </div>
                        <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors text-slate-400 hover:text-slate-600">
                            <X className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                        {customerHistory.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>{t('No purchase history found')}</p>
                            </div>
                        ) : (
                            customerHistory.map(tx => (
                                <div key={tx.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:border-indigo-200 transition-all group">
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded uppercase">{tx.id.slice(-6)}</span>
                                            <p className="text-xs font-bold text-slate-500 mt-1">{tx.date}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-slate-800">{formatMoney(tx.amount)}</p>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tx.dueAmount && tx.dueAmount > 0 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {tx.dueAmount && tx.dueAmount > 0 ? t('Due') : t('Paid')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        {tx.items?.map((item, i) => (
                                            <div key={i} className="flex justify-between text-xs text-slate-600">
                                                <span>{item.name} x {item.qty}</span>
                                                <span className="font-medium">{formatMoney(item.total)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Invoice Modal */}
        {showInvoice && generatedInvoice && (
            <InvoiceTemplate data={generatedInvoice} onClose={() => setShowInvoice(false)} />
        )}

        {showBarcodeScanner && (
          <BarcodeScanner
            open={showBarcodeScanner}
            title={t('Scan Barcode') || 'Scan Barcode'}
            onClose={() => setShowBarcodeScanner(false)}
            onScan={({ code }) => {
              handleBarcodeScan(code);
              setShowBarcodeScanner(false);
            }}
          />
        )}

      {variantPicker && (
        <div className="fixed inset-0 z-[80] bg-slate-900/50 flex items-center justify-center p-4" onClick={() => setVariantPicker(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Select variant</h3>
                <p className="text-sm text-slate-500">{variantPicker.name}</p>
              </div>
              <button type="button" onClick={() => setVariantPicker(null)} className="text-slate-400 hover:text-slate-600 text-sm font-bold">Close</button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {(variantPicker.variants || []).filter(v => v.name).map(v => (
                <button
                  key={v.id}
                  type="button"
                  disabled={v.stock <= 0}
                  onClick={() => addVariantToCart(variantPicker, v)}
                  className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                    v.stock <= 0 ? 'opacity-40 cursor-not-allowed border-slate-100' : 'border-slate-200 hover:border-indigo-400 hover:bg-indigo-50'
                  }`}
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold text-slate-800">{v.name}</span>
                    <span className="text-sm font-bold text-indigo-600">{formatMoney(v.price != null && v.price > 0 ? v.price : variantPicker.salePrice)}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Stock: {v.stock}
                    {v.sku ? ` · SKU ${v.sku}` : ''}
                    {v.barcode ? ` · ${v.barcode}` : ''}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Clear Cart Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{t('Clear Cart')}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{language === 'bn' ? 'আপনি কি নিশ্চিত যে কার্টের সমস্ত আইটেম মুছে ফেলতে চান?' : 'Are you sure you want to remove all items from the cart?'}</p>
              </div>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
              >
                {t('Cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCart([]);
                  setShowClearConfirm(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 shadow-sm transition-colors"
              >
                {language === 'bn' ? 'হ্যাঁ, মুছুন' : 'Yes, Clear All'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sell;
