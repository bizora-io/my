/**
 * Bank statement CSV parsing + auto-match against ledger transactions.
 * Supports saved column maps and multi-transaction (batch) matching.
 */

export interface ParsedStatementLine {
  id: string;
  date: string;
  amount: number;
  description: string;
  reference?: string;
  externalId?: string;
  raw?: Record<string, string>;
}

export interface MatchCandidate {
  transactionId: string;
  score: number;
  reasons: string[];
}

export interface LineMatchResult {
  lineId: string;
  status: 'matched' | 'suggested' | 'unmatched';
  matchedTransactionIds: string[];
  suggestions: MatchCandidate[];
  confidence: number;
  /** True when one statement line matched sum of several book txs */
  multiMatch?: boolean;
}

export interface BookTxLite {
  id: string;
  date: string;
  amount: number;
  accountId?: string;
  paymentMethod?: string;
  type: string;
  entityName?: string;
  reference?: string;
  notes?: string;
  isDeleted?: boolean;
  bankReconciled?: boolean;
  reconciled?: boolean;
  bankStatementLineId?: string;
}

/** Explicit CSV column mapping (saved per bank profile). */
export interface CsvColumnMap {
  profileName: string;
  date: string;
  amount?: string;
  debit?: string;
  credit?: string;
  description?: string;
  reference?: string;
  /** Flip sign of amount column if bank uses opposite convention */
  invertAmount?: boolean;
}

const MAPS_KEY = 'bizora_bank_csv_maps';

