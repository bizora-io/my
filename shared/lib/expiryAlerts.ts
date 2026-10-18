/**
 * Product batch/expiry alerting.
 */

export interface ProductExpiryLike {
  id: string;
  name: string;
  stock?: number;
  expiryDate?: string;
  batchNumber?: string;
  isDeleted?: boolean;
  type?: string;
}

export interface ExpiryAlertItem {
  productId: string;
  productName: string;
  expiryDate: string;
  batchNumber?: string;
  stock: number;
  daysUntilExpiry: number; // negative = already expired
  status: 'expired' | 'critical' | 'warning';
}

function daysUntil(iso: string, asOf: Date): number {
  const d = new Date(iso.slice(0, 10) + 'T00:00:00');
  if (Number.isNaN(d.getTime())) return 9999;
  const t = new Date(asOf);
  t.setHours(0, 0, 0, 0);
  return Math.floor((d.getTime() - t.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * @param warnWithinDays default 30 — warning window
 * @param criticalWithinDays default 7
 */
export function collectExpiryAlerts(
  products: ProductExpiryLike[],
  opts?: { asOf?: Date; warnWithinDays?: number; criticalWithinDays?: number }
): ExpiryAlertItem[] {
  const asOf = opts?.asOf || new Date();
  const warn = opts?.warnWithinDays ?? 30;
  const critical = opts?.criticalWithinDays ?? 7;
  const items: ExpiryAlertItem[] = [];

  for (const p of products) {
    if (p.isDeleted || p.type === 'Service') continue;
    if (!p.expiryDate) continue;
    const stock = Number(p.stock) || 0;
    if (stock <= 0) continue;
    const days = daysUntil(p.expiryDate, asOf);
    if (days > warn) continue;
    let status: ExpiryAlertItem['status'] = 'warning';
    if (days < 0) status = 'expired';
    else if (days <= critical) status = 'critical';
    items.push({
      productId: p.id,
      productName: p.name,
      expiryDate: p.expiryDate.slice(0, 10),
      batchNumber: p.batchNumber,
      stock,
      daysUntilExpiry: days,
      status,
    });
  }

  items.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  return items;
}

export function expiryAlertTotals(items: ExpiryAlertItem[]) {
  return {
    count: items.length,
    expired: items.filter((i) => i.status === 'expired').length,
    critical: items.filter((i) => i.status === 'critical').length,
    warning: items.filter((i) => i.status === 'warning').length,
  };
}
