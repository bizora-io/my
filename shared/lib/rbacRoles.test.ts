/**
 * Smoke: backend RBAC packs used at employee-login time.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveStaffPermissions,
  matchRoleTemplateId,
} from '../../backend/src/lib/rbacRoles.ts';

describe('RBAC role templates (smoke)', () => {
  it('cashier can sell and view stock', () => {
    const perms = resolveStaffPermissions({ role: 'Cashier', roleTemplateId: 'cashier' });
    assert.ok(perms.includes('pos.sell'));
    assert.ok(perms.includes('pos.quick_sale'));
    assert.ok(perms.includes('inventory.view'));
    assert.ok(!perms.some((p) => p.startsWith('saas.')));
  });

  it('manager gets full shop pack', () => {
    const perms = resolveStaffPermissions({ role: 'Manager', roleTemplateId: 'manager' });
    assert.ok(perms.length > 10);
    assert.ok(perms.includes('pos.sell'));
    assert.ok(perms.includes('inventory.purchase'));
  });

  it('stock manager can purchase', () => {
    assert.equal(matchRoleTemplateId('Stock Manager'), 'stock_manager');
    const perms = resolveStaffPermissions({
      role: 'Stock Manager',
      roleTemplateId: 'stock_manager',
    });
    assert.ok(perms.includes('inventory.purchase'));
  });

  it('explicit custom permissions win', () => {
    const perms = resolveStaffPermissions({
      role: 'Custom',
      roleTemplateId: 'custom',
      permissions: ['pos.sell', 'crm.view'],
    });
    assert.deepEqual([...perms].sort(), ['crm.view', 'pos.sell']);
  });

  it('matchRoleTemplateId maps labels', () => {
    assert.equal(matchRoleTemplateId('Cashier'), 'cashier');
    assert.equal(matchRoleTemplateId('Salesperson'), 'salesperson');
  });
});
