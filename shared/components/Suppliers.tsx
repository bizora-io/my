import React, { useState, useMemo } from 'react';
import { useData, Entity, GlobalSupplier, LedgerEntry } from '../contexts/DataContext';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    Search, Plus, Filter, Download, MoreHorizontal, 
    User, Phone, Mail, MapPin, Star, Trash2, Edit, X, Check, 
    ChevronRight, CreditCard, Clock, Activity, FileText, CheckCircle2,
    DollarSign, Building2, Globe, FileSpreadsheet, ShieldAlert, AlertTriangle,
    Wallet, Briefcase, ArrowUpRight, Landmark, ArrowRight, CornerDownRight, ExternalLink
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getOpenSupplierPurchases, allocateFifo, AllocationLine } from '../lib/supplierPaymentAllocation';

const Suppliers: React.FC = () => {
    const { 
        suppliers, 
        globalSuppliers, 
        transactions, 
        financialAccounts,
        registerSupplier, 
        updateSupplierProfile, 
        updateEntity,
        addTransaction,
        deleteItem,
        logAction, updateTransaction } = useData();
    const { t, formatMoney, currencySymbol } = useSettings();
    const { user } = useAuth();

    // User permissions & role
    const isSaaSAllPowerful = user?.role === 'SAAS_OWNER';
    const isOwner = user?.role === 'OWNER' || isSaaSAllPowerful;
    
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    
    // Modal & active operations
    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [registerStep, setRegisterStep] = useState(1);
    
    // Form States
    const [regMobile, setRegMobile] = useState('');
    const [regName, setRegName] = useState('');
    const [regCompany, setRegCompany] = useState('');
    const [mobileCheckResult, setMobileCheckResult] = useState<'new' | 'existing' | null>(null);
    const [existingGlobalProfile, setExistingGlobalProfile] = useState<GlobalSupplier | null>(null);

    // Remaining Form States
    const [regEmail, setRegEmail] = useState('');
    const [regContactPerson, setRegContactPerson] = useState('');
    const [regTradeLicense, setRegTradeLicense] = useState('');
    const [regBinVat, setRegBinVat] = useState('');
    const [regNid, setRegNid] = useState('');
    const [regAddress, setRegAddress] = useState('');
    const [regCity, setRegCity] = useState('');
    const [regDistrict, setRegDistrict] = useState('');
    const [regCountry, setRegCountry] = useState('Bangladesh');
    const [regWebsite, setRegWebsite] = useState('');
    const [regNotes, setRegNotes] = useState('');

    // Bank Details
    const [regBankName, setRegBankName] = useState('');
    const [regBankAccountName, setRegBankAccountName] = useState('');
    const [regBankAccountNo, setRegBankAccountNo] = useState('');
    const [regBankRouting, setRegBankRouting] = useState('');
    const [regBankBranch, setRegBankBranch] = useState('');

    // Mobile Banking
    const [regBkash, setRegBkash] = useState('');
    const [regRocket, setRegRocket] = useState('');
    const [regNagad, setRegNagad] = useState('');

    // Local / Business-wise Terms
    const [localCode, setLocalCode] = useState('');
    const [localOpeningBalance, setLocalOpeningBalance] = useState('0');
    const [localCreditLimit, setLocalCreditLimit] = useState('100000');
    const [localPaymentTerms, setLocalPaymentTerms] = useState('Net 30');
    const [localNotes, setLocalNotes] = useState('');

    // Viewing Supplier State
    const [viewingSupplierId, setViewingSupplierId] = useState<string | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    
    // Quick Record Payment State
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [payAllocations, setPayAllocations] = useState<AllocationLine[]>([]);
    const [payUseFifo, setPayUseFifo] = useState(true);
    const [payAmount, setPayAmount] = useState('');
    const [payAccountId, setPayAccountId] = useState('');
    const [payReference, setPayReference] = useState('');
    const [payNotes, setPayNotes] = useState('');

    // --- Derived Data for UI ---
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(s => {
            if (s.isDeleted) return false;
            const matchesSearch = 
                s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.mobile?.includes(searchTerm) ||
                s.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                s.supplierCode?.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesStatus = 
                statusFilter === 'All' || 
                (statusFilter === 'Active' && s.status !== 'Inactive') ||
                (statusFilter === 'Inactive' && s.status === 'Inactive');

            return matchesSearch && matchesStatus;
        });
    }, [suppliers, searchTerm, statusFilter]);

    const activeSupplier = useMemo(() => {
        if (!viewingSupplierId) return null;
        return suppliers.find(s => s.id === viewingSupplierId) || null;
    }, [suppliers, viewingSupplierId]);

    const activeGlobalSupplier = useMemo(() => {
        if (!activeSupplier) return null;
        return globalSuppliers.find(gs => gs.mobile === activeSupplier.mobile) || null;
    }, [globalSuppliers, activeSupplier]);

    const activeSupplierLedger = useMemo(() => {
        if (!activeSupplier) return [];
        // Filter transactions related to this supplier by mobile, ID or Name
        return transactions.filter(t => 
            !t.isDeleted && 
            (t.entityMobile === activeSupplier.mobile || t.entityName === activeSupplier.name)
        );
    }, [transactions, activeSupplier]);

    // Handle Mobile Checking
    const handleVerifyMobile = () => {
        const cleanMobile = regMobile.trim();
        if (!cleanMobile) {
            alert('Please enter a valid mobile number.');
            return;
        }

        const match = globalSuppliers.find(gs => gs.mobile === cleanMobile);
        if (match) {
            setMobileCheckResult('existing');
            setExistingGlobalProfile(match);
            // Autofill Step 2 details from existing global supplier profile
            setRegName(match.name);
            setRegCompany(match.companyName || '');
            setRegEmail(match.email || '');
            setRegContactPerson(match.contactPerson || '');
            setRegTradeLicense(match.tradeLicense || '');
            setRegBinVat(match.binVat || '');
            setRegNid(match.nid || '');
            setRegAddress(match.address || '');
            setRegCity(match.city || '');
            setRegDistrict(match.district || '');
            setRegCountry(match.country || 'Bangladesh');
            setRegWebsite(match.website || '');
            setRegNotes(match.notes || '');

            setRegBankName(match.bankDetails?.bankName || '');
            setRegBankAccountName(match.bankDetails?.accountName || '');
            setRegBankAccountNo(match.bankDetails?.accountNumber || '');
            setRegBankRouting(match.bankDetails?.routingNumber || '');
            setRegBankBranch(match.bankDetails?.branchName || '');

            setRegBkash(match.mobileBankingDetails?.bKash || '');
            setRegRocket(match.mobileBankingDetails?.Rocket || '');
            setRegNagad(match.mobileBankingDetails?.Nagad || '');
        } else {
            setMobileCheckResult('new');
            setExistingGlobalProfile(null);
        }
        setRegisterStep(2);
    };

    // Handle Registering
    const handleRegisterSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!regName.trim() || !regMobile.trim()) {
            alert('Supplier Name and Mobile Number are required.');
            return;
        }

        const globalData = {
            mobile: regMobile.trim(),
            name: regName.trim(),
            companyName: regCompany.trim(),
            contactPerson: regContactPerson.trim(),
            email: regEmail.trim(),
            tradeLicense: regTradeLicense.trim(),
            binVat: regBinVat.trim(),
            nid: regNid.trim(),
            address: regAddress.trim(),
            city: regCity.trim(),
            district: regDistrict.trim(),
            country: regCountry.trim(),
            website: regWebsite.trim(),
            notes: regNotes.trim(),
            bankDetails: {
                bankName: regBankName.trim(),
                accountName: regBankAccountName.trim(),
                accountNumber: regBankAccountNo.trim(),
                routingNumber: regBankRouting.trim(),
                branchName: regBankBranch.trim()
            },
            mobileBankingDetails: {
                bKash: regBkash.trim(),
                Rocket: regRocket.trim(),
                Nagad: regNagad.trim()
            }
        };

        const businessData = {
            supplierCode: localCode.trim() || `SUP-${Math.floor(1000 + Math.random() * 9000)}`,
            openingBalance: Number(localOpeningBalance) || 0,
            creditLimit: Number(localCreditLimit) || 100000,
            paymentTerms: localPaymentTerms,
            notes: localNotes.trim(),
            currentDue: Number(localOpeningBalance) || 0,
            totalPurchase: 0,
            totalPaid: 0
        };

        registerSupplier(globalData, businessData);

        // Reset state
        setShowRegisterModal(false);
        setRegisterStep(1);
        setRegMobile('');
        setRegName('');
        setRegCompany('');
        setMobileCheckResult(null);
        setExistingGlobalProfile(null);
        setRegEmail('');
        setRegContactPerson('');
        setRegTradeLicense('');
        setRegBinVat('');
        setRegNid('');
        setRegAddress('');
        setRegCity('');
        setRegDistrict('');
        setRegCountry('Bangladesh');
        setRegWebsite('');
        setRegNotes('');
        setRegBankName('');
        setRegBankAccountName('');
        setRegBankAccountNo('');
        setRegBankRouting('');
        setRegBankBranch('');
        setRegBkash('');
        setRegRocket('');
        setRegNagad('');
        setLocalCode('');
        setLocalOpeningBalance('0');
        setLocalCreditLimit('100000');
        setLocalPaymentTerms('Net 30');
        setLocalNotes('');
    };

    const downloadLedgerPDF = () => {
        if (!activeSupplier) return;
        const doc = new jsPDF();
        doc.text(`Ledger Statement: ${activeSupplier.name}`, 14, 15);
        doc.setFontSize(10);
        doc.text(`Supplier: ${activeSupplier.name} (${activeSupplier.mobile})`, 14, 22);
        doc.text(`Company: ${activeSupplier.company || 'N/A'}`, 14, 27);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 32);

        const tableData = activeSupplierLedger.map(t => [
            t.date,
            t.type,
            t.reference,
            formatMoney(t.amount)
        ]);

        autoTable(doc, {
            head: [['Date', 'Type', 'Reference', 'Amount']],
            body: tableData,
            startY: 40,
        });
        
        doc.save(`Ledger_${activeSupplier.name.replace(/\s+/g, '_')}.pdf`);
    };

    // Open Payment Modal
    const openPaymentModal = () => {
        if (!activeSupplier) return;
        setPayAmount('');
        setPayNotes('');
        setPayReference(`PAY-SUP-${Date.now().toString().slice(-4)}`);
        setPayUseFifo(true);
        setPayAllocations([]);
        
        const defaultAcc = financialAccounts.find(a => a.isDefault) || financialAccounts[0];
        setPayAccountId(defaultAcc ? defaultAcc.id : '');
        setShowPaymentModal(true);
    };

    const openPurchasesForSupplier = activeSupplier
        ? getOpenSupplierPurchases(transactions, {
            id: activeSupplier.id,
            name: activeSupplier.name,
            mobile: activeSupplier.mobile,
          })
        : [];

    // Record Payment
    const handleRecordPayment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeSupplier || !payAmount || Number(payAmount) <= 0) {
            alert('Please specify a valid payment amount.');
            return;
        }

        const amountToPay = Number(payAmount);
        const selectedAccount = financialAccounts.find(a => a.id === payAccountId);

        if (!selectedAccount) {
            alert('Please select a valid financial account.');
            return;
        }

        if (selectedAccount.balance < amountToPay) {
            const confirmAnyway = window.confirm(`Selected account balance (${formatMoney(selectedAccount.balance)}) is less than the payment amount (${formatMoney(amountToPay)}). Do you want to proceed?`);
            if (!confirmAnyway) return;
        }

        // Allocate against open purchases (FIFO or selected lines)
        const open = getOpenSupplierPurchases(transactions, {
            id: activeSupplier.id,
            name: activeSupplier.name,
            mobile: activeSupplier.mobile,
        });
        let lines: AllocationLine[] = payUseFifo
            ? allocateFifo(open, amountToPay)
            : payAllocations.filter(l => l.amount > 0);
        const allocatedSum = lines.reduce((s, l) => s + l.amount, 0);
        if (!payUseFifo && Math.abs(allocatedSum - amountToPay) > 0.05) {
            if (!window.confirm(`Allocated ${allocatedSum.toFixed(2)} differs from payment ${amountToPay.toFixed(2)}. Continue?`)) return;
        }

        // Apply allocations: reduce dueAmount on each purchase
        lines.forEach(line => {
            const purchase = transactions.find(t => t.id === line.purchaseId);
            if (!purchase) return;
            const prevDue = Number(purchase.dueAmount) || (
                purchase.paymentMethod === 'Due'
                    ? Math.max(0, Number(purchase.amount) - (Number(purchase.amountPaid) || 0))
                    : 0
            );
            const newDue = Math.max(0, Math.round((prevDue - line.amount) * 100) / 100);
            const newPaid = Math.round(((Number(purchase.amountPaid) || 0) + line.amount) * 100) / 100;
            updateTransaction(line.purchaseId, {
                dueAmount: newDue,
                amountPaid: newPaid,
                paymentMethod: newDue <= 0.009 ? (purchase.paymentMethod === 'Due' ? 'Cash' : purchase.paymentMethod) : purchase.paymentMethod,
            } as any);
        });

        // 1. Create a transaction of type 'Supplier Payment'
        const tx: LedgerEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString().split('T')[0],
            entityId: activeSupplier.id,
            entityName: activeSupplier.name,
            entityMobile: activeSupplier.mobile,
            type: 'Supplier Payment',
            amount: amountToPay,
            paymentMethod: 'Cash',
            accountId: payAccountId,
            reference: payReference || `PAY-${Date.now().toString().slice(-4)}`,
            notes: payNotes,
            details: {
                subtotal: amountToPay,
                tax: 0,
                discount: 0,
                delivery: 0,
                allocations: lines,
            } as any,
        };

        addTransaction(tx);
        setShowPaymentModal(false);
        logAction('Supplier', 'Record Payment', `Paid ${formatMoney(amountToPay)} to supplier: ${activeSupplier.name} (${lines.length} allocation(s))`);
    };

    // Handle Secure Deletion
    const handleConfirmDelete = () => {
        if (!activeSupplier) return;
        
        // 1. Delete from local business entities
        deleteItem('entity', activeSupplier.id);
        
        // 2. Delete from global registry if it exists
        const raw = localStorage.getItem('bizora_global_supplier_registry');
        if (raw) {
            try {
                let list = JSON.parse(raw);
                // We use mobile as the unique identifier in the global registry
                list = list.filter((s: any) => s.mobile !== activeSupplier.mobile);
                localStorage.setItem('bizora_global_supplier_registry', JSON.stringify(list));
            } catch (e) {
                console.error("Error updating global registry during deletion:", e);
            }
        }
        
        logAction('Delete Supplier', 'Supplier', `Deleted supplier ${activeSupplier.name} and removed from global registry`);
        setViewingSupplierId(null);
        setShowDeleteConfirm(false);
    };

    return (
        <div className="space-y-6 max-w-full overflow-hidden">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full min-w-0">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                        <Briefcase className="w-6 h-6 text-indigo-600" />
                        Supplier Registry
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Enterprise global supplier database with single-profile registration and consolidated business linkings.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => { setShowRegisterModal(true); setRegisterStep(1); }}
                        className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-600/10 text-sm"
                    >
                        <Plus className="w-4 h-4" /> Register Supplier
                    </button>
                </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Connected Suppliers</p>
                        <p className="text-2xl font-black text-slate-800">{filteredSuppliers.length}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-red-50 text-red-600 rounded-xl">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Current Outstanding Due</p>
                        <p className="text-2xl font-black text-red-600">
                            {formatMoney(filteredSuppliers.reduce((acc, curr) => acc + (curr.currentDue || 0), 0))}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Purchases (M-to-D)</p>
                        <p className="text-2xl font-black text-slate-800">
                            {formatMoney(filteredSuppliers.reduce((acc, curr) => acc + (curr.totalPurchase || 0), 0))}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Star className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Global Database Registry Pool</p>
                        <p className="text-2xl font-black text-slate-800">{globalSuppliers.length}</p>
                    </div>
                </div>
            </div>

            {/* Main Registry Explorer Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left Side: Supplier Explorer List */}
                <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden ${activeSupplier ? 'lg:col-span-5' : 'lg:col-span-12'}`}>
                    
                    {/* Search & Filtering Panel */}
                    <div className="p-4 border-b border-slate-100 space-y-3">
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="flex-1 relative">
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input 
                                    type="text" 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search by ID, name, company or mobile..."
                                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-slate-800 font-medium placeholder:text-slate-400"
                                />
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="All">All Status</option>
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* List Items */}
                    <div className="divide-y divide-slate-50 max-h-[600px] overflow-y-auto custom-scrollbar">
                        {filteredSuppliers.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <Building2 className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                                <p className="font-bold text-slate-500">No linked suppliers found</p>
                                <p className="text-xs text-slate-400 mt-1">Register a new supplier or adjust search filters.</p>
                            </div>
                        ) : (
                            filteredSuppliers.map(s => {
                                const isViewing = viewingSupplierId === s.id;
                                return (
                                    <div 
                                        key={s.id}
                                        onClick={() => setViewingSupplierId(s.id)}
                                        className={`p-4 flex justify-between items-center cursor-pointer transition-all duration-200 ${isViewing ? 'bg-indigo-50/50 border-l-4 border-indigo-600 pl-3 shadow-inner' : 'hover:bg-slate-100 hover:shadow-sm'}`}
                                    >
                                        <div className="min-w-0 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 font-bold shrink-0">
                                                {s.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h3 className="font-bold text-slate-800 text-sm truncate cursor-pointer">{s.name}</h3>
                                                    <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded uppercase">
                                                        {s.supplierCode}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-slate-500 truncate font-semibold cursor-pointer">{s.company || 'Private Supplier'}</p>
                                                <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                    <Phone className="w-3 h-3 shrink-0" /> {s.mobile}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0 flex flex-col items-end">
                                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Outstanding Due</p>
                                            <p className={`text-sm font-black ${s.currentDue && s.currentDue > 0 ? 'text-red-500' : 'text-slate-700'}`}>
                                                {formatMoney(s.currentDue || 0)}
                                            </p>
                                            <div className="mt-1 flex items-center justify-end gap-2">
                                                <div className="flex items-center gap-1.5">
                                                    <span className={`w-2 h-2 rounded-full ${s.status === 'Inactive' ? 'bg-slate-300' : 'bg-emerald-500'}`}></span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">{s.status || 'Active'}</span>
                                                </div>
                                                {isSaaSAllPowerful && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setViewingSupplierId(s.id);
                                                            setShowDeleteConfirm(true);
                                                        }}
                                                        className="p-1 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="Delete Supplier Profile"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Right Side: Detailed Profile, Financial Analytics & Ledger */}
                {activeSupplier && (
                    <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col">
                        
                        {/* Profile Header */}
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-indigo-600/10">
                                    {activeSupplier.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h2 className="text-lg font-black text-slate-800 tracking-tight">{activeSupplier.name}</h2>
                                        <span className="text-xs font-mono bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md uppercase font-bold">
                                            {activeSupplier.supplierCode}
                                        </span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-500">{activeSupplier.company || 'Private Global Profile'}</p>
                                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                            <Phone className="w-3.5 h-3.5" /> {activeSupplier.mobile}
                                        </span>
                                        {activeSupplier.email && (
                                            <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                                <Mail className="w-3.5 h-3.5" /> {activeSupplier.email}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Actions bar inside Detail view */}
                            <div className="flex gap-2 shrink-0">
                                {isSaaSAllPowerful && (
                                    <button 
                                        onClick={() => setShowEditModal(true)}
                                        className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-200 transition-colors"
                                    >
                                        <Edit className="w-3.5 h-3.5" /> Edit
                                    </button>
                                )}
                                {isSaaSAllPowerful && (
                                    <button 
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-red-100 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                    </button>
                                )}
                                <button 
                                    onClick={openPaymentModal}
                                    className="bg-slate-950 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-900 transition-colors"
                                >
                                    <Wallet className="w-3.5 h-3.5" /> Record Payment
                                </button>
                                <button 
                                    onClick={() => setViewingSupplierId(null)}
                                    className="p-2 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Detailed Metrics Panel */}
                        <div className="grid grid-cols-3 gap-px bg-slate-100 border-b border-slate-100">
                            <div className="bg-white p-4 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Purchases</p>
                                <p className="text-lg font-black text-slate-800 mt-0.5">{formatMoney(activeSupplier.totalPurchase || 0)}</p>
                            </div>
                            <div className="bg-white p-4 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Payments Paid</p>
                                <p className="text-lg font-black text-slate-800 mt-0.5">{formatMoney(activeSupplier.totalPaid || 0)}</p>
                            </div>
                            <div className="bg-white p-4 text-center">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Balance Due</p>
                                <p className="text-lg font-black text-red-500 mt-0.5">{formatMoney(activeSupplier.currentDue || 0)}</p>
                            </div>
                        </div>

                        {/* Section tabs/Accordion of details */}
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[450px] custom-scrollbar flex-1">
                            
                            {/* Section: Global Identity Registry Fields */}
                            <div>
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-2 mb-4 flex items-center gap-1.5">
                                    <Globe className="w-4 h-4" /> Global Database Registry Profile
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">Global ID (Mobile)</span>
                                        <span className="font-bold text-slate-800 font-mono">{activeSupplier.mobile}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">Contact Person</span>
                                        <span className="font-bold text-slate-800">{activeGlobalSupplier?.contactPerson || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">Trade License</span>
                                        <span className="font-bold text-slate-800 font-mono">{activeGlobalSupplier?.tradeLicense || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">BIN / VAT Number</span>
                                        <span className="font-bold text-slate-800 font-mono">{activeGlobalSupplier?.binVat || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">National ID (NID)</span>
                                        <span className="font-bold text-slate-800 font-mono">{activeGlobalSupplier?.nid || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">Website</span>
                                        <span className="font-bold text-slate-800 flex items-center gap-1">
                                            {activeGlobalSupplier?.website ? (
                                                <a href={activeGlobalSupplier.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline flex items-center gap-0.5">
                                                    Visit <ExternalLink className="w-3 h-3" />
                                                </a>
                                            ) : 'N/A'}
                                        </span>
                                    </div>
                                    <div className="sm:col-span-2 flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">Full Address</span>
                                        <span className="font-bold text-slate-800 text-right">
                                            {activeGlobalSupplier?.address ? `${activeGlobalSupplier.address}, ${activeGlobalSupplier.city || ''}, ${activeGlobalSupplier.district || ''}, ${activeGlobalSupplier.country || ''}` : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Connected Businesses Panel for SaaS Owner */}
                            {isSaaSAllPowerful && activeGlobalSupplier && (
                                <div>
                                    <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-2 mb-3 flex items-center gap-1.5">
                                        <Briefcase className="w-4 h-4" /> Connected SaaS Businesses ({activeGlobalSupplier.businesses?.length || 0})
                                    </h4>
                                    <div className="bg-slate-50 rounded-xl p-3 divide-y divide-slate-100">
                                        {(!activeGlobalSupplier.businesses || activeGlobalSupplier.businesses.length === 0) ? (
                                            <p className="text-xs text-slate-500 italic">No connected businesses registered globally.</p>
                                        ) : (
                                            activeGlobalSupplier.businesses.map((b, idx) => (
                                                <div key={idx} className="py-2 flex justify-between items-center text-xs font-semibold">
                                                    <span className="text-slate-700 flex items-center gap-1.5">
                                                        <CornerDownRight className="w-3.5 h-3.5 text-slate-400" /> {b.businessName}
                                                    </span>
                                                    <span className="text-slate-400">Connected: {new Date(b.connectedAt).toLocaleDateString()}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Section: Banking & Settlement details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                
                                {/* Bank Accounts */}
                                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                    <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Landmark className="w-4 h-4 text-indigo-600" /> Bank Settlement Details
                                    </h5>
                                    {activeGlobalSupplier?.bankDetails?.bankName ? (
                                        <div className="space-y-1.5 text-xs font-bold text-slate-700">
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Bank Name</p>
                                            <p className="text-slate-900">{activeGlobalSupplier.bankDetails.bankName}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-2">Account Name</p>
                                            <p className="text-slate-900">{activeGlobalSupplier.bankDetails.accountName}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-2">Account Number</p>
                                            <p className="text-slate-900 font-mono">{activeGlobalSupplier.bankDetails.accountNumber}</p>
                                            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-2">Routing & Branch</p>
                                            <p className="text-slate-900">{activeGlobalSupplier.bankDetails.routingNumber} | {activeGlobalSupplier.bankDetails.branchName}</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-slate-400 italic">No bank accounts registered globally.</p>
                                    )}
                                </div>

                                {/* Mobile Banking accounts */}
                                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100">
                                    <h5 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                        <Phone className="w-4 h-4 text-pink-600" /> Mobile Wallets
                                    </h5>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                            <span className="font-extrabold text-pink-600">bKash</span>
                                            <span className="font-mono text-slate-800 font-bold">{activeGlobalSupplier?.mobileBankingDetails?.bKash || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                            <span className="font-extrabold text-indigo-700">Rocket</span>
                                            <span className="font-mono text-slate-800 font-bold">{activeGlobalSupplier?.mobileBankingDetails?.Rocket || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100">
                                            <span className="font-extrabold text-orange-600">Nagad</span>
                                            <span className="font-mono text-slate-800 font-bold">{activeGlobalSupplier?.mobileBankingDetails?.Nagad || 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Business-specific Contractual Terms */}
                            <div>
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-2 mb-4 flex items-center justify-between gap-1.5">
                                    <div className='flex items-center gap-1.5'>
                                        <CreditCard className="w-4 h-4" /> Local Contractual Terms (Own Business)
                                    </div>
                                    <button 
                                        onClick={openPaymentModal}
                                        className="bg-indigo-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-indigo-700"
                                    >
                                        Quick Pay
                                    </button>
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">Business Credit Limit</span>
                                        <span className="font-bold text-slate-800">{formatMoney(activeSupplier.creditLimit || 0)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">Payment Terms</span>
                                        <span className="font-bold text-slate-800">{activeSupplier.paymentTerms || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">Opening Balance</span>
                                        <span className="font-bold text-slate-800">{formatMoney(activeSupplier.openingBalance || 0)}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">Last Purchase Date</span>
                                        <span className="font-bold text-slate-800 font-mono">{activeSupplier.lastPurchaseDate || 'Never'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">Last Payment Date</span>
                                        <span className="font-bold text-slate-800 font-mono">{activeSupplier.lastPaymentDate || 'Never'}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-slate-50 pb-1.5">
                                        <span className="text-slate-400 font-medium">Contract Notes</span>
                                        <span className="font-bold text-slate-800 truncate max-w-[150px]">{activeSupplier.notes || 'None'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Transaction Ledger (Double Entry Sync) */}
                            <div>
                                <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-100 pb-2 mb-3 flex items-center justify-between gap-1.5">
                                    <div className='flex items-center gap-1.5'>
                                        <FileSpreadsheet className="w-4 h-4" /> Live Supplier Ledger Account
                                    </div>
                                    <button 
                                        onClick={downloadLedgerPDF}
                                        className="flex items-center gap-1 text-[10px] bg-white border border-indigo-200 px-2 py-1 rounded hover:bg-indigo-50"
                                    >
                                        <Download className="w-3 h-3" /> PDF
                                    </button>
                                </h4>
                                {activeSupplierLedger.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl text-center">No purchases or payments recorded for this supplier.</p>
                                ) : (
                                    <div className="bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 divide-y divide-slate-100">
                                        {activeSupplierLedger.map((ledgerItem, idx) => (
                                            <div key={idx} className="p-3 flex justify-between items-center text-xs font-semibold">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide ${ledgerItem.type === 'Purchase' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {ledgerItem.type}
                                                        </span>
                                                        <span className="font-bold text-slate-700 font-mono">{ledgerItem.reference}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 mt-1">Date: {ledgerItem.date} | Account: Cashbox</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-black ${ledgerItem.type === 'Purchase' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                                        {ledgerItem.type === 'Purchase' ? '+' : '-'}{formatMoney(ledgerItem.amount)}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">{ledgerItem.paymentMethod}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                        </div>

                    </div>
                )}

            </div>

            {showEditModal && activeSupplier && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                        <h3 className="font-black text-slate-800 text-base">Edit Supplier: {activeSupplier.name}</h3>
                        <button onClick={() => setShowEditModal(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-5 h-5" /></button>
                    </div>
                    <form 
                        onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const globalData = {
                                name: formData.get('name') as string,
                                companyName: formData.get('companyName') as string,
                                email: formData.get('email') as string,
                                contactPerson: formData.get('contactPerson') as string,
                                tradeLicense: formData.get('tradeLicense') as string,
                                binVat: formData.get('binVat') as string,
                                nid: formData.get('nid') as string,
                                city: formData.get('city') as string,
                                district: formData.get('district') as string,
                                country: formData.get('country') as string,
                                address: formData.get('address') as string,
                            };
                            updateSupplierProfile(activeSupplier.mobile, globalData);
                            // Also update local status
                            updateEntity(activeSupplier.id, { 
                                ...activeSupplier, 
                                status: formData.get('status') as string,
                                name: globalData.name,
                                company: globalData.companyName 
                            });
                            setShowEditModal(false);
                        }}
                        className="p-6 space-y-4 overflow-y-auto"
                    >
                                <div className='grid grid-cols-2 gap-4'>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Name</label>
                                <input name="name" defaultValue={activeSupplier.name} className="w-full border rounded-xl p-2" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Company</label>
                                <input name="companyName" defaultValue={activeSupplier.company} className="w-full border rounded-xl p-2" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Email</label>
                                <input name="email" defaultValue={activeSupplier.email} className="w-full border rounded-xl p-2" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Contact Person</label>
                                <input name="contactPerson" defaultValue={activeGlobalSupplier?.contactPerson || ''} className="w-full border rounded-xl p-2" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Trade License</label>
                                <input name="tradeLicense" defaultValue={activeGlobalSupplier?.tradeLicense || ''} className="w-full border rounded-xl p-2" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">BIN/VAT</label>
                                <input name="binVat" defaultValue={activeGlobalSupplier?.binVat || ''} className="w-full border rounded-xl p-2" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">NID</label>
                                <input name="nid" defaultValue={activeGlobalSupplier?.nid || ''} className="w-full border rounded-xl p-2" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">City</label>
                                <input name="city" defaultValue={activeGlobalSupplier?.city || ''} className="w-full border rounded-xl p-2" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">District</label>
                                <input name="district" defaultValue={activeGlobalSupplier?.district || ''} className="w-full border rounded-xl p-2" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Country</label>
                                <input name="country" defaultValue={activeGlobalSupplier?.country || ''} className="w-full border rounded-xl p-2" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500">Status</label>
                                <select name="status" defaultValue={activeSupplier.status || 'Active'} className="w-full border rounded-xl p-2">
                                    <option value="Active">Active</option>
                                    <option value="Inactive">Inactive</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500">Address</label>
                            <input name="address" defaultValue={activeSupplier.address} className="w-full border rounded-xl p-2" />
                        </div>
                        <div className="pt-4 flex justify-end gap-2">
                            <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-slate-100 rounded-xl font-bold text-sm">Cancel</button>

                        {openPurchasesForSupplier.length > 0 && (
                            <div className="space-y-2 border border-slate-100 rounded-xl p-3 bg-slate-50">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-600 uppercase">Allocate to purchases</p>
                                    <label className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                                        <input type="checkbox" checked={payUseFifo} onChange={e => {
                                            setPayUseFifo(e.target.checked);
                                            if (e.target.checked && payAmount) {
                                                setPayAllocations(allocateFifo(openPurchasesForSupplier, Number(payAmount) || 0));
                                            }
                                        }} /> FIFO auto
                                    </label>
                                </div>
                                <div className="max-h-36 overflow-y-auto space-y-1">
                                    {openPurchasesForSupplier.map(p => {
                                        const line = payAllocations.find(l => l.purchaseId === p.id);
                                        const fifoPreview = payUseFifo && payAmount
                                            ? (allocateFifo(openPurchasesForSupplier, Number(payAmount) || 0).find(l => l.purchaseId === p.id)?.amount || 0)
                                            : 0;
                                        return (
                                            <div key={p.id} className="flex items-center justify-between gap-2 text-xs">
                                                <div className="min-w-0">
                                                    <p className="font-semibold text-slate-700 truncate">{p.reference || p.id}</p>
                                                    <p className="text-[10px] text-slate-400">{p.date} · due {formatMoney(p.dueAmount)}</p>
                                                </div>
                                                {payUseFifo ? (
                                                    <span className="text-emerald-700 font-bold shrink-0">{fifoPreview > 0 ? formatMoney(fifoPreview) : '—'}</span>
                                                ) : (
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={p.dueAmount}
                                                        step="0.01"
                                                        className="w-24 border rounded px-1 py-0.5 text-right"
                                                        value={line?.amount ?? ''}
                                                        onChange={e => {
                                                            const val = parseFloat(e.target.value) || 0;
                                                            setPayAllocations(prev => {
                                                                const rest = prev.filter(l => l.purchaseId !== p.id);
                                                                return val > 0 ? [...rest, { purchaseId: p.id, amount: Math.min(val, p.dueAmount) }] : rest;
                                                            });
                                                        }}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm">Save Changes</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* REGISTER SUPPLIER STEP-BY-STEP MODAL */}
            {showRegisterModal && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        
                        {/* Header */}
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-slate-800 text-base flex items-center gap-2">
                                    <Briefcase className="w-5 h-5 text-indigo-600" />
                                    Register Global Supplier
                                </h3>
                                <p className="text-xs text-slate-400 font-medium">Verify global existence first to prevent duplicates.</p>
                            </div>
                            <button 
                                onClick={() => setShowRegisterModal(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body / Scrollable Form */}
                        <form onSubmit={handleRegisterSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                            
                            {/* STEP 1: Global Unique Verification */}
                            {registerStep === 1 && (
                                <div className="space-y-4 max-w-md mx-auto py-6">
                                    <div className="text-center">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <ShieldAlert className="w-6 h-6" />
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm">Step 1: Unique Mobile Number Verification</h4>
                                        <p className="text-xs text-slate-400 mt-1">One Mobile Number matches one Global Supplier globally across the entire SaaS. Multiple businesses can link to this same profile.</p>
                                    </div>
                                    <div className="space-y-3 pt-4">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Mobile Number (Global Unique ID) *</label>
                                            <input 
                                                type="tel"
                                                required
                                                value={regMobile}
                                                onChange={(e) => setRegMobile(e.target.value)}
                                                placeholder="Enter mobile number"
                                                className="w-full px-3 py-3 border border-slate-200 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                                            />
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleVerifyMobile}
                                            disabled={!regMobile.trim()}
                                            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm disabled:opacity-50"
                                        >
                                            Next & Verify Existence <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* STEP 2: Profile Fields */}
                            {registerStep === 2 && (
                                <div className="space-y-6">
                                    
                                    {/* Existence Feedback Banner */}
                                    {mobileCheckResult === 'existing' ? (
                                        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-amber-800">Duplicate Prevention: Profile Already Exists Globally</p>
                                                <p className="text-[11px] text-amber-700/90 mt-0.5">
                                                    We found a registered profile for <strong className="font-black">{existingGlobalProfile?.name}</strong> matching this number. We will link this global profile to your business and create local terms without duplicating registry records.
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                                            <div>
                                                <p className="text-xs font-bold text-emerald-800">New Global Supplier Profile</p>
                                                <p className="text-[11px] text-emerald-700/90 mt-0.5">
                                                    Mobile number is unique! A new global supplier registry profile will be constructed across the system.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Section 1: Global Identity Details */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1.5">
                                            1. Global Supplier Profile Details
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Supplier Name *</label>
                                                <input 
                                                    type="text"
                                                    required
                                                    value={regName}
                                                    onChange={(e) => setRegName(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="Supplier Name / Corporate Title"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Company Name</label>
                                                <input 
                                                    type="text"
                                                    value={regCompany}
                                                    onChange={(e) => setRegCompany(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="Optional"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Contact Person Name</label>
                                                <input 
                                                    type="text"
                                                    value={regContactPerson}
                                                    onChange={(e) => setRegContactPerson(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="Liaison officer"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Email Address</label>
                                                <input 
                                                    type="email"
                                                    value={regEmail}
                                                    onChange={(e) => setRegEmail(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="Corporate email"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Trade License Number</label>
                                                <input 
                                                    type="text"
                                                    value={regTradeLicense}
                                                    onChange={(e) => setRegTradeLicense(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="Required for commercial audits"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">BIN / VAT Registration</label>
                                                <input 
                                                    type="text"
                                                    value={regBinVat}
                                                    onChange={(e) => setRegBinVat(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="Tax certificate number"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">National ID (NID)</label>
                                                <input 
                                                    type="text"
                                                    value={regNid}
                                                    onChange={(e) => setRegNid(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="Sole proprietor NID"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Website URL</label>
                                                <input 
                                                    type="url"
                                                    value={regWebsite}
                                                    onChange={(e) => setRegWebsite(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="e.g. https://domain.com"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div className="sm:col-span-2">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Full Corporate Address</label>
                                                <input 
                                                    type="text"
                                                    value={regAddress}
                                                    onChange={(e) => setRegAddress(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="Street details, holding number, area name"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">City</label>
                                                <input 
                                                    type="text"
                                                    value={regCity}
                                                    onChange={(e) => setRegCity(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">District</label>
                                                <input 
                                                    type="text"
                                                    value={regDistrict}
                                                    onChange={(e) => setRegDistrict(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Bank Settlement Details */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1.5">
                                            2. Bank Account Details
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Settlement Bank Name</label>
                                                <input 
                                                    type="text"
                                                    value={regBankName}
                                                    onChange={(e) => setRegBankName(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="e.g. City Bank PLC"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Beneficiary Account Name</label>
                                                <input 
                                                    type="text"
                                                    value={regBankAccountName}
                                                    onChange={(e) => setRegBankAccountName(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="Name exactly as printed on cheque"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Account Number</label>
                                                <input 
                                                    type="text"
                                                    value={regBankAccountNo}
                                                    onChange={(e) => setRegBankAccountNo(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="Standard routing layout account"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Routing Number</label>
                                                <input 
                                                    type="text"
                                                    value={regBankRouting}
                                                    onChange={(e) => setRegBankRouting(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Mobile Banking Details */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1.5">
                                            3. Mobile Banking Settlement Numbers
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-pink-600 block mb-1">bKash Personal/Merchant</label>
                                                <input 
                                                    type="tel"
                                                    value={regBkash}
                                                    onChange={(e) => setRegBkash(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="01xxxxxxxxx"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">Rocket</label>
                                                <input 
                                                    type="tel"
                                                    value={regRocket}
                                                    onChange={(e) => setRegRocket(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="01xxxxxxxxx-x"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block mb-1">Nagad</label>
                                                <input 
                                                    type="tel"
                                                    value={regNagad}
                                                    onChange={(e) => setRegNagad(e.target.value)}
                                                    disabled={mobileCheckResult === 'existing'}
                                                    placeholder="01xxxxxxxxx"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white text-slate-800 disabled:bg-slate-50"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 4: Local / Business-specific Terms */}
                                    <div className="space-y-4">
                                        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider border-b border-indigo-50 pb-1.5">
                                            4. Contract & Local Terms (Own Business)
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Business-specific Supplier Code</label>
                                                <input 
                                                    type="text"
                                                    value={localCode}
                                                    onChange={(e) => setLocalCode(e.target.value)}
                                                    placeholder="e.g. SUP-019 (Optional)"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono font-bold bg-white text-slate-800"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Payment Terms</label>
                                                <select
                                                    value={localPaymentTerms}
                                                    onChange={(e) => setLocalPaymentTerms(e.target.value)}
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800"
                                                >
                                                    <option value="Cash on Delivery">Cash on Delivery (COD)</option>
                                                    <option value="Net 15">Net 15</option>
                                                    <option value="Net 30">Net 30</option>
                                                    <option value="Net 60">Net 60</option>
                                                    <option value="Advance">Advance Paid</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Opening Balance Due ({currencySymbol})</label>
                                                <input 
                                                    type="number"
                                                    value={localOpeningBalance}
                                                    onChange={(e) => setLocalOpeningBalance(e.target.value)}
                                                    placeholder="0"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Credit Limit ({currencySymbol})</label>
                                                <input 
                                                    type="number"
                                                    value={localCreditLimit}
                                                    onChange={(e) => setLocalCreditLimit(e.target.value)}
                                                    placeholder="100000"
                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold bg-white text-slate-800"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 shrink-0">
                                        <button 
                                            type="button"
                                            onClick={() => setRegisterStep(1)}
                                            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                        >
                                            Back
                                        </button>
                                        <button 
                                            type="submit"
                                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all"
                                        >
                                            Complete Registration
                                        </button>
                                    </div>

                                </div>
                            )}

                        </form>
                    </div>
                </div>
            )}

            {/* RECORD PAYMENT MODAL */}
            {showPaymentModal && activeSupplier && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="font-black text-slate-800 text-base">Record Payment to Supplier</h3>
                                <p className="text-xs text-slate-400 font-medium">{activeSupplier.name} ({activeSupplier.mobile})</p>
                            </div>
                            <button 
                                onClick={() => setShowPaymentModal(false)}
                                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                            
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Outstanding Balance</p>
                                <p className="text-xl font-black text-red-500 mt-1">{formatMoney(activeSupplier.currentDue || 0)}</p>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Paid Amount ({currencySymbol}) *</label>
                                <input 
                                    type="number"
                                    required
                                    min="1"
                                    step="any"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    placeholder="Enter amount to pay"
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Financial Account *</label>
                                <select
                                    required
                                    value={payAccountId}
                                    onChange={(e) => setPayAccountId(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-bold bg-white text-slate-800"
                                >
                                    {financialAccounts.map(a => (
                                        <option key={a.id} value={a.id}>
                                            {a.name} ({formatMoney(a.balance)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Reference Voucher #</label>
                                <input 
                                    type="text"
                                    value={payReference}
                                    onChange={(e) => setPayReference(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800"
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Voucher Notes / Memo</label>
                                <textarea
                                    value={payNotes}
                                    onChange={(e) => setPayNotes(e.target.value)}
                                    placeholder="Optional payment notes..."
                                    rows={2}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-slate-950 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 text-sm"
                            >
                                <Check className="w-4 h-4" /> Confirm Payment & Sync Books
                            </button>

                        </form>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteConfirm && activeSupplier && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        <div className="p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-2">
                                <AlertTriangle className="w-8 h-8" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-slate-800">Secure Deletion Warning</h3>
                                <p className="text-slate-500 text-sm mt-2 font-medium">
                                    You are about to delete <span className="font-bold text-slate-800">{activeSupplier.name}</span>. This action will:
                                </p>
                            </div>
                            
                            <ul className="text-left text-xs space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                <li className="flex items-start gap-2 text-slate-600 font-bold">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                    Remove the supplier from your local business directory.
                                </li>
                                <li className="flex items-start gap-2 text-slate-600 font-bold">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                    Wipe the global registry record from the enterprise pool.
                                </li>
                                <li className="flex items-start gap-2 text-slate-600 font-bold">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                    This action is irreversible and affects global data connectivity.
                                </li>
                            </ul>

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleConfirmDelete}
                                    className="px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/20 text-sm flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Securely Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default Suppliers;
