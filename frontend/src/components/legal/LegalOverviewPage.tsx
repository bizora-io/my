import React from 'react';
import LegalLayout from './LegalLayout';
import { SEOHead } from '../common/SEOHead';
import { 
  ShieldCheck, 
  FileText, 
  Lock, 
  Cookie, 
  RotateCcw, 
  Trash2, 
  Server, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  Building2,
  Mail,
  Scale
} from 'lucide-react';

export const LegalOverviewPage: React.FC = () => {
  const POLICIES = [
    {
      title: 'Privacy Policy',
      to: '/legal/privacy-policy',
      description: 'How Bizora collects, encrypts, and isolates your customer, financial, and inventory data across isolated Firestore tenant namespaces.',
      icon: ShieldCheck,
      badge: 'GDPR & ISO Compliant',
      color: 'blue',
    },
    {
      title: 'Terms of Service',
      to: '/legal/terms-of-service',
      description: 'The formal service level agreement, uptime commitments (99.9%), licensing terms, user seat entitlements, and acceptable use guidelines.',
      icon: FileText,
      badge: 'SaaS Agreement',
      color: 'indigo',
    },
    {
      title: 'Cookie Policy',
      to: '/legal/cookie-policy',
      description: 'Clear documentation on essential session security tokens, CSRF tokens, IndexedDB offline cashbox caches, and cookie preference controls.',
      icon: Cookie,
      badge: 'Interactive Banner',
      color: 'amber',
    },
    {
      title: 'Refund & Cancellation',
      to: '/legal/refund-cancellation',
      description: 'Transparent 14-day Pro trial without credit card requirement, zero cancellation penalties, and seamless automated data export.',
      icon: RotateCcw,
      badge: '14-Day Pro Trial',
      color: 'emerald',
    },
    {
      title: 'Data Security & Processing',
      to: '/legal/data-security-processing',
      description: 'Military-grade TLS 1.3 transit encryption, AES-256 at-rest storage, automated multi-region backup snapshots, and role-based access control.',
      icon: Lock,
      badge: 'Enterprise Security',
      color: 'cyan',
    },
    {
      title: 'Account & Data Deletion',
      to: '/legal/account-data-deletion',
      description: 'Self-service automated data purge workflow. Submit verified deletion requests with an immediate 30-day grace safety window.',
      icon: Trash2,
      badge: 'Right to be Forgotten',
      color: 'rose',
    },
  ];

  return (
    <LegalLayout activeKey="overview">
      <SEOHead
        title="Legal & Trust Center — Bizora SaaS ERP"
        description="Official legal documentation, security standards, privacy policies, and compliance terms governing Bizora Cloud ERP."
        canonicalUrl="/legal"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Legal & Trust Center', item: '/legal' },
        ]}
      />
      <div className="space-y-12">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider">
            <Scale className="w-3.5 h-3.5" />
            <span>Bizora Trust, Governance & Transparency</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight">
            Security & Legal Trust Center
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Bizora is engineered from the ground up for strict multi-tenant isolation, enterprise data integrity, and total regulatory compliance. Explore our binding legal agreements, privacy guarantees, and operational safeguards below.
          </p>
        </div>

        {/* 3 Pillars of Security & Governance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-cyan-400 flex items-center justify-center font-bold mb-4">
              <Server className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Isolated Multi-Tenant Architecture</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every shop’s transactions, sales, and employee rosters are siloed inside dedicated Firestore subcollections (<code className="text-cyan-300">businesses/&#123;id&#125;/...</code>). Cross-tenant access is structurally impossible.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold mb-4">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Continuous At-Rest Encryption</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Customer credentials and PINs are cryptographically hashed using industry-standard bcrypt and peppered HMAC signatures. Automated encrypted snapshots occur around the clock.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold mb-4">
              <Cpu className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Offline-First Resiliency</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              POS terminals maintain cryptographic transaction journals in local client storage during network outages, syncing back cleanly with vector clock conflict resolution.
            </p>
          </div>
        </div>

        {/* Policy Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Legal Documents & Frameworks</h2>
              <p className="text-xs text-slate-400">Select any policy to read the binding full-length document.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {POLICIES.map((p) => {
              const Icon = p.icon;
              return (
                <a
                  key={p.to}
                  href={`#${p.to}`}
                  className="group p-6 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-blue-500/40 transition-all flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-cyan-400 group-hover:scale-105 transition-transform">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-cyan-300 border border-blue-500/20">
                        {p.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                      <span>{p.title}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {p.description}
                    </p>
                  </div>
                  <div className="pt-2 text-xs font-semibold text-cyan-400 flex items-center gap-1 group-hover:underline">
                    <span>Review document</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </a>
              );
            })}
          </div>
        </div>

        {/* Contact and Legal Representative Box */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/20 via-slate-900 to-indigo-900/20 border border-white/15 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-base font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>Questions or Custom Enterprise DPA Requests?</span>
            </h4>
            <p className="text-xs text-slate-300">
              Our data protection officers and legal counsel are available to execute custom Data Processing Agreements (DPA).
            </p>
          </div>
          <a
            href="mailto:legal@bizora.app.io"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shrink-0 shadow-lg shadow-blue-600/20"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Legal Team</span>
          </a>
        </div>
      </div>
    </LegalLayout>
  );
};
export default LegalOverviewPage;

