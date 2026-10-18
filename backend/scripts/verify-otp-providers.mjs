#!/usr/bin/env node
/**
 * Verify OTP-related env without sending messages.
 * Usage: node backend/scripts/verify-otp-providers.mjs
 * Loads backend/.env if present (simple parse).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

loadEnvFile(envPath);

const isProd = (process.env.NODE_ENV || "").toLowerCase() === "production";
const present = (k) => !!(process.env[k] && String(process.env[k]).trim());

console.log("\nBizora OTP provider check\n");
console.log(`NODE_ENV=${process.env.NODE_ENV || "unset"}`);

const twilio = present("TWILIO_ACCOUNT_SID") && present("TWILIO_AUTH_TOKEN") && present("TWILIO_FROM_NUMBER");
const resend = present("RESEND_API_KEY") && (present("EMAIL_FROM") || present("RESEND_FROM"));
const pepper = present("OTP_PEPPER") && !/change-me/i.test(process.env.OTP_PEPPER || "");
const echo = (process.env.OTP_DEV_ECHO || "").toLowerCase();
const echoOn = echo === "1" || echo === "true" || echo === "yes";

function row(label, ok, detail) {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

let fails = 0;
if (!row("Twilio SMS configured", twilio, twilio ? "SID+token+from" : "set TWILIO_*")) fails++;
if (!row("Resend email configured", resend, resend ? "key+from" : "set RESEND_API_KEY + EMAIL_FROM")) fails++;
if (!row("OTP_PEPPER strong", pepper, pepper ? "ok" : "set non-default OTP_PEPPER")) fails++;
if (!row("OTP_DEV_ECHO safe", !(isProd && echoOn), isProd && echoOn ? "MUST be false in production" : `OTP_DEV_ECHO=${process.env.OTP_DEV_ECHO || "false"}`)) fails++;

if (isProd && !twilio && !resend) {
  console.log("  ✗ Production needs at least one of SMS or email");
  fails++;
}

console.log(fails ? `\n${fails} issue(s) — fix before production OTP.\n` : "\nOTP env looks ready (still send a real test OTP).\n");
process.exit(fails && isProd ? 1 : 0);
