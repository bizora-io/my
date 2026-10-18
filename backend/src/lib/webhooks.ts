import crypto from "crypto";
import { getDb } from "./firebaseAdmin.js";

export type WebhookEvent =
  | "sale.created"
  | "transaction.created"
  | "product.low_stock"
  | "product.updated"
  | "leave.requested"
  | "leave.approved"
  | "payroll.processed";

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret?: string;
  events: (WebhookEvent | "*")[];
  active: boolean;
  createdAt?: string;
}

async function loadEndpoints(businessId: string): Promise<WebhookEndpoint[]> {
  try {
    const doc = await getDb().collection("businesses").doc(businessId).get();
    const list = doc.data()?.webhooks;
    return Array.isArray(list) ? list.filter((w: WebhookEndpoint) => w && w.active && w.url) : [];
  } catch {
    return [];
  }
}

function signBody(secret: string, body: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Fire-and-forget outbound webhooks. Never throws to callers.
 */
export async function dispatchWebhooks(
  businessId: string,
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<void> {
  const endpoints = await loadEndpoints(businessId);
  if (!endpoints.length) return;

  const payload = {
    id: `evt_${Date.now().toString(36)}`,
    event,
    createdAt: new Date().toISOString(),
    businessId,
    data,
  };
  const body = JSON.stringify(payload);

  await Promise.allSettled(
    endpoints
      .filter((ep) => ep.events.includes("*" as any) || ep.events.includes(event))
      .map(async (ep) => {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Bizora-Event": event,
          "X-Bizora-Delivery": payload.id,
          "User-Agent": "Bizora-Webhooks/1.0",
        };
        if (ep.secret) {
          headers["X-Bizora-Signature"] = signBody(ep.secret, body);
        }
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 8000);
        try {
          const res = await fetch(ep.url, {
            method: "POST",
            headers,
            body,
            signal: controller.signal,
          });
          if (!res.ok) {
            console.warn(`[webhook] ${event} → ${ep.url} status ${res.status}`);
          }
        } catch (e: any) {
          console.warn(`[webhook] ${event} → ${ep.url} failed:`, e?.message || e);
        } finally {
          clearTimeout(timer);
        }
      })
  );
}
