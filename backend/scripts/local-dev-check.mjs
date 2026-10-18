#!/usr/bin/env node
/**
 * Local setup sanity check (no server required for file checks).
 * With API running, also pings /api/health.
 *
 *   node backend/scripts/local-dev-check.mjs
 *   API_URL=http://localhost:3000 node backend/scripts/local-dev-check.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "..");
const API = (process.env.API_URL || "http://localhost:3000").replace(/\/$/, "");

const checks = [];
function ok(name, detail = "") {
  checks.push({ name, pass: true, detail });
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`);
}
function fail(name, detail = "") {
  checks.push({ name, pass: false, detail });
  console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`);
}
function warn(name, detail = "") {
  checks.push({ name, pass: true, warn: true, detail });
  console.log(`  ! ${name}${detail ? ` — ${detail}` : ""}`);
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

console.log("\nBizora local-dev-check\n");

// Structure
ok("monorepo root", root);
["package.json", "backend/server.ts", "frontend/src/App.tsx", "admin/src/App.tsx", "shared/contexts/AuthContext.tsx"].forEach((f) => {
  exists(f) ? ok(`file ${f}`) : fail(`file ${f}`, "missing");
});

// Env
const envPath = path.join(root, "backend", ".env");
if (fs.existsSync(envPath)) {
  const env = fs.readFileSync(envPath, "utf8");
  ok("backend/.env exists");
  if (/JWT_SECRET\s*=\s*.+/.test(env) && !/your_super_secret_jwt/.test(env)) ok("JWT_SECRET looks set");
  else warn("JWT_SECRET", "set a long random value");
  if (/OTP_DEV_ECHO\s*=\s*true/i.test(env)) warn("OTP_DEV_ECHO=true", "disable for production");
  if (!/FIREBASE_SERVICE_ACCOUNT/.test(env) && !/GOOGLE_APPLICATION_CREDENTIALS/.test(env)) {
    warn("Firebase credentials", "set FIREBASE_SERVICE_ACCOUNT_PATH or JSON");
  }
} else {
  warn("backend/.env missing", "cp backend/.env.example backend/.env");
}

// Docs
["docs/GO_LIVE.md", "docs/SMOKE_TEST.md", "docs/SECURITY_CHECK.md", "docs/CODE_STATUS.md"].forEach((f) => {
  exists(f) ? ok(f) : fail(f);
});

// Live health (optional)
console.log(`\nAPI probe → ${API}`);
try {
  const res = await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(3000) });
  if (res.ok) ok("GET /api/health", String(res.status));
  else fail("GET /api/health", `status ${res.status}`);
} catch (e) {
  warn("API not reachable", "start: npm run dev:backend");
}

const failed = checks.filter((c) => !c.pass).length;
console.log(`\n——— ${checks.filter((c) => c.pass).length} ok, ${failed} failed ———\n`);
console.log("Next: npm run dev:backend | dev:frontend | dev:admin");
console.log("Then: npm run test:api-smoke  ·  docs/GO_LIVE.md\n");
process.exit(failed > 0 ? 1 : 0);
