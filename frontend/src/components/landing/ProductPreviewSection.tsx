import React, { useState } from 'react';
import { 
  Zap, Boxes, BookOpen, Building, ShieldCheck, 
  CheckCircle2, AlertTriangle, ArrowRight, Printer 
} from 'lucide-react';

interface ProductPreviewSectionProps {
  isBn: boolean;
}

export const ProductPreviewSection: React.FC<ProductPreviewSectionProps> = ({ isBn }) => {
  const [selectedScreen, setSelectedScreen] = useState<'pos' | 'fefo' | 'journal' | 'branches'>('pos');

  return (
    <section id="preview" className="py-20 sm:py-28 border-t border-slate-800/80 bg-slate-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-4">
            <Zap className="w-3.5 h-3.5" />
            <span>{isBn ? 'বাস্তব ইন্টারফেস ডেমো' : 'Authentic Product Interface'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            {isBn ? 'সরাসরি বিজোরা সিস্টেম দেখুন' : 'Explore the Real Bizora Interface'}
          </h2>
          <p className="text-base sm:text-lg text-slate-400">
            {isBn
              ? 'কোন কাল্পনিক গ্রাফিক্স বা ফেক অ্যানিমেশন নয়। আসল বিজোরা স্ক্রিনগুলো নিজেই দেখুন।'
              : 'Zero fabricated marketing graphics. Inspect the actual workflows that power retail counters daily.'}
          </p>
        </div>

        {/* Screen Selection Pills */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-10 overflow-x-auto pb-2 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedScreen('pos')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              selectedScreen === 'pos'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isBn ? '১. টাচ ও বারকোড পিওএস' : '1. Barcode POS Till'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedScreen('fefo')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              selectedScreen === 'fefo'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isBn ? '২. এফইএফও মেয়াদ ম্যাট্রিক্স' : '2. FEFO Expiry Matrix'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedScreen('journal')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              selectedScreen === 'journal'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isBn ? '৩. ডাবল-এন্ট্রি লেজার' : '3. Double-Entry Journal'}
          </button>
          <button
            type="button"
            onClick={() => setSelectedScreen('branches')}
            className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
              selectedScreen === 'branches'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {isBn ? '৪. ব্রাঞ্চ গেটপাস হাব' : '4. Branch Transfer Hub'}
          </button>
        </div>

        {/* Screen Mock Container */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:p-8 shadow-2xl shadow-black/60">
          {/* POS Terminal Screen */}
          {selectedScreen === 'pos' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h4 className="text-lg font-bold text-white">
                    {isBn ? 'কাউন্টার পিওএস ও কুইক-সেল টার্মিনাল' : 'Counter POS & Quick-Sale Terminal'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isBn
                      ? 'বারকোড স্ক্যানার রিড মোড সক্রিয় • কিবোর্ড শর্টকাট সাপোর্টেড (F2 পে, F8 ডিসকাউন্ট)'
                      : 'USB / BT Barcode Scanner Active • Keyboard shortcuts enabled (F2 Pay, F8 Discount)'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-medium">
                  {isBn ? 'অফলাইন ক্যাশে প্রস্তুত' : 'Local IndexedDB Ready'}
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Cart Line Items */}
                <div className="lg:col-span-8 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400">
                        <th className="pb-2 font-medium">{isBn ? 'আইটেম বিবরণ' : 'Item Description'}</th>
                        <th className="pb-2 font-medium">{isBn ? 'ব্যাচ ও মেয়াদ' : 'Batch / Expiry'}</th>
                        <th className="pb-2 font-medium text-center">{isBn ? 'পরিমাণ' : 'Qty'}</th>
                        <th className="pb-2 font-medium text-right">{isBn ? 'দর' : 'Unit Price'}</th>
                        <th className="pb-2 font-medium text-right">{isBn ? 'মোট' : 'Subtotal'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50 text-slate-300">
                      <tr>
                        <td className="py-3 font-medium text-white">Rupchanda Soyabean Oil 5L</td>
                        <td className="py-3 font-mono text-[11px] text-emerald-400">RC-902 (Exp: Dec 2027)</td>
                        <td className="py-3 text-center font-semibold">2</td>
                        <td className="py-3 text-right">৳ 910.00</td>
                        <td className="py-3 text-right font-semibold text-white">৳ 1,820.00</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium text-white">Aarong Dairy Butter 200g</td>
                        <td className="py-3 font-mono text-[11px] text-emerald-400">AR-412 (Exp: Jun 2026)</td>
                        <td className="py-3 text-center font-semibold">3</td>
                        <td className="py-3 text-right">৳ 220.00</td>
                        <td className="py-3 text-right font-semibold text-white">৳ 660.00</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium text-white">Pran Frooto Mango 1L</td>
                        <td className="py-3 font-mono text-[11px] text-emerald-400">PF-118 (Exp: Mar 2027)</td>
                        <td className="py-3 text-center font-semibold">4</td>
                        <td className="py-3 text-right">৳ 95.00</td>
                        <td className="py-3 text-right font-semibold text-white">৳ 380.00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Bill Summary & Split Tender */}
                <div className="lg:col-span-4 rounded-xl border border-slate-800/80 bg-slate-900/60 p-4 space-y-4">
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-400">
                      <span>{isBn ? 'সাবটোটাল' : 'Subtotal'}</span>
                      <span className="font-semibold text-white">৳ 2,860.00</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>{isBn ? 'ভ্যাট (৫%)' : 'Net VAT (5%)'}</span>
                      <span className="text-slate-300">৳ 143.00</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>{isBn ? 'ডিসকাউন্ট' : 'Promotion Discount'}</span>
                      <span className="text-emerald-400">- ৳ 103.00</span>
                    </div>
                    <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                      <span>{isBn ? 'সর্বমোট প্রদেয়' : 'Net Total'}</span>
                      <span className="text-emerald-400">৳ 2,900.00</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 space-y-2">
                    <div className="text-[11px] text-slate-400 font-medium">
                      {isBn ? 'স্প্লিট পেমেন্ট বণ্টন' : 'Split Tender Breakdown'}
                    </div>
                    <div className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-slate-300">Cash Received</span>
                      <span className="font-semibold text-white">৳ 1,500.00</span>
                    </div>
                    <div className="flex items-center justify-between text-xs bg-slate-950 p-2 rounded border border-slate-800">
                      <span className="text-slate-300">bKash QR Settled</span>
                      <span className="font-semibold text-white">৳ 1,400.00</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-2"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>{isBn ? '৮০মিমি রসিদ প্রিন্ট করুন' : 'Print 80mm ESC/POS Receipt'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FEFO Expiry Matrix Screen */}
          {selectedScreen === 'fefo' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h4 className="text-lg font-bold text-white">
                    {isBn ? 'এফইএফও ব্যাচ অডিট ও মেয়াদ রাডার' : 'FEFO Expiry Matrix & Spoilage Radar'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isBn
                      ? 'স্বয়ংক্রিয়ভাবে আগে মেয়াদোত্তীর্ণ হতে চলা লট পিওএসে আগে বিক্রি হয়'
                      : 'Earliest expiring lots are automatically prioritized for cashier checkout'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                  {isBn ? 'জিরো এক্সপায়ারি অপচয়' : 'Zero Expired Waste'}
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2 font-medium">{isBn ? 'পণ্য ও ব্র্যান্ড' : 'Product & Brand'}</th>
                      <th className="pb-2 font-medium">{isBn ? 'ব্যাচ নম্বর' : 'Batch / Lot'}</th>
                      <th className="pb-2 font-medium">{isBn ? 'বর্তমান স্টক' : 'Stock On Hand'}</th>
                      <th className="pb-2 font-medium">{isBn ? 'মেয়াদোত্তীর্ণ তারিখ' : 'Expiry Date'}</th>
                      <th className="pb-2 font-medium">{isBn ? 'অবশিষ্ট দিন' : 'Days Remaining'}</th>
                      <th className="pb-2 font-medium text-right">{isBn ? 'এফইএফও অ্যাকশন' : 'FEFO Action'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    <tr>
                      <td className="py-3 font-medium text-white">Full Cream Milk 1L Box</td>
                      <td className="py-3 font-mono text-slate-400">MK-2041</td>
                      <td className="py-3">48 Units</td>
                      <td className="py-3 text-amber-400">28 Nov 2026</td>
                      <td className="py-3 font-semibold text-amber-400">19 Days</td>
                      <td className="py-3 text-right">
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-medium">
                          Priority 1 • Sell Now
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-white">Full Cream Milk 1L Box</td>
                      <td className="py-3 font-mono text-slate-400">MK-2055</td>
                      <td className="py-3">120 Units</td>
                      <td className="py-3 text-slate-300">15 Jan 2027</td>
                      <td className="py-3 font-semibold text-emerald-400">67 Days</td>
                      <td className="py-3 text-right">
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                          Priority 2 • In Reserve
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 font-medium text-white">Cefixime 200mg Capsules</td>
                      <td className="py-3 font-mono text-slate-400">CF-8910</td>
                      <td className="py-3">500 Strips</td>
                      <td className="py-3 text-emerald-400">30 May 2028</td>
                      <td className="py-3 font-semibold text-emerald-400">560 Days</td>
                      <td className="py-3 text-right">
                        <span className="inline-block px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                          Healthy Lot
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Double-Entry Financial Journal Screen */}
          {selectedScreen === 'journal' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h4 className="text-lg font-bold text-white">
                    {isBn ? 'স্বয়ংক্রিয় ডাবল-এন্ট্রি আর্থিক জার্নাল' : 'Automated Double-Entry Ledger Journal'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isBn
                      ? 'বিক্রির সাথে সাথে ডেবিট ও ক্রেডিট অটো পোস্টিং হয়; ম্যানুয়াল ডেটা এন্ট্রি দরকার নেই'
                      : 'POS invoices immediately post balanced debits and credits to the chart of accounts'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-mono font-medium">
                  Balanced: ৳ 2,900.00
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-slate-900/60 p-4">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400">
                      <th className="pb-2 font-medium">{isBn ? 'অ্যাকাউন্ট কোড' : 'Account Code'}</th>
                      <th className="pb-2 font-medium">{isBn ? 'হিসাবের নাম' : 'Account Title'}</th>
                      <th className="pb-2 font-medium text-right">{isBn ? 'ডেবিট (৳)' : 'Debit (৳)'}</th>
                      <th className="pb-2 font-medium text-right">{isBn ? 'ক্রেডিট (৳)' : 'Credit (৳)'}</th>
                      <th className="pb-2 font-medium">{isBn ? 'রেফারেন্স ভাউচার' : 'Voucher Ref'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-slate-300">
                    <tr>
                      <td className="py-2.5 text-blue-400">1010-01</td>
                      <td className="py-2.5 font-sans font-medium text-white">Till Cashbox Float</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-400">৳ 1,500.00</td>
                      <td className="py-2.5 text-right text-slate-500">—</td>
                      <td className="py-2.5 text-slate-400 font-sans">#INV-10492 Cash</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-blue-400">1020-04</td>
                      <td className="py-2.5 font-sans font-medium text-white">bKash Merchant Clearing</td>
                      <td className="py-2.5 text-right font-semibold text-emerald-400">৳ 1,400.00</td>
                      <td className="py-2.5 text-right text-slate-500">—</td>
                      <td className="py-2.5 text-slate-400 font-sans">TXN: 9KLA0148</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-blue-400">4010-00</td>
                      <td className="py-2.5 font-sans font-medium text-white">Sales Revenue Account</td>
                      <td className="py-2.5 text-right text-slate-500">—</td>
                      <td className="py-2.5 text-right font-semibold text-white">৳ 2,757.00</td>
                      <td className="py-2.5 text-slate-400 font-sans">Auto Revenue</td>
                    </tr>
                    <tr>
                      <td className="py-2.5 text-blue-400">2050-01</td>
                      <td className="py-2.5 font-sans font-medium text-white">NBR Output Net VAT (5%)</td>
                      <td className="py-2.5 text-right text-slate-500">—</td>
                      <td className="py-2.5 text-right font-semibold text-white">৳ 143.00</td>
                      <td className="py-2.5 text-slate-400 font-sans">Form 9.1 Schedule</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Multi-Store Distribution Screen */}
          {selectedScreen === 'branches' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <h4 className="text-lg font-bold text-white">
                    {isBn ? 'মাল্টি-ব্রাঞ্চ স্টক রিকুইজিশন ও গেটপাস হাব' : 'Branch Replenishment & Gate Pass Matrix'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {isBn
                      ? 'সেন্ট্রাল ওয়্যারহাউস থেকে বিভিন্ন শাখায় স্টক স্থানান্তর ও গেটপাস অডিট'
                      : 'Authorized dispatch and arrival verification preventing in-transit loss'}
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                  {isBn ? '৬টি শাখা সংযুক্ত' : '6 Outlets Connected'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Branch 01 • Dhanmondi</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400">Active</span>
                  </div>
                  <div className="text-xl font-bold text-white">৳ 4,82,000</div>
                  <div className="text-xs text-slate-400">Stock Valuation • 3,240 SKUs</div>
                  <div className="text-[11px] text-emerald-400 font-medium">Transfer Inward Verified</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Branch 02 • Uttara</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-400">In-Transit</span>
                  </div>
                  <div className="text-xl font-bold text-white">৳ 3,45,000</div>
                  <div className="text-xs text-slate-400">Stock Valuation • 2,890 SKUs</div>
                  <div className="text-[11px] text-blue-400 font-medium">Gatepass #GP-884 Dispatched</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Central Hub • Tejgaon</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400">Warehouse</span>
                  </div>
                  <div className="text-xl font-bold text-white">৳ 18,90,000</div>
                  <div className="text-xs text-slate-400">Bulk Reserve • 14,200 SKUs</div>
                  <div className="text-[11px] text-slate-400 font-medium">All Requisitions Fulfilled</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductPreviewSection;
