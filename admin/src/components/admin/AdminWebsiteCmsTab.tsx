import React from 'react';
import {
  Globe, Image as ImageIcon, Save, Plus, Trash2, FileText
} from 'lucide-react';

type Props = {
  cmsFaqs: any;
  cmsHeroSubtitle: any;
  cmsHeroTitle: any;
  setCmsFaqs: any;
  setCmsHeroSubtitle: any;
  setCmsHeroTitle: any;
  showToast: any
};

export const AdminWebsiteCmsTab: React.FC<Props> = ({
  cmsFaqs,
  cmsHeroSubtitle,
  cmsHeroTitle,
  setCmsFaqs,
  setCmsHeroSubtitle,
  setCmsHeroTitle,
  showToast,
}) => (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Website CMS Control</h2>
                            <p className="text-slate-500 text-xs">Directly edit active landing pages hero content, faq components and public descriptions.</p>
                        </div>

                        {/* Hero CMS Edit */}
                        <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <h3 className="text-xs font-black uppercase text-slate-500 font-bold">Landing Page Hero Block</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Main Headline Title</label>
                                    <input 
                                        type="text" 
                                        value={cmsHeroTitle} 
                                        onChange={(e) => setCmsHeroTitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold mt-1 text-slate-800 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Hero Sub-Text Description</label>
                                    <textarea 
                                        value={cmsHeroSubtitle} 
                                        onChange={(e) => setCmsHeroSubtitle(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs mt-1 text-slate-700 bg-white h-20"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* FAQs Editor */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-black uppercase text-slate-500 font-bold">Public FAQs Builder</h3>
                            <div className="space-y-3">
                                {cmsFaqs.map((faq, i) => (
                                    <div key={i} className="border border-slate-150 rounded-xl p-4 bg-white space-y-2">
                                        <div className="flex gap-2">
                                            <span className="text-indigo-600 font-extrabold text-xs mt-1.5">Q:</span>
                                            <input 
                                                type="text" 
                                                value={faq.q} 
                                                onChange={(e) => {
                                                    const updated = [...cmsFaqs];
                                                    updated[i].q = e.target.value;
                                                    setCmsFaqs(updated);
                                                }}
                                                className="w-full border-none p-0 text-xs font-black text-slate-800 focus:ring-0 bg-white"
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <span className="text-slate-400 font-extrabold text-xs mt-1.5">A:</span>
                                            <textarea 
                                                value={faq.a} 
                                                onChange={(e) => {
                                                    const updated = [...cmsFaqs];
                                                    updated[i].a = e.target.value;
                                                    setCmsFaqs(updated);
                                                }}
                                                className="w-full border-none p-0 text-xs text-slate-600 focus:ring-0 h-12 bg-white"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="pt-2 text-right">
                            <button 
                                onClick={() => showToast('CMS contents saved and deployed to Landing Page', 'success')}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
                            >
                                Deploy Landing Page Changes
                            </button>
                        </div>
                    </div>
                </div>
);

export default AdminWebsiteCmsTab;
