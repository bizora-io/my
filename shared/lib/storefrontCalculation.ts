/**
 * Authoritative e-commerce calculation & validation utilities for Bizora Online Store.
 * Shared between backend APIs and frontend storefront interfaces.
 */

export interface StorefrontCartItem {
  productId: string;
  qty: number;
  variantId?: string | null;
}

export interface AuthoritativeProduct {
  id: string;
  name: string;
  salePrice: number;
  comparePrice?: number;
  stock: number;
  sellOnline?: boolean;
  unit?: string;
  image?: string | null;
  variants?: Array<{
    id: string;
    name?: string;
    title?: string;
    price?: number;
    salePrice?: number;
    stock?: number;
  }>;
}

export interface StorefrontDeliverySettings {
  insideCityFee?: number;
  outsideCityFee?: number;
  freeDeliveryThreshold?: number;
}

export interface StorefrontCalculationResult {
  valid: boolean;
  error?: string;
  lineItems: Array<{
    productId: string;
    name: string;
    variantId: string | null;
    variantName: string | null;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    image: string | null;
    unit: string;
  }>;
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  freeDeliveryEligible: boolean;
  amountNeededForFreeDelivery: number;
}

/**
 * Authoritative server-side price and total calculation.
 * Ignores any client-submitted prices and derives totals strictly from authoritative product data.
 */
export function calculateStorefrontOrder(
  cartItems: StorefrontCartItem[],
  productsMap: Map<string, AuthoritativeProduct>,
  deliveryRegion: 'inside_city' | 'outside_city' = 'inside_city',
  deliverySettings?: StorefrontDeliverySettings
): StorefrontCalculationResult {
  const insideCityFee = Number(deliverySettings?.insideCityFee ?? 60);
  const outsideCityFee = Number(deliverySettings?.outsideCityFee ?? 120);
  const freeDeliveryThreshold = Number(deliverySettings?.freeDeliveryThreshold ?? 2000);

  if (!cartItems || cartItems.length === 0) {
    return {
      valid: false,
      error: 'Cart is empty',
      lineItems: [],
      subtotal: 0,
      deliveryFee: 0,
      grandTotal: 0,
      freeDeliveryEligible: false,
      amountNeededForFreeDelivery: freeDeliveryThreshold,
    };
  }

  const lineItems: StorefrontCalculationResult['lineItems'] = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const product = productsMap.get(item.productId);
    if (!product) {
      return {
        valid: false,
        error: `Product not found: ${item.productId}`,
        lineItems: [],
        subtotal: 0,
        deliveryFee: 0,
        grandTotal: 0,
        freeDeliveryEligible: false,
        amountNeededForFreeDelivery: freeDeliveryThreshold,
      };
    }

    if (product.sellOnline === false) {
      return {
        valid: false,
        error: `Product "${product.name}" is not enabled for online purchasing`,
        lineItems: [],
        subtotal: 0,
        deliveryFee: 0,
        grandTotal: 0,
        freeDeliveryEligible: false,
        amountNeededForFreeDelivery: freeDeliveryThreshold,
      };
    }

    const qty = Math.max(1, Math.floor(Number(item.qty) || 1));
    const availableStock = Math.max(0, Number(product.stock) || 0);

    if (availableStock < qty) {
      return {
        valid: false,
        error: `Insufficient stock for "${product.name}". Available: ${availableStock}, Requested: ${qty}`,
        lineItems: [],
        subtotal: 0,
        deliveryFee: 0,
        grandTotal: 0,
        freeDeliveryEligible: false,
        amountNeededForFreeDelivery: freeDeliveryThreshold,
      };
    }

    // Determine authoritative unit price
    let unitPrice = Math.max(0, Number(product.salePrice) || 0);
    let variantName: string | null = null;

    if (item.variantId && Array.isArray(product.variants)) {
      const v = product.variants.find((varItem) => varItem.id === item.variantId || varItem.name === item.variantId);
      if (v) {
        variantName = v.name || v.title || null;
        if (Number(v.price) > 0 || Number(v.salePrice) > 0) {
          unitPrice = Math.max(0, Number(v.price ?? v.salePrice));
        }
      }
    }

    const lineTotal = unitPrice * qty;
    subtotal += lineTotal;

    lineItems.push({
      productId: product.id,
      name: product.name,
      variantId: item.variantId || null,
      variantName,
      qty,
      unitPrice,
      lineTotal,
      image: product.image || null,
      unit: product.unit || 'Pcs',
    });
  }

  const freeDeliveryEligible = subtotal >= freeDeliveryThreshold && freeDeliveryThreshold > 0;
  const deliveryFee = freeDeliveryEligible
    ? 0
    : (deliveryRegion === 'outside_city' ? outsideCityFee : insideCityFee);

  const grandTotal = subtotal + deliveryFee;
  const amountNeededForFreeDelivery = freeDeliveryEligible
    ? 0
    : Math.max(0, freeDeliveryThreshold - subtotal);

  return {
    valid: true,
    lineItems,
    subtotal,
    deliveryFee,
    grandTotal,
    freeDeliveryEligible,
    amountNeededForFreeDelivery,
  };
}

