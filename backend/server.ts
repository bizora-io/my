import "dotenv/config";
import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import usersRouter from "./src/api/users.js";
import { initChat } from "./src/lib/chatSocket.js";
import authRouter from "./src/api/auth.js";
import saasAuthRouter from "./src/api/saasAuth.js";
import productsRouter from "./src/api/products.js";
import transactionsRouter from "./src/api/transactions.js";
import entitiesRouter from "./src/api/entities.js";
import staffRouter from "./src/api/staff.js";
import employeesRouter, { employeeLoginRouter } from "./src/api/employees.js";
import { rawMaterialsRouter, bomsRouter, productionBatchesRouter } from "./src/api/manufacturing.js";
import { supportTicketsRouter, feedbacksRouter, marketingCampaignsRouter, financialAccountsRouter, onlineOrdersRouter, customerGroupsRouter } from "./src/api/support.js";
import storefrontRouter from "./src/api/storefront.js";
import couriersRouter from "./src/api/couriers.js";
import saasTicketsRouter from "./src/api/saasTickets.js";
import twoFactorRouter from "./src/api/twoFactor.js";
import businessSettingsRouter from "./src/api/businessSettings.js";
import suppliersRouter, { supplierAuthRouter } from "./src/api/suppliers.js";
import phoneVerificationRouter from "./src/api/phoneVerification.js";
import customerAuthRouter from "./src/api/customerAuth.js";
import businessAdminRouter from "./src/api/businessAdmin.js";
import platformConfigRouter from "./src/api/platformConfig.js";
import planRequestsRouter from "./src/api/planRequests.js";
import { quotationsRouter } from "./src/api/quotations.js";
import { kitchenOrdersRouter } from "./src/api/kitchenOrders.js";
import announcementsRouter, { publicAnnouncementsRouter } from "./src/api/announcements.js";
import revenueRouter from "./src/api/revenue.js";
import { purchaseOrdersRouter } from "./src/api/purchaseOrders.js";
import { stockTransfersRouter } from "./src/api/stockTransfers.js";
import { departmentsRouter, designationsRouter, workShiftsRouter, holidaysRouter } from "./src/api/hrm.js";
import subscriptionMigrationsRouter from "./src/api/subscriptionMigrations.js";
import invoiceTemplatesRouter from "./src/api/invoiceTemplates.js";
import notificationsRouter from "./src/api/notifications.js";
import warehousesRouter from "./src/api/warehouses.js";
import { giftCardsRouter } from "./src/api/giftCards.js";
import backupsRouter from "./src/api/backups.js";
import { payrollRunsRouter } from "./src/api/payroll.js";
import { journalEntriesRouter, leaveRequestsRouter } from "./src/api/accounting.js";
import paymentsRouter from "./src/api/payments.js";
import { bankStatementsRouter } from "./src/api/bankReconcile.js";
import webhooksRouter from "./src/api/webhooks.js";
import exchangeRatesRouter from "./src/api/exchangeRates.js";
import consolidationRouter from "./src/api/consolidation.js";
import productionOpsRouter from "./src/api/productionOps.js";
import fefoRouter from "./src/api/fefo.js";
import { getDb } from "./src/lib/firebaseAdmin.js";
import { exportPlatformSnapshot } from "./src/lib/fullTenantExport.js";
import { encryptAtRest } from "./src/lib/backupAtRest.js";
import assistantRouter from "./src/assistant/assistantRoutes.js";

// This server is a pure API now — the frontend and admin apps are separate
// Vite projects (see ../frontend and ../admin) that call this API over HTTP.
// No more Vite dev-middleware / static file serving lives here.

async function startAutoPlatformBackupLoop() {
  const hours = Number(process.env.AUTO_PLATFORM_BACKUP_HOURS ?? 12);
  if (!hours || hours < 1) {
    console.log("[auto-backup] Platform auto-backup off (AUTO_PLATFORM_BACKUP_HOURS=0)");
    return;
  }
  const ms = hours * 3600 * 1000;
  const run = async () => {
    try {
      const snap = await exportPlatformSnapshot();
      const sealed = encryptAtRest(JSON.stringify(snap));
      const id = `platform-auto-${Date.now()}`;
      await getDb().collection("backups").doc(id).set({
        id,
        label: `Auto platform ${new Date().toISOString().slice(0, 16)}`,
        source: "server-auto",
        createdAt: new Date().toISOString(),
        payload: sealed.stored,
        sizeChars: sealed.stored.length,
        atRestEncrypted: sealed.encrypted,
        businessCount: snap.businesses.length,
        meta: { kind: "platform", exportedAt: snap.exportedAt },
      });
      console.log("[auto-backup] Platform online backup saved:", id, "shops=", snap.businesses.length);
    } catch (e) {
      console.warn("[auto-backup] platform failed", e);
    }
  };
  setTimeout(run, 60_000); // first after 1 min uptime
  setInterval(run, ms);
  console.log(`[auto-backup] Platform every ${hours}h`);
}

