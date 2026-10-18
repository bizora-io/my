import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { explodeBom } from './bomExplosion.ts';

describe('bomExplosion', () => {
  const boms = [
    {
      id: 'bom-fg',
      productId: 'fg',
      productName: 'Finished',
      materials: [
        { materialId: 'sub', name: 'SubAsm', qty: 2, componentType: 'subassembly' as const },
        { materialId: 'r1', name: 'Raw1', qty: 1 },
      ],
    },
    {
      id: 'bom-sub',
      productId: 'sub',
      productName: 'SubAsm',
      materials: [
        { materialId: 'r2', name: 'Raw2', qty: 3 },
        { materialId: 'r1', name: 'Raw1', qty: 0.5 },
      ],
    },
  ];

  it('explodes multi-level and aggregates common raws', () => {
    const r = explodeBom(boms[0], 10, boms);
    assert.equal(r.ok, true);
    const byId = Object.fromEntries(r.leaves.map((l) => [l.materialId, l.qty]));
    // 10 FG * 1 R1 + 10*2 Sub * 0.5 R1 = 10 + 10 = 20
    assert.equal(byId.r1, 20);
    // 10*2 Sub * 3 R2 = 60
    assert.equal(byId.r2, 60);
    assert.equal(byId.sub, undefined);
  });

  it('detects cycles', () => {
    const cyclic = [
      {
        id: 'a',
        productId: 'pa',
        productName: 'A',
        materials: [{ materialId: 'pb', qty: 1, componentType: 'subassembly' as const }],
      },
      {
        id: 'b',
        productId: 'pb',
        productName: 'B',
        materials: [{ materialId: 'pa', qty: 1, componentType: 'subassembly' as const }],
      },
    ];
    const r = explodeBom(cyclic[0], 1, cyclic);
    assert.equal(r.ok, false);
    assert.ok(r.cycles.length > 0);
  });

  it('respects yield', () => {
    const bom = {
      id: 'y',
      productId: 'p',
      productName: 'P',
      yield: 2,
      materials: [{ materialId: 'r', name: 'R', qty: 1 }],
    };
    const r = explodeBom(bom, 10, [bom]);
    // 10 FG / yield 2 * 1 = 5
    assert.equal(r.leaves[0].qty, 5);
  });
});

  it('prefers default alternate BOM for sub-assembly', () => {
    const boms = [
      {
        id: 'fg',
        productId: 'fg',
        productName: 'FG',
        materials: [{ materialId: 'sub', qty: 1, componentType: 'subassembly' as const }],
      },
      {
        id: 'sub-old',
        productId: 'sub',
        productName: 'Sub',
        isDefault: false,
        materials: [{ materialId: 'r-old', qty: 1 }],
      },
      {
        id: 'sub-new',
        productId: 'sub',
        productName: 'Sub',
        isDefault: true,
        materials: [{ materialId: 'r-new', qty: 2 }],
      },
    ];
    const r = explodeBom(boms[0], 1, boms);
    assert.equal(r.leaves.length, 1);
    assert.equal(r.leaves[0].materialId, 'r-new');
    assert.equal(r.leaves[0].qty, 2);
  });

describe('phantom BOM', () => {
  it('explodes phantom into raw leaves', () => {
    const boms = [
      {
        id: 'fg',
        productId: 'FG1',
        productName: 'FG',
        materials: [
          { productId: 'PH1', name: 'Kit', qty: 1, componentType: 'phantom' as const },
        ],
        yield: 1,
      },
      {
        id: 'ph',
        productId: 'PH1',
        productName: 'Kit',
        materials: [
          { materialId: 'R1', name: 'Raw1', qty: 2, componentType: 'raw' as const },
          { materialId: 'R2', name: 'Raw2', qty: 3, componentType: 'raw' as const },
        ],
        yield: 1,
      },
    ];
    const r = explodeBom(boms[0], 2, boms);
    assert.equal(r.ok, true);
    assert.equal(r.leaves.length, 2);
    const r1 = r.leaves.find((l) => l.materialId === 'R1');
    const r2 = r.leaves.find((l) => l.materialId === 'R2');
    assert.equal(r1?.qty, 4);
    assert.equal(r2?.qty, 6);
    assert.ok(r.levels.some((lv) => lv.lines.some((ln) => ln.type === 'phantom')));
  });
});
