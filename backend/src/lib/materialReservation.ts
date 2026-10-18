/**
 * Soft material reservations from open production batches.
 */

export interface ReservationLine {
  materialId: string;
  qty: number;
  batchId?: string;
}

export interface OpenBatchReservation {
  id: string;
  status?: string;
  /** Frozen explosion leaves from plan time */
  standardLeaves?: { materialId: string; qty: number }[];
  reservations?: { materialId: string; qty: number }[];
}

const OPEN = new Set(['planned', 'in progress', 'processing', 'hold']);

export function isOpenBatchStatus(status?: string): boolean {
  return OPEN.has(String(status || 'planned').toLowerCase());
}

/** Aggregate reserved qty by material from open batches. */
export function aggregateReservations(
  batches: OpenBatchReservation[],
  opts?: { excludeBatchId?: string }
): Map<string, number> {
  const map = new Map<string, number>();
  for (const b of batches) {
    if (opts?.excludeBatchId && b.id === opts.excludeBatchId) continue;
    if (!isOpenBatchStatus(b.status)) continue;
    const lines =
      Array.isArray(b.reservations) && b.reservations.length
        ? b.reservations
        : Array.isArray(b.standardLeaves)
          ? b.standardLeaves
          : [];
    for (const line of lines) {
      const id = line.materialId;
      const q = Number(line.qty) || 0;
      if (!id || q <= 0) continue;
      map.set(id, (map.get(id) || 0) + q);
    }
  }
  return map;
}

export function availableStock(onHand: number, reserved: number): number {
  return Math.max(0, (Number(onHand) || 0) - (Number(reserved) || 0));
}

/** MRP-style lines with reservation-aware availability. */
export function applyReservationsToMrpLines(
  lines: {
    materialId: string;
    required: number;
    onHand: number;
    [key: string]: any;
  }[],
  reservedByMaterial: Map<string, number>
) {
  return lines.map((l) => {
    const reserved = reservedByMaterial.get(l.materialId) || 0;
    const available = availableStock(l.onHand, reserved);
    const shortage = Math.max(0, l.required - available);
    return {
      ...l,
      reserved,
      available,
      shortage,
      ok: shortage <= 1e-6,
    };
  });
}
