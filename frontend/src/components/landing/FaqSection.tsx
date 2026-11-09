import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface FaqSectionProps {
  isBn: boolean;
  theme: 'light' | 'dark';
}

export const FaqSection: React.FC<FaqSectionProps> = ({ isBn, theme }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const isLight = theme === 'light';

  const faqs = [
    {
      q: isBn ? 'বিজোরা ইআরপি আসলে কী এবং কাদের জন্য?' : 'What is Bizora ERP and who is it designed for?',
      a: isBn
        ? 'বিজোরা হলো একটি আধুনিক অল-ইন-ওয়ান ক্লাউড ইআরপি ও পিওএস প্ল্যাটফর্ম। এটি বিশেষত রিটেল চেইন, সুপারশপ, ফার্মেসি, বুটিক, ইলেকট্রনিক্স এবং পাইকারি ডিস্ট্রিবিউশন ব্যবসার জন্য তৈরি—যাতে দ্রুত বারকোড বিলিং, মেয়াদ সুরক্ষা, ডাবল-এন্ট্রি হিসাব এবং মাল্টি-ব্রাঞ্চ সহজেই পরিচালিত হয়।'
        : 'Bizora is an all-in-one cloud business management ERP & POS engineered for retail chains, supermarkets, pharmacies, fashion boutiques, electronics stores, and wholesale distributors. It unifies sub-second barcode checkout, FEFO expiry tracking, double-entry ledgers, and multi-branch distribution.',
    },
    {
      q: isBn ? 'ইন্টারনেট সংযোগ না থাকলে কি কাউন্টারে বিক্রি চলবে?' : 'Does the POS continue working if the internet disconnects?',
      a: isBn
        ? 'হ্যাঁ, শতভাগ। বিজোরার পিওএস টার্মিনাল অফলাইন-ফার্স্ট প্রযুক্তিতে তৈরি। ইন্টারনেট চলে গেলেও কাউন্টারে বারকোড স্ক্যানিং, বিল তৈরি এবং রসিদ প্রিন্ট স্বাভাবিকভাবে চলতে থাকবে। সংযোগ ফিরে আসা মাত্রই সব বিল স্বয়ংক্রিয়ভাবে ক্লাউডে সিঙ্ক হয়ে যাবে।'
        : 'Yes, absolutely. The Bizora POS terminal is built with offline-first local persistence. If your network connection drops, cashiers can continue scanning barcodes, generating bills, and printing thermal receipts without interruption. All invoices sync automatically once connectivity is restored.',
    },
    {
      q: isBn ? 'এফইএফও (FEFO) মেয়াদ সুরক্ষা কীভাবে কাজ করে?' : 'How does FEFO batch and expiry tracking prevent dead stock?',
      a: isBn
        ? 'পণ্য রিসিভ করার সময় সিস্টেম ব্যাচ নম্বর ও মেয়াদ সংরক্ষণ করে। বিক্রির সময়ে পিওএস স্বয়ংক্রিয়ভাবে আগে মেয়াদোত্তীর্ণ হতে চলা লট বরাদ্দ করে। এছাড়াও ৩০/৬০/৯০ দিনের মেয়াদের আগাম রাডার সতর্কতা পাওয়া যায়, যাতে মেয়াদ শেষ হওয়ার আগেই পণ্য বিক্রি বা সাপ্লায়ারকে ফেরত পাঠানো যায়।'
        : 'During goods inwarding, batch lot numbers and expiration dates are recorded. At checkout, Bizora automatically allocates stock from the earliest expiring batch (First-Expired, First-Out). Real-time 30/60/90-day radar alerts ensure you can discount aging items or claim supplier credits before spoilage occurs.',
    },
    {
      q: isBn ? 'একটি অ্যাকাউন্ট থেকে কি একাধিক শাখা দোকান চালানো যাবে?' : 'Can I manage multiple branch stores under a single subscription?',
      a: isBn
        ? 'হ্যাঁ। প্রো এবং এন্টারপ্রাইজ প্ল্যানে আপনি একাধিক শাখা আউটলেট এবং সেন্ট্রাল গুদাম একটি অ্যাকাউন্ট থেকেই পরিচালনা করতে পারবেন। শাখাগুলোর মধ্যে স্টক ট্রান্সফার গেটপাস দিয়ে ট্র্যাক করা যায় এবং সব শাখার একত্রিত লাভ-ক্ষতি হিসাব দেখা যায়।'
        : 'Yes. On Pro and Enterprise plans, you can manage multiple branch outlets and central distribution warehouses under a single owner login. Execute inter-branch inventory transfers with in-transit gate pass verification, and review consolidated Profit & Loss reports.',
    },
    {
      q: isBn ? 'আমাদের পূর্বের সফটওয়্যার বা এক্সেল থেকে পণ্য ইমপোর্ট করা যাবে?' : 'Can I migrate my existing products and customers from Excel?',
      a: isBn
        ? 'হ্যাঁ, খুব সহজেই। বিজোরার সিএসভি বা এক্সেল ইমপোর্টার ব্যবহার করে কয়েক মিনিটের মধ্যে হাজার হাজার পণ্য, প্রারম্ভিক স্টক, বারকোড এবং কাস্টমার তালিকা সরাসরি অ্যাকাউন্টে আপলোড করে নিতে পারবেন।'
        : 'Yes, easily. With Bizora’s bulk CSV/Excel data importer, you can upload thousands of products, opening stock quantities, barcodes, and customer contact records into your account in minutes.',
    },
    {
      q: isBn ? 'আমাদের ব্যবসার আর্থিক ও বিক্রির ডেটা কতটা নিরাপদ?' : 'How is our commercial and financial data secured and isolated?',
      a: isBn
        ? 'বিজোরা কঠোর মাল্টি-টেন্যান্ট আইসোলেশন ও ২৫৬-বিট এসএসএল এনক্রিপশন নীতি মেনে চলে। আপনার প্রতিষ্ঠানের কোনো তথ্য অন্য কোনো প্রতিষ্ঠানের সাথে শেয়ার হয় না। সিস্টেম স্বয়ংক্রিয় ক্লাউড ব্যাকআপ এবং টেম্পার-প্রুফ অডিট লগ সংরক্ষণ করে।'
        : 'Bizora enforces strict tenant data isolation at the database layer and uses 256-bit SSL encryption for all in-transit and at-rest communication. Your data is isolated per tenant organization with continuous automated cloud backups and tamper-evident audit logs.',
    },
    {
      q: isBn ? 'প্যাকেজ পরিবর্তন বা সাবস্ক্রিপশন ক্যানসেল করার নিয়ম কী?' : 'Can I upgrade, downgrade, or cancel my subscription anytime?',
      a: isBn
        ? 'আপনি যেকোনো সময় আপনার ড্যাশবোর্ড থেকে প্ল্যান আপগ্রেড বা পরিবর্তন করতে পারবেন। কোনো দীর্ঘমেয়াদি লক-ইন চুক্তি নেই। আপনি চাইলে যেকোনো মুহূর্তে আপনার ডেটা এক্সেল বা সিএসভিতে ডাউনলোড করে নিতে পারবেন।'
        : 'You can upgrade, downgrade, or switch billing cycles at any time directly from your SaaS billing portal with zero lock-in contracts. You retain 100% ownership of your data and can export comprehensive backups at any time.',
    },
  ];

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section 
      id="faq" 
      className={`py-20 sm:py-28 border-t transition-colors duration-200 ${
        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900/30 border-slate-800/80 text-white'
      }`}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 border ${
            isLight
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{isBn ? 'সাধারণ প্রশ্নোত্তর' : 'Frequently Asked Questions'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            {isBn ? 'সচরাচর জিজ্ঞাসিত প্রশ্নসমূহ' : 'Clear Answers to Business & Technical Questions'}
          </h2>
          <p className={`text-base ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {isBn
              ? 'বিজোরা প্ল্যাটফর্ম নিয়ে আপনার যাবতীয় প্রশ্নের সহজ ও সঠিক উত্তর।'
              : 'Everything you need to know about adoption, offline resilience, and multi-tenant security.'}
          </p>
        </div>

        {/* FAQ Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                key={idx}
                className={`rounded-2xl border transition-colors overflow-hidden ${
                  isLight
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-slate-950/80 border-slate-800/80'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-5 text-left flex items-center justify-between gap-4 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  aria-expanded={isOpen}
                >
                  <span className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {faq.q}
                  </span>
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${
                    isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-emerald-600" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {isOpen && (
                  <div className={`px-6 pb-6 pt-1 text-sm leading-relaxed border-t ${
                    isLight ? 'border-slate-200 text-slate-700' : 'border-slate-900 text-slate-300'
                  }`}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FaqSection;
