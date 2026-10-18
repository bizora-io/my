import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";

const router = express.Router();

/**
 * Legacy /api/users — canonical store is `businesses`.
 * Kept for old clients; always reads/writes businesses collection.
 */
router.get("/", authenticateToken, requireRole("SAAS_OWNER", "SAAS_ADMIN"), async (_req, res) => {
  try {
    const snapshot = await getDb().collection("businesses").get();
    const users = snapshot.docs.map((doc) => {
      const data = doc.data() || {};
      const { passwordHash, ...rest } = data as any;
      return { id: doc.id, ...rest };
    });
    res.json({ users, source: "businesses" });
  } catch (error) {
    console.error("Error fetching users/businesses:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

router.post("/", authenticateToken, requireRole("SAAS_OWNER"), async (req, res) => {
  try {
    // Prefer explicit admin business create via /api/admin/businesses
    res.status(410).json({
      error: "Deprecated. Create shops via signup or PATCH /api/admin/businesses.",
      code: "use_businesses_collection",
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
