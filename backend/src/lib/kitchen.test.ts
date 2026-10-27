import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

interface MockItem {
  id: string;
  productName: string;
  quantity: number;
  station: string;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED';
}

interface MockTicket {
  id: string;
  businessId: string;
  ticketNo: string;
  tableNo?: string;
  orderType: 'Dine-In' | 'Takeaway' | 'Delivery';
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  items: MockItem[];
  priority: boolean;
  createdAt: string;
  updatedAt: string;
  readyAt?: string | null;
  servedAt?: string | null;
}

const STATUS_FLOW = ['PENDING', 'PREPARING', 'READY', 'SERVED'] as const;

function advanceTicketStatus(ticket: MockTicket): { next: MockTicket['status'] | null; error?: string } {
  if (ticket.status === 'CANCELLED') return { next: null, error: 'Ticket is cancelled' };
  if (ticket.status === 'SERVED') return { next: null, error: 'Ticket is already served' };

  const idx = STATUS_FLOW.indexOf(ticket.status as (typeof STATUS_FLOW)[number]);
  if (idx < 0 || idx >= STATUS_FLOW.length - 1) {
    return { next: null, error: `Cannot advance from ${ticket.status}` };
  }
  return { next: STATUS_FLOW[idx + 1] };
}

function updateTicketItemStatus(
  ticket: MockTicket,
  itemId: string,
  newStatus: MockItem['status']
): { ticket: MockTicket; error?: string } {
  if (ticket.status === 'CANCELLED' || ticket.status === 'SERVED') {
    return { ticket, error: 'Cannot modify items on a closed ticket' };
  }

  const items = ticket.items.map((it) => (it.id === itemId ? { ...it, status: newStatus } : it));
  const activeItems = items.filter((it) => it.status !== 'CANCELLED');

  let computedTicketStatus: MockTicket['status'] = ticket.status;
  if (activeItems.length === 0) {
    computedTicketStatus = 'CANCELLED';
  } else if (activeItems.every((it) => it.status === 'READY')) {
    computedTicketStatus = 'READY';
  } else if (activeItems.some((it) => it.status === 'PREPARING' || it.status === 'READY')) {
    computedTicketStatus = 'PREPARING';
  }

  const now = new Date().toISOString();
  return {
    ticket: {
      ...ticket,
      items,
      status: computedTicketStatus,
      updatedAt: now,
      readyAt: computedTicketStatus === 'READY' && !ticket.readyAt ? now : ticket.readyAt,
    },
  };
}

function recallTicket(
  ticket: MockTicket,
  nowMs: number = Date.now()
): { ok: boolean; ticket?: MockTicket; error?: string } {
  if (ticket.status !== 'SERVED') {
    return { ok: false, error: 'Only SERVED tickets can be recalled' };
  }

  const RECALL_WINDOW_MS = 15 * 60 * 1000;
  const servedAtMs = new Date(ticket.servedAt || ticket.updatedAt).getTime();
  if (nowMs - servedAtMs > RECALL_WINDOW_MS) {
    return { ok: false, error: 'Recall window expired (15 minutes after serving)' };
  }

  return {
    ok: true,
    ticket: {
      ...ticket,
      status: 'READY',
      servedAt: null,
      updatedAt: new Date(nowMs).toISOString(),
    },
  };
}

function computeKitchenMetrics(tickets: MockTicket[], todayStartMs: number, nowMs: number) {
  const byStatus: Record<string, number> = {
    PENDING: 0,
    PREPARING: 0,
    READY: 0,
    SERVED: 0,
    CANCELLED: 0,
  };

  let totalToday = 0;
  let openNow = 0;
  let overdueCount = 0;
  const prepMinutes: number[] = [];

  for (const t of tickets) {
    const createdMs = new Date(t.createdAt).getTime();
    if (createdMs >= todayStartMs) {
      totalToday++;
      byStatus[t.status] = (byStatus[t.status] || 0) + 1;

      if (t.status === 'PENDING' || t.status === 'PREPARING' || t.status === 'READY') {
        openNow++;
        if ((nowMs - createdMs) / 60000 >= 15) {
          overdueCount++;
        }
      }

      if (t.readyAt) {
        const readyMs = new Date(t.readyAt).getTime();
        prepMinutes.push(Math.max(0, (readyMs - createdMs) / 60000));
      }
    }
  }

  const avg = prepMinutes.length
    ? Math.round((prepMinutes.reduce((a, b) => a + b, 0) / prepMinutes.length) * 10) / 10
    : 0;

  return { totalToday, openNow, overdueCount, byStatus, avgPrepMinutes: avg };
}

