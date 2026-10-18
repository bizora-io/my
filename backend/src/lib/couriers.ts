/**
 * Courier adapters — optional third-party; Manual is always available.
 * Real APIs used when credentials present; otherwise local tracking IDs.
 */

export type CourierProvider =
  | "Manual"
  | "Pathao"
  | "Steadfast"
  | "Paperfly"
  | "RedX"
  | "Sundarban";

export interface CourierCredentials {
  provider: CourierProvider;
  apiKey?: string; // Pathao: client_id | Steadfast: api key
  apiSecret?: string; // Pathao: client_secret
  enabled?: boolean;
  storeId?: string; // Pathao store_id | RedX pickup_store_id
  areaId?: string; // RedX delivery_area_id
  baseUrl?: string;
  username?: string; // Pathao merchant email
  password?: string; // Pathao merchant password
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: number; // epoch ms
}

export interface ShipmentInput {
  orderId: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  amountToCollect: number; // COD
  itemDescription?: string;
  itemWeightKg?: number;
  note?: string;
}

export interface ShipmentResult {
  ok: boolean;
  provider: CourierProvider;
  trackingNumber: string;
  consignmentId?: string;
  mode: "live" | "local";
  message?: string;
  raw?: any;
}

function localTracking(provider: string, orderId: string): string {
  const p = provider.slice(0, 3).toUpperCase();
  const t = Date.now().toString(36).toUpperCase();
  return `${p}-${orderId.slice(-4).toUpperCase()}-${t}`;
}

