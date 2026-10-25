import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppLanguage, Currency } from '../types';
import { translations } from '../utils/translations';
import { DEFAULT_EXCHANGE_RATES, convertCurrency, RateTable } from '../lib/exchangeRates';

// Theme Types
export type ThemeMode = 'light' | 'dark' | 'system';

export interface InvoiceConfig {
    logo?: string;
    footerNote: string;
    showSignature: boolean;
    showSeal: boolean;
}

interface SettingsContextType {
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
  currency: Currency;
  setCurrency: (curr: Currency) => void;
  currencySymbol: string;
  t: (key: string) => string;
  
  // Invoice & Format
  invoiceTemplateId: number;
  setInvoiceTemplateId: (id: number) => void;
  decimalPlaces: number;
  setDecimalPlaces: (num: number) => void;
  formatMoney: (amount: number) => string;
  
  // Invoice Customization
  invoiceConfig: InvoiceConfig;
  setInvoiceConfig: (config: InvoiceConfig) => void;
  
  // Currency Conversion Helpers
  convertLocalToGlobal: (localAmount: number) => number;
  convertGlobalToLocal: (globalAmount: number) => number;
  /** When true, formatMoney converts from baseCurrency → display currency */
  applyExchangeRates: boolean;
  setApplyExchangeRates: (v: boolean) => void;
  baseCurrency: Currency;
  setBaseCurrency: (c: Currency) => void;
  exchangeRates: RateTable;
  setExchangeRate: (code: string, rateVsUsd: number) => void;
  convertAmount: (amount: number, from: string, to: string) => number;
  formatMoneyIn: (amount: number, currencyCode: string) => string;
  /** Last live FX fetch metadata */
  fxMeta: { provider?: string; fetchedAt?: string; loading?: boolean; error?: string };
  refreshExchangeRates: (force?: boolean) => Promise<{ ok: boolean; error?: string; count?: number }>;
  
  // Marketing Slides
  promoSlides: {id: number, title: string, desc: string, color: string}[];
  updatePromoSlides: (slides: any[]) => void;

  // Appearance / Theme
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  brandColor: string;
  setBrandColor: (color: string) => void;

