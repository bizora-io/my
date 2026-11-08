import React from 'react';
import { useOnboarding } from '../contexts/OnboardingContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  ShoppingCart,
  ClipboardList,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  BookOpen,
} from 'lucide-react';

export const TrainingPage: React.FC = () => {
  const { startTour } = useOnboarding();
  const { t } = useSettings();

  const guides = [
    { title: t('POS Quick Billing'), desc: t('Learn how to search products, scan barcodes, apply discount codes, and process payments in seconds.'), icon: ShoppingCart, color: 'text-indigo-600 bg-indigo-50' },
    { title: t('Installment (EMI) Setup'), desc: t('Configure automated installment plans with flexible due intervals and track payments step by step.'), icon: ClipboardList, color: 'text-emerald-600 bg-emerald-50' },
    { title: t('Analytics & Daily Logs'), desc: t('Understand your cashflow ledger, net profit metrics, and how to track target-performance metrics.'), icon: TrendingUp, color: 'text-amber-600 bg-amber-50' },
    { title: t('User & Access Control'), desc: t('Manage staff roles, security protocols, permissions mapping, and prevent unauthorized actions.'), icon: ShieldCheck, color: 'text-rose-600 bg-rose-50' },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      {/* Hero Welcome */}
      <div className="bg-slate-900 rounded-3xl p-6 lg:p-10 text-white relative overflow-hidden shadow-xl shadow-slate-900/10">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none rounded-r-3xl"></div>
        <div className="relative z-10 max-w-xl">
          <span className="bg-indigo-500/20 text-indigo-300 text-xs font-black px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-500/30">
            {t('Training Portal')}
          </span>
          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white mt-4 leading-tight">
            {t('Master Bizora in Minutes')}
          </h1>
          <p className="text-slate-300 text-sm mt-3 leading-relaxed">
            {t('Get a complete, hands-on, step-by-step interactive tour of the most critical sales, billing, and accounting features of your ERP.')}
          </p>
          <button 
            onClick={startTour}
            className="mt-6 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" /> {t('Start Interactive Tour')}
          </button>
        </div>
      </div>

      {/* Recommended Guides Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">{t('Recommended Guides & Tutorials')}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          {guides.map((g, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-indigo-100 hover:shadow-lg transition-all duration-300 flex gap-4 group">
              <div className={`p-3 rounded-xl shrink-0 h-12 w-12 flex items-center justify-center ${g.color} group-hover:scale-110 transition-transform`}>
                <g.icon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{g.title}</h3>
                <p className="text-slate-500 text-xs mt-1.5 leading-relaxed font-medium">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* POS Shortcuts / Cheat Sheet */}
      <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
        <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-indigo-600" /> {t('POS Operator Quick Reference')}
        </h3>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">01</span>
            <h4 className="font-bold text-slate-800 text-xs mb-1">Barcode Scanning</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">Use any standard USB/Bluetooth scanner on the Sale page to automatically append scanned items directly into the cart.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">02</span>
            <h4 className="font-bold text-slate-800 text-xs mb-1">Due Ledger Collection</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">Process collections for regular corporate accounts by recording Debit/Credit transactions inside the custom ledger sheet.</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">03</span>
            <h4 className="font-bold text-slate-800 text-xs mb-1">Receipt Printing</h4>
            <p className="text-slate-500 text-[11px] leading-relaxed font-medium">Configure thermal ticket configurations or print professional 80mm roll receipts immediately upon successful checkout.</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
          <h4 className="font-bold text-slate-800 text-xs mb-3">Keyboard shortcuts</h4>
          <div className="grid sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
            <p><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border font-mono text-[10px]">F2</kbd> Sell / Buy — focus product search</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border font-mono text-[10px]">Enter</kbd> Sell — add / barcode scan</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border font-mono text-[10px]">F9</kbd> Sell / Quick Sale — checkout or charge</p>
            <p><kbd className="px-1.5 py-0.5 rounded bg-slate-100 border font-mono text-[10px]">Esc</kbd> Clear search · close scanner · Quick Sale AC</p>
            <p className="sm:col-span-2 text-slate-500">Quick Sale also accepts number keys, <kbd className="px-1 rounded bg-slate-100 border font-mono">+</kbd><kbd className="px-1 rounded bg-slate-100 border font-mono">-</kbd><kbd className="px-1 rounded bg-slate-100 border font-mono">*</kbd><kbd className="px-1 rounded bg-slate-100 border font-mono">/</kbd>, and Backspace.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingPage;
