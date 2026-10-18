/**
 * Offline mutation queue with conflict resolution.
 *
 * Strategies:
 * - CREATE_TRANSACTION: server treats same id as idempotent (200 already_exists).
 * - PATCH_PRODUCT: prefer stockDelta / variantStockDeltas so concurrent offline
 *   sales compose; absolute writes use baseUpdatedAt and may 409.
 * - On 409: record conflict, drop or retry per policy; never blindly overwrite.
 */

export type OfflineOpType = 'CREATE_TRANSACTION' | 'PATCH_PRODUCT' | 'CREATE_ENTITY' | 'GENERIC';

export type ConflictResolution =
  | 'kept_server'
  | 'stock_delta_applied'
  | 'rejected_stale'
  | 'retried'
  | 'dropped';

export interface OfflineQueueItem {
  id: string;
  type: OfflineOpType;
  path: string;
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  createdAt: string;
  attempts: number;
  lastError?: string;
  /** Client's view of server updatedAt when the op was queued (optimistic concurrency). */
  baseUpdatedAt?: string;
  conflict?: string;
}

export interface OfflineConflictRecord {
  id: string;
  opId: string;
  type: OfflineOpType;
  path: string;
  conflict: string;
  resolution: ConflictResolution;
  serverSnapshot?: unknown;
  clientBody?: unknown;
  at: string;
}

const STORAGE_KEY = 'bizora_offline_queue';
const CONFLICT_KEY = 'bizora_offline_conflicts';
const MAX_ATTEMPTS = 8;

type Listener = (items: OfflineQueueItem[]) => void;
type ConflictListener = (items: OfflineConflictRecord[]) => void;
const listeners = new Set<Listener>();
const conflictListeners = new Set<ConflictListener>();

function readQueue(): OfflineQueueItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(items: OfflineQueueItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  listeners.forEach((fn) => {
    try {
      fn(items);
    } catch {
      /* ignore */
    }
  });
}

