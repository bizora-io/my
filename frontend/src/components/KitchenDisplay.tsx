import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { useSound } from '../contexts/SoundContext';
import { authFetch } from '../lib/apiClient';
import {
  ChefHat,
  CheckCircle2,
  Utensils,
  Timer,
  Printer,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  ScanLine,
  Sliders,
  Flame,
  AlertCircle,
  X,
  RefreshCw,
  Check,
} from 'lucide-react';

export interface KitchenItem {
  id: string;
  productId?: string | null;
  productName: string;
  quantity: number;
  notes?: string | null;
  station?: string | null;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'CANCELLED';
}

export interface KitchenTicket {
  id: string;
  businessId?: string;
  ticketNo: string;
  saleId?: string | null;
  saleInvoiceNo?: string | null;
  tableNo?: string | null;
  tableNumber?: string | null;
  orderType: 'Dine-In' | 'Takeaway' | 'Delivery';
  station?: string | null;
  notes?: string | null;
  priority: boolean;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELLED';
  items: KitchenItem[];
  createdByName?: string | null;
  createdAt: string;
  updatedAt: string;
  readyAt?: string | null;
  servedAt?: string | null;
}

export interface KitchenSettingsState {
  autoKitchenOnSale: boolean;
  autoPrintKot: boolean;
  chimeOnNewTicket: boolean;
  stations: string[];
  prepTargetMinutes: number;
  passTargetMinutes: number;
  kotPaperMm: 58 | 80;
  kotMargin: number;
  kotFontSize: number;
  kotItemFontSize: number;
  kotShowBarcode: boolean;
  kotShowStation: boolean;
  kotShowInvoice: boolean;
  kotShowTable: boolean;
  kotTitle: string;
  kotFooter: string;
  kotDensity: 'compact' | 'comfortable';
}

const DEFAULT_SETTINGS: KitchenSettingsState = {
  autoKitchenOnSale: false,
  autoPrintKot: true,
  chimeOnNewTicket: true,
  stations: ['Main Kitchen', 'Grill', 'Bar', 'Bakery', 'Fryer', 'Salad', 'Beverage'],
  prepTargetMinutes: 12,
  passTargetMinutes: 5,
  kotPaperMm: 80,
  kotMargin: 12,
  kotFontSize: 9,
  kotItemFontSize: 10,
  kotShowBarcode: true,
  kotShowStation: true,
  kotShowInvoice: true,
  kotShowTable: true,
  kotTitle: 'KITCHEN ORDER',
  kotFooter: 'Thank you for dining with us',
  kotDensity: 'comfortable',
};

function playAudioChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1174, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // Ignore audio context errors if blocked by browser policy
  }
}

