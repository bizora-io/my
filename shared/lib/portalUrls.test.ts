import { test } from 'node:test';
import assert from 'node:assert';
import { getAdminPortalUrl, getShopPortalUrl } from './portalUrls.ts';

test('portalUrls returns local defaults in node environment without window', () => {
  const adminUrl = getAdminPortalUrl();
  const shopUrl = getShopPortalUrl();
  assert.strictEqual(adminUrl, 'http://localhost:5174');
  assert.strictEqual(shopUrl, 'http://localhost:5173');
});