export function loadColumnMaps(): CsvColumnMap[] {
  try {
    const raw = localStorage.getItem(MAPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveColumnMap(map: CsvColumnMap) {
  const all = loadColumnMaps().filter((m) => m.profileName !== map.profileName);
  all.push(map);
  localStorage.setItem(MAPS_KEY, JSON.stringify(all));
}

export function deleteColumnMap(profileName: string) {
  localStorage.setItem(
    MAPS_KEY,
    JSON.stringify(loadColumnMaps().filter((m) => m.profileName !== profileName))
  );
}

const DATE_KEYS = ['date', 'txn date', 'transaction date', 'value date', 'posted', 'booking date', 'তারিখ'];
const AMOUNT_KEYS = ['amount', 'txn amount', 'transaction amount', 'value', 'sum', 'পরিমাণ'];
const DEBIT_KEYS = ['debit', 'withdrawal', 'dr', 'out', 'paid out'];
const CREDIT_KEYS = ['credit', 'deposit', 'cr', 'in', 'paid in'];
const DESC_KEYS = ['description', 'narration', 'particulars', 'details', 'memo', 'remark', 'বিবরণ'];
const REF_KEYS = ['reference', 'ref', 'cheque', 'check no', 'trx id', 'transaction id', 'txn id', 'utr'];

function normHeader(h: string) {
  return h.trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function pickCol(headers: string[], keys: string[]): string | null {
  const normalized = headers.map((h) => ({ raw: h, n: normHeader(h) }));
  for (const k of keys) {
    const hit = normalized.find((h) => h.n === k || h.n.includes(k));
    if (hit) return hit.raw;
  }
  return null;
}

/** Auto-detect a column map from headers (for UI prefill). */
export function detectColumnMap(headers: string[]): Partial<CsvColumnMap> {
  return {
    date: pickCol(headers, DATE_KEYS) || undefined,
    amount: pickCol(headers, AMOUNT_KEYS) || undefined,
    debit: pickCol(headers, DEBIT_KEYS) || undefined,
    credit: pickCol(headers, CREDIT_KEYS) || undefined,
    description: pickCol(headers, DESC_KEYS) || undefined,
    reference: pickCol(headers, REF_KEYS) || undefined,
  };
}

function parseDate(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
  if (m) {
    let y = m[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t).toISOString().slice(0, 10);
  return null;
}

function parseAmount(raw: string): number | null {
  if (raw == null || raw === '') return null;
  let s = String(raw).trim();
  const neg = /^\(.*\)$/.test(s) || s.startsWith('-');
  s = s.replace(/[(),\s৳$€£]/g, '').replace(/,/g, '');
  const n = parseFloat(s);
  if (Number.isNaN(n)) return null;
  return neg ? -Math.abs(n) : n;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else inQ = false;
      } else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') {
        row.push(cur);
        cur = '';
      } else if (c === '\n' || c === '\r') {
        if (c === '\r' && text[i + 1] === '\n') i++;
        row.push(cur);
        if (row.some((x) => x.trim() !== '')) rows.push(row);
        row = [];
        cur = '';
      } else cur += c;
    }
  }
  row.push(cur);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

export function parseBankCsv(
  text: string,
  map?: Partial<CsvColumnMap> | null
): { lines: ParsedStatementLine[]; headers: string[]; error?: string; usedMap: Partial<CsvColumnMap> } {
  const rows = parseCsv(text);
  if (rows.length < 2) {
    return { lines: [], headers: [], error: 'CSV needs a header row and at least one data row.', usedMap: {} };
  }

  const headers = rows[0].map((h) => h.trim());
  const auto = detectColumnMap(headers);
  const dateCol = map?.date || auto.date || null;
  const amountCol = map?.amount || auto.amount || null;
  const debitCol = map?.debit || auto.debit || null;
  const creditCol = map?.credit || auto.credit || null;
  const descCol = map?.description || auto.description || null;
  const refCol = map?.reference || auto.reference || null;
  const invert = !!map?.invertAmount;

  const usedMap: Partial<CsvColumnMap> = {
    date: dateCol || undefined,
    amount: amountCol || undefined,
    debit: debitCol || undefined,
    credit: creditCol || undefined,
    description: descCol || undefined,
    reference: refCol || undefined,
    invertAmount: invert,
  };

  if (!dateCol) return { lines: [], headers, error: 'Could not detect a Date column. Map it manually.', usedMap };
  if (!amountCol && !debitCol && !creditCol) {
    return { lines: [], headers, error: 'Could not detect Amount or Debit/Credit columns.', usedMap };
  }

  const lines: ParsedStatementLine[] = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = row[idx] ?? '';
    });
    const date = parseDate(obj[dateCol] || '');
    if (!date) continue;

    let amount: number | null = null;
    if (amountCol) amount = parseAmount(obj[amountCol]);
    if (amount == null && (debitCol || creditCol)) {
      const dr = debitCol ? parseAmount(obj[debitCol]) : null;
      const cr = creditCol ? parseAmount(obj[creditCol]) : null;
      if (cr != null && cr !== 0) amount = Math.abs(cr);
      else if (dr != null && dr !== 0) amount = -Math.abs(dr);
      else amount = 0;
    }
    if (amount == null || amount === 0) continue;
    if (invert) amount = -amount;

    const description = descCol ? obj[descCol] : headers.map((h) => obj[h]).filter(Boolean).join(' ');
    const reference = refCol ? obj[refCol] : undefined;
    const externalId = reference || `${date}|${amount}|${description.slice(0, 40)}`;

    lines.push({
      id: `sl-${i}-${Date.now().toString(36)}`,
      date,
      amount,
      description: description.trim(),
      reference: reference?.trim() || undefined,
      externalId,
      raw: obj,
    });
  }

  return { lines, headers, usedMap };
}

function dayDiff(a: string, b: string): number {
  return Math.abs(Date.parse(a) - Date.parse(b)) / (24 * 60 * 60 * 1000);
}

function textScore(a: string, b: string): number {
  const ta = a.toLowerCase().split(/\W+/).filter((x) => x.length > 2);
  const tb = new Set(b.toLowerCase().split(/\W+/).filter((x) => x.length > 2));
  if (!ta.length || !tb.size) return 0;
  let hit = 0;
  ta.forEach((t) => {
    if (tb.has(t)) hit++;
  });
  return hit / Math.max(ta.length, 1);
}

