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

function vehiclesCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("vehicles");
}

function vehicleLogsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("vehicleLogs");
}

function transactionsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("transactions");
}

// GET /api/vehicles
router.get("/", requirePermission("admin.settings", "inventory.view", "admin.stores"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const snap = await vehiclesCol(businessId).get();
    const vehicles = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    vehicles.sort((a: any, b: any) => String(a.regNumber || "").localeCompare(String(b.regNumber || "")));
    res.json(vehicles);
  } catch (error) {
    console.error("List vehicles error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/vehicles/:id
router.get("/:id", requirePermission("admin.settings", "inventory.view", "admin.stores"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const vehicleId = String(req.params.id);
    const doc = await vehiclesCol(businessId).doc(vehicleId).get();
    if (!doc.exists) return res.status(404).json({ error: "Vehicle not found" });

    const logsSnap = await vehicleLogsCol(businessId).where("vehicleId", "==", vehicleId).get();
    const logs = logsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    logs.sort((a: any, b: any) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

    res.json({ id: doc.id, ...doc.data(), logs });
  } catch (error) {
    console.error("Get vehicle error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/vehicles
router.post("/", requirePermission("admin.settings", "inventory.add", "admin.stores"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { regNumber, model, type = "Truck", driverName, driverPhone, currentOdometer = 0, fuelType = "Diesel", notes } = req.body || {};

    if (!regNumber) return res.status(400).json({ error: "Registration number (regNumber) is required" });

    const docRef = vehiclesCol(businessId).doc();
    const payload = stripUndefined({
      regNumber: String(regNumber).trim().toUpperCase(),
      model: model?.trim() || "",
      type: type || "Truck",
      driverName: driverName?.trim() || "",
      driverPhone: driverPhone?.trim() || "",
      currentOdometer: Number(currentOdometer) || 0,
      fuelType,
      status: "ACTIVE",
      totalCostIncurred: 0,
      notes: notes || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);
    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create vehicle error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// PATCH /api/vehicles/:id
router.patch("/:id", requirePermission("admin.settings", "inventory.edit", "admin.stores"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const docRef = vehiclesCol(businessId).doc(String(req.params.id));
    const doc = await docRef.get();
    if (!doc.exists) return res.status(404).json({ error: "Vehicle not found" });

    const update: Record<string, any> = { updatedAt: new Date().toISOString() };
    const fields = ["regNumber", "model", "type", "driverName", "driverPhone", "currentOdometer", "fuelType", "status", "notes"];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) update[f] = req.body[f];
    });

    await docRef.set(stripUndefined(update), { merge: true });
    res.json({ id: doc.id, ...doc.data(), ...update });
  } catch (error) {
    console.error("Update vehicle error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/vehicles/:id/logs
router.post("/:id/logs", requirePermission("admin.settings", "inventory.adjustment", "finance.expense.add", "admin.stores", "inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const vehicleId = String(req.params.id);
    const vehicleRef = vehiclesCol(businessId).doc(vehicleId);
    const vehicleDoc = await vehicleRef.get();
    if (!vehicleDoc.exists) return res.status(404).json({ error: "Vehicle not found" });

    const vehicle = vehicleDoc.data()!;
    const { logType = "FUEL", odometer, cost = 0, liters = 0, vendorName, notes, date } = req.body || {};

    const numCost = Number(cost) || 0;
    const newOdometer = odometer != null ? Math.max(Number(odometer) || 0, Number(vehicle.currentOdometer) || 0) : vehicle.currentOdometer;

    const logRef = vehicleLogsCol(businessId).doc();
    const logPayload = stripUndefined({
      vehicleId,
      regNumber: vehicle.regNumber,
      logType,
      odometer: newOdometer,
      cost: numCost,
      liters: Number(liters) || 0,
      vendorName: vendorName || "",
      notes: notes || "",
      date: date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      business_id: businessId,
    });

    await logRef.set(logPayload);

    // Update vehicle metrics
    const nextTotalCost = (Number(vehicle.totalCostIncurred) || 0) + numCost;
    await vehicleRef.set(
      {
        currentOdometer: newOdometer,
        totalCostIncurred: nextTotalCost,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Auto-post to expense ledger
    try {
      if (numCost > 0) {
        await transactionsCol(businessId).add({
          business_id: businessId,
          type: "Expense",
          subType: "Fleet & Logistics",
          category: `Vehicle ${logType}`,
          total: numCost,
          paid: numCost,
          reference: `VEHICLE-${vehicle.regNumber}-${logRef.id.slice(-6)}`,
          notes: `Vehicle log (${logType}) for ${vehicle.regNumber}: ${vendorName ? vendorName + ' - ' : ''}${notes || ''}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn("Vehicle expense transaction logging notice:", e);
    }

    res.status(201).json({ id: logRef.id, ...logPayload });
  } catch (error) {
    console.error("Create vehicle log error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
