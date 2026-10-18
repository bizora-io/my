/**
 * Serial unit tracking with optional lot linkage.
 * Prefer structured serialUnits[]; fall back to legacy serialNumbers: string[].
 */

export type SerialStatus = 'available' | 'sold' | 'returned' | 'reserved';

export type SerialUnit = {
  serial: string;
  lotNumber?: string;
  status: SerialStatus;
  soldAt?: string;
  saleId?: string;
};

export function normalizeSerialUnits(
  product: {
    serialUnits?: SerialUnit[];
    serialNumbers?: string[];
  }
): SerialUnit[] {
  if (Array.isArray(product.serialUnits) && product.serialUnits.length) {
    return product.serialUnits.map((u) => ({
      serial: String(u.serial || '').trim(),
      lotNumber: u.lotNumber,
      status: (u.status as SerialStatus) || 'available',
      soldAt: u.soldAt,
      saleId: u.saleId,
    })).filter((u) => u.serial);
  }
  const legacy = product.serialNumbers || [];
  return legacy
    .map((s) => String(s).trim())
    .filter(Boolean)
    .map((serial) => ({ serial, status: 'available' as SerialStatus }));
}

export function availableSerials(units: SerialUnit[]): SerialUnit[] {
  return units.filter((u) => u.status === 'available');
}

/** Mark up to qty serials as sold (FIFO by array order). */
export function allocateSerials(
  units: SerialUnit[],
  qty: number,
  opts?: { saleId?: string; preferredLot?: string }
): { next: SerialUnit[]; used: SerialUnit[] } {
  const need = Math.max(0, Math.floor(qty));
  const used: SerialUnit[] = [];
  const next = units.map((u) => ({ ...u }));
  let left = need;

  // Prefer preferred lot first
  if (opts?.preferredLot) {
    for (let i = 0; i < next.length && left > 0; i++) {
      if (next[i].status !== 'available') continue;
      if (next[i].lotNumber !== opts.preferredLot) continue;
      next[i] = {
        ...next[i],
        status: 'sold',
        soldAt: new Date().toISOString(),
        saleId: opts.saleId,
      };
      used.push(next[i]);
      left--;
    }
  }

  for (let i = 0; i < next.length && left > 0; i++) {
    if (next[i].status !== 'available') continue;
    next[i] = {
      ...next[i],
      status: 'sold',
      soldAt: new Date().toISOString(),
      saleId: opts.saleId,
    };
    used.push(next[i]);
    left--;
  }

  return { next, used };
}

/** Restore serials on return (by serial list or saleId). */
export function restoreSerials(
  units: SerialUnit[],
  opts: { serials?: string[]; saleId?: string }
): SerialUnit[] {
  const set = new Set((opts.serials || []).map((s) => s.trim()).filter(Boolean));
  return units.map((u) => {
    const matchSerial = set.size > 0 && set.has(u.serial);
    const matchSale = opts.saleId && u.saleId === opts.saleId;
    if ((matchSerial || matchSale) && u.status === 'sold') {
      return { ...u, status: 'returned' as SerialStatus, saleId: undefined, soldAt: undefined };
    }
    return u;
  });
}

export function serialsToLegacyList(units: SerialUnit[]): string[] {
  return availableSerials(units).map((u) => u.serial);
}
