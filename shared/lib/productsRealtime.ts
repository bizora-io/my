/**
 * Live product catalog via Firestore onSnapshot.
 * Falls back silently if client Firestore is unavailable (API poll still works).
 */
import { collection, onSnapshot, type Unsubscribe } from 'firebase/firestore';
import { db } from './firebase';

export type ProductSnapshotHandler = (products: any[]) => void;

export function subscribeBusinessProducts(
  businessId: string,
  onData: ProductSnapshotHandler,
  onError?: (err: Error) => void
): Unsubscribe {
  if (!db || !businessId) {
    return () => {};
  }
  try {
    const colRef = collection(db, 'businesses', businessId, 'products');
    return onSnapshot(
      colRef,
      (snap) => {
        const products = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        onData(products);
      },
      (err) => {
        console.warn('[productsRealtime] snapshot error:', err.message);
        onError?.(err);
      }
    );
  } catch (e: any) {
    console.warn('[productsRealtime] subscribe failed', e?.message || e);
    return () => {};
  }
}
