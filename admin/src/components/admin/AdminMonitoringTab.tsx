import React, { useEffect, useState } from 'react';
import { Activity, Server, RefreshCw } from 'lucide-react';
import { authFetch } from '../../lib/apiClient';

type Stats = {
  cpu?: number;
  ram?: number;
  uptimeSeconds?: number;
  nodeVersion?: string;
};

export const AdminMonitoringTab: React.FC = () => {
  const [stats, setStats] = useState<Stats>({ cpu: 0, ram: 0, uptimeSeconds: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authFetch('/api/admin/monitoring');
      if (res.ok) {
        const data = await res.json();
        setStats({
          cpu: Number(data.cpu ?? data.cpuPercent ?? 0),
          ram: Number(data.ram ?? data.memoryPercent ?? 0),
          uptimeSeconds: Number(data.uptimeSeconds ?? data.uptime ?? 0),
          nodeVersion: data.nodeVersion || data.node || '',
        });
      } else {
        // Demo fallback so UI never blank-crashes
        setStats({
          cpu: 12,
          ram: 38,
          uptimeSeconds: 3600,
          nodeVersion: '',
        });
        setError('Live monitoring API unavailable — showing placeholder metrics');
      }
    } catch {
      setStats({ cpu: 8, ram: 32, uptimeSeconds: 0 });
      setError('Could not reach monitoring endpoint');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, []);

  const uptime = stats.uptimeSeconds || 0;
  const h = Math.floor(uptime / 3600);
  const m = Math.floor((uptime % 3600) / 60);

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" /> Monitoring
          </h2>
          <p className="text-xs text-slate-500">CPU / memory / uptime (poll 15s)</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-white flex items-center gap-1.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      {error && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Meter label="CPU" value={stats.cpu || 0} />
        <Meter label="Memory" value={stats.ram || 0} />
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-[10px] font-black uppercase text-slate-400">Uptime</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {h}h {m}m
          </p>
          <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
            <Server className="w-3 h-3" /> Node {stats.nodeVersion || '—'}
          </p>
        </div>
      </div>
    </div>
  );
};

function Meter({ label, value }: { label: string; value: number }) {
  const v = Math.min(100, Math.max(0, Number(value) || 0));
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
      <div className="flex justify-between">
        <span className="text-[10px] font-black uppercase text-slate-400">{label}</span>
        <span className="text-xs font-black text-indigo-600">{v.toFixed(0)}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2.5">
        <div className="bg-indigo-600 h-2.5 rounded-full transition-all" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export default AdminMonitoringTab;
