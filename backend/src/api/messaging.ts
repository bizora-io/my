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

// POST /api/messaging/invoice-sms
router.post("/invoice-sms", requirePermission("pos.sell", "crm.communication"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    const { customerMobile, customerName, invoiceNumber, totalAmount, paidAmount, dueAmount, invoiceUrl } = req.body || {};

    if (!customerMobile) {
      return res.status(400).json({ error: "customerMobile is required" });
    }

    const db = getDb();
    const bDoc = await db.collection("businesses").doc(businessId).get();
    const bData = bDoc.data() || {};
    const businessName = bData.businessName || bData.name || "Bizora Store";

    const cleanMobile = String(customerMobile).replace(/[^0-9+]/g, "");
    const dueMsg = dueAmount && Number(dueAmount) > 0 ? ` Due: Tk ${dueAmount}.` : " Fully Paid. Thank you!";
    const linkMsg = invoiceUrl ? ` View invoice: ${invoiceUrl}` : "";
    const smsText = `Dear ${customerName || "Customer"}, your purchase from ${businessName} (Inv #${invoiceNumber || "N/A"}) of Tk ${totalAmount || 0} is confirmed.${dueMsg}${linkMsg}`;

    // Record in tenant marketing / communication history
    const logRef = db.collection("businesses").doc(businessId).collection("marketingCampaigns").doc();
    const logPayload = stripUndefined({
      type: "SMS",
      subType: "Invoice Notification",
      recipientMobile: cleanMobile,
      recipientName: customerName || "Customer",
      message: smsText,
      invoiceNumber: invoiceNumber || "",
      status: "SENT",
      sentAt: new Date().toISOString(),
      business_id: businessId,
    });
    await logRef.set(logPayload);

    res.json({
      success: true,
      recipient: cleanMobile,
      messageLength: smsText.length,
      smsText,
      logId: logRef.id,
    });
  } catch (error) {
    console.error("Send invoice SMS error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;

