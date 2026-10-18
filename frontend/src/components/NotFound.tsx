import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Home, ArrowLeft, Search, HelpCircle, Package, ShoppingBag, ShieldAlert, Sparkles } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';

export const NotFound: React.FC = () => {
  const { t, language } = useSettings();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isBn = language === 'bn';

  return (
    <main
      role="main"
      aria-labelledby="not-found-heading"
      className="min-h-[75vh] flex items-center justify-center p-4 sm:p-6 lg:p-12 animate-in fade-in duration-300"
    >
      <div className="w-full max-w-xl text-center">
        {/* Animated 404 Brand Badge */}
        <div className="inline-flex items-center justify-center mb-6">
          <div className="relative">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 flex items-center justify-center shadow-xl shadow-indigo-500/25 ring-8 ring-indigo-50 dark:ring-indigo-950/40">
              <span className="text-4xl sm:text-5xl font-black text-white tracking-tight">404</span>
            </div>
            <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold shadow-md">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Headings */}
        <h1
          id="not-found-heading"
          className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2"
        >
          {isBn ? 'পৃষ্ঠাটি খুঁজে পাওয়া যায়নি' : 'Page Not Found'}
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mb-2 max-w-md mx-auto">
          {isBn
            ? 'আপনি যে ঠিকানাটিতে যাওয়ার চেষ্টা করছেন তা হয়তো স্থানান্তরিত হয়েছে বা আর বিদ্যমান নেই।'
            : 'The page you are looking for does not exist, has been removed, or the link is broken.'}
        </p>

        {/* Display Attempted Route */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-mono text-slate-500 dark:text-slate-400 max-w-full truncate mb-8 border border-slate-200 dark:border-slate-700">
          <span className="shrink-0 text-slate-400">Path:</span>
          <span className="truncate">{location.pathname}</span>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm font-bold shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700/60 active:scale-95 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{isBn ? 'পূর্ববর্তী পাতায় যান' : 'Go Back'}</span>
          </button>

          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/25 active:scale-95 transition-all"
          >
            <Home className="w-4 h-4" />
            <span>{isBn ? 'ড্যাশবোর্ডে ফিরে যান' : 'Back to Dashboard'}</span>
          </Link>
        </div>

        {/* Quick Help Navigation Links */}
        {isAuthenticated && (
          <div className="pt-8 border-t border-slate-200 dark:border-slate-800/80">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
              {isBn ? 'জনপ্রিয় লিঙ্কসমূহ' : 'Quick Helpful Destinations'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg mx-auto">
              <Link
                to="/sale"
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-100 dark:border-slate-800 text-xs font-semibold transition-all group"
              >
                <ShoppingBag className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>{isBn ? 'বিক্রয় (POS)' : 'POS Sale'}</span>
              </Link>
              <Link
                to="/stock"
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-100 dark:border-slate-800 text-xs font-semibold transition-all group"
              >
                <Package className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>{isBn ? 'স্টক রিপোর্ট' : 'Stock List'}</span>
              </Link>
              <Link
                to="/support"
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-100 dark:border-slate-800 text-xs font-semibold transition-all group"
              >
                <HelpCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>{isBn ? 'হেল্প ও সাপোর্ট' : 'Support'}</span>
              </Link>
              <Link
                to="/training"
                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-100 dark:border-slate-800 text-xs font-semibold transition-all group"
              >
                <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>{isBn ? 'ব্যবহার নির্দেশিকা' : 'Guide / Docs'}</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default NotFound;

