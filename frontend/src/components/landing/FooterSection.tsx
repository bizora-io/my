import React from 'react';
import { 
  ShoppingBag, ShieldCheck, Lock, ExternalLink, 
  ArrowUpRight, Heart, Mail, Phone, Globe 
} from 'lucide-react';
import { LegalDocType } from '../legal/LegalModal';
import { PortalType } from '../../lib/domainRouter';

interface FooterSectionProps {
  isBn: boolean;
  onOpenLegal: (doc: LegalDocType, e?: React.MouseEvent) => void;
  onPortalClick: (portal: PortalType, e: React.MouseEvent, params?: { plan?: string; billing?: string; mode?: 'login' | 'register' }) => void;
}

export const FooterSection: React.FC<FooterSectionProps> = ({
  isBn,
  onOpenLegal,
  onPortalClick,
}) => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-800 bg-slate-950 text-slate-400 text-xs sm:text-sm">
      {/* Top Conversion Callout Banner */}
      <div className="border-b border-slate-800/80 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-teal-950/30 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
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
            className="shrink-0 px-6 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-xl shadow-emerald-950/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            {isBn ? 'ফ্রি ট্রায়াল শুরু করুন' : 'Start 14-Day Free Trial'}
          </button>
        </div>
      </div>

      {/* Main 4-Column Footer Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">
          {/* Column 1: Brand & Security Credentials */}
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">Bizora</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              {isBn
                ? 'আধুনিক রিটেল, সুপারশপ, ফার্মেসি ও মাল্টি-ব্রাঞ্চ বাণিজ্যের জন্য তৈরি সম্পূর্ণ ক্লাউড ইআরপি ও পিওএস প্ল্যাটফর্ম।'
                : 'Enterprise-grade cloud ERP & POS platform built for fast-moving retail, supermarket chains, pharmacies, and multi-branch commercial networks.'}
            </p>
            <div className="pt-2 flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>256-Bit SSL Encrypted & Isolated</span>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>NBR Net VAT 9.1 Compliant</span>
              </div>
            </div>
          </div>

          {/* Column 2: Platform Modules */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {isBn ? 'প্ল্যাটফর্ম মডিউল' : 'Platform Modules'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  {isBn ? 'হাই-স্পিড বারকোড পিওএস' : 'High-Speed Barcode POS'}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  {isBn ? 'এফইএফও ব্যাচ ও মেয়াদ ট্র্যাকিং' : 'FEFO Batch & Expiry Matrix'}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  {isBn ? 'ডাবল-এন্ট্রি ফাইন্যান্স ও ভ্যাট' : 'Double-Entry Accounting & Net VAT'}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  {isBn ? 'মাল্টি-ব্রাঞ্চ স্টক ও গেটপাস' : 'Multi-Store Stock & Gate Passes'}
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  {isBn ? 'রিয়েল-টাইম মার্জিন অ্যানালিটিক্স' : 'Real-Time Margin Analytics'}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: Tailored Industries */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {isBn ? 'ব্যবসায়িক সলিউশন' : 'Industry Solutions'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#solutions" className="hover:text-white transition-colors">
                  {isBn ? 'রিটেল ও সুপারশপ' : 'Retail & Supermarket Chains'}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-white transition-colors">
                  {isBn ? 'গ্রোসারি ও ফ্রেশ ফুড' : 'Grocery & Spoilage Prevention'}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-white transition-colors">
                  {isBn ? 'ফ্যাশন ও ফুটওয়্যার বুটিক' : 'Fashion, Shoes & Apparel'}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-white transition-colors">
                  {isBn ? 'ইলেকট্রনিক্স ও আইএমইআই' : 'Electronics & Serialized IMEI'}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-white transition-colors">
                  {isBn ? 'ফার্মেসি ও ড্রাগ সেফটি' : 'Pharmacy & Medicine Regulations'}
                </a>
              </li>
              <li>
                <a href="#solutions" className="hover:text-white transition-colors">
                  {isBn ? 'হোলসেল ও বি২বি ডিস্ট্রিবিউশন' : 'Wholesale & B2B Distribution'}
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Governance & Legal Modals */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {isBn ? 'নিরাপত্তা ও আইনি নীতিমালা' : 'Trust & Governance'}
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('privacy', e)}
                  className="hover:text-white transition-colors text-left"
                >
                  {isBn ? 'গোপনীয়তা নীতিমালা (Privacy Policy)' : 'Privacy Policy'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('terms', e)}
                  className="hover:text-white transition-colors text-left"
                >
                  {isBn ? 'ব্যবহারের শর্তাবলী (Terms of Service)' : 'Terms of Service'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('cookies', e)}
                  className="hover:text-white transition-colors text-left"
                >
                  {isBn ? 'কুকি নীতিমালা (Cookie Policy)' : 'Cookie Preferences'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('refunds', e)}
                  className="hover:text-white transition-colors text-left"
                >
                  {isBn ? 'রিফান্ড ও ক্যানসেলেশন পলিসি' : 'Refund & Cancellation Policy'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('security', e)}
                  className="hover:text-white transition-colors text-left"
                >
                  {isBn ? 'নিরাপত্তা আর্কিটেকচার হোয়াইটপেপার' : 'Security Architecture'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => onOpenLegal('deletion', e)}
                  className="hover:text-white transition-colors text-left"
                >
                  {isBn ? 'অ্যাকাউন্ট ও ডেটা ডিলিশন রিকোয়েস্ট' : 'Data Deletion Request'}
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; {currentYear} Bizora Technologies. All rights reserved.
          </div>
          <div className="flex items-center gap-6">
            <span>Enterprise Multi-Tenant ERP</span>
            <span>•</span>
            <span className="text-emerald-400/90">Zero Data Leakage Guarantee</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
