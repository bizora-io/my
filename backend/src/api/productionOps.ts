import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId, requireBusinessContext, requirePermission } from "./middleware/auth.js";
import { logAudit } from "../lib/auditLog.js";
import { explodeBom, mrpFromExplosion, type BomInput } from "../lib/bomExplosion.js";
import { buildCapacitySchedule, suggestAvailableDay } from "../lib/capacityPlan.js";
import { computeCostVariance, standardLaborFromOperations, standardMaterialFromLeaves } from "../lib/costVariance.js";
import { aggregateReservations, applyReservationsToMrpLines } from "../lib/materialReservation.js";
import { upsertLot } from "../lib/fefo.js";

const router = express.Router();

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function bizCol(businessId: string, name: string) {
  return getDb().collection("businesses").doc(businessId).collection(name);
}

function addDaysIso(baseIso: string, days: number): string {
  const d = new Date(baseIso.slice(0, 10) + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function resolveExpiryDate(opts: {
  expiryDate?: string;
  shelfLifeDays?: number;
  fromDate?: string;
}): string | null {
  if (opts.expiryDate) return String(opts.expiryDate).slice(0, 10);
  const days = Number(opts.shelfLifeDays);
  if (days > 0) {
    const from = (opts.fromDate || new Date().toISOString()).slice(0, 10);
    return addDaysIso(from, days);
  }
  return null;
}


router.use(authenticateToken, requireBusinessContext);

/**
 * GET /api/production/mrp?bomId=&qty=
 * Material requirements vs current raw material stock.
 */
/**
 * GET /api/production/explode?bomId=&qty=
 * Returns full multi-level explosion tree (leaves + levels).
 */
router.get("/explode", requirePermission("inventory.production", "inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const bomId = String(req.query.bomId || "");
    const qty = Math.max(0, Number(req.query.qty) || 1);
    if (!bomId) return res.status(400).json({ error: "bomId required" });
    const bomDoc = await bizCol(businessId, "boms").doc(bomId).get();
    if (!bomDoc.exists) return res.status(404).json({ error: "BOM not found" });
    const bom = { id: bomDoc.id, ...(bomDoc.data() || {}) } as BomInput;
    const allBomSnap = await bizCol(businessId, "boms").get();
    const allBoms: BomInput[] = allBomSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const explosion = explodeBom(bom, qty, allBoms);
    res.json(explosion);
  } catch (error) {
    console.error("Explode error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/mrp", requirePermission("inventory.production", "inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const bomId = String(req.query.bomId || "");
    const qty = Math.max(0, Number(req.query.qty) || 0);
    if (!bomId || qty <= 0) return res.status(400).json({ error: "bomId and qty>0 required" });

    const bomDoc = await bizCol(businessId, "boms").doc(bomId).get();
    if (!bomDoc.exists) return res.status(404).json({ error: "BOM not found" });
    const bom = { id: bomDoc.id, ...(bomDoc.data() || {}) } as BomInput;
    const allBomSnap = await bizCol(businessId, "boms").get();
    const allBoms: BomInput[] = allBomSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const explosion = explodeBom(bom, qty, allBoms);
    const matSnap = await bizCol(businessId, "rawMaterials").get();
    const stockByMaterialId: Record<string, any> = {};
    matSnap.docs.forEach((d) => {
      stockByMaterialId[d.id] = d.data();
    });
    const batchSnap = await bizCol(businessId, "productionBatches").get();
    const openBatches = batchSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const reservedMap = aggregateReservations(openBatches as any[], {
      excludeBatchId: req.query.excludeBatchId ? String(req.query.excludeBatchId) : undefined,
    });
    const linesWithRes = applyReservationsToMrpLines(mrpFromExplosion(explosion, stockByMaterialId).lines, reservedMap);
    const mrpBase = mrpFromExplosion(explosion, stockByMaterialId);
    const canProduce = linesWithRes.every((l) => l.ok) && explosion.ok;
    const totalMaterialCost = linesWithRes.reduce((s, l: any) => s + (l.estimatedCost || 0), 0);

    res.json({
      bomId,
      productId: bom.productId,
      productName: bom.productName,
      qty,
      multiLevel: true,
      reservationAware: true,
      canProduce,
      totalMaterialCost,
      lines: linesWithRes,
      shortages: linesWithRes.filter((l) => !l.ok),
      levels: explosion.levels,
      cycles: explosion.cycles,
      errors: explosion.errors,
      totalReservedMaterials: reservedMap.size,
    });
  } catch (error) {
    console.error("MRP error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/production/complete
 * Body: { batchId, actualQty?, scrapQty?, laborCost?, notes? }
 * Consumes BOM materials × qty, adds finished goods stock, marks batch Completed.
 */
router.post("/complete", requirePermission("inventory.production"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const { batchId, actualQty, scrapQty, laborCost, notes, force, qc: qcBody, scrapReason, scrapReasons } = req.body || {};
    if (!batchId) return res.status(400).json({ error: "batchId required" });

    const batchRef = bizCol(businessId, "productionBatches").doc(batchId);
    const batchDoc = await batchRef.get();
    if (!batchDoc.exists) return res.status(404).json({ error: "Batch not found" });
    const batch = batchDoc.data() || {};
    if (batch.status === "Completed") {
      return res.status(400).json({ error: "Batch already completed" });
    }
    const opsList = Array.isArray(batch.operations) ? batch.operations : [];
    if (opsList.length && !force) {
      const pending = opsList.filter((o: any) => String(o.status || "Pending") !== "Done");
      if (pending.length) {
        return res.status(409).json({
          error: "Operations incomplete",
          pending: pending.map((o: any) => ({ seq: o.seq, name: o.name, status: o.status })),
        });
      }
    }

    // QC gate: route/batch requires passed inspection
    const qcRequired = batch.requireQc === true || opsList.some((o: any) => o.isQc);
    const qc = batch.qc || {};
    if (qcRequired && !force) {
      if (qc.result !== "pass" && qc.result !== "passed") {
        return res.status(409).json({
          error: "QC required",
          message: "Record a passing QC inspection before completing this batch.",
          qc: qc.result || null,
        });
      }
    }
    // Reject complete if QC failed (even with force unless forceQc)
    if ((qc.result === "fail" || qc.result === "failed") && !req.body?.forceQc && !force) {
      return res.status(409).json({
        error: "QC failed",
        message: "Batch failed quality inspection. Use forceQc to override.",
        qc,
      });
    }

    const plannedQty = Number(batch.quantity) || 0;
    const goodQty = actualQty != null ? Number(actualQty) : plannedQty;
    const scrap = Number(scrapQty) || 0;
    if (goodQty < 0 || scrap < 0) return res.status(400).json({ error: "Invalid quantities" });

    // Consume based on planned or max(good+scrap, planned) for material draw
    const consumeQty = Math.max(plannedQty, goodQty + scrap);

    const bomId = batch.bomId;
    const bomDoc = bomId ? await bizCol(businessId, "boms").doc(bomId).get() : null;
    if (!bomDoc?.exists) return res.status(400).json({ error: "Batch has no valid BOM" });
    const bom = { id: bomDoc.id, ...(bomDoc.data() || {}) } as BomInput;
    const allBomSnap = await bizCol(businessId, "boms").get();
    const allBoms: BomInput[] = allBomSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const explosion = explodeBom(bom, consumeQty, allBoms);
    if (!explosion.ok && explosion.cycles.length) {
      return res.status(400).json({ error: "BOM cycle detected", cycles: explosion.cycles, errors: explosion.errors });
    }

    // Load materials and check stock from exploded leaves
    const consumptions: any[] = [];
    let materialCost = 0;
    for (const leaf of explosion.leaves) {
      const need = leaf.qty;
      if (need <= 0) continue;
      const matRef = bizCol(businessId, "rawMaterials").doc(leaf.materialId);
      const matDoc = await matRef.get();
      if (!matDoc.exists) {
        return res.status(400).json({
          error: `Raw material ${leaf.materialId} not found (after multi-level explosion)`,
          path: leaf.path,
        });
      }
      const mat = matDoc.data() || {};
      const onHand = Number(mat.stock) || 0;
      if (onHand + 1e-9 < need && !force) {
        return res.status(409).json({
          error: "Insufficient raw material",
          materialId: leaf.materialId,
          name: mat.name || leaf.name,
          required: need,
          onHand,
          path: leaf.path,
        });
      }
      const cost = need * (Number(mat.cost) || 0);
      materialCost += cost;
      consumptions.push({
        materialId: leaf.materialId,
        name: mat.name || leaf.name,
        qty: need,
        unitCost: Number(mat.cost) || 0,
        cost,
        path: leaf.path,
        newStock: Math.max(0, onHand - need),
        ref: matRef,
      });
    }

    // Apply material deductions
    for (const c of consumptions) {
      await c.ref.set(
        { stock: c.newStock, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    }

    const completedAt = new Date().toISOString();

    // Increase finished goods
    const productId = batch.productId || bom.productId;
    let productAfter: any = null;
    let appliedExpiry: string | null = null;
    let appliedLot: string | null = null;
    if (productId && goodQty > 0) {
      const prodRef = bizCol(businessId, "products").doc(productId);
      const prodDoc = await prodRef.get();
      if (prodDoc.exists) {
        const prod = prodDoc.data() || {};
        const newStock = (Number(prod.stock) || 0) + goodQty;
        // Optional weighted average cost from materials
        const unitMatCost = goodQty > 0 ? materialCost / consumeQty : 0;
        const batchExpiry =
          resolveExpiryDate({
            expiryDate: req.body?.expiryDate || batch.expiryDate,
            shelfLifeDays: req.body?.shelfLifeDays ?? batch.shelfLifeDays,
            fromDate: completedAt.slice(0, 10),
          }) || null;
        appliedExpiry = batchExpiry;
        const lotNumber = req.body?.lotNumber || batch.lotNumber || `LOT-${batchId.slice(-6)}`;
        appliedLot = lotNumber;
        const update: any = {
          stock: newStock,
          updatedAt: completedAt,
          batchNumber: lotNumber,
        };
        if (batchExpiry) update.expiryDate = batchExpiry;
        if (unitMatCost > 0 && (prod.cost == null || Number(prod.cost) === 0)) {
          update.cost = unitMatCost;
        }
        // FEFO lot register
        const lots = upsertLot(Array.isArray(prod.lots) ? prod.lots : [], {
          lotNumber,
          qty: goodQty,
          expiryDate: batchExpiry || undefined,
          receivedAt: completedAt.slice(0, 10),
        });
        update.lots = lots;
        await prodRef.set(update, { merge: true });
        productAfter = { id: productId, stock: newStock, expiryDate: batchExpiry, batchNumber: lotNumber, lots };
      }
    }

    let labor = Number(laborCost);
    if (!(labor > 0)) {
      labor = Number(batch.suggestedLaborCost) || Number(batch.laborCost) || 0;
    }
    if (!(labor > 0) && Array.isArray(batch.operations)) {
      const hrs = batch.operations.reduce(
        (s: number, o: any) => s + (Number(o.actualHours) || 0),
        0
      );
      const rate =
        Number(req.body?.laborRate) ||
        Number(batch.laborRate) ||
        Number(process.env.DEFAULT_LABOR_RATE) ||
        0;
      if (hrs > 0 && rate > 0) labor = hrs * rate;
    }
    labor = Number(labor) || 0;
    const laborRate = Number(req.body?.laborRate) || Number(batch.laborRate) || Number(process.env.DEFAULT_LABOR_RATE) || 0;
    const stdMatNow = standardMaterialFromLeaves(
      consumptions.map((c) => ({ qty: c.qty, unitCost: c.unitCost }))
    );
    // Prefer plan-time frozen standard; else current explosion costs
    const standardMaterial =
      Number(batch.standardMaterialCost) > 0 ? Number(batch.standardMaterialCost) : stdMatNow;
    let standardLabor = Number(batch.standardLaborCost) || 0;
    if (!standardLabor) {
      standardLabor = standardLaborFromOperations(
        opsList.length ? opsList : batch.operations,
        goodQty > 0 ? goodQty : plannedQty,
        laborRate,
        plannedQty > 0 ? plannedQty : 1
      );
    } else if (plannedQty > 0 && goodQty > 0 && goodQty !== plannedQty) {
      // Scale frozen labor standard to actual good qty
      standardLabor = Math.round(standardLabor * (goodQty / plannedQty) * 100) / 100;
    }
    const variance = computeCostVariance(
      { material: standardMaterial, labor: standardLabor },
      { material: materialCost, labor: labor }
    );
    const batchUpdate = stripUndefined({
      status: "Completed",
      endDate: completedAt.slice(0, 10),
      completedAt,
      actualQty: goodQty,
      scrapQty: scrap,
      plannedQty,
      materialCost,
      laborCost: labor,
      totalActualHours: Array.isArray(batch.operations)
        ? batch.operations.reduce((s: number, o: any) => s + (Number(o.actualHours) || 0), 0)
        : batch.totalActualHours || null,
      totalCost: materialCost + labor,
      unitCost: goodQty > 0 ? (materialCost + labor) / goodQty : 0,
      standardMaterialCost: variance.standardMaterial,
      standardLaborCost: variance.standardLabor,
      standardTotalCost: variance.standardTotal,
      costVariance: variance,
      laborRate,
      consumptions: consumptions.map(({ ref, ...rest }) => rest),
      explosionLevels: explosion.levels,
      multiLevel: true,
      reservations: [],
      reservedAt: null,
      notes: notes || batch.notes || "",
      updatedAt: completedAt,
    });
    await batchRef.set(batchUpdate, { merge: true });

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Completed production batch ${batchId} qty=${goodQty} scrap=${scrap}`,
      targetType: "productionBatch",
      targetId: batchId,
    });

    res.json({
      batch: { id: batchId, ...batch, ...batchUpdate },
      product: productAfter,
      materialCost,
      laborCost: labor,
      consumptions: batchUpdate.consumptions,
    });
  } catch (error) {
    console.error("Production complete error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/production/batches — create planned batch with optional work center
 */
router.post("/batches", requirePermission("inventory.production"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const body = req.body || {};
    if (!body.bomId || !body.quantity) {
      return res.status(400).json({ error: "bomId and quantity required" });
    }
    const bomDoc = await bizCol(businessId, "boms").doc(body.bomId).get();
    if (!bomDoc.exists) return res.status(404).json({ error: "BOM not found" });
    const bom = bomDoc.data() || {};

    const productId = body.productId || bom.productId;
    // Snapshot routing steps onto the batch (explicit routeId or default for product)
    let operations: any[] = Array.isArray(body.operations) ? body.operations : [];
    let routeIdUsed: string | null = body.routeId ? String(body.routeId) : null;
    if (!operations.length) {
      let routeDoc: any = null;
      if (body.routeId) {
        const byId = await bizCol(businessId, "productionRoutes").doc(String(body.routeId)).get();
        if (byId.exists) routeDoc = byId;
      }
      if (!routeDoc) {
        const routeSnap = await bizCol(businessId, "productionRoutes")
          .where("productId", "==", productId)
          .get()
          .catch(() => null);
        if (routeSnap && !routeSnap.empty) {
          const docs = routeSnap.docs;
          const def = docs.find((d) => d.data()?.isDefault) || docs.find((d) => d.id === productId) || docs[0];
          routeDoc = def;
        }
      }
      if (!routeDoc) {
        const byProd = await bizCol(businessId, "productionRoutes").doc(String(productId)).get();
        if (byProd.exists) routeDoc = byProd;
      }
      if (!routeDoc && body.bomId) {
        const byBom = await bizCol(businessId, "productionRoutes").doc(body.bomId).get().catch(() => null);
        if (byBom?.exists) routeDoc = byBom as any;
      }
      const routeData = routeDoc ? routeDoc.data() : null;
      routeIdUsed = routeDoc ? routeDoc.id : null;
      const steps = routeData?.steps || routeData?.operations || [];
      if (Array.isArray(steps) && steps.length) {
        operations = steps.map((s: any, i: number) => ({
          seq: s.seq != null ? s.seq : i + 1,
          name: s.name || `Step ${i + 1}`,
          workCenterId: s.workCenterId || s.workCenter || null,
          standardHours: Number(s.standardHours) || 0,
          isQc: s.isQc === true || /qc|inspect|quality/i.test(String(s.name || "")),
          status: "Pending",
          completedAt: null,
          completedBy: null,
        }));
      }
    }

    const qty = Number(body.quantity);
    const laborRate = Number(body.laborRate) || Number(process.env.DEFAULT_LABOR_RATE) || 0;

    // Freeze standard costs at plan time (multi-level explosion × current material costs)
    let standardMaterialCost = Number(body.standardMaterialCost) || 0;
    let standardLeaves: any[] = [];
    try {
      const allBomSnap = await bizCol(businessId, "boms").get();
      const allBoms: BomInput[] = allBomSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const rootBom = { id: body.bomId, ...(bom as any), productId } as BomInput;
      const explosion = explodeBom(rootBom, qty, allBoms);
      const matSnap = await bizCol(businessId, "rawMaterials").get();
      const costMap = new Map(matSnap.docs.map((d) => [d.id, Number(d.data()?.cost) || 0]));
      standardLeaves = explosion.leaves.map((l) => ({
        materialId: l.materialId,
        name: l.name,
        qty: l.qty,
        unitCost: costMap.get(l.materialId) || 0,
        path: l.path,
      }));
      if (!standardMaterialCost) {
        standardMaterialCost = standardMaterialFromLeaves(standardLeaves);
      }
    } catch (e) {
      console.warn("Standard cost freeze failed:", e);
    }
    const standardLaborCost =
      Number(body.standardLaborCost) ||
      standardLaborFromOperations(operations, qty, laborRate, qty > 0 ? qty : 1);
    const standardTotalCost = Math.round((standardMaterialCost + standardLaborCost) * 100) / 100;

    const workCenterId = body.workCenterId || body.workCenter || null;
    let hoursRequired = body.hoursRequired != null ? Number(body.hoursRequired) : null;
    if (hoursRequired == null && operations.length) {
      hoursRequired = operations.reduce((s: number, o: any) => s + (Number(o.standardHours) || 0), 0) || null;
    }

    let startDate = body.startDate || new Date().toISOString().slice(0, 10);
    let autoScheduled = false;
    let scheduleNote: string | null = null;
    const wantAuto = body.autoSchedule !== false && body.autoSchedule !== "0";

    if (wantAuto && workCenterId) {
      try {
        const horizonDays = Math.min(90, Math.max(7, Number(body.scheduleHorizonDays) || 28));
        const from = body.earliestDate || startDate;
        const toD = new Date(from);
        toD.setUTCDate(toD.getUTCDate() + horizonDays);
        const to = toD.toISOString().slice(0, 10);

        const [wcSnap, batchSnap] = await Promise.all([
          bizCol(businessId, "workCenters").get(),
          bizCol(businessId, "productionBatches").get(),
        ]);
        const workCenters = wcSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        const batches = batchSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
        const schedule = buildCapacitySchedule({ workCenters, batches, from, to });
        const center =
          schedule.centers.find((c) => c.workCenterId === workCenterId) ||
          schedule.centers.find((c) => c.workCenterName === workCenterId);

        if (center) {
          const load =
            center.capacityUnit === "hours"
              ? Number(hoursRequired) || qty
              : qty;
          const suggested = suggestAvailableDay(center, load, from);
          if (suggested) {
            // Only override if client did not force a fixed date
            if (!body.startDate || body.autoSchedule === true || body.autoSchedule === "force") {
              startDate = suggested;
              autoScheduled = true;
              scheduleNote = `Auto-scheduled on ${suggested} (load ${load}, cap ${center.capacityPerDay}/${center.capacityUnit})`;
            } else if (body.startDate) {
              // Validate requested date capacity
              const day = center.days.find((d) => d.date === body.startDate);
              if (day && day.capacity > 0 && day.load + load > day.capacity + 1e-9) {
                scheduleNote = `Warning: ${body.startDate} overloaded (load ${day.load}+${load} > ${day.capacity}). Suggested ${suggested}`;
                if (body.autoSchedule === "force") {
                  startDate = suggested;
                  autoScheduled = true;
                }
              }
            }
          } else {
            scheduleNote = `No free capacity in next ${horizonDays} days for load ${load}`;
          }
        } else {
          scheduleNote = "Work center not found for auto-schedule";
        }
      } catch (e) {
        console.warn("Auto-schedule failed:", e);
        scheduleNote = "Auto-schedule skipped due to error";
      }
    }

    const id = body.id || `PB-${Date.now().toString(36).toUpperCase()}`;
    const payload = stripUndefined({
      bomId: body.bomId,
      productId,
      productName: body.productName || bom.productName,
      quantity: qty,
      status: body.status || "Planned",
      startDate,
      workCenter: workCenterId,
      workCenterId,
      hoursRequired,
      priority: body.priority || "normal",
      notes: body.notes || "",
      operations,
      routeId: routeIdUsed,
      requireQc: body.requireQc === true || operations.some((o: any) => o.isQc),
      laborRate,
      standardMaterialCost,
      standardLaborCost,
      standardTotalCost,
      standardFrozenAt: new Date().toISOString(),
      standardLeaves,
      reservations: standardLeaves.map((l: any) => ({
        materialId: l.materialId,
        qty: l.qty,
        name: l.name,
      })),
      reservedAt: standardLeaves.length ? new Date().toISOString() : null,
      autoScheduled,
      scheduleNote,
      lotNumber: body.lotNumber || null,
      shelfLifeDays: body.shelfLifeDays != null ? Number(body.shelfLifeDays) : null,
      expiryDate: resolveExpiryDate({
        expiryDate: body.expiryDate,
        shelfLifeDays: body.shelfLifeDays,
        fromDate: startDate,
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await bizCol(businessId, "productionBatches").doc(id).set(payload);
    res.status(201).json({ batch: { id, ...payload }, autoScheduled, scheduleNote });
  } catch (error) {
    console.error("Create batch error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * GET /api/production/capacity?from=&to=&workCenterId=
 * Daily load vs capacity for work centers.
 */
/**
 * GET /api/production/schedule-suggest?workCenterId=&qty=&hoursRequired=&from=
 */
router.get("/schedule-suggest", requirePermission("inventory.production", "inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const workCenterId = String(req.query.workCenterId || req.query.workCenter || "");
    if (!workCenterId) return res.status(400).json({ error: "workCenterId required" });
    const qty = Math.max(0, Number(req.query.qty) || 0);
    const hoursRequired = req.query.hoursRequired != null ? Number(req.query.hoursRequired) : null;
    const from = String(req.query.from || new Date().toISOString().slice(0, 10));
    const horizonDays = Math.min(90, Math.max(7, Number(req.query.horizonDays) || 28));
    const toD = new Date(from);
    toD.setUTCDate(toD.getUTCDate() + horizonDays);
    const to = toD.toISOString().slice(0, 10);

    const [wcSnap, batchSnap] = await Promise.all([
      bizCol(businessId, "workCenters").get(),
      bizCol(businessId, "productionBatches").get(),
    ]);
    const workCenters = wcSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const batches = batchSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const schedule = buildCapacitySchedule({ workCenters, batches, from, to });
    const center =
      schedule.centers.find((c) => c.workCenterId === workCenterId) ||
      schedule.centers.find((c) => c.workCenterName === workCenterId);
    if (!center) return res.status(404).json({ error: "Work center not found" });

    const load = center.capacityUnit === "hours" ? Number(hoursRequired) || qty : qty;
    const suggested = suggestAvailableDay(center, load, from);
    res.json({
      workCenterId: center.workCenterId,
      workCenterName: center.workCenterName,
      capacityPerDay: center.capacityPerDay,
      capacityUnit: center.capacityUnit,
      load,
      from,
      to,
      suggestedDate: suggested,
      overloadedDays: center.overloadedDays,
      peakUtilization: center.peakUtilization,
    });
  } catch (error) {
    console.error("Schedule suggest error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.get("/capacity", requirePermission("inventory.production", "inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const from = String(req.query.from || new Date().toISOString().slice(0, 10));
    const toDefault = new Date(from);
    toDefault.setUTCDate(toDefault.getUTCDate() + 13);
    const to = String(req.query.to || toDefault.toISOString().slice(0, 10));

    const [wcSnap, batchSnap] = await Promise.all([
      bizCol(businessId, "workCenters").get(),
      bizCol(businessId, "productionBatches").get(),
    ]);
    let workCenters = wcSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    if (req.query.workCenterId) {
      workCenters = workCenters.filter((w) => w.id === req.query.workCenterId);
    }
    const batches = batchSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const schedule = buildCapacitySchedule({ workCenters, batches, from, to });

    // Suggestions for overloaded centers
    const suggestions = schedule.centers.map((c) => {
      const load = 10;
      return {
        workCenterId: c.workCenterId,
        nextAvailable: suggestAvailableDay(c, load, from),
        overloadedDays: c.overloadedDays,
        peakUtilization: c.peakUtilization,
      };
    });

    res.json({ from, to, ...schedule, suggestions });
  } catch (error) {
    console.error("Capacity schedule error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Work centers
router.get("/work-centers", requirePermission("inventory.production", "inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snap = await bizCol(businessId, "workCenters").get();
    res.json({ workCenters: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/work-centers", requirePermission("inventory.production"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const { name, code, capacityPerDay, capacityUnit, notes } = req.body || {};
    if (!name) return res.status(400).json({ error: "name required" });
    const ref = bizCol(businessId, "workCenters").doc();
    const payload = stripUndefined({
      name,
      code: code || "",
      capacityPerDay: Number(capacityPerDay) || 0,
      capacityUnit: capacityUnit === "hours" ? "hours" : "units",
      notes: notes || "",
      createdAt: new Date().toISOString(),
    });
    await ref.set(payload);
    res.status(201).json({ workCenter: { id: ref.id, ...payload } });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// --- Production routing (operation sequences) ---

router.get("/routes", requirePermission("inventory.production", "inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snap = await bizCol(businessId, "productionRoutes").get();
    res.json({ routes: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
  } catch (error) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * PUT /api/production/routes/:routeId
 * Body: { productId, productName?, name?, code?, isDefault?, steps: [...] }
 * routeId may equal productId for legacy single-route docs.
 */
router.put("/routes/:routeId", requirePermission("inventory.production"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const routeId = String(req.params.routeId);
    const productId = String(req.body?.productId || routeId);
    const stepsIn = Array.isArray(req.body?.steps) ? req.body.steps : [];
    const steps = stepsIn.map((s: any, i: number) =>
      stripUndefined({
        seq: s.seq != null ? Number(s.seq) : i + 1,
        name: String(s.name || `Step ${i + 1}`),
        workCenterId: s.workCenterId || s.workCenter || null,
        standardHours: Number(s.standardHours) || 0,
        isQc: s.isQc === true || /qc|inspect|quality/i.test(String(s.name || "")),
      })
    );
    steps.sort((a: any, b: any) => a.seq - b.seq);

    const isDefault = req.body?.isDefault === true || routeId === productId;
    // If this becomes default, clear other defaults for same product
    if (isDefault) {
      const others = await bizCol(businessId, "productionRoutes").where("productId", "==", productId).get();
      const batch = getDb().batch();
      for (const d of others.docs) {
        if (d.id === routeId) continue;
        if (d.data()?.isDefault) batch.set(d.ref, { isDefault: false }, { merge: true });
      }
      await batch.commit().catch(() => null);
    }

    const payload = stripUndefined({
      productId,
      productName: req.body?.productName || "",
      name: req.body?.name || (routeId === productId ? "Primary" : "Alternate"),
      code: req.body?.code || (routeId === productId ? "PRIMARY" : undefined),
      isDefault,
      bomId: req.body?.bomId || null,
      requireQc: req.body?.requireQc === true || steps.some((s: any) => s.isQc),
      steps,
      updatedAt: new Date().toISOString(),
      createdAt: req.body?.createdAt || new Date().toISOString(),
    });
    await bizCol(businessId, "productionRoutes").doc(routeId).set(payload, { merge: true });
    res.json({ route: { id: routeId, ...payload } });
  } catch (error) {
    console.error("Save route error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/production/routes — create alternate route
 * Body: { productId, name?, code?, isDefault?, steps: [...] }
 */
router.post("/routes", requirePermission("inventory.production"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const productId = String(req.body?.productId || "");
    if (!productId) return res.status(400).json({ error: "productId required" });
    const ref = bizCol(businessId, "productionRoutes").doc();
    req.params = { ...req.params, routeId: ref.id };
    // reuse put logic by writing here
    const stepsIn = Array.isArray(req.body?.steps) ? req.body.steps : [];
    const steps = stepsIn.map((s: any, i: number) =>
      stripUndefined({
        seq: s.seq != null ? Number(s.seq) : i + 1,
        name: String(s.name || `Step ${i + 1}`),
        workCenterId: s.workCenterId || s.workCenter || null,
        standardHours: Number(s.standardHours) || 0,
        isQc: s.isQc === true || /qc|inspect|quality/i.test(String(s.name || "")),
      })
    );
    steps.sort((a: any, b: any) => a.seq - b.seq);
    const isDefault = req.body?.isDefault === true;
    if (isDefault) {
      const others = await bizCol(businessId, "productionRoutes").where("productId", "==", productId).get();
      for (const d of others.docs) {
        if (d.data()?.isDefault) await d.ref.set({ isDefault: false }, { merge: true });
      }
    }
    const payload = stripUndefined({
      productId,
      productName: req.body?.productName || "",
      name: req.body?.name || "Alternate",
      code: req.body?.code || `ALT-${ref.id.slice(-4)}`,
      isDefault,
      bomId: req.body?.bomId || null,
      requireQc: req.body?.requireQc === true || steps.some((s: any) => s.isQc),
      steps,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await ref.set(payload);
    res.status(201).json({ route: { id: ref.id, ...payload } });
  } catch (error) {
    console.error("Create route error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/production/batches/:id/operations/:seq/complete
 * Marks one routing step Done (must complete in sequence unless skipSequence).
 */

/**
 * POST /api/production/batches/:id/qc
 * Body: { result: 'pass'|'fail'|'hold', inspectedQty?, rejectedQty?, notes?, inspector? }
 */
router.post("/batches/:id/qc", requirePermission("inventory.production"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const batchRef = bizCol(businessId, "productionBatches").doc(String(req.params.id));
    const batchDoc = await batchRef.get();
    if (!batchDoc.exists) return res.status(404).json({ error: "Batch not found" });
    const batch = batchDoc.data() || {};
    if (batch.status === "Completed") {
      return res.status(400).json({ error: "Batch already completed" });
    }

    const result = String(req.body?.result || req.body?.status || "").toLowerCase();
    if (!["pass", "passed", "fail", "failed", "hold"].includes(result)) {
      return res.status(400).json({ error: "result must be pass, fail, or hold" });
    }
    const normalized = result.startsWith("pass") ? "pass" : result.startsWith("fail") ? "fail" : "hold";
    const inspectedQty = req.body?.inspectedQty != null ? Number(req.body.inspectedQty) : Number(batch.quantity) || 0;
    const rejectedQty = Number(req.body?.rejectedQty) || 0;

    const qc = stripUndefined({
      result: normalized,
      inspectedQty,
      rejectedQty,
      passQty: Math.max(0, inspectedQty - rejectedQty),
      inspector: req.body?.inspector || (req as any).user.id,
      notes: req.body?.notes || "",
      inspectedAt: new Date().toISOString(),
      criteria: req.body?.criteria || null,
    });

    // Mark QC operation Done if present
    let operations = Array.isArray(batch.operations) ? [...batch.operations] : [];
    operations = operations.map((o: any) => {
      if (o.isQc || /qc|inspect|quality/i.test(String(o.name || ""))) {
        return {
          ...o,
          status: normalized === "hold" ? "Pending" : "Done",
          completedAt: normalized === "hold" ? null : new Date().toISOString(),
          completedBy: (req as any).user.id,
          qcResult: normalized,
        };
      }
      return o;
    });

    await batchRef.set(
      {
        qc,
        operations,
        requireQc: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `QC ${normalized} on batch ${req.params.id}`,
      targetType: "productionBatch",
      targetId: String(req.params.id),
    });

    res.json({ batchId: req.params.id, qc, operations });
  } catch (error) {
    console.error("QC error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post(
  "/batches/:id/operations/:seq/complete",
  requirePermission("inventory.production"),
  async (req, res) => {
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const batchRef = bizCol(businessId, "productionBatches").doc(String(req.params.id));
      const batchDoc = await batchRef.get();
      if (!batchDoc.exists) return res.status(404).json({ error: "Batch not found" });
      const batch = batchDoc.data() || {};
      if (batch.status === "Completed") {
        return res.status(400).json({ error: "Batch already completed" });
      }
      const seq = Number(req.params.seq);
      const skipSequence = req.body?.skipSequence === true;
      let operations = Array.isArray(batch.operations) ? [...batch.operations] : [];
      const idx = operations.findIndex((o: any) => Number(o.seq) === seq);
      if (idx < 0) return res.status(404).json({ error: "Operation not found on batch" });

      if (!skipSequence) {
        const prior = operations.filter((o: any) => Number(o.seq) < seq && String(o.status) !== "Done");
        if (prior.length) {
          return res.status(409).json({
            error: "Prior operations incomplete",
            pending: prior.map((o: any) => ({ seq: o.seq, name: o.name })),
          });
        }
      }

      const actualHours =
        req.body?.actualHours != null && req.body?.actualHours !== ""
          ? Number(req.body.actualHours)
          : Number(operations[idx].standardHours) || 0;
      const laborRate =
        Number(req.body?.laborRate) ||
        Number(batch.laborRate) ||
        Number(process.env.DEFAULT_LABOR_RATE) ||
        0;

      operations[idx] = {
        ...operations[idx],
        status: "Done",
        completedAt: new Date().toISOString(),
        completedBy: (req as any).user.id,
        notes: req.body?.notes || operations[idx].notes || "",
        actualHours,
        standardHours: Number(operations[idx].standardHours) || 0,
        hoursVariance: actualHours - (Number(operations[idx].standardHours) || 0),
      };

      const totalActualHours = operations.reduce(
        (s: number, o: any) => s + (Number(o.actualHours) || 0),
        0
      );
      const totalStandardHours = operations.reduce(
        (s: number, o: any) => s + (Number(o.standardHours) || 0),
        0
      );
      const suggestedLaborCost = laborRate > 0 ? totalActualHours * laborRate : null;

      // Auto-start batch
      const status = batch.status === "Planned" ? "In Progress" : batch.status;
      await batchRef.set(
        {
          operations,
          status,
          totalActualHours,
          totalStandardHours,
          ...(suggestedLaborCost != null ? { suggestedLaborCost } : {}),
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      const allDone = operations.every((o: any) => String(o.status) === "Done");
      res.json({
        batchId: req.params.id,
        operations,
        allDone,
        status,
        totalActualHours,
        totalStandardHours,
        hoursVariance: totalActualHours - totalStandardHours,
        suggestedLaborCost,
      });
    } catch (error) {
      console.error("Complete operation error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
);



/**
 * GET /api/production/cost-variance?from=&to=
 * Completed batches with standard vs actual cost variance.
 */
router.get("/cost-variance", requirePermission("inventory.production", "reports.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const from = req.query.from ? Date.parse(String(req.query.from)) : NaN;
    const to = req.query.to ? Date.parse(String(req.query.to)) : NaN;
    const snap = await bizCol(businessId, "productionBatches").get();
    const rows: any[] = [];
    let sumStd = 0, sumAct = 0, sumVar = 0;

    for (const doc of snap.docs) {
      const b = doc.data() || {};
      if (String(b.status) !== "Completed") continue;
      const completedAt = Date.parse(String(b.completedAt || b.endDate || ""));
      if (!Number.isNaN(from) && !Number.isNaN(completedAt) && completedAt < from) continue;
      if (!Number.isNaN(to) && !Number.isNaN(completedAt) && completedAt > to) continue;

      let variance = b.costVariance;
      if (!variance) {
        variance = computeCostVariance(
          {
            material: Number(b.standardMaterialCost) || Number(b.materialCost) || 0,
            labor: Number(b.standardLaborCost) || 0,
          },
          {
            material: Number(b.materialCost) || 0,
            labor: Number(b.laborCost) || 0,
          }
        );
      }
      sumStd += Number(variance.standardTotal) || 0;
      sumAct += Number(variance.actualTotal) || 0;
      sumVar += Number(variance.totalVariance) || 0;
      rows.push({
        batchId: doc.id,
        productName: b.productName,
        productId: b.productId,
        completedAt: b.completedAt || b.endDate,
        actualQty: b.actualQty ?? b.quantity,
        scrapQty: b.scrapQty || 0,
        ...variance,
      });
    }
    rows.sort((a, b) => String(b.completedAt || "").localeCompare(String(a.completedAt || "")));
    res.json({
      from: req.query.from || null,
      to: req.query.to || null,
      summary: {
        batchCount: rows.length,
        standardTotal: Math.round(sumStd * 100) / 100,
        actualTotal: Math.round(sumAct * 100) / 100,
        totalVariance: Math.round(sumVar * 100) / 100,
        favorable: sumVar <= 0,
      },
      rows,
    });
  } catch (error) {
    console.error("Cost variance error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/** Default scrap reason codes (also overridable via platform later) */
const DEFAULT_SCRAP_REASONS = [
  { code: "DEFECT", label: "Manufacturing defect" },
  { code: "MATERIAL", label: "Bad raw material" },
  { code: "SETUP", label: "Setup / trial run" },
  { code: "DAMAGE", label: "Handling damage" },
  { code: "QC_REJECT", label: "QC rejection" },
  { code: "OTHER", label: "Other" },
];

router.get("/scrap-reasons", requirePermission("inventory.production", "inventory.view"), async (_req, res) => {
  res.json({ reasons: DEFAULT_SCRAP_REASONS });
});


/**
 * GET /api/production/boms/by-product/:productId
 * All alternate BOMs for a finished product.
 */
router.get("/boms/by-product/:productId", requirePermission("inventory.production", "inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const productId = req.params.productId;
    const snap = await bizCol(businessId, "boms").where("productId", "==", productId).get().catch(async () => {
      // fallback scan if index missing
      const all = await bizCol(businessId, "boms").get();
      return { docs: all.docs.filter((d) => d.data()?.productId === productId) } as any;
    });
    const boms = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
    boms.sort((a: any, b: any) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return String(a.name || a.code || "").localeCompare(String(b.name || b.code || ""));
    });
    res.json({ productId, boms, defaultBomId: boms.find((b: any) => b.isDefault)?.id || boms[0]?.id || null });
  } catch (error) {
    console.error("BOMs by product error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * POST /api/production/boms/:id/set-default
 * Mark this BOM as the default alternate for its productId (clears others).
 */
router.post("/boms/:id/set-default", requirePermission("inventory.production"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const ref = bizCol(businessId, "boms").doc(String(req.params.id));
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "BOM not found" });
    const productId = doc.data()?.productId;
    if (!productId) return res.status(400).json({ error: "BOM has no productId" });

    const siblings = await bizCol(businessId, "boms").where("productId", "==", productId).get().catch(async () => {
      const all = await bizCol(businessId, "boms").get();
      return { docs: all.docs.filter((d) => d.data()?.productId === productId) } as any;
    });
    const batch = getDb().batch();
    siblings.docs.forEach((d: any) => {
      batch.set(d.ref, { isDefault: d.id === req.params.id, updatedAt: new Date().toISOString() }, { merge: true });
    });
    await batch.commit();
    res.json({ success: true, defaultBomId: req.params.id, productId });
  } catch (error) {
    console.error("Set default BOM error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * GET /api/production/wip
 * Shop-floor WIP dashboard: open batches, QC holds, overdue, capacity peek.
 */
router.get("/wip", requirePermission("inventory.production", "inventory.view", "reports.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const today = new Date().toISOString().slice(0, 10);

    const [batchSnap, wcSnap] = await Promise.all([
      bizCol(businessId, "productionBatches").get(),
      bizCol(businessId, "workCenters").get(),
    ]);

    const batches = batchSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const workCenters = wcSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

    const planned = batches.filter((b) => String(b.status) === "Planned");
    const inProgress = batches.filter((b) => String(b.status) === "In Progress");
    const completed = batches.filter((b) => String(b.status) === "Completed");
    const open = [...planned, ...inProgress];

    const qcHold = open.filter((b) => b.qc?.result === "hold" || (b.requireQc && !b.qc?.result));
    const qcFailed = open.filter((b) => b.qc?.result === "fail" || b.qc?.result === "failed");

    const opsPending = open.filter((b) => {
      const ops = Array.isArray(b.operations) ? b.operations : [];
      return ops.some((o: any) => String(o.status || "Pending") !== "Done");
    });

    const overdue = open.filter((b) => {
      const start = String(b.startDate || "");
      return start && start < today && String(b.status) !== "Completed";
    });

    // Near-term capacity (7 days)
    const toD = new Date(today);
    toD.setUTCDate(toD.getUTCDate() + 6);
    const to = toD.toISOString().slice(0, 10);
    const schedule = buildCapacitySchedule({
      workCenters,
      batches,
      from: today,
      to,
    });
    const capacityAlerts = schedule.centers
      .filter((c) => c.overloadedDays.length > 0 || c.peakUtilization > 0.9)
      .map((c) => ({
        workCenterId: c.workCenterId,
        workCenterName: c.workCenterName,
        peakUtilization: c.peakUtilization,
        overloadedDays: c.overloadedDays,
      }));

    // Aging open batches
    const aging = open
      .map((b) => {
        const start = Date.parse(String(b.startDate || b.createdAt || ""));
        const ageDays = Number.isNaN(start)
          ? 0
          : Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000));
        return {
          id: b.id,
          productName: b.productName,
          status: b.status,
          startDate: b.startDate,
          quantity: b.quantity,
          workCenterId: b.workCenterId || b.workCenter,
          ageDays,
          opsDone: Array.isArray(b.operations)
            ? b.operations.filter((o: any) => o.status === "Done").length
            : 0,
          opsTotal: Array.isArray(b.operations) ? b.operations.length : 0,
          requireQc: !!b.requireQc,
          qc: b.qc?.result || null,
        };
      })
      .sort((a, b) => b.ageDays - a.ageDays);

    res.json({
      asOf: new Date().toISOString(),
      summary: {
        planned: planned.length,
        inProgress: inProgress.length,
        completed: completed.length,
        open: open.length,
        qcHold: qcHold.length,
        qcFailed: qcFailed.length,
        opsPending: opsPending.length,
        overdue: overdue.length,
        workCenters: workCenters.length,
        capacityAlerts: capacityAlerts.length,
      },
      capacityAlerts,
      overdue: overdue.map((b) => ({
        id: b.id,
        productName: b.productName,
        status: b.status,
        startDate: b.startDate,
        quantity: b.quantity,
      })),
      qcHold: qcHold.map((b) => ({
        id: b.id,
        productName: b.productName,
        qc: b.qc || null,
      })),
      aging: aging.slice(0, 40),
      unassigned: schedule.unassigned.length,
      expiringSoon: open.filter((b) => {
        if (!b.expiryDate) return false;
        const d = Date.parse(String(b.expiryDate).slice(0, 10));
        if (Number.isNaN(d)) return false;
        const days = Math.floor((d - Date.now()) / (24 * 60 * 60 * 1000));
        return days <= 30;
      }).length,
    });
  } catch (error) {
    console.error("WIP dashboard error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



/**
 * POST /api/production/batches/:id/cancel
 * Cancel open batch and release material reservations.
 */
router.post("/batches/:id/cancel", requirePermission("inventory.production"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const batchRef = bizCol(businessId, "productionBatches").doc(String(req.params.id));
    const batchDoc = await batchRef.get();
    if (!batchDoc.exists) return res.status(404).json({ error: "Batch not found" });
    const batch = batchDoc.data() || {};
    if (String(batch.status) === "Completed") {
      return res.status(400).json({ error: "Cannot cancel a completed batch" });
    }
    await batchRef.set(
      {
        status: "Cancelled",
        reservations: [],
        reservedAt: null,
        cancelledAt: new Date().toISOString(),
        cancelReason: req.body?.reason || "",
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    await logAudit({
      actorId: (req as any).user.id,
      actorRole: (req as any).user.role,
      action: `Cancelled production batch ${req.params.id}`,
      targetType: "productionBatch",
      targetId: String(req.params.id),
    });
    res.json({ success: true, batchId: req.params.id, status: "Cancelled" });
  } catch (error) {
    console.error("Cancel batch error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * GET /api/production/reservations
 * Aggregated reserved qty by material across open batches.
 */
router.get("/reservations", requirePermission("inventory.production", "inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const [batchSnap, matSnap] = await Promise.all([
      bizCol(businessId, "productionBatches").get(),
      bizCol(businessId, "rawMaterials").get(),
    ]);
    const batches = batchSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const reservedMap = aggregateReservations(batches as any[]);
    const materials = matSnap.docs.map((d) => {
      const data = d.data() || {};
      const reserved = reservedMap.get(d.id) || 0;
      const onHand = Number(data.stock) || 0;
      return {
        materialId: d.id,
        name: data.name,
        onHand,
        reserved,
        available: Math.max(0, onHand - reserved),
        unit: data.unit,
      };
    }).filter((m) => m.reserved > 0);
    res.json({
      materials,
      openBatchCount: batches.filter((b: any) =>
        ["planned", "in progress", "processing"].includes(String(b.status || "").toLowerCase())
      ).length,
    });
  } catch (error) {
    console.error("Reservations error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * GET /api/production/expiring?withinDays=30
 * Production batches and FG products nearing expiry.
 */
router.get("/expiring", requirePermission("inventory.production", "inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const withinDays = Math.min(365, Math.max(1, Number(req.query.withinDays) || 30));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [batchSnap, prodSnap] = await Promise.all([
      bizCol(businessId, "productionBatches").get(),
      bizCol(businessId, "products").get(),
    ]);

    function daysUntil(iso?: string): number | null {
      if (!iso) return null;
      const d = new Date(String(iso).slice(0, 10) + "T00:00:00");
      if (Number.isNaN(d.getTime())) return null;
      return Math.floor((d.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
    }

    const batches = batchSnap.docs
      .map((d) => {
        const b = d.data() || {};
        const days = daysUntil(b.expiryDate);
        if (days == null || days > withinDays) return null;
        return {
          type: "productionBatch",
          id: d.id,
          productName: b.productName,
          productId: b.productId,
          status: b.status,
          lotNumber: b.lotNumber,
          expiryDate: b.expiryDate,
          daysUntilExpiry: days,
          quantity: b.actualQty ?? b.quantity,
          statusLabel: days < 0 ? "expired" : days <= 7 ? "critical" : "warning",
        };
      })
      .filter(Boolean);

    const products = prodSnap.docs
      .map((d) => {
        const p = d.data() || {};
        if (p.isDeleted) return null;
        const stock = Number(p.stock) || 0;
        if (stock <= 0) return null;
        const days = daysUntil(p.expiryDate);
        if (days == null || days > withinDays) return null;
        return {
          type: "product",
          id: d.id,
          productName: p.name,
          productId: d.id,
          lotNumber: p.batchNumber,
          expiryDate: p.expiryDate,
          daysUntilExpiry: days,
          quantity: stock,
          statusLabel: days < 0 ? "expired" : days <= 7 ? "critical" : "warning",
        };
      })
      .filter(Boolean);

    const items = [...batches, ...products].sort(
      (a: any, b: any) => a.daysUntilExpiry - b.daysUntilExpiry
    );

    res.json({
      withinDays,
      summary: {
        total: items.length,
        expired: items.filter((i: any) => i.statusLabel === "expired").length,
        critical: items.filter((i: any) => i.statusLabel === "critical").length,
        warning: items.filter((i: any) => i.statusLabel === "warning").length,
      },
      items,
    });
  } catch (error) {
    console.error("Expiring error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * GET /api/production/scrap-analytics?from=&to=
 * Aggregate scrap by reason, product, work center from completed batches.
 */
router.get("/scrap-analytics", requirePermission("inventory.production", "inventory.view", "reports.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const from = req.query.from ? String(req.query.from).slice(0, 10) : null;
    const to = req.query.to ? String(req.query.to).slice(0, 10) : null;

    const snap = await bizCol(businessId, "productionBatches").get();
    const byReason = new Map<string, { reason: string; scrapQty: number; batches: number; materialCost: number }>();
    const byProduct = new Map<string, { productId: string; productName: string; scrapQty: number; goodQty: number; batches: number }>();
    const byCenter = new Map<string, { workCenterId: string; scrapQty: number; batches: number }>();

    let totalScrap = 0;
    let totalGood = 0;
    let batchesWithScrap = 0;
    let completed = 0;
    const recent: any[] = [];

    for (const doc of snap.docs) {
      const b = doc.data() || {};
      if (String(b.status) !== "Completed") continue;
      completed += 1;
      const end = String(b.endDate || b.completedAt || b.updatedAt || "").slice(0, 10);
      if (from && end && end < from) continue;
      if (to && end && end > to) continue;

      const scrap = Number(b.scrapQty) || 0;
      const good = Number(b.actualQty) || Number(b.quantity) || 0;
      totalGood += good;
      if (scrap <= 0) continue;

      totalScrap += scrap;
      batchesWithScrap += 1;

      const reason = String(b.scrapReason || (Array.isArray(b.scrapReasons) && b.scrapReasons[0]) || "Unspecified");
      const r = byReason.get(reason) || { reason, scrapQty: 0, batches: 0, materialCost: 0 };
      r.scrapQty += scrap;
      r.batches += 1;
      r.materialCost += Number(b.materialCost) || 0;
      byReason.set(reason, r);

      const pid = String(b.productId || "");
      const p = byProduct.get(pid) || {
        productId: pid,
        productName: b.productName || pid,
        scrapQty: 0,
        goodQty: 0,
        batches: 0,
      };
      p.scrapQty += scrap;
      p.goodQty += good;
      p.batches += 1;
      byProduct.set(pid, p);

      const wc = String(b.workCenterId || b.workCenter || "unassigned");
      const c = byCenter.get(wc) || { workCenterId: wc, scrapQty: 0, batches: 0 };
      c.scrapQty += scrap;
      c.batches += 1;
      byCenter.set(wc, c);

      recent.push({
        id: doc.id,
        productName: b.productName,
        scrapQty: scrap,
        scrapReason: reason,
        endDate: end,
        workCenterId: wc,
      });
    }

    recent.sort((a, b) => String(b.endDate).localeCompare(String(a.endDate)));
    const scrapRate = totalGood + totalScrap > 0 ? totalScrap / (totalGood + totalScrap) : 0;

    res.json({
      from,
      to,
      summary: {
        completedBatches: completed,
        batchesWithScrap,
        totalScrap,
        totalGood,
        scrapRate,
      },
      byReason: [...byReason.values()].sort((a, b) => b.scrapQty - a.scrapQty),
      byProduct: [...byProduct.values()]
        .map((p) => ({
          ...p,
          scrapRate: p.goodQty + p.scrapQty > 0 ? p.scrapQty / (p.goodQty + p.scrapQty) : 0,
        }))
        .sort((a, b) => b.scrapQty - a.scrapQty),
      byWorkCenter: [...byCenter.values()].sort((a, b) => b.scrapQty - a.scrapQty),
      recent: recent.slice(0, 30),
    });
  } catch (error) {
    console.error("Scrap analytics error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * GET /api/production/labor-efficiency?from=&to=
 * Standard vs actual hours from completed ops / batches.
 */
router.get("/labor-efficiency", requirePermission("inventory.production", "reports.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const from = req.query.from ? String(req.query.from).slice(0, 10) : null;
    const to = req.query.to ? String(req.query.to).slice(0, 10) : null;

    const snap = await bizCol(businessId, "productionBatches").get();
    let totalStd = 0;
    let totalAct = 0;
    let opsDone = 0;
    const byWorkCenter = new Map<string, { workCenterId: string; standardHours: number; actualHours: number; ops: number }>();
    const byProduct = new Map<string, { productId: string; productName: string; standardHours: number; actualHours: number; batches: number }>();
    const slowOps: any[] = [];

    for (const doc of snap.docs) {
      const b = doc.data() || {};
      const end = String(b.endDate || b.completedAt || b.updatedAt || "").slice(0, 10);
      if (from && end && end < from) continue;
      if (to && end && end > to) continue;

      const ops = Array.isArray(b.operations) ? b.operations : [];
      let batchStd = 0;
      let batchAct = 0;
      let hasHours = false;

      for (const o of ops) {
        if (String(o.status) !== "Done") continue;
        const std = Number(o.standardHours) || 0;
        const act = o.actualHours != null ? Number(o.actualHours) : std;
        if (o.actualHours == null && !std) continue;
        hasHours = true;
        opsDone += 1;
        totalStd += std;
        totalAct += act;
        batchStd += std;
        batchAct += act;

        const wc = String(o.workCenterId || b.workCenterId || "unassigned");
        const c = byWorkCenter.get(wc) || { workCenterId: wc, standardHours: 0, actualHours: 0, ops: 0 };
        c.standardHours += std;
        c.actualHours += act;
        c.ops += 1;
        byWorkCenter.set(wc, c);

        const variance = act - std;
        if (std > 0 && variance / std >= 0.2) {
          slowOps.push({
            batchId: doc.id,
            productName: b.productName,
            seq: o.seq,
            name: o.name,
            standardHours: std,
            actualHours: act,
            variance,
            pctOver: variance / std,
            endDate: end,
          });
        }
      }

      if (hasHours) {
        const pid = String(b.productId || "");
        const p = byProduct.get(pid) || {
          productId: pid,
          productName: b.productName || pid,
          standardHours: 0,
          actualHours: 0,
          batches: 0,
        };
        p.standardHours += batchStd || Number(b.totalStandardHours) || 0;
        p.actualHours += batchAct || Number(b.totalActualHours) || 0;
        p.batches += 1;
        byProduct.set(pid, p);
      }
    }

    slowOps.sort((a, b) => b.pctOver - a.pctOver);
    const efficiency = totalAct > 0 ? totalStd / totalAct : totalStd > 0 ? 1 : null;

    res.json({
      from,
      to,
      summary: {
        totalStandardHours: Math.round(totalStd * 1000) / 1000,
        totalActualHours: Math.round(totalAct * 1000) / 1000,
        hoursVariance: Math.round((totalAct - totalStd) * 1000) / 1000,
        efficiency,
        opsDone,
      },
      byWorkCenter: [...byWorkCenter.values()]
        .map((c) => ({
          ...c,
          efficiency: c.actualHours > 0 ? c.standardHours / c.actualHours : null,
        }))
        .sort((a, b) => b.actualHours - a.actualHours),
      byProduct: [...byProduct.values()]
        .map((p) => ({
          ...p,
          efficiency: p.actualHours > 0 ? p.standardHours / p.actualHours : null,
        }))
        .sort((a, b) => b.actualHours - a.actualHours),
      slowOperations: slowOps.slice(0, 25),
    });
  } catch (error) {
    console.error("Labor efficiency error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * GET /api/production/route-compare?productId=
 * Compare alternate routes for a product (steps, hours, QC).
 */
router.get("/route-compare", requirePermission("inventory.production", "inventory.view", "reports.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const productId = String(req.query.productId || "").trim();
    if (!productId) return res.status(400).json({ error: "productId required" });

    const snap = await bizCol(businessId, "productionRoutes")
      .where("productId", "==", productId)
      .get()
      .catch(async () => {
        // fallback: all routes filter client-side if composite index missing
        return bizCol(businessId, "productionRoutes").get();
      });

    let docs: any[] = snap.docs;
    if (docs.length && docs.some((d) => d.data()?.productId && d.data()?.productId !== productId)) {
      docs = docs.filter((d) => String(d.data()?.productId) === productId || d.id === productId);
    }
    // also include legacy doc id = productId
    if (!docs.find((d) => d.id === productId)) {
      const leg = await bizCol(businessId, "productionRoutes").doc(productId).get();
      if (leg.exists) docs = [...docs, leg];
    }

    const routes = docs.map((d) => {
      const data = d.data() || {};
      const steps = Array.isArray(data.steps) ? data.steps : Array.isArray(data.operations) ? data.operations : [];
      const totalStandardHours = steps.reduce((s: number, o: any) => s + (Number(o.standardHours) || 0), 0);
      const qcSteps = steps.filter((o: any) => o.isQc === true || /qc|inspect|quality/i.test(String(o.name || ""))).length;
      return {
        id: d.id,
        name: data.name || data.code || (d.id === productId ? "Primary" : d.id),
        code: data.code || null,
        isDefault: !!data.isDefault || d.id === productId,
        stepCount: steps.length,
        totalStandardHours: Math.round(totalStandardHours * 1000) / 1000,
        qcSteps,
        requireQc: !!data.requireQc || qcSteps > 0,
        steps: steps.map((o: any, i: number) => ({
          seq: o.seq != null ? Number(o.seq) : i + 1,
          name: o.name || `Step ${i + 1}`,
          workCenterId: o.workCenterId || o.workCenter || null,
          standardHours: Number(o.standardHours) || 0,
          isQc: o.isQc === true || /qc|inspect|quality/i.test(String(o.name || "")),
        })),
      };
    });

    routes.sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0) || a.name.localeCompare(b.name));

    const defaultRoute = routes.find((r) => r.isDefault) || routes[0] || null;
    const comparison = routes.map((r) => ({
      ...r,
      hoursDeltaVsDefault:
        defaultRoute && r.id !== defaultRoute.id
          ? Math.round((r.totalStandardHours - defaultRoute.totalStandardHours) * 1000) / 1000
          : 0,
      stepsDeltaVsDefault:
        defaultRoute && r.id !== defaultRoute.id ? r.stepCount - defaultRoute.stepCount : 0,
    }));

    res.json({
      productId,
      productName: docs[0]?.data()?.productName || null,
      routeCount: routes.length,
      defaultRouteId: defaultRoute?.id || null,
      routes: comparison,
    });
  } catch (error) {
    console.error("Route compare error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


/**
 * GET /api/production/shop-floor
 * Per work-center: open batches, next pending op, today load vs capacity.
 */
router.get("/shop-floor", requirePermission("inventory.production", "inventory.view", "reports.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const today = new Date().toISOString().slice(0, 10);

    const [batchSnap, wcSnap] = await Promise.all([
      bizCol(businessId, "productionBatches").get(),
      bizCol(businessId, "workCenters").get(),
    ]);

    const batches = batchSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const workCenters = wcSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
    const open = batches.filter((b) => ["Planned", "In Progress"].includes(String(b.status)));

    const schedule = buildCapacitySchedule({
      workCenters,
      batches: open,
      from: today,
      to: today,
    });
    const loadByCenter = new Map(
      schedule.centers.map((c) => [c.workCenterId, c.days[0] || null])
    );

    type Job = {
      batchId: string;
      productName: string;
      status: string;
      quantity: number;
      startDate?: string;
      nextOp: { seq: number; name: string; standardHours: number; status: string } | null;
      opsDone: number;
      opsTotal: number;
      qcHold: boolean;
      ageDays: number;
    };

    const board = new Map<string, { workCenterId: string; workCenterName: string; capacityPerDay: number; todayLoad: number; utilization: number; jobs: Job[] }>();

    // seed centers
    for (const wc of workCenters) {
      const day = loadByCenter.get(wc.id);
      board.set(wc.id, {
        workCenterId: wc.id,
        workCenterName: wc.name || wc.id,
        capacityPerDay: Number(wc.capacityPerDay) || 8,
        todayLoad: day?.load || 0,
        utilization: day?.utilization || 0,
        jobs: [],
      });
    }
    // unassigned bucket
    board.set("unassigned", {
      workCenterId: "unassigned",
      workCenterName: "Unassigned",
      capacityPerDay: 0,
      todayLoad: 0,
      utilization: 0,
      jobs: [],
    });

    for (const b of open) {
      const ops = Array.isArray(b.operations) ? b.operations : [];
      const pending = ops
        .filter((o: any) => String(o.status || "Pending") !== "Done")
        .sort((a: any, b: any) => Number(a.seq) - Number(b.seq));
      const next = pending[0] || null;

      // Prefer next op's work center, else batch work center
      const wcId = String(
        (next && (next.workCenterId || next.workCenter)) ||
          b.workCenterId ||
          b.workCenter ||
          "unassigned"
      );

      if (!board.has(wcId)) {
        board.set(wcId, {
          workCenterId: wcId,
          workCenterName: wcId,
          capacityPerDay: 8,
          todayLoad: 0,
          utilization: 0,
          jobs: [],
        });
      }

      const start = Date.parse(String(b.startDate || b.createdAt || ""));
      const ageDays = Number.isNaN(start)
        ? 0
        : Math.floor((Date.now() - start) / (24 * 60 * 60 * 1000));

      board.get(wcId)!.jobs.push({
        batchId: b.id,
        productName: b.productName || b.productId,
        status: String(b.status),
        quantity: Number(b.quantity) || 0,
        startDate: b.startDate,
        nextOp: next
          ? {
              seq: Number(next.seq) || 0,
              name: next.name || `Step ${next.seq}`,
              standardHours: Number(next.standardHours) || 0,
              status: String(next.status || "Pending"),
            }
          : null,
        opsDone: ops.filter((o: any) => o.status === "Done").length,
        opsTotal: ops.length,
        qcHold: b.qc?.result === "hold" || (!!b.requireQc && !b.qc?.result && String(b.status) === "In Progress"),
        ageDays,
      });
    }

    const centers = [...board.values()]
      .filter((c) => c.workCenterId !== "unassigned" || c.jobs.length > 0)
      .map((c) => ({
        ...c,
        jobs: c.jobs.sort((a, b) => b.ageDays - a.ageDays || a.productName.localeCompare(b.productName)),
        openJobs: c.jobs.length,
      }))
      .sort((a, b) => b.openJobs - a.openJobs || a.workCenterName.localeCompare(b.workCenterName));

    res.json({
      asOf: today,
      openBatches: open.length,
      centers,
    });
  } catch (error) {
    console.error("Shop floor error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;









