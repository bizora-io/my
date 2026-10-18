/**
 * VAT / sales-tax summary from ledger transactions.
 * Uses details.tax when present; falls back to 0 (not inventing rates).
 */

export type VatTxLike = {
  id: string;
  date?: string;
  type?: string;
  amount?: number;
  entityName?: string;
  reference?: string;
  isDeleted?: boolean;
  details?: { tax?: number; subtotal?: number; discount?: number };
};

export type VatLine = {
  id: string;
  date: string;
  type: string;
  party: string;
  reference: string;
  net: number;
  tax: number;
  gross: number;
  direction: 'output' | 'input';
};

export type VatSummary = {
  outputLines: VatLine[];
  inputLines: VatLine[];
  outputTax: number;
  inputTax: number;
  /** Sales returns tax (reduces output) */
  outputCredit: number;
  /** Purchase returns tax (reduces input) */
  inputCredit: number;
  netOutputTax: number;
  netInputTax: number;
  /** Positive => payable to authority; negative => refundable / credit */
  netPayable: number;
  taxableSales: number;
  taxablePurchases: number;
};

const r2 = (n: number) => Math.round((n || 0) * 100) / 100;

export function lineNet(tx: VatTxLike): number {
  const sub = Number(tx.details?.subtotal);
  if (!Number.isNaN(sub) && sub !== 0) return r2(sub);
  const tax = Number(tx.details?.tax) || 0;
  const gross = Number(tx.amount) || 0;
  return r2(Math.max(0, gross - tax));
}

export function buildVatSummary(transactions: VatTxLike[]): VatSummary {
  const outputLines: VatLine[] = [];
  const inputLines: VatLine[] = [];
  let outputTax = 0;
  let inputTax = 0;
  let outputCredit = 0;
  let inputCredit = 0;
  let taxableSales = 0;
  let taxablePurchases = 0;

  for (const t of transactions) {
    if (t.isDeleted) continue;
    const tax = r2(Number(t.details?.tax) || 0);
    const net = lineNet(t);
    const gross = r2(Number(t.amount) || net + tax);
    const base = {
      id: t.id,
      date: String(t.date || '').slice(0, 10),
      type: String(t.type || ''),
      party: t.entityName || '—',
      reference: t.reference || t.id,
      net,
      tax,
      gross,
    };

    if (t.type === 'Sale') {
      outputTax += tax;
      taxableSales += net;
      outputLines.push({ ...base, direction: 'output' });
    } else if (t.type === 'Sales Return') {
      outputCredit += tax;
      taxableSales -= net;
      outputLines.push({ ...base, net: -net, tax: -tax, gross: -gross, direction: 'output' });
    } else if (t.type === 'Purchase') {
      inputTax += tax;
      taxablePurchases += net;
      inputLines.push({ ...base, direction: 'input' });
    } else if (t.type === 'Purchase Return') {
      inputCredit += tax;
      taxablePurchases -= net;
      inputLines.push({ ...base, net: -net, tax: -tax, gross: -gross, direction: 'input' });
    } else if (t.type === 'Expense' && tax > 0) {
      // Recoverable VAT on expenses (when recorded)
      inputTax += tax;
      taxablePurchases += net;
      inputLines.push({ ...base, type: 'Expense', direction: 'input' });
    }
  }

  const netOutputTax = r2(outputTax - outputCredit);
  const netInputTax = r2(inputTax - inputCredit);
  return {
    outputLines,
    inputLines,
    outputTax: r2(outputTax),
    inputTax: r2(inputTax),
    outputCredit: r2(outputCredit),
    inputCredit: r2(inputCredit),
    netOutputTax,
    netInputTax,
    netPayable: r2(netOutputTax - netInputTax),
    taxableSales: r2(taxableSales),
    taxablePurchases: r2(taxablePurchases),
  };
}

export function vatSummaryToCsv(summary: VatSummary): string {
  const esc = (v: any) => {
    const s = v === undefined || v === null ? '' : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = [
    ['Section', 'Date', 'Type', 'Party', 'Reference', 'Net', 'VAT', 'Gross'],
    ...summary.outputLines.map((l) => [
      'Output', l.date, l.type, l.party, l.reference, l.net, l.tax, l.gross,
    ].map(esc)),
    ...summary.inputLines.map((l) => [
      'Input', l.date, l.type, l.party, l.reference, l.net, l.tax, l.gross,
    ].map(esc)),
    [],
    ['Metric', 'Amount'],
    ['Taxable sales (net)', summary.taxableSales],
    ['Output VAT', summary.netOutputTax],
    ['Taxable purchases (net)', summary.taxablePurchases],
    ['Input VAT', summary.netInputTax],
    ['Net VAT payable/(refundable)', summary.netPayable],
  ];
  return rows.map((r) => (Array.isArray(r) ? r.join(',') : '')).join('\n');
}