function signedBookAmount(tx: BookTxLite): number {
  const amt = Math.abs(Number(tx.amount) || 0);
  if (['Sale', 'Income', 'Purchase Return', 'Due'].includes(tx.type)) return amt;
  if (['Purchase', 'Expense', 'Sales Return', 'Salary', 'Supplier Payment'].includes(tx.type)) return -amt;
  return amt;
}

/**
 * Greedy subset: find up to maxParts unused txs in date window whose signed amounts sum to target.
 */
function findMultiMatch(
  target: number,
  pool: BookTxLite[],
  used: Set<string>,
  lineDate: string,
  window: number,
  maxParts = 8
): string[] | null {
  const candidates = pool
    .filter((t) => !used.has(t.id) && dayDiff(t.date.slice(0, 10), lineDate) <= window)
    .map((t) => ({ id: t.id, signed: signedBookAmount(t) }))
    .filter((t) => Math.sign(t.signed || 1) === Math.sign(target || 1) || target === 0)
    .sort((a, b) => Math.abs(b.signed) - Math.abs(a.signed));

  if (!candidates.length) return null;

  // Try exact single already handled elsewhere; here 2+ parts
  const targetAbs = Math.abs(target);

  // Greedy: take largest that fit
  const picked: string[] = [];
  let sum = 0;
  for (const c of candidates) {
    if (picked.length >= maxParts) break;
    const next = sum + Math.abs(c.signed);
    if (next <= targetAbs + 0.009) {
      picked.push(c.id);
      sum = next;
      if (Math.abs(sum - targetAbs) < 0.02) return picked.length >= 2 ? picked : null;
    }
  }

  // Small DFS for better fit when greedy fails (limited)
  const limit = Math.min(candidates.length, 12);
  const slice = candidates.slice(0, limit);
  let best: string[] | null = null;

  function dfs(start: number, acc: string[], accSum: number) {
    if (Math.abs(accSum - targetAbs) < 0.02 && acc.length >= 2) {
      best = [...acc];
      return true;
    }
    if (acc.length >= maxParts || accSum > targetAbs + 0.02) return false;
    for (let i = start; i < slice.length; i++) {
      if (dfs(i + 1, [...acc, slice[i].id], accSum + Math.abs(slice[i].signed))) return true;
    }
    return false;
  }
  dfs(0, [], 0);
  return best;
}

