import express, { Request, Response } from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import {
  authenticateToken,
  getActingBusinessId,
  requireBusinessContext,
  requirePermission,
} from "./middleware/auth.js";

const router = express.Router();

router.use(authenticateToken, requireBusinessContext);

function getTenantCol(businessId: string, colName: string) {
  return getDb().collection("businesses").doc(businessId).collection(colName);
}

function ticketsCol(businessId: string) {
  return getTenantCol(businessId, "kitchenTickets");
}

function legacyOrdersCol(businessId: string) {
  return getTenantCol(businessId, "kitchenOrders");
}

function settingsDoc(businessId: string) {
  return getTenantCol(businessId, "settings").doc("kitchen");
}

export interface KitchenTicketItem {
  id: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  notes?: string | null;
  station?: string | null;
  status: "PENDING" | "PREPARING" | "READY" | "CANCELLED";
  updatedAt?: string;
}

export interface KitchenTicket {
  id: string;
  businessId: string;
  ticketNo: string;
  saleId?: string | null;
  saleInvoiceNo?: string | null;
  tableNo?: string | null;
  tableNumber?: string | null;
  orderType: "Dine-In" | "Takeaway" | "Delivery";
  station?: string | null;
  notes?: string | null;
  priority: boolean;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED";
  items: KitchenTicketItem[];
  createdById?: string | null;
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt?: string | null;
  servedAt?: string | null;
}

export interface KitchenSettings {
  autoKitchenOnSale: boolean;
  autoPrintKot: boolean;
  chimeOnNewTicket: boolean;
  stations: string[];
  prepTargetMinutes: number;
  passTargetMinutes: number;
  kotPaperMm: 58 | 80;
  kotMargin: number;
  kotFontSize: number;
  kotItemFontSize: number;
  kotShowBarcode: boolean;
  kotShowStation: boolean;
  kotShowInvoice: boolean;
  kotShowTable: boolean;
  kotTitle: string;
  kotFooter: string;
  kotDensity: "compact" | "comfortable";
}

const DEFAULT_KITCHEN_SETTINGS: KitchenSettings = {
  autoKitchenOnSale: false,
  autoPrintKot: true,
  chimeOnNewTicket: true,
  stations: ["Main Kitchen", "Grill", "Bar", "Bakery", "Fryer", "Salad", "Beverage"],
  prepTargetMinutes: 12,
  passTargetMinutes: 5,
  kotPaperMm: 80,
  kotMargin: 12,
  kotFontSize: 9,
  kotItemFontSize: 10,
  kotShowBarcode: true,
  kotShowStation: true,
  kotShowInvoice: true,
  kotShowTable: true,
  kotTitle: "KITCHEN ORDER",
  kotFooter: "Thank you for dining with us",
  kotDensity: "comfortable",
};

const STATUS_FLOW = ["PENDING", "PREPARING", "READY", "SERVED"] as const;

/**
 * Generate next sequential ticket number for the shop in current calendar year.
 */
