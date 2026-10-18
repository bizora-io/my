import React, { useState, useRef, useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useAuth } from '../contexts/AuthContext';
import { useData, SaasSupportTicket } from '../contexts/DataContext';
import { apiFetch, authFetch } from '../lib/apiClient';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Trash2, 
  ArrowLeft, 
  Loader2, 
  User, 
  HelpCircle, 
  UserPlus, 
  Database, 
  BookOpen, 
  ShieldAlert, 
  TrendingUp, 
  ArrowRight,
  RefreshCw,
  PackageCheck,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DataSummary {
  metricTitle?: string;
  primaryValue?: string | number;
  secondaryValue?: string;
  currency?: string;
  asOf?: string;
  table?: {
    headers: string[];
    rows: (string | number)[][];
  };
}

interface SuggestedAction {
  label: string;
  prompt?: string;
  route?: string;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  intent?: string;
  category?: string;
  source?: 'live_database' | 'erp_guide' | 'access_denied' | 'unsupported';
  dataSummary?: DataSummary;
  suggestedActions?: SuggestedAction[];
}

export const AIChat: React.FC = () => {
  const { t } = useSettings();
  const { user } = useAuth();
  const { addSaasTicket } = useData();
  const navigate = useNavigate();

  const welcomeMessage: Message = {
    role: 'assistant',
    text: "স্বাগতম! আমি Bizora ERP অ্যাসিস্ট্যান্ট।\n\nআপনার রিয়েল-টাইম বিক্রয় রিপোর্ট, কম স্টক পণ্য, কাস্টমার বকেয়া, ক্যাশ ড্রয়ার বা যেকোনো ERP কাজের নিয়ম সম্পর্কে বাংলায় বা ইংরেজিতে জিজ্ঞেস করতে পারেন। কোনো বাহ্যিক AI বা তৃতীয় পক্ষের উপর নির্ভর না করে সরাসরি আপনার Bizora ডেটাবেস ও কার্যপদ্ধতি থেকে নিরাপদ ও সঠিক উত্তর প্রদান করা হয়।\n\nWelcome! I am the Bizora ERP Assistant. Ask me anything about your live sales, low stock alerts, customer dues, cashbox flow, or standard ERP workflows.",
    source: 'erp_guide',
    suggestedActions: [
      { label: "আজকের বিক্রয় কত?", prompt: "আজকের বিক্রয় কত?" },
      { label: "কোন পণ্যের স্টক কম?", prompt: "কোন পণ্যের স্টক কম?" },
      { label: "কোন customer-এর কত বকেয়া?", prompt: "কোন customer-এর কত বকেয়া?" },
      { label: "Quotation থেকে invoice কীভাবে তৈরি করব?", prompt: "Quotation থেকে invoice কীভাবে তৈরি করব?" }
    ]
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('bizora_erp_assistant_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback to initial
      }
    }
    return [welcomeMessage];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save chat to localStorage
  useEffect(() => {
    localStorage.setItem('bizora_erp_assistant_history', JSON.stringify(messages));
  }, [messages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    if (!textToSend) {
      setInput('');
    }

    const newMsg: Message = { role: 'user', text: query };
    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const response = await authFetch('/api/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: query,
          history: updatedMessages.slice(-6).map(m => ({
            role: m.role,
            text: m.text
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const data = await response.json();
      setMessages(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          text: data.text,
          intent: data.intent,
          category: data.category,
          source: data.source,
          dataSummary: data.dataSummary,
          suggestedActions: data.suggestedActions
        }
      ]);
    } catch (error) {
      console.error('Error contacting Bizora ERP Assistant:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        text: "Bizora ERP অ্যাসিস্ট্যান্ট সার্ভারের সাথে সংযোগ স্থাপন করা সম্ভব হয়নি। অনুগ্রহ করে আপনার ইন্টারনেট সংযোগ অথবা ব্যাকএন্ড সার্ভার চালু রয়েছে কি না যাচাই করুন।\n\nUnable to reach the Bizora ERP Assistant backend. Please verify your connection or check backend service status.",
        source: 'unsupported'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Are you sure you want to clear this chat history? / আপনি কি চ্যাট হিস্ট্রি মুছে ফেলতে চান?')) {
      setMessages([welcomeMessage]);
      localStorage.removeItem('bizora_erp_assistant_history');
    }
  };

  const escalateToAgent = () => {
    if (!user) return;
    const transcript = messages
      .map(m => `${m.role === 'user' ? (user.name || 'You') : 'Bizora ERP Assistant'}: ${m.text}`)
      .join('\n\n');

    const ticket: SaasSupportTicket = {
      id: `ticket-${Date.now()}`,
      ticket_number: `TCK-${Date.now().toString().slice(-8)}`,
      business_id: user.id,
      business_name: user.businessName,
      created_by: user.name,
      subject: 'Escalated from Bizora ERP Assistant',
      category: 'General Support',
      priority: 'Medium',
      status: 'Open',
      description: `This conversation was escalated from the Bizora ERP Assistant. Transcript so far:\n\n${transcript}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [],
    };

    addSaasTicket(ticket);
    navigate('/support');
  };

  const quickPrompts = [
    { 
      labelBn: "আজকের বিক্রয় কত?", 
      labelEn: "Today's Sales", 
      icon: TrendingUp,
      prompt: "আজকের বিক্রয় কত?" 
    },
    { 
      labelBn: "কোন পণ্যের স্টক কম?", 
      labelEn: "Low Stock Alert", 
      icon: PackageCheck,
      prompt: "কোন পণ্যের স্টক কম?" 
    },
    { 
      labelBn: "কোন customer-এর কত বকেয়া?", 
      labelEn: "Customer Dues", 
      icon: CreditCard,
      prompt: "কোন customer-এর কত বকেয়া?" 
    },
    { 
      labelBn: "Quotation থেকে invoice রূপান্তর", 
      labelEn: "Quote to Invoice", 
      icon: ArrowRight,
      prompt: "Quotation থেকে invoice কীভাবে তৈরি করব?" 
    },
    { 
      labelBn: "আজকের ক্যাশ ও খরচ ব্যালেন্স", 
      labelEn: "Cashbox Balance", 
      icon: DollarSign,
      prompt: "ক্যাশ ড্রয়ার এবং আজকের ব্যালেন্স কত?" 
    },
    { 
      labelBn: "আমার সাবস্ক্রিপশন প্ল্যান", 
      labelEn: "Subscription Plan", 
      icon: Sparkles,
      prompt: "আমার বর্তমান সাবস্ক্রিপশন প্ল্যান এবং ফিচারগুলো কী?" 
    }
  ];

  const renderSourceBadge = (source?: string) => {
    switch (source) {
      case 'live_database':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Database className="w-3 h-3 text-emerald-600" />
            লাইভ ডাটাবেস • Live ERP Data
          </span>
        );
      case 'erp_guide':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <BookOpen className="w-3 h-3 text-indigo-600" />
            গাইড • ERP Workflow Guide
          </span>
        );
      case 'access_denied':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            পারমিশন সীমাবদ্ধ • Restricted
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] max-w-5xl mx-auto bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate('/')} 
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-300 hover:text-white"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                {t('Bizora ERP Assistant')}
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  On-Premises
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Authoritative ERP Context & Verified Workflows • Zero External AI Dependencies
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button 
            onClick={escalateToAgent}
            className="px-3 py-1.5 hover:bg-slate-800 text-slate-300 hover:text-indigo-300 rounded-xl transition-colors flex items-center gap-1.5 text-xs font-semibold border border-slate-700 hover:border-indigo-500/50"
            title="Escalate this conversation to a live support representative"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Talk to Human Support</span>
          </button>
          <button 
            onClick={clearChat}
            className="p-2 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl transition-colors"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-slate-50/50">
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          return (
            <div key={index} className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
              {!isUser && (
                <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              <div 
                className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm border ${
                  isUser 
                    ? 'bg-indigo-600 text-white border-indigo-600 rounded-tr-none' 
                    : 'bg-white text-slate-800 border-slate-200 rounded-tl-none space-y-3'
                }`}
              >
                {!isUser && (
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 gap-2">
                    <span className="text-xs font-bold text-slate-700">Bizora ERP Engine</span>
                    {renderSourceBadge(msg.source)}
                  </div>
                )}

                <div className="whitespace-pre-wrap font-sans text-[13.5px]">
                  {msg.text}
                </div>

                {/* Structured KPI Metric Card */}
                {!isUser && msg.dataSummary && (msg.dataSummary.metricTitle || msg.dataSummary.primaryValue !== undefined) && (
                  <div className="p-3.5 bg-gradient-to-br from-indigo-50/70 to-slate-50 rounded-xl border border-indigo-100/80 space-y-1">
                    {msg.dataSummary.metricTitle && (
                      <p className="text-[11px] font-bold text-indigo-900 uppercase tracking-wide">
                        {msg.dataSummary.metricTitle}
                      </p>
                    )}
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-slate-900">
                        {msg.dataSummary.primaryValue}
                      </span>
                      {msg.dataSummary.currency && (
                        <span className="text-xs font-bold text-slate-500">
                          {msg.dataSummary.currency}
                        </span>
                      )}
                    </div>
                    {msg.dataSummary.secondaryValue && (
                      <p className="text-xs font-medium text-slate-600">
                        {msg.dataSummary.secondaryValue}
                      </p>
                    )}
                  </div>
                )}

                {/* Structured Data Table */}
                {!isUser && msg.dataSummary?.table && msg.dataSummary.table.rows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm mt-2">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          {msg.dataSummary.table.headers.map((h, hIdx) => (
                            <th key={hIdx} className="px-3 py-2.5 whitespace-nowrap">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {msg.dataSummary.table.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-2 whitespace-nowrap text-slate-700">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Suggested Action Buttons */}
                {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1.5 border-t border-slate-100">
                    {msg.suggestedActions.map((action, aIdx) => (
                      <button
                        key={aIdx}
                        onClick={() => {
                          if (action.route) {
                            navigate(action.route);
                          } else if (action.prompt) {
                            handleSend(action.prompt);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-medium transition-all"
                      >
                        <span>{action.label}</span>
                        {action.route && <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {isUser && (
                <div className="w-9 h-9 rounded-2xl bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 shrink-0 mt-0.5">
                  <User className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-9 h-9 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-white text-slate-600 border border-slate-200 rounded-2xl rounded-tl-none px-4 py-3 text-xs sm:text-sm flex items-center gap-2.5 shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
              <span>রিয়েল-টাইম ERP ডাটাবেস যাচাই করা হচ্ছে... Querying live ERP records</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Queries & Input */}
      <div className="p-4 border-t border-slate-200 bg-white space-y-3">
        {/* Suggestion Chips */}
        {messages.length <= 2 && !loading && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" /> 
              দ্রুত প্রশ্ন ও কার্যপদ্ধতি (Quick ERP Queries)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {quickPrompts.map((s, idx) => {
                const IconComponent = s.icon;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSend(s.prompt)}
                    className="text-left px-3.5 py-2.5 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-200 text-slate-800 hover:text-indigo-950 text-xs rounded-xl font-medium shadow-2xs transition-all duration-200 flex items-center gap-2.5 group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-indigo-600 group-hover:border-indigo-200 shrink-0">
                      <IconComponent className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <div className="font-semibold text-slate-900 group-hover:text-indigo-950 truncate">{s.labelBn}</div>
                      <div className="text-[10px] text-slate-500 truncate">{s.labelEn}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="বিক্রয়, কম স্টক, বকেয়া বা কাজের নিয়ম সম্পর্কে লিখুন (বাংলা / English)..."
            className="flex-1 bg-slate-50 hover:bg-white border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus:bg-white placeholder:text-slate-400 text-slate-900 shadow-2xs transition-all"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-5 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
