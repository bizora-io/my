/**
 * Production readiness checks — env + optional live probes.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export interface ReadinessCheck {
  id: string;
  category: string;
  label: string;
  status: CheckStatus;
  detail: string;
  requiredForProd?: boolean;
}

function present(v: string | undefined | null) {
  return !!(v && String(v).trim());
}

export function runReadinessChecks(opts?: { includeFirebaseProbe?: boolean }): {
  checks: ReadinessCheck[];
  summary: { pass: number; warn: number; fail: number; requiredFails: number; readyForProd: boolean };
  nodeEnv: string;
  appVersion?: string;
  appBuild?: string;
} {
  const checks: ReadinessCheck[] = [];
  const env = (process.env.NODE_ENV || "development").toLowerCase();
  const isProd = env === "production";

  const add = (c: ReadinessCheck) => checks.push(c);

  // --- Core ---
  add({
    id: "jwt_secret",
    category: "Auth",
    label: "JWT_SECRET set & not default",
    status:
      !present(process.env.JWT_SECRET)
        ? "fail"
        : /fallback|change|your_super_secret/i.test(process.env.JWT_SECRET || "")
          ? "fail"
          : process.env.JWT_SECRET!.length < 32
            ? "warn"
            : "pass",
    detail: !present(process.env.JWT_SECRET)
      ? "JWT_SECRET missing"
      : process.env.JWT_SECRET!.length < 32
        ? "JWT_SECRET should be ≥32 characters"
        : "OK",
    requiredForProd: true,
  });

  add({
    id: "node_env",
    category: "Core",
    label: "NODE_ENV",
    status: isProd ? "pass" : "warn",
    detail: `NODE_ENV=${env}`,
    requiredForProd: true,
  });

  add({
    id: "cors",
    category: "Core",
    label: "APP_URL / CORS origins",
    status: present(process.env.APP_URL) || present(process.env.CORS_ORIGINS) ? "pass" : isProd ? "fail" : "warn",
    detail: process.env.CORS_ORIGINS || process.env.APP_URL || "Not set — browsers may block API",
    requiredForProd: true,
  });

  // --- Firebase ---
  const fbJson = present(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const fbFile = present(process.env.FIREBASE_SERVICE_ACCOUNT_PATH) || present(process.env.GOOGLE_APPLICATION_CREDENTIALS);
  add({
    id: "firebase",
    category: "Data",
    label: "Firebase Admin credentials",
    status: fbJson || fbFile ? "pass" : "fail",
    detail: fbJson ? "FIREBASE_SERVICE_ACCOUNT_JSON set" : fbFile ? "FIREBASE_SERVICE_ACCOUNT_PATH / GOOGLE_APPLICATION_CREDENTIALS set" : "Missing Firebase credentials",
    requiredForProd: true,
  });

  // --- SaaS owner ---
  add({
    id: "saas_owner",
    category: "Auth",
    label: "SaaS owner password hash",
    status: present(process.env.SAAS_OWNER_PASSWORD_HASH) ? "pass" : isProd ? "fail" : "warn",
    detail: present(process.env.SAAS_OWNER_PASSWORD_HASH)
      ? `Owner ${process.env.SAAS_OWNER_EMAIL || "(email unset)"}`
      : "SAAS_OWNER_PASSWORD_HASH missing",
    requiredForProd: true,
  });

  // --- OTP / notify ---
  const twilio = present(process.env.TWILIO_ACCOUNT_SID) && present(process.env.TWILIO_AUTH_TOKEN);
  const resend = present(process.env.RESEND_API_KEY) && present(process.env.EMAIL_FROM || process.env.RESEND_FROM);
  add({
    id: "otp_pepper",
    category: "Security",
    label: "OTP_PEPPER",
    status: present(process.env.OTP_PEPPER) && !/change-me/i.test(process.env.OTP_PEPPER || "") ? "pass" : isProd ? "fail" : "warn",
    detail: present(process.env.OTP_PEPPER) ? "Set" : "Using weak/default pepper",
    requiredForProd: true,
  });
  add({
    id: "otp_dev_echo",
    category: "Security",
    label: "OTP_DEV_ECHO off in production",
    status: isProd && ["1","true","yes"].includes(String(process.env.OTP_DEV_ECHO||"").toLowerCase()) ? "fail" : "pass",
    detail: `OTP_DEV_ECHO=${process.env.OTP_DEV_ECHO || "false"}`,
    requiredForProd: true,
  });
  add({
    id: "sms",
    category: "Notify",
    label: "Twilio SMS",
    status: twilio ? "pass" : "warn",
    detail: twilio ? "Configured" : "Optional — PIN/OTP SMS will fail in prod without Twilio",
    requiredForProd: false,
  });
  add({
    id: "email",
    category: "Notify",
    label: "Resend email",
    status: resend ? "pass" : "warn",
    detail: resend ? "Configured" : "Optional — digests/OTP email need RESEND_API_KEY + EMAIL_FROM",
    requiredForProd: false,
  });

  // --- Payments ---
  const stripe = present(process.env.STRIPE_SECRET_KEY);
  const stripeWh = present(process.env.STRIPE_WEBHOOK_SECRET);
  add({
    id: "stripe",
    category: "Payments",
    label: "Stripe secret key",
    status: stripe ? "pass" : "warn",
    detail: stripe ? "Set" : "Sandbox-only without STRIPE_SECRET_KEY",
    requiredForProd: false,
  });
  add({
    id: "stripe_webhook",
    category: "Payments",
    label: "Stripe webhook secret",
    status: stripe && !stripeWh ? (isProd ? "fail" : "warn") : stripeWh || !stripe ? "pass" : "warn",
    detail: stripeWh ? "STRIPE_WEBHOOK_SECRET set" : "Required to verify webhooks in production",
    requiredForProd: false,
  });
  add({
    id: "payment_provider",
    category: "Payments",
    label: "PAYMENT_DEFAULT_PROVIDER",
    status:
      isProd && (process.env.PAYMENT_DEFAULT_PROVIDER || "sandbox") === "sandbox" ? "warn" : "pass",
    detail: process.env.PAYMENT_DEFAULT_PROVIDER || "sandbox",
    requiredForProd: false,
  });

  // --- HTTPS / URLs ---
  add({
    id: "app_url_https",
    category: "Core",
    label: "APP_URL uses HTTPS in production",
    status:
      isProd && present(process.env.APP_URL) && !String(process.env.APP_URL).startsWith("https")
        ? "fail"
        : "pass",
    detail: process.env.APP_URL || "unset",
    requiredForProd: true,
  });


  // --- Impersonation / support ---
  add({
    id: "impersonate_ttl",
    category: "Security",
    label: "IMPERSONATE_TTL",
    status: present(process.env.IMPERSONATE_TTL) ? "pass" : "warn",
    detail: process.env.IMPERSONATE_TTL || "default 15m (set IMPERSONATE_TTL e.g. 15m)",
    requiredForProd: false,
  });

  const readOnly = (process.env.IMPERSONATE_READ_ONLY || "").toLowerCase();
  add({
    id: "impersonate_readonly",
    category: "Security",
    label: "Login-As write policy",
    status: readOnly === "1" || readOnly === "true" ? "pass" : isProd ? "warn" : "pass",
    detail:
      readOnly === "1" || readOnly === "true"
        ? "IMPERSONATE_READ_ONLY enabled (safest for support)"
        : "Writes allowed under Login-As except password/2FA/deletes — set IMPERSONATE_READ_ONLY=1 for full read-only",
    requiredForProd: false,
  });


  const otpSkip = (process.env.OTP_SKIP_COOLDOWN || "").toLowerCase();
  add({
    id: "otp_skip_cooldown",
    category: "Security",
    label: "OTP_SKIP_COOLDOWN off in production",
    status: isProd && (otpSkip === "1" || otpSkip === "true") ? "fail" : "pass",
    detail: process.env.OTP_SKIP_COOLDOWN || "unset",
    requiredForProd: true,
  });

  add({
    id: "backup_at_rest",
    category: "Data",
    label: "BACKUP_AT_REST_KEY",
    status: present(process.env.BACKUP_AT_REST_KEY) ? "pass" : isProd ? "warn" : "warn",
    detail: present(process.env.BACKUP_AT_REST_KEY) ? "Cloud backup at-rest encryption key set" : "Optional but recommended for cloud backups",
    requiredForProd: false,
  });

  add({
    id: "admin_url",
    category: "Core",
    label: "ADMIN_URL",
    status: present(process.env.ADMIN_URL) ? "pass" : isProd ? "warn" : "warn",
    detail: process.env.ADMIN_URL || "Used for CORS and Login-As exit redirect",
    requiredForProd: false,
  });

  


  const pass = checks.filter((c) => c.status === "pass").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const fail = checks.filter((c) => c.status === "fail").length;
  const requiredFails = checks.filter((c) => c.requiredForProd && c.status === "fail").length;
  const readyForProd = isProd && requiredFails === 0;

  return {
    checks,
    summary: { pass, warn, fail, requiredFails, readyForProd },
    nodeEnv: env,
    appVersion: process.env.APP_VERSION || process.env.npm_package_version || '1.0.0',
    appBuild: process.env.APP_BUILD || undefined,
  };
}
