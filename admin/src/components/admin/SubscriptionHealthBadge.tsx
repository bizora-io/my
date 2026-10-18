import React from 'react';
import { ShieldAlert, AlertTriangle, Clock, CheckCircle, AlertCircle } from 'lucide-react';

const getSubscriptionHealth = (expiryStr: string) => {
    if (!expiryStr) {
        return { 
            status: 'Unknown', 
            color: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800', 
            desc: 'No Expiry Set',
            icon: 'AlertCircle'
        };
    }
    
    try {
        const expiryDate = new Date(expiryStr);
        if (isNaN(expiryDate.getTime())) {
            return { 
                status: 'Unknown', 
                color: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800', 
                desc: 'Invalid Date',
                icon: 'AlertCircle'
            };
        }
        
        const currentDate = new Date('2026-07-06');
        const d1 = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());
        const d2 = new Date(expiryDate.getFullYear(), expiryDate.getMonth(), expiryDate.getDate());
        
        const diffTime = d2.getTime() - d1.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
            return { 
                status: 'Expired', 
                color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/50', 
                desc: 'Expired',
                icon: 'ShieldAlert'
            };
        } else if (diffDays <= 7) {
            return { 
                status: 'Urgent', 
                color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50 animate-pulse', 
                desc: `${diffDays}d left`,
                icon: 'AlertTriangle'
            };
        } else if (diffDays <= 15) {
            return { 
                status: 'Warning', 
                color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50', 
                desc: `${diffDays}d left`,
                icon: 'Clock'
            };
        } else if (diffDays <= 30) {
            return { 
                status: 'Expiring', 
                color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50', 
                desc: `${diffDays}d left`,
                icon: 'Clock'
            };
        } else {
            return { 
                status: 'Healthy', 
                color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/50', 
                desc: 'Active',
                icon: 'CheckCircle'
            };
        }
    } catch (e) {
        return { 
            status: 'Unknown', 
            color: 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-400 dark:border-slate-800', 
            desc: 'Error',
            icon: 'AlertCircle'
        };
    }
};

const SubscriptionHealthBadge: React.FC<{ expiry: string }> = ({ expiry }) => {
    const health = getSubscriptionHealth(expiry);
    
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${health.color}`}>
            {health.icon === 'ShieldAlert' && <ShieldAlert className="w-3 h-3" />}
            {health.icon === 'AlertTriangle' && <AlertTriangle className="w-3 h-3" />}
            {health.icon === 'Clock' && <Clock className="w-3 h-3" />}
            {health.icon === 'CheckCircle' && <CheckCircle className="w-3 h-3" />}
            {health.icon === 'AlertCircle' && <AlertCircle className="w-3 h-3" />}
            <span>{health.desc}</span>
        </span>
    );
};


export { getSubscriptionHealth, SubscriptionHealthBadge };
export default SubscriptionHealthBadge;
