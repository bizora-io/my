import React from 'react';
import { Auth } from '@shared/components/Auth';
import { PortalType, PORTAL_CONFIGS, getPortalUrl, setDevPortal } from '../../lib/domainRouter';
import { Store, Users, ShoppingBag, Shield, ArrowLeft, ExternalLink, Globe } from 'lucide-react';

interface PortalLoginProps {
  portal: 'shop' | 'employee' | 'customer' | 'admin';
  onSwitchPortal?: (portal: PortalType) => void;
}

export const PortalLogin: React.FC<PortalLoginProps> = ({ portal, onSwitchPortal }) => {
  const config = PORTAL_CONFIGS[portal];
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  const handlePortalSwitch = (target: PortalType) => {
    if (onSwitchPortal) {
      onSwitchPortal(target);
    } else {
      setDevPortal(target);
    }
  };

  const getPortalRole = () => {
    switch (portal) {
      case 'employee': return 'employee';
      case 'customer': return 'customer';
      case 'shop':
      default: return 'business';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Portal Banner with Context */}
      <div className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePortalSwitch('landing')}
              className="inline-flex items-center gap-1.5 text-slate-300 hover:text-amber-400 font-bold transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Bizora Main Website</span>
            </button>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <span className="text-slate-400 hidden sm:inline">{config.title}</span>
          </div>

          {/* Development Quick Switcher */}
          {isLocal && (
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Dev Switch:</span>
              {(['landing', 'shop', 'employee', 'customer', 'admin'] as PortalType[]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePortalSwitch(p)}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                    portal === p ? 'bg-amber-400 text-black' : 'text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="flex-1 flex flex-col justify-center">
        {portal === 'admin' ? (
          <div className="max-w-md mx-auto my-12 p-8 bg-white border border-slate-200 rounded-3xl shadow-xl text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center mx-auto shadow-lg">
              <Shield className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">SaaS Administration</h2>
              <p className="text-xs text-slate-500 font-mono mt-1">SaaS Infrastructure & Control Plane</p>
              <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                Platform administration is managed through the dedicated SaaS Admin app. Authorized administrators only.
              </p>
            </div>

            <div className="pt-2 space-y-3">
              <a
                href={getPortalUrl('admin')}
                className="w-full py-3.5 px-4 rounded-xl bg-slate-950 text-amber-400 font-bold text-sm hover:bg-slate-900 shadow-md flex items-center justify-center gap-2"
              >
                <span>Open SaaS Admin Panel</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={() => handlePortalSwitch('shop')}
                className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
              >
                Not an admin? Return to Shop Owner portal
              </button>
            </div>
          </div>
        ) : (
          <Auth initialRole={getPortalRole()} portalMode={portal} lockRole={true} />
        )}
      </div>

      {/* Subtle Footer */}
      <div className="py-4 text-center text-xs text-slate-400 border-t border-slate-200/60">
        © {new Date().getFullYear()} Bizora Cloud Platform · Multi-Portal Architecture
      </div>
    </div>
  );
};

export default PortalLogin;

