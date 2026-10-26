import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import {
  authenticateToken,
  getActingBusinessId,
  requireBusinessContext,
  requirePermission,
} from "./middleware/auth.js";

const router = express.Router();

const DEFAULT_UNITS = [
  "pcs",
  "kg",
  "g",
  "ltr",
  "ml",
  "box",
  "pkt",
  "dz",
  "m",
  "ft",
  "set",
  "pair",
];

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

router.use(authenticateToken, requireBusinessContext);

// --- Categories ---
router.get("/categories", requirePermission("inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const db = getDb();

    // Query products to compute usage counts
    const productsSnap = await db
      .collection("businesses")
      .doc(businessId)
      .collection("products")
      .get();
    const productCounts: Record<string, number> = {};
    productsSnap.docs.forEach((doc) => {
      const p = doc.data();
      const cat = p.category || p.categoryId;
      if (cat) {
        productCounts[cat] = (productCounts[cat] || 0) + 1;
      }
    });

    const catSnap = await db
      .collection("businesses")
      .doc(businessId)
      .collection("catalogCategories")
      .get();

    let categories: any[] = catSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name,
        description: d.description || "",
        parentId: d.parentId || null,
        subCategories: d.subCategories || [],
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        _count: { products: productCounts[d.name] || productCounts[doc.id] || 0 },
      };
    });

    // Fallback: If catalogCategories is empty, check businesses doc settings.categories
    if (categories.length === 0) {
      const bDoc = await db.collection("businesses").doc(businessId).get();
      const bData = bDoc.data() || {};
      const fallbackCats = Array.isArray(bData.categories) ? bData.categories : [];
      categories = fallbackCats.map((c: any, idx: number) => ({
        id: c.id || `cat-${idx}`,
        name: typeof c === "string" ? c : c.name,
        description: c.description || "",
        parentId: c.parentId || null,
        subCategories: c.subCategories || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { products: productCounts[typeof c === "string" ? c : c.name] || 0 },
      }));
    }

    res.json(categories);
  } catch (error) {
    console.error("List categories error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/categories", requirePermission("inventory.add", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { name, description, parentId, subCategories } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Category name is required" });
    }

    const db = getDb();
    const catCol = db.collection("businesses").doc(businessId).collection("catalogCategories");
    const docRef = catCol.doc();

    const payload = stripUndefined({
      name: name.trim(),
      description: description?.trim() || "",
      parentId: parentId || null,
      subCategories: Array.isArray(subCategories) ? subCategories : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);

    // Keep businesses.categories array in sync
    const bRef = db.collection("businesses").doc(businessId);
    const bDoc = await bRef.get();
    const bCats = bDoc.data()?.categories || [];
    if (!bCats.some((c: any) => (typeof c === "string" ? c : c.name).toLowerCase() === payload.name.toLowerCase())) {
      await bRef.set(
        { categories: [...bCats, { id: docRef.id, name: payload.name, subCategories: payload.subCategories }] },
        { merge: true }
      );
    }

    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/categories/:id", requirePermission("inventory.edit", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const catId = String(req.params.id);
    const docRef = getDb().collection("businesses").doc(businessId).collection("catalogCategories").doc(catId);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Category not found" });
    }

    const { name, description, parentId, subCategories } = req.body || {};
    const update: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) update.name = String(name).trim();
    if (description !== undefined) update.description = String(description).trim();
    if (parentId !== undefined) update.parentId = parentId;
    if (subCategories !== undefined) update.subCategories = subCategories;

    await docRef.set(stripUndefined(update), { merge: true });
    res.json({ id: catId, ...existing.data(), ...update });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/categories/:id", requirePermission("inventory.delete", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const catId = String(req.params.id);
    const db = getDb();
    const docRef = db.collection("businesses").doc(businessId).collection("catalogCategories").doc(catId);
    const existing = await docRef.get();
    const catName = existing.data()?.name;

    // Check if any product uses this category
    if (catName && req.query.force !== "true") {
      const clashSnap = await db
        .collection("businesses")
        .doc(businessId)
        .collection("products")
        .where("category", "==", catName)
        .limit(1)
        .get();
      if (!clashSnap.empty) {
        return res.status(409).json({ error: `Category '${catName}' is currently in use by products.` });
      }
    }

    await docRef.delete();

    // Also update businesses.categories array
    const bRef = db.collection("businesses").doc(businessId);
    const bDoc = await bRef.get();
    const bCats = bDoc.data()?.categories || [];
    const nextCats = bCats.filter((c: any) => {
      const cId = c.id || "";
      const cN = typeof c === "string" ? c : c.name;
      return cId !== catId && cN !== catName;
    });
    await bRef.set({ categories: nextCats }, { merge: true });

    res.json({ ok: true, deletedId: catId });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Brands ---
router.get("/brands", requirePermission("inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const db = getDb();

    const productsSnap = await db
      .collection("businesses")
      .doc(businessId)
      .collection("products")
      .get();
    const brandCounts: Record<string, number> = {};
    productsSnap.docs.forEach((doc) => {
      const p = doc.data();
      const b = p.brand;
      if (b) {
        brandCounts[b] = (brandCounts[b] || 0) + 1;
      }
    });

    const brandSnap = await db
      .collection("businesses")
      .doc(businessId)
      .collection("catalogBrands")
      .get();

    let brands: any[] = brandSnap.docs.map((doc) => {
      const d = doc.data();
      return {
        id: doc.id,
        name: d.name,
        description: d.description || "",
        logo: d.logo || "",
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
        _count: { products: brandCounts[d.name] || brandCounts[doc.id] || 0 },
      };
    });

    if (brands.length === 0) {
      const bDoc = await db.collection("businesses").doc(businessId).get();
      const bData = bDoc.data() || {};
      const fallbackBrands = Array.isArray(bData.brands) ? bData.brands : [];
      brands = fallbackBrands.map((b: any, idx: number) => ({
        id: b.id || `brand-${idx}`,
        name: typeof b === "string" ? b : b.name,
        description: b.description || "",
        logo: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: { products: brandCounts[typeof b === "string" ? b : b.name] || 0 },
      }));
    }

    res.json(brands);
  } catch (error) {
    console.error("List brands error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/brands", requirePermission("inventory.add", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { name, description, logo } = req.body || {};
    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ error: "Brand name is required" });
    }

    const db = getDb();
    const docRef = db.collection("businesses").doc(businessId).collection("catalogBrands").doc();
    const payload = stripUndefined({
      name: name.trim(),
      description: description?.trim() || "",
      logo: logo?.trim() || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      business_id: businessId,
    });

    await docRef.set(payload);

    const bRef = db.collection("businesses").doc(businessId);
    const bDoc = await bRef.get();
    const bBrands = bDoc.data()?.brands || [];
    if (!bBrands.some((b: any) => (typeof b === "string" ? b : b.name).toLowerCase() === payload.name.toLowerCase())) {
      await bRef.set(
        { brands: [...bBrands, { id: docRef.id, name: payload.name }] },
        { merge: true }
      );
    }

    res.status(201).json({ id: docRef.id, ...payload });
  } catch (error) {
    console.error("Create brand error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.patch("/brands/:id", requirePermission("inventory.edit", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const brandId = String(req.params.id);
    const docRef = getDb().collection("businesses").doc(businessId).collection("catalogBrands").doc(brandId);
    const existing = await docRef.get();
    if (!existing.exists) {
      return res.status(404).json({ error: "Brand not found" });
    }

    const { name, description, logo } = req.body || {};
    const update: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (name !== undefined) update.name = String(name).trim();
    if (description !== undefined) update.description = String(description).trim();
    if (logo !== undefined) update.logo = String(logo).trim();

    await docRef.set(stripUndefined(update), { merge: true });
    res.json({ id: brandId, ...existing.data(), ...update });
  } catch (error) {
    console.error("Update brand error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.delete("/brands/:id", requirePermission("inventory.delete", "admin.settings"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const brandId = String(req.params.id);
    const db = getDb();
    const docRef = db.collection("businesses").doc(businessId).collection("catalogBrands").doc(brandId);
    const existing = await docRef.get();
    const brandName = existing.data()?.name;

    if (brandName && req.query.force !== "true") {
      const clashSnap = await db
        .collection("businesses")
        .doc(businessId)
        .collection("products")
        .where("brand", "==", brandName)
        .limit(1)
        .get();
      if (!clashSnap.empty) {
        return res.status(409).json({ error: `Brand '${brandName}' is currently in use by products.` });
      }
    }

    await docRef.delete();

    const bRef = db.collection("businesses").doc(businessId);
    const bDoc = await bRef.get();
    const bBrands = bDoc.data()?.brands || [];
    const nextBrands = bBrands.filter((b: any) => {
      const bId = b.id || "";
      const bN = typeof b === "string" ? b : b.name;
      return bId !== brandId && bN !== brandName;
    });
    await bRef.set({ brands: nextBrands }, { merge: true });

    res.json({ ok: true, deletedId: brandId });
  } catch (error) {
    console.error("Delete brand error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// --- Units ---
router.get("/units", requirePermission("inventory.view"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const db = getDb();

    const [productsSnap, bDoc] = await Promise.all([
      db.collection("businesses").doc(businessId).collection("products").get(),
      db.collection("businesses").doc(businessId).get(),
    ]);

    const unitSet = new Set<string>(DEFAULT_UNITS);

    const bUnits = bDoc.data()?.units || [];
    bUnits.forEach((u: any) => {
      const name = typeof u === "string" ? u : u.name;
      if (name) unitSet.add(name.toLowerCase());
    });

    productsSnap.docs.forEach((doc) => {
      const u = doc.data().unit;
      if (u && typeof u === "string") unitSet.add(u.toLowerCase());
    });

    const sorted = Array.from(unitSet).sort();
    res.json(sorted);
  } catch (error) {
    console.error("List units error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
