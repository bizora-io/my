
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_CRYPTO_INFO, isEncryptedBlob } from './backupCrypto.ts';

describe('backupCrypto', () => {
  it('documents preferred method', () => {
    assert.match(BACKUP_CRYPTO_INFO.primary.name, /AES-256-GCM/);
    assert.ok(BACKUP_CRYPTO_INFO.alternatives.length >= 2);
  });
  it('detects blob shape', () => {
    assert.equal(isEncryptedBlob({ v: 1, alg: 'AES-GCM-256', ct: 'x' }), true);
    assert.equal(isEncryptedBlob({ foo: 1 }), false);
  });
});
