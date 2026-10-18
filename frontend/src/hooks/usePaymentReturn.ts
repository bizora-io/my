import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authFetch, hasAuthToken } from '../lib/apiClient';

export type PaymentReturnState = {
  status: 'idle' | 'checking' | 'succeeded' | 'pending' | 'failed' | 'cancelled';
  intentId?: string;
  message?: string;
  amount?: number;
};

/**
 * Handles ?pay=success|cancel after Stripe/bKash redirect.
 * Reads pending intent from sessionStorage and polls GET /api/payments/intents/:id.
 */
export function usePaymentReturn(opts?: { clearPending?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [state, setState] = useState<PaymentReturnState>({ status: 'idle' });

  useEffect(() => {
    const pay = searchParams.get('pay');
    if (!pay) return;

    const intentId = sessionStorage.getItem('bizora_pos_pending_intent') || sessionStorage.getItem('bizora_pending_intent');
    const amountRaw = sessionStorage.getItem('bizora_pos_pending_amount') || sessionStorage.getItem('bizora_pending_amount');

    if (pay === 'cancel') {
      setState({
        status: 'cancelled',
        intentId: intentId || undefined,
        message: 'Payment was cancelled. You can try again.',
        amount: amountRaw ? parseFloat(amountRaw) : undefined,
      });
      if (opts?.clearPending !== false) {
        sessionStorage.removeItem('bizora_pos_pending_intent');
        sessionStorage.removeItem('bizora_pos_pending_amount');
        sessionStorage.removeItem('bizora_pending_intent');
        sessionStorage.removeItem('bizora_pending_amount');
      }
      // strip query
      searchParams.delete('pay');
      setSearchParams(searchParams, { replace: true });
      return;
    }

    if (pay !== 'success') return;

    if (!intentId || !hasAuthToken()) {
      setState({
        status: 'pending',
        message: 'Payment returned successfully. Confirm the sale when the payment shows as paid.',
      });
      searchParams.delete('pay');
      setSearchParams(searchParams, { replace: true });
      return;
    }

    let cancelled = false;
    setState({ status: 'checking', intentId, amount: amountRaw ? parseFloat(amountRaw) : undefined });

    (async () => {
      // Poll a few times — webhook may lag behind redirect
      let lastStatus = 'pending';
      for (let i = 0; i < 5; i++) {
        try {
          const res = await authFetch(`/api/payments/intents/${intentId}`);
          if (res.ok) {
            const body = await res.json();
            const st = body?.intent?.status || 'pending';
            lastStatus = st;
            if (st === 'succeeded') {
              if (!cancelled) {
                setState({
                  status: 'succeeded',
                  intentId,
                  amount: body.intent.amount ?? (amountRaw ? parseFloat(amountRaw) : undefined),
                  message: 'Online payment confirmed. Complete checkout to record the sale.',
                });
              }
              break;
            }
          }
        } catch {
          /* retry */
        }
        await new Promise((r) => setTimeout(r, 1200));
      }
      if (!cancelled && lastStatus !== 'succeeded') {
        setState({
          status: 'pending',
          intentId,
          amount: amountRaw ? parseFloat(amountRaw) : undefined,
          message: 'Payment submitted. Waiting for provider confirmation (webhook). You can finish the sale once status is paid.',
        });
      }
      if (opts?.clearPending !== false) {
        sessionStorage.removeItem('bizora_pos_pending_intent');
        sessionStorage.removeItem('bizora_pos_pending_amount');
        sessionStorage.removeItem('bizora_pending_intent');
        sessionStorage.removeItem('bizora_pending_amount');
      }
      searchParams.delete('pay');
      setSearchParams(searchParams, { replace: true });
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
