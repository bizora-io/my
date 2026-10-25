
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useData, Product, LedgerEntry } from '../contexts/DataContext';
import BarcodeScanner from './BarcodeScanner';
import { Package, Plus, Search, Edit2, Trash2, Filter, X, Save, Clock, RefreshCw, LayoutGrid, List, ChevronDown, Globe, ShieldCheck, AlertTriangle, CheckCircle, Image as ImageIcon, Upload, Hash, QrCode, Copy, FileSpreadsheet, Download, BarChart3, TrendingUp, Award } from 'lucide-react';
import Papa from 'papaparse';
import { policyFromSettings, worstLotStatus, lotsFromProduct } from '../lib/fefoPolicy';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';

const INITIAL_FORM_STATE: Partial<Product> = {
    name: '',
    category: 'General',
    subCategory: '',
    brand: '',
    sku: '',
    barcode: '',
    qrCode: '',
    purchasePrice: 0,
    salePrice: 0,
    stock: 0,
    unit: 'Pcs',
    warranty: false,
    warrantyPeriod: '',
    sellOnline: false,
    image: '',
    images: [],
    batchNumber: '',
    serialNumbers: [],
    expiryDate: '',
    minStockLevel: 5,
    tags: [],
    isBundle: false,
    bundleItems: [],
    isDigital: false,
    downloadUrl: '',
    notes: '',
    returnEligible: true,
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0 },
    isArchived: false,
    discountRules: [],
    customFields: {}
};

