import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { ScanText, Upload, RefreshCw, CheckCircle2, FileText, ArrowRight, DollarSign, Plus } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface ExtractedLine {
  name: string;
  quantity: number;
  unitCost: number;
  total: number;
}

interface ExtractedData {
  vendorName: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  taxAmount: number;
  items: ExtractedLine[];
  confidence: number;
}

interface DocJob {
  id: string;
  fileName: string;
  fileType: string;
  status: 'EXTRACTED' | 'REVIEWED' | 'POSTED';
  targetType: 'Expense' | 'Buy';
  extractedData: ExtractedData;
  postedTransactionId?: string;
  createdAt: string;
}

export const DocumentAi: React.FC = () => {
  const { t, formatCurrency } = useSettings();
  const [jobs, setJobs] = useState<DocJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeJob, setActiveJob] = useState<DocJob | null>(null);

  // Form for raw text paste / upload
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('paper_bill.txt');

  // Review states
  const [vendorName, setVendorName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [date, setDate] = useState('');
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [targetType, setTargetType] = useState<'Expense' | 'Buy'>('Expense');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/document-ai');
      if (res.ok) setJobs(await res.json());
    } catch (e) {
      console.warn('Failed to load Document AI jobs', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim()) return;
    try {
      const res = await authFetch('/api/document-ai/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          rawText,
        }),
      });
      if (res.ok) {
        const created = await res.json();
        setRawText('');
        loadData();
        selectJobForReview(created);
      }
    } catch (e) {
      console.warn('Upload document failed', e);
    }
  };

  const selectJobForReview = (job: DocJob) => {
    setActiveJob(job);
    const ext = job.extractedData || ({} as any);
    setVendorName(ext.vendorName || '');
    setInvoiceNumber(ext.invoiceNumber || '');
    setDate(ext.date || '');
    setTotalAmount(ext.totalAmount || 0);
    setTargetType(job.targetType || 'Expense');
  };

  const handlePostTransaction = async () => {
    if (!activeJob) return;
    try {
      // First save review updates
      await authFetch(`/api/document-ai/${activeJob.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorName,
          invoiceNumber,
          date,
          totalAmount,
          targetType,
        }),
      });

      // Post to ledger
      const res = await authFetch(`/api/document-ai/${activeJob.id}/post`, { method: 'POST' });
      if (res.ok) {
        alert(t('Successfully posted directly into accounting transactions!'));
        setActiveJob(null);
        loadData();
      }
    } catch (e) {
      console.warn('Post to ledger failed', e);
    }
  };

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <ScanText className="w-6 h-6 text-violet-600 dark:text-violet-400" />
            {t('Document AI & Invoice Scanner')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('OCR & AI parsing of purchase receipts, supplier bills, and utility invoices directly into financial transactions.')}
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Input / Scanner Box */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-violet-600" />
              {t('Scan / Paste Invoice Text')}
            </h3>

            <form onSubmit={handleUpload} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('Document Reference Label')}
                </label>
                <input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="e.g. DhakaPaperBill_Oct.txt"
                  className="w-full px-3 py-2 border rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  {t('Receipt / Invoice OCR Raw Text')}
                </label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Paste OCR raw text or receipt dump, e.g.:\nINVOICE\nDhaka Paper Mart\nInvoice: INV-9842\nDate: 2026-10-20\nA4 Paper 5 450.00 2250.00\nTotal: 2250.00`}
                  rows={8}
                  className="w-full px-3 py-2 border rounded-lg text-xs font-mono"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-2 transition-colors"
              >
                <ScanText className="w-4 h-4" />
                {t('Extract Data with AI')}
              </button>
            </form>
          </div>

          {/* Past Scans List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase block">
              {t('Recent Scanned Documents')} ({jobs.length})
            </span>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
              {jobs.map((j) => (
                <div
                  key={j.id}
                  onClick={() => selectJobForReview(j)}
                  className={`py-2.5 px-2 rounded-lg cursor-pointer flex items-center justify-between text-xs transition-colors ${
                    activeJob?.id === j.id
                      ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 font-bold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white line-clamp-1">{j.fileName}</div>
                    <div className="text-[11px] text-slate-400">
                      {j.extractedData?.vendorName} • {formatCurrency(j.extractedData?.totalAmount || 0)}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      j.status === 'POSTED'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-violet-100 text-violet-700'
                    }`}
                  >
                    {j.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Review & Post Box */}
        <div className="lg:col-span-7">
          {activeJob ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-violet-600" />
                    {t('AI Extracted Fields Review')}
                  </h2>
                  <span className="text-xs text-slate-400">
                    Confidence Score: {Math.round((activeJob.extractedData?.confidence || 0.9) * 100)}%
                  </span>
                </div>
                {activeJob.status === 'POSTED' && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Posted to Transactions
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Vendor / Supplier Name')}
                  </label>
                  <input
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Invoice Number')}
                  </label>
                  <input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Invoice Date')}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Total Amount (Tk)')}
                  </label>
                  <input
                    type="number"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-bold text-violet-600"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    {t('Transaction Target')}
                  </label>
                  <select
                    value={targetType}
                    onChange={(e: any) => setTargetType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm font-semibold"
                  >
                    <option value="Expense">Operating Expense</option>
                    <option value="Buy">Inventory Purchase</option>
                  </select>
                </div>
              </div>

              {/* Extracted line items if any */}
              {activeJob.extractedData?.items && activeJob.extractedData.items.length > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase block">
                    {t('Extracted Line Items')}
                  </span>
                  <div className="divide-y text-xs">
                    {activeJob.extractedData.items.map((it, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <span className="font-medium text-slate-800 dark:text-white">{it.name}</span>
                        <span>
                          {it.quantity} × {formatCurrency(it.unitCost)} = {formatCurrency(it.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeJob.status !== 'POSTED' && (
                <div className="pt-4 border-t flex justify-end">
                  <button
                    onClick={handlePostTransaction}
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {t('Confirm & Auto-Post to Ledger')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="h-96 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-center">
              <ScanText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
              <h3 className="text-sm font-bold text-slate-600 dark:text-slate-300">
                {t('No document selected for review')}
              </h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {t('Paste receipt text on the left or select an earlier scan to review and one-click post into transactions.')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentAi;