export const KitchenDisplay: React.FC = () => {
  const { user } = useAuth();
  const { t } = useSettings();
  const { soundEnabled, toggleSound, previewSound } = useSound();

  const [activeTab, setActiveTab] = useState<'kds' | 'expo' | 'history' | 'scanner' | 'settings'>('kds');
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [stationFilter, setStationFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [settings, setSettings] = useState<KitchenSettingsState>(DEFAULT_SETTINGS);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  // Scanner state
  const [scanInput, setScanInput] = useState('');
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Ticket print preview modal
  const [printingTicket, setPrintingTicket] = useState<KitchenTicket | null>(null);

  // Manual create KOT modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTableNo, setNewTableNo] = useState('');
  const [newOrderType, setNewOrderType] = useState<'Dine-In' | 'Takeaway' | 'Delivery'>('Dine-In');
  const [newStation, setNewStation] = useState('Main Kitchen');
  const [newNotes, setNewNotes] = useState('');
  const [newPriority, setNewPriority] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState(1);
  const [newItemNotes, setNewItemNotes] = useState('');
  const [tempItems, setTempItems] = useState<{ productName: string; quantity: number; notes?: string; station?: string }[]>([]);

  // Live clock
  const [nowClock, setNowClock] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNowClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Track known tickets to chime on new incoming orders
  const knownTicketIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

  const fetchTickets = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await authFetch('/api/kitchen');
      if (res.ok) {
        const body = await res.json();
        const incoming: KitchenTicket[] = Array.isArray(body.data)
          ? body.data
          : Array.isArray(body.kitchenOrders)
          ? body.kitchenOrders
          : [];

        // Check for new incoming tickets to play chime
        if (initialLoadDone.current && soundEnabled && incoming.length > 0) {
          const fresh = incoming.some(t => !knownTicketIds.current.has(t.id) && t.status === 'PENDING');
          if (fresh) {
            playAudioChime();
            previewSound('order');
          }
        }

        knownTicketIds.current = new Set(incoming.map(t => t.id));
        initialLoadDone.current = true;
        setTickets(incoming);
      }
    } catch (err) {
      console.warn('Failed to fetch kitchen tickets:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await authFetch('/api/kitchen/settings');
      if (res.ok) {
        const body = await res.json();
        setSettings({
          autoKitchenOnSale: Boolean(body.autoKitchenOnSale),
          autoPrintKot: body.autoPrintKot !== false,
          chimeOnNewTicket: body.chimeOnNewTicket !== false,
          stations: Array.isArray(body.stations) && body.stations.length ? body.stations : DEFAULT_SETTINGS.stations,
          prepTargetMinutes: Number(body.prepTargetMinutes) || 12,
          passTargetMinutes: Number(body.passTargetMinutes) || 5,
          kotPaperMm: body.kotPaperMm === 58 ? 58 : 80,
          kotMargin: Number(body.kotMargin) || 12,
          kotFontSize: Number(body.kotFontSize) || 9,
          kotItemFontSize: Number(body.kotItemFontSize) || 10,
          kotShowBarcode: body.kotShowBarcode !== false,
          kotShowStation: body.kotShowStation !== false,
          kotShowInvoice: body.kotShowInvoice !== false,
          kotShowTable: body.kotShowTable !== false,
          kotTitle: body.kotTitle || 'KITCHEN ORDER',
          kotFooter: body.kotFooter || 'Thank you for dining with us',
          kotDensity: body.kotDensity === 'compact' ? 'compact' : 'comfortable',
        });
      }
    } catch (err) {
      console.warn('Failed to fetch kitchen settings:', err);
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchSettings();
    const interval = setInterval(() => fetchTickets(false), 5000);
    return () => clearInterval(interval);
  }, [soundEnabled]);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsNotice(null);
    try {
      const res = await authFetch('/api/kitchen/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettingsNotice(t('Kitchen settings saved successfully!'));
        previewSound('action');
        setTimeout(() => setSettingsNotice(null), 3000);
      } else {
        setSettingsNotice(t('Failed to save settings. Please retry.'));
      }
    } catch {
      setSettingsNotice(t('Network error while saving settings.'));
    } finally {
      setSavingSettings(false);
    }
  };

  // Status transitions
  const handleUpdateStatus = async (ticketId: string, nextStatus: KitchenTicket['status']) => {
    try {
      const res = await authFetch(`/api/kitchen/${ticketId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setTickets(prev =>
          prev.map(t =>
            t.id === ticketId
              ? {
                  ...t,
                  status: nextStatus,
                  readyAt: nextStatus === 'READY' ? new Date().toISOString() : t.readyAt,
                  servedAt: nextStatus === 'SERVED' ? new Date().toISOString() : t.servedAt,
                  updatedAt: new Date().toISOString(),
                }
              : t
          )
        );
        if (nextStatus === 'READY') {
          playAudioChime();
          previewSound('notification');
        } else {
          previewSound('action');
        }
      }
    } catch (err) {
      console.warn('Status update failed:', err);
    }
  };

  const handleUpdateItemStatus = async (
    ticketId: string,
    itemId: string,
    nextItemStatus: KitchenItem['status']
  ) => {
    try {
      const res = await authFetch(`/api/kitchen/${ticketId}/items/${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextItemStatus }),
      });
      if (res.ok) {
        const body = await res.json();
        const updatedTicket: KitchenTicket = body.ticket || body.data;
        if (updatedTicket) {
          setTickets(prev => prev.map(t => (t.id === ticketId ? updatedTicket : t)));
        } else {
          fetchTickets();
        }
        previewSound('action');
      }
    } catch (err) {
      console.warn('Item status update failed:', err);
    }
  };

  const handleRecallTicket = async (ticketId: string) => {
    try {
      const res = await authFetch(`/api/kitchen/${ticketId}/recall`, {
        method: 'POST',
      });
      if (res.ok) {
        setTickets(prev =>
          prev.map(t =>
            t.id === ticketId ? { ...t, status: 'READY', servedAt: null, updatedAt: new Date().toISOString() } : t
          )
        );
        previewSound('action');
      }
    } catch (err) {
      console.warn('Recall failed:', err);
    }
  };

  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    try {
      const res = await authFetch('/api/kitchen/scan', {
        method: 'POST',
        body: JSON.stringify({ ticketNo: scanInput.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setScanMessage({
          type: 'success',
          text: `Ticket #${data.ticket?.ticketNo || scanInput} bumped from ${data.from} → ${data.to}!`,
        });
        setScanInput('');
        previewSound('sale');
        fetchTickets();
      } else {
        setScanMessage({ type: 'error', text: data.error || 'Ticket not found or closed.' });
      }
    } catch {
      setScanMessage({ type: 'error', text: 'Error scanning ticket.' });
    }
    setTimeout(() => setScanMessage(null), 4000);
  };

  const handleCreateTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (tempItems.length === 0) return;
    try {
      const payload = {
        tableNo: newTableNo.trim() || undefined,
        tableNumber: newTableNo.trim() || undefined,
        orderType: newOrderType,
        station: newStation,
        notes: newNotes.trim() || undefined,
        priority: newPriority,
        items: tempItems.map((it, idx) => ({
          id: `item-${Date.now()}-${idx}`,
          productName: it.productName,
          quantity: it.quantity,
          notes: it.notes,
          station: it.station || newStation,
          status: 'PENDING',
        })),
      };

      const res = await authFetch('/api/kitchen', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const body = await res.json();
        const created: KitchenTicket = body.ticket || body.data;
        if (created) setTickets(prev => [created, ...prev]);
        setShowCreateModal(false);
        setTempItems([]);
        setNewTableNo('');
        setNewNotes('');
        setNewPriority(false);
        previewSound('sale');
        if (settings.autoPrintKot && created) {
          setPrintingTicket(created);
        }
      }
    } catch (err) {
      console.warn('Create KOT error:', err);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Metrics computation
  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    let totalToday = 0;
    let openNow = 0;
    let cookingNow = 0;
    let readyNow = 0;
    let servedToday = 0;
    let overdueCount = 0;
    const prepMinsList: number[] = [];

    tickets.forEach(t => {
      const isToday = new Date(t.createdAt).toDateString() === today;
      if (isToday) totalToday++;

      const isClosed = t.status === 'SERVED' || t.status === 'CANCELLED';
      if (!isClosed) {
        openNow++;
        if (t.status === 'PREPARING') cookingNow++;
        if (t.status === 'READY') readyNow++;

        const ageMins = (Date.now() - new Date(t.createdAt).getTime()) / 60000;
        if (ageMins >= settings.prepTargetMinutes) overdueCount++;
      }

      if (t.status === 'SERVED' && isToday) {
        servedToday++;
      }

      if (t.readyAt) {
        const diff = (new Date(t.readyAt).getTime() - new Date(t.createdAt).getTime()) / 60000;
        prepMinsList.push(Math.max(0, diff));
      }
    });

    const avgPrep = prepMinsList.length
      ? Math.round((prepMinsList.reduce((a, b) => a + b, 0) / prepMinsList.length) * 10) / 10
      : null;

    return { totalToday, openNow, cookingNow, readyNow, servedToday, overdueCount, avgPrep };
  }, [tickets, settings.prepTargetMinutes]);

  // Station lists
  const availableStations = useMemo(() => {
    const s = new Set<string>(settings.stations || []);
    tickets.forEach(t => {
      if (t.station) s.add(t.station);
      t.items.forEach(it => {
        if (it.station) s.add(it.station);
      });
    });
    return Array.from(s).filter(Boolean).sort();
  }, [settings.stations, tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (stationFilter !== 'ALL') {
        const matchMain = t.station?.toLowerCase() === stationFilter.toLowerCase();
        const matchItem = t.items.some(it => it.station?.toLowerCase() === stationFilter.toLowerCase());
        if (!matchMain && !matchItem) return false;
      }

      if (statusFilter !== 'ALL' && t.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTicket = t.ticketNo?.toLowerCase().includes(q);
        const matchTable = (t.tableNo || t.tableNumber)?.toLowerCase().includes(q);
        const matchInvoice = t.saleInvoiceNo?.toLowerCase().includes(q);
        const matchNotes = t.notes?.toLowerCase().includes(q);
        const matchItem = t.items.some(it => it.productName.toLowerCase().includes(q));
        if (!matchTicket && !matchTable && !matchInvoice && !matchNotes && !matchItem) return false;
      }

      return true;
    });
  }, [tickets, stationFilter, statusFilter, searchQuery]);

  const kdsTickets = useMemo(() => {
    return filteredTickets
      .filter(t => t.status === 'PENDING' || t.status === 'PREPARING' || t.status === 'READY')
      .sort((a, b) => {
        if (a.priority !== b.priority) return a.priority ? -1 : 1;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [filteredTickets]);

  const expoTickets = useMemo(() => {
    return filteredTickets
      .filter(t => t.status === 'READY')
      .sort((a, b) => new Date(a.readyAt || a.createdAt).getTime() - new Date(b.readyAt || b.createdAt).getTime());
  }, [filteredTickets]);

  const minutesElapsed = (from: string) => {
    return Math.max(0, Math.floor((nowClock.getTime() - new Date(from).getTime()) / 60000));
  };

  const getTimerClass = (createdIso: string) => {
    const mins = minutesElapsed(createdIso);
    if (mins >= settings.prepTargetMinutes) {
      return 'bg-rose-500 text-white font-black animate-pulse';
    }
    if (mins >= settings.prepTargetMinutes * 0.7) {
      return 'bg-amber-100 text-amber-800 font-bold';
    }
    return 'bg-slate-100 text-slate-700 font-medium';
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-3 sm:p-5 lg:p-6 space-y-5 flex flex-col font-sans">
      {/* ─────────────────────────────────────────────────────────────
          TOP HEADER & LIVE METRICS
         ───────────────────────────────────────────────────────────── */}
      <header className="bg-slate-800/80 backdrop-blur border border-slate-700 rounded-2xl p-4 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl text-white shadow-lg shadow-orange-500/20">
            <ChefHat className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                {t('Kitchen Operations & KDS')}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-300 border border-orange-500/30">
                PRO KDS
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {user?.businessName || 'Restaurant ERP'} • Live Kitchen Display, Expo Pass & KOT Station Routing
            </p>
          </div>
        </div>

        {/* Global Action Tools */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Live Clock */}
          <div className="px-3.5 py-1.5 bg-slate-950/60 rounded-xl border border-slate-700/80 text-xs font-mono text-slate-300 flex items-center gap-1.5 shadow-inner">
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            {nowClock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-xl border transition-colors flex items-center gap-1.5 text-xs font-bold ${
              soundEnabled
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600'
            }`}
            title={soundEnabled ? 'Audio Alerts Enabled' : 'Audio Alerts Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          {/* Refresh */}
          <button
            onClick={() => fetchTickets(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 transition-colors"
            title="Refresh tickets"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-orange-400' : ''}`} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-700 hover:bg-slate-600 border border-slate-600 text-slate-200 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen KDS'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Manual Create Ticket */}
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/25 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>New KOT</span>
          </button>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────
          KEY METRICS STRIP
         ───────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Queue</p>
            <p className="text-xl font-black text-white mt-0.5">{metrics.openNow}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <Timer className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cooking</p>
            <p className="text-xl font-black text-sky-400 mt-0.5">{metrics.cookingNow}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ready to Serve</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">{metrics.readyNow}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Utensils className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Served Today</p>
            <p className="text-xl font-black text-slate-100 mt-0.5">{metrics.servedToday}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-700 text-slate-300 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-800/90 border border-slate-700 rounded-xl p-3 shadow-md flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Avg Prep Time</p>
            <p className="text-xl font-black text-indigo-400 mt-0.5">
              {metrics.avgPrep !== null ? `${metrics.avgPrep}m` : '—'}
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
            <Timer className="w-5 h-5" />
          </div>
        </div>

        <div
          className={`border rounded-xl p-3 shadow-md flex items-center justify-between transition-colors ${
            metrics.overdueCount > 0
              ? 'bg-rose-950/40 border-rose-600/60 text-rose-300'
              : 'bg-slate-800/90 border-slate-700 text-slate-400'
          }`}
        >
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider">Overdue Alerts</p>
            <p
              className={`text-xl font-black mt-0.5 ${
                metrics.overdueCount > 0 ? 'text-rose-400 font-extrabold animate-pulse' : 'text-slate-100'
              }`}
            >
              {metrics.overdueCount}
            </p>
          </div>
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              metrics.overdueCount > 0 ? 'bg-rose-600/30 text-rose-400' : 'bg-slate-700 text-slate-400'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB NAVIGATION & FILTERS BAR
         ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('kds')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'kds'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>KDS Queue</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-black">{metrics.openNow}</span>
          </button>

          <button
            onClick={() => setActiveTab('expo')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'expo'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Expo / Pass Station</span>
            <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-black">{metrics.readyNow}</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Search className="w-4 h-4" />
            <span>Ticket History</span>
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'scanner'
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <ScanLine className="w-4 h-4" />
            <span>Barcode Scanner</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Settings</span>
          </button>
        </div>

        {/* Station Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setStationFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              stationFilter === 'ALL'
                ? 'bg-slate-100 text-slate-900'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
            }`}
          >
            All Stations
          </button>
          {availableStations.map(st => (
            <button
              key={st}
              onClick={() => setStationFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                stationFilter === st
                  ? 'bg-orange-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: KDS DISPLAY BOARD (3-COLUMN PIPELINE)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'kds' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 flex-1 items-start">
          {/* Column 1: PENDING / NEW */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl">
              <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider text-amber-300">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>New Orders (Pending)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs">
                {kdsTickets.filter(t => t.status === 'PENDING').length}
              </span>
            </div>

            <div className="space-y-3.5 min-h-[300px]">
              {kdsTickets.filter(t => t.status === 'PENDING').length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  No pending orders
                </div>
              )}

              {kdsTickets
                .filter(t => t.status === 'PENDING')
                .map(ticket => {
                  const elapsed = minutesElapsed(ticket.createdAt);
                  return (
                    <div
                      key={ticket.id}
                      className={`bg-slate-800/95 border-2 rounded-2xl p-4 shadow-xl transition-all duration-200 hover:border-amber-400 ${
                        ticket.priority ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-amber-500/50'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white">
                              {ticket.tableNo || ticket.tableNumber ? `Table ${ticket.tableNo || ticket.tableNumber}` : ticket.orderType}
                            </span>
                            {ticket.priority && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                                RUSH
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                            <span>#{ticket.ticketNo}</span>
                            {ticket.station && (
                              <span className="px-2 py-0.5 rounded bg-slate-700 text-amber-300 font-bold text-[10px] uppercase">
                                {ticket.station}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 ${getTimerClass(ticket.createdAt)}`}>
                          <Timer className="w-3.5 h-3.5" />
                          <span>{elapsed}m</span>
                        </div>
                      </div>

                      {/* Items List */}
                      <ul className="space-y-2 mb-4 bg-slate-900/60 rounded-xl p-3 border border-slate-700/60">
                        {ticket.items.map(item => (
                          <li
                            key={item.id}
                            onClick={() =>
                              handleUpdateItemStatus(
                                ticket.id,
                                item.id,
                                item.status === 'PREPARING' ? 'READY' : 'PREPARING'
                              )
                            }
                            className={`flex items-start justify-between gap-2 text-sm cursor-pointer p-1.5 rounded-lg transition-colors ${
                              item.status === 'READY'
                                ? 'bg-emerald-950/40 text-emerald-300 line-through'
                                : item.status === 'PREPARING'
                                ? 'bg-sky-950/40 text-sky-200'
                                : 'hover:bg-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-amber-400">{item.quantity}×</span>
                              <div>
                                <p className="font-semibold">{item.productName}</p>
                                {item.notes && <p className="text-[11px] text-amber-300/80 italic">"{item.notes}"</p>}
                              </div>
                            </div>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase">
                              {item.status}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {ticket.notes && (
                        <p className="text-xs text-slate-400 bg-slate-900/40 rounded-lg p-2 mb-3 italic border border-slate-800">
                          Note: {ticket.notes}
                        </p>
                      )}

                      {/* Bottom Action Bar */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-700/80">
                        <button
                          onClick={() => handleUpdateStatus(ticket.id, 'PREPARING')}
                          className="flex-1 py-2.5 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Flame className="w-4 h-4" />
                          <span>Start Cooking</span>
                        </button>
                        <button
                          onClick={() => setPrintingTicket(ticket)}
                          className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 hover:text-white transition-colors"
                          title="Print Thermal KOT Ticket"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Column 2: PREPARING / COOKING */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-sky-500/15 border border-sky-500/30 rounded-xl">
              <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider text-sky-300">
                <Flame className="w-4 h-4 text-sky-400 animate-pulse" />
                <span>Cooking (In Progress)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-500 text-slate-950 font-black text-xs">
                {kdsTickets.filter(t => t.status === 'PREPARING').length}
              </span>
            </div>

            <div className="space-y-3.5 min-h-[300px]">
              {kdsTickets.filter(t => t.status === 'PREPARING').length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  No orders currently cooking
                </div>
              )}

              {kdsTickets
                .filter(t => t.status === 'PREPARING')
                .map(ticket => {
                  const elapsed = minutesElapsed(ticket.createdAt);
                  return (
                    <div
                      key={ticket.id}
                      className={`bg-slate-800/95 border-2 rounded-2xl p-4 shadow-xl transition-all duration-200 hover:border-sky-400 ${
                        ticket.priority ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-sky-500/50'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white">
                              {ticket.tableNo || ticket.tableNumber ? `Table ${ticket.tableNo || ticket.tableNumber}` : ticket.orderType}
                            </span>
                            {ticket.priority && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[10px] font-black uppercase tracking-wider">
                                RUSH
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                            <span>#{ticket.ticketNo}</span>
                            {ticket.station && (
                              <span className="px-2 py-0.5 rounded bg-slate-700 text-sky-300 font-bold text-[10px] uppercase">
                                {ticket.station}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 ${getTimerClass(ticket.createdAt)}`}>
                          <Timer className="w-3.5 h-3.5" />
                          <span>{elapsed}m</span>
                        </div>
                      </div>

                      {/* Items List */}
                      <ul className="space-y-2 mb-4 bg-slate-900/60 rounded-xl p-3 border border-slate-700/60">
                        {ticket.items.map(item => (
                          <li
                            key={item.id}
                            onClick={() =>
                              handleUpdateItemStatus(
                                ticket.id,
                                item.id,
                                item.status === 'READY' ? 'PREPARING' : 'READY'
                              )
                            }
                            className={`flex items-start justify-between gap-2 text-sm cursor-pointer p-1.5 rounded-lg transition-colors ${
                              item.status === 'READY'
                                ? 'bg-emerald-950/40 text-emerald-300 font-bold'
                                : 'hover:bg-slate-800 text-slate-200'
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <span className="font-bold text-sky-400">{item.quantity}×</span>
                              <div>
                                <p className="font-semibold">{item.productName}</p>
                                {item.notes && <p className="text-[11px] text-sky-300/80 italic">"{item.notes}"</p>}
                              </div>
                            </div>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                                item.status === 'READY' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {item.status}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {ticket.notes && (
                        <p className="text-xs text-slate-400 bg-slate-900/40 rounded-lg p-2 mb-3 italic border border-slate-800">
                          Note: {ticket.notes}
                        </p>
                      )}

                      {/* Bottom Action Bar */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-700/80">
                        <button
                          onClick={() => handleUpdateStatus(ticket.id, 'READY')}
                          className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Check className="w-4 h-4" />
                          <span>Mark Ready</span>
                        </button>
                        <button
                          onClick={() => setPrintingTicket(ticket)}
                          className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 hover:text-white transition-colors"
                          title="Print Thermal KOT Ticket"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Column 3: READY / TO SERVE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ready to Serve (Pass)</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-black text-xs">
                {kdsTickets.filter(t => t.status === 'READY').length}
              </span>
            </div>

            <div className="space-y-3.5 min-h-[300px]">
              {kdsTickets.filter(t => t.status === 'READY').length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  No orders waiting for pickup
                </div>
              )}

              {kdsTickets
                .filter(t => t.status === 'READY')
                .map(ticket => {
                  const readyElapsed = ticket.readyAt ? minutesElapsed(ticket.readyAt) : 0;
                  return (
                    <div
                      key={ticket.id}
                      className="bg-slate-800/95 border-2 border-emerald-500/60 rounded-2xl p-4 shadow-xl transition-all duration-200 hover:border-emerald-400"
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-base font-black text-white">
                              {ticket.tableNo || ticket.tableNumber ? `Table ${ticket.tableNo || ticket.tableNumber}` : ticket.orderType}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                              HOT
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                            <span>#{ticket.ticketNo}</span>
                          </div>
                        </div>

                        <div className="px-2.5 py-1 rounded-lg text-xs bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1.5">
                          <Utensils className="w-3.5 h-3.5" />
                          <span>Ready {readyElapsed}m ago</span>
                        </div>
                      </div>

                      {/* Items List */}
                      <ul className="space-y-1.5 mb-4 bg-slate-900/60 rounded-xl p-3 border border-slate-700/60">
                        {ticket.items.map(item => (
                          <li key={item.id} className="flex items-center justify-between text-sm text-slate-200">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="font-bold text-white">{item.quantity}×</span>
                              <span>{item.productName}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">{item.station}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Bottom Action Bar */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-700/80">
                        <button
                          onClick={() => handleUpdateStatus(ticket.id, 'SERVED')}
                          className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          <Utensils className="w-4 h-4" />
                          <span>Mark Served</span>
                        </button>
                        <button
                          onClick={() => setPrintingTicket(ticket)}
                          className="p-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 hover:text-white transition-colors"
                          title="Print Thermal KOT Ticket"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: EXPO / PASS STATION (EXPEDITER VIEW)
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'expo' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-800/80 p-4 rounded-xl border border-slate-700">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Utensils className="w-5 h-5 text-emerald-400" />
                Pass Station / Expediter Board
              </h2>
              <p className="text-xs text-slate-400">
                Dispatches cooked dishes from the kitchen line to runners and tables.
              </p>
            </div>
            <div className="text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
              {expoTickets.length} orders ready for table dispatch
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expoTickets.length === 0 && (
              <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 text-sm">
                No orders waiting at the pass station.
              </div>
            )}

            {expoTickets.map(ticket => {
              const passElapsed = ticket.readyAt ? minutesElapsed(ticket.readyAt) : 0;
              const isOverPass = passElapsed >= settings.passTargetMinutes;

              return (
                <div
                  key={ticket.id}
                  className={`bg-slate-800 border-2 rounded-2xl p-5 shadow-xl flex flex-col justify-between ${
                    isOverPass ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-emerald-500/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-2xl font-black text-white">
                          {ticket.tableNo || ticket.tableNumber ? `Table ${ticket.tableNo || ticket.tableNumber}` : ticket.orderType}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5 font-mono">
                          <span>#{ticket.ticketNo}</span>
                          {ticket.saleInvoiceNo && <span>• Inv: {ticket.saleInvoiceNo}</span>}
                        </div>
                      </div>

                      <div
                        className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ${
                          isOverPass ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        <Timer className="w-3.5 h-3.5" />
                        <span>Ready {passElapsed}m ago</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 rounded-xl p-3 mb-4 space-y-1.5 border border-slate-700/80">
                      {ticket.items.map(it => (
                        <div key={it.id} className="flex justify-between items-center text-sm">
                          <span className="font-bold text-emerald-400">{it.quantity}× {it.productName}</span>
                          <span className="text-xs text-slate-400">{it.station}</span>
                        </div>
                      ))}
                    </div>

                    {ticket.notes && (
                      <p className="text-xs text-amber-300 bg-amber-950/30 border border-amber-800/40 rounded-lg p-2 mb-4">
                        Note: {ticket.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-slate-700">
                    <button
                      onClick={() => handleUpdateStatus(ticket.id, 'SERVED')}
                      className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                      <Utensils className="w-4 h-4" />
                      <span>Dispatch to Table</span>
                    </button>
                    <button
                      onClick={() => setPrintingTicket(ticket)}
                      className="p-3 bg-slate-700 hover:bg-slate-600 rounded-xl text-slate-300 hover:text-white transition-colors"
                      title="Print KOT"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 3: TICKET HISTORY & SEARCH
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search ticket #, table #, items, notes..."
                className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-xl px-3 py-2 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready</option>
                <option value="SERVED">Served</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-700">
                  <tr>
                    <th className="p-3.5">Ticket #</th>
                    <th className="p-3.5">Table / Type</th>
                    <th className="p-3.5">Station</th>
                    <th className="p-3.5">Items</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Created</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredTickets.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No tickets matching search query.
                      </td>
                    </tr>
                  )}
                  {filteredTickets.map(ticket => (
                    <tr key={ticket.id} className="hover:bg-slate-700/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-amber-400">#{ticket.ticketNo}</td>
                      <td className="p-3.5 font-semibold text-white">
                        {ticket.tableNo || ticket.tableNumber ? `Table ${ticket.tableNo || ticket.tableNumber}` : ticket.orderType}
                      </td>
                      <td className="p-3.5 text-slate-400">{ticket.station || 'Main Kitchen'}</td>
                      <td className="p-3.5 text-slate-300">
                        {ticket.items.map(it => `${it.quantity}× ${it.productName}`).join(', ')}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            ticket.status === 'READY'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : ticket.status === 'PREPARING'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                              : ticket.status === 'SERVED'
                              ? 'bg-slate-700 text-slate-300'
                              : ticket.status === 'CANCELLED'
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {ticket.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-400 font-mono">
                        {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        {ticket.status === 'SERVED' && (
                          <button
                            onClick={() => handleRecallTicket(ticket.id)}
                            className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-200 text-[11px] font-bold"
                            title="Recall to READY (within 15 mins)"
                          >
                            Recall
                          </button>
                        )}
                        <button
                          onClick={() => setPrintingTicket(ticket)}
                          className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300"
                          title="Print Thermal KOT"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 4: BARCODE & KOT SCANNER
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'scanner' && (
        <div className="max-w-xl mx-auto w-full py-8 space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl text-center space-y-4">
            <div className="w-14 h-14 bg-sky-500/20 text-sky-400 rounded-2xl mx-auto flex items-center justify-center">
              <ScanLine className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Thermal KOT Barcode Scanner</h2>
              <p className="text-xs text-slate-400 mt-1">
                Scan printed ticket barcode or type ticket number to automatically advance status along the kitchen flow:
                <br />
                <span className="font-mono text-amber-400">PENDING → PREPARING → READY → SERVED</span>
              </p>
            </div>

            <form onSubmit={handleScanSubmit} className="space-y-3">
              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  value={scanInput}
                  onChange={e => setScanInput(e.target.value)}
                  placeholder="Scan barcode or enter ticket number (e.g. KOT-2026-0001)..."
                  className="w-full px-4 py-3 bg-slate-900 border-2 border-sky-500/50 rounded-xl text-center font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 shadow-inner"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-sky-500/20 transition-all active:scale-95"
              >
                Scan & Advance Status
              </button>
            </form>

            {scanMessage && (
              <div
                className={`p-3 rounded-xl text-xs font-bold ${
                  scanMessage.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {scanMessage.text}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 5: KITCHEN SETTINGS PANEL
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="max-w-3xl mx-auto w-full py-4 space-y-6">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-purple-400" />
                  Kitchen & KOT Configuration
                </h2>
                <p className="text-xs text-slate-400">
                  Configure prep targets, stations, printer dimensions, and sound triggers.
                </p>
              </div>

              {settingsNotice && (
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-lg animate-in fade-in">
                  {settingsNotice}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Prep Targets */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Target Preparation Time (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={settings.prepTargetMinutes}
                  onChange={e => setSettings({ ...settings, prepTargetMinutes: Number(e.target.value) || 12 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-400">Orders exceeding this duration trigger red pulse alerts.</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">Target Pass / Expo Time (minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.passTargetMinutes}
                  onChange={e => setSettings({ ...settings, passTargetMinutes: Number(e.target.value) || 5 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <p className="text-[11px] text-slate-400">Food at pass station turns overdue after this time.</p>
              </div>

              {/* Thermal Paper Size */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">KOT Thermal Paper Width</label>
                <select
                  value={settings.kotPaperMm}
                  onChange={e => setSettings({ ...settings, kotPaperMm: Number(e.target.value) as 58 | 80 })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value={80}>80mm (Standard POS Thermal)</option>
                  <option value={58}>58mm (Narrow Portable Thermal)</option>
                </select>
              </div>

              {/* Layout Density */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300">KOT Layout Density</label>
                <select
                  value={settings.kotDensity}
                  onChange={e => setSettings({ ...settings, kotDensity: e.target.value as 'compact' | 'comfortable' })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="comfortable">Comfortable (Larger text & spacing)</option>
                  <option value="compact">Compact (Saves paper roll)</option>
                </select>
              </div>
            </div>

            {/* Stations Text Editor */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Kitchen Stations (comma-separated)</label>
              <input
                type="text"
                value={settings.stations.join(', ')}
                onChange={e =>
                  setSettings({
                    ...settings,
                    stations: e.target.value
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Main Kitchen, Grill, Bar, Bakery, Fryer, Salad, Beverage"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
              />
              <p className="text-[11px] text-slate-400">
                Stations appear in the station filter bar and route specific dishes on POS order creation.
              </p>
            </div>

            {/* Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-700 pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.chimeOnNewTicket}
                  onChange={e => setSettings({ ...settings, chimeOnNewTicket: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-0"
                />
                <span className="text-xs text-slate-300 font-semibold">Chime audio tone on new incoming ticket</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.autoPrintKot}
                  onChange={e => setSettings({ ...settings, autoPrintKot: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-0"
                />
                <span className="text-xs text-slate-300 font-semibold">Auto-open print dialog when KOT is sent from POS</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.kotShowBarcode}
                  onChange={e => setSettings({ ...settings, kotShowBarcode: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-0"
                />
                <span className="text-xs text-slate-300 font-semibold">Show scannable ticket barcode on thermal KOT</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.kotShowTable}
                  onChange={e => setSettings({ ...settings, kotShowTable: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-0"
                />
                <span className="text-xs text-slate-300 font-semibold">Display table number prominently on KOT</span>
              </label>
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-700">
              <button
                onClick={handleSaveSettings}
                disabled={savingSettings}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save Kitchen Settings'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: MANUAL CREATE KOT TICKET
         ───────────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-700 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-orange-400" />
                Create Kitchen Order Ticket (KOT)
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTicketSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Table Number</label>
                  <input
                    type="text"
                    value={newTableNo}
                    onChange={e => setNewTableNo(e.target.value)}
                    placeholder="e.g. 4 or T-12"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Order Type</label>
                  <select
                    value={newOrderType}
                    onChange={e => setNewOrderType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  >
                    <option value="Dine-In">Dine-In</option>
                    <option value="Takeaway">Takeaway</option>
                    <option value="Delivery">Delivery</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Default Station</label>
                  <select
                    value={newStation}
                    onChange={e => setNewStation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none"
                  >
                    {availableStations.map(st => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-rose-300">
                    <input
                      type="checkbox"
                      checked={newPriority}
                      onChange={e => setNewPriority(e.target.checked)}
                      className="w-4 h-4 rounded text-rose-600"
                    />
                    Mark as RUSH (Priority)
                  </label>
                </div>
              </div>

              {/* Items Line Builder */}
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-700 space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase">Add Dishes / Items</div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    placeholder="Item name (e.g. Grilled Chicken)"
                    className="flex-1 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
                  />
                  <input
                    type="number"
                    min="1"
                    value={newItemQty}
                    onChange={e => setNewItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white text-center"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newItemName.trim()) return;
                      setTempItems(prev => [
                        ...prev,
                        {
                          productName: newItemName.trim(),
                          quantity: newItemQty,
                          notes: newItemNotes.trim() || undefined,
                          station: newStation,
                        },
                      ]);
                      setNewItemName('');
                      setNewItemQty(1);
                      setNewItemNotes('');
                    }}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold"
                  >
                    Add
                  </button>
                </div>

                {tempItems.length > 0 && (
                  <ul className="space-y-1 divide-y divide-slate-800 pt-2 text-xs">
                    {tempItems.map((it, idx) => (
                      <li key={idx} className="flex justify-between items-center py-1">
                        <span className="font-semibold text-slate-200">
                          {it.quantity}× {it.productName}
                        </span>
                        <button
                          type="button"
                          onClick={() => setTempItems(prev => prev.filter((_, i) => i !== idx))}
                          className="text-rose-400 hover:text-rose-300 font-bold"
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300">Special Cooking Notes</label>
                <textarea
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                  placeholder="e.g. Less spicy, extra sauce, no onions..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-bold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={tempItems.length === 0}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Create & Send to KDS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: THERMAL KOT TICKET PREVIEW & PRINT
         ───────────────────────────────────────────────────────────── */}
      {printingTicket && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden print:shadow-none print:rounded-none print:max-w-full kot-ticket-print text-slate-950 font-mono">
            {/* Screen toolbar (hidden in print) */}
            <div className="flex justify-between items-center p-3.5 bg-slate-100 border-b border-slate-200 print:hidden">
              <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-orange-600" />
                KOT Thermal Ticket ({settings.kotPaperMm}mm)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print
                </button>
                <button
                  onClick={() => setPrintingTicket(null)}
                  className="p-1 hover:bg-slate-200 rounded-lg text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Thermal Slip Content */}
            <div
              className={`p-5 text-black ${
                settings.kotDensity === 'compact' ? 'space-y-1.5' : 'space-y-2.5'
              }`}
              style={{ fontSize: `${settings.kotFontSize}pt` }}
            >
              <div className="text-center pb-2 border-b-2 border-dashed border-black">
                <p className="font-black text-sm uppercase tracking-wide">{user?.businessName || 'BIZORA RESTAURANT'}</p>
                <p className="text-[11px] font-bold uppercase">{settings.kotTitle || 'KITCHEN ORDER TICKET'}</p>
                {printingTicket.priority && (
                  <p className="text-xs font-black bg-black text-white px-2 py-0.5 mt-1 inline-block uppercase">
                    *** PRIORITY RUSH ***
                  </p>
                )}
              </div>

              <div className="border-b border-dashed border-black pb-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Ticket No:</span>
                  <span className="font-bold">#{printingTicket.ticketNo}</span>
                </div>
                {settings.kotShowTable && (
                  <div className="flex justify-between font-bold text-sm">
                    <span>Table / Order:</span>
                    <span>
                      {printingTicket.tableNo || printingTicket.tableNumber
                        ? `Table ${printingTicket.tableNo || printingTicket.tableNumber}`
                        : printingTicket.orderType}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Station:</span>
                  <span className="font-bold uppercase">{printingTicket.station || 'Main Kitchen'}</span>
                </div>
                {settings.kotShowInvoice && printingTicket.saleInvoiceNo && (
                  <div className="flex justify-between">
                    <span>Invoice #:</span>
                    <span>{printingTicket.saleInvoiceNo}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span>{new Date(printingTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Items Line */}
              <div className="py-2 space-y-2 border-b-2 border-dashed border-black">
                {printingTicket.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-start text-xs">
                    <div className="flex-1 pr-2">
                      <span className="font-black text-sm">{it.quantity}× </span>
                      <span className="font-bold text-sm">{it.productName}</span>
                      {it.notes && <p className="text-[10px] italic mt-0.5">Note: {it.notes}</p>}
                    </div>
                    {settings.kotShowStation && it.station && (
                      <span className="text-[10px] font-bold uppercase text-slate-700">[{it.station}]</span>
                    )}
                  </div>
                ))}
              </div>

              {printingTicket.notes && (
                <div className="border-b border-dashed border-black pb-2 text-[11px]">
                  <span className="font-bold">Special Note: </span>
                  {printingTicket.notes}
                </div>
              )}

              {/* Barcode / Ticket ID */}
              {settings.kotShowBarcode && (
                <div className="pt-2 text-center space-y-1">
                  <div className="font-mono text-xs tracking-widest font-black py-1 bg-slate-100 border border-dashed border-slate-400">
                    ||||| {printingTicket.ticketNo} |||||
                  </div>
                  <p className="text-[9px] uppercase tracking-wider">{settings.kotFooter}</p>
                </div>
              )}
            </div>
          </div>

          <style>{`
            @media print {
              @page { margin: 0; size: ${settings.kotPaperMm}mm auto; }
              body, html, #root { height: auto !important; overflow: visible !important; background: white !important; }
              body * { visibility: hidden; }
              .kot-ticket-print, .kot-ticket-print * { visibility: visible; }
              .kot-ticket-print {
                position: absolute; left: 0; top: 0; width: 100%;
                box-shadow: none !important; border: none !important;
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default KitchenDisplay;
