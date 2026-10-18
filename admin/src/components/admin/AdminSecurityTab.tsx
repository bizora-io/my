import React from 'react';
import { Shield, Lock, Download, Archive, Key } from 'lucide-react';

type Props = {
  archiveDate?: string;
  backupPassword?: string;
  setArchiveDate?: (v: string) => void;
  setBackupPassword?: (v: string) => void;
  user?: any;
  handleBackup?: () => void;
  handleArchive?: () => void;
  showToast?: (msg: string, type?: string) => void;
};

export const AdminSecurityTab: React.FC<Props> = ({
  archiveDate = '',
  backupPassword = '',
  setArchiveDate,
  setBackupPassword,
  handleBackup,
  handleArchive,
  user,
}) => (
  <div className="space-y-4 animate-in fade-in">
    <div className="bg-gradient-to-r from-slate-900 via-red-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800">
      <h2 className="text-xl font-black flex items-center gap-2">
        <Shield className="w-5 h-5 text-red-400" /> Security center
      </h2>
      <p className="text-xs text-slate-300 mt-1">Backup encryption, archive window & session policy</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Download className="w-4 h-4" /> Encrypted backup
        </h3>
        <label className="block space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Backup password</span>
          <input
            type="password"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={backupPassword}
            onChange={(e) => setBackupPassword?.(e.target.value)}
            placeholder="Optional passphrase"
          />
        </label>
        <button
          type="button"
          onClick={() => handleBackup?.()}
          className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800"
        >
          Download platform backup
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Archive className="w-4 h-4" /> Archive transactions
        </h3>
        <label className="block space-y-1">
          <span className="text-[10px] font-black uppercase text-slate-400">Archive before date</span>
          <input
            type="date"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={archiveDate}
            onChange={(e) => setArchiveDate?.(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={() => handleArchive?.()}
          className="w-full py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Run archive
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-2 md:col-span-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Key className="w-4 h-4" /> Session context
        </h3>
        <p className="text-xs text-slate-600">
          Signed in as <span className="font-bold">{user?.name || user?.email || 'Admin'}</span>
        </p>
        <p className="text-xs text-slate-500">
          Enforce 2FA and rotate JWT secrets via environment in production. Never ship{' '}
          <code className="text-[10px] bg-slate-100 px-1 rounded">fallback_secret</code>.
        </p>
      </div>
    </div>
  </div>
);

export default AdminSecurityTab;
