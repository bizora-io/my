import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import {
  authenticateToken,
  getActingBusinessId,
  requireBusinessContext,
  requirePermission,
} from "./middleware/auth.js";

const router = express.Router();

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken, requireBusinessContext);

function roomsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("hotelRooms");
}

function reservationsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("hotelReservations");
}

function transactionsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("transactions");
}

// --- Rooms ---
router.get("/rooms", requirePermission("pos.sell", "inventory.view", "admin.settings", "admin.stores"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { status, type } = req.query;

    let query: FirebaseFirestore.Query = roomsCol(businessId);
    if (status && typeof status === "string") query = query.where("status", "==", status);
    if (type && typeof type === "string") query = query.where("roomType", "==", type);

    const snap = await query.get();
    const rooms = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rooms.sort((a: any, b: any) => String(a.roomNumber || "").localeCompare(String(b.roomNumber || "")));

    res.json(rooms);
  } catch (error) {
    console.error("List hotel rooms error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/rooms", requirePermission("admin.settings", "inventory.add", "pos.sell"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { roomNumber, roomType = "Standard", floor = 1, capacity = 2, ratePerNight = 0, amenities = [] } = req.body || {};

    if (!roomNumber) return res.status(400).json({ error: "roomNumber is required" });

    const docRef = roomsCol(businessId).doc();
    const payload = stripUndefined({
      roomNumber: String(roomNumber).trim(),
      roomType: String(roomType).trim(),
      floor: Number(floor) || 1,
      capacity: Number(capacity) || 2,
      ratePerNight: Number(ratePerNight) || 0,
      amenities: Array.isArray(amenities) ? amenities : [],
      status: "AVAILABLE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create hotel room error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/rooms/:id", requirePermission("admin.settings", "inventory.edit", "pos.sell"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = roomsCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Room not found" });

    const update: Record<string, any> = { updatedAt: new Date().toISOString() };
    const fields = ["roomNumber", "roomType", "floor", "capacity", "ratePerNight", "status", "amenities"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    });

    await docRef.set(stripUndefined(update), { merge: true });
    res.json({ id: doc.id, ...doc.data(), ...update });
  } catch (error) {
    console.error("Update hotel room error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/rooms/:id", requirePermission("admin.settings", "inventory.delete", "pos.sell"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const roomId = String(req.params.id);
    await roomsCol(businessId).doc(roomId).delete();
    res.json({ ok: true, deletedId: roomId });
  } catch (error) {
    console.error("Delete room error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Reservations ---
router.get("/reservations", requirePermission("pos.sell", "pos.view_sales", "admin.settings", "admin.stores"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { status } = req.query;

    let query: FirebaseFirestore.Query = reservationsCol(businessId);
    if (status && typeof status === "string") query = query.where("status", "==", status);

    const snap = await query.get();
    const resList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    resList.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    res.json(resList);
  } catch (error) {
    console.error("List reservations error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/reservations", requirePermission("pos.sell", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const {
      guestName,
      guestPhone,
      guestEmail,
      guestNid,
      roomId,
      roomNumber,
      checkInDate,
      checkOutDate,
      numberOfGuests = 1,
      ratePerNight = 0,
      totalNights = 1,
      advancePaid = 0,
      notes,
    } = req.body || {};

    if (!guestName || !roomId) {
      return res.status(400).json({ error: "guestName and roomId are required" });
    }

    const nights = Math.max(1, Number(totalNights) || 1);
    const rate = Number(ratePerNight) || 0;
    const totalAmount = nights * rate;

    const docRef = reservationsCol(businessId).doc();
    const payload = stripUndefined({
      guestName: String(guestName).trim(),
      guestPhone: guestPhone?.trim() || "",
      guestEmail: guestEmail?.trim() || "",
      guestNid: guestNid?.trim() || "",
      roomId,
      roomNumber: roomNumber || "",
      checkInDate: checkInDate || new Date().toISOString(),
      checkOutDate: checkOutDate || new Date(Date.now() + 86400000).toISOString(),
      numberOfGuests: Number(numberOfGuests) || 1,
      totalNights: nights,
      ratePerNight: rate,
      totalAmount,
      advancePaid: Number(advancePaid) || 0,
      remainingAmount: Math.max(0, totalAmount - (Number(advancePaid) || 0)),
      notes: notes || "",
      status: "BOOKED",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create reservation error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Check-in
router.post("/reservations/:id/check-in", requirePermission("pos.sell", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const resRef = reservationsCol(businessId).doc(String(req.params.id));
    const resDoc = await resRef.get();
    if (!resDoc.exists) return res.status(404).json({ error: "Reservation not found" });

    const reservation = resDoc.data()!;
    const roomId = reservation.roomId;

    const db = getDb();
    await db.runTransaction(async (t) => {
      t.update(resRef, {
        status: "CHECKED_IN",
        actualCheckIn: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      if (roomId) {
        const roomRef = roomsCol(businessId).doc(roomId);
        t.update(roomRef, {
          status: "OCCUPIED",
          currentReservationId: resRef.id,
          currentGuestName: reservation.guestName,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    const updated = await resRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Check-out
router.post("/reservations/:id/check-out", requirePermission("pos.sell", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const resRef = reservationsCol(businessId).doc(String(req.params.id));
    const resDoc = await resRef.get();
    if (!resDoc.exists) return res.status(404).json({ error: "Reservation not found" });

    const reservation = resDoc.data()!;
    const { paidAmount = 0, paymentMethod = "Cash", extraCharges = 0 } = req.body || {};

    const totalBill = (Number(reservation.totalAmount) || 0) + (Number(extraCharges) || 0);
    const payment = Number(paidAmount) || 0;
    const finalPaid = (Number(reservation.advancePaid) || 0) + payment;
    const remainingDue = Math.max(0, totalBill - finalPaid);

    const db = getDb();
    await db.runTransaction(async (t) => {
      // Record income transaction for folio
      if (finalPaid > 0) {
        const txRef = transactionsCol(businessId).doc();
        t.set(txRef, {
          business_id: businessId,
          type: "Sale",
          subType: "Hotel Accommodation",
          category: "Room Revenue",
          customerName: reservation.guestName,
          total: totalBill,
          paid: finalPaid,
          paymentMethod,
          reference: `HOTEL-${resRef.id}`,
          notes: `Hotel check-out for ${reservation.guestName} (Room ${reservation.roomNumber || reservation.roomId})`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      t.update(resRef, {
        status: "CHECKED_OUT",
        actualCheckOut: new Date().toISOString(),
        extraCharges: Number(extraCharges) || 0,
        finalTotal: totalBill,
        finalPaid,
        remainingDue,
        updatedAt: new Date().toISOString(),
      });

      if (reservation.roomId) {
        const roomRef = roomsCol(businessId).doc(reservation.roomId);
        t.update(roomRef, {
          status: "CLEANING",
          currentReservationId: "",
          currentGuestName: "",
          updatedAt: new Date().toISOString(),
        });
      }
    });

    const updated = await resRef.get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
