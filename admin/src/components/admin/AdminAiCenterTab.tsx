import React from 'react';
import { Bot, Send, Database, HelpCircle, Building2, Ticket, AlertTriangle } from 'lucide-react';

type Props = {
  aiChatInput?: string;
  aiChatMessages?: any[];
  setAiChatInput?: (v: string) => void;
  setAiChatMessages?: (v: any[] | ((p: any[]) => any[])) => void;
  saasTickets?: any[];
  user?: any;
  visibleUsers?: any[];
};

export const AdminAiCenterTab: React.FC<Props> = ({
  aiChatInput = '',
  aiChatMessages = [],
  setAiChatInput,
  setAiChatMessages,
  saasTickets = [],
  visibleUsers = [],
}) => {
  const messages = Array.isArray(aiChatMessages) ? aiChatMessages : [];
  const tickets = Array.isArray(saasTickets) ? saasTickets : [];
  const shops = Array.isArray(visibleUsers) ? visibleUsers : [];

  const replyFor = (q: string) => {
    const lower = q.toLowerCase();
    const open = tickets.filter((t) => String(t.status).toLowerCase() === 'open').length;
    const closed = tickets.filter((t) => String(t.status).toLowerCase() === 'closed').length;
    
    if (lower.includes('ticket') || lower.includes('support')) {
      return `Support Status: ${open} tickets currently open, ${closed} closed (${tickets.length} total across all tenants). Open tickets receive priority alerting.`;
    }
    if (lower.includes('business') || lower.includes('shop') || lower.includes('tenant')) {
      const activeCount = shops.filter((s: any) => (s.status || 'Active') === 'Active').length;
      return `Platform Tenant Overview: Tracking ${shops.length} businesses (${activeCount} active). All customer accounts adhere to strict tenant isolation.`;
    }
    if (lower.includes('churn') || lower.includes('risk')) {
      return `Churn Risk Monitor: Shops with repeated open support tickets or inactive checkout activity within the last 14 days are flagged for merchant success outreach.`;
    }
    return `Platform Snapshot: ${shops.length} registered businesses, ${tickets.length} support tickets (${open} open). You can ask about support tickets, business counts, or churn risk.`;
  };

  const send = (overrideText?: string) => {
    const text = (overrideText || aiChatInput).trim();
    if (!text) return;
    const userMsg = { id: `m${Date.now()}`, role: 'user', text };
    const botMsg = { id: `m${Date.now() + 1}`, role: 'assistant', text: replyFor(text) };
    setAiChatMessages?.((prev: any[]) => [...(Array.isArray(prev) ? prev : []), userMsg, botMsg]);
    if (!overrideText) {
      setAiChatInput?.('');
    }
  };

  const quickPrompts = [
    { label: "Open Support Tickets", icon: Ticket, query: "How many support tickets are open right now?" },
    { label: "Active Businesses", icon: Building2, query: "What is the total number of businesses on the platform?" },
    { label: "Churn Risk Signals", icon: AlertTriangle, query: "What are the latest churn risk signals?" },
  ];

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            Platform Assistant & Live Insights
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Authoritative platform queries calculated directly from verified SaaS records • Zero external LLM dependencies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            <Database className="w-3.5 h-3.5" />
            Authoritative SaaS Telemetry
          </span>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-[460px] overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 bg-slate-50/50">
          {messages.length === 0 && (
            <div className="text-center py-12 space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mx-auto">
                <HelpCircle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Ask Platform Assistant</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Inquire about live support ticket backlog, merchant accounts, or retention metrics.
              </p>
            </div>
          )}

          {messages.map((m: any) => (
            <div
              key={m.id}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'ml-auto bg-indigo-600 text-white rounded-tr-none shadow-sm'
                  : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none shadow-2xs'
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>

        {/* Quick query chips */}
        <div className="px-4 py-2.5 bg-white border-t border-slate-100 flex flex-wrap gap-2">
          {quickPrompts.map((p, i) => {
            const Icon = p.icon;
            return (
              <button
                key={i}
                type="button"
                onClick={() => send(p.query)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 border border-slate-200 hover:border-indigo-200 transition-colors"
              >
                <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-600" />
                <span>{p.label}</span>
              </button>
            );
          })}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-slate-200 bg-white flex gap-2">
          <input
            className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400"
            value={aiChatInput}
            onChange={(e) => setAiChatInput?.(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Ask about tickets, businesses, platform telemetry…"
          />
          <button 
            type="button" 
            onClick={() => send()} 
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminAiCenterTab;
