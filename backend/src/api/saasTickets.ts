import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken } from "./middleware/auth.js";
import { broadcastTicketUpdate } from "../lib/chatSocket.js";
import { sendNotification } from "../lib/notificationService.js";

const router = express.Router();

// Unlike every other resource so far (scoped to one business under
// businesses/{businessId}/...), a SaaS ticket needs to be readable/
// writable by BOTH the business that filed it AND any SaaS Owner/Admin -
// so it lives in its own top-level collection with a business_id field,
// and every route below branches on the caller's role instead of just
// scoping straight to req.user.id.
function ticketsCollection() {
  return getDb().collection("saasTickets");
}

function isSaasStaff(role: string) {
  return role === "SAAS_OWNER" || role === "SAAS_ADMIN";
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken);

// GET /api/saas-tickets - SaaS staff see everything; a business sees only its own.
router.get("/", async (req, res) => {
  try {
    const { id, role } = (req as any).user;
    const snapshot = isSaasStaff(role)
      ? await ticketsCollection().get()
      : await ticketsCollection().where("business_id", "==", id).get();
    const tickets = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ tickets });
  } catch (error) {
    console.error("List saas tickets error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/saas-tickets - a business can only file a ticket as itself;
// SaaS staff may file one on behalf of a given business_id.
router.post("/", async (req, res) => {
  try {
    const { id, role } = (req as any).user;
    const { id: bodyId, ...data } = req.body;
    const business_id = isSaasStaff(role) ? (data.business_id || id) : id;

    const payload = stripUndefined({
      ...data,
      business_id,
      status: data.status || "Open",
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const docRef = ticketsCollection().doc();
    await docRef.set(payload);
    const ticket = { id: docRef.id, ...payload };
    broadcastTicketUpdate(ticket);

    // If filed by client, notify SaaS staff
    if (!isSaasStaff(role)) {
      sendNotification({
        targetRole: "SAAS_ADMIN",
        category: "support",
        type: "info",
        title: "New Support Ticket",
        message: `Ticket #${docRef.id.slice(-6)}: "${ticket.subject || ticket.title || "Support request"}"`,
        target: "/admin?tab=support",
        metadata: { ticketId: docRef.id, businessId: ticket.business_id },
      }).catch(() => {});
    }

    res.status(201).json({ ticket });
  } catch (error) {
    console.error("Create saas ticket error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/saas-tickets/:id - SaaS staff can update any ticket; a
// business can only update (e.g. add a message to, or reopen) its own.
router.patch("/:id", async (req, res) => {
  try {
    const { id, role } = (req as any).user;
    const docRef = ticketsCollection().doc(req.params.id);
    const existing = await docRef.get();
    if (!existing.exists) return res.status(404).json({ error: "Ticket not found" });

    const ticket = existing.data()!;
    if (!isSaasStaff(role) && ticket.business_id !== id) {
      return res.status(403).json({ error: "You can only update your own tickets." });
    }

    const payload = stripUndefined({ ...req.body, updated_at: new Date().toISOString() });
    await docRef.set(payload, { merge: true });
    const updated = await docRef.get();
    const updatedTicket: any = { id: updated.id, ...updated.data() };
    broadcastTicketUpdate(updatedTicket);

    // Send notification to the opposite party
    if (isSaasStaff(role)) {
      if (ticket.business_id) {
        sendNotification({
          businessId: ticket.business_id,
          userId: ticket.business_id,
          category: "support",
          type: updatedTicket.status === "Closed" || updatedTicket.status === "Resolved" ? "success" : "info",
          title: updatedTicket.status === "Closed" || updatedTicket.status === "Resolved"
            ? `Ticket Resolved (#${updatedTicket.id.slice(-6)})`
            : `Support Reply (#${updatedTicket.id.slice(-6)})`,
          message: updatedTicket.status === "Closed" || updatedTicket.status === "Resolved"
            ? `Your support ticket "${updatedTicket.subject || updatedTicket.title || "Ticket"}" has been marked as ${updatedTicket.status}.`
            : `Support staff updated ticket "${updatedTicket.subject || updatedTicket.title || "Ticket"}".`,
          target: "/support",
          metadata: { ticketId: updatedTicket.id, status: updatedTicket.status },
        }).catch(() => {});
      }
    } else {
      sendNotification({
        targetRole: "SAAS_ADMIN",
        category: "support",
        type: "info",
        title: `Ticket Reply (#${updatedTicket.id.slice(-6)})`,
        message: `Client replied to ticket "${updatedTicket.subject || updatedTicket.title || "Ticket"}".`,
        target: "/admin?tab=support",
        metadata: { ticketId: updatedTicket.id, businessId: ticket.business_id },
      }).catch(() => {});
    }

    res.json({ ticket: updatedTicket });
  } catch (error) {
    console.error("Update saas ticket error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
