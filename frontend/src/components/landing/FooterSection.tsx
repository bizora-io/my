import React from 'react';
import { 
  ShoppingBag, ShieldCheck, Lock, ExternalLink, 
  ArrowUpRight, Heart, Mail, Phone, Globe, MessageSquare 
} from 'lucide-react';
import { LegalDocType } from '../legal/LegalModal';
import { PortalType } from '../../lib/domainRouter';
import { FeatureTabId } from './CoreFeaturesSection';

interface FooterSectionProps {
  isBn: boolean;
  theme: 'light' | 'dark';
  onOpenLegal: (doc: LegalDocType, e?: React.MouseEvent) => void;
  onSelectFeatureTab: (tab: FeatureTabId) => void;
  onSelectIndustry: (id: string) => void;
  onPortalClick: (portal: PortalType, e: React.MouseEvent, params?: { plan?: string; billing?: string; mode?: 'login' | 'register' }) => void;
}

export const FooterSection: React.FC<FooterSectionProps> = ({
  isBn,
  theme,
  onOpenLegal,
  onSelectFeatureTab,
  onSelectIndustry,
  onPortalClick,
}) => {
  const currentYear = new Date().getFullYear();
  const isLight = theme === 'light';

  const handleModuleClick = (tab: FeatureTabId, e: React.MouseEvent) => {
    e.preventDefault();
    onSelectFeatureTab(tab);
    const el = document.getElementById('features');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleIndustryClick = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    onSelectIndustry(id);
    const el = document.getElementById('solutions');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <footer className={`border-t transition-colors duration-200 text-xs sm:text-sm ${
      isLight 
        ? 'bg-slate-900 border-slate-800 text-slate-300' 
        : 'bg-slate-950 border-slate-800 text-slate-400'
    }`}>
      {/* Top Conversion Callout Banner */}
      <div className={`border-b py-12 px-4 sm:px-6 lg:px-8 transition-colors ${
        isLight
          ? 'bg-gradient-to-r from-emerald-900/60 via-slate-900 to-teal-900/60 border-slate-800'
          : 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border-slate-800/80'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-extrabold text-white tracking-tight">
              {isBn
                ? 'আজই আপনার ব্যবসার রূপান্তর শুরু করুন'
                : 'Ready to Transform Your Retail & Commerce Operations?'}
            </h3>
            <p className="text-slate-300 text-sm mt-1">
              {isBn
                ? '১৪ দিনের ফ্রি ট্রায়ালে সাব-সেকেন্ড পিওএস এবং নির্ভুল স্টক ম্যানেজমেন্ট উপভোগ করুন।'
                : 'Start your 14-day free trial today. Zero credit card required, instant cloud setup.'}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => onPortalClick('shop', e, { plan: 'trial', mode: 'register' })}
            className="shrink-0 px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isBn ? 'ফ্রি ট্রায়াল শুরু করুন' : 'Start 14-Day Free Trial'}
          </button>
        </div>
      </div>

      {/* Main 5-Column Footer Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Column 1: Brand & Contact Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-white tracking-tight">Bizora</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isBn
                ? 'আধুনিক রিটেল, সুপারশপ, ফার্মেসি ও মাল্টি-ব্রাঞ্চ বাণিজ্যের জন্য তৈরি সম্পূর্ণ ক্লাউড ইআরপি ও পিওএস প্ল্যাটফর্ম।'
                : 'Enterprise-grade cloud ERP & POS platform built for fast-moving retail, supermarket chains, pharmacies, and multi-branch commercial networks.'}
            </p>
            <div className="pt-2 flex flex-col gap-2 text-xs">
              <a href="tel:+8809612345678" className="flex items-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors">
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>+880 9612-345678</span>
              </a>
              <a href="mailto:support@bizora.com" className="flex items-center gap-2 text-slate-300 hover:text-emerald-400 transition-colors">
                <Mail className="w-3.5 h-3.5 text-emerald-400" />
                <span>support@bizora.com</span>
              </a>
              <div className="flex items-center gap-2 text-slate-400 pt-1">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-Bit SSL Encrypted & Isolated</span>
              </div>
            </div>
          </div>

          {/* Column 2: Platform Modules (Deep Links with Tab Selection) */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {isBn ? 'প্ল্যাটফর্ম মডিউল' : 'Platform Modules'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={(e) => handleModuleClick('pos', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'হাই-স্পিড বারকোড পিওএস' : 'High-Speed Barcode POS'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleModuleClick('fefo', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'এফইএফও ব্যাচ ও মেয়াদ ট্র্যাকিং' : 'FEFO Batch & Expiry Matrix'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleModuleClick('finance', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'ডাবল-এন্ট্রি ফাইন্যান্স ও ভ্যাট' : 'Double-Entry Ledgers & Net VAT'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleModuleClick('branches', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'মাল্টি-ব্রাঞ্চ স্টক ও গেটপাস' : 'Multi-Store Stock & Gate Passes'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleModuleClick('analytics', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'রিয়েল-টাইম মার্জিন অ্যানালিটিক্স' : 'Real-Time Margin Analytics'}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3: Tailored Industries (Deep Links with Focus) */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {isBn ? 'ব্যবসায়িক সলিউশন' : 'Industry Solutions'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={(e) => handleIndustryClick('retail', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'রিটেল ও সুপারশপ' : 'Retail & Supermarket Chains'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleIndustryClick('grocery', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'গ্রোসারি ও ফ্রেশ ফুড' : 'Grocery & Spoilage Prevention'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleIndustryClick('fashion', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'ফ্যাশন ও ফুটওয়্যার বুটিক' : 'Fashion, Shoes & Apparel'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleIndustryClick('electronics', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'ইলেকট্রনিক্স ও আইএমইআই' : 'Electronics & Serialized IMEI'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleIndustryClick('pharmacy', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'ফার্মেসি ও ড্রাগ সেফটি' : 'Pharmacy & Medicine Regulations'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleIndustryClick('wholesale', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'হোলসেল ও বি২বি ডিস্ট্রিবিউশন' : 'Wholesale & B2B Distribution'}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: Company & Support */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {isBn ? 'কোম্পানি ও সাপোর্ট' : 'Company & Support'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#contact" className="hover:text-emerald-400 transition-colors">
                  {isBn ? 'যোগাযোগ ও সরাসরি সাপোর্ট' : 'Contact Us & Concierge'}
                </a>
              </li>
              <li>
                <a href="#workflow" className="hover:text-emerald-400 transition-colors">
                  {isBn ? 'কীভাবে কাজ করে (Workflow)' : 'How It Works (Workflow)'}
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-emerald-400 transition-colors">
                  {isBn ? 'প্রশ্নোত্তর (FAQ)' : 'Frequently Asked Questions'}
                </a>
              </li>
              <li>
                <a href="/health" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-emerald-400 transition-colors">
                  <span>{isBn ? 'সিস্টেম স্ট্যাটাস ও হেলথ' : 'System Status & Health'}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('security', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'সিকিউরিটি আর্কিটেকচার' : 'Security Architecture'}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 5: Trust & Legal Governance */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {isBn ? 'নিরাপত্তা ও আইনি নীতিমালা' : 'Trust & Governance'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('privacy', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'গোপনীয়তা নীতিমালা (Privacy)' : 'Privacy Policy'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('terms', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'ব্যবহারের শর্তাবলী (Terms)' : 'Terms of Service'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('cookies', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'কুকি নীতিমালা (Cookies)' : 'Cookie Preferences'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('refunds', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'রিফান্ড ও ক্যানসেলেশন পলিসি' : 'Refund & Cancellation Policy'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('deletion', e)}
                  className="hover:text-emerald-400 transition-colors text-left"
                >
                  {isBn ? 'ডেটা ডিলিশন রিকোয়েস্ট' : 'Data Deletion Request'}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {currentYear} Bizora Technologies. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>Enterprise Multi-Tenant ERP</span>
            <span>•</span>
            <span className="text-emerald-400 font-semibold">Verified Active Deployment</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
