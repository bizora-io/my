import React, { useState } from 'react';
import { Key, Plus, Trash2, Copy } from 'lucide-react';

type Props = {
  apiKeys?: any[];
  setApiKeys?: (v: any[] | ((p: any[]) => any[])) => void;
  webhookUrl?: string;
  setWebhookUrl?: (v: string) => void;
  webhookLogs?: any[];
  setWebhookLogs?: (v: any[]) => void;
  showToast?: (msg: string, type?: string) => void;
};

export const AdminApiManagerTab: React.FC<Props> = ({
  apiKeys = [],
  setApiKeys,
  webhookUrl = '',
  setWebhookUrl,
  webhookLogs = [],
  showToast,
}) => {
  const keys = Array.isArray(apiKeys) ? apiKeys : [];
  const logs = Array.isArray(webhookLogs) ? webhookLogs : [];
  const [label, setLabel] = useState('Default');

  const addKey = () => {
    const key = `bz_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const item = { id: `k_${Date.now()}`, label: label || 'Key', key, createdAt: new Date().toISOString() };
    setApiKeys?.((prev: any[]) => [item, ...(Array.isArray(prev) ? prev : [])]);
    showToast?.('API key created');
    setLabel('Default');
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showToast?.('Copied');
    } catch {
      showToast?.('Copy failed', 'error');
    }
  };

  const remove = (id: string) => {
    setApiKeys?.((prev: any[]) => (Array.isArray(prev) ? prev : []).filter((k) => k.id !== id));
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-600" /> API manager
        </h2>
        <p className="text-xs text-slate-500">Keys & outbound webhook URL</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Create key</h3>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Label"
          />
          <button
            type="button"
            onClick={addKey}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Generate
          </button>
          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {keys.length === 0 && <p className="text-xs text-slate-400 py-4 text-center">No keys</p>}
            {keys.map((k: any) => (
              <div key={k.id} className="py-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800">{k.label}</p>
                  <p className="text-[10px] font-mono text-slate-500 truncate">{k.key}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button type="button" onClick={() => copy(k.key)} className="p-1.5 border rounded-lg">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => remove(k.id)} className="p-1.5 border border-red-100 text-red-600 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Webhook URL</h3>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl?.(e.target.value)}
            placeholder="https://hooks.example.com/bizora"
          />
          <p className="text-[10px] text-slate-400">Recent deliveries: {logs.length}</p>
          <div className="max-h-40 overflow-y-auto text-[10px] font-mono text-slate-500 space-y-1">
            {logs.slice(0, 20).map((l: any, i: number) => (
              <div key={i}>{l.time || l.at || ''} · {l.status || l.event || 'event'}</div>
            ))}
            {logs.length === 0 && <p>No webhook logs yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminApiManagerTab;
