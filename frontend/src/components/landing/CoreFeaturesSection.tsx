import React, { useState } from 'react';
import { 
  Zap, Boxes, BookOpen, Building, BarChart3, 
  Check, ArrowRight, ShieldCheck, Printer, Clock, Database 
} from 'lucide-react';

interface CoreFeaturesSectionProps {
  isBn: boolean;
}

export const CoreFeaturesSection: React.FC<CoreFeaturesSectionProps> = ({ isBn }) => {
  const [activeTab, setActiveTab] = useState<'pos' | 'fefo' | 'finance' | 'branches' | 'analytics'>('pos');

  const tabs = [
    {
      id: 'pos' as const,
      name: isBn ? 'হাই-স্পিড পিওএস' : 'High-Speed POS',
      icon: Zap,
      badge: isBn ? '< ০.৩ সেকেন্ডে স্ক্যান' : '< 0.3s Scan Time',
    },
    {
      id: 'fefo' as const,
      name: isBn ? 'এফইএফও ব্যাচ ও মেয়াদ' : 'FEFO Batch & Expiry',
      icon: Boxes,
      badge: isBn ? 'জিরো মেয়াদোত্তীর্ণ অপচয়' : 'Zero Expiry Loss',
    },
    {
      id: 'finance' as const,
      name: isBn ? 'ডাবল-এন্ট্রি ও ভ্যাট' : 'Double-Entry & VAT',
      icon: BookOpen,
      badge: isBn ? 'অটো লেজার পোস্টিং' : 'Instant Journals',
    },
    {
      id: 'branches' as const,
      name: isBn ? 'মাল্টি-ব্রাঞ্চ নেটওয়ার্ক' : 'Multi-Store Network',
      icon: Building,
      badge: isBn ? 'গেট পাস ট্র্যাকিং' : 'Gate Pass Sync',
    },
    {
      id: 'analytics' as const,
      name: isBn ? 'রিয়েল-টাইম অ্যানালিটিক্স' : 'Profit Intelligence',
      icon: BarChart3,
      badge: isBn ? 'লাইভ মার্জিন রাডার' : 'Live Margin Audit',
    },
  ];

  const content = {
    pos: {
      title: isBn ? 'দ্রুততম চেকআউট ও ক্যাশড্রয়ার ব্যালেন্সিং' : 'Sub-Second Barcode Till & Split Tenders',
      description: isBn
        ? 'কাউন্টারে কাস্টমারদের দীর্ঘ লাইন বন্ধ করুন। যেকোনো ইউএসবি বা ওয়্যারলেস বারকোড স্ক্যানার দিয়ে স্ক্যান করুন, ক্যাশড্রয়ার ব্যালেন্স মেলাতে শিফট রিকনসিলিয়েশন চালান এবং একই বিলে নগদ, কার্ড ও বিকাশ স্প্লিট পেমেন্ট গ্রহণ করুন।'
        : 'Eliminate counter checkout queues. Scan products with zero lag using standard USB or wireless barcode readers, reconcile drawer floats during cashier shift handovers, and accept split tenders (Cash, Card, bKash, Nagad) in a single bill.',
      features: isBn
        ? [
            'এক সেকেন্ডের কম সময়ে বারকোড রিডিং ও ইনস্ট্যান্ট কার্ট',
            'নগদ, কার্ড এবং এমএফএস (বিকাশ/নগদ) স্প্লিট পেমেন্ট',
            'ক্যাশিয়ার শিফট ওপেনিং ও ক্লোজিং ব্যালেন্স অডিট',
            '৫৮ মিমি ও ৮০ মিমি থার্মাল রসিদ অটো প্রিন্ট',
            'ইন্টারনেট সংযোগ বিচ্ছিন্ন থাকলেও নির্বিঘ্নে অফলাইন বিলিং',
          ]
        : [
            'Sub-second barcode scan response and instantaneous cart assembly',
            'Split tender settlement across Cash, Debit Card, and Mobile Money',
            'Cashier shift opening & closing cash drawer float reconciliation',
            'Direct 58mm & 80mm ESC/POS thermal receipt auto-printing',
            'Fully uninterrupted offline billing with seamless cloud sync',
          ],
      metric: { val: '< 0.3s', label: isBn ? 'বারকোড স্ক্যান ল্যাটেন্সি' : 'Barcode Scan Latency' },
      detailTag: 'Point of Sale Engine',
    },
    fefo: {
      title: isBn ? 'এফইএফও ব্যাচ ট্র্যাকিং ও মেয়াদ সুরক্ষা' : 'Automated FEFO Rotation & Spoilage Prevention',
      description: isBn
        ? 'যেসব পণ্যের মেয়াদ আগে শেষ হবে, সিস্টেম স্বয়ংক্রিয়ভাবে পিওএস বিলে সেই ব্যাচ আগে বরাদ্দ করে। ৩০, ৬০ ও ৯০ দিনের আগাম মেয়াদ সতর্কতা পান এবং মেয়াদোত্তীর্ণ পণ্য বিক্রিতে নিশ্চিত অটো-লক বলবৎ রাখুন।'
        : 'Bizora automatically allocates the earliest expiring stock lot during checkout (First-Expired, First-Out). Gain proactive 30, 60, and 90-day radar warnings to discount aging inventory or claim vendor credits before spoilage occurs.',
      features: isBn
        ? [
            'ইনস্ট্যান্ট লট নম্বর ও মেয়াদোত্তীর্ণ তারিখ এন্ট্রি',
            'পিওএসে স্বয়ংক্রিয় এফইএফও ব্যাচ ডিডাকশন অ্যালগরিদম',
            '৩০/৬০/৯০ দিনের মেয়াদের আগাম রাডার ড্যাশবোর্ড',
            'মেয়াদোত্তীর্ণ পণ্য বিক্রিতে কঠোর সিস্টেম লকআউট',
            'ডিজিটাল ওজন স্কেলের EAN-13 বারকোড ডিকোডিং',
          ]
        : [
            'Lot number, manufacturing, and expiry inwarding at goods delivery',
            'Automated FEFO oldest-expiry allocation algorithm at POS',
            'Proactive 30/60/90-day expiry warning dashboard',
            'Hard lockout preventing checkout of expired inventory batches',
            'Digital weighing scale barcode decoding (EAN-13 weight embedded)',
          ],
      metric: { val: '100%', label: isBn ? 'মেয়াদোত্তীর্ণ অপচয় রোধ' : 'Spoilage Protection' },
      detailTag: 'Batch & Expiry Matrix',
    },
    finance: {
      title: isBn ? 'অটোমেটেড ডাবল-এন্ট্রি লেজার ও এনবিআর ভ্যাট' : 'Real-Time Double-Entry Ledgers & Net VAT',
      description: isBn
        ? 'বিল সম্পন্ন হওয়া মাত্রই পেছনের ব্যাকগ্রাউন্ডে নির্ভুল ডাবল-এন্ট্রি আর্থিক জার্নাল তৈরি হয়। ক্যাশবাক্স, ব্যাংকিং ও কাস্টমার বকেয়া স্বয়ংক্রিয়ভাবে সমন্বিত হয় এবং এনবিআর মূসক ৯.১ ভ্যাট রিটার্ন প্রস্তুত থাকে।'
        : 'Every settled invoice immediately commits balanced double-entry accounting journals without manual spreadsheet export. Reconcile cash drawers, track supplier payables, and generate NBR Net VAT 9.1 return schedules automatically.',
      features: isBn
        ? [
            'বিক্রির সাথে সাথেই ব্যালেন্সড ডাবল-এন্ট্রি জার্নাল পোস্টিং',
            'কাস্টমার বকেয়া (Receivables) ও সাপ্লায়ার দেনা ট্র্যাকিং',
            'অটোমেটেড ইনকাম স্টেটমেন্ট, ব্যালেন্স শিট ও লাভ-ক্ষতি হিসাব',
            'এনবিআর মূসক ৯.১ রেডি ইনপুট ও আউটপুট ভ্যাট রিপোর্ট',
            'দৈনিক ক্যাশবাক্স ক্লোজিং ও ভাউচার অ্যাপ্রুভাল সিস্টেম',
          ]
        : [
            'Instant balanced journal entry posting at receipt generation',
            'Customer accounts receivable aging and supplier payables ledger',
            'Automated Income Statement, Balance Sheet, and Trial Balance',
            'NBR-compliant VAT 9.1 input/output tax reconciliation',
            'Daily cashbox float closing and multi-level expense approvals',
          ],
      metric: { val: 'Zero', label: isBn ? 'ম্যানুয়াল লেজার ভুলের সম্ভাবনা' : 'Manual Reconciliation Gap' },
      detailTag: 'Financial Engine',
    },
    branches: {
      title: isBn ? 'মাল্টি-স্টোর ইনভেন্টরি ও ট্রান্সফার গেটপাস' : 'Multi-Store Inventory & Gate Pass Transfers',
      description: isBn
        ? 'একটি সেন্ট্রাল ড্যাশবোর্ড থেকে সব শাখা দোকান ও সেন্ট্রাল ওয়্যারহাউস নিয়ন্ত্রণ করুন। ইন-ট্রানজিট গেটপাস ট্র্যাকিংয়ের মাধ্যমে শাখাগুলোর মধ্যে স্টক ট্রান্সফার নিশ্চিত করুন এবং সমন্বিত লাভ-ক্ষতি পর্যালোচনা করুন।'
        : 'Manage all branch outlets and central distribution warehouses from a unified owner portal. Execute inter-branch inventory transfers with in-transit gate pass verification to eliminate shrinkage between locations.',
      features: isBn
        ? [
            'সেন্ট্রাল গুদাম থেকে শাখায় স্টক ডেসপ্যাচ ও রিসিভিং গেটপাস',
            'ইন-ট্রানজিট পণ্য চলাচলের রিয়েল-টাইম ট্র্যাকিং',
            'শাখাভিত্তিক স্টক লেভেল ও স্বয়ংক্রিয় রি-অর্ডার রিকুইজিশন',
            'সব শাখার একত্রিত ও পৃথক প্রফিট অ্যান্ড লস স্টেটমেন্ট',
            'শাখাভিত্তিক কর্মী অ্যাক্সেস ও সিকিউর রোল পারমিশন',
          ]
        : [
            'Inter-branch stock dispatch with authorized gate pass verification',
            'Real-time tracking of in-transit inventory shipments',
            'Branch-specific reorder points and automated replenishment requests',
            'Consolidated and store-by-store Profit & Loss comparative statements',
            'Granular role-based permissions preventing cross-branch data access',
          ],
      metric: { val: '99.9%', label: isBn ? 'শাখা ট্রান্সফার নির্ভুলতা' : 'Stock Transfer Accuracy' },
      detailTag: 'Distribution Network',
    },
    analytics: {
      title: isBn ? 'মার্জিন অ্যানালিটিক্স ও ব্যবসায়িক ইনসাইটস' : 'Live Gross Margin & Velocity Analytics',
      description: isBn
        ? 'কোন পণ্য সবচেয়ে দ্রুত বিক্রি হচ্ছে আর কোনটিতে মার্জিন সর্বোচ্চ—তা এক নজরে দেখুন। রিয়েল-টাইম প্রফিট মার্জিন ট্র্যাকিং, ডেড-স্টক অ্যানালাইসিস এবং কাস্টমার পারচেজ প্যাটার্ন অ্যানালিটিক্স দিয়ে সিদ্ধান্ত নিন দ্রুত।'
        : 'Gain instant clarity on which products drive your highest gross margins and which stock is sitting idle. Identify customer purchasing patterns, evaluate staff till performance, and project monthly inventory demand.',
      features: isBn
        ? [
            'রিয়েল-টাইম গ্রস প্রফিট ও নেট মার্জিন ক্যালকুলেশন',
            'দ্রুত বিক্রিত (Fast-Moving) বনাম অলস (Slow-Moving) পণ্য ম্যাট্রিক্স',
            'কাস্টমার বকেয়া বার্ধক্য বিশ্লেষণ (Aging Analysis)',
            'ক্যাশিয়ার ও সেলস রিপ্রেজেন্টেটিভ ভিত্তিক পারফরম্যান্স অডিট',
            'এক্সপোর্ট-রেডি এক্সেল ও পিডিএফ বিস্তারিত রিপোর্ট',
          ]
        : [
            'Real-time gross margin and net operating profit computation',
            'Fast-moving vs slow-moving stock velocity matrix',
            'Customer accounts receivable aging and collection tracking',
            'Cashier till velocity and sales representative performance metrics',
            'One-click export to formatted Excel, CSV, and audit-ready PDF',
          ],
      metric: { val: 'Realtime', label: isBn ? 'লাইভ রিপোর্টিং গতি' : 'Data Aggregation Speed' },
      detailTag: 'Executive Intelligence',
    },
  };

  const activeContent = content[activeTab];

  return (
    <section id="features" className="py-20 sm:py-28 border-t border-slate-800/80 bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{isBn ? '৫টি মূল ইঞ্জিন' : '5 Architectural Pillars'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            {isBn
              ? 'বাণিজ্য পরিচালনার সম্পূর্ণ ইঞ্জিন'
              : 'The Core Engine Engineered for Operational Rigor'}
          </h2>
          <p className="text-base sm:text-lg text-slate-400">
            {isBn
              ? 'কাউন্টার সেলস থেকে সেন্ট্রাল অ্যাকাউন্টিং—প্রতিটি বিভাগ সুসংহত ও স্বয়ংক্রিয়।'
              : 'Every business function connects seamlessly without brittle third-party integrations or manual data entry.'}
          </p>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 border ${
                  isActive
                    ? 'bg-slate-900 border-emerald-500/60 text-white shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/30'
                    : 'bg-slate-950 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                <span>{tab.name}</span>
                <span
                  className={`hidden lg:inline-block text-[10px] px-1.5 py-0.5 rounded ${
                    isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Panel */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 sm:p-10 backdrop-blur-sm">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Description Column */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-medium text-emerald-400 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>{activeContent.detailTag}</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {activeContent.title}
              </h3>

              <p className="text-base text-slate-300 leading-relaxed">
                {activeContent.description}
              </p>

              {/* Feature Checklist */}
              <div className="space-y-3 pt-2">
                {activeContent.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3 text-emerald-400" />
                    </div>
                    <span className="text-sm text-slate-300">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Metric Card Column */}
            <div className="lg:col-span-5">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-6 sm:p-8 space-y-6">
                <div>
                  <div className="text-xs uppercase tracking-wider text-slate-500 font-mono mb-2">
                    {isBn ? 'মূল পারফরম্যান্স সূচক' : 'Key Performance Metric'}
                  </div>
                  <div className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
                    {activeContent.metric.val}
                  </div>
                  <div className="text-sm font-medium text-slate-400 mt-1">
                    {activeContent.metric.label}
                  </div>
                </div>

                <div className="border-t border-slate-800/80 pt-6 space-y-3">
                  <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    {isBn ? 'সিস্টেম নির্ভরযোগ্যতা' : 'Platform Architecture'}
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{isBn ? 'অফলাইন মোড' : 'Offline Persistence'}</span>
                    <span className="text-emerald-400 font-medium">{isBn ? 'সক্রিয়' : 'Enabled'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{isBn ? 'টেন্যান্ট আইসোলেশন' : 'Tenant Isolation'}</span>
                    <span className="text-emerald-400 font-medium">Path-Level Strict</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{isBn ? 'ব্যাকআপ শিডিউল' : 'Automated Backups'}</span>
                    <span className="text-slate-300 font-medium">Continuous Cloud</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CoreFeaturesSection;
