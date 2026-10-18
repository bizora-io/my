import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  policyFromSettings,
  daysUntilExpiry,
  statusFromDays,
  worstLotStatus,
  lotsFromProduct,
  DEFAULT_FEFO_POLICY,
} from './fefoPolicy.ts';

describe('fefoPolicy', () => {
  it('policyFromSettings applies defaults and overrides', () => {
    assert.deepEqual(policyFromSettings(null), DEFAULT_FEFO_POLICY);
    const p = policyFromSettings({ fefoWarnDays: 14, fefoCriticalDays: 3, fefoBlockExpired: true });
    assert.equal(p.warnDays, 14);
    assert.equal(p.criticalDays, 3);
    assert.equal(p.blockExpired, true);
  });

  it('daysUntilExpiry computes day delta', () => {
    const asOf = new Date('2026-09-24T12:00:00');
    assert.equal(daysUntilExpiry('2026-09-24', asOf), 0);
    assert.equal(daysUntilExpiry('2026-09-27', asOf), 3);
    assert.equal(daysUntilExpiry('2026-09-20', asOf), -4);
    assert.equal(daysUntilExpiry(undefined, asOf), null);
  });

  it('statusFromDays respects policy windows', () => {
    const policy = { warnDays: 30, criticalDays: 7, blockExpired: false };
    assert.equal(statusFromDays(-1, policy), 'expired');
    assert.equal(statusFromDays(3, policy), 'critical');
    assert.equal(statusFromDays(15, policy), 'warning');
    assert.equal(statusFromDays(45, policy), 'ok');
    assert.equal(statusFromDays(null, policy), 'none');
  });

  it('worstLotStatus prefers expired over critical', () => {
    const policy = DEFAULT_FEFO_POLICY;
    const asOf = new Date('2026-09-24');
    const w = worstLotStatus(
      [
        { lotNumber: 'A', qty: 5, expiryDate: '2026-10-01' },
        { lotNumber: 'B', qty: 2, expiryDate: '2026-09-01' },
      ],
      policy,
      asOf
    );
    assert.equal(w.status, 'expired');
    assert.equal(w.lotNumber, 'B');
  });

  it('lotsFromProduct synthesizes DEFAULT when only product expiry exists', () => {
    const lots = lotsFromProduct({
      stock: 10,
      batchNumber: 'BN1',
      expiryDate: '2026-12-01',
    });
    assert.equal(lots.length, 1);
    assert.equal(lots[0].lotNumber, 'BN1');
    assert.equal(lots[0].qty, 10);
  });

  it('lotsFromProduct returns empty for services', () => {
    assert.deepEqual(lotsFromProduct({ type: 'Service', stock: 5, expiryDate: '2026-01-01' }), []);
  });
});
