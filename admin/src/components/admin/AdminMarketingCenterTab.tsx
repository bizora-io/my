import React, { useState } from 'react';
import { Mail, Plus, Trash2 } from 'lucide-react';

type Props = {
  marketingCampaigns?: any[];
  setMarketingCampaigns?: (v: any[] | ((p: any[]) => any[])) => void;
  showToast?: (msg: string, type?: string) => void;
};

export const AdminMarketingCenterTab: React.FC<Props> = ({
  marketingCampaigns = [],
  setMarketingCampaigns,
  showToast,
}) => {
  const list = Array.isArray(marketingCampaigns) ? marketingCampaigns : [];
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('email');

  const add = () => {
    if (!name.trim()) {
      showToast?.('Campaign name required', 'error');
      return;
    }
    const item = {
      id: `mk_${Date.now()}`,
      name: name.trim(),
      channel,
      status: 'Draft',
      createdAt: new Date().toISOString(),
    };
    setMarketingCampaigns?.((prev: any[]) => [item, ...(Array.isArray(prev) ? prev : [])]);
    setName('');
    showToast?.('Marketing campaign added');
  };

  return (
    <div className="space-y-4 animate-in fade-in">
      <div className="bg-gradient-to-r from-slate-900 via-pink-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Mail className="w-5 h-5 text-pink-400" /> Marketing
        </h2>
        <p className="text-xs text-slate-300 mt-1">Campaign drafts, referrals placeholder</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 shadow-sm">
          <h3 className="text-sm font-bold flex items-center gap-2">
            <Plus className="w-4 h-4" /> New campaign
          </h3>
          <input
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Campaign name"
          />
          <select
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-semibold"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="push">Push</option>
            <option value="referral">Referral</option>
          </select>
          <button type="button" onClick={add} className="w-full py-2.5 rounded-xl bg-pink-600 text-white text-sm font-bold">
            Save draft
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-h-[360px] overflow-y-auto">
          {list.length === 0 && <p className="text-xs text-slate-400 p-8 text-center">No marketing campaigns</p>}
          {list.map((c: any) => (
            <div key={c.id} className="px-4 py-3 border-b border-slate-100 flex justify-between gap-2">
              <div>
                <p className="text-sm font-bold text-slate-800">{c.name}</p>
                <p className="text-[10px] text-slate-400">
                  {c.channel} · {c.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setMarketingCampaigns?.((prev: any[]) =>
                    (Array.isArray(prev) ? prev : []).filter((x) => x.id !== c.id)
                  )
                }
                className="p-2 text-red-600"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminMarketingCenterTab;
