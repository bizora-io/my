import React from 'react';
import { 
  Phone, Mail, MessageSquare, HeadphonesIcon, 
  Clock, ShieldCheck, ArrowRight, ExternalLink 
} from 'lucide-react';
import { PortalType } from '../../lib/domainRouter';

interface ContactSectionProps {
  isBn: boolean;
  theme: 'light' | 'dark';
  onPortalClick: (portal: PortalType, e: React.MouseEvent, params?: { plan?: string; billing?: string; mode?: 'login' | 'register' }) => void;
}

export const ContactSection: React.FC<ContactSectionProps> = ({
  isBn,
  theme,
  onPortalClick,
}) => {
  const isLight = theme === 'light';

  return (
    <section 
      id="contact" 
      className={`py-20 sm:py-28 border-t transition-colors duration-200 ${
        isLight 
          ? 'bg-slate-50 border-slate-200 text-slate-900' 
          : 'bg-slate-950 border-slate-800/80 text-white'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4 border ${
            isLight
              ? 'bg-amber-50 text-amber-800 border-amber-200'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          }`}>
            <HeadphonesIcon className="w-3.5 h-3.5" />
            <span>{isBn ? 'সরাসরি সহায়তা ও ডেমো' : 'Dedicated Support & Live Onboarding'}</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            {isBn
              ? 'আমাদের অনবোর্ডিং টিমের সাথে যোগাযোগ করুন'
              : 'Talk Directly With Our Enterprise Onboarding Team'}
          </h2>

          <p className={`text-base sm:text-lg ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {isBn
              ? 'আপনার ব্যবসার মাইগ্রেশন, হার্ডওয়্যার প্রিন্টার সেটআপ অথবা কাস্টম রিকোয়ারমেন্ট নিয়ে কথা বলুন সরাসরি।'
              : 'Have questions about migrating from Excel, setting up barcode scanners, or multi-branch deployment? We are here to help.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
          {/* Phone Helpline */}
          <div className={`rounded-2xl p-6 sm:p-8 border transition-all duration-200 flex flex-col justify-between ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}>
            <div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                {isBn ? 'ফোন হেল্পলাইন' : 'Helpline & Sales'}
              </h3>
              <p className={`text-xs sm:text-sm mb-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isBn ? 'সরাসরি ফোন করে কথা বলুন আমাদের এক্সপার্টের সাথে।' : 'Speak directly with our retail systems specialist.'}
              </p>
              <div className="text-lg font-bold font-mono text-emerald-600">
                +880 9612-345678
              </div>
              <div className={`text-xs mt-1 flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                <Clock className="w-3.5 h-3.5" />
                <span>{isBn ? 'সোম-শনি: সকাল ৯টা - রাত ৯টা' : 'Mon-Sat: 9:00 AM - 9:00 PM'}</span>
              </div>
            </div>
            <div className="pt-6 mt-6 border-t border-slate-200/60 dark:border-slate-800/60">
              <a
                href="tel:+8809612345678"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
              >
                <span>{isBn ? 'এখনই কল করুন' : 'Call Support Line'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* WhatsApp Concierge */}
          <div className={`rounded-2xl p-6 sm:p-8 border transition-all duration-200 flex flex-col justify-between ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}>
            <div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                {isBn ? 'হোয়াটসঅ্যাপ কনসিয়ার্জ' : 'WhatsApp Concierge'}
              </h3>
              <p className={`text-xs sm:text-sm mb-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isBn ? 'দ্রুত চ্যাট করুন এবং স্ক্রিনশট বা সমস্যার ছবি পাঠান।' : 'Fast instant messaging and live onboarding assistance.'}
              </p>
              <div className="text-lg font-bold font-mono text-emerald-600">
                +880 1700-000000
              </div>
              <div className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isBn ? 'গড় রেসপন্স টাইম: < ১০ মিনিট' : 'Average Response Time: < 10 mins'}
              </div>
            </div>
            <div className="pt-6 mt-6 border-t border-slate-200/60 dark:border-slate-800/60">
              <a
                href="https://wa.me/8801700000000?text=Hi%20Bizora%20Team%2C%20I%20am%20interested%20in%20a%20product%20demo"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-500 transition-colors"
              >
                <span>{isBn ? 'হোয়াটসঅ্যাপে চ্যাট করুন' : 'Chat on WhatsApp'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Email Support */}
          <div className={`rounded-2xl p-6 sm:p-8 border transition-all duration-200 flex flex-col justify-between ${
            isLight
              ? 'bg-white border-slate-200 shadow-sm hover:shadow-md'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}>
            <div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${
                isLight ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
              }`}>
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">
                {isBn ? 'ইমেইল সাপোর্ট' : 'Official Email Support'}
              </h3>
              <p className={`text-xs sm:text-sm mb-4 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {isBn ? 'যেকোনো অফিসিয়াল প্রস্তাব বা টেকনিক্যাল প্রশ্ন পাঠান।' : 'Send official enterprise RFPs or technical inquiries.'}
              </p>
              <div className="text-base font-bold font-mono text-blue-600 truncate">
                support@bizora.com
              </div>
              <div className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {isBn ? '২৪ ঘণ্টার মধ্যে নিশ্চিত রিপ্লাই' : 'Guaranteed reply within 24 hours'}
              </div>
            </div>
            <div className="pt-6 mt-6 border-t border-slate-200/60 dark:border-slate-800/60">
              <a
                href="mailto:support@bizora.com?subject=Bizora%20Enterprise%20Inquiry"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-500 transition-colors"
              >
                <span>{isBn ? 'ইমেইল পাঠান' : 'Send Email Message'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Live System Status Banner */}
        <div className={`mt-10 max-w-5xl mx-auto rounded-xl p-4 border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs ${
          isLight ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900/40 border-slate-800 text-slate-300'
        }`}>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">
              {isBn ? 'সকল বিজোরা ক্লাউড ক্লাস্টার সচল (All Systems Operational)' : 'All Bizora Cloud Clusters Operational (99.98% Uptime)'}
            </span>
          </div>
          <a
            href="/health"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-emerald-600 hover:underline font-mono font-medium"
          >
            <span>{isBn ? 'লাইভ হেলথ চেক রিপোর্ট দেখুন' : 'View Live /health JSON'}</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
