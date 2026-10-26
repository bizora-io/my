import React, { useState, useEffect, useCallback } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Truck, Plus, RefreshCw, Fuel, Wrench, Gauge, DollarSign } from 'lucide-react';
import { authFetch } from '../lib/apiClient';

interface VehicleLog {
  id: string;
  logType: string;
  odometer: number;
  cost: number;
  liters?: number;
  vendorName?: string;
  notes?: string;
  date: string;
}

interface Vehicle {
  id: string;
  regNumber: string;
  model: string;
  type: string;
  driverName?: string;
  driverPhone?: string;
  currentOdometer: number;
  fuelType: string;
  status: 'ACTIVE' | 'MAINTENANCE' | 'INACTIVE';
  totalCostIncurred: number;
}

export const Vehicles: React.FC = () => {
  const { t, formatCurrency } = useSettings();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [vehicleLogs, setVehicleLogs] = useState<VehicleLog[]>([]);

  // Add vehicle form
  const [regNumber, setRegNumber] = useState('');
  const [model, setModel] = useState('');
  const [vehicleType, setVehicleType] = useState('Truck');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [odometer, setOdometer] = useState<number>(0);
  const [fuelType, setFuelType] = useState('Diesel');

  // Log form
  const [logType, setLogType] = useState('FUEL');
  const [logOdo, setLogOdo] = useState<number>(0);
  const [logCost, setLogCost] = useState<number>(0);
  const [logLiters, setLogLiters] = useState<number>(0);
  const [logVendor, setLogVendor] = useState('');
  const [logNotes, setLogNotes] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/vehicles');
      if (res.ok) setVehicles(await res.json());
    } catch (e) {
      console.warn('Failed to load vehicles', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadVehicleDetails = async (v: Vehicle) => {
    setSelectedVehicle(v);
    setLogOdo(v.currentOdometer);
    try {
      const res = await authFetch(`/api/vehicles/${v.id}`);
      if (res.ok) {
        const data = await res.json();
        setVehicleLogs(data.logs || []);
      }
    } catch (e) {
      console.warn('Failed to load vehicle details', e);
    }
  };

  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regNumber) return;
    try {
      const res = await authFetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regNumber,
          model,
          type: vehicleType,
          driverName,
          driverPhone,
          currentOdometer: odometer,
          fuelType,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setRegNumber('');
        setModel('');
        loadData();
      }
    } catch (e) {
      console.warn('Create vehicle failed', e);
    }
  };

  const handleAddLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVehicle || logCost <= 0) return;
    try {
      const res = await authFetch(`/api/vehicles/${selectedVehicle.id}/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logType,
          odometer: logOdo,
          cost: logCost,
          liters: logLiters,
          vendorName: logVendor,
          notes: logNotes,
        }),
      });
      if (res.ok) {
        setLogCost(0);
        setLogLiters(0);
        setLogNotes('');
        loadVehicleDetails(selectedVehicle);
        loadData();
      }
    } catch (e) {
      console.warn('Add vehicle log failed', e);
    }
  };

  const totalFleetCost = vehicles.reduce((s, v) => s + (v.totalCostIncurred || 0), 0);

  return (
    <div className="p-4 lg:p-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
            {t('Fleet & Vehicle Management')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('Manage delivery vans, trucks, mileage tracking, fuel logs, and automated fleet expense postings.')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            {t('Register Vehicle')}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Total Fleet Size')}
          </span>
          <span className="text-2xl font-bold text-slate-900 dark:text-white">
            {vehicles.length} {t('vehicles')}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Active On Road')}
          </span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {vehicles.filter((v) => v.status === 'ACTIVE').length}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
            {t('Total Fuel & Fleet Cost')}
          </span>
          <span className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
            {formatCurrency(totalFleetCost)}
          </span>
        </div>
      </div>

      {/* Vehicle Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {vehicles.map((v) => (
          <div
            key={v.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 hover:border-cyan-400 transition-all cursor-pointer"
            onClick={() => loadVehicleDetails(v)}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 uppercase">
                  {v.type}
                </span>
                <h3 className="font-extrabold text-lg text-slate-900 dark:text-white mt-1">
                  {v.regNumber}
                </h3>
                <p className="text-xs text-slate-500">{v.model || 'Commercial Vehicle'}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  v.status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {v.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block">{t('Driver')}</span>
                <span className="font-semibold text-slate-800 dark:text-white">{v.driverName || 'Unassigned'}</span>
              </div>
              <div>
                <span className="text-slate-400 block">{t('Odometer')}</span>
                <span className="font-semibold text-slate-800 dark:text-white">{v.currentOdometer.toLocaleString()} km</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500">{t('Total Spent')}:</span>
              <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(v.totalCostIncurred)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Vehicle Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Truck className="w-5 h-5 text-cyan-600" />
              {t('Register Fleet Vehicle')}
            </h2>
            <form onSubmit={handleCreateVehicle} className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  {t('Registration Number')} *
                </label>
                <input
                  value={regNumber}
                  onChange={(e) => setRegNumber(e.target.value)}
                  placeholder="e.g. DHAKA-METRO-TA-11-2034"
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-lg text-sm font-semibold uppercase"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Model')}</label>
                  <input
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Isuzu 3.5 Ton"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Vehicle Type')}</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  >
                    <option value="Truck">Truck</option>
                    <option value="Van">Delivery Van</option>
                    <option value="Pickup">Pickup</option>
                    <option value="Motorcycle">Motorcycle</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Driver Name')}</label>
                  <input
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="Driver's name"
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">{t('Initial Odometer')}</label>
                  <input
                    type="number"
                    value={odometer}
                    onChange={(e) => setOdometer(Number(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg text-sm">
                  {t('Cancel')}
                </button>
                <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg text-sm font-semibold">
                  {t('Save Vehicle')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vehicle Log & Details Modal */}
      {selectedVehicle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">{selectedVehicle.regNumber}</h2>
                <span className="text-xs text-slate-400">
                  {selectedVehicle.model} • Driver: {selectedVehicle.driverName || 'N/A'} • Odometer: {selectedVehicle.currentOdometer} km
                </span>
              </div>
              <button onClick={() => setSelectedVehicle(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            {/* Log form */}
            <form onSubmit={handleAddLog} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border space-y-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase">
                + {t('Log Fuel, Maintenance, or Toll')} (Auto-posts to Expense Ledger)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={logType}
                  onChange={(e) => setLogType(e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-xs"
                >
                  <option value="FUEL">Fuel / Refill</option>
                  <option value="MAINTENANCE">Maintenance / Service</option>
                  <option value="TOLL">Toll Fee</option>
                  <option value="TIRE">Tire / Parts</option>
                </select>
                <input
                  type="number"
                  placeholder="Current Odo (km)"
                  value={logOdo}
                  onChange={(e) => setLogOdo(Number(e.target.value))}
                  className="px-3 py-1.5 border rounded-lg text-xs"
                />
                <input
                  type="number"
                  placeholder="Cost (Tk)"
                  value={logCost || ''}
                  onChange={(e) => setLogCost(Number(e.target.value))}
                  className="px-3 py-1.5 border rounded-lg text-xs font-bold"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Workshop / Fuel Station"
                  value={logVendor}
                  onChange={(e) => setLogVendor(e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-xs"
                />
                <input
                  placeholder="Notes / Invoice Ref"
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="px-3 py-1.5 border rounded-lg text-xs"
                />
              </div>
              <div className="flex justify-end">
                <button type="submit" className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-xs font-bold">
                  {t('Record Log')}
                </button>
              </div>
            </form>

            {/* Logs List */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase text-slate-600 dark:text-slate-400">
                {t('Service & Fuel History')} ({vehicleLogs.length})
              </span>
              {vehicleLogs.length === 0 ? (
                <p className="text-xs text-slate-400 p-4 border rounded-lg text-center">No logs recorded yet.</p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                  {vehicleLogs.map((l) => (
                    <div key={l.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-white mr-2">{l.logType}</span>
                        <span className="text-slate-500">
                          {l.vendorName ? `${l.vendorName} • ` : ''}{l.odometer} km
                        </span>
                        {l.notes && <div className="text-[11px] text-slate-400">{l.notes}</div>}
                      </div>
                      <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(l.cost)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Vehicles;

