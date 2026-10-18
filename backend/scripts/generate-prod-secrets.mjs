#!/usr/bin/env node
import crypto from "crypto";
import { spawnSync } from "child_process";

const hex = (n) => crypto.randomBytes(n).toString("hex");
console.log("# Paste into backend/.env (production)\n");
console.log(`JWT_SECRET=${hex(48)}`);
console.log(`OTP_PEPPER=${hex(32)}`);
console.log(`BACKUP_AT_REST_KEY=${hex(32)}`);
console.log("\n# Password hash — run:");
console.log('# node backend/scripts/generate-password-hash.mjs "YourStrongPassword"');
console.log("# then set SAAS_OWNER_PASSWORD_HASH=...");
