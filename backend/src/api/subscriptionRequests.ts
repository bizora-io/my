import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, getActingBusinessId } from "./middleware/auth.js";

const router = express.Router();

router.use(authenticateToken);

// POST /api/subscription-requests - business owner requests a plan/template upgrade
router.post("/", async (req, res) => {
  try {
    const businessId = getActingBusinessId(req as any);
    if (!businessId) {
      res.status(403).json({ error: "No business context for this account." });
      return;
    }
    const { type, details, amount } = req.body || {};
    if (!type || !details) {
      res.status(400).json({ error: "type and details are required." });
      return;
    }

    const bizDoc = await getDb().collection("businesses").doc(businessId).get();
    const biz = bizDoc.data() || {};

    const payload = {
      businessId,
      businessName: biz.businessName || biz.name || "Unknown",
      userName: (req as any).user.name || biz.businessName || "Unknown",
      type,
      details,
      amount: amount ?? 0,
      status: "pending",
      date: new Date().toISOString().split("T")[0],
      createdAt: new Date().toISOString(),
    };

    const docRef = await getDb().collection("subscriptionRequests").add(payload);
    res.status(201).json({ request: { id: docRef.id, ...payload } });
  } catch (error) {
    console.error("Create subscription request error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/subscription-requests/mine - business owner sees own requests
router.get("/mine", async (req, res) => {
  try {
    const businessId = getActingBusinessId(req as any);
    if (!businessId) {
      res.status(403).json({ error: "No business context for this account." });
      return;
    }
    const snapshot = await getDb()
      .collection("subscriptionRequests")
      .where("businessId", "==", businessId)
      .get();
    const requests = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.json({ requests });
  } catch (error) {
    console.error("List own subscription requests error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;