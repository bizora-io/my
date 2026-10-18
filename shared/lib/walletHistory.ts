/** Append a store-credit movement; keeps last 50 entries. */
export type WalletHistoryEntry = {
  id: string;
  date: string;
  amount: number;
  balance: number;
  note?: string;
  source?: string;
};

export function appendWalletHistory(
  existing: WalletHistoryEntry[] | undefined | null,
  entry: Omit<WalletHistoryEntry, 'id' | 'date'> & { id?: string; date?: string }
): WalletHistoryEntry[] {
  const prev = Array.isArray(existing) ? existing : [];
  const row: WalletHistoryEntry = {
    id: entry.id || `wh-${Date.now()}`,
    date: entry.date || new Date().toISOString(),
    amount: entry.amount,
    balance: entry.balance,
    note: entry.note,
    source: entry.source,
  };
  return [row, ...prev].slice(0, 50);
}

export function applyWalletDelta(
  currentBalance: number,
  delta: number
): number {
  const next = (Number(currentBalance) || 0) + delta;
  return Math.round(Math.max(0, next) * 100) / 100;
}
