import React, { useState, useEffect } from 'react';
import { ShoppingBag, Menu, X, ArrowRight, Globe } from 'lucide-react';
import { PortalType } from '../../lib/domainRouter';

interface NavbarProps {
  isBn: boolean;
  onToggleLang: () => void;
  onPortalClick: (portal: PortalType, e: React.MouseEvent, params?: { plan?: string; billing?: string; mode?: 'login' | 'register' }) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isBn,
  onToggleLang,
  onPortalClick,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: isBn ? 'ফিচারসমূহ' : 'Features', href: '#features' },
    { label: isBn ? 'সলিউশন' : 'Solutions', href: '#solutions' },
    { label: isBn ? 'প্রোডাক্ট ডেমো' : 'Preview', href: '#preview' },
    { label: isBn ? 'প্রাইসিং' : 'Pricing', href: '#pricing' },
    { label: isBn ? 'প্রশ্নোত্তর' : 'FAQ', href: '#faq' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? 'bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/20'
          : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-950/40 group-hover:scale-105 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-bold tracking-tight text-white group-hover:text-emerald-400 transition-colors">
                Bizora
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-400/90 -mt-1">
                ERP & POS
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language Switcher */}
            <button
              type="button"
              onClick={onToggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors"
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>{isBn ? 'বাংলা' : 'EN'}</span>
            </button>

            {/* Sign In */}
            <button
              type="button"
              onClick={(e) => onPortalClick('shop', e, { mode: 'login' })}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              {isBn ? 'লগইন' : 'Sign In'}
            </button>

            {/* Start Free Trial */}
            <button
              type="button"
              onClick={(e) => onPortalClick('shop', e, { plan: 'trial', mode: 'register' })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{isBn ? 'ফ্রি ট্রায়াল শুরু করুন' : 'Start Free Trial'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              type="button"
              onClick={onToggleLang}
              className="p-2 rounded-lg border border-slate-800 bg-slate-900/60 text-xs font-medium text-slate-300"
              aria-label="Toggle language"
            >
              {isBn ? 'বাং' : 'EN'}
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 focus:outline-none"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-800 bg-slate-950/95 backdrop-blur-xl px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top duration-200">
          <nav className="flex flex-col space-y-3">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-base font-medium text-slate-300 hover:text-white transition-colors py-1"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3">
            <button
              type="button"
              onClick={(e) => {
                setMobileMenuOpen(false);
                onPortalClick('shop', e, { mode: 'login' });
              }}
              className="w-full py-2.5 rounded-xl border border-slate-800 text-sm font-medium text-slate-200 hover:bg-slate-900 text-center transition-colors"
            >
              {isBn ? 'লগইন' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                setMobileMenuOpen(false);
                onPortalClick('shop', e, { plan: 'trial', mode: 'register' });
              }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 text-center shadow-lg shadow-emerald-950/50"
            >
              {isBn ? 'ফ্রি ট্রায়াল শুরু করুন' : 'Start Free Trial'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