async function startServer() {
  // Hard fail unsafe production config (OTP must never echo in prod)
  if (process.env.NODE_ENV === "production") {
    if (process.env.OTP_DEV_ECHO === "true") {
      console.error("FATAL: OTP_DEV_ECHO=true is not allowed when NODE_ENV=production");
      process.exit(1);
    }
    const pepper = process.env.OTP_PEPPER || "";
    if (!pepper || /change-me/i.test(pepper)) {
      console.error("FATAL: Set a strong OTP_PEPPER in production (not default/change-me)");
      process.exit(1);
    }
    const jwt = process.env.JWT_SECRET || "";
    if (!jwt || jwt.length < 32 || /your_super_secret|change-me|fallback_secret/i.test(jwt)) {
      console.error("FATAL: Set a strong unique JWT_SECRET (≥32 chars) in production");
      process.exit(1);
    }
  }

  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Trust proxy for reverse proxy setups (like Cloud Run) to get correct client IPs
  app.set("trust proxy", 1);

  // Security Middlewares
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "*"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      hsts: process.env.NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      xFrameOptions: { action: "deny" },
    })
  );

  // Allow both the frontend and admin apps to call this API.
  // Set APP_URL / ADMIN_URL in production (comma-separated extra origins also supported via CORS_ORIGINS).
  const defaultProdOrigins = [
    'https://bizora.io',
    'https://www.bizora.io',
    'https://shop.bizora.io',
    'https://employee.bizora.io',
    'https://customer.bizora.io',
    'https://dashboard_admin.bizora.io',
  ];

  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? Array.from(new Set([
        ...defaultProdOrigins,
        process.env.APP_URL,
        process.env.ADMIN_URL,
        ...(process.env.CORS_ORIGINS?.split(',').map(s => s.trim()) ?? [])
      ].filter(Boolean)))
    : '*';

  app.use(cors({
    origin: allowedOrigins,
    credentials: true
  }));

  // Rate limiting to prevent brute-force attacks
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: process.env.NODE_ENV === "production" ? 200 : 2000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests from this IP, please try again later.", code: "rate_limit" },
    validate: false,
    skip: (req) => {
      // OTP request has its own cooldown; don't double-punish in development
      if (process.env.NODE_ENV !== "production" && req.path.includes("phone-verify")) return true;
      return false;
    },
  });
  app.use("/api/", limiter);

  // Stricter bucket for auth endpoints (brute-force)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: process.env.NODE_ENV === "production" ? 40 : 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many auth attempts. Try again later.", code: "auth_rate_limit" },
    validate: false,
  });
  app.use("/api/auth/", authLimiter);

  // Stripe needs the exact raw body for signature verification
  app.use(
    "/api/payments/webhook/stripe",
    express.raw({ type: "application/json", limit: "1mb" })
  );
  // Mark for debugging
  app.use("/api/payments/webhook/stripe", (req, _res, next) => {
    (req as any)._stripeWebhookRaw = true;
    next();
  });

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // API routes
  app.use("/api/users", usersRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/auth", saasAuthRouter);
  app.use("/api/products", productsRouter);
  app.use("/api/warehouses", warehousesRouter);
  app.use("/api/gift-cards", giftCardsRouter);
  app.use("/api/backups", backupsRouter);
  app.use("/api/payroll-runs", payrollRunsRouter);
  app.use("/api/journal-entries", journalEntriesRouter);
  app.use("/api/payments", paymentsRouter);
  app.use("/api/bank-statements", bankStatementsRouter);
  app.use("/api/exchange-rates", exchangeRatesRouter);
  app.use("/api/consolidation", consolidationRouter);
  app.use("/api/production", productionOpsRouter);
  app.use("/api/fefo", fefoRouter);
  app.use("/api/webhooks", webhooksRouter);
  app.use("/api/leave-requests", leaveRequestsRouter);
  app.use("/api/transactions", transactionsRouter);
  app.use("/api/entities", entitiesRouter);
  app.use("/api/staff", staffRouter);
  app.use("/api/employees", employeesRouter);
  app.use("/api/auth", employeeLoginRouter);
  app.use("/api/raw-materials", rawMaterialsRouter);
  app.use("/api/boms", bomsRouter);
  app.use("/api/production-batches", productionBatchesRouter);
  app.use("/api/support-tickets", supportTicketsRouter);
  app.use("/api/feedbacks", feedbacksRouter);
  app.use("/api/marketing-campaigns", marketingCampaignsRouter);
  app.use("/api/saas-tickets", saasTicketsRouter);
  app.use("/api/auth/2fa", twoFactorRouter);
  app.get("/api/business/config", (_req, res) => {
    res.json({
      systemVersion: "2.4.0",
      environment: process.env.NODE_ENV || "development",
      lastUpdated: new Date().toISOString(),
      status: "healthy",
    });
  });
  app.use("/api/business-settings", businessSettingsRouter);
  app.use("/api/suppliers", suppliersRouter);
  app.use("/api/auth", supplierAuthRouter);
  app.use("/api/auth/phone-verify", phoneVerificationRouter);
  app.use("/api/auth", customerAuthRouter);
  app.use("/api/financial-accounts", financialAccountsRouter);
  app.use("/api/online-orders", onlineOrdersRouter);
  app.use("/api/storefront", storefrontRouter);
  app.use("/api/couriers", couriersRouter);
  app.use("/api/customer-groups", customerGroupsRouter);
  app.use("/api/admin", businessAdminRouter);
  app.use("/api/platform", platformConfigRouter);
  app.use("/api/plan-requests", planRequestsRouter);
  app.use("/api/subscription-requests", planRequestsRouter);
  app.use("/api/quotations", quotationsRouter);
  app.use("/api/kitchen-orders", kitchenOrdersRouter);
  app.use("/api/admin/announcements", announcementsRouter);
  app.use("/api/announcements", publicAnnouncementsRouter);
  app.use("/api/admin/revenue", revenueRouter);
  app.use("/api/purchase-orders", purchaseOrdersRouter);
  app.use("/api/stock-transfers", stockTransfersRouter);
  app.use("/api/departments", departmentsRouter);
  app.use("/api/designations", designationsRouter);
  app.use("/api/work-shifts", workShiftsRouter);
  app.use("/api/holidays", holidaysRouter);
  app.use("/api/admin/subscriptions", subscriptionMigrationsRouter);
  app.use("/api/invoice-templates", invoiceTemplatesRouter);
  app.use("/api/notifications", notificationsRouter);

  // Bizora Context-Aware ERP Assistant (also mounts at /api/ai for existing client compatibility)
  app.use("/api/assistant", assistantRouter);
  app.use("/api/ai", assistantRouter);

  app.get("/api/business/config", async (req, res) => {
    try {
      const db = getDb();
      const [plansDoc, settingsDoc] = await Promise.all([
        db.collection("platformConfig").doc("subscriptionPlans").get(),
        db.collection("platformConfig").doc("settings").get(),
      ]);
      const plans = plansDoc.exists ? plansDoc.data() : {
        Basic: { limitStores: 1, limitUsers: 2, price: 0 },
        Pro: { limitStores: 3, limitUsers: 10, price: 29 },
        "Nexus Pro": { limitStores: 10, limitUsers: 50, price: 99 },
        Enterprise: { limitStores: 99, limitUsers: 999, price: 299 }
      };
      const settings = settingsDoc.exists ? settingsDoc.data() : {};

      res.json({
        taxRegions: [
          { id: "default", name: "Default (15% VAT)", rate: 15 },
          { id: "zero", name: "Zero Rated (0%)", rate: 0 },
          { id: "exempt", name: "Exempt (0%)", rate: 0 },
          { id: "custom", name: "Custom (10%)", rate: 10 }
        ],
        plans,
        supportedCurrencies: settings?.supportedCurrencies || ["BDT", "USD", "EUR", "GBP", "INR"],
        lastUpdated: new Date().toISOString(),
        systemVersion: "2.1.0-prod",
        environment: process.env.NODE_ENV || "production"
      });
    } catch (error) {
      console.error("Business config error:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  });

  app.get("/api/health/ready", async (_req, res) => {
    try {
      const { runReadinessChecks } = await import("./src/lib/readiness.js");
      const result = runReadinessChecks();
      const status = result.summary.fail > 0 ? 503 : 200;
      res.status(status).json({
        ok: result.summary.fail === 0,
        summary: result.summary,
        nodeEnv: result.nodeEnv,
        // ids only — no secret values
        checks: result.checks.map((c) => ({ id: c.id, status: c.status, category: c.category })),
      });
    } catch (e: any) {
      res.status(503).json({ ok: false, error: e?.message || "readiness failed" });
    }
  });

  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // 404 handler for unmatched API routes
  app.use((req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "Endpoint not found", code: "not_found" });
    }
    next();
  });

  // Centralized production error handler
  app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[Unhandled API Error]", {
      message: err?.message,
      stack: process.env.NODE_ENV !== "production" ? err?.stack : undefined,
      path: req.originalUrl,
      method: req.method,
    });

    if (err?.type === "entity.too.large") {
      return res.status(413).json({ error: "Request payload too large", code: "payload_too_large" });
    }

    const statusCode = typeof err?.status === "number" && err.status >= 400 && err.status < 600 ? err.status : 500;
    res.status(statusCode).json({
      error: process.env.NODE_ENV === "production" ? "Internal Server Error" : (err?.message || "Internal Server Error"),
      code: err?.code || "internal_error",
    });
  });

  // Wrap the Express app in a plain http.Server so Socket.io (real-time
  // chat - see chatSocket.ts) can share the same port instead of needing
  // a separate server/process.
  const httpServer = createServer(app);
  initChat(httpServer);

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Bizora API server (+ real-time chat) running on http://localhost:${PORT}`);
    void startAutoPlatformBackupLoop();
  });
}

startServer();
