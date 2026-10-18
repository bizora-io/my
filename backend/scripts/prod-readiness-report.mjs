#!/usr/bin/env node
/**
 * Fetch production readiness from a running API and print a markdown report.
 *
 * Usage:
 *   API_URL=http://localhost:3000 SAAS_TOKEN=<jwt> node backend/scripts/prod-readiness-report.mjs
 *   # or login:
 *   API_URL=http://localhost:3000 SMOKE_SAAS_ID=... SMOKE_SAAS_PASSWORD=... node backend/scripts/prod-readiness-report.mjs
 */
const API = (process.env.API_URL || "http://localhost:3000").replace(/\/$/, "");

async function getToken() {
  if (process.env.SAAS_TOKEN) return process.env.SAAS_TOKEN;
  const id = process.env.SMOKE_SAAS_ID || process.env.SAAS_OWNER_EMAIL;
  const pw = process.env.SMOKE_SAAS_PASSWORD;
  if (!id || !pw) return null;
  const res = await fetch(`${API}/api/auth/saas-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: id, password: pw }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`saas-login ${res.status} ${body.error || ""}`);
  return body.accessToken || body.token;
}

async function main() {
  console.log(`\n# Bizora production readiness\n\nAPI: ${API}\n`);
  const health = await fetch(`${API}/api/health`).then((r) => r.json()).catch((e) => ({ error: e.message }));
  console.log("## Health\n");
  console.log("```json");
  console.log(JSON.stringify(health, null, 2));
  console.log("```\n");

  let token = null;
  try {
    token = await getToken();
  } catch (e) {
    console.log(`## Auth\n\nCould not login: ${e.message}\n`);
  }
  if (!token) {
    console.log("Set SAAS_TOKEN or SMOKE_SAAS_ID + SMOKE_SAAS_PASSWORD for full readiness.\n");
    process.exit(health?.status === "ok" || health?.ok ? 0 : 1);
  }

  const res = await fetch(`${API}/api/admin/readiness`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.log(`## Readiness\n\nHTTP ${res.status} ${data.error || ""}\n`);
    process.exit(1);
  }

  const s = data.summary || {};
  console.log("## Summary\n");
  console.log(`| Metric | Value |`);
  console.log(`|--------|-------|`);
  console.log(`| pass | ${s.pass} |`);
  console.log(`| warn | ${s.warn} |`);
  console.log(`| fail | ${s.fail} |`);
  console.log(`| requiredFails | ${s.requiredFails ?? "?"} |`);
  console.log(`| readyForProd | **${s.readyForProd}** |`);
  console.log(`| NODE_ENV | ${data.nodeEnv} |`);
  console.log("");

  console.log("## Checks\n");
  console.log("| Status | Category | Check | Detail |");
  console.log("|--------|----------|-------|--------|");
  for (const c of data.checks || []) {
    const icon = c.status === "pass" ? "PASS" : c.status === "warn" ? "WARN" : "FAIL";
    const req = c.requiredForProd ? " *(required)*" : "";
    console.log(`| ${icon} | ${c.category} | ${c.label}${req} | ${(c.detail || "").replace(/\|/g, "/")} |`);
  }
  console.log("\nSee also: `docs/SECURITY_CHECK.md`, `docs/GO_LIVE.md`\n");
  process.exit(s.readyForProd || (s.requiredFails === 0 && data.nodeEnv !== "production") ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
