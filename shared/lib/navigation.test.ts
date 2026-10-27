import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  NAV_GROUPS,
  ALL_NAV_ITEMS,
  PATH_TO_NAV_ITEM,
  PATH_TO_NAV_GROUP,
  getAuthorizedNavGroups,
  searchNavigation,
  getNavBreadcrumbs
} from '../config/navigation.ts';

describe('Bizora ERP Navigation Architecture & Single Source of Truth', () => {
  describe('Integrity & Route Mapping', () => {
    test('all functional navigation groups exist and are populated', () => {
      assert.ok(NAV_GROUPS.length >= 8, `Expected at least 8 navigation groups, got ${NAV_GROUPS.length}`);
      for (const group of NAV_GROUPS) {
        assert.ok(group.id, 'Group must have an id');
        assert.ok(group.title, 'Group must have an English title');
        assert.ok(group.titleBn, 'Group must have a Bengali title');
        assert.ok(group.iconName, 'Group must have an iconName');
        assert.ok(Array.isArray(group.items) && group.items.length > 0, `Group ${group.id} must have items`);
      }
    });

    test('all navigation items have unique IDs and valid canonical paths', () => {
      const seenIds = new Set<string>();
      const seenPaths = new Set<string>();

      for (const item of ALL_NAV_ITEMS) {
        assert.ok(!seenIds.has(item.id), `Duplicate nav item ID detected: ${item.id}`);
        seenIds.add(item.id);

        assert.ok(!seenPaths.has(item.to), `Duplicate nav route detected: ${item.to}`);
        seenPaths.add(item.to);

        assert.ok(item.to.startsWith('/'), `Path must start with slash: ${item.to}`);
        assert.ok(item.label && item.label.trim().length > 0, `Item ${item.id} must have English label`);
        assert.ok(item.labelBn && item.labelBn.trim().length > 0, `Item ${item.id} must have Bengali label`);
        assert.ok(item.iconName && item.iconName.trim().length > 0, `Item ${item.id} must have iconName`);
        assert.ok(item.description && item.description.trim().length > 0, `Item ${item.id} must have English description`);
        assert.ok(item.descriptionBn && item.descriptionBn.trim().length > 0, `Item ${item.id} must have Bengali description`);
        assert.ok(Array.isArray(item.keywords) && item.keywords.length > 0, `Item ${item.id} must have searchable keywords`);
      }
    });

    test('PATH_TO_NAV_ITEM and PATH_TO_NAV_GROUP correctly index all items', () => {
      for (const item of ALL_NAV_ITEMS) {
        const indexedItem = PATH_TO_NAV_ITEM[item.to];
        assert.equal(indexedItem?.id, item.id, `PATH_TO_NAV_ITEM failed for ${item.to}`);

        const indexedGroup = PATH_TO_NAV_GROUP[item.to];
        assert.ok(indexedGroup, `PATH_TO_NAV_GROUP failed for ${item.to}`);
        assert.ok(indexedGroup.items.some(i => i.id === item.id), `Item ${item.id} not in parent group items`);
      }
    });
  });

  describe('Role-Based Authorization & Permission Filtering', () => {
    test('full-access owner receives all groups and features', () => {
      const groups = getAuthorizedNavGroups({
        user: { role: 'SHOP_OWNER', businessType: 'retail' },
        hasPermission: () => true,
        hasFeature: () => true,
        isFullAccess: true
      });

      assert.ok(groups.length >= 8, 'Full access owner should see all 8 functional groups');
      const allItems = groups.flatMap(g => g.items);
      assert.ok(allItems.length >= 30, 'Full access owner should see complete feature catalog');
    });

    test('restricted cashier with only pos.sell sees only accessible groups and items', () => {
      const groups = getAuthorizedNavGroups({
        user: { role: 'EMPLOYEE', businessType: 'retail' },
        hasPermission: (perm) => perm === 'pos.sell',
        hasFeature: () => true,
        isFullAccess: false
      });

      // Cashier should see Workspace (Home) and Sales & POS (Sell / Quotations if pos.sell)
      const groupIds = groups.map(g => g.id);
      assert.ok(groupIds.includes('grp-overview'), 'Cashier must see Overview group');
      assert.ok(groupIds.includes('grp-sales'), 'Cashier must see Sales & POS group');
      assert.ok(!groupIds.includes('grp-hr'), 'Cashier must not see HR group');

      const items = groups.flatMap(g => g.items);
      const paths = items.map(i => i.to);
      assert.ok(paths.includes('/sale'), 'Cashier must see /sale');
      assert.ok(!paths.includes('/settings'), 'Cashier must not see /settings');
      assert.ok(!paths.includes('/employees'), 'Cashier must not see /employees');
      assert.ok(!paths.includes('/stock'), 'Cashier must not see /stock without inventory permission');
    });

    test('restaurant businessType includes kitchen display, retail excludes it', () => {
      const restaurantGroups = getAuthorizedNavGroups({
        user: { role: 'SHOP_OWNER', businessType: 'restaurant' },
        hasPermission: () => true,
        hasFeature: () => true,
        isFullAccess: true
      });
      const restaurantPaths = restaurantGroups.flatMap(g => g.items).map(i => i.to);
      assert.ok(restaurantPaths.includes('/kitchen'), 'Restaurant user must have /kitchen accessible');

      const retailGroups = getAuthorizedNavGroups({
        user: { role: 'SHOP_OWNER', businessType: 'retail' },
        hasPermission: () => true,
        hasFeature: () => true,
        isFullAccess: true
      });
      const retailPaths = retailGroups.flatMap(g => g.items).map(i => i.to);
      assert.ok(!retailPaths.includes('/kitchen'), 'Retail user must not see restaurant /kitchen');
    });

    test('unsubscribed feature is flagged with isLocked: true', () => {
      const groups = getAuthorizedNavGroups({
        user: { role: 'SHOP_OWNER', businessType: 'retail' },
        hasPermission: () => true,
        hasFeature: (feat) => feat !== 'manufacturing', // lacks manufacturing
        isFullAccess: true
      });

      const productionItem = groups.flatMap(g => g.items).find(i => i.to === '/production');
      assert.ok(productionItem, 'Production item should be present in menu');
      assert.equal(productionItem.isLocked, true, 'Production item must be flagged isLocked: true');
    });
  });

  describe('Bilingual Search & Keywords', () => {
    test('searches correctly by English label and route', () => {
      const sellResults = searchNavigation('sell');
      assert.ok(sellResults.some(i => i.to === '/sale'), 'Query "sell" must find /sale');

      const loanResults = searchNavigation('loans');
      assert.ok(loanResults.some(i => i.to === '/loans'), 'Query "loans" must find /loans');

      const routeResults = searchNavigation('/stock');
      assert.ok(routeResults.some(i => i.to === '/stock'), 'Query "/stock" must find /stock');
    });

    test('searches correctly by Bengali label', () => {
      const bnResults = searchNavigation('বিক্রয়');
      assert.ok(bnResults.some(i => i.to === '/sale'), 'Query "বিক্রয়" must find /sale');

      const stockResults = searchNavigation('স্টক');
      assert.ok(stockResults.some(i => i.to === '/stock'), 'Query "স্টক" must find /stock');

      const cashResults = searchNavigation('ক্যাশ');
      assert.ok(cashResults.some(i => i.to === '/cashbox'), 'Query "ক্যাশ" must find /cashbox');
    });

    test('searches correctly by specialized ERP keywords', () => {
      const fefoResults = searchNavigation('fefo');
      assert.ok(fefoResults.some(i => i.to === '/lots'), 'Keyword "fefo" must find /lots');

      const vatResults = searchNavigation('vat');
      assert.ok(vatResults.some(i => i.to === '/reports'), 'Keyword "vat" must find /reports');

      const barcodeResults = searchNavigation('barcode');
      assert.ok(barcodeResults.some(i => i.to === '/products' || i.to === '/sale'), 'Keyword "barcode" must match relevant tools');
    });

    test('empty query returns all items', () => {
      const all = searchNavigation('');
      assert.equal(all.length, ALL_NAV_ITEMS.length, 'Empty search should return all items');
    });
  });

  describe('Dynamic Breadcrumbs Generation', () => {
    test('generates home breadcrumb for root', () => {
      const enCrumbs = getNavBreadcrumbs('/', 'en');
      assert.equal(enCrumbs.length, 1);
      assert.equal(enCrumbs[0].label, 'Home');

      const bnCrumbs = getNavBreadcrumbs('/', 'bn');
      assert.equal(bnCrumbs.length, 1);
      assert.equal(bnCrumbs[0].label, 'হোম');
    });

    test('generates hierarchical breadcrumbs for ERP modules', () => {
      const saleCrumbs = getNavBreadcrumbs('/sale', 'en');
      assert.equal(saleCrumbs.length, 3);
      assert.equal(saleCrumbs[0].label, 'Home');
      assert.equal(saleCrumbs[1].label, 'Sales & POS');
      assert.equal(saleCrumbs[2].label, 'Sell / POS');
      assert.equal(saleCrumbs[2].to, '/sale');

      const stockCrumbs = getNavBreadcrumbs('/stock', 'en');
      assert.equal(stockCrumbs.length, 3);
      assert.equal(stockCrumbs[0].label, 'Home');
      assert.equal(stockCrumbs[1].label, 'Inventory & Stock');
      assert.equal(stockCrumbs[2].label, 'Stock Report');
      assert.equal(stockCrumbs[2].to, '/stock');
    });

    test('generates localized Bengali breadcrumbs', () => {
      const bnSaleCrumbs = getNavBreadcrumbs('/sale', 'bn');
      assert.equal(bnSaleCrumbs.length, 3);
      assert.equal(bnSaleCrumbs[0].label, 'হোম');
      assert.equal(bnSaleCrumbs[1].label, 'বিক্রয় ও পিওএস');
      assert.equal(bnSaleCrumbs[2].label, 'বিক্রয় (পিওএস)');

      const bnLoansCrumbs = getNavBreadcrumbs('/loans', 'bn');
      assert.equal(bnLoansCrumbs.length, 3);
      assert.equal(bnLoansCrumbs[0].label, 'হোম');
      assert.equal(bnLoansCrumbs[1].label, 'অর্থ ও হিসাব');
      assert.equal(bnLoansCrumbs[2].label, 'ঋণ ও দায়');
    });

    test('handles unrecognized subroutes with safe fallback', () => {
      const crumbs = getNavBreadcrumbs('/custom-feature/sub-item', 'en');
      assert.ok(crumbs.length >= 2);
      assert.equal(crumbs[0].label, 'Home');
    });

    test('generates accurate breadcrumbs for new items and canonical aliases', () => {
      const notifCrumbs = getNavBreadcrumbs('/notifications', 'en');
      assert.equal(notifCrumbs.length, 3);
      assert.equal(notifCrumbs[1].label, 'Workspace');
      assert.equal(notifCrumbs[2].label, 'Notifications');
      assert.equal(notifCrumbs[2].to, '/notifications');

      const bankCrumbs = getNavBreadcrumbs('/bank-reconcile', 'en');
      assert.equal(bankCrumbs.length, 3);
      assert.equal(bankCrumbs[1].label, 'Finance & Accounts');
      assert.equal(bankCrumbs[2].label, 'Bank Reconciliation');
      assert.equal(bankCrumbs[2].to, '/bank-reconcile');

      const auditCrumbs = getNavBreadcrumbs('/audit', 'en');
      assert.equal(auditCrumbs.length, 3);
      assert.equal(auditCrumbs[1].label, 'System & Tools');
      assert.equal(auditCrumbs[2].label, 'Security & Audit Log');
      assert.equal(auditCrumbs[2].to, '/audit');

      const auditLogAliasCrumbs = getNavBreadcrumbs('/audit-log', 'en');
      assert.equal(auditLogAliasCrumbs.length, 3);
      assert.equal(auditLogAliasCrumbs[2].label, 'Security & Audit Log');

      const assistantAliasCrumbs = getNavBreadcrumbs('/assistant', 'en');
      assert.equal(assistantAliasCrumbs.length, 3);
      assert.equal(assistantAliasCrumbs[2].label, 'ERP AI Assistant');
    });
  });
});