function readConflicts(): OfflineConflictRecord[] {
  try {
    const raw = localStorage.getItem(CONFLICT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeConflicts(items: OfflineConflictRecord[]) {
  // Keep last 50
  const trimmed = items.slice(-50);
  localStorage.setItem(CONFLICT_KEY, JSON.stringify(trimmed));
  conflictListeners.forEach((fn) => {
    try {
      fn(trimmed);
    } catch {
      /* ignore */
    }
  });
}

function pushConflict(rec: OfflineConflictRecord) {
  const all = readConflicts();
  all.push(rec);
  writeConflicts(all);
}

export function getOfflineQueue(): OfflineQueueItem[] {
  return readQueue();
}

export function getOfflineQueueCount(): number {
  return readQueue().length;
}

export function getOfflineConflicts(): OfflineConflictRecord[] {
  return readConflicts();
}

export function clearOfflineConflicts() {
  writeConflicts([]);
}

export function subscribeOfflineQueue(fn: Listener): () => void {
  listeners.add(fn);
  fn(readQueue());
  return () => {
    listeners.delete(fn);
  };
}

export function subscribeOfflineConflicts(fn: ConflictListener): () => void {
  conflictListeners.add(fn);
  fn(readConflicts());
  return () => {
    conflictListeners.delete(fn);
  };
}

export function enqueueOfflineOp(
  item: Omit<OfflineQueueItem, 'id' | 'createdAt' | 'attempts'> & { id?: string }
): OfflineQueueItem {
  const entry: OfflineQueueItem = {
    id: item.id || `oq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: item.type,
    path: item.path,
    method: item.method,
    body: item.body,
    createdAt: new Date().toISOString(),
    attempts: 0,
    baseUpdatedAt: item.baseUpdatedAt,
  };
  const q = readQueue();

  if (entry.type === 'CREATE_TRANSACTION' && entry.body && typeof entry.body === 'object' && (entry.body as any).id) {
    const txId = (entry.body as any).id;
    const filtered = q.filter(
      (x) => !(x.type === 'CREATE_TRANSACTION' && x.body && (x.body as any).id === txId)
    );
    filtered.push(entry);
    writeQueue(filtered);
  } else if (entry.type === 'PATCH_PRODUCT') {
    // Coalesce multiple stock deltas for the same product path
    const samePath = q.filter((x) => x.type === 'PATCH_PRODUCT' && x.path === entry.path);
    const others = q.filter((x) => !(x.type === 'PATCH_PRODUCT' && x.path === entry.path));
    if (samePath.length && entry.body && typeof entry.body === 'object') {
      const mergedBody: any = { ...(entry.body as object) };
      for (const prev of samePath) {
        if (prev.body && typeof prev.body === 'object') {
          const pb = prev.body as any;
          if (pb.stockDelta !== undefined || mergedBody.stockDelta !== undefined) {
            mergedBody.stockDelta = (Number(mergedBody.stockDelta) || 0) + (Number(pb.stockDelta) || 0);
          }
          if (pb.variantStockDeltas || mergedBody.variantStockDeltas) {
            const vd: Record<string, number> = { ...(pb.variantStockDeltas || {}) };
            const cur = mergedBody.variantStockDeltas || {};
            for (const [k, v] of Object.entries(cur)) {
              vd[k] = (Number(vd[k]) || 0) + (Number(v) || 0);
            }
            mergedBody.variantStockDeltas = vd;
          }
          // Prefer earliest baseUpdatedAt (most conservative concurrency token)
          if (pb.baseUpdatedAt && !mergedBody.baseUpdatedAt) mergedBody.baseUpdatedAt = pb.baseUpdatedAt;
        }
      }
      if (entry.baseUpdatedAt) mergedBody.baseUpdatedAt = entry.baseUpdatedAt;
      entry.body = mergedBody;
    }
    others.push(entry);
    writeQueue(others);
  } else {
    q.push(entry);
    writeQueue(q);
  }
  return entry;
}

export function isProbablyOffline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

export interface FlushResult {
  synced: number;
  failed: number;
  conflicts: number;
  remaining: number;
}

/**
 * Replay queued ops. 409 responses are handled by type-specific resolution.
 */
export async function flushOfflineQueue(
  fetchFn: (path: string, options?: RequestInit) => Promise<Response>
): Promise<FlushResult> {
  if (isProbablyOffline()) {
    return { synced: 0, failed: 0, conflicts: 0, remaining: readQueue().length };
  }

  const queue = readQueue();
  let synced = 0;
  let failed = 0;
  let conflicts = 0;
  const remaining: OfflineQueueItem[] = [];

  for (const item of queue) {
    try {
      const bodyPayload =
        item.body !== undefined
          ? {
              ...(typeof item.body === 'object' && item.body ? item.body : { value: item.body }),
              ...(item.baseUpdatedAt ? { baseUpdatedAt: item.baseUpdatedAt } : {}),
            }
          : undefined;

      const res = await fetchFn(item.path, {
        method: item.method,
        body: bodyPayload !== undefined ? JSON.stringify(bodyPayload) : undefined,
      });

      if (res.ok) {
        // 200 on transaction create may mean already_exists — still success
        const json = await res.json().catch(() => ({}));
        if (json?.conflict === 'already_exists') {
          pushConflict({
            id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            opId: item.id,
            type: item.type,
            path: item.path,
            conflict: 'already_exists',
            resolution: 'kept_server',
            serverSnapshot: json.transaction || json.product,
            clientBody: item.body,
            at: new Date().toISOString(),
          });
          conflicts++;
        }
        synced++;
        continue;
      }

      if (res.status === 409) {
        const json = await res.json().catch(() => ({}));
        const conflictType = json.conflict || 'stale_write';

        // Absolute product write conflict: convert to delta retry if body has absolute stock
        if (item.type === 'PATCH_PRODUCT' && conflictType === 'stale_write') {
          const client = (item.body || {}) as any;
          const server = json.product;
          // If client only intended a stock change, re-queue as delta from original intent
          if (client._intendedStockDelta !== undefined || client.stockDelta !== undefined) {
            // Already delta or has intent — shouldn't 409; drop with log
            pushConflict({
              id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              opId: item.id,
              type: item.type,
              path: item.path,
              conflict: conflictType,
              resolution: 'rejected_stale',
              serverSnapshot: server,
              clientBody: item.body,
              at: new Date().toISOString(),
            });
            conflicts++;
            continue;
          }
          // Absolute stock conflict: drop absolute fields, keep note
          pushConflict({
            id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            opId: item.id,
            type: item.type,
            path: item.path,
            conflict: conflictType,
            resolution: 'rejected_stale',
            serverSnapshot: server,
            clientBody: item.body,
            at: new Date().toISOString(),
          });
          conflicts++;
          continue;
        }

        if (item.type === 'CREATE_TRANSACTION' && conflictType === 'already_exists') {
          pushConflict({
            id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            opId: item.id,
            type: item.type,
            path: item.path,
            conflict: conflictType,
            resolution: 'kept_server',
            serverSnapshot: json.transaction,
            clientBody: item.body,
            at: new Date().toISOString(),
          });
          conflicts++;
          synced++;
          continue;
        }

        pushConflict({
          id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          opId: item.id,
          type: item.type,
          path: item.path,
          conflict: conflictType,
          resolution: 'rejected_stale',
          serverSnapshot: json.product || json.transaction,
          clientBody: item.body,
          at: new Date().toISOString(),
        });
        conflicts++;
        continue;
      }

      const errText = await res.text().catch(() => res.statusText);
      const nextAttempts = item.attempts + 1;
      if (nextAttempts >= MAX_ATTEMPTS) {
        failed++;
        pushConflict({
          id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          opId: item.id,
          type: item.type,
          path: item.path,
          conflict: `http_${res.status}`,
          resolution: 'dropped',
          clientBody: item.body,
          at: new Date().toISOString(),
        });
        console.warn('[offlineQueue] dropped after max attempts', item.id, errText);
        continue;
      }
      remaining.push({
        ...item,
        attempts: nextAttempts,
        lastError: `${res.status}: ${errText.slice(0, 200)}`,
      });
      failed++;
    } catch (e: any) {
      remaining.push({
        ...item,
        attempts: item.attempts + 1,
        lastError: e?.message || 'network error',
      });
      failed++;
    }
  }

  writeQueue(remaining);
  return { synced, failed, conflicts, remaining: remaining.length };
}

let wired = false;
export function wireOfflineQueueAutoFlush(
  fetchFn: (path: string, options?: RequestInit) => Promise<Response>
) {
  if (wired || typeof window === 'undefined') return;
  wired = true;
  window.addEventListener('online', () => {
    flushOfflineQueue(fetchFn).then((r) => {
      if (r.synced > 0 || r.conflicts > 0) {
        console.info(
          `[offlineQueue] synced ${r.synced}, conflicts ${r.conflicts}, remaining ${r.remaining}`
        );
      }
    });
  });
  if (!isProbablyOffline() && readQueue().length > 0) {
    setTimeout(() => flushOfflineQueue(fetchFn), 2000);
  }
}
