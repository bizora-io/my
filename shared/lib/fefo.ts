/**
 * FEFO (First Expire First Out) lot allocation.
 */

export interface FefoLot {
  lotNumber: string;
  qty: number;
  expiryDate?: string; // YYYY-MM-DD
  receivedAt?: string;
  warehouseId?: string;
}

export interface FefoAllocationLine {
  lotNumber: string;
  qty: number;
  expiryDate?: string;
  daysUntilExpiry: number | null;
  warehouseId?: string;
}

export interface FefoAllocationResult {
  ok: boolean;
  requested: number;
  allocated: number;
  shortfall: number;
  lines: FefoAllocationLine[];
  skippedExpired: FefoLot[];
  remainingLots: FefoLot[];
}

function daysUntil(iso: string | undefined, asOf: Date): number | null {
  if (!iso) return null;
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return null;
  const t = new Date(asOf);
  t.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - t.getTime()) / (24 * 60 * 60 * 1000));
}

/** Sort lots: earliest expiry first; no-expiry last; stable by lotNumber. */
export function sortLotsFefo(lots: FefoLot[], asOf = new Date()): FefoLot[] {
  return [...lots].sort((a, b) => {
    const da = daysUntil(a.expiryDate, asOf);
    const db = daysUntil(b.expiryDate, asOf);
    if (da == null && db == null) return String(a.lotNumber).localeCompare(String(b.lotNumber));
    if (da == null) return 1;
    if (db == null) return -1;
    if (da !== db) return da - db;
    return String(a.lotNumber).localeCompare(String(b.lotNumber));
  });
}

/**
 * Allocate qty from lots using FEFO.
 * @param allowExpired if false (default), expired lots are skipped
 */
export function allocateFefo(
  lots: FefoLot[],
  qty: number,
  opts?: { asOf?: Date; allowExpired?: boolean; warehouseId?: string }
): FefoAllocationResult {
  const asOf = opts?.asOf || new Date();
  const allowExpired = opts?.allowExpired === true;
  const warehouseId = opts?.warehouseId ? String(opts.warehouseId) : null;
  const requested = Math.max(0, Number(qty) || 0);
  const scoped = warehouseId
    ? lots.filter((l) => !l.warehouseId || String(l.warehouseId) === warehouseId)
    : lots;
  const outOfScope = warehouseId
    ? lots.filter((l) => l.warehouseId && String(l.warehouseId) !== warehouseId)
    : [];
  const sorted = sortLotsFefo(scoped, asOf);
  const skippedExpired: FefoLot[] = [];
  const lines: FefoAllocationLine[] = [];
  const remaining: FefoLot[] = [];
  let need = requested;

  for (const lot of sorted) {
    const available = Math.max(0, Number(lot.qty) || 0);
    if (available <= 0) continue;
    const days = daysUntil(lot.expiryDate, asOf);
    if (!allowExpired && days != null && days < 0) {
      skippedExpired.push({ ...lot });
      remaining.push({ ...lot });
      continue;
    }
    if (need <= 0) {
      remaining.push({ ...lot });
      continue;
    }
    const take = Math.min(available, need);
    lines.push({
      lotNumber: lot.lotNumber,
      qty: take,
      expiryDate: lot.expiryDate,
      daysUntilExpiry: days,
      warehouseId: lot.warehouseId || warehouseId || undefined,
    });
    need -= take;
    const left = available - take;
    if (left > 1e-9) {
      remaining.push({ ...lot, qty: left });
    }
  }

  const allocated = requested - need;
  return {
    ok: need <= 1e-9,
    requested,
    allocated,
    shortfall: Math.max(0, need),
    lines,
    skippedExpired,
    remainingLots: [...remaining, ...outOfScope],
  };
}

/** Merge a new receipt into lots (same lotNumber aggregates). */
export function upsertLot(lots: FefoLot[], incoming: FefoLot): FefoLot[] {
  const list = Array.isArray(lots) ? [...lots] : [];
  const inWh = incoming.warehouseId ? String(incoming.warehouseId) : null;
  const idx = list.findIndex((l) => {
    if (String(l.lotNumber) !== String(incoming.lotNumber)) return false;
    const lWh = l.warehouseId ? String(l.warehouseId) : null;
    return lWh === inWh;
  });
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      qty: (Number(list[idx].qty) || 0) + (Number(incoming.qty) || 0),
      expiryDate: incoming.expiryDate || list[idx].expiryDate,
      receivedAt: incoming.receivedAt || list[idx].receivedAt,
      warehouseId: incoming.warehouseId || list[idx].warehouseId,
    };
  } else {
    list.push({ ...incoming });
  }
  return list.filter((l) => (Number(l.qty) || 0) > 0);
}

/** Apply FEFO allocation by reducing lot qtys. */
export function applyFefoDeduction(lots: FefoLot[], allocation: FefoAllocationResult): FefoLot[] {
  return allocation.remainingLots.filter((l) => (Number(l.qty) || 0) > 0);
}
