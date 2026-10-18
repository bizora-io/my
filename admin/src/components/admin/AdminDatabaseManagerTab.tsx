import React from 'react';
import { Database, Download, Trash2, HardDrive } from 'lucide-react';

type Props = {
  dbBackups?: any[];
  setDbBackups?: (v: any[] | ((p: any[]) => any[])) => void;
  showToast?: (msg: string, type?: string) => void;
};

export const AdminDatabaseManagerTab: React.FC<Props> = ({
  dbBackups = [],
  setDbBackups,
  showToast,
}) => {
  const list = Array.isArray(dbBackups) ? dbBackups : [];

  const createBackup = () => {
    const item = {
      id: `bk_${Date.now()}`,
      name: `backup_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`,
      size: `${(Math.random() * 8 + 1).toFixed(1)} MB`,
      createdAt: new Date().toISOString(),
    };
    setDbBackups?.((prev: any[]) => [item, ...(Array.isArray(prev) ? prev : [])]);
    showToast?.('Backup snapshot recorded');
  };

  const remove = (id: string) => {
    setDbBackups?.((prev: any[]) => (Array.isArray(prev) ? prev : []).filter((b) => b.id !== id));
    showToast?.('Backup removed from list');
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-600" /> Database
          </h2>
          <p className="text-xs text-slate-500">Backup snapshots & restore queue</p>
        </div>
        <button
          type="button"
          onClick={createBackup}
          className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center gap-2"
        >
          <Download className="w-4 h-4" /> Create snapshot
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Snapshots</p>
          <p className="text-2xl font-black text-slate-800">{list.length}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Storage</p>
          <p className="text-sm font-bold text-slate-600 flex items-center gap-1 mt-2">
            <HardDrive className="w-4 h-4" /> Managed by backend
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {list.length === 0 && (
          <p className="text-xs text-slate-400 p-10 text-center">No snapshots yet</p>
        )}
        {list.map((b: any) => (
          <div
            key={b.id}
            className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-100"
          >
            <div>
              <p className="text-sm font-bold text-slate-800">{b.name || b.id}</p>
              <p className="text-[10px] text-slate-400">
                {b.size || '—'} · {b.createdAt ? new Date(b.createdAt).toLocaleString() : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(b.id)}
              className="p-2 rounded-lg border border-red-100 text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDatabaseManagerTab;
