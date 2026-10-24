import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Shield, 
  FileText, 
  Cookie, 
  RotateCcw, 
  Lock, 
  Trash2, 
  ArrowLeft, 
  Home, 
  Globe, 
  Scale, 
  ChevronRight,
  ExternalLink
} from 'lucide-react';

interface LegalLayoutProps {
  children: React.ReactNode;
  activeKey?: string;
}

export const LegalLayout: React.FC<LegalLayoutProps> = ({ children, activeKey }) => {
  const location = useLocation();
  const [isBn, setIsBn] = useState(false);

  const NAV_ITEMS = [
    {
      to: '/legal',
      key: 'overview',
      label: isBn ? 'আইনি ওভারভিউ' : 'Legal Overview',
      icon: Scale,
    },
    {
      to: '/legal/privacy-policy',
      key: 'privacy',
      label: isBn ? 'গোপনীয়তা নীতি' : 'Privacy Policy',
      icon: Shield,
    },
    {
      to: '/legal/terms-of-service',
      key: 'terms',
      label: isBn ? 'ব্যবহারের শর্তাবলী' : 'Terms of Service',
      icon: FileText,
    },
    {
      to: '/legal/cookie-policy',
      key: 'cookies',
      label: isBn ? 'কুকি পলিসি' : 'Cookie Policy',
      icon: Cookie,
    },
    {
      to: '/legal/refund-cancellation',
      key: 'refunds',
      label: isBn ? 'রিফান্ড ও বাতিল' : 'Refund & Cancellation',
      icon: RotateCcw,
    },
    {
      to: '/legal/data-security-processing',
      key: 'security',
      label: isBn ? 'ডাটা নিরাপত্তা' : 'Data Security & Processing',
      icon: Lock,
    },
    {
      to: '/legal/account-data-deletion',
      key: 'deletion',
      label: isBn ? 'অ্যাকাউন্ট ডিলিশন' : 'Account & Data Deletion',
      icon: Trash2,
    },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header with Official Bizora Emblem and Wordmark */}
      <header className="sticky top-0 z-40 bg-[#070b14]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src="/assets/bizora-emblem.png" 
              alt="Bizora Logo" 
              className="h-10 w-10 object-contain group-hover:scale-105 transition-transform drop-shadow" 
            />
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-200 bg-clip-text text-transparent leading-none">
                Bizora
              </span>
              <span className="text-[10px] font-semibold text-cyan-400 tracking-wider uppercase mt-1">
                Trust & Legal Center
              </span>
            </div>
          </Link>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsBn(!isBn)}
              className="px-3 py-1.5 rounded-full border border-white/15 text-xs font-bold text-slate-200 hover:bg-white/10 transition-colors flex items-center gap-1.5"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>{isBn ? 'English' : 'বাংলা'}</span>
            </button>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-semibold transition-all border border-white/10"
            >
              <Home className="w-3.5 h-3.5" />
              <span>{isBn ? 'হোমপেজ' : 'Back to Home'}</span>
            </Link>
          </div>
        </div>

        {/* Horizontal Navigation Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-x-auto no-scrollbar border-t border-white/5 py-2.5">
          <nav className="flex items-center gap-1 sm:gap-2 min-w-max">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeKey === item.key || location.pathname === item.to;
              return (
                <Link
                  key={item.key}
                  to={item.to}
                  className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black/40 py-8 px-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/assets/bizora-emblem.png" alt="Bizora" className="w-5 h-5 object-contain" />
            <span className="font-semibold text-white">Bizora ERP Platform</span>
            <span>·</span>
            <span>© {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <Link to="/legal/privacy-policy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/legal/terms-of-service" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/legal/cookie-policy" className="hover:text-white transition-colors">Cookies</Link>
            <Link to="/legal/refund-cancellation" className="hover:text-white transition-colors">Refunds</Link>
            <Link to="/legal/data-security-processing" className="hover:text-white transition-colors">Security</Link>
            <Link to="/legal/account-data-deletion" className="hover:text-white transition-colors">Data Deletion</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};
export default LegalLayout;