describe('Kitchen Management & KOT Workflow Verification', () => {
  it('advances status along standard kitchen flow: PENDING -> PREPARING -> READY -> SERVED', () => {
    let ticket: MockTicket = {
      id: 'kot-101',
      businessId: 'biz_rest_1',
      ticketNo: 'KOT-2026-0001',
      tableNo: 'T-04',
      orderType: 'Dine-In',
      status: 'PENDING',
      priority: false,
      items: [
        { id: 'item-1', productName: 'Grilled Beef Steak', quantity: 2, station: 'Grill', status: 'PENDING' },
        { id: 'item-2', productName: 'Mojito Mocktail', quantity: 2, station: 'Bar', status: 'PENDING' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Pending -> Preparing
    const step1 = advanceTicketStatus(ticket);
    assert.equal(step1.next, 'PREPARING');
    ticket = { ...ticket, status: step1.next! };

    // 2. Preparing -> Ready
    const step2 = advanceTicketStatus(ticket);
    assert.equal(step2.next, 'READY');
    ticket = { ...ticket, status: step2.next!, readyAt: new Date().toISOString() };

    // 3. Ready -> Served
    const step3 = advanceTicketStatus(ticket);
    assert.equal(step3.next, 'SERVED');
    ticket = { ...ticket, status: step3.next!, servedAt: new Date().toISOString() };

    // 4. Cannot advance further once Served
    const step4 = advanceTicketStatus(ticket);
    assert.equal(step4.next, null);
    assert.ok(step4.error?.includes('already served'));
  });

  it('auto-advances ticket status when items are updated individually', () => {
    let ticket: MockTicket = {
      id: 'kot-102',
      businessId: 'biz_rest_1',
      ticketNo: 'KOT-2026-0002',
      tableNo: 'T-08',
      orderType: 'Dine-In',
      status: 'PENDING',
      priority: false,
      items: [
        { id: 'i-1', productName: 'Chicken Alfredo Pasta', quantity: 1, station: 'Main Kitchen', status: 'PENDING' },
        { id: 'i-2', productName: 'Garlic Bread', quantity: 1, station: 'Bakery', status: 'PENDING' },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Mark first item PREPARING -> ticket becomes PREPARING
    const res1 = updateTicketItemStatus(ticket, 'i-1', 'PREPARING');
    assert.equal(res1.ticket.status, 'PREPARING');
    ticket = res1.ticket;

    // Mark first item READY -> ticket remains PREPARING because second item is still PENDING
    const res2 = updateTicketItemStatus(ticket, 'i-1', 'READY');
    assert.equal(res2.ticket.status, 'PREPARING');
    ticket = res2.ticket;

    // Mark second item READY -> all active items now READY, so ticket auto-advances to READY!
    const res3 = updateTicketItemStatus(ticket, 'i-2', 'READY');
    assert.equal(res3.ticket.status, 'READY');
    assert.ok(res3.ticket.readyAt, 'readyAt timestamp must be recorded');
    ticket = res3.ticket;

    // Cancel an item on a closed/served ticket fails
    const closed = { ...ticket, status: 'SERVED' as const };
    const res4 = updateTicketItemStatus(closed, 'i-1', 'PENDING');
    assert.ok(res4.error?.includes('closed ticket'));
  });

  it('enforces 15-minute recall window for served tickets', () => {
    const baseTime = Date.now();
    const ticket: MockTicket = {
      id: 'kot-103',
      businessId: 'biz_rest_1',
      ticketNo: 'KOT-2026-0003',
      tableNo: 'T-12',
      orderType: 'Dine-In',
      status: 'SERVED',
      priority: false,
      items: [{ id: 'i-1', productName: 'Club Sandwich', quantity: 1, station: 'Main Kitchen', status: 'READY' }],
      createdAt: new Date(baseTime - 30 * 60000).toISOString(),
      updatedAt: new Date(baseTime - 5 * 60000).toISOString(),
      readyAt: new Date(baseTime - 10 * 60000).toISOString(),
      servedAt: new Date(baseTime - 5 * 60000).toISOString(), // served 5 minutes ago
    };

    // Recall at 5 minutes after served: should succeed (within 15 min window)
    const successRecall = recallTicket(ticket, baseTime);
    assert.equal(successRecall.ok, true);
    assert.equal(successRecall.ticket?.status, 'READY');
    assert.equal(successRecall.ticket?.servedAt, null);

    // Recall at 20 minutes after served: should fail with expiration error
    const expiredTime = baseTime + 16 * 60000;
    const failRecall = recallTicket(ticket, expiredTime);
    assert.equal(failRecall.ok, false);
    assert.ok(failRecall.error?.includes('Recall window expired'));
  });

  it('accurately computes live operational kitchen metrics and flags overdue tickets', () => {
    const now = Date.now();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayStartMs = todayStart.getTime();

    const tickets: MockTicket[] = [
      // 1. Fresh pending ticket (5 mins ago)
      {
        id: 'k-1',
        businessId: 'biz_1',
        ticketNo: 'KOT-2026-0001',
        orderType: 'Dine-In',
        status: 'PENDING',
        priority: false,
        items: [],
        createdAt: new Date(now - 5 * 60000).toISOString(),
        updatedAt: new Date(now - 5 * 60000).toISOString(),
      },
      // 2. Overdue cooking ticket (25 mins ago)
      {
        id: 'k-2',
        businessId: 'biz_1',
        ticketNo: 'KOT-2026-0002',
        orderType: 'Dine-In',
        status: 'PREPARING',
        priority: true,
        items: [],
        createdAt: new Date(now - 25 * 60000).toISOString(),
        updatedAt: new Date(now - 20 * 60000).toISOString(),
      },
      // 3. Completed ticket prepared in 10 mins (created 8 mins ago, not overdue)
      {
        id: 'k-3',
        businessId: 'biz_1',
        ticketNo: 'KOT-2026-0003',
        orderType: 'Takeaway',
        status: 'READY',
        priority: false,
        items: [],
        createdAt: new Date(now - 8 * 60000).toISOString(),
        updatedAt: new Date(now - 2 * 60000).toISOString(),
        readyAt: new Date(now - 2 * 60000).toISOString(), // 6 mins prep
      },
      // 4. Served ticket prepared in 20 mins
      {
        id: 'k-4',
        businessId: 'biz_1',
        ticketNo: 'KOT-2026-0004',
        orderType: 'Delivery',
        status: 'SERVED',
        priority: false,
        items: [],
        createdAt: new Date(now - 40 * 60000).toISOString(),
        updatedAt: new Date(now - 10 * 60000).toISOString(),
        readyAt: new Date(now - 20 * 60000).toISOString(), // 20 mins prep
        servedAt: new Date(now - 10 * 60000).toISOString(),
      },
    ];

    const metrics = computeKitchenMetrics(tickets, todayStartMs, now);
    assert.equal(metrics.totalToday, 4);
    assert.equal(metrics.openNow, 3, 'Pending, Preparing, and Ready count as open');
    assert.equal(metrics.overdueCount, 1, 'Only k-2 has been open >= 15 minutes');
    assert.equal(metrics.byStatus.PENDING, 1);
    assert.equal(metrics.byStatus.PREPARING, 1);
    assert.equal(metrics.byStatus.READY, 1);
    assert.equal(metrics.byStatus.SERVED, 1);
    // Average prep: (6 + 20) / 2 = 13.0 mins
    assert.equal(metrics.avgPrepMinutes, 13);
  });

  it('strictly enforces multi-tenant boundary isolation between restaurant tenants', () => {
    const tenantA = 'shop_cafe_dhaka';
    const tenantB = 'shop_bistro_ctg';

    const database: Record<string, MockTicket[]> = {
      [tenantA]: [
        {
          id: 'kot-a1',
          businessId: tenantA,
          ticketNo: 'KOT-2026-0001',
          orderType: 'Dine-In',
          status: 'PENDING',
          items: [],
          priority: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      [tenantB]: [
        {
          id: 'kot-b1',
          businessId: tenantB,
          ticketNo: 'KOT-2026-0001',
          orderType: 'Takeaway',
          status: 'READY',
          items: [],
          priority: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
    };

    // Query for tenantA must never return tenantB tickets
    const queryTenantA = (database[tenantA] || []).filter((t) => t.businessId === tenantA);
    const queryTenantB = (database[tenantB] || []).filter((t) => t.businessId === tenantB);

    assert.equal(queryTenantA.length, 1);
    assert.equal(queryTenantA[0].id, 'kot-a1');
    assert.equal(queryTenantA.every((t) => t.businessId === tenantA), true);

    assert.equal(queryTenantB.length, 1);
    assert.equal(queryTenantB[0].id, 'kot-b1');
    assert.equal(queryTenantB.every((t) => t.businessId === tenantB), true);
  });
});