/** Steadfast Create Order API (BD) */
async function steadfastCreate(
  cred: CourierCredentials,
  input: ShipmentInput
): Promise<ShipmentResult> {
  const key = cred.apiKey || "";
  const secret = cred.apiSecret || "";
  if (!key || !secret) {
    const trackingNumber = localTracking("Steadfast", input.orderId);
    return {
      ok: true,
      provider: "Steadfast",
      trackingNumber,
      mode: "local",
      message: "No API keys — local tracking generated. Add keys for live Steadfast.",
    };
  }
  try {
    const base = cred.baseUrl || "https://portal.packzy.com/api/v1";
    const res = await fetch(`${base}/create_order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": key,
        "Secret-Key": secret,
      },
      body: JSON.stringify({
        invoice: input.orderId,
        recipient_name: input.recipientName,
        recipient_phone: input.recipientPhone,
        recipient_address: input.recipientAddress,
        cod_amount: input.amountToCollect,
        note: input.note || input.itemDescription || "",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        provider: "Steadfast",
        trackingNumber: "",
        mode: "live",
        message: data.message || data.error || `Steadfast HTTP ${res.status}`,
        raw: data,
      };
    }
    const trackingNumber =
      data.consignment?.tracking_code ||
      data.tracking_code ||
      data.trackingNumber ||
      localTracking("Steadfast", input.orderId);
    return {
      ok: true,
      provider: "Steadfast",
      trackingNumber: String(trackingNumber),
      consignmentId: String(data.consignment?.consignment_id || data.consignment_id || ""),
      mode: "live",
      raw: data,
    };
  } catch (e: any) {
    return {
      ok: false,
      provider: "Steadfast",
      trackingNumber: "",
      mode: "live",
      message: e?.message || "Steadfast request failed",
    };
  }
}


export interface CourierStatusResult {
  ok: boolean;
  provider: CourierProvider;
  deliveryStatus: string;
  rawStatus?: string;
  mode: "live" | "local";
  message?: string;
  raw?: any;
}

/** Map Steadfast delivery status strings → Bizora delivery pipeline */
export function mapSteadfastStatus(raw: string): string {
  const s = String(raw || "").toLowerCase().replace(/[_\s]+/g, " ").trim();
  if (!s) return "InTransit";
  if (s.includes("deliver") && !s.includes("undeliver") && !s.includes("fail")) return "Delivered";
  if (s.includes("return") || s.includes("cancel")) return s.includes("cancel") ? "Cancelled" : "Returned";
  if (s.includes("fail") || s.includes("undeliver")) return "Failed";
  if (s.includes("out for") || s.includes("ofo") || s.includes("last mile")) return "OutForDelivery";
  if (s.includes("pick") || s.includes("collected") || s.includes("hub")) return "PickedUp";
  if (s.includes("review") || s.includes("pending") || s.includes("approval")) return "Processing";
  if (s.includes("transit") || s.includes("ship") || s.includes("dispatch")) return "InTransit";
  return "InTransit";
}

/**
 * Steadfast status by tracking code, invoice, or consignment id.
 * Docs: GET /status_by_trackingcode/{code}, /status_by_invoice/{invoice}, /status_by_cid/{id}
 */
export async function steadfastFetchStatus(
  cred: CourierCredentials,
  opts: { trackingNumber?: string; invoice?: string; consignmentId?: string }
): Promise<CourierStatusResult> {
  const key = cred.apiKey || "";
  const secret = cred.apiSecret || "";
  if (!key || !secret) {
    return {
      ok: false,
      provider: "Steadfast",
      deliveryStatus: "InTransit",
      mode: "local",
      message: "Steadfast API keys required for live status sync",
    };
  }
  const base = cred.baseUrl || "https://portal.packzy.com/api/v1";
  const headers = {
    "Content-Type": "application/json",
    "Api-Key": key,
    "Secret-Key": secret,
  };

  const attempts: string[] = [];
  if (opts.trackingNumber) attempts.push(`${base}/status_by_trackingcode/${encodeURIComponent(opts.trackingNumber)}`);
  if (opts.invoice) attempts.push(`${base}/status_by_invoice/${encodeURIComponent(opts.invoice)}`);
  if (opts.consignmentId) attempts.push(`${base}/status_by_cid/${encodeURIComponent(opts.consignmentId)}`);

  if (!attempts.length) {
    return {
      ok: false,
      provider: "Steadfast",
      deliveryStatus: "InTransit",
      mode: "local",
      message: "Need trackingNumber, invoice, or consignmentId",
    };
  }

  let lastErr = "";
  for (const url of attempts) {
    try {
      const res = await fetch(url, { method: "GET", headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        lastErr = data.message || data.error || `HTTP ${res.status}`;
        continue;
      }
      const rawStatus =
        data.delivery_status ||
        data.status ||
        data.consignment?.status ||
        data.consignment?.delivery_status ||
        data.data?.delivery_status ||
        data.data?.status ||
        "";
      const deliveryStatus = mapSteadfastStatus(String(rawStatus));
      return {
        ok: true,
        provider: "Steadfast",
        deliveryStatus,
        rawStatus: String(rawStatus),
        mode: "live",
        raw: data,
      };
    } catch (e: any) {
      lastErr = e?.message || "request failed";
    }
  }
  return {
    ok: false,
    provider: "Steadfast",
    deliveryStatus: "InTransit",
    mode: "live",
    message: lastErr || "Status lookup failed",
  };
}

/** Pathao OAuth issue token */
async function pathaoGetToken(cred: CourierCredentials): Promise<{ token: string; refresh?: string; expiresIn?: number; error?: string }> {
  const base = (cred.baseUrl || "https://api-hermes.pathao.com").replace(/\/$/, "");
  // Prefer cached token
  if (cred.accessToken && cred.tokenExpiresAt && Date.now() < cred.tokenExpiresAt - 60_000) {
    return { token: cred.accessToken, refresh: cred.refreshToken };
  }
  if (!cred.apiKey || !cred.apiSecret || !cred.username || !cred.password) {
    return { token: "", error: "Pathao needs client_id, client_secret, username, password" };
  }
  try {
    const res = await fetch(`${base}/aladdin/api/v1/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: cred.apiKey,
        client_secret: cred.apiSecret,
        username: cred.username,
        password: cred.password,
        grant_type: "password",
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { token: "", error: data.message || data.error || `Token HTTP ${res.status}` };
    }
    const token = data.access_token || data.token || "";
    if (!token) return { token: "", error: "No access_token in Pathao response" };
    return {
      token,
      refresh: data.refresh_token,
      expiresIn: Number(data.expires_in) || 3600,
    };
  } catch (e: any) {
    return { token: "", error: e?.message || "Pathao token failed" };
  }
}

