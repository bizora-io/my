/**
 * Production cost variance: standard vs actual.
 */

export interface StandardCostInput {
  /** Standard material cost for the produced qty (from BOM explosion × unit costs) */
  material: number;
  /** Standard labor: sum(standardHours × qty factor × laborRate) */
  labor: number;
}

export interface ActualCostInput {
  material: number;
  labor: number;
}

export interface VarianceBreakdown {
  standardMaterial: number;
  standardLabor: number;
  standardTotal: number;
  actualMaterial: number;
  actualLabor: number;
  actualTotal: number;
  materialVariance: number; // actual - standard (positive = unfavorable)
  laborVariance: number;
  totalVariance: number;
  materialVariancePct: number | null;
  laborVariancePct: number | null;
  totalVariancePct: number | null;
  favorable: boolean;
}

export function computeCostVariance(
  standard: StandardCostInput,
  actual: ActualCostInput
): VarianceBreakdown {
  const sm = round(standard.material);
  const sl = round(standard.labor);
  const am = round(actual.material);
  const al = round(actual.labor);
  const st = round(sm + sl);
  const at = round(am + al);
  const mv = round(am - sm);
  const lv = round(al - sl);
  const tv = round(at - st);
  return {
    standardMaterial: sm,
    standardLabor: sl,
    standardTotal: st,
    actualMaterial: am,
    actualLabor: al,
    actualTotal: at,
    materialVariance: mv,
    laborVariance: lv,
    totalVariance: tv,
    materialVariancePct: sm > 0 ? round((mv / sm) * 100) : null,
    laborVariancePct: sl > 0 ? round((lv / sl) * 100) : null,
    totalVariancePct: st > 0 ? round((tv / st) * 100) : null,
    favorable: tv <= 0,
  };
}

function round(n: number) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/**
 * Standard labor from routing steps.
 * hoursRequired = sum(standardHours) * (qty / batchBase) — we treat standardHours as per batch plan qty unit.
 */
export function standardLaborFromOperations(
  operations: { standardHours?: number }[] | undefined,
  qty: number,
  laborRatePerHour: number,
  baseQty = 1
): number {
  const hours = (operations || []).reduce((s, o) => s + (Number(o.standardHours) || 0), 0);
  const scale = baseQty > 0 ? qty / baseQty : qty;
  return round(hours * scale * (Number(laborRatePerHour) || 0));
}

export function standardMaterialFromLeaves(
  leaves: { qty: number; unitCost?: number }[]
): number {
  return round(leaves.reduce((s, l) => s + l.qty * (Number(l.unitCost) || 0), 0));
}