async function generateNextTicketNo(businessId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `KOT-${year}-`;
  try {
    const snap = await ticketsCol(businessId)
      .where("ticketNo", ">=", prefix)
      .where("ticketNo", "<=", prefix + "\uf8ff")
      .orderBy("ticketNo", "desc")
      .limit(1)
      .get();

    if (!snap.empty) {
      const lastNo = snap.docs[0].data().ticketNo as string;
      const match = lastNo.match(new RegExp(`^${prefix}(\\d+)$`));
      if (match) {
        const nextSeq = parseInt(match[1], 10) + 1;
        return `${prefix}${String(nextSeq).padStart(4, "0")}`;
      }
    }
  } catch {
    // If composite query fails before index, fallback to count
  }

  const allSnap = await ticketsCol(businessId).get();
  return `${prefix}${String(allSnap.size + 1).padStart(4, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/kitchen & /api/kitchen/list
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  ["/", "/list"],
  requirePermission("kitchen.view", "pos.sell", "pos.view_sales"),
  async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req);
      if (!businessId) {
        res.status(403).json({ error: "Missing business context" });
        return;
      }

      const { status, station, open, search } = req.query;
      const isOpenOnly = open === "1" || open === "true";

      const snap = await ticketsCol(businessId).get();
      let tickets: KitchenTicket[] = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          businessId,
          ticketNo: d.ticketNo || doc.id.slice(-6).toUpperCase(),
          saleId: d.saleId || null,
          saleInvoiceNo: d.saleInvoiceNo || null,
          tableNo: d.tableNo || d.tableNumber || null,
          tableNumber: d.tableNumber || d.tableNo || null,
          orderType: d.orderType || "Dine-In",
          station: d.station || "Main Kitchen",
          notes: d.notes || null,
          priority: Boolean(d.priority),
          status: (d.status || "PENDING").toUpperCase() as KitchenTicket["status"],
          items: Array.isArray(d.items) ? d.items : [],
          createdById: d.createdById || null,
          createdByName: d.createdByName || null,
          createdAt: d.createdAt || new Date().toISOString(),
          updatedAt: d.updatedAt || d.createdAt || new Date().toISOString(),
          readyAt: d.readyAt || null,
          servedAt: d.servedAt || null,
        };
      });

      // Filter by open only (PENDING, PREPARING, READY)
      if (isOpenOnly) {
        tickets = tickets.filter(
          (t) => t.status === "PENDING" || t.status === "PREPARING" || t.status === "READY"
        );
      }

      // Filter by status if specified
      if (status && typeof status === "string" && status !== "ALL") {
        const stUpper = status.toUpperCase();
        tickets = tickets.filter((t) => t.status === stUpper);
      }

      // Filter by station
      if (station && typeof station === "string" && station !== "ALL") {
        tickets = tickets.filter(
          (t) =>
            t.station?.toLowerCase() === station.toLowerCase() ||
            t.items.some((it) => it.station?.toLowerCase() === station.toLowerCase())
        );
      }

      // Filter by search query
      if (search && typeof search === "string" && search.trim()) {
        const q = search.trim().toLowerCase();
        tickets = tickets.filter(
          (t) =>
            t.ticketNo?.toLowerCase().includes(q) ||
            t.tableNo?.toLowerCase().includes(q) ||
            t.saleInvoiceNo?.toLowerCase().includes(q) ||
            t.notes?.toLowerCase().includes(q) ||
            t.items.some((it) => it.productName?.toLowerCase().includes(q))
        );
      }

      // Sort: priority first, then oldest first for kitchen prep queue
      tickets.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority ? -1 : 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

      // Support both structured `{ data: [...] }` and direct array response
      res.json({
        success: true,
        count: tickets.length,
        data: tickets,
        kitchenOrders: tickets, // backward compatibility
      });
    } catch (err: any) {
      console.error("Kitchen list error:", err);
      res.status(500).json({ error: "Failed to list kitchen tickets", details: err?.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/kitchen/metrics
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/metrics",
  requirePermission("kitchen.view", "pos.sell", "pos.view_sales"),
  async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req);
      if (!businessId) {
        res.status(403).json({ error: "Missing business context" });
        return;
      }

      const snap = await ticketsCol(businessId).get();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

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
      const prepMinutesList: number[] = [];
      const passMinutesList: number[] = [];

      snap.docs.forEach((doc) => {
        const d = doc.data();
        const status = (d.status || "PENDING").toUpperCase();
        const createdAt = new Date(d.createdAt || Date.now());

        if (createdAt >= todayStart) {
          totalToday++;
          byStatus[status] = (byStatus[status] || 0) + 1;

          if (status === "PENDING" || status === "PREPARING" || status === "READY") {
            openNow++;
            const ageMins = (Date.now() - createdAt.getTime()) / 60000;
            if (ageMins >= 15) overdueCount++;
          }

          if (d.readyAt) {
            const readyTime = new Date(d.readyAt).getTime();
            const prepMins = Math.max(0, (readyTime - createdAt.getTime()) / 60000);
            prepMinutesList.push(prepMins);
          }

          if (d.servedAt && d.readyAt) {
            const servedTime = new Date(d.servedAt).getTime();
            const readyTime = new Date(d.readyAt).getTime();
            const passMins = Math.max(0, (servedTime - readyTime) / 60000);
            passMinutesList.push(passMins);
          }
        }
      });

      const avg = (list: number[]) =>
        list.length ? Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 10) / 10 : 0;
      const max = (list: number[]) => (list.length ? Math.round(Math.max(...list) * 10) / 10 : 0);

      res.json({
        success: true,
        totalToday,
        openNow,
        overdueCount,
        byStatus,
        avgPrepMinutes: avg(prepMinutesList),
        maxPrepMinutes: max(prepMinutesList),
        avgPassMinutes: avg(passMinutesList),
        readySamples: prepMinutesList.length,
        servedSamples: passMinutesList.length,
      });
    } catch (err: any) {
      console.error("Kitchen metrics error:", err);
      res.status(500).json({ error: "Failed to calculate kitchen metrics", details: err?.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET & PUT /api/kitchen/settings
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/settings",
  requirePermission("kitchen.view", "pos.sell", "pos.view_sales"),
  async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req);
      if (!businessId) {
        res.status(403).json({ error: "Missing business context" });
        return;
      }

      const doc = await settingsDoc(businessId).get();
      if (!doc.exists) {
        res.json({ success: true, ...DEFAULT_KITCHEN_SETTINGS });
        return;
      }
      res.json({ success: true, ...DEFAULT_KITCHEN_SETTINGS, ...doc.data() });
    } catch (err: any) {
      console.error("Kitchen get settings error:", err);
      res.status(500).json({ error: "Failed to fetch kitchen settings" });
    }
  }
);

router.put(
  "/settings",
  requirePermission("kitchen.update", "kitchen.create", "pos.sell"),
  async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req);
      if (!businessId) {
        res.status(403).json({ error: "Missing business context" });
        return;
      }

      const body = req.body || {};
      const stations = Array.isArray(body.stations)
        ? (Array.from(new Set(body.stations.map((s: string) => String(s).trim()).filter(Boolean))) as string[])
        : DEFAULT_KITCHEN_SETTINGS.stations;

      const payload: KitchenSettings = {
        autoKitchenOnSale: Boolean(body.autoKitchenOnSale),
        autoPrintKot: body.autoPrintKot !== false,
        chimeOnNewTicket: body.chimeOnNewTicket !== false,
        stations: stations.length ? stations : DEFAULT_KITCHEN_SETTINGS.stations,
        prepTargetMinutes: Math.max(1, Math.min(180, Number(body.prepTargetMinutes) || 12)),
        passTargetMinutes: Math.max(1, Math.min(60, Number(body.passTargetMinutes) || 5)),
        kotPaperMm: body.kotPaperMm === 58 ? 58 : 80,
        kotMargin: Number(body.kotMargin) || 12,
        kotFontSize: Number(body.kotFontSize) || 9,
        kotItemFontSize: Number(body.kotItemFontSize) || 10,
        kotShowBarcode: body.kotShowBarcode !== false,
        kotShowStation: body.kotShowStation !== false,
        kotShowInvoice: body.kotShowInvoice !== false,
        kotShowTable: body.kotShowTable !== false,
        kotTitle: String(body.kotTitle || "KITCHEN ORDER").slice(0, 40),
        kotFooter: String(body.kotFooter || "").slice(0, 80),
        kotDensity: body.kotDensity === "compact" ? "compact" : "comfortable",
      };

      await settingsDoc(businessId).set({
        ...payload,
        updatedAt: new Date().toISOString(),
      });

      res.json({ success: true, ...payload });
    } catch (err: any) {
      console.error("Kitchen update settings error:", err);
      res.status(500).json({ error: "Failed to save kitchen settings" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 4. POST /api/kitchen — Create KOT Ticket
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/",
  requirePermission("kitchen.create", "kitchen.update", "pos.sell"),
  async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req);
      if (!businessId) {
        res.status(403).json({ error: "Missing business context" });
        return;
      }

      const body = req.body || {};
      let items: KitchenTicketItem[] = Array.isArray(body.items) ? body.items : [];

      // If items omitted and saleId provided, pull items from linked sale
      if (!items.length && body.saleId) {
        const saleDoc = await getTenantCol(businessId, "transactions").doc(body.saleId).get();
        if (saleDoc.exists) {
          const saleData = saleDoc.data() || {};
          const saleItems = Array.isArray(saleData.items) ? saleData.items : [];
          items = saleItems.map((it: any, idx: number) => ({
            id: `item-${Date.now()}-${idx}`,
            productId: it.productId || it.id || null,
            productName: it.productName || it.name || "Item",
            quantity: Number(it.quantity || it.qty || 1),
            notes: it.notes || null,
            station: it.kitchenStation || it.station || body.station || "Main Kitchen",
            status: "PENDING" as const,
          }));
        }
      }

      if (!items.length) {
        res.status(400).json({ error: "Kitchen ticket requires at least one line item" });
        return;
      }

      const ticketNo = await generateNextTicketNo(businessId);
      const ticketId = body.id || `kot-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const now = new Date().toISOString();

      const normalizedItems: KitchenTicketItem[] = items.map((it, idx) => ({
        id: it.id || `item-${Date.now()}-${idx}`,
        productId: it.productId || null,
        productName: String(it.productName || (it as any).name || "Item").trim(),
        quantity: Math.max(1, Number(it.quantity || (it as any).qty || 1)),
        notes: it.notes ? String(it.notes).trim() : null,
        station: it.station ? String(it.station).trim() : body.station || "Main Kitchen",
        status: (it.status || "PENDING").toUpperCase() as KitchenTicketItem["status"],
        updatedAt: now,
      }));

      const newTicket: KitchenTicket = {
        id: ticketId,
        businessId,
        ticketNo,
        saleId: body.saleId || null,
        saleInvoiceNo: body.saleInvoiceNo || body.invoiceNo || null,
        tableNo: body.tableNo || body.tableNumber || null,
        tableNumber: body.tableNumber || body.tableNo || null,
        orderType: body.orderType || "Dine-In",
        station: body.station || "Main Kitchen",
        notes: body.notes ? String(body.notes).trim() : null,
        priority: Boolean(body.priority),
        status: "PENDING",
        items: normalizedItems,
        createdById: req.user?.id || null,
        createdByName: req.user?.name || req.user?.email || null,
        createdAt: now,
        updatedAt: now,
        readyAt: null,
        servedAt: null,
      };

      // Persist to businesses/{businessId}/kitchenTickets
      await ticketsCol(businessId).doc(ticketId).set(newTicket);

      // Also mirror to legacy kitchenOrders collection so older readers see it
      await legacyOrdersCol(businessId).doc(ticketId).set({
        ...newTicket,
        groupId: body.groupId || `kot-group-${Date.now()}`,
      });

      res.status(201).json({
        success: true,
        ticket: newTicket,
        data: newTicket,
      });
    } catch (err: any) {
      console.error("Create kitchen ticket error:", err);
      res.status(500).json({ error: "Failed to create kitchen ticket", details: err?.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 5. POST /api/kitchen/scan — Barcode / KOT Ticket Scan
// ─────────────────────────────────────────────────────────────────────────────
router.post(
  "/scan",
  requirePermission("kitchen.update", "kitchen.create", "pos.sell"),
  async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req);
      if (!businessId) {
        res.status(403).json({ error: "Missing business context" });
        return;
      }

      const raw = String(req.body?.ticketNo || req.body?.barcode || "").trim();
      if (!raw) {
        res.status(400).json({ error: "Ticket number or barcode is required" });
        return;
      }

      // Find by exact ticketNo or ID
      let matchDoc: FirebaseFirestore.DocumentSnapshot | null = null;
      const snapByNo = await ticketsCol(businessId).where("ticketNo", "==", raw).limit(1).get();
      if (!snapByNo.empty) {
        matchDoc = snapByNo.docs[0];
      } else {
        const docById = await ticketsCol(businessId).doc(raw).get();
        if (docById.exists) matchDoc = docById;
      }

      if (!matchDoc || !matchDoc.exists) {
        res.status(404).json({ error: `No kitchen ticket found for "${raw}"` });
        return;
      }

      const ticket = matchDoc.data() as KitchenTicket;
      if (ticket.status === "CANCELLED") {
        res.status(409).json({ error: "Ticket is cancelled" });
        return;
      }
      if (ticket.status === "SERVED") {
        res.status(409).json({ error: "Ticket is already served" });
        return;
      }

      const currentIdx = STATUS_FLOW.indexOf(ticket.status as (typeof STATUS_FLOW)[number]);
      const nextStatus = currentIdx >= 0 && currentIdx < STATUS_FLOW.length - 1 ? STATUS_FLOW[currentIdx + 1] : null;

      if (!nextStatus) {
        res.status(409).json({ error: `Cannot advance ticket from ${ticket.status}` });
        return;
      }

      const now = new Date().toISOString();
      const updates: Partial<KitchenTicket> = {
        status: nextStatus,
        updatedAt: now,
      };

      if (nextStatus === "READY" && !ticket.readyAt) {
        updates.readyAt = now;
      }
      if (nextStatus === "SERVED") {
        updates.servedAt = now;
      }

      await ticketsCol(businessId).doc(matchDoc.id).update(updates);
      await legacyOrdersCol(businessId).doc(matchDoc.id).set(updates, { merge: true });

      const updatedTicket: KitchenTicket = { ...ticket, ...updates };

      res.json({
        success: true,
        action: "STATUS_ADVANCE",
        from: ticket.status,
        to: nextStatus,
        ticket: updatedTicket,
        data: updatedTicket,
      });
    } catch (err: any) {
      console.error("Scan kitchen ticket error:", err);
      res.status(500).json({ error: "Failed to scan kitchen ticket", details: err?.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET /api/kitchen/:id — Fetch Single Ticket
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  "/:id",
  requirePermission("kitchen.view", "pos.sell", "pos.view_sales"),
  async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req);
      if (!businessId) {
        res.status(403).json({ error: "Missing business context" });
        return;
      }

      const ticketId = String(req.params.id);
      const doc = await ticketsCol(businessId).doc(ticketId).get();
      if (!doc.exists) {
        res.status(404).json({ error: "Kitchen ticket not found" });
        return;
      }

      res.json({ success: true, ticket: { id: doc.id, ...doc.data() }, data: { id: doc.id, ...doc.data() } });
    } catch (err: any) {
      console.error("Get kitchen ticket error:", err);
      res.status(500).json({ error: "Failed to fetch kitchen ticket" });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 7. PATCH /api/kitchen/:id — Update Ticket Status / Details
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id",
  requirePermission("kitchen.update", "kitchen.create", "pos.sell"),
  async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req);
      if (!businessId) {
        res.status(403).json({ error: "Missing business context" });
        return;
      }

      const ticketId = String(req.params.id);
      const ticketRef = ticketsCol(businessId).doc(ticketId);
      const doc = await ticketRef.get();
      if (!doc.exists) {
        res.status(404).json({ error: "Kitchen ticket not found" });
        return;
      }

      const existing = doc.data() as KitchenTicket;
      const body = req.body || {};
      const now = new Date().toISOString();
      const updates: any = { updatedAt: now };

      if (body.tableNo !== undefined) updates.tableNo = body.tableNo;
      if (body.tableNumber !== undefined) {
        updates.tableNumber = body.tableNumber;
        updates.tableNo = body.tableNumber;
      }
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.priority !== undefined) updates.priority = Boolean(body.priority);

      if (body.status) {
        const targetStatus = String(body.status).toUpperCase();
        if (existing.status === "CANCELLED" && targetStatus !== "CANCELLED") {
          res.status(409).json({ error: "Cancelled tickets cannot be reopened" });
          return;
        }

        updates.status = targetStatus;
        if (targetStatus === "READY" && !existing.readyAt) {
          updates.readyAt = now;
        }
        if (targetStatus === "SERVED") {
          updates.servedAt = now;
        }

        // When ticket is cancelled, cancel open items too
        if (targetStatus === "CANCELLED" && Array.isArray(existing.items)) {
          updates.items = existing.items.map((it) => ({
            ...it,
            status: "CANCELLED",
            updatedAt: now,
          }));
        }
      }

      await ticketRef.update(updates);
      await legacyOrdersCol(businessId).doc(ticketId).set(updates, { merge: true });

      const updated = { ...existing, ...updates };
      res.json({ success: true, ticket: updated, data: updated });
    } catch (err: any) {
      console.error("Update kitchen ticket error:", err);
      res.status(500).json({ error: "Failed to update kitchen ticket", details: err?.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 8. PATCH /api/kitchen/:id/items/:itemId — Update Item Status
// ─────────────────────────────────────────────────────────────────────────────
router.patch(
  "/:id/items/:itemId",
  requirePermission("kitchen.update", "kitchen.create", "pos.sell"),
  async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req);
      if (!businessId) {
        res.status(403).json({ error: "Missing business context" });
        return;
      }

      const ticketId = String(req.params.id);
      const itemId = String(req.params.itemId);
      const ticketRef = ticketsCol(businessId).doc(ticketId);
      const doc = await ticketRef.get();
      if (!doc.exists) {
        res.status(404).json({ error: "Kitchen ticket not found" });
        return;
      }

      const ticket = doc.data() as KitchenTicket;
      if (ticket.status === "CANCELLED" || ticket.status === "SERVED") {
        res.status(409).json({ error: "Cannot modify items on a closed ticket" });
        return;
      }

      const items = Array.isArray(ticket.items) ? [...ticket.items] : [];
      const itemIdx = items.findIndex((it) => it.id === itemId);
      if (itemIdx === -1) {
        res.status(404).json({ error: "Item not found in ticket" });
        return;
      }

      const targetItemStatus = String(req.body.status || "PENDING").toUpperCase() as KitchenTicketItem["status"];
      const now = new Date().toISOString();

      items[itemIdx] = {
        ...items[itemIdx],
        status: targetItemStatus,
        updatedAt: now,
      };

      // Auto-advance ticket status based on items
      const activeItems = items.filter((it) => it.status !== "CANCELLED");
      let computedTicketStatus: KitchenTicket["status"] = ticket.status;

      if (activeItems.length === 0) {
        computedTicketStatus = "CANCELLED";
      } else if (activeItems.every((it) => it.status === "READY")) {
        computedTicketStatus = "READY";
      } else if (activeItems.some((it) => it.status === "PREPARING" || it.status === "READY")) {
        computedTicketStatus = "PREPARING";
      }

      const updates: Partial<KitchenTicket> = {
        items,
        status: computedTicketStatus,
        updatedAt: now,
        ...(computedTicketStatus === "READY" && !ticket.readyAt ? { readyAt: now } : {}),
      };

      await ticketRef.update(updates);
      await legacyOrdersCol(businessId).doc(ticketId).set(updates, { merge: true });

      const updated = { ...ticket, ...updates };
      res.json({ success: true, ticket: updated, data: updated });
    } catch (err: any) {
      console.error("Update kitchen item error:", err);
      res.status(500).json({ error: "Failed to update kitchen ticket item", details: err?.message });
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// 9. POST /api/kitchen/:id/recall — Recall Served Ticket (15 min window)
// ─────────────────────────────────────────────────────────────────────────────
const RECALL_WINDOW_MS = 15 * 60 * 1000;

router.post(
  "/:id/recall",
  requirePermission("kitchen.update", "kitchen.create", "pos.sell"),
  async (req: Request, res: Response) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req);
      if (!businessId) {
        res.status(403).json({ error: "Missing business context" });
        return;
      }

      const ticketId = String(req.params.id);
      const ticketRef = ticketsCol(businessId).doc(ticketId);
      const doc = await ticketRef.get();
      if (!doc.exists) {
        res.status(404).json({ error: "Kitchen ticket not found" });
        return;
      }

      const ticket = doc.data() as KitchenTicket;
      if (ticket.status !== "SERVED") {
        res.status(409).json({ error: "Only SERVED tickets can be recalled" });
        return;
      }

      const servedAt = new Date(ticket.servedAt || ticket.updatedAt || Date.now()).getTime();
      if (Date.now() - servedAt > RECALL_WINDOW_MS) {
        res.status(409).json({ error: "Recall window expired (15 minutes after serving)" });
        return;
      }

      const now = new Date().toISOString();
      const updates: Partial<KitchenTicket> = {
        status: "READY",
        servedAt: null,
        updatedAt: now,
      };

      await ticketRef.update(updates);
      await legacyOrdersCol(businessId).doc(ticketId).set(updates, { merge: true });

      const updated = { ...ticket, ...updates };
      res.json({ success: true, ticket: updated, data: updated });
    } catch (err: any) {
      console.error("Recall kitchen ticket error:", err);
      res.status(500).json({ error: "Failed to recall kitchen ticket", details: err?.message });
    }
  }
);

export default router;