  // Security
  autoLogoutTimer: number;
  setAutoLogoutTimer: (minutes: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// Exchange Rates relative to USD (Base Currency)
const EXCHANGE_RATES: Record<Currency, number> = {
  [Currency.USD]: 1,
  [Currency.EUR]: 0.92,
  [Currency.GBP]: 0.79,
  [Currency.JPY]: 150.5,
  [Currency.CAD]: 1.35,
  [Currency.AUD]: 1.52,
  [Currency.CNY]: 7.19,
  [Currency.INR]: 83.5,
  [Currency.BDT]: 120.0,
  [Currency.PKR]: 278.5,
  [Currency.SAR]: 3.75,
  [Currency.AED]: 3.67,
  [Currency.RUB]: 92.5,
  [Currency.BRL]: 4.98,
  [Currency.MXN]: 16.8,
  [Currency.TRY]: 32.1,
  [Currency.IDR]: 15700,
  [Currency.KRW]: 1330,
  [Currency.VND]: 24600,
  [Currency.THB]: 35.8,
  [Currency.ZAR]: 18.9,
  [Currency.NGN]: 1500,
  [Currency.PHP]: 56.2,
  [Currency.MYR]: 4.75,
  [Currency.SGD]: 1.34,
  [Currency.HKD]: 7.82,
  [Currency.NZD]: 1.65,
  [Currency.CHF]: 0.88,
  [Currency.SEK]: 10.3,
  [Currency.NOK]: 10.5,
  [Currency.DKK]: 6.8,
  [Currency.PLN]: 3.95,
  [Currency.HUF]: 360,
  [Currency.CZK]: 23.3,
  [Currency.ILS]: 3.65,
  [Currency.EGP]: 47.5,
  [Currency.KWD]: 0.31,
  [Currency.QAR]: 3.64,
  [Currency.OMR]: 0.38,
  [Currency.LKR]: 305,
  [Currency.NPR]: 133,
  [Currency.KES]: 135,
  [Currency.AFN]: 70,
  [Currency.ALL]: 92,
  [Currency.AMD]: 390,
  [Currency.ANG]: 1.79,
  [Currency.AOA]: 850,
  [Currency.ARS]: 900,
  [Currency.AWG]: 1.79,
  [Currency.AZN]: 1.7,
  [Currency.BAM]: 1.8,
  [Currency.BBD]: 2,
  [Currency.BGN]: 1.8,
  [Currency.BHD]: 0.376,
  [Currency.BIF]: 2870,
  [Currency.BMD]: 1,
  [Currency.BND]: 1.34,
  [Currency.BOB]: 6.9,
  [Currency.BSD]: 1,
  [Currency.BTN]: 83.5,
  [Currency.BWP]: 13.5,
  [Currency.BYN]: 3.25,
  [Currency.BZD]: 2,
  [Currency.CDF]: 2800,
  [Currency.CLP]: 950,
  [Currency.COP]: 4000,
  [Currency.CRC]: 520,
  [Currency.CUP]: 24,
  [Currency.CVE]: 101,
  [Currency.DJF]: 178,
  [Currency.DOP]: 59,
  [Currency.DZD]: 134,
  [Currency.ERN]: 15,
  [Currency.ETB]: 57,
  [Currency.FJD]: 2.25,
  [Currency.GEL]: 2.7,
  [Currency.GHS]: 15.5,
  [Currency.GMD]: 68,
  [Currency.GNF]: 8600,
  [Currency.GTQ]: 7.8,
  [Currency.GYD]: 209,
  [Currency.HNL]: 24.7,
  [Currency.HRK]: 6.9,
  [Currency.HTG]: 132,
  [Currency.IQD]: 1310,
  [Currency.IRR]: 42000,
  [Currency.ISK]: 138,
  [Currency.JMD]: 156,
  [Currency.JOD]: 0.71,
  [Currency.KGS]: 89,
  [Currency.KHR]: 4100,
  [Currency.KMF]: 450,
  [Currency.KPW]: 900,
  [Currency.KYD]: 0.83,
  [Currency.KZT]: 450,
  [Currency.LAK]: 21500,
  [Currency.LBP]: 89500,
  [Currency.LRD]: 190,
  [Currency.LSL]: 18.9,
  [Currency.LYD]: 4.8,
  [Currency.MAD]: 10,
  [Currency.MDL]: 17.8,
  [Currency.MGA]: 4500,
  [Currency.MKD]: 56.5,
  [Currency.MMK]: 2100,
  [Currency.MNT]: 3400,
  [Currency.MOP]: 8.05,
  [Currency.MUR]: 46,
  [Currency.MVR]: 15.4,
  [Currency.MWK]: 1700,
  [Currency.MZN]: 64,
  [Currency.NAD]: 18.9,
  [Currency.NIO]: 36.6,
  [Currency.PAB]: 1,
  [Currency.PEN]: 3.75,
  [Currency.PGK]: 3.85,
  [Currency.PYG]: 7500,
  [Currency.RON]: 4.6,
  [Currency.RSD]: 108,
  [Currency.RWF]: 1300,
  [Currency.SBD]: 8.4,
  [Currency.SCR]: 13.5,
  [Currency.SDG]: 600,
  [Currency.SOS]: 570,
  [Currency.SRD]: 35,
  [Currency.SSP]: 1300,
  [Currency.SYP]: 13000,
  [Currency.SZL]: 18.9,
  [Currency.TJS]: 10.9,
  [Currency.TMT]: 3.5,
  [Currency.TND]: 3.12,
  [Currency.TOP]: 2.35,
  [Currency.TTD]: 6.78,
  [Currency.TWD]: 32,
  [Currency.TZS]: 2550,
  [Currency.UAH]: 41,
  [Currency.UGX]: 3750,
  [Currency.UYU]: 39,
  [Currency.UZS]: 12600,
  [Currency.VES]: 36,
  [Currency.XAF]: 600,
  [Currency.XCD]: 2.7,
  [Currency.XOF]: 600,
  [Currency.XPF]: 110,
  [Currency.YER]: 250,
  [Currency.ZMW]: 26,
  [Currency.ZWL]: 322,
};

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [Currency.USD]: '$',
  [Currency.EUR]: '€',
  [Currency.GBP]: '£',
  [Currency.JPY]: '¥',
  [Currency.CAD]: 'C$',
  [Currency.AUD]: 'A$',
  [Currency.CNY]: '¥',
  [Currency.INR]: '₹',
  [Currency.BDT]: '৳',
  [Currency.PKR]: '₨',
  [Currency.SAR]: '﷼',
  [Currency.AED]: 'د.إ',
  [Currency.RUB]: '₽',
  [Currency.BRL]: 'R$',
  [Currency.MXN]: 'Mex$',
  [Currency.TRY]: '₺',
  [Currency.IDR]: 'Rp',
  [Currency.KRW]: '₩',
  [Currency.VND]: '₫',
  [Currency.THB]: '฿',
  [Currency.ZAR]: 'R',
  [Currency.NGN]: '₦',
  [Currency.PHP]: '₱',
  [Currency.MYR]: 'RM',
  [Currency.SGD]: 'S$',
  [Currency.HKD]: 'HK$',
  [Currency.NZD]: 'NZ$',
  [Currency.CHF]: 'CHF',
  [Currency.SEK]: 'kr',
  [Currency.NOK]: 'kr',
  [Currency.DKK]: 'kr',
  [Currency.PLN]: 'zł',
  [Currency.HUF]: 'Ft',
  [Currency.CZK]: 'Kč',
  [Currency.ILS]: '₪',
  [Currency.EGP]: 'E£',
  [Currency.KWD]: 'د.ك',
  [Currency.QAR]: 'ر.ق',
  [Currency.OMR]: 'ر.ع.',
  [Currency.LKR]: 'Rs',
  [Currency.NPR]: 'रू',
  [Currency.KES]: 'KSh',
  [Currency.AFN]: '؋',
  [Currency.ALL]: 'L',
  [Currency.AMD]: '֏',
  [Currency.ANG]: 'ƒ',
  [Currency.AOA]: 'Kz',
  [Currency.ARS]: 'AR$',
  [Currency.AWG]: 'ƒ',
  [Currency.AZN]: '₼',
  [Currency.BAM]: 'KM',
  [Currency.BBD]: 'Bds$',
  [Currency.BGN]: 'лв',
  [Currency.BHD]: '.د.ب',
  [Currency.BIF]: 'FBu',
  [Currency.BMD]: 'BD$',
  [Currency.BND]: 'B$',
  [Currency.BOB]: 'Bs',
  [Currency.BSD]: 'B$',
  [Currency.BTN]: 'Nu.',
  [Currency.BWP]: 'P',
  [Currency.BYN]: 'Br',
  [Currency.BZD]: 'BZ$',
  [Currency.CDF]: 'FC',
  [Currency.CLP]: 'CLP$',
  [Currency.COP]: 'COL$',
  [Currency.CRC]: '₡',
  [Currency.CUP]: '₱',
  [Currency.CVE]: '$',
  [Currency.DJF]: 'Fdj',
  [Currency.DOP]: 'RD$',
  [Currency.DZD]: 'د.ج',
  [Currency.ERN]: 'Nfk',
  [Currency.ETB]: 'Br',
  [Currency.FJD]: 'FJ$',
  [Currency.GEL]: '₾',
  [Currency.GHS]: 'GH₵',
  [Currency.GMD]: 'D',
  [Currency.GNF]: 'FG',
  [Currency.GTQ]: 'Q',
  [Currency.GYD]: 'G$',
  [Currency.HNL]: 'L',
  [Currency.HRK]: 'kn',
  [Currency.HTG]: 'G',
  [Currency.IQD]: 'ع.د',
  [Currency.IRR]: '﷼',
  [Currency.ISK]: 'kr',
  [Currency.JMD]: 'J$',
  [Currency.JOD]: 'د.ا',
  [Currency.KGS]: 'сом',
  [Currency.KHR]: '៛',
  [Currency.KMF]: 'CF',
  [Currency.KPW]: '₩',
  [Currency.KYD]: 'CI$',
  [Currency.KZT]: '₸',
  [Currency.LAK]: '₭',
  [Currency.LBP]: 'ل.ل',
  [Currency.LRD]: 'L$',
  [Currency.LSL]: 'L',
  [Currency.LYD]: 'ل.د',
  [Currency.MAD]: 'د.م.',
  [Currency.MDL]: 'L',
  [Currency.MGA]: 'Ar',
  [Currency.MKD]: 'ден',
  [Currency.MMK]: 'K',
  [Currency.MNT]: '₮',
  [Currency.MOP]: 'MOP$',
  [Currency.MUR]: '₨',
  [Currency.MVR]: 'Rf',
  [Currency.MWK]: 'MK',
  [Currency.MZN]: 'MT',
  [Currency.NAD]: 'N$',
  [Currency.NIO]: 'C$',
  [Currency.PAB]: 'B/.',
  [Currency.PEN]: 'S/',
  [Currency.PGK]: 'K',
  [Currency.PYG]: '₲',
  [Currency.RON]: 'lei',
  [Currency.RSD]: 'дин',
  [Currency.RWF]: 'FRw',
  [Currency.SBD]: 'SI$',
  [Currency.SCR]: '₨',
  [Currency.SDG]: 'ج.س',
  [Currency.SOS]: 'Sh',
  [Currency.SRD]: 'Sr$',
  [Currency.SSP]: '£',
  [Currency.SYP]: '£S',
  [Currency.SZL]: 'E',
  [Currency.TJS]: 'ЅМ',
  [Currency.TMT]: 'm',
  [Currency.TND]: 'د.ت',
  [Currency.TOP]: 'T$',
  [Currency.TTD]: 'TT$',
  [Currency.TWD]: 'NT$',
  [Currency.TZS]: 'TSh',
  [Currency.UAH]: '₴',
  [Currency.UGX]: 'USh',
  [Currency.UYU]: '$U',
  [Currency.UZS]: 'so\'m',
  [Currency.VES]: 'Bs.S',
  [Currency.XAF]: 'FCFA',
  [Currency.XCD]: 'EC$',
  [Currency.XOF]: 'CFA',
  [Currency.XPF]: '₣',
  [Currency.YER]: '﷼',
  [Currency.ZMW]: 'ZK',
  [Currency.ZWL]: 'Z$',
};

const DEFAULT_SLIDES = [
    { id: 1, title: "Organize your business!", desc: "Get Lifetime Subscription for only $99", color: "bg-yellow-400" },
    { id: 2, title: "Ramadan Special", desc: "50% Off on SMS Marketing Packages", color: "bg-emerald-500" },
    { id: 3, title: "Enterprise Power", desc: "Unlock Advanced Analytics for your team", color: "bg-purple-600" }
];

const DEFAULT_INVOICE_CONFIG: InvoiceConfig = {
    footerNote: "Thank you for your business!",
    showSignature: true,
    showSeal: false
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>(AppLanguage.ENGLISH);
  const [currency, setCurrencyState] = useState<Currency>(Currency.USD);
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  
  // Format States
  const [invoiceTemplateId, setInvoiceTemplateId] = useState<number>(1);
  const [invoiceConfig, setInvoiceConfigState] = useState<InvoiceConfig>(DEFAULT_INVOICE_CONFIG);
  const [decimalPlaces, setDecimalPlaces] = useState<number>(2);
  const [promoSlides, setPromoSlides] = useState(DEFAULT_SLIDES);

  // Theme States
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');
  const [brandColor, setBrandColor] = useState<string>('#4f46e5'); // Default Indigo-600
  
  // Auto Logout State
  const [autoLogoutTimer, setAutoLogoutTimerState] = useState<number>(0);

  // FX
  const [applyExchangeRates, setApplyExchangeRatesState] = useState(false);
  const [baseCurrency, setBaseCurrencyState] = useState<Currency>(Currency.USD);
  const [exchangeRates, setExchangeRates] = useState<RateTable>({ ...DEFAULT_EXCHANGE_RATES });
  const [fxMeta, setFxMeta] = useState<{ provider?: string; fetchedAt?: string; loading?: boolean; error?: string }>({});

  // Load Settings
  useEffect(() => {
    const savedLang = localStorage.getItem('app_language');
    const savedCurr = localStorage.getItem('app_currency');
    const savedTempl = localStorage.getItem('app_template');
    const savedInvConfig = localStorage.getItem('app_invoice_config');
    const savedDec = localStorage.getItem('app_decimal');
    const savedSlides = localStorage.getItem('app_slides');
    const savedTheme = localStorage.getItem('app_theme_mode');
    const savedColor = localStorage.getItem('app_brand_color');
    const savedAutoLogout = localStorage.getItem('app_auto_logout_timer');
    
    if (savedLang && Object.values(AppLanguage).includes(savedLang as AppLanguage)) {
      setLanguageState(savedLang as AppLanguage);
    }
    if (savedCurr && Object.values(Currency).includes(savedCurr as Currency)) {
      setCurrencyState(savedCurr as Currency);
    }
    if (savedTempl) setInvoiceTemplateId(parseInt(savedTempl));
    if (savedInvConfig) {
        try {
            setInvoiceConfigState(JSON.parse(savedInvConfig));
        } catch (e) {
            console.error("Failed to parse invoice config");
        }
    }
    if (savedDec) setDecimalPlaces(parseInt(savedDec));
    if (savedSlides) setPromoSlides(JSON.parse(savedSlides));
    if (savedTheme) setThemeMode(savedTheme as ThemeMode);
    if (savedColor) setBrandColor(savedColor);
    if (savedAutoLogout) setAutoLogoutTimerState(parseInt(savedAutoLogout));
    try {
      const fx = localStorage.getItem('app_fx_rates');
      if (fx) setExchangeRates({ ...DEFAULT_EXCHANGE_RATES, ...JSON.parse(fx) });
      const apply = localStorage.getItem('app_fx_apply');
      if (apply === '1') setApplyExchangeRatesState(true);
      const base = localStorage.getItem('app_fx_base');
      if (base && Object.values(Currency).includes(base as Currency)) setBaseCurrencyState(base as Currency);
    } catch { /* ignore */ }
  }, []);

  // Sync Currency Symbol
  useEffect(() => {
    setCurrencySymbol(CURRENCY_SYMBOLS[currency] || currency);
  }, [currency]);

  // Apply Theme Logic (CSS Variable Injection)
  useEffect(() => {
    // 1. Determine Dark Mode
    const isDark = themeMode === 'dark' || (themeMode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // 2. Generate CSS Overrides
    // We override specific Tailwind classes globally to apply the theme without rewriting components
    // We specifically target the 'indigo' palette which is used as the primary brand color
    // And 'slate' palette which is used for backgrounds/text
    
    const root = document.documentElement;
    const styleId = 'bizora-dynamic-theme';
    let styleTag = document.getElementById(styleId);
    
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
    }

    // Helper to hex to rgb
    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '79, 70, 229';
    };

    const primaryRgb = hexToRgb(brandColor);

    let css = `
        :root {
            --primary-rgb: ${primaryRgb};
        }
        
        /* Override Tailwind Indigo (Primary) classes with Brand Color */
        .bg-indigo-600, .hover\\:bg-indigo-600:hover, .bg-indigo-500 { background-color: ${brandColor} !important; }
        .text-indigo-600, .hover\\:text-indigo-600:hover, .text-indigo-500 { color: ${brandColor} !important; }
        .border-indigo-600, .focus\\:ring-indigo-500:focus { border-color: ${brandColor} !important; }
        .ring-indigo-600 { --tw-ring-color: ${brandColor} !important; }
        
        /* Light BG versions */
        .bg-indigo-50, .hover\\:bg-indigo-50:hover { background-color: rgba(var(--primary-rgb), 0.1) !important; color: ${brandColor} !important; }
        .bg-indigo-100 { background-color: rgba(var(--primary-rgb), 0.2) !important; color: ${brandColor} !important; }
    `;

    if (isDark) {
        root.classList.add('dark');
        // Dark Mode Overrides for Slate (Backgrounds/Text) - Premium obsidian & slate
        css += `
            body, .bg-slate-50, .bg-slate-100 { background-color: #0b0f19 !important; color: #f1f5f9 !important; }
            .bg-white { background-color: #111827 !important; color: #f8fafc !important; border-color: #1f293d !important; }
            .text-slate-900, .text-slate-800, .text-slate-700 { color: #f8fafc !important; }
            .text-slate-600, .text-slate-500 { color: #94a3b8 !important; }
            .text-slate-400 { color: #64748b !important; }
            .border-slate-200, .border-slate-300, .border-slate-100 { border-color: #1f293d !important; }
            input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]), select, textarea {
                background-color: #1a2234 !important;
                color: #f8fafc !important;
                border-color: #2e3a4e !important;
            }
            input::placeholder, textarea::placeholder {
                color: #64748b !important;
            }
            thead, thead tr, thead th {
                background-color: #141c2e !important;
                color: #94a3b8 !important;
                border-color: #1f293d !important;
            }
            tbody tr {
                border-color: #1f293d !important;
            }
            tbody tr:hover {
                background-color: rgba(30, 41, 59, 0.45) !important;
            }
        `;
    } else {
        root.classList.remove('dark');
    }

    styleTag.innerHTML = css;

  }, [themeMode, brandColor]);

