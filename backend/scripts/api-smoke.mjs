#!/usr/bin/env node
/**
 * Live API smoke against a running Bizora backend.
 * Usage:
 *   node backend/scripts/api-smoke.mjs
 *   API_URL=http://localhost:3000 node backend/scripts/api-smoke.mjs
 * Optional:
 *   SMOKE_SHOP_ID=email@x.com SMOKE_SHOP_PASSWORD=...
 *   SMOKE_SAAS_ID=... SMOKE_SAAS_PASSWORD=...
 */
const API = (process.env.API_URL || process.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const results = [];
function ok(name, detail = "") {
  results.push({ name, pass: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  results.push({ name, pass: false, detail });
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}

async function req(path, opts = {}) {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { res, body, status: res.status };
}

async function main() {
  console.log(`\nBizora API smoke → ${API}\n`);

  // 1. Health
  try {
    const { status, body } = await req("/api/health");
    if (status === 200) ok("GET /api/health", JSON.stringify(body).slice(0, 80));
    else fail("GET /api/health", `status ${status}`);
  } catch (e) {
    fail("GET /api/health", e.message || String(e));
    console.error("\nBackend not reachable. Start: npm run dev:backend\n");
    process.exit(1);
  }

  // 2. Ready (may need firebase)
  try {
    const { status } = await req("/api/health/ready");
    if (status === 200) ok("GET /api/health/ready");
    else fail("GET /api/health/ready", `status ${status}`);
  } catch (e) {
    fail("GET /api/health/ready", e.message);
  }

  // 3. Public plans
  try {
    const { status, body } = await req("/api/platform/plans");
    const n = Array.isArray(body?.plans) ? body.plans.length : 0;
    if (status === 200 && n > 0) ok("GET /api/platform/plans", `${n} plans`);
    else fail("GET /api/platform/plans", `status ${status} plans=${n}`);
  } catch (e) {
    fail("GET /api/platform/plans", e.message);
  }

  // 4. Shop login (optional)
  const shopId = process.env.SMOKE_SHOP_ID;
  const shopPw = process.env.SMOKE_SHOP_PASSWORD;
  let shopToken = null;
  if (shopId && shopPw) {
    try {
      const { status, body } = await req("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier: shopId, password: shopPw }),
      });
      if (status === 200 && (body?.token || body?.accessToken)) {
        shopToken = body.accessToken || body.token;
        ok("POST /api/auth/login (shop)", body?.user?.role || "ok");
      } else {
        fail("POST /api/auth/login (shop)", `status ${status} ${body?.error || ""}`);
      }
    } catch (e) {
      fail("POST /api/auth/login (shop)", e.message);
    }
  } else {
    console.log("  · skip shop login (set SMOKE_SHOP_ID + SMOKE_SHOP_PASSWORD)");
  }

  if (shopToken) {
    try {
      const { status } = await req("/api/auth/me", {
        headers: { Authorization: `Bearer ${shopToken}` },
      });
      if (status === 200) ok("GET /api/auth/me (shop)");
      else fail("GET /api/auth/me (shop)", `status ${status}`);
    } catch (e) {
      fail("GET /api/auth/me (shop)", e.message);
    }
    try {
      const { status, body } = await req("/api/plan-requests", {
        headers: { Authorization: `Bearer ${shopToken}` },
      });
      if (status === 200) ok("GET /api/plan-requests (shop)", `${(body?.requests || []).length} reqs`);
      else fail("GET /api/plan-requests (shop)", `status ${status}`);
    } catch (e) {
      fail("GET /api/plan-requests (shop)", e.message);
    }
  }

  // 5. SaaS login (optional)
  const saasId = process.env.SMOKE_SAAS_ID || process.env.SAAS_OWNER_EMAIL;
  const saasPw = process.env.SMOKE_SAAS_PASSWORD;
  let saasToken = null;
  if (saasId && saasPw) {
    try {
      const { status, body } = await req("/api/auth/saas-login", {
        method: "POST",
        body: JSON.stringify({ identifier: saasId, password: saasPw }),
      });
      if (status === 200 && (body?.token || body?.accessToken)) {
        saasToken = body.accessToken || body.token;
        ok("POST /api/auth/saas-login", body?.user?.role || "ok");
      } else {
        fail("POST /api/auth/saas-login", `status ${status} ${body?.error || ""}`);
      }
    } catch (e) {
      fail("POST /api/auth/saas-login", e.message);
    }
  } else {
    console.log("  · skip SaaS login (set SMOKE_SAAS_ID + SMOKE_SAAS_PASSWORD)");
  }

  if (saasToken) {
    try {
      const { status, body } = await req("/api/admin/businesses", {
        headers: { Authorization: `Bearer ${saasToken}` },
      });
      if (status === 200) ok("GET /api/admin/businesses", `count≈${(body?.businesses || body || []).length || "?"}`);
      else fail("GET /api/admin/businesses", `status ${status}`);
    } catch (e) {
      fail("GET /api/admin/businesses", e.message);
    }
    try {
      const { status } = await req("/api/admin/readiness", {
        headers: { Authorization: `Bearer ${saasToken}` },
      });
      if (status === 200) ok("GET /api/admin/readiness");
      else fail("GET /api/admin/readiness", `status ${status}`);
    } catch (e) {
      fail("GET /api/admin/readiness", e.message);
    }
    try {
      const { status, body } = await req("/api/plan-requests", {
        headers: { Authorization: `Bearer ${saasToken}` },
      });
      if (status === 200) ok("GET /api/plan-requests (saas)", `${(body?.requests || []).length} reqs`);
      else fail("GET /api/plan-requests (saas)", `status ${status}`);
    } catch (e) {
      fail("GET /api/plan-requests (saas)", e.message);
    }
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\n——— ${passed} passed, ${failed} failed ———\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
