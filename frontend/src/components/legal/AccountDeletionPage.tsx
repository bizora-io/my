import React, { useState } from 'react';
import LegalLayout from './LegalLayout';
import { Trash2, AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, Clock, HelpCircle, Loader2 } from 'lucide-react';
import { apiFetch } from '../../lib/apiClient';
import { SEOHead } from '../common/SEOHead';

export const AccountDeletionPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    businessName: '',
    phone: '',
    reason: '',
    consent: false,
  });

  const [loading, setLoading] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<{
    requestId: string;
    scheduledPurgeAt: string;
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Status check state
  const [checkId, setCheckId] = useState('');
  const [checking, setChecking] = useState(false);
  const [statusResult, setStatusResult] = useState<any>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.consent) {
      setErrorMsg('Please enter a valid email address and confirm the deletion acknowledgment.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await apiFetch('/api/privacy/deletion-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || 'Failed to submit deletion request. Please contact support.');
      } else {
        setSubmittedResult({
          requestId: data.requestId,
          scheduledPurgeAt: data.scheduledPurgeAt,
        });
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not reach server to submit deletion request.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkId.trim()) return;

    setChecking(true);
    setStatusError(null);
    setStatusResult(null);

    try {
      const res = await apiFetch(`/api/privacy/deletion-status/${encodeURIComponent(checkId.trim())}`);
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setStatusError(data.error || 'Request reference not found.');
      } else {
        setStatusResult(data);
      }
    } catch {
      setStatusError('Could not verify status. Please check your connection.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <LegalLayout activeKey="deletion">
      <SEOHead
        title="Account & Data Deletion Policy — Bizora SaaS ERP"
        description="Verified procedures for account termination, tenant data deletion requests, statutory record retention, and export options."
        canonicalUrl="/legal/account-data-deletion"
        breadcrumbs={[
          { name: 'Home', item: '/' },
          { name: 'Legal & Trust', item: '/legal' },
          { name: 'Account & Data Deletion', item: '/legal/account-data-deletion' },
        ]}
      />
      <div className="space-y-10">
        {/* Document Header */}
        <div className="border-b border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 text-xs font-bold uppercase tracking-wider mb-3">
            <Trash2 className="w-3.5 h-3.5" />
            <span>Right to be Forgotten · GDPR & CCPA Workflow</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Account & Data Deletion</h1>
          <p className="text-xs text-slate-400 mt-2">
            Automated Request Workflow · 30-Day Safety Grace Window · Irreversible Permanent Purge
          </p>
        </div>

        {/* Warning Banner */}
        <div className="p-5 rounded-2xl bg-rose-950/30 border border-rose-500/30 flex items-start gap-4 text-slate-200">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="space-y-1 text-xs">
            <h3 className="text-sm font-bold text-white">Important Notice Before Requesting Deletion</h3>
            <p className="text-slate-300 leading-relaxed">
              Submitting a data deletion request will initiate the permanent removal of your business workspace, employee accounts, sales history, customer due ledgers, and inventory catalogs. Please export your accounting records before proceeding.
            </p>
          </div>
        </div>

        {/* Main Grid: Form & Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Submission Form Column */}
          <div className="lg:col-span-7 bg-white/[0.03] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Submit Deletion Request</h2>
              <p className="text-xs text-slate-400 mt-1">
                Enter your registered workspace credentials to file an official deletion ticket.
              </p>
            </div>

            {submittedResult ? (
              <div className="p-6 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Deletion Request Registered</h3>
                  <p className="text-xs text-slate-300">
                    Your request has been logged in our secure deletion queue. Your reference tracking code is:
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-black/60 border border-emerald-500/30 font-mono text-sm font-bold text-emerald-300 select-all">
                  {submittedResult.requestId}
                </div>
                <p className="text-[11px] text-slate-400">
                  Scheduled Purge Date: {new Date(submittedResult.scheduledPurgeAt).toLocaleDateString()} (30-day grace period active).
                </p>
                <button
                  onClick={() => {
                    setSubmittedResult(null);
                    setFormData({ email: '', businessName: '', phone: '', reason: '', consent: false });
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
                >
                  Submit Another Request
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 text-xs">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {errorMsg}
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Registered Owner Email <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="owner@yourshop.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Business Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dhaka Electronics"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      Registered Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+8801700000000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Reason for Deletion (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Tell us why you are leaving Bizora so we can improve..."
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={formData.consent}
                      onChange={(e) => setFormData({ ...formData, consent: e.target.checked })}
                      className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                    />
                    <span className="text-slate-300 leading-tight">
                      I understand that submitting this request initiates the permanent and irreversible purge of all workspace data after the 30-day safety grace period.
                    </span>
                  </label>
                </div>

                <div className="pt-3">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-600/25"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Request...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        <span>Submit Data Deletion Request</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Check Existing Status Form */}
            <div className="pt-6 border-t border-white/10 space-y-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Track an Existing Deletion Request</span>
              </h3>
              <form onSubmit={handleCheckStatus} className="flex gap-2">
                <input
                  type="text"
                  placeholder="DEL-XXXXXX-XXXX"
                  value={checkId}
                  onChange={(e) => setCheckId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-white/15 text-white placeholder-slate-500 font-mono text-xs focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={checking}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors"
                >
                  {checking ? 'Checking...' : 'Check'}
                </button>
              </form>

              {statusError && (
                <p className="text-[11px] text-rose-400">{statusError}</p>
              )}

              {statusResult && (
                <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
                  <p className="text-white font-bold">Status: {statusResult.status}</p>
                  <p className="text-slate-400">Scheduled Purge: {new Date(statusResult.scheduledPurgeAt).toLocaleString()}</p>
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Process & Explanation */}
          <div className="lg:col-span-5 space-y-6 text-xs text-slate-300">
            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                <span>The 30-Day Safety Window</span>
              </h3>
              <p className="leading-relaxed text-slate-400">
                To protect merchants from accidental deletion or unauthorized disgruntled employee sabotage, Bizora enforces an automatic 30-day grace period.
              </p>
              <ul className="space-y-2 text-slate-300">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>Your workspace is set to read-only archival state.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>You may reverse the deletion within 30 days by emailing privacy@bizora.app.io with your ticket ID.</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                  <span>On day 31, automated cron scripts expunge all subcollections permanently.</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/10 space-y-3">
              <h3 className="text-sm font-bold text-white">What Data is Destroyed?</h3>
              <ul className="space-y-1.5 text-slate-400">
                <li>• Customer lists, loyalty points, and delivery addresses</li>
                <li>• Point of Sale sales receipts and invoice histories</li>
                <li>• Employee accounts, rosters, and hashed PIN numbers</li>
                <li>• Product listings, barcodes, and inventory counts</li>
                <li>• Double-entry accounting ledgers and financial logs</li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </LegalLayout>
  );
};
export default AccountDeletionPage;

