import React from 'react';
import { 
  Store, Boxes, Shirt, Smartphone, HeartPulse, 
  Building2, Check, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { PortalType } from '../../lib/domainRouter';

interface IndustrySolutionsSectionProps {
  isBn: boolean;
  onPortalClick: (portal: PortalType, e: React.MouseEvent, params?: { plan?: string; billing?: string; mode?: 'login' | 'register' }) => void;
}

export const IndustrySolutionsSection: React.FC<IndustrySolutionsSectionProps> = ({
  isBn,
  onPortalClick,
}) => {
  const industries = [
    {
      id: 'retail',
      icon: Store,
      title: isBn ? 'রিটেল ও সুপারশপ' : 'Retail & Supermarket',
      tag: isBn ? 'হাই-স্পিড পিওএস ও ক্যাশবাক্স' : 'High-Speed POS & Till Cashbox',
      desc: isBn
        ? 'কাউন্টারে দ্রুততম বারকোড স্ক্যানিং, ক্যাশ ড্রয়ার ব্যালেন্স অডিট এবং একাধিক মাধ্যমে স্প্লিট পেমেন্ট গ্রহণ করুন।'
        : 'Accelerate checkout queues with sub-second barcode scans, shift till reconciliation, and multi-tender split payments.',
      bullets: isBn
        ? [
            'ইউএসবি ও ব্লুটুথ বারকোড রিডার কম্প্যাটিবল',
            'নগদ, কার্ড ও মোবাইল ব্যাংকিং স্প্লিট বিলিং',
            '৫৮ ও ৮০ মিমি থার্মাল রসিদ অটো প্রিন্ট',
          ]
        : [
            'Compatible with standard USB & Bluetooth scanners',
            'Split payments across cash, card, and mobile banking',
            'Automated 58mm & 80mm ESC/POS receipt printing',
          ],
    },
    {
      id: 'grocery',
      icon: Boxes,
      title: isBn ? 'গ্রোসারি ও ফ্রেশ ফুড' : 'Grocery & Fresh Produce',
      tag: isBn ? 'এফইএফও ব্যাচ ও ওজন স্কেল' : 'FEFO Rotation & Scale Barcodes',
      desc: isBn
        ? 'ডিজিটাল ওজন স্কেলের বারকোড ডিকোড করুন এবং আগে মেয়াদ শেষ হওয়া পণ্য আগে বিক্রির (FEFO) মাধ্যমে অপচয় রোধ করুন।'
        : 'Decode weight-embedded EAN-13 barcodes from digital scales and enforce FEFO batch rotation to eliminate spoilage.',
      bullets: isBn
        ? [
            'ডিজিটাল ওজন স্কেল EAN-13 বারকোড ডিকোডিং',
            'মেয়াদোত্তীর্ণ পণ্য বিক্রিতে স্বয়ংক্রিয় সিস্টেম লক',
            '৩০/৬০/৯০ দিনের মেয়াদের আগাম রাডার ড্যাশবোর্ড',
          ]
        : [
            'Digital scale EAN-13 price/weight embedded decoding',
            'Hard system lock preventing sale of expired items',
            '30/60/90-day proactive expiry radar alerts',
          ],
    },
    {
      id: 'fashion',
      icon: Shirt,
      title: isBn ? 'ফ্যাশন, বুটিক ও জুতো' : 'Fashion & Footwear Boutique',
      tag: isBn ? 'সাইজ, রঙ ও ভ্যারিয়েন্ট ম্যাট্রিক্স' : 'Size, Color & Variant Matrix',
      desc: isBn
        ? 'একই পোশাকের ভিন্ন ভিন্ন সাইজ ও রঙের স্টক নিখুঁতভাবে পরিচালনা করুন এবং কাস্টম স্টিকার বারকোড প্রিন্ট করুন।'
        : 'Manage matrix variants for apparel across sizes, colors, and cuts with custom barcode label generation.',
      bullets: isBn
        ? [
            'সাইজ ও কালার ভ্যারিয়েন্ট অনুযায়ী আলাদা স্টক',
            'কাস্টম বারকোড লেবেল ও স্টিকার প্রিন্টিং',
            'সিজনাল ডিসকাউন্ট ও বান্ডেল অফার কনফিগারেশন',
          ]
        : [
            'Multi-dimensional inventory across size and color',
            'Custom thermal barcode label generation & printing',
            'Seasonal markdown campaigns and bundle discounts',
          ],
    },
    {
      id: 'electronics',
      icon: Smartphone,
      title: isBn ? 'ইলেকট্রনিক্স ও মোবাইল' : 'Electronics & Mobile Stores',
      tag: isBn ? 'আইএমইআই ও সিরিয়াল নম্বর ট্র্যাকিং' : 'IMEI & Serial Number Warranty',
      desc: isBn
        ? 'প্রতিটি ফোনের ইউনিক আইএমইআই (IMEI) ও সিরিয়াল নম্বর ট্র্যাক করুন এবং বিলে ওয়ারেন্টি কন্ডিশন প্রিন্ট করুন।'
        : 'Track individual device IMEI and serial numbers from supplier delivery to customer sale with warranty printouts.',
      bullets: isBn
        ? [
            'প্রতিটি ইউনিটের ইউনিক আইএমইআই/সিরিয়াল ট্র্যাকিং',
            'রসিদে স্বয়ংক্রিয় ওয়ারেন্টি পলিসি প্রিন্ট',
            'সার্ভিসিং জব-কার্ড ও রিপেয়ার ট্র্যাকিং ব্যবস্থা',
          ]
        : [
            'Unique serialized and IMEI tracking per piece',
            'Automated warranty terms on customer invoices',
            'Service repair ticketing and job-card tracking',
          ],
    },
    {
      id: 'pharmacy',
      icon: HeartPulse,
      title: isBn ? 'ফার্মেসি ও স্বাস্থ্যসেবা' : 'Pharmacy & Healthcare',
      tag: isBn ? 'মেডিসিন লট ও জেনেরিক বিকল্প' : 'Drug Batch & Generic Lookup',
      desc: isBn
        ? 'ওষুধের ব্যাচ নম্বর ট্র্যাকিং, মেয়াদোত্তীর্ণ ওষুধ বিক্রিতে ১০০% লক এবং প্রেসক্রিপশনের বিকল্প জেনেরিক ওষুধ খুঁজে বের করুন।'
        : 'Strict pharmaceutical lot tracking, generic molecule substitution lookups, and supplier return credit management.',
      bullets: isBn
        ? [
            'মেডিসিন ব্যাচ ও ম্যানুফ্যাকচারিং ডেট ম্যানেজমেন্ট',
            'জেনেরিক গ্রুপের বিকল্প ব্র্যান্ড অনুসন্ধানের সুবিধা',
            'মেয়াদোত্তীর্ণ ওষুধ সাপ্লায়ার রিটার্ন ভাউচার প্রস্তুতকরণ',
          ]
        : [
            'Strict medicine batch & expiry enforcement',
            'Generic molecule alternative search engine',
            'Supplier expiry claims and credit debit slips',
          ],
    },
    {
      id: 'wholesale',
      icon: Building2,
      title: isBn ? 'হোলসেল ও ডিস্ট্রিবিউশন' : 'Wholesale & B2B Distribution',
      tag: isBn ? 'কার্টন ইনওয়ার্ড ও কাস্টমার লেজার' : 'Bulk Cartons & Customer Ledgers',
      desc: isBn
        ? 'মাস্টার কার্টনে পণ্য রিসিভ করুন, খুচরা শাখায় গেটপাস দিয়ে সরবরাহ করুন এবং কাস্টমার বকেয়ার বয়স বিশ্লেষণ করুন।'
        : 'Inward master bulk cartons, dispatch inter-branch transfers with gate passes, and track B2B receivable aging.',
      bullets: isBn
        ? [
            'কার্টন থেকে পিস ইউনিটে স্বয়ংক্রিয় মূল্য কনভার্সন',
            'শাখাগুলোর মধ্যে ট্রান্সফার গেটপাস ট্র্যাকিং',
            'কাস্টমার বকেয়া (Receivable Aging) ড্যাশবোর্ড',
          ]
        : [
            'Carton-to-piece automatic conversion pricing',
            'Inter-branch dispatch gate pass verification',
            'Customer accounts receivable aging analysis',
          ],
    },
  ];

  return (
    <section id="solutions" className="py-20 sm:py-28 border-t border-slate-800/80 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <Store className="w-3.5 h-3.5" />
            <span>{isBn ? 'ব্যবসায়িক সমাধান' : 'Tailored Industry Solutions'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            {isBn
              ? 'আপনার ব্যবসার নির্দিষ্ট চাহিদায় বিশেষভাবে উপযোগী'
              : 'Engineered for the Exact Demands of Your Trade'}
          </h2>
          <p className="text-base sm:text-lg text-slate-400">
            {isBn
              ? 'সাধারণ কোনো টেমপ্লেট নয়। রিটেল, ফার্মেসি, গ্রোসারি কিংবা ফ্যাশন—প্রতিটি বাণিজ্যের রয়েছে নিজস্ব বিশেষায়িত ওয়ার্কফ্লো।'
              : 'Generic accounting software fails modern commerce. Bizora adapts to the specific compliance and checkout flows of your industry.'}
          </p>
        </div>

        {/* 6 Industry Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {industries.map((ind) => {
            const Icon = ind.icon;
            return (
              <div
                key={ind.id}
                className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-8 backdrop-blur-sm hover:border-slate-700 hover:bg-slate-900/90 transition-all duration-200 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-emerald-400 mb-5 group-hover:scale-105 group-hover:bg-emerald-500/10 transition-all">
                    <Icon className="w-6 h-6" />
                  </div>

                  <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-400/90 font-mono">
                    {ind.tag}
                  </span>

                  <h3 className="text-xl font-bold text-white mt-1 mb-3">
                    {ind.title}
                  </h3>

                  <p className="text-sm text-slate-300 leading-relaxed mb-6">
                    {ind.desc}
                  </p>

                  <div className="space-y-2.5 pt-4 border-t border-slate-800/80">
                    {ind.bullets.map((bullet, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-400">
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{bullet}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800/60">
                  <button
                    type="button"
                    onClick={(e) => onPortalClick('shop', e, { plan: 'trial', mode: 'register' })}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <span>{isBn ? 'এই সলিউশনটি শুরু করুন' : 'Launch for this industry'}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default IndustrySolutionsSection;
