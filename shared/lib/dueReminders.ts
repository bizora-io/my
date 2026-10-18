/**
 * Customer receivable / installment due helpers for reminders.
 */

export interface InstallmentLike {
  id: string;
  dueDate: string;
  amount: number;
  status: string;
  paidDate?: string;
}

export interface SaleLike {
  id: string;
  type: string;
  date: string;
  entityId?: string;
  entityName: string;
  entityMobile?: string;
  amount: number;
  dueAmount?: number;
  paymentMethod?: string;
  amountPaid?: number;
  installments?: InstallmentLike[];
  isDeleted?: boolean;
}

export interface DueReminderItem {
  id: string;
  kind: 'installment' | 'open_due';
  customerName: string;
  customerMobile?: string;
  amount: number;
  dueDate: string;
  daysOverdue: number;
  saleId: string;
  label: string;
}

function daysBetween(isoDate: string, today: Date): number {
  const d = new Date(isoDate.slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return 0;
  const t = new Date(today);
  t.setHours(0, 0, 0, 0);
  return Math.floor((t.getTime() - d.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * @param graceDays — open-due sales only after this many days past sale date
 */
export function collectDueReminders(
  transactions: SaleLike[],
  opts?: { asOf?: Date; graceDays?: number }
): DueReminderItem[] {
  const today = opts?.asOf || new Date();
  const grace = opts?.graceDays ?? 0;
  const items: DueReminderItem[] = [];

  for (const sale of transactions) {
    if (sale.isDeleted || sale.type !== 'Sale') continue;

    if (sale.installments?.length) {
      for (const inst of sale.installments) {
        if (inst.status === 'Paid') continue;
        const overdueDays = daysBetween(inst.dueDate, today);
        if (overdueDays < 0) continue; // not yet due
        // due today or past
        items.push({
          id: `inst-${sale.id}-${inst.id}`,
          kind: 'installment',
          customerName: sale.entityName,
          customerMobile: sale.entityMobile,
          amount: Number(inst.amount) || 0,
          dueDate: inst.dueDate.slice(0, 10),
          daysOverdue: Math.max(0, overdueDays),
          saleId: sale.id,
          label:
            overdueDays === 0
              ? `Installment due today · ${sale.entityName}`
              : `Installment ${overdueDays}d overdue · ${sale.entityName}`,
        });
      }
      continue;
    }

    const due =
      Number(sale.dueAmount) ||
      (sale.paymentMethod === 'Due'
        ? Math.max(0, Number(sale.amount) - (Number(sale.amountPaid) || 0))
        : 0);
    if (due <= 0.009) continue;
    const age = daysBetween(sale.date, today);
    if (age < grace) continue;
    items.push({
      id: `due-${sale.id}`,
      kind: 'open_due',
      customerName: sale.entityName,
      customerMobile: sale.entityMobile,
      amount: due,
      dueDate: sale.date.slice(0, 10),
      daysOverdue: Math.max(0, age),
      saleId: sale.id,
      label:
        age <= 0
          ? `Open due · ${sale.entityName}`
          : `Open due ${age}d · ${sale.entityName}`,
    });
  }

  items.sort((a, b) => b.daysOverdue - a.daysOverdue || b.amount - a.amount);
  return items;
}

export function dueReminderTotals(items: DueReminderItem[]) {
  return {
    count: items.length,
    amount: items.reduce((s, i) => s + i.amount, 0),
    overdueCount: items.filter((i) => i.daysOverdue > 0).length,
  };
}
