import React, { useState, useEffect } from 'react';
import { ShoppingBag, Menu, X, ArrowRight, Globe, Sun, Moon } from 'lucide-react';
import { PortalType } from '../../lib/domainRouter';

interface NavbarProps {
  isBn: boolean;
  theme: 'light' | 'dark';
  onToggleLang: () => void;
  onToggleTheme: () => void;
  onPortalClick: (portal: PortalType, e: React.MouseEvent, params?: { plan?: string; billing?: string; mode?: 'login' | 'register' }) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isBn,
  theme,
  onToggleLang,
  onToggleTheme,
  onPortalClick,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const isLight = theme === 'light';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: isBn ? 'ফিচারসমূহ' : 'Features', href: '#features' },
    { label: isBn ? 'ডেমো' : 'Preview', href: '#preview' },
    { label: isBn ? 'সলিউশন' : 'Solutions', href: '#solutions' },
    { label: isBn ? 'ওয়ার্কফ্লো' : 'Workflow', href: '#workflow' },
    { label: isBn ? 'প্রাইসিং' : 'Pricing', href: '#pricing' },
    { label: isBn ? 'প্রশ্নোত্তর' : 'FAQ', href: '#faq' },
    { label: isBn ? 'যোগাযোগ' : 'Contact', href: '#contact' },
  ];

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled
          ? isLight
            ? 'bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-md'
            : 'bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-lg shadow-black/20'
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
              <span className={`text-xl font-black tracking-tight transition-colors ${
                isLight ? 'text-slate-900 group-hover:text-emerald-600' : 'text-white group-hover:text-emerald-400'
              }`}>
                Bizora
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 -mt-1">
                ERP & POS
              </span>
            </div>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`text-xs sm:text-sm font-semibold transition-colors ${
                  isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Desktop Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme Toggle (Day/Night) */}
            <button
              type="button"
              onClick={onToggleTheme}
              className={`p-2 rounded-xl border text-xs font-medium transition-all ${
                isLight
                  ? 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-amber-400'
              }`}
              aria-label={isLight ? 'Switch to Night Mode' : 'Switch to Day Mode'}
              title={isLight ? (isBn ? 'ডার্ক মোড' : 'Switch to Night Mode') : (isBn ? 'লাইট মোড' : 'Switch to Day Mode')}
            >
              {isLight ? <Moon className="w-4 h-4 text-slate-700" /> : <Sun className="w-4 h-4 text-amber-400" />}
            </button>

            {/* Language Switcher */}
            <button
              type="button"
              onClick={onToggleLang}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                isLight
                  ? 'border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-200'
              }`}
              aria-label="Toggle language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>{isBn ? 'বাংলা' : 'EN'}</span>
            </button>

            {/* Sign In */}
            <button
              type="button"
              onClick={(e) => onPortalClick('shop', e, { mode: 'login' })}
              className={`px-3.5 py-2 text-xs sm:text-sm font-semibold transition-colors ${
                isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'
              }`}
            >
              {isBn ? 'লগইন' : 'Sign In'}
            </button>

            {/* Start Free Trial */}
            <button
              type="button"
              onClick={(e) => onPortalClick('shop', e, { plan: 'trial', mode: 'register' })}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-md shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{isBn ? 'ফ্রি ট্রায়াল' : 'Start Free Trial'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex lg:hidden items-center gap-2">
            {/* Theme Toggle */}
            <button
              type="button"
              onClick={onToggleTheme}
              className={`p-2 rounded-lg border text-xs ${
                isLight ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-slate-800 bg-slate-900 text-amber-400'
              }`}
              aria-label="Toggle theme"
            >
              {isLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Language Toggle */}
            <button
              type="button"
              onClick={onToggleLang}
              className={`p-2 rounded-lg border text-xs font-bold ${
                isLight ? 'border-slate-200 bg-slate-100 text-slate-700' : 'border-slate-800 bg-slate-900 text-slate-300'
              }`}
              aria-label="Toggle language"
            >
              {isBn ? 'বাং' : 'EN'}
            </button>

            {/* Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`p-2 rounded-lg focus:outline-none ${
                isLight ? 'text-slate-700 hover:bg-slate-100' : 'text-slate-300 hover:bg-slate-900'
              }`}
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className={`lg:hidden border-b px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top duration-200 ${
          isLight ? 'bg-white/95 border-slate-200 text-slate-900 backdrop-blur-xl' : 'bg-slate-950/95 border-slate-800 text-slate-100 backdrop-blur-xl'
        }`}>
          <nav className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-base font-semibold py-1.5 transition-colors ${
                  isLight ? 'text-slate-700 hover:text-slate-900' : 'text-slate-300 hover:text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-col gap-3">
            <button
              type="button"
              onClick={(e) => {
                setMobileMenuOpen(false);
                onPortalClick('shop', e, { mode: 'login' });
              }}
              className={`w-full py-2.5 rounded-xl border text-sm font-semibold text-center transition-colors ${
                isLight ? 'border-slate-300 text-slate-800 hover:bg-slate-100' : 'border-slate-800 text-slate-200 hover:bg-slate-900'
              }`}
            >
              {isBn ? 'লগইন' : 'Sign In'}
            </button>
            <button
              type="button"
              onClick={(e) => {
                setMobileMenuOpen(false);
                onPortalClick('shop', e, { plan: 'trial', mode: 'register' });
              }}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 text-center shadow-lg shadow-emerald-950/50"
            >
              {isBn ? '১৪ দিনের ফ্রি ট্রায়াল শুরু করুন' : 'Start 14-Day Free Trial'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
