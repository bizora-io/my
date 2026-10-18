import React from 'react';
import {
  Shield, Lock, Key, User, Save, Smartphone
} from 'lucide-react';

type Props = {
  showToast: any
};

export const AdminOwnerProfileTab: React.FC<Props> = ({
  showToast,
}) => (
                <div className="space-y-6 animate-in fade-in duration-200">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">SaaS Owner Profile</h2>
                            <p className="text-slate-500 text-xs">Manage system administrator passwords, security authentications and notification preferences.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            {/* Profile Info */}
                            <div className="space-y-4">
                                <h3 className="text-xs font-black uppercase text-slate-500 font-bold">Account Profile</h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Super Admin Full Name</label>
                                        <input type="text" defaultValue="SaaS Platform Owner" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold mt-1 text-slate-800 bg-white" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Relay Email Address</label>
                                        <input type="email" defaultValue="owner@bizora.app" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold mt-1 text-slate-800 bg-white" />
                                    </div>
                                </div>
                            </div>

                            {/* Security MFA */}
                            <div className="space-y-4 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                <h3 className="text-xs font-black uppercase text-slate-500 font-bold">Super Admin Security 2FA</h3>
                                <p className="text-[10px] text-slate-500 leading-relaxed">Secure owner login processes with google authenticator device authentication requirements.</p>
                                <div className="flex justify-between items-center pt-2">
                                    <span className="text-xs font-black text-slate-700">Google MFA Status:</span>
                                    <button 
                                        onClick={() => showToast('Google Authenticator QR code generated successfully', 'success')}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black transition"
                                    >
                                        Setup Google MFA
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
);

export default AdminOwnerProfileTab;
