
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useData, LedgerEntry, Product, Entity } from '../contexts/DataContext';
import { computePaidDue, resolvePaymentMethod, roundMoney } from '../lib/partialPayments';
import { 
  ShoppingCart, User, Calendar, Plus, Trash2, Search, Barcode, Box, 
  ArrowRight, CheckCircle, X, Clock, Hash, ChevronLeft, Wallet, 
  CreditCard, Minus, Settings, Truck, Users, ChevronDown, SlidersHorizontal, AlertTriangle
} from 'lucide-react';
import InvoiceTemplate from './InvoiceTemplate';
import { normalizeSerialUnits } from '@shared/lib/serialUnits';

const Buy: React.FC = () => {
  const { t, currencySymbol, formatMoney , language } = useSettings();
  const { user } = useAuth();
  const { products, suppliers, transactions, updateProductStock, processPurchase, updateProduct, addEntity, registerSupplier, addTransaction, financialAccounts } = useData();
  
  const activeBusiness = useMemo(() => 
    user?.businesses?.find(b => b && b.name === user.businessName) || user?.businesses?.[0]
  , [user]);
  
  const bizSettings = activeBusiness?.settings;
  
  // --- View State ---
  const [activeView, setActiveView] = useState<'products' | 'cart'>('products');

  // --- Transaction State ---
  const [cart, setCart] = useState<{
      id: string, name: string, stock: number, qty: number, price: number, expiryDate?: string,
      serialNumbers: string[], warranty?: string, image?: string, category?: string,
      variantId?: string, variantName?: string, lotNumber?: string, batchNumber?: string
  }[]>([]);

  // Date State (Auto Today)
  const [purchaseDate, setPurchaseDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Supplier State
  const [supplierName, setSupplierName] = useState(''); 
  const [supplierMobile, setSupplierMobile] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [supplierPreviousDue, setSupplierPreviousDue] = useState(0);
  const [supplierSuggestions, setSupplierSuggestions] = useState<Entity[]>([]);

  // Supplier outstanding payable
  useEffect(() => {
    if (!selectedSupplierId) {
      setSupplierPreviousDue(0);
      return;
    }
    const txs = transactions.filter(tx =>
      !tx.isDeleted &&
      (tx.entityId === selectedSupplierId || tx.entityName === supplierName)
    );
    const purchasedDue = txs
      .filter(tx => tx.type === 'Purchase' && (tx.paymentMethod === 'Due' || (tx.dueAmount || 0) > 0))
      .reduce((s, tx) => s + (Number(tx.dueAmount) || (tx.paymentMethod === 'Due' ? Number(tx.amount) : 0)), 0);
    const paid = txs
      .filter(tx => tx.type === 'Supplier Payment' || (tx.type === 'Expense' && (tx as any).category === 'Supplier Payment'))
      .reduce((s, tx) => s + Number(tx.amount), 0);
    const returns = txs
      .filter(tx => tx.type === 'Purchase Return')
      .reduce((s, tx) => s + Number(tx.amount), 0);
    const entity = suppliers.find(s => s.id === selectedSupplierId);
    const opening = Number(entity?.currentDue) || Number(entity?.openingBalance) || 0;
    setSupplierPreviousDue(Math.max(0, opening + purchasedDue - paid - returns));
  }, [selectedSupplierId, supplierName, transactions, suppliers]);
  
  // Payment State
  const [paymentType, setPaymentType] = useState<'Cash' | 'Due' | 'Partial'>('Cash');
  const [partialPaid, setPartialPaid] = useState('');
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [miscLabel, setMiscLabel] = useState(''); 
  const [miscAmount, setMiscAmount] = useState(0);

  // --- UI & Search State ---
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const purchaseInFlightRef = useRef(false);
  const [purchaseBusy, setPurchaseBusy] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [duplicateMatch, setDuplicateMatch] = useState<Entity | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showCosts, setShowCosts] = useState(false);

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
        const btn = document.getElementById('buy-confirm-purchase-btn') as HTMLButtonElement | null;
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
        if (searchTerm) {
          e.preventDefault();
          setSearchTerm('');
          searchInputRef.current?.focus();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [searchTerm, showInvoice]);
  const [generatedInvoice, setGeneratedInvoice] = useState<LedgerEntry | null>(null);
  
  // Item Extras Modals
  const [expireModal, setExpireModal] = useState<{show: boolean, itemId: string | null}>({ show: false, itemId: null });
  const [tempLot, setTempLot] = useState('');
  const [tempExpiry, setTempExpiry] = useState('');

  const [snModal, setSnModal] = useState<{show: boolean, itemId: string | null}>({ show: false, itemId: null });
  const [tempSns, setTempSns] = useState<string[]>([]);

  // --- Derived Data ---
  const categories = useMemo(() => [...new Set(products.map(p => p.category).filter(Boolean))], [products]);

  const filteredProducts = useMemo(() => {
      return products.filter(p => {
          if (p.isDeleted) return false;
          const searchLower = searchTerm.toLowerCase();
          const matchSearch = p.name.toLowerCase().includes(searchLower) || p.id.includes(searchLower);
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
  const grandTotal = Math.max(0, subtotal - discount + tax + miscAmount);

  // --- Effects ---

  // Auto-suggest suppliers when typing
  useEffect(() => {
      if (!selectedSupplierId && supplierName) {
          const lowerTerm = supplierName.toLowerCase();
          const matches = suppliers.filter(s => 
              !s.isDeleted && 
              (s.name.toLowerCase().includes(lowerTerm) || s.mobile?.includes(lowerTerm))
          ).slice(0, 5);
          setSupplierSuggestions(matches);
      } else {
          setSupplierSuggestions([]);
      }
  }, [supplierName, selectedSupplierId, suppliers]);

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

  const addToCart = (product: typeof products[0]) => {
      const variants = Array.isArray((product as any).variants) ? (product as any).variants : [];
      let variantId: string | undefined;
      let variantName: string | undefined;
      if (variants.length) {
        const labels = variants.map((v: any, i: number) => `${i + 1}. ${v.name || v.id} (stock ${v.stock || 0})`).join('\n');
        const pick = window.prompt(`Select variant for ${product.name}:\n${labels}\nEnter number (blank = product-level)`, '1');
        if (pick) {
          const idx = Math.max(0, (parseInt(pick, 10) || 1) - 1);
          const v = variants[idx];
          if (v) {
            variantId = v.id;
            variantName = v.name || v.id;
          }
        }
      }
      const existing = cart.find(item =>
        item.id === product.id && (item.variantId || undefined) === (variantId || undefined)
      );
      if (existing) {
          setCart(cart.map(item =>
            item.id === product.id && (item.variantId || undefined) === (variantId || undefined)
              ? { ...item, qty: item.qty + 1 }
              : item
          ));
      } else {
          setCart([...cart, {
              id: product.id,
              name: variantName ? `${product.name} · ${variantName}` : product.name,
              stock: product.stock,
              qty: 1,
              price: product.purchasePrice,
              serialNumbers: [],
              warranty: product.warranty ? (product.warrantyPeriod || 'Yes') : undefined,
              image: product.image,
              category: product.category,
              variantId,
              variantName,
          }]);
      }
  };

  const updateCartItem = (id: string, field: 'qty' | 'price', value: number) => {
      setCart(cart.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeCartItem = (id: string) => {
      setCart(cart.filter(item => item.id !== id));
  };

  // Expiry Logic
  const openExpireModal = (id: string) => {
     setExpireModal({ show: true, itemId: id });
     const item = cart.find(i => i.id === id);
     setTempExpiry(item?.expiryDate || '');
     setTempLot((item as any)?.batchNumber || (item as any)?.lotNumber || '');
  };

  const saveExpiry = () => {
      if (expireModal.itemId) {
          setCart(cart.map(item => item.id === expireModal.itemId ? { ...item, expiryDate: tempExpiry, batchNumber: tempLot || (item as any).batchNumber, lotNumber: tempLot || (item as any).lotNumber } : item));
      }
      setExpireModal({ show: false, itemId: null });
      setTempExpiry('');
  };

  // Serial Number Logic
  const openSnModal = (id: string) => {
      const item = cart.find(i => i.id === id);
      if (item) {
          const currentSns = item.serialNumbers || [];
          const needed = item.qty;
          const padded = Array(needed).fill('').map((_, i) => currentSns[i] || '');
          setTempSns(padded);
          setSnModal({ show: true, itemId: id });
      }
  };

  const handleSnChange = (index: number, val: string) => {
      const newSns = [...tempSns];
      newSns[index] = val;
      setTempSns(newSns);
  };

  const saveSns = () => {
      if (snModal.itemId) {
          setCart(cart.map(item => item.id === snModal.itemId ? { ...item, serialNumbers: tempSns.filter(s => s.trim() !== '') } : item));
      }
      setSnModal({ show: false, itemId: null });
  };

  // Supplier Logic
  const handleSupplierSelect = (supplier: Entity) => {
      setSupplierName(supplier.name);
      setSupplierMobile(supplier.mobile || '');
      setSelectedSupplierId(supplier.id);
      setSupplierSuggestions([]);
  };

  const handleNameChange = (val: string) => {
      setSupplierName(val);
      setSelectedSupplierId(null);
  };

  // --- CORE CHECKOUT LOGIC ---
  const handleCheckoutClick = () => {
      if (cart.length === 0) return;
      if (cart.some(item => item.qty <= 0)) {
          alert("Please ensure all items have a quantity greater than 0.");
          return;
      }
      if (!supplierName.trim()) {
          alert("Supplier name is mandatory.");
          return;
      }

      // Supplier credit limit when buying on Due
      if ((paymentType === 'Due' || paymentType === 'Partial') && selectedSupplierId) {
        const supplier = suppliers.find(s => s.id === selectedSupplierId);
        const limit = Number(supplier?.creditLimit) || 0;
        if (limit > 0) {
          const paidNow = paymentType === 'Partial' ? (parseFloat(partialPaid) || 0) : 0;
          const billDue = paymentType === 'Due' ? grandTotal : Math.max(0, grandTotal - paidNow);
          const projected = supplierPreviousDue + billDue;
          if (projected > limit + 0.009) {
            alert(
              `Supplier credit limit exceeded for ${supplier?.name || 'supplier'}.\n` +
              `Limit: ${limit.toFixed(2)} · Current payable: ${supplierPreviousDue.toFixed(2)} · This bill: ${billDue.toFixed(2)} · Projected: ${projected.toFixed(2)}\n` +
              `Pay cash or reduce the order.`
            );
            return;
          }
        }
      }

      if (!selectedSupplierId) {
          const exactMatch = suppliers.find(s => s.name.toLowerCase() === supplierName.trim().toLowerCase());
          if (exactMatch) {
              setDuplicateMatch(exactMatch);
              return;
          }
      }
      finalizeTransaction(selectedSupplierId, supplierName, supplierMobile);
  };

  const handleDuplicateResolution = (resolution: 'yes' | 'no') => {
      if (resolution === 'yes' && duplicateMatch) {
          finalizeTransaction(duplicateMatch.id, duplicateMatch.name, duplicateMatch.mobile || supplierMobile);
      } else {
          setDuplicateMatch(null);
      }
  };

  const finalizeTransaction = (finalId: string | null, finalName: string, finalMobile: string) => {
      if (purchaseInFlightRef.current) return;
      purchaseInFlightRef.current = true;
      setPurchaseBusy(true);
      try {
      // 1. Add Supplier if new
      if (!finalId) {
          const cleanMobile = finalMobile.trim();
          if (cleanMobile) {
              registerSupplier(
                  { name: finalName, mobile: cleanMobile },
                  { supplierCode: `SUP-${Math.floor(1000 + Math.random() * 9000)}` }
              );
              finalId = cleanMobile;
          } else {
              finalId = Date.now().toString();
              addEntity({
                  id: finalId,
                  name: finalName,
                  mobile: finalMobile,
                  address: '', // Could add address field if needed
                  type: 'Supplier'
              });
          }
      }

      // 2. Update Stock & Calculate Average Purchase Price
      cart.forEach(item => {
          const lotNo = (item as any).batchNumber || (item as any).lotNumber || undefined;
          processPurchase(item.id, item.qty, item.price, {
            lotNumber: lotNo,
            expiryDate: item.expiryDate,
            receivedAt: purchaseDate,
            variantId: item.variantId || undefined,
          });
          const sns = (item.serialNumbers || []).map((s: string) => s.trim()).filter(Boolean);
          if (sns.length) {
            const prod = products.find((pr) => pr.id === item.id);
            const existing = normalizeSerialUnits((prod || {}) as any);
            const existingSet = new Set(existing.map((u) => u.serial));
            const added = sns
              .filter((s: string) => !existingSet.has(s))
              .map((serial: string) => ({
                serial,
                lotNumber: lotNo,
                status: 'available' as const,
              }));
            if (added.length) {
              const next = [...existing, ...added];
              updateProduct(item.id, {
                serialUnits: next as any,
                serialNumbers: next.filter((u) => u.status === 'available').map((u) => u.serial),
              } as any);
            }
          }
      });

      // 3. Create Transaction Object
      const prefix = bizSettings?.invoicePrefix || 'PUR';
      const timestamp = Date.now().toString().slice(-6);
      const reference = `${prefix}-${timestamp}`;

      const transaction: LedgerEntry = {
          id: Date.now().toString(),
          date: purchaseDate,
          entityName: finalName,
          entityMobile: finalMobile,
          type: 'Purchase',
          amount: grandTotal,
          ...(() => {
            const paid = paymentType === 'Cash' ? grandTotal : paymentType === 'Due' ? 0 : roundMoney(parseFloat(partialPaid) || 0);
            const bal = computePaidDue(grandTotal, paid);
            const method = paymentType === 'Partial' ? 'Partial' : paymentType;
            return {
              paymentMethod: method as any,
              amountPaid: bal.amountPaid,
              dueAmount: bal.dueAmount,
            };
          })(),
          accountId: accountId,
          reference: reference,
          items: cart.map(c => ({
              productId: c.id,
              name: c.name,
              qty: c.qty,
              price: c.price,
              total: c.qty * c.price,
              serialNumbers: c.serialNumbers,
              warranty: c.warranty,
              expiryDate: c.expiryDate,
              variantId: (c as any).variantId,
              variantName: (c as any).variantName,
              batchNumber: (c as any).batchNumber || (c as any).lotNumber || `PO-${Date.now().toString(36).toUpperCase().slice(-5)}`,
              lots: [{
                lotNumber: (c as any).batchNumber || (c as any).lotNumber || `PO-${Date.now().toString(36).toUpperCase().slice(-5)}`,
                qty: c.qty,
                expiryDate: c.expiryDate,
              }],
          })),
          details: {
              subtotal,
              tax,
              discount,
              delivery: miscAmount
          }
      };

      addTransaction(transaction);
      setGeneratedInvoice(transaction);
      setShowInvoice(true);
      setDuplicateMatch(null);
      
      // Reset
      setCart([]);
      setSupplierName('');
      setSupplierMobile('');
      setSelectedSupplierId(null);
      setPaymentType('Cash');
      setDiscount(0);
      setTax(0);
      setMiscLabel('');
      setMiscAmount(0);
      setActiveView('products');
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 100);
      } catch (err: any) {
        console.error('Purchase finalize error', err);
        alert(err?.message || (language === 'bn' ? 'ক্রয় সম্পন্ন করা যায়নি। আবার চেষ্টা করুন।' : 'Purchase could not be completed. Please try again.'));
      } finally {
        purchaseInFlightRef.current = false;
        setPurchaseBusy(false);
      }
  };

  return (
    <div className="flex flex-col h-full min-h-0 bg-slate-50 relative overflow-hidden">
      
      {/* --- MAIN LAYOUT --- */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        
        {/* Left Pane: Product Selection Grid */}
        <div className={`flex-1 flex flex-col min-h-0 bg-slate-50/50 transition-all duration-300 ${activeView === 'cart' ? 'hidden md:flex' : 'flex'}`}>
            
            {/* Search Header */}
            <div className="p-4 bg-white border-b border-slate-200 shadow-sm z-20 flex flex-col gap-3 shrink-0">
                <div className="flex gap-3">
                    <div className="relative flex-1 group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <input 
                            ref={searchInputRef}
                            id="buy-product-search-input"
                            type="text" 
                            placeholder={t('Search products...')}
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                            title={language === 'bn' ? 'F2 সার্চ · Esc ক্লিয়ার' : 'F2 search · Esc clear'}
                        />
                    </div>
                    <button className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors">
                        <Barcode className="w-6 h-6" />
                    </button>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-600">{language === 'bn' ? 'শর্টকাট:' : 'Shortcuts:'}</span>
                  <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">F2</kbd> {language === 'bn' ? 'সার্চ' : 'Search'}</span>
                  <span className="inline-flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-mono text-[10px]">Esc</kbd> {language === 'bn' ? 'ক্লিয়ার/ইনভয়েস' : 'Clear/invoice'}</span>
                </div>

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
                            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-all ${categoryFilter === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Product Grid */}
            <div className="flex-1 overflow-y-auto p-2 md:p-4 custom-scrollbar">
                {filteredProducts.length === 0 ? (
                    <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center p-8 text-slate-400">
                        <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-300 shadow-sm mb-3">
                            <Box className="w-8 h-8" />
                        </div>
                        <h4 className="font-bold text-slate-700 text-sm mb-1">
                            {language === 'bn' ? 'কোন পণ্য পাওয়া যায়নি' : 'No products found'}
                        </h4>
                        <p className="text-xs text-slate-400 max-w-xs mb-4">
                            {searchTerm 
                                ? (language === 'bn' ? `"${searchTerm}" এর সাথে মিল রেখে কোন পণ্য নেই` : `No products match "${searchTerm}"`)
                                : (language === 'bn' ? 'এই ক্যাটাগরিতে কোন পণ্য নেই' : 'No products available in this category')}
                        </p>
                        {(searchTerm || categoryFilter) && (
                            <button
                                type="button"
                                onClick={() => { setSearchTerm(''); setCategoryFilter(''); }}
                                className="px-3.5 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                            >
                                {language === 'bn' ? 'ফিল্টার মুছুন' : 'Clear search & filters'}
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 pb-32 md:pb-4">
                        {filteredProducts.map(product => {
                            const inCart = cart.find(c => c.id === product.id);
                            return (
                                <div 
                                    key={product.id} 
                                    onClick={() => addToCart(product)}
                                    className={`group relative bg-white rounded-2xl p-3 border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer flex flex-col h-full active:scale-[0.98] ${inCart ? 'ring-2 ring-blue-500 border-transparent' : 'border-slate-200'}`}
                                >
                                    {/* Stock Badge */}
                                    <div className={`absolute top-3 left-3 z-10 px-2 py-1 rounded-md text-[10px] font-bold shadow-sm backdrop-blur-md ${product.stock <= 5 ? 'bg-red-500 text-white' : 'bg-white/90 text-slate-700'}`}>
                                        {product.stock} {t('Stock Level')}
                                    </div>

                                    {/* Qty Badge */}
                                    {inCart && (
                                        <div className="absolute top-3 right-3 z-10 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-md animate-in zoom-in duration-200">
                                            {inCart.qty}
                                        </div>
                                    )}
                                    
                                    {/* Image */}
                                    <div className="aspect-square bg-slate-50 rounded-xl mb-3 relative overflow-hidden flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                                        {product.image ? (
                                            <img src={product.image} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={product.name} />
                                        ) : (
                                            <Box className="w-10 h-10 text-slate-300 group-hover:text-blue-400 transition-colors" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 flex flex-col">
                                        <h3 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">{product.name}</h3>
                                        <p className="text-[10px] text-slate-400 font-medium mb-2 hidden md:block uppercase tracking-wider">{product.category}</p>
                                        
                                        <div className="mt-auto flex items-end justify-between pt-3 border-t border-slate-50">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-slate-400 font-semibold uppercase">{t('Purchase Price')}</span>
                                                <span className="font-bold text-base md:text-lg text-blue-600 leading-none">{formatMoney(product.purchasePrice)}</span>
                                            </div>
                                            <button className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
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

        {/* Right Pane: Cart & Invoice */}
        <div className={`fixed inset-0 z-[70] bg-white dark:bg-slate-900 flex flex-col transition-transform duration-300 transform md:relative md:translate-x-0 md:w-[420px] md:border-l md:border-slate-200 dark:md:border-slate-800 md:shadow-xl md:z-0 ${activeView === 'cart' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}`}>
            {/* Invoice Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shadow-sm z-10 shrink-0">
                <button onClick={() => setActiveView('products')} className="md:hidden p-2 -ml-2 text-slate-500 active:bg-slate-50 rounded-lg">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5 text-blue-600"/> {t('Purchase Cart')}
                    <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-bold">{cart.reduce((a, b) => a + b.qty, 0)}</span>
                </h3>
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
            
            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                {/* STEP 1: Cart Items Review */}
                <div className="p-4 bg-white border-b border-slate-200 shrink-0">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                            <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                            {t('Purchase Items')} ({cart.reduce((a, b) => a + b.qty, 0)})
                        </span>
                        <span className="text-xs font-black text-blue-600">{formatMoney(subtotal)}</span>
                    </div>

                    {cart.length === 0 ? (
                        <div className="py-8 flex flex-col items-center justify-center text-slate-400 opacity-60">
                            <ShoppingCart className="w-12 h-12 mb-2 stroke-1" />
                            <p className="text-xs font-medium text-center">
                                {language === 'bn' ? 'ক্রয় কার্ট খালি — পণ্য সার্চ করে যোগ করুন' : 'Purchase cart is empty — search to add items'}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                            {cart.map(item => (
                                <div key={item.id} className="bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 shadow-sm hover:border-blue-300 transition-colors">
                                    {/* Header */}
                                    <div className="flex justify-between items-baseline mb-2">
                                        <div className="min-w-0 pr-2">
                                            <span className="font-bold text-slate-800 text-xs line-clamp-1">{item.name}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">Stock: {item.stock}</span>
                                        </div>
                                        <span className="font-black text-blue-600 text-xs shrink-0">{formatMoney(item.price * item.qty)}</span>
                                    </div>
                                    
                                    {/* Controls */}
                                    <div className="flex items-center gap-2">
                                        {/* Qty Stepper */}
                                        <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 h-7">
                                            <button 
                                                type="button"
                                                onClick={() => updateCartItem(item.id, 'qty', Math.max(0, item.qty - 1))} 
                                                className="w-5 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded active:scale-95 transition-transform"
                                                title="Decrease quantity"
                                            >
                                                <Minus className="w-3 h-3"/>
                                            </button>
                                            <span className="w-7 text-center text-xs font-bold text-slate-800">{item.qty}</span>
                                            <button 
                                                type="button"
                                                onClick={() => updateCartItem(item.id, 'qty', item.qty + 1)} 
                                                className="w-5 h-full flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded active:scale-95 transition-transform"
                                                title="Increase quantity"
                                            >
                                                <Plus className="w-3 h-3"/>
                                            </button>
                                        </div>

                                        {/* Purchase Price Edit */}
                                        <div className="flex-1 flex items-center border border-slate-200 rounded-lg px-2 h-7 bg-white focus-within:ring-1 focus-within:ring-blue-500">
                                            <span className="text-[10px] text-slate-400 mr-1">{currencySymbol}</span>
                                            <input 
                                                type="number" 
                                                className="w-full text-xs font-bold text-slate-800 outline-none bg-transparent"
                                                value={item.price}
                                                onChange={e => updateCartItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                                            />
                                        </div>

                                        {/* Serial Numbers Button */}
                                        <button 
                                            type="button"
                                            onClick={() => openSnModal(item.id)}
                                            className={`h-7 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-colors ${item.serialNumbers.length > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                            title="Add Serial Numbers"
                                        >
                                            <Hash className="w-3 h-3" /> {item.serialNumbers.length > 0 ? `${item.serialNumbers.length}` : 'SN'}
                                        </button>

                                        {/* Expiry Date Button */}
                                        <button 
                                            type="button"
                                            onClick={() => openExpireModal(item.id)}
                                            className={`h-7 px-2 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-colors ${item.expiryDate ? 'bg-red-50 text-red-700 border-red-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}
                                            title="Set Lot & Expiry Date"
                                        >
                                            <Clock className="w-3 h-3" /> {item.expiryDate ? 'Exp' : 'Exp'}
                                        </button>

                                        {/* Line Delete */}
                                        <button
                                            type="button"
                                            onClick={() => removeCartItem(item.id)}
                                            className="h-7 w-7 flex items-center justify-center rounded-lg border border-red-200 text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title={t('Remove item')}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                    
                                    {/* Expiry / Lot tag */}
                                    {(item.expiryDate || (item as any).batchNumber || (item as any).lotNumber) && (
                                        <div className="mt-1.5 flex flex-wrap gap-1 text-[9px]">
                                            {item.expiryDate && (
                                                <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 flex items-center gap-1">
                                                    <Clock className="w-2.5 h-2.5" /> Exp: {item.expiryDate}
                                                </span>
                                            )}
                                            {((item as any).batchNumber || (item as any).lotNumber) && (
                                                <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                                                    Lot: {(item as any).batchNumber || (item as any).lotNumber}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* STEP 2: Supplier Details & Balance */}
                <div className="p-4 bg-slate-50/70 border-b border-slate-200 space-y-3 shrink-0">
                    <div className="relative">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">{t('Supplier Name')}</label>
                        <div className="flex items-center bg-white border border-slate-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 overflow-hidden shadow-sm transition-all hover:border-slate-400">
                            <div className="pl-3 text-slate-400"><User className="w-4 h-4" /></div>
                            <input 
                                type="text"
                                value={supplierName}
                                onFocus={() => supplierName === '' && setSupplierName('')}
                                onChange={(e) => handleNameChange(e.target.value)}
                                className="w-full px-3 py-2.5 text-xs outline-none font-medium text-slate-900 placeholder:text-slate-400 bg-transparent"
                                placeholder="Search or enter supplier name"
                            />
                            {selectedSupplierId && <CheckCircle className="w-4 h-4 text-emerald-500 mr-2.5" />}
                        </div>
                        {/* Suggestions */}
                        {supplierSuggestions.length > 0 && (
                            <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl mt-1 z-50 max-h-48 overflow-y-auto">
                                {supplierSuggestions.map(s => (
                                    <button key={s.id} onClick={() => handleSupplierSelect(s)} className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-50 last:border-0 flex justify-between items-center group">
                                        <div>
                                            <p className="text-xs font-bold text-slate-800 group-hover:text-blue-700">{s.name}</p>
                                            <p className="text-[10px] text-slate-500">{s.mobile}</p>
                                        </div>
                                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-400" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        <div className="flex-1">
                             <input 
                                type="tel"
                                value={supplierMobile}
                                onChange={e => setSupplierMobile(e.target.value)}
                                placeholder={t('Phone Number')}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
                            />
                        </div>
                        <div className="flex-1">
                             <input 
                                type="date"
                                value={purchaseDate}
                                onChange={e => setPurchaseDate(e.target.value)}
                                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-bold"
                            />
                        </div>
                    </div>

                    {/* Supplier Outstanding Payable & Credit Terms Indicator */}
                    {selectedSupplierId && (
                        <div className="space-y-1.5 pt-1">
                            {supplierPreviousDue > 0 && (
                                <div className="flex justify-between items-center px-3 py-1.5 bg-red-50 border border-red-100 rounded-lg">
                                    <span className="text-[10px] font-bold text-red-600 uppercase">{t('Previous Due / Payable')}</span>
                                    <span className="text-xs font-black text-red-700">{formatMoney(supplierPreviousDue)}</span>
                                </div>
                            )}
                            {(() => {
                                const s = suppliers.find(x => x.id === selectedSupplierId);
                                const limit = Number(s?.creditLimit) || 0;
                                if (limit <= 0) return null;
                                const billDue = paymentType === 'Due' ? grandTotal : paymentType === 'Partial' ? Math.max(0, grandTotal - (parseFloat(partialPaid) || 0)) : 0;
                                const projected = supplierPreviousDue + billDue;
                                const remaining = limit - supplierPreviousDue;
                                const over = (paymentType === 'Due' || paymentType === 'Partial') && projected > limit;
                                return (
                                    <div className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold flex justify-between items-center ${over ? 'bg-red-50 border-red-200 text-red-700' : 'bg-slate-100 border-slate-200 text-slate-600'}`}>
                                        <span>Credit Limit: {formatMoney(limit)}</span>
                                        <span>Avail: {formatMoney(Math.max(0, remaining))}</span>
                                        {over && <span className="text-red-700 font-black">OVER LIMIT</span>}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>

                {/* STEP 3: Payment Method & Receiving Account */}
                <div className="p-4 bg-white border-b border-slate-200 space-y-3 shrink-0">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">{t('Payment Method')}</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                            <button 
                                type="button"
                                onClick={() => setPaymentType('Cash')} 
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${paymentType === 'Cash' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}
                            >
                                <Wallet className="w-3.5 h-3.5" /> {t('Cash')}
                            </button>
                            <button 
                                type="button"
                                onClick={() => setPaymentType('Due')} 
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${paymentType === 'Due' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}
                            >
                                <CreditCard className="w-3.5 h-3.5" /> {t('Due')}
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setPaymentType('Partial')} 
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${paymentType === 'Partial' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-600 hover:bg-white/60'}`}
                            >
                                Partial
                            </button>
                        </div>
                    </div>

                    {paymentType === 'Partial' && (
                        <div className="space-y-1 bg-amber-50 p-2.5 rounded-xl border border-amber-100">
                            <label className="text-[10px] font-bold text-amber-700 uppercase block">{t('Amount Paid Now')}</label>
                            <input
                                type="number"
                                min={0}
                                max={grandTotal}
                                value={partialPaid}
                                onChange={e => setPartialPaid(e.target.value)}
                                className="w-full px-2.5 py-1.5 border border-amber-200 rounded-lg text-xs font-bold bg-white text-slate-900"
                                placeholder="0"
                            />
                            <div className="flex justify-between items-center text-[10px] text-amber-800 font-bold pt-0.5">
                                <span>Remaining Due:</span>
                                <span>{formatMoney(Math.max(0, grandTotal - (parseFloat(partialPaid) || 0)))}</span>
                            </div>
                        </div>
                    )}

                    {(paymentType === 'Cash' || paymentType === 'Partial') && (
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 block">Account</label>
                            <select 
                                value={accountId} 
                                onChange={e => setAccountId(e.target.value)}
                                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 font-bold"
                            >
                                {financialAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatMoney(a.balance)})</option>)}
                            </select>
                        </div>
                    )}
                </div>

                {/* STEP 4: Collapsible Additional Costs & Adjustments */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 shrink-0">
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                        <button
                            type="button"
                            onClick={() => setShowCosts(!showCosts)}
                            className="w-full px-3.5 py-2.5 flex items-center justify-between text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                                <span>{t('Additional Costs & Adjustments')}</span>
                                {(discount > 0 || tax > 0 || miscAmount > 0) && (
                                    <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                        Applied
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-slate-400">
                                <span className="text-[10px] uppercase font-bold">{showCosts ? 'Hide' : 'Expand'}</span>
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${showCosts ? 'rotate-180' : ''}`} />
                            </div>
                        </button>

                        {showCosts && (
                            <div className="p-3.5 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-1 bg-white">
                                {/* Discount & Tax */}
                                <div className="flex gap-2.5">
                                    <div className="flex-1 flex items-center bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 focus-within:border-blue-300">
                                        <span className="text-[10px] font-bold text-slate-500 mr-2 uppercase">{t('Discount')}</span>
                                        <input 
                                            type="number" 
                                            value={discount} 
                                            onChange={e => setDiscount(parseFloat(e.target.value)||0)} 
                                            className="w-full bg-transparent text-right outline-none text-slate-900 font-bold text-xs" 
                                            placeholder="0" 
                                        />
                                    </div>
                                    <div className="flex-1 flex items-center bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200 focus-within:border-blue-300">
                                        <span className="text-[10px] font-bold text-slate-500 mr-2 uppercase">{t('Tax')}</span>
                                        <input 
                                            type="number" 
                                            value={tax} 
                                            onChange={e => setTax(parseFloat(e.target.value)||0)} 
                                            className="w-full bg-transparent text-right outline-none text-slate-900 font-bold text-xs" 
                                            placeholder="0" 
                                        />
                                    </div>
                                </div>

                                {/* Extra / Delivery Charge */}
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        value={miscLabel} 
                                        onChange={e => setMiscLabel(e.target.value)} 
                                        placeholder={t('Delivery Charge')} 
                                        className="flex-[2] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-blue-300"
                                    />
                                    <div className={`flex-1 flex items-center bg-slate-50 rounded-lg px-2.5 py-1.5 border transition-colors ${miscLabel ? 'border-blue-300 bg-white' : 'border-slate-200 opacity-60'}`}>
                                        <Truck className="w-3 h-3 text-slate-400 mr-1.5" />
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
                        )}
                    </div>
                </div>
            </div>

            {/* STEP 5: Sticky Summary Footer */}
            <div id="buy-summary-section" className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] z-10 shrink-0" style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 0px))' }}>
                <div className="space-y-1.5 mb-3 text-xs">
                    <div className="flex justify-between text-slate-500">
                        <span>{t('Subtotal')}</span>
                        <span className="font-semibold text-slate-800">{formatMoney(subtotal)}</span>
                    </div>
                    {discount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-medium">
                            <span>{t('Discount')}</span>
                            <span>-{formatMoney(discount)}</span>
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
                        <span className="font-extrabold text-base text-slate-900 leading-tight">{t('Total Payable')}</span>
                        <span className="font-black text-2xl text-blue-600">{formatMoney(grandTotal)}</span>
                    </div>

                    {paymentType === 'Partial' && (
                        <div className="flex justify-between items-center text-amber-600 font-bold text-xs pt-0.5">
                            <span>{t('Due Amount')}</span>
                            <span>{formatMoney(Math.max(0, grandTotal - (parseFloat(partialPaid) || 0)))}</span>
                        </div>
                    )}
                    {paymentType === 'Due' && (
                        <div className="flex justify-between items-center text-red-600 font-bold text-xs pt-0.5">
                            <span>{t('Total Due')}</span>
                            <span>{formatMoney(grandTotal)}</span>
                        </div>
                    )}
                </div>

                <button 
                    id="buy-confirm-purchase-btn"
                    onClick={handleCheckoutClick}
                    disabled={purchaseBusy || cart.length === 0}
                    className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-base shadow-lg shadow-slate-900/20 hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                    {purchaseBusy
                      ? (language === 'bn' ? 'প্রসেসিং…' : 'Processing…')
                      : <>{t('Confirm Purchase')} <span className="text-xs opacity-60 font-mono">[F9]</span> <ArrowRight className="w-4 h-4" /></>}
                </button>
            </div>
        </div>
      </div>

      {/* --- MOBILE STICKY BAR --- */}
      {cart.length > 0 && activeView === 'products' && (
          <div 
              className="md:hidden fixed left-0 right-0 bg-white border-t border-slate-200 p-3 sm:p-4 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.1)] z-[45] flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2"
              style={{ bottom: 'max(4.25rem, calc(3.85rem + env(safe-area-inset-bottom, 0px)))' }}
          >
              <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{cart.reduce((a,b)=>a+b.qty,0)} Items</p>
                  <p className="text-xl font-black text-slate-900">{formatMoney(subtotal)}</p>
              </div>
              <button 
                  onClick={() => setActiveView('cart')}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"
              >
                  {t('Checkout')} <ArrowRight className="w-5 h-5" />
              </button>
          </div>
      )}

      {/* Expire Date Modal */}
      {expireModal.show && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in duration-200">
                  <h3 className="font-bold text-slate-800 mb-4">Set Expiry Date</h3>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Lot number</label>
                                <input className="w-full border p-2 rounded mb-2" placeholder="Optional lot / batch code" value={tempLot} onChange={e => setTempLot(e.target.value)} />
                                <label className="block text-xs font-bold text-slate-500 mb-1">Expiry</label>

                  <input 
                    type="date" 
                    value={tempExpiry} 
                    onChange={e => setTempExpiry(e.target.value)}
                    className="w-full border p-3 rounded-lg mb-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
                  />
                  <div className="flex gap-2">
                      <button onClick={() => setExpireModal({show: false, itemId: null})} className="flex-1 py-2.5 border rounded-lg font-medium text-slate-600 hover:bg-slate-50">{t('Cancel')}</button>
                      <button onClick={saveExpiry} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">{t('Save')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* Serial Number Modal */}
      {snModal.show && (
          <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl animate-in zoom-in duration-200">
                  <h3 className="font-bold text-slate-800 mb-4">Add Serial Numbers</h3>
                  <div className="max-h-60 overflow-y-auto space-y-2 mb-4 pr-1">
                      {tempSns.map((sn, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                              <span className="text-xs text-slate-400 w-6 font-mono">#{idx+1}</span>
                              <input 
                                value={sn}
                                onChange={e => handleSnChange(idx, e.target.value)}
                                className="flex-1 border p-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
                                placeholder={`Serial Number ${idx+1}`}
                              />
                          </div>
                      ))}
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setSnModal({show: false, itemId: null})} className="flex-1 py-2.5 border rounded-lg font-medium text-slate-600 hover:bg-slate-50">{t('Cancel')}</button>
                      <button onClick={saveSns} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">{t('Save')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* Duplicate Supplier Modal */}
      {duplicateMatch && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
                    <div className="bg-amber-50 p-6 flex flex-col items-center text-center border-b border-amber-100">
                        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                            <Users className="w-7 h-7 text-amber-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">Duplicate Supplier</h3>
                        <p className="text-sm text-slate-600 mt-2 font-medium">"This supplier name already exists. Is it the same entity?"</p>
                        <div className="mt-3 bg-white p-3 rounded-lg border border-amber-200 w-full text-left">
                            <p className="text-xs text-slate-500 uppercase font-bold">Existing Record:</p>
                            <p className="font-bold text-slate-800">{duplicateMatch.name}</p>
                            <p className="text-xs text-slate-500">Mobile: {duplicateMatch.mobile || 'N/A'}</p>
                        </div>
                    </div>
                    <div className="p-4 space-y-3 bg-white">
                        <button 
                            onClick={() => handleDuplicateResolution('yes')}
                            className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                        >
                            YES - Use Existing
                        </button>
                        <button 
                            onClick={() => handleDuplicateResolution('no')}
                            className="w-full py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                        >
                            NO - Create New
                        </button>
                    </div>
                </div>
            </div>
      )}

      {/* Invoice Modal */}
      {showInvoice && generatedInvoice && (
          <InvoiceTemplate data={generatedInvoice} onClose={() => setShowInvoice(false)} />
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
                <h3 className="font-extrabold text-slate-900 text-base">{t('Clear Purchase Cart')}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {language === 'bn' ? 'আপনি কি নিশ্চিত যে ক্রয় কার্টের সমস্ত আইটেম মুছে ফেলতে চান?' : 'Are you sure you want to remove all items from the purchase cart?'}
                </p>
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

export default Buy;
