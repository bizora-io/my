import React from 'react';
import { 
  ArrowRight, ShieldCheck, Zap, ShoppingBag, BarChart3, Wifi, 
  CheckCircle2, Store, CreditCard, ChevronRight, Layers, Sparkles 
} from 'lucide-react';
import { PortalType } from '../../lib/domainRouter';

interface HeroSectionProps {
  isBn: boolean;
  onPortalClick: (portal: PortalType, e: React.MouseEvent, params?: { plan?: string; billing?: string; mode?: 'login' | 'register' }) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ isBn, onPortalClick }) => {
  return (
    <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 overflow-hidden">
      {/* Subtle Ambient Light Gradients (Performance Optimized, No Heavy Blurs) */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[90px] rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/4 -translate-x-1/2 w-[400px] h-[250px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          {/* Badge Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs sm:text-sm font-semibold mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Zap className="w-4 h-4 text-emerald-400" />
            <span>
              {isBn
                ? 'এন্টারপ্রাইজ মাল্টি-টেন্যান্ট ইআরপি ও হাই-স্পিড পিওএস'
                : 'Enterprise Multi-Tenant ERP & High-Speed POS'}
            </span>
          </div>

          {/* Primary Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15] mb-6">
            {isBn ? (
              <>
                আধুনিক রিটেল ও বাণিজ্যের জন্য{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  বুদ্ধিমান ইআরপি ও পিওএস
                </span>
              </>
            ) : (
              <>
                The Intelligent ERP & POS Built for{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                  Modern Retail & Commerce
                </span>
              </>
            )}
          </h1>

          {/* Sub-headline */}
          <p className="text-lg sm:text-xl text-slate-300 leading-relaxed mb-8 max-w-2xl mx-auto">
            {isBn
              ? 'সাব-সেকেন্ড বারকোড বিলিং, এফইএফও ব্যাচ মেয়াদ সুরক্ষা, স্বয়ংক্রিয় ডাবল-এন্ট্রি হিসাব এবং মাল্টি-স্টোর ডিস্ট্রিবিউশন—সবকিছু একটি শক্তিশালী ক্লাউড প্ল্যাটফর্মে।'
              : 'Sub-second barcode billing, FEFO batch and expiry control, automated double-entry accounting, and multi-store distribution on a single unified cloud platform.'}
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
            <button
              type="button"
              onClick={(e) => onPortalClick('shop', e, { plan: 'trial', mode: 'register' })}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-semibold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-950/50 hover:shadow-emerald-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{isBn ? '১৪ দিনের ফ্রি ট্রায়াল শুরু করুন' : 'Start 14-Day Free Trial'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <a
              href="#preview"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-base font-medium text-slate-200 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-all duration-200"
            >
              <span>{isBn ? 'লাইভ ডেমো দেখুন' : 'Explore Live Preview'}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          </div>

          {/* Trust Highlights */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isBn ? 'কোন ক্রেডিট কার্ড লাগবে না' : 'No credit card required'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isBn ? '২ মিনিটে সেটআপ' : 'Instant 2-minute setup'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{isBn ? '১০০% অফলাইনেও সচল' : '100% offline-ready POS'}</span>
            </div>
          </div>
        </div>

        {/* Product Dashboard Preview Frame */}
        <div className="mt-14 sm:mt-16 max-w-5xl mx-auto">
          <div className="relative rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-md">
            {/* Top Mock Window Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/80">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-slate-500 ml-2 font-mono">bizora-pos-terminal-v2.9.4</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Wifi className="w-3 h-3" />
                  <span>{isBn ? 'অনলাইন ও লোকাল সিঙ্ক সচল' : 'Cloud & Local Sync Active'}</span>
                </span>
              </div>
            </div>

            {/* Dashboard Content Mock */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Quick Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">{isBn ? 'আজকের বিক্রি' : "Today's Gross Sales"}</div>
                  <div className="text-xl sm:text-2xl font-bold text-white">৳ 84,250</div>
                  <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                    <span>↑ 18.4%</span>
                    <span className="text-slate-500">{isBn ? 'গতকালের চেয়ে বেশি' : 'vs yesterday'}</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">{isBn ? 'মোট বিলিং ট্রানজ্যাকশন' : 'Invoices Settled'}</div>
                  <div className="text-xl sm:text-2xl font-bold text-white">186</div>
                  <div className="text-[11px] text-slate-400 mt-1">{isBn ? 'গড় বিল: ৳ ৪৫৩' : 'Avg: ৳453 / bill'}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">{isBn ? 'এফইএফও অ্যাক্টিভ ব্যাচ' : 'FEFO Monitored Batches'}</div>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-400">1,420</div>
                  <div className="text-[11px] text-emerald-400/90 mt-1">{isBn ? '০ মেয়াদোত্তীর্ণ অপচয়' : 'Zero Expired Waste'}</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-xs text-slate-400 mb-1">{isBn ? 'ক্যাশড্রয়ার ব্যালেন্স' : 'Till Cashbox Float'}</div>
                  <div className="text-xl sm:text-2xl font-bold text-white">৳ 24,600</div>
                  <div className="text-[11px] text-emerald-400 mt-1">{isBn ? 'ব্যালেন্স ১০০% মিলেছে' : 'Reconciled 100%'}</div>
                </div>
              </div>

              {/* Live POS Bill Ledger View */}
              <div className="rounded-xl border border-slate-800/80 bg-slate-950/70 p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-slate-200">
                      {isBn ? 'লাইভ কাউন্টার সেলস ফিড' : 'Live Counter Checkout Stream'}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 font-mono">Terminal 01 • Main Outlet</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2 font-medium">{isBn ? 'বিল নং' : 'Invoice'}</th>
                        <th className="pb-2 font-medium">{isBn ? 'আইটেম ও ব্যাচ' : 'Items & Batch'}</th>
                        <th className="pb-2 font-medium">{isBn ? 'পেমেন্ট মেথড' : 'Payment Tender'}</th>
                        <th className="pb-2 font-medium text-right">{isBn ? 'মোট মূল্য' : 'Total'}</th>
                        <th className="pb-2 font-medium text-right">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      <tr>
                        <td className="py-2.5 font-mono text-emerald-400">#INV-10492</td>
                        <td className="py-2.5">
                          <div>Fortune Basmati 5kg (Lot: FB-884)</div>
                          <div className="text-[10px] text-slate-500">Exp: 14 Dec 2027 • FEFO Auto-Selected</div>
                        </td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
                            bKash Merchant
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-white">৳ 840.00</td>
                        <td className="py-2.5 text-right">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                            Settled
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-mono text-emerald-400">#INV-10491</td>
                        <td className="py-2.5">
                          <div>Napa Extra 500mg (10 Strips)</div>
                          <div className="text-[10px] text-slate-500">Lot: NP-2049 • Verified Genuine</div>
                        </td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                            Cash Tender
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-semibold text-white">৳ 250.00</td>
                        <td className="py-2.5 text-right">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-medium">
                            Settled
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
