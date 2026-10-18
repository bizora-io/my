import React, { useState, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { 
    Search, Filter, Calendar, Download, Trash2, AlertTriangle, 
    CheckCircle2, Info, X, ChevronRight, Eye, RefreshCw, 
    SlidersHorizontal, Clock, ShieldAlert, ShieldCheck, UserCheck, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AuditLog: React.FC = () => {
    const { t, formatMoney, currencySymbol } = useSettings();
    const { activityLogs, logActivity } = useAuth();
    
    // UI Local State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModule, setSelectedModule] = useState('All');
    const [selectedSeverity, setSelectedSeverity] = useState('All'); // All, Critical, Warning, Info
    const [dateFilter, setDateFilter] = useState('All'); // All, Today, Last7, Last30
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest
    const [selectedLog, setSelectedLog] = useState<any | null>(null);
    const [showFilters, setShowFilters] = useState(false);

    // Helpers to determine severity of actions
    const getSeverity = (action: string, module: string): 'critical' | 'warning' | 'info' => {
        const lowerAction = (action || '').toLowerCase();
        const lowerModule = (module || '').toLowerCase();

        if (
            lowerAction.includes('override') || 
            lowerAction.includes('delete') || 
            lowerAction.includes('disable') || 
            lowerAction.includes('reject') ||
            lowerAction.includes('terminate') ||
            lowerAction.includes('impersonat')
        ) {
            return 'critical';
        }

        if (
            lowerAction.includes('update') || 
            lowerAction.includes('edit') || 
            lowerAction.includes('timer') || 
            lowerAction.includes('reset') ||
            lowerModule.includes('security') ||
            lowerAction.includes('fail')
        ) {
            return 'warning';
        }

        return 'info';
    };

    // Filter and Sort calculation
    const processedLogs = useMemo(() => {
        let logs = [...activityLogs];

        // 1. Search Query Filter
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            logs = logs.filter(log => 
                (log.action || '').toLowerCase().includes(query) ||
                (log.details && log.details.toLowerCase().includes(query)) ||
                (log.userName || '').toLowerCase().includes(query) ||
                (log.module || '').toLowerCase().includes(query) ||
                (log.id || '').toLowerCase().includes(query)
            );
        }

        // 2. Module Filter
        if (selectedModule !== 'All') {
            logs = logs.filter(log => log.module === selectedModule);
        }

        // 3. Severity Filter
        if (selectedSeverity !== 'All') {
            logs = logs.filter(log => {
                const sev = getSeverity(log.action, log.module);
                return sev === selectedSeverity.toLowerCase();
            });
        }

        // 4. Date Filter
        if (dateFilter !== 'All') {
            const now = new Date();
            logs = logs.filter(log => {
                const logDate = new Date(log.timestamp);
                const diffTime = Math.abs(now.getTime() - logDate.getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (dateFilter === 'Today') {
                    return logDate.toDateString() === now.toDateString();
                } else if (dateFilter === 'Last7') {
                    return diffDays <= 7;
                } else if (dateFilter === 'Last30') {
                    return diffDays <= 30;
                }
                return true;
            });
        }

        // 5. Sorting
        logs.sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return logs;
    }, [activityLogs, searchQuery, selectedModule, selectedSeverity, dateFilter, sortBy]);

    // Derived Statistics
    const stats = useMemo(() => {
        const total = activityLogs.length;
        
        let critical = 0;
        let warnings = 0;
        let infoCount = 0;
        const uniqueUsers = new Set<string>();

        activityLogs.forEach(log => {
            const sev = getSeverity(log.action, log.module);
            if (sev === 'critical') critical++;
            else if (sev === 'warning') warnings++;
            else infoCount++;

            if (log.userName) {
                uniqueUsers.add(log.userName);
            }
        });

        return {
            total,
            critical,
            warnings,
            infoCount,
            activeUsers: uniqueUsers.size
        };
    }, [activityLogs]);

    // Unique modules in logs for dropdown
    const availableModules = useMemo(() => {
        const mods = new Set<string>();
        activityLogs.forEach(log => {
            if (log.module) mods.add(log.module);
        });
        return Array.from(mods);
    }, [activityLogs]);

    // CSV Export Handler
    const handleExportCSV = () => {
        if (processedLogs.length === 0) return;

        const headers = ['Log ID', 'Timestamp', 'User', 'Module', 'Action Severity', 'Action', 'Detailed Log Summary'];
        const csvRows = [
            headers.join(','),
            ...processedLogs.map(log => {
                const sev = getSeverity(log.action, log.module).toUpperCase();
                const sanitizedDetails = log.details 
                    ? `"${log.details.replace(/"/g, '""')}"` 
                    : '""';
                return [
                    log.id,
                    log.timestamp,
                    `"${log.userName.replace(/"/g, '""')}"`,
                    log.module,
                    sev,
                    `"${log.action.replace(/"/g, '""')}"`,
                    sanitizedDetails
                ].join(',');
            })
        ];

        const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `bizora_audit_report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        logActivity('Export Audit Log', 'Admin', `Exported ${processedLogs.length} logs to CSV format`);
    };

    // Format Timestamp Helper
    const formatTime = (isoString: string) => {
        try {
            const date = new Date(isoString);
            return date.toLocaleString();
        } catch (e) {
            return isoString;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header / Trigger */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-indigo-600 animate-pulse" />
                        {t('System Oversight Audit Trail')}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {t('Track and investigate sensitive transactions, price overrides, security state changes, and staff actions.')}
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`py-2 px-3.5 border rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                            showFilters 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                        <SlidersHorizontal className="w-4 h-4" />
                        {t('Filters')}
                        {(selectedModule !== 'All' || selectedSeverity !== 'All' || dateFilter !== 'All') && (
                            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                        )}
                    </button>
                    
                    <button
                        onClick={handleExportCSV}
                        disabled={processedLogs.length === 0}
                        className="py-2 px-4 bg-slate-900 border border-slate-950 hover:bg-slate-800 text-white rounded-lg text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                        <Download className="w-4 h-4" />
                        {t('Export CSV')}
                    </button>
                </div>
            </div>

            {/* Overview Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{t('Total Events')}</p>
                        <h4 className="text-2xl font-bold text-slate-800">{stats.total}</h4>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                        <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{t('Critical Audits')}</p>
                        <h4 className="text-2xl font-bold text-red-600">{stats.critical}</h4>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                        <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{t('Warnings')}</p>
                        <h4 className="text-2xl font-bold text-amber-600">{stats.warnings}</h4>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{t('Active Users')}</p>
                        <h4 className="text-2xl font-bold text-slate-800">{stats.activeUsers}</h4>
                    </div>
                </div>
            </div>

            {/* Expanded Analytics Filter Block */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Filter: Module */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{t('Filter Module')}</label>
                                <select 
                                    value={selectedModule} 
                                    onChange={(e) => setSelectedModule(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                                >
                                    <option value="All">{t('All Modules')}</option>
                                    {availableModules.map(mod => (
                                        <option key={mod} value={mod}>{mod}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Filter: Severity */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{t('Severity Level')}</label>
                                <select 
                                    value={selectedSeverity} 
                                    onChange={(e) => setSelectedSeverity(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                                >
                                    <option value="All">{t('All Severities')}</option>
                                    <option value="Critical">{t('⚡ Critical Overrides')}</option>
                                    <option value="Warning">{t('⚠️ Warnings')}</option>
                                    <option value="Info">{t('ℹ️ General System Info')}</option>
                                </select>
                            </div>

                            {/* Filter: Date Range */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{t('Target Timeframe')}</label>
                                <select 
                                    value={dateFilter} 
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                                >
                                    <option value="All">{t('All History')}</option>
                                    <option value="Today">{t('Today Only')}</option>
                                    <option value="Last7">{t('Last 7 Days')}</option>
                                    <option value="Last30">{t('Last 30 Days')}</option>
                                </select>
                            </div>

                            {/* Order */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">{t('Sort Direction')}</label>
                                <select 
                                    value={sortBy} 
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-700"
                                >
                                    <option value="newest">{t('Newest First')}</option>
                                    <option value="oldest">{t('Oldest First')}</option>
                                </select>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Smart Search Bar */}
            <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('Search log trails by action, operator name, description details, or module...')}
                    className="w-full pl-10 pr-4 py-3 border border-slate-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm placeholder:text-slate-400 font-medium text-slate-700"
                />
                {searchQuery && (
                    <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 p-1 transition-colors"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                )}
            </div>

            {/* Audit Logs Table Block */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-wide text-[11px]">
                            <tr>
                                <th className="px-6 py-4">{t('Timestamp')}</th>
                                <th className="px-6 py-4">{t('Log ID')}</th>
                                <th className="px-6 py-4">{t('User/Agent')}</th>
                                <th className="px-6 py-4">{t('Impact')}</th>
                                <th className="px-6 py-4">{t('Category/Module')}</th>
                                <th className="px-6 py-4">{t('Action Trail')}</th>
                                <th className="px-6 py-4 text-right">{t('Action')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {processedLogs.map((log) => {
                                const severity = getSeverity(log.action, log.module);
                                return (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4 text-slate-500 font-mono text-xs whitespace-nowrap">
                                            {formatTime(log.timestamp)}
                                        </td>
                                        <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                                            #{log.id}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-800 whitespace-nowrap">
                                            {log.userName}
                                        </td>
                                        <td className="px-6 py-4">
                                            {severity === 'critical' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-xs font-bold font-mono border border-red-155">
                                                    <ShieldAlert className="w-3 h-3" />
                                                    CRITICAL
                                                </span>
                                            ) : severity === 'warning' ? (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-bold font-mono border border-amber-100">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    WARNING
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold font-mono border border-emerald-100">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    OK
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold">
                                                {log.module}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-700 font-medium">
                                            <div className="flex flex-col">
                                                <span className="text-slate-800 font-semibold">{log.action}</span>
                                                {log.details && (
                                                    <span className="text-xs text-slate-500 line-clamp-1 group-hover:line-clamp-none max-w-sm transition-all">
                                                        {log.details}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => setSelectedLog(log)}
                                                className="p-1 px-2.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-bold flex items-center gap-1 inline-flex transition-colors cursor-pointer"
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                {t('Inspect')}
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}

                            {processedLogs.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                                        <Info className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                                        <p className="font-medium text-sm text-slate-500">{t('No audit trail match found.')}</p>
                                        <p className="text-xs text-slate-400 mt-1">{t('Try adjusting your keywords, module categories, or timeframe filters.')}</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* LOG DETAILS MODAL DIALOG */}
            <AnimatePresence>
                {selectedLog && (
                    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-150 overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <div>
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                                        {selectedLog.module} // ID: {selectedLog.id}
                                    </span>
                                    <h3 className="text-lg font-extrabold text-slate-900">
                                        {t('Audit Log Inspection')}
                                    </h3>
                                </div>
                                <button 
                                    onClick={() => setSelectedLog(null)}
                                    className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                                    id="close-audit-inspect"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Modal Content */}
                            <div className="p-6 space-y-5">
                                {/* Time, user and impact info */}
                                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    <div>
                                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('Operator Agent')}</span>
                                        <span className="font-extrabold text-slate-800 text-sm">{selectedLog.userName}</span>
                                        <span className="block text-xs text-slate-500 font-mono">UID: {selectedLog.userId}</span>
                                    </div>
                                    <div>
                                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t('Severity Severity')}</span>
                                        <span className="mt-1 block">
                                            {getSeverity(selectedLog.action, selectedLog.module) === 'critical' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-bold font-mono">
                                                    CRITICAL trail
                                                </span>
                                            ) : getSeverity(selectedLog.action, selectedLog.module) === 'warning' ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full text-xs font-bold font-mono">
                                                    WARNING trail
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold font-mono">
                                                    INFO trail
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                </div>

                                {/* Main Action */}
                                <div>
                                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t('Action Executed')}</span>
                                    <p className="text-slate-800 font-bold text-base py-1.5 bg-indigo-50/50 px-3 rounded-lg border border-indigo-100">
                                        {selectedLog.action}
                                    </p>
                                </div>

                                {/* Full Action Details */}
                                <div>
                                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t('Dynamic Action Details')}</span>
                                    <div className="bg-slate-900 border border-slate-800 text-[#38bdf8] p-4 rounded-xl font-mono text-xs whitespace-pre-wrap leading-relaxed shadow-inner">
                                        {selectedLog.details || t('No extended metadata was reported with this action.')}
                                    </div>
                                </div>

                                {/* Timestamp info */}
                                <div className="text-[11px] text-slate-400 flex items-center justify-between font-mono pt-3 border-t border-slate-100">
                                    <span>{t('Timestamp')}: {formatTime(selectedLog.timestamp)}</span>
                                    <span>ID: {selectedLog.id}</span>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                <button
                                    onClick={() => setSelectedLog(null)}
                                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-all cursor-pointer"
                                >
                                    {t('Got It')}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
