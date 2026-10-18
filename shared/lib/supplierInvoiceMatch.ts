/**
 * Match supplier invoices to purchase orders and purchase ledger entries.
 */

export interface SupplierInvoiceLine {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  supplierName: string;
  amount: number;
  reference?: string;
  notes?: string;
}

export interface PurchaseBookLite {
  id: string;
  kind: 'po' | 'purchase';
  date: string;
  supplierName: string;
  amount: number;
  reference?: string;
  status?: string;
  alreadyMatched?: boolean;
}

export interface InvoiceMatchCandidate {
  bookId: string;
  kind: 'po' | 'purchase';
  score: number;
  reasons: string[];
}

export interface InvoiceMatchResult {
  invoiceId: string;
  status: 'matched' | 'suggested' | 'unmatched';
  matchedBookIds: string[];
  matchedKind?: 'po' | 'purchase';
  suggestions: InvoiceMatchCandidate[];
  confidence: number;
}

function norm(s: string) {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function dayDiff(a: string, b: string): number {
  const da = Date.parse(a.slice(0, 10));
  const db = Date.parse(b.slice(0, 10));
  if (Number.isNaN(da) || Number.isNaN(db)) return 999;
  return Math.abs(da - db) / (24 * 60 * 60 * 1000);
}

function nameScore(a: string, b: string): number {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.7;
  const ta = new Set(na.split(' ').filter((x) => x.length > 2));
  const tb = nb.split(' ').filter((x) => x.length > 2);
  if (!ta.size || !tb.length) return 0;
  let hit = 0;
  tb.forEach((t) => {
    if (ta.has(t)) hit++;
  });
  return hit / Math.max(tb.length, 1);
}

/**
 * Auto-match invoices to open POs and Purchase transactions.
 */
export function matchSupplierInvoices(
  invoices: SupplierInvoiceLine[],
  books: PurchaseBookLite[],
  opts?: { dateWindowDays?: number; amountTolerance?: number }
): InvoiceMatchResult[] {
  const window = opts?.dateWindowDays ?? 14;
  const tol = opts?.amountTolerance ?? 0.5;
  const used = new Set<string>();
  const results: InvoiceMatchResult[] = [];

  for (const inv of invoices) {
    const candidates: InvoiceMatchCandidate[] = [];

    for (const book of books) {
      if (used.has(book.id) || book.alreadyMatched) continue;
      if (book.kind === 'po' && book.status === 'Cancelled') continue;

      const amtDiff = Math.abs(Number(book.amount) - Number(inv.amount));
      if (amtDiff > tol && !(Number(book.amount) > 0 && Math.abs(amtDiff / book.amount) < 0.01)) {
        // allow 1% relative or absolute tol
        if (amtDiff > Math.max(tol, Number(inv.amount) * 0.01)) continue;
      }

      const dd = dayDiff(book.date, inv.date);
      if (dd > window) continue;

      const ns = nameScore(book.supplierName, inv.supplierName);
      if (ns < 0.25 && norm(inv.supplierName) && norm(book.supplierName)) continue;

      let score = 0.35;
      const reasons: string[] = ['amount'];
      score += Math.max(0, (window - dd) / window) * 0.2;
      if (dd <= 1) reasons.push('near_date');
      score += ns * 0.3;
      if (ns >= 0.7) reasons.push('supplier');

      if (inv.reference && book.reference) {
        const ir = norm(inv.reference);
        const br = norm(book.reference);
        if (ir && br && (ir.includes(br) || br.includes(ir) || ir === br)) {
          score += 0.25;
          reasons.push('reference');
        }
      }
      if (inv.invoiceNumber && book.reference && norm(book.reference).includes(norm(inv.invoiceNumber))) {
        score += 0.15;
        reasons.push('invoice_no');
      }

      candidates.push({
        bookId: book.id,
        kind: book.kind,
        score: Math.min(1, score),
        reasons,
      });
    }

    candidates.sort((a, b) => b.score - a.score);

    if (
      candidates.length &&
      candidates[0].score >= 0.72 &&
      (candidates.length === 1 || candidates[0].score - (candidates[1]?.score || 0) > 0.08)
    ) {
      used.add(candidates[0].bookId);
      results.push({
        invoiceId: inv.id,
        status: 'matched',
        matchedBookIds: [candidates[0].bookId],
        matchedKind: candidates[0].kind,
        suggestions: candidates.slice(0, 5),
        confidence: candidates[0].score,
      });
    } else if (candidates.length && candidates[0].score >= 0.45) {
      results.push({
        invoiceId: inv.id,
        status: 'suggested',
        matchedBookIds: [],
        suggestions: candidates.slice(0, 5),
        confidence: candidates[0].score,
      });
    } else {
      results.push({
        invoiceId: inv.id,
        status: 'unmatched',
        matchedBookIds: [],
        suggestions: candidates.slice(0, 3),
        confidence: candidates[0]?.score || 0,
      });
    }
  }

  return results;
}

/** Parse simple CSV: invoiceNumber,date,supplier,amount,reference */
export function parseSupplierInvoiceCsv(text: string): {
  lines: SupplierInvoiceLine[];
  error?: string;
} {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((r) => r.split(',').map((c) => c.trim().replace(/^"|"$/g, '')));
  if (rows.length < 2) return { lines: [], error: 'Need header + data rows' };

  const header = rows[0].map((h) => h.toLowerCase());
  const idx = (keys: string[]) => {
    for (const k of keys) {
      const i = header.findIndex((h) => h === k || h.includes(k));
      if (i >= 0) return i;
    }
    return -1;
  };

  const iNum = idx(['invoice', 'inv no', 'invoice number', 'bill']);
  const iDate = idx(['date']);
  const iSup = idx(['supplier', 'vendor', 'name']);
  const iAmt = idx(['amount', 'total', 'value']);
  const iRef = idx(['reference', 'ref', 'po']);

  if (iDate < 0 || iAmt < 0) {
    return { lines: [], error: 'CSV needs Date and Amount columns' };
  }

  const lines: SupplierInvoiceLine[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    if (!row.some((c) => c)) continue;
    const amount = parseFloat((row[iAmt] || '').replace(/,/g, ''));
    if (!amount || Number.isNaN(amount)) continue;
    let date = row[iDate] || '';
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(date)) {
      const p = date.split(/[\/\-]/);
      const y = p[2].length === 2 ? `20${p[2]}` : p[2];
      date = `${y}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
    } else if (date.length >= 10) date = date.slice(0, 10);

    lines.push({
      id: `sinv-${r}-${Date.now().toString(36)}`,
      invoiceNumber: iNum >= 0 ? row[iNum] || `INV-${r}` : `INV-${r}`,
      date,
      supplierName: iSup >= 0 ? row[iSup] || '' : '',
      amount,
      reference: iRef >= 0 ? row[iRef] : undefined,
    });
  }
  return { lines };
}