/** Pathao — create order (OAuth + store_id) */
async function pathaoCreate(
  cred: CourierCredentials,
  input: ShipmentInput
): Promise<ShipmentResult> {
  if (!cred.apiKey || !cred.apiSecret) {
    const trackingNumber = localTracking("Pathao", input.orderId);
    return {
      ok: true,
      provider: "Pathao",
      trackingNumber,
      mode: "local",
      message: "No Pathao client credentials — local tracking. Add client_id/secret + username/password + store_id for live.",
    };
  }
  if (!cred.storeId) {
    const trackingNumber = localTracking("Pathao", input.orderId);
    return {
      ok: true,
      provider: "Pathao",
      trackingNumber,
      mode: "local",
      message: "Pathao store_id missing — local tracking. Set store ID in courier settings.",
    };
  }

  const tok = await pathaoGetToken(cred);
  if (!tok.token) {
    return {
      ok: false,
      provider: "Pathao",
      trackingNumber: "",
      mode: "live",
      message: tok.error || "Pathao auth failed",
    };
  }

  const base = (cred.baseUrl || "https://api-hermes.pathao.com").replace(/\/$/, "");
  const phone = String(input.recipientPhone || "").replace(/\D/g, "");
  const normalizedPhone = phone.length === 11 ? phone : phone.slice(-11);

  try {
    const res = await fetch(`${base}/aladdin/api/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${tok.token}`,
      },
      body: JSON.stringify({
        store_id: Number(cred.storeId) || cred.storeId,
        merchant_order_id: input.orderId,
        recipient_name: input.recipientName.slice(0, 100),
        recipient_phone: normalizedPhone,
        recipient_address: input.recipientAddress.slice(0, 220),
        delivery_type: 48, // normal
        item_type: 2, // parcel
        item_quantity: 1,
        item_weight: Math.min(10, Math.max(0.5, input.itemWeightKg || 0.5)),
        item_description: (input.itemDescription || "Order").slice(0, 200),
        special_instruction: (input.note || "").slice(0, 200),
        amount_to_collect: Math.max(0, Math.round(input.amountToCollect)),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok && res.status !== 201) {
      return {
        ok: false,
        provider: "Pathao",
        trackingNumber: "",
        mode: "live",
        message:
          data.message ||
          data.error ||
          (data.errors && JSON.stringify(data.errors)) ||
          `Pathao HTTP ${res.status}`,
        raw: data,
      };
    }
    const trackingNumber =
      data.data?.consignment_id ||
      data.consignment_id ||
      data.data?.tracking_id ||
      localTracking("Pathao", input.orderId);
    return {
      ok: true,
      provider: "Pathao",
      trackingNumber: String(trackingNumber),
      consignmentId: String(trackingNumber),
      mode: "live",
      message: "Pathao order created",
      raw: { ...data, _tokenExpiresIn: tok.expiresIn, _refresh: tok.refresh },
    };
  } catch (e: any) {
    return {
      ok: false,
      provider: "Pathao",
      trackingNumber: "",
      mode: "live",
      message: e?.message || "Pathao create failed",
    };
  }
}


/** Pathao order info / status by consignment id */
export async function pathaoFetchStatus(
  cred: CourierCredentials,
  consignmentId: string
): Promise<CourierStatusResult> {
  if (!consignmentId) {
    return {
      ok: false,
      provider: "Pathao",
      deliveryStatus: "InTransit",
      mode: "local",
      message: "consignment_id required",
    };
  }
  const tok = await pathaoGetToken(cred);
  if (!tok.token) {
    return {
      ok: false,
      provider: "Pathao",
      deliveryStatus: "InTransit",
      mode: "local",
      message: tok.error || "Pathao auth failed",
    };
  }
  const base = (cred.baseUrl || "https://api-hermes.pathao.com").replace(/\/$/, "");
  try {
    const res = await fetch(
      `${base}/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${tok.token}`,
        },
      }
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        provider: "Pathao",
        deliveryStatus: "InTransit",
        mode: "live",
        message: data.message || data.error || `Pathao HTTP ${res.status}`,
        raw: data,
      };
    }
    const rawStatus =
      data.data?.order_status ||
      data.data?.status ||
      data.order_status ||
      data.status ||
      "";
    return {
      ok: true,
      provider: "Pathao",
      deliveryStatus: mapSteadfastStatus(String(rawStatus)),
      rawStatus: String(rawStatus),
      mode: "live",
      raw: data,
    };
  } catch (e: any) {
    return {
      ok: false,
      provider: "Pathao",
      deliveryStatus: "InTransit",
      mode: "live",
      message: e?.message || "Pathao status failed",
    };
  }
}

export { pathaoGetToken };

async function genericLocal(
  provider: CourierProvider,
  input: ShipmentInput,
  hasKeys: boolean
): Promise<ShipmentResult> {
  return {
    ok: true,
    provider,
    trackingNumber: localTracking(provider, input.orderId),
    mode: hasKeys ? "local" : "local",
    message: hasKeys
      ? `${provider} keys stored — shipment recorded in Bizora (connect live API when available).`
      : `${provider} local shipment — enable API keys for live push.`,
  };
}


