
import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, LedgerEntry } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { Printer, Share2, X, RotateCcw, Building2, Phone, MapPin, Mail, Globe, ShieldCheck, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface InvoiceTemplateProps {
    data: LedgerEntry;
    onClose: () => void;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ data, onClose }) => {
    const { formatMoney, invoiceTemplateId, invoiceConfig } = useSettings();
    const { user } = useAuth();
    const { domainSettings } = useData();
    const navigate = useNavigate();

    const activeBusiness = user?.businesses?.find(b => b && b.name === user.businessName) || user?.businesses?.[0];
    const bizSettings = activeBusiness?.settings;

    const handlePrint = () => window.print();

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Invoice #${data.reference || data.id}`,
                    text: `Invoice from ${data.entityName} amounting to ${formatMoney(data.amount)}`,
                    url: window.location.href,
                });
            } catch (error) {
                console.log('Error sharing', error);
            }
        } else {
            alert('Sharing is not supported on this browser');
        }
    };

    const handleReturn = () => {
        onClose();
        if (data.type === 'Sale') {
            navigate('/sales-return', { state: { invoiceId: data.id } });
        } else if (data.type === 'Purchase') {
            navigate('/purchase-return', { state: { invoiceId: data.id } });
        } else {
             alert('Return processing is only applicable to Sales or Purchases.');
        }
    };

    // Helper: serials, warranty, FEFO lots / batch / expiry
    const ItemExtras = ({ item }: { item: any }) => {
        const lots = Array.isArray(item.lots) ? item.lots : [];
        const lotSummary = lots.length
            ? lots.map((l: any) =>
                `${l.lotNumber || 'LOT'}×${l.qty}${l.expiryDate ? ` (exp ${String(l.expiryDate).slice(0, 10)})` : ''}`
              ).join(' · ')
            : (item.batchNumber
                ? `Lot ${item.batchNumber}${item.expiryDate ? ` · Exp ${String(item.expiryDate).slice(0, 10)}` : ''}`
                : item.expiryDate
                  ? `Exp ${String(item.expiryDate).slice(0, 10)}`
                  : '');
        return (
        <div className="mt-1 space-y-0.5">
            {item.serialNumbers && item.serialNumbers.length > 0 && (
                <p className="text-[10px] text-slate-500 font-mono">
                    SN: {item.serialNumbers.join(', ')}
                </p>
            )}
            {lotSummary && (
                <p className="text-[10px] text-indigo-700 font-medium">
                    {lots.length > 1 ? 'Lots: ' : 'Lot: '}{lotSummary}
                </p>
            )}
            {item.variantName && !String(item.name || '').includes(item.variantName) && (
                <p className="text-[10px] text-slate-500">Variant: {item.variantName}</p>
            )}
            {item.warranty && (
                <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Warranty: {item.warranty}
                </p>
            )}
        </div>
        );
    };

    // Helper to render Installment Schedule
    const InstallmentSchedule = () => {
        if (!data.installments || data.installments.length === 0) return null;
        return (
            <div className="mt-4 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-2 text-xs uppercase tracking-wider">Installment Plan</h4>
                <div className="grid grid-cols-3 gap-2 text-xs font-medium text-slate-600 bg-slate-50 p-2 rounded mb-1">
                    <span>Due Date</span>
                    <span className="text-center">Status</span>
                    <span className="text-right">Amount</span>
                </div>
                <div className="space-y-1">
                    {data.installments.map((inst, i) => (
                        <div key={i} className="grid grid-cols-3 gap-2 text-xs border-b border-slate-50 pb-1 last:border-0">
                            <span>{inst.dueDate}</span>
                            <span className={`text-center ${inst.status === 'Paid' ? 'text-emerald-600' : 'text-amber-600'}`}>{inst.status}</span>
                            <span className="text-right font-mono">{formatMoney(inst.amount)}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // Helper to render Order Extras (Notes, Tags, etc.)
    const OrderExtras = () => (
        <div className="mt-8 pt-6 border-t border-slate-100 text-sm text-slate-600 space-y-2">
            {data.salesperson && (
                <p><span className="font-bold text-slate-800">Salesperson:</span> {data.salesperson}</p>
            )}
            {data.notes && (
                <p><span className="font-bold text-slate-800">Notes:</span> {data.notes}</p>
            )}
            {data.deliveryInstructions && (
                <p><span className="font-bold text-slate-800">Delivery Instructions:</span> {data.deliveryInstructions}</p>
            )}
            {data.tags && data.tags.length > 0 && (
                <p><span className="font-bold text-slate-800">Tags:</span> {data.tags.join(', ')}</p>
            )}

            <InstallmentSchedule />

            {/* Order Timeline */}
            <div className="mt-4 pt-4 border-t border-slate-100">
                <h4 className="font-bold text-slate-800 mb-2">Order Timeline</h4>
                <div className="space-y-3 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-indigo-500 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                        <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-2 rounded border border-slate-100 bg-slate-50 shadow-sm">
                            <div className="flex items-center justify-between space-x-2 mb-1">
                                <div className="font-bold text-slate-900 text-xs">Order Created</div>
                                <time className="font-medium text-indigo-500 text-[10px]">{data.date}</time>
                            </div>
                            <div className="text-slate-500 text-[10px]">Created by {data.createdBy || 'System'}</div>
                        </div>
                    </div>
                    {data.paymentMethod !== 'Due' && (
                        <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className="flex items-center justify-center w-4 h-4 rounded-full border-2 border-white bg-emerald-500 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2"></div>
                            <div className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] p-2 rounded border border-slate-100 bg-slate-50 shadow-sm">
                                <div className="flex items-center justify-between space-x-2 mb-1">
                                    <div className="font-bold text-slate-900 text-xs">Payment Received</div>
                                    <time className="font-medium text-emerald-500 text-[10px]">{data.date}</time>
                                </div>
                                <div className="text-slate-500 text-[10px]">Method: {data.paymentMethod}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    // Business Details Helpers
    const businessName = activeBusiness?.name || user?.businessName || 'Nexus ERP';
    const businessAddress = activeBusiness?.location || user?.location || '123 Business Avenue, Tech District';
    const businessPhone = bizSettings?.contactPhone || user?.mobile || '+1 (555) 123-4567';
    const businessWebsite = bizSettings?.website || domainSettings?.customDomain || domainSettings?.subdomain || 'www.nexus-erp.com';
    const businessEmail = bizSettings?.contactEmail || user?.email;
    const taxNumber = bizSettings?.taxNumber;
    const footerNote = bizSettings?.invoiceFooter || invoiceConfig.footerNote;
    const logoLetter = businessName.charAt(0).toUpperCase();

    // Render Logic for Logo
    const Logo = () => {
        const logoSrc = bizSettings?.logo || invoiceConfig.logo;
        if (logoSrc) {
            return <img src={logoSrc} alt="Logo" className="h-16 w-auto object-contain mb-4" />;
        }
        return <div className="w-10 h-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold text-xl mb-4">{logoLetter}</div>;
    };

    // Render Logic for Footer Areas (Signature & Seal)
    const FooterAreas = () => (
        <div className="flex justify-between items-end mt-16 px-4">
            {invoiceConfig.showSeal && (
                <div className="text-center">
                    <div className="w-24 h-24 border-2 border-slate-300 rounded-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase rotate-12 mb-2">
                        Official Seal
                    </div>
                </div>
            )}
            {invoiceConfig.showSignature && (
                <div className="text-center">
                    <div className="w-48 border-b border-slate-800 mb-2"></div>
                    <p className="text-xs text-slate-500 font-bold uppercase">Authorised Signature</p>
                </div>
            )}
        </div>
    );

    // --- Template Components ---

    const TemplateClassic = () => (
        <div className="bg-white p-8 md:p-12 min-h-[800px] font-sans text-slate-700 relative flex flex-col">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start mb-8 md:mb-12 border-b border-slate-100 pb-8 gap-6">
                <div>
                    <Logo />
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">{businessName}</h1>
                    <div className="text-sm text-slate-500 space-y-1 mt-2">
                        <p className="flex items-center gap-2"><MapPin className="w-3 h-3"/> {businessAddress}</p>
                        <p className="flex items-center gap-2"><Phone className="w-3 h-3"/> {businessPhone}</p>
                        {businessEmail && <p className="flex items-center gap-2"><Mail className="w-3 h-3"/> {businessEmail}</p>}
                        <p className="flex items-center gap-2"><Globe className="w-3 h-3"/> {businessWebsite}</p>
                        {taxNumber && <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Tax ID: {taxNumber}</p>}
                    </div>
                </div>
                <div className="text-left md:text-right">
                    <h2 className="text-3xl font-light text-slate-300 mb-2 uppercase tracking-widest">Invoice</h2>
                    <p className="font-bold text-slate-700 text-lg">#{data.reference || data.id.slice(-6).toUpperCase()}</p>
                    <p className="text-sm text-slate-500 mt-1">Date: {data.date}</p>
                    <div className="mt-2 inline-block px-3 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 uppercase">
                        {data.paymentMethod}
                    </div>
                </div>
            </div>

            {/* Address Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Billed To</h3>
                    <p className="text-lg font-bold text-slate-800">{data.entityName}</p>
                    <div className="text-sm text-slate-500 mt-2 space-y-1">
                        {data.entityMobile && <p className="flex items-center gap-2"><Phone className="w-3 h-3"/> {data.entityMobile}</p>}
                        {data.entityAddress && <p className="flex items-center gap-2"><MapPin className="w-3 h-3"/> {data.entityAddress}</p>}
                    </div>
                </div>
            </div>

            {/* Items Table */}
            <div className="flex-1">
                <table className="w-full mb-8">
                    <thead>
                        <tr className="border-b-2 border-slate-100">
                            <th className="py-3 px-2 text-left font-bold text-slate-600 text-sm uppercase tracking-wide">Item</th>
                            <th className="py-3 px-2 text-center font-bold text-slate-600 text-sm uppercase tracking-wide">Qty</th>
                            <th className="py-3 px-2 text-right font-bold text-slate-600 text-sm uppercase tracking-wide">Price</th>
                            <th className="py-3 px-2 text-right font-bold text-slate-600 text-sm uppercase tracking-wide">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {data.items?.map((item, i) => (
                            <tr key={i}>
                                <td className="py-4 px-2">
                                    <p className="font-medium text-slate-800">{item.name}</p>
                                    <ItemExtras item={item} />
                                </td>
                                <td className="py-4 px-2 text-center text-slate-600">{item.qty}</td>
                                <td className="py-4 px-2 text-right text-slate-600">{formatMoney(item.price)}</td>
                                <td className="py-4 px-2 text-right font-bold text-slate-800">{formatMoney(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Totals Section */}
            <div className="flex flex-col md:flex-row justify-end border-t border-slate-100 pt-8">
                <div className="w-full md:w-72 space-y-3">
                    <div className="flex justify-between text-slate-600 text-sm">
                        <span>Subtotal</span>
                        <span className="font-medium">{formatMoney(data.details?.subtotal || data.amount)}</span>
                    </div>
                    {data.details?.tax ? (
                        <div className="flex justify-between text-slate-600 text-sm">
                            <span>Tax</span>
                            <span className="font-medium">{formatMoney(data.details.tax)}</span>
                        </div>
                    ) : null}
                    {data.details?.discount ? (
                        <div className="flex justify-between text-emerald-600 text-sm">
                            <span>Discount</span>
                            <span className="font-medium">-{formatMoney(data.details.discount)}</span>
                        </div>
                    ) : null}
                    
                    <div className="flex justify-between items-end border-t border-slate-200 pt-4 mt-2">
                        <span className="text-base font-bold text-slate-800">Current Bill</span>
                        <span className="text-xl font-bold text-indigo-600">{formatMoney(data.amount)}</span>
                    </div>

                    {data.previousDue !== undefined && data.previousDue > 0 && (
                        <div className="flex justify-between text-slate-600 text-sm mt-2">
                            <span>Previous Due</span>
                            <span className="font-medium">{formatMoney(data.previousDue)}</span>
                        </div>
                    )}

                    {(data.previousDue !== undefined && data.previousDue > 0) && (
                        <div className="flex justify-between text-slate-800 text-sm font-bold mt-1 border-t border-dashed border-slate-200 pt-2">
                            <span>Total Payable</span>
                            <span>{formatMoney(data.amount + (data.previousDue || 0))}</span>
                        </div>
                    )}

                    {data.amountPaid !== undefined && (
                        <div className="flex justify-between text-slate-600 text-sm mt-2">
                            <span>Paid Amount</span>
                            <span className="font-medium">{formatMoney(data.amountPaid)}</span>
                        </div>
                    )}
                    
                    <div className={`flex justify-between text-sm font-bold mt-1 ${(data.dueAmount || 0) + (data.previousDue || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        <span>Total Due</span>
                        <span>{formatMoney((data.dueAmount || 0) + (data.previousDue || 0))}</span>
                    </div>
                </div>
            </div>
            
            <OrderExtras />
            <FooterAreas />

            <div className="mt-12 text-center pt-8 border-t border-dashed border-slate-200">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide whitespace-pre-wrap">{footerNote}</p>
            </div>
        </div>
    );

    const TemplateModern = () => (
        <div className="bg-white min-h-[800px] font-sans flex flex-col relative overflow-hidden">
            {/* Header Accent */}
            <div className="bg-indigo-600 h-4"></div>
            
            <div className="p-8 md:p-12 flex-1 flex flex-col">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start mb-12 gap-6">
                    <div>
                        <Logo />
                        <h1 className="text-3xl font-bold text-slate-900 tracking-tighter mb-2">{businessName}</h1>
                        <p className="text-slate-500 text-sm max-w-xs">{businessAddress}<br/>{businessPhone}</p>
                        {taxNumber && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Tax ID: {taxNumber}</p>}
                    </div>
                    <div className="text-right">
                        <h2 className="text-5xl font-bold text-indigo-50 mb-2 leading-none">INVOICE</h2>
                        <div className="flex flex-col md:items-end">
                            <span className="text-sm font-bold text-indigo-600">#{data.reference || data.id.slice(-6).toUpperCase()}</span>
                            <span className="text-sm text-slate-500">{data.date}</span>
                        </div>
                    </div>
                </div>

                {/* Client Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 bg-slate-50 p-6 rounded-xl border border-slate-100">
                    <div>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Billed To</span>
                        <h3 className="text-lg font-bold text-slate-800">{data.entityName}</h3>
                        <div className="text-sm text-slate-500 mt-1 space-y-0.5">
                            {data.entityAddress && <p>{data.entityAddress}</p>}
                            {data.entityMobile && <p>{data.entityMobile}</p>}
                        </div>
                    </div>
                    <div className="md:text-right">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Payment Details</span>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-slate-700"><span className="text-slate-400 mr-2">Method:</span> {data.paymentMethod}</p>
                            <p className="text-sm font-medium text-slate-700"><span className="text-slate-400 mr-2">Status:</span> Paid</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1">
                    <table className="w-full mb-8">
                        <thead>
                            <tr className="text-indigo-900 border-b-2 border-indigo-100">
                                <th className="py-3 px-2 text-left font-bold text-sm">Description</th>
                                <th className="py-3 px-2 text-center font-bold text-sm">Qty</th>
                                <th className="py-3 px-2 text-right font-bold text-sm">Rate</th>
                                <th className="py-3 px-2 text-right font-bold text-sm">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-indigo-50">
                            {data.items?.map((item, i) => (
                                <tr key={i}>
                                    <td className="py-4 px-2">
                                        <p className="font-bold text-slate-700">{item.name}</p>
                                        <ItemExtras item={item} />
                                    </td>
                                    <td className="py-4 px-2 text-center font-medium text-slate-600">{item.qty}</td>
                                    <td className="py-4 px-2 text-right font-medium text-slate-600">{formatMoney(item.price)}</td>
                                    <td className="py-4 px-2 text-right font-bold text-indigo-600">{formatMoney(item.total)}</td>
                                                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Totals */}
                <div className="flex justify-end">
                    <div className="bg-slate-900 text-white p-6 rounded-xl w-full md:w-80 shadow-lg">
                        <div className="flex justify-between mb-2 text-sm text-slate-300">
                            <span>Subtotal</span>
                            <span>{formatMoney(data.details?.subtotal || data.amount)}</span>
                        </div>
                        {data.details?.tax ? (
                            <div className="flex justify-between mb-2 text-sm text-slate-300">
                                <span>Tax</span>
                                <span>+ {formatMoney(data.details.tax)}</span>
                            </div>
                        ) : null}
                        {data.details?.discount ? (
                            <div className="flex justify-between mb-4 text-sm text-emerald-300">
                                <span>Discount</span>
                                <span>- {formatMoney(data.details.discount)}</span>
                            </div>
                        ) : null}
                        <div className="flex justify-between pt-4 border-t border-slate-700 items-end">
                            <span className="font-bold text-lg">Current Bill</span>
                            <span className="font-bold text-xl">{formatMoney(data.amount)}</span>
                        </div>

                        {data.previousDue !== undefined && data.previousDue > 0 && (
                            <div className="flex justify-between mt-2 text-sm text-slate-300">
                                <span>Previous Due</span>
                                <span>{formatMoney(data.previousDue)}</span>
                            </div>
                        )}

                        {(data.previousDue !== undefined && data.previousDue > 0) && (
                            <div className="flex justify-between mt-2 pt-2 border-t border-slate-700 text-sm text-white font-bold">
                                <span>Total Payable</span>
                                <span>{formatMoney(data.amount + (data.previousDue || 0))}</span>
                            </div>
                        )}

                        {data.amountPaid !== undefined && (
                            <div className="flex justify-between mt-2 text-sm text-slate-300">
                                <span>Paid Amount</span>
                                <span>{formatMoney(data.amountPaid)}</span>
                            </div>
                        )}
                        
                        <div className={`flex justify-between mt-1 text-sm font-bold ${(data.dueAmount || 0) + (data.previousDue || 0) > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            <span>Total Due</span>
                            <span>{formatMoney((data.dueAmount || 0) + (data.previousDue || 0))}</span>
                        </div>
                    </div>
                </div>
                
                <OrderExtras />
                <FooterAreas />
                <div className="mt-8 text-center text-xs text-slate-400 font-medium uppercase tracking-wide whitespace-pre-wrap">{footerNote}</div>
            </div>
        </div>
    );

    const TemplateProfessional = () => (
        <div className="bg-white min-h-[800px] font-sans text-slate-800 p-12">
            <div className="border-b-4 border-slate-900 pb-8 mb-12 flex justify-between items-end">
                <div>
                    <Logo />
                    <h1 className="text-4xl font-bold text-slate-900 tracking-tight">INVOICE</h1>
                    <p className="text-slate-500 font-medium mt-1">#{data.reference || data.id}</p>
                </div>
                <div className="text-right">
                    <h2 className="text-xl font-bold text-slate-900">{businessName}</h2>
                    <p className="text-sm text-slate-500">{businessAddress}</p>
                    <p className="text-sm text-slate-500">{businessPhone}</p>
                    {taxNumber && <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Tax ID: {taxNumber}</p>}
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-12 mb-16">
                <div className="flex-1">
                    <h3 className="text-xs font-bold text-slate-900 uppercase mb-4 border-b border-slate-200 pb-2">Bill To</h3>
                    <p className="font-bold text-lg">{data.entityName}</p>
                    <div className="text-sm text-slate-600 mt-2 space-y-1">
                        {data.entityAddress && <p>{data.entityAddress}</p>}
                        {data.entityMobile && <p>{data.entityMobile}</p>}
                    </div>
                </div>
                <div className="flex-1">
                    <h3 className="text-xs font-bold text-slate-900 uppercase mb-4 border-b border-slate-200 pb-2">Details</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="text-slate-500">Invoice Date</p>
                            <p className="font-medium">{data.date}</p>
                        </div>
                        <div>
                            <p className="text-slate-500">Payment Mode</p>
                            <p className="font-medium">{data.paymentMethod}</p>
                        </div>
                    </div>
                </div>
            </div>

            <table className="w-full mb-12">
                <thead>
                    <tr className="bg-slate-100 text-slate-900">
                        <th className="py-3 px-4 text-left font-bold text-xs uppercase">Description</th>
                        <th className="py-3 px-4 text-center font-bold text-xs uppercase">Qty</th>
                        <th className="py-3 px-4 text-right font-bold text-xs uppercase">Unit Price</th>
                        <th className="py-3 px-4 text-right font-bold text-xs uppercase">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                    {data.items?.map((item, i) => (
                        <tr key={i}>
                            <td className="py-4 px-4">
                                <span className="font-medium block">{item.name}</span>
                                <ItemExtras item={item} />
                            </td>
                            <td className="py-4 px-4 text-center">{item.qty}</td>
                            <td className="py-4 px-4 text-right">{formatMoney(item.price)}</td>
                            <td className="py-4 px-4 text-right font-bold">{formatMoney(item.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end">
                <div className="w-64 border-t-2 border-slate-900 pt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="font-medium text-slate-600">Subtotal</span>
                        <span className="font-bold">{formatMoney(data.details?.subtotal || data.amount)}</span>
                    </div>
                    {data.details?.tax ? (
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-600">Tax</span>
                            <span className="font-bold">{formatMoney(data.details.tax)}</span>
                        </div>
                    ) : null}
                    {data.details?.discount ? (
                        <div className="flex justify-between text-sm">
                            <span className="font-medium text-slate-600">Discount</span>
                            <span className="font-bold">-{formatMoney(data.details.discount)}</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between text-lg mt-4">
                        <span className="font-black text-slate-900">Current Bill</span>
                        <span className="font-black text-slate-900">{formatMoney(data.amount)}</span>
                    </div>

                    {data.previousDue !== undefined && data.previousDue > 0 && (
                        <div className="flex justify-between text-sm mt-2">
                            <span className="font-medium text-slate-600">Previous Due</span>
                            <span className="font-bold">{formatMoney(data.previousDue)}</span>
                        </div>
                    )}

                    {(data.previousDue !== undefined && data.previousDue > 0) && (
                        <div className="flex justify-between text-sm mt-2 pt-2 border-t border-slate-200">
                            <span className="font-black text-slate-900">Total Payable</span>
                            <span className="font-black text-slate-900">{formatMoney(data.amount + (data.previousDue || 0))}</span>
                        </div>
                    )}

                    {data.amountPaid !== undefined && (
                        <div className="flex justify-between text-sm mt-2">
                            <span className="font-medium text-slate-600">Paid Amount</span>
                            <span className="font-bold">{formatMoney(data.amountPaid)}</span>
                        </div>
                    )}
                    
                    <div className={`flex justify-between text-sm ${(data.dueAmount || 0) + (data.previousDue || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        <span className="font-bold">Total Due</span>
                        <span className="font-bold">{formatMoney((data.dueAmount || 0) + (data.previousDue || 0))}</span>
                    </div>
                </div>
            </div>

            <OrderExtras />
            <FooterAreas />
            <div className="text-center text-sm italic text-slate-500 mt-8">
                <p className="whitespace-pre-wrap">{footerNote}</p>
            </div>
        </div>
    );

    const TemplateCreative = () => (
        <div className="bg-white min-h-[800px] font-sans flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar */}
            <div className="w-full md:w-1/3 bg-orange-500 p-8 md:p-12 text-white flex flex-col justify-between">
                <div>
                    <Logo />
                    <h1 className="text-4xl md:text-5xl font-black mb-8 md:mb-16 tracking-tighter uppercase break-words">{businessName}</h1>
                    
                    <div className="mb-8 md:mb-12">
                        <h3 className="font-bold opacity-70 mb-2 uppercase text-xs tracking-wider">Billed To</h3>
                        <p className="text-xl md:text-2xl font-bold leading-tight">{data.entityName}</p>
                        {data.entityMobile && <p className="opacity-90 mt-2 text-sm">{data.entityMobile}</p>}
                        {data.entityAddress && <p className="opacity-90 mt-1 text-sm">{data.entityAddress}</p>}
                    </div>

                    <div>
                        <h3 className="font-bold opacity-70 mb-2 uppercase text-xs tracking-wider">Invoice Info</h3>
                        <p className="font-medium text-lg">#{data.reference || data.id}</p>
                        <p className="opacity-80 text-sm mt-1">{data.date}</p>
                        <div className="mt-4 inline-block border border-white/30 rounded px-3 py-1 text-xs font-bold uppercase">
                            {data.paymentMethod}
                        </div>
                    </div>
                </div>
                
                <div className="text-sm opacity-80 mt-8 md:mt-0">
                    <p>{businessWebsite}</p>
                    <p>{businessPhone}</p>
                    {taxNumber && <p className="mt-1 font-bold">Tax ID: {taxNumber}</p>}
                </div>
            </div>

            {/* Main Content */}
            <div className="w-full md:w-2/3 p-8 md:p-12 flex flex-col">
                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-800 mb-8 flex items-center gap-2">
                        <span className="w-8 h-1 bg-orange-500 rounded-full inline-block"></span> 
                        Order Details
                    </h2>
                    
                    <table className="w-full mb-12">
                        <thead>
                            <tr className="border-b-2 border-orange-100 text-orange-600">
                                <th className="py-3 text-left font-bold text-sm">Item</th>
                                <th className="py-3 text-center font-bold text-sm">Qty</th>
                                <th className="py-3 text-right font-bold text-sm">Price</th>
                                <th className="py-3 text-right font-bold text-sm">Total</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-orange-50">
                            {data.items?.map((item, i) => (
                                <tr key={i}>
                                    <td className="py-4 font-medium text-slate-800">
                                        {item.name}
                                        <ItemExtras item={item} />
                                    </td>
                                    <td className="py-4 text-center text-slate-500">{item.qty}</td>
                                    <td className="py-4 text-right text-slate-500">{formatMoney(item.price)}</td>
                                    <td className="py-4 text-right font-bold text-slate-800">{formatMoney(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="bg-orange-50 p-8 rounded-2xl mb-8">
                    <div className="flex justify-between mb-2">
                        <span className="text-slate-600 font-medium">Subtotal</span>
                        <span className="font-bold text-slate-800">{formatMoney(data.details?.subtotal || data.amount)}</span>
                    </div>
                    {data.details?.tax || data.details?.discount ? (
                        <div className="flex justify-between mb-4 pb-4 border-b border-orange-200 text-sm text-slate-500">
                            <span>Adjustments (Tax/Disc)</span>
                            <span>{formatMoney((data.details?.tax||0) - (data.details?.discount||0))}</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between items-center pt-2 md:pt-0">
                        <span className="text-xl font-bold text-orange-600">Current Bill</span>
                        <span className="text-2xl font-black text-slate-900">{formatMoney(data.amount)}</span>
                    </div>

                    {data.previousDue !== undefined && data.previousDue > 0 && (
                        <div className="flex justify-between mt-2 text-sm text-slate-600">
                            <span>Previous Due</span>
                            <span className="font-bold">{formatMoney(data.previousDue)}</span>
                        </div>
                    )}

                    {(data.previousDue !== undefined && data.previousDue > 0) && (
                        <div className="flex justify-between mt-2 pt-2 border-t border-orange-200 text-lg font-black text-slate-900">
                            <span>Total Payable</span>
                            <span>{formatMoney(data.amount + (data.previousDue || 0))}</span>
                        </div>
                    )}

                    {data.amountPaid !== undefined && (
                        <div className="flex justify-between mt-2 text-sm text-slate-600">
                            <span>Paid Amount</span>
                            <span className="font-bold">{formatMoney(data.amountPaid)}</span>
                        </div>
                    )}
                    
                    <div className={`flex justify-between mt-1 text-sm font-bold ${(data.dueAmount || 0) + (data.previousDue || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        <span>Total Due</span>
                        <span>{formatMoney((data.dueAmount || 0) + (data.previousDue || 0))}</span>
                    </div>
                </div>
                <OrderExtras />
                <FooterAreas />
                <p className="text-xs text-slate-400 mt-4 whitespace-pre-wrap">{footerNote}</p>
            </div>
        </div>
    );

    const TemplateFormal = () => (
        <div className="bg-[#fdfbf7] min-h-[800px] font-serif p-12 md:p-16 text-slate-900 border-8 border-double border-slate-200">
            <div className="text-center mb-16">
                <div className="flex justify-center mb-4"><Logo /></div>
                <h1 className="text-5xl font-bold mb-4 tracking-wide text-slate-900 uppercase">{businessName}</h1>
                <div className="w-24 h-1 bg-slate-900 mx-auto mb-4"></div>
                <p className="italic text-slate-600 font-medium">Excellence in Enterprise Management</p>
                <p className="text-sm mt-2">{businessAddress} | {businessPhone}</p>
                {taxNumber && <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Tax ID: {taxNumber}</p>}
            </div>

            <div className="flex flex-col md:flex-row justify-between mb-16 gap-8">
                <div>
                    <h3 className="font-bold border-b border-slate-400 mb-2 pb-1 inline-block uppercase text-xs tracking-widest">Invoiced To</h3>
                    <p className="text-xl mt-2">{data.entityName}</p>
                    <div className="text-sm mt-1 italic text-slate-600">
                        {data.entityMobile && <p>{data.entityMobile}</p>}
                        {data.entityAddress && <p>{data.entityAddress}</p>}
                    </div>
                </div>
                <div className="md:text-right">
                    <div className="mb-2">
                        <span className="font-bold text-slate-500 uppercase text-xs tracking-widest mr-2">Invoice No:</span>
                        <span className="font-mono text-lg">{data.reference || data.id}</span>
                    </div>
                    <div>
                        <span className="font-bold text-slate-500 uppercase text-xs tracking-widest mr-2">Date:</span>
                        <span className="text-lg">{data.date}</span>
                    </div>
                </div>
            </div>

            <table className="w-full mb-16 border-collapse">
                <thead>
                    <tr className="border-y-2 border-slate-900">
                        <th className="py-4 px-4 text-left font-bold text-sm uppercase tracking-wider">Description</th>
                        <th className="py-4 px-4 text-center font-bold text-sm uppercase tracking-wider">Quantity</th>
                        <th className="py-4 px-4 text-right font-bold text-sm uppercase tracking-wider">Unit Price</th>
                        <th className="py-4 px-4 text-right font-bold text-sm uppercase tracking-wider">Amount</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                    {data.items?.map((item, i) => (
                        <tr key={i}>
                            <td className="py-4 px-4">
                                {item.name}
                                <ItemExtras item={item} />
                            </td>
                            <td className="py-4 px-4 text-center">{item.qty}</td>
                            <td className="py-4 px-4 text-right">{formatMoney(item.price)}</td>
                            <td className="py-4 px-4 text-right font-bold">{formatMoney(item.total)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="flex justify-end mb-16">
                <div className="w-full md:w-96 bg-white border border-slate-300 p-6 shadow-sm">
                    <div className="flex justify-between mb-3 border-b border-dotted border-slate-300 pb-2">
                        <span className="italic text-slate-600">Subtotal:</span> 
                        <span>{formatMoney(data.details?.subtotal || data.amount)}</span>
                    </div>
                    {data.details?.tax ? (
                        <div className="flex justify-between mb-3 border-b border-dotted border-slate-300 pb-2">
                            <span className="italic text-slate-600">Tax:</span> 
                            <span>{formatMoney(data.details.tax)}</span>
                        </div>
                    ) : null}
                    <div className="flex justify-between pt-2">
                        <span className="font-bold text-xl">Current Bill:</span>
                        <span className="font-bold text-xl">{formatMoney(data.amount)}</span>
                    </div>

                    {data.previousDue !== undefined && data.previousDue > 0 && (
                        <div className="flex justify-between mb-2 border-b border-dotted border-slate-300 pb-2">
                            <span className="italic text-slate-600">Previous Due:</span>
                            <span>{formatMoney(data.previousDue)}</span>
                        </div>
                    )}

                    {(data.previousDue !== undefined && data.previousDue > 0) && (
                        <div className="flex justify-between pt-2 border-t-2 border-slate-800 mb-2">
                            <span className="font-black text-xl">Total Payable:</span>
                            <span className="font-black text-xl">{formatMoney(data.amount + (data.previousDue || 0))}</span>
                        </div>
                    )}

                    {data.amountPaid !== undefined && (
                        <div className="flex justify-between mt-2 text-sm text-slate-600">
                            <span className="italic">Paid Amount:</span>
                            <span className="font-bold">{formatMoney(data.amountPaid)}</span>
                        </div>
                    )}
                    
                    <div className={`flex justify-between mt-1 text-sm font-bold ${(data.dueAmount || 0) + (data.previousDue || 0) > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        <span className="italic">Total Due:</span>
                        <span>{formatMoney((data.dueAmount || 0) + (data.previousDue || 0))}</span>
                    </div>
                </div>
            </div>

            <OrderExtras />
            <FooterAreas />
            <div className="text-center text-sm italic text-slate-500 mt-8">
                <p className="whitespace-pre-wrap">{footerNote}</p>
            </div>
        </div>
    );

    const renderTemplateContent = () => {
        switch (invoiceTemplateId) {
            case 2: return <TemplateModern />;
            case 3: return <TemplateProfessional />;
            case 4: return <TemplateCreative />;
            case 5: return <TemplateFormal />;
            default: return <TemplateClassic />;
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-0 md:p-4 backdrop-blur-sm overflow-y-auto print:bg-white print:p-0">
            <div className="bg-white w-full md:max-w-4xl md:rounded-xl shadow-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none animate-in zoom-in duration-200 flex flex-col h-full md:h-[90vh] print:h-auto">
                {/* Actions */}
                <div className="bg-slate-900 p-4 flex flex-wrap gap-3 justify-between items-center print:hidden shrink-0 z-50">
                    <h2 className="text-white font-bold text-lg hidden sm:block">Invoice Preview</h2>
                    <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <button onClick={handleShare} className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center" title="Share">
                             <Share2 className="w-5 h-5" />
                        </button>
                        
                        {(data.type === 'Sale' || data.type === 'Purchase') && (
                            <button onClick={handleReturn} className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium flex items-center gap-2" title="Process Return">
                                <RotateCcw className="w-4 h-4" /> <span className="hidden sm:inline">Return</span>
                            </button>
                        )}

                        <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
                            <Printer className="w-4 h-4" /> Print
                        </button>
                        <button onClick={onClose} className="p-2 text-slate-400 hover:text-white rounded-lg"><X className="w-6 h-6" /></button>
                    </div>
                </div>

                <div className="print:w-full flex-1 overflow-auto bg-slate-200 p-0 md:p-8 print:p-0 custom-scrollbar">
                    <div className="shadow-lg print:shadow-none mx-auto max-w-[800px] print:max-w-none bg-white min-h-full md:min-h-0">
                         {renderTemplateContent()}
                    </div>
                </div>
            </div>
            <style>{`
                @media print {
                    @page { margin: 0; size: auto; }
                    body, html, #root {
                        height: auto !important;
                        overflow: visible !important;
                        background: white;
                    }
                    /* Hide everything */
                    body * {
                        visibility: hidden;
                    }
                    /* Show Invoice */
                    .bg-white.w-full, .bg-white.w-full * {
                        visibility: visible;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .bg-white.w-full {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        margin: 0;
                        padding: 0;
                        background: white;
                        color: black;
                        box-shadow: none !important;
                        border: none !important;
                    }
                    .print\\:hidden { display: none !important; }
                    .print\\:p-0 { padding: 0 !important; }
                    .print\\:shadow-none { box-shadow: none !important; }
                }
            `}</style>
        </div>
    );
};

export default InvoiceTemplate;
