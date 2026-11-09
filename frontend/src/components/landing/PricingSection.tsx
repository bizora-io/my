import React from 'react';
import { 
  Check, ArrowRight, Sparkles, Crown, Shield, 
  HelpCircle, ChevronRight, Layers 
} from 'lucide-react';
import { formatPlanLimit } from './LandingPage';

interface PricingSectionProps {
  isBn: boolean;
  theme: 'light' | 'dark';
  plans: any[];
  isLoading: boolean;
  billingCycle: 'monthly' | 'yearly';
  onBillingCycleChange: (cycle: 'monthly' | 'yearly') => void;
  onSelectPlan: (plan: any) => void;
  onOpenPlanDetails: (plan: any) => void;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  isBn,
  theme,
  plans,
  isLoading,
  billingCycle,
  onBillingCycleChange,
  onSelectPlan,
  onOpenPlanDetails,
}) => {
  const isLight = theme === 'light';

  return (
    <section 
      id="pricing" 
      className={`py-20 sm:py-28 border-t transition-colors duration-200 ${
        isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950 border-slate-800/80 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4 border ${
            isLight
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isBn ? 'স্বচ্ছ ও সাশ্রয়ী প্যাকেজ' : 'Transparent & Predictable Pricing'}</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            {isBn
              ? 'আপনার ব্যবসার আকারের সাথে মানানসই প্ল্যান'
              : 'Predictable Pricing Engineered to Scale With You'}
          </h2>
          <p className={`text-base sm:text-lg ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {isBn
              ? 'কোনো গোপন চার্জ নেই। ১৪ দিনের সম্পূর্ণ ফ্রি ট্রায়াল দিয়ে নিজেই যাচাই করুন।'
              : 'Zero hidden fees or transaction surcharges. Start with a 14-day free trial on any plan.'}
          </p>

          {/* Billing Cycle Toggle */}
          <div className={`mt-8 inline-flex items-center p-1 rounded-xl border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'
          }`}>
            <button
              type="button"
              onClick={() => onBillingCycleChange('monthly')}
              className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                billingCycle === 'monthly'
                  ? isLight ? 'bg-slate-100 text-slate-900 shadow-sm' : 'bg-slate-800 text-white shadow-sm'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isBn ? 'মাসিক বিলিং' : 'Monthly Billing'}
            </button>
            <button
              type="button"
              onClick={() => onBillingCycleChange('yearly')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                billingCycle === 'yearly'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{isBn ? 'বার্ষিক বিলিং' : 'Annual Billing'}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-bold border border-emerald-500/30">
                {isBn ? '২০% ছাড়' : 'Save 20%'}
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 items-stretch">
          {plans.map((plan) => {
            const isPopular = plan.isPopular || plan.id === 'pro';
            const monthlyPrice = Number(plan.monthlyPrice ?? plan.price) || 0;
            const yearlyPrice = Number(plan.yearlyPrice) || (monthlyPrice > 0 ? monthlyPrice * 10 : 0);
            const isFree = monthlyPrice === 0 && yearlyPrice === 0;

            const displayPrice = isFree
              ? 0
              : billingCycle === 'yearly' && yearlyPrice > 0
              ? yearlyPrice
              : monthlyPrice;

            const periodText = isFree
              ? (isBn ? '১৪ দিনের জন্য ফ্রি' : '14 Days Free')
              : billingCycle === 'yearly' && yearlyPrice > 0
              ? (isBn ? '/ বছর' : '/ year')
              : (isBn ? '/ মাস' : '/ month');

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl flex flex-col justify-between transition-all duration-200 ${
                  isPopular
                    ? isLight
                      ? 'border-2 border-emerald-600 bg-white p-6 sm:p-7 shadow-xl ring-2 ring-emerald-500/20'
                      : 'border-2 border-emerald-500/80 bg-gradient-to-b from-slate-900/95 to-slate-950 p-6 sm:p-7 shadow-2xl shadow-emerald-950/40 ring-1 ring-emerald-500/30'
                    : isLight
                    ? 'border border-slate-200 bg-white p-6 sm:p-7 shadow-sm hover:shadow-md hover:border-slate-300'
                    : 'border border-slate-800/80 bg-slate-900/60 p-6 sm:p-7 hover:border-slate-700'
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[11px] font-black bg-emerald-600 text-white uppercase tracking-wider shadow-md">
                    {isBn ? 'সবচেয়ে জনপ্রিয়' : 'Most Popular'}
                  </div>
                )}

                <div>
                  {/* Plan Title & Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={`text-xl font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{plan.name}</h3>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {plan.badge || plan.id}
                    </span>
                  </div>

                  {/* Plan Description */}
                  <p className={`text-xs min-h-[36px] mb-5 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className={`mb-6 pb-6 border-b ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-3xl sm:text-4xl font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {isFree ? (isBn ? 'ফ্রি' : 'Free') : `৳ ${displayPrice.toLocaleString()}`}
                      </span>
                      <span className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{periodText}</span>
                    </div>
                    {billingCycle === 'yearly' && monthlyPrice > 0 && yearlyPrice > 0 && (
                      <div className="text-[11px] text-emerald-600 mt-1 font-bold">
                        {isBn
                          ? `মাসিক মাত্র ৳ ${Math.round(yearlyPrice / 12).toLocaleString()} সমমান`
                          : `Equivalent to ৳${Math.round(yearlyPrice / 12).toLocaleString()}/mo`}
                      </div>
                    )}
                  </div>

                  {/* Quantitative Plan Limits */}
                  <div className={`space-y-2.5 text-xs mb-6 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    <div className={`flex items-center justify-between py-1 border-b ${isLight ? 'border-slate-100' : 'border-slate-800/50'}`}>
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>{isBn ? 'শাখা স্টোর' : 'Store Outlets'}</span>
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {formatPlanLimit(plan, 'limitStores', isBn)}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between py-1 border-b ${isLight ? 'border-slate-100' : 'border-slate-800/50'}`}>
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>{isBn ? 'ইউজার লগইন' : 'Staff Users'}</span>
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {formatPlanLimit(plan, 'limitUsers', isBn)}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between py-1 border-b ${isLight ? 'border-slate-100' : 'border-slate-800/50'}`}>
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>{isBn ? 'পণ্য লিমিট' : 'Product SKUs'}</span>
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {formatPlanLimit(plan, 'limitProducts', isBn)}
                      </span>
                    </div>
                    <div className={`flex items-center justify-between py-1 border-b ${isLight ? 'border-slate-100' : 'border-slate-800/50'}`}>
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>{isBn ? 'মাসিক ইনভয়েস' : 'Monthly Invoices'}</span>
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {formatPlanLimit(plan, 'limitInvoices', isBn)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-1">
                      <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>{isBn ? 'সেন্ট্রাল গুদাম' : 'Warehouses'}</span>
                      <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {formatPlanLimit(plan, 'limitWarehouses', isBn)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className={`space-y-2.5 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
                  <button
                    type="button"
                    onClick={() => onSelectPlan(plan)}
                    className={`w-full py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isPopular
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg'
                        : isLight
                        ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
                        : 'bg-slate-800 hover:bg-slate-700 text-white'
                    }`}
                  >
                    <span>
                      {isFree
                        ? (isBn ? 'ফ্রি ট্রায়াল শুরু করুন' : 'Start Free Trial')
                        : (isBn ? 'প্ল্যানটি বেছে নিন' : 'Choose Plan')}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onOpenPlanDetails(plan)}
                    className={`w-full py-2 text-center text-xs font-semibold transition-colors ${
                      isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {isBn ? 'সকল ফিচার ও মডিউল দেখুন' : 'View Full Feature Details'}
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

export default PricingSection;
