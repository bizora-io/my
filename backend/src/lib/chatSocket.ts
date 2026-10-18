import type { Server as HttpServer } from "http";
import { Server as SocketIOServer, type Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { getJwtSecret } from "./jwtSecret.js";

interface SocketUser {
  id: string;
  email: string;
  role: string;
  businessId?: string;
}

let io: SocketIOServer | null = null;

function isSaasStaff(role: string) {
  const r = String(role || "").toUpperCase();
  return r === "SAAS_OWNER" || r === "SAAS_ADMIN";
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function initChat(httpServer: HttpServer) {
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? [process.env.APP_URL, process.env.ADMIN_URL, ...(process.env.CORS_ORIGINS?.split(",") ?? [])].filter(Boolean)
      : "*";

  io = new SocketIOServer(httpServer, {
    cors: { origin: allowedOrigins as any, credentials: true },
    maxHttpBufferSize: 1e6,
    // Admin + shop clients may use different ports; allow both transports
    transports: ["websocket", "polling"],
  });

  io.use((socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers?.authorization || "").replace(/^Bearer\s+/i, "");
      if (!token) return next(new Error("Unauthorized"));
      const decoded = jwt.verify(token, getJwtSecret()) as SocketUser & { typ?: string };
      // Reject only explicit pre-auth short tokens
      if ((decoded as any).preAuth === true) return next(new Error("Unauthorized"));
      if (!decoded.id || !decoded.role) return next(new Error("Unauthorized"));
      (socket as any).user = decoded;
      next();
    } catch (err: any) {
      next(new Error(err?.message || "Unauthorized"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const user: SocketUser = (socket as any).user;
    const role = String(user.role || "");

    if (isSaasStaff(role)) {
      socket.join("saas-staff");
      // Owner also gets a personal room for targeted pushes
      socket.join(`user:${user.id}`);
      console.log(`[socket] SaaS staff connected: ${user.id} role=${role}`);
    } else {
      const businessId = user.businessId || user.id;
      socket.join(`business:${businessId}`);
      socket.join(`user:${user.id}`);
      console.log(`[socket] Business connected: ${businessId}`);
    }

    socket.emit("sync:hello", {
      ok: true,
      role,
      rooms: isSaasStaff(role)
        ? ["saas-staff", `user:${user.id}`]
        : [`business:${user.businessId || user.id}`, `user:${user.id}`],
      at: new Date().toISOString(),
    });

    socket.on("chat:typing", ({ ticketId, businessId }: { ticketId: string; businessId: string }) => {
      const room = isSaasStaff(user.role) ? `business:${businessId}` : "saas-staff";
      socket.to(room).emit("chat:typing", { ticketId, from: user.role });
    });

    socket.on("sync:ping", (payload: { domain?: string; reason?: string } = {}) => {
      if (isSaasStaff(user.role)) {
        // Owner ping → all staff (noop mostly) or ignore
        return;
      }
      const businessId = user.businessId || user.id;
      socket.to(`business:${businessId}`).emit("sync:business", {
        domain: payload.domain || "all",
        reason: payload.reason || "peer_ping",
        fromUserId: user.id,
        at: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      // quiet
    });
  });

  return io;
}

export function broadcastTicketUpdate(ticket: any) {
  if (!io || !ticket) return;
  const businessId = ticket.business_id || ticket.businessId;
  const body = {
    domain: "tickets",
    reason: "ticket_update",
    businessId,
    payload: {
      ticket,
      ticketId: ticket.id,
      status: ticket.status,
    },
    at: new Date().toISOString(),
  };
  // Socket.IO multiple .to() = intersection; emit separately for union
  if (businessId) {
    io.to(`business:${businessId}`).emit("chat:ticket-update", ticket);
    io.to(`business:${businessId}`).emit("sync:business", body);
  }
  io.to("saas-staff").emit("chat:ticket-update", ticket);
  io.to("saas-staff").emit("sync:business", body);
}

export type BusinessSyncEvent = {
  domain: string;
  reason?: string;
  payload?: Record<string, unknown>;
  at?: string;
};

export function broadcastBusinessSync(businessId: string, event: BusinessSyncEvent) {
  if (!io || !businessId) return;
  const body = {
    ...event,
    businessId,
    at: event.at || new Date().toISOString(),
  };
  io.to(`business:${businessId}`).emit("sync:business", body);
  // Always notify SaaS owner/admin dashboards
  io.to("saas-staff").emit("sync:business", body);
}

export function broadcastUserSync(userId: string, event: BusinessSyncEvent) {
  if (!io || !userId) return;
  io.to(`user:${userId}`).emit("sync:business", {
    ...event,
    at: event.at || new Date().toISOString(),
  });
}

/** Push a platform-wide event to all connected SaaS staff (dashboard refresh). */
export function broadcastSaasStaff(event: BusinessSyncEvent) {
  if (!io) return;
  io.to("saas-staff").emit("sync:business", {
    ...event,
    at: event.at || new Date().toISOString(),
  });
}