export function matchStatementToBooks(
  lines: ParsedStatementLine[],
  txs: BookTxLite[],
  accountId: string,
  opts?: {
    dateWindowDays?: number;
    enableMultiMatch?: boolean;
    /** Absolute amount tolerance (default 0.05) for near-matches → suggested */
    amountTolerance?: number;
    /** Include already bank-reconciled book txs (default false) */
    includeReconciled?: boolean;
  }
): LineMatchResult[] {
  const window = opts?.dateWindowDays ?? 2;
  const enableMulti = opts?.enableMultiMatch !== false;
  const tol = opts?.amountTolerance ?? 0.05;
  const includeRec = opts?.includeReconciled === true;
  const pool = txs.filter(
    (t) =>
      !t.isDeleted &&
      t.accountId === accountId &&
      t.paymentMethod !== 'Due' &&
      (includeRec || (!t.bankReconciled && !t.reconciled && !t.bankStatementLineId))
  );

  const used = new Set<string>();
  const results: LineMatchResult[] = [];

  for (const line of lines) {
    const candidates: MatchCandidate[] = [];

    for (const tx of pool) {
      if (used.has(tx.id)) continue;
      const bookSigned = signedBookAmount(tx);
      const amtDiff = Math.abs(Math.abs(bookSigned) - Math.abs(line.amount));
      if (amtDiff > Math.max(tol, 0.009) + 1e-9) continue;
      if (bookSigned !== 0 && line.amount !== 0 && Math.sign(bookSigned) !== Math.sign(line.amount)) {
        continue;
      }
      const partialAmount = amtDiff > 0.009;
      const dd = dayDiff(tx.date.slice(0, 10), line.date);
      if (dd > window) continue;

      let score = partialAmount ? 0.35 : 0.5;
      const reasons: string[] = [partialAmount ? 'partial_amount' : 'amount'];
      if (partialAmount) score -= Math.min(0.15, amtDiff / Math.max(Math.abs(line.amount), 1) * 0.5);
      score += Math.max(0, (window - dd) / window) * 0.25;
      if (dd <= 0.5) reasons.push('same_day');

      if (line.reference && (tx.reference || tx.notes || '')) {
        const refBlob = `${tx.reference || ''} ${tx.notes || ''}`.toLowerCase();
        if (
          refBlob.includes(line.reference.toLowerCase()) ||
          line.reference.toLowerCase().includes((tx.reference || '').toLowerCase())
        ) {
          score += 0.3;
          reasons.push('reference');
        }
      }

      const ts = textScore(line.description, `${tx.entityName || ''} ${tx.notes || ''} ${tx.type}`);
      if (ts > 0.2) {
        score += ts * 0.2;
        reasons.push('description');
      }

      candidates.push({ transactionId: tx.id, score: Math.min(1, score), reasons });
    }

    candidates.sort((a, b) => b.score - a.score);

    const topPartial = (candidates[0]?.reasons || []).includes('partial_amount');
    if (candidates.length === 1 && candidates[0].score >= 0.55 && !topPartial) {
      used.add(candidates[0].transactionId);
      results.push({
        lineId: line.id,
        status: 'matched',
        matchedTransactionIds: [candidates[0].transactionId],
        suggestions: candidates,
        confidence: candidates[0].score,
      });
      continue;
    }

    if (
      candidates.length > 0 &&
      !topPartial &&
      candidates[0].score >= 0.75 &&
      (candidates.length === 1 || candidates[0].score - candidates[1].score > 0.1)
    ) {
      used.add(candidates[0].transactionId);
      results.push({
        lineId: line.id,
        status: 'matched',
        matchedTransactionIds: [candidates[0].transactionId],
        suggestions: candidates.slice(0, 5),
        confidence: candidates[0].score,
      });
      continue;
    }

    // Multi-match: batch deposit / combined payment
    if (enableMulti && candidates.length === 0) {
      const multi = findMultiMatch(line.amount, pool, used, line.date, window);
      if (multi && multi.length >= 2) {
        multi.forEach((id) => used.add(id));
        results.push({
          lineId: line.id,
          status: 'matched',
          matchedTransactionIds: multi,
          suggestions: multi.map((id) => ({ transactionId: id, score: 0.7, reasons: ['multi_sum'] })),
          confidence: 0.7,
          multiMatch: true,
        });
        continue;
      }
    }

    if (candidates.length > 0) {
      results.push({
        lineId: line.id,
        status: 'suggested',
        matchedTransactionIds: [],
        suggestions: candidates.slice(0, 5),
        confidence: candidates[0].score,
      });
    } else {
      results.push({
        lineId: line.id,
        status: 'unmatched',
        matchedTransactionIds: [],
        suggestions: [],
        confidence: 0,
      });
    }
  }

  return results;
}

export function statementTotals(lines: ParsedStatementLine[]) {
  const inflow = lines.filter((l) => l.amount > 0).reduce((s, l) => s + l.amount, 0);
  const outflow = lines.filter((l) => l.amount < 0).reduce((s, l) => s + l.amount, 0);
  return { inflow, outflow, net: inflow + outflow, count: lines.length };
}


/** Aggregate match outcomes for UI / session save. */
export function summarizeMatchResults(results: LineMatchResult[]) {
  const matched = results.filter((r) => r.status === 'matched').length;
  const suggested = results.filter((r) => r.status === 'suggested').length;
  const unmatched = results.filter((r) => r.status === 'unmatched').length;
  const multi = results.filter((r) => r.multiMatch).length;
  const partial = results.filter((r) =>
    (r.suggestions || []).some((s) => (s.reasons || []).includes('partial_amount'))
  ).length;
  return { matched, suggested, unmatched, multi, partial, total: results.length };
}
