import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

interface MockNotification {
  id: string;
  userId: string;
  businessId?: string | null;
  title: string;
  message: string;
  read: boolean;
  type: string;
  category: string;
  timestamp: string;
}

// In-memory tenant store simulator verifying multi-tenant isolation rules
class TenantNotificationService {
  private tenantStore = new Map<string, Map<string, MockNotification>>(); // businessId -> (id -> doc)
  private rootStore = new Map<string, MockNotification>(); // id -> doc

  public createNotification(data: {
    userId: string;
    businessId?: string | null;
    title: string;
    message: string;
    type?: string;
    category?: string;
    id?: string;
  }): MockNotification {
    const id = data.id || `notif_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const doc: MockNotification = {
      id,
      userId: data.userId,
      businessId: data.businessId || null,
      title: data.title,
      message: data.message,
      read: false,
      type: data.type || 'info',
      category: data.category || 'general',
      timestamp: now,
    };

    if (data.businessId) {
      if (!this.tenantStore.has(data.businessId)) {
        this.tenantStore.set(data.businessId, new Map());
      }
      this.tenantStore.get(data.businessId)!.set(id, doc);
    }
    this.rootStore.set(id, doc);
    return doc;
  }

  public getTenantNotifications(businessId: string): MockNotification[] {
    const map = this.tenantStore.get(businessId);
    if (!map) return [];
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  public markAsRead(id: string, businessId: string): boolean {
    const tenantMap = this.tenantStore.get(businessId);
    if (tenantMap && tenantMap.has(id)) {
      tenantMap.get(id)!.read = true;
    }
    if (this.rootStore.has(id)) {
      this.rootStore.get(id)!.read = true;
      return true;
    }
    return false;
  }

  public markAllAsRead(businessId: string): number {
    const tenantMap = this.tenantStore.get(businessId);
    if (!tenantMap) return 0;
    let count = 0;
    tenantMap.forEach((doc) => {
      if (!doc.read) {
        doc.read = true;
        count++;
      }
    });
    return count;
  }

  public deleteNotification(id: string, callerBusinessId: string): boolean {
    const tenantMap = this.tenantStore.get(callerBusinessId);
    if (tenantMap && tenantMap.has(id)) {
      tenantMap.delete(id);
      this.rootStore.delete(id);
      return true;
    }
    // Cannot delete cross-tenant
    return false;
  }
}

describe('Multi-Tenant Notification System & Isolation Verification', () => {
  let service: TenantNotificationService;

  beforeEach(() => {
    service = new TenantNotificationService();
  });

  test('strictly enforces tenant isolation between shop businesses', () => {
    const bizA = 'business_shop_alpha_101';
    const bizB = 'business_shop_beta_202';

    // Create notifications in Business A
    service.createNotification({
      id: 'notif_alpha_1',
      userId: 'user_alpha',
      businessId: bizA,
      title: 'Sale Alert Alpha',
      message: 'New sale of 2,500 BDT recorded',
      category: 'sales',
    });

    // Create notifications in Business B
    service.createNotification({
      id: 'notif_beta_1',
      userId: 'user_beta',
      businessId: bizB,
      title: 'Stock Warning Beta',
      message: 'Product SKU-99 reached reorder level',
      category: 'inventory',
    });

    // Business A sees only its own alerts
    const alertsA = service.getTenantNotifications(bizA);
    assert.equal(alertsA.length, 1);
    assert.equal(alertsA[0].id, 'notif_alpha_1');
    assert.equal(alertsA[0].businessId, bizA);

    // Business B sees only its own alerts
    const alertsB = service.getTenantNotifications(bizB);
    assert.equal(alertsB.length, 1);
    assert.equal(alertsB[0].id, 'notif_beta_1');
    assert.equal(alertsB[0].businessId, bizB);
  });

  test('prevents cross-tenant notification deletion', () => {
    const bizA = 'business_shop_alpha_101';
    const bizB = 'business_shop_beta_202';

    service.createNotification({
      id: 'notif_target_alpha',
      userId: 'user_alpha',
      businessId: bizA,
      title: 'Confidential Finance Alert',
      message: 'Daily cashbox settled',
      category: 'finance',
    });

    // Business B tries to delete Business A's alert -> Must fail
    const deletedByStranger = service.deleteNotification('notif_target_alpha', bizB);
    assert.equal(deletedByStranger, false, 'Cross-tenant deletion must be rejected');

    // Document must still exist in Business A
    const listAfterAttempt = service.getTenantNotifications(bizA);
    assert.equal(listAfterAttempt.length, 1);

    // Authorized Business A can delete
    const deletedByOwner = service.deleteNotification('notif_target_alpha', bizA);
    assert.equal(deletedByOwner, true, 'Authorized tenant deletion must succeed');
    assert.equal(service.getTenantNotifications(bizA).length, 0);
  });

  test('successfully toggles read and unread status within tenant space', () => {
    const bizA = 'business_shop_alpha_101';

    service.createNotification({
      id: 'notif_toggle_1',
      userId: 'user_alpha',
      businessId: bizA,
      title: 'Order Received',
      message: 'Online order #10029 received',
      category: 'sales',
    });

    let notifs = service.getTenantNotifications(bizA);
    assert.equal(notifs[0].read, false);

    service.markAsRead('notif_toggle_1', bizA);

    notifs = service.getTenantNotifications(bizA);
    assert.equal(notifs[0].read, true);
  });

  test('marks all notifications read within specific tenant without touching other tenants', () => {
    const bizA = 'business_shop_alpha_101';
    const bizB = 'business_shop_beta_202';

    service.createNotification({
      id: 'notif_a1',
      userId: 'user_alpha',
      businessId: bizA,
      title: 'Sale A1',
      message: 'Msg A1',
    });
    service.createNotification({
      id: 'notif_a2',
      userId: 'user_alpha',
      businessId: bizA,
      title: 'Sale A2',
      message: 'Msg A2',
    });
    service.createNotification({
      id: 'notif_b1',
      userId: 'user_beta',
      businessId: bizB,
      title: 'Sale B1',
      message: 'Msg B1',
    });

    // Mark all as read for Business A
    const updatedCount = service.markAllAsRead(bizA);
    assert.equal(updatedCount, 2);

    // All Business A items are read
    const alertsA = service.getTenantNotifications(bizA);
    assert.equal(alertsA.every((n) => n.read), true);

    // Business B item remains unread
    const alertsB = service.getTenantNotifications(bizB);
    assert.equal(alertsB[0].read, false, 'Other tenant unread status must not be modified');
  });

  test('verifies real-time room targeting logic for business vs saas-staff', () => {
    function computeTargetRooms(businessId?: string, targetRole?: string, userId?: string) {
      const rooms: string[] = [];
      if (targetRole === 'SAAS_ADMIN' || (!businessId && !userId)) {
        rooms.push('saas-staff');
      }
      if (businessId) {
        rooms.push(`business:${businessId}`);
      }
      if (userId) {
        rooms.push(`user:${userId}`);
      }
      return rooms;
    }

    const tenantRooms = computeTargetRooms('shop_123', undefined, 'user_456');
    assert.deepEqual(tenantRooms, ['business:shop_123', 'user:user_456']);

    const saasRooms = computeTargetRooms(undefined, 'SAAS_ADMIN', 'admin_1');
    assert.deepEqual(saasRooms, ['saas-staff', 'user:admin_1']);
  });
});
