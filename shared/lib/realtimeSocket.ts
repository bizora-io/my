/**
 * Real-time business sync over Socket.IO (shared connection for shop + admin).
 */
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL, getAccessToken } from './apiClient';

export type SyncBusinessEvent = {
  domain: string;
  reason?: string;
  businessId?: string;
  payload?: Record<string, unknown>;
  at?: string;
  fromUserId?: string;
};

type Handlers = {
  onBusinessSync?: (ev: SyncBusinessEvent) => void;
  onTicketUpdate?: (ticket: any) => void;
  onHello?: (ev: { ok: boolean; rooms?: string[]; role?: string }) => void;
  onStatus?: (status: 'connected' | 'disconnected' | 'error') => void;
};

let sharedSocket: Socket | null = null;
let sharedToken: string | null = null;
const listeners = new Set<(ev: SyncBusinessEvent) => void>();
const helloListeners = new Set<(ev: any) => void>();
const ticketListeners = new Set<(ticket: any) => void>();
const statusListeners = new Set<(s: 'connected' | 'disconnected' | 'error') => void>();

export function getRealtimeSocket(): Socket | null {
  return sharedSocket;
}

export function ensureRealtimeSocket(): Socket | null {
  const token = getAccessToken() || (typeof localStorage !== 'undefined' ? localStorage.getItem('bizora_token') : null);
  if (!token) {
    if (sharedSocket) {
      sharedSocket.disconnect();
      sharedSocket = null;
      sharedToken = null;
    }
    return null;
  }

  if (sharedSocket && sharedToken === token) {
    if (!sharedSocket.connected) sharedSocket.connect();
    return sharedSocket;
  }

  if (sharedSocket) {
    sharedSocket.removeAllListeners();
    sharedSocket.disconnect();
    sharedSocket = null;
  }

  sharedToken = token;
  sharedSocket = io(API_BASE_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 30,
    reconnectionDelay: 800,
    timeout: 12000,
  });

  sharedSocket.on('connect', () => {
    statusListeners.forEach((fn) => fn('connected'));
  });
  sharedSocket.on('disconnect', () => {
    statusListeners.forEach((fn) => fn('disconnected'));
  });
  sharedSocket.on('connect_error', (err) => {
    console.warn('[realtime] connect_error:', err.message);
    statusListeners.forEach((fn) => fn('error'));
  });
  sharedSocket.on('sync:hello', (ev: any) => {
    helloListeners.forEach((fn) => {
      try { fn(ev); } catch { /* */ }
    });
  });
  sharedSocket.on('sync:business', (ev: SyncBusinessEvent) => {
    listeners.forEach((fn) => {
      try { fn(ev); } catch (e) {
        console.warn('sync listener error', e);
      }
    });
  });
  sharedSocket.on('chat:ticket-update', (ticket: any) => {
    ticketListeners.forEach((fn) => {
      try { fn(ticket); } catch (e) {
        console.warn('ticket listener error', e);
      }
    });
    // Also fan-out as business sync with full ticket for AdminPanel
    const ev: SyncBusinessEvent = {
      domain: 'tickets',
      reason: 'ticket_update',
      businessId: ticket?.business_id || ticket?.businessId,
      payload: { ticket, ticketId: ticket?.id, status: ticket?.status },
      at: new Date().toISOString(),
    };
    listeners.forEach((fn) => {
      try { fn(ev); } catch { /* */ }
    });
  });
  sharedSocket.on('notification:new', (notif: any) => {
    const ev: SyncBusinessEvent = {
      domain: 'notifications',
      reason: 'notification_created',
      payload: notif,
      at: new Date().toISOString(),
    };
    listeners.forEach((fn) => {
      try { fn(ev); } catch { /* */ }
    });
  });

  return sharedSocket;
}

export function subscribeBusinessSync(fn: (ev: SyncBusinessEvent) => void): () => void {
  listeners.add(fn);
  ensureRealtimeSocket();
  return () => { listeners.delete(fn); };
}

export function subscribeRealtimeHello(fn: (ev: any) => void): () => void {
  helloListeners.add(fn);
  ensureRealtimeSocket();
  return () => { helloListeners.delete(fn); };
}

export function subscribeTicketUpdate(fn: (ticket: any) => void): () => void {
  ticketListeners.add(fn);
  ensureRealtimeSocket();
  return () => { ticketListeners.delete(fn); };
}

export function subscribeRealtimeStatus(fn: (s: 'connected' | 'disconnected' | 'error') => void): () => void {
  statusListeners.add(fn);
  ensureRealtimeSocket();
  return () => { statusListeners.delete(fn); };
}

export function emitSyncPing(domain = 'all', reason = 'client_ping') {
  ensureRealtimeSocket()?.emit('sync:ping', { domain, reason });
}

export function useRealtimeSync(handlers: Handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const socket = ensureRealtimeSocket();
    if (!socket) return;

    const onHello = (ev: any) => handlersRef.current.onHello?.(ev);
    const onSync = (ev: SyncBusinessEvent) => handlersRef.current.onBusinessSync?.(ev);
    const onTicket = (ticket: any) => handlersRef.current.onTicketUpdate?.(ticket);
    const onStatus = (s: 'connected' | 'disconnected' | 'error') => handlersRef.current.onStatus?.(s);

    const u1 = subscribeBusinessSync(onSync);
    const u2 = subscribeRealtimeHello(onHello);
    const u3 = subscribeRealtimeStatus(onStatus);
    const u4 = subscribeTicketUpdate(onTicket);

    // Re-ensure on focus (token may have been set after mount)
    const onFocus = () => ensureRealtimeSocket();
    window.addEventListener('focus', onFocus);

    return () => {
      u1(); u2(); u3(); u4();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const ping = useCallback((domain?: string, reason?: string) => {
    emitSyncPing(domain, reason);
  }, []);

  return { ping, socket: sharedSocket };
}
