import React, { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import {
  isTrialPlan,
  isTrialExhausted,
  normalizeTrialLimits,
  normalizeTrialUsage,
  TRIAL_LIMIT_LABELS,
  type TrialLimitKey,
} from '../lib/trialLimits';
import { Sparkles, AlertTriangle } from 'lucide-react';

/**
 * Shows remaining trial package quotas after signup / while on Trial plan.
 */
export const TrialStatusBanner: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const { user } = useAuth();
  const { language, t } = useSettings();
  const bn = language === 'bn';

  const view = useMemo(() => {
    if (!user || !isTrialPlan(user)) return null;
    const limits = normalizeTrialLimits(user.trialLimits);
    const usage = normalizeTrialUsage(user.trialUsage);
    const keys = Object.keys(limits) as TrialLimitKey[];
    const rows = keys.map((k) => ({
      key: k,
      label: bn ? TRIAL_LIMIT_LABELS[k].bn : TRIAL_LIMIT_LABELS[k].en,
      used: usage[k],
      limit: limits[k],
      left: Math.max(0, limits[k] - usage[k]),
    }));
    const exhausted = isTrialExhausted(limits, usage);
    return { rows, exhausted, renews: user.subscriptionRenewsAt };
  }, [user, bn]);

  if (!view) return null;

  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        view.exhausted
          ? 'border-rose-200 bg-rose-50 text-rose-900'
          : 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-950'
      }`}
    >
      <div className="flex items-start gap-2 mb-2">
        {view.exhausted ? (
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
        ) : (
          <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">
            {view.exhausted
              ? bn
                ? 'ট্রায়াল লিমিট শেষ — আপগ্রেড করুন'
                : 'Trial limits used up — please upgrade'
              : bn
                ? 'ফ্রি ট্রায়াল প্যাকেজ'
                : 'Free trial package'}
          </p>
          {view.renews && !compact && (
            <p className="text-[11px] opacity-80">
              {bn ? 'মেয়াদ' : 'Ends'}: {new Date(view.renews).toLocaleDateString()}
            </p>
          )}
        </div>
        <a
          href="#/subscription"
          className="text-xs font-bold underline shrink-0 text-indigo-700 hover:text-indigo-900"
        >
          {bn ? 'প্ল্যান' : 'Plans'}
        </a>
      </div>
      <div className={`grid gap-1.5 ${compact ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-6'}`}>
        {view.rows.map((r) => (
          <div
            key={r.key}
            className="rounded-lg bg-white/80 border border-white/60 px-2 py-1.5 text-center"
          >
            <p className="text-[10px] font-semibold text-slate-500 truncate">{r.label}</p>
            <p className={`text-sm font-black ${r.left === 0 ? 'text-rose-600' : 'text-slate-800'}`}>
              {r.used}/{r.limit}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrialStatusBanner;