/** RedX create parcel + track */
async function redxCreate(
  cred: CourierCredentials,
  input: ShipmentInput
): Promise<ShipmentResult> {
  const token = cred.apiKey || cred.accessToken || "";
  if (!token) {
    return {
      ok: true,
      provider: "RedX",
      trackingNumber: localTracking("RedX", input.orderId),
      mode: "local",
      message: "No RedX API token — local tracking. Set API-ACCESS-TOKEN (JWT) for live.",
    };
  }
  const base = (cred.baseUrl || "https://openapi.redx.com.bd/v1.0.0-beta").replace(/\/$/, "");
  const phone = String(input.recipientPhone || "").replace(/\D/g, "").slice(-11);
  const body: any = {
    customer_name: input.recipientName,
    customer_phone: phone,
    customer_address: input.recipientAddress,
    merchant_invoice_id: input.orderId,
    cash_collection_amount: String(Math.max(0, Math.round(input.amountToCollect))),
    parcel_weight: input.itemWeightKg || 0.5,
    instruction: input.note || input.itemDescription || "",
    value: String(Math.max(0, Math.round(input.amountToCollect)) || 100),
  };
  if (cred.areaId) {
    body.delivery_area_id = Number(cred.areaId) || cred.areaId;
    body.delivery_area = cred.storeId || "Area"; // storeId reused as area name label optional
  } else {
    // RedX often requires area — without it try address-only; may fail live
    body.delivery_area = "Dhaka";
    body.delivery_area_id = 1;
  }
  if (cred.storeId && !isNaN(Number(cred.storeId))) {
    body.pickup_store_id = String(cred.storeId);
  }

  try {
    const res = await fetch(`${base}/parcel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "API-ACCESS-TOKEN": token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        provider: "RedX",
        trackingNumber: "",
        mode: "live",
        message: data.message || data.error || JSON.stringify(data.errors || data) || `RedX HTTP ${res.status}`,
        raw: data,
      };
    }
    const trackingNumber =
      data.tracking_id ||
      data.trackingId ||
      data.parcel_id ||
      data.data?.tracking_id ||
      data.data?.trackingId ||
      localTracking("RedX", input.orderId);
    return {
      ok: true,
      provider: "RedX",
      trackingNumber: String(trackingNumber),
      consignmentId: String(trackingNumber),
      mode: "live",
      message: "RedX parcel created",
      raw: data,
    };
  } catch (e: any) {
    return {
      ok: false,
      provider: "RedX",
      trackingNumber: "",
      mode: "live",
      message: e?.message || "RedX create failed",
    };
  }
}

export function mapRedxStatus(raw: string): string {
  const s = String(raw || "").toLowerCase().replace(/[_\s-]+/g, " ").trim();
  if (!s) return "InTransit";
  if (s.includes("deliver") && !s.includes("undeliver")) return "Delivered";
  if (s.includes("return")) return "Returned";
  if (s.includes("cancel")) return "Cancelled";
  if (s.includes("fail") || s.includes("undeliver")) return "Failed";
  if (s.includes("out for") || s.includes("ofo")) return "OutForDelivery";
  if (s.includes("pick")) return "PickedUp";
  if (s.includes("pending") || s.includes("created") || s.includes("pickup pending")) return "Processing";
  return "InTransit";
}

export async function redxFetchStatus(
  cred: CourierCredentials,
  trackingNumber: string
): Promise<CourierStatusResult> {
  const token = cred.apiKey || cred.accessToken || "";
  if (!token || !trackingNumber) {
    return {
      ok: false,
      provider: "RedX",
      deliveryStatus: "InTransit",
      mode: "local",
      message: "RedX token and tracking number required",
    };
  }
  const base = (cred.baseUrl || "https://openapi.redx.com.bd/v1.0.0-beta").replace(/\/$/, "");
  try {
    const res = await fetch(`${base}/parcel/track/${encodeURIComponent(trackingNumber)}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "API-ACCESS-TOKEN": token.startsWith("Bearer ") ? token : `Bearer ${token}`,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        provider: "RedX",
        deliveryStatus: "InTransit",
        mode: "live",
        message: data.message || `RedX track HTTP ${res.status}`,
        raw: data,
      };
    }
    // Timeline may be array
    const tracking = data.tracking || data.data?.tracking || data.history || [];
    const last =
      Array.isArray(tracking) && tracking.length
        ? tracking[tracking.length - 1]
        : data;
    const rawStatus =
      last?.status_message ||
      last?.status ||
      last?.message ||
      data.status ||
      data.parcel_status ||
      "";
    return {
      ok: true,
      provider: "RedX",
      deliveryStatus: mapRedxStatus(String(rawStatus)),
      rawStatus: String(rawStatus),
      mode: "live",
      raw: data,
    };
  } catch (e: any) {
    return {
      ok: false,
      provider: "RedX",
      deliveryStatus: "InTransit",
      mode: "live",
      message: e?.message || "RedX track failed",
    };
  }
}


