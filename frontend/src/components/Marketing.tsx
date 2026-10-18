import React, { useState, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useData, PromoCode, GiftCard } from '../contexts/DataContext';
import { Megaphone, Mail, MessageSquare, Plus, Tag, Calendar, Users, Send, CheckCircle, Clock, Trash2, X, Zap, BarChart, Star, Gift, UserPlus, Copy } from 'lucide-react';

interface Campaign {
    id: string;
    name: string;
    type: 'SMS' | 'Email';
    status: 'Sent' | 'Scheduled' | 'Draft';
    date: string;
    audience: string;
    reach: number;
    content?: string;
}

const Marketing: React.FC = () => {
    const { t, currencySymbol } = useSettings();
    const { customers, promoCodes, addPromoCode, deletePromoCode, logAction, loyaltyConfig, setLoyaltyConfig, giftCards, issueGiftCard, disableGiftCard, referralConfig, setReferralConfig, ensureCustomerReferralCode } = useData();
    const [activeTab, setActiveTab] = useState<'campaigns' | 'promotions' | 'loyalty' | 'gifts' | 'referral'>('campaigns');
    const [giftForm, setGiftForm] = useState({ amount: '', code: '', name: '', expiresAt: '' });
    
    const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
        try {
            const saved = localStorage.getItem('bizora_marketing_campaigns');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed)) return parsed.filter((c: any) => !['Ramadan Special Sale', 'New Collection Launch'].includes(c?.name));
            }
            return [];
        } catch {
            return [];
        }
    });

    useEffect(() => {
        localStorage.setItem('bizora_marketing_campaigns', JSON.stringify(campaigns));
    }, [campaigns]);

    const [showCampaignModal, setShowCampaignModal] = useState(false);
    const [newCampaign, setNewCampaign] = useState({ name: '', type: 'SMS', content: '', audience: 'All' });
    const [isSending, setIsSending] = useState(false);

    // Promo Code State
    const [newPromo, setNewPromo] = useState<Partial<PromoCode>>({ code: '', discount: 0, type: 'fixed', status: 'active' });

    const handleCreateCampaign = () => {
        if (!newCampaign.name || !newCampaign.content) return;
        setIsSending(true);
        
        // Simulate API
        setTimeout(() => {
            const reach = newCampaign.audience === 'All' ? customers.length : Math.floor(customers.length * 0.3);
            const campaign: Campaign = {
                id: Date.now().toString(),
                name: newCampaign.name,
                type: newCampaign.type as 'SMS' | 'Email',
                status: 'Sent',
                date: new Date().toISOString().split('T')[0],
                audience: newCampaign.audience,
                reach: reach || 0,
                content: newCampaign.content
            };
            setCampaigns([campaign, ...campaigns]);
            logAction('Marketing', `Sent ${campaign.type} Campaign`, `Campaign: ${campaign.name}`);
            setShowCampaignModal(false);
            setNewCampaign({ name: '', type: 'SMS', content: '', audience: 'All' });
            setIsSending(false);
        }, 1500);
    };

    const handleAddPromo = () => {
        if (newPromo.code && newPromo.discount) {
            addPromoCode({ ...newPromo, id: Date.now().toString() } as PromoCode);
            setNewPromo({ code: '', discount: 0, type: 'fixed', status: 'active', minPurchase: undefined, maxDiscount: undefined, usageLimit: undefined, validUntil: undefined });
            logAction('Marketing', 'Created Promo Code', `Code: ${newPromo.code}`);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg text-red-600">
                    <Megaphone className="w-6 h-6" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{t('Marketing')}</h1>
                    <p className="text-slate-500 text-sm">Campaigns, promotions, and customer engagement</p>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Campaigns</p>
                        <h3 className="text-2xl font-bold text-slate-800">{campaigns.length}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                        <Send className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Total Reach</p>
                        <h3 className="text-2xl font-bold text-slate-800">{campaigns.reduce((acc, c) => acc + c.reach, 0)}</h3>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-full text-emerald-600">
                        <Users className="w-6 h-6" />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">Active Promos</p>
                        <h3 className="text-2xl font-bold text-slate-800">{promoCodes.length}</h3>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-full text-purple-600">
                        <Tag className="w-6 h-6" />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200">
                <button 
                    onClick={() => setActiveTab('campaigns')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'campaigns' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Send className="w-4 h-4" /> Campaigns
                </button>
                <button 
                    onClick={() => setActiveTab('promotions')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'promotions' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Tag className="w-4 h-4" /> Promotions
                </button>
                <button 
                    onClick={() => setActiveTab('loyalty')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'loyalty' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Star className="w-4 h-4" /> Loyalty Program
                </button>
                <button 
                    onClick={() => setActiveTab('gifts')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'gifts' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Gift className="w-4 h-4" /> Gift Cards
                </button>
                <button 
                    onClick={() => setActiveTab('referral')}
                    className={`px-6 py-3 font-medium text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'referral' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <UserPlus className="w-4 h-4" /> Referral
                </button>
            </div>

            {/* --- CAMPAIGNS TAB --- */}
            {activeTab === 'campaigns' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800">Recent Campaigns</h3>
                        <button 
                            onClick={() => setShowCampaignModal(true)}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors"
                        >
                            <Plus className="w-4 h-4" /> New Campaign
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {campaigns.map(camp => (
                            <div key={camp.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex items-start gap-4">
                                    <div className={`p-3 rounded-lg ${camp.type === 'SMS' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                        {camp.type === 'SMS' ? <MessageSquare className="w-6 h-6" /> : <Mail className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">{camp.name}</h4>
                                        <p className="text-sm text-slate-500 line-clamp-1">{camp.content}</p>
                                        <div className="flex items-center gap-3 mt-2 text-xs font-medium text-slate-400">
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {camp.date}</span>
                                            <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {camp.audience} ({camp.reach})</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                        camp.status === 'Sent' ? 'bg-emerald-100 text-emerald-700' : 
                                        camp.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : 
                                        'bg-slate-100 text-slate-600'
                                    }`}>
                                        {camp.status}
                                    </span>
                                    <button className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- PROMOTIONS TAB --- */}
            {activeTab === 'promotions' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-yellow-500" /> Create New Promotion
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Promo Code</label>
                                <input 
                                    type="text" 
                                    value={newPromo.code} 
                                    onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})}
                                    className="w-full border p-2 rounded-lg font-bold placeholder:font-normal"
                                    placeholder="e.g. SUMMER20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Discount Value</label>
                                <input 
                                    type="number" 
                                    value={newPromo.discount} 
                                    onChange={e => setNewPromo({...newPromo, discount: parseFloat(e.target.value)})}
                                    className="w-full border p-2 rounded-lg"
                                    placeholder="0"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                <select 
                                    value={newPromo.type} 
                                    onChange={e => setNewPromo({...newPromo, type: e.target.value as any})}
                                    className="w-full border p-2 rounded-lg bg-white"
                                >
                                    <option value="fixed">Fixed Amount ({currencySymbol})</option>
                                    <option value="percentage">Percentage (%)</option>
                                </select>
                            </div>
                            <button onClick={handleAddPromo} className="bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-colors">
                                Add Promotion
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end mt-4 pt-4 border-t border-slate-100">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min Purchase <span className="normal-case text-slate-400">(optional)</span></label>
                                <input 
                                    type="number" 
                                    value={newPromo.minPurchase ?? ''} 
                                    onChange={e => setNewPromo({...newPromo, minPurchase: e.target.value ? parseFloat(e.target.value) : undefined})}
                                    className="w-full border p-2 rounded-lg"
                                    placeholder="No minimum"
                                />
                            </div>
                            {newPromo.type === 'percentage' && (
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Discount Cap <span className="normal-case text-slate-400">(optional)</span></label>
                                    <input 
                                        type="number" 
                                        value={newPromo.maxDiscount ?? ''} 
                                        onChange={e => setNewPromo({...newPromo, maxDiscount: e.target.value ? parseFloat(e.target.value) : undefined})}
                                        className="w-full border p-2 rounded-lg"
                                        placeholder="No cap"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Usage Limit <span className="normal-case text-slate-400">(optional)</span></label>
                                <input 
                                    type="number" 
                                    value={newPromo.usageLimit ?? ''} 
                                    onChange={e => setNewPromo({...newPromo, usageLimit: e.target.value ? parseInt(e.target.value) : undefined})}
                                    className="w-full border p-2 rounded-lg"
                                    placeholder="Unlimited"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valid Until <span className="normal-case text-slate-400">(optional)</span></label>
                                <input 
                                    type="date" 
                                    value={newPromo.validUntil ? newPromo.validUntil.slice(0, 10) : ''} 
                                    onChange={e => setNewPromo({...newPromo, validUntil: e.target.value ? new Date(e.target.value).toISOString() : undefined})}
                                    className="w-full border p-2 rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Code</th>
                                    <th className="px-6 py-3">Discount</th>
                                    <th className="px-6 py-3">Usage</th>
                                    <th className="px-6 py-3">Valid Until</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {promoCodes.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">No active promotions.</td></tr>
                                ) : (
                                    promoCodes.map(promo => {
                                        const expired = promo.validUntil ? new Date(promo.validUntil) < new Date() : false;
                                        const limitReached = promo.usageLimit ? (promo.usedCount || 0) >= promo.usageLimit : false;
                                        const effectivelyActive = promo.status === 'active' && !expired && !limitReached;
                                        return (
                                        <tr key={promo.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-mono font-bold text-slate-800 text-lg">{promo.code}</td>
                                            <td className="px-6 py-4 font-bold text-emerald-600">
                                                {promo.type === 'fixed' ? currencySymbol : ''}{promo.discount}{promo.type === 'percentage' ? '%' : ''}
                                                {promo.maxDiscount && <span className="block text-[10px] text-slate-400 font-normal">cap: {currencySymbol}{promo.maxDiscount}</span>}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-xs">
                                                {promo.usedCount || 0}{promo.usageLimit ? ` / ${promo.usageLimit}` : ''}
                                                {promo.minPurchase ? <span className="block text-slate-400">min: {currencySymbol}{promo.minPurchase}</span> : null}
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 text-xs">{promo.validUntil ? new Date(promo.validUntil).toLocaleDateString() : '—'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold capitalize ${effectivelyActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {effectivelyActive ? 'active' : (limitReached ? 'limit reached' : (expired ? 'expired' : promo.status))}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => deletePromoCode(promo.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors">
                                                    <Trash2 className="w-4 h-4"/>
                                                </button>
                                            </td>
                                        </tr>
                                    )})
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- LOYALTY PROGRAM TAB --- */}
            {activeTab === 'loyalty' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-white p-6 rounded-xl border border-slate-200">
                        <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                            <Star className="w-5 h-5 text-amber-500" /> Loyalty Program Settings
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">Customers earn points automatically on every Sale, and can redeem them for a discount at checkout in Sell.</p>

                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg mb-4">
                            <div>
                                <p className="font-bold text-slate-800 text-sm">Enable Loyalty Program</p>
                                <p className="text-xs text-slate-500">Turns point earning and redemption on/off across the whole business.</p>
                            </div>
                            <button
                                onClick={() => setLoyaltyConfig({ ...loyaltyConfig, enabled: !loyaltyConfig.enabled })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${loyaltyConfig.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${loyaltyConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Earn Rate</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">1 point per</span>
                                    <input
                                        type="number"
                                        min={1}
                                        value={loyaltyConfig.pointsPerCurrency}
                                        onChange={e => setLoyaltyConfig({ ...loyaltyConfig, pointsPerCurrency: parseFloat(e.target.value) || 1 })}
                                        className="w-20 border p-2 rounded-lg text-sm"
                                    />
                                    <span className="text-xs text-slate-500">{currencySymbol} spent</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Redemption Value</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-500">1 point =</span>
                                    <input
                                        type="number"
                                        min={0}
                                        step={0.01}
                                        value={loyaltyConfig.redemptionRate}
                                        onChange={e => setLoyaltyConfig({ ...loyaltyConfig, redemptionRate: parseFloat(e.target.value) || 0 })}
                                        className="w-20 border p-2 rounded-lg text-sm"
                                    />
                                    <span className="text-xs text-slate-500">{currencySymbol} off</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Minimum to Redeem</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={loyaltyConfig.minPointsToRedeem}
                                    onChange={e => setLoyaltyConfig({ ...loyaltyConfig, minPointsToRedeem: parseInt(e.target.value) || 0 })}
                                    className="w-full border p-2 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
                        <div className="p-4 border-b border-slate-100">
                            <h3 className="font-bold text-slate-800 text-sm">Customer Points Balance</h3>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Customer</th>
                                    <th className="px-6 py-3 text-right">Points Balance</th>
                                    <th className="px-6 py-3 text-right">Redeemable Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {customers.filter(c => (c.loyaltyPoints || 0) > 0).length === 0 ? (
                                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">No customers have earned points yet.</td></tr>
                                ) : customers.filter(c => (c.loyaltyPoints || 0) > 0)
                                    .sort((a, b) => (b.loyaltyPoints || 0) - (a.loyaltyPoints || 0))
                                    .map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50">
                                            <td className="px-6 py-4 font-bold text-slate-800">{c.name}</td>
                                            <td className="px-6 py-4 text-right font-mono">{c.loyaltyPoints}</td>
                                            <td className="px-6 py-4 text-right text-emerald-600 font-bold">{currencySymbol}{((c.loyaltyPoints || 0) * loyaltyConfig.redemptionRate).toLocaleString()}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Campaign Modal */}
            
            {activeTab === 'gifts' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                        <h3 className="font-bold text-slate-800">Issue Gift Card</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            <input type="number" placeholder="Amount" value={giftForm.amount} onChange={e => setGiftForm({...giftForm, amount: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            <input placeholder="Code (optional)" value={giftForm.code} onChange={e => setGiftForm({...giftForm, code: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono" />
                            <input placeholder="Issued to (name)" value={giftForm.name} onChange={e => setGiftForm({...giftForm, name: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            <input type="date" value={giftForm.expiresAt} onChange={e => setGiftForm({...giftForm, expiresAt: e.target.value})} className="px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                        </div>
                        <button
                            onClick={() => {
                                const amt = parseFloat(giftForm.amount);
                                if (!amt || amt <= 0) { alert('Enter a valid amount'); return; }
                                const card = issueGiftCard({
                                    initialBalance: amt,
                                    code: giftForm.code || undefined,
                                    issuedToName: giftForm.name || undefined,
                                    expiresAt: giftForm.expiresAt || undefined,
                                });
                                setGiftForm({ amount: '', code: '', name: '', expiresAt: '' });
                                alert(`Gift card issued: ${card.code}`);
                            }}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold"
                        >
                            Issue Card
                        </button>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-500 text-left">
                                <tr>
                                    <th className="px-4 py-3">Code</th>
                                    <th className="px-4 py-3">Balance</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Issued To</th>
                                    <th className="px-4 py-3">Expires</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {giftCards.length === 0 ? (
                                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No gift cards yet.</td></tr>
                                ) : giftCards.map((g: GiftCard) => (
                                    <tr key={g.id}>
                                        <td className="px-4 py-3 font-mono font-semibold text-slate-800">{g.code}</td>
                                        <td className="px-4 py-3">{currencySymbol}{g.balance.toFixed(2)} <span className="text-xs text-slate-400">/ {g.initialBalance}</span></td>
                                        <td className="px-4 py-3"><span className="text-xs font-bold uppercase">{g.status}</span></td>
                                        <td className="px-4 py-3 text-slate-600">{g.issuedToName || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600">{g.expiresAt || '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            {g.status === 'active' && (
                                                <button onClick={() => disableGiftCard(g.id)} className="text-xs text-red-600 hover:underline">Disable</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'referral' && (
                <div className="space-y-6 animate-in fade-in">
                    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800">Referral Program</h3>
                                <p className="text-xs text-slate-500 mt-1">Reward customers who bring new customers. Points use the same loyalty balance.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReferralConfig({ ...referralConfig, enabled: !referralConfig.enabled })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${referralConfig.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}
                            >
                                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${referralConfig.enabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Referrer reward (points)</label>
                                <input type="number" value={referralConfig.referrerRewardPoints} onChange={e => setReferralConfig({...referralConfig, referrerRewardPoints: parseInt(e.target.value)||0})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">New customer reward (points)</label>
                                <input type="number" value={referralConfig.refereeRewardPoints} onChange={e => setReferralConfig({...referralConfig, refereeRewardPoints: parseInt(e.target.value)||0})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase">Min sale for referrer reward</label>
                                <input type="number" value={referralConfig.minSaleForReferrerReward} onChange={e => setReferralConfig({...referralConfig, minSaleForReferrerReward: parseFloat(e.target.value)||0})} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-sm">Customer referral codes</h3>
                        </div>
                        <table className="w-full text-sm">
                            <thead className="text-left text-slate-500 bg-white border-b">
                                <tr>
                                    <th className="px-4 py-3">Customer</th>
                                    <th className="px-4 py-3">Their code</th>
                                    <th className="px-4 py-3">Referred by</th>
                                    <th className="px-4 py-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {customers.filter(c => !c.isDeleted && c.type === 'Customer').slice(0, 50).map(c => (
                                    <tr key={c.id}>
                                        <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                                        <td className="px-4 py-3 font-mono text-xs">{c.referralCode || '—'}</td>
                                        <td className="px-4 py-3 text-slate-600 text-xs">
                                            {c.referredBy ? (customers.find(x => x.id === c.referredBy)?.name || c.referredBy) : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const code = ensureCustomerReferralCode(c.id);
                                                    navigator.clipboard?.writeText(code).catch(() => {});
                                                    alert(`Code: ${code}`);
                                                }}
                                                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline"
                                            >
                                                <Copy className="w-3 h-3" /> Generate / Copy
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {showCampaignModal && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-slate-800">New Campaign</h3>
                            <button onClick={() => setShowCampaignModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Campaign Name</label>
                                <input 
                                    type="text" 
                                    value={newCampaign.name}
                                    onChange={e => setNewCampaign({...newCampaign, name: e.target.value})}
                                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                    placeholder="e.g. Winter Sale Announcement"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                                    <select 
                                        value={newCampaign.type}
                                        onChange={e => setNewCampaign({...newCampaign, type: e.target.value})}
                                        className="w-full border p-2 rounded-lg bg-white"
                                    >
                                        <option value="SMS">SMS</option>
                                        <option value="Email">Email</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Audience</label>
                                    <select 
                                        value={newCampaign.audience}
                                        onChange={e => setNewCampaign({...newCampaign, audience: e.target.value})}
                                        className="w-full border p-2 rounded-lg bg-white"
                                    >
                                        <option value="All">All Customers</option>
                                        <option value="High Value">VIP / High Value</option>
                                        <option value="Inactive">Inactive (&gt;30 days)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Message Content</label>
                                <textarea 
                                    value={newCampaign.content}
                                    onChange={e => setNewCampaign({...newCampaign, content: e.target.value})}
                                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-red-500 outline-none h-32 resize-none"
                                    placeholder={newCampaign.type === 'SMS' ? "Keep it short (max 160 chars)" : "Subject and body..."}
                                />
                                {newCampaign.type === 'SMS' && (
                                    <p className="text-xs text-right text-slate-400 mt-1">{newCampaign.content.length} chars</p>
                                )}
                            </div>
                            <button 
                                onClick={handleCreateCampaign}
                                disabled={isSending}
                                className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
                            >
                                {isSending ? 'Sending...' : 'Launch Campaign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Marketing;