import React from 'react';
import LegalLayout from './LegalLayout';
import { Lock, ShieldCheck, Server, Key, EyeOff, RefreshCw, AlertTriangle, FileCode } from 'lucide-react';
import { SEOHead } from '../common/SEOHead';

export const DataSecurityPage: React.FC = () => {
  return (
    <LegalLayout activeKey="security">
      <SEOHead
        title="Data Security & Processing Agreement — Bizora SaaS ERP"
        description="Enterprise security controls, multi-tenant database isolation, encryption protocols, and administrative safeguards at Bizora."
        canonicalUrl="/legal/data-security-processing"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Legal & Trust', item: '/legal' },
          { name: 'Data Security & Processing', item: '/legal/data-security-processing' },
        ]}
      />
      <div className="space-y-10">
        {/* Document Header */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Lock className="w-3.5 h-3.5" />
            <span>Enterprise Security Whitepaper</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Data Security & Processing Architecture</h1>
          <p className="text-xs text-slate-400 mt-2">
            Published: January 1, 2026 · Technical Controls, Cryptographic Standards & Tenant Isolation
          </p>
        </div>

        {/* Security Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
            <span className="text-2xl font-black text-cyan-400">TLS 1.3</span>
            <p className="text-[11px] text-slate-400">In-Transit Encryption</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
            <span className="text-2xl font-black text-emerald-400">AES-256</span>
            <p className="text-[11px] text-slate-400">At-Rest Database Storage</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
            <span className="text-2xl font-black text-purple-400">Bcrypt</span>
            <p className="text-[11px] text-slate-400">Salted & Peppered PINs</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center space-y-1">
            <span className="text-2xl font-black text-amber-400">24h Auto</span>
            <p className="text-[11px] text-slate-400">Encrypted Snapshot Backups</p>
          </div>
        </div>

        {/* Content Body */}
        <div className="prose prose-invert max-w-none space-y-8 text-slate-300 text-sm leading-relaxed">
          
          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">1.</span> Structural Multi-Tenant Isolation
            </h2>
            <p>
              Bizora enforces strict multi-tenant boundary isolation across all application layers. Rather than commingling rows in an unpartitioned table, every business workspace resides within its own discrete Firestore document hierarchy:
            </p>
            <div className="p-4 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-cyan-300 space-y-1">
              <div>businesses / &#123;businessId&#125; / products</div>
              <div>businesses / &#123;businessId&#125; / transactions</div>
              <div>businesses / &#123;businessId&#125; / customers</div>
              <div>businesses / &#123;businessId&#125; / ledgerEntries</div>
              <div>businesses / &#123;businessId&#125; / employees</div>
            </div>
            <p className="text-xs text-slate-400">
              Database security rules evaluate the caller’s verified JWT claims (<code className="text-cyan-300">request.auth.token.businessId</code>) on every read and write operation. A tenant cannot execute cross-tenant queries, even in the event of an aberrant frontend client modification.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">2.</span> Cryptographic Standards & Secret Hygiene
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-xs text-slate-400">
              <li><strong>Transport Security:</strong> All endpoints enforce TLS 1.3 with forward secrecy. HTTP connections are redirected to HTTPS with Strict-Transport-Security (HSTS) max-age of 31,536,000 seconds.</li>
              <li><strong>Credential Storage:</strong> User passwords and staff 4-6 digit cashier PINs are hashed using bcrypt with dynamic work factors and a confidential server-side HMAC pepper (<code className="text-cyan-300">OTP_PEPPER</code>) never persisted to database disk.</li>
              <li><strong>Zero Secrets in Bundles:</strong> Client-side JavaScript bundles never contain database administrative keys, service account private keys, or SMS gateway tokens. All privileged operations execute through serverless API microservices.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">3.</span> Disaster Recovery & Automated Encrypted Snapshots
            </h2>
            <p>
              Bizora operates an autonomous background backup daemon (<code className="text-cyan-300">server-auto</code>) that creates sealed, at-rest encrypted platform snapshots every 24 hours. Backups are encrypted with AES-256 before replication across secondary geographic cloud zones to guard against localized data center failures.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">4.</span> Defensive Logging & Privacy Guardrails
            </h2>
            <p>
              Our application layer enforces strict sanitization on all server and edge log streams:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs text-slate-400">
              <li>One-time passwords (OTPs), authentication tokens, and user passwords are automatically stripped before log writes.</li>
              <li>IP addresses are pseudonymized in analytical telemetry.</li>
              <li>Production environments forbid diagnostic code echo (<code className="text-cyan-300">OTP_DEV_ECHO</code> is forcefully disabled at server startup).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-cyan-400">5.</span> Vulnerability Disclosure & Bug Bounty
            </h2>
            <p>
              We welcome responsible security disclosures from white-hat researchers. If you identify a vulnerability or security flaw, please report it promptly to:
            </p>
            <p className="text-xs text-cyan-300 font-mono">
              security@bizora.app.io · PGP Key Available Upon Request
            </p>
          </section>

        </div>
      </div>
    </LegalLayout>
  );
};
export default DataSecurityPage;

