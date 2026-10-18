import React, { useMemo, useState } from 'react';
import {
  HeadphonesIcon,
  Search,
  CheckCircle,
  Clock,
  AlertTriangle,
  Send,
  MessageSquare,
  Building,
  User,
  ShieldCheck,
  Tag,
  RefreshCw,
} from 'lucide-react';

type Props = {
  saasTickets?: any[];
  updateSaasTicket?: (id: string, patch: any) => void;
  user?: any;
  supportFilter?: string;
  setSupportFilter?: (v: string) => void;
  selectedSupportTicket?: any;
  setSelectedSupportTicket?: (t: any) => void;
  supportReplyText?: string;
  setSupportReplyText?: (v: string) => void;
  supportNoteText?: string;
  setSupportNoteText?: (v: string) => void;
  setEditModalTab?: (v: string) => void;
};

export const AdminSupportTab: React.FC<Props> = ({
  saasTickets = [],
  updateSaasTicket,
  user,
  supportFilter: filterProp,
  setSupportFilter,
  selectedSupportTicket,
  setSelectedSupportTicket,
  supportReplyText = '',
  setSupportReplyText,
}) => {
  const [localFilter, setLocalFilter] = useState('All');
  const [localSearch, setLocalSearch] = useState('');
  const filter = filterProp !== undefined ? filterProp : localFilter;
  const setFilter = setSupportFilter || setLocalFilter;

  const tickets = Array.isArray(saasTickets) ? saasTickets : [];

  const counts = useMemo(() => {
    const open = tickets.filter((t) => ['open', 'in progress', 'waiting for customer'].includes(String(t.status || '').toLowerCase())).length;
    const closed = tickets.filter((t) => ['closed', 'resolved'].includes(String(t.status || '').toLowerCase())).length;
    const urgent = tickets.filter(
      (t) =>
        ['open', 'in progress', 'waiting for customer'].includes(String(t.status || '').toLowerCase()) &&
        String(t.priority || '').toLowerCase() === 'urgent'
    ).length;
    return { all: tickets.length, open, closed, urgent };
  }, [tickets]);

  const filtered = useMemo(() => {
    const q = localSearch.trim().toLowerCase();
    return tickets.filter((t) => {
      const st = String(t.status || '').toLowerCase();
      if (filter === 'Open' && !['open', 'in progress', 'waiting for customer'].includes(st)) return false;
      if (filter === 'Closed' && !['closed', 'resolved'].includes(st)) return false;
      if (filter === 'Urgent' && String(t.priority || '').toLowerCase() !== 'urgent') return false;
      if (!q) return true;
      const hay = [
        t.subject,
        t.title,
        t.business_name,
        t.businessName,
        t.ticket_number,
        t.id,
        t.status,
        t.priority,
        t.category,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [tickets, filter, localSearch]);

  // Keep selected ticket reactive to live updates from socket and background refreshes
  const selected = useMemo(() => {
    if (!selectedSupportTicket?.id) return null;
    return tickets.find((t) => t.id === selectedSupportTicket.id) || selectedSupportTicket;
  }, [tickets, selectedSupportTicket]);

  // Unified conversation timeline merging messages and replies
  const conversation = useMemo(() => {
    if (!selected) return [];
    const list: Array<{
      id: string;
      sender: string;
      text: string;
      time: string;
      isAdmin: boolean;
    }> = [];

    // Check messages array
    if (Array.isArray(selected.messages)) {
      selected.messages
        .filter((m: any) => !m.is_note)
        .forEach((m: any) => {
          const senderName = m.sender_name || (m.is_admin ? 'Bizora Support Team' : selected.business_name || 'Shop Owner');
          const isFromAdmin = !!(
            m.is_admin ||
            m.sender_id === 'saas-owner' ||
            m.sender_id === 'saas-staff' ||
            /support|admin|bizora/i.test(String(m.sender_name || ''))
          );
          list.push({
            id: m.id || `m_${Math.random()}`,
            sender: senderName,
            text: m.message || m.text || '',
            time: m.created_at || m.at || new Date().toISOString(),
            isAdmin: isFromAdmin,
          });
        });
    }

    // Merge legacy replies if any
    if (Array.isArray(selected.replies)) {
      selected.replies.forEach((r: any) => {
        const text = r.text || r.message;
        if (text && !list.some((existing) => existing.text === text)) {
          list.push({
            id: r.id || `r_${Math.random()}`,
            sender: r.by || 'Bizora Support Team',
            text,
            time: r.at || r.created_at || new Date().toISOString(),
            isAdmin: true,
          });
        }
      });
    }

    return list.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [selected]);

  const sendReply = () => {
    if (!selected?.id || !supportReplyText?.trim()) return;
    const now = new Date().toISOString();
    const replyBody = supportReplyText.trim();
    const senderName = user?.name || 'Bizora Support Team';

    const newMsg = {
      id: `msg-${Date.now()}`,
      ticket_id: selected.id,
      sender_id: user?.id || 'saas-owner',
      sender_name: senderName,
      message: replyBody,
      created_at: now,
      is_admin: true,
    };

    const legacyReply = {
      id: `r${Date.now()}`,
      text: replyBody,
      at: now,
      by: senderName,
    };

    const updatedMessages = [...(selected.messages || []), newMsg];
    const updatedReplies = [...(selected.replies || []), legacyReply];
    const nextStatus = selected.status === 'Open' ? 'In Progress' : selected.status || 'In Progress';

    const patch = {
      messages: updatedMessages,
      replies: updatedReplies,
      status: nextStatus,
      updated_at: now,
    };

    updateSaasTicket?.(selected.id, patch);
    setSelectedSupportTicket?.({
      ...selected,
      ...patch,
    });
    setSupportReplyText?.('');
  };

  const handleStatusChange = (status: string) => {
    if (!selected?.id) return;
    const patch = { status, updated_at: new Date().toISOString() };
    updateSaasTicket?.(selected.id, patch);
    setSelectedSupportTicket?.({ ...selected, ...patch });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <HeadphonesIcon className="w-5 h-5 text-rose-400" /> Support Tickets & Live Customer Chat
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Real-time multi-tenant helpdesk, SLA queue & two-way customer support chat
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="All Tickets" value={counts.all} />
        <Stat label="Open / Active" value={counts.open} tone="amber" />
        <Stat label="Urgent SLA" value={counts.urgent} tone="rose" />
        <Stat label="Resolved / Closed" value={counts.closed} tone="emerald" />
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search tickets by subject, business name, or #ID..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {['All', 'Open', 'Urgent', 'Closed'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-colors ${
                filter === f
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Tickets List Column */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-h-[640px]">
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Tickets Queue ({filtered.length})
            </span>
          </div>

          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {filtered.length === 0 && (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs">No tickets match this filter.</p>
              </div>
            )}
            {filtered.map((t) => {
              const on = selected?.id === t.id;
              const isUrgent = String(t.priority || '').toLowerCase() === 'urgent';
              const statusStr = String(t.status || 'Open');
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedSupportTicket?.(t)}
                  className={`w-full text-left p-4 transition-all ${
                    on ? 'bg-indigo-50/80 border-l-4 border-indigo-600' : 'hover:bg-slate-50 border-l-4 border-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <p className={`text-sm font-bold truncate ${on ? 'text-indigo-900' : 'text-slate-800'}`}>
                      {t.subject || t.title || t.id}
                    </p>
                    {isUrgent && (
                      <span className="shrink-0 flex items-center gap-1 bg-rose-100 text-rose-700 text-[10px] font-black px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3" /> Urgent
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-semibold text-slate-700 truncate">{t.business_name || t.businessName || 'Tenant Shop'}</span>
                    <span>•</span>
                    <span className="font-mono text-[11px] text-slate-400">{t.ticket_number || t.id}</span>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-100/60">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${
                        statusStr.toLowerCase() === 'open'
                          ? 'bg-amber-100 text-amber-800'
                          : statusStr.toLowerCase() === 'in progress'
                          ? 'bg-indigo-100 text-indigo-800'
                          : statusStr.toLowerCase() === 'waiting for customer'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {statusStr}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {t.updated_at ? new Date(t.updated_at).toLocaleDateString() : 'Recent'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation & Action Column */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col min-h-[500px] max-h-[640px] overflow-hidden">
          {!selected ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 my-auto">
              <MessageSquare className="w-12 h-12 text-slate-200 mb-3" />
              <p className="text-base font-bold text-slate-600">Select a ticket from the queue</p>
              <p className="text-xs text-slate-400 mt-1">
                View full customer details, reply in real-time, and manage ticket status
              </p>
            </div>
          ) : (
            <>
              {/* Ticket Header */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/80">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {selected.ticket_number || selected.id}
                      </span>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                        {selected.category || 'General Support'}
                      </span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Priority: {selected.priority || 'Medium'}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 mt-1.5 leading-snug">
                      {selected.subject || selected.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-bold text-slate-700">{selected.business_name || selected.businessName}</span>
                      <span>•</span>
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>Created by {selected.created_by || 'Shop Owner'}</span>
                    </p>
                  </div>

                  {/* Status Dropdown / Action Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleStatusChange('Open')}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                        selected.status === 'Open'
                          ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-amber-50'
                      }`}
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('In Progress')}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                        selected.status === 'In Progress'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-indigo-50'
                      }`}
                    >
                      In Progress
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('Waiting For Customer')}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition ${
                        selected.status === 'Waiting For Customer'
                          ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-sky-50'
                      }`}
                    >
                      Waiting Customer
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusChange('Resolved')}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition flex items-center gap-1 ${
                        selected.status === 'Resolved' || selected.status === 'Closed'
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                      }`}
                    >
                      <CheckCircle className="w-3 h-3" /> Resolved
                    </button>
                  </div>
                </div>
              </div>

              {/* Conversation Messages Thread */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/50">
                {/* Original Ticket Description */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mr-8">
                  <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-100">
                    <span className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-indigo-500" />
                      {selected.created_by || selected.business_name || 'Customer'} (Shop Owner)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {selected.created_at ? new Date(selected.created_at).toLocaleString() : ''}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {selected.description || selected.message || selected.body || 'No description provided.'}
                  </p>
                </div>

                {/* Chat Messages */}
                {conversation.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-2xl border shadow-sm transition-all ${
                      msg.isAdmin
                        ? 'bg-indigo-600 text-white border-indigo-700 ml-8 md:ml-16'
                        : 'bg-white text-slate-800 border-slate-200 mr-8 md:mr-16'
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${msg.isAdmin ? 'text-indigo-100' : 'text-slate-800'}`}>
                        {msg.isAdmin ? (
                          <>
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-200" />
                            {msg.sender} <span className="text-[10px] opacity-75 font-normal">(SaaS Admin)</span>
                          </>
                        ) : (
                          <>
                            <User className="w-3.5 h-3.5 text-indigo-500" />
                            {msg.sender} <span className="text-[10px] opacity-60 font-normal">(Shop Owner)</span>
                          </>
                        )}
                      </span>
                      <span className={`text-[10px] ${msg.isAdmin ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {msg.time ? new Date(msg.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className={`text-sm whitespace-pre-wrap leading-relaxed ${msg.isAdmin ? 'text-white' : 'text-slate-700'}`}>
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Reply Input Bar */}
              <div className="p-3.5 bg-white border-t border-slate-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendReply();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    value={supportReplyText}
                    onChange={(e) => setSupportReplyText?.(e.target.value)}
                    placeholder={`Reply to ${selected.business_name || 'shop owner'} (press Enter to send)...`}
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    disabled={!supportReplyText?.trim()}
                    className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold flex items-center gap-1.5 hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <Send className="w-4 h-4" /> Send Reply
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

function Stat({ label, value, tone = 'slate' }: { label: string; value: number; tone?: string }) {
  const c: Record<string, string> = {
    slate: 'text-slate-800',
    amber: 'text-amber-600',
    rose: 'text-rose-600',
    emerald: 'text-emerald-600',
  };
  return (
    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
      <p className="text-[10px] font-black uppercase text-slate-400">{label}</p>
      <p className={`text-2xl font-black ${c[tone]}`}>{value}</p>
    </div>
  );
}

export default AdminSupportTab;
