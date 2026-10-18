import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
    Plus, Upload, MessageSquare, AlertCircle, FileText, X,
    AlertTriangle, CheckCircle, Clock, ChevronRight, Send,
    Phone, Mail, MessageCircle, Headphones
} from 'lucide-react';
import { UserRole } from '../types';

export const CustomerSupport: React.FC = () => {
    const { saasTickets, addSaasTicket, updateSaasTicket } = useData();
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const isSaasStaff = user?.role === UserRole.SAAS_OWNER || user?.role === UserRole.SAAS_ADMIN;

    // Filter tickets for the current shop owner (or all for SaaS staff)
    const myTickets = useMemo(() => {
        if (isSaasStaff) return saasTickets;
        const bId = user?.id || (user as any)?.businessId;
        return saasTickets.filter(t => t.business_id === bId || !bId || t.business_name === user?.businessName);
    }, [saasTickets, user?.id, (user as any)?.businessId, user?.businessName, isSaasStaff]);

    const [activeTab, setActiveTab] = useState<'List' | 'Create' | 'View'>('List');
    const [filterCategory, setFilterCategory] = useState('All');
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    
    // Reactive active ticket
    const activeTicket = useMemo(() => {
        if (!selectedTicketId) return null;
        return saasTickets.find((t: any) => t.id === selectedTicketId) || null;
    }, [saasTickets, selectedTicketId]);

    // Unified conversation messages
    const threadMessages = useMemo(() => {
        if (!activeTicket) return [];
        const list: any[] = [];
        if (Array.isArray(activeTicket.messages)) {
            activeTicket.messages.filter((m: any) => !m.is_note).forEach((m: any) => {
                list.push({
                    id: m.id || `m_${Math.random()}`,
                    sender_id: m.sender_id,
                    sender_name: m.sender_name || (m.is_admin ? 'Bizora Support Team' : 'Shop Owner'),
                    message: m.message || m.text || '',
                    created_at: m.created_at || m.at || new Date().toISOString(),
                    is_admin: !!(m.is_admin || m.sender_id === 'saas-owner' || m.sender_id === 'saas-staff' || /support|admin|bizora/i.test(String(m.sender_name || ''))),
                });
            });
        }
        if (Array.isArray(activeTicket.replies)) {
            activeTicket.replies.forEach((r: any) => {
                const text = r.text || r.message;
                if (text && !list.some((existing) => existing.message === text)) {
                    list.push({
                        id: r.id || `r_${Math.random()}`,
                        sender_id: 'saas-staff',
                        sender_name: r.by || 'Bizora Support Team',
                        message: text,
                        created_at: r.at || r.created_at || new Date().toISOString(),
                        is_admin: true,
                    });
                }
            });
        }
        return list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }, [activeTicket]);
    
    // Create Form State
    const [subject, setSubject] = useState('');
    const [category, setCategory] = useState<'Technical Issue' | 'Billing Issue' | 'Subscription' | 'Feature Request' | 'Bug Report' | 'Account Issue' | 'General Support'>('General Support');
    const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('Medium');
    const [description, setDescription] = useState('');
    
    // Reply Form State
    const [replyText, setReplyText] = useState('');

    const handleCreateTicket = (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !description.trim()) return;

        const ticketNumber = `#TKT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const newTicket = {
            id: 'tkt-' + Date.now(),
            ticket_number: ticketNumber,
            business_id: user?.id || 'u1',
            business_name: user?.businessName || 'My Business',
            created_by: user?.name || 'Shop Owner',
            subject,
            category,
            priority,
            status: 'Open' as const,
            description,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            messages: [
                {
                    id: 'msg-' + Date.now(),
                    ticket_id: 'tkt-' + Date.now(),
                    sender_id: user?.id || 'u1',
                    sender_name: user?.name || 'Shop Owner',
                    message: description,
                    created_at: new Date().toISOString(),
                    is_admin: false,
                }
            ],
            replies: [],
            notes: []
        };
        addSaasTicket(newTicket);
        setSubject('');
        setDescription('');
        setSelectedTicketId(newTicket.id);
        setActiveTab('View');
    };

    const handleReply = () => {
        if (!replyText.trim() || !activeTicket) return;
        
        const now = new Date().toISOString();
        const newMessage = {
            id: 'msg-' + Date.now(),
            ticket_id: activeTicket.id,
            sender_id: user?.id || 'u1',
            sender_name: user?.name || user?.businessName || 'Shop Owner',
            message: replyText.trim(),
            created_at: now,
            is_admin: false,
        };
        
        const updatedTicket = {
            ...activeTicket,
            messages: [...(activeTicket.messages || []), newMessage],
            updated_at: now,
            status: activeTicket.status === 'Resolved' || activeTicket.status === 'Closed' ? 'Open' : activeTicket.status,
        };
        
        updateSaasTicket(activeTicket.id, updatedTicket);
        setReplyText('');
    };

    const filteredTickets = filterCategory === 'All' 
        ? myTickets 
        : myTickets.filter(t => t.status === filterCategory);

    return (
        <div className="space-y-6">
            {!isSaasStaff && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <a href="https://wa.me/8801919630121" target="_blank" rel="noopener noreferrer" className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition group">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                            <Phone className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">WhatsApp Support</h3>
                        <p className="text-sm text-slate-500 mb-6">Chat directly with our team on WhatsApp for quick resolutions.</p>
                        <span className="text-green-600 font-semibold text-sm">Chat Now &rarr;</span>
                    </a>
                    
                    <a href="mailto:bizora.app.io@gmail.com" className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition group">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                            <Mail className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Email Support</h3>
                        <p className="text-sm text-slate-500 mb-6">Send us an email anytime and we will get back to you within 24 hours.</p>
                        <span className="text-blue-600 font-semibold text-sm">Send Email &rarr;</span>
                    </a>

                    <div onClick={() => navigate('/ai-chat')} className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center text-center hover:shadow-md transition group cursor-pointer">
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                            <MessageCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 mb-2">Bizora ERP Assistant</h3>
                        <p className="text-sm text-slate-500 mb-6">Get instant authoritative answers about your sales, stock, and ERP workflows, with the option to escalate to human support.</p>
                        <span className="text-indigo-600 font-semibold text-sm">Open Assistant &rarr;</span>
                    </div>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{isSaasStaff ? 'Support Tickets' : 'Support Center'}</h1>
                    <p className="text-sm text-slate-500 mt-1">{isSaasStaff ? 'Manage and resolve customer support tickets.' : 'Need help? Create a support ticket and our team will get back to you.'}</p>
                </div>
                <div className="mt-4 md:mt-0">
                    <button 
                        onClick={() => { setActiveTab('Create'); setSelectedTicketId(null); }}
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center shadow-md shadow-indigo-200"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create New Ticket
                    </button>
                </div>
            </div>

            {activeTab === 'Create' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Create Support Ticket</h2>
                        <button onClick={() => setActiveTab('List')} className="text-slate-500 hover:text-slate-700">Cancel</button>
                    </div>
                    <form onSubmit={handleCreateTicket} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject</label>
                            <input 
                                type="text"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                placeholder="Brief summary of the issue..."
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
                                <select 
                                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                    value={category}
                                    onChange={e => setCategory(e.target.value as any)}
                                >
                                    <option value="General Support">General Support</option>
                                    <option value="Technical Issue">Technical Issue</option>
                                    <option value="Billing Issue">Billing Issue</option>
                                    <option value="Subscription">Subscription</option>
                                    <option value="Feature Request">Feature Request</option>
                                    <option value="Bug Report">Bug Report</option>
                                    <option value="Account Issue">Account Issue</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Priority</label>
                                <select 
                                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                                    value={priority}
                                    onChange={e => setPriority(e.target.value as any)}
                                >
                                    <option value="Low">Low - Cosmetic/Minor</option>
                                    <option value="Medium">Medium - Annoying</option>
                                    <option value="High">High - Blocking a feature</option>
                                    <option value="Urgent">Urgent - Business stopped</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                            <textarea 
                                rows={5}
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm resize-none"
                                placeholder="Describe your issue in detail..."
                                required
                            ></textarea>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="submit" className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition">
                                Submit Ticket
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {activeTab === 'List' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[500px]">
                    <div className="w-full md:w-56 bg-slate-50 border-r border-slate-200 p-4 space-y-1">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-2">Folders</div>
                        {['All', 'Open', 'In Progress', 'Waiting For Customer', 'Resolved', 'Closed'].map(folder => (
                            <button 
                                key={folder}
                                onClick={() => setFilterCategory(folder)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${filterCategory === folder ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                {folder === 'All' ? 'My Tickets' : folder}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 p-0 overflow-y-auto overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white border-b border-slate-200 sticky top-0 z-10 text-xs font-semibold text-slate-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Ticket</th>
                                    <th className="px-6 py-4 hidden sm:table-cell">Category</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Updated</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredTickets.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                            <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                                            <p>No tickets found in this category.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredTickets.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()).map(ticket => (
                                        <tr key={ticket.id} onClick={() => { setSelectedTicketId(ticket.id); setActiveTab('View'); }} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <MessageSquare className="w-5 h-5 text-indigo-300 group-hover:text-indigo-500 transition-colors" />
                                                    <div>
                                                        <div className="font-bold text-slate-800 text-sm group-hover:text-indigo-600 transition-colors">{ticket.subject}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5">{ticket.ticket_number} • {ticket.priority} Priority</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 hidden sm:table-cell text-sm text-slate-600">{ticket.category}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold tracking-widest ${
                                                    ticket.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                                                    ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-100 text-emerald-700' :
                                                    ticket.status === 'Waiting For Customer' ? 'bg-amber-100 text-amber-700' :
                                                    'bg-indigo-100 text-indigo-700'
                                                }`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs font-medium text-slate-500 whitespace-nowrap">
                                                <div className="flex items-center justify-end">
                                                    <span>{new Date(ticket.updated_at).toLocaleDateString()}</span>
                                                    <ChevronRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'View' && activeTicket && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in slide-in-from-bottom-4">
                    {/* Header */}
                    <div className="p-6 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <button onClick={() => { setActiveTab('List'); setSelectedTicketId(null); }} className="text-indigo-600 hover:text-indigo-800 text-sm font-semibold mb-3 flex items-center">
                                &larr; Back to Tickets
                            </button>
                            <h2 className="text-2xl font-bold text-slate-800 leading-tight">{activeTicket.subject}</h2>
                            <div className="flex items-center space-x-3 mt-2 text-xs">
                                <span className="font-mono bg-white px-2 py-1 rounded border border-slate-200 text-slate-600">{activeTicket.ticket_number}</span>
                                <span className="text-slate-500">•</span>
                                <span className="font-semibold text-slate-600">{activeTicket.category}</span>
                                <span className="text-slate-500">•</span>
                                <span className={`px-2 py-0.5 rounded uppercase font-bold tracking-widest ${
                                    activeTicket.status === 'Open' || activeTicket.status === 'Waiting For Customer' ? 'text-amber-600 bg-amber-100' :
                                    activeTicket.status === 'Resolved' || activeTicket.status === 'Closed' ? 'text-emerald-600 bg-emerald-100' :
                                    'text-indigo-600 bg-indigo-100'
                                }`}>{activeTicket.status}</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-end hidden md:flex">
                             <div className="text-sm font-medium text-slate-500 mb-1">Created</div>
                             <div className="text-sm font-bold text-slate-700">{new Date(activeTicket.created_at).toLocaleString()}</div>
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50/50 min-h-[320px] flex flex-col space-y-4 overflow-y-auto max-h-[60vh]">
                        {/* Initial Description */}
                        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm relative mr-8 lg:mr-24">
                            <div className="flex justify-between items-center mb-2.5 pb-2 border-b border-slate-100">
                                <span className="font-bold text-slate-800 text-sm">{activeTicket.created_by || 'Shop Owner'} <span className="text-slate-400 font-normal">(Opening Request)</span></span>
                                <span className="text-xs text-slate-400 font-medium">{new Date(activeTicket.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">{activeTicket.description || activeTicket.message || activeTicket.body}</p>
                        </div>

                        {/* Conversation Thread */}
                        {threadMessages.map((msg: any) => {
                            const isMe = !msg.is_admin && (msg.sender_id === user?.id || !msg.sender_id);
                            return (
                                <div key={msg.id} className={`p-5 rounded-2xl border shadow-sm relative transition-all ${isMe ? 'bg-white border-slate-200 ml-8 lg:ml-24' : 'bg-indigo-50 border-indigo-200 mr-8 lg:mr-24'}`}>
                                     <div className="flex justify-between items-center mb-2">
                                        <span className={`font-bold text-sm flex items-center gap-1.5 ${isMe ? 'text-slate-800' : 'text-indigo-900'}`}>
                                            {msg.is_admin ? (
                                                <>
                                                    <Headphones className="w-4 h-4 text-indigo-600" />
                                                    {msg.sender_name} <span className="text-[10px] bg-indigo-200/80 text-indigo-800 px-1.5 py-0.5 rounded font-bold">Support Agent</span>
                                                </>
                                            ) : (
                                                <>
                                                    {msg.sender_name} {isMe && <span className="text-slate-400 font-normal">(You)</span>}
                                                </>
                                            )}
                                        </span>
                                        <span className={`text-xs font-medium ${isMe ? 'text-slate-400' : 'text-indigo-400'}`}>{new Date(msg.created_at).toLocaleString()}</span>
                                    </div>
                                    <p className={`text-sm leading-relaxed whitespace-pre-wrap ${isMe ? 'text-slate-700' : 'text-indigo-950 font-medium'}`}>{msg.message}</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Reply Box */}
                    {activeTicket.status !== 'Closed' && (
                        <div className="p-6 bg-white border-t border-slate-200">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Reply to Bizora Support Team</label>
                            <div className="relative border border-slate-300 rounded-xl overflow-hidden focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
                                <textarea 
                                    rows={3} 
                                    className="w-full p-4 text-sm focus:outline-none resize-none text-slate-800"
                                    placeholder="Type your reply here..."
                                    value={replyText}
                                    onChange={e => setReplyText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleReply();
                                        }
                                    }}
                                />
                                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                                    <span className="text-xs text-slate-400">Press Enter to send</span>
                                    <button 
                                        type="button"
                                        onClick={handleReply}
                                        disabled={!replyText.trim()}
                                        className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-bold shadow hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                    >
                                        Send Reply <Send className="w-4 h-4 ml-2" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {activeTicket.status === 'Closed' && (
                        <div className="p-6 bg-slate-50 border-t border-slate-200 text-center text-slate-500">
                            <p className="font-semibold text-sm">This ticket is marked as Closed.</p>
                            <p className="text-xs mt-1">If you need further assistance, please create a new ticket.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomerSupport;
