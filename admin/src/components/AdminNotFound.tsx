import React from 'react';
import { LayoutDashboard, ArrowLeft, ShieldAlert, Store, RefreshCw } from 'lucide-react';

export const AdminNotFound: React.FC = () => {
  const shopAppUrl = (import.meta as any).env?.VITE_APP_URL || 'http://localhost:5173';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-6">
      <div className="w-full max-w-md text-center">
        {/* Brand Badge */}
        <div className="inline-flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-2xl shadow-indigo-500/30 ring-8 ring-white/5">
              <span className="text-4xl font-black text-white">404</span>
            </div>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold shadow-md">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-white">
          Admin Page Not Found
        </h1>
        <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto">
          The requested admin view or resource could not be found. You may have typed an incorrect URL or the section has moved.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              window.location.hash = '#/admin?tab=dashboard';
              window.location.reload();
            }}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to Admin Dashboard</span>
          </button>

          <a
            href={shopAppUrl}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-sm font-bold transition-all active:scale-95"
          >
            <Store className="w-4 h-4" />
            <span>Open Shop App</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default AdminNotFound;

