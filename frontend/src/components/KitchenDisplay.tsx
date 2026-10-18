import React, { useState, useMemo } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, KitchenOrder } from '../contexts/DataContext';
import { ChefHat, CheckCircle2, Utensils, Users, Timer, Printer } from 'lucide-react';
import KOTTicket from './KOTTicket';

const COLUMNS: { status: KitchenOrder['status']; label: string; color: string; nextLabel?: string; next?: KitchenOrder['status'] }[] = [
  { status: 'Pending', label: 'New Orders', color: 'border-red-400 bg-red-50', nextLabel: 'Start Cooking', next: 'Preparing' },
  { status: 'Preparing', label: 'Preparing', color: 'border-amber-400 bg-amber-50', nextLabel: 'Mark Ready', next: 'Ready' },
  { status: 'Ready', label: 'Ready to Serve', color: 'border-emerald-400 bg-emerald-50', nextLabel: 'Mark Served', next: 'Served' },
];

function minutesAgo(iso: string) {
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

const KitchenDisplay: React.FC = () => {
  const { t } = useSettings();
  const { kitchenOrders, updateKitchenOrderStatus } = useData();
  const [stationFilter, setStationFilter] = useState<string>('All');
  const [printingOrder, setPrintingOrder] = useState<KitchenOrder | null>(null);

  const stations = useMemo(
    () => Array.from(new Set(kitchenOrders.map(o => o.station))).sort(),
    [kitchenOrders]
  );

  const activeOrders = useMemo(
    () => kitchenOrders
      .filter(o => o.status !== 'Served' && o.status !== 'Cancelled')
      .filter(o => stationFilter === 'All' || o.station === stationFilter)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [kitchenOrders, stationFilter]
  );

  const servedToday = useMemo(() => {
    const todayStr = new Date().toDateString();
    return kitchenOrders.filter(o => o.status === 'Served' && new Date(o.updatedAt).toDateString() === todayStr).length;
  }, [kitchenOrders]);

  return (
    <div className="p-4 lg:p-8 space-y-6 animate-in fade-in duration-300 min-h-screen bg-slate-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ChefHat className="w-6 h-6 text-orange-600" /> {t('Kitchen Display')}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Orders sent from POS appear here instantly. Tap a card to advance its status.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-bold text-slate-700">{servedToday}</span>
          <span className="text-xs text-slate-400">served today</span>
        </div>
      </div>

      {stations.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setStationFilter('All')}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${stationFilter === 'All' ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
          >
            All Stations
          </button>
          {stations.map(station => (
            <button
              key={station}
              onClick={() => setStationFilter(station)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-colors ${stationFilter === station ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
            >
              {station}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {COLUMNS.map(col => {
          const orders = activeOrders.filter(o => o.status === col.status);
          return (
            <div key={col.status} className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{col.label}</h2>
                <span className="text-xs font-bold bg-white px-2 py-0.5 rounded-full border border-slate-200 text-slate-500">{orders.length}</span>
              </div>
              <div className="space-y-3 min-h-[120px]">
                {orders.length === 0 && (
                  <div className="text-center text-xs text-slate-400 py-8 border-2 border-dashed border-slate-200 rounded-xl">No orders here</div>
                )}
                {orders.map(order => {
                  const age = minutesAgo(order.createdAt);
                  return (
                    <div key={order.id} className={`bg-white rounded-xl border-2 ${col.color} p-4 shadow-sm`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                            {order.orderType === 'Dine-In' ? <Utensils className="w-3.5 h-3.5" /> : <Users className="w-3.5 h-3.5" />}
                            {order.orderType === 'Dine-In' ? `Table ${order.tableNumber || '—'}` : order.orderType}
                          </div>
                          {stationFilter === 'All' && (
                            <span className="text-[10px] font-bold text-orange-600 uppercase">{order.station}</span>
                          )}
                        </div>
                        <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${age > 15 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                          <Timer className="w-3 h-3" /> {age}m
                        </div>
                      </div>
                      <ul className="space-y-1 mb-3">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="text-sm text-slate-600 flex justify-between">
                            <span>{item.name}</span>
                            <span className="font-bold text-slate-800">×{item.qty}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="flex gap-2">
                        {col.next && (
                          <button
                            onClick={() => updateKitchenOrderStatus(order.id, col.next!)}
                            className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors"
                          >
                            {col.nextLabel}
                          </button>
                        )}
                        <button onClick={() => setPrintingOrder(order)} className="p-2 border border-slate-200 rounded-lg text-slate-400 hover:text-slate-700">
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {printingOrder && (
        <KOTTicket order={printingOrder} onClose={() => setPrintingOrder(null)} />
      )}
    </div>
  );
};

export default KitchenDisplay;
