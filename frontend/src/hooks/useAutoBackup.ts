import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { authFetch } from '../lib/apiClient';
import {
  runPriorityBackup,
  flushPendingCloudBackup,
  isPendingCloudSync,
} from '@shared/lib/backupSync';
import {
  readAutoBackupConfig,
  writeAutoBackupConfig,
  isBackupDue,
  intervalMs,
} from '@shared/lib/autoBackupConfig';
import { flushOfflineQueue, getOfflineQueueCount } from '../lib/offlineQueue';
import { ensureRealtimeSocket } from '@shared/lib/realtimeSocket';

/**
 * Always-on auto backup + sync:
 * - Every ~15 min (configurable): client snapshot → cloud (local if offline)
 * - Every ~12h: full Firestore export-full online
 * - Every 30s when pending: offline queue + pending cloud flush
 * - On online / focus / visibility: immediate sync
 * - Debounced backup shortly after major local data changes (products/tx count)
 */
export function useAutoBackup() {
  const { user, isAuthenticated } = useAuth();
  const { getAllData, products, transactions } = useData() as any;
  const busy = useRef(false);
  const lastDataSig = useRef('');

  const isShop = Boolean(
    user?.id &&
      !['SAAS_OWNER', 'SAAS_ADMIN', 'CUSTOMER', 'SUPPLIER'].includes(String(user.role))
  );

  const cloudPost = useCallback(async (payload: any, source: string, keep: number) => {
    const res = await authFetch('/api/backups', {
      method: 'POST',
      body: JSON.stringify({
        payload,
        source,
        keep,
        label: `Auto ${new Date().toLocaleString()}`,
        deviceId: payload.meta?.deviceId,
        revision: payload.meta?.revision,
        contentHash: payload.meta?.contentHash,
        meta: payload.meta,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: body.error || res.statusText };
    return { ok: true };
  }, []);

  const runClientAuto = useCallback(
    async (force = false) => {
      if (!user?.id || busy.current) return;
      const cfg = readAutoBackupConfig(user.id);
      if (!cfg.enabled) return;
      if (!force && !isBackupDue(cfg.lastRun, cfg.intervalHours)) return;

      writeAutoBackupConfig(user.id, { lastRun: new Date().toISOString() });
      busy.current = true;
      try {
        await runPriorityBackup({
          businessId: user.id,
          source: force ? 'auto-force' : 'auto',
          keepLocalHistory: cfg.keepLast,
          getData: () => (typeof getAllData === 'function' ? getAllData() : {}),
          isOnline: () => typeof navigator !== 'undefined' && navigator.onLine,
          cloudPost: (payload) => cloudPost(payload, 'auto', cfg.keepLast),
        });
      } catch (e) {
        console.warn('[auto-sync] backup failed', e);
      } finally {
        busy.current = false;
      }
    },
    [user?.id, getAllData, cloudPost]
  );

  const runFullExport = useCallback(
    async (force = false) => {
      if (!user?.id || !navigator.onLine) return;
      const cfg = readAutoBackupConfig(user.id);
      if (!cfg.enabled) return;
      if (!force && !isBackupDue(cfg.lastFullExport, cfg.fullExportIntervalHours)) return;

      writeAutoBackupConfig(user.id, { lastFullExport: new Date().toISOString() });
      try {
        const res = await authFetch('/api/backups/export-full', {
          method: 'POST',
          body: JSON.stringify({
            keep: cfg.keepLast,
            label: `Auto full ${new Date().toLocaleString()}`,
          }),
        });
        if (res.ok) {
          console.info('[auto-sync] full online export ok');
        } else {
          console.warn('[auto-sync] export-full returned status:', res.status);
        }
      } catch (e) {
        console.warn('[auto-sync] export-full failed', e);
      }
    },
    [user?.id]
  );

  const syncAll = useCallback(async () => {
    if (!user?.id) return;
    try {
      ensureRealtimeSocket();
    } catch { /* */ }
    if (navigator.onLine) {
      try {
        await flushOfflineQueue(authFetch);
      } catch { /* */ }
      if (isPendingCloudSync(user.id)) {
        const cfg = readAutoBackupConfig(user.id);
        await flushPendingCloudBackup({
          businessId: user.id,
          cloudPost: (payload) => cloudPost(payload, 'online-flush', cfg.keepLast),
        });
      }
    }
    await runClientAuto(false);
    await runFullExport(false);
  }, [user?.id, cloudPost, runClientAuto, runFullExport]);

  // Continuous scheduler
  useEffect(() => {
    if (!isAuthenticated || !isShop || !user?.id) return;

    readAutoBackupConfig(user.id); // ensure defaults ON

    void syncAll();

    const cfg = readAutoBackupConfig(user.id);
    const backupTimer = window.setInterval(() => {
      void runClientAuto(false);
      void runFullExport(false);
    }, Math.min(intervalMs(cfg.intervalHours), 15 * 60 * 1000));

    // Aggressive pending sync every 30s
    const pendingTimer = window.setInterval(() => {
      if (!navigator.onLine) return;
      const n = getOfflineQueueCount();
      if (n > 0 || isPendingCloudSync(user.id)) {
        void flushOfflineQueue(authFetch).catch(() => {});
        if (isPendingCloudSync(user.id)) {
          const c = readAutoBackupConfig(user.id);
          void flushPendingCloudBackup({
            businessId: user.id,
            cloudPost: (payload) => cloudPost(payload, 'online-flush', c.keepLast),
          });
        }
      }
    }, 30_000);

    const onOnline = () => {
      void syncAll();
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') void syncAll();
    };
    const onFocus = () => {
      void syncAll();
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onFocus);

    return () => {
      window.clearInterval(backupTimer);
      window.clearInterval(pendingTimer);
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAuthenticated, isShop, user?.id, syncAll, runClientAuto, runFullExport, cloudPost]);

  // Debounced backup when data volume changes (sale/product edit)
  useEffect(() => {
    if (!isShop || !user?.id) return;
    const sig = `${(products || []).length}:${(transactions || []).length}`;
    if (!lastDataSig.current) {
      lastDataSig.current = sig;
      return;
    }
    if (sig === lastDataSig.current) return;
    lastDataSig.current = sig;
    const t = window.setTimeout(() => {
      void runClientAuto(true); // force after real change
    }, 45_000); // quiet 45s then backup
    return () => window.clearTimeout(t);
  }, [products, transactions, isShop, user?.id, runClientAuto]);
}
