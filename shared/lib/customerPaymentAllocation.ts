/**
 * Allocate customer receipts against open sale balances (FIFO or selected).
 */

export interface OpenSale {
  id: string;
  date: string;
  reference?: string;
  amount: number;
  dueAmount: number;
  entityName: string;
}

export interface ReceiptAllocationLine {
  saleId: string;
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
  installments?: { id: string; amount: number; status: string; dueDate: string }[];
}

function sameCustomer(tx: TxLike, customer: { id?: string; name?: string; mobile?: string }) {
  if (customer.id && tx.entityId === customer.id) return true;
  if (customer.mobile && tx.entityMobile && customer.mobile === tx.entityMobile) return true;
  if (customer.name && tx.entityName && customer.name.toLowerCase() === tx.entityName.toLowerCase()) return true;
  return false;
}

export function getOpenCustomerSales(
  transactions: TxLike[],
  customer: { id?: string; name?: string; mobile?: string }
): OpenSale[] {
  return transactions
    .filter((t) => {
      if (t.isDeleted || t.type !== 'Sale') return false;
      if (!sameCustomer(t, customer)) return false;
      // Skip pure installment schedules with no residual dueAmount if all installments paid
      if (t.installments?.length) {
        const pending = t.installments
          .filter((i) => i.status !== 'Paid')
          .reduce((s, i) => s + (Number(i.amount) || 0), 0);
        if (pending > 0.009) {
          return true; // treat as open via installments - use pending as due
        }
      }
      const due =
        Number(t.dueAmount) ||
        (t.paymentMethod === 'Due' || t.paymentMethod === 'Partial' || t.paymentMethod === 'Installment'
          ? Math.max(0, Number(t.amount) - (Number(t.amountPaid) || 0))
          : 0);
      return due > 0.009;
    })
    .map((t) => {
      let due =
        Number(t.dueAmount) ||
        (t.paymentMethod === 'Due' || t.paymentMethod === 'Partial' || t.paymentMethod === 'Installment'
          ? Math.max(0, Number(t.amount) - (Number(t.amountPaid) || 0))
          : 0);
      if (t.installments?.length) {
        const pending = t.installments
          .filter((i) => i.status !== 'Paid')
          .reduce((s, i) => s + (Number(i.amount) || 0), 0);
        if (pending > due) due = pending;
      }
      return {
        id: t.id,
        date: (t.date || '').slice(0, 10),
        reference: t.reference,
        amount: Number(t.amount) || 0,
        dueAmount: due,
        entityName: t.entityName || '',
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function allocateReceiptFifo(open: OpenSale[], paymentAmount: number): ReceiptAllocationLine[] {
  let remaining = paymentAmount;
  const lines: ReceiptAllocationLine[] = [];
  for (const s of open) {
    if (remaining <= 0.009) break;
    const apply = Math.min(s.dueAmount, remaining);
    if (apply > 0.009) {
      lines.push({ saleId: s.id, amount: Math.round(apply * 100) / 100 });
      remaining -= apply;
    }
  }
  return lines;
}
