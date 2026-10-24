import React, { useState, useEffect } from 'react';
import { Cookie, Shield, Check, X, Settings2 } from 'lucide-react';

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

const STORAGE_KEY = 'bizora_cookie_consent';

export const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    analytics: true,
    marketing: false,
    timestamp: '',
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Small delay so user isn't startled immediately on initial load
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Storage unavailable or private mode
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    try {
      const payload = { ...prefs, timestamp: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage error
    }
    setVisible(false);
    setShowPreferences(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      essential: true,
      analytics: true,
      marketing: true,
      timestamp: '',
    });
  };

  const handleAcceptEssential = () => {
    saveConsent({
      essential: true,
      analytics: false,
      marketing: false,
      timestamp: '',
    });
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Cookie Consent Banner"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-300"
    >
      <div className="bg-[#0f172a]/95 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl p-5 text-slate-200">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-cyan-400 shrink-0">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="flex-1 text-xs">
            <h4 className="text-sm font-bold text-white mb-1 flex items-center gap-1.5">
              <span>Your Privacy & Cookie Choices</span>
            </h4>
            <p className="text-slate-300 leading-relaxed">
              We use strictly necessary cookies to keep your ERP session authenticated and secure, plus optional analytics to improve performance. We never sell your business data.
            </p>
            <div className="mt-2">
              <a
                href="#/legal/cookie-policy"
                className="text-cyan-400 hover:text-cyan-300 underline font-semibold transition-colors"
              >
                Read our Cookie Policy
              </a>
            </div>
          </div>
          <button
            onClick={handleAcceptEssential}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            aria-label="Close and keep essential cookies"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {showPreferences ? (
          <div className="mt-4 pt-3 border-t border-white/10 space-y-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <div>
                <p className="font-semibold text-white">Strictly Necessary</p>
                <p className="text-[11px] text-slate-400">Auth tokens, CSRF protection, session integrity</p>
              </div>
              <span className="text-[11px] font-bold text-cyan-400 uppercase">Always Active</span>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <div>
                <p className="font-semibold text-white">Operational Telemetry</p>
                <p className="text-[11px] text-slate-400">Anonymous load latency and crash diagnostics</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.analytics}
                onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-white/5">
              <div>
                <p className="font-semibold text-white">Marketing & Attribution</p>
                <p className="text-[11px] text-slate-400">Measure landing page campaign conversions</p>
              </div>
              <input
                type="checkbox"
                checked={preferences.marketing}
                onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={handleSavePreferences}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Preferences</span>
              </button>
              <button
                onClick={() => setShowPreferences(false)}
                className="py-2 px-3 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5 text-xs font-semibold transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2">
            <button
              onClick={handleAcceptAll}
              className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors"
            >
              Accept All
            </button>
            <button
              onClick={handleAcceptEssential}
              className="py-2 px-3 rounded-xl border border-white/15 text-slate-300 hover:bg-white/5 hover:text-white font-semibold text-xs transition-colors"
            >
              Essential Only
            </button>
            <button
              onClick={() => setShowPreferences(true)}
              className="p-2 rounded-xl border border-white/15 text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Customize Preferences"
              aria-label="Customize Cookie Preferences"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
export default CookieBanner;

