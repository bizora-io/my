import crypto from "crypto";
/**
 * Payment provider adapters.
 *
 * - sandbox: always succeeds (local/dev / demo)
 * - stripe: Checkout Session via Stripe API when STRIPE_SECRET_KEY is set
 * - bkash: token grant + create payment when BKASH_* env vars are set (sandbox URL by default)
 *
 * Real money movement requires merchant credentials in env or platformConfig.
 */

export type PaymentProviderId = "sandbox" | "stripe" | "bkash";

export interface CreatePaymentInput {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, string>;
  successUrl?: string;
  cancelUrl?: string;
  customerEmail?: string;
}

export interface CreatePaymentResult {
  ok: boolean;
  provider: PaymentProviderId;
  externalId?: string;
  checkoutUrl?: string;
  clientSecret?: string;
  error?: string;
  raw?: unknown;
}

function env(name: string) {
  return (process.env[name] || "").trim();
}

export function resolveProvider(requested?: string): PaymentProviderId {
  const r = (requested || env("PAYMENT_DEFAULT_PROVIDER") || "sandbox").toLowerCase();
  if (r === "stripe" || r === "bkash" || r === "sandbox") return r;
  return "sandbox";
}

export async function createProviderPayment(
  provider: PaymentProviderId,
  input: CreatePaymentInput
): Promise<CreatePaymentResult> {
  if (provider === "sandbox") {
    const externalId = `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return {
      ok: true,
      provider,
      externalId,
      checkoutUrl: undefined, // confirmed in-app via /confirm
      raw: { mode: "sandbox", amount: input.amount },
    };
  }

  if (provider === "stripe") {
    const key = env("STRIPE_SECRET_KEY");
    if (!key) {
      return { ok: false, provider, error: "STRIPE_SECRET_KEY is not configured." };
    }
    try {
      const params = new URLSearchParams();
      params.set("mode", "payment");
      params.set("success_url", input.successUrl || "http://localhost:5173/settings?pay=success");
      params.set("cancel_url", input.cancelUrl || "http://localhost:5173/settings?pay=cancel");
      params.set("line_items[0][price_data][currency]", (input.currency || "usd").toLowerCase());
      params.set("line_items[0][price_data][product_data][name]", input.description || "Bizora payment");
      params.set("line_items[0][price_data][unit_amount]", String(Math.round(input.amount * 100)));
      params.set("line_items[0][quantity]", "1");
      if (input.customerEmail) params.set("customer_email", input.customerEmail);
      if (input.metadata) {
        Object.entries(input.metadata).forEach(([k, v], i) => {
          params.set(`metadata[${k}]`, v);
        });
      }

      const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      const data: any = await res.json();
      if (!res.ok) {
        return { ok: false, provider, error: data?.error?.message || `Stripe error ${res.status}`, raw: data };
      }
      return {
        ok: true,
        provider,
        externalId: data.id,
        checkoutUrl: data.url,
        raw: data,
      };
    } catch (e: any) {
      return { ok: false, provider, error: e?.message || "Stripe request failed" };
    }
  }

  if (provider === "bkash") {
    const username = env("BKASH_USERNAME");
    const password = env("BKASH_PASSWORD");
    const appKey = env("BKASH_APP_KEY");
    const appSecret = env("BKASH_APP_SECRET");
    const base = env("BKASH_BASE_URL") || "https://tokenized.sandbox.bka.sh/v1.2.0-beta";
    if (!username || !password || !appKey || !appSecret) {
      return {
        ok: false,
        provider,
        error: "bKash is not configured (BKASH_USERNAME, BKASH_PASSWORD, BKASH_APP_KEY, BKASH_APP_SECRET).",
      };
    }
    try {
      // 1) Grant token
      const tokenRes = await fetch(`${base}/tokenized/checkout/token/grant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          username,
          password,
        },
        body: JSON.stringify({ app_key: appKey, app_secret: appSecret }),
      });
      const tokenData: any = await tokenRes.json();
      if (!tokenRes.ok || !tokenData?.id_token) {
        return { ok: false, provider, error: tokenData?.statusMessage || "bKash token grant failed", raw: tokenData };
      }
      const idToken = tokenData.id_token as string;

      // 2) Create payment
      const createRes = await fetch(`${base}/tokenized/checkout/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          authorization: idToken,
          "x-app-key": appKey,
        },
        body: JSON.stringify({
          mode: "0011",
          payerReference: input.metadata?.businessId || "bizora",
          callbackURL: input.successUrl || env("BKASH_CALLBACK_URL") || "http://localhost:3000/api/payments/webhook/bkash",
          amount: String(input.amount),
          currency: input.currency || "BDT",
          intent: "sale",
          merchantInvoiceNumber: input.metadata?.invoiceNumber || `INV${Date.now()}`,
        }),
      });
      const createData: any = await createRes.json();
      if (!createRes.ok || !createData?.paymentID) {
        return { ok: false, provider, error: createData?.statusMessage || "bKash create payment failed", raw: createData };
      }
      return {
        ok: true,
        provider,
        externalId: createData.paymentID,
        checkoutUrl: createData.bkashURL || createData.callbackURL,
        raw: createData,
      };
    } catch (e: any) {
      return { ok: false, provider, error: e?.message || "bKash request failed" };
    }
  }

  return { ok: false, provider, error: "Unknown provider" };
}

/**
 * Verify Stripe-Signature header (HMAC-SHA256) without the Stripe SDK.
 * Spec: https://stripe.com/docs/webhooks/signatures
 *
 * - Dev: if STRIPE_WEBHOOK_SECRET is unset, accepts (logs warning).
 * - Prod: set NODE_ENV=production to reject when secret missing.
 */
export function verifyStripeWebhookSignature(
  payload: string | Buffer,
  sigHeader: string | undefined,
  opts?: { toleranceSec?: number }
): boolean {
  const secret = env("STRIPE_WEBHOOK_SECRET");
  const isProd = env("NODE_ENV") === "production";

  if (!secret) {
    if (isProd) {
      console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET required in production");
      return false;
    }
    console.warn("[stripe-webhook] STRIPE_WEBHOOK_SECRET unset — accepting event (dev only)");
    return true;
  }

  if (!sigHeader) return false;

  const raw = typeof payload === "string" ? payload : payload.toString("utf8");
  const parts = sigHeader.split(",").map((p) => p.trim());
  let timestamp = "";
  const v1Sigs: string[] = [];
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === "t") timestamp = v;
    if (k === "v1" && v) v1Sigs.push(v);
  }
  if (!timestamp || !v1Sigs.length) return false;

  const tolerance = opts?.toleranceSec ?? 300;
  const tsNum = parseInt(timestamp, 10);
  if (Number.isNaN(tsNum)) return false;
  const age = Math.abs(Math.floor(Date.now() / 1000) - tsNum);
  if (age > tolerance) {
    console.warn("[stripe-webhook] timestamp outside tolerance", age);
    return false;
  }

  const signed = `${timestamp}.${raw}`;
  const expected = crypto.createHmac("sha256", secret).update(signed, "utf8").digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  return v1Sigs.some((sig) => {
    try {
      const sigBuf = Buffer.from(sig, "utf8");
      if (sigBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  });
}
