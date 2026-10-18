import React, { useEffect, useState } from 'react';
import { usePaymentReturn } from '../hooks/usePaymentReturn';
import { authFetch } from '../lib/apiClient';
import { useSettings } from '../contexts/SettingsContext';
import { CreditCard, RefreshCw, ExternalLink, CheckCircle } from 'lucide-react';

interface ProviderInfo {
  id: string;
  configured: boolean;
  label: string;
}

interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  description?: string;
  checkoutUrl?: string;
  createdAt?: string;
  invoiceNumber?: string;
  purpose?: string;
}

const OnlinePayments: React.FC = () => {
  const paymentReturn = usePaymentReturn();
  const { currencySymbol, currency } = useSettings();
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProvider, setDefaultProvider] = useState('sandbox');
  const [intents, setIntents] = useState<PaymentIntent[]>([]);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [provider, setProvider] = useState('sandbox');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = async () => {
    try {
      const [pRes, iRes] = await Promise.all([
        authFetch('/api/payments/providers'),
        authFetch('/api/payments/intents'),
      ]);
      if (pRes.ok) {
        const body = await pRes.json();
        setProviders(body.providers || []);
        setDefaultProvider(body.default || 'sandbox');
        setProvider(body.default || 'sandbox');
      }
      if (iRes.ok) {
        const body = await iRes.json();
        setIntents(body.intents || []);
      }
    } catch (e) {
      console.warn(e);
    }
  };

  useEffect(() => { load(); }, []);

  const createIntent = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setMsg('Enter a valid amount');
      return;
    }
    setBusy(true);
    setMsg('');
    try {
      const res = await authFetch('/api/payments/intents', {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          currency: currency || 'BDT',
          description: description || 'Online payment',
          provider,
          purpose: 'manual_collection',
          successUrl: window.location.origin + '/payments?pay=success',
          cancelUrl: window.location.origin + '/payments?pay=cancel',
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setMsg(body.error || 'Failed to create payment');
        return;
      }
      const intent = body.intent as PaymentIntent;
      if (intent.checkoutUrl) {
        setMsg('Redirecting to provider checkout…');
        sessionStorage.setItem('bizora_pending_intent', intent.id);
        sessionStorage.setItem('bizora_pending_amount', String(intent.amount || amount));
        window.location.href = intent.checkoutUrl;
        return;
      }
      setMsg(`Intent ${intent.id} created (${intent.status}). Use Confirm for sandbox.`);
      setAmount('');
      await load();
    } catch (e: any) {
      setMsg(e?.message || 'Request failed');
    } finally {
      setBusy(false);
    }
  };

  const confirmSandbox = async (id: string) => {
    setBusy(true);
    try {
      const res = await authFetch(`/api/payments/intents/${id}/confirm`, { method: 'POST', body: '{}' });
      const body = await res.json();
      if (!res.ok) {
        setMsg(body.error || 'Confirm failed');
        return;
      }
      setMsg(`Payment ${id} succeeded.`);
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    {paymentReturn.status !== 'idle' && (
      <div className={`mb-4 px-4 py-3 rounded-xl text-sm font-semibold ${
        paymentReturn.status === 'succeeded' ? 'bg-emerald-50 text-emerald-800 border border-emerald-100' :
        paymentReturn.status === 'cancelled' || paymentReturn.status === 'failed' ? 'bg-red-50 text-red-700 border border-red-100' :
        'bg-amber-50 text-amber-800 border border-amber-100'
      }`}>
        {paymentReturn.message || paymentReturn.status}
        {paymentReturn.intentId && <span className="ml-2 font-mono text-xs opacity-70">{paymentReturn.intentId}</span>}
      </div>
    )}

    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
          <CreditCard className="w-6 h-6 text-indigo-600" /> Online Payments
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Create payment intents via Sandbox, Stripe, or bKash (when configured on the server).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {providers.map(p => (
          <div key={p.id} className={`bg-white rounded-xl border p-4 ${p.configured ? 'border-emerald-200' : 'border-slate-200 opacity-80'}`}>
            <p className="font-bold text-slate-800">{p.label}</p>
            <p className="text-xs mt-1">
              {p.configured ? (
                <span className="text-emerald-600 font-semibold">Configured</span>
              ) : (
                <span className="text-amber-600">Not configured — set env keys on backend</span>
              )}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
        <h3 className="font-bold text-slate-800">New payment intent</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
          <input
            placeholder="Description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          />
          <select value={provider} onChange={e => setProvider(e.target.value)} className="px-3 py-2 border border-slate-200 rounded-lg text-sm">
            {providers.map(p => (
              <option key={p.id} value={p.id} disabled={!p.configured && p.id !== 'sandbox'}>
                {p.label}{!p.configured && p.id !== 'sandbox' ? ' (n/a)' : ''}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={createIntent}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-bold"
          >
            {busy ? 'Working…' : 'Create payment'}
          </button>
        </div>
        {msg && <p className="text-sm font-semibold text-slate-700">{msg}</p>}
        <p className="text-xs text-slate-400">
          Default provider: <strong>{defaultProvider}</strong>. Sandbox payments are confirmed in-app without a real charge.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 text-sm">Recent intents</h3>
          <button type="button" onClick={load} className="text-indigo-600 text-xs flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500 border-b text-xs">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Provider</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {intents.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">No payment intents yet.</td></tr>
            ) : intents.map(i => (
              <tr key={i.id}>
                <td className="px-4 py-3 text-xs text-slate-500">{i.createdAt ? new Date(i.createdAt).toLocaleString() : '—'}</td>
                <td className="px-4 py-3 font-semibold">{currencySymbol}{Number(i.amount).toFixed(2)} <span className="text-xs text-slate-400">{i.currency}</span></td>
                <td className="px-4 py-3 text-xs uppercase">{i.provider}</td>
                <td className="px-4 py-3">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    i.status === 'succeeded' ? 'bg-emerald-50 text-emerald-700' :
                    i.status === 'requires_confirmation' ? 'bg-amber-50 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{i.status}</span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {i.checkoutUrl && i.status !== 'succeeded' && (
                    <a href={i.checkoutUrl} className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline" target="_blank" rel="noreferrer">
                      <ExternalLink className="w-3 h-3" /> Checkout
                    </a>
                  )}
                  {i.provider === 'sandbox' && i.status === 'requires_confirmation' && (
                    <button type="button" onClick={() => confirmSandbox(i.id)} className="inline-flex items-center gap-1 text-xs text-emerald-600 font-bold hover:underline">
                      <CheckCircle className="w-3 h-3" /> Confirm
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </>
  );
};

export default OnlinePayments;
