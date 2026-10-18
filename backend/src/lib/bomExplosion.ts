/**
 * Multi-level BOM explosion (pure).
 *
 * A BOM line may reference:
 * - a raw material (default), or
 * - a sub-assembly product that has its own BOM (componentType: 'subassembly'
 *   or materialId/productId matching another BOM's productId).
 * - a phantom assembly (componentType: 'phantom') — explode children into leaves
 *   without treating the phantom as a stocked intermediate.
 */

export type BomComponentType = 'raw' | 'subassembly' | 'phantom';

export interface BomLineInput {
  materialId?: string;
  productId?: string;
  name?: string;
  qty: number;
  componentType?: BomComponentType;
}

export interface BomInput {
  id: string;
  productId: string;
  productName?: string;
  /** Display name for alternate recipes e.g. "Primary", "Alt-A" */
  name?: string;
  code?: string;
  isDefault?: boolean;
  revision?: string | number;
  materials: BomLineInput[];
  yield?: number;
}

export interface ExplodedLeaf {
  materialId: string;
  name: string;
  qty: number;
  /** e.g. FG > SubAsm > Raw */
  path: string[];
  sources: { bomId: string; productId: string; qtyAtLevel: number }[];
}

export interface ExplosionLevel {
  depth: number;
  productId: string;
  productName: string;
  bomId: string;
  qty: number;
  lines: { id: string; name: string; qty: number; type: BomComponentType }[];
}

export interface ExplosionResult {
  ok: boolean;
  rootProductId: string;
  rootQty: number;
  leaves: ExplodedLeaf[];
  levels: ExplosionLevel[];
  cycles: string[];
  errors: string[];
}

function lineRef(line: BomLineInput): string {
  return String(line.productId || line.materialId || '').trim();
}

function isExpandable(
  line: BomLineInput,
  bomByProductId: Map<string, BomInput>
): boolean {
  if (line.componentType === 'raw') return false;
  if (line.componentType === 'subassembly' || line.componentType === 'phantom') return true;
  const ref = lineRef(line);
  return !!ref && bomByProductId.has(ref);
}

function lineType(
  line: BomLineInput,
  bomByProductId: Map<string, BomInput>
): BomComponentType {
  if (line.componentType === 'phantom') return 'phantom';
  if (line.componentType === 'subassembly') return 'subassembly';
  if (line.componentType === 'raw') return 'raw';
  const ref = lineRef(line);
  return ref && bomByProductId.has(ref) ? 'subassembly' : 'raw';
}

/**
 * Explode BOM tree into raw-material leaves.
 * @param rootBom top-level BOM
 * @param rootQty finished goods quantity
 * @param allBoms all BOMs for the business (for child lookup by productId)
 */