  // Setters
  const setLanguage = (lang: AppLanguage) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const setCurrency = (curr: Currency) => {
    setCurrencyState(curr);
    localStorage.setItem('app_currency', curr);
  };

  const updateInvoiceTemplate = (id: number) => {
      setInvoiceTemplateId(id);
      localStorage.setItem('app_template', id.toString());
  };

  const setInvoiceConfig = (config: InvoiceConfig) => {
      setInvoiceConfigState(config);
      localStorage.setItem('app_invoice_config', JSON.stringify(config));
  };

  const updateDecimalPlaces = (num: number) => {
      setDecimalPlaces(num);
      localStorage.setItem('app_decimal', num.toString());
  };

  const updatePromoSlides = (slides: any[]) => {
      setPromoSlides(slides);
      localStorage.setItem('app_slides', JSON.stringify(slides));
  };

  const saveThemeMode = (mode: ThemeMode) => {
      setThemeMode(mode);
      localStorage.setItem('app_theme_mode', mode);
  }

  const saveBrandColor = (color: string) => {
      setBrandColor(color);
      localStorage.setItem('app_brand_color', color);
  }

  const setAutoLogoutTimer = (minutes: number) => {
      setAutoLogoutTimerState(minutes);
      localStorage.setItem('app_auto_logout_timer', minutes.toString());
  };

