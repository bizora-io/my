import React, { useState } from 'react';
import { Bell, Plus, Trash2, Send, Megaphone } from 'lucide-react';

type Props = {
  campaigns?: any[];
  setCampaigns?: (v: any[] | ((p: any[]) => any[])) => void;
  showToast?: (msg: string, type?: string) => void;
  [key: string]: any;
};

export const AdminNotificationsTab: React.FC<Props> = ({
  campaigns = [],
  setCampaigns,
  showToast,
}) => {
  const list = Array.isArray(campaigns) ? campaigns : [];
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');

  const create = () => {
    if (!title.trim() || !message.trim()) {
      showToast?.('Title and message required', 'error');
      return;
    }
    const item = {
      id: `camp_${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      audience,
      status: 'Draft',
      createdAt: new Date().toISOString(),
    };
    setCampaigns?.((prev: any[]) => [item, ...(Array.isArray(prev) ? prev : [])]);
    setTitle('');
    setMessage('');
    showToast?.('Campaign draft saved');
  };

  const markSent = (id: string) => {
    setCampaigns?.((prev: any[]) =>
      (Array.isArray(prev) ? prev : []).map((c) =>
        c.id === id ? { ...c, status: 'Sent', sentAt: new Date().toISOString() } : c
      )
    );
    showToast?.('Marked as sent');
  };

  const remove = (id: string) => {
    setCampaigns?.((prev: any[]) => (Array.isArray(prev) ? prev : []).filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
      <div className="bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Bell className="w-5 h-5 text-violet-400" /> Notifications
        </h2>
        <p className="text-xs text-slate-300 mt-1">Broadcast drafts for SMS / email / in-app queues</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-3">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Plus className="w-4 h-4" /> New campaign
          </h3>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
          />
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message body"
            rows={4}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
          />
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
          >
            <option value="all">All businesses</option>
            <option value="active">Active only</option>
            <option value="trial">Trial only</option>
            <option value="at-risk">At risk</option>
          </select>
          <button
            type="button"
            onClick={create}
            className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
          >
            Save draft
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-h-[420px] overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-violet-500" />
            <h3 className="text-sm font-bold text-slate-800">Campaigns ({list.length})</h3>
          </div>
          {list.length === 0 && (
            <p className="text-xs text-slate-400 p-8 text-center">No campaigns yet</p>
          )}
          {list.map((c) => (
            <div key={c.id} className="px-4 py-3 border-b border-slate-100 space-y-1">
              <div className="flex justify-between gap-2">
                <p className="text-sm font-bold text-slate-800">{c.title}</p>
                <span className="text-[9px] font-black uppercase text-slate-500">{c.status}</span>
              </div>
              <p className="text-xs text-slate-500 line-clamp-2">{c.message}</p>
              <p className="text-[10px] text-slate-400">Audience: {c.audience}</p>
              <div className="flex gap-2 pt-1">
                {c.status !== 'Sent' && (
                  <button
                    type="button"
                    onClick={() => markSent(c.id)}
                    className="text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1"
                  >
                    <Send className="w-3 h-3" /> Mark sent
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(c.id)}
                  className="text-[10px] font-bold px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationsTab;
