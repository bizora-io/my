/**
 * Allocate supplier payments against open purchase balances (FIFO or selected).
 */

export interface OpenPurchase {
  id: string;
  date: string;
  reference?: string;
  amount: number;
  dueAmount: number;
  entityName: string;
}

export interface AllocationLine {
  purchaseId: string;
  amount: number;
}

export interface TxLike {
  id: string;
  type: string;
  date: string;
  entityId?: string;
  entityName?: string;
  entityMobile?: string;
  amount: number;
  dueAmount?: number;
  amountPaid?: number;
  paymentMethod?: string;
  reference?: string;
  isDeleted?: boolean;
}

function sameSupplier(tx: TxLike, supplier: { id?: string; name?: string; mobile?: string }) {
  if (supplier.id && tx.entityId === supplier.id) return true;
  if (supplier.mobile && tx.entityMobile && supplier.mobile === tx.entityMobile) return true;
  if (supplier.name && tx.entityName && supplier.name.toLowerCase() === tx.entityName.toLowerCase()) return true;
  return false;
}

export function getOpenSupplierPurchases(
  transactions: TxLike[],
  supplier: { id?: string; name?: string; mobile?: string }
): OpenPurchase[] {
  return transactions
    .filter((t) => {
      if (t.isDeleted || t.type !== 'Purchase') return false;
      if (!sameSupplier(t, supplier)) return false;
      const due =
        Number(t.dueAmount) ||
        (t.paymentMethod === 'Due' ? Math.max(0, Number(t.amount) - (Number(t.amountPaid) || 0)) : 0);
      return due > 0.009;
    })
    .map((t) => {
      const due =
        Number(t.dueAmount) ||
        (t.paymentMethod === 'Due' ? Math.max(0, Number(t.amount) - (Number(t.amountPaid) || 0)) : 0);
      return {
        id: t.id,
        date: (t.date || '').slice(0, 10),
        reference: t.reference,
        amount: Number(t.amount) || 0,
        dueAmount: due,
        entityName: t.entityName || '',
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date)); // FIFO
}

/** FIFO allocate payment across open purchases. */
export function allocateFifo(open: OpenPurchase[], paymentAmount: number): AllocationLine[] {
  let remaining = paymentAmount;
  const lines: AllocationLine[] = [];
  for (const p of open) {
    if (remaining <= 0.009) break;
    const apply = Math.min(p.dueAmount, remaining);
    if (apply > 0.009) {
      lines.push({ purchaseId: p.id, amount: Math.round(apply * 100) / 100 });
      remaining -= apply;
    }
  }
  return lines;
}

export function allocationTotal(lines: AllocationLine[]) {
  return lines.reduce((s, l) => s + l.amount, 0);
}