  // Helpers — ledger stores amounts in baseCurrency; display may convert
  const convertAmount = useCallback((amount: number, from: string, to: string) => {
      return convertCurrency(amount, from, to, exchangeRates);
  }, [exchangeRates]);

  const convertGlobalToLocal = useCallback((amount: number) => {
      if (!applyExchangeRates) return amount;
      return convertCurrency(amount, baseCurrency, currency, exchangeRates);
  }, [applyExchangeRates, baseCurrency, currency, exchangeRates]);

  const convertLocalToGlobal = useCallback((localAmount: number) => {
      if (!applyExchangeRates) return localAmount;
      return convertCurrency(localAmount, currency, baseCurrency, exchangeRates);
  }, [applyExchangeRates, baseCurrency, currency, exchangeRates]);

  const setApplyExchangeRates = (v: boolean) => {
      setApplyExchangeRatesState(v);
      localStorage.setItem('app_fx_apply', v ? '1' : '0');
  };

  const setBaseCurrency = (c: Currency) => {
      setBaseCurrencyState(c);
      localStorage.setItem('app_fx_base', c);
  };

  const setExchangeRate = (code: string, rateVsUsd: number) => {
      setExchangeRates(prev => {
          const next = { ...prev, [code]: rateVsUsd };
          localStorage.setItem('app_fx_rates', JSON.stringify(next));
          return next;
      });
  };

