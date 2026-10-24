import React from 'react';
import LegalLayout from './LegalLayout';
import { RotateCcw, CheckCircle2, ShieldCheck, Clock, Download, AlertCircle } from 'lucide-react';
import { SEOHead } from '../common/SEOHead';

export const RefundPolicyPage: React.FC = () => {
  return (
    <LegalLayout activeKey="refunds">
      <SEOHead
        title="Refund & Cancellation Policy — Bizora SaaS ERP"
        description="Confirmed subscription renewal cancellation terms, billing cycle guidelines, and refund eligibility rules for Bizora ERP subscriptions."
        canonicalUrl="/legal/refund-cancellation"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Legal & Trust', item: '/legal' },
          { name: 'Refund & Cancellation', item: '/legal/refund-cancellation' },
        ]}
      />
      <div className="space-y-10">
        {/* Document Header */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Fair Commerce & Transparency</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Refund & Cancellation Policy</h1>
          <p className="text-xs text-slate-400 mt-2">
            Last Updated: January 1, 2026 · Plain Language Terms · 14-Day Free Evaluation Guarantee
          </p>
        </div>

        {/* 14-Day Pro Trial Highlight Box */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>14-Day Risk-Free Pro Evaluation</span>
            </div>
            <p className="text-xs text-slate-300 max-w-xl">
              Every new Bizora workspace automatically starts with a 14-day Pro tier trial. You get full access to multi-branch management, POS, inventory, and payroll without providing a credit card. No unexpected charges ever occur.
            </p>
          </div>
          <div className="text-center sm:text-right shrink-0">
            <span className="text-2xl font-black text-white">৳0</span>
            <p className="text-[11px] text-slate-400">Zero Payment Required</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="prose prose-invert max-w-none space-y-8 text-slate-300 text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">1.</span> Free Trial Experience
            </h2>
            <p>
              We believe merchants should evaluate Bizora in their real retail environments—testing barcode scanners, POS receipt printers, and multi-staff accounts—before making a financial commitment. During the 14-day trial period, all enterprise features are active. If you choose not to subscribe, your account transitions to read-only status with zero automated billing.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">2.</span> Cancellation Policy
            </h2>
            <p>
              You may cancel your paid subscription at any time directly through the Shop Owner Settings dashboard under the <strong className="text-white">Subscription Management</strong> section.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-slate-400">
              <li><strong>Zero Termination Penalties:</strong> We do not assess cancellation fees or lock merchants into punitive contracts.</li>
              <li><strong>End of Period Access:</strong> When you cancel, your workspace remains fully operational through the end of your current paid billing period (monthly or annual).</li>
              <li><strong>30-Day Read-Only Window:</strong> Following subscription expiration, your workspace enters a 30-day read-only safety mode, allowing you to access historic records and complete data export.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">3.</span> Refund Policy & Eligibility
            </h2>
            <p>
              Because all merchants receive a 14-day unrestricted trial to test compatibility with hardware and workflow requirements, recurring monthly subscription fees are generally non-refundable once billed. However, we maintain fair exceptions:
            </p>
            <div className="space-y-3 pl-4 border-l-2 border-emerald-500/30">
              <div>
                <h3 className="font-semibold text-white text-base">A. 7-Day Initial Subscription Guarantee</h3>
                <p className="text-xs text-slate-400 mt-1">
                  If you purchase a paid subscription for the first time and experience an unresolved critical software defect that prevents business operation, you may request a 100% full refund within seven (7) calendar days of initial billing.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">B. Annual Plan Pro-Rata Credits</h3>
                <p className="text-xs text-slate-400 mt-1">
                  If an annual subscriber must close their business within the first 90 days, we can calculate a pro-rata refund for the remaining unused full months, calculated based on standard monthly pricing.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">C. Duplicate or Erroneous Charges</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Any accidental duplicate charges resulting from network timeouts or gateway errors are refunded immediately upon verification within 24-48 business hours.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">4.</span> Complete Data Export Guarantee
            </h2>
            <p>
              Prior to cancelling your account, we encourage you to download your complete commercial archive. Bizora provides 1-click export tools in Settings for:
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-medium text-white">Full General Ledger</div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-medium text-white">Sales & VAT Invoices</div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-medium text-white">Product Inventory & Barcodes</div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 font-medium text-white">Customer Due Ledgers</div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">5.</span> How to Submit a Refund Request
            </h2>
            <p>
              To initiate a refund inquiry, contact our billing desk with your registered workspace phone number, transaction receipt reference, and business name:
            </p>
            <p className="text-xs text-cyan-300 font-mono">
              Email: billing@bizora.app.io · Average Response: Under 4 business hours
            </p>
          </section>

        </div>
      </div>
    </LegalLayout>
  );
};
export default RefundPolicyPage;

