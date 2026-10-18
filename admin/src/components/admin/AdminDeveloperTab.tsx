import React from 'react';
import { Terminal, Play } from 'lucide-react';

type Props = {
  terminalLogs?: string[];
  setTerminalLogs?: (v: string[] | ((p: string[]) => string[])) => void;
  devLogsInput?: string;
  setDevLogsInput?: (v: string) => void;
};

export const AdminDeveloperTab: React.FC<Props> = ({
  terminalLogs = [],
  setTerminalLogs,
  devLogsInput = '',
  setDevLogsInput,
}) => {
  const logs = Array.isArray(terminalLogs) ? terminalLogs : [];

  const run = () => {
    const cmd = (devLogsInput || '').trim() || 'status';
    const line = `> ${cmd}\n  ok · ${new Date().toLocaleTimeString()}`;
    setTerminalLogs?.((prev: string[]) => [...(Array.isArray(prev) ? prev : []), line]);
    setDevLogsInput?.('');
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div>
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-600" /> Developer
        </h2>
        <p className="text-xs text-slate-500">Sandbox console (local only)</p>
      </div>

      <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 font-mono text-xs text-emerald-400 min-h-[280px] max-h-[400px] overflow-y-auto whitespace-pre-wrap">
        {logs.length === 0 && <span className="text-slate-500">Ready. Type a command below.</span>}
        {logs.map((l, i) => (
          <div key={i} className="mb-2">
            {l}
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm font-mono"
          value={devLogsInput}
          onChange={(e) => setDevLogsInput?.(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="status | ping | clear"
        />
        <button
          type="button"
          onClick={run}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center gap-1.5"
        >
          <Play className="w-4 h-4" /> Run
        </button>
        <button
          type="button"
          onClick={() => setTerminalLogs?.([])}
          className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default AdminDeveloperTab;