  const refreshExchangeRates = useCallback(async (force = true) => {
      setFxMeta(prev => ({ ...prev, loading: true, error: undefined }));
      try {
        const token = localStorage.getItem('nexus_token') || localStorage.getItem('accessToken');
        const headers: Record<string, string> = { Accept: 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        const q = force ? '?refresh=1' : '';
        const res = await fetch(`/api/exchange-rates${q}`, { headers });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const rates = data.rates || {};
        setExchangeRates(prev => {
          const next = { ...prev, ...rates, USD: 1 };
          localStorage.setItem('app_fx_rates', JSON.stringify(next));
          localStorage.setItem('app_fx_meta', JSON.stringify({
            provider: data.provider,
            fetchedAt: data.fetchedAt,
          }));
          return next;
        });
        setFxMeta({
          provider: data.provider,
          fetchedAt: data.fetchedAt,
          loading: false,
        });
        return { ok: true, count: Object.keys(rates).length };
      } catch (e: any) {
        const msg = e?.message || 'Fetch failed';
        setFxMeta(prev => ({ ...prev, loading: false, error: msg }));
        return { ok: false, error: msg };
      }
  }, []);

  // Load FX meta on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('app_fx_meta');
      if (raw) setFxMeta(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  const formatMoney = useCallback((amount: number) => {
      const convertedAmount = convertGlobalToLocal(amount);
      return `${currencySymbol} ${convertedAmount.toLocaleString(undefined, { 
          minimumFractionDigits: decimalPlaces, 
          maximumFractionDigits: decimalPlaces 
      })}`;
  }, [currencySymbol, decimalPlaces, convertGlobalToLocal]);

  const formatMoneyIn = useCallback((amount: number, currencyCode: string) => {
      const n = convertCurrency(amount, baseCurrency, currencyCode, exchangeRates);
      return `${currencyCode} ${n.toLocaleString(undefined, {
          minimumFractionDigits: decimalPlaces,
          maximumFractionDigits: decimalPlaces,
      })}`;
  }, [baseCurrency, exchangeRates, decimalPlaces]);

  const t = useCallback((key: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) return langDict[key];
    const enDict = translations[AppLanguage.ENGLISH];
    if (enDict && enDict[key]) return enDict[key];
    return key; 
  }, [language]);

  return (
    <SettingsContext.Provider value={{ 
        language, setLanguage, 
        currency, setCurrency, 
        currencySymbol, t,
        invoiceTemplateId, setInvoiceTemplateId: updateInvoiceTemplate,
        invoiceConfig, setInvoiceConfig,
        decimalPlaces, setDecimalPlaces: updateDecimalPlaces,
        formatMoney,
        convertLocalToGlobal,
        convertGlobalToLocal,
        applyExchangeRates, setApplyExchangeRates,
        baseCurrency, setBaseCurrency,
        exchangeRates, setExchangeRate,
        convertAmount, formatMoneyIn,
        fxMeta, refreshExchangeRates,
        promoSlides, updatePromoSlides,
        themeMode, setThemeMode: saveThemeMode,
        brandColor, setBrandColor: saveBrandColor,
        autoLogoutTimer, setAutoLogoutTimer
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};