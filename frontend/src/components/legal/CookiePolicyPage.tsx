import React, { useState } from 'react';
import LegalLayout from './LegalLayout';
import { Cookie, Settings2, CheckCircle2, Shield, Info, SlidersHorizontal } from 'lucide-react';
import { SEOHead } from '../common/SEOHead';

export const CookiePolicyPage: React.FC = () => {
  const [prefStatus, setPrefStatus] = useState<string | null>(null);

  const resetPreferences = () => {
    try {
      localStorage.removeItem('bizora_cookie_consent');
      setPrefStatus('Cookie consent preferences have been reset. Reload the page to configure again.');
    } catch {
      setPrefStatus('Failed to update storage.');
    }
  };

  return (
    <LegalLayout activeKey="cookies">
      <SEOHead
        title="Cookie & Tracking Policy — Bizora SaaS ERP"
        description="Understand how Bizora uses essential authentication cookies, local session storage, and security tokens to protect tenant accounts."
        canonicalUrl="/legal/cookie-policy"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Legal & Trust', item: '/legal' },
          { name: 'Cookie Policy', item: '/legal/cookie-policy' },
        ]}
      />
      <div className="space-y-10">
        {/* Document Header */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Cookie className="w-3.5 h-3.5" />
            <span>Browser Storage & Transparency</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Cookie & Storage Policy</h1>
          <p className="text-xs text-slate-400 mt-2">
            Last Updated: January 1, 2026 · Explains Cookies, LocalStorage & IndexedDB Caching
          </p>
        </div>

        {/* Action Callout for User Controls */}
        <div className="p-5 rounded-2xl bg-white/[0.04] border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-400/10 text-amber-400 shrink-0">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Manage Your Cookie Preferences</h3>
              <p className="text-xs text-slate-300">You can adjust or revoke your cookie preferences at any time.</p>
            </div>
          </div>
          <button
            onClick={resetPreferences}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shrink-0"
          >
            Reset Cookie Consent
          </button>
        </div>

        {prefStatus && (
          <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{prefStatus}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="prose prose-invert max-w-none space-y-8 text-slate-300 text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">1.</span> What Are Cookies & Web Storage?
            </h2>
            <p>
              Cookies are small data files placed on your computer or mobile device when you interact with online applications. In addition to HTTP cookies, modern progressive web applications like Bizora utilize client-side web technologies including <strong className="text-white">LocalStorage</strong>, <strong className="text-white">SessionStorage</strong>, and <strong className="text-white">IndexedDB</strong>. These technologies are crucial for enabling high-speed offline POS operation, instant barcode lookup, and secure cryptographic token handling.
            </p>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">2.</span> Categories of Storage We Utilize
            </h2>

            <div className="space-y-4">
              {/* Category 1 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">A. Strictly Necessary & Authentication Storage</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                    Always Required
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  These items are essential for user authentication, multi-tenant workspace routing, and CSRF protection. Without these, the ERP platform cannot authenticate your identity or safeguard your financial ledger.
                </p>
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-cyan-300">
                  <div className="p-2 rounded bg-black/40">bizora_auth_token · JWT Session State</div>
                  <div className="p-2 rounded bg-black/40">firebase_auth_state · Token Verification</div>
                  <div className="p-2 rounded bg-black/40">active_business_id · Tenant Routing Scope</div>
                  <div className="p-2 rounded bg-black/40">bizora_csrf · Anti-Forgery Protection</div>
                </div>
              </div>

              {/* Category 2 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">B. Offline-First POS Engine (IndexedDB)</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-cyan-300">
                    Core ERP Feature
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Bizora stores local product catalogs, barcodes, and pending offline sales tickets inside your browser’s IndexedDB sandbox. This ensures your retail cash registers never freeze or halt checkout during broadband connectivity disruptions.
                </p>
                <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono text-cyan-300">
                  <div className="p-2 rounded bg-black/40">bizora_offline_catalog · Fast Barcode DB</div>
                  <div className="p-2 rounded bg-black/40">bizora_offline_queue · Pending Sync Invoices</div>
                </div>
              </div>

              {/* Category 3 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">C. User UI & Localization Preferences</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                    Functional
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Preserves your preferred theme (Dark mode / Light mode), chosen language (English / Bengali), and sidebar collapse state across browser sessions.
                </p>
              </div>

              {/* Category 4 */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-white text-base">D. Operational Telemetry & Error Logging</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                    Optional
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Captures anonymized frontend rendering performance metrics and uncaught JavaScript exception stacks to assist engineers in diagnosing customer issues. No commercial sales figures or PII are transmitted.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">3.</span> How to Manage or Disable Storage
            </h2>
            <p>
              You can adjust your browser settings to reject cookies or clear site storage. However, disabling LocalStorage or IndexedDB will degrade or disable POS checkout functionality and prevent user session persistence.
            </p>
          </section>

        </div>
      </div>
    </LegalLayout>
  );
};
export default CookiePolicyPage;

