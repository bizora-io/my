import React from 'react';
import { CreditCard, Shield } from 'lucide-react';

type Props = {
  gatewayLogs?: any[];
  commissionRate?: number;
  gatewaySettings?: any;
  paymentForm?: any;
  setCommissionRate?: (v: number) => void;
  setGatewaySettings?: (v: any) => void;
  setPaymentForm?: (v: any) => void;
  showToast?: (msg: string, type?: string) => void;
  currencySymbol?: string;
};

export const AdminPaymentGatewayTab: React.FC<Props> = ({
  gatewayLogs = [],
  commissionRate = 0,
  gatewaySettings = {},
  setCommissionRate,
  setGatewaySettings,
  showToast,
  currencySymbol = '৳',
}) => {
  const logs = Array.isArray(gatewayLogs) ? gatewayLogs : [];
  const settings = gatewaySettings || {};

  const setField = (key: string, value: string) => {
    setGatewaySettings?.({ ...settings, [key]: value });
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800">
        <h2 className="text-xl font-black flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-400" /> Payment gateways
        </h2>
        <p className="text-xs text-slate-300 mt-1">Credentials, commission & sandbox logs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Credentials
          </h3>
          {['bkashAppKey', 'nagadMerchant', 'sslStoreId'].map((k) => (
            <label key={k} className="block space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400">{k}</span>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                value={settings[k] || ''}
                onChange={(e) => setField(k, e.target.value)}
                placeholder="••••••••"
              />
            </label>
          ))}
          <label className="block space-y-1">
            <span className="text-[10px] font-black uppercase text-slate-400">Platform commission %</span>
            <input
              type="number"
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold"
              value={commissionRate}
              onChange={(e) => setCommissionRate?.(parseFloat(e.target.value) || 0)}
            />
          </label>
          <button
            type="button"
            onClick={() => showToast?.('Gateway settings saved locally')}
            className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold"
          >
            Save
          </button>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 text-white max-h-[360px] overflow-y-auto">
          <h3 className="text-[10px] font-black uppercase text-emerald-400 mb-3">Sandbox logs</h3>
          {logs.length === 0 && <p className="text-xs text-slate-400">No gateway events yet</p>}
          <div className="space-y-2 font-mono text-[11px]">
            {logs.map((log: any, i: number) => (
              <div key={i} className="flex flex-wrap justify-between gap-2 border-b border-slate-800 pb-1.5">
                <span className="text-slate-400">{log.time || log.at || '—'}</span>
                <span className="text-slate-200">{log.gateway || log.method || 'gw'}</span>
                <span className="text-emerald-300">
                  +{currencySymbol}
                  {log.amount ?? '—'}
                </span>
                <span className="text-indigo-300">{log.status || 'ok'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentGatewayTab;