/**
 * Sanitize and validate customer checkout details.
 */
export function validateCustomerCheckout(input: {
  customerName?: string;
  address?: string;
  mobile?: string;
  email?: string;
}) {
  const name = String(input.customerName || '').trim();
  const address = String(input.address || '').trim();
  const rawMobile = String(input.mobile || '').replace(/\D/g, '');
  const email = String(input.email || '').trim().toLowerCase();

  if (!name || name.length < 2) {
    return { valid: false, error: 'Please enter a valid customer name (at least 2 characters).' };
  }
  if (!address || address.length < 5) {
    return { valid: false, error: 'Please enter a complete delivery address.' };
  }
  if (!rawMobile || rawMobile.length < 8 || rawMobile.length > 15) {
    return { valid: false, error: 'Please provide a valid contact mobile number.' };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { valid: false, error: 'Please enter a valid email address or leave blank.' };
  }

  return {
    valid: true,
    sanitized: {
      customerName: name,
      address,
      mobile: rawMobile,
      email: email || undefined,
    },
  };
}

/**
 * Build rich delivery step timeline from order states.
 */
export function buildDeliveryTimeline(order: {
  status: string;
  deliveryStatus?: string;
  createdAt?: string;
  fulfilledAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  courier?: string;
  trackingNumber?: string;
  cancelReason?: string;
  deliveryTimeline?: Array<{ status: string; at: string; note?: string }>;
}) {
  if (Array.isArray(order.deliveryTimeline) && order.deliveryTimeline.length > 0) {
    return order.deliveryTimeline;
  }

  const steps = [
    {
      status: 'Placed',
      at: order.createdAt || new Date().toISOString(),
      note: 'Order placed by customer',
    },
  ];

  if (order.fulfilledAt) {
    steps.push({
      status: 'Processing',
      at: order.fulfilledAt,
      note: 'Order confirmed and packed',
    });
  }

  if (order.shippedAt || order.trackingNumber || order.deliveryStatus === 'InTransit') {
    steps.push({
      status: 'InTransit',
      at: order.shippedAt || order.fulfilledAt || new Date().toISOString(),
      note: order.trackingNumber
        ? `Handed to ${order.courier || 'Courier'}: ${order.trackingNumber}`
        : 'In transit with courier partner',
    });
  }

  if (order.status === 'Delivered' || order.deliveredAt) {
    steps.push({
      status: 'Delivered',
      at: order.deliveredAt || new Date().toISOString(),
      note: 'Successfully delivered to customer',
    });
  }

  if (order.status === 'Cancelled') {
    steps.push({
      status: 'Cancelled',
      at: order.cancelledAt || new Date().toISOString(),
      note: order.cancelReason || 'Order was cancelled',
    });
  }

  return steps;
}
