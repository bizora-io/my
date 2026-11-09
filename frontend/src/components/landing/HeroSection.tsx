import React from 'react';
import { 
  ArrowRight, ShieldCheck, Zap, ShoppingBag, BarChart3, Wifi, 
  CheckCircle2, Store, CreditCard, ChevronRight, Layers, Sparkles 
} from 'lucide-react';
import { PortalType } from '../../lib/domainRouter';
import { ThreeHeroScene } from './ThreeHeroScene';

interface HeroSectionProps {
  isBn: boolean;
  theme: 'light' | 'dark';
  onPortalClick: (portal: PortalType, e: React.MouseEvent, params?: { plan?: string; billing?: string; mode?: 'login' | 'register' }) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ isBn, theme, onPortalClick }) => {
  const isLight = theme === 'light';

  return (
    <section id="top" className="relative pt-8 pb-16 md:pt-16 md:pb-24 overflow-hidden">
      {/* Subtle Ambient Light Accents */}
      <div className={`absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] blur-[90px] rounded-full pointer-events-none -z-10 ${
        isLight ? 'bg-emerald-400/15' : 'bg-emerald-500/10'
      }`} />
      <div className={`absolute top-1/3 left-1/4 -translate-x-1/2 w-[400px] h-[250px] blur-[80px] rounded-full pointer-events-none -z-10 ${
        isLight ? 'bg-blue-400/15' : 'bg-blue-500/10'
      }`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lg:col-span-7 text-left space-y-6">
            {/* Badge Pill */}
            <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs sm:text-sm font-bold ${
              isLight
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            }`}>
              <Zap className="w-4 h-4 text-emerald-500" />
              <span>
                {isBn
                  ? 'এন্টারপ্রাইজ ক্লাউড ইআরপি ও হাই-স্পিড পিওএস'
                  : 'Enterprise Cloud ERP & High-Speed POS'}
              </span>
            </div>

            {/* Primary Headline */}
            <h1 className={`text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.12] ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              {isBn ? (
                <>
                  আধুনিক রিটেল ও বাণিজ্যের জন্য{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
                    এক পূর্ণাঙ্গ ইআরপি প্ল্যাটফর্ম
                  </span>
                </>
              ) : (
                <>
                  One Intelligent Platform to Manage Your{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-300 dark:to-cyan-400">
                    Entire Business
                  </span>
                </>
              )}
            </h1>

            {/* Sub-headline */}
            <p className={`text-base sm:text-lg leading-relaxed max-w-2xl ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}>
              {isBn
                ? 'সাব-সেকেন্ড বারকোড বিলিং, এফইএফও ব্যাচ মেয়াদ সুরক্ষা, স্বয়ংক্রিয় ডাবল-এন্ট্রি হিসাব ও মাল্টি-ব্রাঞ্চ ডিস্ট্রিবিউশন—সবকিছু একটি শক্তিশালী সিস্টেমে।'
                : 'Sub-second barcode checkout, automated FEFO batch expiry control, double-entry ledgers, and multi-store replenishment on one unified platform.'}
            </p>

            {/* Call to Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <button
                type="button"
                onClick={(e) => onPortalClick('shop', e, { plan: 'trial', mode: 'register' })}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-base font-bold text-white bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-950/30 hover:shadow-emerald-900/40 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{isBn ? '১৪ দিনের ফ্রি ট্রায়াল শুরু করুন' : 'Start 14-Day Free Trial'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <a
                href="#preview"
                className={`inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl text-base font-semibold border transition-all duration-200 ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-800 hover:border-slate-700'
                }`}
              >
                <span>{isBn ? 'লাইভ ডেমো দেখুন' : 'Explore Live Preview'}</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </a>
            </div>

            {/* Trust Highlights */}
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs sm:text-sm pt-2">
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                  {isBn ? 'ক্রেডিট কার্ড ছাড়া ইনস্ট্যান্ট সেটআপ' : 'No credit card required'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                  {isBn ? '১০০% অফলাইনেও সচল পিওএস' : '100% offline-ready POS'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                  {isBn ? 'বাংলা ও ইংরেজি সম্পূর্ণ ইন্টারফেস' : 'Native Bangla & English'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 3D WebGL Canvas Scene */}
          <div className="lg:col-span-5 relative flex items-center justify-center">
            <div className="w-full h-[380px] sm:h-[450px] relative rounded-2xl overflow-hidden flex items-center justify-center">
              <ThreeHeroScene className="w-full h-full" />
              
              {/* Overlay Stat Pill floating over 3D Scene */}
              <div className={`absolute bottom-4 left-4 right-4 p-3.5 rounded-xl border backdrop-blur-md flex items-center justify-between text-xs ${
                isLight 
                  ? 'bg-white/90 border-slate-200 text-slate-800 shadow-lg' 
                  : 'bg-slate-900/90 border-slate-800 text-slate-200 shadow-2xl'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold">
                    {isBn ? 'সাব-সেকেন্ড বারকোড টার্মিনাল' : 'Sub-Second Barcode Till Engine'}
                  </span>
                </div>
                <span className="font-mono text-emerald-500 font-bold">&lt; 0.3s Latency</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live POS Dashboard Preview Card (Direct Below Hero Grid) */}
        <div className="mt-12 sm:mt-16 max-w-5xl mx-auto">
          <div className={`relative rounded-2xl border overflow-hidden backdrop-blur-md transition-all ${
            isLight
              ? 'bg-white border-slate-200 shadow-xl'
              : 'bg-slate-900/90 border-slate-800 shadow-2xl shadow-black/60'
          }`}>
            {/* Top Mock Window Bar */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${
              isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/80 border-slate-800'
            }`}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500" />
                <div className="w-3 h-3 rounded-full bg-amber-500" />
                <div className="w-3 h-3 rounded-full bg-emerald-500" />
                <span className={`text-xs ml-2 font-mono font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  bizora-terminal-v2.9.4 • Main Outlet
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  isLight
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                }`}>
                  <Wifi className="w-3 h-3" />
                  <span>{isBn ? 'লোকাল ও ক্লাউড সিঙ্ক সচল' : 'Local & Cloud Synced'}</span>
                </span>
              </div>
            </div>

            {/* Dashboard Content Mock */}
            <div className="p-4 sm:p-6 space-y-6">
              {/* Quick Stat Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className={`p-4 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}>
                  <div className={`text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isBn ? 'আজকের বিক্রি' : "Today's Gross Sales"}
                  </div>
                  <div className={`text-xl sm:text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    ৳ 84,250
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-1 font-semibold">
                    ↑ 18.4% vs yesterday
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}>
                  <div className={`text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isBn ? 'মোট বিল' : 'Invoices Settled'}
                  </div>
                  <div className={`text-xl sm:text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    186
                  </div>
                  <div className={`text-[11px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Avg: ৳453 / bill
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}>
                  <div className={`text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isBn ? 'এফইএফও মনিটর্ড লট' : 'Monitored Batches'}
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-emerald-600">
                    1,420
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-1 font-semibold">
                    Zero Spoilage
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800/80'
                }`}>
                  <div className={`text-xs mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {isBn ? 'ক্যাশড্রয়ার ব্যালেন্স' : 'Drawer Float'}
                  </div>
                  <div className={`text-xl sm:text-2xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    ৳ 24,600
                  </div>
                  <div className="text-[11px] text-emerald-600 mt-1 font-semibold">
                    100% Balanced
                  </div>
                </div>
              </div>

              {/* Live POS Bill Ledger View */}
              <div className={`rounded-xl border p-4 overflow-hidden ${
                isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-slate-950/70 border-slate-800/80'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-500" />
                    <span className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                      {isBn ? 'কাউন্টার চেকআউট লাইভ স্ট্রিম' : 'Live Counter Checkout Stream'}
                    </span>
                  </div>
                  <span className={`text-xs font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Terminal 01 • Instant Scan
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className={`border-b ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
                        <th className="pb-2 font-semibold">{isBn ? 'ইনভয়েস' : 'Invoice'}</th>
                        <th className="pb-2 font-semibold">{isBn ? 'আইটেম ও ব্যাচ' : 'Items & Batch'}</th>
                        <th className="pb-2 font-semibold">{isBn ? 'পেমেন্ট মেথড' : 'Payment Tender'}</th>
                        <th className="pb-2 font-semibold text-right">{isBn ? 'মূল্য' : 'Total'}</th>
                        <th className="pb-2 font-semibold text-right">{isBn ? 'স্ট্যাটাস' : 'Status'}</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-slate-800/60 text-slate-300'}`}>
                      <tr>
                        <td className="py-2.5 font-mono text-emerald-600 font-bold">#INV-10492</td>
                        <td className="py-2.5">
                          <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Fortune Basmati 5kg (Lot: FB-884)</div>
                          <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Exp: 14 Dec 2027 • FEFO Auto-Selected</div>
                        </td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-semibold">
                            bKash Merchant
                          </span>
                        </td>
                        <td className={`py-2.5 text-right font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>৳ 840.00</td>
                        <td className="py-2.5 text-right">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                            Settled
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-mono text-emerald-600 font-bold">#INV-10491</td>
                        <td className="py-2.5">
                          <div className={`font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>Napa Extra 500mg (10 Strips)</div>
                          <div className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Lot: NP-2049 • Verified Genuine</div>
                        </td>
                        <td className="py-2.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] font-semibold">
                            Cash Tender
                          </span>
                        </td>
                        <td className={`py-2.5 text-right font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>৳ 250.00</td>
                        <td className="py-2.5 text-right">
                          <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
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
