import express from "express";
import { authenticateToken, requireRole } from "./middleware/auth.js";

const router = express.Router();

type RateCache = {
  base: string;
  rates: Record<string, number>;
  provider: string;
  fetchedAt: string;
};

let cache: RateCache | null = null;
const CACHE_MS = 60 * 60 * 1000; // 1 hour

async function fetchFrankfurter(base: string): Promise<RateCache | null> {
  const url = `https://api.frankfurter.app/latest?from=${encodeURIComponent(base)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) return null;
  const data = (await res.json()) as { base?: string; rates?: Record<string, number>; date?: string };
  if (!data?.rates) return null;
  return {
    base: data.base || base,
    rates: { [data.base || base]: 1, ...data.rates },
    provider: "frankfurter",
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchOpenErApi(base: string): Promise<RateCache | null> {
  const url = `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    result?: string;
    base_code?: string;
    rates?: Record<string, number>;
    time_last_update_utc?: string;
  };
  if (data.result !== "success" || !data.rates) return null;
  return {
    base: data.base_code || base,
    rates: data.rates,
    provider: "open.er-api",
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Normalize to USD-pivot table used by the app:
 * rate[X] = units of X per 1 USD
 */
function toUsdPivot(base: string, rates: Record<string, number>): Record<string, number> {
  if (base === "USD") {
    return { USD: 1, ...rates };
  }
  // rates are "1 base = rates[code] code"
  // units of X per 1 USD = rates[X] / rates[USD] when base is not USD
  // If rates are relative to base: amount_usd * rate[X]/rate[USD] wait
  // 1 BASE = rates[CUR] CUR
  // 1 USD = ? BASE = 1/rates[USD] if rates[USD] is BASE→USD
  // units of CUR per 1 USD = rates[CUR] / rates[USD]
  const usd = rates["USD"];
  if (!usd || usd <= 0) {
    // cannot convert; return as-is with base=1
    return { ...rates, [base]: 1 };
  }
  const out: Record<string, number> = { USD: 1 };
  for (const [code, r] of Object.entries(rates)) {
    if (!r || r <= 0) continue;
    out[code] = r / usd;
  }
  out[base] = 1 / usd;
  out.USD = 1;
  return out;
}

async function loadRates(base = "USD", force = false): Promise<RateCache> {
  if (!force && cache && Date.now() - Date.parse(cache.fetchedAt) < CACHE_MS && cache.base === base) {
    return cache;
  }

  let raw = await fetchFrankfurter(base);
  if (!raw) raw = await fetchOpenErApi(base);
  if (!raw) {
    if (cache) return cache;
    throw new Error("Unable to fetch exchange rates from providers");
  }

  const pivotBase = "USD";
  // Always store USD-pivot for app consistency
  const rates =
    raw.base === "USD"
      ? { USD: 1, ...raw.rates }
      : toUsdPivot(raw.base, raw.rates);

  cache = {
    base: pivotBase,
    rates,
    provider: raw.provider,
    fetchedAt: raw.fetchedAt,
  };
  return cache;
}

// Public-ish: authenticated business users
router.get("/", authenticateToken, requireRole("SHOP_OWNER", "EMPLOYEE", "SAAS_OWNER", "SAAS_ADMIN"), async (req, res) => {
  try {
    const base = String((req.query.base as string) || "USD").toUpperCase();
    const force = req.query.refresh === "1" || req.query.refresh === "true";
    const data = await loadRates(base === "USD" ? "USD" : "USD", force);
    // We always return USD pivot; client converts via convertCurrency
    res.json({
      base: data.base,
      rates: data.rates,
      provider: data.provider,
      fetchedAt: data.fetchedAt,
      cached: !force && !!cache,
    });
  } catch (e: any) {
    console.error("exchange rates error", e);
    res.status(502).json({ error: e?.message || "Failed to fetch rates" });
  }
});

// Health without auth for ops (optional light)
router.get("/health", async (_req, res) => {
  try {
    const data = await loadRates("USD", false);
    res.json({ ok: true, provider: data.provider, fetchedAt: data.fetchedAt, count: Object.keys(data.rates).length });
  } catch (e: any) {
    res.status(502).json({ ok: false, error: e?.message });
  }
});

export default router;
