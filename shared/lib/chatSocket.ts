import { useEffect, useRef } from 'react';
import { ensureRealtimeSocket, type SyncBusinessEvent } from './realtimeSocket';

// Chat ticket updates ride the same Socket.IO connection as business sync.
export function useChatSocket(onTicketUpdate: (ticket: any) => void) {
  const callbackRef = useRef(onTicketUpdate);
  callbackRef.current = onTicketUpdate;

  useEffect(() => {
    const socket = ensureRealtimeSocket();
    if (!socket) return;

    const onTicket = (ticket: any) => callbackRef.current(ticket);
    socket.on('chat:ticket-update', onTicket);
    return () => {
      socket.off('chat:ticket-update', onTicket);
    };
  }, []);

  const notifyTyping = (ticketId: string, businessId: string) => {
    const socket = ensureRealtimeSocket();
    socket?.emit('chat:typing', { ticketId, businessId });
  };

  return { notifyTyping };
}
