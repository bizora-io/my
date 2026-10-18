/**
 * Staff sales vs monthly target helpers.
 */

export interface SaleLike {
  type: string;
  amount: number;
  date: string;
  salesperson?: string;
  createdBy?: string;
  isDeleted?: boolean;
}

export interface StaffLike {
  id: string;
  name: string;
  salesTarget?: number;
  commissionRate?: number;
  status?: string;
}

export interface StaffSalesProgress {
  staffId: string;
  staffName: string;
  target: number;
  totalSales: number;
  percentage: number;
  remaining: number;
  commissionRate: number;
  estimatedCommission: number;
  status: 'on_track' | 'behind' | 'achieved' | 'no_target';
}

function inMonth(iso: string, year: number, month: number): boolean {
  // month 1-12
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}/.test(d)) return false;
  const y = parseInt(d.slice(0, 4), 10);
  const m = parseInt(d.slice(5, 7), 10);
  return y === year && m === month;
}

function matchesSalesperson(tx: SaleLike, staff: StaffLike): boolean {
  const sp = (tx.salesperson || '').trim().toLowerCase();
  const name = staff.name.trim().toLowerCase();
  if (sp && (sp === name || sp === staff.id.toLowerCase())) return true;
  const created = (tx.createdBy || '').trim().toLowerCase();
  if (created && created === name) return true;
  return false;
}

export function getStaffSalesInPeriod(
  staff: StaffLike,
  transactions: SaleLike[],
  year: number,
  month: number
): number {
  return transactions
    .filter(
      (t) =>
        !t.isDeleted &&
        t.type === 'Sale' &&
        inMonth(t.date, year, month) &&
        matchesSalesperson(t, staff)
    )
    .reduce((s, t) => s + (Number(t.amount) || 0), 0);
}

export function getStaffSalesProgress(
  staffList: StaffLike[],
  transactions: SaleLike[],
  year: number,
  month: number
): StaffSalesProgress[] {
  return staffList
    .filter((s) => s.status !== 'Inactive')
    .map((staff) => {
      const target = Number(staff.salesTarget) || 0;
      const totalSales = getStaffSalesInPeriod(staff, transactions, year, month);
      const percentage = target > 0 ? Math.min(100, (totalSales / target) * 100) : 0;
      const remaining = Math.max(0, target - totalSales);
      const commissionRate = Number(staff.commissionRate) || 0;
      const estimatedCommission = (totalSales * commissionRate) / 100;
      let status: StaffSalesProgress['status'] = 'no_target';
      if (target > 0) {
        if (totalSales >= target) status = 'achieved';
        else if (percentage >= 70) status = 'on_track';
        else status = 'behind';
      }
      return {
        staffId: staff.id,
        staffName: staff.name,
        target,
        totalSales,
        percentage,
        remaining,
        commissionRate,
        estimatedCommission,
        status,
      };
    })
    .sort((a, b) => b.totalSales - a.totalSales);
}

export function currentYearMonth(d = new Date()): { year: number; month: number } {
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}
