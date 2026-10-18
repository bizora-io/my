import React, { useEffect, useState } from 'react';
import { authFetch, hasAuthToken } from '../lib/apiClient';
import { Webhook, Plus, Trash2, Send } from 'lucide-react';

interface Wh {
  id: string;
  url: string;
  secret?: string;
  events: string[];
  active: boolean;
  hasSecret?: boolean;
}

const EVENT_OPTIONS = [
  '*',
  'sale.created',
  'transaction.created',
  'product.low_stock',
  'product.updated',
];

const WebhooksSettings: React.FC = () => {
  const [webhooks, setWebhooks] = useState<Wh[]>([]);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!hasAuthToken()) return;
    const res = await authFetch('/api/webhooks');
    if (res.ok) {
      const body = await res.json();
      setWebhooks(body.webhooks || []);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (list: Wh[]) => {
    setBusy(true);
    setMsg('');
    try {
      const res = await authFetch('/api/webhooks', {
        method: 'PUT',
        body: JSON.stringify({ webhooks: list }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMsg(body.error || 'Save failed');
        return;
      }
      setWebhooks(body.webhooks || list);
      setMsg('Saved');
    } finally {
      setBusy(false);
    }
  };

  const add = () => {
    setWebhooks((prev) => [
      ...prev,
      { id: `wh_${Date.now()}`, url: '', events: ['sale.created'], active: true },
    ]);
  };

  const test = async () => {
    setBusy(true);
    try {
      const res = await authFetch('/api/webhooks/test', { method: 'POST', body: '{}' });
      const body = await res.json();
      setMsg(body.message || (res.ok ? 'Test sent' : 'Test failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Webhook className="w-5 h-5 text-indigo-600" /> Outbound webhooks
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            POST JSON events to your URL when sales or low-stock happen. See docs/API.md.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={test} disabled={busy} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 inline-flex items-center gap-1">
            <Send className="w-3 h-3" /> Test
          </button>
          <button type="button" onClick={add} className="text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      {webhooks.length === 0 && (
        <p className="text-sm text-slate-400 py-6 text-center border border-dashed rounded-xl">No webhooks configured.</p>
      )}

      <div className="space-y-3">
        {webhooks.map((w, idx) => (
          <div key={w.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
            <div className="flex gap-2 items-center">
              <input
                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                placeholder="https://example.com/webhook"
                value={w.url}
                onChange={(e) => {
                  const next = [...webhooks];
                  next[idx] = { ...w, url: e.target.value };
                  setWebhooks(next);
                }}
              />
              <label className="text-xs flex items-center gap-1 shrink-0">
                <input
                  type="checkbox"
                  checked={w.active}
                  onChange={(e) => {
                    const next = [...webhooks];
                    next[idx] = { ...w, active: e.target.checked };
                    setWebhooks(next);
                  }}
                />
                Active
              </label>
              <button
                type="button"
                className="text-red-500"
                onClick={() => setWebhooks(webhooks.filter((_, i) => i !== idx))}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <input
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              placeholder={w.hasSecret ? 'Secret (leave blank to keep)' : 'HMAC secret (optional)'}
              value={w.secret && w.secret !== '••••••••' ? w.secret : ''}
              onChange={(e) => {
                const next = [...webhooks];
                next[idx] = { ...w, secret: e.target.value };
                setWebhooks(next);
              }}
            />
            <div className="flex flex-wrap gap-2">
              {EVENT_OPTIONS.map((ev) => {
                const on = w.events?.includes(ev);
                return (
                  <button
                    key={ev}
                    type="button"
                    onClick={() => {
                      let events = [...(w.events || [])];
                      if (on) events = events.filter((x) => x !== ev);
                      else events.push(ev);
                      if (!events.length) events = ['*'];
                      const next = [...webhooks];
                      next[idx] = { ...w, events };
                      setWebhooks(next);
                    }}
                    className={`text-[10px] font-bold px-2 py-1 rounded-full border ${on ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-slate-200 text-slate-500'}`}
                  >
                    {ev}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => save(webhooks)}
        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold disabled:opacity-50"
      >
        {busy ? 'Saving…' : 'Save webhooks'}
      </button>
      {msg && <p className="text-sm font-semibold text-slate-600">{msg}</p>}
    </div>
  );
};

export default WebhooksSettings;
