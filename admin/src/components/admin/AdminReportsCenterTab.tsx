import React from 'react';
import { FileText, Download } from 'lucide-react';

type Props = {
  showToast?: (msg: string, type?: string) => void;
  visibleUsers?: any[];
  saasTickets?: any[];
};

export const AdminReportsCenterTab: React.FC<Props> = ({
  showToast,
  visibleUsers = [],
  saasTickets = [],
}) => {
  const reports = [
    { id: 'shops', label: 'Businesses export', rows: (visibleUsers || []).length },
    { id: 'tickets', label: 'Support tickets export', rows: (saasTickets || []).length },
    { id: 'subs', label: 'Subscription summary', rows: 'CSV' },
  ];

  const exportReport = (id: string, label: string) => {
    let content = 'report,generated_at\n';
    if (id === 'shops') {
      content =
        'id,businessName,email,plan,status\n' +
        (visibleUsers || [])
          .map(
            (u: any) =>
              `${u.id || ''},${u.businessName || ''},${u.email || ''},${u.plan || ''},${u.status || ''}`
          )
          .join('\n');
    } else if (id === 'tickets') {
      content =
        'id,subject,status,priority,business\n' +
        (saasTickets || [])
          .map(
            (t: any) =>
              `${t.id || ''},${t.subject || t.title || ''},${t.status || ''},${t.priority || ''},${t.businessName || ''}`
          )
          .join('\n');
    } else {
      content += `subscription_summary,${new Date().toISOString()}\n`;
    }
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${id}_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast?.(`${label} downloaded`);
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <FileText className="w-5 h-5 text-indigo-600" /> Reports
        </h2>
        <p className="text-xs text-slate-500">CSV exports for ops & finance</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {reports.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
            <p className="text-sm font-bold text-slate-800">{r.label}</p>
            <p className="text-xs text-slate-500">Rows: {String(r.rows)}</p>
            <button
              type="button"
              onClick={() => exportReport(r.id, r.label)}
              className="w-full py-2 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Download CSV
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminReportsCenterTab;
