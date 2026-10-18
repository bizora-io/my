/**
 * Always-on auto backup + sync preferences.
 * Defaults favour continuous protection: short intervals, enabled by default.
 */

export type AutoBackupConfig = {
  enabled: boolean;
  /** Hours between routine cloud/local priority backups (fractional OK, min ~0.05 = 3 min) */
  intervalHours: number;
  keepLast: number;
  fullExportIntervalHours: number;
  lastRun?: string;
  lastFullExport?: string;
};

const KEY = (businessId: string) => `bizora_auto_backup_cfg_${businessId}`;

/** Always-on defaults: backup often, full export daily */
export const DEFAULT_AUTO_BACKUP: AutoBackupConfig = {
  enabled: true,
  intervalHours: 0.25, // 15 minutes
  keepLast: 15,
  fullExportIntervalHours: 12,
};

export function readAutoBackupConfig(businessId: string): AutoBackupConfig {
  try {
    const raw = localStorage.getItem(KEY(businessId));
    if (!raw) return { ...DEFAULT_AUTO_BACKUP };
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_AUTO_BACKUP,
      ...parsed,
      enabled: parsed.enabled !== false, // default ON
      intervalHours: Math.max(0.05, Number(parsed.intervalHours) || DEFAULT_AUTO_BACKUP.intervalHours),
      keepLast: Math.min(30, Math.max(5, Number(parsed.keepLast) || DEFAULT_AUTO_BACKUP.keepLast)),
      fullExportIntervalHours: Math.max(1, Number(parsed.fullExportIntervalHours) || 12),
    };
  } catch {
    return { ...DEFAULT_AUTO_BACKUP };
  }
}

export function writeAutoBackupConfig(businessId: string, patch: Partial<AutoBackupConfig>): AutoBackupConfig {
  const next = { ...readAutoBackupConfig(businessId), ...patch };
  try {
    localStorage.setItem(KEY(businessId), JSON.stringify(next));
  } catch { /* ignore */ }
  return next;
}

export function isBackupDue(lastIso: string | undefined, intervalHours: number): boolean {
  if (!lastIso) return true;
  const last = new Date(lastIso).getTime();
  if (Number.isNaN(last)) return true;
  return Date.now() - last >= intervalHours * 3600 * 1000;
}

/** Milliseconds for intervalHours (supports fractions) */
export function intervalMs(hours: number): number {
  return Math.max(60_000, hours * 3600 * 1000);
}
