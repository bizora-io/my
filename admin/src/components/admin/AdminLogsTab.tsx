import React from 'react';
import {
  FileText, Search, Filter, Download, Shield
} from 'lucide-react';

type Props = {
  isSuperAdmin: any;
  logFilter: any;
  logLoginAsOnly: any;
  setLogFilter: any;
  setLogLoginAsOnly: any;
  user: any;
  logs?: any[];
};

export const AdminLogsTab: React.FC<Props> = ({
  isSuperAdmin,
  logFilter,
  logLoginAsOnly,
  setLogFilter,
  setLogLoginAsOnly,
  user,
  logs = [],
}) => (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-4">
                            <h2 className="font-bold text-slate-800 text-lg">System Audit Logs</h2>
                            <select 
                                value={logFilter}
                                onChange={(e) => setLogFilter(e.target.value)}
                                className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="All">All Modules</option>
                                {Array.from(new Set(logs.map(l => l.module))).map(mod => (
                                    <option key={mod} value={mod}>{mod}</option>
                                ))}
                            </select>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1.5 rounded-lg cursor-pointer">
                                <input type="checkbox" checked={logLoginAsOnly} onChange={(e) => setLogLoginAsOnly(e.target.checked)} className="rounded border-amber-300 text-amber-600" />
                                Login-As only
                            </label>

                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 border border-slate-200 rounded hover:bg-slate-100 text-slate-600" title="Export Logs">
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Time</th>
                                    <th className="px-6 py-4">User</th>
                                    <th className="px-6 py-4">Module</th>
                                    <th className="px-6 py-4">Action</th>
                                    <th className="px-6 py-4">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {logs
                                    .filter(log => (logFilter === 'All' || log.module === logFilter) && (!logLoginAsOnly || (log as any).isLoginAs))
                                    .map(log => (
                                    <tr key={log.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-500 text-xs">{log.time}</td>
                                        <td className="px-6 py-4 font-bold text-slate-800">{log.user}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                                                {log.module}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-medium text-slate-700">{log.action}</td>
                                        <td className="px-6 py-4 text-slate-500">{log.details}</td>
                                    </tr>
                                ))}
                                {logs.filter(log => (logFilter === 'All' || log.module === logFilter) && (!logLoginAsOnly || (log as any).isLoginAs)).length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                            No logs found for selected filter.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
);

export default AdminLogsTab;
