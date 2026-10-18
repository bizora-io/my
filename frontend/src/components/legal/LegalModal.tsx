import React, { useState, useEffect } from 'react';
import {
  Shield,
  FileText,
  Lock,
  Cookie,
  RotateCcw,
  Trash2,
  X,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Mail,
  Scale,
  Database
} from 'lucide-react';

export type LegalDocType = 'privacy' | 'terms' | 'cookies' | 'refunds' | 'security' | 'deletion';

interface LegalModalProps {
  isOpen: boolean;
  initialDoc?: LegalDocType;
  onClose: () => void;
  isBn?: boolean;
}

export const LegalModal: React.FC<LegalModalProps> = ({
  isOpen,
  initialDoc = 'privacy',
  onClose,
  isBn = false,
}) => {
  const [activeDoc, setActiveDoc] = useState<LegalDocType>(initialDoc);

  useEffect(() => {
    if (initialDoc) {
      setActiveDoc(initialDoc);
    }
  }, [initialDoc, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const DOCS = [
    { id: 'privacy', label: isBn ? 'গোপনীয়তা নীতি' : 'Privacy Policy', icon: Shield },
    { id: 'terms', label: isBn ? 'ব্যবহারের শর্তাবলী' : 'Terms of Service', icon: FileText },
    { id: 'cookies', label: isBn ? 'কুকি পলিসি' : 'Cookie Policy', icon: Cookie },
    { id: 'refunds', label: isBn ? 'রিফান্ড ও বাতিল' : 'Refund & Cancellation', icon: RotateCcw },
    { id: 'security', label: isBn ? 'ডাটা নিরাপত্তা' : 'Data Security', icon: Lock },
    { id: 'deletion', label: isBn ? 'ডাটা ও অ্যাকাউন্ট ডিলিট' : 'Account Deletion', icon: Trash2 },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl h-[90vh] bg-[#0e0e12] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <span>Bizora ERP</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
                  {isBn ? 'আইনি ও নীতি বিষয়ক নথি' : 'Legal & Compliance Documents'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {isBn
                  ? 'মাল্টি-টেন্যান্ট ক্লাউড ইআরপি প্ল্যাটফর্ম পরিচালনা ও নীতি'
                  : 'Authoritative policies governing the Bizora Multi-Tenant SaaS ERP platform'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Close legal modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex overflow-x-auto border-b border-white/10 bg-black/20 px-6 py-2.5 gap-2 scrollbar-none">
          {DOCS.map((doc) => {
            const Icon = doc.icon;
            const isActive = activeDoc === doc.id;
            return (
              <button
                key={doc.id}
                type="button"
                onClick={() => setActiveDoc(doc.id as LegalDocType)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-amber-400 text-black shadow-md shadow-amber-400/20 font-black'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{doc.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 text-sm text-slate-300 leading-relaxed font-normal">
          
          {/* NOTICE BADGE */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-300 mb-0.5">
                {isBn ? 'বাস্তব প্ল্যাটফর্ম নীতির সারসংক্ষেপ' : 'Authoritative Legal Notice & Operating Context'}
              </span>
              <span>
                {isBn
                  ? 'এই নথিগুলি Bizora ERP-র বাস্তব টেকনিক্যাল আর্কিটেকচার (মাল্টি-টেন্যান্ট ফায়ারস্টোর ডাটাবেজ, অফলাইন IndexedDB ক্যাশ, রোল-ভিত্তিক এক্সেস ও সাবস্ক্রিপশন নিয়ম) অনুসারে প্রস্তুত করা হয়েছে। আনুষ্ঠানিক কর্পোরেট তথ্য: [ব্যবসায়িক নিবন্ধিত সত্ত্বার নাম] ও [রেজিস্ট্রেশন নম্বর] চূড়ান্ত প্রকাশের পূর্বে বিজনেস ওনার দ্বারা নিশ্চিতযোগ্য।'
                  : 'These policies reflect Bizora ERP\'s verified multi-tenant cloud architecture, client-side offline IndexedDB caching, Firebase authentication, and subscription enforcement rules. Formal corporate identifiers: [Business Legal Entity Name] and [Registered Jurisdiction] are subject to final business owner confirmation.'}
              </span>
            </div>
          </div>

          {/* 1. PRIVACY POLICY */}
          {activeDoc === 'privacy' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl font-black text-white">
                  {isBn ? 'Bizora ERP গোপনীয়তা নীতি (Privacy Policy)' : 'Bizora ERP Privacy Policy'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isBn ? 'কার্যকর তারিখ: অক্টোবর ২০২৬' : 'Effective Date: October 2026 | Platform Version: 2.0.0'}
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">1. Information We Collect</h4>
                <p>
                  Bizora operates as a multi-tenant business management and ERP system. To deliver services, we process the following categories of information:
                </p>
                <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400">
                  <li><strong>Account & Store Credentials:</strong> Business name, owner mobile number, email address, password hashes (Argon2id/bcrypt), and role assignments.</li>
                  <li><strong>Operational Business Data:</strong> Product catalog, inventory stock counts, barcode serials (IMEI/serials), batch expiry dates, supplier details, purchase orders, sales receipts, and quotations.</li>
                  <li><strong>Customer & Transactional Records:</strong> Customer names, phone numbers for SMS receipt delivery, credit sales ledgers, installment schedules, and loyalty points.</li>
                  <li><strong>Audit & Security Logs:</strong> Staff checkout timestamps, register drawer openings, price voids, soft-delete actions, and IP addresses.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">2. Multi-Tenant Isolation & Storage Security</h4>
                <p>
                  Every subscriber store operates within a strictly partitioned tenant boundary (<code className="text-amber-300">businesses/:businessId</code>). Server-side authorization tokens and Firebase Admin security rules prevent cross-tenant data leakage. 
                </p>
                <p>
                  In offline mode, local transactions are stored securely in client-side IndexedDB and encrypted storage. When internet access resumes, records synchronize to cloud databases over TLS 1.3 encrypted sockets and REST channels with automated conflict resolution.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">3. Use of Information</h4>
                <p>We use operational data solely to:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
                  <li>Provide real-time point-of-sale billing, inventory decrement, and financial ledger postings.</li>
                  <li>Generate VAT returns (Mushak 9.1), day-close cashbox digests, and profit/loss statements.</li>
                  <li>Power the in-app context-aware Bizora ERP Assistant for authorized owners and managers.</li>
                  <li>Transmit delivery orders to courier partners (e.g., Pathao, Steadfast) when initiated by the store owner.</li>
                </ul>
                <p><strong>We do not sell, rent, or monetize your business or customer data.</strong></p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">4. Third-Party Integrations & Couriers</h4>
                <p>
                  When store owners enable e-commerce or SMS features, essential dispatch data (recipient address, phone number, and COD amount) is shared strictly with the configured courier API or SMS gateway provider for parcel delivery and customer notification.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">5. Tenant Data Rights & Export</h4>
                <p>
                  Shop owners retain 100% ownership of their data. At any time, you can perform a complete tenant export (<code className="text-amber-300">Settings &gt; Data Export</code>) generating downloadable JSON, CSV, and Excel spreadsheets of all products, transactions, and customer ledgers.
                </p>
              </section>
            </div>
          )}

          {/* 2. TERMS OF SERVICE */}
          {activeDoc === 'terms' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl font-black text-white">
                  {isBn ? 'ব্যবহারের শর্তাবলী (Terms of Service)' : 'Bizora ERP Terms of Service'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {isBn ? 'কার্যকর তারিখ: অক্টোবর ২০২৬' : 'Last Updated: October 2026'}
                </p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">1. Acceptance of Terms & Licensing</h4>
                <p>
                  By registering or subscribing to Bizora ERP, you enter into a binding agreement to use the software according to your subscribed package limits (stores, staff users, products, and monthly invoices). You receive a non-transferable, multi-tenant license to operate retail, inventory, and accounting operations.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">2. Subscription Tiers & Resource Limits</h4>
                <p>
                  Subscriptions are billed in advance on a recurring monthly or yearly cycle. Each plan enforces system boundaries verified by the backend:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
                  <li><strong>Store Limits:</strong> The maximum number of physical outlets and warehouses permitted.</li>
                  <li><strong>Staff Accounts:</strong> Active user seats authorized to sign in under your store tenant.</li>
                  <li><strong>Product Catalog & Invoices:</strong> Monthly transaction thresholds supported by your tier.</li>
                </ul>
                <p>Attempts to circumvent plan limits via unauthorized API scripting may result in automatic rate-limiting or package upgrade prompts.</p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">3. Renewal, Billing & Grace Period</h4>
                <p>
                  Subscriptions automatically renew at the end of each billing cycle. If payment processing fails, Bizora extends a <strong>7-day operational grace period</strong> during which all point-of-sale and store operations continue uninterrupted. If payment is not resolved within 7 days, accounts transition to restricted read-only mode until settled.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">4. Acceptable Use Policy</h4>
                <p>You agree not to:</p>
                <ul className="list-disc pl-5 space-y-1 text-xs text-slate-400">
                  <li>Use the ERP to process fraudulent transactions or illicit goods prohibited by applicable law.</li>
                  <li>Reverse engineer, disassemble, or tamper with the proprietary client or server source code.</li>
                  <li>Conduct unauthorized vulnerability scans or load tests against Bizora infrastructure.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">5. Service Availability & Offline Resiliency</h4>
                <p>
                  Bizora is architected with offline-first capabilities. In the event of internet service provider downtime or cloud maintenance, local point-of-sale billing, barcode printing, and cash registers continue without interruption. Cloud services target a 99.9% uptime SLA.
                </p>
              </section>
            </div>
          )}

          {/* 3. COOKIE & LOCAL STORAGE POLICY */}
          {activeDoc === 'cookies' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl font-black text-white">
                  {isBn ? 'কুকি ও লোকাল স্টোরেজ পলিসি (Cookie Policy)' : 'Cookie & Client Storage Policy'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Platform Storage Disclosure</p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">1. Essential Client-Side Storage</h4>
                <p>
                  Bizora avoids intrusive tracking cookies. We utilize strictly necessary browser storage mechanisms to maintain session security and offline functionality:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-2">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-bold text-amber-300 block mb-1">bizora_token &amp; bizora_refresh_token</span>
                    <span className="text-slate-400">Secure tokens stored in localStorage to preserve authenticated session state and rotate JWTs without forcing frequent logins.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-bold text-amber-300 block mb-1">IndexedDB Offline Queue</span>
                    <span className="text-slate-400">Local database cache storing offline sales, customer dues, and inventory counts until network connectivity is established.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-bold text-amber-300 block mb-1">bizora_lang &amp; bizora_theme</span>
                    <span className="text-slate-400">Stores your preferred UI language (English/Bangla) and light/dark appearance preference.</span>
                  </div>
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                    <span className="font-bold text-amber-300 block mb-1">bizora_selected_plan</span>
                    <span className="text-slate-400">Temporarily preserves selected subscription package and billing cycle during signup navigation.</span>
                  </div>
                </div>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">2. No Third-Party Advertising Trackers</h4>
                <p>
                  Bizora contains zero third-party advertising cookies, behavioural cross-site tracking beacons, or commercial retargeting pixels.
                </p>
              </section>
            </div>
          )}

          {/* 4. REFUND & CANCELLATION */}
          {activeDoc === 'refunds' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl font-black text-white">
                  {isBn ? 'রিফান্ড ও সাবস্ক্রিপশন বাতিল নীতি (Refund Policy)' : 'Refund & Cancellation Policy'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Fair Billing Guarantee</p>
              </div>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">1. 14-Day Risk-Free Trial</h4>
                <p>
                  Supported packages offer an initial 14-day free trial requiring zero upfront credit card commitment. You may explore point-of-sale, inventory, reporting, and ERP modules without financial obligation.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">2. Monthly Subscription Cancellations</h4>
                <p>
                  You may cancel your monthly subscription at any time via the Shop Owner billing settings. Upon cancellation, your access remains active through the remainder of the current prepaid billing period. No further renewals will be charged.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">3. Yearly Subscription Prorated Refunds</h4>
                <p>
                  If an annual subscription is cancelled within the first 30 days due to verified service incompatibility or technical disruption, a prorated refund for the unused months may be requested via an administrative support ticket.
                </p>
              </section>

              <section className="space-y-2">
                <h4 className="font-bold text-white text-base">4. Plan Upgrades & Immediate Proration</h4>
                <p>
                  When upgrading from Basic to Pro or Enterprise, the unused portion of your existing payment is automatically calculated and credited towards the new package price.
                </p>
              </section>
            </div>
          )}

          {/* 5. DATA SECURITY & ENCRYPTION */}
          {activeDoc === 'security' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl font-black text-white">
                  {isBn ? 'ডাটা নিরাপত্তা ও প্ল্যাটফর্ম সুরক্ষা (Data Security)' : 'Data Security & Processing Architecture'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Enterprise-Grade Security Baseline</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-300">
                    <Lock className="w-4 h-4" /> TLS 1.3 Transmission
                  </div>
                  <p className="text-slate-400">All data exchanged between client browsers, POS barcode scanners, and the cloud API is encrypted in transit using TLS 1.3 / HTTPS.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-400">
                    <Database className="w-4 h-4" /> Automated Encrypted Backups
                  </div>
                  <p className="text-slate-400">Database snapshots are automatically generated and encrypted at rest with point-in-time recovery to protect against accidental corruption.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-sky-400">
                    <Shield className="w-4 h-4" /> Tamper-Evident Audit Trails
                  </div>
                  <p className="text-slate-400">Every sensitive action (cash voids, price edits, staff logins) is immutably logged with actor ID, timestamp, and IP address.</p>
                </div>

                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-purple-400">
                    <RotateCcw className="w-4 h-4" /> 30-Day Recycle Bin Safety
                  </div>
                  <p className="text-slate-400">Accidentally deleted products, invoices, or customer entries are soft-deleted and can be recovered within 30 days before permanent purging.</p>
                </div>
              </div>
            </div>
          )}

          {/* 6. ACCOUNT & DATA DELETION */}
          {activeDoc === 'deletion' && (
            <div className="space-y-6">
              <div className="border-b border-white/10 pb-4">
                <h3 className="text-xl font-black text-white">
                  {isBn ? 'ডাটা ও অ্যাকাউন্ট মুছে ফেলার নির্দেশিকা (Account Deletion)' : 'Account & Data Deletion Instructions'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Tenant Self-Service Control</p>
              </div>

              <section className="space-y-3">
                <p>
                  As an authorized Shop Owner, you have complete sovereignty over your store\'s data. To permanently delete your account and business records, follow this verified procedure:
                </p>

                <div className="space-y-3 pt-2 text-xs">
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-black flex items-center justify-center shrink-0">1</span>
                    <div>
                      <strong className="text-white block mb-0.5">Export Your Data (Recommended)</strong>
                      <span className="text-slate-400">Navigate to <code className="text-amber-300">Settings &gt; System &gt; Data Export</code>. Download your complete historical ledger, product inventory, and customer statements as JSON or Excel files.</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-black flex items-center justify-center shrink-0">2</span>
                    <div>
                      <strong className="text-white block mb-0.5">Submit Deletion Request</strong>
                      <span className="text-slate-400">Go to <code className="text-amber-300">Settings &gt; Account &gt; Delete Business Account</code> or submit a support ticket marked "Account Deletion". Confirm with your owner password.</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-black font-black flex items-center justify-center shrink-0">3</span>
                    <div>
                      <strong className="text-white block mb-0.5">30-Day Grace & Permanent Purge</strong>
                      <span className="text-slate-400">Your account will immediately unpublish and suspend public access. A 30-day safety cooling period applies, after which all tenant records (<code className="text-amber-300">businesses/:businessId</code>), staff tokens, and backup files are permanently purged.</span>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-400" />
            <span>Bizora ERP Platform · Multi-Tenant Cloud Architecture</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white/10 hover:bg-white text-white hover:text-black font-bold transition-all"
          >
            {isBn ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>

      </div>
    </div>
  );
};

