/**
 * Suggest purchase quantities when stock is at or below minimum.
 */

export interface ProductReorderLike {
  id: string;
  name: string;
  stock?: number;
  minStockLevel?: number;
  purchasePrice?: number;
  supplierId?: string;
  isDeleted?: boolean;
  type?: string;
  category?: string;
  unit?: string;
}

export interface ReorderSuggestion {
  productId: string;
  productName: string;
  stock: number;
  minStock: number;
  /** Suggested order qty to reach 2× min (or min+1 if min is 0) */
  suggestedQty: number;
  estimatedCost: number;
  supplierId?: string;
  category?: string;
  unit?: string;
}

export function collectReorderSuggestions(
  products: ProductReorderLike[],
  opts?: { targetMultiplier?: number }
): ReorderSuggestion[] {
  const mult = opts?.targetMultiplier ?? 2;
  const out: ReorderSuggestion[] = [];

  for (const p of products) {
    if (p.isDeleted || p.type === 'Service') continue;
    const stock = Number(p.stock) || 0;
    const min = Number(p.minStockLevel);
    if (!min || min <= 0) continue;
    if (stock > min) continue;

    const target = Math.ceil(min * mult);
    const suggestedQty = Math.max(1, target - stock);
    const price = Number(p.purchasePrice) || 0;
    out.push({
      productId: p.id,
      productName: p.name,
      stock,
      minStock: min,
      suggestedQty,
      estimatedCost: suggestedQty * price,
      supplierId: p.supplierId,
      category: p.category,
      unit: p.unit,
    });
  }

  out.sort((a, b) => a.stock / a.minStock - b.stock / b.minStock);
  return out;
}

export function reorderTotals(items: ReorderSuggestion[]) {
  return {
    count: items.length,
    units: items.reduce((s, i) => s + i.suggestedQty, 0),
    estimatedCost: items.reduce((s, i) => s + i.estimatedCost, 0),
  };
}
