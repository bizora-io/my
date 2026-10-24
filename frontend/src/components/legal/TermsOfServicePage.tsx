import React from 'react';
import LegalLayout from './LegalLayout';
import { FileText, CheckCircle2, AlertTriangle, Scale, Clock, ShieldCheck } from 'lucide-react';

export const TermsOfServicePage: React.FC = () => {
  return (
    <LegalLayout activeKey="terms">
      <div className="space-y-10">
        {/* Document Header */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">
            <FileText className="w-3.5 h-3.5" />
            <span>Master Service Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Terms of Service</h1>
          <p className="text-xs text-slate-400 mt-2">
            Last Updated: January 1, 2026 · Standard Commercial SaaS Terms · Governs Workspace Access
          </p>
        </div>

        {/* Content Body */}
        <div className="prose prose-invert max-w-none space-y-8 text-slate-300 text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">1.</span> Agreement & Acceptance
            </h2>
            <p>
              By accessing, browsing, registering for an account, or subscribing to Bizora Cloud Platform (&ldquo;Service&rdquo;), you (&ldquo;Customer&rdquo;, &ldquo;Merchant&rdquo;, or &ldquo;User&rdquo;) agree to be bound by these Terms of Service. If you are entering into this agreement on behalf of a business, corporation, or partnership, you represent that you hold the legal authority to bind that entity.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">2.</span> Workspace Licensing & Multi-Store Entitlements
            </h2>
            <p>
              Bizora grants you a non-exclusive, non-transferable, subscription-based license to access and utilize our ERP cloud software during your active billing interval. Your subscription plan determines your usage boundaries:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="font-bold text-white">Starter Plan</p>
                <p className="text-slate-400 mt-1">Single store location, up to 5 user accounts, 10 employees, and basic POS/inventory modules.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="font-bold text-white">Pro Plan</p>
                <p className="text-slate-400 mt-1">Up to 5 store branches, 25 user seats, 50 employees, FEFO batch tracking, and courier automations.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="font-bold text-white">Enterprise Plan</p>
                <p className="text-slate-400 mt-1">Unlimited branches, unlimited staff, dedicated database capacity, and custom API integration limits.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">3.</span> Service Availability & 99.9% Uptime SLA
            </h2>
            <p>
              We commit to maintaining a target monthly Service Availability of <strong className="text-white">99.9%</strong> across core transaction endpoints, excluding scheduled maintenance windows announced at least 48 hours in advance.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-slate-400">
              <li>Our POS terminal is architected with offline-first local storage, allowing sales registration, invoice printing, and barcode scanning during local Internet outages.</li>
              <li>Network status and incident reports are transparently tracked via our infrastructure monitors.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">4.</span> Merchant Responsibilities & Account Security
            </h2>
            <p>
              As the workspace owner, you are solely responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-slate-400">
              <li>Safeguarding master administrative credentials, staff PIN codes, and two-factor authentication tokens.</li>
              <li>Assigning appropriate role permissions (Cashier, Accountant, Branch Manager) to prevent unauthorized internal actions.</li>
              <li>Ensuring that commercial goods, pharmaceuticals, food items, and retail inventories cataloged on the platform comply with local regulatory standards.</li>
              <li>Promptly notifying Bizora security operations if an unauthorized account compromise is detected.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">5.</span> Data Ownership & Intellectual Property
            </h2>
            <p>
              <strong className="text-white">You retain 100% exclusive ownership of your customer, transaction, and financial data.</strong> Bizora acquires no proprietary rights or copyright in any tenant content uploaded to the service. Bizora retains all intellectual property rights in the software codebase, trademarks, 3D interfaces, and algorithmic designs.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">6.</span> Subscription Billing, Renewals & Upgrades
            </h2>
            <p>
              Subscriptions are billed in advance on either a monthly or discounted annual cycle. Upgrades take effect immediately with pro-rated billing adjustment. Failure to complete subscription renewal after payment retries will downgrade the workspace to read-only archival mode for 30 days before suspension.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">7.</span> Limitation of Liability & Governing Law
            </h2>
            <p>
              To the maximum extent permitted by applicable law, in no event shall Bizora be liable for indirect, punitive, or consequential damages, including lost profits or business interruptions. Total aggregate liability under this agreement is strictly limited to the fees paid by Customer to Bizora in the twelve (12) months preceding the incident.
            </p>
          </section>

        </div>
      </div>
    </LegalLayout>
  );
};
export default TermsOfServicePage;

