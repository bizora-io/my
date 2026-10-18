import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Lock, Mail, ArrowRight, Loader2, Server, Activity, KeyRound } from 'lucide-react';

/**
 * Standalone SaaS admin sign-in — separate visual language from the shop client.
 */
export const Auth: React.FC = () => {
  const { login, complete2fa } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [need2fa, setNeed2fa] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!identifier.trim() || !password.trim()) {
      setError('Email / ID and password are required.');
      return;
    }
    setLoading(true);
    try {
      const result = await login(identifier, password, 'PASSWORD', { allowSaas: true });
      if (result.success) {
        if (result.require2fa) {
          setNeed2fa(true);
          setError('');
        }
      } else {
        const code = result.error || 'invalid_credentials';
        if (code === 'empty_fields') {
          setError('Email / ID and password are required.');
        } else if (code === 'network_error') {
          setError('Cannot reach API. Start the backend (port 3000) and retry.');
        } else if (code === 'rate_limited') {
          const sec = result.retryAfterSec || 900;
          const min = Math.ceil(sec / 60);
          setError(`Too many failed attempts. Locked for ~${min} min (${sec}s).`);
        } else {
          const left = result.remainingAttempts;
          setError(
            typeof left === 'number' && left >= 0
              ? `Invalid admin credentials. ${left} attempt${left === 1 ? '' : 's'} remaining.`
              : 'Invalid admin credentials. Check email / password and try again.'
          );
        }
      }
    } catch {
      setError('Login failed. Is the backend running on port 3000?');
    } finally {
      setLoading(false);
    }
  };

  const on2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) {
      setError('Enter the 2FA code from your authenticator app.');
      return;
    }
    setLoading(true);
    try {
      const ok = await complete2fa(otp);
      if (!ok) setError('Invalid or expired 2FA code. Please try again.');
    } catch {
      setError('Could not verify 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const shopUrl = (import.meta as any).env?.VITE_SHOP_URL || 'http://localhost:5173';

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100">
      {/* Left brand panel */}
      <div className="hidden lg:flex w-[42%] flex-col justify-between p-12 border-r border-slate-800 bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_20%_20%,#4f46e5_0%,transparent_45%),radial-gradient(circle_at_80%_80%,#0ea5e9_0%,transparent_40%)]" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-300">Bizora Control</p>
              <h1 className="text-xl font-black tracking-tight">SaaS Admin</h1>
            </div>
          </div>
          <h2 className="text-3xl font-black leading-tight mb-4">
            Platform operations,<br />not the shop floor.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
            Manage tenants, subscriptions, revenue, and system health. Merchant POS and inventory live on the separate shop app.
          </p>
        </div>
        <div className="relative z-10 space-y-3">
          {[
            { icon: Server, label: 'Tenant & subscription control' },
            { icon: Activity, label: 'Live health & audit visibility' },
            { icon: KeyRound, label: 'Restricted SaaS credentials only' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-3 text-sm text-slate-300">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Icon className="w-4 h-4 text-indigo-300" />
              </div>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Bizora</p>
              <p className="font-bold">Admin sign-in</p>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/40 p-8 backdrop-blur">
            <h2 className="text-2xl font-black mb-1">
              {need2fa ? 'Two-factor check' : 'Sign in to Admin'}
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              {need2fa
                ? 'Enter the code from your authenticator app.'
                : 'SaaS Owner or SaaS Admin accounts only.'}
            </p>

            {error && (
              <div role="alert" className="mb-4 text-sm font-semibold text-rose-200 bg-rose-500/15 border border-rose-500/40 rounded-xl px-3 py-2.5 animate-in fade-in">
                {error}
              </div>
            )}

            {need2fa ? (
              <form onSubmit={on2fa} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Authentication code</label>
                  <input
                    value={otp}
                    onChange={(e) => { setOtp(e.target.value); if (error) setError(''); }}
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest text-center text-lg"
                    placeholder="000000"
                    maxLength={8}
                    autoFocus
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Verify <ArrowRight className="w-4 h-4" /></>}
                </button>
                <button
                  type="button"
                  className="w-full text-xs text-slate-500 hover:text-slate-300"
                  onClick={() => { setNeed2fa(false); setOtp(''); }}
                >
                  Back
                </button>
              </form>
            ) : (
              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Email or ID</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => { setIdentifier(e.target.value); if (error) setError(''); }}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="admin@bizora.com"
                      autoComplete="username"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); if (error) setError(''); }}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-bold flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-600/20"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Enter control plane <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
            )}
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            Looking for the shop / POS?{' '}
            <a href={shopUrl} className="text-indigo-400 font-bold hover:underline">
              Open Bizora shop app
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