const generateSKU = (name: string, category: string) => {
    const prefix = (category || 'GEN').substring(0, 3).toUpperCase();
    const namePart = (name || 'PROD').substring(0, 3).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}-${namePart}-${random}`;
};

const generateBarcode = () => {
    return Math.floor(100000000000 + Math.random() * 900000000000).toString();
};

const ProductList: React.FC = () => {
    const navigate = useNavigate();
    const { t, formatMoney, convertGlobalToLocal, convertLocalToGlobal, currencySymbol } = useSettings();
    const { products, addProduct, updateProduct, deleteItem, addTransaction, suppliers, transactions,
        brands, units, warehouses, categories
    } = useData();
    const { hasFeature, user } = useAuth();

    const fefoPolicy = useMemo(() => {
      const b = user?.businesses?.find((x: any) => x && x.name === user.businessName) || user?.businesses?.[0];
      return policyFromSettings((b as any)?.settings);
    }, [user]);
    const fefoWarnDays = fefoPolicy.warnDays;
    const fefoCriticalDays = fefoPolicy.criticalDays;

    const productLotStatus = (p: Product): { label: string; className: string; status?: string } | null => {
      if ((p as any).type === 'Service' || (Number(p.stock) || 0) <= 0) return null;
      const { status, days } = worstLotStatus(lotsFromProduct(p as any), fefoPolicy);
      if (status === 'none' || status === 'ok') return null;
      if (status === 'expired') return { label: 'Expired lot', className: 'bg-rose-100 text-rose-800', status };
      if (status === 'critical') return { label: `Exp ${days}d`, className: 'bg-orange-100 text-orange-800', status };
      return { label: `Exp ${days}d`, className: 'bg-amber-50 text-amber-800', status };
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [filterExpiry, setFilterExpiry] = useState<'all' | 'expired' | 'critical' | 'warning' | 'ok'>('all');
    const [showArchived, setShowArchived] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    
    // Modal & Form State
    const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [showHistory, setShowHistory] = useState<string | null>(null);
    const [showAnalytics, setShowAnalytics] = useState(false);
    
    // We store form prices in LOCAL currency for user experience
    const [localPrices, setLocalPrices] = useState({ purchase: '', sale: '' });

    const [formData, setFormData] = useState<Partial<Product>>(INITIAL_FORM_STATE);
    const [adjustmentReason, setAdjustmentReason] = useState('');
    
    // Auto-save state
    const [lastSaved, setLastSaved] = useState<string | null>(null);
    const [hasDraft, setHasDraft] = useState(false);

    // Derived Data
    const filteredProducts = products.filter(p => {
        if (p.isDeleted) return false;
        if (p.isArchived && !showArchived) return false;
        if (!p.isArchived && showArchived) return false;
        const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
                             (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCategory = filterCategory ? p.category === filterCategory : true;
        if (!matchesSearch || !matchesCategory) return false;
        if (filterExpiry !== 'all') {
            const st = productLotStatus(p);
            if (filterExpiry === 'ok') {
                if ((Number(p.stock) || 0) <= 0) return false;
                if (st) return false;
            } else {
                if (!st || st.status !== filterExpiry) return false;
            }
        }
        return true;
    });

    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));

    // Auto-save Effect
    useEffect(() => {
        if (!showModal) return;

        const timer = setTimeout(() => {
            const draft = {
                formData,
                localPrices,
                editingId: editingProduct?.id || null,
                adjustmentReason,
                timestamp: new Date().toISOString()
            };
            localStorage.setItem('product_form_draft', JSON.stringify(draft));
            setLastSaved(new Date().toLocaleTimeString());
        }, 2000); // Auto-save after 2 seconds of inactivity

        return () => clearTimeout(timer);
    }, [formData, localPrices, showModal, editingProduct, adjustmentReason]);

    const checkForDraft = (actionType: 'add' | 'edit', productId?: string) => {
        const savedDraft = localStorage.getItem('product_form_draft');
        if (savedDraft) {
            const parsed = JSON.parse(savedDraft);
            
            // Check compatibility
            if (actionType === 'add' && !parsed.editingId) return parsed;
            if (actionType === 'edit' && parsed.editingId === productId) return parsed;
        }
        return null;
    };

    const handleEdit = (product: Product) => {
        const draft = checkForDraft('edit', product.id);
        
        if (draft) {
            if (confirm(t("Found an unsaved draft for this product. Do you want to restore it?"))) {
                setEditingProduct(product);
                setFormData(draft.formData);
                setLocalPrices(draft.localPrices || { purchase: '', sale: '' });
                setAdjustmentReason(draft.adjustmentReason || '');
                setShowModal(true);
                setLastSaved('Restored from draft');
                return;
            } else {
                localStorage.removeItem('product_form_draft');
            }
        }

        setEditingProduct(product);
        setFormData({ ...INITIAL_FORM_STATE, ...product });
        setLocalPrices({
            purchase: convertGlobalToLocal(product.purchasePrice).toFixed(2),
            sale: convertGlobalToLocal(product.salePrice).toFixed(2)
        });
        setAdjustmentReason('');
        setLastSaved(null);
        setShowModal(true);
    };

    const handleDelete = (id: string) => {
        if (confirm("Are you sure you want to delete this product?")) {
            deleteItem('product', id);
        }
    };

    const handleAddNew = () => {
        const draft = checkForDraft('add');
        
        if (draft) {
            if (confirm(t("Found an unsaved draft for a new product. Do you want to restore it?"))) {
                setEditingProduct(null);
                setFormData(draft.formData);
                setLocalPrices(draft.localPrices || { purchase: '', sale: '' });
                setAdjustmentReason(draft.adjustmentReason || '');
                setShowModal(true);
                setLastSaved('Restored from draft');
                return;
            } else {
                localStorage.removeItem('product_form_draft');
            }
        }

        setEditingProduct(null);
        setFormData({ ...INITIAL_FORM_STATE });
        setLocalPrices({ purchase: '', sale: '' });
        setAdjustmentReason('');
        setLastSaved(null);
        setShowModal(true);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData({ ...formData, image: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        // Convert the input local price back to Global Base Currency (USD) for storage
        const basePurchasePrice = convertLocalToGlobal(parseFloat(localPrices.purchase || '0'));
        const baseSalePrice = convertLocalToGlobal(parseFloat(localPrices.sale || '0'));

        const payload = {
            ...formData,
            purchasePrice: basePurchasePrice,
            salePrice: baseSalePrice
        } as Product;

        if (editingProduct) {
            // Check for stock change and record transaction
            if (formData.stock !== undefined && formData.stock !== editingProduct.stock) {
                const diff = formData.stock - editingProduct.stock;
                const type = diff > 0 ? 'Increase' : 'Decrease';
                
                addTransaction({
                    id: Date.now().toString(),
                    date: new Date().toISOString().split('T')[0],
                    entityName: 'Manual Adjustment',
                    type: 'Stock Adjustment',
                    amount: 0, // No cash impact for manual adjustment usually
                    paymentMethod: 'Adjustment',
                    reference: `Manual ${type}: ${adjustmentReason || 'Stock Correction'}`,
                    items: [{
                        productId: editingProduct.id,
                        name: editingProduct.name,
                        qty: Math.abs(diff),
                        price: editingProduct.purchasePrice,
                        total: Math.abs(diff) * editingProduct.purchasePrice
                    }],
                    details: { subtotal: 0, tax: 0, discount: 0, delivery: 0 }
                });
            }
            updateProduct(editingProduct.id, payload);
        } else {
            addProduct({
                id: Date.now().toString(),
                ...payload
            });
        }
        
        // Clear draft on successful save
        localStorage.removeItem('product_form_draft');
        setLastSaved(null);
        setShowModal(false);
    };

    const handleDiscard = () => {
        if (confirm("Discard changes? This will clear any auto-saved data.")) {
            localStorage.removeItem('product_form_draft');
            setShowModal(false);
        }
    };

    const handleDuplicate = (product: Product) => {
        const newProduct = {
            ...product,
            id: Date.now().toString(),
            name: `${product.name} (Copy)`,
            sku: generateSKU(product.name, product.category),
            stock: 0, // Reset stock for duplicate
            isDeleted: false,
            isArchived: false
        };
        addProduct(newProduct);
    };

    const handleBulkImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const importedProducts = results.data.map((row: any) => {
                    const serialRaw = row.SerialNumbers || row.serialNumbers || '';
                    const serialNumbers = typeof serialRaw === 'string' && serialRaw.trim()
                        ? serialRaw.split(/[|,;]/).map((s: string) => s.trim()).filter(Boolean)
                        : [];
                    return {
                    id: row.ID || row.id || (Date.now().toString() + Math.random().toString(36).substr(2, 9)),
                    name: row.Name || row.name,
                    category: row.Category || row.category || 'General',
                    subCategory: row.SubCategory || row.subCategory || '',
                    brand: row.Brand || row.brand || '',
                    sku: row.SKU || row.sku || generateSKU(row.Name || row.name, row.Category || row.category),
                    barcode: row.Barcode || row.barcode || generateBarcode(),
                    qrCode: row.QRCode || row.qrCode || '',
                    purchasePrice: parseFloat(row.PurchasePrice || row.purchasePrice || '0'),
                    salePrice: parseFloat(row.SalePrice || row.salePrice || '0'),
                    stock: parseInt(row.Stock || row.stock || '0'),
                    unit: row.Unit || row.unit || 'Pcs',
                    minStockLevel: parseInt(row.MinStock || row.minStock || row['Min Stock'] || '5'),
                    batchNumber: row.BatchNumber || row.batchNumber || '',
                    serialNumbers,
                    warehouseId: row.WarehouseId || row.warehouseId || undefined,
                    expiryDate: row.ExpiryDate || row.expiryDate || row.EarliestLotExpiry || '',
                    lots: (() => {
                        const stock = parseInt(row.Stock || row.stock || '0') || 0;
                        const earliest = (row.EarliestLotExpiry || row.earliestLotExpiry || row.ExpiryDate || row.expiryDate || '').toString().slice(0, 10);
                        const lotNums = String(row.LotNumbers || row.lotNumbers || '')
                            .split(/[|,;]/)
                            .map((s: string) => s.trim())
                            .filter(Boolean);
                        const batch = row.BatchNumber || row.batchNumber || '';
                        if (lotNums.length) {
                            // Split stock evenly across named lots when no per-lot qty
                            const each = lotNums.length ? Math.floor(stock / lotNums.length) : 0;
                            let remain = stock - each * lotNums.length;
                            return lotNums.map((ln: string, i: number) => ({
                                lotNumber: ln,
                                qty: each + (i === 0 ? remain : 0),
                                expiryDate: earliest || undefined,
                                receivedAt: new Date().toISOString().slice(0, 10),
                            })).filter((l: any) => l.qty > 0);
                        }
                        if (stock > 0 && (batch || earliest)) {
                            return [{
                                lotNumber: batch || 'IMPORT',
                                qty: stock,
                                expiryDate: earliest || undefined,
                                receivedAt: new Date().toISOString().slice(0, 10),
                            }];
                        }
                        return undefined;
                    })(),
                    isDeleted: false,
                    isArchived: false
                };});

                importedProducts.forEach(p => addProduct(p as Product));
                alert(`Successfully imported ${importedProducts.length} products.`);
            }
        });
    };

    const handleArchive = (id: string, archive: boolean) => {
        updateProduct(id, { isArchived: archive });
    };

    const handleTransfer = (sourceProduct: Product, targetProduct: Product) => {
        const qtyStr = prompt(`Enter quantity to transfer from Store ${sourceProduct.storeId} to Store ${targetProduct.storeId}:`, "0");
        const qty = parseInt(qtyStr || "0");
        
        if (isNaN(qty) || qty <= 0) return;
        if (qty > sourceProduct.stock) {
            alert("Insufficient stock in source branch.");
            return;
        }

        // Update source
        updateProduct(sourceProduct.id, { stock: sourceProduct.stock - qty });
        
        // Update target (current editing product)
        setFormData(prev => ({ ...prev, stock: (prev.stock || 0) + qty }));
        
        // Record transaction
        addTransaction({
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            entityName: 'Internal Transfer',
            type: 'Stock Adjustment',
            amount: 0,
            paymentMethod: 'Transfer',
            reference: `Transfer from Store ${sourceProduct.storeId} to Store ${targetProduct.storeId}`,
            items: [{
                productId: targetProduct.id,
                name: targetProduct.name,
                qty: qty,
                price: targetProduct.purchasePrice,
                total: 0
            }],
            details: { subtotal: 0, tax: 0, discount: 0, delivery: 0 }
        });

        alert(`Successfully transferred ${qty} ${targetProduct.unit}.`);
    };

        const exportToCSV = () => {
        const esc = (v: any) => {
            const s = v === undefined || v === null ? '' : String(v);
            if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };
        const headers = ['ID', 'Name', 'SKU', 'Barcode', 'QRCode', 'Category', 'SubCategory', 'Brand', 'PurchasePrice', 'SalePrice', 'Stock', 'Unit', 'MinStock', 'BatchNumber', 'SerialNumbers', 'WarehouseId', 'ExpiryDate', 'LotCount', 'EarliestLotExpiry', 'LotNumbers', 'VariantLots'];
        const rows = filteredProducts.map(p => {
            let lots: any[] = Array.isArray((p as any).lots) ? (p as any).lots.filter((l: any) => (Number(l.qty) || 0) > 0) : [];
            if (!lots.length && (Number(p.stock) || 0) > 0 && ((p as any).batchNumber || (p as any).expiryDate)) {
                lots = [{ lotNumber: (p as any).batchNumber || 'DEFAULT', qty: p.stock, expiryDate: (p as any).expiryDate }];
            }
            const earliest = lots
                .map((l) => l.expiryDate)
                .filter(Boolean)
                .map((d: string) => String(d).slice(0, 10))
                .sort()[0] || '';
            const lotNumbers = lots.map((l) => l.lotNumber).filter(Boolean).join('|');
            return [
                p.id, p.name, p.sku || '', p.barcode || '', p.qrCode || '', p.category, p.subCategory || '', p.brand || '',
                p.purchasePrice, p.salePrice, p.stock, p.unit, p.minStockLevel || '',
                p.batchNumber || '', (p.serialNumbers || []).join('|'), p.warehouseId || '', p.expiryDate || '',
                lots.length, earliest, lotNumbers,
                // Variant lot summary
                (Array.isArray((p as any).variants) ? (p as any).variants.map((v: any) => {
                  const vl = Array.isArray(v.lots) ? v.lots : [];
                  if (!vl.length && v.stock && (v.expiryDate || v.batchNumber)) {
                    return `${v.name || v.id}:${v.batchNumber || 'DEFAULT'}@${v.stock}${v.expiryDate ? ':' + v.expiryDate : ''}`;
                  }
                  return vl.map((l: any) => `${v.name || v.id}:${l.lotNumber}@${l.qty}${l.expiryDate ? ':' + l.expiryDate : ''}`).join(';');
                }).filter(Boolean).join('|') : '')
            ].map(esc);
        });
        const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 max-w-full overflow-hidden">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full min-w-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t('Product Inventory')}</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage catalog, track stock levels, and update pricing.</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
                    <button 
                        onClick={() => setShowArchived(!showArchived)}
                        className={`px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all border ${showArchived ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                        <Clock className="w-4 h-4 sm:w-5 sm:h-5" /> {showArchived ? t('Show Active') : t('Show Archived')}
                    </button>
                    <button 
                        onClick={exportToCSV}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all"
                    >
                        <Upload className="w-4 h-4 sm:w-5 sm:h-5 rotate-180" /> {t('Export')}
                    </button>
                    <label className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer">
                        <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5" /> {t('Import')}
                        <input type="file" accept=".csv" onChange={handleBulkImport} className="hidden" />
                    </label>
                    <button 
                        onClick={() => {
                            if (hasFeature('Advanced Analytics')) {
                                setShowAnalytics(true);
                            } else {
                                alert('Please upgrade your plan to access Advanced Analytics.');
                            }
                        }}
                        className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition-all"
                    >
                        <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" /> {t('Analytics')}
                    </button>
                    <button 
                        onClick={handleAddNew}
                        className="flex-1 md:flex-none bg-slate-900 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95"
                    >
                        <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> {t('Add Product')}
                    </button>
                </div>
            </div>

            {/* Toolbar: Search, Filter, Views */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder={t('Search products...')}
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative min-w-[200px]">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <select 
                            value={filterCategory}
                            onChange={e => setFilterCategory(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white appearance-none cursor-pointer font-medium text-slate-600"
                        >
                            <option value="">{t('All Items')}</option>
                            {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                        </div>
                    </div>

                    <select
                        value={filterExpiry}
                        onChange={e => setFilterExpiry(e.target.value as any)}
                        className="min-w-[160px] px-3 py-2.5 border border-slate-200 rounded-lg text-sm bg-white font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        title="Lot expiry filter"
                    >
                        <option value="all">All expiry</option>
                        <option value="expired">Expired lots</option>
                        <option value="critical">Critical (≤{fefoCriticalDays}d)</option>
                        <option value="warning">Warning (≤{fefoWarnDays}d)</option>
                        <option value="ok">No near expiry</option>
                    </select>

                    <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
                        <button 
                            onClick={() => setViewMode('list')} 
                            className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="List View"
                        >
                            <List className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => setViewMode('grid')} 
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'list' ? (
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-in fade-in duration-200">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-xs tracking-wider">
                                <tr>
                                    <th className="pl-6 py-4 w-16 text-center">#</th>
                                    <th className="px-4 py-4">{t('Product Details')}</th>
                                    <th className="px-4 py-4">{t('Category')}</th>
                                    <th className="px-4 py-4 text-center">{t('Stock Level')}</th>
                                    <th className="px-4 py-4 text-right">{t('Pricing')}</th>
                                    <th className="px-4 py-4 text-right">{t('Status')}</th>
                                    <th className="pr-6 py-4 text-right">{t('Actions')}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.map((p, i) => {
                                    const minStock = p.minStockLevel || 5;
                                    const isLow = p.stock <= minStock;
                                    
                                    return (
                                    <tr key={p.id} className={`hover:bg-slate-50/80 transition-colors group ${isLow ? 'bg-red-50/40' : ''}`}>
                                        <td className="pl-6 py-4 text-center text-slate-400 font-medium">{i+1}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                                                    {p.image ? (
                                                        <img src={p.image} className="w-full h-full object-cover" alt={p.name} />
                                                    ) : (
                                                        <Package className="w-5 h-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 line-clamp-1 flex items-center gap-2" title={isLow ? "Low Stock Alert" : undefined}>
                                                        {p.name}
                                                        {isLow && <AlertTriangle className="w-4 h-4 text-red-500" />}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {p.sku && (
                                                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                                                {p.sku}
                                                            </span>
                                                        )}
                                                        {p.barcode && (
                                                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-mono">
                                                                {p.barcode}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        {p.warranty && (
                                                            <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 flex items-center gap-0.5 font-medium">
                                                                <ShieldCheck className="w-2.5 h-2.5"/> Warranty
                                                            </span>
                                                        )}
                                                        {p.sellOnline && (
                                                            <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 flex items-center gap-0.5 font-medium">
                                                                <Globe className="w-2.5 h-2.5"/> Online
                                                            </span>
                                                        )}
                                                    </div>
                                                    {(p.batchNumber || p.expiryDate) && (
                                                        <div className="text-[10px] text-slate-500 mt-1 flex gap-2">
                                                            {p.batchNumber && <span>Batch: {p.batchNumber}</span>}
                                                            {p.expiryDate && <span>Exp: {p.expiryDate}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                                {p.category}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={`font-bold text-sm ${isLow ? 'text-red-700 animate-pulse' : 'text-slate-700'}`}>
                                                    {p.stock}
                                                    {(() => {
                                                      const lotSt = productLotStatus(p);
                                                      if (!lotSt) return null;
                                                      return (
                                                        <button
                                                          type="button"
                                                          onClick={(e) => { e.stopPropagation(); navigate(`/lots?q=${encodeURIComponent(p.name)}`); }}
                                                          className={`ml-2 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${lotSt.className}`}
                                                        >
                                                          {lotSt.label}
                                                        </button>
                                                      );
                                                    })()}
                                                </span>
                                                <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wide">{p.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex flex-col items-end gap-0.5">
                                                <span className="font-bold text-slate-800">{formatMoney(p.salePrice)}</span>
                                                <span className="text-[10px] text-slate-400">Buy: {formatMoney(p.purchasePrice)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-right">
                                            <div className="flex justify-end">
                                                {p.stock === 0 ? (
                                                    <span className="text-[10px] font-bold text-red-600 bg-white px-2 py-1 rounded-full border border-red-200 uppercase tracking-wide shadow-sm">Out of Stock</span>
                                                ) : isLow ? (
                                                    <span className="text-[10px] font-bold text-orange-600 bg-white px-2 py-1 rounded-full border border-orange-200 uppercase tracking-wide flex items-center gap-1 shadow-sm">
                                                        <AlertTriangle className="w-3 h-3" /> Low Stock
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100 uppercase tracking-wide">In Stock</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="pr-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleDuplicate(p)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Duplicate">
                                                    <RefreshCw className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setShowHistory(p.id)} className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="History">
                                                    <Clock className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleEdit(p)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleArchive(p.id, !p.isArchived)} className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title={p.isArchived ? "Restore" : "Archive"}>
                                                    <Clock className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )})}
                                {filteredProducts.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="p-12 text-center text-slate-400">
                                            <div className="flex flex-col items-center justify-center">
                                                <Package className="w-12 h-12 mb-3 opacity-20" />
                                                <p>No products found matching your search.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in fade-in duration-200">
                    {filteredProducts.map(p => {
                        const minStock = p.minStockLevel || 5;
                        const isLow = p.stock <= minStock;
                        return (
                        <div key={p.id} className={`bg-white rounded-xl border shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col overflow-hidden ${isLow ? 'border-red-300 ring-2 ring-red-100' : 'border-slate-200'}`}>
                            {/* Card Image Area */}
                            <div className="aspect-[4/3] bg-slate-50 relative overflow-hidden flex items-center justify-center border-b border-slate-100">
                                {p.image ? (
                                    <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                ) : (
                                    <Package className="w-12 h-12 text-slate-300" />
                                )}
                                <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
                                    {isLow && (
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded shadow-sm text-white flex items-center gap-1 ${p.stock === 0 ? 'bg-red-500' : 'bg-orange-500'}`}>
                                            <AlertTriangle className="w-3 h-3" />
                                            {p.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                                        </span>
                                    )}
                                    {p.sellOnline && (
                                        <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-sm flex items-center gap-1">
                                            <Globe className="w-3 h-3"/> Online
                                        </span>
                                    )}
                                </div>
                                {/* Quick Actions Overlay */}
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
                                    <button onClick={() => handleDuplicate(p)} className="p-2.5 bg-white rounded-full text-slate-700 hover:text-blue-600 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 hover:scale-110">
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setShowHistory(p.id)} className="p-2.5 bg-white rounded-full text-slate-700 hover:text-emerald-600 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-50 hover:scale-110">
                                        <Clock className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleEdit(p)} className="p-2.5 bg-white rounded-full text-slate-700 hover:text-indigo-600 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-75 hover:scale-110">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleArchive(p.id, !p.isArchived)} className="p-2.5 bg-white rounded-full text-slate-700 hover:text-amber-600 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-100 hover:scale-110">
                                        <Clock className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(p.id)} className="p-2.5 bg-white rounded-full text-slate-700 hover:text-red-600 shadow-xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 delay-150 hover:scale-110">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-5 flex flex-col flex-1">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{p.category}</span>
                                    <div className="flex gap-2" title={`Warranty: ${p.warrantyPeriod || 'N/A'} | Exp: ${p.expiryDate || 'N/A'}`}>
                                        {p.warranty && <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                                        {p.expiryDate && <Clock className="w-4 h-4 text-red-400" />}
                                    </div>
                                </div>
                                <h3 className={`font-bold text-base line-clamp-2 mb-2 h-12 leading-snug ${isLow ? 'text-red-600' : 'text-slate-800'}`} title={p.name}>{p.name}</h3>
                                {(() => {
                                  const lotSt = productLotStatus(p);
                                  if (!lotSt) return null;
                                  return (
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); navigate(`/lots?q=${encodeURIComponent(p.name)}`); }}
                                      className={`mb-2 text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${lotSt.className}`}
                                    >
                                      {lotSt.label}
                                    </button>
                                  );
                                })()}
                                
                                <div className="mt-auto flex items-end justify-between pt-4 border-t border-slate-50">
                                    <div>
                                        <p className="text-xs text-slate-400 mb-0.5 font-medium uppercase tracking-wide">Stock Level</p>
                                        <p className={`font-bold text-sm flex items-baseline gap-1 ${isLow ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>
                                            {p.stock} <span className="text-[10px] font-normal text-slate-400 uppercase">{p.unit}</span>
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400 mb-0.5 font-medium uppercase tracking-wide">Price</p>
                                        <p className="font-bold text-lg text-indigo-600 leading-none">{formatMoney(p.salePrice)}</p>
                                    </div>
                                </div>
                                <button onClick={() => handleEdit(p)} className="mt-4 w-full py-2 border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 text-sm font-medium transition-all md:hidden">
                                    Edit Details
                                </button>
                            </div>
                        </div>
                    )})}
                    {filteredProducts.length === 0 && (
                        <div className="col-span-full p-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                            <div className="flex flex-col items-center justify-center">
                                <Package className="w-12 h-12 mb-3 opacity-20" />
                                <p>No products found matching your search.</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Analytics Modal */}
            {showAnalytics && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200">
                                    <BarChart3 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-xl">Product Analytics</h3>
                                    <p className="text-sm text-slate-500 font-medium">Performance and Ranking Insights</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAnalytics(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-6 h-6 text-slate-500"/>
                            </button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Top Selling Products */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-6">
                                        <Award className="w-5 h-5 text-amber-500" />
                                        <h4 className="font-bold text-slate-800">Top Selling Products (Qty)</h4>
                                    </div>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={products
                                                    .map(p => ({
                                                        name: p.name,
                                                        sales: transactions
                                                            .filter(t => t.type === 'Sale')
                                                            .reduce((acc, t) => acc + (t.items?.find(i => i.productId === p.id)?.qty || 0), 0)
                                                    }))
                                                    .sort((a, b) => b.sales - a.sales)
                                                    .slice(0, 5)
                                                }
                                                layout="vertical"
                                                margin={{ left: 40, right: 40 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" hide />
                                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                                                <Tooltip 
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar dataKey="sales" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20}>
                                                    {products.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b'][index % 5]} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Revenue Performance */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex items-center gap-2 mb-6">
                                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                                        <h4 className="font-bold text-slate-800">Revenue Performance</h4>
                                    </div>
                                    <div className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={products
                                                    .map(p => ({
                                                        name: p.name,
                                                        revenue: transactions
                                                            .filter(t => t.type === 'Sale')
                                                            .reduce((acc, t) => {
                                                                const item = t.items?.find(i => i.productId === p.id);
                                                                return acc + (item ? item.qty * item.price : 0);
                                                            }, 0)
                                                    }))
                                                    .sort((a, b) => b.revenue - a.revenue)
                                                    .slice(0, 5)
                                                }
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                                                <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} />
                                                <Tooltip 
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value: number) => formatMoney(value)}
                                                />
                                                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Stock Value by Category */}
                                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
                                    <h4 className="font-bold text-slate-800 mb-6">Stock Value Distribution by Category</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                                        <div className="h-[300px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={uniqueCategories.map(cat => ({
                                                            name: cat,
                                                            value: products
                                                                .filter(p => p.category === cat)
                                                                .reduce((acc, p) => acc + (p.stock * p.purchasePrice), 0)
                                                        }))}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={100}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {uniqueCategories.map((_, index) => (
                                                            <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                        formatter={(value: number) => formatMoney(value)}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <div className="space-y-3">
                                            {uniqueCategories.map((cat, idx) => {
                                                const value = products
                                                    .filter(p => p.category === cat)
                                                    .reduce((acc, p) => acc + (p.stock * p.purchasePrice), 0);
                                                const totalValue = products.reduce((acc, p) => acc + (p.stock * p.purchasePrice), 0);
                                                const percent = totalValue > 0 ? (value / totalValue) * 100 : 0;
                                                
                                                return (
                                                    <div key={cat} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][idx % 5] }} />
                                                            <span className="text-sm font-bold text-slate-700">{cat}</span>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-sm font-bold text-slate-900">{formatMoney(value)}</p>
                                                            <p className="text-[10px] text-slate-400 font-medium">{percent.toFixed(1)}% of total</p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[80vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                                    <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 text-lg">Product History</h3>
                                    <p className="text-xs text-slate-500 font-medium">
                                        {products.find(p => p.id === showHistory)?.name}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setShowHistory(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                                <X className="w-5 h-5 text-slate-500"/>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <div className="space-y-4">
                                {transactions
                                    .filter(t => t.items?.some(item => item.productId === showHistory))
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .map(t => {
                                        const item = t.items?.find(i => i.productId === showHistory);
                                        const isSale = t.type === 'Sale';
                                        return (
                                            <div key={t.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className={`p-2 rounded-lg ${isSale ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>
                                                        {isSale ? <Download className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{t.type}</p>
                                                        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{t.date} • {t.entityName}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-sm font-bold ${isSale ? 'text-blue-600' : 'text-orange-600'}`}>
                                                        {isSale ? '-' : '+'}{item?.qty} {products.find(p => p.id === showHistory)?.unit}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-medium">Ref: {t.reference}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                {transactions.filter(t => t.items?.some(item => item.productId === showHistory)).length === 0 && (
                                    <div className="text-center py-12">
                                        <Clock className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                        <p className="text-slate-400 text-sm">No transaction history found for this product.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg">{editingProduct ? t('Edit Product') : t('Add New Product')}</h3>
                                {lastSaved && (
                                    <span className="text-[10px] text-emerald-600 flex items-center gap-1 mt-0.5 font-medium">
                                        <Clock className="w-3 h-3" /> Auto-saved: {lastSaved}
                                    </span>
                                )}
                            </div>
                            <button onClick={handleDiscard} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500"/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
                            
                            {/* Image Upload Section */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-2">Product Media</h4>
                                <div className="flex flex-wrap gap-4">
                                    <div className="relative group w-32 h-32">
                                        <div className={`w-full h-full rounded-2xl border-2 border-dashed flex items-center justify-center overflow-hidden transition-colors ${formData.image ? 'border-indigo-200' : 'border-slate-300 hover:border-indigo-400 bg-slate-50'}`}>
                                            {formData.image ? (
                                                <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="text-center p-4">
                                                    <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                                                    <span className="text-[10px] text-slate-500 uppercase font-bold">Main Image</span>
                                                </div>
                                            )}
                                        </div>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            onChange={handleImageUpload} 
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        {formData.image && (
                                            <button 
                                                onClick={() => setFormData({...formData, image: ''})}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:bg-red-600 transition-colors"
                                                type="button"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>

                                    {/* Gallery Images */}
                                    {(formData.images || []).map((img, idx) => (
                                        <div key={idx} className="relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden group">
                                            <img src={img} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({...formData, images: formData.images?.filter((_, i) => i !== idx)})}
                                                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-2 h-2" />
                                            </button>
                                        </div>
                                    ))}
                                    
                                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center cursor-pointer hover:bg-slate-50 transition-colors">
                                        <Plus className="w-5 h-5 text-slate-400" />
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            multiple
                                            onChange={(e) => {
                                                const files = Array.from(e.target.files || []) as File[];
                                                files.forEach(file => {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => {
                                                        setFormData(prev => ({...prev, images: [...(prev.images || []), reader.result as string]}));
                                                    };
                                                    reader.readAsDataURL(file);
                                                });
                                            }} 
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            {/* Basic Information */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-2">Basic Information</h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t('Product Name')}</label>
                                    <input 
                                        type="text" 
                                        value={formData.name ?? ''} 
                                        onChange={e => setFormData({...formData, name: e.target.value})} 
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-slate-800" 
                                        required 
                                        placeholder="e.g. Wireless Mouse"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t('Category')}</label>
                                        <select
                                            value={formData.category ?? ''}
                                            onChange={e => setFormData({...formData, category: e.target.value, subCategory: ''})}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white outline-none cursor-pointer"
                                        >
                                            <option value="">Select category</option>
                                            {(categories || []).map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Sub-Category</label>
                                        <select
                                            value={formData.subCategory ?? ''}
                                            onChange={e => setFormData({...formData, subCategory: e.target.value})}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white outline-none cursor-pointer"
                                        >
                                            <option value="">None</option>
                                            {((categories || []).find(c => c.name === formData.category)?.subCategories || []).map(s => (
                                                <option key={s} value={s}>{s}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                {user?.businessType?.toLowerCase() === 'restaurant' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Kitchen Station</label>
                                        <input 
                                            type="text" 
                                            value={formData.kitchenStation ?? ''} 
                                            onChange={e => setFormData({...formData, kitchenStation: e.target.value})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all" 
                                            list="kitchen-stations"
                                            placeholder="e.g. Grill, Bar, Dessert (leave blank for Main Kitchen)"
                                        />
                                        <datalist id="kitchen-stations">
                                            <option value="Main Kitchen" /><option value="Grill" /><option value="Bar" /><option value="Dessert" />
                                        </datalist>
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Brand</label>
                                        <select
                                            value={formData.brand ?? ''}
                                            onChange={e => setFormData({...formData, brand: e.target.value})}
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white outline-none cursor-pointer"
                                        >
                                            <option value="">No brand</option>
                                            {(brands || []).map(b => (
                                                <option key={b.id} value={b.name}>{b.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t('Unit')}</label>
                                        <select 
                                            value={formData.unit ?? 'Pcs'} 
                                            onChange={e => setFormData({...formData, unit: e.target.value})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white outline-none cursor-pointer"
                                        >
                                            {(units || []).map(u => (
                                                <option key={u.id} value={u.name}>{u.name}</option>
                                            ))}
                                            {(units || []).length === 0 && (
                                                <>
                                                    <option value="Pcs">Pcs</option>
                                                    <option value="Kg">Kg</option>
                                                    <option value="Ltr">Ltr</option>
                                                    <option value="Box">Box</option>
                                                </>
                                            )}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Warehouse</label>
                                <select
                                    value={formData.warehouseId ?? ''}
                                    onChange={e => setFormData({...formData, warehouseId: e.target.value || undefined})}
                                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white outline-none cursor-pointer"
                                >
                                    <option value="">Default / Unassigned</option>
                                    {(warehouses || []).map(w => (
                                        <option key={w.id} value={w.id}>{w.name}{w.isDefault ? ' (Default)' : ''}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Identification */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-2">Identification</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex justify-between items-center">
                                            SKU
                                            <button type="button" onClick={() => setFormData({...formData, sku: generateSKU(formData.name || '', formData.category || '')})} className="text-[10px] text-indigo-600 hover:underline">Generate</button>
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.sku ?? ''} 
                                            onChange={e => setFormData({...formData, sku: e.target.value})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" 
                                            placeholder="SKU-123"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex justify-between items-center">
                                            Barcode
                                            <span className="flex gap-2">
                                                <button type="button" onClick={() => setShowBarcodeScanner(true)} className="text-[10px] text-indigo-600 hover:underline">Scan</button>
                                                <button type="button" onClick={() => setFormData({...formData, barcode: generateBarcode()})} className="text-[10px] text-indigo-600 hover:underline">Generate</button>
                                            </span>
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.barcode ?? ''} 
                                            onChange={e => setFormData({...formData, barcode: e.target.value})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" 
                                            placeholder="Barcode"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex justify-between items-center">
                                            QR Code
                                            <button type="button" onClick={() => {
                                                const payload = formData.sku || formData.barcode || formData.id || `QR-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
                                                setFormData({...formData, qrCode: String(payload)});
                                            }} className="text-[10px] text-indigo-600 hover:underline">Generate from SKU/Barcode</button>
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.qrCode ?? ''} 
                                            onChange={e => setFormData({...formData, qrCode: e.target.value})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-sm" 
                                            placeholder="QR payload (SKU, URL, or custom text)"
                                        />
                                        {formData.qrCode && (
                                            <div className="mt-3 flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(formData.qrCode)}`}
                                                    alt="Product QR"
                                                    width={120}
                                                    height={120}
                                                    className="rounded-lg border border-slate-200 bg-white"
                                                />
                                                <div className="text-xs text-slate-500 space-y-1">
                                                    <p className="font-semibold text-slate-700">Live QR preview</p>
                                                    <p className="break-all font-mono text-[10px]">{formData.qrCode}</p>
                                                    <a
                                                        href={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(formData.qrCode)}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="inline-block text-indigo-600 hover:underline font-medium"
                                                    >
                                                        Download larger PNG
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Variants Section */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-indigo-50 pb-2">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Variants (Size/Color)</h4>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData, 
                                            variants: [...(formData.variants || []), { id: Date.now().toString(), name: '', stock: 0, attributes: [], lots: [], expiryDate: '', batchNumber: '' }]
                                        })}
                                        className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-bold"
                                    >
                                        + Add Variant
                                    </button>
                                </div>

                                    <div className="flex flex-wrap gap-2 items-end mb-2">
                                        <div className="flex-1 min-w-[120px]">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Colors (comma)</label>
                                            <input id="variant-colors" placeholder="Red, Blue, Black" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                                        </div>
                                        <div className="flex-1 min-w-[120px]">
                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Sizes (comma)</label>
                                            <input id="variant-sizes" placeholder="S, M, L, XL" className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs" />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const colors = (document.getElementById('variant-colors') as HTMLInputElement)?.value.split(',').map(s => s.trim()).filter(Boolean) || [];
                                                const sizes = (document.getElementById('variant-sizes') as HTMLInputElement)?.value.split(',').map(s => s.trim()).filter(Boolean) || [];
                                                if (!colors.length && !sizes.length) { alert('Enter at least colors or sizes'); return; }
                                                const cList = colors.length ? colors : [''];
                                                const sList = sizes.length ? sizes : [''];
                                                const generated: any[] = [];
                                                cList.forEach(color => {
                                                    sList.forEach(size => {
                                                        const parts = [color, size].filter(Boolean);
                                                        const name = parts.join(' / ');
                                                        if (!name) return;
                                                        if ((formData.variants || []).some(v => v.name === name) || generated.some(g => g.name === name)) return;
                                                        generated.push({
                                                            id: `v-${Date.now()}-${generated.length}`,
                                                            name,
                                                            stock: 0,
                                                            attributes: [
                                                                ...(color ? [{ name: 'Color', value: color }] : []),
                                                                ...(size ? [{ name: 'Size', value: size }] : []),
                                                            ],
                                                        });
                                                    });
                                                });
                                                if (!generated.length) { alert('No new variants to add'); return; }
                                                setFormData({ ...formData, variants: [...(formData.variants || []), ...generated] });
                                            }}
                                            className="text-[10px] bg-slate-800 text-white px-3 py-2 rounded-lg font-bold hover:bg-slate-700"
                                        >
                                            Generate matrix
                                        </button>
                                    </div>
                                <div className="space-y-3">
                                    {(formData.variants || []).map((variant, vIdx) => (
                                        <div key={variant.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 space-y-3">
                                            <div className="flex gap-3">
                                                <input 
                                                    type="text" 
                                                    placeholder="Variant Name (e.g. Red / XL)"
                                                    value={variant.name}
                                                    onChange={(e) => {
                                                        const newVariants = [...(formData.variants || [])];
                                                        newVariants[vIdx].name = e.target.value;
                                                        setFormData({...formData, variants: newVariants});
                                                    }}
                                                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                                />
                                                <input 
                                                    type="number" 
                                                    placeholder="Stock"
                                                    value={variant.stock}
                                                    onChange={(e) => {
                                                        const newVariants = [...(formData.variants || [])];
                                                        newVariants[vIdx].stock = parseInt(e.target.value);
                                                        setFormData({...formData, variants: newVariants});
                                                    }}
                                                    className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                                />
                                                <button 
                                                    type="button"
                                                    onClick={() => setFormData({
                                                        ...formData,
                                                        variants: formData.variants?.filter((_, i) => i !== vIdx)
                                                    })}
                                                    className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="SKU"
                                                    value={variant.sku}
                                                    onChange={(e) => {
                                                        const newVariants = [...(formData.variants || [])];
                                                        newVariants[vIdx].sku = e.target.value;
                                                        setFormData({...formData, variants: newVariants});
                                                    }}
                                                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-mono"
                                                />
                                                <input 
                                                    type="number" 
                                                    placeholder="Price (optional)"
                                                    value={variant.price ?? ''}
                                                    onChange={(e) => {
                                                        const newVariants = [...(formData.variants || [])];
                                                        newVariants[vIdx].price = parseFloat(e.target.value) || undefined;
                                                        setFormData({...formData, variants: newVariants});
                                                    }}
                                                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px]"
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Barcode"
                                                    value={variant.barcode}
                                                    onChange={(e) => {
                                                        const newVariants = [...(formData.variants || [])];
                                                        newVariants[vIdx].barcode = e.target.value;
                                                        setFormData({...formData, variants: newVariants});
                                                    }}
                                                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-mono"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Pricing & Inventory */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-2">Pricing & Inventory</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t('Purchase Price')} ({currencySymbol})</label>
                                        <input 
                                            type="number" 
                                            value={localPrices.purchase ?? ''}
                                            onChange={e => setLocalPrices({...localPrices, purchase: e.target.value})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-700" 
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">{t('Sale Price')} ({currencySymbol})</label>
                                        <input 
                                            type="number" 
                                            value={localPrices.sale ?? ''}
                                            onChange={e => setLocalPrices({...localPrices, sale: e.target.value})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600" 
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Stock Quantity</label>
                                        <input 
                                            type="number" 
                                            value={formData.stock ?? 0} 
                                            onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-800" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Min Stock Level</label>
                                        <input 
                                            type="number" 
                                            value={formData.minStockLevel ?? 0} 
                                            onChange={e => setFormData({...formData, minStockLevel: parseInt(e.target.value)})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-600"
                                            placeholder="Default: 5"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Tracking & Supplier */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-2">Tracking & Supplier</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                                            Batch Number
                                        </label>
                                        <input 
                                            type="text" 
                                            value={formData.batchNumber ?? ''} 
                                            onChange={e => setFormData({...formData, batchNumber: e.target.value})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="Batch #"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex items-center gap-1">
                                            Expiry Date
                                        </label>
                                        <input 
                                            type="date" 
                                            value={formData.expiryDate ?? ''} 
                                            onChange={e => setFormData({...formData, expiryDate: e.target.value})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5 flex justify-between items-center">
                                        Serial Numbers
                                        <span className="text-[10px] font-normal text-slate-400 normal-case">one per line or comma-separated</span>
                                    </label>
                                    <textarea
                                        value={(formData.serialNumbers || []).join('\n')}
                                        onChange={e => {
                                            const list = e.target.value
                                                .split(/[\n,;]/)
                                                .map(s => s.trim())
                                                .filter(Boolean);
                                            const units = list.map((line: string) => {
                                              const parts = line.split(':').map((x: string) => x.trim()).filter(Boolean);
                                              if (parts.length >= 2) {
                                                return { serial: parts[parts.length - 1], lotNumber: parts[0], status: 'available' as const };
                                              }
                                              return { serial: line, status: 'available' as const };
                                            });
                                            setFormData({
                                              ...formData,
                                              serialNumbers: units.map((u: any) => u.serial),
                                              serialUnits: units,
                                            } as any);
                                        }}
                                        rows={3}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs"
                                        placeholder={"SN-001\nSN-002\nSN-003"}
                                    />
                                    {(formData.serialNumbers || []).length > 0 && (
                                        <p className="mt-1 text-[10px] text-slate-500">
                                            {(formData.serialNumbers || []).length} serial(s) recorded
                                            {(formData.stock != null && (formData.serialNumbers || []).length !== formData.stock)
                                                ? ` · note: count differs from stock (${formData.stock})`
                                                : ''}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Preferred Supplier</label>
                                    <select 
                                        value={formData.supplierId ?? ''} 
                                        onChange={e => setFormData({...formData, supplierId: e.target.value})} 
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white outline-none cursor-pointer"
                                    >
                                        <option value="">Select Supplier</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Product Features */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-2">Product Features</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.warranty ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-300'}`}>
                                            {formData.warranty && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <input type="checkbox" checked={formData.warranty} onChange={e => setFormData({...formData,warranty: e.target.checked})} className="hidden"/>
                                        <span className="text-xs font-bold text-slate-700">Warranty</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.sellOnline ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-300'}`}>
                                            {formData.sellOnline && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <input type="checkbox" checked={formData.sellOnline} onChange={e => setFormData({...formData, sellOnline: e.target.checked})} className="hidden"/>
                                        <span className="text-xs font-bold text-slate-700">Sell Online</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.isDigital ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-300'}`}>
                                            {formData.isDigital && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <input type="checkbox" checked={formData.isDigital} onChange={e => setFormData({...formData, isDigital: e.target.checked})} className="hidden"/>
                                        <span className="text-xs font-bold text-slate-700">Digital Product</span>
                                    </label>
                                    <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors group">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${formData.isBundle ? 'bg-indigo-600 border-indigo-600' : 'bg-white border-slate-300 group-hover:border-indigo-300'}`}>
                                            {formData.isBundle && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <input type="checkbox" checked={formData.isBundle} onChange={e => setFormData({...formData, isBundle: e.target.checked})} className="hidden"/>
                                        <span className="text-xs font-bold text-slate-700">Bundle Product</span>
                                    </label>
                                </div>
                                {formData.warranty && (
                                    <input 
                                        type="text" 
                                        className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                        value={formData.warrantyPeriod ?? ''} 
                                        onChange={e => setFormData({...formData, warrantyPeriod: e.target.value})} 
                                        placeholder="Warranty Period (e.g., 1 Year)" 
                                    />
                                )}
                                {formData.isDigital && (
                                    <div className="animate-in slide-in-from-top-2 duration-200">
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Download URL</label>
                                        <input 
                                            type="url" 
                                            className="w-full border border-slate-200 px-4 py-2.5 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            value={formData.downloadUrl ?? ''} 
                                            onChange={e => setFormData({...formData, downloadUrl: e.target.value})} 
                                            placeholder="https://example.com/download" 
                                        />
                                    </div>
                                )}
                                {formData.isBundle && (
                                    <div className="animate-in slide-in-from-top-2 duration-200 space-y-3">
                                        <div className="flex justify-between items-center">
                                            <label className="block text-xs font-bold text-slate-500 uppercase">Bundle Components</label>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const pId = prompt("Enter Product ID to add to bundle:");
                                                    if (pId) {
                                                        const p = products.find(prod => prod.id === pId);
                                                        if (p) {
                                                            setFormData({
                                                                ...formData,
                                                                bundleItems: [...(formData.bundleItems || []), { productId: pId, qty: 1 }]
                                                            });
                                                        } else {
                                                            alert("Product not found.");
                                                        }
                                                    }
                                                }}
                                                className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-bold"
                                            >
                                                + Add Item
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {(formData.bundleItems || []).map((item, idx) => {
                                                const p = products.find(prod => prod.id === item.productId);
                                                return (
                                                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                        <span className="text-xs font-medium text-slate-700">{p?.name || 'Unknown Product'}</span>
                                                        <div className="flex items-center gap-2">
                                                            <input 
                                                                type="number" 
                                                                value={item.qty}
                                                                onChange={(e) => {
                                                                    const newItems = [...(formData.bundleItems || [])];
                                                                    newItems[idx].qty = parseInt(e.target.value);
                                                                    setFormData({...formData, bundleItems: newItems});
                                                                }}
                                                                className="w-12 px-1 py-0.5 border border-slate-200 rounded text-xs text-center"
                                                            />
                                                            <button 
                                                                type="button"
                                                                onClick={() => setFormData({
                                                                    ...formData,
                                                                    bundleItems: formData.bundleItems?.filter((_, i) => i !== idx)
                                                                })}
                                                                className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                            >
                                                                <Trash2 className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Physical Details */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-2">Physical Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Weight (kg)</label>
                                        <input 
                                            type="number" 
                                            value={formData.weight ?? 0} 
                                            onChange={e => setFormData({...formData, weight: parseFloat(e.target.value)})} 
                                            className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="col-span-3">
                                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Dimensions (L x W x H)</label>
                                        </div>
                                        <input 
                                            type="number" 
                                            value={formData.dimensions?.length ?? 0} 
                                            onChange={e => setFormData({...formData, dimensions: {...formData.dimensions!, length: parseFloat(e.target.value)}})} 
                                            className="px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            placeholder="L"
                                        />
                                        <input 
                                            type="number" 
                                            value={formData.dimensions?.width ?? 0} 
                                            onChange={e => setFormData({...formData, dimensions: {...formData.dimensions!, width: parseFloat(e.target.value)}})} 
                                            className="px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            placeholder="W"
                                        />
                                        <input 
                                            type="number" 
                                            value={formData.dimensions?.height ?? 0} 
                                            onChange={e => setFormData({...formData, dimensions: {...formData.dimensions!, height: parseFloat(e.target.value)}})} 
                                            className="px-2 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" 
                                            placeholder="H"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Additional Info */}
                            <div className="space-y-4">
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-2">Additional Info</h4>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Product Notes</label>
                                    <textarea 
                                        value={formData.notes ?? ''} 
                                        onChange={e => setFormData({...formData, notes: e.target.value})} 
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[80px]" 
                                        placeholder="Internal notes about this product..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Tags (Comma separated)</label>
                                    <input 
                                        type="text" 
                                        value={formData.tags?.join(', ') ?? ''} 
                                        onChange={e => setFormData({...formData, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)})} 
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm" 
                                        placeholder="e.g. New, Sale, Featured"
                                    />
                                </div>
                            </div>

                            {/* Discount Rules */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-indigo-50 pb-2">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Discount Rules</h4>
                                    <button 
                                        type="button"
                                        onClick={() => setFormData({
                                            ...formData, 
                                            discountRules: [...(formData.discountRules || []), { id: Date.now().toString(), type: 'percentage', value: 0 }]
                                        })}
                                        className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-bold"
                                    >
                                        + Add Rule
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {(formData.discountRules || []).map((rule, rIdx) => (
                                        <div key={rule.id} className="p-3 border border-slate-100 rounded-xl bg-slate-50/50 flex gap-3 items-center">
                                            <select 
                                                value={rule.type}
                                                onChange={(e) => {
                                                    const newRules = [...(formData.discountRules || [])];
                                                    newRules[rIdx].type = e.target.value as any;
                                                    setFormData({...formData, discountRules: newRules});
                                                }}
                                                className="px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                                            >
                                                <option value="percentage">% Off</option>
                                                <option value="fixed">Fixed Off</option>
                                            </select>
                                            <input 
                                                type="number" 
                                                placeholder="Value"
                                                value={rule.value}
                                                onChange={(e) => {
                                                    const newRules = [...(formData.discountRules || [])];
                                                    newRules[rIdx].value = parseFloat(e.target.value);
                                                    setFormData({...formData, discountRules: newRules});
                                                }}
                                                className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                            />
                                            <input 
                                                type="number" 
                                                placeholder="Min Qty"
                                                value={rule.minQty}
                                                onChange={(e) => {
                                                    const newRules = [...(formData.discountRules || [])];
                                                    newRules[rIdx].minQty = parseInt(e.target.value);
                                                    setFormData({...formData, discountRules: newRules});
                                                }}
                                                className="w-20 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    discountRules: formData.discountRules?.filter((_, i) => i !== rIdx)
                                                })}
                                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg ml-auto"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Custom Fields */}
                            <div className="space-y-4">
                                <div className="flex justify-between items-center border-b border-indigo-50 pb-2">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Custom Fields</h4>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            const key = prompt("Enter field name:");
                                            if (key) {
                                                setFormData({
                                                    ...formData, 
                                                    customFields: { ...(formData.customFields || {}), [key]: '' }
                                                });
                                            }
                                        }}
                                        className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 font-bold"
                                    >
                                        + Add Field
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {Object.entries(formData.customFields || {}).map(([key, value]) => (
                                        <div key={key} className="flex gap-3 items-center">
                                            <span className="text-xs font-bold text-slate-500 w-24 truncate">{key}:</span>
                                            <input 
                                                type="text" 
                                                value={value}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    customFields: { ...(formData.customFields || {}), [key]: e.target.value }
                                                })}
                                                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs"
                                            />
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const newFields = { ...(formData.customFields || {}) };
                                                    delete newFields[key];
                                                    setFormData({ ...formData, customFields: newFields });
                                                }}
                                                className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Multi-warehouse Stock View */}
                            {editingProduct && (
                                <div className="space-y-4">
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-2">Stock in Other Branches</h4>
                                    <div className="space-y-2">
                                        {products.filter(p => p.name === editingProduct.name && p.id !== editingProduct.id).map(p => (
                                            <div key={p.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl text-xs border border-slate-100">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">Branch</span>
                                                    <span className="font-bold text-slate-800">Store ID: {p.storeId}</span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <span className="text-slate-500 font-medium uppercase tracking-wider text-[10px]">Available</span>
                                                        <p className="font-bold text-slate-800">{p.stock} {p.unit}</p>
                                                    </div>
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleTransfer(p, editingProduct)}
                                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                                                        title="Transfer Stock to this Branch"
                                                    >
                                                        <RefreshCw className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {products.filter(p => p.name === editingProduct.name && p.id !== editingProduct.id).length === 0 && (
                                            <p className="text-[10px] text-slate-400 italic">No other branches carry this product.</p>
                                        )}
                                    </div>
                                </div>
                            )}

                            {editingProduct && (
                                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                                    <label className="block text-xs font-bold text-amber-700 uppercase mb-1.5">Adjustment Reason (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={adjustmentReason}
                                        onChange={e => setAdjustmentReason(e.target.value)}
                                        className="w-full px-4 py-2.5 border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm text-slate-700 bg-white"
                                        placeholder="e.g. Damage, Gift, Count Correction"
                                    />
                                </div>
                            )}

                            <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 active:scale-95 flex items-center justify-center gap-2 mt-4">
                                <Save className="w-5 h-5" />
                                {editingProduct ? t('Save Changes') : t('Save Product')}
                            </button>
                        </form>
                    </div>
                </div>
            )}
      {showBarcodeScanner && (
        <BarcodeScanner
          open={showBarcodeScanner}
          title="Scan product barcode"
          onClose={() => setShowBarcodeScanner(false)}
          onScan={({ code }) => {
            setFormData(prev => ({ ...prev, barcode: code }));
            setShowBarcodeScanner(false);
          }}
        />
      )}
        </div>
    );
};

export default ProductList;
