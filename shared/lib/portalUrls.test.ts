import { test } from 'node:test';
import assert from 'node:assert';
import { getAdminPortalUrl, getShopPortalUrl, getEmployeePortalUrl, getCustomerPortalUrl, getMarketingUrl, extractRootDomain } from './portalUrls.ts';

test('portalUrls returns local defaults in node environment without window', () => {
  const adminUrl = getAdminPortalUrl();
  const shopUrl = getShopPortalUrl();
  const employeeUrl = getEmployeePortalUrl();
  const customerUrl = getCustomerPortalUrl();
  const marketingUrl = getMarketingUrl();

  assert.strictEqual(adminUrl, 'http://localhost:5174');
  assert.strictEqual(shopUrl, 'http://localhost:5173/#/shop-login');
  assert.strictEqual(employeeUrl, 'http://localhost:5173/#/employee-login');
  assert.strictEqual(customerUrl, 'http://localhost:5173/#/customer-login');
  assert.strictEqual(marketingUrl, 'http://localhost:5173/#/landing');
});

test('extractRootDomain dynamically derives root domains without hardcoding', () => {
  assert.strictEqual(extractRootDomain('bizora.io'), 'bizora.io');
  assert.strictEqual(extractRootDomain('shop.bizora.app.io'), 'app.io');
  assert.strictEqual(extractRootDomain('employee.custom-retail.com'), 'custom-retail.com');
  assert.strictEqual(extractRootDomain('dashboard_admin.myerp.com.bd'), 'myerp.com.bd');
  assert.strictEqual(extractRootDomain('my-shop.co.uk'), 'my-shop.co.uk');
});
