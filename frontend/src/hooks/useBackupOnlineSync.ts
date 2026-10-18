
import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { authFetch } from '../lib/apiClient';
import {
  flushPendingCloudBackup,
  isPendingCloudSync,
  runPriorityBackup,
} from '@shared/lib/backupSync';

/**
 * When network returns, flush pending local backups to cloud.
 * Also takes a quiet local snapshot on tab hide (offline-safe).
 */
export function useBackupOnlineSync() {
  const { user, isAuthenticated } = useAuth();
  const { getAllData } = useData();
  const flushing = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) return;
    if (user.role === 'SAAS_OWNER' || user.role === 'SAAS_ADMIN') return;

    const businessId = user.id;

    const cloudPost = async (payload: any) => {
      const res = await authFetch('/api/backups', {
        method: 'POST',
        body: JSON.stringify({
          payload,
          source: 'online-flush',
          keep: 7,
          label: `Sync ${new Date().toLocaleString()}`,
          deviceId: payload.meta?.deviceId,
          revision: payload.meta?.revision,
          contentHash: payload.meta?.contentHash,
          meta: payload.meta,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: body.error || res.statusText };
      return { ok: true };
    };

    const tryFlush = async () => {
      if (flushing.current) return;
      if (!navigator.onLine) return;
      if (!isPendingCloudSync(businessId)) return;
      flushing.current = true;
      try {
        const r = await flushPendingCloudBackup({ businessId, cloudPost });
        if (r.flushed) console.info('[backup]', r.message);
      } finally {
        flushing.current = false;
      }
    };

    const onOnline = () => { tryFlush(); };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && user?.id) {
        // Quiet local snapshot when leaving tab (no cloud spam)
        runPriorityBackup({
          businessId,
          source: 'visibility',
          getData: () => getAllData(),
          isOnline: () => false, // force local only on hide
        }).catch(() => {});
      } else if (document.visibilityState === 'visible') {
        tryFlush();
      }
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisibility);
    // attempt once on mount if already online + pending
    tryFlush();

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [isAuthenticated, user?.id, user?.role, getAllData]);
}
