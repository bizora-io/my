/**
 * Work-center capacity vs planned production load (pure).
 */

export interface WorkCenterInput {
  id: string;
  name: string;
  capacityPerDay?: number; // units or hours depending on mode
  capacityUnit?: 'units' | 'hours';
}

export interface BatchLoadInput {
  id: string;
  workCenter?: string | null;
  workCenterId?: string | null;
  quantity: number;
  /** Hours to produce this batch; if omitted, quantity is treated as load units */
  hoursRequired?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  productName?: string;
}

export interface DayLoad {
  date: string;
  load: number;
  capacity: number;
  utilization: number; // 0–1+
  overload: number;
  batchIds: string[];
}

export interface CenterSchedule {
  workCenterId: string;
  workCenterName: string;
  capacityPerDay: number;
  capacityUnit: 'units' | 'hours';
  days: DayLoad[];
  totalLoad: number;
  peakUtilization: number;
  overloadedDays: string[];
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseDate(s?: string): Date | null {
  if (!s) return null;
  const t = Date.parse(s);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function eachDay(from: Date, to: Date): string[] {
  const out: string[] = [];
  const cur = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (cur <= end) {
    out.push(dateKey(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/**
 * Build daily load per work center for open batches in a date window.
 */
export function buildCapacitySchedule(opts: {
  workCenters: WorkCenterInput[];
  batches: BatchLoadInput[];
  from: string;
  to: string;
  /** Only these statuses count as load (default Planned + In Progress) */
  activeStatuses?: string[];
}): { centers: CenterSchedule[]; unassigned: BatchLoadInput[] } {
  const active = new Set(
    (opts.activeStatuses || ['Planned', 'In Progress', 'Processing']).map((s) => s.toLowerCase())
  );
  const fromD = parseDate(opts.from) || new Date();
  const toD = parseDate(opts.to) || fromD;
  const days = eachDay(fromD, toD);

  const centers: CenterSchedule[] = opts.workCenters.map((wc) => ({
    workCenterId: wc.id,
    workCenterName: wc.name,
    capacityPerDay: Number(wc.capacityPerDay) || 0,
    capacityUnit: wc.capacityUnit === 'hours' ? 'hours' : 'units',
    days: days.map((date) => ({
      date,
      load: 0,
      capacity: Number(wc.capacityPerDay) || 0,
      utilization: 0,
      overload: 0,
      batchIds: [],
    })),
    totalLoad: 0,
    peakUtilization: 0,
    overloadedDays: [],
  }));

  const byId = new Map(centers.map((c) => [c.workCenterId, c]));
  // also match by name
  opts.workCenters.forEach((wc) => {
    const c = byId.get(wc.id);
    if (c) byId.set(wc.name, c);
  });

  const unassigned: BatchLoadInput[] = [];

  for (const batch of opts.batches) {
    const status = (batch.status || 'Planned').toLowerCase();
    if (!active.has(status)) continue;
    if (status === 'completed' || status === 'cancelled') continue;

    const wcKey = batch.workCenterId || batch.workCenter || '';
    const center = wcKey ? byId.get(wcKey) : null;
    if (!center) {
      unassigned.push(batch);
      continue;
    }

    const start = parseDate(batch.startDate) || fromD;
    // Spread load across start day only by default (finite capacity day bucket)
    const dayKey = dateKey(start);
    const day = center.days.find((d) => d.date === dayKey);
    const load =
      center.capacityUnit === 'hours'
        ? Number(batch.hoursRequired) || Number(batch.quantity) || 0
        : Number(batch.quantity) || 0;

    if (day) {
      day.load += load;
      day.batchIds.push(batch.id);
    } else {
      // Outside window — still count total
    }
    center.totalLoad += load;
  }

  for (const center of centers) {
    for (const day of center.days) {
      const cap = day.capacity > 0 ? day.capacity : 0;
      day.utilization = cap > 0 ? day.load / cap : day.load > 0 ? Infinity : 0;
      day.overload = Math.max(0, day.load - cap);
      if (day.overload > 0) center.overloadedDays.push(day.date);
    }
    center.peakUtilization = center.days.reduce((m, d) => {
      const u = Number.isFinite(d.utilization) ? d.utilization : d.load > 0 ? 999 : 0;
      return Math.max(m, u);
    }, 0);
  }

  return { centers, unassigned };
}

/** Suggest first day with remaining capacity for a new load. */
export function suggestAvailableDay(
  schedule: CenterSchedule,
  load: number,
  fromDate?: string
): string | null {
  const from = fromDate || schedule.days[0]?.date;
  for (const day of schedule.days) {
    if (from && day.date < from) continue;
    const remaining = day.capacity - day.load;
    if (remaining + 1e-9 >= load) return day.date;
  }
  return null;
}
