import { getDb } from "./firebaseAdmin.js";

/**
 * Dunning / involuntary-churn signals on businesses/{id}.
 * Used by revenue admin API and Stripe (or other) webhooks.
 */
export async function stampPaymentFailure(
  businessId: string,
  meta: { paymentId?: string; amount?: number; reason?: string; source?: string } = {}
) {
  if (!businessId) return null;
  const ref = getDb().collection("businesses").doc(businessId);
  const doc = await ref.get();
  if (!doc.exists) return null;
  const data = doc.data() || {};
  const fails = (Number(data.failedPaymentCount) || 0) + 1;
  const update: Record<string, any> = {
    failedPaymentCount: fails,
    lastPaymentFailedAt: new Date().toISOString(),
    lastPaymentStatus: "Failed",
    lastPaymentFailureReason: meta.reason || null,
    lastPaymentFailureSource: meta.source || "manual",
    updatedAt: new Date().toISOString(),
  };
  if (fails >= 2) {
    update.involuntaryChurnAt = data.involuntaryChurnAt || new Date().toISOString();
    if (!data.subscriptionStatus || data.subscriptionStatus === "Active") {
      update.subscriptionStatus = "PastDue";
    }
  }
  await ref.set(update, { merge: true });
  return { businessId, fails, involuntary: fails >= 2 };
}

export async function stampPaymentSuccess(
  businessId: string,
  meta: { source?: string; externalId?: string } = {}
) {
  if (!businessId) return null;
  await getDb().collection("businesses").doc(businessId).set(
    {
      lastPaymentStatus: "Paid",
      lastPaymentAt: new Date().toISOString(),
      failedPaymentCount: 0,
      lastPaymentFailureReason: null,
      lastPaymentSuccessSource: meta.source || "manual",
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
  return { businessId, cleared: true };
}

/** Resolve businessId from Stripe object metadata or external index. */
export async function resolveBusinessIdFromStripeObject(obj: any): Promise<string | null> {
  if (!obj) return null;
  const meta = obj.metadata || {};
  if (meta.businessId) return String(meta.businessId);
  if (meta.bizora_business_id) return String(meta.bizora_business_id);

  const candidates = [
    obj.id,
    obj.payment_intent,
    typeof obj.payment_intent === "object" ? obj.payment_intent?.id : null,
    obj.invoice,
    typeof obj.invoice === "object" ? obj.invoice?.id : null,
  ].filter(Boolean);

  for (const externalId of candidates) {
    const idx = await getDb().collection("paymentExternalIndex").doc(`stripe_${externalId}`).get();
    if (idx.exists && idx.data()?.businessId) return String(idx.data()!.businessId);
  }
  return null;
}