export function explodeBom(
  rootBom: BomInput,
  rootQty: number,
  allBoms: BomInput[],
  opts?: { maxDepth?: number }
): ExplosionResult {
  const maxDepth = opts?.maxDepth ?? 12;
  const bomByProductId = new Map<string, BomInput>();
  // Prefer isDefault; otherwise first seen (stable alternate resolution for sub-assemblies)
  const grouped = new Map<string, BomInput[]>();
  for (const b of allBoms) {
    if (!b.productId) continue;
    if (!grouped.has(b.productId)) grouped.set(b.productId, []);
    grouped.get(b.productId)!.push(b);
  }
  grouped.forEach((list, productId) => {
    const def = list.find((b) => b.isDefault) || list.find((b) => b.code === "PRIMARY") || list[0];
    bomByProductId.set(productId, def);
  });
  // Also index by bom id for convenience
  const bomById = new Map(allBoms.map((b) => [b.id, b]));

  const leafMap = new Map<string, ExplodedLeaf>();
  const levels: ExplosionLevel[] = [];
  const cycles: string[] = [];
  const errors: string[] = [];

  function visit(
    bom: BomInput,
    qty: number,
    depth: number,
    path: string[],
    stack: Set<string>
  ) {
    if (depth > maxDepth) {
      errors.push(`Max BOM depth ${maxDepth} exceeded at ${bom.productName || bom.productId}`);
      return;
    }
    if (stack.has(bom.productId)) {
      const cyclePath = [...path, bom.productName || bom.productId].join(' > ');
      cycles.push(cyclePath);
      errors.push(`Cycle detected: ${cyclePath}`);
      return;
    }

    const y = Number(bom.yield) > 0 ? Number(bom.yield) : 1;
    const effectiveQty = qty / y;
    const nextStack = new Set(stack);
    nextStack.add(bom.productId);
    const nextPath = [...path, bom.productName || bom.productId];

    const levelLines: ExplosionLevel['lines'] = [];
    const materials = Array.isArray(bom.materials) ? bom.materials : [];

    for (const line of materials) {
      const q = (Number(line.qty) || 0) * effectiveQty;
      if (q <= 0) continue;
      const ref = lineRef(line);
      const name = line.name || ref || 'unknown';
      const expand = isExpandable(line, bomByProductId);
      const typ = lineType(line, bomByProductId);

      levelLines.push({
        id: ref,
        name: typ === 'phantom' ? `${name} (phantom)` : name,
        qty: q,
        type: typ,
      });

      if (expand) {
        const childBom = bomByProductId.get(ref);
        if (!childBom) {
          errors.push(`No BOM found for ${typ} ${name} (${ref})`);
          continue;
        }
        // Phantom: still explode; path marks phantom so levels stay auditable
        const pathForChild =
          typ === 'phantom' ? [...nextPath, `${name} [phantom]`] : nextPath;
        visit(childBom, q, depth + 1, pathForChild, nextStack);
      } else {
        if (!ref) {
          errors.push(`BOM line missing materialId on ${bom.productName || bom.id}`);
          continue;
        }
        const existing = leafMap.get(ref);
        if (existing) {
          existing.qty += q;
          existing.sources.push({ bomId: bom.id, productId: bom.productId, qtyAtLevel: q });
        } else {
          leafMap.set(ref, {
            materialId: ref,
            name,
            qty: q,
            path: nextPath,
            sources: [{ bomId: bom.id, productId: bom.productId, qtyAtLevel: q }],
          });
        }
      }
    }

    levels.push({
      depth,
      productId: bom.productId,
      productName: bom.productName || bom.productId,
      bomId: bom.id,
      qty: effectiveQty,
      lines: levelLines,
    });
  }

  visit(rootBom, rootQty, 0, [], new Set());

  const leaves = [...leafMap.values()].map((l) => ({
    ...l,
    qty: Math.round(l.qty * 1e6) / 1e6,
  }));

  return {
    ok: errors.length === 0,
    rootProductId: rootBom.productId,
    rootQty,
    leaves,
    levels: levels.sort((a, b) => a.depth - b.depth),
    cycles,
    errors,
  };
}

/** Aggregate leaves for MRP display with stock. */
export function mrpFromExplosion(
  explosion: ExplosionResult,
  stockByMaterialId: Record<string, { stock?: number; unit?: string; cost?: number; name?: string }>
) {
  const lines = explosion.leaves.map((leaf) => {
    const mat = stockByMaterialId[leaf.materialId] || {};
    const onHand = Number(mat.stock) || 0;
    const required = leaf.qty;
    const shortage = Math.max(0, required - onHand);
    const unitCost = Number(mat.cost) || 0;
    return {
      materialId: leaf.materialId,
      name: mat.name || leaf.name,
      unit: mat.unit || '',
      required,
      onHand,
      shortage,
      ok: shortage <= 1e-6,
      unitCost,
      estimatedCost: required * unitCost,
      path: leaf.path.join(' > '),
      depth: leaf.path.length,
    };
  });
  return {
    canProduce: lines.every((l) => l.ok) && explosion.ok,
    totalMaterialCost: lines.reduce((s, l) => s + l.estimatedCost, 0),
    lines,
    shortages: lines.filter((l) => !l.ok),
    explosion,
  };
}
