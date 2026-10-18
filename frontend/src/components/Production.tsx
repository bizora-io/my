import React, { useState, useMemo, useEffect } from 'react';
import { authFetch } from '../lib/apiClient';
import { useSettings } from '../contexts/SettingsContext';
import { useData, RawMaterial, BillOfMaterial, ProductionBatch } from '../contexts/DataContext';
import { Factory, Hammer, Clipboard, Layers, Plus, Trash2, Edit2, Play, CheckCircle, AlertTriangle, Search, Box, ArrowRight, ChevronDown, ChevronUp, AlertCircle, X } from 'lucide-react';

const Production: React.FC = () => {
    const { t, formatMoney } = useSettings();
    const { 
        products, rawMaterials, boms, productionBatches, 
        addRawMaterial, updateRawMaterial, restockMaterial, 
        addBOM, deleteBOM, addBatch, updateBatchStatus, completeProductionBatch 
    } = useData();

    const [activeTab, setActiveTab] = useState<'materials' | 'recipes' | 'batches' | 'capacity' | 'routing' | 'variance' | 'wip' | 'scrap' | 'labor' | 'floor'>('materials');
    
    // -- Modals State --
    const [showMatModal, setShowMatModal] = useState(false);
    const [showBomModal, setShowBomModal] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [showRestockModal, setShowRestockModal] = useState<{show: boolean, id: string | null}>({show: false, id: null});

    // -- Forms State --
    const [matForm, setMatForm] = useState<Partial<RawMaterial>>({ name: '', unit: 'kg', cost: 0, stock: 0, minLevel: 10 });
    const [editingMatId, setEditingMatId] = useState<string | null>(null);

    const [restockQty, setRestockQty] = useState(0);
    const [restockCost, setRestockCost] = useState(0);

    const [bomForm, setBomForm] = useState<{productId: string, name: string, code: string, isDefault: boolean, materials: {id: string, qty: number}[]}>({ productId: '', name: '', code: '', isDefault: true, materials: [] });
    
    const [batchForm, setBatchForm] = useState<{bomId: string, qty: number, workCenterId: string, autoSchedule: boolean, expiryDate: string, shelfLifeDays: string, lotNumber: string, routeId: string}>({ bomId: '', qty: 1, workCenterId: '', autoSchedule: true, expiryDate: '', shelfLifeDays: '', lotNumber: '', routeId: '' });
    const [mrpPreview, setMrpPreview] = useState<any>(null);
    const [completeModal, setCompleteModal] = useState<{ show: boolean; batchId: string | null }>({ show: false, batchId: null });
    const [completeForm, setCompleteForm] = useState({ actualQty: 0, scrapQty: 0, laborCost: 0, notes: '', qcResult: 'pass' as string, rejectedQty: 0, scrapReason: '', expiryDate: '', lotNumber: '' });
    const [completeError, setCompleteError] = useState('');
    const [capacityData, setCapacityData] = useState<any>(null);
    const [varianceData, setVarianceData] = useState<any>(null);
    const [wipData, setWipData] = useState<any>(null);
    const [scrapData, setScrapData] = useState<any>(null);
    const [routes, setRoutes] = useState<any[]>([]);
    const [routeCompare, setRouteCompare] = useState<any>(null);
    const [compareProductId, setCompareProductId] = useState('');

    const [routeForm, setRouteForm] = useState({
        routeId: '',
        productId: '',
        name: 'Primary',
        code: 'PRIMARY',
        isDefault: true,
        steps: [{ seq: 1, name: 'Assemble', workCenterId: '', standardHours: 1 }] as any[],
    });

    const [laborEff, setLaborEff] = useState<any>(null);
    const [shopFloor, setShopFloor] = useState<any>(null);

    // -- Collapsible State --
    const [expandedBoms, setExpandedBoms] = useState<string[]>([]);

    // -- Derived Data --
    const lowStockMaterials = useMemo(() => rawMaterials.filter(m => m.stock <= m.minLevel), [rawMaterials]);

    const toggleBom = (id: string) => {
        setExpandedBoms(prev => 
            prev.includes(id) ? prev.filter(bId => bId !== id) : [...prev, id]
        );
    };

    const runMrpCheck = async (bomId: string, qty: number) => {
        if (!bomId || qty <= 0) { setMrpPreview(null); return; }
        try {
            const res = await authFetch(`/api/production/mrp?bomId=${encodeURIComponent(bomId)}&qty=${qty}`);
            if (res.ok) setMrpPreview(await res.json());
            else setMrpPreview(null);
        } catch { setMrpPreview(null); }
    };

    const openCompleteModal = (batch: any) => {
        setCompleteForm({ actualQty: batch.quantity, scrapQty: 0, laborCost: 0, notes: '', qcResult: 'pass', rejectedQty: 0, scrapReason: '', expiryDate: (batch as any).expiryDate || '', lotNumber: (batch as any).lotNumber || '' });
        setCompleteError('');
        setCompleteModal({ show: true, batchId: batch.id });
    };

    const refreshShopFloor = async () => {
        try {
            const r = await authFetch('/api/production/shop-floor');
            if (r.ok) setShopFloor(await r.json());
        } catch { /* ignore */ }
    };

    const completeOperation = async (batchId: string, seq: number, stdHoursHint?: number) => {
        try {
            const fromBatch = (productionBatches.find(b => b.id === batchId) as any)?.operations?.find((o: any) => Number(o.seq) === seq)?.standardHours;
            const std = stdHoursHint != null ? stdHoursHint : fromBatch;
            const input = window.prompt(
                `Actual hours for operation ${seq}?`,
                std != null && std !== '' ? String(std) : '1'
            );
            if (input === null) return; // cancelled
            const actualHours = parseFloat(input);
            const res = await authFetch(`/api/production/batches/${batchId}/operations/${seq}/complete`, {
                method: 'POST',
                body: JSON.stringify({
                    actualHours: Number.isFinite(actualHours) ? actualHours : 0,
                }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) {
                alert(body.error || 'Could not complete operation');
                return;
            }
            const br = await authFetch('/api/production-batches');
            if (br.ok) {
                const b = await br.json();
                window.dispatchEvent(new CustomEvent('bizora-refresh-batches', { detail: b }));
            }
            if (activeTab === 'floor') await refreshShopFloor();
            if (body.allDone) {
                if (confirm('All operations done. Open batch complete modal?')) {
                    const batch = productionBatches.find(b => b.id === batchId) || { id: batchId, quantity: 0 };
                    openCompleteModal(batch);
                }
            }
        } catch {
            alert('Operation complete failed');
        }
    };

    const loadCapacity = async () => {
        try {
            const from = new Date().toISOString().slice(0, 10);
            const toD = new Date(); toD.setDate(toD.getDate() + 13);
            const to = toD.toISOString().slice(0, 10);
            const res = await authFetch(`/api/production/capacity?from=${from}&to=${to}`);
            if (res.ok) setCapacityData(await res.json());
        } catch { /* ignore */ }
    };

    useEffect(() => {
        if (activeTab === 'capacity') loadCapacity();
        if (activeTab === 'variance') {
          authFetch('/api/production/cost-variance').then(async (r) => {
            if (r.ok) setVarianceData(await r.json());
          }).catch(() => null);
        }
        if (activeTab === 'wip') {
          authFetch('/api/production/wip').then(async (r) => {
            if (r.ok) setWipData(await r.json());
          }).catch(() => null);
        }
        if (activeTab === 'scrap') {
          authFetch('/api/production/scrap-analytics').then(async (r) => {
            if (r.ok) setScrapData(await r.json());
          }).catch(() => null);
        }
        if (activeTab === 'routing') {
          authFetch('/api/production/routes').then(async (r) => {
            if (r.ok) {
              const d = await r.json();
              setRoutes(d.routes || []);
            }
          }).catch(() => null);
        }
        if (activeTab === 'floor') {
          authFetch('/api/production/shop-floor').then(async (r) => {
            if (r.ok) setShopFloor(await r.json());
          }).catch(() => null);
        }
        if (activeTab === 'labor') {
          authFetch('/api/production/labor-efficiency').then(async (r) => {
            if (r.ok) setLaborEff(await r.json());
          }).catch(() => null);
        }
    }, [activeTab]);

    const handleCompleteBatch = async () => {
        if (!completeModal.batchId) return;
        setCompleteError('');
        try {
            // Record QC first if needed
            if (completeForm.qcResult) {
                await authFetch(`/api/production/batches/${completeModal.batchId}/qc`, {
                    method: 'POST',
                    body: JSON.stringify({
                        result: completeForm.qcResult,
                        inspectedQty: Number(completeForm.actualQty),
                        rejectedQty: Number(completeForm.rejectedQty) || Number(completeForm.scrapQty) || 0,
                        notes: completeForm.notes,
                    }),
                }).catch(() => null);
            }
            await completeProductionBatch(completeModal.batchId, {
                actualQty: Number(completeForm.actualQty),
                scrapQty: Number(completeForm.scrapQty) || Number(completeForm.rejectedQty) || 0,
                laborCost: Number(completeForm.laborCost),
                notes: completeForm.notes,
                scrapReason: completeForm.scrapReason || undefined,
                expiryDate: completeForm.expiryDate || undefined,
                lotNumber: completeForm.lotNumber || undefined,
            });
            setCompleteModal({ show: false, batchId: null });
        } catch (e: any) {
            setCompleteError(e?.message || 'Complete failed');
        }
    };

    // -- Handlers --

    // Materials
    const openAddMatModal = () => {
        setEditingMatId(null);
        setMatForm({ name: '', unit: 'kg', cost: 0, stock: 0, minLevel: 10 });
        setShowMatModal(true);
    };

    const openEditMatModal = (mat: RawMaterial) => {
        setEditingMatId(mat.id);
        setMatForm({ ...mat });
        setShowMatModal(true);
    };

    const handleSaveMaterial = () => {
        if (!matForm.name) return;
        
        if (editingMatId) {
            updateRawMaterial(editingMatId, matForm);
        } else {
            addRawMaterial({
                id: Date.now().toString(),
                ...matForm as RawMaterial
            });
        }
        
        setShowMatModal(false);
        setEditingMatId(null);
        setMatForm({ name: '', unit: 'kg', cost: 0, stock: 0, minLevel: 10 });
    };

    const handleRestock = () => {
        if (showRestockModal.id && restockQty > 0) {
            restockMaterial(showRestockModal.id, restockQty, restockCost);
            setShowRestockModal({show: false, id: null});
            setRestockQty(0);
            setRestockCost(0);
        }
    };

    // BOMs
    const handleAddBomMaterial = () => {
        setBomForm(prev => ({ ...prev, materials: [...prev.materials, { id: '', qty: 1, componentType: 'raw' }] }));
    };

    const handleUpdateBomMaterial = (index: number, field: 'id' | 'qty' | 'componentType', value: any) => {
        const newMats = [...bomForm.materials];
        newMats[index] = { ...newMats[index], [field]: value };
        setBomForm(prev => ({ ...prev, materials: newMats }));
    };

    const handleSaveBom = () => {
        const prod = products.find(p => p.id === bomForm.productId);
        if (!prod || bomForm.materials.length === 0) return;

        const mappedMats = bomForm.materials.map(m => {
            const mat = rawMaterials.find(rm => rm.id === m.id);
            const subBom = boms.find(b => b.productId === m.id);
            const forced = (m as any).componentType as string | undefined;
            if (subBom || forced === 'subassembly' || forced === 'phantom') {
                return {
                    materialId: m.id,
                    productId: m.id,
                    name: subBom?.productName || products.find(p => p.id === m.id)?.name || m.id,
                    qty: m.qty,
                    componentType: (forced === 'phantom' ? 'phantom' : forced === 'raw' ? 'raw' : 'subassembly') as 'raw' | 'subassembly' | 'phantom',
                };
            }
            return {
                materialId: m.id,
                name: mat?.name || products.find(p => p.id === m.id)?.name || 'Unknown',
                qty: m.qty,
                componentType: 'raw' as const,
            };
        });

        addBOM({
            id: Date.now().toString(),
            productId: prod.id,
            productName: prod.name,
            yield: 1,
            materials: mappedMats
        });
        setShowBomModal(false);
        setBomForm({ productId: '', materials: [] });
    };

    // Batches
    const handleCreateBatch = async () => {
        const bom = boms.find(b => b.id === batchForm.bomId);
        if (!bom || batchForm.qty <= 0) return;

        // Local top-level stock check (server uses multi-level MRP)
        const insufficient = bom.materials.some(req => {
            if (req.componentType === 'subassembly' || req.componentType === 'phantom') return false;
            const mat = rawMaterials.find(m => m.id === req.materialId);
            return (mat?.stock || 0) < (req.qty * batchForm.qty);
        });
        if (insufficient) {
            alert("Insufficient raw materials for this batch quantity.");
            return;
        }

        const localBatch = {
            id: Date.now().toString(),
            bomId: bom.id,
            productName: bom.productName,
            productId: bom.productId,
            quantity: batchForm.qty,
            status: 'Planned' as const,
            startDate: new Date().toISOString().split('T')[0],
            workCenter: batchForm.workCenterId || undefined,
            workCenterId: batchForm.workCenterId || undefined,
        };

        try {
            const res = await authFetch('/api/production/batches', {
                method: 'POST',
                body: JSON.stringify({
                    bomId: bom.id,
                    productId: bom.productId,
                    productName: bom.productName,
                    quantity: batchForm.qty,
                    workCenterId: batchForm.workCenterId || undefined,
                    autoSchedule: batchForm.autoSchedule,
                    routeId: batchForm.routeId || undefined,
                    expiryDate: batchForm.expiryDate || undefined,
                    shelfLifeDays: batchForm.shelfLifeDays ? Number(batchForm.shelfLifeDays) : undefined,
                    lotNumber: batchForm.lotNumber || undefined,
                }),
            });
            if (res.ok) {
                const body = await res.json();
                addBatch({ ...localBatch, ...(body.batch || {}) });
                if (body.scheduleNote) alert(body.scheduleNote);
            } else {
                const err = await res.json().catch(() => ({}));
                alert(err.error || 'Server create failed — saved locally');
                addBatch(localBatch);
            }
        } catch {
            addBatch(localBatch);
        }

        setShowBatchModal(false);
        setBatchForm({ bomId: '', qty: 1, workCenterId: '', autoSchedule: true, expiryDate: '', shelfLifeDays: '', lotNumber: '' });
        setMrpPreview(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-100 rounded-lg text-amber-700">
                    <Factory className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('Production Module')}</h1>
                    <p className="text-slate-500 text-sm">Manufacturing, BOMs, and Raw Material Procurement</p>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex border-b border-slate-200">
                <button onClick={() => setActiveTab('materials')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'materials' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500'}`}>
                    <Layers className="w-4 h-4" /> Raw Materials
                </button>
                <button onClick={() => setActiveTab('recipes')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'recipes' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500'}`}>
                    <Clipboard className="w-4 h-4" /> Recipes (BOM)
                </button>
                <button onClick={() => setActiveTab('batches')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'batches' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500'}`}>
                    <Hammer className="w-4 h-4" /> Production Batches
                </button>
                <button onClick={() => setActiveTab('capacity')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'capacity' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500'}`}>
                    Capacity
                </button>
                <button onClick={() => setActiveTab('routing')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'routing' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500'}`}>
                    Routing
                </button>
                <button onClick={() => setActiveTab('variance')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'variance' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500'}`}>
                    Cost variance
                </button>
                <button onClick={() => setActiveTab('wip')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'wip' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500'}`}>
                    WIP
                </button>
                <button onClick={() => setActiveTab('scrap')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'scrap' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500'}`}>
                    Scrap
                </button>
                <button onClick={() => setActiveTab('labor')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'labor' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500'}`}>
                    Labor
                </button>
                <button onClick={() => setActiveTab('floor')} className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'floor' ? 'border-amber-600 text-amber-700' : 'border-transparent text-slate-500'}`}>
                    Shop floor
                </button>
            </div>

            {/* --- MATERIALS TAB --- */}
            {activeTab === 'materials' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    
                    {lowStockMaterials.length > 0 && (
                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex items-center gap-3 text-red-700">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <div>
                                <span className="font-bold">Low Stock Alert:</span> {lowStockMaterials.length} materials are below minimum level.
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Inventory Status</h3>
                        <button onClick={openAddMatModal} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-800">
                            <Plus className="w-4 h-4" /> Add Material
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-4">Material Name</th>
                                    <th className="px-6 py-4 text-center">Stock Level</th>
                                    <th className="px-6 py-4 text-right">Unit Cost</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rawMaterials.map(mat => (
                                    <tr key={mat.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <span className="font-bold text-slate-800 block">{mat.name}</span>
                                            <span className="text-xs text-slate-400">Min: {mat.minLevel} {mat.unit}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${mat.stock <= mat.minLevel ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                                {mat.stock} {mat.unit}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium text-slate-600">
                                            {formatMoney(mat.cost)}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => openEditMatModal(mat)}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                    title="Edit Material"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => setShowRestockModal({show: true, id: mat.id})}
                                                    className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 border border-indigo-200"
                                                >
                                                    Restock
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {rawMaterials.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-slate-400">No raw materials defined.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- RECIPES TAB --- */}
            {activeTab === 'recipes' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Bill of Materials</h3>
                        <button onClick={() => setShowBomModal(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-slate-800">
                            <Plus className="w-4 h-4" /> Create Recipe
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {boms.map(bom => {
                            const isExpanded = expandedBoms.includes(bom.id);
                            return (
                                <div key={bom.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                                                <Box className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{bom.productName}</h4>
                                                <p className="text-xs text-slate-500">Yield: {bom.yield} Unit</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => toggleBom(bom.id)} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-50 transition-colors">
                                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                            </button>
                                            <button onClick={() => deleteBOM(bom.id)} className="text-slate-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {isExpanded ? (
                                        <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100 animate-in slide-in-from-top-2 fade-in duration-200">
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-2">Requires:</p>
                                            {bom.materials.map((m, i) => (
                                                <div key={i} className="flex justify-between text-sm text-slate-700 border-b border-slate-200 last:border-0 pb-1 last:pb-0">
                                                    <span>{m.name}</span>
                                                    <span className="font-bold bg-white px-2 py-0.5 rounded text-xs border border-slate-200 shadow-sm">{m.qty}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div 
                                            className="text-xs text-slate-500 mt-2 pl-1 cursor-pointer hover:text-slate-700 flex items-center gap-1" 
                                            onClick={() => toggleBom(bom.id)}
                                        >
                                            <Layers className="w-3 h-3" />
                                            {bom.name || bom.code || 'Recipe'}{bom.isDefault ? ' · Default' : ''} · {bom.materials.length} components
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* --- BATCHES TAB --- */}
            {activeTab === 'batches' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Active Batches</h3>
                        <button onClick={() => setShowBatchModal(true)} className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-amber-700 shadow-sm">
                            <Play className="w-4 h-4" /> New Production Run
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {productionBatches.map(batch => (
                            <div key={batch.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                                        batch.status === 'Completed' ? 'bg-emerald-100 text-emerald-600' :
                                        batch.status === 'In Progress' ? 'bg-blue-100 text-blue-600 animate-pulse' :
                                        'bg-slate-100 text-slate-500'
                                    }`}>
                                        {batch.quantity}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">{batch.productName}</h4>
                                        <p className="text-xs text-slate-500">Started: {batch.startDate} • ID: {batch.id.slice(-4)}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 w-full md:w-auto">
                                    <div className="flex-1 md:flex-none">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`w-2 h-2 rounded-full ${
                                                batch.status === 'Completed' ? 'bg-emerald-500' :
                                                batch.status === 'In Progress' ? 'bg-blue-500' :
                                                'bg-slate-400'
                                            }`}></span>
                                            <span className="text-sm font-bold text-slate-700">{batch.status}</span>
                                        </div>
                                    </div>

                                    {batch.status === 'Planned' && (
                                        <button onClick={() => updateBatchStatus(batch.id, 'In Progress')} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700">
                                            Start
                                        </button>
                                    )}
                                    {batch.status === 'In Progress' && (
                                        <button onClick={() => openCompleteModal(batch)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 flex items-center gap-2">
                                            <CheckCircle className="w-4 h-4" /> Complete
                                        </button>
                                    )}
                                </div>
                                {Array.isArray((batch as any).operations) && (batch as any).operations.length > 0 && (
                                    <div className="w-full mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                                        {(batch as any).operations.map((op: any) => (
                                            <button
                                                key={op.seq}
                                                type="button"
                                                disabled={op.status === 'Done'}
                                                onClick={() => completeOperation(batch.id, op.seq)}
                                                className={`text-[11px] font-bold px-2 py-1 rounded-lg border ${
                                                    op.status === 'Done'
                                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                                                        : 'bg-white border-slate-200 text-slate-700 hover:border-amber-400'
                                                }`}
                                            >
                                                {op.seq}. {op.name} {op.status === 'Done' ? `✓ ${op.actualHours != null ? op.actualHours + 'h' : ''}` : `○ ${op.standardHours ? op.standardHours + 'h std' : ''}`}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            
            {activeTab === 'scrap' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <h3 className="font-bold text-slate-800">Scrap analytics</h3>
                        <div className="flex gap-2">
                        <button type="button" className="text-sm font-bold text-slate-700 border border-slate-200 px-3 py-1 rounded-lg"
                            onClick={() => {
                              if (!scrapData) return;
                              const esc = (v: any) => {
                                const s = v == null ? '' : String(v);
                                return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                              };
                              const lines: string[] = [];
                              lines.push('Section,Key,ScrapQty,GoodQty,Batches,ScrapRate');
                              lines.push(['Summary','total', scrapData.summary?.totalScrap, scrapData.summary?.totalGood, scrapData.summary?.batchesWithScrap, scrapData.summary?.scrapRate].map(esc).join(','));
                              for (const r of scrapData.byReason || []) {
                                lines.push(['Reason', r.reason, r.scrapQty, '', r.batches, ''].map(esc).join(','));
                              }
                              for (const r of scrapData.byProduct || []) {
                                lines.push(['Product', r.productName || r.productId, r.scrapQty, r.goodQty, r.batches, r.scrapRate].map(esc).join(','));
                              }
                              for (const r of scrapData.byWorkCenter || []) {
                                lines.push(['WorkCenter', r.workCenterId, r.scrapQty, '', r.batches, ''].map(esc).join(','));
                              }
                              lines.push('');
                              lines.push('Date,Product,Reason,Qty,WorkCenter,BatchId');
                              for (const r of scrapData.recent || []) {
                                lines.push([r.endDate, r.productName, r.scrapReason, r.scrapQty, r.workCenterId, r.id].map(esc).join(','));
                              }
                              const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `scrap-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                            disabled={!scrapData}>
                            Export CSV
                        </button>
                        <button type="button" className="text-sm font-bold text-amber-700 border border-amber-200 px-3 py-1 rounded-lg"
                            onClick={() => authFetch('/api/production/scrap-analytics').then(async r => { if (r.ok) setScrapData(await r.json()); })}>
                            Refresh
                        </button>
                        </div>
                    </div>
                    {scrapData?.summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                                ['Scrap qty', scrapData.summary.totalScrap, 'text-rose-600'],
                                ['Good qty', scrapData.summary.totalGood, 'text-emerald-700'],
                                ['Scrap rate', `${((scrapData.summary.scrapRate || 0) * 100).toFixed(1)}%`, 'text-amber-700'],
                                ['Batches w/ scrap', scrapData.summary.batchesWithScrap, 'text-slate-700'],
                            ].map(([label, val, color]) => (
                                <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-3">
                                    <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
                                    <p className={`text-2xl font-black ${color}`}>{val as any}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 bg-slate-50 text-xs font-black uppercase text-slate-500">By reason</div>
                            <table className="w-full text-sm">
                                <thead className="text-[10px] uppercase text-slate-400"><tr>
                                    <th className="text-left px-3 py-2">Reason</th>
                                    <th className="text-right px-3 py-2">Qty</th>
                                    <th className="text-right px-3 py-2">Batches</th>
                                </tr></thead>
                                <tbody className="divide-y">
                                    {(scrapData?.byReason || []).map((r: any) => (
                                        <tr key={r.reason}>
                                            <td className="px-3 py-2 font-semibold">{r.reason}</td>
                                            <td className="px-3 py-2 text-right text-rose-600 font-bold">{r.scrapQty}</td>
                                            <td className="px-3 py-2 text-right">{r.batches}</td>
                                        </tr>
                                    ))}
                                    {!(scrapData?.byReason || []).length && (
                                        <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400">No scrap recorded</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 bg-slate-50 text-xs font-black uppercase text-slate-500">By product</div>
                            <table className="w-full text-sm">
                                <thead className="text-[10px] uppercase text-slate-400"><tr>
                                    <th className="text-left px-3 py-2">Product</th>
                                    <th className="text-right px-3 py-2">Scrap</th>
                                    <th className="text-right px-3 py-2">Rate</th>
                                </tr></thead>
                                <tbody className="divide-y">
                                    {(scrapData?.byProduct || []).slice(0, 15).map((r: any) => (
                                        <tr key={r.productId}>
                                            <td className="px-3 py-2 font-semibold">{r.productName}</td>
                                            <td className="px-3 py-2 text-right text-rose-600 font-bold">{r.scrapQty}</td>
                                            <td className="px-3 py-2 text-right">{(r.scrapRate * 100).toFixed(1)}%</td>
                                        </tr>
                                    ))}
                                    {!(scrapData?.byProduct || []).length && (
                                        <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400">No data</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-2 bg-slate-50 text-xs font-black uppercase text-slate-500">Recent scrap batches</div>
                        <table className="w-full text-sm">
                            <thead className="text-[10px] uppercase text-slate-400"><tr>
                                <th className="text-left px-3 py-2">Date</th>
                                <th className="text-left px-3 py-2">Product</th>
                                <th className="text-left px-3 py-2">Reason</th>
                                <th className="text-right px-3 py-2">Qty</th>
                            </tr></thead>
                            <tbody className="divide-y">
                                {(scrapData?.recent || []).map((r: any) => (
                                    <tr key={r.id}>
                                        <td className="px-3 py-2 text-slate-500">{r.endDate || '—'}</td>
                                        <td className="px-3 py-2 font-semibold">{r.productName}</td>
                                        <td className="px-3 py-2">{r.scrapReason}</td>
                                        <td className="px-3 py-2 text-right font-bold text-rose-600">{r.scrapQty}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            {activeTab === 'labor' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <h3 className="font-bold text-slate-800">Labor efficiency</h3>
                        <div className="flex gap-2">
                        <button type="button" className="text-sm font-bold text-slate-700 border border-slate-200 px-3 py-1 rounded-lg"
                            disabled={!laborEff}
                            onClick={() => {
                              if (!laborEff) return;
                              const esc = (v: any) => {
                                const s = v == null ? '' : String(v);
                                return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
                              };
                              const lines: string[] = [];
                              lines.push('Section,Key,StandardHours,ActualHours,Variance,Efficiency');
                              const s = laborEff.summary || {};
                              lines.push(['Summary','total', s.totalStandardHours, s.totalActualHours, s.hoursVariance, s.efficiency].map(esc).join(','));
                              for (const r of laborEff.byWorkCenter || []) {
                                lines.push(['WorkCenter', r.workCenterId, r.standardHours, r.actualHours, (r.actualHours||0)-(r.standardHours||0), r.efficiency].map(esc).join(','));
                              }
                              for (const r of laborEff.byProduct || []) {
                                lines.push(['Product', r.productName || r.productId, r.standardHours, r.actualHours, (r.actualHours||0)-(r.standardHours||0), r.efficiency].map(esc).join(','));
                              }
                              lines.push('');
                              lines.push('Product,Op,Std,Act,Variance,PctOver,Date');
                              for (const r of laborEff.slowOperations || []) {
                                lines.push([r.productName, r.name, r.standardHours, r.actualHours, r.variance, r.pctOver, r.endDate].map(esc).join(','));
                              }
                              const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `labor-efficiency-${new Date().toISOString().slice(0, 10)}.csv`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}>
                            Export CSV
                        </button>
                        <button type="button" className="text-sm font-bold text-amber-700 border border-amber-200 px-3 py-1 rounded-lg"
                            onClick={() => authFetch('/api/production/labor-efficiency').then(async r => { if (r.ok) setLaborEff(await r.json()); })}>
                            Refresh
                        </button>
                        </div>
                    </div>
                    {laborEff?.summary && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                            {[
                                ['Std hours', laborEff.summary.totalStandardHours],
                                ['Actual hours', laborEff.summary.totalActualHours],
                                ['Variance', laborEff.summary.hoursVariance],
                                ['Efficiency', laborEff.summary.efficiency != null ? `${(laborEff.summary.efficiency * 100).toFixed(1)}%` : '—'],
                            ].map(([label, val]) => (
                                <div key={String(label)} className="bg-white border border-slate-200 rounded-xl p-3">
                                    <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
                                    <p className="text-2xl font-black text-slate-800">{val as any}</p>
                                </div>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-slate-500">Efficiency = standard ÷ actual (100% = on standard). Ops ≥20% over standard listed below.</p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 bg-slate-50 text-xs font-black uppercase text-slate-500">By work center</div>
                            <table className="w-full text-sm">
                                <thead className="text-[10px] uppercase text-slate-400"><tr>
                                    <th className="text-left px-3 py-2">Center</th>
                                    <th className="text-right px-3 py-2">Act h</th>
                                    <th className="text-right px-3 py-2">Eff %</th>
                                </tr></thead>
                                <tbody className="divide-y">
                                    {(laborEff?.byWorkCenter || []).map((r: any) => (
                                        <tr key={r.workCenterId}>
                                            <td className="px-3 py-2 font-semibold">{r.workCenterId}</td>
                                            <td className="px-3 py-2 text-right">{Number(r.actualHours).toFixed(1)}</td>
                                            <td className="px-3 py-2 text-right">{r.efficiency != null ? (r.efficiency * 100).toFixed(0) : '—'}%</td>
                                        </tr>
                                    ))}
                                    {!(laborEff?.byWorkCenter || []).length && (
                                        <tr><td colSpan={3} className="px-3 py-6 text-center text-slate-400">No booked hours yet</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 bg-slate-50 text-xs font-black uppercase text-slate-500">Slow operations (≥20% over)</div>
                            <table className="w-full text-sm">
                                <thead className="text-[10px] uppercase text-slate-400"><tr>
                                    <th className="text-left px-3 py-2">Op</th>
                                    <th className="text-right px-3 py-2">Std</th>
                                    <th className="text-right px-3 py-2">Act</th>
                                    <th className="text-right px-3 py-2">Over</th>
                                </tr></thead>
                                <tbody className="divide-y">
                                    {(laborEff?.slowOperations || []).map((r: any, i: number) => (
                                        <tr key={i}>
                                            <td className="px-3 py-2">
                                                <span className="font-semibold">{r.name}</span>
                                                <span className="block text-[10px] text-slate-400">{r.productName}</span>
                                            </td>
                                            <td className="px-3 py-2 text-right">{r.standardHours}</td>
                                            <td className="px-3 py-2 text-right font-bold">{r.actualHours}</td>
                                            <td className="px-3 py-2 text-right text-rose-600">+{(r.pctOver * 100).toFixed(0)}%</td>
                                        </tr>
                                    ))}
                                    {!(laborEff?.slowOperations || []).length && (
                                        <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">None</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}


            {activeTab === 'routing' && (
                <div className="space-y-4">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                        <h4 className="text-xs font-black uppercase text-slate-500">Compare routes</h4>
                        <div className="flex flex-wrap gap-2 items-end">
                            <div className="flex-1 min-w-[180px]">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Product</label>
                                <select className="w-full border p-2 rounded text-sm bg-white" value={compareProductId}
                                    onChange={e => setCompareProductId(e.target.value)}>
                                    <option value="">Select product…</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <button type="button" className="text-sm font-bold bg-indigo-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                                disabled={!compareProductId}
                                onClick={async () => {
                                    const res = await authFetch(`/api/production/route-compare?productId=${encodeURIComponent(compareProductId)}`);
                                    if (res.ok) setRouteCompare(await res.json());
                                    else setRouteCompare(null);
                                }}>
                                Compare
                            </button>
                        </div>
                        {routeCompare && (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-[10px] uppercase text-slate-400 border-b">
                                        <tr>
                                            <th className="text-left py-2 pr-2">Route</th>
                                            <th className="text-right py-2 px-2">Steps</th>
                                            <th className="text-right py-2 px-2">Std hours</th>
                                            <th className="text-right py-2 px-2">Δ hours</th>
                                            <th className="text-right py-2 px-2">QC</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {(routeCompare.routes || []).map((r: any) => (
                                            <tr key={r.id} className={r.isDefault ? 'bg-emerald-50/50' : ''}>
                                                <td className="py-2 pr-2 font-semibold">
                                                    {r.name}
                                                    {r.isDefault && <span className="ml-1 text-[9px] uppercase font-black text-emerald-700">default</span>}
                                                    <span className="block text-[10px] text-slate-400 font-normal">{r.code || r.id.slice(-6)}</span>
                                                </td>
                                                <td className="text-right py-2 px-2">{r.stepCount}</td>
                                                <td className="text-right py-2 px-2 font-bold">{r.totalStandardHours}</td>
                                                <td className={`text-right py-2 px-2 font-bold ${r.hoursDeltaVsDefault > 0 ? 'text-rose-600' : r.hoursDeltaVsDefault < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    {r.isDefault ? '—' : (r.hoursDeltaVsDefault > 0 ? '+' : '') + r.hoursDeltaVsDefault}
                                                </td>
                                                <td className="text-right py-2 px-2">{r.qcSteps}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {!(routeCompare.routes || []).length && (
                                    <p className="text-sm text-slate-400 py-4 text-center">No routes for this product</p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <h3 className="font-bold text-slate-800">Production routes</h3>
                        <button type="button" className="text-sm font-bold bg-slate-900 text-white px-3 py-1.5 rounded-lg"
                            onClick={() => setRouteForm({
                                routeId: '',
                                productId: products[0]?.id || '',
                                name: 'Alternate',
                                code: 'ALT',
                                isDefault: false,
                                steps: [{ seq: 1, name: 'Step 1', workCenterId: '', standardHours: 1 }],
                            })}>
                            + New route
                        </button>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                            <h4 className="text-xs font-black uppercase text-slate-500">Edit route</h4>
                            <select className="w-full border p-2 rounded text-sm" value={routeForm.productId}
                                onChange={e => setRouteForm({ ...routeForm, productId: e.target.value })}>
                                <option value="">Product…</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <div className="grid grid-cols-2 gap-2">
                                <input className="border p-2 rounded text-sm" placeholder="Name" value={routeForm.name}
                                    onChange={e => setRouteForm({ ...routeForm, name: e.target.value })} />
                                <input className="border p-2 rounded text-sm" placeholder="Code" value={routeForm.code}
                                    onChange={e => setRouteForm({ ...routeForm, code: e.target.value })} />
                            </div>
                            <label className="flex items-center gap-2 text-xs font-semibold">
                                <input type="checkbox" checked={routeForm.isDefault}
                                    onChange={e => setRouteForm({ ...routeForm, isDefault: e.target.checked })} />
                                Default route for product
                            </label>
                            <div className="space-y-2">
                                {routeForm.steps.map((s, i) => (
                                    <div key={i} className="flex gap-1 items-center">
                                        <span className="text-[10px] text-slate-400 w-4">{s.seq || i+1}</span>
                                        <input className="flex-1 border p-1 rounded text-sm" value={s.name}
                                            onChange={e => {
                                                const steps = [...routeForm.steps];
                                                steps[i] = { ...steps[i], name: e.target.value };
                                                setRouteForm({ ...routeForm, steps });
                                            }} />
                                        <input type="number" className="w-16 border p-1 rounded text-sm" title="Std hours" value={s.standardHours}
                                            onChange={e => {
                                                const steps = [...routeForm.steps];
                                                steps[i] = { ...steps[i], standardHours: parseFloat(e.target.value) || 0 };
                                                setRouteForm({ ...routeForm, steps });
                                            }} />
                                        <button type="button" className="text-rose-500 text-xs" onClick={() => setRouteForm({
                                            ...routeForm,
                                            steps: routeForm.steps.filter((_, j) => j !== i),
                                        })}>×</button>
                                    </div>
                                ))}
                                <button type="button" className="text-xs font-bold text-indigo-600"
                                    onClick={() => setRouteForm({
                                        ...routeForm,
                                        steps: [...routeForm.steps, { seq: routeForm.steps.length + 1, name: `Step ${routeForm.steps.length + 1}`, workCenterId: '', standardHours: 1 }],
                                    })}>+ Step</button>
                            </div>
                            <button type="button" className="w-full bg-amber-600 text-white py-2 rounded-lg font-bold"
                                onClick={async () => {
                                    if (!routeForm.productId || !routeForm.steps.length) return;
                                    const body = {
                                        productId: routeForm.productId,
                                        productName: products.find(p => p.id === routeForm.productId)?.name,
                                        name: routeForm.name,
                                        code: routeForm.code,
                                        isDefault: routeForm.isDefault,
                                        steps: routeForm.steps.map((s, i) => ({ ...s, seq: i + 1 })),
                                    };
                                    const url = routeForm.routeId
                                        ? `/api/production/routes/${routeForm.routeId}`
                                        : (routeForm.isDefault ? `/api/production/routes/${routeForm.productId}` : '/api/production/routes');
                                    const method = routeForm.routeId || routeForm.isDefault ? 'PUT' : 'POST';
                                    const res = await authFetch(url, { method, body: JSON.stringify(body) });
                                    if (!res.ok) {
                                        const e = await res.json().catch(() => ({}));
                                        alert(e.error || 'Save failed');
                                        return;
                                    }
                                    const list = await authFetch('/api/production/routes');
                                    if (list.ok) setRoutes((await list.json()).routes || []);
                                    alert('Route saved');
                                }}>
                                Save route
                            </button>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                            <div className="px-4 py-2 bg-slate-50 text-xs font-black uppercase text-slate-500">Saved routes</div>
                            <div className="divide-y max-h-96 overflow-y-auto">
                                {routes.map(r => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50"
                                        onClick={() => setRouteForm({
                                            routeId: r.id,
                                            productId: r.productId,
                                            name: r.name || '',
                                            code: r.code || '',
                                            isDefault: !!r.isDefault || r.id === r.productId,
                                            steps: Array.isArray(r.steps) && r.steps.length
                                              ? r.steps
                                              : [{ seq: 1, name: 'Step 1', workCenterId: '', standardHours: 1 }],
                                        })}
                                    >
                                        <span className="font-bold text-slate-800">{r.name || r.code || r.id}</span>
                                        {r.isDefault && <span className="ml-2 text-[10px] font-black uppercase bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Default</span>}
                                        <span className="block text-xs text-slate-500">{r.productName || r.productId} · {(r.steps || []).length} steps</span>
                                    </button>
                                ))}
                                {!routes.length && <p className="p-6 text-center text-slate-400 text-sm">No routes yet</p>}
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {activeTab === 'floor' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                        <div>
                            <h3 className="font-bold text-slate-800">Shop floor board</h3>
                            <p className="text-xs text-slate-500">Open jobs by work center · next operation · today load</p>
                        </div>
                        <button type="button" className="text-sm font-bold text-amber-700 border border-amber-200 px-3 py-1 rounded-lg"
                            onClick={() => authFetch('/api/production/shop-floor').then(async r => { if (r.ok) setShopFloor(await r.json()); })}>
                            Refresh
                        </button>
                    </div>
                    <p className="text-sm text-slate-600">
                        Open batches: <span className="font-black">{shopFloor?.openBatches ?? '—'}</span>
                        {shopFloor?.asOf && <span className="text-slate-400"> · as of {shopFloor.asOf}</span>}
                    </p>
                    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {(shopFloor?.centers || []).map((c: any) => (
                            <div key={c.workCenterId} className={`bg-white border rounded-xl overflow-hidden ${c.utilization > 1 ? 'border-rose-300' : c.utilization > 0.85 ? 'border-amber-300' : 'border-slate-200'}`}>
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex justify-between items-start">
                                    <div>
                                        <h4 className="font-bold text-slate-800">{c.workCenterName}</h4>
                                        <p className="text-[10px] text-slate-400 font-mono">{c.workCenterId}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-black ${c.utilization > 1 ? 'text-rose-600' : c.utilization > 0.85 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {c.capacityPerDay ? `${Math.round(c.utilization * 100)}%` : '—'}
                                        </p>
                                        <p className="text-[10px] text-slate-400">
                                            load {Number(c.todayLoad).toFixed(1)} / {c.capacityPerDay || '—'}
                                        </p>
                                    </div>
                                </div>
                                <div className="divide-y max-h-72 overflow-y-auto">
                                    {c.jobs.map((j: any) => (
                                        <div key={j.batchId} className="px-3 py-2 text-sm">
                                            <div className="flex justify-between gap-2">
                                                <span className="font-semibold text-slate-800 line-clamp-1">{j.productName}</span>
                                                <span className={`text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${j.status === 'In Progress' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {j.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                qty {j.quantity}
                                                {j.opsTotal > 0 && ` · ops ${j.opsDone}/${j.opsTotal}`}
                                                {j.ageDays > 0 && ` · ${j.ageDays}d`}
                                                {j.qcHold && <span className="text-amber-600 font-bold"> · QC</span>}
                                            </p>
                                            {j.status === 'Planned' && (
                                                <div className="mt-1.5 flex items-center justify-between gap-2">
                                                    <p className="text-xs text-slate-500">
                                                        {j.nextOp
                                                          ? `Queued: ${j.nextOp.seq}. ${j.nextOp.name}`
                                                          : 'Planned — not started'}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        className="shrink-0 text-[10px] font-black uppercase bg-blue-600 text-white px-2 py-1 rounded-md hover:bg-blue-700"
                                                        onClick={async () => {
                                                            try {
                                                                updateBatchStatus(j.batchId, 'In Progress');
                                                                await refreshShopFloor();
                                                            } catch {
                                                                alert('Could not start batch');
                                                            }
                                                        }}
                                                    >
                                                        Start
                                                    </button>
                                                </div>
                                            )}
                                            {j.status !== 'Planned' && j.nextOp && (
                                                <div className="mt-1.5 flex items-center justify-between gap-2">
                                                    <p className="text-xs text-indigo-700 font-semibold">
                                                        Next: {j.nextOp.seq}. {j.nextOp.name}
                                                        {j.nextOp.standardHours ? ` (${j.nextOp.standardHours}h)` : ''}
                                                    </p>
                                                    <button
                                                        type="button"
                                                        className="shrink-0 text-[10px] font-black uppercase bg-indigo-600 text-white px-2 py-1 rounded-md hover:bg-indigo-700"
                                                        onClick={() => completeOperation(j.batchId, j.nextOp.seq, j.nextOp.standardHours)}
                                                    >
                                                        Done
                                                    </button>
                                                </div>
                                            )}
                                            {j.status !== 'Planned' && !j.nextOp && (
                                                <div className="mt-1.5 flex items-center justify-between gap-2">
                                                    <p className="text-xs text-emerald-600">All ops done</p>
                                                    <button
                                                        type="button"
                                                        className="shrink-0 text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-1 rounded-md hover:bg-emerald-700"
                                                        onClick={() => {
                                                            const batch = productionBatches.find(b => b.id === j.batchId) || {
                                                                id: j.batchId,
                                                                quantity: j.quantity,
                                                                productName: j.productName,
                                                            };
                                                            openCompleteModal(batch as any);
                                                        }}
                                                    >
                                                        Complete batch
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {!c.jobs.length && (
                                        <p className="px-3 py-6 text-center text-slate-400 text-sm">No open jobs</p>
                                    )}
                                </div>
                            </div>
                        ))}
                        {!(shopFloor?.centers || []).length && (
                            <p className="text-slate-400 col-span-full text-center py-8">No work centers or open batches</p>
                        )}
                    </div>
                </div>
            )}

{/* --- MODALS --- */}

            
            {/* Complete Production Modal */}
            {completeModal.show && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Complete production batch</h3>
                            <button type="button" onClick={() => setCompleteModal({ show: false, batchId: null })}><X className="w-5 h-5 text-slate-400"/></button>
                        </div>
                        {completeError && <p className="text-sm text-rose-600 font-semibold mb-2">{completeError}</p>}
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Good qty (FG)</label>
                                    <input type="number" className="w-full border p-2 rounded" value={completeForm.actualQty}
                                        onChange={e => setCompleteForm({ ...completeForm, actualQty: Number(e.target.value) })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Scrap qty</label>
                                    <input type="number" className="w-full border p-2 rounded" value={completeForm.scrapQty}
                                        onChange={e => setCompleteForm({ ...completeForm, scrapQty: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Lot number</label>
                                    <input className="w-full border p-2 rounded" value={completeForm.lotNumber}
                                        onChange={e => setCompleteForm({ ...completeForm, lotNumber: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Expiry date</label>
                                    <input type="date" className="w-full border p-2 rounded" value={completeForm.expiryDate}
                                        onChange={e => setCompleteForm({ ...completeForm, expiryDate: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Scrap reason</label>
                                <select className="w-full border p-2 rounded" value={completeForm.scrapReason}
                                    onChange={e => setCompleteForm({ ...completeForm, scrapReason: e.target.value })}>
                                    <option value="">— optional —</option>
                                    <option value="DEFECT">Manufacturing defect</option>
                                    <option value="MATERIAL">Bad raw material</option>
                                    <option value="SETUP">Setup / trial run</option>
                                    <option value="DAMAGE">Handling damage</option>
                                    <option value="QC_REJECT">QC rejection</option>
                                    <option value="OTHER">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Labor cost</label>
                                <input type="number" className="w-full border p-2 rounded" value={completeForm.laborCost}
                                    onChange={e => setCompleteForm({ ...completeForm, laborCost: Number(e.target.value) })} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">QC result</label>
                                    <select className="w-full border p-2 rounded" value={completeForm.qcResult}
                                        onChange={e => setCompleteForm({ ...completeForm, qcResult: e.target.value })}>
                                        <option value="pass">Pass</option>
                                        <option value="fail">Fail</option>
                                        <option value="hold">Hold</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">QC rejected qty</label>
                                    <input type="number" className="w-full border p-2 rounded" value={completeForm.rejectedQty}
                                        onChange={e => setCompleteForm({ ...completeForm, rejectedQty: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Notes</label>
                                <input className="w-full border p-2 rounded" value={completeForm.notes}
                                    onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })} />
                            </div>
                            <p className="text-[11px] text-slate-400">Materials consumed for max(planned, good+scrap). Shortage returns an error from the server.</p>
                            <button type="button" onClick={handleCompleteBatch} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-bold">
                                Complete &amp; post stock
                            </button>
                        </div>
                    </div>
                </div>
            )}

{/* Add/Edit Material Modal */}
            {showMatModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">{editingMatId ? 'Edit Raw Material' : 'Add Raw Material'}</h3>
                            <button onClick={() => setShowMatModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
                                <input className="w-full border p-2 rounded" placeholder="Material Name" value={matForm.name} onChange={e => setMatForm({...matForm, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Unit</label>
                                    <input className="w-full border p-2 rounded" placeholder="Unit (e.g. kg)" value={matForm.unit} onChange={e => setMatForm({...matForm, unit: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Cost / Unit</label>
                                    <input type="number" className="w-full border p-2 rounded" placeholder="Cost" value={matForm.cost || ''} onChange={e => setMatForm({...matForm, cost: parseFloat(e.target.value)})} />
                                </div>
                            </div>
                            
                            {!editingMatId && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Initial Stock</label>
                                    <input type="number" className="w-full border p-2 rounded" placeholder="Initial Stock" value={matForm.stock || ''} onChange={e => setMatForm({...matForm, stock: parseFloat(e.target.value)})} />
                                </div>
                            )}
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Min Level (Alert Trigger)</label>
                                <input type="number" className="w-full border p-2 rounded" placeholder="Alert Level" value={matForm.minLevel || ''} onChange={e => setMatForm({...matForm, minLevel: parseFloat(e.target.value)})} />
                            </div>
                            <button onClick={handleSaveMaterial} className="w-full bg-slate-900 text-white py-2 rounded font-bold mt-2">{editingMatId ? 'Save Changes' : 'Save Material'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Restock Modal */}
            {showRestockModal.show && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Restock Material</h3>
                            <button onClick={() => setShowRestockModal({show: false, id: null})}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-slate-500">Quantity to Add</label>
                                <input type="number" className="w-full border p-2 rounded" value={restockQty} onChange={e => setRestockQty(parseFloat(e.target.value))} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Total Cost</label>
                                <input type="number" className="w-full border p-2 rounded" value={restockCost} onChange={e => setRestockCost(parseFloat(e.target.value))} />
                            </div>
                            <button onClick={handleRestock} className="w-full bg-emerald-600 text-white py-2 rounded font-bold mt-2">Confirm Purchase</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create BOM Modal */}
            {showBomModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 animate-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Create Recipe (BOM)</h3>
                            <button onClick={() => setShowBomModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Select Finished Product</label>
                                <select 
                                    className="w-full border p-2 rounded bg-white"
                                    value={bomForm.productId}
                                    onChange={e => setBomForm({...bomForm, productId: e.target.value})}
                                >
                                    <option value="">Select Product...</option>
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Recipe name</label>
                                    <input className="w-full border p-2 rounded" placeholder="Primary / Alt-A" value={bomForm.name}
                                        onChange={e => setBomForm({...bomForm, name: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Code</label>
                                    <input className="w-full border p-2 rounded" placeholder="PRIMARY" value={bomForm.code}
                                        onChange={e => setBomForm({...bomForm, code: e.target.value})} />
                                </div>
                            </div>
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 mt-2">
                                <input type="checkbox" checked={bomForm.isDefault}
                                    onChange={e => setBomForm({...bomForm, isDefault: e.target.checked})} />
                                Default recipe for this product
                            </label>

                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2">Required Materials</label>
                                {bomForm.materials.map((m, i) => (
                                    <div key={i} className="flex flex-wrap gap-2 mb-2 items-center">
                                        <select 
                                            className="flex-1 min-w-[140px] border p-1 rounded bg-white text-sm"
                                            value={m.id}
                                            onChange={e => handleUpdateBomMaterial(i, 'id', e.target.value)}
                                        >
                                            <option value="">Select component...</option>
                                            <optgroup label="Raw materials">
                                              {rawMaterials.map(rm => <option key={rm.id} value={rm.id}>{rm.name} ({rm.unit})</option>)}
                                            </optgroup>
                                            <optgroup label="Products with BOM">
                                              {products.filter(p => boms.some(b => b.productId === p.id)).map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                              ))}
                                            </optgroup>
                                        </select>
                                        <input 
                                            type="number" 
                                            className="w-20 border p-1 rounded text-sm"
                                            placeholder="Qty"
                                            value={m.qty}
                                            onChange={e => handleUpdateBomMaterial(i, 'qty', parseFloat(e.target.value))}
                                        />
                                        <select
                                            className="border p-1 rounded bg-white text-xs font-semibold"
                                            value={(m as any).componentType || (boms.some(b => b.productId === m.id) ? 'subassembly' : 'raw')}
                                            onChange={e => handleUpdateBomMaterial(i, 'componentType', e.target.value)}
                                            title="Component type"
                                        >
                                            <option value="raw">Raw</option>
                                            <option value="subassembly">Sub-assembly</option>
                                            <option value="phantom">Phantom</option>
                                        </select>
                                    </div>
                                ))}
                                <button onClick={handleAddBomMaterial} className="text-xs text-indigo-600 font-bold hover:underline">+ Add Material Line</button>
                            </div>

                            <button onClick={handleSaveBom} className="w-full bg-slate-900 text-white py-2 rounded font-bold mt-2">Save Recipe</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Batch Modal */}
            {showBatchModal && (
                <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg">Start Production</h3>
                            <button onClick={() => setShowBatchModal(false)}><X className="w-5 h-5 text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Select Recipe</label>
                                <select 
                                    className="w-full border p-2 rounded bg-white"
                                    value={batchForm.bomId}
                                    onChange={e => setBatchForm({...batchForm, bomId: e.target.value})}
                                >
                                    <option value="">Select Recipe...</option>
                                    {boms.map(b => <option key={b.id} value={b.id}>{b.productName}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Quantity to Produce</label>
                                <input 
                                    type="number" 
                                    className="w-full border p-2 rounded"
                                    value={batchForm.qty}
                                    onChange={e => setBatchForm({...batchForm, qty: parseFloat(e.target.value)})}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Work center ID</label>
                                <input className="w-full border p-2 rounded" placeholder="optional — enables auto-schedule"
                                    value={batchForm.workCenterId}
                                    onChange={e => setBatchForm({...batchForm, workCenterId: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Route (optional)</label>
                                <select className="w-full border p-2 rounded bg-white" value={batchForm.routeId}
                                    onChange={e => setBatchForm({...batchForm, routeId: e.target.value})}>
                                    <option value="">Default for product</option>
                                    {routes
                                      .filter(r => {
                                        const bom = boms.find(b => b.id === batchForm.bomId);
                                        return bom && r.productId === bom.productId;
                                      })
                                      .map(r => (
                                        <option key={r.id} value={r.id}>
                                          {r.name || r.code || r.id}{r.isDefault ? ' (default)' : ''}
                                        </option>
                                      ))}
                                </select>
                            </div>
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                                <input type="checkbox" checked={batchForm.autoSchedule}
                                    onChange={e => setBatchForm({...batchForm, autoSchedule: e.target.checked})} />
                                Auto-schedule start date from capacity
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Lot number</label>
                                    <input className="w-full border p-2 rounded" placeholder="optional" value={batchForm.lotNumber}
                                        onChange={e => setBatchForm({...batchForm, lotNumber: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-1">Shelf life (days)</label>
                                    <input type="number" className="w-full border p-2 rounded" placeholder="e.g. 90" value={batchForm.shelfLifeDays}
                                        onChange={e => setBatchForm({...batchForm, shelfLifeDays: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-1">Expiry date</label>
                                <input type="date" className="w-full border p-2 rounded" value={batchForm.expiryDate}
                                    onChange={e => setBatchForm({...batchForm, expiryDate: e.target.value})} />
                                <p className="text-[10px] text-slate-400 mt-1">Or set shelf life days — expiry = start/complete + days</p>
                            </div>
                            <button onClick={handleCreateBatch} className="w-full bg-amber-600 text-white py-2 rounded font-bold mt-2 hover:bg-amber-700">Check Materials & Start</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Production;