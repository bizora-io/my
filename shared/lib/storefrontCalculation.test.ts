import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStorefrontOrder,
  validateCustomerCheckout,
  buildDeliveryTimeline,
  type AuthoritativeProduct,
} from './storefrontCalculation.ts';

test('Storefront Calculation — Authoritative Pricing & Totals', async (t) => {
  const productsMap = new Map<string, AuthoritativeProduct>([
    [
      'prod-1',
      {
        id: 'prod-1',
        name: 'Wireless Ergonomic Mouse',
        salePrice: 1200,
        stock: 15,
        sellOnline: true,
        unit: 'Pcs',
      },
    ],
    [
      'prod-2',
      {
        id: 'prod-2',
        name: 'Mechanical Keyboard RGB',
        salePrice: 3500,
        stock: 5,
        sellOnline: true,
        unit: 'Pcs',
        variants: [
          { id: 'blue-switch', name: 'Blue Switch', price: 3500 },
          { id: 'red-switch', name: 'Red Switch Pro', price: 3800 },
        ],
      },
    ],
    [
      'prod-3',
      {
        id: 'prod-3',
        name: 'Out of Stock Headset',
        salePrice: 2000,
        stock: 0,
        sellOnline: true,
      },
    ],
    [
      'prod-4',
      {
        id: 'prod-4',
        name: 'In-Store Only Item',
        salePrice: 500,
        stock: 10,
        sellOnline: false,
      },
    ],
  ]);

  await t.test('calculates correct subtotal, inside city delivery fee, and grand total', () => {
    const result = calculateStorefrontOrder(
      [{ productId: 'prod-1', qty: 1 }],
      productsMap,
      'inside_city',
      { insideCityFee: 60, outsideCityFee: 120, freeDeliveryThreshold: 2000 }
    );

    assert.equal(result.valid, true);
    assert.equal(result.subtotal, 1200);
    assert.equal(result.deliveryFee, 60);
    assert.equal(result.grandTotal, 1260);
    assert.equal(result.freeDeliveryEligible, false);
    assert.equal(result.amountNeededForFreeDelivery, 800);
    assert.equal(result.lineItems[0].unitPrice, 1200);
    assert.equal(result.lineItems[0].lineTotal, 1200);
  });

  await t.test('applies outside city delivery fee when specified', () => {
    const result = calculateStorefrontOrder(
      [{ productId: 'prod-1', qty: 1 }],
      productsMap,
      'outside_city',
      { insideCityFee: 60, outsideCityFee: 120, freeDeliveryThreshold: 2000 }
    );

    assert.equal(result.valid, true);
    assert.equal(result.subtotal, 1200);
    assert.equal(result.deliveryFee, 120);
    assert.equal(result.grandTotal, 1320);
  });

  await t.test('grants free delivery when order meets threshold', () => {
    const result = calculateStorefrontOrder(
      [{ productId: 'prod-1', qty: 2 }], // 2400 >= 2000
      productsMap,
      'outside_city',
      { insideCityFee: 60, outsideCityFee: 120, freeDeliveryThreshold: 2000 }
    );

    assert.equal(result.valid, true);
    assert.equal(result.subtotal, 2400);
    assert.equal(result.deliveryFee, 0);
    assert.equal(result.grandTotal, 2400);
    assert.equal(result.freeDeliveryEligible, true);
    assert.equal(result.amountNeededForFreeDelivery, 0);
  });

  await t.test('respects variant pricing when selected', () => {
    const result = calculateStorefrontOrder(
      [{ productId: 'prod-2', qty: 1, variantId: 'red-switch' }],
      productsMap,
      'inside_city',
      { freeDeliveryThreshold: 5000 }
    );

    assert.equal(result.valid, true);
    assert.equal(result.subtotal, 3800);
    assert.equal(result.lineItems[0].variantName, 'Red Switch Pro');
    assert.equal(result.lineItems[0].unitPrice, 3800);
  });

  await t.test('rejects checkout when product has insufficient stock', () => {
    const result = calculateStorefrontOrder(
      [{ productId: 'prod-3', qty: 1 }],
      productsMap
    );

    assert.equal(result.valid, false);
    assert.match(result.error || '', /Insufficient stock/);
  });

  await t.test('rejects checkout when product is disabled for online selling', () => {
    const result = calculateStorefrontOrder(
      [{ productId: 'prod-4', qty: 1 }],
      productsMap
    );

    assert.equal(result.valid, false);
    assert.match(result.error || '', /not enabled for online/);
  });

  await t.test('rejects checkout when product does not exist in store inventory', () => {
    const result = calculateStorefrontOrder(
      [{ productId: 'non-existent-id', qty: 1 }],
      productsMap
    );

    assert.equal(result.valid, false);
    assert.match(result.error || '', /Product not found/);
  });
});

test('Storefront Customer Checkout Validation', async (t) => {
  await t.test('validates valid Bangladesh customer details', () => {
    const res = validateCustomerCheckout({
      customerName: 'Tariqul Islam',
      address: 'House 42, Road 11, Sector 4, Uttara, Dhaka',
      mobile: '01711223344',
      email: 'tariqul@example.com',
    });

    assert.equal(res.valid, true);
    assert.equal(res.sanitized?.customerName, 'Tariqul Islam');
    assert.equal(res.sanitized?.mobile, '01711223344');
  });

  await t.test('rejects missing or short customer name', () => {
    const res = validateCustomerCheckout({
      customerName: 'A',
      address: 'Road 1, Dhaka',
      mobile: '01711223344',
    });

    assert.equal(res.valid, false);
    assert.match(res.error || '', /valid customer name/);
  });

  await t.test('rejects incomplete address', () => {
    const res = validateCustomerCheckout({
      customerName: 'Farhan',
      address: 'Dhk',
      mobile: '01711223344',
    });

    assert.equal(res.valid, false);
    assert.match(res.error || '', /complete delivery address/);
  });

  await t.test('rejects invalid mobile number', () => {
    const res = validateCustomerCheckout({
      customerName: 'Farhan',
      address: 'House 12, Gulshan 2, Dhaka',
      mobile: '123',
    });

    assert.equal(res.valid, false);
    assert.match(res.error || '', /valid contact mobile number/);
  });
});

test('Storefront Delivery Timeline Generation', () => {
  const order = {
    status: 'InTransit',
    deliveryStatus: 'InTransit',
    createdAt: '2026-10-24T10:00:00Z',
    fulfilledAt: '2026-10-24T12:00:00Z',
    courier: 'Steadfast',
    trackingNumber: 'SF-948201',
  };

  const timeline = buildDeliveryTimeline(order);
  assert.equal(timeline.length, 3);
  assert.equal(timeline[0].status, 'Placed');
  assert.equal(timeline[1].status, 'Processing');
  assert.equal(timeline[2].status, 'InTransit');
  assert.match(timeline[2].note || '', /Steadfast: SF-948201/);
});

