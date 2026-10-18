import React from 'react';
import { appVersionLabel } from '@shared/lib/appVersion';

export type ReadinessFilter = 'all' | 'fail' | 'warn';

type Props = {
  report: any;
  filter: ReadinessFilter;
  onFilterChange: (f: ReadinessFilter) => void;
  onClose: () => void;
  showToast: (msg: string, type?: 'error' | 'success' | string) => void;
};

export const AdminReadinessPanel: React.FC<Props> = ({
  report,
  filter,
  onFilterChange,
  onClose,
  showToast,
}) => {
  const checks = (report?.checks || []) as any[];
  const visible = checks
    .filter((c) => filter === 'all' || c.status === filter)
    .slice()
    .sort((a, b) => {
      const rank = (s: string) => (s === 'fail' ? 0 : s === 'warn' ? 1 : 2);
      return rank(a.status) - rank(b.status);
    });

  const copySummary = async () => {
    try {
      const s = report.summary || {};
      const fails = checks.filter((c) => c.status === 'fail');
      const warns = checks.filter((c) => c.status === 'warn');
      const lines = [
        appVersionLabel(),
        `NODE_ENV=${report.nodeEnv || '—'}`,
        `readyForProd=${!!s.readyForProd}`,
        `pass=${s.pass ?? 0} warn=${s.warn ?? 0} fail=${s.fail ?? 0}`,
        fails.length ? `FAIL: ${fails.map((c) => c.id).join(', ')}` : 'FAIL: none',
        warns.length ? `WARN: ${warns.map((c) => c.id).join(', ')}` : 'WARN: none',
      ];
      await navigator.clipboard.writeText(lines.join('\n'));
      showToast('Readiness summary copied');
    } catch {
      showToast('Copy failed', 'error');
    }
  };

  const downloadJson = () => {
    try {
      const blob = new Blob(
        [
          JSON.stringify(
            {
              exportedAt: new Date().toISOString(),
              client: appVersionLabel(),
              ...report,
            },
            null,
            2
          ),
        ],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bizora_readiness_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Readiness report downloaded');
    } catch {
      showToast('Download failed', 'error');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-4 py-3 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-black">Production readiness</h3>
          <p className="text-[10px] text-slate-300">
            {appVersionLabel()} · NODE_ENV={report.nodeEnv || '—'} ·{' '}
            {report.summary?.readyForProd ? 'Ready for prod' : 'Not ready'} ·{' '}
            {report.summary?.pass ?? 0} pass / {report.summary?.warn ?? 0} warn /{' '}
            {report.summary?.fail ?? 0} fail
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            className="text-xs font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20"
            onClick={copySummary}
          >
            Copy summary
          </button>
          <button
            type="button"
            className="text-xs font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20"
            onClick={downloadJson}
          >
            Download JSON
          </button>
          <button
            type="button"
            className="text-xs font-bold px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-1.5">
        {(
          [
            { id: 'all', label: 'All' },
            { id: 'fail', label: 'Fails' },
            { id: 'warn', label: 'Warns' },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            className={`text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg border transition-colors ${
              filter === f.id
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
        {visible.map((c) => (
          <div key={c.id} className="px-4 py-2.5 flex gap-3 items-start text-sm">
            <span
              className={`mt-0.5 shrink-0 text-[10px] font-black uppercase px-1.5 py-0.5 rounded ${
                c.status === 'pass'
                  ? 'bg-emerald-50 text-emerald-700'
                  : c.status === 'warn'
                    ? 'bg-amber-50 text-amber-800'
                    : 'bg-rose-50 text-rose-700'
              }`}
            >
              {c.status}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-800 text-xs">
                {c.label} <span className="font-normal text-slate-400">({c.category})</span>
              </p>
              <p className="text-[11px] text-slate-500 break-words">{c.detail}</p>
              {c.requiredForProd ? (
                <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-wide mt-0.5">
                  Required for prod
                </p>
              ) : null}
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <p className="px-4 py-6 text-center text-xs text-slate-400 font-medium">
            No checks match this filter.
          </p>
        )}
      </div>
    </div>
  );
};

export default AdminReadinessPanel;
