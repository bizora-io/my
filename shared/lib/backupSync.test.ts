import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  contentHash,
  detectBackupConflict,
  type BackupMeta,
  verifyBackupIntegrity,
} from './backupSync.ts';

describe('backupSync', () => {
  it('hashes stably', () => {
    assert.equal(contentHash({ a: 1 }), contentHash({ a: 1 }));
    assert.notEqual(contentHash({ a: 1 }), contentHash({ a: 2 }));
  });

  it('detects multi-device conflict', () => {
    const local: BackupMeta = {
      businessId: 'b1',
      deviceId: 'd1',
      revision: 3,
      contentHash: 'aaa',
      exportedAt: '2026-01-01T10:00:00.000Z',
      source: 'local',
    };
    const incoming: BackupMeta = {
      businessId: 'b1',
      deviceId: 'd2',
      revision: 4,
      contentHash: 'bbb',
      exportedAt: '2026-01-01T12:00:00.000Z',
      source: 'cloud',
    };
    const c = detectBackupConflict(local, incoming);
    assert.equal(c.hasConflict, true);
    assert.equal(c.reason, 'multi_device_divergence');
  });

  it('no conflict on same hash', () => {
    const m: BackupMeta = {
      businessId: 'b1',
      deviceId: 'd1',
      revision: 1,
      contentHash: 'x',
      exportedAt: '2026-01-01T00:00:00.000Z',
      source: 'manual',
    };
    assert.equal(detectBackupConflict(m, { ...m }).hasConflict, false);
  });
});

  it('verifyBackupIntegrity detects tamper', () => {
    const body = { products: [1], exportedAt: '2026-01-01' };
    const hash = contentHash(body);
    const payload = { ...body, meta: { businessId: 'b', deviceId: 'd', revision: 1, contentHash: hash, exportedAt: '2026-01-01', source: 'manual' } };
    assert.equal(verifyBackupIntegrity(payload).ok, true);
    const bad = { ...payload, products: [1, 2] };
    assert.equal(verifyBackupIntegrity(bad).ok, false);
  });
