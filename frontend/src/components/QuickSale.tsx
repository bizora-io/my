import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, LedgerEntry, FinancialAccount, resolveAccountForTender } from '../contexts/DataContext';
import {
  Zap,
  CreditCard,
  Delete,
  RotateCcw,
  Wallet,
  Landmark,
  Smartphone,
  Clock,
  TrendingUp,
  Percent,
  DollarSign,
  User,
  CheckCircle2,
  Printer,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ArrowRight,
  Receipt
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type PaymentMode = 'Cash' | 'Bank' | 'Mobile' | 'Due';
type ProfitInputMode = 'amount' | 'margin' | 'markup' | 'cost';

interface CompletedSaleSummary {
  id: string;
  reference: string;
  date: string;
  amount: number;
  paymentMethod: string;
  accountName?: string;
  amountPaid: number;
  dueAmount: number;
  tendered?: number;
  change?: number;
  customerName: string;
  profit?: number;
  cost?: number;
  marginPercent?: number;
}

const QuickSale: React.FC = () => {
  const { t, currencySymbol, language, formatMoney } = useSettings();
  const { addTransaction, financialAccounts, customers } = useData();
  const navigate = useNavigate();

  // Calculator states
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [isResult, setIsResult] = useState(false);
  const chargeInFlightRef = useRef(false);
  const [chargeBusy, setChargeBusy] = useState(false);

  // Payment & Account states
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Cash');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [partialPaidNow, setPartialPaidNow] = useState<string>('');

  // Customer state
  const [customerName, setCustomerName] = useState<string>('Walk-in Customer');
  const [customerMobile, setCustomerMobile] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Profit / Margin state
  const [profitEnabled, setProfitEnabled] = useState<boolean>(false);
  const [profitMode, setProfitMode] = useState<ProfitInputMode>('margin');
  const [profitAmount, setProfitAmount] = useState<string>('');
  const [marginPercent, setMarginPercent] = useState<string>('');
  const [markupPercent, setMarkupPercent] = useState<string>('');
  const [costAmount, setCostAmount] = useState<string>('');
  const [profitNote, setProfitNote] = useState<string>('');

  // Post-sale receipt modal
  const [completedSale, setCompletedSale] = useState<CompletedSaleSummary | null>(null);

  // Current numeric sale amount
  const currentSaleAmount = useMemo(() => {
    const val = parseFloat(display);
    return Number.isFinite(val) && val > 0 ? val : 0;
  }, [display]);

  // Available accounts matching tender or all accounts
  const matchingAccounts = useMemo(() => {
    if (!financialAccounts || financialAccounts.length === 0) return [];
    if (paymentMode === 'Cash') {
      return financialAccounts.filter(a => a.type === 'Cash');
    }
    if (paymentMode === 'Bank') {
      return financialAccounts.filter(a => a.type === 'Bank');
    }
    if (paymentMode === 'Mobile') {
      return financialAccounts.filter(a => a.type === 'Mobile Wallet');
    }
    return financialAccounts;
  }, [financialAccounts, paymentMode]);

  // Auto-select preferred account when payment method changes or accounts load
  useEffect(() => {
    if (paymentMode === 'Due') {
      setSelectedAccountId('');
      return;
    }
    const resolvedId = resolveAccountForTender(
      paymentMode === 'Mobile' ? 'Mobile Wallet' : paymentMode,
      financialAccounts
    );
    if (resolvedId) {
      setSelectedAccountId(resolvedId);
    } else if (matchingAccounts.length > 0) {
      const def = matchingAccounts.find(a => a.isDefault);
      setSelectedAccountId(def ? def.id : matchingAccounts[0].id);
    } else if (financialAccounts.length > 0) {
      setSelectedAccountId(financialAccounts[0].id);
    }
  }, [paymentMode, financialAccounts, matchingAccounts]);

  // Bidirectional profit calculations when sale price or profit fields change
  const recalculateProfitFrom = (
    mode: ProfitInputMode,
    value: number,
    salePrice: number = currentSaleAmount
  ) => {
    if (salePrice <= 0) return;

    if (mode === 'amount') {
      const p = Math.round(value * 100) / 100;
      const c = Math.round((salePrice - p) * 100) / 100;
      const m = salePrice > 0 ? Math.round((p / salePrice) * 1000) / 10 : 0;
      const mk = c > 0 ? Math.round((p / c) * 1000) / 10 : 0;
      setProfitAmount(p.toString());
      setCostAmount(c.toString());
      setMarginPercent(m.toString());
      setMarkupPercent(mk.toString());
    } else if (mode === 'margin') {
      const m = Math.round(value * 10) / 10;
      const p = Math.round(salePrice * (m / 100) * 100) / 100;
      const c = Math.round((salePrice - p) * 100) / 100;
      const mk = c > 0 ? Math.round((p / c) * 1000) / 10 : 0;
      setMarginPercent(m.toString());
      setProfitAmount(p.toString());
      setCostAmount(c.toString());
      setMarkupPercent(mk.toString());
    } else if (mode === 'markup') {
      const mk = Math.round(value * 10) / 10;
      const c = mk >= 0 ? Math.round((salePrice / (1 + mk / 100)) * 100) / 100 : salePrice;
      const p = Math.round((salePrice - c) * 100) / 100;
      const m = salePrice > 0 ? Math.round((p / salePrice) * 1000) / 10 : 0;
      setMarkupPercent(mk.toString());
      setCostAmount(c.toString());
      setProfitAmount(p.toString());
      setMarginPercent(m.toString());
    } else if (mode === 'cost') {
      const c = Math.round(value * 100) / 100;
      const p = Math.round((salePrice - c) * 100) / 100;
      const m = salePrice > 0 ? Math.round((p / salePrice) * 1000) / 10 : 0;
      const mk = c > 0 ? Math.round((p / c) * 1000) / 10 : 0;
      setCostAmount(c.toString());
      setProfitAmount(p.toString());
      setMarginPercent(m.toString());
      setMarkupPercent(mk.toString());
    }
  };

  // Keep profit synchronized when calculator amount changes
  useEffect(() => {
    if (profitEnabled && currentSaleAmount > 0) {
      if (profitMode === 'margin' && marginPercent !== '') {
        recalculateProfitFrom('margin', parseFloat(marginPercent) || 0, currentSaleAmount);
      } else if (profitMode === 'cost' && costAmount !== '') {
        recalculateProfitFrom('cost', parseFloat(costAmount) || 0, currentSaleAmount);
      } else if (profitMode === 'amount' && profitAmount !== '') {
        recalculateProfitFrom('amount', parseFloat(profitAmount) || 0, currentSaleAmount);
      } else if (profitMode === 'markup' && markupPercent !== '') {
        recalculateProfitFrom('markup', parseFloat(markupPercent) || 0, currentSaleAmount);
      }
    }
  }, [currentSaleAmount]);

  // Calculator logic
  const handleNumClick = (num: string) => {
    if (isResult) {
      setDisplay(num === '.' ? '0.' : num);
      setExpression(num === '.' ? '0.' : num);
      setIsResult(false);
    } else {
      if (num === '.' && display.includes('.')) return;
      if (num === '00' && (display === '0' || display === '')) return;
      setDisplay(prev => (prev === '0' && num !== '.' ? num : prev + num));
      setExpression(prev => (prev === '0' && num !== '.' ? num : prev + num));
    }
  };

  const handleAddPreset = (delta: number) => {
    const current = parseFloat(display) || 0;
    const next = Math.max(0, current + delta);
    const str = next.toString();
    setDisplay(str);
    setExpression(str);
    setIsResult(false);
  };

  const handleOperator = (op: string) => {
    if (isResult) {
      setExpression(display + ` ${op} `);
      setIsResult(false);
    } else {
      const trimmed = expression.trim();
      const lastChar = trimmed.slice(-1);
      if (['+', '-', '×', '÷'].includes(lastChar)) {
        setExpression(trimmed.slice(0, -1) + ` ${op} `);
      } else {
        setExpression(prev => prev + ` ${op} `);
      }
    }
    setDisplay('0');
  };

  const evaluateExpression = (expr: string): number => {
    const sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/');
    try {
      if (!/^[\d\s.+\-*/()]+$/.test(sanitized)) return 0;
      const result = new Function(`return ${sanitized}`)();
      return Number.isFinite(result) ? Math.max(0, result) : 0;
    } catch (e) {
      console.error("Calculation error", e);
      return 0;
    }
  };

  const handleEqual = () => {
    if (!expression) return;
    const result = evaluateExpression(expression);
    const formattedResult = parseFloat(result.toFixed(4)).toString();
    setDisplay(formattedResult);
    setExpression(expression + ' =');
    setIsResult(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setIsResult(false);
    setCashTendered('');
    setPartialPaidNow('');
  };

  const handleBackspace = () => {
    if (isResult) {
      handleClear();
      return;
    }
    setDisplay(prev => (prev.length > 1 ? prev.slice(0, -1) : '0'));
    setExpression(prev => {
      const trimmed = prev.trim();
      if (trimmed.endsWith('+') || trimmed.endsWith('-') || trimmed.endsWith('×') || trimmed.endsWith('÷')) {
        return trimmed.slice(0, -1).trim();
      }
      return prev.slice(0, -1) || '0';
    });
  };

  // Change computation for cash
  const tenderedNum = parseFloat(cashTendered) || 0;
  const changeAmount = useMemo(() => {
    if (paymentMode !== 'Cash' || !tenderedNum || tenderedNum < currentSaleAmount) return 0;
    return Math.round((tenderedNum - currentSaleAmount) * 100) / 100;
  }, [paymentMode, tenderedNum, currentSaleAmount]);

  // Partial / Due computation
  const partialPaidNum = parseFloat(partialPaidNow) || 0;
  const remainingDue = useMemo(() => {
    if (paymentMode !== 'Due') return 0;
    return Math.max(0, Math.round((currentSaleAmount - partialPaidNum) * 100) / 100);
  }, [paymentMode, currentSaleAmount, partialPaidNum]);

  // Execute Sale & Charge
  const handleCharge = () => {
    if (chargeInFlightRef.current) return;
    let amount = parseFloat(display);

    if (!isResult && expression.includes(' ')) {
      amount = evaluateExpression(expression);
    }

    if (amount <= 0 || !Number.isFinite(amount)) {
      alert(language === 'bn' ? 'অনুগ্রহ করে বৈধ বিক্রয় মূল্য লিখুন।' : 'Please enter a valid sale amount.');
      return;
    }

    if (paymentMode === 'Due' && (!customerName || customerName.trim() === 'Walk-in Customer' || customerName.trim() === '')) {
      alert(language === 'bn' ? 'বাকি বা আংশিক বিক্রয়ের জন্য গ্রাহকের নাম আবশ্যক।' : 'Customer name is required for credit or due sales.');
      return;
    }

    chargeInFlightRef.current = true;
    setChargeBusy(true);

    try {
      const uniqueSuffix = Date.now().toString().slice(-6);
      const reference = `QS-${uniqueSuffix}`;
      const today = new Date().toISOString().split('T')[0];

      // Calculate paid and due amounts
      let finalPaid = amount;
      let finalDue = 0;
      let finalPaymentMethod: LedgerEntry['paymentMethod'] = 'Cash';

      if (paymentMode === 'Cash') {
        finalPaymentMethod = 'Cash';
        finalPaid = amount;
        finalDue = 0;
      } else if (paymentMode === 'Bank') {
        finalPaymentMethod = 'Bank';
        finalPaid = amount;
        finalDue = 0;
      } else if (paymentMode === 'Mobile') {
        finalPaymentMethod = 'Mobile';
        finalPaid = amount;
        finalDue = 0;
      } else if (paymentMode === 'Due') {
        if (partialPaidNum > 0 && partialPaidNum < amount) {
          finalPaymentMethod = 'Partial';
          finalPaid = partialPaidNum;
          finalDue = amount - partialPaidNum;
        } else if (partialPaidNum >= amount) {
          finalPaymentMethod = 'Cash';
          finalPaid = amount;
          finalDue = 0;
        } else {
          finalPaymentMethod = 'Due';
          finalPaid = 0;
          finalDue = amount;
        }
      }

      // Profit details
      const costNum = profitEnabled ? parseFloat(costAmount) || 0 : undefined;
      const profitNum = profitEnabled ? parseFloat(profitAmount) || 0 : undefined;
      const marginNum = profitEnabled ? parseFloat(marginPercent) || 0 : undefined;
      const markupNum = profitEnabled ? parseFloat(markupPercent) || 0 : undefined;

      const newTx: LedgerEntry = {
        id: Date.now().toString(),
        date: today,
        entityName: customerName.trim() || 'Walk-in Customer',
        entityMobile: customerMobile.trim() || undefined,
        type: 'Sale',
        amount: amount,
        paymentMethod: finalPaymentMethod,
        amountPaid: finalPaid,
        dueAmount: finalDue,
        accountId: paymentMode === 'Due' && finalPaid === 0 ? undefined : (selectedAccountId || undefined),
        reference: reference,
        profit: profitNum,
        cost: costNum,
        cogs: costNum,
        profitMargin: marginNum,
        markupPercent: markupNum,
        manualProfit: profitEnabled,
        manualProfitAdjustment: profitEnabled ? {
          type: profitMode,
          profitAmount: profitNum || 0,
          profitMargin: marginNum || 0,
          markupPercent: markupNum,
          costAmount: costNum || 0,
          note: profitNote || undefined,
        } : undefined,
        details: {
          subtotal: amount,
          tax: 0,
          discount: 0,
          delivery: 0,
        }
      };

      addTransaction(newTx);

      const resolvedAcc = financialAccounts.find(a => a.id === selectedAccountId);

      // Save summary for receipt modal
      setCompletedSale({
        id: newTx.id,
        reference,
        date: today,
        amount,
        paymentMethod: finalPaymentMethod,
        accountName: resolvedAcc?.name,
        amountPaid: finalPaid,
        dueAmount: finalDue,
        tendered: paymentMode === 'Cash' && tenderedNum > 0 ? tenderedNum : undefined,
        change: paymentMode === 'Cash' && changeAmount > 0 ? changeAmount : undefined,
        customerName: customerName.trim() || 'Walk-in Customer',
        profit: profitNum,
        cost: costNum,
        marginPercent: marginNum,
      });

      handleClear();
    } finally {
      chargeInFlightRef.current = false;
      setChargeBusy(false);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't trigger calculator shortcuts when typing in inputs
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        if (e.key === 'F9') {
          e.preventDefault();
          handleCharge();
        }
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleNumClick(e.key);
        return;
      }
      if (e.key === '.') {
        e.preventDefault();
        handleNumClick('.');
        return;
      }
      if (e.key === 'Enter' || e.key === 'F9') {
        e.preventDefault();
        handleCharge();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }
      if (e.key === '+') { e.preventDefault(); handleOperator('+'); return; }
      if (e.key === '-') { e.preventDefault(); handleOperator('-'); return; }
      if (e.key === '*') { e.preventDefault(); handleOperator('×'); return; }
      if (e.key === '/') { e.preventDefault(); handleOperator('÷'); return; }
      if (e.key === '=') { e.preventDefault(); handleEqual(); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Print receipt function
  const handlePrintReceipt = (sale: CompletedSaleSummary) => {
    const win = window.open('', '_blank', 'width=420,height=600');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${sale.reference}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; width: 300px; margin: 0 auto; padding: 16px; color: #1e293b; font-size: 13px; line-height: 1.4; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .bold { font-weight: 700; }
            .divider { border-top: 1px dashed #cbd5e1; margin: 10px 0; }
            .flex { display: flex; justify-content: space-between; }
            .title { font-size: 18px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
            .subtitle { font-size: 11px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; }
            .row { margin: 4px 0; }
            .total-row { font-size: 16px; font-weight: 800; margin: 8px 0; color: #0f172a; }
            @media print { body { width: 100%; margin: 0; padding: 10px; } }
          </style>
        </head>
        <body>
          <div class="text-center">
            <div class="title">BIZORA ERP</div>
            <div class="subtitle">Quick Sale Receipt</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Ref: ${sale.reference} · ${sale.date}</div>
          </div>
          <div class="divider"></div>
          <div class="row flex"><span>Customer:</span><span class="bold">${sale.customerName}</span></div>
          <div class="row flex"><span>Payment:</span><span>${sale.paymentMethod} ${sale.accountName ? `(${sale.accountName})` : ''}</span></div>
          <div class="divider"></div>
          <div class="row flex bold"><span>Item</span><span>Amount</span></div>
          <div class="row flex"><span>Quick Sale Item</span><span>${currencySymbol}${sale.amount.toFixed(2)}</span></div>
          <div class="divider"></div>
          <div class="row flex total-row"><span>Total</span><span>${currencySymbol}${sale.amount.toFixed(2)}</span></div>
          <div class="row flex"><span>Amount Paid:</span><span class="bold">${currencySymbol}${sale.amountPaid.toFixed(2)}</span></div>
          ${sale.dueAmount > 0 ? `<div class="row flex" style="color: #dc2626;"><span>Remaining Due:</span><span class="bold">${currencySymbol}${sale.dueAmount.toFixed(2)}</span></div>` : ''}
          ${sale.tendered ? `<div class="row flex"><span>Cash Tendered:</span><span>${currencySymbol}${sale.tendered.toFixed(2)}</span></div>` : ''}
          ${sale.change ? `<div class="row flex" style="color: #16a34a;"><span>Change Given:</span><span class="bold">${currencySymbol}${sale.change.toFixed(2)}</span></div>` : ''}
          ${sale.profit != null ? `<div class="divider"></div><div class="row flex" style="font-size: 11px; color: #64748b;"><span>Estimated Profit:</span><span>${currencySymbol}${sale.profit.toFixed(2)} (${sale.marginPercent ?? 0}%)</span></div>` : ''}
          <div class="divider"></div>
          <div class="text-center" style="font-size: 11px; color: #94a3b8; margin-top: 12px;">Thank you for your business!</div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    win.document.close();
  };

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-4 md:p-6 space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white shadow-md shadow-orange-500/20">
            <Zap className="w-5 h-5 fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              {language === 'bn' ? 'দ্রুত বিক্রয় ও ক্যালকুলেটর' : 'Quick Sale & Fast Checkout'}
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              {language === 'bn'
                ? 'রিয়েল-টাইম ক্যাশ ও ব্যাংক সিঙ্ক, মুনাফা ট্র্যাকিং এবং তাৎক্ষণিক রসিদ'
                : 'Real-time Cash & Accounts integration, profit tracking and instant receipts'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold border border-slate-200">
            {language === 'bn' ? 'Enter / F9: চার্জ' : 'Enter / F9: Charge'}
          </span>
          <span className="hidden md:inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold border border-slate-200">
            {language === 'bn' ? 'Esc: ক্লিয়ার' : 'Esc: Clear'}
          </span>
          <button
            onClick={handleClear}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition font-semibold"
            title="Clear all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{language === 'bn' ? 'রিসেট' : 'Reset'}</span>
          </button>
        </div>
      </div>

      {/* Main Dual-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Calculator Keypad & Denominations */}
        <div className="lg:col-span-7 xl:col-span-6 bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
          {/* Display screen */}
          <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-inner flex flex-col justify-between min-h-[110px]">
            <div className="text-slate-400 text-sm font-medium tracking-wide h-5 overflow-hidden text-right truncate">
              {expression || (language === 'bn' ? 'ক্যালকুলেটর প্রস্তুত' : 'Ready')}
            </div>
            <div className="flex items-baseline justify-end gap-1.5 mt-2">
              <span className="text-slate-400 text-2xl font-light">{currencySymbol}</span>
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-white truncate">
                {display}
              </span>
            </div>
          </div>

          {/* Quick Denomination Chips */}
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              {language === 'bn' ? 'দ্রুত পরিমাণ যোগ করুন' : 'Quick Amount Chips'}
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[10, 50, 100, 500, 1000].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => handleAddPreset(val)}
                  className="py-1.5 px-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200/80 transition active:scale-95 text-center"
                >
                  +{val}
                </button>
              ))}
            </div>
          </div>

          {/* Calculator Grid */}
          <div className="grid grid-cols-4 gap-2.5">
            {/* Row 1 */}
            <button
              onClick={handleClear}
              className="h-12 sm:h-13 rounded-2xl bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold text-base transition active:scale-95"
            >
              AC
            </button>
            <button
              onClick={handleBackspace}
              className="h-12 sm:h-13 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 flex items-center justify-center transition active:scale-95"
            >
              <Delete className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                const current = parseFloat(display) || 0;
                setDisplay((current / 100).toString());
                setExpression(`${display} % =`);
                setIsResult(true);
              }}
              className="h-12 sm:h-13 rounded-2xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-base transition active:scale-95"
            >
              %
            </button>
            <button
              onClick={() => handleOperator('÷')}
              className="h-12 sm:h-13 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-lg transition active:scale-95"
            >
              ÷
            </button>

            {/* Row 2 */}
            <button onClick={() => handleNumClick('7')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xl transition active:scale-95 border border-slate-100">7</button>
            <button onClick={() => handleNumClick('8')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xl transition active:scale-95 border border-slate-100">8</button>
            <button onClick={() => handleNumClick('9')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xl transition active:scale-95 border border-slate-100">9</button>
            <button onClick={() => handleOperator('×')} className="h-12 sm:h-13 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-lg transition active:scale-95">×</button>

            {/* Row 3 */}
            <button onClick={() => handleNumClick('4')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xl transition active:scale-95 border border-slate-100">4</button>
            <button onClick={() => handleNumClick('5')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xl transition active:scale-95 border border-slate-100">5</button>
            <button onClick={() => handleNumClick('6')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xl transition active:scale-95 border border-slate-100">6</button>
            <button onClick={() => handleOperator('-')} className="h-12 sm:h-13 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-lg transition active:scale-95">-</button>

            {/* Row 4 */}
            <button onClick={() => handleNumClick('1')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xl transition active:scale-95 border border-slate-100">1</button>
            <button onClick={() => handleNumClick('2')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xl transition active:scale-95 border border-slate-100">2</button>
            <button onClick={() => handleNumClick('3')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xl transition active:scale-95 border border-slate-100">3</button>
            <button onClick={() => handleOperator('+')} className="h-12 sm:h-13 rounded-2xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold text-lg transition active:scale-95">+</button>

            {/* Row 5 */}
            <button onClick={() => handleNumClick('00')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-base transition active:scale-95 border border-slate-100">00</button>
            <button onClick={() => handleNumClick('0')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xl transition active:scale-95 border border-slate-100">0</button>
            <button onClick={() => handleNumClick('.')} className="h-12 sm:h-13 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xl transition active:scale-95 border border-slate-100">.</button>
            <button onClick={handleEqual} className="h-12 sm:h-13 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xl transition active:scale-95 shadow-md shadow-indigo-200">=</button>
          </div>
        </div>

        {/* RIGHT COLUMN: Payment, Accounts, Profit & Charge */}
        <div className="lg:col-span-5 xl:col-span-6 space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
            {/* Payment Method Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {language === 'bn' ? 'পেমেন্ট মাধ্যম' : 'Payment Method'}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode('Cash')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition active:scale-95 ${
                    paymentMode === 'Cash'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Wallet className="w-5 h-5 mb-1" />
                  <span className="text-xs">{language === 'bn' ? 'নগদ' : 'Cash'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('Bank')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition active:scale-95 ${
                    paymentMode === 'Bank'
                      ? 'bg-blue-50 border-blue-500 text-blue-700 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Landmark className="w-5 h-5 mb-1" />
                  <span className="text-xs">{language === 'bn' ? 'ব্যাংক' : 'Bank'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('Mobile')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition active:scale-95 ${
                    paymentMode === 'Mobile'
                      ? 'bg-purple-50 border-purple-500 text-purple-700 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-5 h-5 mb-1" />
                  <span className="text-xs">{language === 'bn' ? 'মোবাইল' : 'Mobile'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMode('Due')}
                  className={`flex flex-col items-center justify-center p-2.5 rounded-2xl border transition active:scale-95 ${
                    paymentMode === 'Due'
                      ? 'bg-amber-50 border-amber-500 text-amber-700 font-bold shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Clock className="w-5 h-5 mb-1" />
                  <span className="text-xs">{language === 'bn' ? 'বাকি/আংশিক' : 'Due/Partial'}</span>
                </button>
              </div>
            </div>

            {/* Financial Account Selector (when money is collected) */}
            {paymentMode !== 'Due' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  {language === 'bn' ? 'জমা অ্যাকাউন্ট' : 'Deposit Account'}
                </label>
                <div className="relative">
                  <select
                    value={selectedAccountId}
                    onChange={e => setSelectedAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  >
                    {financialAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.type}) — {currencySymbol}{acc.balance.toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Cash Tendered & Change (Only for Cash payment) */}
            {paymentMode === 'Cash' && (
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {language === 'bn' ? 'প্রাপ্ত নগদ টাকা ও ফেরত' : 'Cash Tendered & Change'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setCashTendered(currentSaleAmount.toString())}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline"
                  >
                    {language === 'bn' ? 'সঠিক পরিমাণ' : 'Exact Amount'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                      {language === 'bn' ? 'গ্রাহক দিয়েছে' : 'Tendered'}
                    </span>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">{currencySymbol}</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={cashTendered}
                        onChange={e => setCashTendered(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                      {language === 'bn' ? 'ফেরত দিন' : 'Change Due'}
                    </span>
                    <div className="h-[38px] px-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between font-black text-emerald-700 text-sm">
                      <span>{currencySymbol}</span>
                      <span>{changeAmount.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Tender Roundups */}
                {currentSaleAmount > 0 && (
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {[
                      currentSaleAmount,
                      Math.ceil(currentSaleAmount / 10) * 10,
                      Math.ceil(currentSaleAmount / 50) * 50,
                      Math.ceil(currentSaleAmount / 100) * 100,
                      Math.ceil(currentSaleAmount / 500) * 500,
                    ]
                      .filter((v, idx, arr) => v >= currentSaleAmount && arr.indexOf(v) === idx)
                      .slice(0, 4)
                      .map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCashTendered(val.toString())}
                          className="px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-slate-700 text-[11px] font-bold rounded-lg transition active:scale-95"
                        >
                          {currencySymbol}{val}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Partial / Due breakdown (Only for Due payment) */}
            {paymentMode === 'Due' && (
              <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 space-y-3">
                <div className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center justify-between">
                  <span>{language === 'bn' ? 'আংশিক জমা ও অবশিষ্ট বাকি' : 'Partial Paid & Remaining Due'}</span>
                  <span className="text-[11px] text-amber-700">Total: {currencySymbol}{currentSaleAmount.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      {language === 'bn' ? 'এখন নগদ/ব্যাংক জমা' : 'Paid Now'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">{currencySymbol}</span>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={partialPaidNow}
                        onChange={e => setPartialPaidNow(e.target.value)}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      {language === 'bn' ? 'অবশিষ্ট বাকি (Due)' : 'Remaining Due'}
                    </label>
                    <div className="h-[38px] px-3 bg-white border border-rose-200 rounded-xl flex items-center justify-between font-black text-rose-600 text-sm">
                      <span>{currencySymbol}</span>
                      <span>{remainingDue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {partialPaidNum > 0 && (
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      {language === 'bn' ? 'জমা নেয়ার অ্যাকাউন্ট' : 'Deposit Account for Paid Amount'}
                    </label>
                    <select
                      value={selectedAccountId}
                      onChange={e => setSelectedAccountId(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800"
                    >
                      {financialAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.type}) — {currencySymbol}{acc.balance.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Customer Details */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{language === 'bn' ? 'ক্রেতার তথ্য' : 'Customer Info'}</span>
                  {paymentMode === 'Due' && <span className="text-rose-500">*</span>}
                </label>
                {customerName !== 'Walk-in Customer' && (
                  <button
                    type="button"
                    onClick={() => { setCustomerName('Walk-in Customer'); setCustomerMobile(''); }}
                    className="text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    {language === 'bn' ? 'ওয়াক-ইন এ রিসেট' : 'Reset to Walk-in'}
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder={language === 'bn' ? 'কাস্টমারের নাম' : 'Customer Name'}
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                  {customers && customers.length > 0 && (
                    <div className="mt-1 flex gap-1 flex-wrap">
                      {customers.slice(0, 3).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { setCustomerName(c.name); setCustomerMobile(c.mobile || ''); }}
                          className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <input
                    type="text"
                    placeholder={language === 'bn' ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Mobile (optional)'}
                    value={customerMobile}
                    onChange={e => setCustomerMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* MANUAL PROFIT & MARGIN ACCORDION */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => setProfitEnabled(!profitEnabled)}
                className={`w-full px-4 py-3 flex items-center justify-between text-left transition ${
                  profitEnabled ? 'bg-indigo-50/70 border-b border-indigo-100' : 'bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${profitEnabled ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                    <TrendingUp className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      {language === 'bn' ? 'মুনাফা ও খরচ হিসাব (ঐচ্ছিক)' : 'Manual Profit & Margin (Optional)'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {profitEnabled
                        ? (language === 'bn'
                            ? `লাভ: ${currencySymbol}${profitAmount || '0'} (${marginPercent || '0'}%)`
                            : `Profit: ${currencySymbol}${profitAmount || '0'} (${marginPercent || '0'}% margin)`)
                        : (language === 'bn' ? 'ডিফল্ট ০% খরচ (১০০% সার্ভিস লাভ)' : 'Default: 0 cost / 100% margin')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {profitEnabled ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </div>
              </button>

              {profitEnabled && (
                <div className="p-4 bg-white space-y-3 text-xs">
                  {/* Preset Margin Chips */}
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                      {language === 'bn' ? 'মার্জিন প্রিসেট' : 'Quick Margin Presets'}
                    </span>
                    <div className="flex gap-1.5 flex-wrap">
                      {[
                        { label: '10%', val: 10 },
                        { label: '20%', val: 20 },
                        { label: '30%', val: 30 },
                        { label: '50%', val: 50 },
                        { label: language === 'bn' ? '১০০% (বিনামূল্যে পণ্য)' : '100% (Zero Cost)', val: 100 }
                      ].map(preset => (
                        <button
                          key={preset.val}
                          type="button"
                          onClick={() => {
                            setProfitMode('margin');
                            recalculateProfitFrom('margin', preset.val);
                          }}
                          className={`px-2.5 py-1 rounded-lg font-bold border transition active:scale-95 text-[11px] ${
                            parseFloat(marginPercent) === preset.val
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 4-Way Synchronized Inputs */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        {language === 'bn' ? 'মুনাফা (Profit)' : 'Profit Amount'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-slate-400 font-bold">{currencySymbol}</span>
                        <input
                          type="number"
                          value={profitAmount}
                          onChange={e => {
                            setProfitMode('amount');
                            const val = parseFloat(e.target.value) || 0;
                            recalculateProfitFrom('amount', val);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        {language === 'bn' ? 'মার্জিন (Margin %)' : 'Margin %'}
                      </label>
                      <div className="relative">
                        <span className="absolute right-2.5 top-2 text-slate-400 font-bold">%</span>
                        <input
                          type="number"
                          value={marginPercent}
                          onChange={e => {
                            setProfitMode('margin');
                            const val = parseFloat(e.target.value) || 0;
                            recalculateProfitFrom('margin', val);
                          }}
                          className="w-full pl-2.5 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        {language === 'bn' ? 'ক্রয়মূল্য (COGS)' : 'Product Cost'}
                      </label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-2 text-slate-400 font-bold">{currencySymbol}</span>
                        <input
                          type="number"
                          value={costAmount}
                          onChange={e => {
                            setProfitMode('cost');
                            const val = parseFloat(e.target.value) || 0;
                            recalculateProfitFrom('cost', val);
                          }}
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                        {language === 'bn' ? 'মার্কআপ (Markup %)' : 'Markup %'}
                      </label>
                      <div className="relative">
                        <span className="absolute right-2.5 top-2 text-slate-400 font-bold">%</span>
                        <input
                          type="number"
                          value={markupPercent}
                          onChange={e => {
                            setProfitMode('markup');
                            const val = parseFloat(e.target.value) || 0;
                            recalculateProfitFrom('markup', val);
                          }}
                          className="w-full pl-2.5 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Warning if cost exceeds sale price */}
                  {parseFloat(costAmount) > currentSaleAmount && (
                    <div className="flex items-center gap-2 p-2 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-medium">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>
                        {language === 'bn'
                          ? 'সতর্কতা: পণ্য খরচ বিক্রয় মূল্যের চেয়ে বেশি (নেতিবাচক লাভ)।'
                          : 'Warning: Cost exceeds sale price (negative margin sale).'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              onClick={handleCharge}
              disabled={chargeBusy || currentSaleAmount <= 0}
              className="w-full py-4 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold shadow-xl shadow-slate-900/15 transition-all active:scale-[0.98] flex items-center justify-between disabled:opacity-50 disabled:pointer-events-none"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <div className="text-sm font-bold text-white">
                    {chargeBusy
                      ? (language === 'bn' ? 'প্রসেসিং…' : 'Processing…')
                      : (language === 'bn' ? 'বিক্রয় সম্পন্ন করুন' : 'Charge / Complete Sale')}
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {paymentMode === 'Due'
                      ? (language === 'bn' ? `জমা ${currencySymbol}${partialPaidNum} · বাকি ${currencySymbol}${remainingDue}` : `Paid ${currencySymbol}${partialPaidNum} · Due ${currencySymbol}${remainingDue}`)
                      : `${paymentMode} · ${matchingAccounts.find(a => a.id === selectedAccountId)?.name || 'Default'}`}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xl font-extrabold text-white">
                  {currencySymbol}{currentSaleAmount.toFixed(2)}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* POST-SALE RECEIPT MODAL */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150 space-y-5">
            {/* Header Icon */}
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-slate-800">
                {language === 'bn' ? 'বিক্রয় সফলভাবে সম্পন্ন হয়েছে!' : 'Sale Completed Successfully!'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {language === 'bn' ? 'লেজার এবং অ্যাকাউন্টসে স্বয়ংক্রিয় আপডেট রেকর্ড করা হয়েছে' : 'Recorded in Sales Ledger and Financial Accounts'}
              </p>
            </div>

            {/* Receipt Summary Card */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-slate-500">
                <span>{language === 'bn' ? 'রসিদ নম্বর' : 'Reference'}</span>
                <span className="font-mono font-bold text-slate-700">{completedSale.reference}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>{language === 'bn' ? 'গ্রাহক' : 'Customer'}</span>
                <span className="font-bold text-slate-800">{completedSale.customerName}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>{language === 'bn' ? 'পদ্ধতি ও অ্যাকাউন্ট' : 'Payment & Account'}</span>
                <span className="font-bold text-slate-800">
                  {completedSale.paymentMethod} {completedSale.accountName ? `(${completedSale.accountName})` : ''}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-800 pt-1 text-sm font-black">
                <span>{language === 'bn' ? 'মোট বিক্রয় মূল্য' : 'Total Amount'}</span>
                <span className="text-base text-slate-900">{currencySymbol}{completedSale.amount.toFixed(2)}</span>
              </div>

              {completedSale.amountPaid !== completedSale.amount && (
                <div className="flex justify-between items-center text-emerald-700 font-bold">
                  <span>{language === 'bn' ? 'জমা প্রদান' : 'Amount Paid'}</span>
                  <span>{currencySymbol}{completedSale.amountPaid.toFixed(2)}</span>
                </div>
              )}

              {completedSale.dueAmount > 0 && (
                <div className="flex justify-between items-center text-rose-600 font-bold">
                  <span>{language === 'bn' ? 'অবশিষ্ট বাকি (Due)' : 'Remaining Due'}</span>
                  <span>{currencySymbol}{completedSale.dueAmount.toFixed(2)}</span>
                </div>
              )}

              {completedSale.tendered && (
                <div className="flex justify-between items-center text-slate-600">
                  <span>{language === 'bn' ? 'নগদ প্রাপ্তি' : 'Cash Tendered'}</span>
                  <span>{currencySymbol}{completedSale.tendered.toFixed(2)}</span>
                </div>
              )}

              {completedSale.change && (
                <div className="flex justify-between items-center text-emerald-600 font-bold">
                  <span>{language === 'bn' ? 'ফেরত টাকা' : 'Change Given'}</span>
                  <span>{currencySymbol}{completedSale.change.toFixed(2)}</span>
                </div>
              )}

              {completedSale.profit != null && (
                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-slate-500 font-medium">
                  <span>{language === 'bn' ? 'হিসাবকৃত মুনাফা' : 'Recorded Profit'}</span>
                  <span className="text-slate-700 font-bold">
                    {currencySymbol}{completedSale.profit.toFixed(2)} ({completedSale.marginPercent ?? 0}%)
                  </span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handlePrintReceipt(completedSale)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'bn' ? 'রসিদ প্রিন্ট করুন' : 'Print Receipt'}</span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedSale(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-slate-900/10"
              >
                <span>{language === 'bn' ? 'পরবর্তী বিক্রয়' : 'New Sale'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickSale;
