/**
 * Partial sales return helpers — remaining qty and proportional refund.
 */

export type SaleLine = {
  productId: string;
  variantId?: string;
  name?: string;
  qty: number;
  price: number;
  total?: number;
  lots?: { lotNumber: string; qty: number; expiryDate?: string }[];
  batchNumber?: string;
  expiryDate?: string;
};

export type ReturnTxLike = {
  type?: string;
  isDeleted?: boolean;
  reference?: string;
  notes?: string;
  items?: SaleLine[];
};

/** Match Sales Return rows tied to an original sale id */
export function isReturnForSale(tx: ReturnTxLike, saleId: string): boolean {
  if (tx.isDeleted || tx.type !== 'Sales Return') return false;
  const ref = String(tx.reference || '');
  const notes = String(tx.notes || '');
  // RET-<last6> or explicit sale id in reference
  if (ref.includes(saleId) || ref.endsWith(saleId.slice(-6))) return true;
  if (notes.includes(saleId)) return true;
  return false;
}

/** Match Purchase Return rows tied to an original purchase id */
export function isReturnForPurchase(tx: ReturnTxLike, purchaseId: string): boolean {
  if (tx.isDeleted || tx.type !== 'Purchase Return') return false;
  const ref = String(tx.reference || '');
  const notes = String(tx.notes || '');
  if (ref.includes(purchaseId) || ref.endsWith(purchaseId.slice(-6))) return true;
  if (notes.includes(purchaseId)) return true;
  return false;
}

export function lineIdentity(item: SaleLine, idx: number): string {
  return `${item.productId}::${item.variantId || ''}::${idx}`;
}

/**
 * Sum already-returned qty per original line index.
 * Prefer matching by productId + variantId; distribute across lines of same product in order.
 */
export function alreadyReturnedByLine(
  saleItems: SaleLine[],
  priorReturns: ReturnTxLike[]
): number[] {
  const remaining = saleItems.map((i) => Number(i.qty) || 0);
  const returned = saleItems.map(() => 0);

  for (const rt of priorReturns) {
    for (const ri of rt.items || []) {
      let need = Number(ri.qty) || 0;
      if (need <= 0) continue;
      for (let i = 0; i < saleItems.length && need > 0; i++) {
        const s = saleItems[i];
        const sameProduct = s.productId === ri.productId;
        const sameVariant = (s.variantId || '') === (ri.variantId || '');
        if (!sameProduct || !sameVariant) continue;
        const can = Math.max(0, remaining[i] - returned[i]);
        const take = Math.min(can, need);
        if (take > 0) {
          returned[i] += take;
          need -= take;
        }
      }
    }
  }
  return returned;
}

export function remainingReturnable(
  saleItems: SaleLine[],
  priorReturns: ReturnTxLike[]
): number[] {
  const returned = alreadyReturnedByLine(saleItems, priorReturns);
  return saleItems.map((s, i) => Math.max(0, (Number(s.qty) || 0) - returned[i]));
}

/** Proportional refund for selected return qtys (line price × qty) */
export function calculatePartialRefund(
  saleItems: SaleLine[],
  returnQtys: number[]
): number {
  let sum = 0;
  for (let i = 0; i < saleItems.length; i++) {
    const q = Math.min(
      Math.max(0, Number(returnQtys[i]) || 0),
      Number(saleItems[i].qty) || 0
    );
    sum += q * (Number(saleItems[i].price) || 0);
  }
  return Math.round(sum * 100) / 100;
}

/** Slice FEFO lot lines for partial qty (consume from first lots) */
export function sliceLotsForQty(
  origLots: { lotNumber: string; qty: number; expiryDate?: string }[],
  qty: number
): { lotNumber: string; qty: number; expiryDate?: string }[] {
  let need = Math.max(0, qty);
  const out: { lotNumber: string; qty: number; expiryDate?: string }[] = [];
  for (const line of origLots) {
    if (need <= 0) break;
    const take = Math.min(Number(line.qty) || 0, need);
    if (take > 0) {
      out.push({ lotNumber: line.lotNumber, qty: take, expiryDate: line.expiryDate });
      need -= take;
    }
  }
  return out;
}

export type InvoiceAdjustments = {
  /** Line subtotal before discount/tax (sum of qty*price) */
  subtotal?: number;
  discount?: number;
  tax?: number;
  /** Final invoice total if known — used as sanity cap */
  amount?: number;
};

export type PartialRefundBreakdown = {
  linesSubtotal: number;
  discountShare: number;
  taxShare: number;
  /** linesSubtotal - discountShare + taxShare */
  refund: number;
  ratio: number;
};

/**
 * Partial refund with proportional discount & tax.
 * ratio = returnedLinesSubtotal / originalLinesSubtotal (or original subtotal field).
 * discountShare = discount * ratio; taxShare = tax * ratio.
 */
export function calculatePartialRefundWithAdjustments(
  saleItems: SaleLine[],
  returnQtys: number[],
  adj: InvoiceAdjustments = {}
): PartialRefundBreakdown {
  const linesSubtotal = calculatePartialRefund(saleItems, returnQtys);
  let originalSubtotal = Number(adj.subtotal);
  if (!originalSubtotal || originalSubtotal <= 0) {
    originalSubtotal = saleItems.reduce(
      (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0),
      0
    );
  }
  const ratio =
    originalSubtotal > 0 ? Math.min(1, Math.max(0, linesSubtotal / originalSubtotal)) : 0;
  const discount = Math.max(0, Number(adj.discount) || 0);
  const tax = Math.max(0, Number(adj.tax) || 0);
  const discountShare = Math.round(discount * ratio * 100) / 100;
  const taxShare = Math.round(tax * ratio * 100) / 100;
  let refund = Math.round((linesSubtotal - discountShare + taxShare) * 100) / 100;
  if (refund < 0) refund = 0;
  // Cap at original amount if provided
  if (adj.amount != null && Number(adj.amount) >= 0) {
    refund = Math.min(refund, Number(adj.amount));
  }
  return { linesSubtotal, discountShare, taxShare, refund, ratio };
}
