import React, { useEffect, useState, Component, type ReactNode } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SettingsProvider } from './contexts/SettingsContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { StoreProvider } from './contexts/StoreContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { UserRole } from './types';
import { Auth } from './components/Auth';
import AdminPanel from './components/AdminPanel';

class AdminErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  props!: { children?: ReactNode };
  setState!: (state: any) => void;
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <h1 className="text-lg font-black text-slate-800 mb-2">Admin panel error</h1>
          <p className="text-sm text-slate-600 max-w-md mb-4 font-mono break-all">
            {this.state.error.message}
          </p>
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold"
            onClick={() => {
              this.setState({ error: null });
              window.location.hash = '#/admin';
              window.location.reload();
            }}
          >
            Reload admin
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function isSaaSRole(role: unknown): boolean {
  const r = String(role || '');
  return (
    r === UserRole.SAAS_OWNER ||
    r === UserRole.SAAS_ADMIN ||
    r === 'SAAS_OWNER' ||
    r === 'SAAS_ADMIN'
  );
}

const AdminGate: React.FC = () => {
  const { user, exitImpersonation, logout } = useAuth() as any;
  const [restoring, setRestoring] = useState(false);

  // After "Login as shop", session is SHOP_OWNER — restore SaaS owner on admin app
  useEffect(() => {
    if (!user) return;
    if (isSaaSRole(user.role)) return;
    const original = localStorage.getItem('nexus_original_saas_user');
    if (!original) return;
    setRestoring(true);
    (async () => {
      try {
        if (typeof exitImpersonation === 'function') {
          await exitImpersonation();
        } else {
          const ou = JSON.parse(original);
          localStorage.setItem('nexus_user', JSON.stringify(ou));
          const tok = localStorage.getItem('bizora_saas_token_backup');
          if (tok) {
            localStorage.setItem('bizora_token', tok);
            localStorage.setItem('bizora_access_token', tok);
          }
          const ref = localStorage.getItem('bizora_saas_refresh_backup');
          if (ref) localStorage.setItem('bizora_refresh_token', ref);
          localStorage.removeItem('nexus_original_saas_user');
          localStorage.removeItem('bizora_impersonating');
          localStorage.removeItem('bizora_impersonate_reason');
          localStorage.removeItem('bizora_impersonate_started_at');
          window.location.reload();
        }
      } catch (e) {
        console.warn('restore saas session', e);
      } finally {
        setRestoring(false);
      }
    })();
  }, [user?.id, user?.role, exitImpersonation]);

  if (!user) {
    return <Auth />;
  }

  if (restoring || (!isSaaSRole(user.role) && localStorage.getItem('nexus_original_saas_user'))) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-slate-50 text-slate-600 text-sm">
        Restoring SaaS admin session…
      </div>
    );
  }

  if (!isSaaSRole(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full bg-slate-50 text-slate-600 text-sm px-6 text-center gap-4">
        <p>
          This account does not have access to the Bizora Admin app.
          <br />
          Please sign in with a SaaS Owner/Admin account, or open the main Bizora shop app.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold"
            onClick={() => {
              try {
                localStorage.removeItem('nexus_user');
                localStorage.removeItem('bizora_token');
                localStorage.removeItem('bizora_refresh_token');
              } catch { /* */ }
              if (typeof logout === 'function') logout();
              else window.location.reload();
            }}
          >
            Sign out & use SaaS login
          </button>
        </div>
      </div>
    );
  }

  return (
    <AdminErrorBoundary>
      <AdminPanel />
    </AdminErrorBoundary>
  );
};

import AdminNotFound from './components/AdminNotFound';

const App: React.FC = () => (
  <SettingsProvider>
    <NotificationProvider>
      <AuthProvider>
        <StoreProvider>
          <DataProvider>
            <Router>
              <Routes>
                <Route path="/" element={<Navigate to="/admin" replace />} />
                <Route path="/admin" element={<AdminGate />} />
                <Route path="*" element={<AdminNotFound />} />
              </Routes>
            </Router>
          </DataProvider>
        </StoreProvider>
      </AuthProvider>
    </NotificationProvider>
  </SettingsProvider>
);

export default App;
