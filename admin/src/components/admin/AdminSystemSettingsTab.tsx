import React from 'react';
import { Settings, Globe, Mail, Smartphone, Save } from 'lucide-react';

type Props = {
  brandingName?: string;
  defaultCurrency?: string;
  defaultTimezone?: string;
  faviconUrl?: string;
  logoUrl?: string;
  seoDescription?: string;
  seoTitle?: string;
  setBrandingName?: (v: string) => void;
  setDefaultCurrency?: (v: string) => void;
  setDefaultTimezone?: (v: string) => void;
  setFaviconUrl?: (v: string) => void;
  setLogoUrl?: (v: string) => void;
  setSeoDescription?: (v: string) => void;
  setSeoTitle?: (v: string) => void;
  setSmsGatewayUrl?: (v: string) => void;
  setSmtpHost?: (v: string) => void;
  smsGatewayUrl?: string;
  smtpHost?: string;
  showToast?: (msg: string, type?: string) => void;
  onSave?: () => void;
};

export const AdminSystemSettingsTab: React.FC<Props> = (props) => {
  const {
    brandingName = 'Bizora',
    defaultCurrency = 'BDT',
    defaultTimezone = 'Asia/Dhaka',
    logoUrl = '',
    faviconUrl = '',
    seoTitle = '',
    seoDescription = '',
    smtpHost = '',
    smsGatewayUrl = '',
    setBrandingName,
    setDefaultCurrency,
    setDefaultTimezone,
    setLogoUrl,
    setFaviconUrl,
    setSeoTitle,
    setSeoDescription,
    setSmtpHost,
    setSmsGatewayUrl,
    showToast,
    onSave,
  } = props;

  const save = () => {
    onSave?.();
    showToast?.('Settings saved (local / pending API)');
  };

  const field = (
    label: string,
    value: string,
    onChange?: (v: string) => void,
    placeholder?: string
  ) => (
    <label className="block space-y-1">
      <span className="text-[10px] font-black uppercase text-slate-400">{label}</span>
      <input
        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
      />
    </label>
  );

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white border border-slate-700">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-300" /> System settings
        </h2>
        <p className="text-xs text-slate-300 mt-1">Branding, SEO, SMTP & SMS gateway defaults</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Globe className="w-4 h-4" /> Branding
          </h3>
          {field('Platform name', brandingName, setBrandingName, 'Bizora')}
          {field('Logo URL', logoUrl, setLogoUrl, 'https://…')}
          {field('Favicon URL', faviconUrl, setFaviconUrl)}
          {field('Default currency', defaultCurrency, setDefaultCurrency, 'BDT')}
          {field('Timezone', defaultTimezone, setDefaultTimezone, 'Asia/Dhaka')}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800">SEO</h3>
          {field('SEO title', seoTitle, setSeoTitle)}
          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">SEO description</span>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              rows={3}
              value={seoDescription}
              onChange={(e) => setSeoDescription?.(e.target.value)}
            />
          </label>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Mail className="w-4 h-4" /> Email (SMTP)
          </h3>
          {field('SMTP host', smtpHost, setSmtpHost, 'smtp.example.com')}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Smartphone className="w-4 h-4" /> SMS
          </h3>
          {field('Gateway URL', smsGatewayUrl, setSmsGatewayUrl, 'https://…')}
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 inline-flex items-center gap-2"
      >
        <Save className="w-4 h-4" /> Save settings
      </button>
    </div>
  );
};

export default AdminSystemSettingsTab;
