import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { useData, Product, LedgerEntry } from '../contexts/DataContext';
import { normalizeSerialUnits } from '@shared/lib/serialUnits';
import { Package, AlertCircle, Clock, CheckSquare, Square, Save, X, ShieldCheck, AlertTriangle, Calculator, DollarSign, StickyNote, Plus, Trash2, Layers, History, Edit2, ArrowRightLeft, Filter, ArrowRight, Minus, FileText, Hash, Search } from 'lucide-react';

interface StockMovement {
    transactionId: string;
    date: string;
    type: string;
    productName: string;
    productId: string;
    quantity: number;
    price: number;
    reference?: string;
    // New fields for history
    stockBefore: number;
    stockAfter: number;
    batchNumber?: string;
    expiryDate?: string;
}

const StockReport: React.FC = () => {
    const navigate = useNavigate();
    const { t, formatMoney, currencySymbol, language } = useSettings();
    const { products, transactions, updateProductStock, addTransaction, updateTransaction, deleteItem } = useData();
    const [activeTab, setActiveTab] = useState<'all' | 'stock' | 'expired' | 'warranty' | 'history' | 'stocktake' | 'serials'>('all');
    const [serialQuery, setSerialQuery] = useState('');
    const serialSearchRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (activeTab !== 'serials') return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'F2') {
                e.preventDefault();
                serialSearchRef.current?.focus();
                serialSearchRef.current?.select();
            }
            if (e.key === 'Escape' && serialQuery) {
                e.preventDefault();
                setSerialQuery('');
                serialSearchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [activeTab, serialQuery]);
    
    // Bulk Action State for Low Stock
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkQty, setBulkQty] = useState<number>(0);
    const [bulkMode, setBulkMode] = useState<'increase' | 'decrease'>('increase');
    const [bulkLot, setBulkLot] = useState('');
    const [bulkExpiry, setBulkExpiry] = useState('');
    const [stocktakeCounts, setStocktakeCounts] = useState<Record<string, string>>({});
    const [stocktakeBusy, setStocktakeBusy] = useState(false);

    const serialRows = useMemo(() => {
        const q = serialQuery.trim().toLowerCase();
        const rows: { productId: string; productName: string; serial: string; lotNumber?: string; status: string }[] = [];
        for (const p of products) {
            const units = normalizeSerialUnits(p as any);
            for (const u of units) {
                if (q && !u.serial.toLowerCase().includes(q) && !(u.lotNumber || '').toLowerCase().includes(q) && !p.name.toLowerCase().includes(q)) {
                    continue;
                }
                rows.push({
                    productId: p.id,
                    productName: p.name,
                    serial: u.serial,
                    lotNumber: u.lotNumber,
                    status: u.status,
                });
            }
        }
        return rows;
    }, [products, serialQuery]);

    // History Filter State

    const [historyFilter, setHistoryFilter] = useState<'All' | 'Buy' | 'Sell' | 'Adjustment' | 'StockTake'>('All');
    const [historySearch, setHistorySearch] = useState('');
    const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
    const [editQty, setEditQty] = useState<number>(0);
    const [viewTransaction, setViewTransaction] = useState<LedgerEntry | null>(null);

    // Notes State
    const [notes, setNotes] = useState<{id: string, text: string, date: string}[]>(() => {
        const saved = localStorage.getItem('stock_notes');
        return saved ? JSON.parse(saved) : [];
    });
    const [newNote, setNewNote] = useState('');

    // Persist Notes
    useEffect(() => {
        localStorage.setItem('stock_notes', JSON.stringify(notes));
    }, [notes]);

    // --- Derived Data ---

    // 0. Summary Calculations
    const { totalProducts, inventoryValue } = useMemo(() => {
        const active = products.filter(p => !p.isDeleted);
        return {
            totalProducts: active.length,
            inventoryValue: active.reduce((sum, p) => sum + ((Number(p.purchasePrice) || 0) * (Number(p.stock) || 0)), 0)
        };
    }, [products]);

    // 1. All Products List
    const allProductList = useMemo(() => 
        products.filter(p => !p.isDeleted).sort((a, b) => a.name.localeCompare(b.name)),
    [products]);

    // 2. Low Stock List
    const lowStockList = useMemo(() => 
        products.filter(p => !p.isDeleted && p.stock <= (p.minStockLevel || 5)).sort((a, b) => a.stock - b.stock), 
    [products]);

    // 3. Expired / Expiring List (Within 90 Days)
    const expiredList = useMemo(() => {
        const today = new Date();
        const future90 = new Date();
        future90.setDate(today.getDate() + 90);

        return products.filter(p => {
            if (p.isDeleted || !p.expiryDate) return false;
            const exp = new Date(p.expiryDate);
            if (isNaN(exp.getTime())) return false;
            // Check if expired OR expiring within 90 days
            return exp <= future90; 
        }).map(p => {
            const exp = new Date(p.expiryDate!);
            const diffTime = exp.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            return { ...p, diffDays, isExpired: diffDays < 0 };
        }).sort((a, b) => a.diffDays - b.diffDays);
    }, [products]);

    // 4. Warranty List
    const warrantyList = useMemo(() => 
        products.filter(p => !p.isDeleted && p.warranty), 
    [products]);

    // 5. Stock Movement History with Snapshot Logic
    const stockMovements = useMemo(() => {
        // 1. Flatten all item movements from transactions
        const rawMoves: any[] = [];
        transactions.forEach(t => {
            if (t.isDeleted) return;
            if (['Sale', 'Purchase', 'Sales Return', 'Purchase Return', 'Stock Adjustment'].includes(t.type)) {
                t.items?.forEach(item => {
                    rawMoves.push({
                        transactionId: t.id,
                        date: t.date, 
                        type: t.type,
                        productName: item.name,
                        productId: item.productId,
                        quantity: item.qty,
                        price: item.price,
                        reference: t.reference,
                        batchNumber: item.batchNumber,
                        expiryDate: item.expiryDate
                    });
                });
            }
        });

        // 2. Sort Newest -> Oldest
        rawMoves.sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            
            const timeA = isNaN(dateA) ? 0 : dateA;
            const timeB = isNaN(dateB) ? 0 : dateB;
            
            if (timeA !== timeB) return timeB - timeA; // Descending
            return parseInt(b.transactionId) - parseInt(a.transactionId); // Fallback to ID
        });

        // 3. Calculate Snapshots Backwards
        // Create a map of current stock to start with
        const tempStockMap: Record<string, number> = {};
        products.forEach(p => tempStockMap[p.id] = p.stock);

        const calculatedMoves: StockMovement[] = rawMoves.map(move => {
            const currentStock = tempStockMap[move.productId] || 0;
            let change = 0;

            if (move.type === 'Stock Adjustment') {
                // Check if decrease based on reference, otherwise assume increase
                const isDecrease = move.reference && move.reference.toLowerCase().includes('decrease');
                change = isDecrease ? -move.quantity : move.quantity;
            } else {
                // Purchase/Sales Return = Added (+)
                // Sale/Purchase Return = Removed (-)
                const isIncoming = ['Purchase', 'Sales Return'].includes(move.type);
                change = isIncoming ? move.quantity : -move.quantity;
            }

            // Calculation:
            // Stock After Transaction = Current Stock (in this iteration of calculation)
            // Stock Before Transaction = Stock After - Change
            
            const stockAfter = currentStock;
            const stockBefore = currentStock - change;

            // Update the map for the *next* iteration (which is an older transaction)
            tempStockMap[move.productId] = stockBefore;

            return {
                ...move,
                stockBefore,
                stockAfter
            };
        });

        return calculatedMoves;
    }, [transactions, products]);

    const filteredMovements = useMemo(() => {
        return stockMovements.filter(m => {
            const matchesType = (() => {
                if (historyFilter === 'Buy') return ['Purchase', 'Sales Return'].includes(m.type);
                if (historyFilter === 'Sell') return ['Sale', 'Purchase Return'].includes(m.type);
                if (historyFilter === 'Adjustment') return ['Stock Adjustment'].includes(m.type);
                if (historyFilter === 'StockTake') return m.type === 'Stock Adjustment' && String(m.reference || '').toLowerCase().includes('stock take');
                return true;
            })();

            const term = historySearch.toLowerCase();
            const matchesSearch = !term || 
                (m.productName || '').toLowerCase().includes(term) ||
                (m.transactionId && m.transactionId.includes(term)) ||
                (m.reference && m.reference.toLowerCase().includes(term));

            return matchesType && matchesSearch;
        });
    }, [stockMovements, historyFilter, historySearch]);

    // --- Actions ---

    const toggleSelect = (id: string) => {
        setSelectedItems(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const stockTakeSessions = useMemo(() => {
        return transactions
            .filter(
                (tx) =>
                    !tx.isDeleted &&
                    tx.type === 'Stock Adjustment' &&
                    String(tx.reference || '').toLowerCase().includes('stock take')
            )
            .sort((a, b) => String(b.date).localeCompare(String(a.date)))
            .slice(0, 15)
            .map((tx) => {
                const lines = tx.items || [];
                const over = lines.filter((i: any) => (i.variance ?? 0) > 0).length;
                const under = lines.filter((i: any) => (i.variance ?? 0) < 0).length;
                const value = lines.reduce((s: number, i: any) => s + Math.abs(Number(i.total) || 0), 0);
                return {
                    id: tx.id,
                    date: String(tx.date || '').slice(0, 10),
                    lines: lines.length,
                    over,
                    under,
                    value,
                    notes: tx.notes,
                };
            });
    }, [transactions]);

    const applyStocktake = () => {

        const items: any[] = [];
        for (const p of products.filter((x) => !x.isDeleted && (x as any).type !== 'Service')) {
            const raw = stocktakeCounts[p.id];
            if (raw === undefined || raw === '') continue;
            const counted = Math.max(0, parseInt(raw, 10) || 0);
            const system = Number(p.stock) || 0;
            const delta = counted - system;
            if (delta === 0) continue;
            if (delta > 0) {
                updateProductStock(p.id, delta, 'increase', undefined, {
                    lotNumber: `COUNT-${new Date().toISOString().slice(0, 10)}`,
                });
            } else {
                updateProductStock(p.id, Math.abs(delta), 'decrease');
            }
            items.push({
                productId: p.id,
                name: p.name,
                qty: Math.abs(delta),
                price: p.purchasePrice || 0,
                total: Math.abs(delta) * (p.purchasePrice || 0),
                systemQty: system,
                countedQty: counted,
                variance: delta,
            });
        }
        if (!items.length) {
            alert('No variances to post — enter counted qty where it differs from system stock.');
            return;
        }
        if (!confirm(`Post ${items.length} stock-take variance adjustment(s)?`)) return;
        setStocktakeBusy(true);
        try {
            addTransaction({
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                entityName: 'Stock Take',
                type: 'Stock Adjustment',
                reference: 'Stock Take',
                amount: items.reduce((s, i) => s + i.total, 0),
                paymentMethod: 'Adjustment',
                items,
                details: { subtotal: 0, tax: 0, discount: 0, delivery: 0, mode: 'stocktake' } as any,
                notes: `Stock take variances: ${items.length} products`,
            });
            setStocktakeCounts({});
            alert(`Posted ${items.length} variance line(s). Decreases used FEFO.`);
        } finally {
            setStocktakeBusy(false);
        }
    };

    const exportStocktakeSheet = () => {
        const esc = (v: any) => {
            const s = v === undefined || v === null ? '' : String(v);
            if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };
        const lines = [['ProductId', 'SKU', 'Name', 'SystemStock', 'CountedQty'].join(',')];
        for (const pr of products.filter((x) => !x.isDeleted && (x as any).type !== 'Service')) {
            const counted = stocktakeCounts[pr.id] ?? '';
            lines.push([
                esc(pr.id),
                esc(pr.sku || ''),
                esc(pr.name),
                esc(Number(pr.stock) || 0),
                esc(counted),
            ].join(','));
        }
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-take-sheet-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const importStocktakeSheet = (file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            const text = String(reader.result || '');
            const rows = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
            if (rows.length < 2) {
                alert('Empty CSV');
                return;
            }
            const header = rows[0].toLowerCase();
            const next: Record<string, string> = { ...stocktakeCounts };
            let n = 0;
            for (let i = 1; i < rows.length; i++) {
                // simple CSV split (no embedded commas in names ideal)
                const cols = rows[i].split(',').map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"'));
                const id = cols[0];
                const sku = cols[1];
                const counted = cols[4] !== undefined ? cols[4] : cols[cols.length - 1];
                if (counted === undefined || counted === '') continue;
                let product = products.find((x) => x.id === id);
                if (!product && sku) product = products.find((x) => (x.sku || '') === sku);
                if (!product) continue;
                next[product.id] = String(parseInt(counted, 10) || 0);
                n++;
            }
            setStocktakeCounts(next);
            alert(`Imported counted qty for ${n} product(s)`);
        };
        reader.readAsText(file);
    };

    const handleBulkUpdate = () => {


        if (bulkQty <= 0) return;

        const lotNumber = bulkLot.trim() || (bulkMode === 'increase' ? `ADJ-${Date.now().toString(36).toUpperCase().slice(-5)}` : undefined);
        const adjustmentItems: any[] = [];

        selectedItems.forEach((id) => {
            const p = products.find((x) => x.id === id);
            if (!p) return;
            if (bulkMode === 'decrease' && (Number(p.stock) || 0) < bulkQty) {
                // still attempt FEFO; shortfall handled by stock clamp
            }
            const lotLines =
                bulkMode === 'increase'
                    ? (updateProductStock(id, bulkQty, 'increase', undefined, {
                          lotNumber,
                          expiryDate: bulkExpiry || undefined,
                        }) as any)
                    : (updateProductStock(id, bulkQty, 'decrease') as any);
            const lines = Array.isArray(lotLines) ? lotLines : [];
            adjustmentItems.push({
                productId: id,
                name: p.name || 'Unknown',
                qty: bulkQty,
                price: p.purchasePrice || 0,
                total: (p.purchasePrice || 0) * bulkQty,
                lots: lines.length ? lines : lotNumber ? [{ lotNumber, qty: bulkQty, expiryDate: bulkExpiry || undefined }] : undefined,
                batchNumber: lines[0]?.lotNumber || lotNumber,
                expiryDate: lines[0]?.expiryDate || bulkExpiry || undefined,
            });
        });

        if (adjustmentItems.length > 0) {
            addTransaction({
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                entityName: 'System Admin',
                type: 'Stock Adjustment',
                reference: bulkMode === 'decrease' ? 'Bulk Decrease' : 'Bulk Restock',
                amount: adjustmentItems.reduce((s, i) => s + i.total, 0),
                paymentMethod: 'Adjustment',
                items: adjustmentItems,
                details: {
                    subtotal: 0,
                    tax: 0,
                    discount: 0,
                    delivery: 0,
                    mode: bulkMode,
                    lotNumber: lotNumber || undefined,
                    expiryDate: bulkExpiry || undefined,
                } as any,
            });
        }

        setSelectedItems([]);
        setShowBulkModal(false);
        setBulkQty(0);
        setBulkLot('');
        setBulkExpiry('');
        setBulkMode('increase');
        alert(
            bulkMode === 'decrease'
                ? 'Stock decreased (FEFO) & transaction logged'
                : 'Stock increased & transaction logged'
        );
    };

    const handleAddNote = () => {
        if (!newNote.trim()) return;
        setNotes(prev => [{ id: Date.now().toString(), text: newNote, date: new Date().toLocaleDateString() }, ...prev]);
        setNewNote('');
    };

    const handleDeleteNote = (id: string) => {
        setNotes(prev => prev.filter(n => n.id !== id));
    };

    const openEditMovement = (move: StockMovement) => {
        setEditingMovement(move);
        setEditQty(move.quantity);
    };

    const handleRowClick = (txId: string) => {
        const tx = transactions.find(t => t.id === txId);
        if (tx) setViewTransaction(tx);
    };

    const handleDeleteMovement = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (confirm(t("Are you sure you want to delete this record? This will move it to the Recycle Bin but will NOT automatically revert stock changes."))) {
            deleteItem('transaction', id);
        }
    };

    const saveMovementEdit = () => {
        if (!editingMovement) return;
        const tx = transactions.find(t => t.id === editingMovement.transactionId);
        if (!tx || !tx.items) return;

        const diff = editQty - editingMovement.quantity;
        if (diff === 0) {
            setEditingMovement(null);
            return;
        }
        
        let stockAction: 'increase' | 'decrease' = 'increase';
        if (tx.type === 'Stock Adjustment') {
             const isDecrease = tx.reference && tx.reference.toLowerCase().includes('decrease');
             if (isDecrease) {
                 stockAction = diff > 0 ? 'decrease' : 'increase';
             } else {
                 stockAction = diff > 0 ? 'increase' : 'decrease';
             }
        } else {
            const isIncoming = ['Purchase', 'Sales Return'].includes(tx.type);
            stockAction = isIncoming ? (diff > 0 ? 'increase' : 'decrease') : (diff > 0 ? 'decrease' : 'increase');
        }
        
        // 2. Update Product Stock
        updateProductStock(editingMovement.productId, Math.abs(diff), stockAction);

        // 3. Update Transaction Record
        const updatedItems = tx.items.map(item => {
            if (item.productId === editingMovement.productId) {
                return { ...item, qty: editQty, total: editQty * item.price };
            }
            return item;
        });
        
        const newTotal = updatedItems.reduce((acc, i) => acc + i.total, 0);
        
        updateTransaction(tx.id, { items: updatedItems, amount: newTotal });
        
        setEditingMovement(null);
        alert("Transaction updated and stock level adjusted.");
    };

    return (
        <div className="space-y-6 max-w-full overflow-hidden">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full min-w-0">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white">{t('Stock Report')}</h1>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Inventory health and movement history</p>
                </div>
                
                {/* Tabs */}
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto max-w-full min-w-0 w-full md:w-auto scrollbar-none">
                    <button 
                        onClick={() => setActiveTab('all')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${activeTab === 'all' ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Package className="w-4 h-4" />
                        All Products
                    </button>
                    <button 
                        onClick={() => setActiveTab('stock')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${activeTab === 'stock' ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <AlertCircle className="w-4 h-4" />
                        Low Stock 
                        {lowStockList.length > 0 && <span className="bg-red-100 text-red-600 px-1.5 rounded-full text-xs ml-1">{lowStockList.length}</span>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${activeTab === 'history' ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <History className="w-4 h-4" />
                        Movement History
                    </button>
                    <button 
                        onClick={() => setActiveTab('stocktake')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${activeTab === 'stocktake' ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Layers className="w-4 h-4" />
                        Stock Take
                    </button>
                    <button 
                        onClick={() => setActiveTab('expired')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${activeTab === 'expired' ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Clock className="w-4 h-4" />
                        Expired 
                        {expiredList.length > 0 && <span className="bg-orange-100 text-orange-600 px-1.5 rounded-full text-xs ml-1">{expiredList.length}</span>}
                    </button>
                    <button 
                        onClick={() => setActiveTab('warranty')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${activeTab === 'warranty' ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <ShieldCheck className="w-4 h-4" />
                        Warranty
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('serials')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap shrink-0 ${activeTab === 'serials' ? 'bg-white dark:bg-slate-900 shadow-xs text-slate-800 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Hash className="w-4 h-4" /> Serials
                    </button>
                </div>
            </div>

            {/* Summary & Notes Section (Visible unless history tab) */}
            {activeTab !== 'history' && activeTab !== 'stocktake' && activeTab !== 'serials' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Inventory Summary */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                <Calculator className="w-5 h-5" />
                            </div>
                            <h3 className="font-bold text-slate-800">Inventory Value</h3>
                        </div>
                        
                        <div className="space-y-6">
                            <div>
                                <p className="text-sm text-slate-500 font-medium mb-1">Total Product Value (Cost)</p>
                                <div className="flex items-center gap-2">
                                    <DollarSign className="w-6 h-6 text-emerald-500" />
                                    <span className="text-3xl font-bold text-slate-800">{formatMoney(inventoryValue)}</span>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-slate-100">
                                <p className="text-sm text-slate-500 font-medium mb-1">Total Unique Products</p>
                                <div className="flex items-center gap-2">
                                    <Layers className="w-6 h-6 text-blue-500" />
                                    <span className="text-2xl font-bold text-slate-800">{totalProducts}</span>
                                    <span className="text-sm text-slate-400">items</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Notes */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full max-h-[300px]">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-xl flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <StickyNote className="w-4 h-4 text-yellow-500" /> Stock Notes
                            </h3>
                            <span className="text-xs text-slate-400">{notes.length} notes</span>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {notes.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                    <p className="text-sm italic">No notes added. Use this to track specific stock issues.</p>
                                </div>
                            ) : (
                                notes.map(note => (
                                    <div key={note.id} className="group flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                        <div className="w-2 h-2 rounded-full bg-yellow-400 mt-2 flex-shrink-0"></div>
                                        <div className="flex-1">
                                            <p className="text-sm text-slate-700">{note.text}</p>
                                            <p className="text-[10px] text-slate-400 mt-1">{note.date}</p>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteNote(note.id)}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="p-3 border-t border-slate-100 flex gap-2">
                            <input 
                                type="text" 
                                value={newNote}
                                onChange={(e) => setNewNote(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddNote()}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="Add a quick note..."
                            />
                            <button 
                                onClick={handleAddNote}
                                className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- ALL PRODUCTS VIEW --- */}
            {activeTab === 'all' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">All Products List</h3>
                            <span className="text-xs text-slate-500">{allProductList.length} items</span>
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Product Name</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4 text-center">Current Stock</th>
                                    <th className="px-6 py-4 text-center">Lots</th>
                                    <th className="px-6 py-4 text-right">Purchase Price</th>
                                    <th className="px-6 py-4 text-right">Sale Price</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allProductList.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">No products found.</td></tr>
                                ) : (
                                    allProductList.map(p => {
                                        const lotCount = Array.isArray((p as any).lots)
                                          ? (p as any).lots.filter((l: any) => (Number(l.qty) || 0) > 0).length
                                          : ((Number(p.stock) || 0) > 0 && ((p as any).batchNumber || (p as any).expiryDate) ? 1 : 0);
                                        return (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-800 block">{p.name}</span>
                                                <span className="text-xs text-slate-400">ID: {p.id}</span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{p.category}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.stock <= (p.minStockLevel || 5) ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-700'}`}>
                                                    {p.stock} <span className="font-normal text-[10px] text-slate-500 ml-0.5">{p.unit}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                              {lotCount > 0 ? (
                                                <button
                                                  type="button"
                                                  onClick={() => navigate(`/lots?q=${encodeURIComponent(p.name)}`)}
                                                  className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-1 rounded-full hover:bg-indigo-100"
                                                  title="Open Lot Enquiry"
                                                >
                                                  {lotCount} lot{lotCount === 1 ? '' : 's'}
                                                </button>
                                              ) : (
                                                <span className="text-xs text-slate-300">—</span>
                                              )}
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-600">
                                                {formatMoney(p.purchasePrice)}
                                            </td>
                                            <td className="px-6 py-4 text-right font-bold text-slate-800">
                                                {formatMoney(p.salePrice)}
                                            </td>
                                        </tr>
                                        );
                                      })
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOW STOCK VIEW --- */}
            {activeTab === 'stock' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="font-semibold text-slate-700">{lowStockList.length}</span> items below minimum threshold
                        </div>
                        {selectedItems.length > 0 && (
                            <button onClick={() => setShowBulkModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm hover:bg-slate-800">
                                <Save className="w-4 h-4" /> Restock Selected ({selectedItems.length})
                            </button>
                        )}
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 w-12 text-center">
                                        <button onClick={() => setSelectedItems(selectedItems.length === lowStockList.length ? [] : lowStockList.map(p => p.id))}>
                                            {selectedItems.length === lowStockList.length && lowStockList.length > 0 ? <CheckSquare className="w-5 h-5 text-indigo-600"/> : <Square className="w-5 h-5 text-slate-400"/>}
                                        </button>
                                    </th>
                                    <th className="px-6 py-4">Product Name</th>
                                    <th className="px-6 py-4 text-center">Current Stock</th>
                                    <th className="px-6 py-4 text-right">Unit Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {lowStockList.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">All stock levels are healthy!</td></tr>
                                ) : (
                                    lowStockList.map(p => (
                                        <tr key={p.id} className={`hover:bg-slate-50 ${selectedItems.includes(p.id) ? 'bg-indigo-50/50' : ''}`}>
                                            <td className="px-6 py-4 text-center">
                                                <button onClick={() => toggleSelect(p.id)}>
                                                    {selectedItems.includes(p.id) ? <CheckSquare className="w-5 h-5 text-indigo-600"/> : <Square className="w-5 h-5 text-slate-400"/>}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-bold text-slate-800">{p.name}</span>
                                                <div className="text-xs text-slate-500">{p.category}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${p.stock === 0 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                                                    {p.stock} <span className="font-normal text-[10px] text-slate-500 ml-0.5">{p.unit}</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-medium text-slate-600">
                                                {formatMoney(p.purchasePrice)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- HISTORY VIEW --- */}
            {activeTab === 'history' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex flex-col md:flex-row justify-between items-center mb-4 bg-white p-3 rounded-xl border border-slate-200 gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                <Filter className="w-4 h-4"/> Filter:
                            </span>
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                {['All', 'Buy', 'Sell', 'Adjustment', 'StockTake'].map(opt => (
                                    <button
                                        key={opt}
                                        onClick={() => setHistoryFilter(opt as any)}
                                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${historyFilter === opt ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {opt === 'StockTake' ? 'Stock Take' : opt}
                                    </button>
                                ))}
                            </div>
                        </div>
                        
                        <div className="relative w-full md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search product or ref..." 
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Type</th>
                                    <th className="px-6 py-4">Product Detail</th>
                                    <th className="px-6 py-4 text-center">Movement</th>
                                    <th className="px-6 py-4 text-center">Stock Snapshot</th>
                                    <th className="px-6 py-4 text-center">Batch/Exp</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredMovements.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">No movements found matching filters.</td></tr>
                                ) : (
                                    filteredMovements.map((move, idx) => {
                                        let isIncoming = ['Purchase', 'Sales Return'].includes(move.type);
                                        let isDecrease = false;
                                        const unit = products.find(p => p.id === move.productId)?.unit || 'Pcs';
                                        
                                        if (move.type === 'Stock Adjustment') {
                                            isDecrease = move.reference && move.reference.toLowerCase().includes('decrease');
                                            isIncoming = !isDecrease;
                                        }

                                        return (
                                            <tr 
                                                key={`${move.transactionId}-${idx}`} 
                                                className="hover:bg-indigo-50/30 group cursor-pointer transition-colors"
                                                onClick={() => handleRowClick(move.transactionId)}
                                            >
                                                <td className="px-6 py-4 whitespace-nowrap text-slate-500">
                                                    {move.date}
                                                    <div className="text-[10px] text-slate-400">#{move.transactionId.slice(-6)}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        move.type === 'Sale' ? 'bg-indigo-100 text-indigo-700' :
                                                        move.type === 'Purchase' ? 'bg-blue-100 text-blue-700' :
                                                        move.type === 'Stock Adjustment' ? 'bg-slate-200 text-slate-700' :
                                                        'bg-orange-100 text-orange-700'
                                                    }`}>
                                                        {move.type}
                                                    </span>
                                                    {move.reference && <div className="text-[9px] text-slate-400 mt-0.5">{move.reference}</div>}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-slate-800">
                                                    {move.productName}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`font-bold flex items-center justify-center gap-1 ${isIncoming ? 'text-emerald-600' : 'text-red-500'}`}>
                                                        {isIncoming ? <Plus className="w-3 h-3"/> : <Minus className="w-3 h-3"/>}
                                                        {move.quantity} <span className="text-[10px] font-normal text-slate-500 ml-0.5">{unit}</span>
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2 text-xs font-medium text-slate-600 bg-slate-100 py-1 px-2 rounded-lg w-fit mx-auto">
                                                        <span>{move.stockBefore}</span>
                                                        <ArrowRight className="w-3 h-3 text-slate-400" />
                                                        <span className="text-slate-900 font-bold">{move.stockAfter}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {(move.batchNumber || move.expiryDate) ? (
                                                        <div className="flex flex-col gap-1 items-center">
                                                            {move.batchNumber && (
                                                                <span className="text-[10px] bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                    <Hash className="w-3 h-3 text-slate-400"/> {move.batchNumber}
                                                                </span>
                                                            )}
                                                            {move.expiryDate && (
                                                                <span className="text-[10px] bg-red-50 border border-red-100 text-red-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                                                                    <Clock className="w-3 h-3"/> {move.expiryDate}
                                                                </span>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); openEditMovement(move); }}
                                                            className="text-slate-400 hover:text-indigo-600 p-2 rounded hover:bg-indigo-50 transition-colors"
                                                            title="Modify Transaction"
                                                        >
                                                            <Edit2 className="w-4 h-4"/>
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleDeleteMovement(move.transactionId, e)}
                                                            className="text-slate-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition-colors"
                                                            title="Delete Record"
                                                        >
                                                            <Trash2 className="w-4 h-4"/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- EXPIRED VIEW --- */}
            {activeTab === 'expired' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl mb-4 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div>
                            <h4 className="font-bold text-orange-800">Expiry Monitor</h4>
                            <p className="text-sm text-orange-700">Showing products expired or expiring within the next 90 days.</p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Product Name</th>
                                    <th className="px-6 py-4">Expiry Date</th>
                                    <th className="px-6 py-4 text-center">Days Remaining</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {expiredList.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No expiring products found.</td></tr>
                                ) : (
                                    expiredList.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-bold text-slate-800">{p.name}</td>
                                            <td className="px-6 py-4 font-mono text-slate-600">{p.expiryDate}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`font-bold ${p.isExpired ? 'text-red-600' : 'text-orange-500'}`}>
                                                    {p.diffDays} days
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {p.isExpired ? (
                                                    <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">Expired</span>
                                                ) : (
                                                    <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">Expiring Soon</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- WARRANTY VIEW --- */}
            {activeTab === 'warranty' && (
                <div className="animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800">Products with Warranty Coverage</h3>
                        </div>
                        <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-slate-500 font-medium border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4">Product Name</th>
                                    <th className="px-6 py-4">Category</th>
                                    <th className="px-6 py-4">Warranty Period</th>
                                    <th className="px-6 py-4 text-center">Stock</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {warrantyList.length === 0 ? (
                                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">No warranty products listed.</td></tr>
                                ) : (
                                    warrantyList.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-bold text-slate-800">{p.name}</td>
                                            <td className="px-6 py-4 text-slate-500">{p.category}</td>
                                            <td className="px-6 py-4">
                                                <span className="flex items-center gap-2 text-emerald-600 font-medium bg-emerald-50 px-3 py-1 rounded-full w-fit">
                                                    <ShieldCheck className="w-3 h-3" />
                                                    {p.warrantyPeriod || 'Standard Warranty'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center font-medium">{p.stock} {p.unit}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            )}


            {activeTab === 'stocktake' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-bold text-slate-800">Physical stock take</h3>
                            <p className="text-xs text-slate-500">Enter counted qty or import CSV. Variance posts as Stock Adjustment (decrease = FEFO).</p>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center">
                            <button
                                type="button"
                                onClick={exportStocktakeSheet}
                                className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-white"
                            >
                                Export sheet
                            </button>
                            <label className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 hover:bg-white cursor-pointer">
                                Import CSV
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="hidden"
                                    onChange={(e) => {
                                        const f = e.target.files?.[0];
                                        if (f) importStocktakeSheet(f);
                                        e.target.value = '';
                                    }}
                                />
                            </label>
                            <button
                                type="button"
                                disabled={stocktakeBusy}
                                onClick={applyStocktake}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
                            >
                                {stocktakeBusy ? 'Posting…' : 'Post variances'}
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-[28rem]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-white text-slate-500 font-medium border-b sticky top-0">
                                <tr>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3 text-center">System</th>
                                    <th className="px-4 py-3 text-center">Counted</th>
                                    <th className="px-4 py-3 text-center">Variance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {products.filter((x) => !x.isDeleted && (x as any).type !== 'Service').map((pr) => {
                                    const system = Number(pr.stock) || 0;
                                    const raw = stocktakeCounts[pr.id];
                                    const counted = raw === undefined || raw === '' ? null : Math.max(0, parseInt(raw, 10) || 0);
                                    const variance = counted === null ? null : counted - system;
                                    return (
                                        <tr key={pr.id} className={variance !== null && variance !== 0 ? 'bg-amber-50/50' : 'hover:bg-slate-50'}>
                                            <td className="px-4 py-2 font-medium text-slate-800">
                                                {pr.name}
                                                {pr.sku ? <span className="block text-[10px] text-slate-400">{pr.sku}</span> : null}
                                            </td>
                                            <td className="px-4 py-2 text-center text-slate-600">{system}</td>
                                            <td className="px-4 py-2 text-center">
                                                <input
                                                    type="number"
                                                    min={0}
                                                    className="w-24 border rounded-lg px-2 py-1 text-center text-sm font-bold"
                                                    value={raw ?? ''}
                                                    placeholder="—"
                                                    onChange={(e) =>
                                                        setStocktakeCounts((prev) => ({ ...prev, [pr.id]: e.target.value }))
                                                    }
                                                />
                                            </td>
                                            <td className={`px-4 py-2 text-center font-bold ${variance === null ? 'text-slate-300' : variance > 0 ? 'text-emerald-600' : variance < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                                {variance === null ? '—' : variance > 0 ? `+${variance}` : variance}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    {stockTakeSessions.length > 0 && (
                      <div className="p-4 border-t border-slate-100 bg-white">
                        <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">Recent stock takes</h4>
                        <div className="space-y-2 max-h-40 overflow-y-auto text-sm">
                          {stockTakeSessions.map((s) => (
                            <div key={s.id} className="flex flex-wrap justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                              <div>
                                <span className="font-bold text-slate-800">{s.date}</span>
                                <span className="text-slate-500 text-xs ml-2">{s.lines} lines</span>
                                {s.over > 0 && <span className="text-emerald-600 text-xs ml-2">+{s.over}</span>}
                                {s.under > 0 && <span className="text-red-600 text-xs ml-2">−{s.under}</span>}
                              </div>
                              <span className="text-xs font-mono text-slate-600">{formatMoney(s.value)} variance value</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
            )}

            {/* Bulk Stock Adjust Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Stock adjust</h3>
                            <button onClick={() => setShowBulkModal(false)}><X className="w-5 h-5 text-slate-400"/></button>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">{selectedItems.length} selected product(s)</p>
                        <div className="flex gap-2 mb-3">
                            <button
                              type="button"
                              onClick={() => setBulkMode('increase')}
                              className={`flex-1 py-2 rounded-lg text-sm font-bold border ${bulkMode === 'increase' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-200'}`}
                            >
                              Increase
                            </button>
                            <button
                              type="button"
                              onClick={() => setBulkMode('decrease')}
                              className={`flex-1 py-2 rounded-lg text-sm font-bold border ${bulkMode === 'decrease' ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200'}`}
                            >
                              Decrease (FEFO)
                            </button>
                        </div>
                        <input 
                            type="number" 
                            value={bulkQty || ''} 
                            onChange={e => setBulkQty(parseInt(e.target.value) || 0)} 
                            className="w-full border p-3 rounded-lg mb-3 text-lg font-medium focus:ring-2 focus:ring-indigo-500 outline-none" 
                            placeholder="Quantity" 
                            min="1"
                        />
                        {bulkMode === 'increase' && (
                          <div className="space-y-2 mb-3">
                            <input
                              type="text"
                              value={bulkLot}
                              onChange={(e) => setBulkLot(e.target.value)}
                              className="w-full border p-2 rounded-lg text-sm"
                              placeholder="Lot number (optional)"
                            />
                            <input
                              type="date"
                              value={bulkExpiry}
                              onChange={(e) => setBulkExpiry(e.target.value)}
                              className="w-full border p-2 rounded-lg text-sm"
                            />
                          </div>
                        )}
                        {bulkMode === 'decrease' && (
                          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mb-3">
                            Decrease uses FEFO — earliest expiry lots are consumed first.
                          </p>
                        )}
                        <button onClick={handleBulkUpdate} className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">
                            Confirm {bulkMode === 'decrease' ? 'decrease' : 'increase'}
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Movement Modal */}
            {editingMovement && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-xl animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                            <h3 className="font-bold text-lg text-slate-800">Edit Transaction</h3>
                            <button onClick={() => setEditingMovement(null)}><X className="w-5 h-5 text-slate-400"/></button>
                        </div>
                        <div className="mb-4">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-1">Product</p>
                            <p className="text-slate-800 font-medium">{editingMovement.productName}</p>
                        </div>
                        <div className="mb-6">
                            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Quantity</p>
                            <input 
                                type="number" 
                                value={editQty} 
                                onChange={e => setEditQty(parseInt(e.target.value))} 
                                className="w-full border p-3 rounded-lg text-xl font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-none" 
                                min="0"
                            />
                            <p className="text-xs text-center text-slate-400 mt-2">Adjusting this will update current stock levels.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setEditingMovement(null)} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-lg font-bold hover:bg-slate-50 transition-colors">
                                Cancel
                            </button>
                            <button onClick={saveMovementEdit} className="flex-1 py-3 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors">
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Transaction Detail Modal */}
            {viewTransaction && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                    Transaction Details
                                </h3>
                                <p className="text-xs text-slate-500">Ref: {viewTransaction.reference || viewTransaction.id}</p>
                            </div>
                            <button onClick={() => setViewTransaction(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Date</p>
                                    <p className="font-medium text-slate-800">{viewTransaction.date}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Type</p>
                                    <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700 mt-1">
                                        {viewTransaction.type}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Entity / User</p>
                                    <p className="font-medium text-slate-800">{viewTransaction.entityName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-500 uppercase font-bold">Total Amount</p>
                                    <p className="font-bold text-indigo-600">{formatMoney(viewTransaction.amount)}</p>
                                </div>
                            </div>

                            <h4 className="font-bold text-slate-700 text-sm mb-3 border-b border-slate-100 pb-2">Items</h4>
                            <div className="space-y-2">
                                {viewTransaction.items?.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div>
                                            <p className="text-sm font-medium text-slate-800">{item.name}</p>
                                            <p className="text-xs text-slate-500">{item.qty} x {formatMoney(item.price)}</p>
                                        </div>
                                        <p className="text-sm font-bold text-slate-700">{formatMoney(item.total)}</p>
                                    </div>
                                ))}
                                {(!viewTransaction.items || viewTransaction.items.length === 0) && (
                                    <p className="text-sm text-slate-400 italic">No items details available.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

            {activeTab === 'serials' && (
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex flex-wrap gap-3 items-center">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                ref={serialSearchRef}
                                type="search"
                                value={serialQuery}
                                onChange={(e) => setSerialQuery(e.target.value)}
                                placeholder={language === 'bn' ? 'সিরিয়াল, লট, পণ্য… (F2)' : 'Search serial, lot, product… (F2)'}
                                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
                                title={language === 'bn' ? 'F2 সার্চ · Esc ক্লিয়ার' : 'F2 search · Esc clear'}
                            />
                        </div>
                        <span className="text-xs text-slate-400">{serialRows.length} unit(s)</span>
                        <button
                            type="button"
                            className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
                            onClick={() => {
                                const esc = (v: any) => {
                                    const s = v === undefined || v === null ? '' : String(v);
                                    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
                                    return s;
                                };
                                const lines = [
                                    ['Serial', 'Lot', 'ProductId', 'Product', 'Status'].join(','),
                                    ...serialRows.map((r) =>
                                        [esc(r.serial), esc(r.lotNumber || ''), esc(r.productId), esc(r.productName), esc(r.status)].join(',')
                                    ),
                                ];
                                const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `serials-${new Date().toISOString().slice(0, 10)}.csv`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }}
                        >
                            Export CSV
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-left text-slate-500 text-xs uppercase">
                                <tr>
                                    <th className="px-4 py-3">Serial</th>
                                    <th className="px-4 py-3">Lot</th>
                                    <th className="px-4 py-3">Product</th>
                                    <th className="px-4 py-3">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {serialRows.length === 0 ? (
                                    <tr><td colSpan={4} className="px-4 py-10 text-center text-slate-400">{language === 'bn' ? 'কোনো সিরিয়াল রেকর্ড নেই — ক্রয় বা প্রোডাক্টে SN যোগ করুন' : 'No serial units recorded.'}</td></tr>
                                ) : serialRows.map((r) => (
                                    <tr key={`${r.productId}-${r.serial}`} className="hover:bg-slate-50">
                                        <td className="px-4 py-2 font-mono text-xs font-bold text-slate-800">{r.serial}</td>
                                        <td className="px-4 py-2 text-xs text-slate-600">{r.lotNumber || '—'}</td>
                                        <td className="px-4 py-2">{r.productName}</td>
                                        <td className="px-4 py-2">
                                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                r.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                                                r.status === 'sold' ? 'bg-slate-100 text-slate-600' :
                                                'bg-amber-50 text-amber-700'
                                            }`}>{r.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

};

export default StockReport;