/**
 * Paperfly create order.
 * Credentials: apiKey (merchant key), username, password.
 * Common merchant API pattern used by BD integrations.
 */
async function paperflyCreate(
  cred: CourierCredentials,
  input: ShipmentInput
): Promise<ShipmentResult> {
  if (!cred.apiKey || !cred.username || !cred.password) {
    return {
      ok: true,
      provider: "Paperfly",
      trackingNumber: localTracking("Paperfly", input.orderId),
      mode: "local",
      message:
        "Paperfly needs API key + username + password for live. Local tracking issued.",
    };
  }
  const base = (cred.baseUrl || "https://api.paperfly.com.bd").replace(/\/$/, "");
  const phone = String(input.recipientPhone || "").replace(/\D/g, "").slice(-11);
  const payload = {
    merOrderRef: input.orderId,
    pickMerchantName: cred.storeId || "Store",
    pickMerchantAddress: "",
    pickMerchantThana: "",
    pickMerchantDistrict: "",
    pickupMerchantPhone: "",
    productSizeWeight: "standard",
    productBrief: (input.itemDescription || "Parcel").slice(0, 200),
    packagePrice: Math.max(0, Math.round(input.amountToCollect)),
    deliveryOption: "regular",
    custname: input.recipientName,
    custaddress: input.recipientAddress,
    custphone: phone,
    max_weight: input.itemWeightKg || 1,
  };

  try {
    // Basic auth style used by several Paperfly packages
    const auth = Buffer.from(`${cred.username}:${cred.password}`).toString("base64");
    const res = await fetch(`${base}/Merchant/NewOrder`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
        paperflykey: cred.apiKey,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Fallback local if endpoint shape differs per merchant account
      if (res.status === 404 || res.status === 405) {
        return {
          ok: true,
          provider: "Paperfly",
          trackingNumber: localTracking("Paperfly", input.orderId),
          mode: "local",
          message: `Paperfly endpoint returned ${res.status} — credentials saved; use local tracking until merchant confirms API URL.`,
          raw: data,
        };
      }
      return {
        ok: false,
        provider: "Paperfly",
        trackingNumber: "",
        mode: "live",
        message: data.message || data.error || data.success_message || `Paperfly HTTP ${res.status}`,
        raw: data,
      };
    }
    const trackingNumber =
      data.tracking_number ||
      data.trackingNumber ||
      data.orderid ||
      data.order_id ||
      data.Response?.TrackingNumber ||
      data.data?.tracking_number ||
      localTracking("Paperfly", input.orderId);
    return {
      ok: true,
      provider: "Paperfly",
      trackingNumber: String(trackingNumber),
      consignmentId: String(trackingNumber),
      mode: "live",
      message: "Paperfly order submitted",
      raw: data,
    };
  } catch (e: any) {
    return {
      ok: false,
      provider: "Paperfly",
      trackingNumber: "",
      mode: "live",
      message: e?.message || "Paperfly create failed",
    };
  }
}

export function mapPaperflyStatus(raw: string): string {
  return mapSteadfastStatus(raw);
}

export async function createShipment(
  cred: CourierCredentials,
  input: ShipmentInput
): Promise<ShipmentResult> {
  const provider = cred.provider || "Manual";
  if (provider === "Manual") {
    return {
      ok: true,
      provider: "Manual",
      trackingNumber: localTracking("MAN", input.orderId),
      mode: "local",
      message: "Own delivery / manual courier",
    };
  }
  if (provider === "Steadfast") return steadfastCreate(cred, input);
  if (provider === "Pathao") return pathaoCreate(cred, input);
  if (provider === "RedX") return redxCreate(cred, input);
  if (provider === "Paperfly") return paperflyCreate(cred, input);
  const hasKeys = !!(cred.apiKey && cred.apiSecret);
  return genericLocal(provider, input, hasKeys);
}

export const COURIER_PROVIDERS: {
  id: CourierProvider;
  name: string;
  nameBn: string;
  needsKeys: boolean;
}[] = [
  { id: "Manual", name: "Own delivery", nameBn: "নিজস্ব ডেলিভারি", needsKeys: false },
  { id: "Steadfast", name: "Steadfast", nameBn: "স্টিডফাস্ট", needsKeys: true },
  { id: "Pathao", name: "Pathao", nameBn: "পাঠাও", needsKeys: true },
  { id: "RedX", name: "RedX", nameBn: "রেডএক্স", needsKeys: true },
  { id: "Paperfly", name: "Paperfly", nameBn: "পেপারফ্লাই", needsKeys: true },
  { id: "Sundarban", name: "Sundarban", nameBn: "সুন্দরবন", needsKeys: true },
];
