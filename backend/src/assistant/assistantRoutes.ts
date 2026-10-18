import express from "express";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "../lib/jwtSecret.js";
import { processAssistantQuery, type AssistantUserContext } from "./assistantService.js";
import { ERP_CAPABILITY_REGISTRY } from "./capabilityRegistry.js";
import { getActingBusinessId } from "../api/middleware/auth.js";

const router = express.Router();

/**
 * Optional token extraction middleware.
 * If token is present and valid, populates req.user & req.businessId.
 * If absent, leaves req.user undefined rather than hard-failing with 401,
 * allowing the assistant to provide general ERP guidance to guests/public.
 */
function optionalAuthenticate(req: express.Request, _res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as any;
    (req as any).user = decoded;
    (req as any).businessId = getActingBusinessId(req);
  } catch {
    // Expired or invalid token, proceed without user context
  }
  next();
}

// POST /api/assistant/chat (also mounted at /api/ai/chat for backwards compatibility)
router.post("/chat", optionalAuthenticate, async (req, res) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const user = (req as any).user as AssistantUserContext | undefined;
    const businessId = (req as any).businessId || user?.businessId || (user?.role === "SHOP_OWNER" ? user?.id : undefined);

    const reply = await processAssistantQuery({
      message: message.trim(),
      user,
      businessId,
    });

    res.json(reply);
  } catch (error: any) {
    console.error("Bizora Assistant error:", error);
    res.status(500).json({
      error: "Failed to process assistant request",
      text: "I encountered an internal error while processing your request. Please try again or contact support.",
      source: "unsupported",
    });
  }
});

// GET /api/assistant/capabilities - returns active capabilities & suggested queries
router.get("/capabilities", optionalAuthenticate, (req, res) => {
  const user = (req as any).user;
  const isOwner = user?.role === "SHOP_OWNER" || user?.role === "SAAS_OWNER" || user?.role === "SAAS_ADMIN";
  const userPerms: string[] = Array.isArray(user?.permissions) ? user.permissions : [];

  const available = ERP_CAPABILITY_REGISTRY.map((c) => {
    const permitted = !c.requiredPermission || isOwner || userPerms.includes("all") || userPerms.includes(c.requiredPermission);
    return {
      id: c.id,
      module: c.module,
      name: c.name,
      description: c.description,
      permitted,
      samplePrompts: [...c.keywordsEn.slice(0, 2), ...c.keywordsBn.slice(0, 2)],
    };
  });

  res.json({
    totalCapabilities: available.length,
    capabilities: available,
  });
});

export default router;

