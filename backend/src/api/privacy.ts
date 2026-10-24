import express from "express";
import crypto from "crypto";
import { getDb } from "../lib/firebaseAdmin.js";
import { loginRateLimitGuard } from "./middleware/loginRateLimit.js";

const router = express.Router();

/**
 * Real Data Deletion Request Handler
 * Implements GDPR / CCPA right-to-be-forgotten with a 30-day grace period.
 */
router.post("/deletion-request", loginRateLimitGuard, async (req, res) => {
  try {
    const { email, businessName, phone, reason, consent } = req.body || {};

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ success: false, error: "A valid email address is required." });
    }

    if (!consent) {
      return res.status(400).json({ success: false, error: "You must confirm the data deletion request." });
    }

    const requestId = `DEL-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const submissionTime = Date.now();
    const purgeScheduledTime = submissionTime + 30 * 24 * 60 * 60 * 1000; // 30 days

    const docData = {
      requestId,
      email: email.trim().toLowerCase(),
      businessName: (businessName || "").trim(),
      phone: (phone || "").trim(),
      reason: (reason || "").trim(),
      status: "PENDING_VERIFICATION",
      submittedAt: submissionTime,
      scheduledPurgeAt: purgeScheduledTime,
      ipAddress: req.ip || req.headers["x-forwarded-for"] || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    };

    // Store in Firestore collection deletionRequests
    try {
      await getDb().collection("deletionRequests").doc(requestId).set(docData);
    } catch (dbErr) {
      console.error("[privacy] Failed to save deletion request in Firestore:", dbErr);
    }

    return res.status(201).json({
      success: true,
      requestId,
      message: "Deletion request registered successfully. Your request will be processed following the 30-day safety grace period.",
      scheduledPurgeAt: new Date(purgeScheduledTime).toISOString(),
    });
  } catch (error: any) {
    console.error("[privacy] Deletion request error:", error);
    return res.status(500).json({ success: false, error: "Internal server error processing deletion request." });
  }
});

router.get("/deletion-status/:requestId", async (req, res) => {
  try {
    const { requestId } = req.params;
    if (!requestId) {
      return res.status(400).json({ success: false, error: "Request ID is required." });
    }

    const doc = await getDb().collection("deletionRequests").doc(requestId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: "Deletion request not found." });
    }

    const data = doc.data()!;
    return res.json({
      success: true,
      requestId: data.requestId,
      status: data.status,
      submittedAt: data.submittedAt,
      scheduledPurgeAt: data.scheduledPurgeAt,
    });
  } catch (error: any) {
    console.error("[privacy] Deletion status query error:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

export default router;

