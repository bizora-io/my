import React from 'react';
import LegalLayout from './LegalLayout';
import { Shield, Lock, Server, CheckCircle2, AlertCircle, FileText, Mail } from 'lucide-react';
import { SEOHead } from '../common/SEOHead';

export const PrivacyPolicyPage: React.FC = () => {
  return (
    <LegalLayout activeKey="privacy">
      <SEOHead
        title="Privacy Policy — Bizora SaaS ERP"
        description="Learn how Bizora collects, stores, processes, and protects your business records, personal credentials, and customer transaction data."
        canonicalUrl="/legal/privacy-policy"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Legal & Trust', item: '/legal' },
          { name: 'Privacy Policy', item: '/legal/privacy-policy' },
        ]}
      />
      <div className="space-y-10">
        {/* Document Header */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Shield className="w-3.5 h-3.5" />
            <span>Binding Privacy Commitment</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-slate-400 mt-2">
            Effective Date: January 1, 2026 · Version 2.4 · Applicable to Bizora Cloud, POS Terminals & Mobile Portals
          </p>
        </div>

        {/* Content Body */}
        <div className="prose prose-invert max-w-none space-y-8 text-slate-300 text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">1.</span> Introduction & Multi-Tenant Philosophy
            </h2>
            <p>
              Bizora (&ldquo;Platform&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, or &ldquo;our&rdquo;) operates an enterprise multi-tenant software-as-a-service (SaaS) platform providing point of sale, double-entry financial accounting, FEFO warehouse inventory management, customer relationship management (CRM), and digital storefront commerce to businesses worldwide.
            </p>
            <p>
              We recognize that your commercial data—including sales logs, supplier agreements, profit margins, employee rosters, and customer transactions—represents sensitive intellectual property. Our architecture is engineered around the principle of <strong className="text-white">Strict Structural Multi-Tenant Isolation</strong>. Your business records are completely partitioned from other businesses and are never aggregated, monetized, or shared with third parties for marketing purposes.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">2.</span> Information We Collect and Process
            </h2>
            <div className="space-y-3 pl-4 border-l-2 border-cyan-500/30">
              <div>
                <h3 className="font-semibold text-white text-base">A. Account & Profile Information</h3>
                <p className="text-xs text-slate-400 mt-1">
                  When a Shop Owner registers a workspace, we collect business name, business category, business address, owner full name, authorized email address, mobile contact number, and hashed authentication credentials.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">B. Tenant Operational & Financial Data</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Data entered into the ERP, including products, batch numbers, expiration dates, cost of goods sold (COGS), purchase orders, customer ledgers, daily sales receipts, tax/VAT withholdings, and employee payroll slips.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">C. Employee & End-User Access Records</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Employee names, mobile numbers, assigned roles (Cashier, Accountant, Manager, Admin), cryptographic PINs, branch assignments, audit logs of transaction approvals, and timestamped shift activity.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-white text-base">D. POS Customer & Storefront Records</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Retail buyer names, delivery phone numbers, courier addresses, reward loyalty point balances, and purchase histories stored under the merchant’s tenant collection.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">3.</span> Storage Architecture & Data Isolation
            </h2>
            <p>
              All tenant business entities are stored in dedicated Firestore subcollection pathways partitioned strictly by <code className="px-2 py-0.5 rounded bg-white/10 text-cyan-300 font-mono text-xs">businesses/&#123;businessId&#125;/&#123;collection&#125;</code>.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-slate-400">
              <li>Database queries are parameterized with immutable business scoping enforced at both the API gateway and Firestore security rule layers.</li>
              <li>Administrative access by Bizora engineering personnel requires strict multi-factor authentication, cryptographic audit trails, and explicit merchant authorization for support intervention.</li>
              <li>Data is encrypted in transit using Transport Layer Security (TLS 1.3) with HSTS enabled, and encrypted at rest utilizing AES-256 GCM encryption.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">4.</span> Trusted Sub-Processors & Integrations
            </h2>
            <p>
              To deliver high-availability cloud services, Bizora engages certified enterprise sub-processors under strict Data Protection Agreements:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="font-bold text-white text-xs">Google Cloud Platform & Firebase</p>
                <p className="text-[11px] text-slate-400">Database hosting, auth services, and global CDN caching.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="font-bold text-white text-xs">Vercel Inc.</p>
                <p className="text-[11px] text-slate-400">Edge compute runtime, SSL termination, and static asset distribution.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="font-bold text-white text-xs">Twilio & Resend</p>
                <p className="text-[11px] text-slate-400">Transactional SMS OTP and security notification delivery.</p>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                <p className="font-bold text-white text-xs">Stripe Payments</p>
                <p className="text-[11px] text-slate-400">PCI-DSS Level 1 compliant subscription processing. We never store credit cards.</p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">5.</span> Data Retention & Right to be Forgotten
            </h2>
            <p>
              We retain business operational data for as long as your workspace subscription remains active. Upon voluntary workspace cancellation or account deletion request:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-slate-400">
              <li>Merchants retain immediate access to export all accounting journals, invoices, and inventories in CSV and JSON formats.</li>
              <li>A 30-day safety grace period protects against accidental or malicious deletion.</li>
              <li>Following the grace window, all subcollections, credentials, and cached assets are permanently expunged from production databases and rolling backup cycles within 90 days.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">6.</span> Data Protection Officer & Inquiries
            </h2>
            <p>
              If you have inquiries regarding GDPR, CCPA, or regional data compliance, contact our dedicated data privacy office:
            </p>
            <div className="p-4 rounded-xl bg-blue-950/30 border border-blue-500/20 flex items-center gap-3">
              <Mail className="w-5 h-5 text-cyan-400" />
              <div>
                <p className="text-xs font-bold text-white">Bizora Privacy & Data Protection Office</p>
                <p className="text-xs text-cyan-300">privacy@bizora.app.io · Dhaka, Bangladesh</p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </LegalLayout>
  );
};
export default PrivacyPolicyPage;

