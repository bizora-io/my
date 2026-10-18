import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { runReadinessChecks } from './readiness.ts';

describe('readiness', () => {
  const keys = ['JWT_SECRET', 'NODE_ENV', 'OTP_DEV_ECHO', 'FIREBASE_SERVICE_ACCOUNT_JSON', 'GOOGLE_APPLICATION_CREDENTIALS'];
  const backup: Record<string, string | undefined> = {};

  before(() => {
    for (const k of keys) backup[k] = process.env[k];
  });
  after(() => {
    for (const k of keys) {
      if (backup[k] === undefined) delete process.env[k];
      else process.env[k] = backup[k];
    }
  });

  it('fails when JWT_SECRET is missing or default-like', () => {
    process.env.JWT_SECRET = 'fallback_secret_key_change_in_production';
    process.env.NODE_ENV = 'production';
    delete process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const r = runReadinessChecks();
    const jwt = r.checks.find((c) => c.id === 'jwt_secret');
    assert.equal(jwt?.status, 'fail');
    assert.ok(r.summary.fail >= 1);
  });

  it('passes jwt when strong secret is set', () => {
    process.env.JWT_SECRET = 'x'.repeat(40);
    process.env.NODE_ENV = 'development';
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON = '{"type":"service_account"}';
    process.env.OTP_DEV_ECHO = 'false';
    const r = runReadinessChecks();
    const jwt = r.checks.find((c) => c.id === 'jwt_secret');
    assert.equal(jwt?.status, 'pass');
  });

  it('fails OTP_DEV_ECHO in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.OTP_DEV_ECHO = 'true';
    process.env.JWT_SECRET = 'x'.repeat(40);
    const r = runReadinessChecks();
    const echo = r.checks.find((c) => c.id === 'otp_dev_echo');
    assert.equal(echo?.status, 'fail');
  });
});
