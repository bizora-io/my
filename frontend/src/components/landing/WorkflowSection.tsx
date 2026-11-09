import React from 'react';
import { 
  CheckCircle2, ArrowRight, Store, Boxes, 
  Zap, BookOpen, BarChart3 
} from 'lucide-react';

interface WorkflowSectionProps {
  isBn: boolean;
  theme: 'light' | 'dark';
}

export const WorkflowSection: React.FC<WorkflowSectionProps> = ({ isBn, theme }) => {
  const isLight = theme === 'light';

  const steps = [
    {
      num: '01',
      icon: Store,
      title: isBn ? '২ মিনিটে স্টোর সেটআপ' : '2-Minute Store Setup',
      desc: isBn
        ? 'আপনার ব্যবসার নাম দিন, শাখা আউটলেট এবং ক্যাশবাক্স তৈরি করুন। সিএসভি ফাইলের মাধ্যমে এক ক্লিকে পূর্বের সব পণ্য ইমপোর্ট করুন।'
        : 'Register your business, define store outlets, and configure cashboxes. Import existing inventory catalog instantly via CSV.',
    },
    {
      num: '02',
      icon: Boxes,
      title: isBn ? 'বারকোড ও ব্যাচ ইনওয়ার্ড' : 'Inward Stock & Batches',
      desc: isBn
        ? 'পণ্য রিসিভ করার সময় বারকোড রিড করুন, লট নম্বর ও মেয়াদোত্তীর্ণ তারিখ এন্ট্রি দিন। সিস্টেম অটোমেটিক রি-অর্ডার লিমিট সংরক্ষণ করবে।'
        : 'Scan barcodes during delivery inwarding, record lot numbers and expiration dates, and configure low-stock safety thresholds.',
    },
    {
      num: '03',
      icon: Zap,
      title: isBn ? 'কাউন্টার পিওএস সেলস' : 'Sub-Second POS Till',
      desc: isBn
        ? 'কাস্টমারের পণ্য দ্রুত স্ক্যান করুন, নগদ ও বিকাশে স্প্লিট পেমেন্ট গ্রহণ করুন এবং থার্মাল রসিদ প্রিন্ট করে বিদায় জানান।'
        : 'Scan items with zero lag, accept split cash and mobile money tenders, and print 58mm/80mm thermal receipts instantly.',
    },
    {
      num: '04',
      icon: BookOpen,
      title: isBn ? 'অটোমেটিক লেজার পোস্টিং' : 'Automated Ledger Journals',
      desc: isBn
        ? 'বিক্রির সাথে সাথেই আর্থিক জার্নাল পোস্টিং সম্পন্ন হয়। এনবিআর মূসক ৯.১ ভ্যাট রিটার্ন এবং ক্যাশবাক্স ব্যালেন্স স্বয়ংক্রিয় প্রস্তুত থাকে।'
        : 'Every sale automatically posts balanced debits and credits. Reconcile till floats and review NBR Net VAT 9.1 returns instantly.',
    },
    {
      num: '05',
      icon: BarChart3,
      title: isBn ? 'মাল্টি-ব্রাঞ্চ গ্রোথ ও অডিট' : 'Multi-Store Scale & Audit',
      desc: isBn
        ? 'সেন্ট্রাল গুদাম থেকে শাখায় গেটপাস দিয়ে স্টক পাঠান। রিয়েল-টাইম গ্রস মার্জিন ড্যাশবোর্ড থেকে ব্যবসার সর্বোচ্চ লাভ নিশ্চিত করুন।'
        : 'Replenish branch outlets with verified gate passes, track in-transit stock, and review consolidated margin reports from anywhere.',
    },
  ];

  return (
    <section 
      id="workflow" 
      className={`py-20 sm:py-28 border-t transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/40 border-slate-800/80 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 sm:mb-16">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 border ${
            isLight
              ? 'bg-blue-50 text-blue-800 border-blue-200'
              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{isBn ? 'সহজ ৫-ধাপের বাস্তবায়ন' : '5-Step Implementation Pipeline'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            {isBn
              ? 'প্রথম দিন থেকেই নির্বিঘ্ন অপারেশন'
              : 'From Setup to Counter Billing in Hours, Not Weeks'}
          </h2>
          <p className={`text-base sm:text-lg ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {isBn
              ? 'জটিল কনফিগারেশন ছাড়াই আধুনিক রিটেল ও ডিস্ট্রিবিউশন ওয়ার্কফ্লো বাস্তবায়ন করুন।'
              : 'Replace disjointed spreadsheets and fragile software with a clear, reliable operational pipeline.'}
          </p>
        </div>

        {/* 5-Step Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {steps.map((st, idx) => {
            const Icon = st.icon;
            return (
              <div
                key={idx}
                className={`relative rounded-2xl border p-6 flex flex-col justify-between transition-all group ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white shadow-sm hover:shadow-md'
                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-2xl font-black font-mono transition-colors ${
                      isLight ? 'text-slate-400 group-hover:text-emerald-600' : 'text-slate-700 group-hover:text-emerald-400'
                    }`}>
                      {st.num}
                    </span>
                    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                      isLight
                        ? 'bg-white border-slate-200 text-slate-700 group-hover:text-emerald-600 group-hover:border-emerald-300'
                        : 'bg-slate-900 border-slate-800 text-slate-300 group-hover:text-emerald-400 group-hover:border-emerald-500/30'
                    }`}>
                      <Icon className="w-4 h-4" />
                    </div>
                  </div>

                  <h3 className={`text-base font-bold mb-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {st.title}
                  </h3>

                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    {st.desc}
                  </p>
                </div>

                <div className={`pt-4 mt-4 border-t text-[11px] font-mono font-bold flex items-center gap-1 ${
                  isLight ? 'border-slate-200 text-emerald-700' : 'border-slate-900 text-emerald-400'
                }`}>
                  <span>{isBn ? 'ধাপ সম্পূর্ণ' : 'Ready out-of-the-box'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WorkflowSection;
