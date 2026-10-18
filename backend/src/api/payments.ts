import express from "express";
import { getDb } from "../lib/firebaseAdmin.js";
import { authenticateToken, requirePermission, getActingBusinessId, requireBusinessContext } from "./middleware/auth.js";
import {
  createProviderPayment,
  resolveProvider,
  verifyStripeWebhookSignature,
  type PaymentProviderId,
} from "../lib/paymentProviders.js";
import { stampPaymentFailure, stampPaymentSuccess, resolveBusinessIdFromStripeObject } from "../lib/billingSignals.js";

const router = express.Router();

function intentsCol(businessId: string) {
  return getDb().collection("businesses").doc(businessId).collection("paymentIntents");
}

function platformIntentsCol() {
  return getDb().collection("platformPaymentIntents");
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// POST /api/payments/intents — create a payment intent for the logged-in business
router.post("/intents", authenticateToken, requireBusinessContext, requirePermission("finance.cashbox", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const {
      amount,
      currency = "BDT",
      description,
      provider: requestedProvider,
      purpose = "general",
      metadata = {},
      successUrl,
      cancelUrl,
    } = req.body || {};

    const amt = Number(amount);
    if (!amt || amt <= 0) return res.status(400).json({ error: "amount must be a positive number" });

    const provider = resolveProvider(requestedProvider);
    const invoiceNumber = `PI-${Date.now().toString(36).toUpperCase()}`;

    const providerResult = await createProviderPayment(provider, {
      amount: amt,
      currency,
      description: description || `Bizora ${purpose}`,
      successUrl,
      cancelUrl,
      metadata: { ...metadata, businessId, purpose, invoiceNumber },
    });

    if (!providerResult.ok) {
      return res.status(502).json({ error: providerResult.error || "Provider failed", provider });
    }

    const id = `pi_${Date.now()}`;
    const intent = stripUndefined({
      id,
      businessId,
      amount: amt,
      currency,
      description: description || "",
      purpose,
      provider,
      status: provider === "sandbox" ? "requires_confirmation" : providerResult.checkoutUrl ? "requires_action" : "pending",
      externalId: providerResult.externalId || null,
      checkoutUrl: providerResult.checkoutUrl || null,
      invoiceNumber,
      metadata: metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await intentsCol(businessId).doc(id).set(intent);
    if (providerResult.externalId && provider !== "sandbox") {
      await getDb().collection("paymentExternalIndex").doc(`${provider}_${providerResult.externalId}`).set({
        businessId,
        intentId: id,
        provider,
        createdAt: new Date().toISOString(),
      });
    }
    res.status(201).json({ intent });
  } catch (error) {
    console.error("Create payment intent error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// POST /api/payments/intents/:id/confirm — sandbox (and manual) confirmation
router.post("/intents/:id/confirm", authenticateToken, requireBusinessContext, requirePermission("finance.cashbox", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const ref = intentsCol(businessId).doc(String(req.params.id));
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Payment intent not found" });
    const data = doc.data()!;
    if (data.status === "succeeded") return res.json({ intent: { id: doc.id, ...data } });
    if (data.provider !== "sandbox" && data.provider !== "manual") {
      return res.status(400).json({
        error: "Only sandbox intents can be confirmed in-app. Complete checkout at the provider URL, or wait for webhook.",
        checkoutUrl: data.checkoutUrl,
      });
    }

    const updated = {
      status: "succeeded",
      paidAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedBy: (req as any).user.id,
    };
    await ref.set(updated, { merge: true });
    res.json({ intent: { id: doc.id, ...data, ...updated } });
  } catch (error) {
    console.error("Confirm payment intent error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/payments/intents/:id — status poll after provider redirect
router.get("/intents/:id", authenticateToken, requireBusinessContext, requirePermission("finance.cashbox", "finance.accounts", "pos.sell"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const ref = intentsCol(businessId).doc(String(req.params.id));
    const doc = await ref.get();
    if (!doc.exists) return res.status(404).json({ error: "Payment intent not found" });
    res.json({ intent: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error("Get payment intent error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/payments/intents
router.get("/intents", authenticateToken, requireBusinessContext, requirePermission("finance.cashbox", "finance.accounts"), async (req, res) => {
  try {
    const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
    const snap = await intentsCol(businessId).orderBy("createdAt", "desc").limit(50).get();
    const intents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    res.json({ intents });
  } catch (error) {
    console.error("List payment intents error:", error);
    // Fallback without orderBy if index missing
    try {
      const businessId = (req as any).businessId || getActingBusinessId(req as any);
    if (!businessId) return res.status(403).json({ error: "No business context.", code: "missing_business_context" });
      const snap = await intentsCol(businessId).limit(50).get();
      const intents = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      intents.sort((a: any, b: any) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      return res.json({ intents });
    } catch (e2) {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});

// GET /api/payments/providers — which providers are configured on this server
router.get("/providers", authenticateToken, async (_req, res) => {
  const providers = [
    { id: "sandbox", configured: true, label: "Sandbox (test)" },
    {
      id: "stripe",
      configured: !!process.env.STRIPE_SECRET_KEY,
      label: "Stripe",
    },
    {
      id: "bkash",
      configured: !!(process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET),
      label: "bKash tokenized",
    },
  ];
  res.json({
    providers,
    default: resolveProvider(),
  });
});

// POST /api/payments/webhook/stripe — provider callback (no auth; verify signature when secret set)
router.post("/webhook/stripe", async (req, res) => {
  try {
    const sig = req.headers["stripe-signature"] as string | undefined;
    // Prefer raw Buffer from express.raw middleware; fall back to re-serialized JSON (dev only)
    const rawBuf: Buffer | string =
      Buffer.isBuffer((req as any).body) ? (req as any).body
      : typeof (req as any).rawBody === "string" ? (req as any).rawBody
      : typeof req.body === "string" ? req.body
      : JSON.stringify(req.body);
    if (!verifyStripeWebhookSignature(rawBuf, sig)) {
      return res.status(400).json({ error: "Invalid Stripe signature" });
    }
    const event =
      Buffer.isBuffer(rawBuf) ? JSON.parse(rawBuf.toString("utf8"))
      : typeof rawBuf === "string" ? JSON.parse(rawBuf)
      : req.body;
    const type = event?.type;
    const obj = event?.data?.object;
    const failureTypes = new Set([
      "payment_intent.payment_failed",
      "invoice.payment_failed",
      "charge.failed",
      "invoice.payment_action_required",
    ]);
    const successTypes = new Set([
      "checkout.session.completed",
      "payment_intent.succeeded",
      "invoice.paid",
      "charge.succeeded",
    ]);

    if (type === "checkout.session.completed" || type === "payment_intent.succeeded" || type === "invoice.paid") {
      const externalId = obj?.id;
      if (externalId) {
        const idx = await getDb().collection("paymentExternalIndex").doc(`stripe_${externalId}`).get();
        if (idx.exists) {
          const { businessId, intentId } = idx.data()!;
          if (intentId) {
            await intentsCol(businessId).doc(intentId).set(
              { status: "succeeded", paidAt: new Date().toISOString(), updatedAt: new Date().toISOString(), webhookEvent: type },
              { merge: true }
            );
          }
          await stampPaymentSuccess(businessId, { source: `stripe:${type}`, externalId });
        } else {
          const businessId = await resolveBusinessIdFromStripeObject(obj);
          if (businessId) await stampPaymentSuccess(businessId, { source: `stripe:${type}`, externalId });
        }
      }
    }

    if (failureTypes.has(type)) {
      const businessId = await resolveBusinessIdFromStripeObject(obj);
      const reason =
        obj?.last_payment_error?.message ||
        obj?.failure_message ||
        obj?.outcome?.seller_message ||
        type;
      const amount = obj?.amount != null ? Number(obj.amount) / 100 : obj?.amount_due != null ? Number(obj.amount_due) / 100 : undefined;
      if (businessId) {
        // Mark linked intent failed if indexed
        for (const key of [obj?.id, obj?.payment_intent].filter(Boolean)) {
          const idx = await getDb().collection("paymentExternalIndex").doc(`stripe_${key}`).get();
          if (idx.exists) {
            const { businessId: bid, intentId } = idx.data()!;
            if (intentId && bid) {
              await intentsCol(bid).doc(intentId).set(
                { status: "failed", failedAt: new Date().toISOString(), failureReason: reason, webhookEvent: type, updatedAt: new Date().toISOString() },
                { merge: true }
              );
            }
            break;
          }
        }
        await stampPaymentFailure(businessId, {
          amount,
          reason: String(reason),
          source: `stripe:${type}`,
          paymentId: obj?.id,
        });
        // Optional: mirror into revenuePayments as Failed for SaaS ledger visibility
        try {
          await getDb().collection("revenuePayments").add({
            businessId,
            businessName: businessId,
            amount: amount || 0,
            method: "Stripe",
            status: "Failed",
            note: String(reason),
            source: `stripe:${type}`,
            externalId: obj?.id || null,
            createdAt: new Date().toISOString(),
          });
        } catch (e) {
          console.warn("revenuePayments mirror failed", e);
        }
      } else {
        console.warn("Stripe failure event without resolvable businessId", type, obj?.id);
      }
    }

    res.json({ received: true, type });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

// POST /api/payments/webhook/bkash
router.post("/webhook/bkash", async (req, res) => {
  try {
    const paymentID = req.body?.paymentID || req.query?.paymentID;
    if (paymentID) {
      const idx = await getDb().collection("paymentExternalIndex").doc(`bkash_${paymentID}`).get();
      if (idx.exists) {
        const { businessId, intentId } = idx.data()!;
        await intentsCol(businessId).doc(intentId).set(
          {
            status: req.body?.transactionStatus === "Completed" || req.body?.status === "success" ? "succeeded" : "pending",
            paidAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            webhookPayload: req.body || {},
          },
          { merge: true }
        );
      }
    }
    res.json({ received: true });
  } catch (error) {
    console.error("bKash webhook error:", error);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});


/** Authenticated: show webhook URLs + secret status (no secret value) */
router.get("/webhook-info", authenticateToken, async (req, res) => {
  try {
    const role = String((req as any).user?.role || "");
    if (role !== "SAAS_OWNER" && role !== "SAAS_ADMIN" && role !== "SHOP_OWNER") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const base = `${req.protocol}://${req.get("host")}`;
    const isProd = process.env.NODE_ENV === "production";
    res.json({
      endpoints: {
        stripe: `${base}/api/payments/webhook/stripe`,
        bkash: `${base}/api/payments/webhook/bkash`,
      },
      stripeWebhookSecretConfigured: !!(process.env.STRIPE_WEBHOOK_SECRET || "").trim(),
      stripeSecretConfigured: !!(process.env.STRIPE_SECRET_KEY || "").trim(),
      production: isProd,
      note: isProd
        ? "STRIPE_WEBHOOK_SECRET is required in production or webhooks are rejected."
        : "Dev accepts Stripe events without secret (not for production).",
    });
  } catch (e) {
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router
;
