import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  FEATURE_CATEGORIES, 
  ALL_FEATURES, 
  TOTAL_FEATURES_COUNT,
  getFeatureById,
  getFeaturesByCategory,
  getRecommendedFeaturesForPlan,
  isFeatureEnabled
} from './featureRegistry.ts';

describe('Feature Registry & Access Control', () => {
  it('registers all 11 core ERP modules and has over 40 granular features', () => {
    assert.strictEqual(FEATURE_CATEGORIES.length, 11);
    assert.ok(ALL_FEATURES.length >= 40);
    assert.strictEqual(TOTAL_FEATURES_COUNT, ALL_FEATURES.length);
    const ids = ALL_FEATURES.map(f => f.id);
    assert.ok(ids.includes('pos.quick_sale'));
    assert.ok(ids.includes('inventory.transfer'));
    assert.ok(ids.includes('hrm.payroll'));
    assert.ok(ids.includes('manufacturing.bom'));
    assert.ok(ids.includes('ecommerce.storefront'));
  });

  it('filters features by category correctly', () => {
    const posFeatures = getFeaturesByCategory('pos');
    assert.ok(posFeatures.length >= 3);
    posFeatures.forEach(f => assert.strictEqual(f.category, 'pos'));

    const hrmFeatures = getFeaturesByCategory('hrm');
    assert.ok(hrmFeatures.length >= 3);
    hrmFeatures.forEach(f => assert.strictEqual(f.category, 'hrm'));
  });

  it('grants all features when plan includes wildcard ["*"] or "all"', () => {
    assert.strictEqual(isFeatureEnabled('pos.quick_sale', ['*']), true);
    assert.strictEqual(isFeatureEnabled('manufacturing.bom', ['all']), true);
  });

  it('checks granular feature keys accurately', () => {
    const allowed = ['pos.quick_sale', 'inventory.stock_alerts'];
    assert.strictEqual(isFeatureEnabled('pos.quick_sale', allowed), true);
    assert.strictEqual(isFeatureEnabled('inventory.stock_alerts', allowed), true);
    assert.strictEqual(isFeatureEnabled('manufacturing.bom', allowed), false);
    assert.strictEqual(isFeatureEnabled('hrm.payroll', allowed), false);
  });

  it('enables all module features if the parent module prefix is granted', () => {
    const moduleGrants = ['pos', 'hrm'];
    assert.strictEqual(isFeatureEnabled('pos.quick_sale', moduleGrants), true);
    assert.strictEqual(isFeatureEnabled('pos.hold_cart', moduleGrants), true);
    assert.strictEqual(isFeatureEnabled('hrm.employees', moduleGrants), true);
    assert.strictEqual(isFeatureEnabled('hrm.payroll', moduleGrants), true);
    assert.strictEqual(isFeatureEnabled('manufacturing.bom', moduleGrants), false);
  });

  it('resolves legacy aliases for backwards compatibility', () => {
    const legacyGrants = ['Employee Management', 'Unlimited Stores', 'Production'];
    assert.strictEqual(isFeatureEnabled('hrm.employees', legacyGrants), true);
    assert.strictEqual(isFeatureEnabled('inventory.multi_warehouse', legacyGrants), true);
    assert.strictEqual(isFeatureEnabled('manufacturing.batches', legacyGrants), true);
  });

  it('recommended features for plan tiers return non-empty feature lists', () => {
    const basicRecs = getRecommendedFeaturesForPlan('basic');
    const proRecs = getRecommendedFeaturesForPlan('pro');
    const entRecs = getRecommendedFeaturesForPlan('enterprise');

    assert.ok(basicRecs.length > 0);
    assert.ok(proRecs.length >= basicRecs.length);
    assert.ok(entRecs.length >= proRecs.length);
  });
});

